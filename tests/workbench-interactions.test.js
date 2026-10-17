import test from 'node:test';
import assert from 'node:assert/strict';
import { mountWorkbenchInteractions, workbenchDrop, DRAG_THRESHOLD } from '../src/workbench-interactions.js';
import { initialHardwareState, applyHardwareAction, verifyHardware, renderHardware } from '../src/hardware.js';

class Surface {
  constructor(dataset = {}) { this.dataset=dataset;this.attrs=new Map();this.listeners=new Map();this.tokens=new Set();this.style={};this.hidden=false;this.disabled=false;this.captured=null;this.classList={add:x=>this.tokens.add(x),remove:x=>this.tokens.delete(x),toggle:(x,on)=>on?this.tokens.add(x):this.tokens.delete(x)}; }
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==fn));}
  emit(type,props={}){const event={type,target:this,button:0,pointerId:7,isPrimary:true,clientX:0,clientY:0,detail:1,cancelable:true,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...props};for(const listener of [...(this.listeners.get(type)||[])]){listener(event);if(event.stopped)break;}return event;}
  setAttribute(key,value){this.attrs.set(key,value);}
  getAttribute(key){return this.attrs.get(key)??null;}
  matches(selector){return !!({ '[data-hw-pick]':this.dataset.hwPick,'[data-hw-socket]':this.dataset.hwSocket,'[data-hw-cancel-pick]':this.cancel })[selector];}
  closest(selector){return this.matches(selector)?this:null;}
  setPointerCapture(id){this.captured=id;}
  hasPointerCapture(id){return this.captured===id;}
  releasePointerCapture(){this.captured=null;}
  remove(){this.removed=true;}
}

function bench(onAction) {
  const root=new Surface(),doc=new Surface();doc.defaultView=new Surface();root.ownerDocument=doc;
  const source=id=>{const node=new Surface({hwPick:id,hwPickLabel:id});node.parent=root;node.handle=new Surface({hwDragHandle:'true'});node.handle.closest=selector=>selector==='[data-hw-drag-handle]'?node.handle:selector==='[data-hw-pick]'?node:null;return node;};
  const socket=id=>{const node=new Surface({hwSocket:id});node.parent=root;return node;};
  const sources=['board','cpu','cooler','ram','gpu','storage','atx','eps','gpu-power','sata','sata-power','front','hdmi-pc','hdmi-monitor','nvme'].map(source);
  const sockets=['board-mount','cpu-socket','cooler-mount','dimm-a2','pcie-x16','sata-bay','atx-24','eps-8','gpu-6','sata-data','sata-power','front-panel','video-board','video-gpu','monitor-hdmi'].map(socket);
  const status=new Surface(),cancel=new Surface(),alternatives={open:false};cancel.cancel=true;cancel.parent=root;
  root.contains=node=>node?.parent===root;
  root.querySelectorAll=selector=>selector==='[data-hw-pick]'?sources:selector==='[data-hw-socket]'?sockets:[];
  root.querySelector=selector=>({'[data-hw-manipulation-status]':status,'[data-hw-cancel-pick]':cancel,'[data-hw-target-list]':alternatives})[selector]||null;
  root.appendChild=node=>{node.parent=root;root.ghost=node;};doc.createElement=()=>new Surface();doc.hit=null;doc.elementsFromPoint=()=>doc.hit?[doc.hit]:[];
  const actions=[];const dispose=mountWorkbenchInteractions(root,{onAction:action=>{actions.push(action);return onAction?.(action);}});
  return {root,doc,sources,sockets,status,cancel,alternatives,actions,dispose,source:id=>sources.find(n=>n.dataset.hwPick===id),socket:id=>sockets.find(n=>n.dataset.hwSocket===id)};
}
const click=(b,target)=>b.root.emit('click',{target});
function drag(b,part,target,{distance=50,pointerType='mouse'}={}){
  const source=b.source(part),start=pointerType==='mouse'?source:source.handle;b.root.emit('pointerdown',{target:start,clientX:10,clientY:10,pointerType});
  b.doc.emit('pointermove',{target:start,clientX:10+distance,clientY:10+distance,pointerType});
  b.doc.hit=target;b.doc.emit('pointerup',{target:source,clientX:10+distance,clientY:10+distance,pointerType});
}

test('small pointer movement is a tap, not a premature install or cancelled scroll',()=>{
  const b=bench();const source=b.source('ram');
  b.root.emit('pointerdown',{target:source});
  const move=b.doc.emit('pointermove',{target:source,clientX:DRAG_THRESHOLD-1,clientY:0});
  b.doc.emit('pointerup',{target:source});
  assert.equal(move.prevented,false);assert.deepEqual(b.actions,[]);assert.equal(b.root.ghost,undefined);
  click(b,source);assert.equal(source.getAttribute('aria-pressed'),'true');assert.equal(b.alternatives.open,true);
  click(b,b.socket('dimm-a2'));assert.deepEqual(b.actions,['install-ram']);b.dispose();
});

test('touch and pen can scroll the card surface; only the visible grip starts their drag',()=>{
  for (const pointerType of ['touch','pen']) {
    const b=bench(), source=b.source('ram');
    b.root.emit('pointerdown',{target:source,pointerType});
    const move=b.doc.emit('pointermove',{target:source,pointerType,clientX:0,clientY:100});
    b.doc.hit=b.socket('dimm-a2');b.doc.emit('pointerup',{target:source,pointerType,clientX:0,clientY:100});
    assert.equal(move.prevented,false,'A pan outside the grip must remain browser scrolling.');assert.deepEqual(b.actions,[]);assert.equal(b.root.ghost,undefined);
    click(b,source);click(b,b.socket('dimm-a2'));assert.deepEqual(b.actions,['install-ram'],'A regular tap still picks the whole card.');
    drag(b,'ram',b.socket('dimm-a2'),{pointerType});assert.deepEqual(b.actions,['install-ram','install-ram']);b.dispose();
  }
});

test('mouse, touch, and pen complete only the chosen compatible connector through the real model',()=>{
  for(const pointerType of ['mouse','touch','pen']) {
    let state=initialHardwareState('INC-103');
    const b=bench(action=>{const result=applyHardwareAction('INC-103',state,action);state=result.state;return result;});
    drag(b,'ram',b.socket('dimm-a2'),{pointerType});
    assert.equal(state.ramSeated,false,'The existing live-power lock must reject the gesture.');assert.equal(b.status.dataset.kind,'warning');
    state=applyHardwareAction('INC-103',state,'power-off').state;
    state=applyHardwareAction('INC-103',state,'unplug').state;
    drag(b,'ram',b.socket('dimm-a2'),{pointerType});
    assert.equal(state.ramSeated,true);assert.equal(b.status.dataset.kind,'success');assert.equal(state.booted,false);assert.equal(state.documentOpened,false);b.dispose();
  }
});

test('incompatible targets and spare NVMe never dispatch or mutate the equipment',()=>{
  let state=initialHardwareState('INC-105');const before=structuredClone(state);
  const b=bench(action=>{state=applyHardwareAction('INC-105',state,action).state;});
  drag(b,'ram',b.socket('sata-bay'));assert.deepEqual(b.actions,[]);assert.match(b.status.textContent,/does not match/);
  drag(b,'nvme',b.socket('sata-data'));assert.deepEqual(b.actions,[]);assert.match(b.status.textContent,/does not fit/);assert.deepEqual(state,before);b.dispose();
});

test('all twelve assembly placements preserve model fit order, then require power, display, and delivery tests',()=>{
  let state=initialHardwareState('INC-106');const b=bench(action=>{const result=applyHardwareAction('INC-106',state,action);state=result.state;return result;});
  click(b,b.source('cpu'));click(b,b.socket('cpu-socket'));assert.equal(state.cpuInstalled,false,'A matching socket cannot bypass board installation.');
  const placements=[['board','board-mount'],['cpu','cpu-socket'],['cooler','cooler-mount'],['ram','dimm-a2'],['gpu','pcie-x16'],['storage','sata-bay'],['atx','atx-24'],['eps','eps-8'],['gpu-power','gpu-6'],['sata','sata-data'],['sata-power','sata-power'],['front','front-panel']];
  for(const [source,socket] of placements){click(b,b.source(source));click(b,b.socket(socket));assert.equal(b.status.dataset.kind,'success',source);}
  assert.equal(verifyHardware('INC-106',state).ok,false);assert.equal(state.bootCount,0);
  click(b,b.source('hdmi-pc'));click(b,b.socket('video-gpu'));
  for(const action of ['plug-in','boot'])state=applyHardwareAction('INC-106',state,action).state;
  assert.equal(verifyHardware('INC-106',state).ok,false,'Assembling does not auto-deliver the customer task.');
  state=applyHardwareAction('INC-106',state,'open-document').state;assert.equal(verifyHardware('INC-106',state).ok,true);b.dispose();
});

test('the two HDMI ends keep output routing and monitor connection as separate actions',()=>{
  let state=initialHardwareState('INC-108');const b=bench(action=>{const result=applyHardwareAction('INC-108',state,action);state=result.state;return result;});
  drag(b,'hdmi-pc',b.socket('video-board'));assert.equal(state.videoPort,'board');assert.equal(state.signalConnected,false);
  drag(b,'hdmi-monitor',b.socket('monitor-hdmi'));assert.equal(state.signalConnected,true);assert.equal(state.videoPort,'board');assert.equal(state.bootCount,0);
  drag(b,'hdmi-pc',b.socket('video-gpu'));assert.equal(state.videoPort,'gpu');assert.equal(state.documentOpened,false);b.dispose();
});

test('Escape, pointer cancellation, lost capture, multitouch, and blur cannot complete a drag',()=>{
  for(const mode of ['escape','cancel','lost','multi','blur']) {
    const b=bench(),source=b.source('ram');b.root.emit('pointerdown',{target:source});b.doc.emit('pointermove',{target:source,clientX:50,clientY:40});
    assert.equal(source.captured,7);assert.ok(b.root.ghost);
    if(mode==='escape')b.root.emit('keydown',{target:source,key:'Escape'});
    if(mode==='cancel')b.doc.emit('pointercancel');
    if(mode==='lost')b.root.emit('lostpointercapture');
    if(mode==='multi')b.root.emit('pointerdown',{target:source,pointerId:8,isPrimary:false});
    if(mode==='blur')b.doc.defaultView.emit('blur');
    b.doc.hit=b.socket('dimm-a2');b.doc.emit('pointerup',{target:source,clientX:50,clientY:40});
    assert.deepEqual(b.actions,[],mode);assert.equal(source.captured,null,mode);assert.equal(b.root.ghost.removed,true,mode);assert.equal(source.getAttribute('aria-pressed'),'false',mode);b.dispose();
  }
});

test('keyboard-only selection, destination, and cancellation equal the tap path',()=>{
  const b=bench();
  const sourceKey=b.root.emit('keydown',{target:b.source('sata'),key:' '});assert.equal(sourceKey.prevented,true);
  assert.equal(b.socket('sata-data').tokens.has('hw-socket-compatible'),true);assert.equal(b.socket('sata-power').tokens.has('hw-socket-compatible'),false);
  b.root.emit('keydown',{target:b.socket('sata-data'),key:'Enter'});assert.deepEqual(b.actions,['connect-sata']);
  b.root.emit('keydown',{target:b.source('gpu'),key:'Enter'});b.root.emit('keydown',{target:b.source('gpu'),key:'Escape'});
  click(b,b.socket('pcie-x16'));assert.deepEqual(b.actions,['connect-sata']);b.dispose();
});

test('outside drops, disposed re-renders, and external payloads never install a part',()=>{
  const b=bench();drag(b,'gpu',null);assert.deepEqual(b.actions,[]);assert.match(b.status.textContent,/outside a socket/);
  const source=b.source('board');b.root.emit('pointerdown',{target:source});b.doc.emit('pointermove',{target:source,clientX:40,clientY:40});
  b.dispose();b.dispose();b.doc.hit=b.socket('board-mount');b.doc.emit('pointerup',{target:source,clientX:40,clientY:40});
  assert.deepEqual(b.actions,[]);assert.equal(source.captured,null);assert.equal(b.root.ghost.removed,true);
  assert.equal([...b.doc.listeners.values()].flat().length,0);assert.equal([...b.root.listeners.values()].flat().length,0);
  assert.equal(workbenchDrop('https://example.test/upload','board-mount').ok,false);
  const other=bench();assert.equal(other.root.emit('dragstart',{target:other.source('board'),dataTransfer:{getData(){throw new Error('External data must not be read.');}}}).prevented,true);other.dispose();
});

test('a post-drag pointer click cannot accidentally inspect or place the same part twice',()=>{
  const b=bench();drag(b,'board',b.socket('board-mount'));
  const clickEvent=click(b,b.source('board'));assert.equal(clickEvent.stopped,true);assert.deepEqual(b.actions,['install-board']);
  b.root.emit('keydown',{target:b.source('cpu'),key:'Enter'});b.root.emit('keydown',{target:b.socket('cpu-socket'),key:'Enter'});
  assert.deepEqual(b.actions,['install-board','install-cpu']);b.dispose();
});

test('a synchronous model re-render still suppresses the synthetic click following a drag',()=>{
  let replacement, b;
  b=bench(()=>{b.dispose();replacement=mountWorkbenchInteractions(b.root,{onAction:()=>assert.fail('A synthetic click must not apply a second action.')});});
  drag(b,'board',b.socket('board-mount'));
  const event=click(b,b.source('board'));assert.equal(event.stopped,true);assert.equal(b.source('board').getAttribute('aria-pressed'),'false');replacement();
});

test('re-render preserves a keyboard user’s large socket control and expanded socket list',()=>{
  const old = new Surface({hwSocket:'dimm-a2',hwAction:'inspect-ram'});
  old.matches=selector=>selector==='button';
  const fresh = new Surface({hwSocket:'dimm-a2',hwAction:'inspect-ram'});fresh.matches=selector=>selector==='button';
  let focused=false;fresh.focus=()=>{focused=true;};
  const details={open:true};
  const root={innerHTML:'',ownerDocument:{activeElement:old},contains:node=>node===old,
    querySelector:selector=>selector==='.hw-target-list'?details:null,
    querySelectorAll:selector=>selector==='[data-hw-socket]'?[fresh]:[]};
  renderHardware(root,'INC-103',initialHardwareState('INC-103'),()=>{});
  assert.equal(details.open,true);assert.equal(focused,true);
});

test('rendered hardware keeps every socket, model inventory, and non-drag alternative without native payload dropzones',()=>{
  for(const id of ['INC-101','INC-102','INC-103','INC-104','INC-105','INC-106','INC-107','INC-108']) {
    const root={innerHTML:'',contains:()=>false,ownerDocument:{activeElement:null},querySelector:()=>null,querySelectorAll:()=>[]};
    renderHardware(root,id,initialHardwareState(id),()=>{});
    assert.match(root.innerHTML,/data-hw-manipulation-status/);assert.match(root.innerHTML,/Large socket controls/);
    for(const part of ['board','cpu','cooler','ram','gpu','storage','atx','eps','gpu-power','sata','sata-power','front','hdmi-pc','hdmi-monitor','nvme'])assert.match(root.innerHTML,new RegExp(`data-hw-pick="${part}"`),`${id}: ${part}`);
    assert.doesNotMatch(root.innerHTML,/draggable="true"|data-hw-dropzone/);
    if(id==='INC-106')assert.match(root.innerHTML,/0 loose|12 loose/);
    else assert.match(root.innerHTML,/fitted items · view current inventory/);
  }
});
