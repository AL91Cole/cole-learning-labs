import {IMPROVEMENT_ACTIVITIES,validateImprovementSummary} from './improvement-schema.js?release=20261025-learning-plans';
import {IMPROVEMENT_SHARING_ENABLED,IMPROVEMENT_ENDPOINT} from './improvement-config.js?release=20261025-learning-plans';

const activePanels=new Set();
const labels=Object.freeze({
  outcome:Object.freeze({finished:'I finished the goal',needed_help:'I needed help',not_finished:'I could not finish',exploring:'I was exploring'}),
  attempts:Object.freeze({one:'One attempt',two_or_three:'Two or three attempts',four_plus:'Four or more attempts',not_applicable:'Not applicable'}),
  issue:Object.freeze({none:'No problem to report',instructions:'The instructions were confusing',controls:'The controls were difficult',test_result:'A test result was confusing',display:'Something did not display correctly',other:'Another problem'})
});
const esc=value=>String(value).replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=field=>'<option value="">Choose one</option>'+Object.entries(labels[field]).map(([value,label])=>`<option value="${value}">${label}</option>`).join('');

/** Revocation is page-memory only. Information already aggregated cannot be recalled. */
export function resetLabImprovements(){for(const reset of activePanels)reset();}

async function acceptedReply(response){
  if(response.status!==202||!/^application\/json(?:\s*;|$)/iu.test(response.headers.get('Content-Type')||''))return false;
  const declared=response.headers.get('Content-Length');
  if(declared!==null&&(!/^\d+$/u.test(declared)||Number(declared)>512))throw new Error('Invalid acknowledgement.');
  const reader=response.body?.getReader();if(!reader)throw new Error('Missing acknowledgement.');
  const decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='';
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>512){void reader.cancel().catch(()=>{});throw new Error('Oversized acknowledgement.');}
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
  }finally{reader.releaseLock();}
  const data=JSON.parse(text);
  return !!data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).length===1&&data.accepted===true;
}

/**
 * An explicit self-report, not observation of learner work. This component
 * accepts only an authored activity key and fixed choices; it never reads a
 * lab record, saved work, typed answers, URL, or browser identity.
 */
export function mountLabImprovements(root,{activity,fetcher=globalThis.fetch?.bind(globalThis),sharingEnabled=IMPROVEMENT_SHARING_ENABLED,timeoutMs=8000}={}){
  if(!root||typeof root.querySelector!=='function')return ()=>{};
  const authored=IMPROVEMENT_ACTIVITIES.find(item=>item.id===activity);
  if(!authored){root.replaceChildren();return ()=>{};}
  const enabled=sharingEnabled===true&&typeof fetcher==='function';
  root.innerHTML=`<details class="improvement-panel"><summary>Help improve this lab (optional)</summary><div class="prose"><h2>Share a few counts</h2><p><strong>${esc(authored.title)}</strong></p><p>This optional self-report helps improve the labs. It is not a grade or a classroom submission. No improvement summary is sent while you use the simulation or make these choices.</p><p>Only this lab's fixed code and your choices below would be sent. Lab notes, written answers, source code, names, cookies, and individual identifiers are excluded. Cloudflare handles connection information when you send. Accepted summaries merge into totals and cannot be individually retrieved or removed afterward. <a href="#privacy">Read the privacy information</a>.</p>${!enabled?'<p class="guide-callout">Online sharing is not enabled pending privacy and school review. No improvement summary is sent.</p>':''}<form data-improvement-form><p><label class="lab-field">What happened?<select data-improvement-outcome required>${options('outcome')}</select></label></p><p><label class="lab-field">How many attempts did you make?<select data-improvement-attempts required>${options('attempts')}</select></label></p><p><label class="lab-field">Was there a problem?<select data-improvement-issue required>${options('issue')}</select></label></p><p><button class="button button-outline" type="submit" data-improvement-review>Review this summary</button> <button class="button button-outline" type="button" data-improvement-clear>Clear choices</button></p></form><section data-improvement-preview hidden aria-label="Summary to review"><h3>Review exactly what would be shared</h3><p data-improvement-summary></p><p class="panel-help">These are unverified submissions. Repeated submissions may be counted again; the totals do not measure distinct people.</p><label><input data-improvement-consent type="checkbox"> I choose to send only these counts to help improve the labs.</label><p><button class="button" type="button" data-improvement-send disabled>Share these counts</button></p></section><p data-improvement-status role="status" aria-live="polite"></p></div></details>`;
  const find=name=>root.querySelector(`[data-improvement-${name}]`);
  const fields=Object.fromEntries(['outcome','attempts','issue'].map(name=>[name,find(name)]));
  const form=find('form'),review=find('review'),clear=find('clear'),preview=find('preview'),summary=find('summary'),consent=find('consent'),send=find('send'),status=find('status');
  let reviewed=null,disposed=false,sent=false,pending=null,sequence=0;
  const say=text=>{if(!disposed)status.textContent=text;};
  const current=()=>validateImprovementSummary({version:1,activity,...Object.fromEntries(Object.entries(fields).map(([field,node])=>[field,node.value]))});
  function sync(){send.disabled=!enabled||sent||!!pending||!reviewed||consent.checked!==true;}
  function cancel(){sequence++;pending?.controller.abort();pending=null;}
  function invalidate(message='Choices changed. Review the summary again before sharing.'){
    const wasPending=!!pending;cancel();reviewed=null;consent.checked=false;preview.hidden=true;summary.textContent='';sync();
    say(wasPending?'The pending request was cancelled. Information already sent cannot be recalled.':message);
  }
  function reset(){
    if(disposed)return;invalidate('Choices and sharing permission cleared.');sent=false;
    for(const field of Object.values(fields)){field.value='';field.disabled=false;}
    review.disabled=false;clear.disabled=false;consent.disabled=false;sync();
  }
  const onChange=()=>{if(!disposed&&!sent)invalidate();};
  const onReview=event=>{
    event.preventDefault();if(disposed||sent||pending)return;
    reviewed=current();consent.checked=false;
    if(!reviewed){preview.hidden=true;sync();say('Choose an answer in each field before reviewing.');return;}
    summary.textContent=`Lab: ${authored.title} (${activity}). Result: ${labels.outcome[reviewed.outcome]}. Attempts: ${labels.attempts[reviewed.attempts]}. Problem: ${labels.issue[reviewed.issue]}. Format: version 1.`;
    preview.hidden=false;sync();say(enabled?'Review the summary, then choose whether to send it.':'You can review these choices locally. Online sharing remains disabled.');
  };
  const onConsent=()=>{if(!disposed){if(!consent.checked&&pending)invalidate('Sharing permission cleared.');else sync();}};
  const onClear=()=>{if(!sent)reset();};
  const onSend=async()=>{
    if(disposed||!enabled||sent||pending||!reviewed||consent.checked!==true)return;
    const value=current();
    if(!value||JSON.stringify(value)!==JSON.stringify(reviewed)){invalidate();return;}
    const token=++sequence,controller=new AbortController();let timer;
    pending={controller};sync();say('Sending the reviewed counts…');
    const cancelled=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('Cancelled.')),{once:true}));
    timer=setTimeout(()=>controller.abort(),Math.max(1,Math.min(8000,timeoutMs)));
    const stale=()=>disposed||sequence!==token;
    try{
      const transport=(async()=>acceptedReply(await fetcher(IMPROVEMENT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reviewed),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal:controller.signal})))();
      const accepted=await Promise.race([transport,cancelled]);
      if(stale())return;
      if(!accepted)throw new Error('Not confirmed.');
      sent=true;pending=null;consent.checked=false;consent.disabled=true;
      for(const field of Object.values(fields))field.disabled=true;
      review.disabled=true;clear.disabled=true;sync();
      say('Counts accepted into the aggregate totals. No individual report or receipt identifier is retained.');
    }catch{
      controller.abort();if(stale())return;
      pending=null;reviewed=null;consent.checked=false;sync();
      say('Sharing was not confirmed. The counts may already have reached the totals. No automatic retry is made; review again only if you choose.');
    }finally{clearTimeout(timer);if(!stale()&&pending?.controller===controller){pending=null;sync();}}
  };
  for(const field of Object.values(fields))field.addEventListener('change',onChange);
  form.addEventListener('submit',onReview);clear.addEventListener('click',onClear);consent.addEventListener('change',onConsent);send.addEventListener('click',onSend);
  activePanels.add(reset);sync();
  return ()=>{
    if(disposed)return;disposed=true;cancel();activePanels.delete(reset);
    for(const field of Object.values(fields))field.removeEventListener('change',onChange);
    form.removeEventListener('submit',onReview);clear.removeEventListener('click',onClear);consent.removeEventListener('change',onConsent);send.removeEventListener('click',onSend);
    reviewed=null;consent.checked=false;root.replaceChildren();
  };
}
