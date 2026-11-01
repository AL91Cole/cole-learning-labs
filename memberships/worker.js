import {getAdultSession,handleMembershipAuth} from './auth.js';
import {createCheckout,createPortal,getMembershipStatus,verifyPremium,processWebhook,BillingError} from './billing.js';
import {MEMBER_ORIGIN,MembershipError,deny,json,unavailable,secureResponse,reviewedUrl,requireSameOrigin,requireSameOriginRead,boundedBytes,boundedJson,csrfToken,verifyCsrf,createBackstop,reserveAdmission} from './security.js';
import {PROTECTED_ASSETS} from './protected-assets.js';

// Source review, operator/privacy approval and an explicit test rollout are separate.
// Environment flags, credentials, URLs and execution context cannot unlock this entry.
export const MEMBERSHIP_SOURCE_RELEASE_APPROVED=false;
const backstop=createBackstop();
const ASSETS=new Map([['/','/index.html'],['/index.html','/index.html'],['/membership.js','/membership.js'],['/membership.css','/membership.css']]);
const AUTH_PATHS=new Set(['/api/auth/sign-in/social','/api/auth/callback/google','/api/auth/sign-out']);
const RESOURCES=new Map(); // No premium content is approved for sale or delivery yet.
const defaultBilling={createCheckout,createPortal,getMembershipStatus,verifyPremium,processWebhook};
const LEARN_CSP="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; worker-src 'none'";
const privateChecks=new WeakMap();

function briefRetry(signal,milliseconds){
  return new Promise((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(new MembershipError(499));};
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},milliseconds);
    if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
  });
}

/** Co-ordinate only concurrent work in this isolate. Each asset still performs
 * its own provider check; no paid decision or payload is cached or shared. */
async function freshPrivateEntitlement(env,session,billing,signal){
  let queues=privateChecks.get(env);if(!queues){queues=new Map();privateChecks.set(env,queues);}
  let queue=queues.get(session.user.id);
  if(!queue){queue={pending:0,tail:Promise.resolve()};queues.set(session.user.id,queue);}
  if(queue.pending>=4)deny(429);
  queue.pending++;
  const previous=queue.tail;let release;queue.tail=new Promise(resolve=>{release=resolve;});
  try{
    await previous;
    for(let attempt=0;attempt<3;attempt++){
      if(signal.aborted)deny(499);requireSession(session);
      try{return await billing.verifyPremium({env,member:session.user});}
      catch(error){
        if(!(error instanceof BillingError)||error.status!==409||attempt===2)throw error;
        // A different isolate may hold the database lease. Retry only that
        // typed contention response, never infer access from it or other errors.
        await briefRetry(signal,100*(attempt+1));
      }
    }
  }finally{
    release();queue.pending--;
    if(queue.pending===0){queues.delete(session.user.id);if(queues.size===0)privateChecks.delete(env);}
  }
}

function reviewedRuntime(env){
  if(env?.MEMBERSHIP_ENABLED!=='true'||env?.MEMBERSHIP_PROCESSING_REVIEWED!=='true'||env?.MEMBERSHIP_DEPLOYMENT_MODE!=='test')deny(503);
}
const requireMethod=(request,method)=>{if(request.method!==method)deny(405);};
const requireSession=session=>{
  if(!session?.user||typeof session.user.id!=='string'||session.user.emailVerified!==true||!session.session)deny(401);
  const expires=new Date(session.session.expiresAt).getTime();
  if(!Number.isFinite(expires)||expires<=Date.now())deny(401);
  return session;
};
/** Prepared testable handler. Options are trusted test dependencies, never input. */
export async function handleMembershipRequest(request,env,{
  reviewApproved=false,auth={getAdultSession,handleMembershipAuth},billing=defaultBilling,
  admission=reserveAdmission,limiter=backstop,resources=RESOURCES,protectedAssets=PROTECTED_ASSETS
}={}){
  if(reviewApproved!==true)return unavailable();
  let release;
  try{
    reviewedRuntime(env);
    const url=reviewedUrl(request,{callback:new URL(request.url).pathname==='/api/auth/callback/google'});
    if(request.signal.aborted)deny(499);
    if(request.method==='OPTIONS')deny(405);
    const path=url.pathname;
    if(ASSETS.has(path)){
      requireMethod(request,'GET');
      if(typeof env.MEMBERSHIP_PUBLIC_ASSETS?.fetch!=='function')deny(503);
      // No purchaser cookies or connection headers reach the public asset binding.
      const result=await env.MEMBERSHIP_PUBLIC_ASSETS.fetch(new Request(MEMBER_ORIGIN+ASSETS.get(path)));
      if(result.status!==200){void result.body?.cancel().catch(()=>{});deny(404);}
      return secureResponse(result);
    }
    const learn=path.startsWith('/learn/');
    if(!path.startsWith('/api/')&&!learn)deny(404);
    release=limiter.acquire();if(!release)deny(429);
    if(learn){
      requireMethod(request,'GET');requireSameOriginRead(request);
      await admission(env.MEMBERSHIP_DB,'read');
      const session=requireSession(await auth.getAdultSession(request,env));
      // Every document, script, stylesheet, image and download performs a fresh
      // paid-entitlement check. Never consult or fall back to public assets.
      if(await freshPrivateEntitlement(env,session,billing,request.signal)!==true)deny(403);
      if(request.signal.aborted)deny(499);
      requireSession(session);
      if(!protectedAssets.has(path))deny(404);
      const asset=protectedAssets.get(path);
      if(!(asset?.bytes instanceof Uint8Array)||typeof asset.contentType!=='string'||
        !/^(?:text\/(?:html|css)|application\/(?:javascript|json|pdf)|image\/(?:svg\+xml|png))(?:; charset=utf-8)?$/u.test(asset.contentType))deny(503);
      const response=secureResponse(new Response(asset.bytes,{headers:{'Content-Type':asset.contentType}}));
      if(asset.contentType.startsWith('text/html'))response.headers.set('Content-Security-Policy',LEARN_CSP);
      return response;
    }
    if(AUTH_PATHS.has(path)){
      const callback=path==='/api/auth/callback/google';
      requireMethod(request,callback?'GET':'POST');
      if(!callback)requireSameOrigin(request);
      await admission(env.MEMBERSHIP_DB,'auth');
      // The auth adapter bounds/reconstructs its own bodies and fixes provider,
      // callback destination and allowed endpoints; no generic proxy is exposed.
      return secureResponse(await auth.handleMembershipAuth(request,env));
    }
    if(path==='/api/member/webhook'){
      requireMethod(request,'POST');
      if(request.headers.has('Cookie')||request.headers.has('Origin'))deny();
      if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(request.headers.get('Content-Type')||''))deny(415);
      const signature=request.headers.get('Stripe-Signature')||'';
      if(!signature||signature.length>2048)deny(400);
      const rawBody=await boundedBytes(request,{maxBytes:65536});
      // Forged signatures cannot burn the shared delivery budget. The billing
      // adapter invokes this callback only after signature and event-scope checks.
      return json(await billing.processWebhook({env,rawBody,signature,
        onVerified:()=>admission(env.MEMBERSHIP_DB,'webhook')}));
    }
    const resource=path.startsWith('/api/member/resources/')?path.slice('/api/member/resources/'.length):null;
    const read=path==='/api/member/session'||resource!==null;
    if(!read&&!['/api/member/checkout','/api/member/portal'].includes(path))deny(404);
    requireMethod(request,read?'GET':'POST');
    if(read)requireSameOriginRead(request);else requireSameOrigin(request);
    await admission(env.MEMBERSHIP_DB,read?'read':'billing');
    const session=requireSession(await auth.getAdultSession(request,env));
    if(path==='/api/member/session'){
      const status=await billing.getMembershipStatus({env,member:session.user});
      return json({signedIn:true,csrfToken:await csrfToken(env,session),membership:status});
    }
    if(resource!==null){
      if(!/^[a-z][a-z0-9-]{0,63}$/u.test(resource)||!resources.has(resource))deny(404);
      if(!await billing.verifyPremium({env,member:session.user}))deny(403);
      if(request.signal.aborted)deny(499);
      const load=resources.get(resource),response=await load();
      if(!(response instanceof Response)||response.status!==200)deny(503);
      return secureResponse(response);
    }
    await verifyCsrf(request,env,session);
    const body=await boundedJson(request);
    if(path==='/api/member/checkout')return json(await billing.createCheckout({env,member:session.user,body}));
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==0)deny(400);
    return json(await billing.createPortal({env,member:session.user}));
  }catch(error){
    // Response deliberately omits provider errors, plan IDs, identity and storage details.
    const status=error instanceof MembershipError||error instanceof BillingError?error.status:503;
    return unavailable(Number.isInteger(status)&&status>=400&&status<=599?status:503);
  }finally{release?.();}
}

export default {fetch(request,env){
  if(!MEMBERSHIP_SOURCE_RELEASE_APPROVED)return unavailable();
  return handleMembershipRequest(request,env,{reviewApproved:MEMBERSHIP_SOURCE_RELEASE_APPROVED});
}};
