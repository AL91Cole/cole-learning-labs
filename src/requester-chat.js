import {requesterTextIsPrivate} from './interview.js?release=20261025-learning-plans';
import {requesterTopic} from './requester-topics.js?release=20261025-learning-plans';
import {REQUESTER_ENDPOINT} from './requester-config.js?release=20261025-learning-plans';

// Page memory only: cloud contact requires an explicit choice each fresh page.
const pagePreference={enabled:false};
const activeChats=new Set();
export function resetRequesterPreference(){
  pagePreference.enabled=false;
  for(const reset of activeChats)reset();
}

// Automatic availability does not run a model. A new eligible question still
// needs a known topic, backend enablement and a committed shared budget reserve.
export function mountRequesterChat(root,{scenario,fetcher=globalThis.fetch?.bind(globalThis),timeoutMs=12000,endpoint=REQUESTER_ENDPOINT,preference=pagePreference}={}) {
  const toggle=root.querySelector('[data-ai-toggle]'),status=root.querySelector('[data-ai-status]');
  let disposed=false,available=false,useCloud=preference.enabled===true;
  let sequence=0,probeSequence=0,controller=null,probeController=null;
  const say=text=>{if(!disposed)status.textContent=text;};
  function syncToggle(){if(toggle){toggle.setAttribute('aria-pressed',String(useCloud));toggle.textContent=useCloud?'AI replies on':'AI replies off';}}
  function choose(enabled){useCloud=enabled;preference.enabled=enabled;syncToggle();}
  function cancel(){sequence++;controller?.abort();controller=null;}
  function offline(message='Built-in replies are ready.'){
    choose(false);available=false;cancel();probeSequence++;probeController?.abort();probeController=null;say(message);
  }
  const reset=()=>offline();
  activeChats.add(reset);
  async function request(options,{probe=false}={}){
    if(probe){probeSequence++;probeController?.abort();}else cancel();
    const token=probe?probeSequence:sequence,abort=new AbortController();
    if(probe)probeController=abort;else controller=abort;
    const stale=()=>disposed||(probe?probeSequence:sequence)!==token;
    const timer=setTimeout(()=>abort.abort(),timeoutMs);
    try{
      const result=await fetcher(endpoint,{...options,credentials:'omit',cache:'no-store',redirect:'error',signal:abort.signal});
      if(stale())return undefined;
      if(!result.ok)return result.status===429?{limited:true}:null;
      // Bound bytes while reading: an untrusted/chunked provider response must
      // not be buffered in full before its size is checked.
      const declared=result.headers.get('Content-Length');
      if(declared!==null&&(!/^\d+$/u.test(declared)||Number(declared)>4096))throw new Error('oversized');
      const reader=result.body?.getReader();
      if(!reader)throw new Error('empty');
      let raw='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
      try{
        while(true){
          const {done,value}=await reader.read();if(done)break;
          size+=value.byteLength;if(size>4096){void reader.cancel().catch(()=>{});throw new Error('oversized');}
          raw+=decoder.decode(value,{stream:true});
        }
        raw+=decoder.decode();
      }finally{reader.releaseLock();}
      const data=JSON.parse(raw);
      if(stale())return undefined;
      return abort.signal.aborted?null:data;
    }catch{abort.abort();return stale()?undefined:null;}
    finally{
      clearTimeout(timer);
      if(probe&&probeController===abort)probeController=null;
      if(!probe&&controller===abort)controller=null;
    }
  }
  async function checkAvailability(){
    if(disposed||!useCloud||typeof fetcher!=='function')return;
    available=false;
    say('Getting AI replies ready…');
    const data=await request({method:'GET'},{probe:true});
    if(disposed||data===undefined)return;
    available=data?.enabled===true;
    if(!available){offline();return;}
    say(useCloud?'Ready to chat.':'Built-in replies are ready.');
  }
  const onToggle=()=>{
    if(disposed)return;
    if(useCloud){offline();return;}
    choose(true);cancel();
    void checkAvailability();
  };
  toggle?.addEventListener('click',onToggle);
  if(toggle)toggle.disabled=false;syncToggle();
  if(typeof fetcher!=='function'){offline();if(toggle)toggle.disabled=true;}
  else if(useCloud)void checkAvailability();
  else say('Built-in replies are ready.');

  function enrich(question,reply,onGenerated){
    cancel();
    if(disposed||!available||!useCloud||reply?.kind!=='casual'||!reply.accepted)return;
    if(typeof question!=='string'||!question.trim()||question.length>240||requesterTextIsPrivate(question))return;
    const topic=requesterTopic(question);
    if(!topic){say('Built-in reply.');return;}
    say('Adding an AI reply…');
    void request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenarioId:scenario.id,topic})}).then(data=>{
      if(disposed||data===undefined||!useCloud)return;
      if(data?.limited){offline('AI is taking a break. Switched to built-in replies automatically.');return;}
      if(!data||data.kind!=='ai'||data.ungraded!==true||typeof data.answer!=='string'||!data.answer.trim()||data.answer.length>600||requesterTextIsPrivate(data.answer)){
        offline('Switched to built-in replies automatically.');return;
      }
      say('Check the reply against your evidence.');
      onGenerated?.(data.answer.trim());
    });
  }
  return {enrich,cancel,dispose(){
    if(disposed)return;
    disposed=true;cancel();probeSequence++;probeController?.abort();probeController=null;available=false;
    activeChats.delete(reset);
    toggle?.removeEventListener?.('click',onToggle);
  }};
}
