import {SCENARIOS} from '../src/scenarios.js';
import {requesterPersona} from '../src/requester-persona.js';
import {requesterTopicInstruction} from '../src/requester-topics.js';
import {requesterTextIsPrivate} from '../src/interview.js';

export const PRIVATE_REQUESTER_URL='https://requester.internal/api/requester';
const labs=new Map(SCENARIOS.map(scenario=>[scenario.id,scenario]));
export class RequesterError extends Error{
  constructor(status,code){super(code);this.status=status;this.code=code;}
}
export const failRequester=(status,code)=>{throw new RequesterError(status,code);};

/** Read a bounded stream without trusting Content-Length or waiting indefinitely. */
export async function readBoundedJson(source,{maxBytes=600,deadlineMs=2000,signal}={}){
  const declared=source.headers.get('Content-Length');
  if(declared!==null&&(!/^\d+$/u.test(declared)||Number(declared)>maxBytes))failRequester(413,'request_too_large');
  const reader=source.body?.getReader();if(!reader)failRequester(400,'invalid_json');
  let timer,abort,raw='',size=0;
  const decoder=new TextDecoder('utf-8',{fatal:true});
  const deadline=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new RequesterError(408,'request_timeout')),Math.max(1,Math.min(2000,deadlineMs)));
    abort=()=>reject(new RequesterError(499,'request_cancelled'));
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  });
  try{
    while(true){
      const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;
      size+=value.byteLength;if(size>maxBytes)failRequester(413,'request_too_large');
      raw+=decoder.decode(value,{stream:true});
    }
    raw+=decoder.decode();return JSON.parse(raw);
  }catch(error){
    void reader.cancel().catch(()=>{});
    if(error instanceof RequesterError)throw error;
    failRequester(400,'invalid_json');
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);reader.releaseLock();}
}

export function validateRequesterTopic(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2||
    !Object.hasOwn(body,'scenarioId')||!Object.hasOwn(body,'topic'))failRequester(400,'invalid_request');
  if(typeof body.scenarioId!=='string'||!labs.has(body.scenarioId))failRequester(400,'unknown_scenario');
  const instruction=requesterTopicInstruction(body.topic);
  if(typeof instruction!=='string'||!instruction||instruction.length>1200)failRequester(400,'unknown_topic');
  const scenario=labs.get(body.scenarioId),profile=requesterPersona(scenario.id);
  if(!profile)failRequester(400,'unknown_scenario');
  return {payload:{scenarioId:scenario.id,topic:body.topic},scenario,profile,instruction};
}

export async function readRequesterTopic(request,options={}){
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(request.headers.get('Content-Type')||''))failRequester(415,'json_required');
  if(request.headers.has('Content-Encoding'))failRequester(415,'encoded_body_not_allowed');
  return validateRequesterTopic(await readBoundedJson(request,{...options,maxBytes:600,signal:request.signal}));
}

export function validRequesterAnswer(value){
  return typeof value==='string'&&value.trim().length>0&&value.length<=600&&
    !requesterTextIsPrivate(value)&&!/<\/?[a-z][^>]*>|```|https?:\/\/|\bwww\./iu.test(value);
}
