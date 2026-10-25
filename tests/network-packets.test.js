import test from 'node:test';
import assert from 'node:assert/strict';
import {NETWORK_CONFIG,NETWORK_SCENARIOS} from '../src/network-labs.js';
import {getNetworkBenchSpec,normalizeNetworkBench} from '../src/network-bench.js';
import {getNetworkDiagram} from '../src/network-diagrams.js';
import {getPacketTrace,packetTraceSignature} from '../src/network-packets.js';
import {mountPacketVisual,renderNetworkVisual} from '../src/network-visuals.js';

const solved={
 'NET-207':{layerMap:'matched',fileTransport:'tcp',callTransport:'udp',addressPair:'matched'},
 'NET-208':{topology:'star',localDevice:'switch',boundary:'router',media:'matched'},
 'NET-209':{subnet:'/26',host:'10.40.8.70',gateway:'10.40.8.65',edge:'school-edge'},
 'NET-210':{access:'30',trunk:'10,30',guestPolicy:'approved',redundancy:'spanning-tree'},
 'NET-211':{authentication:'individual',firewall:'https-classroom',detection:'separate',evidence:'full'},
 'NET-212':{link:'up',gateway:'10.50.0.1',route:'approved',diagnostic:'all'},
 'NET-213':{media:'matched',voiceQueue:'rtp-priority',congestion:'reschedule',record:'fcaps'},
 'NET-214':{capacity:'48-gigabit',wireless:'managed',segments:'approved',changePlan:'reviewable'},
 'NET-215':{interface:'ethernet',nextHop:'gateway',headers:'routed',interpretation:'link-path'},
 'NET-216':{target:'uplink',protection:'authpriv',threshold:'rate',receiver:'approved'}
};
for(const {id} of NETWORK_SCENARIOS){
 test(`${id}: trace follows connected physical cables, never logical evidence links`,()=>{
  const before=structuredClone(solved[id]),trace=getPacketTrace(id,solved[id]),spec=getNetworkBenchSpec(id);
  assert.equal(trace.ok,true);assert.equal(trace.pathConnected,true);assert.ok(trace.steps.length>0);
  assert.equal(trace.steps[0].from,trace.source);assert.equal(trace.steps.at(-1).to,trace.target);
  for(const step of trace.steps)assert.ok(spec.cables.some(cable=>cable.id===step.cableId&&[cable.from,cable.to].includes(step.from)&&[cable.from,cable.to].includes(step.to)));
  assert.deepEqual(solved[id],before);assert.match(trace.note,/Local/);
  assert.match(renderNetworkVisual(id,solved[id]),/data-net-send-packet>Send test packet/);
 });
 test(`${id}: disconnected signal stops before crossing the missing link; reconnect re-evaluates`,()=>{
  const ready=getPacketTrace(id,solved[id]),missing=ready.steps[0].cableId;
  const state={...solved[id],networkBench:{disconnected:[missing]}},before=structuredClone(state),trace=getPacketTrace(id,state);
  assert.equal(trace.ok,false);assert.equal(trace.pathConnected,false);assert.equal(trace.steps.at(-1).blocked,true);assert.match(trace.message,/unplugged/);
  assert.deepEqual(state,before);assert.equal(getPacketTrace(id,{...state,networkBench:{disconnected:[]}}).ok,true);
 });
 test(`${id}: saved-plan mismatch cannot display a green success or alter test credit`,()=>{
  const field=NETWORK_CONFIG[id.replace('-','')].fields[0],wrong=field.options.find(([value])=>value!==solved[id][field.name])[0];
  const state={...solved[id],[field.name]:wrong,tested:true,testSignature:'old',results:[{ok:true,label:'old'}]},before=structuredClone(state),trace=getPacketTrace(id,state);
  assert.equal(trace.ok,false);assert.ok(trace.failedChecks.length);assert.match(trace.message,/Saved-plan check failed/);assert.deepEqual(state,before);
 });
}

test('signals preserve independent branches and distinguish path reachability from full required cabling',()=>{
 const id='NET-208',trace=getPacketTrace(id,{...solved[id],networkBench:{disconnected:['pc05-cabinet']}});
 assert.equal(trace.pathConnected,true);assert.equal(trace.ok,false);assert.match(trace.message,/another required cable/);
 assert.equal(trace.steps.some(step=>step.to==='pc05'),false);
});

test('packet signature tracks saved configuration and cables; excludes device movement and cached results',()=>{
 const id='NET-214',state={...solved[id],networkBench:normalizeNetworkBench(id,{})},signature=packetTraceSignature(id,state);
 state.networkBench.positions.students={x:25,y:18};state.tested=true;state.results=[{label:'cached',ok:true}];
 assert.equal(packetTraceSignature(id,state),signature);
 state.capacity='16-fast';assert.notEqual(packetTraceSignature(id,state),signature);
 state.capacity=solved[id].capacity;state.networkBench.disconnected=['students-switch'];assert.notEqual(packetTraceSignature(id,state),signature);
});

test('evidence cases animate their reviewed handoff only and never invent application or receiver delivery',()=>{
 for(const id of ['NET-207','NET-215','NET-216']){const trace=getPacketTrace(id,solved[id]);assert.equal(trace.reply,false);assert.match(trace.message,/illustration completed/);assert.match(trace.note,/records stay fixed/);}
 assert.equal(getPacketTrace('NET-999',{}),null);assert.equal(packetTraceSignature('AI-305',{}),'');
 const trace=getPacketTrace('NET-214',{capacity:'<script>bad()</script>',networkBench:{disconnected:['unknown']}});
 assert.doesNotMatch(JSON.stringify(trace),/script|unknown/);
});
class FakeElement {
 constructor(){this.listeners=new Map();this.children=[];this.dataset={};this.style={};this.hidden=false;this.textContent='';this.tokens=new Set();this.classList={add:(...items)=>items.forEach(item=>this.tokens.add(item)),remove:(...items)=>items.forEach(item=>this.tokens.delete(item)),toggle:(item,yes)=>yes?this.tokens.add(item):this.tokens.delete(item)};}
 addEventListener(name,fn){this.listeners.set(name,fn);}removeEventListener(name,fn){if(this.listeners.get(name)===fn)this.listeners.delete(name);}
 click(){this.listeners.get('click')?.();}setAttribute(){}append(node){this.children.push(node);}replaceChildren(...nodes){this.children=nodes;}remove(){this.removed=true;}closest(){return this.details;}
}
function signalUI(id,saved){
 const send=new FakeElement(),stop=new FakeElement(),status=new FakeElement(),list=new FakeElement(),canvas=new FakeElement();list.details={open:false};
 const wires=Object.fromEntries(getNetworkBenchSpec(id).cables.map(cable=>[cable.id,new FakeElement()]));
 const fields={'[data-net-send-packet]':send,'[data-net-stop-packet]':stop,'[data-net-packet-status]':status,'[data-net-packet-steps]':list,'.net-canvas':canvas};
 const visual={ownerDocument:{createElement:()=>new FakeElement()},isConnected:true,querySelector:selector=>fields[selector]??wires[selector.match(/data-net-wire="([^"]+)"/)?.[1]],querySelectorAll:()=>Object.values(wires)};
 const graph=getNetworkDiagram(id,saved);graph.spec=getNetworkBenchSpec(id);graph.bench=normalizeNetworkBench(id,saved?.networkBench);
 return {send,stop,status,list,canvas,visual,getDiagram:()=>graph};
}
function frameClock(reduced,work){
 const previous={requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,matchMedia:globalThis.matchMedia};
 const queue=new Map();let next=0,time=0;
 globalThis.requestAnimationFrame=fn=>{queue.set(++next,fn);return next;};globalThis.cancelAnimationFrame=id=>queue.delete(id);globalThis.matchMedia=()=>({matches:reduced});
 const advance=()=>{const [key,fn]=queue.entries().next().value??[];if(fn){queue.delete(key);time+=500;fn(time);}};
 try{work({queue,advance,complete:()=>{for(let i=0;i<40&&queue.size;i++)advance();}});}finally{Object.assign(globalThis,previous);}
}

test('manual packet playback animates outbound and reply, can stop, and cleanup cancels pending motion',()=>frameClock(false,({queue,advance,complete})=>{
 const id='NET-214',ui=signalUI(id,solved[id]),cleanup=mountPacketVisual({},ui.visual,id,solved[id],ui.getDiagram);
 assert.equal(queue.size,0,'first visit waits for the student');ui.send.click();assert.equal(queue.size,1);assert.equal(ui.stop.hidden,false);
 advance();assert.match(ui.status.textContent,/Sending local signal/);assert.ok(ui.canvas.children.at(-1).style.left);
 complete();assert.equal(ui.status.dataset.result,'success');assert.match(ui.status.textContent,/modeled reply completed/);assert.equal(ui.stop.hidden,true);
 ui.send.click();assert.equal(queue.size,1);ui.stop.click();assert.equal(queue.size,0);assert.equal(ui.status.dataset.result,'stopped');assert.equal(ui.canvas.children.at(-1).removed,true);
 ui.send.click();cleanup();assert.equal(queue.size,0);assert.equal(ui.send.listeners.size,0);assert.equal(ui.stop.listeners.size,0);
}));

test('reduced motion provides immediate static path, error status, and readable step list without frames',()=>frameClock(true,({queue})=>{
 const id='NET-214',saved={...solved[id],networkBench:{disconnected:['students-switch']}},ui=signalUI(id,saved),cleanup=mountPacketVisual({},ui.visual,id,saved,ui.getDiagram);
 ui.send.click();assert.equal(queue.size,0);assert.equal(ui.status.dataset.result,'error');assert.match(ui.status.textContent,/Signal stopped.*unplugged/);assert.match(ui.status.textContent,/Reduced motion/);assert.equal(ui.list.details.open,true);assert.ok(ui.list.children.length>1);assert.ok(ui.canvas.children.at(-1).tokens.has('net-packet-failed'));cleanup();
}));

test('saved cable/config changes replay once; position and cached-test changes do not',()=>frameClock(false,({queue})=>{
 const root={},id='NET-214';
 const mount=saved=>{const ui=signalUI(id,saved);return mountPacketVisual(root,ui.visual,id,saved,ui.getDiagram);};
 let cleanup=mount(solved[id]);assert.equal(queue.size,0);cleanup();
 cleanup=mount({...solved[id],networkBench:{positions:{students:{x:25,y:18}}},tested:true});assert.equal(queue.size,0);cleanup();
 cleanup=mount({...solved[id],networkBench:{disconnected:['students-switch']}});assert.equal(queue.size,1);cleanup();
 cleanup=mount({...solved[id],networkBench:{disconnected:['students-switch']},capacity:'16-fast'});assert.equal(queue.size,1);cleanup();
}));

test('detached diagrams cancel signal playback on the next frame',()=>frameClock(false,({queue,advance})=>{
 const id='NET-208',ui=signalUI(id,solved[id]),cleanup=mountPacketVisual({},ui.visual,id,solved[id],ui.getDiagram);ui.send.click();ui.visual.isConnected=false;advance();assert.equal(queue.size,0);assert.equal(ui.canvas.children.at(-1).removed,true);cleanup();
}));
