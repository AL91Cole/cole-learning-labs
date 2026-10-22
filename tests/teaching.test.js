import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SCENARIOS} from '../src/scenarios.js';
import {learningModes,lessonFor,lessonLink,assignmentUrl,buildLessonPlan,buildTeacherPrompt,renderLabLearning,renderTeachingPage,mountTeachingPage} from '../src/teaching.js';

test('every case has reviewed subject-specific learning and discussion material',()=>{
  const focus=new Set(),exits=new Set();
  for(const scenario of SCENARIOS){
    const lesson=lessonFor(scenario);
    assert.equal(lesson.id,scenario.id);
    assert.ok(lesson.goals[0].length>50);
    assert.equal(lesson.prerequisites.length,2);
    assert.equal(lesson.vocabulary.length,3);
    assert.ok(lesson.vocabulary.every(item=>item.term&&item.definition.length>30));
    assert.ok(lesson.model.length>90);
    assert.ok(lesson.discussion.endsWith('?'));
    assert.ok(lesson.exitQuestion.endsWith('?'));
    focus.add(lesson.goals[0]);exits.add(lesson.exitQuestion);
  }
  assert.equal(focus.size,SCENARIOS.length);
  assert.equal(exits.size,SCENARIOS.length);
});

test('lesson timing totals match all supported classroom lengths and modes',()=>{
  for(const scenario of SCENARIOS)for(const duration of [20,40,60])for(const mode of learningModes){
    const plan=buildLessonPlan(scenario,{duration,mode:mode.id});
    assert.equal(plan.steps.reduce((total,step)=>total+step.minutes,0),duration);
    assert.equal(plan.mode,mode.id);
    assert.ok(plan.steps.every(step=>step.minutes>0));
    assert.equal(plan.link,`#lab/${plan.id}?mode=${mode.id}`);
  }
  const invalid=buildLessonPlan(SCENARIOS[0],{duration:'1000',mode:'javascript:alert(1)',grouping:'anything'});
  assert.equal(invalid.duration,40);assert.equal(invalid.mode,'guided');assert.equal(invalid.grouping,'pairs');
});

test('new coding investigations open learning supports and bounded teacher preparation in every mode',()=>{
  for(const id of ['CODE-504','CODE-505','CODE-506']){
    const scenario=SCENARIOS.find(item=>item.id===id);
    assert.ok(scenario, id+' must be a selectable public investigation');
    for(const mode of learningModes){
      const plan=buildLessonPlan(scenario,{mode:mode.id,duration:20});
      assert.equal(plan.id,id);
      assert.equal(plan.link,`#lab/${id}?mode=${mode.id}`);
      assert.match(renderLabLearning(scenario,mode.id),/Words you can tap to define/);
      const prompt=buildTeacherPrompt({...scenario,brief:'PRIVATE_DRAFT',requester:'PRIVATE_NAME'}, {support:mode.id});
      assert.ok(prompt.includes('Public simulation case: '+id+'.'));
      assert.doesNotMatch(prompt,/PRIVATE_/);
      assert.match(prompt,/not a grading decision/);
    }
  }
  const rover=lessonFor(SCENARIOS.find(item=>item.id==='CODE-506'));
  assert.ok(rover.vocabulary.some(item=>item.term==='Accumulator'));
});

test('assignment URLs accept only reviewed case identities and a bounded support mode',()=>{
  assert.equal(lessonLink(SCENARIOS[0],'independent'),'#lab/INC-101?mode=independent');
  assert.equal(lessonLink(SCENARIOS[0],'challenge&student=private'),'#lab/INC-101?mode=guided');
  assert.equal(assignmentUrl(SCENARIOS[0],'guided'),'https://www.colelearninglabs.com/#lab/INC-101?mode=guided');
  assert.equal(assignmentUrl(SCENARIOS[0],'challenge'),'https://www.colelearninglabs.com/#lab/INC-107?mode=challenge');
  for(const id of ['javascript:alert(1)','INC-101?student=real','../../private','INC-999'])assert.throws(()=>lessonLink({id}),RangeError);
  assert.throws(()=>lessonFor({id:'UNKNOWN'}),RangeError);
  assert.throws(()=>lessonFor({id:'__proto__'}),RangeError);
  assert.throws(()=>buildTeacherPrompt({id:'constructor'}),RangeError);
});

test('challenge assignments explicitly use a fresh case for the same-symptom transfer family',()=>{
  const original=SCENARIOS.find(item=>item.id==='INC-101');
  const plan=buildLessonPlan(original,{mode:'challenge'});
  assert.equal(plan.id,'INC-107');assert.equal(plan.title,'No Picture After a Presentation');
  assert.equal(plan.transferFrom,'INC-101');assert.equal(plan.link,'#lab/INC-107?mode=challenge');
  assert.equal(lessonLink(original,'guided'),'#lab/INC-101?mode=guided');
  const network=buildLessonPlan(SCENARIOS.find(item=>item.id==='NET-201'),{mode:'challenge'});
  assert.equal(network.id,'NET-201');assert.equal(network.transferFrom,null);
  assert.match(network.exitQuestion,/gateway/);
});

test('mode supports differ while every learner can still open example and vocabulary',()=>{
  const guided=renderLabLearning(SCENARIOS[0],'guided');
  const independent=renderLabLearning(SCENARIOS[0],'independent');
  const challenge=renderLabLearning(SCENARIOS[0],'challenge');
  assert.doesNotMatch(guided,/class="learning-model" open/);
  assert.doesNotMatch(independent,/class="learning-model" open/);
  assert.doesNotMatch(challenge,/class="learning-model" open/);
  assert.match(independent,/Your first decision/);assert.match(challenge,/Compare two possible explanations/);
  for(const html of [guided,independent,challenge]){
    assert.match(html,/Words you can tap to define/);
    assert.match(html,/Use only the lab’s virtual controls/);
    assert.doesNotMatch(html,/Teacher lesson plans|href="#educators"/);
    assert.doesNotMatch(html,/href="#teach"/);
    assert.doesNotMatch(html,/<(?:script|iframe)|\bhidden\b/);
  }
});

test('rendered titles and labels cannot inject markup',()=>{
  const poisoned={...SCENARIOS[0],title:'<img src=x onerror="oops()"> & A'};
  const html=renderTeachingPage([poisoned]);
  assert.ok(html.includes('&lt;img src=x onerror=&quot;oops()&quot;&gt; &amp; A'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<script'));
  assert.match(renderTeachingPage([]),/No reviewed lesson plans/);
});

test('teacher prompt uses authored fictional case focus and bounded dropdown choices only',()=>{
  const poisoned={...SCENARIOS[0],title:'PRIVATE LEARNER',requester:'PRIVATE_EMAIL',goal:'PRIVATE_ID',brief:'PRIVATE_WORK',clues:[{text:'PRIVATE_EVIDENCE'}]};
  const prompt=buildTeacherPrompt(poisoned,{purpose:'PRIVATE_TASK',reading:'PRIVATE_LEVEL',support:'PRIVATE_MODE'});
  assert.doesNotMatch(prompt,/PRIVATE_/);
  assert.match(prompt,/Public simulation case: INC-101/);
  assert.match(prompt,/Use invented equipment and incidents only/);
  assert.match(prompt,/not a grading decision/);
  assert.match(prompt,/UNIMPLEMENTED DRAFT/);
  assert.match(prompt,/ambiguous question and an unsupported-detail question/);
  assert.match(prompt,/equivalent non-AI learning route/);
  assert.notEqual(prompt,buildTeacherPrompt(SCENARIOS[0],{purpose:'hints'}));
  assert.notEqual(prompt,buildTeacherPrompt(SCENARIOS[1]));
});

test('lesson metadata is copied so one classroom choice cannot change another lesson',()=>{
  const first=lessonFor(SCENARIOS[0]);first.goals[0]='changed';first.vocabulary[0].definition='changed';
  const second=lessonFor(SCENARIOS[0]);
  assert.notEqual(second.goals[0],'changed');assert.notEqual(second.vocabulary[0].definition,'changed');
});

test('teaching module loads without a browser and does not expose networking or student records',async()=>{
  assert.equal(typeof mountTeachingPage(null,SCENARIOS),'function');
  const source=await readFile(new URL('../src/teaching.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\s*[.(]/);
  assert.doesNotMatch(source,/\.innerHTML\s*=\s*(?:prompt\(|text\b|event\.)/);
  const html=renderTeachingPage(SCENARIOS);
  assert.match(html,/Copy teacher prompt/);assert.match(html,/does not generate AI replies or contact an AI service/);
  assert.match(html,/school’s authenticated teacher resources/);
  assert.doesNotMatch(html,/type="(?:text|email|password)"|contenteditable/);
});

test('printed lessons keep vocabulary visible and exclude surrounding page content',async()=>{
  const html=renderTeachingPage(SCENARIOS);
  assert.match(html,/<h3>Vocabulary<\/h3><div class="teaching-vocabulary"><details open>/);
  const css=await readFile(new URL('../src/teaching.css',import.meta.url),'utf8');
  const print=css.slice(css.indexOf('@media print'));
  assert.match(print,/\.teaching-page~\*/);
  assert.match(print,/\.teaching-page \.teacher-preparation/);
  assert.match(print,/\.teaching-page \.teaching-controls/);
  assert.match(print,/\.teaching-page \.teaching-plan-actions/);
});
