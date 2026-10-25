import test from 'node:test';
import assert from 'node:assert/strict';
import {networkDiagnostic,NETWORK_CONFIG,NETWORK_SCENARIOS} from '../src/network-labs.js';
import {getNetworkBenchSpec,networkBenchInitial} from '../src/network-bench.js';
import {initialWorkspaceState,applyWorkspaceAction,workspaceDiagnostic} from '../src/workspaces.js';
const step=(id,state,action,value)=>applyWorkspaceAction(id,state,action,value).state;
const plans={
 'NET-209':{subnet:'/26',host:'10.40.8.70',gateway:'10.40.8.65',edge:'school-edge'},
 'NET-210':{access:'30',trunk:'10,30',guestPolicy:'approved',redundancy:'spanning-tree'},
 'NET-211':{authentication:'individual',firewall:'https-classroom',detection:'separate',evidence:'full'},
 'NET-212':{link:'up',gateway:'10.50.0.1',route:'approved',diagnostic:'all'},
 'NET-213':{media:'matched',voiceQueue:'rtp-priority',congestion:'reschedule',record:'fcaps'},
 'NET-216':{target:'uplink',protection:'authpriv',threshold:'rate',receiver:'approved'}
};
const selected=id=>step(id,initialWorkspaceState(id),'save-expanded',plans[id]);
const unplug=(id,state,cableId)=>step(id,state,'bench-disconnect',{cableId});
const reconnect=(id,state,cableId)=>{const cable=getNetworkBenchSpec(id).cables.find(item=>item.id===cableId);return step(id,state,'bench-connect',{fromPort:cable.fromPort,toPort:cable.toPort});};

test('WAN upstream disconnection preserves the local gateway but prevents provider and remote success',()=>{
 const id='NET-212',original=selected(id),state=unplug(id,original,'gateway-provider');
 for(const command of ['trace path','compare probes']){
  const output=networkDiagnostic(id,state,command);
  assert.match(output,/Local up; gateway 10\.50\.0\.1: responds; provider: not reached; remote: not reached/);
  assert.doesNotMatch(output,/provider: responds|remote: responds/);
  assert.equal(workspaceDiagnostic(id,state,command),output);
 }
 assert.match(networkDiagnostic(id,state,'inspect link'),/Gateway response: received/);
 assert.match(networkDiagnostic(id,state,'inspect link'),/Provider cable: disconnected/);
 assert.match(networkDiagnostic(id,reconnect(id,state,'gateway-provider'),'trace path'),/Provider: responds.*Remote: responds/s);
 assert.equal(original.networkBench.disconnected.length,0);
});

test('WAN workstation disconnection prevents every remote checkpoint despite approved saved routing',()=>{
 const id='NET-212',state=unplug(id,selected(id),'pc-gateway');
 for(const command of ['trace path','compare probes']){
  const output=networkDiagnostic(id,state,command);
  assert.match(output,/Local down; gateway 10\.50\.0\.1: not reached \/ no response; provider: not reached; remote: not reached/);
  assert.doesNotMatch(output,/: responds/);
 }
 assert.match(networkDiagnostic(id,state,'inspect link'),/link down.*Gateway response: not reached without link/s);
});

for(const [id,command,success] of [
 ['NET-209','trace boundary',/up; approved school route learned/],
 ['NET-210','test guest path',/listed services\/return allowed/],
 ['NET-211','test portal rules',/443: allowed/],
 ['NET-213','measure media',/Loss 0\.4%; jitter 12 ms/],
 ['NET-216','test alert receiver',/accepted modeled alert/]
])test(`${id}: disconnected required cables cannot leave a successful ${command} result`,()=>{
 const original=selected(id);assert.match(networkDiagnostic(id,original,command),success);
 for(const cable of getNetworkBenchSpec(id).cables){
  const state=unplug(id,original,cable.id),before=structuredClone(state),output=networkDiagnostic(id,state,command);
  assert.match(output,/CURRENT PHYSICAL PATH/);assert.match(output,/Disconnected:/);assert.doesNotMatch(output,success);
  assert.ok(output.length<=600);assert.deepEqual(state,before,'Diagnostics are read-only');
 }
});

test('unplugging a redundant uplink cannot report that both are still cabled',()=>{
 const id='NET-210',state=unplug(id,selected(id),'switch-backup');
 const output=networkDiagnostic(id,state,'inspect redundancy');
 assert.match(output,/CURRENT UPLINK STATE/);assert.match(output,/Disconnected: switch-backup/);
 assert.doesNotMatch(output,/Both cabled; spanning tree can change roles/);
});

test('supplied packet records, arithmetic, inventory and historical alerts remain available and labeled',()=>{
 for(const [id,command,evidence] of [
  ['NET-207','compare transports',/File: HTTPS over TCP/],
  ['NET-209','calculate subnet',/62 hosts/],
  ['NET-211','compare alert evidence',/F-19: firewall denied TCP 22 in supplied historical event/],
  ['NET-214','calculate capacity',/700 Mb\/s with headroom/],
  ['NET-215','compare hop headers',/TTL 63/],
  ['NET-216','calculate error rate',/1 error\/second/]
 ]){
  const state=plans[id]?selected(id):initialWorkspaceState(id);
  if(id==='NET-209')state.subnet='/26';
  const disconnected=unplug(id,state,getNetworkBenchSpec(id).cables[0].id),output=networkDiagnostic(id,disconnected,command);
  assert.match(output,/SUPPLIED EVIDENCE \/ SAVED PLAN/);assert.match(output,/not a current connectivity result/);assert.match(output,evidence);
 }
});

test('connected behavior remains identical; unknown cable IDs do not fabricate outages',()=>{
 for(const {id} of NETWORK_SCENARIOS){
  const state=plans[id]??Object.fromEntries(NETWORK_CONFIG[id.replace('-','')].fields.map(item=>[item.name,item.initial]));
  for(const command of NETWORK_CONFIG[id.replace('-','')].commands){
   const output=networkDiagnostic(id,state,command);
   assert.equal(networkDiagnostic(id,{...state,networkBench:networkBenchInitial(id)},command),output);
   assert.equal(networkDiagnostic(id,{...state,networkBench:{disconnected:['unknown','<script>']}},command),output);
   const disconnected={...state,networkBench:{disconnected:getNetworkBenchSpec(id).cables.map(item=>item.id)}};
   assert.ok(networkDiagnostic(id,disconnected,command).length<=600);
  }
 }
});
