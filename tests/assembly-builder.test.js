import test from 'node:test';
import assert from 'node:assert/strict';
import {initialHardwareState,applyHardwareAction,verifyHardware} from '../src/hardware.js';
import {pcActivity} from '../src/pc-activity.js';
import {assemblyBuilderView,assemblyBuildProgress,renderAssemblyBuilder} from '../src/assembly-builder.js';

const ID='INC-106';
const initial=()=>applyHardwareAction(ID,initialHardwareState(ID),'enable-assembly').state;
const CORE=[
  'asm-fit-psu',...[0,1,2,3].map(index=>`asm-tighten-psu-${index}`),
  'asm-fit-board',...[0,1,2,3].map(index=>`asm-tighten-board-${index}`),
  'asm-fit-cpu','asm-close-retention','asm-apply-paste','asm-fit-cooler',
  ...[0,3,1,2].map(index=>`asm-tighten-cooler-${index}`),
  'asm-fit-ram','asm-close-ram-clips','asm-fit-gpu','asm-close-pcie-latch',
  'asm-tighten-gpu-0','asm-tighten-gpu-1','asm-fit-ssd','asm-tighten-ssd-0','asm-tighten-ssd-1'
];
const CONNECT=['asm-connect-atx','asm-connect-eps','asm-connect-gpu-power','asm-connect-sata-data',
  'asm-connect-sata-power','asm-connect-front-panel','asm-connect-cpu-fan','video-gpu'];
const CLOSE=['asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1'];
const OPEN=['power-off','unplug','asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel'];
function run(state,actions){
  for(const action of actions){
    const before=structuredClone(state),result=applyHardwareAction(ID,state,action);
    assert.notEqual(result.kind,'warning',`${action}: ${result.message}`);
    assert.deepEqual(state,before,'An action must not mutate the supplied snapshot.');state=result.state;
  }
  return state;
}
function readout(state,selected='board'){
  const fields=new Map(),root={querySelector(selector){
    if(!fields.has(selector))fields.set(selector,{textContent:'',attrs:{},disabled:false,
      setAttribute(name,value){this.attrs[name]=value;},removeAttribute(name){delete this.attrs[name];}});
    return fields.get(selector);
  }};
  const before=structuredClone(state);
  renderAssemblyBuilder(root,state,{activity:pcActivity(state),selected});
  assert.deepEqual(state,before,'Reading progress never repairs, powers or records equipment.');
  return {fields,text:name=>fields.get(`[data-asm-${name}]`)?.textContent,
    stage:name=>fields.get(`[data-asm-build-stage="${name}"]`)?.attrs,
    part:name=>fields.get(`[data-asm-tray-state="${name}"]`)?.textContent,
    open:fields.get('[data-asm-build-open-file="open"]')};
}

test('the builder has no view or readout effects in the other seven repair investigations',()=>{
  for(const id of ['INC-101','INC-102','INC-103','INC-104','INC-105','INC-107','INC-108']){
    const state=applyHardwareAction(id,initialHardwareState(id),'enable-assembly').state;
    assert.equal(assemblyBuilderView(state,{}),null);assert.equal(assemblyBuildProgress(state),null);
    renderAssemblyBuilder({querySelector(){assert.fail('A repair ticket received builder-only controls.');}},state,{activity:pcActivity(state)});
  }
});

test('the authored studio keeps native selection controls and visible test results separate from optional disclosures',()=>{
  const state=initial(),before=structuredClone(state);
  const view=assemblyBuilderView(state,{groups:[['board','Motherboard'],['psu','Power supply'],['paste','Thermal paste']],selected:'board'});
  assert.equal(view.label,'PC building studio');assert.equal(view.close,'</div></div>');
  assert.match(view.open,/<button type="button" data-asm-part="board" aria-pressed="true">/u);
  assert.match(view.open,/<button type="button" data-asm-part="psu" aria-pressed="false">/u);
  assert.match(view.open,/<aside class="asm-build-test" aria-label="Live PC test results">/u);
  for(const name of ['power','startup','file'])assert.match(view.open,new RegExp(`<dd data-asm-result-${name}></dd>`,'u'));
  assert.match(view.open,/<button type="button" data-asm-build-open-file="open">Open original lesson file<\/button>/u);
  assert.equal((view.open.match(/<details\b/gu)||[]).length,0);
  assert.equal((view.open.match(/data-assembly-action=/gu)||[]).length,0,'The tray selects existing controls and grants no install action.');
  assert.equal((view.open.match(/data-asm-toggle=/gu)||[]).length,0,'The helper never embeds a second Power/AC group.');
  assert.deepEqual(state,before);
});

test('a fitted part remains visibly unsecured and a rejected action cannot advance the build stage',()=>{
  let state=initial(),ui=readout(state);
  assert.equal(ui.text('stage-build'),'0 / 7 parts secured');assert.equal(ui.stage('build')['aria-current'],'step');
  assert.equal(ui.part('board'),'In the parts tray');assert.equal(ui.open.disabled,true);
  state=run(state,['asm-fit-board']);ui=readout(state);
  assert.equal(ui.part('board'),'Fitted · secure it');assert.match(ui.text('placement'),/^Fitted · check its fittings/u);
  const rejected=applyHardwareAction(ID,state,'asm-fit-cpu');assert.equal(rejected.kind,'warning');
  assert.deepEqual(rejected.state,state);assert.equal(assemblyBuildProgress(rejected.state).secured,0);
  assert.equal(readout(rejected.state).stage('build')['aria-current'],'step');
  state=run(state,[0,1,2,3].map(index=>`asm-tighten-board-${index}`));
  assert.equal(readout(state).part('board'),'Fitted & secured');
});

test('mechanical progress requires the retention arm, memory clips, GPU latch and thermal preparation',()=>{
  const checkpoints=new Map(),state=CORE.reduce((current,action)=>{
    const next=run(current,[action]);checkpoints.set(action,assemblyBuildProgress(next));return next;
  },initial());
  const ready=(action,id)=>checkpoints.get(action).parts.find(part=>part.id===id).ready;
  assert.equal(ready('asm-fit-cpu','cpu'),false);assert.equal(ready('asm-close-retention','cpu'),true);
  assert.equal(ready('asm-fit-cooler','cooler'),false);assert.equal(ready('asm-tighten-cooler-2','cooler'),true);
  assert.equal(ready('asm-fit-ram','ram'),false);assert.equal(ready('asm-close-ram-clips','ram'),true);
  assert.equal(ready('asm-fit-gpu','gpu'),false);assert.equal(ready('asm-tighten-gpu-1','gpu'),true);
  assert.equal(assemblyBuildProgress(state).buildReady,true);
  const ui=readout(state);assert.equal(ui.text('stage-build'),'7 / 7 parts secured');
  assert.equal(ui.stage('build')['data-state'],'complete');assert.equal(ui.stage('connect')['aria-current'],'step');
  assert.equal(ui.text('stage-connect'),'0 / 8 paths ready');
});

test('connections stay incomplete until fan and both-ended display path match the actual model',()=>{
  let state=run(initial(),CORE);state=run(state,CONNECT.slice(0,6));
  assert.equal(readout(state).text('stage-connect'),'6 / 8 paths ready');
  state=run(state,['asm-connect-cpu-fan']);assert.equal(assemblyBuildProgress(state).stage,'connect');
  state=run(state,['video-gpu']);assert.equal(assemblyBuildProgress(state).stage,'test');
  assert.equal(readout(state).text('stage-connect'),'8 / 8 paths ready');
  for(const action of ['disconnect-signal','disconnect-video','input-displayport','video-board']){
    const changed=applyHardwareAction(ID,state,action).state;assert.notDeepEqual(changed,state,action);
    assert.equal(assemblyBuildProgress(changed).connectReady,false,action);
    assert.equal(readout(changed).stage('connect')['aria-current'],'step');
  }
});

test('the persistent test panel distinguishes a secured case, real startup and an explicit original-file check',()=>{
  let state=run(initial(),[...CORE,...CONNECT]),ui=readout(state);
  assert.equal(assemblyBuildProgress(state).closed,false);assert.match(ui.text('build-case'),/^Before startup:/u);
  state=run(state,['plug-in']);const rejected=applyHardwareAction(ID,state,'boot');
  assert.equal(rejected.kind,'warning');assert.equal(pcActivity(rejected.state).booted,false);
  assert.equal(readout(rejected.state).open.disabled,true);assert.equal(verifyHardware(ID,rejected.state).ok,false);
  state=run(rejected.state,['power-off','unplug',...CLOSE,'plug-in','boot']);ui=readout(state);
  assert.equal(ui.text('result-power'),'Main power active');assert.equal(ui.text('result-startup'),'Original OS loaded');
  assert.equal(ui.text('result-file'),'Desktop visible · original file not checked yet');assert.equal(ui.open.disabled,false);
  assert.equal(assemblyBuildProgress(state).complete,false);assert.equal(verifyHardware(ID,state).ok,false);
  state=run(state,['open-document']);ui=readout(state);
  assert.equal(ui.text('result-file'),'Verified · original lesson file opened');assert.equal(ui.open.disabled,true);
  assert.equal(ui.stage('test')['data-state'],'complete');assert.equal(ui.stage('test')['aria-current'],undefined);
  assert.equal(verifyHardware(ID,state).ok,true);
});

test('progress regresses after a real disconnection or released clip and safety remains enforced while powered',()=>{
  let state=run(initial(),[...CORE,...CONNECT,...CLOSE,'plug-in','boot','open-document']);
  const unsafe=applyHardwareAction(ID,state,'asm-open-ram-clips');assert.equal(unsafe.kind,'warning');
  assert.deepEqual(unsafe.state,state);assert.equal(assemblyBuildProgress(unsafe.state).complete,true);
  state=run(state,OPEN);state=run(state,['asm-open-ram-clips']);
  const ui=readout(state,'ram');assert.equal(ui.stage('build')['aria-current'],'step');
  assert.equal(ui.part('ram'),'Fitted · secure it');assert.equal(assemblyBuildProgress(state).complete,false);
  assert.equal(ui.open.disabled,true);assert.equal(verifyHardware(ID,state).ok,false);
});

test('raw success flags cannot turn an incomplete model into a successful file check',()=>{
  const state={...initial(),booted:true,documentOpened:true,pcOn:true};
  const ui=readout(state);assert.equal(assemblyBuildProgress(state).complete,false);
  assert.equal(ui.text('result-file'),'Not checked · reach the classroom desktop first');
  assert.equal(ui.open.disabled,true);assert.equal(ui.stage('test')['data-state'],'waiting');
});
