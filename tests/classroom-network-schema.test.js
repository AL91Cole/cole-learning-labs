import {getNetworkBenchSpec} from '../src/network-bench.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {SCENARIOS} from '../src/scenarios.js';
import {expandedStateFields} from '../src/expanded-labs.js';
import {CODING_SCENARIOS,codingFixtureCount} from '../src/coding-lab.js';
import {NETWORK_SCENARIOS,NETWORK_CONFIG} from '../src/network-labs.js';
import {initialWorkspaceState,applyWorkspaceAction} from '../src/workspaces.js';
import {normalizeLabRecord} from '../src/records.js';

// Exercise the production schema without enabling the production service.
const source=readFileSync(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');
const start=source.indexOf('const invalidWork ='),end=source.indexOf('\nasync function readBody',start);
assert.ok(start>=0&&end>start);
const validate=vm.runInNewContext(`${source.slice(start,end)}; workPayload`,{
 Object,Array,Number,SCENARIOS,expandedStateFields,CODING_SCENARIOS,codingFixtureCount,getNetworkBenchSpec,
 encoder:new TextEncoder(),MAX_WORK:65_536,
 plain:value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype,
 fail(status,code,message){const error=new Error(message);error.status=status;error.code=code;throw error;}
});
const work=scenario=>normalizeLabRecord(scenario,{state:initialWorkspaceState(scenario.id)});
for(const scenario of NETWORK_SCENARIOS){
 const id=scenario.id,config=NETWORK_CONFIG[id.replace('-','')];
 test(`${id}: prepared server schema accepts every displayed choice and retains false and zero`,()=>{
  const initial=work(scenario),saved=JSON.parse(validate(initial,id));
  assert.deepEqual(saved,initial);assert.equal(saved.state.tested,false);
  assert.equal(saved.state.workspaceEdits,0);assert.equal(saved.state.checkRuns,0);
  assert.equal(saved.state.testSignature,'');
  for(const field of config.fields)for(const [value] of field.options){
   const selected={...initial,state:applyWorkspaceAction(id,initial.state,'save-expanded',{[field.name]:value}).state};
   const checked={...selected,state:applyWorkspaceAction(id,selected.state,'run-check').state};
   assert.deepEqual(JSON.parse(validate(selected,id)),selected);
   assert.deepEqual(JSON.parse(validate(checked,id)),checked);
  }
 });
 test(`${id}: prepared server schema rejects unsupported values and cross-case/private fields`,()=>{
  for(const field of config.fields){
   const invalid=work(scenario);invalid.state[field.name]='unlisted-value';
   assert.throws(()=>validate(invalid,id),e=>e.status===400&&e.code==='invalid_work');
  }
  for(const extra of [{studentEmail:'private@example.test'},{provider:{token:'fictional'}},{unexpectedField:'not part of this case'}]){
   const invalid=work(scenario);Object.assign(invalid.state,extra);
   assert.throws(()=>validate(invalid,id),e=>e.status===400&&e.code==='privacy_violation');
  }
  const other=NETWORK_SCENARIOS.find(item=>Object.keys(expandedStateFields(item.id)).some(key=>!Object.hasOwn(expandedStateFields(id),key)));
  const crossField=Object.entries(expandedStateFields(other.id)).find(([key])=>!Object.hasOwn(expandedStateFields(id),key));
  const cross=work(scenario);cross.state[crossField[0]]=crossField[1][0];
  assert.throws(()=>validate(cross,id),e=>e.status===400&&e.code==='privacy_violation');
 });
}

test('network layout saves accept only known ports, devices and bounded coordinates',()=>{
 for(const scenario of NETWORK_SCENARIOS){
  const initial=work(scenario),spec=getNetworkBenchSpec(scenario.id);
  const bench=initial.state.networkBench,nodeId=spec.nodes[0].id,cableId=spec.cables[0].id;
  const malformedBenches=[
   {...bench,disconnected:['unknown-cable']},
   {...bench,disconnected:[cableId,cableId]},
   {...bench,disconnected:[{cableId}]},
   {...bench,positions:{...bench.positions,privateDevice:{x:50,y:50}}},
   {...bench,positions:Object.fromEntries(Object.entries(bench.positions).filter(([id])=>id!==nodeId))},
   {...bench,ports:[{command:'fetch(private-data)'}]},
   {disconnected:[]},
   ...[Infinity,NaN,-1,89,'50',null].map(x=>({...bench,positions:{...bench.positions,[nodeId]:{x,y:25}}})),
   ...[17,83,'25',null].map(y=>({...bench,positions:{...bench.positions,[nodeId]:{x:50,y}}})),
   {...bench,positions:{...bench.positions,[nodeId]:{x:50,y:25,studentEmail:'private@example.test'}}}
  ];
  for(const malformed of malformedBenches){
   assert.throws(()=>validate({...initial,state:{...initial.state,networkBench:malformed}},scenario.id),error=>error.status===400);
  }
  for(const [x,y] of [[12,18],[88,82]]){
   const bounded={...initial,state:{...initial.state,networkBench:{...bench,positions:{...bench.positions,[nodeId]:{x,y}}}}};
   assert.deepEqual(JSON.parse(validate(bounded,scenario.id)),bounded,'exact accepted coordinate limits remain saveable');
  }
 }
});
