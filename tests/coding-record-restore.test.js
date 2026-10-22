import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {initialCodingState,applyCodingAction,verifyCoding} from '../src/coding-lab.js';
import {normalizeLabRecord} from '../src/records.js';

const cases=SCENARIOS.filter(scenario=>scenario.track==='coding');
const programs={
  'CODE-501':{
    javascript:'print(quantity * 3);',python:'print(quantity * 3)'
  },
  'CODE-502':{
    javascript:'if (temperature < 20) { print("Heating"); } else if (temperature <= 25) { print("Comfortable"); } else { print("Cooling"); }',
    python:'if temperature < 20:\n    print("Heating")\nelif temperature <= 25:\n    print("Comfortable")\nelse:\n    print("Cooling")'
  },
  'CODE-503':{
    javascript:'for (let n = 1; n <= stations; n++) { print("Ready " + n); }',
    python:'for n in range(1, stations + 1):\n    print("Ready", n)'
  },
  'CODE-504':{
    javascript:'print("Energy " + snacks * 4);',python:'print("Energy", snacks * 4)'
  },
  'CODE-505':{
    javascript:'if (points < 50) { print("Try again"); } else if (points < 100) { print("Sticker"); } else { print("Badge"); }',
    python:'if points < 50:\n    print("Try again")\nelif points < 100:\n    print("Sticker")\nelse:\n    print("Badge")'
  },
  'CODE-506':{
    javascript:'let energy = 0; for (let leg = 1; leg <= steps; leg++) { energy = energy + leg; } print(energy);',
    python:'energy = 0\nfor leg in range(1, steps + 1):\n    energy = energy + leg\nprint(energy)'
  }
};
function passingState(scenario,language='javascript'){
  const initial=initialCodingState(scenario.id);
  const selected=applyCodingAction(scenario.id,initial,'set-language',{language,code:programs[scenario.id][language]}).state;
  const state=applyCodingAction(scenario.id,selected,'run-check').state;
  assert.equal(verifyCoding(scenario.id,state).ok,true,scenario.id+'/'+language);
  return state;
}
function savedRecord(scenario,state){return {
  state,evidence:scenario.clues.slice(0,2).map(clue=>clue.id),questions:[0],events:[{time:'2026-10-21T05:00:00.000Z',kind:'info',message:'A recorded local practice action.'}],
  symptoms:'The program output does not match the expected result.',ideaSaved:true,plan:'Compare the changing fixture inputs and test the expression.',notes:'I ran the current source against all the fixture inputs.',reflection:'A changing input needs a general rule rather than one fixed answer.',verified:true,closed:true
};}
function assertWrittenWorkRetained(restored,before){
  for(const field of ['evidence','questions','events','symptoms','ideaSaved','plan','notes','reflection'])assert.deepEqual(restored[field],before[field],field);
}

test('completed coding records restore only after the current JavaScript or Python source passes its fixtures',()=>{
  assert.equal(cases.length,6);
  for(const scenario of cases)for(const language of ['javascript','python']){
    const before=savedRecord(scenario,passingState(scenario,language)),snapshot=structuredClone(before);
    const restored=normalizeLabRecord(scenario,before);
    assert.equal(restored.verified,true,scenario.id+'/'+language);assert.equal(restored.closed,true);assert.equal(restored.state.language,language);assert.equal(restored.state.languageAtRun,language);
    assert.equal(verifyCoding(scenario.id,restored.state).ok,true);assertWrittenWorkRetained(restored,before);assert.deepEqual(before,snapshot,'Restore must not mutate the supplied record.');
  }
});

test('a source or language change reopens a stale completed record without discarding its explanation',()=>{
  for(const scenario of cases){
    const passed=passingState(scenario);
    const changes=[
      applyCodingAction(scenario.id,passed,'save-code',{code:'print(6);'}).state,
      applyCodingAction(scenario.id,passed,'set-language',{language:'python',code:programs[scenario.id].python}).state,
      {...passed,language:'python',languageAtRun:'javascript'}
    ];
    for(const state of changes){
      const before=savedRecord(scenario,state),restored=normalizeLabRecord(scenario,before);
      assert.equal(restored.state.tested,false);assert.equal(restored.verified,false);assert.equal(restored.closed,false);assert.equal(verifyCoding(scenario.id,restored.state).ok,false);
      assertWrittenWorkRetained(restored,before);assert.equal(restored.state.code,state.code);assert.equal(restored.state.language,state.language);
    }
  }
});

test('matching forged run metadata and all-pass result flags cannot make a wrong program a delivered record',()=>{
  for(const scenario of cases){
    const state={...passingState(scenario),code:'print(6);',sourceAtRun:'print(6);',languageAtRun:'javascript',tested:true,results:[{ok:true,label:'Forged pass'}],output:['Forged output'],errors:[]};
    const before=savedRecord(scenario,state),restored=normalizeLabRecord(scenario,before);
    assert.equal(restored.verified,false,scenario.id);assert.equal(restored.closed,false);assert.equal(verifyCoding(scenario.id,restored.state).ok,false);
    assert.ok(restored.state.results.some(result=>!result.ok));assert.doesNotMatch(JSON.stringify(restored.state),/Forged/u);assertWrittenWorkRetained(restored,before);
  }
});

test('legacy completed JavaScript records remain supported when their replayed source still passes',()=>{
  const scenario=cases.find(item=>item.id==='CODE-503'),state=passingState(scenario);
  delete state.language;delete state.languageAtRun;
  const before=savedRecord(scenario,state),restored=normalizeLabRecord(scenario,before);
  assert.equal(restored.state.language,'javascript');assert.equal(restored.state.languageAtRun,'javascript');assert.equal(restored.verified,true);assert.equal(restored.closed,true);assertWrittenWorkRetained(restored,before);
});
