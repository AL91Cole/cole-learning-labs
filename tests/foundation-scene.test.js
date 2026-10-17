import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { FOUNDATION_LABS, getFoundation, createFoundationRecord, applyFoundationAction } from '../src/foundation-model.js';

const source=readFileSync(new URL('../src/foundation-scene.js',import.meta.url),'utf8');
const lazy=/import\('\.\/assembly-scene\.js\?release=[^']+'\)/g;
assert.equal([...source.matchAll(lazy)].length,1,'one lazy boundary must own the heavy renderer');
const settle=()=>new Promise(resolve=>setImmediate(resolve));

// The adapter is run unchanged except that its single module-loading boundary is
// supplied by a fixture. This tests lifecycle and real curriculum/model dispatch;
// it does not claim to measure native focus rendering or GPU/device performance.
function fixture({track='hardware',hidden=false,documentHidden=false,loader,unavailable=false,record}={}){
  const lab=getFoundation(track),hostEvents=new Map(),docEvents=new Map();
  const calls={loads:0,mounts:0,disposals:0,pauses:0,resumes:0,updates:[],views:[],tools:[],cables:[],selections:[],inspections:[],actions:[],statuses:[]};
  let buttons=[],markup='',current=record||createFoundationRecord(track),controller;
  const doc={hidden:documentHidden,activeElement:null,addEventListener:(name,fn)=>docEvents.set(name,fn),removeEventListener:(name,fn)=>{if(docEvents.get(name)===fn)docEvents.delete(name);}};
  const canvasHost={},placeholder={hidden:false,textContent:''},portrait={innerHTML:''};
  function button(id){return {dataset:{foundationItem:id},attrs:{'aria-pressed':'false'},setAttribute(name,value){this.attrs[name]=value;},closest(selector){return selector==='[data-foundation-item]'?this:null;},focus(){doc.activeElement=this;}};}
  const host={ownerDocument:doc,closest:()=>hidden?{}:null,contains:node=>buttons.includes(node),
    querySelector(selector){return selector==='[data-foundation-hardware-scene]'?canvasHost:selector==='[data-foundation-scene-placeholder]'?placeholder:selector==='[data-foundation-part-portrait]'?portrait:null;},
    querySelectorAll:selector=>selector==='[data-foundation-item]'?buttons:[],
    addEventListener:(name,fn)=>hostEvents.set(name,fn),removeEventListener:(name,fn)=>{if(hostEvents.get(name)===fn)hostEvents.delete(name);}};
  Object.defineProperty(host,'innerHTML',{get:()=>markup,set(value){markup=value;buttons=[...value.matchAll(/data-foundation-item="([^"]+)"/g)].map(([,id])=>button(id));}});
  const scene={update(hardware,assembly){calls.updates.push({hardware,assembly});},select:id=>calls.selections.push(id),cancelInteraction:()=>calls.views.push('cancel'),fit:()=>calls.views.push('fit'),focusSelected:()=>calls.views.push('focus'),zoom:direction=>calls.views.push(direction),setTool:tool=>calls.tools.push(tool),setCable:id=>calls.cables.push(id),pause:()=>calls.pauses++,resume:()=>calls.resumes++,dispose:()=>calls.disposals++};
  const sceneModule={mountAssemblyScene(target,options){assert.equal(target,canvasHost);calls.mounts++;calls.options=options;if(unavailable){options.onStatus({kind:'unavailable',message:'No WebGL2'});return null;}options.onStatus({kind:'ready',message:'Ready'});return scene;}};
  const api=vm.runInNewContext(`${source.replace(/export function /g,'function ').replace(lazy,'sceneLoader()')};({renderFoundationVisual,mountFoundationScene})`,{sceneLoader(){calls.loads++;return loader?loader(sceneModule):Promise.resolve(sceneModule);}});
  host.innerHTML=api.renderFoundationVisual(lab,current);
  controller=api.mountFoundationScene(host,{lab,record:current,onInspect:id=>calls.inspections.push(id),onStatus:status=>calls.statuses.push(status),onAction(action){calls.actions.push(action);const result=applyFoundationAction(track,current,{type:'practice',action});current=result.state;controller.update(current);return result;}});
  return {lab,host,doc,calls,controller,api,placeholder,portrait,hostEvents,docEvents,get record(){return current;},set record(value){current=value;},get buttons(){return buttons;},click(id){const target=buttons.find(button=>button.dataset.foundationItem===id);assert.ok(target);target.focus();hostEvents.get('click')?.({target});},show(){hidden=false;controller.setVisible(true);},visibility(value){doc.hidden=value;docEvents.get('visibilitychange')?.();}};
}

function prepared(){const lab=getFoundation('hardware');let state=createFoundationRecord('hardware');for(const item of lab.items)state=applyFoundationAction(lab.id,state,{type:'inspect',item:item.id}).state;for(const check of lab.checks)state=applyFoundationAction(lab.id,state,{type:'answer',check:check.id,value:check.answer}).state;return state;}

test('equipment visuals have native named buttons for every non-hardware curriculum item without loading 3D',()=>{
  for(const lab of FOUNDATION_LABS.filter(lab=>lab.id!=='hardware')){
    const f=fixture({track:lab.id});
    assert.equal(f.calls.loads,0);assert.equal(f.buttons.length,lab.items.length);
    const markup=f.host.innerHTML;
    for(const item of lab.items){assert.ok(markup.includes(`data-foundation-item="${item.id}"`));assert.ok(markup.includes(item.label));assert.ok(markup.includes(item.looks));}
    assert.equal((markup.match(/type="button"/g)||[]).length,lab.items.length);
    assert.equal((markup.match(/<svg /g)||[]).length,lab.items.length);
    assert.equal((markup.match(/aria-hidden="true" focusable="false"/g)||[]).length,lab.items.length);
    assert.equal(f.calls.statuses.at(-1).kind,'ready');f.controller.dispose();
  }
});

test('authored labels, portrait descriptions, and program outputs are escaped rather than executable markup',()=>{
  const f=fixture({track:'ai'}),lab={track:'ai',title:'<img src=x onerror=run()>',items:[{id:'prompt" autofocus="x',label:'<script>run()</script>',looks:'<svg onload=run()>'}]};
  const markup=f.api.renderFoundationVisual(lab,{});
  assert.ok(markup.includes('&lt;script&gt;'));assert.ok(markup.includes('prompt&quot; autofocus=&quot;x'));assert.ok(!markup.includes('<img'));assert.ok(!markup.includes('<script>'));
  const output=f.api.renderFoundationVisual(getFoundation('coding'),{results:[{output:['<iframe src=x>','&private']}]});
  assert.ok(output.includes('&lt;iframe src=x&gt; · &amp;private'));assert.ok(!output.includes('<iframe'));
  const hardware=f.api.renderFoundationVisual({track:'hardware',items:[{id:'cpu',label:'CPU',looks:'<img src=x>'}]},{});assert.ok(hardware.includes('&lt;img src=x&gt;'));f.controller.dispose();
});

test('native picture clicks inspect only valid items, while programmatic focus never records credit',()=>{
  const f=fixture({track:'network'}),before=JSON.stringify(f.record);
  f.click('router');assert.deepEqual(f.calls.inspections,['router']);assert.equal(f.buttons.find(node=>node.dataset.foundationItem==='router').attrs['aria-pressed'],'true');
  f.controller.focus('switch');f.controller.focus('not-a-part');
  assert.deepEqual(f.calls.inspections,['router']);assert.deepEqual(f.calls.actions,[]);assert.equal(JSON.stringify(f.record),before);
  const foreign={dataset:{foundationItem:'dns'},closest(){return this;}};f.hostEvents.get('click')({target:foreign});assert.deepEqual(f.calls.inspections,['router']);f.controller.dispose();
});

test('diagram updates reflect simulation state and preserve the focused selected item',()=>{
  const f=fixture({track:'network'});f.click('dns');const old=f.doc.activeElement;
  f.controller.update({...f.record,simulation:{wired:true,ipAssigned:true,dnsReady:false,serviceReachable:false}});
  assert.notEqual(f.doc.activeElement,old);assert.equal(f.doc.activeElement.dataset.foundationItem,'dns');assert.equal(f.doc.activeElement.attrs['aria-pressed'],'true');
  assert.ok(f.host.innerHTML.includes('data-foundation-state="done">✓ Ethernet connected'));
  assert.ok(f.host.innerHTML.includes('data-foundation-state="waiting">○ Name lookup ready'));
  assert.deepEqual(f.calls.actions,[]);assert.deepEqual(f.calls.inspections,['dns']);f.controller.dispose();
});

test('a hidden initial hardware host loads once on entry and does not initially highlight the case',async()=>{
  const f=fixture({hidden:true});assert.equal(f.calls.loads,0);f.show();await settle();
  assert.equal(f.calls.loads,1);assert.equal(f.calls.mounts,1);assert.equal(f.calls.options.hardware,f.record.hardware);assert.equal(f.calls.options.assembly,f.record.hardware.assembly);
  assert.deepEqual(f.calls.selections,[]);assert.ok(f.calls.views.includes('fit'));assert.deepEqual(f.calls.tools,['inspect']);assert.equal(f.placeholder.hidden,true);
  f.controller.setVisible(false);f.show();assert.equal(f.calls.loads,1);assert.equal(f.calls.mounts,1);assert.equal(f.calls.resumes,1);f.controller.dispose();
});

test('a hidden document does not import hardware until foreground and pauses on later backgrounding',async()=>{
  const f=fixture({documentHidden:true});assert.equal(f.calls.loads,0);f.visibility(false);await settle();assert.equal(f.calls.mounts,1);
  f.visibility(true);assert.equal(f.calls.pauses,1);assert.equal(f.calls.views.at(-1),'cancel');f.visibility(false);assert.equal(f.calls.resumes,1);f.controller.dispose();
});

test('hiding or disposing during a pending import never creates a detached GPU scene',async()=>{
  let resolve;const f=fixture({loader:module=>new Promise(done=>{resolve=()=>done(module);})});
  f.controller.setVisible(false);resolve();await settle();assert.equal(f.calls.mounts,0);
  f.show();await settle();assert.equal(f.calls.loads,1,'the resolved same-origin module is reused');assert.equal(f.calls.mounts,1);f.controller.dispose();
  let finish;const disposed=fixture({loader:module=>new Promise(done=>{finish=()=>done(module);})});disposed.controller.dispose();finish();await settle();assert.equal(disposed.calls.mounts,0);assert.equal(disposed.hostEvents.size,0);assert.equal(disposed.docEvents.size,0);
});

test('all nine hardware items have visible native portraits even when the actual CPU is covered',async()=>{
  const f=fixture();await settle();const images=new Set();
  for(const item of f.lab.items){f.controller.focus(item.id);assert.ok(f.portrait.innerHTML.includes('<svg '));assert.ok(f.portrait.innerHTML.includes(item.label));assert.ok(f.portrait.innerHTML.includes(item.looks));images.add(f.portrait.innerHTML.split('</svg>')[0]);}
  assert.equal(images.size,9);assert.equal(f.calls.selections.at(-1),'display');assert.deepEqual(f.calls.inspections,[]);assert.deepEqual(f.calls.actions,[]);f.controller.dispose();
});

test('renderer selections normalize cable, screw, and hardware names without inventing curriculum IDs',async()=>{
  const f=fixture();await settle();
  for(const id of ['display','storage','cpu','cooler-3','cable-sata-power','cable-hdmi-pc','cable-atx','tool-screwdriver','not-a-part'])f.calls.options.onSelect(id);
  assert.deepEqual(f.calls.inspections,['monitor','ssd','cpu','cooler','ssd','monitor','board']);assert.deepEqual(f.calls.actions,[]);f.controller.dispose();
});

test('Explore, hidden, paused and disposed callbacks cannot forward a repair action',async()=>{
  const f=fixture({record:prepared()});await settle();const onAction=f.calls.options.onAction;
  assert.equal(onAction('asm-fit-ram').kind,'warning');f.controller.setMode('practice');f.controller.setVisible(false);assert.equal(onAction('asm-fit-ram').kind,'warning');
  f.show();f.controller.camera('pause');assert.equal(onAction('asm-fit-ram').kind,'warning');f.controller.camera('resume');f.controller.dispose();assert.equal(onAction('asm-fit-ram').kind,'warning');assert.deepEqual(f.calls.actions,[]);
});

test('Practice forwards exact actions to the actual model, follows the next tool, and accepts synchronous updates',async()=>{
  const f=fixture({record:prepared()});await settle();f.controller.setMode('practice');assert.equal(f.calls.tools.at(-1),'move');
  const expected=['move','inspect','move','screwdriver','screwdriver','cables','cables','inspect','inspect'];
  for(let index=0;index<f.lab.jobs.length;index++){
    const job=f.lab.jobs[index];assert.equal(f.calls.tools.at(-1),expected[index],job.id);
    const result=f.calls.options.onAction(job.action);assert.notEqual(result.kind,'warning',result.message);assert.equal(result.state,f.record.hardware,'existing renderer receives actual equipment state');assert.equal(f.record.practice.length,index+1);
  }
  assert.deepEqual(f.calls.actions,f.lab.jobs.map(job=>job.action));assert.deepEqual(f.calls.cables,['hdmi-pc','ac']);assert.equal(f.calls.updates.length,9);f.controller.dispose();
});

test('opening Practice before recognition questions keeps the hardware in Inspect mode',async()=>{
  const f=fixture();await settle();f.controller.setMode('practice');assert.equal(f.calls.tools.at(-1),'inspect');
  f.controller.update(prepared());assert.equal(f.calls.tools.at(-1),'move');f.controller.dispose();
});

test('out-of-order 3D repairs remain rejected by the model and never give practice credit',async()=>{
  const f=fixture({record:prepared()});await settle();f.controller.setMode('practice');const result=f.calls.options.onAction('boot');
  assert.equal(result.kind,'warning');assert.equal(f.record.practice.length,0);assert.equal(f.record.hardware.pcOn,false);assert.equal(f.calls.tools.at(-1),'move');f.controller.dispose();
});

test('camera actions cancel transient gestures and pause remains explicit across visibility changes',async()=>{
  const f=fixture();await settle();f.calls.views.length=0;
  for(const command of ['out','fit','in','focus'])f.controller.camera(command);
  assert.deepEqual(f.calls.views,['cancel','out','cancel','fit','cancel','in','cancel','focus']);assert.deepEqual(f.calls.actions,[]);
  f.controller.camera('pause');const resumes=f.calls.resumes;f.controller.setVisible(false);f.show();f.visibility(true);f.visibility(false);assert.equal(f.calls.resumes,resumes);
  const viewCount=f.calls.views.length;f.controller.camera('in');assert.equal(f.calls.views.length,viewCount+1,'a paused camera cancels without zooming');
  f.controller.camera('resume');assert.equal(f.calls.resumes,resumes+1);f.controller.dispose();assert.equal(f.calls.disposals,1);assert.equal(f.hostEvents.size,0);assert.equal(f.docEvents.size,0);f.controller.dispose();assert.equal(f.calls.disposals,1);
});

test('unavailable graphics keep a readable fallback and all portraits available',async()=>{
  const f=fixture({unavailable:true});await settle();assert.equal(f.placeholder.hidden,false);assert.match(f.placeholder.textContent,/labeled part buttons/);assert.equal(f.calls.statuses.at(-1).kind,'unavailable');
  f.controller.focus('cpu');assert.ok(f.portrait.innerHTML.includes('Processor (CPU)'));assert.deepEqual(f.calls.actions,[]);f.show();await settle();assert.equal(f.calls.loads,1,'availability failure is not retried continuously');f.controller.dispose();
});

test('module-load failure does not leak an unhandled rejection and an explicit resume can retry',async()=>{
  let fail=true;const f=fixture({loader:module=>fail?Promise.reject(new Error('module unavailable')):Promise.resolve(module)});await settle();assert.equal(f.calls.statuses.at(-1).kind,'unavailable');assert.equal(f.calls.mounts,0);
  fail=false;f.controller.camera('resume');await settle();assert.equal(f.calls.loads,2);assert.equal(f.calls.mounts,1);assert.equal(f.placeholder.hidden,true);f.controller.dispose();
});

test('view module has no static engine import or remote, execution, analytics, or persistence API',()=>{
  assert.doesNotMatch(source,/^import\s/m);assert.doesNotMatch(source,/https?:\/\/|fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|\beval\s*\(|new\s+Function\s*\(/);
  assert.match(source,/await import\('\.\/assembly-scene\.js\?release=/);
});
