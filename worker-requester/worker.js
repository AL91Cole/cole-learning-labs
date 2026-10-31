/** Optional topic-only fictional conversation with shared early budget admission. */
import {requesterTextIsPrivate} from '../src/interview.js';
import {reserveRequesterBudget,requesterBudgetReservationCurrent} from './budget.js';

import {PRIVATE_REQUESTER_URL,RequesterError,failRequester,readRequesterTopic} from './contract.js';

const MODEL='@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const REQUESTER_PRIVATE_ACTIVATION_APPROVED=true;
const ANSWER_MAX=600;
const TIMEOUT_MS=12_000;
const PROMPT_BYTES_MAX=2500;
const compact=value=>value.replace(/\s+/gu,' ').trim();
const bounded=(value,max)=>typeof value==='string'?compact(value).slice(0,max):'';

const fail=failRequester;
function response(body,status,extra={}) {
  return new Response(body===null?null:JSON.stringify(body),{status,headers:{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
    ...extra
  }});
}
const fallback=(status,error)=>response({enabled:false,error,fallback:true,accepted:false},status);

/** Anonymous per-isolate backstop, NOT a global quota or spending cap. Other
 * isolates/restarts have independent counters. The persistent early-budget
 * D1 admission below is shared across isolates. Neither mechanism can
 * control unrelated AI use or impose a provider-wide billing cap. No identity is kept. */
export function createRequesterRateLimiter({now=Date.now}={}) {
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
const rateLimiter=createRequesterRateLimiter();

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
export async function handleRequesterRequest(request,env,{limiter=rateLimiter,timeoutMs=TIMEOUT_MS}={}) {
  try{
    if(request.url!==PRIVATE_REQUESTER_URL)fail(403,'private_route_required');
    if(!['GET','POST'].includes(request.method))return response({enabled:false,error:'method_not_allowed',fallback:true,accepted:false},405,{Allow:'GET, POST'});
    // Workers may add Content-Length when transporting the gateway's fixed JSON
    // body. It is framing only; readRequesterTopic still bounds declared and actual bytes.
    for(const name of request.headers.keys()){
      const header=name.toLowerCase();
      if(header!=='content-type'&&(request.method!=='POST'||header!=='content-length'))fail(403,'forwarded_headers_not_allowed');
    }
    if(env?.REQUESTER_ENABLED!=='true'||env?.REQUESTER_BILLING_REVIEWED!=='true')fail(503,'requester_not_enabled');
    if(request.signal.aborted)fail(499,'request_cancelled');
    const body=request.method==='POST'?await readRequesterTopic(request):null;
    if(typeof env?.AI?.run!=='function'||typeof env?.REQUESTER_BUDGET?.prepare!=='function')fail(503,'requester_not_configured');
    if(request.method==='GET')return response({enabled:true,provider:'cloudflare-workers-ai',requiresConsent:true},200);
    if(request.signal.aborted)fail(499,'request_cancelled');
    const release=limiter.acquire();if(!release)fail(429,'requester_rate_limited');
    const {scenario,profile,instruction}=body;
    const messages=[{role:'system',content:instructions(scenario,profile)},{role:'user',content:instruction}];
    if(new TextEncoder().encode(JSON.stringify(messages)).byteLength>PROMPT_BYTES_MAX){release();fail(503,'requester_prompt_limit');}
    // A successful committed reservation is mandatory before inference. Errors,
    // timeouts, cancellation and rejected output never refund a reservation.
    const reservation=await reserveRequesterBudget(env.REQUESTER_BUDGET);
    if(!reservation.ok){release();fail(reservation.error==='requester_budget_exhausted'?429:503,reservation.error);}
    if(request.signal.aborted){release();fail(499,'request_cancelled');}
    if(!requesterBudgetReservationCurrent(reservation)){release();fail(429,'requester_budget_rollover');}
    // One fixed, non-streaming binding call, without gateway, retries, tools,
    // alternate provider, caller text, requested model or requested token limit.
    const inference=Promise.resolve().then(()=>{
      if(request.signal.aborted||!requesterBudgetReservationCurrent(reservation))throw new RequesterError(429,'requester_budget_rollover');
      return env.AI.run(MODEL,{messages,max_tokens:140,stream:false});
    });
    // A deadline does not guarantee provider cancellation. Keep its concurrency
    // slot until the actual invocation settles, even after a timeout or abort.
    void inference.then(release,release);
    const result=await limitedInference(inference,request.signal,Math.max(1,Math.min(TIMEOUT_MS,timeoutMs)));
    const raw=result?.response;
    if(typeof raw!=='string'||raw.length>2000||requesterTextIsPrivate(raw)||/<\/?[a-z][^>]*>|```|https?:\/\/|\bwww\./iu.test(raw))fail(502,'unsafe_model_reply');
    const text=compact(raw),answer=text.length>ANSWER_MAX?text.slice(0,ANSWER_MAX-1).trimEnd()+'…':text;
    if(!answer)fail(502,'empty_model_reply');
    return response({enabled:true,answer,kind:'ai',accepted:false,ungraded:true,provider:'cloudflare-workers-ai'},200);
  }catch(error){
    if(error instanceof RequesterError)return fallback(error.status,error.code);
    const status=Number(error?.status||error?.statusCode),code=Number(error?.code);
    if(status===429||code===3036||code===3040)return fallback(429,'requester_quota_or_capacity');
    if(status===408||code===3007||code===3008)return fallback(504,'requester_timeout');
    // Never echo or log provider errors, which can contain prompts or identifiers.
    return fallback(503,'requester_unavailable');
  }
}

// Cloudflare passes an execution context as argument three. Do not treat it as
// the test dependency object, or permit it to override handler policy.
export default {fetch(request,env){
  // Only the private binding contract and independently enabled runtime flags
  // can reach inference. Classroom and improvement approval remain separate.
  if(!REQUESTER_PRIVATE_ACTIVATION_APPROVED)return fallback(503,'requester_private_activation_required');
  return handleRequesterRequest(request,env);
}};
