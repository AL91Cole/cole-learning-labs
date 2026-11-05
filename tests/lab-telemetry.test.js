import test from 'node:test';
import assert from 'node:assert/strict';
import {createActiveLabTimer,mountLabTelemetry,mountActivityTelemetry,completeLabActivity,formatActiveTime,labReceiptHTML} from '../src/lab-telemetry.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function target(){
  const events=new Map();
  return {events,addEventListener(type,fn){if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);},removeEventListener(type,fn){events.get(type)?.delete(fn);},emit(type,event={}){for(const fn of events.get(type)||[])fn(event);},count(){return [...events.values()].reduce((count,set)=>count+set.size,0);}};
}
function clock(){
  let now=0,tick,cancelled=0;const document={...target(),visibilityState:'visible'},window=target(),updates=[];
  const options={document,eventTarget:window,now:()=>now,schedule:fn=>{tick=fn;return 7;},unschedule:id=>{assert.equal(id,7);cancelled++;},onChange:value=>updates.push(value)};
  return {document,window,options,updates,get cancelled(){return cancelled;},advance(ms){now+=ms;tick?.();},at(ms){now=ms;},activity(trusted=true){window.emit('keydown',{isTrusted:trusted});},visibility(state){document.visibilityState=state;document.emit('visibilitychange');}};
}

test('active time counts initial reading, clips at idle deadline and never backfills a later interaction',()=>{
  const c=clock(),timer=createActiveLabTimer(c.options);
  c.advance(70_000);assert.equal(timer.seconds(),60);
  c.activity(false);c.advance(5_000);assert.equal(timer.seconds(),60);
  c.activity();c.advance(1_500);assert.equal(timer.seconds(),61);
  c.advance(58_500);assert.equal(timer.seconds(),120);
  c.advance(300_000);assert.equal(timer.seconds(),120);
  c.activity();c.advance(2_000);assert.equal(timer.seconds(),122);timer.dispose();
});

test('visibility transitions settle the visible interval and resume only after another interaction',()=>{
  const c=clock(),timer=createActiveLabTimer(c.options);
  c.at(10_500);c.visibility('hidden');assert.equal(timer.seconds(),10);
  c.advance(120_000);c.visibility('visible');c.advance(20_000);assert.equal(timer.seconds(),10);
  c.activity();c.advance(1_500);assert.equal(timer.seconds(),12);
  timer.complete();c.activity();c.advance(20_000);assert.equal(timer.seconds(),12);
  timer.dispose();assert.equal(c.cancelled,1);assert.equal(c.window.count(),0);assert.equal(c.document.count(),0);
  timer.dispose();assert.equal(c.cancelled,1);
});

test('each restarted attempt resets elapsed time and completion without retaining old time',()=>{
  const c=clock(),timer=createActiveLabTimer(c.options);c.advance(15_000);timer.complete();
  c.advance(600_000);timer.reset();assert.equal(timer.seconds(),0);
  c.advance(4_000);assert.equal(timer.seconds(),4);timer.dispose();
  assert.equal(formatActiveTime(720),'12m 00s');
});

function fixture(overrides={}){
  const c=clock(),requests=[],button={...target(),hidden:true,disabled:false,setAttribute(){}},status={textContent:''},time={textContent:''};
  const root={querySelector:selector=>selector==='[data-lab-active-time]'?time:selector==='[data-lab-metrics-toggle]'?button:selector==='[data-lab-metrics-status]'?status:null};
  const session=mountLabTelemetry(root,{labId:'INC-101',location:{origin:'https://www.colelearninglabs.com'},navigator:{},document:c.document,eventTarget:c.window,timerOptions:c.options,tokenProvider:async()=> 'test-token',fetcher:async(url,options)=>{requests.push({url,...options});return new Response(JSON.stringify(options.method==='GET'?{receiptsEnabled:true,telemetryEnabled:true}:{ok:true,completionCode:JSON.parse(options.body).eventType==='complete'?'CLL1-INC101-100-0001-261104-0123456789ABCDEF-0123456789ABCDEF0123456789ABCDEF':null}),{headers:{'X-CLL-Turnstile-Sitekey':'0x123456789012345678'}});},...overrides});
  return {c,requests,session,button,status,time,optIn(){button.emit('click');}};
}

test('available service makes no metric POST before opt-in; an explicit receipt keeps collection off',async()=>{
  const f=fixture();await flush();assert.equal(f.requests.length,1);assert.equal(f.button.hidden,false);
  f.c.advance(8_000);f.session.complete();await flush();assert.equal(f.requests.length,1);
  const result=await f.session.receipt();assert.match(result.code,/^CLL1-/);assert.equal(f.requests.length,2);
  assert.deepEqual(JSON.parse(f.requests[1].body),{labId:'INC101',eventType:'complete',activeSeconds:8,stepReached:1,score:100,collectTelemetry:false});
  assert.equal((await f.session.receipt()).code,result.code);assert.equal(f.requests.length,2);
  for(const request of f.requests){assert.equal(request.credentials,'omit');assert.equal(request.referrerPolicy,'no-referrer');assert.equal(request.cache,'no-store');assert.equal(request.redirect,'error');}
  f.session.dispose();
});

test('explicit activity sharing sends bounded start and completion fields and deduplicates finish',async()=>{
  const f=fixture({getStep:()=>3});await flush();f.optIn();await flush();f.c.advance(12_000);f.session.complete();f.session.complete();await flush();
  assert.deepEqual(f.requests.slice(1).map(item=>JSON.parse(item.body)),[
    {labId:'INC101',eventType:'start',activeSeconds:0,stepReached:1,collectTelemetry:true},
    {labId:'INC101',eventType:'complete',activeSeconds:12,stepReached:3,score:100,collectTelemetry:true}
  ]);
  const count=f.requests.length;assert.ok((await f.session.receipt()).code);assert.equal(f.requests.length,count);f.session.dispose();
});

test('privacy signals prevent shared totals while permitting an explicitly requested receipt',async()=>{
  for(const navigator of [{globalPrivacyControl:true},{doNotTrack:'1'}]){
    const f=fixture({navigator});await flush();assert.equal(f.button.hidden,true);f.optIn();f.session.complete();await flush();assert.equal(f.requests.length,1);
    assert.ok((await f.session.receipt()).code);assert.equal(JSON.parse(f.requests[1].body).collectTelemetry,false);f.session.dispose();
  }
});

test('local previews, owner preview and offline service preserve timers without sending measurements',async()=>{
  for(const overrides of [{ownerPreview:true},{location:{origin:'http://127.0.0.1:4173'}},{navigator:{webdriver:true}}]){
    const f=fixture(overrides);f.c.advance(5_000);assert.match(f.time.textContent,/0m 05s/);f.session.complete();assert.ok((await f.session.receipt()).error);assert.equal(f.requests.length,0);f.session.dispose();
  }
  const f=fixture({fetcher:async()=>{throw new Error('offline');}});await flush();f.session.complete();assert.ok((await f.session.receipt()).error);f.session.dispose();
});

test('a lost completion response never sends aggregate totals again during a receipt retry',async()=>{
  const sent=[];let posts=0;
  const f=fixture({fetcher:async(_url,options)=>{if(options.method==='GET')return new Response('{"receiptsEnabled":true,"telemetryEnabled":true}',{headers:{'X-CLL-Turnstile-Sitekey':'0x123456789012345678'}});const value=JSON.parse(options.body);sent.push(value);posts++;if(posts===2)throw new Error('response lost');return new Response(JSON.stringify({ok:true,completionCode:value.eventType==='complete'?'CLL1-TEST':null}));}});
  await flush();f.optIn();await flush();f.session.complete();await flush();assert.equal(sent[1].collectTelemetry,true);
  assert.ok((await f.session.receipt()).code);assert.equal(sent[2].collectTelemetry,false);f.session.dispose();
});

test('a receipt waiting on an old completion cannot sign or count a restarted unfinished attempt',async t=>{
  const sent=[];let finish;
  const f=fixture({fetcher:async(_url,options)=>{
    if(options.method==='GET')return new Response('{"receiptsEnabled":true,"telemetryEnabled":true}',{headers:{'X-CLL-Turnstile-Sitekey':'0x123456789012345678'}});
    const event=JSON.parse(options.body);sent.push(event);
    if(event.eventType==='complete')return new Promise(resolve=>{finish=resolve;});
    return Response.json({ok:true});
  }});t.after(()=>f.session.dispose());
  await flush();f.optIn();await flush();f.session.complete();await flush();
  const receipt=f.session.receipt();await flush();f.session.reset();await flush();
  finish(Response.json({ok:true,completionCode:'CLL1-OLD-ATTEMPT'}));
  assert.ok((await receipt).error);assert.equal(sent.filter(event=>event.eventType==='complete').length,1);
  f.c.advance(3_000);assert.equal(f.session.timer.seconds(),3);
});

test('receipt disclosure distinguishes a signed browser report from identity or independent achievement',()=>{
  assert.equal(labReceiptHTML('INC-101',false),'');assert.equal(labReceiptHTML('UNKNOWN',true),'');
  const html=labReceiptHTML('INC-101',true);assert.match(html,/browser-reported completion percentage/);assert.match(html,/does not independently verify/);assert.match(html,/Your writing is not sent/);
});

test('switching Inbox Defender mode clears a finished receipt and starts a fresh timer',()=>{
  const c=clock(),time={textContent:''},status={textContent:''},button={...target(),setAttribute(){}},host={innerHTML:'',querySelector(){return null;},replaceChildren(){this.innerHTML='';}};
  const panel={innerHTML:'',className:'',remove(){},querySelector(selector){return selector==='[data-inline-lab-receipt]'?host:selector==='[data-lab-active-time]'?time:selector==='[data-lab-metrics-toggle]'?button:status;}};
  const root={...target(),ownerDocument:{createElement:()=>panel},append(){}};
  const cleanup=mountActivityTelemetry(root,{activity:'play/inbox-defender',location:{origin:'http://127.0.0.1:4173'},document:c.document,eventTarget:c.window,timerOptions:c.options});
  c.advance(8_000);completeLabActivity('play/inbox-defender');assert.match(host.innerHTML,/Request signed completion code/);
  const modeControl={closest(selector){return selector.split(',').includes('[data-id-action="mode"]')?this:null;}};
  root.emit('click',{isTrusted:true,target:modeControl});
  assert.equal(host.innerHTML,'');c.advance(4_000);assert.match(time.textContent,/0m 04s/);cleanup();
});

test('reopening a completed investigation clears receipt controls and resumes a fresh attempt',()=>{
  let complete=true;
  const c=clock(),time={textContent:''},status={textContent:''},button={...target(),setAttribute(){}},host={innerHTML:'',querySelector(){return null;},replaceChildren(){this.innerHTML='';}};
  const panel={innerHTML:'',className:'',remove(){},querySelector(selector){return selector==='[data-inline-lab-receipt]'?host:selector==='[data-lab-active-time]'?time:selector==='[data-lab-metrics-toggle]'?button:status;}};
  const root={...target(),ownerDocument:{createElement:()=>panel},append(){}};
  const cleanup=mountActivityTelemetry(root,{activity:'lab/INC-101',completed:true,isComplete:()=>complete,location:{origin:'http://127.0.0.1:4173'},document:c.document,eventTarget:c.window,timerOptions:c.options});
  assert.match(host.innerHTML,/Request signed completion code/);
  complete=false;root.emit('input',{isTrusted:true});assert.equal(host.innerHTML,'');
  c.advance(5_000);assert.match(time.textContent,/0m 05s/);cleanup();
});

test('receipt issuance rechecks that the current report is still complete',async()=>{
  let complete=true;const f=fixture({isComplete:()=>complete});await flush();f.session.complete();complete=false;
  assert.ok((await f.session.receipt()).error);assert.equal(f.requests.length,1);f.session.dispose();
});
