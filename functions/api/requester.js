/** Same-origin fictional-topic broker. No AI or database binding belongs in Pages. */
import {PRIVATE_REQUESTER_URL,RequesterError,failRequester,readRequesterTopic,readBoundedJson,validRequesterAnswer} from '../../worker-requester/contract.js';

// This reviewed path sends only authored fictional topic codes. It does not
// approve classroom records or improvement collection, which remain closed.
const REQUESTER_PRIVATE_GATEWAY_APPROVED=true;
const ORIGINS=new Set(['https://www.colelearninglabs.com','https://colelearninglabs.com']);
const fail=failRequester;
function response(body,status=200,extra={}){
  return new Response(JSON.stringify(body),{status,headers:{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",...extra
  }});
}
const fallback=(status,error)=>response({enabled:false,error,fallback:true,accepted:false},status);

/** Explicit source approval is required; requests and dashboard flags cannot grant it. */
export async function handleRequesterRequest(context,{privacyApproved=false,timeoutMs=12000,bodyTimeoutMs=2000}={}){
  if(privacyApproved!==true)return fallback(503,'requester_private_activation_required');
  let timer,controller,abort,requestSignal;
  try{
    const request=context.request,url=new URL(request.url);
    requestSignal=request.signal;
    if(!ORIGINS.has(url.origin)||url.pathname!=='/api/requester'||url.search||url.hash||url.username||url.password)fail(403,'same_origin_required');
    if(!['GET','POST'].includes(request.method))return fallback(405,'method_not_allowed');
    if(request.headers.has('Cookie')||request.headers.has('Authorization')||request.headers.has('Cf-Access-Jwt-Assertion'))fail(403,'credentials_not_allowed');
    const site=request.headers.get('Sec-Fetch-Site');
    if(site&&site!=='same-origin')fail(403,'same_origin_required');
    if(request.method==='POST'&&(request.headers.get('Origin')!==url.origin||site!=='same-origin'))fail(403,'same_origin_required');
    if(requestSignal.aborted)fail(499,'request_cancelled');
    const env=context.env;
    // Disabling the service must stop body parsing as well as binding calls.
    if(env?.REQUESTER_ENABLED!=='true'||env?.REQUESTER_BILLING_REVIEWED!=='true')fail(503,'requester_not_enabled');
    const topic=request.method==='POST'?await readRequesterTopic(request,{deadlineMs:bodyTimeoutMs}):null;
    const service=env.REQUESTER_SERVICE;
    if(typeof service?.fetch!=='function')fail(503,'requester_not_configured');
    controller=new AbortController();
    const deadline=new Promise((_,reject)=>{
      timer=setTimeout(()=>{controller.abort();reject(new RequesterError(504,'requester_timeout'));},Math.max(1,Math.min(12000,timeoutMs)));
      abort=()=>{controller.abort();reject(new RequesterError(499,'request_cancelled'));};
      if(requestSignal.aborted)abort();else requestSignal.addEventListener('abort',abort,{once:true});
    });
    const forward=(async()=>{
      // Construct a new fixed-destination request. Never forward browser headers,
      // cookies, user address, URLs, referrers, identities or Cloudflare context.
      const internal=new Request(PRIVATE_REQUESTER_URL,{method:request.method,signal:controller.signal,
        ...(topic?{headers:{'Content-Type':'application/json'},body:JSON.stringify(topic.payload)}:{})});
      if(controller.signal.aborted)fail(499,'request_cancelled');
      const result=await service.fetch(internal);
      if(result.status!==200){
        void result.body?.cancel().catch(()=>{});
        fail(result.status===429?429:503,'requester_unavailable');
      }
      if(!/^application\/json(?:\s*;|$)/iu.test(result.headers.get('Content-Type')||'')||result.headers.has('Content-Encoding'))fail(502,'invalid_service_reply');
      const data=await readBoundedJson(result,{maxBytes:4096,signal:controller.signal});
      const keys=Object.keys(data||{}).sort().join(',');
      if(request.method==='GET'){
        if(keys!=='enabled,provider,requiresConsent'||data.enabled!==true||data.provider!=='cloudflare-workers-ai'||data.requiresConsent!==true)fail(502,'invalid_service_reply');
        return response({enabled:true,provider:'cloudflare-workers-ai',requiresConsent:true});
      }
      if(keys!=='accepted,answer,enabled,kind,provider,ungraded'||data.enabled!==true||data.kind!=='ai'||data.accepted!==false||data.ungraded!==true||data.provider!=='cloudflare-workers-ai'||!validRequesterAnswer(data.answer))fail(502,'invalid_service_reply');
      return response({enabled:true,answer:data.answer.trim(),kind:'ai',accepted:false,ungraded:true,provider:'cloudflare-workers-ai'});
    })();
    return await Promise.race([forward,deadline]);
  }catch(error){
    controller?.abort();
    if(error instanceof RequesterError)return fallback(error.status,error.code);
    return fallback(503,'requester_unavailable');
  }finally{clearTimeout(timer);if(abort)requestSignal?.removeEventListener('abort',abort);}
}

export const onRequest=context=>{
  if(!REQUESTER_PRIVATE_GATEWAY_APPROVED)return fallback(503,'requester_private_activation_required');
  return handleRequesterRequest(context,{privacyApproved:REQUESTER_PRIVATE_GATEWAY_APPROVED});
};
