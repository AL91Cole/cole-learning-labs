import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS } from '../src/assembly-model.js';
import { ASSEMBLY_TOOLS, assemblyToolAction } from '../src/assembly-tools.js';
import { initialHardwareState, applyHardwareAction } from '../src/hardware.js';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from '../src/assembly-cables.js';
import { workbenchGuidance } from '../src/workbench-guidance.js';
import { pcActivity } from '../src/pc-activity.js';
const source=readFileSync(new URL('../src/assembly-workbench.js',import.meta.url),'utf8');
// A native-DOM boundary exercises the real controller and equipment rules.
// Pixel geometry, native focus and touch hardware are verified in browser QA.
function fixture({hidden=false,caseId='INC-106',stateOverride=state=>state}={}){
  const listeners=new Map(),docListeners=new Map(),viewListeners=new Map(),fields=new Map(),captures=new Set();
  const doc={activeElement:null,hidden:false,addEventListener:(key,fn)=>docListeners.set(key,fn),removeEventListener:(key,fn)=>{if(docListeners.get(key)===fn)docListeners.delete(key);}};
  doc.defaultView={addEventListener:(key,fn)=>viewListeners.set(key,fn),removeEventListener:(key,fn)=>{if(viewListeners.get(key)===fn)viewListeners.delete(key);}};
  let staticButtons=[],actions=[],tools=[],pictures=[],writes=0,markup='',pictureMarkup='',dropTarget=null;
  function node(dataset={},tag='button'){
    let hidden=false;
    const element={dataset,tag,textContent:'',value:'',attrs:{},open:false,style:{},drawer:null,
      setAttribute(key,value){this.attrs[key]=value;},removeAttribute(key){delete this.attrs[key];},focus(){doc.activeElement=this;},
      matches(selector){return fields.get(selector)===this;},
      closest(selector){if(selector==='button')return tag==='button'?this:null;if(selector==='[data-asm-picture]')return dataset.asmPicture?this:null;if(selector==='[data-asm-drop]')return dataset.asmDrop?this:null;if(selector==='[hidden]')return this.hidden?this:null;if(selector==='details:not([open])')return this.drawer&&!this.drawer.open?this.drawer:null;return null;}
    };
    Object.defineProperty(element,'hidden',{get:()=>hidden,set(value){hidden=!!value;if(hidden&&doc.activeElement===element)doc.activeElement=null;}});return element;
  }
  function parse(html){return [...html.matchAll(/<(button|g)\b([^>]*)>/g)].map(([,tag,attrs])=>{const data=Object.fromEntries([...attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,key,value])=>[key.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value]));return node(data,tag);});}
  for(const key of ['build-help','diagnostic-detail','ticket-title','instruction','activity-label','activity-detail','component-status','fan-status','all','scene','select','part-title','part-state','actions','feedback','power','next','delivery','tool-help','tool-controls','tool-drawer','tool-summary','component-drawer','fastener','cable','cable-target','cable-state'])fields.set(`[data-asm-${key}]`,node({},'div'));
  fields.get('[data-asm-select]').drawer=fields.get('[data-asm-component-drawer]');
  Object.defineProperty(fields.get('[data-asm-actions]'),'innerHTML',{set(html){actions=parse(html);actions.forEach(button=>button.drawer=fields.get('[data-asm-component-drawer]'));},get(){return'';}});
  Object.defineProperty(fields.get('[data-asm-tool-controls]'),'innerHTML',{set(html){tools=parse(html);this.markup=html;},get(){return this.markup||'';}});
  Object.defineProperty(fields.get('[data-asm-scene]'),'innerHTML',{set(html){pictureMarkup=html;pictures=parse(html);},get(){return pictureMarkup;}});
  const all=()=>[...staticButtons,...actions,...tools,...pictures];
  const root={ownerDocument:doc,closest:()=>hidden?{}:null,contains:target=>[...fields.values(),...all()].includes(target),
    querySelector(selector){if(selector==='[data-asm-actions] button')return actions[0];const match=/^\[data-asm-picture="([^"]+)"\]$/.exec(selector);return match?pictures.find(item=>item.dataset.asmPicture===match[1]):fields.get(selector)||null;},
    querySelectorAll(selector){const key={'[data-asm-tool]':'asmTool','[data-asm-part]':'asmPart','[data-assembly-action]':'assemblyAction','[data-asm-picture-view]':'asmPictureView'}[selector];return key?all().filter(item=>item.dataset[key]):[];},
    addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:(key,fn)=>{if(listeners.get(key)===fn)listeners.delete(key);},
    setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)
  };
  Object.defineProperty(root,'innerHTML',{set(html){writes++;markup=html;staticButtons=parse(html);},get(){return markup;}});
  doc.elementFromPoint=()=>dropTarget;
  const mount=vm.runInNewContext(`${source.replace(/^import[^\n]+\n/gm,'').replace('export function mountAssemblyWorkbench','function mountAssemblyWorkbench')};mountAssemblyWorkbench`,{assemblyActions,assemblyFailure,ASSEMBLY_FASTENERS,ASSEMBLY_TOOLS,assemblyToolAction,ASSEMBLY_CABLES,cableConnection,assemblyCableAction,workbenchGuidance,pcActivity});
  let state=stateOverride(applyHardwareAction(caseId,initialHardwareState(caseId),'enable-assembly').state),controller;
  const committed=[];controller=mount(root,{state,onAction(action){committed.push(action);const result=applyHardwareAction(caseId,state,action);state=result.state;controller.update(state);return result;}});
  function click(key,value){const target=all().find(item=>item.dataset[key]===value);assert.ok(target,`Missing ${key}=${value}`);target.focus();listeners.get('click')?.({target});return target;}
  function choose(selector,value){const target=fields.get(selector);target.value=value;target.focus();listeners.get('change')?.({target});}
  function complete(value=true){const target=fields.get('[data-asm-all]');target.checked=value;target.focus();listeners.get('change')({target});}
  function begin(id){const target=pictures.findLast(item=>item.dataset.asmPicture===id);assert.ok(target,`Missing draggable ${id}`);listeners.get('pointerdown')({target,button:0,pointerId:1,clientX:10,clientY:10});listeners.get('pointermove')({target,pointerId:1,clientX:30,clientY:30,preventDefault(){}});}
  function release(destination){dropTarget=pictures.find(item=>item.dataset.asmDrop===destination)||null;listeners.get('pointerup')({target:root,pointerId:1,clientX:40,clientY:40});}
  return{root,controller,fields,doc,listeners,docListeners,viewListeners,captures,committed,click,choose,complete,begin,release,get state(){return state;},get writes(){return writes;},get markup(){return markup;},get picture(){return pictureMarkup;},pictures:()=>pictures};
}

test('the workbench uses PR #6 native schematic artwork immediately without any graphics engine or camera import',()=>{
  assert.doesNotMatch(source,/import\(|assembly-scene|BABYLON|THREE|<canvas|data-asm-camera|3D/);
  const bench=fixture();assert.equal(bench.doc.activeElement,null);assert.match(bench.picture,/<svg[^>]+viewBox="0 0 900 620"/);
  for(const detail of ['hw-chassis','hw-board','CLASSROOM WORKSTATION','MICRO-ATX','DDR4','SATA'])assert.ok(bench.picture.includes(detail),detail);
  assert.match(bench.markup,/data-assembly-action="boot">Test PC/);assert.match(bench.markup,/data-assembly-action="open-document">Open lesson/);
  assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);assert.equal(bench.fields.get('[data-asm-tool-drawer]').hidden,true);bench.controller.dispose();
});

test('native controls keep every mechanical action available and preserve the stable equipment host',()=>{
  const bench=fixture(),host=bench.fields.get('[data-asm-scene]');bench.click('asmPart','psu');bench.click('assemblyAction','asm-fit-psu');
  assert.equal(bench.state.assembly.psuInstalled,true);assert.equal(bench.writes,1);assert.equal(bench.fields.get('[data-asm-scene]'),host);
  assert.match(bench.fields.get('[data-asm-feedback]').textContent,/Power supply/i);assert.ok(bench.doc.activeElement.dataset.assemblyAction.startsWith('asm-tighten-psu-'));
  bench.controller.dispose();assert.equal(bench.listeners.size,0);assert.equal(bench.docListeners.size,0);assert.equal(bench.viewListeners.size,0);
});

test('picture views and inspection are ephemeral and retain explicit focus and closed disclosures',()=>{
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);bench.complete();
  for(const view of ['inside','rear','monitor','bench']){const target=bench.click('asmPictureView',view);assert.equal(bench.doc.activeElement,target);}
  assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);
  bench.click('asmPicture','ram');assert.equal(bench.fields.get('[data-asm-select]').value,'ram');assert.equal(bench.fields.get('[data-asm-component-drawer]').open,true);
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('native Enter and Space activate labeled schematic equipment without repairing during inspect',()=>{
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);bench.complete();bench.click('asmPictureView','bench');
  for(const [id,key]of [['ram','Enter'],['gpu',' ']]){const target=bench.pictures().find(item=>item.dataset.asmPicture===id);let prevented=false;bench.listeners.get('keydown')({target,key,preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(bench.fields.get('[data-asm-select]').value,id);}
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('power changes continue keyboard focus along the visible power strip',()=>{
  const bench=fixture({caseId:'INC-101'});
  for(const[action,next]of [['power-off','unplug'],['unplug','plug-in'],['plug-in','boot']]){bench.click('assemblyAction',action);assert.equal(bench.doc.activeElement.dataset.assemblyAction,next);assert.equal(bench.doc.activeElement.hidden,false);assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);}
  bench.controller.dispose();
});

test('tool drawers retain user disclosure and picker focus across equipment updates',()=>{
  const bench=fixture();bench.click('asmTool','cables');assert.equal(bench.fields.get('[data-asm-tool-drawer]').open,true);
  bench.fields.get('[data-asm-tool-drawer]').open=false;bench.choose('[data-asm-cable]','sata-data');const focused=bench.doc.activeElement;bench.controller.update(bench.state);
  assert.equal(bench.doc.activeElement,focused);assert.equal(bench.fields.get('[data-asm-tool-drawer]').open,false);
  bench.click('asmTool','inspect');assert.equal(bench.fields.get('[data-asm-tool-drawer]').hidden,true);bench.controller.dispose();
});

test('all eighteen numbered screws are native targets and still obey safety rules',()=>{
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);bench.complete();bench.click('asmTool','screwdriver');
  for(const[group,spec]of Object.entries(ASSEMBLY_FASTENERS))for(let i=0;i<spec.count;i++)assert.ok(bench.picture.includes(`data-asm-picture="${group}-${i}"`));
  bench.click('asmPicture','panel-0');assert.equal(bench.committed.at(-1),'asm-loosen-panel-0');assert.deepEqual(bench.state,before);
  bench.click('assemblyAction','power-off');bench.click('assemblyAction','unplug');bench.click('asmPicture','panel-0');assert.equal(bench.state.assembly.panelScrews[0],false);bench.controller.dispose();
});

test('optional native part dragging proposes only a matching mount or tray action on release',()=>{
  const bench=fixture();bench.click('asmTool','move');const before=structuredClone(bench.state);
  bench.begin('psu');assert.deepEqual(bench.state,before);assert.equal(bench.captures.size,1);bench.release('ram');assert.deepEqual(bench.state,before);
  bench.begin('psu');bench.release('psu');assert.equal(bench.state.assembly.psuInstalled,true);assert.equal(bench.captures.size,0);assert.equal(bench.committed.at(-1),'asm-fit-psu');
  bench.begin('psu');bench.release('tray');assert.equal(bench.state.assembly.psuInstalled,false);bench.controller.dispose();
});

test('native cable dragging preserves independent HDMI ends and uses the same guarded action mapper',()=>{
  const bench=fixture({caseId:'INC-101'});bench.click('asmTool','cables');bench.choose('[data-asm-cable]','hdmi-pc');bench.click('asmPictureView','rear');
  bench.begin('cable-hdmi-pc');const count=bench.committed.length;bench.release('port-hdmi-gpu');assert.equal(bench.committed.length,count+1);assert.equal(bench.state.videoPort,'gpu');
  bench.begin('cable-hdmi-pc');bench.release('tray');assert.equal(bench.state.pcVideoConnected,false);assert.equal(bench.state.signalConnected,true);
  bench.choose('[data-asm-cable]','hdmi-monitor');bench.begin('cable-hdmi-monitor');bench.release('tray');assert.equal(bench.state.signalConnected,false);assert.equal(bench.state.booted,true);bench.controller.dispose();
});

test('a missing PSU is an empty bay in both views and never advertises a live AC socket',()=>{
  const bench=fixture();assert.match(bench.picture,/EMPTY PSU BAY/);assert.doesNotMatch(bench.picture,/>POWER SUPPLY</);
  bench.click('asmTool','cables');bench.choose('[data-asm-cable]','ac');assert.doesNotMatch(bench.picture,/data-asm-picture="port-ac-inlet"/);
  bench.click('asmPictureView','rear');assert.match(bench.picture,/EMPTY PSU BAY/);assert.doesNotMatch(bench.picture,/data-asm-picture="port-ac-inlet"/);
  assert.doesNotMatch(bench.picture,/M544 463C464/);bench.click('asmCableAction','connect');assert.equal(bench.state.acConnected,false);
  bench.controller.dispose();
});

test('AC socket markers follow the PSU in the full schematic and its inlet in the rear view',()=>{
  const bench=fixture({caseId:'INC-101'});bench.complete();bench.click('asmTool','cables');bench.choose('[data-asm-cable]','ac');bench.click('asmPictureView','bench');
  assert.match(bench.picture,/data-asm-picture="port-ac-inlet"[^>]*>[\s\S]*?<rect x="749" y="225"/);
  bench.click('asmPictureView','rear');assert.match(bench.picture,/data-asm-picture="port-ac-inlet"[^>]*>[\s\S]*?<rect x="555" y="446"/);
  assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('report cancellation, hide, Escape, pointer cancellation, backgrounding and disposal never commit a held part',()=>{
  for(const stop of [bench=>bench.controller.cancel(),bench=>bench.controller.setVisible(false),bench=>bench.listeners.get('keydown')({key:'Escape'}),bench=>bench.listeners.get('pointercancel')({}),bench=>{bench.doc.hidden=true;bench.docListeners.get('visibilitychange')();},bench=>bench.viewListeners.get('blur')()]){
    const bench=fixture();bench.click('asmTool','move');bench.begin('psu');const before=structuredClone(bench.state);stop(bench);bench.release('psu');assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);assert.equal(bench.captures.size,0);bench.controller.dispose();
  }
  const bench=fixture();bench.click('asmTool','move');bench.begin('psu');bench.controller.dispose();bench.controller.dispose();assert.equal(bench.captures.size,0);assert.equal(bench.listeners.size,0);assert.equal(bench.docListeners.size,0);bench.controller.update(bench.state);
});

test('both HDMI ends and monitor input affect the schematic display; a picture never opens the lesson by itself',()=>{
  const bench=fixture({caseId:'INC-101'});bench.click('asmTool','cables');bench.choose('[data-asm-cable]','hdmi-pc');bench.choose('[data-asm-cable-target]','hdmi-gpu');bench.click('asmCableAction','connect');bench.click('asmPictureView','monitor');
  assert.match(bench.picture,/Classroom Desktop/);assert.equal(bench.state.documentOpened,false);
  bench.choose('[data-asm-cable]','hdmi-monitor');bench.click('asmCableAction','disconnect');assert.match(bench.picture,/NO SIGNAL/);assert.doesNotMatch(bench.picture,/Classroom Desktop/);
  bench.click('asmCableAction','connect');bench.click('asmPicture','open-document');assert.equal(bench.state.documentOpened,true);assert.match(bench.picture,/Original file opened/);bench.controller.dispose();
});

test('malformed picker values and inactive surfaces cannot create equipment changes',()=>{
  const bench=fixture(),before=structuredClone(bench.state);for(const value of ['__proto__','constructor','<script>'])bench.choose('[data-asm-select]',value);
  bench.controller.setVisible(false);bench.click('asmPart','psu');bench.click('assemblyAction','boot');assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);
  const external={dataset:{assemblyAction:'boot'}};bench.doc.activeElement=external;bench.controller.update(bench.state);assert.equal(bench.doc.activeElement,external);bench.controller.dispose();
});

test('display tickets show only their needed controls until the complete set is explicitly requested',()=>{
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);
  assert.equal(bench.fields.get('[data-asm-ticket-title]').textContent,'Display checks');
  assert.equal(bench.fields.get('[data-asm-select]').value,'display');
  assert.match(bench.picture,/Classroom monitor and original lesson document/);
  const buttons=bench.root.querySelectorAll('[data-asm-tool]');
  assert.deepEqual(buttons.filter(button=>!button.hidden).map(button=>button.dataset.asmTool),['inspect','cables']);
  assert.doesNotMatch(bench.fields.get('[data-asm-select]').innerHTML,/value="(?:psu|cpu|ram|paste)"/);
  assert.match(bench.markup,/<details class="asm-all-tools" data-asm-all-tools>/);
  assert.doesNotMatch(bench.markup,/<details[^>]*data-asm-all-tools[^>]*\bopen\b|data-asm-all[^>]*\bchecked\b/);
  bench.click('asmTool','cables');const choices=bench.fields.get('[data-asm-tool-controls]').innerHTML;
  assert.match(choices,/value="hdmi-pc"/);assert.match(choices,/value="hdmi-monitor"/);assert.doesNotMatch(choices,/value="(?:ac|atx|sata-data)"/);
  bench.click('asmTool','paste');assert.equal(buttons.find(button=>button.dataset.asmTool==='paste').hidden,true);
  assert.equal(bench.fields.get('[data-asm-tool-summary]').textContent,'Cable controls');
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('memory and storage tickets keep only the fasteners and cable choices their work needs',()=>{
  const memory=fixture({caseId:'INC-103'});memory.click('asmTool','screwdriver');
  const screws=memory.fields.get('[data-asm-tool-controls]').innerHTML;
  assert.match(screws,/value="panel-0"/);assert.match(screws,/value="panel-1"/);assert.doesNotMatch(screws,/value="(?:board|psu|cooler|ssd)-/);
  assert.ok(memory.picture.includes('data-asm-picture="panel-0"'));assert.ok(!memory.picture.includes('data-asm-picture="psu-0"'));
  memory.click('asmTool','cables');const cables=memory.fields.get('[data-asm-tool-controls]').innerHTML;
  assert.match(cables,/value="ac"/);assert.doesNotMatch(cables,/value="(?:sata-data|hdmi-pc|cpu-fan)"/);memory.controller.dispose();
  const storage=fixture({caseId:'INC-104'});storage.click('asmTool','screwdriver');
  assert.match(storage.fields.get('[data-asm-tool-controls]').innerHTML,/value="ssd-1"/);
  assert.doesNotMatch(storage.fields.get('[data-asm-tool-controls]').innerHTML,/value="(?:board|cooler|gpu)-/);
  storage.click('asmTool','cables');const storageCables=storage.fields.get('[data-asm-tool-controls]').innerHTML;
  for(const id of ['ac','sata-data','sata-power'])assert.ok(storageCables.includes(`value="${id}"`));
  assert.doesNotMatch(storageCables,/value="(?:atx|eps|hdmi-pc|cpu-fan)"/);storage.controller.dispose();
});

test('contextual cable help omits unrelated internal steps and build guidance stays out of simple external tickets',()=>{
  const display=fixture({caseId:'INC-101'});display.click('asmTool','cables');
  assert.doesNotMatch(display.fields.get('[data-asm-tool-help]').textContent,/Power off|side panel|internal/i);
  assert.doesNotMatch(display.fields.get('[data-asm-feedback]').textContent,/Power off|side panel|internal/i);
  assert.equal(display.fields.get('[data-asm-build-help]').hidden,true);
  display.complete();assert.equal(display.fields.get('[data-asm-build-help]').hidden,false);
  display.choose('[data-asm-cable]','atx');assert.match(display.fields.get('[data-asm-tool-help]').textContent,/Power off.*disconnect AC.*side panel/);display.controller.dispose();
  const power=fixture({caseId:'INC-102'});power.click('asmTool','cables');
  assert.match(power.fields.get('[data-asm-tool-help]').textContent,/Power off.*before unplugging AC/);
  assert.doesNotMatch(power.fields.get('[data-asm-tool-help]').textContent,/side panel/);assert.equal(power.fields.get('[data-asm-build-help]').hidden,true);power.controller.dispose();
  const memory=fixture({caseId:'INC-103'});assert.equal(memory.fields.get('[data-asm-build-help]').hidden,false);memory.controller.dispose();
});

test('all eight tickets filter native part action rows as well as their toolbars, with complete actions available only by opt-in',()=>{
  const screws=group=>Array.from({length:ASSEMBLY_FASTENERS[group].count},(_,i)=>['tighten','loosen'].map(operation=>`asm-${operation}-${group}-${i}`)).flat();
  const parts=part=>['fit','remove'].map(operation=>`asm-${operation}-${part}`);
  const cables=id=>['connect','disconnect'].map(operation=>`asm-${operation}-${id}`);
  const permitted={display:new Set(cables('display')),power:new Set(),memory:new Set([...screws('panel'),...parts('panel'),...parts('ram'),'asm-open-ram-clips','asm-close-ram-clips']),storage:new Set([...screws('panel'),...screws('ssd'),...parts('panel'),...parts('ssd'),...cables('sata-data'),...cables('sata-power')])};
  for(const caseId of ['INC-101','INC-102','INC-103','INC-104','INC-105','INC-106','INC-107','INC-108']){
    const bench=fixture({caseId}),before=structuredClone(bench.state),guide=workbenchGuidance(bench.state);
    const kind=['INC-101','INC-107','INC-108'].includes(caseId)?'display':caseId==='INC-102'?'power':caseId==='INC-103'?'memory':caseId==='INC-106'?'build':'storage';
    for(const group of guide.groups){
      bench.choose('[data-asm-select]',group);
      const rows=bench.root.querySelectorAll('[data-assembly-action]').map(item=>item.dataset.assemblyAction).filter(id=>id.startsWith('asm-'));
      if(kind!=='build')for(const action of rows)assert.ok(permitted[kind].has(action),`${caseId}/${group} must not offer unrelated ${action}`);
      if(kind==='power')assert.deepEqual(rows,[],'The power profile uses its external power/cable controls, not PSU teardown');
    }
    bench.complete();bench.choose('[data-asm-select]','psu');
    let rows=bench.root.querySelectorAll('[data-assembly-action]').map(item=>item.dataset.assemblyAction);
    assert.ok(rows.some(id=>/^asm-(fit|remove)-psu$/.test(id)),`${caseId}: complete controls retain PSU work`);
    assert.equal(rows.filter(id=>/^asm-(tighten|loosen)-psu-\d$/.test(id)).length,4);
    bench.choose('[data-asm-select]','cables');rows=bench.root.querySelectorAll('[data-assembly-action]').map(item=>item.dataset.assemblyAction);
    for(const lead of ['atx','eps','gpu-power','sata-data','sata-power','front-panel'])assert.ok(rows.some(id=>id===`asm-connect-${lead}`||id===`asm-disconnect-${lead}`),`${caseId}: complete controls retain ${lead}`);
    bench.choose('[data-asm-select]','paste');rows=bench.root.querySelectorAll('[data-assembly-action]').map(item=>item.dataset.assemblyAction);
    for(const action of ['asm-clean-paste','asm-apply-paste','asm-excess-paste'])assert.ok(rows.includes(action));
    assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
  }
});

test('delivery text trusts validated activity rather than contradictory saved boot or lesson flags',()=>{
  const bench=fixture({caseId:'INC-101',stateOverride:state=>({...state,pcOn:true,acConnected:false,booted:true,documentOpened:true})});
  assert.doesNotMatch(bench.fields.get('[data-asm-delivery]').textContent,/lesson file opened|Original OS loaded/i);
  assert.doesNotMatch(bench.picture,/Original file opened|Classroom Desktop/);
  assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('the optional complete set changes no equipment, never opens itself, and can be turned off without trapping saved work',()=>{
  const bench=fixture({caseId:'INC-103',stateOverride:state=>({...state,pcOn:false,acConnected:false,atxConnected:false,cpuPowerConnected:false,gpuPowerConnected:false,sataPowerConnected:false,assembly:{...state.assembly,panelInstalled:false,panelScrews:[false,false],psuInstalled:false,psuScrews:[false,false,false,false]}})}),before=structuredClone(bench.state);
  bench.complete();assert.ok(bench.root.querySelectorAll('[data-asm-tool]').every(button=>!button.hidden));
  bench.choose('[data-asm-select]','psu');assert.match(bench.fields.get('[data-asm-part-state]').textContent,/in the tray/);
  assert.match(bench.picture,/EMPTY PSU BAY/);assert.equal(bench.fields.get('[data-asm-all]').checked,true);
  bench.complete(false);assert.equal(bench.fields.get('[data-asm-select]').value,'ram');
  assert.doesNotMatch(bench.fields.get('[data-asm-select]').innerHTML,/value="psu"/);
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('ticket guidance refresh keeps selected cable, view, disclosure and native focus without recording inspection as work',()=>{
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);
  bench.click('asmTool','cables');bench.choose('[data-asm-cable]','hdmi-monitor');bench.click('asmPictureView','monitor');
  bench.fields.get('[data-asm-tool-drawer]').open=false;bench.choose('[data-asm-cable]','hdmi-monitor');
  bench.click('asmPictureView','monitor');const focused=bench.doc.activeElement;bench.controller.update(bench.state);
  assert.equal(bench.doc.activeElement,focused);assert.equal(bench.fields.get('[data-asm-tool-drawer]').open,false);
  assert.match(bench.fields.get('[data-asm-tool-controls]').innerHTML,/value="hdmi-monitor" selected/);
  assert.match(bench.picture,/Classroom monitor and original lesson document/);
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('fan motion follows powered fitted components even when POST fails, and stops for AC standby',()=>{
  const bench=fixture({caseId:'INC-103'}),before=structuredClone(bench.state);
  assert.equal(bench.state.booted,false);assert.match(bench.fields.get('[data-asm-activity-label]').textContent,/startup blocked/i);
  for(const part of ['cpu','psu','gpu'])assert.match(bench.picture,new RegExp(`class="[^"]*asm-fan-${part}" data-running="true"`));
  assert.match(bench.fields.get('[data-asm-fan-status]').textContent,/CPU cooler fan: running/);
  assert.doesNotMatch(bench.picture,/asm-fan-(?:ram|ssd)/);assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);
  bench.click('assemblyAction','power-off');assert.match(bench.fields.get('[data-asm-power]').textContent,/standby/i);
  for(const part of ['cpu','psu','gpu'])assert.match(bench.picture,new RegExp(`class="[^"]*asm-fan-${part}" data-running="false"`));
  assert.match(bench.fields.get('[data-asm-fan-status]').textContent,/CPU cooler fan: stopped/);bench.controller.dispose();
});

test('the visible activity banner gives neutral state guidance while detailed diagnostic facts stay in a closed readout',()=>{
  for(const caseId of ['INC-101','INC-103']){
    const bench=fixture({caseId}),banner=bench.fields.get('[data-asm-activity-detail]').textContent;
    assert.doesNotMatch(banner,/graphics.card|motherboard output|memory|RAM|seat|Use the graphics/i);
    assert.match(banner,/Inspect|evidence|test/);
    assert.ok(bench.fields.get('[data-asm-diagnostic-detail]').textContent.length>0);
    assert.match(bench.markup,/<details class="asm-drawer asm-readouts">/);
    assert.doesNotMatch(bench.markup,/<details[^>]*asm-readouts[^>]*\bopen\b/);
    assert.deepEqual(bench.committed,[]);bench.controller.dispose();
  }
});

test('a disconnected CPU fan stays still while other powered fans and startup status remain independently modeled',()=>{
  const bench=fixture({caseId:'INC-103',stateOverride:state=>({...state,assembly:{...state.assembly,cpuFanConnected:false}})});
  assert.match(bench.picture,/asm-fan-cpu" data-running="false"/);
  assert.match(bench.picture,/asm-fan-psu" data-running="true"/);assert.match(bench.picture,/asm-fan-gpu" data-running="true"/);
  assert.match(bench.fields.get('[data-asm-fan-status]').textContent,/CPU cooler fan: stopped/);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('only curved fan blades rotate while PSU grilles, hubs and GPU housings remain fixed',()=>{
  const bench=fixture({caseId:'INC-103'});
  for(const kind of ['psu','gpu']){
    const rotor=new RegExp(`<g class="asm-fan asm-fan-${kind}"[^>]*>([\\s\\S]*?)<\\/g>`).exec(bench.picture);
    assert.ok(rotor,kind);assert.equal((rotor[1].match(/<path /g)||[]).length,4);
    assert.match(rotor[1],/C/);assert.doesNotMatch(rotor[1],/<rect|<circle|asm-fixed-grille/);
  }
  assert.match(bench.picture,/<\/g><path class="asm-fixed-grille" d="M338 99/);
  bench.click('asmPictureView','rear');assert.match(bench.picture,/<\/g><path class="asm-fixed-grille" d="M183 406/);
  assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('visual fan activity pauses for hidden workbenches, background pages and disposal, with reduced-motion static readouts',()=>{
  const bench=fixture({hidden:true,caseId:'INC-103'}),host=bench.fields.get('[data-asm-scene]');
  assert.equal(host.attrs['data-asm-active'],'false');bench.controller.setVisible(true);assert.equal(host.attrs['data-asm-active'],'true');
  bench.doc.hidden=true;bench.docListeners.get('visibilitychange')();assert.equal(host.attrs['data-asm-active'],'false');
  bench.doc.hidden=false;bench.docListeners.get('visibilitychange')();assert.equal(host.attrs['data-asm-active'],'true');
  bench.controller.setVisible(false);assert.equal(host.attrs['data-asm-active'],'false');bench.controller.setVisible(true);
  bench.controller.dispose();assert.equal(host.attrs['data-asm-active'],'false');assert.deepEqual(bench.committed,[]);
  const css=readFileSync(new URL('../src/assembly.css',import.meta.url),'utf8');
  assert.ok(css.includes('.asm-schematic[data-asm-active=true] .asm-fan[data-running=true]'));
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.asm-fan\{animation:none!important\}/);
  assert.doesNotMatch(source,/requestAnimationFrame|setInterval|setTimeout|fetch\(/);
});
