import test from 'node:test';
import assert from 'node:assert/strict';
import {NETWORK_CONFIG,NETWORK_SCENARIOS} from '../src/network-labs.js';
import {getNetworkDiagram} from '../src/network-diagrams.js';
import {initialWorkspaceState,applyWorkspaceAction,verifyWorkspace} from '../src/workspaces.js';

const choices={
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
const view=(id,changes={})=>getNetworkDiagram(id,{...choices[id],...changes});
const device=(diagram,id)=>diagram.nodes.find(node=>node.id===id);
const path=(diagram,from,to)=>diagram.links.find(link=>link.from===from&&link.to===to);

for(const scenario of NETWORK_SCENARIOS){
 const id=scenario.id,config=NETWORK_CONFIG[id.replaceAll('-','')];
 test(`${id}: each saved choice changes the diagram and has a device setting entry`,()=>{
  const initial=getNetworkDiagram(id,initialWorkspaceState(id));
  assert.ok(initial.title&&initial.summary);
  assert.ok(initial.nodes.length>=3&&initial.nodes.length<=6);
  assert.equal(new Set(initial.nodes.map(node=>node.id)).size,initial.nodes.length);
  const referenced=new Set(initial.nodes.flatMap(node=>node.fields));
  for(const field of config.fields){
   assert.ok(referenced.has(field.name),`${field.name} has an inspector association`);
   for(const [value] of field.options){
    const current=getNetworkDiagram(id,{...initialWorkspaceState(id),[field.name]:value});
    if(value!==field.initial)assert.notDeepEqual(current,initial,`${field.name}=${value} appears visually`);
    if(value!==choices[id][field.name])assert.notDeepEqual(view(id,{[field.name]:value}),view(id),`${field.name}=${value} differs from the matched choices`);
   }
  }
  for(const diagram of [initial,view(id)]){
   for(const item of [...diagram.nodes,...diagram.links]){
    assert.ok(['ready','blocked','warning','neutral'].includes(item.tone));
    assert.equal(typeof item.status,'string');assert.ok(item.status.length>0,'color has an explicit text status');
    assert.equal(typeof item.label,'string');assert.ok(item.label.length>0);
   }
   for(const node of diagram.nodes){
    assert.ok(node.x>=12&&node.x<=88);assert.ok(node.y>=14&&node.y<=86);
    assert.equal(typeof node.kind,'string');assert.equal(typeof node.detail,'string');
    assert.ok(node.fields.every(name=>config.fields.some(field=>field.name===name)));
   }
   for(const link of diagram.links){
    assert.ok(diagram.nodes.some(node=>node.id===link.from));
    assert.ok(diagram.nodes.some(node=>node.id===link.to));
   }
  }
 });
 test(`${id}: imported values normalize, private extras disappear, and viewing cannot complete work`,()=>{
  const initial=initialWorkspaceState(id),poison={...choices[id],studentEmail:'PRIVATE_CANARY'};
  for(const field of config.fields)poison[field.name]='<img src=x onerror=alert(1)>';
  assert.deepEqual(getNetworkDiagram(id,poison),getNetworkDiagram(id,initial));
  assert.deepEqual(getNetworkDiagram(id,Object.create(choices[id])),getNetworkDiagram(id,initial));
  for(const bad of [null,[],42,'private value'])assert.deepEqual(getNetworkDiagram(id,bad),getNetworkDiagram(id,initial));
  assert.doesNotMatch(JSON.stringify(getNetworkDiagram(id,poison)),/PRIVATE_CANARY|<img|onerror/);
  const selected=applyWorkspaceAction(id,initial,'save-expanded',choices[id]).state;
  const before=structuredClone(selected);Object.freeze(selected);
  getNetworkDiagram(id,selected);
  assert.deepEqual(selected,before);assert.equal(verifyWorkspace(id,selected).ok,false);
  assert.equal(selected.tested,false);assert.equal(selected.checkRuns,0);assert.deepEqual(selected.results,[]);
  const checked=applyWorkspaceAction(id,selected,'run-check').state,checkedBefore=structuredClone(checked);
  assert.equal(verifyWorkspace(id,checked).ok,true);getNetworkDiagram(id,checked);
  assert.deepEqual(checked,checkedBefore);
  assert.deepEqual(getNetworkDiagram(id,selected),getNetworkDiagram(id,checked),'a completion signature cannot change the topology');
 });
}

test('unsupported cases have no networking diagram',()=>{
 for(const id of ['NET-201','SEC-401','unknown',null,207])assert.equal(getNetworkDiagram(id),null);
 assert.deepEqual(getNetworkDiagram('net207'),getNetworkDiagram('NET-207'));
});

test('classroom copper desks remain usable when the long building cable fails',()=>{
 const copper=view('NET-208',{media:'all-copper'});
 assert.equal(path(copper,'pc04','cabinet').tone,'ready');
 assert.equal(path(copper,'router','building').tone,'blocked');
 assert.match(device(copper,'building').detail,/180 m.*100 m/);
 const absent=view('NET-208',{media:'desk-fiber-only'});
 assert.equal(path(absent,'pc04','cabinet').tone,'warning');
 assert.equal(device(absent,'cabinet').tone,'ready','switch function remains distinct from cable approval');
 assert.match(device(absent,'building').status,/uplink missing/);
 const chain=view('NET-208',{topology:'chain'});
 assert.ok(path(chain,'pc04','pc05'));assert.equal(path(chain,'pc04','cabinet'),undefined);
});

test('local addressing and OSPF reachability stay independent, including duplicate addresses',()=>{
 const mismatched=view('NET-209',{edge:'area-mismatch'});
 assert.equal(path(mismatched,'pc','gateway').tone,'ready');
 assert.equal(path(mismatched,'edge','school').tone,'blocked');
 const badHost=view('NET-209',{host:'10.40.8.64'});
 assert.equal(path(badHost,'pc','gateway').tone,'blocked');
 assert.equal(path(badHost,'edge','school').tone,'ready');
 const duplicate=view('NET-209',{subnet:'/24',host:'10.40.8.127',gateway:'10.40.8.127'});
 assert.equal(path(duplicate,'pc','gateway').tone,'blocked');
 assert.match(path(duplicate,'pc','gateway').status,/Duplicate/);
 assert.equal(path(duplicate,'edge','school').tone,'ready');
 assert.match(device(view('NET-209',{subnet:'/27'}),'allocation').status,/Too few/);
 assert.match(device(view('NET-209',{subnet:'/24'}),'allocation').status,/Overlaps/);
});

test('guest policy, trunk carriage, and loop protection remain separate',()=>{
 const ready=view('NET-210');
 assert.equal(path(ready,'core','staff').status,'Guest access denied');
 assert.equal(path(ready,'core','staff').tone,'ready','the intended restriction is a correct boundary');
 assert.equal(path(ready,'core','portal').tone,'ready');
 assert.match(device(ready,'backup').status,/Alternate.*discarding/);
 const all=view('NET-210',{trunk:'all'});
 assert.equal(device(all,'switch').tone,'warning');
 assert.equal(path(all,'core','portal').tone,'ready','overbroad trunk still carries VLAN 30');
 assert.equal(path(view('NET-210',{trunk:'10'}),'core','portal').tone,'blocked');
 assert.equal(path(view('NET-210',{guestPolicy:'deny-all'}),'core','portal').tone,'blocked');
 const wrongVlan=view('NET-210',{access:'10'});
 assert.match(path(wrongVlan,'core','staff').status,/shares staff VLAN/);
 assert.equal(path(wrongVlan,'core','portal').tone,'neutral','guest rules cannot establish the service outcome for an endpoint placed in staff VLAN');
 const loop=view('NET-210',{redundancy:'both-forward'});
 assert.match(device(loop,'backup').status,/loop risk/);assert.equal(device(loop,'backup').tone,'warning');
 assert.equal(device(view('NET-210',{redundancy:'disconnect'}),'backup').tone,'blocked');
});

test('IDS interpretation never turns the alert-only sensor into a blocker',()=>{
 const broad=view('NET-211',{firewall:'all',detection:'ids-blocked'});
 assert.equal(path(broad,'firewall','portal').status,'Allowed by saved rule');
 assert.match(broad.summary,/allows unapproved TCP 22/);
 assert.match(device(broad,'ids').detail,/only alerts/);
 assert.match(device(broad,'ids').status,/unsupported/);
 assert.equal(path(broad,'firewall','review').status,'Recorded firewall block','historical record is fixed even after current rule changes');
 assert.equal(path(view('NET-211',{firewall:'deny-all'}),'firewall','portal').tone,'blocked');
});

test('a retired WAN route leaves the working local, gateway, and provider checkpoints up',()=>{
 const initial=getNetworkDiagram('NET-212');
 assert.equal(device(initial,'pc').tone,'ready');
 assert.equal(device(initial,'gateway').tone,'ready');
 assert.equal(device(initial,'provider').tone,'ready');
 assert.equal(device(initial,'remote').tone,'blocked');
 const recorded=getNetworkDiagram('NET-212',{diagnostic:'all'});
 assert.deepEqual(recorded.links.slice(0,3),initial.links.slice(0,3),'retaining evidence cannot repair the route');
 const disconnected=view('NET-212',{link:'down'});
 assert.equal(device(disconnected,'gateway').tone,'blocked');
 assert.equal(device(disconnected,'provider').tone,'blocked');
 assert.equal(device(disconnected,'remote').tone,'blocked');
 const retiredGateway=view('NET-212',{gateway:'10.50.0.254'});
 assert.equal(device(retiredGateway,'pc').tone,'ready');
 assert.equal(device(retiredGateway,'provider').tone,'blocked');
 assert.equal(device(view('NET-212'),'remote').status,'Remote responds in model');
});

test('voice quality requires load scheduling and audio queue treatment while capacity stays fixed',()=>{
 const overloaded=view('NET-213',{congestion:'during-call'});
 assert.match(overloaded.summary,/10 Mb\/s.*18 Mb\/s.*7% loss, 55 ms/);
 assert.equal(device(overloaded,'uplink').tone,'warning');
 const signalingOnly=view('NET-213',{voiceQueue:'sip-only'});
 assert.match(device(signalingOnly,'queue').detail,/RTP remains best effort/);
 assert.match(signalingOnly.summary,/2% loss, 30 ms/);
 assert.match(view('NET-213').summary,/0\.4% loss, 12 ms/);
 const recordOnly=view('NET-213',{congestion:'during-call',record:'fcaps'});
 assert.equal(device(recordOnly,'management').tone,'ready');
 assert.equal(device(recordOnly,'uplink').tone,'warning','complete management records cannot fix an overloaded call');
});

test('capacity planning exposes independent port, uplink, wireless, and boundary limits',()=>{
 const shortPorts=view('NET-214',{capacity:'24-gigabit'});
 assert.match(device(shortPorts,'switch').status,/Four ports short/);
 assert.equal(path(shortPorts,'switch','gateway').tone,'ready','1 Gb/s still fits the throughput estimate');
 const slow=view('NET-214',{capacity:'48-fast'});
 assert.equal(path(slow,'students','switch').tone,'ready','48 ports still fit the access connections');
 assert.match(path(slow,'switch','gateway').status,/exceeds uplink/);
 const open=view('NET-214',{wireless:'open',segments:'approved'});
 assert.equal(device(open,'ap').tone,'warning');
 assert.equal(device(open,'guest').tone,'ready','wireless policy does not remove selected gateway boundaries');
 const flat=view('NET-214',{segments:'flat'});
 assert.match(device(flat,'guest').status,/Shared flat/);
 assert.match(device(view('NET-214',{changePlan:'erase'}),'gateway').detail,/rollback is unavailable/);
});

test('packet records stay fixed when interface, next-hop, or header labels are wrong',()=>{
 const matched=view('NET-215'),wrong=view('NET-215',{interface:'wifi',nextHop:'remote',headers:'ip-replaced',interpretation:'application'});
 assert.deepEqual(wrong.links,matched.links,'saved labels cannot rewrite supplied capture records');
 assert.match(device(wrong,'pc').detail,/02:00:00:00:01:24/);
 assert.match(device(wrong,'gateway').detail,/02:00:00:00:01:01/);
 assert.match(device(wrong,'hop').detail,/same IP endpoints; TTL 63/);
 assert.match(device(wrong,'remote').detail,/198\.51\.100\.20 remains/);
 assert.match(device(wrong,'interpretation').status,/exceeds evidence/);
});

test('SNMP polling and notification conditions do not alter the supplied error rate or repair errors',()=>{
 const matched=view('NET-216');
 assert.equal(path(matched,'uplink','manager').tone,'ready');
 assert.equal(device(matched,'desk').status,'Ready for receiver check');
 assert.equal(device(matched,'uplink').tone,'warning','interface errors persist after preparing alert routing');
 assert.match(device(matched,'threshold').detail,/1 error\/second > 0\.5/);
 for(const change of [{target:'printer'},{protection:'community'},{threshold:'total'},{receiver:'none'},{receiver:'external'}]){
  const wrong=view('NET-216',change);
  assert.notEqual(device(wrong,'desk').status,'Ready for receiver check');
  assert.equal(path(wrong,'threshold','desk').tone,'blocked');
  assert.match(device(wrong,'threshold').detail,/1 error\/second > 0\.5/);
 }
 assert.equal(device(view('NET-216',{protection:'community'}),'manager').tone,'blocked');
 assert.match(device(view('NET-216',{receiver:'external'}),'desk').detail,/no modeled notification is sent/);
});
