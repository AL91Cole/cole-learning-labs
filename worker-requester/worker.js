/** Optional fictional conversation, deployed only to a verified Workers Free account. */
import {SCENARIOS} from '../src/scenarios.js';
import {requesterPersona} from '../src/requester-persona.js';
import {requesterTopicInstruction} from '../src/requester-topics.js';
import {requesterTextIsPrivate} from '../src/interview.js';

const MODEL='@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const BODY_MAX=600;
const ANSWER_MAX=600;
const TIMEOUT_MS=12_000;
const LABS=new Map(SCENARIOS.map(scenario=>[scenario.id,scenario]));
const compact=value=>value.replace(/\s+/gu,' ').trim();
const bounded=(value,max)=>typeof value==='string'?compact(value).slice(0,max):'';

class RequesterError extends Error {
  constructor(status,code){super(code);this.status=status;this.code=code;}
}
const fail=(status,code)=>{throw new RequesterError(status,code);};
function response(body,status,origin='',extra={}) {
  return new Response(body===null?null:JSON.stringify(body),{status,headers:{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
    'Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{}),...extra
  }});
}
const fallback=(status,error,origin='')=>response({enabled:false,error,fallback:true,accepted:false},status,origin);

/** Anonymous per-isolate backstop, NOT a global quota or spending cap. Other
 * isolates/restarts have independent counters. Only the provider's enforced
 * Workers Free limits prevent paid inference overages; an environment flag
 * cannot inspect or enforce the actual account subscription. No identity is kept. */
export function createRequesterFreeRateLimiter({now=Date.now}={}) {
  let minute=-1,day=-1,count=0,daily=0,inflight=0;
  return {acquire(){
    const time=now(),nextMinute=Math.floor(time/60_000),nextDay=Math.floor(time/86_400_000);
    if(nextMinute!==minute){minute=nextMinute;count=0;}
    if(nextDay!==day){day=nextDay;daily=0;}
    if(count>=12||daily>=500||inflight>=2)return null;
    count++;daily++;inflight++;let released=false;
    return ()=>{if(!released){released=true;inflight--;}};
  }};
}
const rateLimiter=createRequesterFreeRateLimiter();

function allowedOrigins(value) {
  if(typeof value!=='string'||value.length>4000)return new Set();
  const entries=value.split(',').map(entry=>entry.trim());
  if(!entries.length||entries.length>20)return new Set();
  for(const entry of entries){
    try{
      const url=new URL(entry);
      if(url.protocol!=='https:'||url.origin!==entry||url.username||url.password||url.port||
        !url.hostname.includes('.')||url.hostname==='localhost'||url.hostname.endsWith('.localhost')||
        /^[\d.]+$/u.test(url.hostname)||url.hostname.includes('*'))return new Set();
    }catch{return new Set();}
  }
  return new Set(entries);
}

async function readBody(request) {
  const size=request.headers.get('Content-Length');
  if(size!==null&&(!/^\d+$/u.test(size)||Number(size)>BODY_MAX))fail(413,'request_too_large');
  if(!request.body)fail(400,'invalid_request');
  const reader=request.body.getReader(),chunks=[];let length=0;
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      length+=value.byteLength;
      if(length>BODY_MAX){void reader.cancel().catch(()=>{});fail(413,'request_too_large');}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let body;
  try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail(400,'invalid_json');}
  // A raw question or any extra property is rejected, never stripped or sent on.
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2||
    !Object.hasOwn(body,'scenarioId')||!Object.hasOwn(body,'topic'))fail(400,'invalid_request');
  if(typeof body.scenarioId!=='string'||!LABS.has(body.scenarioId))fail(400,'unknown_scenario');
  const instruction=requesterTopicInstruction(body.topic);
  if(typeof instruction!=='string'||!instruction||instruction.length>1200)fail(400,'unknown_topic');
  const scenario=LABS.get(body.scenarioId),profile=requesterPersona(scenario.id);
  if(!profile)fail(400,'unknown_scenario');
  return {scenario,profile,instruction};
}

function instructions(scenario,profile) {
  // Only these authored fictional fields are supplied. The scenario's clues,
  // brief, repairs, goal, rubric and all learner work are deliberately absent.
  const persona=Object.fromEntries(['name','role','voice','interests','breakfast','color','food','music','book','focus']
    .map(key=>[key,bounded(profile[key],180)]));
  const grade=bounded(scenario.grade,20);
  const style=grade==='7–8'?'For grades 7–8, use short plain-English sentences and explain necessary technical terms.':
    grade==='9–10'?'For grades 9–10, explain a useful technical term in the same reply.':
    grade==='11–12'?'For grades 11–12, use precise technical terms and explain their meaning and limits.':
    'Use clear, short sentences and explain unfamiliar terms.';
  return 'Play this explicitly fictional character in a school technology practice lab. '+
    'Reply in one or two friendly, age-appropriate English plain-text sentences, at most 600 characters. '+style+' '+
    'The next message is an authored topic instruction, not the learner\'s words. Follow it using only the supplied fictional profile and authored technology fact. '+
    'Do not invent personal events, people, case clues, symptoms, repairs, equipment observations, or hidden facts. '+
    'You cannot see a learner, device, current simulated equipment, notes, history, grades, or progress. '+
    'Never claim to inspect, repair, grade, verify, complete or award anything. Case evidence remains in the local request and workbench. '+
    'If the supplied information is insufficient, say that detail is not recorded. '+
    'Introduce yourself with "I am" and the supplied fictional name when appropriate. '+
    'Do not provide private details, credentials, links, HTML, Markdown code blocks, executable code, answer keys, or additional names. '+
    'Every reply is extra ungraded conversation. Trusted fictional profile: '+JSON.stringify({grade,persona});
}

async function limitedInference(promise,signal,timeoutMs) {
  let timer,abort;
  const deadline=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new RequesterError(504,'requester_timeout')),timeoutMs);
    abort=()=>reject(new RequesterError(499,'request_cancelled'));
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  });
  try{return await Promise.race([promise,deadline]);}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

/** Options are test dependencies only. No request field or Cloudflare execution
 * context can change approval, model, prompts, rate policy or inference options. */
export async function handleRequesterFreeRequest(request,env,{limiter=rateLimiter,timeoutMs=TIMEOUT_MS}={}) {
  let origin='';
  try{
    const url=new URL(request.url);
    if(url.protocol!=='https:'||url.username||url.password)fail(403,'secure_origin_required');
    if(url.pathname!=='/api/requester'||url.search)fail(404,'not_found');
    const candidate=request.headers.get('Origin');
    if(!candidate||!allowedOrigins(env?.REQUESTER_ALLOWED_ORIGINS).has(candidate))fail(403,'origin_not_allowed');
    origin=candidate;
    // These explicit operator assertions do not detect a plan upgrade. Deploy
    // only after independently verifying Workers Free, and keep it Free.
    if(env?.REQUESTER_ENABLED!=='true'||env?.REQUESTER_FREE_ACCOUNT_CONFIRMED!=='true')fail(503,'requester_not_enabled');
    if(request.headers.has('Cookie')||request.headers.has('Authorization'))fail(403,'credentials_not_allowed');
    if(!['GET','POST','OPTIONS'].includes(request.method))return response({enabled:false,error:'method_not_allowed',fallback:true,accepted:false},405,origin,{Allow:'GET, POST, OPTIONS'});
    if(request.method==='OPTIONS'){
      if(!['GET','POST'].includes(request.headers.get('Access-Control-Request-Method')))fail(403,'preflight_not_allowed');
      const headers=(request.headers.get('Access-Control-Request-Headers')||'').split(',').map(item=>item.trim().toLowerCase()).filter(Boolean);
      if(headers.some(header=>header!=='content-type'))fail(403,'preflight_not_allowed');
      return response(null,204,origin,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});
    }
    if(request.signal.aborted)fail(499,'request_cancelled');
    if(request.method==='POST'){
      if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(request.headers.get('Content-Type')||''))fail(415,'json_required');
      if(request.headers.has('Content-Encoding'))fail(415,'encoded_body_not_allowed');
    }
    const body=request.method==='POST'?await readBody(request):null;
    if(typeof env?.AI?.run!=='function')fail(503,'requester_not_configured');
    if(request.method==='GET')return response({enabled:true,provider:'cloudflare-workers-ai',requiresConsent:true},200,origin);
    if(request.signal.aborted)fail(499,'request_cancelled');
    const release=limiter.acquire();if(!release)fail(429,'requester_rate_limited');
    const {scenario,profile,instruction}=body;
    // One fixed, non-streaming binding call, without gateway, retries, tools,
    // alternate provider, caller text, requested model or requested token limit.
    const inference=Promise.resolve().then(()=>env.AI.run(MODEL,{messages:[
      {role:'system',content:instructions(scenario,profile)},{role:'user',content:instruction}
    ],max_tokens:140,stream:false}));
    // A deadline does not guarantee provider cancellation. Keep its concurrency
    // slot until the actual invocation settles, even after a timeout or abort.
    void inference.then(release,release);
    const result=await limitedInference(inference,request.signal,Math.max(1,Math.min(TIMEOUT_MS,timeoutMs)));
    const raw=result?.response;
    if(typeof raw!=='string'||raw.length>2000||requesterTextIsPrivate(raw)||/<\/?[a-z][^>]*>|```|https?:\/\/|\bwww\./iu.test(raw))fail(502,'unsafe_model_reply');
    const text=compact(raw),answer=text.length>ANSWER_MAX?text.slice(0,ANSWER_MAX-1).trimEnd()+'…':text;
    if(!answer)fail(502,'empty_model_reply');
    return response({enabled:true,answer,kind:'ai',accepted:false,ungraded:true,provider:'cloudflare-workers-ai'},200,origin);
  }catch(error){
    if(error instanceof RequesterError)return fallback(error.status,error.code,origin);
    const status=Number(error?.status||error?.statusCode),code=Number(error?.code);
    if(status===429||code===3036||code===3040)return fallback(429,'requester_quota_or_capacity',origin);
    if(status===408||code===3007||code===3008)return fallback(504,'requester_timeout',origin);
    // Never echo or log provider errors, which can contain prompts or identifiers.
    return fallback(503,'requester_unavailable',origin);
  }
}

// Cloudflare passes an execution context as argument three. Do not treat it as
// the test dependency object, or permit it to override handler policy.
export default {fetch(request,env){return handleRequesterFreeRequest(request,env);}};
