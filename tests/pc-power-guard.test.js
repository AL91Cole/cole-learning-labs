import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {initialHardwareState,normalizeHardwareState,applyHardwareAction,verifyHardware,getHardwareReadouts} from '../src/hardware.js';
import {normalizeLabRecord} from '../src/records.js';
import {SCENARIOS} from '../src/scenarios.js';

const id='INC-101',scenario=SCENARIOS.find(item=>item.id===id);
function step(state,action) {
  const result=applyHardwareAction(id,state,action);
  assert.notEqual(result.kind,'warning',`${action}: ${result.message}`);
  return result.state;
}
function delivered(detailed=false) {
  let state=initialHardwareState(id);
  if(detailed)state=step(state,'enable-assembly');
  return step(step(state,'video-gpu'),'open-document');
}
const reportSource=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const start=reportSource.indexOf('function hardwareCableSummary('),end=reportSource.indexOf('\nfunction openReport',start);
assert.ok(start>=0&&end>start);
const report=vm.runInNewContext(`${reportSource.slice(start,end)}; reportText`,{tracks:{hardware:{name:'Hardware & ServiceDesk'}},readQuestionEvents:()=>[],experimentReport:()=>'',eventMessage:event=>event.message});

test('unplugged fabricated boot and delivery flags cannot survive normalization or pass any hardware delivery API',()=>{
  for(const detailed of [false,true]) {
    const forged={...delivered(detailed),acConnected:false,pcOn:true,booted:true,documentOpened:true},before=structuredClone(forged);
    const normalized=normalizeHardwareState(id,forged);
    assert.equal(normalized.booted,false);assert.equal(normalized.documentOpened,false);assert.equal(normalized.acConnected,false);assert.equal(normalized.pcOn,true);
    assert.equal(verifyHardware(id,forged).ok,false);
    assert.match(verifyHardware(id,forged).message,/AC is disconnected/);
    const attempt=applyHardwareAction(id,forged,'open-document');assert.equal(attempt.kind,'warning');assert.equal(attempt.state.booted,false);assert.equal(attempt.state.documentOpened,false);
    assert.doesNotMatch(getHardwareReadouts(id,forged).display.value,/desktop|lesson file/i);
    assert.deepEqual(forged,before,'normalization and diagnostics never mutate the supplied save');
  }
});

test('missing power paths, processor, memory or original storage invalidate a stale loaded-OS flag',()=>{
  for(const detailed of [false,true])for(const field of ['pcOn','atxConnected','cpuPowerConnected','frontPanelConnected','boardInstalled','cpuInstalled','coolerInstalled','ramSeated','gpuInstalled','gpuPowerConnected','originalDriveInstalled','sataDataConnected','sataPowerConnected']) {
    const forged={...delivered(detailed),[field]:false,booted:true,documentOpened:true};
    const normalized=normalizeHardwareState(id,forged);
    assert.equal(normalized.booted,false,`${detailed}: ${field}`);assert.equal(normalized.documentOpened,false,field);
    assert.equal(verifyHardware(id,forged).ok,false,field);
    assert.equal(applyHardwareAction(id,forged,'open-document').kind,'warning',field);
    assert.doesNotMatch(getHardwareReadouts(id,forged).display.value,/desktop|lesson file/i,field);
  }
});

test('the eight authored initial faults and a legitimately delivered repair retain their existing state',()=>{
  for(const scenario of SCENARIOS.filter(item=>item.track==='hardware')) {
    const state=initialHardwareState(scenario.id);
    assert.deepEqual(normalizeHardwareState(scenario.id,state),state,scenario.id);
  }
  for(const detailed of [false,true]) {
    const state=delivered(detailed),normalized=normalizeHardwareState(id,state);
    assert.deepEqual(normalized,state);assert.equal(verifyHardware(id,normalized).ok,true);
    assert.match(getHardwareReadouts(id,normalized).display.value,/Original lesson file open/);
    const record=normalizeLabRecord(scenario,{state,verified:true,closed:false,notes:'The original classroom file opens.'});
    assert.match(report(scenario,record),/Status: TECHNICALLY VERIFIED — TICKET OPEN/);
    assert.match(report(scenario,record),/AC power: connected/);
  }
});

test('external HDMI disconnection, source changes and inactive output routing preserve the genuinely loaded OS',()=>{
  for(const detailed of [false,true])for(const action of ['disconnect-video','disconnect-signal','input-displayport','video-board']) {
    const result=applyHardwareAction(id,delivered(detailed),action),normalized=normalizeHardwareState(id,result.state);
    assert.equal(normalized.pcOn,true,action);assert.equal(normalized.acConnected,true,action);assert.equal(normalized.booted,true,action);assert.equal(normalized.documentOpened,false,action);
    assert.equal(verifyHardware(id,normalized).ok,false,action);
    const restore=action==='disconnect-signal'?'connect-signal':action==='input-displayport'?'input-hdmi':'video-gpu';
    const restored=step(normalized,restore);assert.equal(restored.booted,true);assert.equal(restored.bootCount,normalized.bootCount);assert.equal(step(restored,'open-document').documentOpened,true);
  }
});

test('restoring AC after an impossible saved boot requires a fresh startup test before file delivery',()=>{
  for(const detailed of [false,true]) {
    let state=normalizeHardwareState(id,{...delivered(detailed),acConnected:false});
    state=step(state,'plug-in');assert.equal(state.booted,false);assert.equal(state.documentOpened,false);
    assert.equal(applyHardwareAction(id,state,'open-document').kind,'warning');
    const boots=state.bootCount;state=step(state,'boot');assert.equal(state.booted,true);assert.equal(state.bootCount,boots+1);
    state=step(state,'open-document');assert.equal(verifyHardware(id,state).ok,true);
  }
});

test('report content preserves the actual disconnected power path after rejecting a saved boot claim',()=>{
  for(const detailed of [false,true]) {
    const forged={...delivered(detailed),acConnected:false};
    const record=normalizeLabRecord(scenario,{state:forged,verified:true,closed:true,notes:'AC was disconnected; a fresh startup test is needed.',plan:'Trace both power and display paths.',reflection:'A saved success flag does not supply power.',evidence:[scenario.clues[0].id],events:[{time:'2026-10-18T12:00:00.000Z',kind:'info',message:'I checked the original classroom task.'}]});
    assert.equal(record.state.booted,false);assert.equal(record.state.documentOpened,false);
    assert.equal(record.verified,false);assert.equal(record.closed,false);assert.equal(record.plan,'Trace both power and display paths.');assert.equal(record.reflection,'A saved success flag does not supply power.');assert.deepEqual(record.evidence,[scenario.clues[0].id]);assert.equal(record.events[0].message,'I checked the original classroom task.');
    const text=report(scenario,record);assert.match(text,/Status: IN PROGRESS/);assert.match(text,/AC power: disconnected/);assert.match(text,/fresh startup test is needed/);
    assert.doesNotMatch(text,/Status: (?:DELIVERED|TECHNICALLY VERIFIED)/);
  }
});

test('hardware record completion is rechecked for component faults while healthy delivery and software flags are retained',()=>{
  for(const detailed of [false,true]) {
    const record=normalizeLabRecord(scenario,{state:delivered(detailed),verified:true,closed:true,notes:'The original lesson works.'});
    assert.equal(record.verified,true);assert.match(report(scenario,record),/Status: (?:DELIVERED|TECHNICALLY VERIFIED)/);
    for(const field of ['atxConnected','cpuPowerConnected','ramSeated','sataDataConnected','sataPowerConnected']) {
      const failed=normalizeLabRecord(scenario,{state:{...delivered(detailed),[field]:false},verified:true,closed:true,notes:'Keep my investigation notes.'});
      assert.equal(failed.verified,false,field);assert.equal(failed.closed,false,field);assert.equal(failed.notes,'Keep my investigation notes.');assert.match(report(scenario,failed),/Status: IN PROGRESS/);
    }
  }
  const software=SCENARIOS.find(item=>item.track==='network');
  assert.equal(normalizeLabRecord(software,{verified:true,closed:false}).verified,true,'This narrow repair does not change software completion policy.');
});
