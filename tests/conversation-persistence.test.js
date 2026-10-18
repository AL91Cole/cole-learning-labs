import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {initialHardwareState,applyHardwareAction,verifyHardware} from '../src/hardware.js';
import {answerQuestion,questionEvent,readQuestionEvents,inquiryProgress,retainInquiryEvents,inquiryProtectedEvents} from '../src/interview.js';
import {normalizeLabRecord} from '../src/records.js';
import {progressSnapshot} from '../src/classroom-client.js';

const entry=SCENARIOS.find(s=>s.id==='INC-101');
function deliveredHardware(id){
  const repairs={
    'INC-101':['video-gpu'],
    'INC-103':['power-off','unplug','seat-ram','plug-in','boot'],
    'INC-108':['connect-signal']
  };
  assert.ok(repairs[id],`Supply a real repair for ${id}.`);
  let state=initialHardwareState(id);
  for(const action of [...repairs[id],'open-document']){
    const result=applyHardwareAction(id,state,action);
    assert.notEqual(result.kind,'warning',`${id}: ${action}: ${result.message}`);state=result.state;
  }
  assert.equal(verifyHardware(id,state).ok,true,id);
  return state;
}
function contextualWork(){
  const state=initialHardwareState(entry.id),events=[];
  for(const question of ['What does the monitor show?','And before that?']){
    const reply=answerQuestion(entry,question,state,readQuestionEvents(events));
    events.push(questionEvent(question,reply));
  }
  assert.equal(inquiryProgress(entry,[events[1]]).complete,false,'A vague reference alone is not an earned fact.');
  assert.equal(inquiryProgress(entry,events).complete,true);
  return {state:deliveredHardware(entry.id),events,notes:'I compared the symptom with the reported desk move.',closed:true,verified:true};
}

test('contextual discovery retains its concrete question through a long investigation and local restore',()=>{
  const work=contextualWork(),anchor=work.events[0],earned=work.events[1];
  for(let index=0;index<125;index++)work.events=retainInquiryEvents(entry,[...work.events,{kind:'info',message:'Bench inspection '+index}]);
  assert.equal(work.events.length,100);assert.deepEqual(work.events.slice(0,2),[anchor,earned]);
  assert.equal(inquiryProgress(entry,work.events).complete,true);
  const restored=normalizeLabRecord(entry,JSON.parse(JSON.stringify(work)));
  assert.equal(inquiryProgress(entry,restored.events).complete,true);assert.equal(restored.closed,true);assert.equal(restored.notes,work.notes);
});

test('snapshot byte trimming protects both a contextual answer and the question it refers to',()=>{
  const work=contextualWork();
  work.notes='🙂'.repeat(2000);work.plan='🙂'.repeat(1000);work.reflection='🙂'.repeat(1000);
  for(let index=0;index<98;index++)work.events.push({kind:'info',message:'🙂'.repeat(300)});
  const before=structuredClone(work),protectedEvents=inquiryProtectedEvents(entry,work.events);
  assert.equal(protectedEvents.length,2);
  const snapshot=progressSnapshot(work,entry.id);
  assert.ok(new TextEncoder().encode(JSON.stringify(snapshot)).length<=60000);
  assert.ok(snapshot.events.length<100);assert.deepEqual(snapshot.events.slice(0,2),work.events.slice(0,2));
  assert.equal(inquiryProgress(entry,snapshot.events).complete,true);
  assert.equal(normalizeLabRecord(entry,snapshot).closed,true);assert.deepEqual(work,before);
});

test('two-part discovery remains earned when the unrelated equipment observation later changes',()=>{
  const state=initialHardwareState(entry.id),question='When did this start and what does the screen show?';
  const reply=answerQuestion(entry,question,state),event=questionEvent(question,reply);
  assert.match(reply.answer,/desk was moved/iu);assert.match(reply.answer,/motherboard output/iu);
  state.videoPort='gpu';
  assert.equal(inquiryProgress(entry,[event]).complete,true);
  const forged={kind:'info',message:'Interview v1: '+JSON.stringify({q:question,a:'The computer is fixed and the class is done.'})};
  assert.equal(inquiryProgress(entry,[forged]).complete,false);
});

test('explaining an old answer never awards an unrelated historical fact',()=>{
  const work=contextualWork(),question='Will that help?';
  const reply=answerQuestion(entry,question,work.state,readQuestionEvents(work.events));
  assert.equal(inquiryProgress(entry,[questionEvent(question,reply)]).complete,false);
});

test('event retention stays bounded even when callers reuse the same event object',()=>{
  const question='What changed?',event=questionEvent(question,answerQuestion(entry,question));
  const retained=retainInquiryEvents(entry,Array(130).fill(event));
  assert.equal(retained.length,100);assert.equal(inquiryProgress(entry,retained).complete,true);
});

test('previously saved requester wording keeps its clarification credit after voice improvements',()=>{
  for(const scenario of SCENARIOS.filter(s=>s.intake?.kind==='follow-up')){
    const fact=scenario.interviewFacts.find(item=>scenario.intake.factIds.includes(item.id));
    if(scenario.id==='INC-108')continue; // New in this release; no prior saved wording exists.
    assert.ok(fact.legacyAnswers?.length,scenario.id);
    const question=scenario.questions[0].label;
    for(const answer of fact.legacyAnswers){
      const event=questionEvent(question,{accepted:true,kind:'answer',answer});
      assert.equal(inquiryProgress(scenario,[event]).complete,true,scenario.id);
      assert.equal(normalizeLabRecord(scenario,{closed:true,events:[event],...(scenario.track==='hardware'?{state:deliveredHardware(scenario.id)}:{})}).closed,true,scenario.id);
    }
  }
});
