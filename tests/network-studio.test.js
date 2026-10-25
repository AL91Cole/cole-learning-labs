import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNetworkStudio,mountNetworkStudio,networkStudioPacketPlan,networkStudioWirePath} from '../src/network-studio.js';
import {initialNetworkStudioState,applyNetworkStudioAction,evaluateNetworkStudio,NETWORK_DEVICE_TYPES} from '../src/network-studio-model.js';

test('studio renders a six-device palette, live selected-pair results and direct ports',()=>{
  const state=initialNetworkStudioState(),html=renderNetworkStudio(state);
  for(const type of NETWORK_DEVICE_TYPES) assert.ok(html.includes(`data-ns-add="${type.id}"`));
  assert.match(html,/Live connection check/);assert.match(html,/data-ns-live-result/);assert.match(html,/ns-selected-pair/);
  assert.match(html,/data-ns-port="d1" data-ns-port-number="0"/);assert.match(html,/data-ns-endpoint="source"/);assert.match(html,/data-ns-endpoint="target"/);
});
test('studio offers explicit keyboard movement, power, remove and packet controls',()=>{
  const html=renderNetworkStudio(initialNetworkStudioState());
  for(const action of ['power','remove','run','pause','replay','move']) assert.ok(html.includes('data-ns-'+action));
  assert.match(html,/arrow keys/);assert.match(html,/data-ns-auto checked/);assert.match(html,/sends no real network traffic/);
});
test('blank canvas still exposes add, endpoint and live check controls',()=>{
  const state=applyNetworkStudioAction(initialNetworkStudioState(),'reset',{template:'blank'}).state,html=renderNetworkStudio(state);
  assert.match(html,/0\/12 devices/);assert.match(html,/Your network starts here/);assert.match(html,/Choose two devices/);assert.doesNotMatch(html,/data-ns-device="d1"/);
});
test('saved labels are not emitted as executable markup',()=>{
  const state=initialNetworkStudioState();state.devices[0].label='<img src=x onerror=alert(1)>';
  const html=renderNetworkStudio(state);assert.doesNotMatch(html,/<img/);assert.doesNotMatch(html,/onerror/);
});
test('successful packet plan follows actual links then returns over the reverse path',()=>{
  const result=evaluateNetworkStudio(initialNetworkStudioState()),plan=networkStudioPacketPlan(result);
  assert.equal(result.ok,true);assert.equal(plan.length,result.links.length*2);
  assert.deepEqual(plan.slice(0,3).map(step=>step.from),['d1','d2','d3']);
  assert.deepEqual(plan.slice(3).map(step=>[step.from,step.to,step.phase]),[['d4','d3','reply'],['d3','d2','reply'],['d2','d1','reply']]);
});
test('powered-off target animates an attempted hop and produces no reply',()=>{
  const state=applyNetworkStudioAction(initialNetworkStudioState(),'power-device',{id:'d4',powered:false}).state,result=evaluateNetworkStudio(state),plan=networkStudioPacketPlan(result);
  assert.equal(result.ok,false);assert.equal(plan.at(-1).to,'d4');assert.equal(plan.at(-1).ok,false);assert.ok(plan.every(step=>step.phase==='request'));
});
test('unplugged first cable does not invent packet movement or a reply',()=>{
  const state=applyNetworkStudioAction(initialNetworkStudioState(),'disconnect',{id:'l1'}).state,result=evaluateNetworkStudio(state);
  assert.equal(result.ok,false);assert.deepEqual(networkStudioPacketPlan(result),[]);
});
test('wire drawing uses actual finite port centers and rejects invalid geometry',()=>{
  assert.equal(networkStudioWirePath({x:12,y:34},{x:222,y:100}),'M 12 34 C 12 104, 222 170, 222 100');
  assert.equal(networkStudioWirePath({x:Infinity,y:2},{x:3,y:4}),'');assert.equal(networkStudioWirePath(null,{x:3,y:4}),'');
});
test('mount is harmless on a host that has already been removed',()=>{
  const cleanup=mountNetworkStudio({querySelector:()=>null});assert.equal(typeof cleanup,'function');cleanup();
});
