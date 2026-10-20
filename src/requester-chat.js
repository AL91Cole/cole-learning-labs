import {requesterTextIsPrivate} from './interview.js?release=20261020-chromebook24';

// Optional remote conversation is separate from the authored case evidence.
// No questions leave the page until availability, consent and mode all agree.
export function mountRequesterChat(root,{scenario,fetcher=globalThis.fetch?.bind(globalThis),timeoutMs=12000}={}) {
  const check=root.querySelector('[data-ai-check]'),toggle=root.querySelector('[data-ai-toggle]');
  const consent=root.querySelector('[data-ai-consent]'),status=root.querySelector('[data-ai-status]');
  let disposed=false,available=false,sequence=0,controller=null;
  const say=text=>{if(!disposed)status.textContent=text;};
  function cancel(){sequence++;controller?.abort();controller=null;}
  function offline(message='Fast character is on. No question is sent to an AI provider.'){
    toggle.checked=false;cancel();say(message);
  }
  async function request(options){
    cancel();const token=sequence,abort=new AbortController();controller=abort;
    const timer=setTimeout(()=>abort.abort(),timeoutMs);
    try {
      const result=await fetcher('/api/requester',{...options,credentials:'omit',cache:'no-store',redirect:'error',signal:abort.signal});
      if(disposed||sequence!==token)return undefined;
      if(!result.ok)return result.status===429?{limited:true}:null;
      const raw=await result.text();
      if(raw.length>4096)throw new Error('oversized');
      const data=JSON.parse(raw);
      if(disposed||sequence!==token)return undefined;
      if(abort.signal.aborted)return null;
      return data;
    }catch{return disposed||sequence!==token?undefined:null;}finally{clearTimeout(timer);if(controller===abort)controller=null;}
  }
  async function checkAvailability(){
    if(disposed||typeof fetcher!=='function')return;
    check.disabled=true;say('Checking the free AI option. Your question stays on this page.');
    const data=await request({method:'GET'});
    if(disposed)return;
    check.disabled=false;
    if(data===undefined)return;
    available=data?.enabled===true;
    toggle.disabled=!available;
    check.disabled=false;
    if(!available)offline('Free AI is not available here yet. The fast character is ready; no question was sent.');
    else say('Free AI is available. Read the note and choose “Use free AI” if you want to send fictional questions to Cloudflare.');
  }
  check.addEventListener('click',checkAvailability);
  consent.addEventListener('change',()=>{if(!consent.checked)offline();});
  toggle.addEventListener('change',()=>{
    if(!available||!consent.checked){offline('Before using AI, confirm that you will use fictional details and that questions go to Cloudflare.');return;}
    cancel();say(toggle.checked?'Free AI is on for extra conversation. Case clues still come from the lab.':'Fast character is on. No question is sent to an AI provider.');
  });
  function enrich(question,reply,onGenerated){
    cancel();
    // Case answers always use the actual authored facts/current local simulation.
    if(disposed||!available||!toggle.checked||!consent.checked||reply?.kind!=='casual'||!reply.accepted)return;
    if(typeof question!=='string'||!question.trim()||question.length>240||requesterTextIsPrivate(question))return;
    say('The fast reply is ready. Asking free AI for another response…');
    void request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenarioId:scenario.id,question:question.trim()})}).then(data=>{
      if(disposed||data===undefined||!toggle.checked||!consent.checked)return;
      if(data?.limited){offline('AI has reached an allowance or request limit. Switched to the fast character automatically. Your work is unchanged.');return;}
      if(!data||data.kind!=='ai'||data.ungraded!==true||typeof data.answer!=='string'||!data.answer.trim()||data.answer.length>600||requesterTextIsPrivate(data.answer)){
        say('AI is busy or unavailable, or the free allowance is used up. Keep using the fast character.');return;
      }
      say('AI extra reply · check it before trusting it. It does not count as a case clue.');
      onGenerated?.(data.answer.trim());
    });
  }
  return {enrich,cancel,dispose(){if(disposed)return;cancel();disposed=true;available=false;toggle.checked=false;}};
}
