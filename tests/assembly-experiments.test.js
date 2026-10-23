import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/scenarios.js';
import { initialHardwareState, applyHardwareAction, normalizeHardwareState, verifyHardware } from '../src/hardware.js';
import { observationSnapshot, formatExperimentObservations, setExperimentDraft, startExperiment, captureExperimentResult, readExperiments, saveExperiment, experimentReport } from '../src/experiments.js';
import { normalizeLabRecord, workbenchProgress } from '../src/records.js';
const scenario=SCENARIOS.find(s=>s.id==='INC-106');
test('every mechanical build step changes bounded observation evidence, including individual screw positions',()=>{
  let state=applyHardwareAction(scenario.id,initialHardwareState(scenario.id),'enable-assembly').state;
  const actions=['asm-fit-psu',...[0,1,2,3].map(i=>`asm-tighten-psu-${i}`),'asm-fit-board',...[0,1,2,3].map(i=>`asm-tighten-board-${i}`),'asm-fit-cpu','asm-close-retention','asm-apply-paste','asm-fit-cooler',...[0,3,1,2].map(i=>`asm-tighten-cooler-${i}`),'asm-connect-cpu-fan','asm-fit-ram','asm-close-ram-clips','asm-fit-gpu','asm-close-pcie-latch','asm-tighten-gpu-0','asm-tighten-gpu-1','asm-fit-ssd','asm-tighten-ssd-0','asm-tighten-ssd-1','asm-connect-atx','asm-connect-eps','asm-connect-gpu-power','asm-connect-sata-data','asm-connect-sata-power','asm-connect-front-panel','asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1'];
  for(const action of actions){const before=observationSnapshot(scenario,state);const result=applyHardwareAction(scenario.id,state,action);assert.equal(result.kind,'success',action+': '+result.message);state=result.state;const after=observationSnapshot(scenario,state);assert.notDeepEqual(after,before,action+' lost from observations');assert.equal(after.length,6);assert.ok(after.every(([label,value])=>label.length<=32&&value.length<=40));}
});
test('mechanical-only experiments preserve distinct before/after rows through event packing and saved records',()=>{
  const s=SCENARIOS.find(s=>s.id==='INC-101');
  let state=initialHardwareState(s.id);
  for(const action of ['enable-assembly','power-off','unplug'])state=applyHardwareAction(s.id,state,action).state;
  const record=normalizeLabRecord(s,{state});
  setExperimentDraft(s,record,{predict:'Removing one panel screw should change its secured position.',evidence:'The parts view shows both panel screws are secured.'});
  assert.equal(startExperiment(s,record,state).ok,true);
  const before=observationSnapshot(s,state);
  state=applyHardwareAction(s.id,state,'asm-loosen-panel-0').state;
  captureExperimentResult(s,record,state);
  const restored=normalizeLabRecord(s,JSON.parse(JSON.stringify({...record,state})));
  const draft=readExperiments(restored).draft;
  assert.deepEqual(draft.before,before);
  assert.deepEqual(draft.after,observationSnapshot(s,state));
  assert.notDeepEqual(draft.before,draft.after);
  setExperimentDraft(s,restored,{changed:'I removed panel screw one.',observed:'Its secured position changed from one to zero.',explain:'The case still needs its other screw removed before opening.'});
  assert.equal(saveExperiment(s,restored).ok,true);
  assert.match(experimentReport(restored),/01\/1111\/1111\/1111\/11\/11/);
  assert.ok(restored.events.every(e=>e.message.length<=600));
});
test('null or absent mechanics in an enabled saved draft never synthesize completed assembly',()=>{
  for(const id of ['INC-101','INC-106'])for(const assembly of [null,undefined]){
    const fabricated={...initialHardwareState('INC-101'),assemblyEnabled:true,assembly,caseId:id,videoPort:'gpu',booted:true,documentOpened:true};
    const state=normalizeHardwareState(id,fabricated);
    assert.equal(state.booted,false);assert.equal(state.documentOpened,false);assert.equal(verifyHardware(id,state).ok,false);assert.equal(state.assembly.psuInstalled,false);assert.ok(state.assembly.boardScrews.every(value=>value===false));
  }
});

test('both HDMI ends produce separate bounded experiment evidence and survive report packing',()=>{
  const s=SCENARIOS.find(item=>item.id==='INC-101');
  let state=initialHardwareState(s.id);
  for(const action of ['enable-assembly','video-gpu','open-document'])state=applyHardwareAction(s.id,state,action).state;
  const record=normalizeLabRecord(s,{state});
  setExperimentDraft(s,record,{predict:'Disconnecting the PC end will remove the picture while the monitor end remains fitted.',evidence:'The monitor has a picture while both signal cable ends are connected.'});
  assert.equal(startExperiment(s,record,state).ok,true);
  const before=observationSnapshot(s,state);
  state=applyHardwareAction(s.id,state,'disconnect-video').state;
  const pcLoose=observationSnapshot(s,state);
  assert.notDeepEqual(pcLoose,before);
  assert.match(pcLoose.at(-1)[1],/PCout MONin/);
  assert.equal(state.booted,true,'external HDMI work does not erase a running OS');
  assert.equal(state.documentOpened,false);
  captureExperimentResult(s,record,state);
  const restored=normalizeLabRecord(s,JSON.parse(JSON.stringify({...record,state})));
  assert.deepEqual(readExperiments(restored).draft.after,pcLoose);
  state=applyHardwareAction(s.id,state,'video-gpu').state;
  state=applyHardwareAction(s.id,state,'disconnect-signal').state;
  const monitorLoose=observationSnapshot(s,state);
  assert.match(monitorLoose.at(-1)[1],/PCin MONout/);
  assert.notDeepEqual(monitorLoose,pcLoose);
  assert.ok([...before,...pcLoose,...monitorLoose].every(([label,value])=>label.length<=32&&value.length<=40));
  assert.ok(restored.events.every(event=>event.message.length<=600));
  const ordinary=observationSnapshot(s,{...initialHardwareState(s.id),videoPort:'gpu',pcVideoConnected:false,documentOpened:true});
  assert.match(ordinary.find(([label])=>label==='Display signal path')[1],/PC out \/ MON in/);
  assert.match(ordinary.find(([label])=>label==='Startup and document')[1],/document closed/);
});

test('retired preview monitor power fields do not change saved observations or successful current-test credit',()=>{
  const s=SCENARIOS.find(item=>item.id==='INC-107');
  for(const detailed of [false,true]){
    let state=initialHardwareState(s.id);
    for(const action of [...(detailed?['enable-assembly']:[]),'input-hdmi','open-document'])state=applyHardwareAction(s.id,state,action).state;
    const previousPreview={...state,monitorOn:false};
    assert.deepEqual(observationSnapshot(s,previousPreview),observationSnapshot(s,state));
    const record=normalizeLabRecord(s,{state:previousPreview,verified:true});
    setExperimentDraft(s,record,{predict:'Selecting HDMI should restore the desktop picture.',evidence:'The cable is attached to the monitor HDMI socket.'});
    startExperiment(s,record,state);captureExperimentResult(s,record,state);
    setExperimentDraft(s,record,{changed:'I selected HDMI.',observed:'The original lesson file opened.',explain:'The selected input now matches the fitted cable.'});
    assert.equal(saveExperiment(s,record).ok,true);
    assert.equal(workbenchProgress(s,record,verifyHardware(s.id,record.state)).ready,true);
    const restored=normalizeLabRecord(s,JSON.parse(JSON.stringify({...record,state:previousPreview})));
    assert.equal(Object.hasOwn(restored.state,'monitorOn'),false);assert.equal(workbenchProgress(s,restored,verifyHardware(s.id,restored.state)).ready,true);
    assert.doesNotMatch(JSON.stringify(formatExperimentObservations(readExperiments(restored).attempts.at(-1).after)),/Monitor power|MOff|MOn/);
  }
});
