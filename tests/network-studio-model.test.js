import test from 'node:test';
import assert from 'node:assert/strict';
import {NETWORK_DEVICE_TYPES,NETWORK_STUDIO_LIMITS,initialNetworkStudioState,normalizeNetworkStudioState,applyNetworkStudioAction,evaluateNetworkStudio,networkStudioHasWork} from '../src/network-studio-model.js';
const act=(state,action,value)=>applyNetworkStudioAction(state,action,value).state;
const connect=(state,from,fromPort,to,toPort)=>act(state,'connect',{from,fromPort,to,toPort});
function small(types){let state=initialNetworkStudioState('blank');for(const type of types)state=act(state,'add-device',{type});return state;}

test('classroom has a powered cabled path and its result contains each actual hop',()=>{
 const state=initialNetworkStudioState(),result=evaluateNetworkStudio(state);
 assert.equal(result.ok,true);assert.equal(result.success,true);assert.equal(result.status,'success');
 assert.deepEqual(result.path,['d1','d2','d3','d4']);assert.deepEqual(result.links,['l1','l2','l3']);
 assert.equal(result.steps.length,3);assert.ok(result.steps.every(step=>step.ok));assert.equal(result.failedAt,null);
 assert.ok(result.checks.every(check=>check.ok));assert.equal(networkStudioHasWork(state),false);
});

test('adding devices to a blank layout chooses distinct endpoints without inventing cables',()=>{
 let state=small(['pc','server']);assert.equal(state.source,'d1');assert.equal(state.target,'d2');assert.equal(state.links.length,0);
 assert.equal(evaluateNetworkStudio(state).ok,false);
 state=connect(state,'d1',0,'d2',0);assert.equal(evaluateNetworkStudio(state).ok,true);
 assert.equal(networkStudioHasWork(state),true);
});

test('disconnecting and reconnecting a real path updates success immediately and immutably',()=>{
 const original=initialNetworkStudioState(),before=JSON.stringify(original);
 const result=applyNetworkStudioAction(original,'disconnect',{id:'l3'});
 assert.equal(result.changed,true);assert.equal(result.topologyChanged,true);assert.equal(JSON.stringify(original),before);
 const failed=evaluateNetworkStudio(result.state);assert.equal(failed.ok,false);assert.equal(failed.failureKind,'cable');
 assert.deepEqual(failed.path,['d1','d2','d3']);assert.equal(failed.failedAt,'d3');
 assert.equal(evaluateNetworkStudio(connect(result.state,'d3',1,'d4',0)).ok,true);
});

test('a two-port PC does not act as a switch between other endpoints',()=>{
 let state=small(['server','pc','printer']);
 state=connect(state,'d1',0,'d2',0);state=connect(state,'d2',1,'d3',0);state=act(state,'select-target',{id:'d3'});
 const result=evaluateNetworkStudio(state);assert.equal(result.ok,false);assert.equal(result.checks[2].ok,true);
 assert.equal(result.failureKind,'forwarding');assert.equal(result.failedAt,'d2');assert.deepEqual(result.path,['d1','d2']);
 assert.equal(result.steps.at(-1).ok,false);assert.match(result.message,/end device/);
});

test('power loss stops the message at the failed hop and restoring power restores the path',()=>{
 const initial=initialNetworkStudioState(),state=act(initial,'power-device',{id:'d3',powered:false});
 const result=evaluateNetworkStudio(state);assert.equal(result.ok,false);assert.equal(result.failureKind,'power');
 assert.equal(result.failedAt,'d3');assert.deepEqual(result.path,['d1','d2']);assert.equal(result.steps.at(-1).linkId,'l2');
 assert.equal(result.steps.at(-1).ok,false);assert.equal(evaluateNetworkStudio(act(state,'power-device',{id:'d3',powered:true})).ok,true);
 const off=act(initial,'power-device',{id:'d1',powered:false});assert.deepEqual(evaluateNetworkStudio(off).path,['d1']);
});

test('removing a device prunes every attached cable and clears a removed endpoint',()=>{
 let state=act(initialNetworkStudioState(),'remove-device',{id:'d2'});
 assert.equal(state.links.length,1);assert.ok(state.links.every(link=>link.from!=='d2'&&link.to!=='d2'));
 assert.equal(evaluateNetworkStudio(state).ok,false);
 state=act(state,'remove-device',{id:'d4'});assert.equal(state.target,'');assert.equal(evaluateNetworkStudio(state).status,'incomplete');
});

test('endpoint selection requires distinct devices and cannot select an absent id',()=>{
 let state=initialNetworkStudioState();state=act(state,'select-target',{id:state.source});
 assert.equal(evaluateNetworkStudio(state).status,'incomplete');assert.equal(evaluateNetworkStudio(state).ok,false);
 assert.deepEqual(act(state,'select-source',{id:'https://evil.example'}),state);
});

test('ports reject unknown, fractional, occupied, self, and parallel connections',()=>{
 const state=initialNetworkStudioState();
 for(const value of [
  {from:'d1',fromPort:9,to:'d2',toPort:3},{from:'d1',fromPort:.5,to:'d2',toPort:3},
  {from:'d1',fromPort:1,to:'d2',toPort:0},{from:'d1',fromPort:1,to:'d1',toPort:0},
  {from:'d1',fromPort:1,to:'missing',toPort:0},{from:'d1',fromPort:1,to:'d2',toPort:3}
 ])assert.equal(applyNetworkStudioAction(state,'connect',value).changed,false);
 assert.equal(state.links.length,4);
});

test('device movement is bounded and does not change connectivity or occupy another device',()=>{
 const initial=initialNetworkStudioState(),moved=applyNetworkStudioAction(small(['pc']),'move-device',{id:'d1',x:1000,y:-30});
 const node=moved.state.devices.find(item=>item.id==='d1');assert.equal(node.x,88);assert.equal(node.y,18);
 assert.equal(moved.topologyChanged,false);assert.equal(moved.kind,'layout');assert.equal(moved.state.devices.length,1);
 const over=act(initial,'move-device',{id:'d1',x:37,y:50}),other=over.devices.find(item=>item.id==='d2'),point=over.devices[0];
 assert.ok(Math.abs(point.x-other.x)>=21||Math.abs(point.y-other.y)>=30);assert.equal(evaluateNetworkStudio(over).ok,true);
 assert.equal(applyNetworkStudioAction(initial,'move-device',{id:'d1',x:Infinity,y:20}).changed,false);
});

test('a loop is bounded and an alternate forwarding path works after a cable is removed',()=>{
 let state=small(['pc','switch','router','access-point','server']);
 state=connect(state,'d1',0,'d2',0);state=connect(state,'d2',1,'d3',0);
 state=connect(state,'d3',1,'d5',0);state=connect(state,'d2',2,'d4',0);state=connect(state,'d4',1,'d3',2);
 state=act(state,'select-target',{id:'d5'});assert.equal(evaluateNetworkStudio(state).ok,true);
 state=act(state,'disconnect',{id:'l2'});
 const result=evaluateNetworkStudio(state);assert.equal(result.ok,true);assert.deepEqual(result.path,['d1','d2','d4','d3','d5']);
});

test('the twelfth device fits and the thirteenth cannot be added',()=>{
 let state=initialNetworkStudioState('blank');for(let index=0;index<12;index++)state=act(state,'add-device',{type:'switch'});
 assert.equal(state.devices.length,12);assert.equal(applyNetworkStudioAction(state,'add-device',{type:'pc'}).changed,false);
 assert.equal(NETWORK_STUDIO_LIMITS.devices,12);
 for(let i=0;i<state.devices.length;i++)for(let j=i+1;j<state.devices.length;j++){
  const a=state.devices[i],b=state.devices[j];assert.ok(Math.abs(a.x-b.x)>=21||Math.abs(a.y-b.y)>=30);
 }
 state=act(state,'remove-device',{id:'d1'});state=act(state,'add-device',{type:'printer'});assert.ok(state.devices.some(item=>item.id==='d13'));
 assert.equal(new Set(state.devices.map(item=>item.id)).size,12);
});

test('normalization strips code, text, claimed results, invalid ids, ports and duplicate links',()=>{
 const input=initialNetworkStudioState();input.success=true;input.output='<script>run()</script>';
 input.devices[0].label='<img src=x onerror=run()>';input.devices[0].forwards=true;input.devices.push({id:'<svg/onload=run()>',type:'pc',x:12,y:82});
 input.links.push({id:'l9',from:'d1',fromPort:0,to:'d5',toPort:0});
 input.links.push({id:'l10',from:'d1',fromPort:99,to:'d4',toPort:0});
 const state=normalizeNetworkStudioState(input);assert.equal(state.devices.length,5);assert.equal(state.links.length,4);
 assert.equal(state.devices[0].label,'PC 1');assert.equal(Object.hasOwn(state,'success'),false);assert.equal(Object.hasOwn(state,'output'),false);
 assert.equal(Object.hasOwn(state.devices[0],'forwards'),false);assert.equal(evaluateNetworkStudio(state).ok,true);
 const roundtrip=normalizeNetworkStudioState(JSON.parse(JSON.stringify(state)));assert.deepEqual(roundtrip,state);
});

test('oversized or non-data graph inputs fail closed with an empty bounded topology',()=>{
 const initial=initialNetworkStudioState();
 for(const bad of [{...initial,devices:Array(13).fill(initial.devices[0])},{...initial,links:Array(25).fill(initial.links[0])}]){
  const normalized=normalizeNetworkStudioState(bad);assert.equal(normalized.devices.length,0);assert.equal(normalized.links.length,0);assert.equal(evaluateNetworkStudio(normalized).ok,false);
 }
 let calls=0;const tricky={...initial};Object.defineProperty(tricky,'devices',{get(){calls++;throw new Error('must not run');}});
 assert.equal(normalizeNetworkStudioState(tricky).devices.length,0);assert.equal(calls,0);
 const raw={...initial.devices[0]};Object.defineProperty(raw,'id',{get(){calls++;throw new Error('must not run');}});
 assert.equal(normalizeNetworkStudioState({...initial,devices:[raw]}).devices.length,0);assert.equal(calls,0);
});

test('test runs count as work and reset restores the requested starter without accepting custom state',()=>{
 let state=initialNetworkStudioState();state=act(state,'run');assert.equal(state.runs,1);assert.equal(networkStudioHasWork(state),true);
 state=act(state,'reset',{template:'classroom',devices:[{id:'bad'}]});assert.equal(networkStudioHasWork(state),false);assert.equal(evaluateNetworkStudio(state).ok,true);
 const blank=act(state,'reset',{template:'blank'});assert.equal(blank.devices.length,0);assert.equal(networkStudioHasWork(blank),false);
 assert.equal(NETWORK_DEVICE_TYPES.length,6);assert.ok(NETWORK_DEVICE_TYPES.every(type=>Object.isFrozen(type)));
});

test('a healthy alternative succeeds despite a powered-off branch',()=>{
 let state=small(['pc','switch','router','access-point','server']);
 state=connect(state,'d1',0,'d2',0);state=connect(state,'d2',1,'d3',0);state=connect(state,'d3',1,'d5',0);
 state=connect(state,'d2',2,'d4',0);state=connect(state,'d4',1,'d3',2);
 state=act(state,'select-target',{id:'d5'});
 state=act(state,'power-device',{id:'d4',powered:false});
 const result=evaluateNetworkStudio(state);assert.equal(result.ok,true);assert.deepEqual(result.path,['d1','d2','d3','d5']);assert.ok(!result.path.includes('d4'));
});

test('a powered-off destination identifies the failed final hop instead of claiming delivery',()=>{
 const state=act(initialNetworkStudioState(),'power-device',{id:'d4',powered:false}),result=evaluateNetworkStudio(state);
 assert.equal(result.ok,false);assert.equal(result.failedAt,'d4');assert.equal(result.blockedLinkId,'l3');assert.equal(result.failureKind,'power');
 assert.deepEqual(result.path,['d1','d2','d3']);assert.equal(result.steps.at(-1).to,'d4');assert.equal(result.steps.at(-1).ok,false);
 assert.equal(result.checks[1].ok,false);assert.equal(result.checks[2].ok,true);
});

test('array iterators and element accessors are not evaluated while importing a layout',()=>{
 let calls=0;const state=initialNetworkStudioState();
 state.devices[Symbol.iterator]=function(){calls++;throw new Error('must not run');};
 assert.equal(normalizeNetworkStudioState(state).devices.length,5);
 Object.defineProperty(state.devices,0,{get(){calls++;throw new Error('must not run');}});
 assert.equal(normalizeNetworkStudioState(state).devices.length,4);assert.equal(calls,0);
});

test('a shorter path through an end device does not hide a healthy forwarding alternative',()=>{
 let state=small(['pc','pc','router','switch','server']);
 state=connect(state,'d1',0,'d2',0);state=connect(state,'d2',1,'d3',0);
 state=connect(state,'d1',1,'d4',0);state=connect(state,'d4',1,'d3',1);state=connect(state,'d3',2,'d5',0);
 state=act(state,'select-target',{id:'d5'});
 const result=evaluateNetworkStudio(state);assert.equal(result.ok,true);assert.deepEqual(result.path,['d1','d4','d3','d5']);
});
