import test from 'node:test';
import assert from 'node:assert/strict';
import {REACH_ACTIVITIES,validateReachEvent,reachActivity} from '../src/reach-schema.js';
import {mountReachMetrics,recordReachCompletion} from '../src/reach-metrics.js';
import {ELEMENTARY_LABS} from '../src/elementary-labs.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(overrides={}){
  const handlers=new Map(),requests=[],location={origin:'https://www.colelearninglabs.com',hash:'#arcade/garden-rover'},document={visibilityState:'visible'};
  const control={disabled:false,dataset:{ga:'append'},closest:()=>null};
  const root={contains:item=>item===control,addEventListener:(type,fn,capture)=>{assert.equal(capture,true);handlers.set(type,fn);},removeEventListener:type=>handlers.delete(type)};
  const counter=mountReachMetrics(root,{root,location,document,navigator:{},fetcher:async(url,options)=>{requests.push({url,...options});return new Response(JSON.stringify(options.method==='GET'?{enabled:true}:{accepted:true}));},...overrides});
  return {counter,handlers,requests,location,document,control,act(trusted=true){handlers.get('click')?.({type:'click',isTrusted:trusted,target:{closest:selector=>selector==='[data-reach-stop]'?null:control}});}};
}
test('reach schema covers all 100 bounded activities and four open-ended tools without URLs or free text',()=>{
  assert.equal(REACH_ACTIVITIES.length,104);assert.equal(new Set(REACH_ACTIVITIES).size,104);
  for(const lab of ELEMENTARY_LABS)assert.ok(REACH_ACTIVITIES.includes('explore/'+lab.id));
  for(const lab of FOUNDATION_LABS)assert.ok(REACH_ACTIVITIES.includes('learn/'+lab.id));
  for(const activity of REACH_ACTIVITIES){assert.ok(validateReachEvent({version:1,activity,metric:'start'}));if(!activity.startsWith('tool/'))assert.equal(reachActivity('#'+activity+'?private=ignored'),activity);}
  assert.equal(reachActivity('#lab/INC-101/workbench?student=private'),'lab/INC-101');
  for(const hash of ['#lab/INC-101/private','#arcade/missing','#quests/python/extra','#lab/__proto__','#sandbox/<script>'])assert.equal(reachActivity(hash),null);
  const event={version:1,activity:'lab/INC-101',metric:'start'};
  for(const extra of ['name','ip','notes','code','url','time','session','count'])assert.equal(validateReachEvent({...event,[extra]:'private'}),null);
  assert.equal(validateReachEvent({version:1,activity:'tool/sandbox',metric:'complete'}),null);
});
test('previews, local hosts, privacy signals and conventional webdriver sessions make no requests or listeners',()=>{
  for(const overrides of [{ownerPreview:true},{location:{origin:'https://preview.cole-learning-labs.pages.dev'}},{location:{origin:'http://127.0.0.1:4173'}},{navigator:{webdriver:true}},{navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}}]){
    const f=fixture(overrides);assert.equal(f.requests.length,0);assert.equal(f.handlers.size,0);f.counter.dispose();
  }
});
test('only visible trusted activity interactions start counts; completion requires a start and deduplicates per document',async()=>{
  const f=fixture();await flush();assert.equal(f.requests.length,1);recordReachCompletion('arcade/garden-rover');assert.equal(f.requests.length,1);
  f.act(false);assert.equal(f.requests.length,1);f.document.visibilityState='hidden';f.act();assert.equal(f.requests.length,1);f.document.visibilityState='visible';
  f.control.dataset.ga='reset';f.act();assert.equal(f.requests.length,1);f.control.dataset.ga='append';f.act();f.act();await flush();
  assert.equal(f.requests.length,2);recordReachCompletion('arcade/garden-rover');recordReachCompletion('arcade/garden-rover');await flush();assert.equal(f.requests.length,3);
  assert.deepEqual(f.requests.slice(1).map(r=>JSON.parse(r.body)),[{version:1,activity:'arcade/garden-rover',metric:'start'},{version:1,activity:'arcade/garden-rover',metric:'complete'}]);
  for(const request of f.requests){assert.equal(request.credentials,'omit');assert.equal(request.referrerPolicy,'no-referrer');assert.equal(request.redirect,'error');assert.equal(request.url,'/api/reach');}
  f.location.hash='#arcade/loop-lagoon';recordReachCompletion('arcade/garden-rover');f.act();await flush();assert.equal(f.requests.length,4);f.counter.dispose();assert.equal(f.handlers.size,0);
});
test('disabled availability and network failure do not retry, queue, collect work or interrupt learning',async()=>{
  let calls=0;const f=fixture({fetcher:async()=>{calls++;return new Response('{"enabled":false}',{status:503});}});await flush();f.act();recordReachCompletion('arcade/garden-rover');assert.equal(calls,1);f.counter.dispose();
  const g=fixture({fetcher:async()=>{throw new Error('offline');}});await flush();assert.doesNotThrow(()=>g.act());g.counter.dispose();
  let resolve;const pending=fixture({fetcher:(_url,options)=>new Promise(done=>{resolve=()=>done(new Response('{"enabled":true}'));options.signal.addEventListener('abort',()=>done(new Response('',{status:503})));})});pending.counter.dispose();resolve();await flush();assert.equal(pending.handlers.size,0);
});
test('the page privacy control stops new activity events immediately',async()=>{
  const f=fixture();await flush();f.act();await flush();assert.equal(f.requests.length,2);
  f.handlers.get('click')({type:'click',isTrusted:true,target:{closest:selector=>selector==='[data-reach-stop]'?{}:null}});
  recordReachCompletion('arcade/garden-rover');f.location.hash='#arcade/loop-lagoon';f.act();await flush();assert.equal(f.requests.length,2);assert.equal(f.counter.active(),false);f.counter.dispose();
});
