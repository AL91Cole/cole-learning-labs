import {receiptLabId} from './receipt-schema.js?release=20261104-receipts';
import {requestTurnstileToken} from './turnstile-client.js?release=20261104-receipts';

const ORIGINS=new Set(['https://www.colelearninglabs.com','https://colelearninglabs.com']);
const IDLE_MS=60_000;
let currentSession=null;
export const formatActiveTime=seconds=>`${Math.floor(seconds/60)}m ${String(seconds%60).padStart(2,'0')}s`;

// This measures browser engagement, not attention, identity, attendance or grades.
// Settle the elapsed interval BEFORE changing activity or visibility so an idle
// interval can never be filled in by a later pointer or keyboard event.
export function createActiveLabTimer({document=globalThis.document,eventTarget=globalThis.window,now=()=>performance.now(),schedule=globalThis.setInterval,unschedule=globalThis.clearInterval,onChange=()=>{},completed=false}={}){
  let last=now(),lastActivity=last,milliseconds=0,visible=document?.visibilityState==='visible',finished=completed,disposed=false;
  const settle=()=>{
    const next=Math.max(last,now());
    if(!disposed&&!finished&&visible&&lastActivity!==null)milliseconds+=Math.max(0,Math.min(next,lastActivity+IDLE_MS)-last);
    last=next;milliseconds=Math.min(milliseconds,86_400_000);
    const seconds=Math.floor(milliseconds/1000);onChange(seconds);return seconds;
  };
  const activity=event=>{if(event?.isTrusted!==true||disposed||finished)return;settle();if(visible)lastActivity=last;};
  const visibility=()=>{settle();visible=document?.visibilityState==='visible';if(!visible)lastActivity=null;};
  const types=['keydown','pointerdown','pointermove','touchstart','scroll'];
  for(const type of types)eventTarget?.addEventListener?.(type,activity,{passive:true});
  document?.addEventListener?.('visibilitychange',visibility);
  const interval=schedule?.(settle,1000);
  return {
    seconds:settle,
    complete(){const seconds=settle();finished=true;return seconds;},
    reset(){if(disposed)return;last=Math.max(last,now());lastActivity=last;milliseconds=0;finished=false;visible=document?.visibilityState==='visible';onChange(0);},
    dispose(){if(disposed)return;settle();disposed=true;unschedule?.(interval);for(const type of types)eventTarget?.removeEventListener?.(type,activity);document?.removeEventListener?.('visibilitychange',visibility);}
  };
}

export function labReceiptHTML(labId,completed){
  if(!completed||!receiptLabId(labId))return '';
  return '<section class="report-plain" data-lab-receipt aria-label="Optional completion code"><h3>Optional completion code</h3><p>A signed code contains the lab, browser-reported completion percentage, active seconds from this page visit and UTC issue date. It confirms the service issued those values. It does not independently verify your work, identity, attention or grade. Your teacher still reviews your report.</p><p>Requesting a code sends those fields to Cloudflare and uses its security check. Your writing is not sent. Activity totals remain off unless you choose to share them in the lab. <a href="compliance.html">Data privacy details</a> · <a href="verify.html">Teacher code verifier</a></p><button class="button button-outline" type="button" data-receipt-request>Request signed completion code</button><p data-receipt-status role="status"></p><label class="lab-field" data-receipt-output hidden>Completion code<input type="text" readonly data-receipt-code></label><button class="button button-outline" type="button" data-receipt-copy hidden>Copy completion code</button></section>';
}

export function mountLabTelemetry(root,{labId,completed=false,getStep=()=>1,onComplete=()=>{},ownerPreview=false,location=globalThis.location,navigator=globalThis.navigator,document=globalThis.document,eventTarget=globalThis.window,fetcher=globalThis.fetch,tokenProvider=requestTurnstileToken,timerOptions={}}={}){
  const id=receiptLabId(labId),pending=new Set();
  let disposed=false,config=null,sitekey=null,optedIn=false,started=false,finished=completed,completionCode=null,completionPending=null,completionMetricsAttempted=false,attempt=0;
  const timerElement=root?.querySelector?.('[data-lab-active-time]'),shareButton=root?.querySelector?.('[data-lab-metrics-toggle]'),metricsStatus=root?.querySelector?.('[data-lab-metrics-status]');
  const respectsPrivacy=()=>navigator?.globalPrivacyControl!==true&&navigator?.doNotTrack!=='1';
  const approved=!ownerPreview&&ORIGINS.has(location?.origin)&&navigator?.webdriver!==true&&typeof fetcher==='function'&&!!id;
  const timer=createActiveLabTimer({document,eventTarget,completed,...timerOptions,onChange:seconds=>{if(timerElement)timerElement.textContent='Active on this page: '+formatActiveTime(seconds);timerOptions.onChange?.(seconds);}});
  const update=()=>{
    if(shareButton){shareButton.hidden=config?.telemetryEnabled!==true||!respectsPrivacy();shareButton.disabled=finished;shareButton.setAttribute('aria-pressed',String(optedIn));shareButton.textContent=optedIn?'Stop sharing activity totals':'Share activity totals for this visit';}
    if(metricsStatus)metricsStatus.textContent=optedIn?'Sharing aggregate start/completion totals. No writing or personal details are sent.':'Activity totals are off for this visit.';
  };
  async function request(method,payload){
    const controller=new AbortController();let deadline=setTimeout(()=>controller.abort(),method==='GET'?2000:10000);pending.add(controller);
    try{
      let token;
      if(payload){token=await tokenProvider({sitekey,action:'receipt',signal:controller.signal});if(!token||controller.signal.aborted||disposed)return null;clearTimeout(deadline);deadline=setTimeout(()=>controller.abort(),3000);}
      const response=await fetcher('/api/telemetry',{method,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal:controller.signal,...(payload?{headers:{'Content-Type':'application/json','X-CLL-Turnstile':token},body:JSON.stringify(payload)}:{})});
      if(!response.ok)return null;
      const text=await response.text();if(text.length>4096)return null;
      if(method==='GET')sitekey=response.headers.get('X-CLL-Turnstile-Sitekey');
      return JSON.parse(text);
    }catch{return null;}finally{clearTimeout(deadline);pending.delete(controller);}
  }
  const ready=approved?request('GET').then(value=>{if(!disposed){config=value;update();}return value;}):Promise.resolve(null);
  const payload=(eventType,collectTelemetry)=>({labId:id,eventType,activeSeconds:timer.seconds(),stepReached:Math.min(100,Math.max(1,Math.round(getStep())||1)),...(eventType==='complete'?{score:100}:{}),collectTelemetry});
  async function sendStart(){
    if(started||!optedIn||!respectsPrivacy()||disposed||finished||config?.telemetryEnabled!==true)return;
    started=true;
    const result=await request('POST',{...payload('start',true),activeSeconds:0,stepReached:1});
    if(!result?.ok&&!disposed){optedIn=false;update();}
  }
  const share=()=>{if(finished||!respectsPrivacy()||config?.telemetryEnabled!==true)return;optedIn=!optedIn;if(!optedIn)for(const controller of pending)controller.abort();update();if(optedIn)void sendStart();};
  shareButton?.addEventListener?.('click',share);
  const completeEvent=event=>{if(receiptLabId(event?.detail?.labId)!==id||finished)return;session.complete();};
  document?.addEventListener?.('cole:lab-complete',completeEvent);
  const session={
    labId:id,timer,
    complete(){if(finished)return;timer.complete();finished=true;update();onComplete();if(optedIn&&respectsPrivacy()&&config?.telemetryEnabled===true){completionMetricsAttempted=true;const currentAttempt=attempt;completionPending=request('POST',payload('complete',true)).then(value=>{if(!disposed&&attempt===currentAttempt&&value?.ok&&typeof value.completionCode==='string')completionCode=value.completionCode;return value;});}},
    reset(){attempt++;for(const controller of pending)controller.abort();completionCode=null;completionPending=null;completionMetricsAttempted=false;finished=false;started=false;timer.reset();update();if(optedIn)void sendStart();},
    async receipt(){
      await ready;if(disposed||!finished||config?.receiptsEnabled!==true)return {error:'Signed completion codes are unavailable. Your local report is still ready to use.'};
      if(completionPending)await completionPending;if(completionCode)return {code:completionCode};
      const collect=optedIn&&respectsPrivacy()&&!completionMetricsAttempted;completionMetricsAttempted=true;const currentAttempt=attempt;
      completionPending=request('POST',payload('complete',collect));
      const result=await completionPending;if(attempt===currentAttempt)completionPending=null;
      if(disposed||attempt!==currentAttempt)return {error:'This lab visit has ended.'};
      if(result?.ok&&typeof result.completionCode==='string'&&result.completionCode.length<=160){completionCode=result.completionCode;return {code:completionCode};}
      return {error:'A code could not be issued. Keep your local report and try again when the service is available.'};
    },
    dispose(){if(disposed)return;disposed=true;timer.dispose();for(const controller of pending)controller.abort();pending.clear();shareButton?.removeEventListener?.('click',share);document?.removeEventListener?.('cole:lab-complete',completeEvent);if(currentSession===session)currentSession=null;}
  };
  currentSession?.dispose();currentSession=session;update();return session;
}

export function completeLabActivity(activity){
  if(currentSession?.labId===receiptLabId(activity))currentSession.complete();
}

// Keep tools in document flow after the activity, away from the game playfield.
export function mountActivityTelemetry(root,{activity,completed=false,...options}={}){
  if(!receiptLabId(activity)||!root?.ownerDocument?.createElement)return()=>{};
  const panel=root.ownerDocument.createElement('section');panel.className='wrap section lab-receipt-controls';
  panel.innerHTML='<div class="case-panel"><p data-lab-active-time>Active on this page: 0m 00s</p><p class="panel-help">This local timer counts the first minute for reading. It pauses when you leave the tab or stop interacting for 60 seconds, then resumes with your next interaction. It measures this page visit, including when earlier work is resumed. It is not attendance or proof of attention.</p><button type="button" class="button button-outline" data-lab-metrics-toggle hidden>Share activity totals for this visit</button><p data-lab-metrics-status class="panel-help">Activity totals are off for this visit.</p><p class="panel-help">Optional sharing sends fixed lab/event codes, active seconds, completion percentage and step number. The application stores only daily aggregate counts in broad time/score buckets. Cloudflare still receives connection metadata. No work, text, persistent identifiers or action logs are sent. Sharing stops when you leave this activity. No reliable exit event is sent.</p><div data-inline-lab-receipt></div></div>';
  root.append(panel);let disposeReceipt=()=>{};
  const reveal=()=>{const host=panel.querySelector('[data-inline-lab-receipt]');host.innerHTML=labReceiptHTML(activity,true);disposeReceipt();disposeReceipt=mountLabReceiptUI(host,{labId:activity});};
  const session=mountLabTelemetry(panel,{labId:activity,completed,...options,onComplete:reveal});
  const reset=event=>{if(event.isTrusted!==true||!event.target?.closest?.('[data-ga="reset"],[data-ga="restart"],[data-cq="restart"],[data-elementary-action="reset"],[data-id-action="restart"]'))return;disposeReceipt();panel.querySelector('[data-inline-lab-receipt]').replaceChildren();session.reset();};
  root.addEventListener('click',reset,true);
  if(completed)reveal();
  return()=>{disposeReceipt();root.removeEventListener('click',reset,true);session.dispose();panel.remove();};
}

export function mountLabReceiptUI(host,{labId,navigator=globalThis.navigator}={}){
  const section=host?.querySelector?.('[data-lab-receipt]');if(!section)return()=>{};
  const session=currentSession?.labId===receiptLabId(labId)?currentSession:null,button=section.querySelector('[data-receipt-request]'),status=section.querySelector('[data-receipt-status]'),output=section.querySelector('[data-receipt-output]'),field=section.querySelector('[data-receipt-code]'),copy=section.querySelector('[data-receipt-copy]');
  let disposed=false,busy=false;
  const request=async()=>{
    if(busy||disposed)return;busy=true;button.disabled=true;status.textContent='Requesting a signed code…';
    const result=await session?.receipt();if(disposed)return;
    busy=false;button.disabled=false;
    if(result?.code){field.value=result.code;output.hidden=false;copy.hidden=false;button.hidden=true;status.textContent='Code issued for browser-reported completion. Submit it through your teacher’s approved system.';}
    else status.textContent=result?.error||'A code is unavailable for this report. Your local report is still ready to use.';
  };
  const copyCode=async()=>{try{await navigator.clipboard.writeText(field.value);if(!disposed)status.textContent='Completion code copied. Clear the clipboard before sharing this device.';}catch{if(!disposed){field.focus?.();field.select?.();status.textContent='Select the code above and copy it using your device’s copy command.';}}};
  button.addEventListener('click',request);copy.addEventListener('click',copyCode);
  return()=>{disposed=true;button.removeEventListener('click',request);copy.removeEventListener('click',copyCode);};
}
