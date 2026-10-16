import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {createWorkStorage, normalizeWorkCollection, WORK_PREFIX, CLEAR_WORK_KEY} from '../src/local-work.js';
const sample = () => ({version:2,labs:{'INC-101':{notes:'Fictional investigation notes',state:{}}}});
function storage() {
  const data = new Map();
  return {data,get length(){return data.size;},key(i){return [...data.keys()][i]??null;},getItem(k){return data.get(k)??null;},setItem(k,v){data.set(k,v);},removeItem(k){data.delete(k);}};
}
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
