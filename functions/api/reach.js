import {validateReachEvent} from '../../src/reach-schema.js';
import {storeReachEvent} from '../../reach/storage.js';

// Owner confirmed completion of privacy/provider/retention reviews on 2026-11-02.
// This is not independent legal certification. Live activation is still off.
const REACH_PRIVACY_REVIEW_APPROVED=true;
const ORIGINS=new Set(['https://www.colelearninglabs.com','https://colelearninglabs.com']);
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}});
export async function handleReach(context,{privacyApproved=false}={}){
  const {request,env}=context;
  if(!privacyApproved||env?.REACH_ENABLED!=='true'||env?.REACH_RETENTION_VERIFIED!=='true')return json({enabled:false},503);
  const url=new URL(request.url);
  if(request.headers.get('Sec-GPC')==='1'||request.headers.get('DNT')==='1')return json({enabled:false},403);
  if(url.protocol!=='https:'||!ORIGINS.has(url.origin)||url.pathname!=='/api/reach'||url.search||request.cf?.country!=='US')return json({enabled:false},403);
  const agent=request.headers.get('User-Agent')||'';
  if(!agent||/bot\b|crawler|spider|headless|^node$|curl|python|CensysInspect|cold-email/iu.test(agent)||request.cf?.botManagement?.verifiedBot===true)return json({enabled:false},403);
  if(request.method==='GET')return json({enabled:typeof env?.LAB_REACH?.prepare==='function'});
  if(request.method!=='POST')return json({accepted:false},405);
  if(request.headers.get('Origin')!==url.origin||request.headers.has('Cookie')||request.headers.get('Sec-Fetch-Site')!=='same-origin'||request.headers.has('Content-Encoding')||!/^application\/json(?:\s*;|$)/iu.test(request.headers.get('Content-Type')||''))return json({accepted:false},403);
  const declared=request.headers.get('Content-Length');if(declared!==null&&(!/^\d+$/u.test(declared)||Number(declared)>192))return json({accepted:false},413);
  const reader=request.body?.getReader();if(!reader)return json({accepted:false},400);
  let size=0,raw='',timer;const decoder=new TextDecoder('utf-8',{fatal:true});
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),2000);});
  try{
    while(true){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.byteLength;if(size>192)return json({accepted:false},413);raw+=decoder.decode(value,{stream:true});}
    raw+=decoder.decode();const event=validateReachEvent(JSON.parse(raw));if(!event)return json({accepted:false},400);
    const result=await storeReachEvent(env.LAB_REACH,event);return json(result,result.accepted?200:result.error==='reach_full'?429:503);
  }catch{return json({accepted:false},400);}finally{clearTimeout(timer);try{await reader.cancel();}catch{}}
}
export const onRequest=context=>handleReach(context,{privacyApproved:REACH_PRIVACY_REVIEW_APPROVED});
