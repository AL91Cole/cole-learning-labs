import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS } from '../src/assembly-model.js';
import { ASSEMBLY_TOOLS, assemblyToolAction } from '../src/assembly-tools.js';
import { initialHardwareState, applyHardwareAction } from '../src/hardware.js';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from '../src/assembly-cables.js';
const source=readFileSync(new URL('../src/assembly-workbench.js',import.meta.url),'utf8');
// A native-DOM boundary exercises the real controller and equipment rules.
// Pixel geometry, native focus and touch hardware are verified in browser QA.
function fixture({hidden=false,caseId='INC-106'}={}){
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
  for(const key of ['scene','select','part-title','part-state','actions','feedback','power','next','delivery','tool-help','tool-controls','tool-drawer','tool-summary','component-drawer','fastener','cable','cable-target','cable-state'])fields.set(`[data-asm-${key}]`,node({},'div'));
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
  const mount=vm.runInNewContext(`${source.replace(/^import[^\n]+\n/gm,'').replace('export function mountAssemblyWorkbench','function mountAssemblyWorkbench')};mountAssemblyWorkbench`,{assemblyActions,assemblyFailure,ASSEMBLY_FASTENERS,ASSEMBLY_TOOLS,assemblyToolAction,ASSEMBLY_CABLES,cableConnection,assemblyCableAction});
  let state=applyHardwareAction(caseId,initialHardwareState(caseId),'enable-assembly').state,controller;
  const committed=[];controller=mount(root,{state,onAction(action){committed.push(action);const result=applyHardwareAction(caseId,state,action);state=result.state;controller.update(state);return result;}});
  function click(key,value){const target=all().find(item=>item.dataset[key]===value);assert.ok(target,`Missing ${key}=${value}`);target.focus();listeners.get('click')?.({target});return target;}
  function choose(selector,value){const target=fields.get(selector);target.value=value;target.focus();listeners.get('change')?.({target});}
  function begin(id){const target=pictures.findLast(item=>item.dataset.asmPicture===id);assert.ok(target,`Missing draggable ${id}`);listeners.get('pointerdown')({target,button:0,pointerId:1,clientX:10,clientY:10});listeners.get('pointermove')({target,pointerId:1,clientX:30,clientY:30,preventDefault(){}});}
  function release(destination){dropTarget=pictures.find(item=>item.dataset.asmDrop===destination)||null;listeners.get('pointerup')({target:root,pointerId:1,clientX:40,clientY:40});}
  return{root,controller,fields,doc,listeners,docListeners,viewListeners,captures,committed,click,choose,begin,release,get state(){return state;},get writes(){return writes;},get markup(){return markup;},get picture(){return pictureMarkup;},pictures:()=>pictures};
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
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);
  for(const view of ['inside','rear','monitor','bench']){const target=bench.click('asmPictureView',view);assert.equal(bench.doc.activeElement,target);}
  assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);
  bench.click('asmPicture','ram');assert.equal(bench.fields.get('[data-asm-select]').value,'ram');assert.equal(bench.fields.get('[data-asm-component-drawer]').open,true);
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('native Enter and Space activate labeled schematic equipment without repairing during inspect',()=>{
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);
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
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);bench.click('asmTool','screwdriver');
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
  const bench=fixture({caseId:'INC-101'});bench.click('asmTool','cables');bench.choose('[data-asm-cable]','ac');
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
