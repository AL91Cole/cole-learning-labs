import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS } from '../src/assembly-model.js';
import { ASSEMBLY_TOOLS, assemblyToolAction } from '../src/assembly-tools.js';
import { initialHardwareState, applyHardwareAction, verifyHardware } from '../src/hardware.js';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from '../src/assembly-cables.js';
import { workbenchGuidance } from '../src/workbench-guidance.js';
import { pcActivity } from '../src/pc-activity.js';
import { assemblyBuilderView, renderAssemblyBuilder } from '../src/assembly-builder.js';
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
  function parse(html){return [...html.matchAll(/<(button|g)\b([^>]*)>/g)].map(([,tag,attrs])=>{const data=Object.fromEntries([...attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,key,value])=>[key.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value]));const element=node(data,tag);element.disabled=/\bdisabled(?:\s|$)/.test(attrs);for(const[,name,value]of attrs.matchAll(/\s([\w:-]+)="([^"]*)"/g))element.setAttribute(name,value);return element;});}
  for(const key of ['on','ac-label','monitor-readout','build-help','diagnostic-detail','ticket-title','instruction','activity-label','activity-detail','component-status','fan-status','all','scene','select','part-title','part-state','actions','feedback','power','next','delivery','tool-help','tool-controls','tool-drawer','tool-summary','component-drawer','power-reference','fastener','cable','cable-target','cable-state'])fields.set(`[data-asm-${key}]`,node({},'div'));
  fields.get('[data-asm-select]').drawer=fields.get('[data-asm-component-drawer]');
  Object.defineProperty(fields.get('[data-asm-actions]'),'innerHTML',{set(html){actions=parse(html);actions.forEach(button=>button.drawer=fields.get('[data-asm-component-drawer]'));},get(){return'';}});
  Object.defineProperty(fields.get('[data-asm-tool-controls]'),'innerHTML',{set(html){tools=parse(html);this.markup=html;},get(){return this.markup||'';}});
  Object.defineProperty(fields.get('[data-asm-scene]'),'innerHTML',{set(html){pictureMarkup=html;pictures=parse(html);},get(){return pictureMarkup;}});
  const all=()=>[...staticButtons,...actions,...tools,...pictures];
  const root={ownerDocument:doc,closest:()=>hidden?{}:null,contains:target=>[...fields.values(),...all()].includes(target),
    querySelector(selector){if(selector==='[data-asm-actions] button')return actions[0];const match=/^\[data-([a-z-]+)="([^"]+)"\]$/.exec(selector);return match?all().find(item=>item.dataset[match[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]===match[2])||null:fields.get(selector)||null;},
    querySelectorAll(selector){const key={'[data-asm-tool]':'asmTool','[data-asm-part]':'asmPart','[data-assembly-action]':'assemblyAction','[data-asm-picture-view]':'asmPictureView'}[selector];return key?all().filter(item=>item.dataset[key]):[];},
    addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:(key,fn)=>{if(listeners.get(key)===fn)listeners.delete(key);},
    setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)
  };
  Object.defineProperty(root,'innerHTML',{set(html){writes++;markup=html;staticButtons=parse(html);staticButtons.filter(button=>['power-off','unplug','plug-in','boot','open-document'].includes(button.dataset.assemblyAction)).forEach(button=>button.drawer=fields.get('[data-asm-power-reference]'));},get(){return markup;}});
  doc.elementFromPoint=()=>dropTarget;
  const mount=vm.runInNewContext(`${source.replace(/^import[^\n]+\n/gm,'').replace('export function mountAssemblyWorkbench','function mountAssemblyWorkbench')};mountAssemblyWorkbench`,{assemblyActions,assemblyFailure,ASSEMBLY_FASTENERS,ASSEMBLY_TOOLS,assemblyToolAction,ASSEMBLY_CABLES,cableConnection,assemblyCableAction,workbenchGuidance,pcActivity,assemblyBuilderView,renderAssemblyBuilder});
  let state=stateOverride(applyHardwareAction(caseId,initialHardwareState(caseId),'enable-assembly').state),controller;
  const committed=[];controller=mount(root,{state,onAction(action){committed.push(action);const result=applyHardwareAction(caseId,state,action);state=result.state;controller.update(state);return result;}});
  function click(key,value){const target=all().find(item=>item.dataset[key]===value);assert.ok(target,`Missing ${key}=${value}`);target.focus();listeners.get('click')?.({target});return target;}
  function choose(selector,value){const target=fields.get(selector);target.value=value;target.focus();listeners.get('change')?.({target});}
  function complete(value=true){const target=fields.get('[data-asm-all]');target.checked=value;target.focus();listeners.get('change')({target});}
  function begin(id){const target=pictures.findLast(item=>item.dataset.asmPicture===id);assert.ok(target,`Missing draggable ${id}`);listeners.get('pointerdown')({target,button:0,pointerId:1,clientX:10,clientY:10});listeners.get('pointermove')({target,pointerId:1,clientX:30,clientY:30,preventDefault(){}});}
  function release(destination){dropTarget=pictures.find(item=>item.dataset.asmDrop===destination)||null;listeners.get('pointerup')({target:root,pointerId:1,clientX:40,clientY:40});}
  return{root,controller,fields,doc,listeners,docListeners,viewListeners,captures,committed,click,choose,complete,begin,release,get state(){return state;},get writes(){return writes;},get markup(){return markup;},get picture(){return pictureMarkup;},pictures:()=>pictures,partAction(action){const target=actions.find(node=>node.dataset.assemblyAction===action);assert.ok(target,'Missing part-control action '+action);target.focus();listeners.get('click')({target});}};
}

function reconnectMotherboardPower(bench){
  if(bench.state.pcOn)bench.click('asmToggle','power');
  if(bench.state.acConnected)bench.click('asmToggle','ac');
  bench.click('asmPart','panel');
  for(const action of ['asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel'])bench.click('assemblyAction',action);
  bench.click('asmTool','cables');bench.choose('[data-asm-cable]','atx');bench.choose('[data-asm-cable-target]','atx-header');bench.click('asmCableAction','connect');
  assert.equal(bench.state.atxConnected,true);
  bench.click('asmPart','panel');
  for(const action of ['asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1'])bench.click('assemblyAction',action);
  assert.equal(bench.state.assembly.panelInstalled,true);assert.ok(bench.state.assembly.panelScrews.every(Boolean));
}

test('the branded side panel covers internal parts and picture context follows the safe opening and refitting sequence',()=>{
  const bench=fixture({caseId:'INC-102'});
  assert.match(bench.picture,/data-asm-panel-cover/);assert.match(bench.picture,/assets\/favicon\.svg/);
  const cover=bench.picture.slice(bench.picture.indexOf('<g class="asm-solid-panel"'),bench.picture.indexOf('<g class="hw-bench-annotation"'));
  assert.match(cover,/class="asm-panel-vents"/);assert.match(cover,/<image[^>]*width="64" height="64"/);
  assert.doesNotMatch(cover,/<text\b|logo-dark\.png|KEEP CLEAR/);
  assert.doesNotMatch(bench.picture,/SIDE PANEL FITTED|INTERIOR COVERED/);
  for(const id of ['board','cpu','cooler','ram','gpu','storage','atx','eps','front'])assert.ok(!bench.picture.includes(`data-asm-picture="${id}"`),id);
  assert.doesNotMatch(bench.picture,/data-asm-interior|class="asm-fan/);
  bench.click('asmTool','cables');bench.choose('[data-asm-cable]','atx');
  assert.doesNotMatch(bench.picture,/data-asm-picture="port-atx-header"/);
  assert.doesNotMatch(bench.picture,/data-asm-picture="(?:cable-atx|cable-rest)"/);
  bench.click('asmCableAction','connect');assert.equal(bench.state.atxConnected,false,'The action boundary still guards the covered socket.');
  assert.doesNotMatch(bench.markup,/asm-case-access|data-asm-toggle="panel"/);
  bench.click('asmTool','screwdriver');for(const [i,screws]of [[0,[false,true]],[1,[false,false]]]){bench.click('asmPicture','panel-'+i);assert.deepEqual(bench.state.assembly.panelScrews,screws);assert.equal(bench.state.assembly.panelInstalled,true);assert.match(bench.picture,/data-asm-panel-cover/);}
  bench.click('asmTool','move');bench.click('asmPicture','panel');bench.click('asmContextAction','asm-remove-panel');assert.equal(bench.state.assembly.panelInstalled,false);bench.click('asmTool','cables');
  assert.doesNotMatch(bench.picture,/data-asm-panel-cover/);assert.match(bench.picture,/data-asm-interior/);assert.match(bench.picture,/data-asm-picture="port-atx-header"/);
  assert.match(bench.picture,/data-asm-picture="cable-atx"/);assert.match(bench.picture,/data-asm-picture="cable-rest"/);
  bench.click('asmCableAction','connect');assert.equal(bench.state.atxConnected,true);
  bench.click('asmTool','move');bench.click('asmPicture','panel');bench.click('asmContextAction','asm-fit-panel');bench.click('asmTool','screwdriver');for(const i of [0,1])bench.click('asmPicture','panel-'+i);bench.click('asmTool','cables');
  assert.equal(bench.state.assembly.panelInstalled,true);assert.deepEqual(bench.state.assembly.panelScrews,[true,true]);assert.match(bench.picture,/data-asm-panel-cover/);
  assert.doesNotMatch(bench.picture,/data-asm-picture="(?:cable-atx|cable-rest|port-atx-header)"/);
  bench.choose('[data-asm-cable]','ac');assert.match(bench.picture,/data-asm-picture="cable-ac"/);assert.match(bench.picture,/data-asm-picture="cable-rest"/);
  bench.click('asmToggle','ac');const before=structuredClone(bench.state);bench.click('asmTool','screwdriver');bench.click('asmPicture','panel-0');assert.deepEqual(bench.state,before,'Connected AC still blocks opening through the picture.');
  bench.controller.dispose();
});

test('the compact monitor Input button cycles source and retains focus without a monitor power button',()=>{
  const bench=fixture({caseId:'INC-107',stateOverride:state=>({...state,monitorOn:false})});
  assert.match(bench.picture,/class="asm-monitor-controls" role="group" aria-label="Monitor bezel controls"/);
  assert.deepEqual(bench.pictures().filter(item=>item.dataset.asmToggle).map(item=>item.dataset.asmToggle),['input']);
  assert.doesNotMatch(bench.picture,/asm-monitor-power|asm-monitor-led|data-asm-toggle="monitor"/);
  assert.match(bench.picture,/class="asm-monitor-input" data-asm-toggle="input" aria-label="Monitor input: DisplayPort\. Switch to HDMI"/);
  const before=bench.state.bootCount;
  bench.click('asmToggle','input');assert.equal(bench.state.monitorInput,'hdmi');assert.match(bench.picture,/Classroom Desktop/);
  assert.equal(bench.doc.activeElement.dataset.asmToggle,'input');assert.equal(bench.state.documentOpened,false);
  assert.equal(Object.hasOwn(bench.state,'monitorOn'),false,'An older preview power flag cannot leave the monitor inaccessible.');
  assert.match(bench.picture,/aria-label="Monitor input: HDMI\. Switch to DisplayPort"/);
  bench.click('asmToggle','input');assert.match(bench.picture,/NO SIGNAL/);assert.equal(bench.state.booted,true);assert.equal(bench.state.bootCount,before);
  const snapshot=structuredClone(bench.state);bench.controller.setVisible(false);bench.click('asmToggle','input');assert.deepEqual(bench.state,snapshot);
  bench.controller.dispose();
});

test('expanded equipment keeps the compact Input button inside the scaled picture canvas through source changes',()=>{
  const bench=fixture({caseId:'INC-107'}),host=bench.fields.get('[data-asm-scene]');
  bench.click('asmExpand','picture');assert.equal(host.dataset.expanded,'true');
  for(let i=0;i<3;i++){
    bench.click('asmToggle','input');
    assert.equal(host.dataset.expanded,'true');
    assert.match(bench.picture,/<div class="asm-schematic-canvas"><svg[\s\S]*<\/svg><div class="asm-monitor-controls"/);
    assert.equal(bench.doc.activeElement.dataset.asmToggle,'input');
  }
  assert.equal(bench.state.monitorInput,'hdmi');assert.equal(bench.state.booted,true);
  const css=readFileSync(new URL('../src/assembly.css',import.meta.url),'utf8');
  assert.match(css,/\.asm-schematic-canvas\{position:relative\}/);
  assert.doesNotMatch(css,/\.asm-schematic\[data-expanded=true\] \.asm-monitor-controls\{position:sticky/);
  bench.controller.dispose();
});

test('cable sockets connect on click and the cable rest disconnects on click or keyboard without dragging',()=>{
  const bench=fixture({caseId:'INC-101'});bench.click('asmTool','cables');bench.choose('[data-asm-cable]','hdmi-pc');
  assert.match(bench.fields.get('[data-asm-tool-controls]').innerHTML,/1\. Choose a cable end[\s\S]*2\. Match its socket[\s\S]*3\. Connect cable/);
  bench.click('asmPicture','port-hdmi-gpu');assert.equal(bench.state.videoPort,'gpu');assert.equal(bench.state.pcVideoConnected,true);
  assert.equal(bench.root.querySelector('[data-asm-cable-action="connect"]').disabled,true);
  bench.choose('[data-asm-cable-target]','hdmi-board');assert.equal(bench.root.querySelector('[data-asm-cable-action="connect"]').disabled,false,'Choosing another matching socket enables its connection.');
  bench.click('asmCableAction','connect');assert.equal(bench.state.videoPort,'board');
  bench.choose('[data-asm-cable-target]','hdmi-gpu');bench.click('asmCableAction','connect');assert.equal(bench.state.videoPort,'gpu');
  bench.click('asmPicture','cable-rest');assert.equal(bench.state.pcVideoConnected,false);assert.equal(bench.state.signalConnected,true);
  bench.click('asmPicture','port-hdmi-gpu');const rest=bench.pictures().find(item=>item.dataset.asmPicture==='cable-rest');
  bench.listeners.get('keydown')({target:rest,key:'Enter',preventDefault(){}});assert.equal(bench.state.pcVideoConnected,false);
  assert.equal(bench.state.booted,true);bench.controller.dispose();
});

test('the workbench uses PR #6 native schematic artwork immediately without any graphics engine or camera import',()=>{
  assert.doesNotMatch(source,/import\(|assembly-scene|BABYLON|THREE|<canvas|data-asm-camera|3D/);
  const bench=fixture();assert.equal(bench.doc.activeElement,null);assert.match(bench.picture,/<svg[^>]+viewBox="12 46 860 566"/);
  for(const detail of ['hw-chassis','hw-board','MICRO-ATX','DDR4','SATA'])assert.ok(bench.picture.includes(detail),detail);
  assert.match(bench.markup,/<button type="button" class="asm-round-power" data-asm-toggle="power" aria-label="Power on and test startup" aria-pressed="false"/);
  assert.doesNotMatch(bench.markup.split('<details class="asm-drawer asm-power-reference"')[0],/data-assembly-action="(?:boot|power-off)"/);
  assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);assert.equal(bench.fields.get('[data-asm-tool-drawer]').hidden,true);bench.controller.dispose();
});

test('all eight ticket workbenches always show the complete X-ray with the monitor, including old saved views',()=>{
  for(const caseId of Array.from({length:8},(_,index)=>`INC-10${index+1}`))for(const savedView of ['bench','inside','internals','rear','monitor','display']){
    const bench=fixture({caseId,stateOverride:state=>({...state,view:savedView})}),before=structuredClone(bench.state);
    assert.match(bench.picture,/<svg[^>]+viewBox="12 46 860 566" data-asm-view="full-xray"/);
    assert.match(bench.picture,/Virtual PC workbench with monitor/);
    assert.match(bench.picture,/data-asm-monitor-screen=/);
    assert.doesNotMatch(bench.markup,/data-asm-picture-view|Inside PC|Rear connections/);
    bench.controller.update({...bench.state,view:'rear'});
    assert.match(bench.picture,/data-asm-view="full-xray"/);
    assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
  }
});

test('every tool, cable choice and complete-controls toggle keeps the full X-ray without changing equipment',()=>{
  for(const caseId of Array.from({length:8},(_,index)=>`INC-10${index+1}`)){
    const bench=fixture({caseId}),before=structuredClone(bench.state);bench.complete();
    for(const tool of ASSEMBLY_TOOLS){bench.click('asmTool',tool.id);assert.match(bench.picture,/data-asm-view="full-xray"/);assert.match(bench.picture,/data-asm-monitor-screen=/);}
    bench.click('asmTool','cables');
    for(const cable of ASSEMBLY_CABLES){bench.choose('[data-asm-cable]',cable.id);for(const socket of cable.sockets){bench.choose('[data-asm-cable-target]',socket.id);assert.match(bench.picture,/viewBox="12 46 860 566" data-asm-view="full-xray"/);}}
    bench.complete(false);bench.controller.update(bench.state);
    assert.match(bench.picture,/data-asm-view="full-xray"/);
    assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
  }
});

test('native controls keep every mechanical action available and preserve the stable equipment host',()=>{
  const bench=fixture(),host=bench.fields.get('[data-asm-scene]');bench.click('asmPart','psu');bench.click('assemblyAction','asm-fit-psu');
  assert.equal(bench.state.assembly.psuInstalled,true);assert.equal(bench.writes,1);assert.equal(bench.fields.get('[data-asm-scene]'),host);
  assert.match(bench.fields.get('[data-asm-feedback]').textContent,/Power supply/i);assert.ok(bench.doc.activeElement.dataset.assemblyAction.startsWith('asm-tighten-psu-'));
  bench.controller.dispose();assert.equal(bench.listeners.size,0);assert.equal(bench.docListeners.size,0);assert.equal(bench.viewListeners.size,0);
});

test('full PC X-ray and inspection are ephemeral and retain explicit focus and closed disclosures',()=>{
  const bench=fixture({caseId:'INC-101',stateOverride:state=>({...state,assembly:{...state.assembly,panelInstalled:false,panelScrews:[false,false]}})}),before=structuredClone(bench.state);bench.complete();
  assert.doesNotMatch(bench.markup,/data-asm-picture-view|Equipment picture views/);
  assert.match(bench.picture,/data-asm-view="full-xray"/);
  assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);
  bench.click('asmPicture','ram');assert.equal(bench.fields.get('[data-asm-select]').value,'ram');assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('Expand picture and Escape change only presentation, keep focus, and cancel held parts safely',()=>{
  const bench=fixture(),before=structuredClone(bench.state),scene=bench.fields.get('[data-asm-scene]');
  bench.click('asmTool','move');bench.begin('psu');assert.equal(bench.captures.size,1);
  const toggle=bench.click('asmExpandPicture','toggle');
  assert.equal(scene.attrs['data-picture-expanded'],'true');assert.equal(toggle.attrs['aria-pressed'],'true');assert.equal(toggle.textContent,'Collapse picture');
  assert.equal(bench.captures.size,0);bench.release('psu');assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);
  bench.controller.update(bench.state);assert.equal(scene.attrs['data-picture-expanded'],'true','Equipment updates keep the presentation choice.');
  bench.listeners.get('keydown')({target:toggle,key:'Escape'});
  assert.equal(scene.attrs['data-picture-expanded'],'false');assert.equal(toggle.attrs['aria-pressed'],'false');assert.equal(toggle.textContent,'Expand picture');assert.equal(bench.doc.activeElement,toggle);
  bench.click('asmExpandPicture','toggle');bench.click('asmExpandPicture','toggle');assert.equal(scene.attrs['data-picture-expanded'],'false');
  assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('native Enter and Space activate labeled schematic equipment without repairing during inspect',()=>{
  const bench=fixture({caseId:'INC-101',stateOverride:state=>({...state,assembly:{...state.assembly,panelInstalled:false,panelScrews:[false,false]}})}),before=structuredClone(bench.state);bench.complete();
  for(const [id,key]of [['ram','Enter'],['gpu',' ']]){const target=bench.pictures().find(item=>item.dataset.asmPicture===id);let prevented=false;bench.listeners.get('keydown')({target,key,preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(bench.fields.get('[data-asm-select]').value,id);}
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('top power changes retain native focus and extra power actions remain in an optional drawer',()=>{
  const bench=fixture({caseId:'INC-101'});
  bench.click('asmToggle','power');assert.equal(bench.doc.activeElement.dataset.asmToggle,'power','The visible native toggle keeps focus.');
  assert.equal(bench.fields.get('[data-asm-power-reference]').open,false);
  bench.click('asmToggle','power');bench.fields.get('[data-asm-power-reference]').open=true;
  for(const[action,next]of [['power-off','unplug'],['unplug','plug-in'],['plug-in','boot']]){bench.click('assemblyAction',action);assert.equal(bench.doc.activeElement.dataset.assemblyAction,next);assert.equal(bench.doc.activeElement.hidden,false);assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);}
  bench.controller.dispose();
});

test('every ticket shows one round native power toggle beside its labeled AC plug in the top strip',()=>{
  for(const caseId of Array.from({length:8},(_,index)=>`INC-10${index+1}`)){
    const bench=fixture({caseId});
    assert.doesNotMatch(bench.picture,/data-asm-picture="case-(?:power|ac)"/);
    const strip=bench.markup.match(/<div class="asm-power"[\s\S]*?<div class="asm-top-controls">/)?.[0];
    assert.ok(strip);assert.doesNotMatch(strip,/data-assembly-action=/);
    for(const toggle of ['power','ac']){
      assert.equal((strip.match(new RegExp('data-asm-toggle="'+toggle+'"','g'))||[]).length,1);
      const control=bench.root.querySelector('[data-asm-toggle="'+toggle+'"]');
      assert.equal(control.tag,'button');assert.equal(control.attrs.type,'button');assert.ok(control.attrs['aria-label']);
    }
    assert.match(strip,/class="asm-round-power"[^>]*data-asm-toggle="power"/);
    assert.match(strip,/class="asm-ac-toggle"[^>]*data-asm-toggle="ac"[^>]*><svg/);
    assert.match(bench.markup,/<details[^>]*data-asm-power-reference><summary>More power controls<\/summary>/);
    assert.equal(bench.fields.get('[data-asm-power-reference]').open,false);assert.deepEqual(bench.committed,[]);
    bench.controller.dispose();
  }
});

test('native top power and AC toggles retain focus, announce state and obey running-PC safety',()=>{
  const bench=fixture({caseId:'INC-102'});
  const power=bench.root.querySelector('[data-asm-toggle="power"]'),plug=bench.root.querySelector('[data-asm-toggle="ac"]');
  assert.equal(power.attrs['aria-pressed'],'false');assert.equal(plug.attrs['aria-label'],'Connect AC');
  bench.click('asmToggle','ac');
  assert.equal(bench.state.acConnected,true);assert.equal(bench.state.pcOn,false);assert.equal(bench.doc.activeElement,plug);
  assert.equal(plug.attrs['aria-label'],'Disconnect AC');assert.equal(bench.fields.get('[data-asm-ac-label]').textContent,'Disconnect AC');
  // Native buttons supply Enter/Space activation in the browser; this boundary
  // exercises their resulting click, without inventing a second key handler.
  bench.click('asmToggle','power');
  assert.equal(bench.state.pcOn,true);assert.equal(bench.state.booted,false,'AC alone leaves the motherboard power fault unresolved.');assert.equal(bench.state.documentOpened,false);
  assert.equal(bench.doc.activeElement,power);assert.equal(power.attrs['aria-pressed'],'true');assert.equal(power.attrs['aria-label'],'Power off');assert.equal(bench.fields.get('[data-asm-on]').textContent,'On');
  bench.click('asmToggle','ac');assert.equal(bench.state.acConnected,true,'The model refuses unplugging a running PC.');
  assert.match(bench.fields.get('[data-asm-feedback]').textContent,/power off|shut down/i);
  bench.click('asmToggle','power');assert.equal(bench.state.pcOn,false);assert.equal(power.attrs['aria-pressed'],'false');
  bench.click('asmToggle','ac');assert.equal(bench.state.acConnected,false);
  assert.equal(bench.doc.activeElement,plug);assert.equal(plug.attrs['aria-label'],'Connect AC');assert.equal(bench.fields.get('[data-asm-on]').textContent,'Off');
  assert.deepEqual(bench.committed,['plug-in','boot','unplug','power-off','unplug']);
  bench.controller.dispose();
});

test('Expand picture changes only the view and keeps the same schematic host and equipment',()=>{
  const bench=fixture({caseId:'INC-102'}),before=structuredClone(bench.state),host=bench.fields.get('[data-asm-scene]');
  const expand=bench.root.querySelector('[data-asm-expand="picture"]');
  assert.equal(expand.tag,'button');assert.equal(expand.attrs.type,'button');assert.equal(expand.attrs['aria-expanded'],'false');
  bench.click('asmExpand','picture');assert.equal(host.dataset.expanded,'true');assert.equal(expand.attrs['aria-expanded'],'true');assert.equal(expand.textContent,'Collapse picture');
  bench.controller.update(bench.state);assert.equal(bench.fields.get('[data-asm-scene]'),host);assert.equal(host.dataset.expanded,'true');
  assert.equal(bench.doc.activeElement,expand);assert.match(bench.picture,/data-asm-view="full-xray"/);
  bench.click('asmExpand','picture');assert.equal(host.dataset.expanded,'false');assert.equal(expand.attrs['aria-expanded'],'false');assert.equal(expand.textContent,'Expand picture');
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);assert.equal(bench.writes,1);bench.controller.dispose();
});

test('top power, AC and expand controls ignore clicks while the workbench is hidden',()=>{
  const bench=fixture({caseId:'INC-102'}),before=structuredClone(bench.state),host=bench.fields.get('[data-asm-scene]');
  bench.controller.setVisible(false);
  for(const toggle of ['power','ac'])bench.click('asmToggle',toggle);
  bench.click('asmExpand','picture');assert.equal(host.dataset.expanded,undefined);
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);
  bench.controller.setVisible(true);bench.click('asmToggle','ac');assert.equal(bench.state.acConnected,true);bench.controller.dispose();
});

test('only a working desktop offers the monitor file link and its keyboard action checks the original file',()=>{
  const bench=fixture({caseId:'INC-102'});
  assert.doesNotMatch(bench.fields.get('[data-asm-activity-detail]').textContent,/Click Lesson_Practice_File/);
  assert.doesNotMatch(bench.picture,/data-asm-picture="open-document"/);
  reconnectMotherboardPower(bench);
  bench.click('asmToggle','ac');bench.click('asmToggle','power');
  assert.equal(bench.state.documentOpened,false);
  assert.equal(bench.fields.get('[data-asm-activity-detail]').textContent,'Click Lesson_Practice_File.docx on the monitor to check your fix.');
  assert.match(bench.picture,/role="button" tabindex="0" aria-label="Open Lesson_Practice_File.docx to check your fix" data-asm-picture="open-document"/);
  assert.match(bench.picture,/text-decoration="underline">Lesson_Practice_File.docx/);
  const file=bench.pictures().find(item=>item.dataset.asmPicture==='open-document');file.focus();
  bench.listeners.get('keydown')({target:file,key:'Enter',preventDefault(){}});
  assert.equal(bench.state.documentOpened,true);assert.equal(bench.state.originalDriveInstalled,true);
  assert.equal(bench.doc.activeElement.dataset.asmToggle,'power','The disappearing file target returns focus to the visible native power button.');
  assert.match(bench.fields.get('[data-asm-activity-detail]').textContent,/original lesson file opened.*passed the file check/i);
  bench.click('asmToggle','power');assert.doesNotMatch(bench.picture,/data-asm-picture="open-document"/);
  assert.doesNotMatch(bench.fields.get('[data-asm-activity-detail]').textContent,/Click Lesson_Practice_File|passed the file check/);
  bench.controller.dispose();
  const blocked=fixture({caseId:'INC-103'});blocked.click('assemblyAction','open-document');
  assert.equal(blocked.state.documentOpened,false);assert.doesNotMatch(blocked.picture,/data-asm-picture="open-document"/);blocked.controller.dispose();
});

test('tool drawers retain user disclosure and picker focus across equipment updates',()=>{
  const bench=fixture();bench.click('asmTool','cables');assert.equal(bench.fields.get('[data-asm-tool-drawer]').open,false);
  bench.fields.get('[data-asm-tool-drawer]').open=false;bench.choose('[data-asm-cable]','sata-data');const focused=bench.doc.activeElement;bench.controller.update(bench.state);
  assert.equal(bench.doc.activeElement,focused);assert.equal(bench.fields.get('[data-asm-tool-drawer]').open,false);
  bench.click('asmTool','inspect');assert.equal(bench.fields.get('[data-asm-tool-drawer]').hidden,true);bench.controller.dispose();
});

test('only the panel screws are exposed until removal, and every internal screw still obeys safety rules',()=>{
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);bench.complete();bench.click('asmTool','screwdriver');
  for(const id of ['panel-0','panel-1'])assert.ok(bench.picture.includes('data-asm-picture="'+id+'"'));
  for(const group of ['psu','board','cooler','gpu','ssd'])assert.ok(!bench.picture.includes('data-asm-picture="'+group+'-0"'));
  bench.click('asmPicture','panel-0');assert.equal(bench.committed.at(-1),'asm-loosen-panel-0');assert.deepEqual(bench.state,before);
  bench.click('asmToggle','power');bench.click('assemblyAction','unplug');
  for(const id of ['panel-0','panel-1'])bench.click('asmPicture',id);
  bench.click('asmTool','move');bench.click('asmPicture','panel');bench.click('asmContextAction','asm-remove-panel');bench.click('asmTool','screwdriver');assert.equal(bench.state.assembly.panelInstalled,false);
  for(const[group,spec]of Object.entries(ASSEMBLY_FASTENERS))for(let i=0;i<spec.count;i++)assert.ok(bench.picture.includes('data-asm-picture="'+group+'-'+i+'"'));
  bench.controller.dispose();
});

test('optional native part dragging proposes only a matching mount or tray action on release',()=>{
  const bench=fixture();bench.click('asmTool','move');const before=structuredClone(bench.state);
  bench.begin('psu');assert.deepEqual(bench.state,before);assert.equal(bench.captures.size,1);bench.release('ram');assert.deepEqual(bench.state,before);
  bench.begin('psu');bench.release('psu');assert.equal(bench.state.assembly.psuInstalled,true);assert.equal(bench.captures.size,0);assert.equal(bench.committed.at(-1),'asm-fit-psu');
  bench.begin('psu');bench.release('tray');assert.equal(bench.state.assembly.psuInstalled,false);bench.controller.dispose();
});

test('native cable dragging preserves independent HDMI ends and uses the same guarded action mapper',()=>{
  const bench=fixture({caseId:'INC-101'});bench.click('asmTool','cables');bench.choose('[data-asm-cable]','hdmi-pc');
  bench.begin('cable-hdmi-pc');const count=bench.committed.length;bench.release('port-hdmi-gpu');assert.equal(bench.committed.length,count+1);assert.equal(bench.state.videoPort,'gpu');
  bench.begin('cable-hdmi-pc');bench.release('tray');assert.equal(bench.state.pcVideoConnected,false);assert.equal(bench.state.signalConnected,true);
  bench.choose('[data-asm-cable]','hdmi-monitor');bench.begin('cable-hdmi-monitor');bench.release('tray');assert.equal(bench.state.signalConnected,false);assert.equal(bench.state.booted,true);bench.controller.dispose();
});

test('a missing PSU remains an empty bay while selecting cables and never advertises a live AC socket',()=>{
  const bench=fixture();assert.match(bench.picture,/EMPTY PSU BAY/);assert.doesNotMatch(bench.picture,/>POWER SUPPLY</);
  bench.click('asmTool','cables');bench.choose('[data-asm-cable]','ac');assert.doesNotMatch(bench.picture,/data-asm-picture="port-ac-inlet"/);
  assert.match(bench.picture,/EMPTY PSU BAY/);assert.doesNotMatch(bench.picture,/data-asm-picture="port-ac-inlet"/);
  assert.doesNotMatch(bench.picture,/M544 463C464/);bench.click('asmCableAction','connect');assert.equal(bench.state.acConnected,false);
  bench.controller.dispose();
});

test('AC socket markers remain on the PSU in the full schematic',()=>{
  const bench=fixture({caseId:'INC-101'});bench.complete();bench.click('asmTool','cables');bench.choose('[data-asm-cable]','ac');
  assert.match(bench.picture,/data-asm-picture="port-ac-inlet"[^>]*>[\s\S]*?<rect x="749" y="225"/);
  assert.match(bench.picture,/data-asm-view="full-xray"/);
  assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('report cancellation, hide, Escape, pointer cancellation, backgrounding and disposal never commit a held part',()=>{
  for(const stop of [bench=>bench.controller.cancel(),bench=>bench.controller.setVisible(false),bench=>bench.listeners.get('keydown')({key:'Escape'}),bench=>bench.listeners.get('pointercancel')({}),bench=>{bench.doc.hidden=true;bench.docListeners.get('visibilitychange')();},bench=>bench.viewListeners.get('blur')()]){
    const bench=fixture();bench.click('asmTool','move');bench.begin('psu');const before=structuredClone(bench.state);stop(bench);bench.release('psu');assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);assert.equal(bench.captures.size,0);bench.controller.dispose();
  }
  const bench=fixture();bench.click('asmTool','move');bench.begin('psu');bench.controller.dispose();bench.controller.dispose();assert.equal(bench.captures.size,0);assert.equal(bench.listeners.size,0);assert.equal(bench.docListeners.size,0);bench.controller.update(bench.state);
});

test('both HDMI ends and monitor input affect the schematic display; a picture never opens the lesson by itself',()=>{
  const bench=fixture({caseId:'INC-101'});bench.click('asmTool','cables');bench.choose('[data-asm-cable]','hdmi-pc');bench.choose('[data-asm-cable-target]','hdmi-gpu');bench.click('asmCableAction','connect');
  assert.match(bench.picture,/Classroom Desktop/);assert.equal(bench.state.documentOpened,false);
  bench.choose('[data-asm-cable]','hdmi-monitor');bench.click('asmCableAction','disconnect');assert.match(bench.picture,/NO SIGNAL/);assert.doesNotMatch(bench.picture,/Classroom Desktop/);
  bench.click('asmCableAction','connect');bench.click('asmPicture','open-document');assert.equal(bench.state.documentOpened,true);assert.match(bench.picture,/Original file opened/);
  assert.equal(bench.doc.activeElement?.dataset?.asmToggle,'power','The removed SVG launcher hands focus to the visible native power control.');
  assert.equal(bench.doc.activeElement.hidden,false);bench.controller.dispose();
});

test('malformed picker values and inactive surfaces cannot create equipment changes',()=>{
  const bench=fixture(),before=structuredClone(bench.state);for(const value of ['__proto__','constructor','<script>'])bench.choose('[data-asm-select]',value);
  bench.controller.setVisible(false);bench.click('asmPart','psu');bench.click('asmToggle','power');assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);
  const external={dataset:{assemblyAction:'boot'}};bench.doc.activeElement=external;bench.controller.update(bench.state);assert.equal(bench.doc.activeElement,external);bench.controller.dispose();
});

test('display tickets show only their needed controls until the complete set is explicitly requested',()=>{
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);
  assert.equal(bench.fields.get('[data-asm-ticket-title]').textContent,'Display checks');
  assert.equal(bench.fields.get('[data-asm-select]').value,'display');
  assert.match(bench.picture,/Virtual PC workbench with monitor/);
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
  const cableScrews=storage.fields.get('[data-asm-tool-controls]').innerHTML;
  for(const id of ['panel-0','panel-1'])assert.ok(cableScrews.includes(`value="${id}"`));
  assert.doesNotMatch(cableScrews,/value="(?:board|cooler|gpu|ssd)-/);
  assert.doesNotMatch(storage.fields.get('[data-asm-select]').innerHTML,/value="ssd"/,'A drive-cable repair does not need drive removal.');
  storage.click('asmTool','cables');const storageCables=storage.fields.get('[data-asm-tool-controls]').innerHTML;
  for(const id of ['ac','sata-data','sata-power'])assert.ok(storageCables.includes(`value="${id}"`));
  assert.doesNotMatch(storageCables,/value="(?:atx|eps|hdmi-pc|cpu-fan)"/);storage.controller.dispose();
  const replacement=fixture({caseId:'INC-105'});replacement.click('asmTool','screwdriver');
  assert.match(replacement.fields.get('[data-asm-tool-controls]').innerHTML,/value="ssd-1"/,'Restoring a removed original drive still exposes its mounts.');replacement.controller.dispose();
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
  assert.doesNotMatch(power.fields.get('[data-asm-tool-help]').textContent,/side panel/);assert.equal(power.fields.get('[data-asm-build-help]').hidden,false);
  power.choose('[data-asm-cable]','atx');assert.match(power.fields.get('[data-asm-tool-help]').textContent,/Power off.*disconnect AC.*side panel/);power.controller.dispose();
  const memory=fixture({caseId:'INC-103'});assert.equal(memory.fields.get('[data-asm-build-help]').hidden,false);memory.controller.dispose();
});

test('all eight tickets filter native part action rows as well as their toolbars, with complete actions available only by opt-in',()=>{
  const screws=group=>Array.from({length:ASSEMBLY_FASTENERS[group].count},(_,i)=>['tighten','loosen'].map(operation=>`asm-${operation}-${group}-${i}`)).flat();
  const parts=part=>['fit','remove'].map(operation=>`asm-${operation}-${part}`);
  const cables=id=>['connect','disconnect'].map(operation=>`asm-${operation}-${id}`);
  const permitted={display:new Set(cables('display')),power:new Set([...screws('panel'),...parts('panel'),...cables('atx')]),memory:new Set([...screws('panel'),...parts('panel'),...parts('ram'),'asm-open-ram-clips','asm-close-ram-clips']),storage:new Set([...screws('panel'),...screws('ssd'),...parts('panel'),...parts('ssd'),...cables('sata-data'),...cables('sata-power')])};
  for(const caseId of ['INC-101','INC-102','INC-103','INC-104','INC-105','INC-106','INC-107','INC-108']){
    const bench=fixture({caseId}),before=structuredClone(bench.state),guide=workbenchGuidance(bench.state);
    const kind=['INC-101','INC-107','INC-108'].includes(caseId)?'display':caseId==='INC-102'?'power':caseId==='INC-103'?'memory':caseId==='INC-106'?'build':'storage';
    for(const group of guide.groups){
      bench.choose('[data-asm-select]',group);
      const rows=bench.root.querySelectorAll('[data-assembly-action]').map(item=>item.dataset.assemblyAction).filter(id=>id.startsWith('asm-'));
      if(kind!=='build')for(const action of rows)assert.ok(permitted[kind].has(action),`${caseId}/${group} must not offer unrelated ${action}`);
      if(kind==='power')assert.ok(rows.every(action=>!/-psu(?:-|$)/.test(action)),'The power profile allows its panel and motherboard cable, not PSU teardown');
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

test('ticket guidance refresh keeps selected cable, full view, disclosure and native focus without recording inspection as work',()=>{
  const bench=fixture({caseId:'INC-101'}),before=structuredClone(bench.state);
  bench.click('asmTool','cables');bench.choose('[data-asm-cable]','hdmi-monitor');
  bench.fields.get('[data-asm-tool-drawer]').open=false;bench.choose('[data-asm-cable]','hdmi-monitor');
  const focused=bench.doc.activeElement;bench.controller.update(bench.state);
  assert.equal(bench.doc.activeElement,focused);assert.equal(bench.fields.get('[data-asm-tool-drawer]').open,false);
  assert.match(bench.fields.get('[data-asm-tool-controls]').innerHTML,/value="hdmi-monitor" selected/);
  assert.match(bench.picture,/Virtual PC workbench with monitor/);
  assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('fan motion follows powered fitted components even when POST fails, and stops for AC standby',()=>{
  const bench=fixture({caseId:'INC-103',stateOverride:state=>({...state,assembly:{...state.assembly,panelInstalled:false,panelScrews:[false,false]}})}),before=structuredClone(bench.state);
  assert.equal(bench.state.booted,false);assert.match(bench.fields.get('[data-asm-activity-label]').textContent,/startup blocked/i);
  for(const part of ['cpu','psu','gpu'])assert.match(bench.picture,new RegExp(`class="[^"]*asm-fan-${part}" data-running="true"`));
  assert.match(bench.fields.get('[data-asm-fan-status]').textContent,/CPU cooler fan: running/);
  assert.doesNotMatch(bench.picture,/asm-fan-(?:ram|ssd)/);assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);
  bench.click('asmToggle','power');assert.match(bench.fields.get('[data-asm-power]').textContent,/standby/i);
  for(const part of ['cpu','psu','gpu'])assert.match(bench.picture,new RegExp(`class="[^"]*asm-fan-${part}" data-running="false"`));
  assert.match(bench.fields.get('[data-asm-fan-status]').textContent,/CPU cooler fan: stopped/);bench.controller.dispose();
});

test('the visible activity banner gives neutral state guidance while detailed diagnostic facts stay in a closed readout',()=>{
  for(const caseId of ['INC-101','INC-103']){
    const bench=fixture({caseId}),banner=bench.fields.get('[data-asm-activity-detail]').textContent;
    assert.doesNotMatch(banner,/graphics.card|motherboard output|memory|RAM|seat|Use the graphics/i);
    assert.match(banner,/Inspect|evidence|test|Check/);
    assert.ok(bench.fields.get('[data-asm-diagnostic-detail]').textContent.length>0);
    assert.match(bench.markup,/<details class="asm-drawer asm-readouts">/);
    assert.doesNotMatch(bench.markup,/<details[^>]*asm-readouts[^>]*\bopen\b/);
    assert.deepEqual(bench.committed,[]);bench.controller.dispose();
  }
});

test('a disconnected CPU fan stays still while other powered fans and startup status remain independently modeled',()=>{
  const bench=fixture({caseId:'INC-103',stateOverride:state=>({...state,assembly:{...state.assembly,cpuFanConnected:false,panelInstalled:false,panelScrews:[false,false]}})});
  assert.match(bench.picture,/asm-fan-cpu" data-running="false"/);
  assert.match(bench.picture,/asm-fan-psu" data-running="true"/);assert.match(bench.picture,/asm-fan-gpu" data-running="true"/);
  assert.match(bench.fields.get('[data-asm-fan-status]').textContent,/CPU cooler fan: stopped/);assert.deepEqual(bench.committed,[]);bench.controller.dispose();
});

test('only curved fan blades rotate while PSU grilles, hubs and GPU housings remain fixed',()=>{
  const bench=fixture({caseId:'INC-103',stateOverride:state=>({...state,assembly:{...state.assembly,panelInstalled:false,panelScrews:[false,false]}})});
  for(const kind of ['psu','gpu']){
    const rotor=new RegExp(`<g class="asm-fan asm-fan-${kind}"[^>]*>([\\s\\S]*?)<\\/g>`).exec(bench.picture);
    assert.ok(rotor,kind);assert.equal((rotor[1].match(/<path /g)||[]).length,4);
    assert.match(rotor[1],/C/);assert.doesNotMatch(rotor[1],/<rect|<circle|asm-fixed-grille/);
  }
  assert.match(bench.picture,/<\/g><path class="asm-fixed-grille" d="M338 99/);
  assert.match(bench.picture,/data-asm-view="full-xray"/);
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

test('monitor SVG and accessible transcript show actual ticket-specific startup evidence without granting work',()=>{
  const expected={'INC-101':'INPUT_NO_SIGNAL','INC-102':'MONITOR_STANDBY','INC-103':'PRE_VIDEO_POST','INC-104':'BOOT_DEVICE_UNAVAILABLE','INC-105':'BOOT_DEVICE_UNAVAILABLE','INC-106':'MONITOR_STANDBY','INC-107':'INPUT_NO_SIGNAL','INC-108':'INPUT_NO_SIGNAL'};
  for(const [caseId,code]of Object.entries(expected)){
    const bench=fixture({caseId}),before=structuredClone(bench.state);
    assert.ok(bench.picture.includes(`data-asm-monitor-screen="${code}"`),caseId);
    assert.equal(bench.fields.get('[data-asm-monitor-readout]').textContent,pcActivity(bench.state).display.readout);
    if(caseId==='INC-103')assert.doesNotMatch(bench.picture,/MEMORY NOT DETECTED|CLASSROOM UEFI/);
    if(['INC-104','INC-105'].includes(caseId))assert.match(bench.picture,/CLASSROOM UEFI[\s\S]*NO BOOT DEVICE[\s\S]*SATA devices detected: 0/);
    assert.match(bench.markup,/<details class="asm-monitor-readout">/);assert.match(bench.markup,/data-asm-monitor-readout role="status" aria-live="polite"/);
    assert.deepEqual(bench.state,before);assert.deepEqual(bench.committed,[]);assert.equal(bench.writes,1);bench.controller.dispose();
  }
});

test('explicit power and original-file actions update the monitor snapshot without timers or premature success',()=>{
  const bench=fixture({caseId:'INC-102'});
  reconnectMotherboardPower(bench);
  assert.match(bench.picture,/MONITOR STANDBY/);bench.click('assemblyAction','plug-in');assert.match(bench.picture,/MONITOR STANDBY/);
  assert.equal(bench.state.booted,false);bench.click('assemblyAction','boot');assert.match(bench.picture,/Classroom Desktop/);
  assert.equal(bench.state.documentOpened,false);assert.match(bench.fields.get('[data-asm-monitor-readout]').textContent,/UEFI and boot manager: completed/);
  bench.click('assemblyAction','open-document');assert.match(bench.picture,/Original file opened/);
  bench.click('assemblyAction','power-off');assert.match(bench.picture,/MONITOR STANDBY/);assert.doesNotMatch(bench.picture,/Original file opened|Classroom Desktop/);
  assert.deepEqual(bench.committed.slice(-4),['plug-in','boot','open-document','power-off']);
  assert.doesNotMatch(source,/requestAnimationFrame|setInterval|setTimeout/);bench.controller.dispose();
});

function parityGroup(action){
  const screw=/^asm-(?:tighten|loosen)-(panel|psu|board|cooler|gpu|ssd)-/.exec(action);if(screw)return screw[1];
  const part=/^asm-(?:fit|remove)-(panel|psu|board|cpu|cooler|ram|gpu|ssd)$/.exec(action);if(part)return part[1];
  if(action.includes('paste'))return 'paste';if(action.includes('retention'))return 'cpu';if(action.includes('ram-clips'))return 'ram';if(action.includes('pcie-latch')||action.includes('gpu-power'))return 'gpu';if(action.includes('cpu-fan'))return 'cooler';if(action.includes('sata-'))return 'ssd';if(action.includes('display')||['video-gpu','video-board','disconnect-video','connect-signal','disconnect-signal','input-hdmi','input-displayport','open-document'].includes(action))return 'display';if(['power-off','unplug','plug-in','boot'].includes(action))return 'psu';return 'cables';
}
function parityStep(bench,mode,action){
  const expected=applyHardwareAction('INC-106',bench.state,action);assert.notEqual(expected.kind,'warning',action+': '+expected.message);
  const group=parityGroup(action);
  if(mode==='controls'){bench.choose('[data-asm-select]',group);bench.partAction(action);}
  else{
    const screw=/^asm-(?:tighten|loosen)-(.+)$/.exec(action),clip=/^asm-(?:open|close)-(retention|ram-clips|pcie-latch)$/.exec(action),lead=/^asm-(?:connect|disconnect)-(.+)$/.exec(action);
    if(screw){bench.click('asmTool','screwdriver');bench.click('asmPicture',screw[1]);}
    else if(clip){bench.click('asmTool','move');bench.click('asmPicture',clip[1]);}
    else if(action.includes('paste')){bench.click('asmTool',action==='asm-clean-paste'?'clean':'paste');if(action==='asm-excess-paste')bench.click('asmContextAction',action);else bench.click('asmPicture','cpu');}
    else if(lead){bench.click('asmTool','cables');bench.click('asmPicture','lead-'+(lead[1]==='display'?'hdmi-monitor':lead[1]));}
    else if(action==='video-gpu'||action==='video-board'){bench.click('asmTool','cables');bench.click('asmPicture','cable-hdmi-pc');bench.click('asmPicture','port-'+(action==='video-gpu'?'hdmi-gpu':'hdmi-board'));}
    else if(action==='disconnect-video'||action==='disconnect-signal'){bench.click('asmTool','cables');bench.click('asmPicture','lead-'+(action==='disconnect-video'?'hdmi-pc':'hdmi-monitor'));}
    else if(action==='input-hdmi'||action==='input-displayport')bench.click('asmToggle','input');
    else if(action==='power-off'||action==='boot')bench.click('asmToggle','power');
    else if(action==='unplug'||action==='plug-in')bench.click('asmToggle','ac');
    else if(action==='open-document')bench.click('asmPicture','open-document');
    else{bench.click('asmTool','move');bench.click('asmPicture',group);bench.click('asmContextAction',action);}
    assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false,'Visual work never opens the separate Part controls drawer.');
  }
  const actual=structuredClone(bench.state),wanted=structuredClone(expected.state);delete actual.actions;delete wanted.actions;assert.deepEqual(actual,wanted,mode+' '+action);
}
const buildSteps=['asm-fit-psu',...[0,1,2,3].map(i=>'asm-tighten-psu-'+i),'asm-fit-board',...[0,1,2,3].map(i=>'asm-tighten-board-'+i),'asm-fit-cpu','asm-close-retention','asm-apply-paste','asm-fit-cooler',...[0,3,1,2].map(i=>'asm-tighten-cooler-'+i),'asm-connect-cpu-fan','asm-fit-ram','asm-close-ram-clips','asm-fit-gpu','asm-close-pcie-latch','asm-tighten-gpu-0','asm-tighten-gpu-1','asm-fit-ssd','asm-tighten-ssd-0','asm-tighten-ssd-1','asm-connect-atx','asm-connect-eps','asm-connect-gpu-power','asm-connect-sata-data','asm-connect-sata-power','asm-connect-front-panel','video-gpu','asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1'];

test('builder tray selection performs no install and its live file-check button uses the existing guarded model action',()=>{
  const bench=fixture({stateOverride:state=>buildSteps.reduce((current,action)=>applyHardwareAction('INC-106',current,action).state,state)});
  const ready=structuredClone(bench.state),open=()=>bench.root.querySelector('[data-asm-build-open-file="open"]');
  assert.match(bench.markup,/aria-label="PC building studio"/);assert.equal(open().disabled,true);
  bench.click('asmPart','ram');assert.deepEqual(bench.state,ready);assert.deepEqual(bench.committed,[]);
  bench.click('asmBuildOpenFile','open');assert.equal(bench.state.documentOpened,false,'A synthetic early click cannot bypass the model.');
  bench.click('asmToggle','ac');bench.click('asmToggle','power');
  assert.equal(bench.state.booted,true);assert.equal(bench.state.documentOpened,false);assert.equal(open().disabled,false);
  bench.click('asmBuildOpenFile','open');assert.equal(bench.state.documentOpened,true);assert.equal(open().disabled,true);
  assert.equal(verifyHardware('INC-106',bench.state).ok,true);
  const count=bench.committed.length;bench.controller.setVisible(false);bench.click('asmBuildOpenFile','open');
  assert.equal(bench.committed.length,count);bench.controller.dispose();
});
const teardownSteps=['power-off','unplug','asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel','asm-disconnect-cpu-fan','asm-disconnect-atx','asm-disconnect-eps','asm-disconnect-gpu-power','asm-disconnect-sata-data','asm-disconnect-sata-power','asm-disconnect-front-panel','disconnect-video','asm-disconnect-display','asm-loosen-ssd-0','asm-loosen-ssd-1','asm-remove-ssd','asm-loosen-gpu-0','asm-loosen-gpu-1','asm-open-pcie-latch','asm-remove-gpu','asm-open-ram-clips','asm-remove-ram',...[2,1,3,0].map(i=>'asm-loosen-cooler-'+i),'asm-remove-cooler','asm-clean-paste','asm-open-retention','asm-remove-cpu',...[0,1,2,3].map(i=>'asm-loosen-board-'+i),'asm-remove-board',...[0,1,2,3].map(i=>'asm-loosen-psu-'+i),'asm-remove-psu'];
for(const mode of ['visual','controls'])test(mode+' interface independently builds, tears down, and rebuilds the complete guarded PC',()=>{
  const bench=fixture();bench.click('asmComplete','toggle');
  const build=()=>{for(const action of buildSteps)parityStep(bench,mode,action);if(!bench.state.signalConnected)parityStep(bench,mode,'asm-connect-display');if(bench.state.monitorInput!=='hdmi')parityStep(bench,mode,'input-hdmi');for(const action of ['plug-in','boot','open-document'])parityStep(bench,mode,action);assert.equal(verifyHardware('INC-106',bench.state).ok,true);};
  build();for(const action of teardownSteps)parityStep(bench,mode,action);assert.equal(bench.state.boardInstalled,false);assert.equal(bench.state.assembly.psuInstalled,false);build();bench.controller.dispose();
});

test('screw centers remain above the fitted panel hit target and decorative wires never take pointer hits',()=>{
  const bench=fixture({caseId:'INC-101'});bench.click('asmComplete','toggle');bench.click('asmTool','screwdriver');
  const panel=bench.picture.indexOf('data-asm-picture="panel"');for(const id of ['panel-0','panel-1'])assert.ok(bench.picture.indexOf('data-asm-picture="'+id+'"')>panel);
  assert.match(bench.picture,/<g pointer-events="none" class="asm-full-cable-path"/);bench.click('asmToggle','power');bench.click('asmToggle','ac');for(const id of ['panel-0','panel-1'])bench.click('asmPicture',id);bench.click('asmTool','move');bench.click('asmPicture','panel');bench.click('asmContextAction','asm-remove-panel');
  assert.match(bench.picture,/<g class="asm-interior-wires" pointer-events="none">/);assert.match(bench.picture,/data-asm-picture="lead-cpu-fan"/);assert.match(bench.picture,/CPU_FAN/);bench.click('asmPicture','lead-cpu-fan');assert.equal(bench.state.assembly.cpuFanConnected,false);bench.click('asmPicture','lead-cpu-fan');assert.equal(bench.state.assembly.cpuFanConnected,true);bench.controller.dispose();
});

test('visual cable context retains keyboard focus on enabled next actions and switches back to selected part actions',()=>{
  const bench=fixture({caseId:'INC-101',stateOverride:state=>({...state,pcOn:false,acConnected:false,assembly:{...state.assembly,panelInstalled:false,panelScrews:[false,false]}})});bench.click('asmComplete','toggle');bench.click('asmTool','cables');bench.click('asmPicture','cable-hdmi-pc');
  bench.click('asmContextCable','hdmi-gpu');assert.equal(bench.state.videoPort,'gpu');assert.equal(bench.doc.activeElement.dataset.asmContextCable,'cable-rest');assert.equal(bench.doc.activeElement.disabled,false);
  bench.click('asmContextCable','cable-rest');assert.equal(bench.state.pcVideoConnected,false);assert.equal(bench.doc.activeElement.dataset.asmContextCable,'hdmi-gpu');assert.equal(bench.doc.activeElement.disabled,false);
  bench.click('asmPicture','cooler');assert.match(bench.picture,/<h4>Cooler &amp; fan<\/h4>/);assert.match(bench.picture,/data-asm-context-action="asm-disconnect-cpu-fan"/);assert.equal(bench.fields.get('[data-asm-component-drawer]').open,false);bench.controller.dispose();
});

test('new visual lead, clip and context controls retain power and covered-case safety',()=>{
  const covered=fixture({caseId:'INC-101'});covered.click('asmComplete','toggle');covered.click('asmTool','cables');
  for(const cable of ASSEMBLY_CABLES.filter(item=>item.internal))assert.ok(!covered.picture.includes('data-asm-picture="lead-'+cable.id+'"')&&!covered.picture.includes('data-asm-picture="cable-'+cable.id+'"'));
  covered.controller.dispose();
  const bench=fixture({caseId:'INC-101',stateOverride:state=>({...state,booted:false,assembly:{...state.assembly,panelInstalled:false,panelScrews:[false,false]}})});bench.click('asmComplete','toggle');const before=structuredClone(bench.state);
  bench.click('asmPicture','lead-cpu-fan');assert.deepEqual(bench.state,before);assert.match(bench.fields.get('[data-asm-feedback]').textContent,/power off.*disconnect/i);
  bench.click('asmTool','move');bench.click('asmPicture','ram-clips');assert.deepEqual(bench.state,before);
  bench.click('asmPicture','cooler');bench.click('asmContextAction','asm-remove-cooler');assert.deepEqual(bench.state,before);bench.controller.dispose();
});
