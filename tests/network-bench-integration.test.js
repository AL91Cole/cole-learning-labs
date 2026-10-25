import test from 'node:test';
import assert from 'node:assert/strict';
import {NETWORK_SCENARIOS} from '../src/network-labs.js';
import {getNetworkBenchSpec} from '../src/network-bench.js';
import {initialWorkspaceState,applyWorkspaceAction,verifyWorkspace,normalizeWorkspaceState} from '../src/workspaces.js';
const plans={
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
const step=(id,state,action,value)=>applyWorkspaceAction(id,state,action,value).state;
for(const {id} of NETWORK_SCENARIOS)test(id+': cable gestures invalidate tests while layout changes preserve them',()=>{
 let state=step(id,step(id,initialWorkspaceState(id),'save-expanded',plans[id]),'run-check');
 assert.equal(verifyWorkspace(id,state).ok,true);
 const before=structuredClone(state),signature=state.testSignature;
 const moved=applyWorkspaceAction(id,state,'bench-move',{nodeId:getNetworkBenchSpec(id).nodes[0].id,x:25,y:50});
 assert.equal(moved.viewOnly,true);assert.equal(moved.state.testSignature,signature);assert.equal(verifyWorkspace(id,moved.state).ok,true);
 assert.deepEqual(state,before,'Gestures must not mutate an earlier saved state');state=moved.state;
 const cable=getNetworkBenchSpec(id).cables[0];
 state=step(id,state,'bench-disconnect',{cableId:cable.id});
 assert.equal(state.tested,false);assert.equal(verifyWorkspace(id,step(id,state,'run-check')).ok,false);
 assert.equal(verifyWorkspace(id,{...before,networkBench:state.networkBench}).ok,false,'Cached pass cannot survive an unplugged cable');
 state=step(id,state,'bench-connect',{fromPort:cable.fromPort,toPort:cable.toPort});
 assert.equal(verifyWorkspace(id,state).ok,false,'Reconnecting alone is not a fresh test');
 state=step(id,state,'run-check');assert.equal(verifyWorkspace(id,state).ok,true);
 assert.deepEqual(normalizeWorkspaceState(id,JSON.parse(JSON.stringify(state))),state);
});
test('direct star, backup and link gestures change only their physical configuration',()=>{
 let state=initialWorkspaceState('NET-208'),cable=getNetworkBenchSpec('NET-208').cables[0];
 assert.ok(state.networkBench.disconnected.includes(cable.id));
 state=step('NET-208',state,'bench-connect',{fromPort:cable.fromPort,toPort:cable.toPort});
 assert.equal(state.topology,'star');assert.equal(state.localDevice,'passive','Connecting a lead must not choose a switch');
 let vlan=initialWorkspaceState('NET-210');cable=getNetworkBenchSpec('NET-210').cables.find(c=>c.id==='switch-backup');
 vlan=step('NET-210',vlan,'bench-disconnect',{cableId:cable.id});assert.equal(vlan.redundancy,'disconnect');
 vlan=step('NET-210',vlan,'bench-connect',{fromPort:cable.fromPort,toPort:cable.toPort});assert.equal(vlan.redundancy,'both-forward','Cable reconnection must not silently enable STP');
 let wan=step('NET-212',initialWorkspaceState('NET-212'),'save-expanded',{link:'down'});cable=getNetworkBenchSpec('NET-212').cables[0];
 assert.ok(wan.networkBench.disconnected.includes(cable.id));wan=step('NET-212',wan,'bench-connect',{fromPort:cable.fromPort,toPort:cable.toPort});assert.equal(wan.link,'up');
});
