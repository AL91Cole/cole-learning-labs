import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {createWorkStorage, normalizeWorkCollection, hasPrivateWork, WORK_PREFIX, CLEAR_WORK_KEY} from '../src/local-work.js';
import {normalizeLabRecord} from '../src/records.js';
const sample = () => ({version:2,labs:{'INC-101':{notes:'Fictional investigation notes',state:{}}}});
function storage() {
  const data = new Map();
  return {data,get length(){return data.size;},key(i){return [...data.keys()][i]??null;},getItem(k){return data.get(k)??null;},setItem(k,v){data.set(k,v);},removeItem(k){data.delete(k);}};
}
test('clue-only and question-only investigations count as private work that should warn before leaving', () => {
  for (const scenario of SCENARIOS) {
    const clueOnly = normalizeLabRecord(scenario, { evidence: [scenario.clues[0].id] });
    assert.equal(hasPrivateWork(clueOnly), true, `${scenario.id}: collected clue`);
    const questionOnly = normalizeLabRecord(scenario, { questions: [0] });
    assert.equal(hasPrivateWork(questionOnly), true, `${scenario.id}: first question at index zero`);
  }
});
test('opening each default lab does not trigger a private-work warning', () => {
  for (const scenario of SCENARIOS) {
    const record = normalizeLabRecord(scenario);
    assert.ok(Object.keys(record.state).length > 0, `${scenario.id}: nonempty initial simulation state`);
    assert.equal(hasPrivateWork(record), false, `${scenario.id}: no learner actions yet`);
  }
});
test('learner writing, action history, verification, and ticket delivery each count as private work', () => {
  for (const record of [{ symptoms: 'No lights or fans.' }, { plan: 'A fictional explanation' }, { notes: 'Observed virtual power' }, { reflection: 'Check the original task' }, { events: [{ message: 'Moved virtual cable' }] }, { verified: true }, { closed: true }]) {
    assert.equal(hasPrivateWork(record), true);
  }
});
test('private-work detection is pure and ignores malformed, blank, and false completion values', () => {
  const record = Object.freeze({ state: Object.freeze({ initialized: true }), evidence: Object.freeze([]), questions: Object.freeze([]), events: Object.freeze([]), plan: '', notes: '', reflection: '', verified: false, closed: false });
  assert.equal(hasPrivateWork(record), false);
  for (const value of [null, undefined, [], 'text', { evidence: [null, ' '] }, { questions: [null, -1, '0'] }, { events: [{ message: ' ' }] }, { notes: ' \n ', verified: 'true', closed: 'false' }]) assert.equal(hasPrivateWork(value), false);
});
test('private session is default and neither reads nor writes saved work automatically', () => {
  let calls=0;
  const manager=createWorkStorage({storage:{getItem(){calls++;throw Error();},setItem(){calls++;throw Error();}},key:WORK_PREFIX,scenarios:SCENARIOS});
  assert.equal(manager.persistent,false); assert.equal(manager.save(sample()),true); assert.equal(calls,0);
});
test('explicit saving and resuming preserve legitimate work while removing unknown identity fields and labs', () => {
  const disk=storage(), manager=createWorkStorage({storage:disk,key:WORK_PREFIX,scenarios:SCENARIOS});
  const value=sample();value.email='fictional@example.invalid';value.labs['INC-101'].studentName='Fictional name';value.labs['INC-101'].state.email='fictional@example.invalid';value.labs['unknown']={studentId:'fictional-id'};
  assert.equal(manager.enable(value),true); assert.equal(manager.persistent,true);
  const raw=disk.getItem(WORK_PREFIX); assert.ok(!raw.includes('example.invalid')&&!raw.includes('Fictional name')&&!raw.includes('fictional-id'));
  const next=createWorkStorage({storage:disk,key:WORK_PREFIX,scenarios:SCENARIOS});
  assert.equal(next.persistent,false);assert.equal(next.hasSaved(),true);
  const restored=next.resume();assert.equal(restored.labs['INC-101'].notes,'Fictional investigation notes');assert.equal(next.persistent,true);
  next.pause();const before=disk.getItem(WORK_PREFIX);next.save({version:2,labs:{}});assert.equal(disk.getItem(WORK_PREFIX),before);
});
test('clear-all removes every lab namespace and classroom selection, preserving unrelated storage', () => {
  const disk=storage();
  for(const key of [WORK_PREFIX,WORK_PREFIX+':classroom:class:student','cole-learning-labs:classroom:v1','unrelated'])disk.setItem(key,'fictional');
  const manager=createWorkStorage({storage:disk,key:WORK_PREFIX,scenarios:SCENARIOS});assert.equal(manager.clearAll(),true);
  assert.deepEqual([...disk.data.keys()].sort(),[CLEAR_WORK_KEY,'unrelated'].sort());assert.match(disk.getItem(CLEAR_WORK_KEY),/^\d+$/);assert.equal(manager.persistent,false);
});
test('malformed or denied storage never activates persistence or breaks private practice', () => {
  const disk=storage();disk.setItem(WORK_PREFIX,'{');const manager=createWorkStorage({storage:disk,key:WORK_PREFIX,scenarios:SCENARIOS});
  assert.equal(manager.resume(),null);assert.equal(manager.persistent,false);
  const blocked=createWorkStorage({key:WORK_PREFIX,scenarios:SCENARIOS,storage:{setItem(){throw Error('blocked');}}});assert.equal(blocked.enable(sample()),false);assert.equal(blocked.persistent,false);assert.equal(blocked.save(sample()),true);
  assert.deepEqual(normalizeWorkCollection(SCENARIOS,{version:2,labs:[]}),{version:2,labs:{}});
  assert.throws(()=>createWorkStorage({storage:disk,key:'other-site-data',scenarios:SCENARIOS}),/scope/);
});

test('saved first-idea answers survive explicit device saving, JSON export and resume without sharing identity fields', () => {
  const scenario=SCENARIOS.find(item=>item.id==='INC-102');
  const draft={symptoms:'The desktop has no lights or fan noise.',plan:'I think the desktop is not receiving power.',ideaSaved:true,studentName:'Do not retain',state:{}};
  const before=structuredClone(draft),disk=storage();
  const manager=createWorkStorage({storage:disk,key:WORK_PREFIX,scenarios:SCENARIOS});
  assert.equal(manager.enable({version:2,labs:{[scenario.id]:draft}}),true);
  const exported=JSON.parse(disk.getItem(WORK_PREFIX));
  const restored=normalizeWorkCollection(SCENARIOS,exported).labs[scenario.id];
  assert.equal(restored.symptoms,draft.symptoms);assert.equal(restored.plan,draft.plan);assert.equal(restored.ideaSaved,true);
  assert.equal(Object.hasOwn(restored,'studentName'),false);assert.deepEqual(draft,before);
  const next=createWorkStorage({storage:disk,key:WORK_PREFIX,scenarios:SCENARIOS});
  assert.deepEqual(next.resume().labs[scenario.id],restored);
});

test('first-idea normalization preserves legacy writing but rejects malformed answers and false saved credit', () => {
  const scenario=SCENARIOS.find(item=>item.id==='NET-202');
  const legacy=normalizeLabRecord(scenario,{plan:'Keep the earlier working hypothesis.',notes:'Keep previous test notes.',verified:true,closed:true});
  assert.equal(legacy.symptoms,'');assert.equal(legacy.ideaSaved,false);assert.equal(legacy.closed,false);assert.equal(legacy.verified,true);
  assert.equal(legacy.plan,'Keep the earlier working hypothesis.');assert.equal(legacy.notes,'Keep previous test notes.');
  for(const input of [
    {symptoms:{html:'<script>'},plan:'A long enough hypothesis.',ideaSaved:true},
    {symptoms:'The display is blank.',plan:['A long enough hypothesis.'],ideaSaved:true},
    {symptoms:'The display is blank.',plan:'A long enough hypothesis.',ideaSaved:'true'},
    {symptoms:'            ',plan:'A long enough hypothesis.',ideaSaved:true},
    {symptoms:'The display is blank.',plan:'too short',ideaSaved:true}
  ]) {
    const record=normalizeLabRecord(scenario,{...input,closed:true});
    assert.equal(record.ideaSaved,false);assert.equal(record.closed,false);
  }
  const bounded=normalizeLabRecord(scenario,{symptoms:'s'.repeat(2200),plan:'p'.repeat(2200),ideaSaved:true});
  assert.equal(bounded.symptoms.length,2000);assert.equal(bounded.plan.length,2000);assert.equal(bounded.ideaSaved,true);
});
