import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {normalizeLabRecord} from '../src/records.js';
import {normalizeWorkCollection} from '../src/local-work.js';
import {answerQuestion,questionEvent,inquiryProgress} from '../src/interview.js';

for(const scenario of SCENARIOS.filter(s=>s.intake?.kind==='follow-up')){
  test(`${scenario.id}: an older completion without clarification reopens without losing work`,()=>{
    const saved={closed:true,verified:true,plan:'My earlier explanation.',notes:'My original test notes.',reflection:'What I learned.',questions:[0],evidence:[scenario.clues[0].id],events:[]};
    const before=structuredClone(saved),record=normalizeLabRecord(scenario,saved);
    assert.equal(record.closed,false);assert.equal(record.verified,true);
    for(const key of ['plan','notes','reflection','questions','evidence'])assert.deepEqual(record[key],saved[key]);
    assert.deepEqual(saved,before,'Loading must not mutate saved input.');
    const collection=normalizeWorkCollection(SCENARIOS,{version:2,labs:{[scenario.id]:saved}});
    assert.equal(Object.values(collection.labs).filter(r=>r.closed).length,0,'The library must not count the old incomplete record as delivered.');
    const question=scenario.questions[0].label,event=questionEvent(question,answerQuestion(scenario,question));
    const completed=normalizeLabRecord(scenario,{...saved,events:[event]});
    assert.equal(inquiryProgress(scenario,completed.events).complete,true);assert.equal(completed.closed,true);
    assert.equal(normalizeLabRecord(scenario,completed).closed,true,'Resuming valid work retains completion.');
  });
}

test('detailed requests and non-ticket activities keep existing completion without a question quota',()=>{
  for(const scenario of SCENARIOS.filter(s=>s.intake?.kind!=='follow-up')){
    const record=normalizeLabRecord(scenario,{closed:true,verified:true,events:[]});
    assert.equal(record.closed,true,scenario.id);assert.equal(record.verified,true,scenario.id);
  }
});
