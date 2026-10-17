import test from 'node:test';
import assert from 'node:assert/strict';
import { initialHardwareState, applyHardwareAction, getHardwareReadouts, renderHardware, verifyHardware } from '../src/hardware.js';

// Exercise the delegated controls and the actual equipment model together.
// Browser QA still verifies native button activation, layout, and focus.
function bench(caseId) {
  let state=initialHardwareState(caseId);
  const actions=[];
  const root={ownerDocument:{activeElement:null},contains:element=>!!element,querySelector:()=>null,querySelectorAll:()=>[],innerHTML:''};
  const render=()=>renderHardware(root,caseId,state,action=>{
    actions.push(action);
    state=applyHardwareAction(caseId,state,action).state;
    render();
  });
  function target(dataset,svg=false) {
    const node={dataset,disabled:false};
    node.closest=selector=>{
      if(selector.startsWith('g')&&!svg)return null;
      return Object.entries({hwCable:'[data-hw-cable]',hwConnector:'[data-hw-connector]',hwDiagnostic:'[data-hw-diagnostic]',hwAction:'[data-hw-action]'}).some(([key,attribute])=>Object.hasOwn(dataset,key)&&selector.endsWith(attribute))?node:null;
    };
    return node;
  }
  function click(dataset) { root.onclick({target:target(dataset),stopPropagation(){}}); }
  function key(dataset,pressed='Enter') { root.onkeydown({target:target(dataset,true),key:pressed,preventDefault(){},stopPropagation(){}}); }
  render();
  return {root,actions,click,key,get state(){return state;}};
}

test('all six hardware benches expose physical socket controls and read-only model instruments',()=>{
  for(const caseId of ['INC-101','INC-102','INC-103','INC-104','INC-105','INC-106']) {
    const current=bench(caseId);
    assert.match(current.root.innerHTML,/Pick up display cable/);
    assert.match(current.root.innerHTML,/data-hw-connector="board"/);
    assert.match(current.root.innerHTML,/data-hw-connector="gpu"/);
    assert.match(current.root.innerHTML,/aria-label="Virtual diagnostic tools"/);
    assert.match(current.root.innerHTML,/No dragging is needed/);
    assert.equal((current.root.innerHTML.match(/data-hw-diagnostic=/g)||[]).length,4);
    assert.deepEqual(current.state,initialHardwareState(caseId));
    assert.deepEqual(current.actions,[]);
  }
});

test('picking up and putting down a display cable makes no equipment or saved-work change',()=>{
  const current=bench('INC-101');
  const before=structuredClone(current.state);
  current.click({hwCable:'pickup'});
  assert.match(current.root.innerHTML,/Cable held · choose a video socket/);
  assert.match(current.root.innerHTML,/class="[^"]*\bhw-canvas\b[^"]*\bhw-canvas-cable-held\b[^"]*"/);
  assert.match(current.root.innerHTML,/data-hw-cable="cancel"/);
  assert.deepEqual(current.state,before);
  assert.deepEqual(current.actions,[]);
  current.click({hwCable:'cancel'});
  assert.match(current.root.innerHTML,/data-hw-cable="pickup"/);
  assert.deepEqual(current.state,before);
  assert.deepEqual(current.actions,[]);
});

test('tap a socket to inspect; hold the cable and tap a socket to change the real signal route',()=>{
  const current=bench('INC-101');
  current.click({hwConnector:'gpu'});
  assert.equal(current.actions.at(-1),'inspect-gpu');
  assert.equal(current.state.videoPort,'board');
  current.click({hwCable:'pickup'});
  current.click({hwConnector:'gpu'});
  assert.equal(current.actions.at(-1),'video-gpu');
  assert.equal(current.state.videoPort,'gpu');
  assert.equal(getHardwareReadouts('INC-101',current.state).display.value,'Classroom desktop visible');
  assert.equal(verifyHardware('INC-101',current.state).ok,false,'Cable correction must not deliver the unopened lesson');
  current.click({hwCable:'pickup'});
  current.click({hwConnector:'board'});
  assert.equal(current.actions.at(-1),'video-board');
  assert.equal(getHardwareReadouts('INC-101',current.state).display.value,'No video signal');
});

test('the pictured sockets accept both Enter and Space through the same equipment actions',()=>{
  const current=bench('INC-101');
  current.key({hwConnector:'board'});
  assert.equal(current.actions.at(-1),'inspect-rear');
  current.click({hwCable:'pickup'});
  current.key({hwConnector:'gpu'},' ');
  assert.equal(current.actions.at(-1),'video-gpu');
  assert.equal(current.state.videoPort,'gpu');
  current.click({hwCable:'pickup'});
  current.key({hwConnector:'board'},'Enter');
  assert.equal(current.actions.at(-1),'video-board');
});

test('a cable cannot connect to an unfitted card and diagnostic tools cannot bypass internal-work safety',()=>{
  const build=bench('INC-106');
  build.click({hwCable:'pickup'});
  assert.match(build.root.innerHTML,/EMPTY EXPANSION SLOT/,'An unbuilt workstation must not show imaginary graphics-card ports');
  assert.doesNotMatch(build.root.innerHTML,/DEDICATED GPU · VIDEO OUTPUTS/);
  build.click({hwConnector:'gpu'});
  assert.equal(build.state.videoPort,'board');
  assert.equal(build.state.gpuInstalled,false);
  const memory=bench('INC-103');
  for(const tool of ['power','startup','storage','display'])memory.click({hwDiagnostic:tool});
  assert.equal(memory.state.ramSeated,false);
  assert.equal(memory.state.bootCount,0);
  assert.equal(memory.state.pcOn,true);
  assert.equal(memory.state.acConnected,true);
  assert.ok(memory.actions.every(action=>action.startsWith('inspect-')));
  assert.equal(applyHardwareAction('INC-103',memory.state,'seat-ram').kind,'warning');
  assert.equal(verifyHardware('INC-103',memory.state).ok,false);
});

test('instruments follow the actual repair, boot test and original-file result without mutating the model',()=>{
  let state=initialHardwareState('INC-103');
  const before=structuredClone(state);
  assert.equal(getHardwareReadouts('INC-103',state).startup.value,'Stopped at memory check');
  assert.deepEqual(state,before);
  for(const action of ['power-off','unplug','seat-ram'])state=applyHardwareAction('INC-103',state,action).state;
  let readouts=getHardwareReadouts('INC-103',state);
  assert.equal(readouts.power.value,'AC disconnected');
  assert.equal(readouts.startup.value,'PC off · not running');
  assert.equal(readouts.display.value,'PC off · no signal');
  for(const action of ['plug-in','boot'])state=applyHardwareAction('INC-103',state,action).state;
  readouts=getHardwareReadouts('INC-103',state);
  assert.equal(readouts.startup.value,'Original OS loaded');
  assert.match(readouts.startup.detail,/Tests attempted: 1/);
  assert.equal(readouts.display.value,'Classroom desktop visible');
  state=applyHardwareAction('INC-103',state,'open-document').state;
  assert.equal(getHardwareReadouts('INC-103',state).display.value,'Original lesson file open');
  assert.equal(verifyHardware('INC-103',state).ok,true);
});

test('storage instruments distinguish data, power, missing original drive, and observed boot success',()=>{
  const missingData=getHardwareReadouts('INC-104',initialHardwareState('INC-104'));
  assert.equal(missingData.storage.value,'SATA data disconnected');
  assert.equal(missingData.startup.value,'No boot device');
  assert.equal(getHardwareReadouts('INC-105',initialHardwareState('INC-105')).storage.value,'Original SSD not fitted');
  const state={...initialHardwareState('INC-104'),sataDataConnected:true,sataPowerConnected:false};
  assert.equal(getHardwareReadouts('INC-104',state).storage.value,'SATA power disconnected');
  assert.match(getHardwareReadouts('INC-104',state).storage.detail,/do not prove that the OS starts/);
});

test('held cables and selected instruments do not leak between bench roots or case changes',()=>{
  const a=bench('INC-101'),b=bench('INC-101');
  a.click({hwCable:'pickup'});
  b.click({hwConnector:'gpu'});
  assert.equal(b.state.videoPort,'board');
  assert.equal(b.actions.at(-1),'inspect-gpu');
  renderHardware(a.root,'INC-103',initialHardwareState('INC-103'),()=>{});
  assert.match(a.root.innerHTML,/data-hw-cable="pickup"/);
  assert.doesNotMatch(a.root.innerHTML,/hw-canvas-cable-held/);
});
