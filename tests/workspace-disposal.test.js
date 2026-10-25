import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {renderWorkspace,initialWorkspaceState,disposeWorkspace} from '../src/workspaces.js';
import {mountPracticeWorkbench} from '../src/practice-workbench.js';

class Element {
  constructor(){this.listeners=new Map();this.style={};this.dataset={};this.children=[];this.textContent='';this.classList={add(){},remove(){},toggle(){}};}
  addEventListener(name,fn){this.listeners.set(name,fn);}removeEventListener(name,fn){if(this.listeners.get(name)===fn)this.listeners.delete(name);}
  setAttribute(){}append(node){this.children.push(node);}replaceChildren(...nodes){this.children=nodes;}remove(){this.removed=true;}
  querySelector(){return null;}querySelectorAll(){return [];}closest(){return null;}
  click(){this.listeners.get('click')?.({target:this});}
}
function workspace(){
  const nodes=new Map(),get=key=>{if(!nodes.has(key))nodes.set(key,new Element());return nodes.get(key);};
  const root=new Element(),visual=new Element(),canvas=get('.net-canvas');canvas.getBoundingClientRect=()=>({width:760,height:480});
  const panel=get('[data-network-inspector]');visual.ownerDocument={createElement:()=>new Element()};visual.isConnected=true;
  visual.querySelector=selector=>get(selector);visual.querySelectorAll=()=>[];
  root.querySelector=selector=>selector==='[data-network-visual]'?visual:get(selector);
  get('[data-net-packet-steps]').closest=()=>({open:false});
  return {root,canvas,visual,nodes,get};
}
function nativeControllers(work){
  const saved={ResizeObserver:globalThis.ResizeObserver,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
  const observers=[],frames=new Map();let next=0;
  globalThis.ResizeObserver=class{constructor(){this.disconnections=0;observers.push(this);}observe(node){this.target=node;}disconnect(){this.disconnections++;}};
  globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
  try{work({observers,frames});}finally{Object.assign(globalThis,saved);}
}
const scenario=SCENARIOS.find(item=>item.id==='NET-214');
test('workspace disposal disconnects real diagram observers and cancels packet frames once',()=>nativeControllers(({observers,frames})=>{
  const ui=workspace(),state=initialWorkspaceState(scenario.id),before=structuredClone(state);
  renderWorkspace(ui.root,scenario,state,()=>{});
  assert.equal(observers.length,1);assert.equal(observers[0].target,ui.canvas);
  ui.get('[data-net-send-packet]').click();assert.equal(frames.size,1);
  disposeWorkspace(ui.root);
  assert.equal(observers[0].disconnections,1);assert.equal(frames.size,0);
  assert.equal(ui.get('[data-net-send-packet]').listeners.size,0);assert.equal(ui.visual.listeners.size,0);
  disposeWorkspace(ui.root);assert.equal(observers[0].disconnections,1,'Repeated route cleanup is harmless.');
  assert.deepEqual(state,before,'Disposal does not change saved learning work.');
}));
test('leaving a direct practice workbench releases its network observer and running signal',()=>nativeControllers(({observers,frames})=>{
  const ui=workspace(),host=new Element(),picker=new Element(),status=new Element();
  host.querySelector=selector=>({'[data-practice-workspace]':ui.root,'[data-practice-status]':status,'[data-practice-case]':picker}[selector]);
  const cleanup=mountPracticeWorkbench(host,{scenario,getState:()=>initialWorkspaceState(scenario.id)});
  ui.get('[data-net-send-packet]').click();assert.equal(frames.size,1);assert.equal(observers.length,1);
  cleanup();assert.equal(observers[0].disconnections,1);assert.equal(frames.size,0);assert.equal(picker.listeners.size,0);assert.deepEqual(ui.root.children,[]);
}));
