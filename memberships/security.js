/** Request and response boundaries for the separate adult membership service. */
export const MEMBER_ORIGIN='https://members.colelearninglabs.com';
const encoder=new TextEncoder();
export class MembershipError extends Error {
  constructor(status=503){super('membership_unavailable');this.status=status;}
}
export const deny=(status=403)=>{throw new MembershipError(status);};
export const SECURITY_HEADERS=Object.freeze({
  'Cache-Control':'private, no-store',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin',
  'Strict-Transport-Security':'max-age=31536000','X-Frame-Options':'DENY'
});
export function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{...SECURITY_HEADERS,'Content-Type':'application/json; charset=utf-8'}});
}
export const unavailable=(status=503)=>json({available:false,error:'membership_unavailable'},status);
export function secureResponse(response){
  const headers=new Headers(response.headers);
  for(const [name,value]of Object.entries(SECURITY_HEADERS))headers.set(name,value);
  headers.delete('Access-Control-Allow-Origin');headers.delete('Access-Control-Allow-Credentials');
  headers.delete('Server');headers.delete('X-Powered-By');
  return new Response(response.body,{status:response.status,headers});
}
export function reviewedUrl(request,{callback=false}={}){
  const url=new URL(request.url);
  if(url.origin!==MEMBER_ORIGIN||url.username||url.password||url.hash)deny();
  if(/[%\\\u0000-\u0020\u007f]/u.test(url.pathname)||url.pathname.includes('//'))deny();
  if(url.search&&!callback)deny();
  if(request.headers.has('Authorization')||request.headers.has('Cf-Access-Jwt-Assertion'))deny();
  return url;
}
export function requireSameOrigin(request){
  if(request.headers.get('Origin')!==MEMBER_ORIGIN||request.headers.get('Sec-Fetch-Site')!=='same-origin')deny();
}
export function requireSameOriginRead(request){
  const origin=request.headers.get('Origin'),site=request.headers.get('Sec-Fetch-Site');
  if((origin&&origin!==MEMBER_ORIGIN)||(site&&site!=='same-origin'&&site!=='none'))deny();
}
export async function boundedBytes(request,{maxBytes=2048,timeoutMs=2000}={}){
  if(request.headers.has('Content-Encoding'))deny(415);
  const declared=request.headers.get('Content-Length');
  if(declared!==null&&(!/^\d+$/u.test(declared)||Number(declared)>maxBytes))deny(413);
  const reader=request.body?.getReader();if(!reader)deny(400);
  let timer,abort,size=0;const chunks=[];
  const deadline=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new MembershipError(408)),Math.max(1,Math.min(5000,timeoutMs)));
    abort=()=>reject(new MembershipError(499));
    if(request.signal.aborted)abort();else request.signal.addEventListener('abort',abort,{once:true});
  });
  try{
    while(true){
      const {value,done}=await Promise.race([reader.read(),deadline]);if(done)break;
      size+=value.byteLength;if(size>maxBytes)deny(413);chunks.push(value);
    }
    const result=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}
    return result;
  }catch(error){void reader.cancel().catch(()=>{});throw error;}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);reader.releaseLock();}
}
export async function boundedJson(request){
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(request.headers.get('Content-Type')||''))deny(415);
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(request)));}
  catch(error){if(error instanceof MembershipError)throw error;deny(400);}
}
function csrfSecret(env){
  const secret=env.MEMBERSHIP_CSRF_SECRET;
  if(typeof secret!=='string'||encoder.encode(secret).byteLength<32||secret===env.MEMBERSHIP_AUTH_SECRET)deny(503);
  return secret;
}
async function csrfKey(env){return crypto.subtle.importKey('raw',encoder.encode(csrfSecret(env)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
const tokenBytes=session=>{
  if(typeof session?.session?.id!=='string'||!session.session.id||session.session.id.length>256)deny(401);
  return encoder.encode('cole-membership-csrf-v1\0'+session.session.id);
};
export async function csrfToken(env,session){
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',await csrfKey(env),tokenBytes(session)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/gu,'-').replace(/\//gu,'_').replace(/=+$/u,'');
}
export async function verifyCsrf(request,env,session){
  const value=request.headers.get('X-Membership-CSRF')||'';
  if(!/^[A-Za-z0-9_-]{43}$/u.test(value))deny();
  let bytes;try{bytes=Uint8Array.from(atob(value.replace(/-/gu,'+').replace(/_/gu,'/')+'='),char=>char.charCodeAt(0));}catch{deny();}
  if(!await crypto.subtle.verify('HMAC',await csrfKey(env),bytes,tokenBytes(session)))deny();
}

/** In-isolate backstop. Persistent global admission below remains mandatory. */
export function createBackstop({now=Date.now}={}){
  let bucket=-1,count=0,inflight=0;
  return {acquire(){
    const next=Math.floor(now()/60000);if(next!==bucket){bucket=next;count=0;}
    if(count>=60||inflight>=4)return null;count++;inflight++;let released=false;
    return ()=>{if(!released){released=true;inflight--;}};
  }};
}
const ADMISSION_SQL=`WITH requested(bucket,cap,expiry) AS MATERIALIZED (VALUES(?,?,?),(?,?,?)),
capacity(ok) AS MATERIALIZED (
  SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM membership_admission AS a JOIN requested AS r ON a.bucket=r.bucket WHERE a.used>=r.cap)
)
INSERT INTO membership_admission(bucket,used,expires_at)
SELECT r.bucket,1,r.expiry FROM requested AS r CROSS JOIN capacity WHERE capacity.ok=1
ON CONFLICT(bucket) DO UPDATE SET used=membership_admission.used+1
WHERE membership_admission.used<(SELECT cap FROM requested WHERE bucket=membership_admission.bucket)
RETURNING bucket,used`;
/** Anonymous feature totals, never IP/user/topic records. Reservations are not refunded. */
export async function reserveAdmission(db,kind,{now=Date.now}={}){
  if(!['auth','billing','webhook','read'].includes(kind)||typeof db?.prepare!=='function')deny(503);
  const time=now(),day=Math.floor(time/86400000),minute=Math.floor(time/60000),expiry=Math.floor(time/1000)+172800;
  const caps=kind==='webhook'?[120,5000]:kind==='auth'?[20,500]:kind==='billing'?[20,500]:[120,5000];
  try{
    const expected=new Map([[kind+':m:'+minute,caps[0]],[kind+':d:'+day,caps[1]]]);
    const result=await db.prepare(ADMISSION_SQL).bind(kind+':m:'+minute,caps[0],expiry,kind+':d:'+day,caps[1],expiry).all();
    if(result?.success!==true||!Array.isArray(result.results))deny(503);
    if(result.results.length===0)deny(429);
    if(result.results.length!==2)deny(503);
    for(const row of result.results){
      const cap=expected.get(row?.bucket);
      if(!cap||!Number.isSafeInteger(row.used)||row.used<1||row.used>cap)deny(503);
      expected.delete(row.bucket);
    }
    if(expected.size)deny(503);
  }catch(error){if(error instanceof MembershipError)throw error;deny(503);}
}
