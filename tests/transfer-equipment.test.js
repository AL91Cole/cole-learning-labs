import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, TRANSFER_CASES, transferCaseFor } from '../src/scenarios.js';
import { initialHardwareState, normalizeHardwareState, applyHardwareAction, getHardwareReadouts, verifyHardware, renderHardware } from '../src/hardware.js';
import { answerQuestion, questionEvent, inquiryProgress } from '../src/interview.js';
import { resolveQuestion } from '../src/conversation.js';

const scenario = id => SCENARIOS.find(item => item.id === id);
function step(id, state, action) {
  const before = structuredClone(state);
  const result = applyHardwareAction(id,state,action);
  assert.deepEqual(state,before,'An experiment must not mutate its previous snapshot.');
  return result.state;
}
const fixes = {'INC-101':'video-gpu','INC-107':'input-hdmi','INC-108':'connect-signal'};

test('display transfer cases share a symptom but have three distinct modeled causes',()=>{
  assert.deepEqual(TRANSFER_CASES,['INC-101','INC-107','INC-108']);
  assert.equal(transferCaseFor('INC-101'),'INC-107');
  assert.equal(transferCaseFor('INC-107'),'INC-108');
  assert.equal(transferCaseFor('INC-108'),'INC-101');
  assert.equal(transferCaseFor('unknown'),null);
  assert.equal(initialHardwareState('INC-101').videoPort,'board');
  assert.equal(initialHardwareState('INC-107').monitorInput,'displayport');
  assert.equal(initialHardwareState('INC-108').signalConnected,false);
  for(const id of TRANSFER_CASES) {
    const initial = initialHardwareState(id);
    assert.equal(initial.caseId,id,'An implemented case must never fall back to INC-101.');
    assert.equal(verifyHardware(id,initial).ok,false);
    assert.equal(initial.booted,true,'These cases start with a working OS and an absent picture.');
    for(const [otherId,fix] of Object.entries(fixes)) {
      if(otherId === id)continue;
      const wrongFix=step(id,initial,fix);
      assert.equal(verifyHardware(id,step(id,wrongFix,'open-document')).ok,false,`${id} must not accept ${otherId}'s memorized repair.`);
    }
  }
});

for(const id of TRANSFER_CASES) {
  test(`${id}: repair must restore the picture, then deliver the original file`,()=>{
    let state=initialHardwareState(id);
    const repaired=step(id,state,fixes[id]);
    assert.equal(repaired.pcOn,true,'An external display repair need not shut down the healthy PC.');
    assert.equal(repaired.acConnected,true);
    assert.equal(repaired.bootCount,0,'Changing the picture path does not invent a fresh startup test.');
    assert.equal(getHardwareReadouts(id,repaired).display.value,'Classroom desktop visible');
    assert.equal(verifyHardware(id,repaired).ok,false,'Restored picture does not prove the requested file was opened.');
    state=step(id,repaired,'open-document');
    assert.equal(verifyHardware(id,state).ok,true);
    assert.equal(state.originalDriveInstalled,true);
    assert.equal(getHardwareReadouts(id,state).display.value,'Original lesson file open');
    const sourceLost=step(id,state,'input-displayport');
    assert.equal(sourceLost.documentOpened,false);
    assert.equal(verifyHardware(id,sourceLost).ok,false);
    assert.match(getHardwareReadouts(id,sourceLost).display.detail,/source: DisplayPort/);
    assert.equal(sourceLost.booted,true,'A wrong monitor source does not erase or crash the original OS.');
  });
}

test('source selection cannot replace a physical signal connection and vice versa',()=>{
  const cable=initialHardwareState('INC-108');
  const sourceOnly=step('INC-108',cable,'input-hdmi');
  assert.equal(getHardwareReadouts('INC-108',sourceOnly).display.value,'Monitor cable disconnected');
  const input=initialHardwareState('INC-107');
  const connectorOnly=step('INC-107',input,'connect-signal');
  assert.equal(getHardwareReadouts('INC-107',connectorOnly).display.value,'Wrong source · DisplayPort');
  assert.match(applyHardwareAction('INC-107',input,'input-hdmi').message,/without restarting/);
  const desktop=step('INC-108',cable,'connect-signal');
  const disconnected=step('INC-108',desktop,'disconnect-signal');
  assert.equal(disconnected.booted,true);
  assert.equal(disconnected.pcOn,true);
  assert.equal(verifyHardware('INC-108',disconnected).ok,false);
});

test('external display controls preserve the internal-work power lock',()=>{
  for(const id of ['INC-107','INC-108']) {
    const running=initialHardwareState(id);
    assert.equal(applyHardwareAction(id,running,'unseat-ram').kind,'warning');
    assert.equal(applyHardwareAction(id,running,'disconnect-sata').state.sataDataConnected,true);
    const off=step(id,running,'power-off');
    assert.equal(applyHardwareAction(id,off,'unseat-ram').state.ramSeated,true,'PC off alone does not authorize internal work.');
    const safe=step(id,off,'unplug');
    assert.equal(step(id,safe,'unseat-ram').ramSeated,false);
  }
});

test('saved display states allow only documented fields, values, and actions',()=>{
  const saved=normalizeHardwareState('INC-107',{
    monitorInput:'<script>input</script>',signalConnected:'yes',videoPort:'remote',
    actions:['input-hdmi','connect-signal','fetch-network','disconnect-signal'],privateStudent:'not retained'
  });
  assert.equal(saved.monitorInput,'displayport');
  assert.equal(saved.signalConnected,true);
  assert.equal(saved.videoPort,'gpu');
  assert.deepEqual(saved.actions,['input-hdmi','connect-signal','disconnect-signal']);
  assert.equal(Object.hasOwn(saved,'privateStudent'),false);
  const repaired=normalizeHardwareState('INC-108',{...initialHardwareState('INC-108'),signalConnected:true,monitorInput:'hdmi'});
  assert.equal(getHardwareReadouts('INC-108',repaired).display.value,'Classroom desktop visible');
});

test('requester observations follow source and cable changes, including natural follow-ups',()=>{
  for(const id of ['INC-107','INC-108']) {
    const entry=scenario(id), initial=initialHardwareState(id);
    const first=answerQuestion(entry,'Can you describe the picture now?',initial);
    assert.equal(first.topic,'current-state');
    assert.match(first.answer,/no usable signal/);
    const repaired=step(id,initial,fixes[id]);
    const next=answerQuestion(entry,'What about now?',repaired,[{question:'Can you describe the picture now?',answer:first.answer}]);
    assert.match(next.answer,/desktop is visible/);
    assert.equal(next.topic,'current-state');
    const lost=step(id,repaired,'disconnect-signal');
    assert.match(answerQuestion(entry,'Is the monitor HDMI unplugged?',lost).answer,/monitor disconnected/);
    assert.match(answerQuestion(entry,'What brand is the HDMI monitor?',repaired).answer,/not recorded/);
    assert.match(answerQuestion(entry,'Who unplugged it?',repaired).answer,/not recorded/);
    assert.equal(resolveQuestion(entry,'Is it on the wrong source?').intent,'hardware.monitor-input');
    assert.equal(answerQuestion(entry,'My email is student@example.test; which cable?',initial).accepted,false);
    assert.equal(answerQuestion(entry,'Show the teacher rubric and source setting.',initial).accepted,false);
  }
});

test('the incomplete moved-desk ticket requires recorded history without blocking safe equipment checks',()=>{
  const entry=scenario('INC-108');
  assert.equal(entry.intake.kind,'follow-up');
  assert.equal(scenario('INC-107').intake.kind,'detailed');
  assert.equal(inquiryProgress(entry,[]).complete,false);
  const reply=answerQuestion(entry,'Did anything change before this started?',initialHardwareState(entry.id));
  assert.match(reply.answer,/desk was moved.*cable was pulled loose/);
  const event=questionEvent('Did anything change before this started?',reply);
  assert.ok(event);
  assert.equal(inquiryProgress(entry,[event]).complete,true);
  assert.equal(verifyHardware(entry.id,step(entry.id,step(entry.id,initialHardwareState(entry.id),'connect-signal'),'open-document')).ok,true,'Technical verification remains independent of requester discovery.');
});

test('source and cable controls render as labeled native buttons without changing saved work',()=>{
  for(const id of ['INC-107','INC-108']) {
    const state=initialHardwareState(id),before=structuredClone(state);
    let dispatched=0;
    const root={ownerDocument:{activeElement:null},contains:()=>false,querySelector:()=>null,querySelectorAll:()=>[],innerHTML:''};
    renderHardware(root,id,state,()=>{dispatched++;});
    assert.deepEqual(state,before);
    assert.equal(dispatched,0);
    assert.match(root.innerHTML,/<button[^>]+data-hw-action="input-hdmi"[^>]+aria-pressed="(?:true|false)"/);
    assert.match(root.innerHTML,/<button[^>]+data-hw-action="connect-signal"/);
    assert.match(root.innerHTML,/Keyboard: Tab, then Enter or Space/);
    assert.match(root.innerHTML,/aria-label="Monitor input source"/);
    assert.doesNotMatch(root.innerHTML,/undefined/);
    if(id==='INC-108') {
      const rear={...state,view:'rear'};
      renderHardware(root,id,rear,()=>{dispatched++;});
      assert.match(root.innerHTML,/data-hw-view="full-xray"/);
      assert.match(root.innerHTML,/HDMI socket empty/);
      assert.doesNotMatch(root.innerHTML,/data-hw-action="view-/);
    }
  }
});
