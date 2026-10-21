import {requesterTextIsPrivate} from './interview.js?release=20261021-chat27';
import {requesterTopic} from './requester-topics.js?release=20261021-chat27';
import {REQUESTER_ENDPOINT} from './requester-config.js?release=20261021-chat27';

// Page memory only: an off choice or automatic fallback survives lab changes.
const pagePreference={enabled:true};

// Automatic availability does not run a model. A new eligible question still
// needs a known topic, backend enablement and a committed shared budget reserve.
export function mountRequesterChat(root,{scenario,fetcher=globalThis.fetch?.bind(globalThis),timeoutMs=12000,endpoint=REQUESTER_ENDPOINT,preference=pagePreference}={}) {
  const check=root.querySelector('[data-ai-check]'),toggle=root.querySelector('[data-ai-toggle]'),status=root.querySelector('[data-ai-status]');
  let disposed=false,available=false,useCloud=preference.enabled!==false;
  let sequence=0,probeSequence=0,controller=null,probeController=null;
  const say=text=>{if(!disposed)status.textContent=text;};
  function syncToggle(){toggle.setAttribute('aria-pressed',String(useCloud));toggle.textContent=useCloud?'Cloud replies on':'Cloud replies off';}
  function choose(enabled){useCloud=enabled;preference.enabled=enabled;syncToggle();}
  function cancel(){sequence++;controller?.abort();controller=null;}
  function offline(message='Cloud replies are off. The built-in requester is ready; your question stays on this page.'){
    choose(false);cancel();say(message);
  }
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
      const raw=await result.text();
      if(raw.length>4096)throw new Error('oversized');
      const data=JSON.parse(raw);
      if(stale())return undefined;
      return abort.signal.aborted?null:data;
    }catch{return stale()?undefined:null;}
    finally{
      clearTimeout(timer);
      if(probe&&probeController===abort)probeController=null;
      if(!probe&&controller===abort)controller=null;
    }
  }
  async function checkAvailability(){
    if(disposed||typeof fetcher!=='function')return;
    check.disabled=true;say('Checking cloud replies. Your typed question stays here.');
    const data=await request({method:'GET'},{probe:true});
    if(disposed||data===undefined)return;
    check.disabled=false;available=data?.enabled===true;
    if(!available){offline('Cloud replies are unavailable. The built-in requester will keep answering.');return;}
    say(useCloud?'Cloud replies are on for familiar topics. Case clues still come from the lab.':'Cloud replies are available but turned off. The built-in requester is ready.');
  }
  const onCheck=()=>{void checkAvailability();};
  const onToggle=()=>{
    if(disposed)return;
    if(useCloud){offline();return;}
    choose(true);cancel();
    if(available)say('Cloud replies are on for familiar topics. Case clues still come from the lab.');
    else void checkAvailability();
  };
  check.addEventListener('click',onCheck);toggle.addEventListener('click',onToggle);
  toggle.disabled=false;syncToggle();
  if(typeof fetcher!=='function'){offline('Cloud replies are unavailable in this browser. The built-in requester is ready.');check.disabled=true;toggle.disabled=true;}
  else if(useCloud)void checkAvailability();
  else say('Cloud replies are off. The built-in requester is ready; your question stays on this page.');

  function enrich(question,reply,onGenerated){
    cancel();
    if(disposed||!available||!useCloud||reply?.kind!=='casual'||!reply.accepted)return;
    if(typeof question!=='string'||!question.trim()||question.length>240||requesterTextIsPrivate(question))return;
    const topic=requesterTopic(question);
    if(!topic){say('The built-in requester answered locally. This wording is not sent to cloud AI.');return;}
    say('The local reply is ready. Cloud AI is adding another response…');
    void request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenarioId:scenario.id,topic})}).then(data=>{
      if(disposed||data===undefined||!useCloud)return;
      if(data?.limited){offline('The shared AI allowance or request limit is reached. Switched to built-in replies automatically. Your work is unchanged.');return;}
      if(!data||data.kind!=='ai'||data.ungraded!==true||typeof data.answer!=='string'||!data.answer.trim()||data.answer.length>600||requesterTextIsPrivate(data.answer)){
        offline('Cloud AI is busy or unavailable. Switched to built-in replies automatically. Your work is unchanged.');return;
      }
      say('AI extra reply · check it before trusting it. It does not count as a case clue.');
      onGenerated?.(data.answer.trim());
    });
  }
  return {enrich,cancel,dispose(){
    if(disposed)return;
    disposed=true;cancel();probeSequence++;probeController?.abort();probeController=null;available=false;
    check.removeEventListener?.('click',onCheck);toggle.removeEventListener?.('click',onToggle);
  }};
}
