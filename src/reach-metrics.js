import {reachActivity,validateReachEvent} from './reach-schema.js?release=20261102-turnstile';
import {requestTurnstileToken} from './turnstile-client.js?release=20261102-turnstile';

const ORIGINS=new Set(['https://www.colelearninglabs.com','https://colelearninglabs.com']);
const CONTROLS=Object.freeze({
  lab:'#question-form button,[data-clue],[data-question],#idea-form button,#workspace button,.lab-shell textarea,#run-hypothesis-test,#verify-task,[data-experiment-save]',
  arcade:'button[data-ga]',quests:'button[data-cq],[data-cq-first],[data-cq-second]',
  explore:'button[data-elementary-action]',
  learn:'.foundation-lab button,.foundation-lab textarea,.foundation-lab input',
  play:'button[data-id-action]',
  tool:'.network-studio button,.network-studio input,.coding-studio button,.coding-studio textarea,.code-lab button,.code-lab textarea,[data-practice-workspace] button'
});
let current=null;
export function recordReachCompletion(activity){try{current?.complete(activity);}catch{/* Analytics must not interrupt learning. */}}
export function reachPrivacyHTML(){return '<section data-reach-notice><h2>Aggregate activity counts</h2><p data-reach-status>'+(current?.active()?'Activity counting is on for this page.':'Activity counting is off for this page.')+'</p><p>When enabled on the main US website, a meaningful interaction can add one activity-start count. Finishing a defined activity can add one completion count. Open-ended studios count use, not completion. Repeating an activity during the same page visit does not add another count. Leaving or reloading can add another count.</p><p>Only a fixed activity code, start/completion code and schema version are sent to Cloudflare. The application stores monthly totals, with the current and previous two months retained. It does not send work, names, answers, code, raw URLs, exact event times or persistent visitor IDs. The application does not store IP addresses. Cloudflare still processes connection/security metadata. Counts are estimates of browser engagement; automated browsers can imitate interaction. They are not unique people, attendance or grades.</p><p>Counts honor Global Privacy Control and Do Not Track. Previews and conventional automated test browsers are excluded. You can stop counts for this page below; that choice resets on a fresh page. Totals already received cannot be linked back to you or individually removed. Contact support@colelearninglabs.com about the service and provider-held data.</p><button type="button" class="button button-outline" data-reach-stop'+(current?.active()?'':' disabled')+'>Stop activity counts for this page</button></section>';}

// No record, answer, value, URL, referrer, time, IP, cookie, or visitor ID is read
// into an event. Memory-only deduplication counts each activity at most once per
// document. Counts describe engaged browser activity, never verified people.
export function mountReachMetrics(root,{
  location=globalThis.location,navigator=globalThis.navigator,document=globalThis.document,
  fetcher=globalThis.fetch,tokenProvider=requestTurnstileToken,ownerPreview=false
}={}){
  const stopped={dispose(){},complete(){}};
  if(ownerPreview||!ORIGINS.has(location?.origin)||navigator?.webdriver===true||navigator?.globalPrivacyControl===true||navigator?.doNotTrack==='1'||!root?.addEventListener||typeof fetcher!=='function')return stopped;
  let enabled=false,disposed=false,sitekey=null;const started=new Set(),completed=new Set(),pending=new Set();
  const visible=()=>document?.visibilityState==='visible';
  const notice=()=>{const status=root.querySelector?.('[data-reach-status]'),stop=root.querySelector?.('[data-reach-stop]');if(status)status.textContent=enabled?'Activity counting is on for this page.':'Activity counting is off for this page.';if(stop)stop.disabled=!enabled;};
  async function request(method,payload){
    const controller=new AbortController();let timer=setTimeout(()=>controller.abort(),method==='GET'?2000:10000);pending.add(controller);
    try{
      let proof;
      if(payload){proof=await tokenProvider({sitekey,action:'reach',signal:controller.signal});if(!proof||controller.signal.aborted||disposed||!enabled)return null;clearTimeout(timer);timer=setTimeout(()=>controller.abort(),2000);}
      const response=await fetcher('/api/reach',{method,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal:controller.signal,...(payload?{headers:{'Content-Type':'application/json','X-CLL-Turnstile':proof},body:JSON.stringify(payload)}:{})});
      if(!response.ok)return null;
      if(method!=='GET')return true;
      const raw=await response.text();if(raw.length>64)return null;
      sitekey=response.headers.get('X-CLL-Turnstile-Sitekey');
      return JSON.parse(raw);
    }catch{return null;}finally{clearTimeout(timer);pending.delete(controller);}
  }
  void request('GET').then(config=>{if(!disposed){enabled=config?.enabled===true;notice();}});
  const send=(activity,metric)=>{
    if(!enabled||disposed||!visible())return false;
    const payload=validateReachEvent({version:1,activity,metric});if(!payload)return false;
    void request('POST',payload).then(ok=>{if(!ok){enabled=false;notice();}});return true;
  };
  const interact=event=>{
    if(event.isTrusted!==true||!enabled||disposed||!visible())return;
    if(event.type==='click'&&event.target?.closest?.('[data-reach-stop]')){enabled=false;for(const controller of pending)controller.abort();notice();return;}
    const activity=reachActivity(location.hash);if(!activity||started.has(activity))return;
    const target=event.target?.closest?.(CONTROLS[activity.split('/')[0]]);
    if(!target||target.disabled||!root.contains(target)||target.closest?.('[data-guide-target]')||target.closest?.('[hidden]'))return;
    const action=target.dataset?.ga||target.dataset?.cq||target.dataset?.elementaryAction||target.dataset?.idAction;
    if(['reset','restart','retry','room','play-trace','step','topic','workshop','mode'].includes(action)||['foundationSection','foundationNext','foundationBack','foundationOpenTools'].some(key=>Object.hasOwn(target.dataset||{},key))||target.id==='close-ticket'||target.id==='dialog-close'||target.id==='capstone-report'||target.id==='clear-work'||target.closest?.('.lab-section-tabs,.learning-brief,.lab-topbar'))return;
    if(send(activity,'start'))started.add(activity);
  };
  const counter={
    active:()=>enabled&&!disposed,
    complete(activity){if(activity!==reachActivity(location.hash)||!started.has(activity)||completed.has(activity))return;if(send(activity,'complete'))completed.add(activity);},
    dispose(){if(disposed)return;disposed=true;enabled=false;for(const controller of pending)controller.abort();pending.clear();for(const type of ['click','input','change'])root.removeEventListener(type,interact,true);if(current===counter)current=null;}
  };
  for(const type of ['click','input','change'])root.addEventListener(type,interact,true);
  current?.dispose();current=counter;return counter;
}
