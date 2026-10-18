import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workbenchGuidance} from '../src/workbench-guidance.js';
import {ASSEMBLY_TOOLS} from '../src/assembly-tools.js';
import {ASSEMBLY_CABLES} from '../src/assembly-cables.js';
import {ASSEMBLY_FASTENERS} from '../src/assembly-model.js';
import {initialHardwareState,applyHardwareAction} from '../src/hardware.js';

const ids=Array.from({length:8},(_,index)=>`INC-10${index+1}`);
const groups=['panel','psu','board','cpu','paste','cooler','ram','gpu','ssd','cables','display'];
const views=['bench','inside','rear','monitor'];
const base=caseId=>initialHardwareState(caseId);
const clone=value=>structuredClone(value);

test('all eight profiles return only current authored control IDs and valid initial choices',()=>{
  for(const id of ids){const guide=workbenchGuidance(base(id));assert.equal(typeof guide.title,'string');assert.ok(guide.instruction.length>20);assert.ok(guide.instruction.length<240);
    for(const [key,allowed] of [['tools',ASSEMBLY_TOOLS.map(tool=>tool.id)],['groups',groups],['cables',ASSEMBLY_CABLES.map(cable=>cable.id)],['screws',Object.keys(ASSEMBLY_FASTENERS)],['views',views]]){
      assert.ok(Array.isArray(guide[key]));assert.equal(new Set(guide[key]).size,guide[key].length,id+' duplicate '+key);assert.ok(guide[key].every(value=>allowed.includes(value)),id+' invalid '+key);
    }
    assert.ok(guide.tools.includes('inspect'));assert.ok(guide.groups.includes(guide.initialPart));assert.ok(guide.cables.includes(guide.initialCable));assert.ok(guide.views.includes(guide.initialView));assert.equal(Object.hasOwn(guide,'kind'),false);
  }
});

test('display transfer tickets share the same small control set and do not identify a particular fault',()=>{
  const guides=['INC-101','INC-107','INC-108'].map(id=>workbenchGuidance(base(id)));
  for(const guide of guides){assert.deepEqual(guide.tools,['inspect','cables']);assert.deepEqual(guide.groups,['display','cables']);assert.deepEqual(guide.cables,['hdmi-pc','hdmi-monitor']);assert.deepEqual(guide.screws,[]);assert.deepEqual(guide.views,['bench','rear','monitor']);assert.equal(guide.initialCable,'hdmi-pc');assert.equal(guide.initialView,'monitor');}
  assert.deepEqual(guides[0],guides[1]);assert.deepEqual(guides[1],guides[2]);
  assert.doesNotMatch(guides[0].instruction,/wrong|loose|disconnected|graphics.card|motherboard|change.*HDMI|DisplayPort/i);
});

test('power, memory and storage tickets expose their relevant tools and fastener groups',()=>{
  const power=workbenchGuidance(base('INC-102'));assert.deepEqual(power.tools,['inspect','cables']);assert.deepEqual(power.cables,['ac']);assert.deepEqual(power.screws,[]);assert.equal(power.initialPart,'psu');
  const memory=workbenchGuidance(base('INC-103'));assert.deepEqual(memory.tools,['inspect','move','cables','screwdriver']);assert.deepEqual(memory.groups,['panel','ram','cables','display']);assert.deepEqual(memory.screws,['panel']);
  for(const id of ['INC-104','INC-105']){const storage=workbenchGuidance(base(id));assert.deepEqual(storage.tools,memory.tools);assert.deepEqual(storage.groups,['panel','ssd','cables','display']);assert.deepEqual(storage.cables,['ac','sata-data','sata-power']);assert.deepEqual(storage.screws,['panel','ssd']);assert.equal(storage.initialPart,'ssd');}
});

test('the complete build retains all six tools, every part group, ten cables and all screw groups',()=>{
  const guide=workbenchGuidance(base('INC-106'));assert.deepEqual(guide.tools,ASSEMBLY_TOOLS.map(tool=>tool.id));assert.deepEqual(guide.groups,groups);assert.deepEqual(guide.cables,ASSEMBLY_CABLES.map(cable=>cable.id));assert.deepEqual(guide.screws,Object.keys(ASSEMBLY_FASTENERS));assert.deepEqual(guide.views,views);
});

test('internal-work instructions follow actual power and case access without choosing a repair',()=>{
  for(const caseId of ['INC-103','INC-104','INC-105','INC-106']){
    const running={...base(caseId),pcOn:true,acConnected:true};assert.match(workbenchGuidance(running).instruction,/Power off.*disconnect AC/);
    const off=applyHardwareAction(caseId,running,'power-off').state;assert.match(workbenchGuidance(off).instruction,/PC is off.*Disconnect virtual AC/);
    const unplugged=applyHardwareAction(caseId,off,'unplug').state;const closed={...unplugged,assembly:{panelInstalled:true}};assert.match(workbenchGuidance(closed).instruction,/Open the case only.*secure the panel/);
    const open={...unplugged,assembly:{panelInstalled:false}};assert.doesNotMatch(workbenchGuidance(open).instruction,/remove.*panel|Power off|Disconnect virtual AC/);
    assert.doesNotMatch(workbenchGuidance(open).instruction,/reseat|reinstall|replace|disconnected data|wrong drive|connect SATA/i);
    const unsafe={...running,assembly:{panelInstalled:false}};assert.match(workbenchGuidance(unsafe).instruction,/case is open.*Power off/);
  }
});

test('a visible desktop prompts original-task testing and an open file prompts explanation, never automatic completion',()=>{
  const working=applyHardwareAction('INC-101',base('INC-101'),'video-gpu').state;
  for(const caseId of ids){const hardware={...working,caseId};const ready=workbenchGuidance(hardware);assert.match(ready.instruction,/Open the original lesson file/);assert.doesNotMatch(ready.instruction,/complete|verified|passed/i);
    const delivered=workbenchGuidance({...hardware,documentOpened:true});assert.match(delivered.instruction,/open original lesson file.*explain/i);
    assert.deepEqual(ready.tools,delivered.tools);assert.deepEqual(ready.groups,delivered.groups);
  }
});

test('contradictory boot and document flags cannot imply a desktop without AC, memory or original storage',()=>{
  const working=applyHardwareAction('INC-101',base('INC-101'),'video-gpu').state;
  for(const caseId of ids)for(const field of ['acConnected','boardInstalled','atxConnected','cpuPowerConnected','frontPanelConnected','cpuInstalled','coolerInstalled','ramSeated','gpuInstalled','gpuPowerConnected','originalDriveInstalled','sataDataConnected','sataPowerConnected']){
    const hardware={...working,caseId,[field]:false,pcOn:true,booted:true,documentOpened:true},before=clone(hardware);
    assert.doesNotMatch(workbenchGuidance(hardware).instruction,/desktop is available|Open the original lesson file|Check the open original lesson file/i,`${caseId} missing ${field}`);assert.deepEqual(hardware,before);
  }
});

test('instruction updates never reset authored initial choices or widen recommendations after unrelated state changes',()=>{
  for(const caseId of ids){const original=workbenchGuidance(base(caseId)),changed=workbenchGuidance({...base(caseId),pcOn:false,acConnected:false,assembly:{panelInstalled:false},selectedPart:'paste',view:'internals',tool:'clean',actions:['asm-remove-gpu']});
    for(const key of ['tools','groups','cables','screws','views','initialPart','initialCable','initialView'])assert.deepEqual(changed[key],original[key],caseId+' '+key);
  }
});

test('unknown or malformed identities use a conservative fixed fallback and ignore injected profile fields',()=>{
  const fallback=workbenchGuidance(undefined);
  for(const value of [null,[],false,'INC-106',{},new Date(),{caseId:'unknown'},{caseId:'__proto__'},{caseId:'constructor'},{caseId:'toString'},{caseId:106}])assert.deepEqual(workbenchGuidance(value),fallback);
  const injected=workbenchGuidance({caseId:'unknown',tools:['clean','<script>'],groups:['constructor'],title:'Injected',instruction:'Skip checks',initialView:'outside'});assert.deepEqual(injected,fallback);
  assert.deepEqual(fallback.tools,['inspect','cables']);assert.deepEqual(fallback.screws,[]);
});

test('inherited fields and accessors are never read, while own null-prototype data is supported',()=>{
  let getters=0;const inherited=Object.create({caseId:'INC-106',pcOn:false,acConnected:false});assert.deepEqual(workbenchGuidance(inherited),workbenchGuidance(undefined));
  const accessor={};for(const key of ['caseId','pcOn','acConnected','documentOpened','booted','assembly'])Object.defineProperty(accessor,key,{get(){getters++;throw new Error('getter ran');}});assert.deepEqual(workbenchGuidance(accessor),workbenchGuidance(undefined));assert.equal(getters,0);
  const nullData=Object.assign(Object.create(null),{caseId:'INC-103',pcOn:false,acConnected:false,assembly:Object.assign(Object.create(null),{panelInstalled:true})});assert.match(workbenchGuidance(nullData).instruction,/secure the panel/);
  const nested={caseId:'INC-103',pcOn:false,acConnected:false,assembly:{}};Object.defineProperty(nested.assembly,'panelInstalled',{get(){getters++;throw new Error('nested getter ran');}});assert.doesNotThrow(()=>workbenchGuidance(nested));assert.equal(getters,0);
});

test('missing and non-boolean safety fields never claim that internal work is safe',()=>{
  for(const fields of [{},{pcOn:0,acConnected:0},{pcOn:'false',acConnected:'false'},{pcOn:false},{acConnected:false}])assert.match(workbenchGuidance({caseId:'INC-103',...fields}).instruction,/Confirm that the PC is off and AC is disconnected/);
});

test('guidance never mutates a hardware record or leaks mutable shared profile lists',()=>{
  for(const caseId of ids){const hardware=base(caseId),before=clone(hardware);Object.freeze(hardware);const guide=workbenchGuidance(hardware);assert.deepEqual(hardware,before);assert.equal(Object.isFrozen(guide),true);for(const key of ['tools','groups','cables','screws','views'])assert.equal(Object.isFrozen(guide[key]),true);assert.throws(()=>guide.tools.push('clean'),TypeError);assert.deepEqual(workbenchGuidance(hardware),guide);}
});

test('the guidance module uses only the reviewed read-only activity import and has no I/O or repair calls',()=>{
  const source=readFileSync(new URL('../src/workbench-guidance.js',import.meta.url),'utf8'),imports=source.match(/^import[^\n]+/gm)||[];assert.equal(imports.length,1);assert.match(imports[0],/^import \{ pcActivity \} from '\.\/pc-activity\.js\?release=[^']+';$/);assert.doesNotMatch(source,/document\.|window\.|fetch\(|localStorage|sessionStorage|indexedDB|requestAnimationFrame|applyHardwareAction|applyAssemblyAction|assembly-scene|babylon|three\.module/gm);
});
