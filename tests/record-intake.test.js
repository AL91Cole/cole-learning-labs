import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {normalizeLabRecord} from '../src/records.js';
import {normalizeWorkCollection} from '../src/local-work.js';
import {answerQuestion,questionEvent,inquiryProgress} from '../src/interview.js';
import {initialHardwareState,applyHardwareAction,verifyHardware} from '../src/hardware.js';
import {initialCodingState,applyCodingAction,verifyCoding} from '../src/coding-lab.js';

// These tests concern clarification and question quotas. Retained hardware
// completion must start from equipment actually delivered through public actions.
function deliveredHardware(id){
  const repairs={
    'INC-101':['video-gpu'],'INC-102':['connect-atx','plug-in','boot'],
    'INC-103':['power-off','unplug','seat-ram','plug-in','boot'],
    'INC-104':['power-off','unplug','connect-sata','connect-sata-power','plug-in','boot'],
    'INC-105':['power-off','unplug','install-original','connect-sata','connect-sata-power','plug-in','boot'],
    'INC-106':['install-board','install-cpu','install-cooler','install-ram','install-gpu','install-drive','connect-atx','connect-cpu-power','connect-gpu-power','connect-sata','connect-sata-power','connect-front-panel','video-gpu','plug-in','boot'],
    'INC-107':['input-hdmi'],'INC-108':['connect-signal','input-hdmi']
  };
  let state=initialHardwareState(id);
  for(const action of [...repairs[id],'open-document']){
    const result=applyHardwareAction(id,state,action);
    if(id==='INC-108'&&action==='connect-signal') {
      assert.equal(result.state.signalConnected,true);
      assert.equal(result.state.monitorInput,'displayport');
      assert.equal(verifyHardware(id,result.state).ok,false,'One repaired connection does not complete the two-fault ticket.');
    } else assert.notEqual(result.kind,'warning',`${id}: ${action}: ${result.message}`);
    state=result.state;
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
    const completed=normalizeLabRecord(scenario,{...saved,symptoms:'The reported task does not work as expected.',ideaSaved:true,events:[event]});
    assert.equal(inquiryProgress(scenario,completed.events).complete,true);assert.equal(completed.closed,true);
    assert.equal(normalizeLabRecord(scenario,completed).closed,true,'Resuming valid work retains completion.');
  });
}

function deliveredCoding(id){
  const programs={
    'CODE-501':'print(quantity * 3);',
    'CODE-502':'if (temperature < 20) { print("Heating"); } else if (temperature <= 25) { print("Comfortable"); } else { print("Cooling"); }',
    'CODE-503':'for (let n = 1; n <= stations; n++) { print("Ready " + n); }',
    'CODE-504':'print("Energy " + snacks * 4);',
    'CODE-505':'if (points < 50) { print("Try again"); } else if (points < 100) { print("Sticker"); } else { print("Badge"); }',
    'CODE-506':'let total = 0; for (let n = 1; n <= steps; n++) { total = total + n; } print(total);'
  };
  let state=applyCodingAction(id,initialCodingState(id),'save-code',{code:programs[id]}).state;
  state=applyCodingAction(id,state,'run-check').state;
  assert.equal(verifyCoding(id,state).ok,true,id);
  return state;
}

test('detailed requests retain completion with reviewed first-idea writing',()=>{
  for(const scenario of SCENARIOS.filter(s=>s.intake?.kind!=='follow-up')){
    const record=normalizeLabRecord(scenario,{closed:true,verified:true,symptoms:'The reported task does not work as expected.',plan:'I will compare the clues with the reported behavior.',ideaSaved:true,events:[],...(scenario.track==='hardware'?{state:deliveredHardware(scenario.id)}:scenario.track==='coding'?{state:deliveredCoding(scenario.id)}:{})});
    assert.equal(record.closed,true,scenario.id);assert.equal(record.verified,true,scenario.id);
  }
});
