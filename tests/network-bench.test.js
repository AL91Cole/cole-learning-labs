import test from 'node:test';
import assert from 'node:assert/strict';
import {NETWORK_SCENARIOS} from '../src/network-labs.js';
import {renderNetworkVisual} from '../src/network-visuals.js';
import {getNetworkBenchSpec,networkBenchInitial,normalizeNetworkBench,networkBenchSignature,networkCableChecks,applyNetworkBenchAction} from '../src/network-bench.js';

for(const {id} of NETWORK_SCENARIOS){
 test(`${id}: unplugging changes checks, matching reviewed ports restore them`,()=>{
  const initial=networkBenchInitial(id),before=structuredClone(initial),spec=getNetworkBenchSpec(id);
  for(const cable of spec.cables){
   const removed=applyNetworkBenchAction(id,initial,'disconnect',{cableId:cable.id});
   assert.equal(removed.kind,'cable');assert.equal(removed.changed,true);
   assert.equal(networkCableChecks(id,removed.bench).filter(check=>!check.ok).length,1);
   assert.notEqual(networkBenchSignature(id,removed.bench),networkBenchSignature(id,initial));
   const restored=applyNetworkBenchAction(id,removed.bench,'connect',{fromPort:cable.toPort,toPort:cable.fromPort});
   assert.deepEqual(restored.bench,initial);
   assert.match(renderNetworkVisual(id,{networkBench:removed.bench}),/Cable disconnected/);
  }
  assert.deepEqual(initial,before);
 });
 test(`${id}: positions are bounded and separated without changing connectivity`,()=>{
  const initial=networkBenchInitial(id),spec=getNetworkBenchSpec(id);
  const moved=applyNetworkBenchAction(id,initial,'move',{nodeId:spec.nodes[0].id,x:-500,y:500});
  assert.equal(moved.kind,'layout');
  assert.equal(applyNetworkBenchAction(id,initial,'move',{nodeId:spec.nodes[0].id,x:spec.nodes[0].x,y:spec.nodes[0].y+5}).changed,true);
  assert.equal(networkBenchSignature(id,moved.bench),networkBenchSignature(id,initial));
  const points=Object.values(moved.bench.positions);
  for(const point of points){assert.ok(point.x>=12&&point.x<=88);assert.ok(point.y>=18&&point.y<=82);}
  for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++)assert.ok(Math.abs(points[a].x-points[b].x)>=23||Math.abs(points[a].y-points[b].y)>=35);
 });
}

test('wrong ports, foreign cables, untrusted coordinates and imported extras are rejected',()=>{
 const id='NET-208',initial=networkBenchInitial(id),spec=getNetworkBenchSpec(id);
 const wrong=applyNetworkBenchAction(id,initial,'connect',{fromPort:spec.cables[0].fromPort,toPort:spec.cables[1].toPort});
 assert.equal(wrong.changed,false);assert.deepEqual(wrong.bench,initial);assert.match(wrong.message,/do not match/);
 for(const [action,value] of [['disconnect',{cableId:'__proto__'}],['move',{nodeId:'pc04',x:Infinity,y:20}],['eval',{code:'bad()'}]])assert.equal(applyNetworkBenchAction(id,initial,action,value).changed,false);
 const poison={positions:{pc:{x:NaN,y:Infinity},evil:{x:20,y:20}},disconnected:['pc-gateway','pc-gateway','javascript:bad()'],secret:'PRIVATE_CANARY'};
 const normalized=normalizeNetworkBench('NET-212',poison);
 assert.deepEqual(normalized.disconnected,['pc-gateway']);
 assert.doesNotMatch(JSON.stringify(normalized),/PRIVATE_CANARY|javascript|evil|NaN|Infinity/);
 for(const bad of [Object.create(poison),null,[],42,'<script>bad()</script>'])assert.deepEqual(normalizeNetworkBench(id,bad),initial);
});

test('unplugging one desk keeps neighboring desks and independent branches available',()=>{
 const status=(html,nodeId)=>html.match(new RegExp(`data-net-node="${nodeId}"[\\s\\S]*?<span>([^<]+)</span>`))?.[1];
 const saved208={topology:'star',localDevice:'switch',boundary:'router',media:'matched'};
 const missing208=applyNetworkBenchAction('NET-208',networkBenchInitial('NET-208'),'disconnect',{cableId:'pc04-cabinet'}).bench;
 const html208=renderNetworkVisual('NET-208',{...saved208,networkBench:missing208});
 assert.equal(status(html208,'pc04'),'Cable unplugged');
 assert.equal(status(html208,'pc05'),'Separate runs');
 assert.equal(status(html208,'router'),'Router selected');
 assert.match(html208,/class="net-node net-warning" data-net-node="cabinet"/);
 const saved214={capacity:'48-gigabit',wireless:'managed',segments:'approved',changePlan:'reviewable'};
 const missing214=applyNetworkBenchAction('NET-214',networkBenchInitial('NET-214'),'disconnect',{cableId:'students-switch'}).bench;
 const html214=renderNetworkVisual('NET-214',{...saved214,networkBench:missing214});
 assert.equal(status(html214,'staff'),'Staff boundary planned');
 assert.equal(status(html214,'ap'),'Managed access planned');
 assert.doesNotMatch(html214,/No cabled path/);
});

test('policy records stay fixed references and physical controls remain keyboard buttons',()=>{
 const html=renderNetworkVisual('NET-211',{});
 assert.match(html,/data-net-logical/);assert.match(html,/Historical A-19/);assert.match(html,/Historical F-19/);
 assert.doesNotMatch(html,/data-net-wire="ids-review"|data-net-wire="firewall-review"/);
 assert.equal((html.match(/data-net-port=/g)??[]).length,getNetworkBenchSpec('NET-211').cables.length*2);
 assert.match(html,/data-net-move="left"/);assert.match(html,/data-net-cable-action="disconnect"/);
});


test('unplugged WAN and OSPF peer cables remove downstream response and learned-route claims',()=>{
 const status=(html,nodeId)=>html.match(new RegExp(`data-net-node="${nodeId}"[\\s\\S]*?<span>([^<]+)</span>`))?.[1];
 const ready={link:'up',gateway:'10.50.0.1',route:'approved',diagnostic:'all'};
 const remove=(id,cableId)=>applyNetworkBenchAction(id,networkBenchInitial(id),'disconnect',{cableId}).bench;
 const handoff=renderNetworkVisual('NET-212',{...ready,networkBench:remove('NET-212','gateway-provider')});
 assert.equal(status(handoff,'gateway'),'Gateway responds; uplink unplugged');
 assert.equal(status(handoff,'provider'),'Provider not reached');
 assert.equal(status(handoff,'remote'),'Remote not reached');
 assert.match(handoff,/Checkpoint not reached from PC/);
 assert.doesNotMatch(handoff,/Remote responds in model/);
 const local=renderNetworkVisual('NET-212',{...ready,networkBench:remove('NET-212','pc-gateway')});
 for(const nodeId of ['gateway','provider','remote'])assert.equal(status(local,nodeId),'Not reached from PC');
 const ospf=renderNetworkVisual('NET-209',{subnet:'/26',host:'10.40.8.70',gateway:'10.40.8.65',edge:'school-edge',networkBench:remove('NET-209','edge-school')});
 assert.equal(status(ospf,'school'),'OSPF peer link unplugged');
 assert.match(ospf,/No route learned across unplugged peer link/);
 assert.doesNotMatch(ospf,/School route learned/);
});
