import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pcActivity} from '../src/pc-activity.js';
import {initialHardwareState,applyHardwareAction} from '../src/hardware.js';
import {normalizeHardwareState,verifyHardware,getHardwareReadouts} from '../src/hardware.js';
import {SCENARIOS} from '../src/scenarios.js';

const detailed = (id='INC-101') => applyHardwareAction(id,initialHardwareState(id),'enable-assembly').state;
function steps(id,state,actions) {
  for (const action of actions) {
    const result=applyHardwareAction(id,state,action);
    assert.notEqual(result.kind,'warning',`${action}: ${result.message}`);
    state=result.state;
  }
  return state;
}
const fixed = () => steps('INC-101',detailed(),['video-gpu']);
const freeze = value => {if(value&&typeof value==='object'){for(const entry of Object.values(value))freeze(entry);Object.freeze(value);}return value;};
const assertStopped = activity => {for(const key of ['powered','cpuFan','psuFan','gpuFan','boardPowered','cpuPowered','ramPowered','gpuPowered','ssdPowered','booted','documentOpened'])assert.equal(activity[key],false,key);};

test('monitor power is independent of PC power, blocks delivery while off, and migrates older saves as on',()=>{
  let state=steps('INC-101',fixed(),['open-document','monitor-off']);
  assert.equal(state.pcOn,true);assert.equal(state.booted,true);assert.equal(state.monitorOn,false);assert.equal(state.documentOpened,false);
  const activity=pcActivity(state);assert.equal(activity.powered,true);assert.equal(activity.booted,true);assert.equal(activity.display.screen.code,'MONITOR_OFF');assert.equal(activity.display.signal,false);assert.equal(activity.display.desktop,false);
  assert.equal(verifyHardware('INC-101',state).ok,false);assert.match(verifyHardware('INC-101',state).message,/monitor is off/i);assert.equal(applyHardwareAction('INC-101',state,'open-document').kind,'warning');
  assert.match(getHardwareReadouts('INC-101',state).display.value,/Monitor switched off/);
  state=steps('INC-101',state,['monitor-on']);assert.equal(pcActivity(state).display.desktop,true);assert.equal(state.documentOpened,false);
  const old={...state};delete old.monitorOn;assert.equal(normalizeHardwareState('INC-101',old).monitorOn,true);
  for(const value of ['false',0,{},null])assert.equal(normalizeHardwareState('INC-101',{...state,monitorOn:value}).monitorOn,true);
});

test('all eight current hardware faults have distinct honest power/startup/display activity',()=>{
  const expected={
    'INC-101':[true,true,'no-signal'], 'INC-102':[false,false,'off'],
    'INC-103':[true,false,'no-signal'], 'INC-104':[true,false,'post-stopped'],
    'INC-105':[true,false,'post-stopped'], 'INC-106':[false,false,'off'],
    'INC-107':[true,true,'no-signal'], 'INC-108':[true,true,'no-signal']
  };
  const ids=SCENARIOS.filter(item=>item.track==='hardware').map(item=>item.id);
  assert.equal(ids.length,8);
  for(const id of ids)for(const enabled of [false,true]) {
    const state=enabled?detailed(id):initialHardwareState(id),before=structuredClone(state),activity=pcActivity(state),[powered,booted,display]=expected[id];
    assert.equal(activity.powered,powered,id);assert.equal(activity.booted,booted,id);assert.equal(activity.display.state,display,id);
    for(const fan of ['cpuFan','psuFan','gpuFan'])assert.equal(activity[fan],powered,`${id}: ${fan}`);
    assert.equal(activity.documentOpened,false,id);assert.deepEqual(state,before,id);
  }
  assert.equal(pcActivity(detailed('INC-103')).display.label,'NO SIGNAL');
  assert.equal(pcActivity(detailed('INC-104')).display.label,'NO BOOT DEVICE');
  assert.equal(pcActivity(detailed('INC-107')).display.label,'NO SIGNAL · DISPLAYPORT');
  assert.match(pcActivity(detailed('INC-108')).display.detail,/No active video/i);
});

test('AC alone supplies standby without spinning fans; shutdown and unplug stop activity immediately',()=>{
  let state=fixed();assert.equal(pcActivity(state).cpuFan,true);
  state=steps('INC-101',state,['power-off']);
  let activity=pcActivity(state);assertStopped(activity);assert.equal(activity.standby,true);assert.equal(activity.power.state,'standby');assert.match(activity.status.label,/standby/i);
  state=steps('INC-101',state,['unplug']);activity=pcActivity(state);assertStopped(activity);assert.equal(activity.standby,false);assert.equal(activity.power.state,'off');
  state=steps('INC-101',state,['plug-in']);assertStopped(pcActivity(state));assert.equal(pcActivity(state).standby,true);
  state=steps('INC-101',state,['boot']);assert.equal(pcActivity(state).display.desktop,true);assert.equal(pcActivity(state).documentOpened,false);
  state=steps('INC-101',state,['open-document']);activity=pcActivity(state);assert.equal(activity.display.state,'document');assert.equal(activity.display.documentOpened,true);
});

test('missing memory or storage stops startup but not powered fitted fans',()=>{
  const base=fixed();
  for(const change of [{ramSeated:false},{originalDriveInstalled:false},{sataDataConnected:false},{sataPowerConnected:false}]) {
    const activity=pcActivity({...base,...change,booted:true,documentOpened:true});
    assert.equal(activity.powered,true);assert.equal(activity.cpuFan,true);assert.equal(activity.psuFan,true);assert.equal(activity.gpuFan,true);
    assert.equal(activity.startup.state,'blocked');assert.equal(activity.booted,false);assert.equal(activity.display.desktop,false);assert.equal(activity.documentOpened,false);assert.equal(activity.status.tone,'warning');
  }
});

test('each fitted fan follows its own part, modeled power path and actual lead',()=>{
  const base=fixed();
  let activity=pcActivity({...base,assembly:{...base.assembly,cpuFanConnected:false}});
  assert.equal(activity.cpuFan,false);assert.equal(activity.psuFan,true);assert.equal(activity.gpuFan,true);assert.equal(activity.booted,false);assert.match(activity.startup.reason,/CPU fan lead/);
  activity=pcActivity({...base,cpuPowerConnected:false});assert.equal(activity.cpuPowered,false);assert.equal(activity.cpuFan,true,'CPU fan uses the board header, separately from CPU EPS power');assert.equal(activity.psuFan,true);assert.equal(activity.booted,false);
  activity=pcActivity({...base,gpuPowerConnected:false});assert.equal(activity.gpuFan,false);assert.equal(activity.gpuPowered,false);assert.equal(activity.cpuFan,true);assert.equal(activity.display.signal,false);
  for(const change of [{coolerInstalled:false},{cpuInstalled:false}])assert.equal(pcActivity({...base,...change}).cpuFan,false);
  assert.equal(pcActivity({...base,gpuInstalled:false}).gpuFan,false);
  for(const change of [{acConnected:false},{pcOn:false},{boardInstalled:false},{atxConnected:false},{frontPanelConnected:false},{assembly:{...base.assembly,psuInstalled:false}}])assertStopped(pcActivity({...base,...change}));
});

test('disconnecting the CPU fan through the existing guarded model is reflected without repairing or booting',()=>{
  const opened=steps('INC-101',fixed(),['power-off','unplug','asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel','asm-disconnect-cpu-fan','asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1','plug-in']);
  const attempted=applyHardwareAction('INC-101',opened,'boot');assert.equal(attempted.kind,'warning');
  const before=structuredClone(attempted.state),activity=pcActivity(attempted.state);
  assert.equal(activity.powered,true);assert.equal(activity.cpuFan,false);assert.equal(activity.psuFan,true);assert.equal(activity.gpuFan,true);assert.equal(activity.startup.state,'blocked');assert.equal(activity.display.desktop,false);assert.deepEqual(attempted.state,before);
});

test('both HDMI ends, the selected output and monitor source determine the visible desktop independently of fan motion',()=>{
  const base=steps('INC-101',fixed(),['open-document']);
  for(const [change,detail]of [[{pcVideoConnected:false},/No active video/],[{signalConnected:false},/No active video/],[{videoPort:'board'},/No active video/],[{monitorInput:'displayport'},/No active video/],[{monitorInput:'unexpected'},/No active video/]]) {
    const state={...base,...change},before=structuredClone(state),activity=pcActivity(state);
    assert.equal(activity.cpuFan,true);assert.equal(activity.psuFan,true);assert.equal(activity.gpuFan,true);assert.equal(activity.booted,true);
    assert.equal(activity.display.state,'no-signal');assert.equal(activity.display.signal,false);assert.equal(activity.display.desktop,false);assert.equal(activity.documentOpened,false);assert.match(activity.display.detail,detail);assert.deepEqual(state,before);
  }
  const activity=pcActivity({...base,booted:false});assert.equal(activity.display.state,'post-stopped');assert.equal(activity.startup.state,'pending');assert.equal(activity.documentOpened,false);
});

test('the original SSD is solid-state and its power indication does not claim disk motion, access or a successful boot',()=>{
  const base=fixed(),activity=pcActivity(base);
  assert.equal(activity.storage.rotating,false);assert.equal(activity.storage.powered,true);assert.equal(activity.storage.connected,true);assert.equal(activity.storage.state,'ready');assert.match(activity.storage.detail,/no spinning disk or moving parts/);
  assert.equal(pcActivity({...base,sataDataConnected:false}).storage.powered,true);
  assert.equal(pcActivity({...base,sataDataConnected:false}).storage.connected,false);
  assert.equal(pcActivity({...base,sataPowerConnected:false}).storage.powered,false);
  assert.equal(pcActivity({...base,originalDriveInstalled:false}).storage.state,'absent');
  assert.equal(pcActivity({...base,pcOn:false}).ramPowered,false);
});

test('false boot flags, absent detailed fittings and disturbed paste cannot paint a successful desktop',()=>{
  const base=steps('INC-101',fixed(),['open-document']);
  const variants=[{assembly:{...base.assembly,paste:'dry'}},{assembly:{...base.assembly,paste:'excess'}},{assembly:{...base.assembly,coolerScrews:[true,false,true,true]}},{assembly:{...base.assembly,panelInstalled:false}},{assembly:{...base.assembly,retentionOpen:true}},{assembly:{...base.assembly,ramClipsOpen:true}},{assembly:{...base.assembly,psuScrews:[false,false,false,false]}},{cpuPowerConnected:false},{gpuPowerConnected:false}];
  for(const change of variants){const activity=pcActivity({...base,...change});assert.equal(activity.booted,false);assert.equal(activity.documentOpened,false);assert.equal(activity.display.desktop,false);assert.match(activity.startup.reason,/\S/);}
});

test('malformed, inherited, accessor and truthy nonboolean fields never create a powered or delivered system',()=>{
  const base=fixed();
  for(const malformed of [null,undefined,[],true,'running',()=>base,Object.create(base),{...base,assemblyEnabled:undefined},{...base,assemblyEnabled:'true'},{...base,assembly:null},{...base,assembly:{...base.assembly,version:2}},{...base,pcOn:'true'},{...base,acConnected:1}])assertStopped(pcActivity(malformed));
  let reads=0;const getters={};for(const key of Object.keys(base))Object.defineProperty(getters,key,{get(){reads++;return base[key];},enumerable:true});assertStopped(pcActivity(getters));assert.equal(reads,0);
  const details={...base.assembly};Object.defineProperty(details,'cpuFanConnected',{get(){reads++;return true;}});assert.equal(pcActivity({...base,assembly:details}).cpuFan,false);assert.equal(reads,0);
  const inherited=Object.create(null);Object.assign(inherited,base);assert.equal(pcActivity(inherited).powered,true);
  const {proxy,revoke}=Proxy.revocable({},{});revoke();assertStopped(pcActivity(proxy));
});

test('indicator calculation is deterministic, accepts deeply frozen work, and has no activity loop or external data boundary',()=>{
  const state=freeze(steps('INC-101',fixed(),['open-document'])),before=JSON.stringify(state),one=pcActivity(state),two=pcActivity(state);
  assert.deepEqual(one,two);assert.equal(JSON.stringify(state),before);assert.match(one.description,/not measurements/);assert.match(one.description,/Fan motion does not prove/);
  const source=readFileSync(new URL('../src/pc-activity.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:setTimeout|setInterval|requestAnimationFrame|fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|window|document)\s*[.(]/);
  assert.doesNotMatch(source,/https?:\/\//);
});

test('monitor clues distinguish power standby, pre-video POST, firmware storage and display-transfer faults across every ticket',()=>{
  const expected={
    'INC-101':['INPUT_NO_SIGNAL','desktop','HDMI'], 'INC-102':['MONITOR_STANDBY','power','HDMI'],
    'INC-103':['PRE_VIDEO_POST','memory-init','HDMI'], 'INC-104':['BOOT_DEVICE_UNAVAILABLE','boot-device','HDMI'],
    'INC-105':['BOOT_DEVICE_UNAVAILABLE','boot-device','HDMI'], 'INC-106':['MONITOR_STANDBY','power','HDMI'],
    'INC-107':['INPUT_NO_SIGNAL','desktop','DISPLAYPORT'], 'INC-108':['INPUT_NO_SIGNAL','desktop','DISPLAYPORT']
  };
  for(const [id,[code,phase,input]]of Object.entries(expected))for(const enabled of [false,true]){
    const state=enabled?detailed(id):initialHardwareState(id),before=structuredClone(state),activity=pcActivity(state);
    assert.equal(activity.display.screen.code,code,id);assert.equal(activity.startup.phase,phase,id);assert.equal(activity.display.screen.source,input,id);
    assert.deepEqual(state,before);assert.equal(activity.display.documentOpened,false);
  }
});

test('processor or memory initialization faults leave fans running without claiming a firmware picture or a missing-RAM screen',()=>{
  const base=fixed();
  for(const change of [{ramSeated:false},{cpuPowerConnected:false},{cpuInstalled:false},{assembly:{...base.assembly,ramClipsOpen:true}},{assembly:{...base.assembly,retentionOpen:true}}]){
    const activity=pcActivity({...base,...change,booted:true,documentOpened:true});
    assert.equal(activity.powered,true);assert.equal(activity.psuFan,true);assert.equal(activity.display.signal,false);assert.equal(activity.display.state,'no-signal');
    assert.equal(activity.startup.videoInitialized,false);assert.equal(activity.display.screen.brand,'CLASSROOM DISPLAY');
    assert.doesNotMatch(activity.display.readout,/MEMORY NOT DETECTED|UEFI|boot device|reseat|DIMM|EPS|retention/i);
    assert.equal(activity.display.desktop,false);assert.equal(activity.documentOpened,false);
  }
});

test('a missing or undetected original drive produces firmware evidence but a loose NVMe choice does not invent bootloader corruption',()=>{
  const lostCable=pcActivity(detailed('INC-104')),spareChosen=pcActivity(detailed('INC-105'));
  for(const activity of [lostCable,spareChosen]){
    assert.equal(activity.display.signal,true);assert.equal(activity.display.screen.stage,'firmware');assert.equal(activity.display.screen.brand,'CLASSROOM UEFI');
    assert.ok(activity.display.screen.lines.includes('SATA devices detected: 0'));assert.equal(activity.startup.bootManager,'not-reached');
    assert.doesNotMatch(activity.display.readout,/reconnect|install|SATA cable|NVMe|bootloader.*(?:damaged|missing|corrupt)|Windows|GRUB/i);
    assert.equal(activity.booted,false);assert.equal(activity.documentOpened,false);
  }
  assert.deepEqual(lostCable.display.screen.lines,spareChosen.display.screen.lines,'The firmware cannot observe a loose, incompatible spare outside its connectors');
  const healthy=fixed();assert.equal(pcActivity({...healthy,selectedDrive:'nvme'}).display.state,'desktop','A bench selection alone does not replace or erase the connected OS drive');
  const hidden=pcActivity({...detailed('INC-104'),signalConnected:false});assert.equal(hidden.display.screen.brand,'CLASSROOM DISPLAY');assert.equal(hidden.display.signal,false,'A firmware fault is not visible through a broken display path');
});

test('a boot-manager checkpoint and desktop confirmation come from the actual startup result, with no automatic action or time progression',()=>{
  let state={...fixed(),booted:false,documentOpened:true},before=structuredClone(state);
  const pending=pcActivity(state);assert.equal(pending.display.screen.stage,'boot-manager');assert.equal(pending.display.screen.code,'BOOT_MANAGER_READY');
  assert.equal(pending.startup.bootManager,'ready');assert.equal(pending.booted,false);assert.equal(pending.documentOpened,false);assert.deepEqual(state,before);
  assert.deepEqual(pcActivity(state),pending,'Reading twice must not advance a screen or award a test');
  const unseen=pcActivity({...state,signalConnected:false});assert.equal(unseen.startup.bootManager,'ready');assert.equal(unseen.display.screen.code,'INPUT_NO_SIGNAL','A disconnected display does not remove the boot manager or invent a bootloader fault');
  state=steps('INC-101',state,['boot']);const desktop=pcActivity(state);assert.equal(desktop.display.screen.code,'DESKTOP_READY');assert.equal(desktop.startup.bootManager,'completed');assert.equal(desktop.documentOpened,false);
  state=steps('INC-101',state,['open-document']);assert.equal(pcActivity(state).display.screen.code,'LESSON_OPEN');
  state=steps('INC-101',state,['power-off']);const standby=pcActivity(state);assert.equal(standby.display.screen.code,'MONITOR_STANDBY');assert.match(standby.display.readout,/Monitor power is available separately/);
});

test('teaching mount and cooling interlocks are labeled as workbench checks instead of invented firmware screw or paste detectors',()=>{
  const base=fixed();
  for(const assembly of [{...base.assembly,panelInstalled:false,panelScrews:[false,false]},{...base.assembly,cpuFanConnected:false},{...base.assembly,paste:'dry'}]){
    const activity=pcActivity({...base,assembly});
    assert.equal(activity.display.screen.stage,'interlock');assert.equal(activity.display.screen.brand,'TEACHING WORKBENCH');
    assert.match(activity.display.readout,/teaching safety check/i);assert.doesNotMatch(activity.display.readout,/screw|paste|CPU_FAN|temperature|UEFI|reseat|connect/i);
    assert.equal(activity.booted,false);assert.equal(activity.documentOpened,false);
  }
});

test('monitor facts are fixed bounded symptoms rather than arbitrary saved text or endpoint repair instructions',()=>{
  const states=SCENARIOS.filter(item=>item.track==='hardware').map(item=>detailed(item.id));
  states.push({...fixed(),monitorInput:'<img src=x onerror=payload()>'},{...fixed(),booted:false},steps('INC-101',fixed(),['open-document']));
  for(const state of states){
    const {screen}=pcActivity(state).display;
    assert.ok(screen.lines.length>=2&&screen.lines.length<=4);for(const line of screen.lines)assert.ok(line.length<=48,line);
    assert.ok(screen.code.length<=32);assert.ok(['HDMI','DISPLAYPORT','UNSET'].includes(screen.source));
    assert.doesNotMatch(pcActivity(state).display.readout,/<img|payload|upper motherboard|graphics.card output|PC end.*disconnected|monitor end.*disconnected|Select HDMI/i);
    assert.ok(pcActivity(state).display.readout.length<=320);
  }
});
