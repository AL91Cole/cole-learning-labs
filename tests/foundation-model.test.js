import test from 'node:test';
import assert from 'node:assert/strict';
import { FOUNDATION_LABS, getFoundation, createFoundationRecord, applyFoundationAction, foundationSummary, foundationReport } from '../src/foundation-model.js';
import { verifyHardware } from '../src/hardware.js';
import { SCENARIOS } from '../src/scenarios.js';

function step(id,state,action,expected) {
  const before=structuredClone(state),result=applyFoundationAction(id,state,action);
  assert.deepEqual(state,before,'an action mutated its input record');
  if(expected)assert.equal(result.kind,expected,result.message);
  return result;
}
function prepared(id) {
  const lab=getFoundation(id);let state=createFoundationRecord(id);
  for(const item of lab.items)state=step(id,state,{type:'inspect',item:item.id},'success').state;
  for(const check of lab.checks)state=step(id,state,{type:'answer',check:check.id,value:check.answer},'success').state;
  return state;
}
function practiceAll(id,state=prepared(id)) {
  for(const job of getFoundation(id).jobs)state=step(id,state,{type:'practice',action:job.action},'success').state;
  return state;
}
function finishPractice(id) {
  if(id!=='coding')return practiceAll(id);
  let state=step(id,prepared(id),{type:'code',source:'print(quantity * 3);'}).state;
  return step(id,state,{type:'run-code'},'success').state;
}
function saveExplanation(id,state=finishPractice(id)) {
  state=step(id,state,{type:'explain',notes:'I followed the steps and checked the practice result.',reflection:'I learned to compare the result with the task before finishing.'}).state;
  return step(id,state,{type:'save-explanation'},'success').state;
}

test('five public beginner foundations stay separate from the 42 investigation tickets',()=>{
  assert.equal(FOUNDATION_LABS.length,5);assert.equal(SCENARIOS.length,42);
  assert.deepEqual(FOUNDATION_LABS.map(lab=>lab.id),['hardware','network','ai','security','coding']);
  assert.deepEqual(FOUNDATION_LABS.map(lab=>lab.code),['HW-100','NET-200','AI-300','SEC-400','CODE-500']);
  assert.deepEqual(FOUNDATION_LABS.map(lab=>lab.nextLab),['INC-101','NET-201','AI-301','SEC-401','CODE-501']);
  for(const lab of FOUNDATION_LABS){
    assert.equal(getFoundation(lab.code),lab);assert.equal(lab.grade,'7–12');assert.ok(lab.minutes>=10&&lab.minutes<=15);
    assert.equal(lab.checks.length,3);assert.equal(Object.isFrozen(lab),true);assert.equal(Object.isFrozen(lab.items[0]),true);
    assert.equal(SCENARIOS.some(ticket=>ticket.id===lab.code),false);
    assert.equal(SCENARIOS.some(ticket=>ticket.id===lab.nextLab),true);
    for(const item of lab.items){assert.ok(item.looks);assert.ok(item.role);}
  }
});

test('unknown foundations do not silently open or complete another lab',()=>{
  for(const id of ['constructor','__proto__','INC-101','network<script>',{},null]){
    assert.equal(getFoundation(id),null);assert.equal(createFoundationRecord(id),null);
    assert.equal(applyFoundationAction(id,{},{}).state,null);assert.equal(foundationSummary(id,{}).complete,false);
  }
});

test('prepared fixtures alone are not student work and records are independent copies',()=>{
  for(const lab of FOUNDATION_LABS){
    const state=createFoundationRecord(lab.id),summary=foundationSummary(lab.id,state);
    assert.equal(summary.hasWork,false);assert.equal(summary.complete,false);assert.equal(summary.practice,0);assert.equal(summary.checked,0);assert.equal(summary.explored,0);
  }
  const first=createFoundationRecord('hardware');first.hardware.assembly.panelScrews[0]=true;first.hardware.ramSeated=true;
  const second=createFoundationRecord('hardware');assert.equal(second.hardware.ramSeated,false);assert.deepEqual(second.hardware.assembly.panelScrews,[false,false]);
});

test('hardware starts in a real safely prepared open case with the original SSD preserved',()=>{
  const h=createFoundationRecord('hardware').hardware;
  assert.equal(h.caseId,'INC-101');assert.equal(h.pcOn,false);assert.equal(h.acConnected,false);assert.equal(h.assemblyEnabled,true);
  assert.equal(h.assembly.panelInstalled,false);assert.equal(h.assembly.ramClipsOpen,true);assert.equal(h.ramSeated,false);
  assert.equal(h.originalDriveInstalled,true);assert.equal(h.booted,false);assert.equal(h.documentOpened,false);
  assert.equal(h.videoPort,'board');assert.equal(h.pcVideoConnected,true);assert.equal(h.signalConnected,true);
  assert.equal(verifyHardware('INC-101',h).ok,false);
});

test('inspection records each authored item once and never repairs equipment',()=>{
  let state=createFoundationRecord('hardware');const hardware=structuredClone(state.hardware);
  state=step('hardware',state,{type:'inspect',item:'ram'},'success').state;
  state=step('hardware',state,{type:'inspect',item:'ram'},'success').state;
  assert.deepEqual(state.explored,['ram']);assert.deepEqual(state.hardware,hardware);assert.equal(foundationSummary('hardware',state).practice,0);
  const wrong=step('hardware',state,{type:'inspect',item:'view-rear'},'warning');assert.deepEqual(wrong.state.explored,['ram']);assert.equal(foundationSummary('hardware',wrong.state).hasWork,true);
});

test('role checks keep wrong choices for feedback and count only correct answers',()=>{
  const lab=getFoundation('network'),check=lab.checks[0];let state=createFoundationRecord(lab.id);
  state=step(lab.id,state,{type:'answer',check:check.id,value:'dns'},'warning').state;
  assert.equal(state.answers[check.id],'dns');assert.equal(foundationSummary(lab.id,state).checked,0);assert.equal(foundationSummary(lab.id,state).hasWork,true);
  state=step(lab.id,state,{type:'answer',check:check.id,value:check.answer},'success').state;
  assert.equal(foundationSummary(lab.id,state).checked,1);
  const forged=step(lab.id,state,{type:'answer',check:'unknown',value:'right'},'warning');assert.deepEqual(forged.state.answers,state.answers);
});

test('guided practice requires exploration and correct role checks before any credit',()=>{
  for(const lab of FOUNDATION_LABS){
    let state=createFoundationRecord(lab.id);
    assert.match(step(lab.id,state,{type:'practice',action:lab.jobs[0].action},'warning').message,/Explore each/);
    for(const item of lab.items)state=step(lab.id,state,{type:'inspect',item:item.id}).state;
    const blocked=step(lab.id,state,{type:'practice',action:lab.jobs[0].action},'warning');assert.match(blocked.message,/all three questions/);assert.equal(blocked.state.practice.length,0);
  }
});

test('hardware guided practice accepts only the actual next guarded action',()=>{
  let state=prepared('hardware');
  for(const action of ['view-rear','boot','open-document','asm-tighten-panel-1','asm-close-ram-clips']){
    const failed=step('hardware',state,{type:'practice',action},'warning');assert.deepEqual(failed.state.hardware,state.hardware);assert.deepEqual(failed.state.practice,[]);
  }
  state=step('hardware',state,{type:'practice',action:'asm-fit-ram'},'success').state;
  assert.equal(state.hardware.ramSeated,true);assert.equal(state.hardware.assembly.ramClipsOpen,true);assert.equal(state.hardware.booted,false);
  assert.equal(foundationSummary('hardware',state).practice,1);
  const before=structuredClone(state.hardware);state=step('hardware',state,{type:'practice',action:'asm-fit-ram'},'warning').state;
  assert.deepEqual(state.hardware,before);assert.equal(state.practice.length,1);
});

test('the complete hardware mini-job needs mounts, display, startup, and original-file delivery',()=>{
  const lab=getFoundation('hardware');let state=prepared(lab.id);
  for(let index=0;index<lab.jobs.length;index++){
    state=step(lab.id,state,{type:'practice',action:lab.jobs[index].action},'success').state;
    assert.equal(foundationSummary(lab.id,state).practiceComplete,index===lab.jobs.length-1);
  }
  assert.equal(state.hardware.assembly.ramClipsOpen,false);assert.equal(state.hardware.assembly.panelInstalled,true);
  assert.deepEqual(state.hardware.assembly.panelScrews,[true,true]);assert.equal(state.hardware.videoPort,'gpu');assert.equal(state.hardware.documentOpened,true);
  assert.equal(verifyHardware('INC-101',state.hardware).ok,true);assert.equal(foundationSummary(lab.id,state).practiceComplete,true);assert.equal(foundationSummary(lab.id,state).complete,false);
});

test('changing a role answer after practice preserves the learner equipment and reopens completion',()=>{
  const lab=getFoundation('hardware'),complete=saveExplanation(lab.id),before=structuredClone(complete.hardware);
  const check=lab.checks[0],wrong=check.options.find(option=>option.id!==check.answer);
  let state=step(lab.id,complete,{type:'answer',check:check.id,value:wrong.id},'warning').state;
  assert.deepEqual(state.hardware,before);assert.deepEqual(state.practice,complete.practice);assert.equal(foundationSummary(lab.id,state).complete,false);
  state=step(lab.id,state,{type:'answer',check:check.id,value:check.answer},'success').state;
  assert.equal(foundationSummary(lab.id,state).practiceComplete,true);assert.equal(state.explanationSaved,false);assert.equal(state.notes,complete.notes);assert.equal(foundationSummary(lab.id,state).complete,false);
  state=step(lab.id,state,{type:'save-explanation'},'success').state;assert.equal(foundationSummary(lab.id,state).complete,true);
});

test('network practice separates physical link, automatic settings, and DNS/application evidence',()=>{
  let state=prepared('network');
  state=step('network',state,{type:'practice',action:'test-service'},'warning').state;assert.equal(state.simulation.serviceReachable,false);
  state=step('network',state,{type:'practice',action:'connect-wired'},'success').state;
  assert.deepEqual(state.simulation,{wired:true,ipAssigned:false,dnsReady:false,serviceReachable:false});
  state=step('network',state,{type:'practice',action:'request-dhcp'},'success').state;
  assert.deepEqual(state.simulation,{wired:true,ipAssigned:true,dnsReady:false,serviceReachable:false});
  state=step('network',state,{type:'practice',action:'test-service'},'success').state;
  assert.equal(state.simulation.dnsReady,true);assert.equal(state.simulation.serviceReachable,true);assert.equal(foundationSummary('network',state).practiceComplete,true);
});

test('AI practice uses a fictional prompt then evidence and human review in order',()=>{
  let state=prepared('ai');
  state=step('ai',state,{type:'practice',action:'request-human-review'},'warning').state;assert.equal(state.simulation.humanReviewed,false);
  for(const [action,expected] of [['choose-fictional',{fictionalPrompt:true,evidenceChecked:false,humanReviewed:false}],['check-evidence',{fictionalPrompt:true,evidenceChecked:true,humanReviewed:false}],['request-human-review',{fictionalPrompt:true,evidenceChecked:true,humanReviewed:true}]]){
    state=step('ai',state,{type:'practice',action},'success').state;assert.deepEqual(state.simulation,expected);
  }
  assert.equal(foundationSummary('ai',state).practiceComplete,true);
});

test('security practice requires scope and simulated MFA before reducing the fictional role',()=>{
  let state=prepared('security');
  state=step('security',state,{type:'practice',action:'least-privilege'},'warning').state;assert.equal(state.simulation.role,'administrator');
  for(const action of ['confirm-scope','enable-mfa','least-privilege'])state=step('security',state,{type:'practice',action},'success').state;
  assert.deepEqual(state.simulation,{scopeConfirmed:true,mfaEnabled:true,leastPrivilege:true,role:'learner'});assert.equal(foundationSummary('security',state).practiceComplete,true);
});

test('coding starter fails actual 0, 2, and 5 fixtures; changing the operator passes all three',()=>{
  let state=prepared('coding');
  state=step('coding',state,{type:'run-code'},'warning').state;
  assert.deepEqual(state.results.map(run=>[run.quantity,run.output,run.passed]),[[0,['3'],false],[2,['5'],false],[5,['8'],false]]);
  state=step('coding',state,{type:'code',source:'let price = 3;\nprint(quantity * price);'}).state;
  assert.deepEqual(state.results,[]);assert.equal(state.sourceAtRun,'');
  state=step('coding',state,{type:'run-code'},'success').state;
  assert.deepEqual(state.results.map(run=>[run.quantity,run.expected,run.output,run.passed]),[[0,'0',['0'],true],[2,'6',['6'],true],[5,'15',['15'],true]]);
  assert.deepEqual(state.practice,['fixture-0','fixture-2','fixture-5']);assert.equal(foundationSummary('coding',state).practiceComplete,true);
});

test('a constant answer cannot pass every fixture and every edited program needs a fresh run',()=>{
  let state=prepared('coding');
  state=step('coding',state,{type:'code',source:'print(6);'}).state;state=step('coding',state,{type:'practice',action:'run-code'},'warning').state;
  assert.deepEqual(state.practice,['fixture-2']);assert.equal(foundationSummary('coding',state).complete,false);
  state=step('coding',state,{type:'code',source:'print(quantity * 3);'}).state;state=step('coding',state,{type:'run-code'},'success').state;
  const runCount=state.runCount;state=step('coding',state,{type:'code',source:state.code}).state;assert.equal(foundationSummary('coding',state).practiceComplete,true);assert.equal(state.runCount,runCount);
  state=step('coding',state,{type:'code',source:'print(quantity + 3);'}).state;
  assert.equal(state.sourceAtRun,'');assert.deepEqual(state.results,[]);assert.deepEqual(state.practice,[]);assert.equal(foundationSummary('coding',state).complete,false);
});

test('coding edits are bounded, can be drafted before practice, and do not execute browser APIs',()=>{
  let state=createFoundationRecord('coding');state=step('coding',state,{type:'code',source:'print(quantity * 3);'}).state;
  assert.equal(state.code,'print(quantity * 3);');assert.equal(foundationSummary('coding',state).hasWork,true);
  assert.equal(step('coding',state,{type:'code',source:'x'.repeat(4001)},'warning').state.code,state.code);
  assert.equal(step('coding',state,{type:'run-code'},'warning').state.runCount,0);
  state=prepared('coding');state=step('coding',state,{type:'code',source:'fetch("https://example.test");'}).state;state=step('coding',state,{type:'run-code'},'warning').state;
  assert.equal(state.results.every(run=>!run.passed&&run.error),true);
  state=step('coding',state,{type:'code',source:'repeat (50) { repeat (50) { print(1); } }'}).state;state=step('coding',state,{type:'run-code'},'warning').state;
  assert.equal(state.results.every(run=>run.output.length<=20&&run.error),true);
});

test('forged passing outputs, stale source, and fabricated complete fields do not grant coding credit',()=>{
  const base=prepared('coding'),forged={...base,complete:true,practice:['fixture-0','fixture-2','fixture-5'],results:[{passed:true}],runCount:1,sourceAtRun:base.code};
  assert.equal(foundationSummary('coding',forged).complete,false);assert.equal(foundationSummary('coding',forged).practice,0);
  assert.equal(foundationSummary('coding',{...forged,code:'print(quantity * 3);'}).practice,0);
  assert.equal(foundationSummary('coding',{...forged,code:'print(quantity * 3);',sourceAtRun:'print(quantity * 3);',runCount:0}).practice,0);
});

test('normalization keeps fixed own shapes and rebuilds raw simulation or equipment from ordered actions',()=>{
  const base=prepared('hardware'),forged={...base,studentEmail:'not-kept@example.test',hardware:{pcOn:true,documentOpened:true,ramSeated:true},practice:['asm-fit-ram','open-document'],simulation:{anything:true}};
  const state=step('hardware',forged,{type:'inspect',item:'board'}).state;
  assert.deepEqual(state.practice,['asm-fit-ram']);assert.equal(state.hardware.ramSeated,true);assert.equal(state.hardware.documentOpened,false);assert.equal(state.hardware.pcOn,false);
  assert.equal(Object.hasOwn(state,'studentEmail'),false);assert.deepEqual(state.simulation,{});
  const inherited=Object.create({version:1,labId:'hardware',explored:getFoundation('hardware').items.map(item=>item.id)});
  assert.equal(foundationSummary('hardware',inherited).hasWork,false);
  assert.equal(foundationSummary('network',{...prepared('network'),practice:['test-service'],simulation:{serviceReachable:true}}).practice,0);
  assert.equal(foundationSummary('network',{...prepared('network'),labId:'ai'}).hasWork,false);
});

test('getters, sparse arrays, and malformed actions cannot execute or earn progress',()=>{
  const lab=getFoundation('ai'),prior=createFoundationRecord(lab.id);
  Object.defineProperty(prior,'answers',{enumerable:true,get(){throw Error('do not execute record getters');}});
  const sparse=Array(6);Object.defineProperty(sparse,'0',{get(){throw Error('do not execute array getters');}});
  prior.explored=sparse;
  assert.equal(foundationSummary(lab.id,prior).explored,0);
  const action={};Object.defineProperty(action,'type',{get(){throw Error('do not execute action getters');}});
  assert.equal(applyFoundationAction(lab.id,prior,action).kind,'warning');
  for(const malformed of [null,[],{type:'unknown'},{type:'answer',check:'constructor',value:'x'},{type:'practice',action:'fetch-roster'}])assert.equal(applyFoundationAction(lab.id,createFoundationRecord(lab.id),malformed).state.practice.length,0);
});

test('reports describe actual current work, correct stale coding output, and include no hidden identity fields',()=>{
  const hardware=saveExplanation('hardware'),report=foundationReport('hardware',{...hardware,studentId:'not-for-report'});
  assert.match(report,/HW-100/);assert.match(report,/Status: COMPLETE/);assert.match(report,/Original lesson file opened: yes/);assert.doesNotMatch(report,/not-for-report/);
  let code=prepared('coding');code=step('coding',code,{type:'code',source:'print(quantity * 3);'}).state;code=step('coding',code,{type:'run-code'}).state;
  assert.match(foundationReport('coding',code),/quantity 5 — expected 15; actual 15; PASS/);
  code=step('coding',code,{type:'code',source:'print(quantity + 3);'}).state;
  assert.match(foundationReport('coding',code),/Run all fixtures for the current code/);assert.doesNotMatch(foundationReport('coding',code),/actual 15; PASS/);
  assert.match(foundationReport('network',practiceAll('network')),/192\.0\.2\.20/);
});

test('completed practice remains bounded and unknown or view-only actions cannot add progress',()=>{
  let state=practiceAll('network'),length=state.practice.length;
  const unknown=step('network',state,{type:'practice',action:'view-cable'},'warning');assert.equal(unknown.state.practice.length,length);
  state=step('network',state,{type:'practice',action:'test-service'}).state;assert.equal(state.practice.length,length);
  const extreme={...state,attempts:Number.MAX_SAFE_INTEGER,runCount:-1,explored:Array(2000).fill('device')};
  const bounded=applyFoundationAction('network',extreme,{type:'inspect',item:'dns'}).state;
  assert.ok(bounded.attempts<=1000000);assert.ok(bounded.explored.length<=getFoundation('network').items.length);assert.equal(bounded.runCount,0);
});

test('all five foundations require the actual practice result and two saved explanation answers',()=>{
  for(const lab of FOUNDATION_LABS) {
    let state=createFoundationRecord(lab.id);
    state=step(lab.id,state,{type:'explain',notes:'I described the steps in my own words.',reflection:'I explained what I learned from the result.'}).state;
    assert.equal(foundationSummary(lab.id,state).hasWork,true);
    state=step(lab.id,state,{type:'save-explanation'},'warning').state;assert.equal(state.explanationSaved,false);
    state=finishPractice(lab.id);assert.equal(foundationSummary(lab.id,state).practiceComplete,true);assert.equal(foundationSummary(lab.id,state).complete,false);
    state=step(lab.id,state,{type:'explain',notes:'I completed the practice job and checked its result.'}).state;
    state=step(lab.id,state,{type:'save-explanation'},'warning').state;
    state=step(lab.id,state,{type:'explain',reflection:'   short   '}).state;
    state=step(lab.id,state,{type:'save-explanation'},'warning').state;assert.equal(state.explanationSaved,false);
    state=step(lab.id,state,{type:'explain',reflection:'I learned why the practice result meets the task.'}).state;
    assert.equal(foundationSummary(lab.id,state).complete,false,'Typing both answers does not silently save them.');
    state=step(lab.id,state,{type:'save-explanation'},'success').state;
    assert.equal(foundationSummary(lab.id,state).complete,true);assert.equal(state.explanationSaved,true);
    const report=foundationReport(lab.id,state);assert.match(report,/Status: COMPLETE/);assert.ok(report.includes(state.notes));assert.ok(report.includes(state.reflection));assert.match(report,/Explanation saved: yes/);
  }
});

test('editing an explanation reopens completion without losing the finished practice or other answer',()=>{
  for(const lab of FOUNDATION_LABS) {
    let state=saveExplanation(lab.id),notes=state.notes;
    state=step(lab.id,state,{type:'explain',notes}).state;assert.equal(state.explanationSaved,true,'An unchanged answer stays saved.');
    state=step(lab.id,state,{type:'explain',reflection:'I changed my explanation after reviewing the result.'}).state;
    assert.equal(state.notes,notes);assert.equal(state.explanationSaved,false);assert.equal(foundationSummary(lab.id,state).practiceComplete,true);assert.equal(foundationSummary(lab.id,state).complete,false);
    assert.match(foundationReport(lab.id,state),/Status: IN PROGRESS/);
    state=step(lab.id,state,{type:'save-explanation'},'success').state;assert.equal(foundationSummary(lab.id,state).complete,true);
  }
});

test('inspection, repeated correct answers and fresh runs of unchanged code preserve the saved explanation',()=>{
  for(const lab of FOUNDATION_LABS) {
    let state=saveExplanation(lab.id),writing={notes:state.notes,reflection:state.reflection};
    state=step(lab.id,state,{type:'inspect',item:lab.items[0].id},'success').state;
    state=step(lab.id,state,{type:'answer',check:lab.checks[0].id,value:lab.checks[0].answer},'success').state;
    if(lab.id==='coding') {
      state=step(lab.id,state,{type:'code',source:state.code}).state;
      state=step(lab.id,state,{type:'run-code'},'success').state;
    }
    assert.equal(state.explanationSaved,true);assert.equal(foundationSummary(lab.id,state).complete,true);assert.deepEqual({notes:state.notes,reflection:state.reflection},writing);
  }
});

test('changed code and missing practice steps require another explanation save after actual retesting',()=>{
  let code=saveExplanation('coding'),writing={notes:code.notes,reflection:code.reflection};
  code=step('coding',code,{type:'code',source:'let cost = quantity * 3; print(cost);'}).state;
  assert.equal(code.explanationSaved,false);assert.equal(foundationSummary('coding',code).practiceComplete,false);
  code=step('coding',code,{type:'save-explanation'},'warning').state;
  code=step('coding',code,{type:'run-code'},'success').state;
  assert.equal(foundationSummary('coding',code).practiceComplete,true);assert.equal(foundationSummary('coding',code).complete,false);assert.deepEqual({notes:code.notes,reflection:code.reflection},writing);
  code=step('coding',code,{type:'save-explanation'},'success').state;assert.equal(foundationSummary('coding',code).complete,true);
  const prior=saveExplanation('network'),missing={...prior,practice:prior.practice.slice(0,-1)};
  const repaired=step('network',missing,{type:'practice',action:'test-service'},'success').state;
  assert.equal(foundationSummary('network',repaired).practiceComplete,true);assert.equal(repaired.explanationSaved,false);assert.equal(repaired.notes,prior.notes);
});

test('legacy and damaged records keep legitimate practice but cannot invent a saved explanation',()=>{
  const completed=saveExplanation('network'),legacy={...completed};delete legacy.notes;delete legacy.reflection;delete legacy.explanationSaved;
  assert.equal(foundationSummary('network',legacy).practiceComplete,true);assert.equal(foundationSummary('network',legacy).complete,false);
  const restored=step('network',JSON.parse(JSON.stringify(completed)),{type:'inspect',item:'device'}).state;assert.equal(restored.explanationSaved,true);assert.equal(restored.notes,completed.notes);
  for(const patch of [{notes:[]},{reflection:{}},{explanationSaved:'true'},{explanationSaved:1},{notes:'     '},{reflection:'short'}])assert.equal(foundationSummary('network',{...completed,...patch}).complete,false);
  let reads=0;const damaged={...completed};Object.defineProperty(damaged,'notes',{get(){reads++;throw Error('do not read a writing getter');}});
  assert.equal(foundationSummary('network',damaged).complete,false);assert.equal(reads,0);
  const action={type:'explain'};Object.defineProperty(action,'reflection',{get(){reads++;throw Error('do not read an action getter');}});
  const unchanged=step('network',completed,action).state;assert.equal(unchanged.reflection,completed.reflection);assert.equal(unchanged.explanationSaved,true);assert.equal(reads,0);
  const bounded=step('network',completed,{type:'explain',notes:'n'.repeat(2500),reflection:'r'.repeat(2500)}).state;
  assert.equal(bounded.notes.length,2000);assert.equal(bounded.reflection.length,2000);assert.equal(bounded.explanationSaved,false);
  const invalid=step('network',completed,{type:'explain',notes:'A different answer.',reflection:[]},'warning').state;assert.equal(invalid.notes,completed.notes);assert.equal(invalid.reflection,completed.reflection);
});

test('authored practice alternatives teach mistakes without changing equipment or granting credit',()=>{
  for(const id of ['network','ai','security']){
    const lab=getFoundation(id);let state=prepared(id);
    for(const [index,choice]of lab.choices.entries()){
      const simulation=structuredClone(state.simulation),trial=step(id,state,{type:'practice',action:choice.action},'warning');
      assert.equal(trial.message,choice.feedback);assert.deepEqual(trial.state.simulation,simulation);assert.equal(trial.state.practice.length,index);assert.equal(foundationSummary(id,trial.state).practiceComplete,false);
      state=step(id,trial.state,{type:'practice',action:lab.jobs[index].action},'success').state;
    }
    assert.equal(foundationSummary(id,state).practiceComplete,true);assert.equal(foundationSummary(id,state).complete,false);
    const blocked=step(id,createFoundationRecord(id),{type:'practice',action:lab.choices[0].action},'warning');assert.deepEqual(blocked.state.practice,[]);assert.match(blocked.message,/Explore each/);
  }
});
