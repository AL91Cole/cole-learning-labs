import test from 'node:test';
import assert from 'node:assert/strict';
import {NETWORK_SCENARIOS,NETWORK_CONFIG} from '../src/network-labs.js';
import {getNetworkBenchSpec} from '../src/network-bench.js';
import {getNetworkDiagram} from '../src/network-diagrams.js';
import {mountNetworkVisual,renderNetworkVisual} from '../src/network-visuals.js';
import {initialWorkspaceState,applyWorkspaceAction} from '../src/workspaces.js';

class Surface{
 constructor(dataset={}){
  this.dataset=dataset;this.listeners=new Map();this.style={};this.attributes={};this.children=[];this.captures=new Set();this.tokens=new Set();this.textContent='';
  this.classList={add:(...names)=>names.forEach(name=>this.tokens.add(name)),remove:(...names)=>names.forEach(name=>this.tokens.delete(name)),toggle:(name,on)=>on?this.tokens.add(name):this.tokens.delete(name),contains:name=>this.tokens.has(name)};
 }
 addEventListener(type,listener){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(listener);}
 removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);if(!this.listeners.get(type)?.size)this.listeners.delete(type);}
 fire(type,properties={}){const event={type,target:this,button:0,isPrimary:true,pointerId:7,clientX:100,clientY:100,prevented:false,preventDefault(){this.prevented=true;},...properties};for(const listener of [...this.listeners.get(type)??[]])listener(event);return event;}
 setAttribute(name,value){this.attributes[name]=value;}getAttribute(name){return this.attributes[name]??null;}
 set className(value){this.tokens=new Set(value.split(/\s+/u));}get className(){return [...this.tokens].join(' ');}
 setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
 focus(){if(this.document)this.document.activeElement=this;}
 getBoundingClientRect(){return this.rect??{left:0,top:0,width:760,height:480};}
 closest(selector){if(selector==='[data-net-port]'&&this.dataset.netPort)return this;if(selector==='[data-net-node]'&&this.dataset.netNode)return this;if(selector==='[data-net-device]')return this.wrapper??null;return null;}
 querySelector(selector){return selector==='span'||selector==='.sr-only'?this.label??null:null;}
 append(child){child.parent=this;this.children.push(child);}remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 set innerHTML(value){this.markup=value;for(const child of this.children)child.removed=true;this.children=[];}get innerHTML(){return this.markup??'';}
}

function fixture(id='NET-208'){
 const spec=getNetworkBenchSpec(id),first=spec.cables[0];
 let state=applyWorkspaceAction(id,initialWorkspaceState(id),'bench-disconnect',{cableId:first.id}).state;
 const before=structuredClone(state),actions=[],doc=new Surface(),view=new Surface(),timers=new Map();let nextTimer=0,hit=null;
 view.setTimeout=callback=>{timers.set(++nextTimer,callback);return nextTimer;};view.clearTimeout=key=>timers.delete(key);
 doc.defaultView=view;doc.hidden=false;doc.activeElement=null;doc.elementFromPoint=()=>hit;doc.createElementNS=()=>new Surface();
 const diagram=getNetworkDiagram(id,state),panel=new Surface(),canvas=new Surface(),wires=new Surface(),feedback=new Surface(),visual=new Surface(),root=new Surface();
 panel.querySelector=()=>null;panel.contains=()=>false;visual.ownerDocument=doc;
 const nodes=diagram.nodes.map(node=>{const button=new Surface({netNode:node.id});button.wrapper=new Surface({netDevice:node.id});button.label=new Surface();return button;});
 const ports=spec.cables.flatMap(cable=>[cable.fromPort,cable.toPort]).map((port,index)=>{const button=new Surface({netPort:port});button.document=doc;button.label=new Surface();button.rect={left:40+index*45,top:100,width:44,height:44};return button;});
 const owned=new Set([...nodes,...ports,panel,canvas,wires,feedback,visual]);visual.contains=element=>owned.has(element);
 visual.querySelectorAll=selector=>selector==='[data-net-node]'?nodes:selector==='[data-net-port]'?ports:[];
 visual.querySelector=selector=>({'[data-network-inspector]':panel,'.net-canvas':canvas,'.net-connections':wires,'[data-net-feedback]':feedback}[selector]??null);
 root.querySelector=selector=>selector==='[data-network-visual]'?visual:ports.find(port=>selector===`[data-net-port="${port.dataset.netPort}"]`)??null;
 const cleanup=mountNetworkVisual(root,id,state,{onBenchAction(action,value){actions.push({action,value:structuredClone(value)});const result=applyWorkspaceAction(id,state,'bench-'+action,value);state=result.state;return result;}});
 const start=(port=ports[0],properties={})=>visual.fire('pointerdown',{target:port,...properties});
 const move=(target=ports[1],properties={})=>{hit=target;return doc.fire('pointermove',{target:ports[0],clientX:300,clientY:200,...properties});};
 const end=(target=ports[1],properties={})=>{hit=target;return doc.fire('pointerup',{target:ports[0],clientX:300,clientY:200,...properties});};
 return {id,spec,first,before,actions,doc,view,visual,root,nodes,ports,wires,feedback,timers,cleanup,start,move,end,get state(){return state;}};
}

for(const {id}of NETWORK_SCENARIOS)test(id+': dragging reviewed cable ends commits only the existing physical bench action',()=>{
 const f=fixture(id),from=f.ports[0],to=f.ports[1];f.start();f.move();
 assert.equal(f.actions.length,0,'Preview cannot change the model or award a test.');assert.ok(f.wires.children.some(node=>node.attributes.class==='net-cable-preview'));
 assert.equal(to.classList.contains('net-port-drop-ready'),true);assert.equal(from.hasPointerCapture(7),true);
 f.end();assert.deepEqual(f.actions,[{action:'connect',value:{fromPort:from.dataset.netPort,toPort:to.dataset.netPort}}]);
 const expected=applyWorkspaceAction(id,f.before,'bench-connect',f.actions[0].value).state;
 assert.deepEqual(f.state,expected);assert.equal(f.state.tested,false);assert.equal(f.state.networkBench.disconnected.includes(f.first.id),false);
 for(const field of NETWORK_CONFIG[id.replace('-','')].fields)assert.equal(f.state[field.name],expected[field.name],'Drag cannot silently choose policy/settings.');
 assert.equal(from.hasPointerCapture(7),false);assert.equal(f.wires.children.length,0);assert.equal(f.doc.activeElement,to);
 f.visual.fire('click',{target:to,detail:1});assert.equal(f.actions.length,1,'The synthetic pointer click cannot connect twice.');
 f.cleanup();assert.equal(f.timers.size,0);
});

test('matching ports remain native selectable controls and keyboard-style clicks use the same action',()=>{
 const f=fixture();f.visual.fire('click',{target:f.ports[0],detail:0});assert.equal(f.actions.length,0);
 f.visual.fire('click',{target:f.ports[1],detail:0});assert.equal(f.actions.length,1);assert.equal(f.state.networkBench.disconnected.includes(f.first.id),false);
 const html=renderNetworkVisual(f.id,f.before);assert.match(html,/<button type="button"[^>]*data-net-port=/u);assert.match(html,/data-net-cable-action="connect"/u);assert.match(html,/You can also select both ports/u);f.cleanup();
});

test('a simple port tap remains selectable, and dragging an already connected cable cannot reapply the plan',()=>{
 const f=fixture();f.start();f.end();f.visual.fire('click',{target:f.ports[0],detail:1});assert.equal(f.actions.length,0);
 f.visual.fire('click',{target:f.ports[1],detail:0});assert.equal(f.actions.length,1);const before=structuredClone(f.state);
 f.start();f.move();f.end();assert.equal(f.actions.length,1);assert.deepEqual(f.state,before);assert.match(f.feedback.textContent,/already connected/u);f.cleanup();
});

test('wrong cable endpoints and releases outside the local map never change the plan',()=>{
 for(const target of ['other-port','outside','self']){
  const f=fixture();const destination=target==='other-port'?f.ports[3]:target==='self'?f.ports[0]:new Surface({netPort:f.ports[1].dataset.netPort});
  f.start();f.move(destination);f.end(destination);assert.deepEqual(f.state,f.before);assert.equal(f.actions.length,0);assert.equal(f.wires.children.length,0);assert.equal(f.ports[0].captures.size,0);f.cleanup();
 }
});

test('document Escape, section/report changes, scroll, blur and pointer cancellation clear previews without committing',()=>{
 for(const cancel of ['escape','section','report','scroll','blur','resize','hidden','pointercancel','lostpointercapture']){
  const f=fixture();f.start();f.move();
  if(cancel==='escape')f.doc.fire('keydown',{key:'Escape',target:new Surface()});
  else if(cancel==='section'||cancel==='report')f.doc.fire(cancel==='section'?'cole:lab-section-change':'cole:lab-report-open');
  else if(cancel==='scroll')f.doc.fire('scroll');
  else if(cancel==='blur'||cancel==='resize')f.view.fire(cancel);
  else if(cancel==='hidden'){f.doc.hidden=true;f.doc.fire('visibilitychange');}
  else (cancel==='pointercancel'?f.doc:f.visual).fire(cancel);
  f.end();assert.deepEqual(f.state,f.before,cancel);assert.equal(f.actions.length,0,cancel);assert.equal(f.wires.children.length,0,cancel);assert.equal(f.ports[0].captures.size,0,cancel);f.cleanup();
 }
});

test('unrelated pointers, secondary input and nonfinite coordinates cannot complete a cable gesture',()=>{
 const f=fixture();f.start();f.move(f.ports[1],{pointerId:9});f.end(f.ports[1],{pointerId:9});assert.equal(f.actions.length,0);
 f.doc.fire('pointercancel',{pointerId:9});assert.equal(f.ports[0].captures.size,1,'Unrelated cancellation must not abandon the captured pointer.');
 f.move();f.end();assert.equal(f.actions.length,1);f.cleanup();
 for(const properties of [{button:2},{isPrimary:false},{pointerId:NaN},{clientX:Infinity},{clientY:NaN}]){
  const view=fixture();view.start(view.ports[0],properties);view.move();view.end();assert.equal(view.actions.length,0);assert.deepEqual(view.state,view.before);view.cleanup();
 }
});

test('external drag payloads are never read, and disposal releases every preview listener and pointer',()=>{
 const f=fixture();f.start();f.move();const stale=[...f.doc.listeners.get('pointerup')];
 const transfer={get dataTransfer(){assert.fail('External drag data must not be read.');}};
 for(const type of ['dragstart','dragover','drop']){
  const event={type,target:f.visual,preventDefault(){this.prevented=true;}};Object.defineProperty(event,'dataTransfer',Object.getOwnPropertyDescriptor(transfer,'dataTransfer'));
  for(const handler of f.visual.listeners.get(type))handler(event);assert.equal(event.prevented,true);
 }
 assert.equal(f.actions.length,0);f.start();f.move();f.cleanup();f.cleanup();
 assert.equal(f.ports[0].captures.size,0);assert.equal(f.wires.children.length,0);assert.equal(f.visual.listeners.size,0);assert.equal(f.doc.listeners.size,0);assert.equal(f.view.listeners.size,0);
 for(const handler of stale)handler({pointerId:7,clientX:300,clientY:200});assert.equal(f.actions.length,0);
});

test('device previews also roll back and release capture when interrupted or disposed',()=>{
 for(const mode of ['lostpointercapture','scroll','blur','escape','section','report','dispose']){
  const f=fixture(),node=f.nodes[0],before={...node.wrapper.style};node.fire('pointerdown');node.fire('pointermove',{clientX:100,clientY:30});
  assert.equal(f.actions.length,0);assert.notDeepEqual(node.wrapper.style,before);
  if(mode==='lostpointercapture')node.fire(mode);else if(mode==='scroll')f.doc.fire(mode);else if(mode==='blur')f.view.fire(mode);else if(mode==='escape')f.doc.fire('keydown',{key:'Escape',target:new Surface()});else if(mode==='section'||mode==='report')f.doc.fire(mode==='section'?'cole:lab-section-change':'cole:lab-report-open');else f.cleanup();
  assert.deepEqual(f.state,f.before);assert.equal(node.captures.size,0);f.cleanup();
 }
});

test('local cable placement does not consult network, identity, browser storage or external drag data',()=>{
 const descriptors=new Map();for(const name of ['fetch','XMLHttpRequest','WebSocket','EventSource','localStorage','sessionStorage','indexedDB','navigator']){
  descriptors.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,get(){assert.fail('Network placement consulted '+name);}});
 }
 try{const f=fixture('NET-214');f.start();f.move();f.end();assert.equal(f.actions.length,1);f.cleanup();}
 finally{for(const [name,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
});
