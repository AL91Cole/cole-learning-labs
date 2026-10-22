import test from 'node:test';
import assert from 'node:assert/strict';
import {CAPSTONE_STAGES,capstoneProgress,capstoneReport,capstoneHandoff,writeCapstoneHandoff,renderCapstone} from '../src/capstone.js';
import {SCENARIOS} from '../src/scenarios.js';
import {normalizeLabRecord} from '../src/records.js';
import {createWorkStorage,WORK_PREFIX,hasPrivateWork} from '../src/local-work.js';
import {setExperimentDraft,startExperiment,captureExperimentResult,saveExperiment,readExperiments,retainExperimentEvents} from '../src/experiments.js';
test('the capstone links five implemented pathways and never completes a work order itself',()=>{
  const tracks=new Set(CAPSTONE_STAGES.map(stage=>SCENARIOS.find(s=>s.id===stage.id)?.track));assert.equal(tracks.size,5);assert.ok(!tracks.has(undefined));
  const records={},before=structuredClone(records),view=renderCapstone(records,()=>({ok:true}));
  assert.deepEqual(records,before);assert.equal(capstoneProgress(records,()=>({ok:true})).filter(s=>s.verified).length,0);
  for(const stage of CAPSTONE_STAGES)assert.ok(view.includes(`#lab/${stage.id}?mode=independent&amp;sequence=opening-day`));
});
test('a saved completion needs a fresh actual check before appearing complete',()=>{
  const records=Object.fromEntries(CAPSTONE_STAGES.map(stage=>[stage.id,{verified:true,closed:true,state:{ready:stage.id!=='NET-201'}}]));
  assert.equal(capstoneProgress(records,(_id,state)=>({ok:state.ready})).filter(s=>s.explained).length,4);
  const report=capstoneReport(records,(_id,state)=>({ok:state.ready}));assert.match(report,/fresh check needed/);assert.match(report,/not a grade/);
});
test('bounded handoff follows the existing coding record and preserves unrelated notes',()=>{
  const scenario=SCENARIOS.find(s=>s.id==='CODE-503'),record=normalizeLabRecord(scenario,{notes:'Keep my earlier test notes',events:[{kind:'warning',message:'A failed test'}]});
  assert.equal(writeCapstoneHandoff(record,'__proto__','bad'),false);writeCapstoneHandoff(record,'works','a'.repeat(800));writeCapstoneHandoff(record,'evidence','Use fictional tests');
  const restored=normalizeLabRecord(scenario,JSON.parse(JSON.stringify(record)));assert.equal(capstoneHandoff(restored).works.length,480);assert.equal(restored.notes,'Keep my earlier test notes');assert.equal(restored.events[0].message,'A failed test');
  writeCapstoneHandoff(restored,'works','Updated');assert.equal(restored.events.filter(e=>e.message.startsWith('Capstone handoff / works: ')).length,1);
  const html=renderCapstone({'CODE-503':{events:[{message:'Capstone handoff / works: </textarea><script>alert(1)</script>'}]}},()=>({ok:false}));assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);
});

function fullCodingRecord() {
  const scenario=SCENARIOS.find(item=>item.id==='CODE-503'),record=normalizeLabRecord(scenario);
  for(let index=0;index<8;index++) {
    setExperimentDraft(scenario,record,{predict:`Prediction ${index}: the counter may be off by one.`,evidence:'The printed list starts at zero and includes an extra line.'});
    assert.equal(startExperiment(scenario,record,record.state).ok,true);
    setExperimentDraft(scenario,record,{changed:`Attempt ${index}: inspected the first counter value.`});
    assert.equal(captureExperimentResult(scenario,record,record.state).ok,true);
    setExperimentDraft(scenario,record,{observed:'The supplied output still has an extra line.',explain:'An unchanged result means this hypothesis needs another test.'});
    assert.equal(saveExperiment(scenario,record).ok,true);
  }
  for(let index=0;index<100;index++)record.events=retainExperimentEvents(scenario,[...record.events,{time:'2026-10-16T12:00:00Z',kind:'info',message:'Later inspection '+index}]);
  assert.equal(record.events.length,100);
  assert.equal(readExperiments(record).attempts.length,8);
  return record;
}

test('typing all four handoff fields keeps eight whole experiments at the 100-event boundary',()=>{
  const record=fullCodingRecord(),attempts=structuredClone(readExperiments(record).attempts);
  const fields={works:'The fictional work orders are ready for review.',evidence:'The supplied fixtures show the remaining boundary issue.',connection:'The checklist supports the classroom handoff.',uncertain:'I need one more counter-boundary test.'};
  for(const [key,value] of Object.entries(fields))for(let length=1;length<=value.length;length++) {
    assert.equal(writeCapstoneHandoff(record,key,value.slice(0,length)),true);
    assert.equal(record.events.length,100);
    assert.deepEqual(readExperiments(record).attempts,attempts,'A keystroke must not fragment an earlier saved experiment.');
  }
  assert.deepEqual(capstoneHandoff(record),fields);
  const restored=normalizeLabRecord(SCENARIOS.find(item=>item.id==='CODE-503'),JSON.parse(JSON.stringify(record)));
  assert.deepEqual(readExperiments(restored).attempts,attempts);
  assert.deepEqual(capstoneHandoff(restored),fields);
});

test('capstone handoff follows explicit saving, resume, and clear across the whole local collection',()=>{
  const values=new Map(),storage={get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  const record=fullCodingRecord();
  writeCapstoneHandoff(record,'works','Fictional opening-day handoff.');
  const store={version:2,labs:{'CODE-503':record,'NET-201':normalizeLabRecord(SCENARIOS.find(item=>item.id==='NET-201'),{notes:'Another fictional investigation.'})}};
  const manager=createWorkStorage({storage,key:WORK_PREFIX,scenarios:SCENARIOS});
  assert.equal(hasPrivateWork(record),true);
  assert.equal(manager.save(store),true);
  assert.equal(values.size,0,'Private capstone work must not silently enable device saving.');
  assert.equal(manager.enable(store),true);
  const returning=createWorkStorage({storage,key:WORK_PREFIX,scenarios:SCENARIOS});
  assert.equal(returning.persistent,false);
  const resumed=returning.resume();
  assert.equal(returning.persistent,true);
  assert.equal(capstoneHandoff(resumed.labs['CODE-503']).works,'Fictional opening-day handoff.');
  assert.equal(readExperiments(resumed.labs['CODE-503']).attempts.length,8);
  assert.equal(resumed.labs['NET-201'].notes,'Another fictional investigation.');
  assert.equal(returning.clearAll(),true);
  assert.equal(returning.persistent,false);
  assert.equal(values.has(WORK_PREFIX),false);
  const cleared=createWorkStorage({storage,key:WORK_PREFIX,scenarios:SCENARIOS});
  assert.equal(cleared.resume(),null,'Clear removes the capstone and all other saved lab records together.');
});
