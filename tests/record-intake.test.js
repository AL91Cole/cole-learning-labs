import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {normalizeLabRecord} from '../src/records.js';
import {normalizeWorkCollection} from '../src/local-work.js';
import {answerQuestion,questionEvent,inquiryProgress} from '../src/interview.js';
import {initialHardwareState,applyHardwareAction,verifyHardware} from '../src/hardware.js';

// These tests concern clarification and question quotas. Retained hardware
// completion must start from equipment actually delivered through public actions.
function deliveredHardware(id){
  const repairs={
    'INC-101':['video-gpu'],'INC-102':['plug-in','boot'],
    'INC-103':['power-off','unplug','seat-ram','plug-in','boot'],
    'INC-104':['power-off','unplug','connect-sata','plug-in','boot'],
    'INC-105':['power-off','unplug','install-original','connect-sata','connect-sata-power','plug-in','boot'],
    'INC-106':['install-board','install-cpu','install-cooler','install-ram','install-gpu','install-drive','connect-atx','connect-cpu-power','connect-gpu-power','connect-sata','connect-sata-power','connect-front-panel','video-gpu','plug-in','boot'],
    'INC-107':['input-hdmi'],'INC-108':['connect-signal']
  };
  let state=initialHardwareState(id);
  for(const action of [...repairs[id],'open-document']){
    const result=applyHardwareAction(id,state,action);
    assert.notEqual(result.kind,'warning',`${id}: ${action}: ${result.message}`);state=result.state;
  }
  assert.equal(verifyHardware(id,state).ok,true,id);
  return state;
}

for(const scenario of SCENARIOS.filter(s=>s.intake?.kind==='follow-up')){
  test(`${scenario.id}: an older completion without clarification reopens without losing work`,()=>{
    const saved={closed:true,verified:true,plan:'My earlier explanation.',notes:'My original test notes.',reflection:'What I learned.',questions:[0],evidence:[scenario.clues[0].id],events:[],...(scenario.track==='hardware'?{state:deliveredHardware(scenario.id)}:{})};
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
    const record=normalizeLabRecord(scenario,{closed:true,verified:true,events:[],...(scenario.track==='hardware'?{state:deliveredHardware(scenario.id)}:{})});
    assert.equal(record.closed,true,scenario.id);assert.equal(record.verified,true,scenario.id);
  }
});
