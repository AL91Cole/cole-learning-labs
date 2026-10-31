import {validateImprovementSummary} from '../../src/improvement-schema.js';
import {storeImprovementSummary} from '../../improvements/storage.js';
export {IMPROVEMENT_RELEASE} from '../../improvements/storage.js';

// User opt-in and environment settings do not constitute the required school,
// child-privacy, provider, security, retention and legal review. Source-locked.
const IMPROVEMENT_PRIVACY_REVIEW_APPROVED=false;
const ORIGINS=new Set(['https://www.colelearninglabs.com','https://colelearninglabs.com']);
const MAX_BODY=512;
const BODY_DEADLINE_MS=2000;

function response(value,status){
  return new Response(JSON.stringify(value),{status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
  }});
}
const refused=()=>response({accepted:false,error:'improvement_privacy_review_required'},503);
class InvalidRequest extends Error{constructor(status,code){super(code);this.status=status;this.code=code;}}
const fail=(status,code)=>{throw new InvalidRequest(status,code);};

async function readSummary(request){
  if(!/^application\/json(?:\s*;|$)/iu.test(request.headers.get('Content-Type')||''))fail(415,'json_required');
  if(request.headers.has('Content-Encoding'))fail(415,'encoding_not_supported');
  const declared=request.headers.get('Content-Length');
  if(declared!==null&&(!/^\d+$/u.test(declared)||Number(declared)>MAX_BODY))fail(413,'request_too_large');
  const reader=request.body?.getReader();
  if(!reader)fail(400,'invalid_summary');
  let raw='',size=0,timer;
  const decoder=new TextDecoder('utf-8',{fatal:true});
  const expired=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new InvalidRequest(408,'request_timeout')),BODY_DEADLINE_MS);});
  try{
    while(true){
      const {done,value}=await Promise.race([reader.read(),expired]);
      if(done)break;
      size+=value.byteLength;
      if(size>MAX_BODY)fail(413,'request_too_large');
      raw+=decoder.decode(value,{stream:true});
    }
    raw+=decoder.decode();
    const summary=validateImprovementSummary(JSON.parse(raw));
    if(!summary)fail(400,'invalid_summary');
    return summary;
  }catch(error){
    void reader.cancel().catch(()=>{});
    if(error instanceof InvalidRequest)throw error;
    fail(400,'invalid_summary');
  }finally{
    clearTimeout(timer);
    reader.releaseLock();
  }
}

/** Prepared only for synthetic tests and a separately reviewed future release. */
export async function handleImprovementRequest(context,{privacyApproved=false}={}){
  if(privacyApproved!==true)return refused();
  try{
    const request=context.request,url=new URL(request.url);
    if(url.protocol!=='https:'||!ORIGINS.has(url.origin)||url.pathname!=='/api/improvements'||url.search||url.hash)fail(403,'origin_rejected');
    if(request.method!=='POST')fail(405,'post_required');
    if(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')!=='same-origin')fail(403,'origin_rejected');
    if(request.headers.has('Cookie')||request.headers.has('Authorization')||request.headers.has('Cf-Access-Jwt-Assertion'))fail(400,'credentials_not_allowed');
    const env=context.env;
    if(env?.IMPROVEMENTS_ENABLED!=='true')fail(503,'improvements_disabled');
    const summary=await readSummary(request);
    const result=await storeImprovementSummary(env.LAB_IMPROVEMENTS,summary);
    if(result.accepted)return response({accepted:true},202);
    return response(result,result.error==='improvements_full'?429:503);
  }catch(error){
    if(error instanceof InvalidRequest)return response({accepted:false,error:error.code},error.status);
    return response({accepted:false,error:'improvements_unavailable'},503);
  }
}

export const onRequest=context=>{
  if(!IMPROVEMENT_PRIVACY_REVIEW_APPROVED)return refused();
  return handleImprovementRequest(context,{privacyApproved:IMPROVEMENT_PRIVACY_REVIEW_APPROVED});
};
