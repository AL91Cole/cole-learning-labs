import {normalizeNetworkBench} from '../src/network-bench.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NETWORK_SCENARIOS,NETWORK_CONFIG,networkChecks,networkDiagnostic} from '../src/network-labs.js';
import {supportsExpandedLab,initialExpandedState,normalizeExpandedState,applyExpandedAction,verifyExpanded,getExpandedMission,expandedDiagnostic} from '../src/expanded-labs.js';
import {initialWorkspaceState,normalizeWorkspaceState,applyWorkspaceAction,verifyWorkspace,getWorkspaceMission,workspaceDiagnostic,renderWorkspace} from '../src/workspaces.js';
import {normalizeLabRecord} from '../src/records.js';
const SOLUTIONS={
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
const config=id=>NETWORK_CONFIG[id.replace('-','')];
const apply=(id,state,action,value)=>applyWorkspaceAction(id,state,action,value).state;
const selected=id=>apply(id,initialWorkspaceState(id),'save-expanded',SOLUTIONS[id]);
const solved=id=>apply(id,selected(id),'run-check');
function mockRoot(){
 const nodes=new Map();
 return {innerHTML:'',querySelector(key){if(!nodes.has(key))nodes.set(key,{value:'',textContent:'',dataset:{},addEventListener(){},setAttribute(){}});return nodes.get(key);},querySelectorAll(){return [];}};
}
test('ten original network cases follow the guided topic order and provide complete local evidence',()=>{
 assert.equal(NETWORK_SCENARIOS.length,10);
 assert.equal(new Set(NETWORK_SCENARIOS.map(s=>s.id)).size,10);
 assert.deepEqual([...NETWORK_SCENARIOS].sort((a,b)=>a.networkStep-b.networkStep).map(s=>s.id),['NET-208','NET-215','NET-207','NET-210','NET-209','NET-214','NET-216','NET-213','NET-211','NET-212']);
 for(const s of NETWORK_SCENARIOS){
  assert.equal(s.track,'network');assert.equal(s.intake.kind,'detailed');assert.deepEqual(s.intake.factIds,[]);
  assert.equal(s.clues.length,4);assert.equal(s.questions.length,2);assert.ok(s.sourceTopic);
  assert.ok(s.interviewFacts.every(f=>f.answer.length<=300&&f.keywords.length<=12&&f.keywords.every(k=>k.length<=45)));
  assert.equal(Object.hasOwn(s,'rubric'),false);assert.equal(Object.hasOwn(s,'solution'),false);
  assert.equal(config(s.id).fields.length,4);assert.equal(config(s.id).commands.length,3);
 }
});
for(const scenario of NETWORK_SCENARIOS){
 const id=scenario.id;
 test(`${id}: public workspace flow requires applied choices and a fresh full test`,()=>{
  assert.equal(supportsExpandedLab(id),true);
  const initial=initialWorkspaceState(id),before=structuredClone(initial);
  assert.deepEqual(initial,initialExpandedState(id));
  assert.equal(verifyWorkspace(id,initial).ok,false);
  assert.equal(verifyWorkspace(id,apply(id,initial,'run-check')).ok,false);
  assert.deepEqual(initial,before);
  const ready=selected(id);assert.equal(verifyWorkspace(id,ready).ok,false);
  const checked=solved(id);assert.equal(checked.results.length,4);assert.ok(checked.results.every(r=>r.ok));
  assert.equal(verifyWorkspace(id,checked).ok,true);assert.equal(verifyExpanded(id,checked).ok,true);
  assert.equal(getWorkspaceMission(id,checked).complete,true);assert.equal(getExpandedMission(id,checked).complete,true);
  assert.deepEqual(normalizeWorkspaceState(id,JSON.parse(JSON.stringify(checked))),checked);
  assert.deepEqual(normalizeExpandedState(id,checked),checked);
  const record=normalizeLabRecord(scenario,{state:checked,evidence:scenario.clues.map(c=>c.id),questions:[0,1],symptoms:'Supplied local symptoms',plan:'Compare the supplied evidence',ideaSaved:true,events:[]});
  assert.deepEqual(record.state,checked);assert.deepEqual(normalizeLabRecord(scenario,JSON.parse(JSON.stringify(record))),record);
  assert.equal(verifyWorkspace(id,apply(id,checked,'save-expanded',SOLUTIONS[id])).ok,false,'reapplying invalidates the test');
 });
 test(`${id}: every alternative field value prevents a fresh pass and changes an observation`,()=>{
  const checked=solved(id),baseline=config(id).commands.map(k=>workspaceDiagnostic(id,checked,k));
  for(const f of config(id).fields){for(const [wrong] of f.options.filter(([v])=>v!==SOLUTIONS[id][f.name])){
   const changed={...SOLUTIONS[id],[f.name]:wrong};
   assert.equal(verifyWorkspace(id,{...checked,[f.name]:wrong,results:[{label:'forged',ok:true}]}).ok,false,'saved signature cannot survive a changed field');
   const current=apply(id,apply(id,checked,'save-expanded',changed),'run-check');
   assert.equal(verifyWorkspace(id,current).ok,false,`${f.name}=${wrong}`);
   const row=config(id).fields.findIndex(item=>item.name===f.name);
   assert.equal(networkChecks(id,current)[row].ok,false,'each field has its own required predicate');
   const readouts=config(id).commands.map(k=>workspaceDiagnostic(id,current,k));
   assert.notDeepEqual(readouts,baseline,`${f.name} affects a displayed observation`);
  }}
  assert.equal(verifyWorkspace(id,{...SOLUTIONS[id],tested:true,checkRuns:1,results:[{ok:true}]}).ok,false);
 });
 test(`${id}: readouts are bounded, immutable, local, and routed through public inspection APIs`,()=>{
  for(const state of [initialWorkspaceState(id),solved(id)])for(const command of ['help',...config(id).commands]){
   const before=structuredClone(state),out=workspaceDiagnostic(id,state,command);
   assert.ok(out.length>0&&out.length<=600);
   assert.equal(expandedDiagnostic(id,state,command),out);assert.equal(networkDiagnostic(id,state,command),out);
   assert.equal(applyExpandedAction(id,state,'inspect-command',{command}).message,out);
   assert.deepEqual(apply(id,state,'inspect-command',{command}),before);assert.deepEqual(state,before);
  }
  for(const command of ['ping 8.8.8.8','fetch https://real.example','inspect capture\nremove everything','x'.repeat(100),null]){
   const out=workspaceDiagnostic(id,solved(id),command);assert.match(out,/displayed practice tool/);
   assert.doesNotMatch(out,/8\.8\.8\.8|real\.example|remove everything/);
  }
 });
 test(`${id}: invalid imported choices and markup cannot become state or rendered HTML`,()=>{
  const poison={...solved(id),workspaceEdits:Infinity,checkRuns:-1,unexpected:'private@example.test',testSignature:'x'.repeat(10000),tested:'true'};
  for(const f of config(id).fields)poison[f.name]='<img src=x onerror=alert(1)>';
  assert.deepEqual(normalizeWorkspaceState(id,poison),{...initialWorkspaceState(id),networkBench:normalizeNetworkBench(id,poison.networkBench)});
  assert.deepEqual(normalizeWorkspaceState(id,Object.create(solved(id))),initialWorkspaceState(id));
  const root=mockRoot();renderWorkspace(root,scenario,poison,()=>{});
  assert.equal((root.innerHTML.match(/<select /g)||[]).length,4);
  assert.match(root.innerHTML,/Apply my choices/);assert.match(root.innerHTML,/Run workspace test/);
  assert.equal((root.innerHTML.match(/data-exp-command=/g)||[]).length,3);
  assert.doesNotMatch(root.innerHTML,/<img src=x|onerror=|private@example|<iframe|contenteditable/);
 });
}
test('subnet readouts calculate each prefix and the /26 allocation excludes network and broadcast',()=>{
 const id='NET-209',base=SOLUTIONS[id];
 const addressNumber=a=>a.split('.').reduce((n,part)=>n*256+Number(part),0)>>>0;
 const format=n=>[24,16,8,0].map(shift=>(n>>>shift)&255).join('.');
 const host=addressNumber(base.host),gateway=addressNumber(base.gateway);
 for(const prefix of ['/24','/26','/27']){
  const bits=Number(prefix.slice(1)),mask=(0xffffffff<<(32-bits))>>>0,network=(addressNumber('10.40.8.64')&mask)>>>0,broadcast=(network|(~mask>>>0))>>>0;
  const out=networkDiagnostic(id,{...base,subnet:prefix},'calculate subnet');
  assert.ok(out.includes(format(network)));assert.ok(out.includes(format(broadcast)));
  assert.ok(out.includes(format(network+1)));assert.ok(out.includes(format(broadcast-1)));
  assert.ok(out.includes(`${broadcast-network-1} hosts`));
  if(prefix==='/26'){
   assert.equal(broadcast-network+1,64);assert.equal(broadcast-network-1,62);
   assert.ok(host>network&&host<broadcast);assert.ok(gateway>network&&gateway<broadcast);
   assert.equal(format(network),'10.40.8.64');assert.equal(format(broadcast),'10.40.8.127');
  }else assert.equal(networkChecks(id,{...base,subnet:prefix})[0].ok,false);
 }
 for(const bad of ['10.40.8.64','10.40.8.127','10.40.8.130'])assert.equal(networkChecks(id,{...base,host:bad})[1].ok,false);
});
test('a mismatched routing area prevents adjacency and the learned route while NAT is kept at its boundary',()=>{
 const id='NET-209';assert.match(networkDiagnostic(id,SOLUTIONS[id],'trace boundary'),/classroom area 0.*up; approved school route learned/s);
 const wrong={...SOLUTIONS[id],edge:'area-mismatch'};
 assert.match(networkDiagnostic(id,wrong,'trace boundary'),/classroom area 1.*down; no school route learned/s);
 assert.match(networkDiagnostic(id,SOLUTIONS[id],'trace boundary'),/NAT at internet edge only/);
 assert.match(networkDiagnostic(id,SOLUTIONS[id],'trace boundary'),/IPv6.*keeps its route/);
});
test('packet evidence distinguishes next-hop MAC, preserved IP endpoints, and decreasing TTL',()=>{
 const id='NET-215',state=SOLUTIONS[id];
 const next=networkDiagnostic(id,state,'inspect next hop');assert.match(next,/gateway 192\.0\.2\.1 → 02:00:00:00:01:01/);
 assert.match(networkDiagnostic(id,{...state,nextHop:'remote'},'inspect next hop'),/Remote MAC is not a local ARP neighbor/);
 const hop=networkDiagnostic(id,state,'compare hop headers');
 assert.match(hop,/Before: Ethernet PC → gateway; IPv4 192\.0\.2\.24 → 198\.51\.100\.20; TTL 64/);
 assert.match(hop,/After: Ethernet router-out → next-hop; same IPv4 endpoints; TTL 63/);
 assert.match(networkDiagnostic(id,{...state,interface:'wifi'},'inspect capture'),/does not establish classroom Ethernet path/);
});
test('SNMP alert uses a delta rate and requires the protected approved path plus receiver test',()=>{
 const id='NET-216',state=SOLUTIONS[id],rate=networkDiagnostic(id,state,'calculate error rate');
 assert.match(rate,/100 errors.*160/s);assert.match(rate,/60 seconds = 1 error\/second/);assert.match(rate,/1 > 0\.5 errors\/second/);
 assert.match(networkDiagnostic(id,state,'test alert receiver'),/accepted modeled alert/);
 for(const changes of [{target:'printer'},{protection:'community'},{threshold:'total'},{receiver:'none'},{receiver:'external'}]){
  assert.doesNotMatch(networkDiagnostic(id,{...state,...changes},'test alert receiver'),/accepted modeled alert/);
 }
 assert.match(networkDiagnostic(id,{...state,threshold:'total'},'calculate error rate'),/Lifetime total is not the required sample rate/);
});
test('portal allow/deny tests and guest-path tests expose overbroad access and missing service access',()=>{
 const portal=SOLUTIONS['NET-211'];
 assert.match(networkDiagnostic('NET-211',portal,'test portal rules'),/443: allowed.*22: denied/s);
 assert.match(networkDiagnostic('NET-211',{...portal,firewall:'all'},'test portal rules'),/22: allowed/);
 assert.match(networkDiagnostic('NET-211',{...portal,firewall:'deny-all'},'test portal rules'),/443: denied/);
 assert.match(networkDiagnostic('NET-211',portal,'compare alert evidence'),/alert-only IDS.*firewall denied/s);
 const guest=SOLUTIONS['NET-210'];
 assert.match(networkDiagnostic('NET-210',guest,'test guest path'),/staff denied; listed services\/return allowed/);
 assert.match(networkDiagnostic('NET-210',{...guest,guestPolicy:'deny-all'},'test guest path'),/required guest services also denied/);
 assert.match(networkDiagnostic('NET-210',{...guest,redundancy:'both-forward'},'inspect redundancy'),/loop in this fixed topology/);
});
test('QoS retains physical capacity and needs both scheduling and media queue treatment',()=>{
 const id='NET-213',state=SOLUTIONS[id];
 assert.match(networkDiagnostic(id,state,'measure media'),/Capacity stays 10 Mb\/s.*load 7 Mb\/s.*Loss 0\.4%; jitter 12 ms/s);
 assert.match(networkDiagnostic(id,{...state,congestion:'during-call'},'measure media'),/load 18 Mb\/s.*Loss 7%; jitter 55 ms.*does not create bandwidth/s);
 assert.match(networkDiagnostic(id,{...state,voiceQueue:'sip-only'},'measure media'),/Loss 2%; jitter 30 ms/);
 assert.match(networkDiagnostic(id,state,'inspect management record'),/Accounting: aggregate totals/);
});
test('topology planner counts the uplink port and calculates headroom without claiming installation',()=>{
 const id='NET-214',state=SOLUTIONS[id];
 assert.equal(24+2+1+1,28);assert.equal((24*20+80)*1.25,700);
 const out=networkDiagnostic(id,state,'calculate capacity');assert.match(out,/28 ports/);assert.match(out,/700 Mb\/s/);assert.match(out,/Port margin 20; uplink margin 300 Mb\/s/);
 assert.match(networkDiagnostic(id,{...state,capacity:'24-gigabit'},'calculate capacity'),/Port margin -4/);
 assert.match(networkDiagnostic(id,{...state,capacity:'48-fast'},'calculate capacity'),/uplink margin -600/);
 assert.match(networkDiagnostic(id,state,'inspect change record'),/return to saved previous settings.*School review before installation/s);
});
