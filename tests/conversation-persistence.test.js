import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {initialHardwareState,applyHardwareAction,verifyHardware} from '../src/hardware.js';
import {answerQuestion,questionEvent,readQuestionEvents,inquiryProgress,retainInquiryEvents,inquiryProtectedEvents} from '../src/interview.js';
import {normalizeLabRecord} from '../src/records.js';
import {progressSnapshot} from '../src/classroom-client.js';
import {retainExperimentEvents} from '../src/experiments.js';

const entry=SCENARIOS.find(s=>s.id==='INC-101');
function deliveredHardware(id){
  const repairs={
    'INC-101':['video-gpu'],
    'INC-103':['power-off','unplug','seat-ram','plug-in','boot'],
    'INC-108':['connect-signal','input-hdmi']
  };
  assert.ok(repairs[id],`Supply a real repair for ${id}.`);
  let state=initialHardwareState(id);
  for(const action of [...repairs[id],'open-document']){
    const result=applyHardwareAction(id,state,action);
    if(id==='INC-108'&&action==='connect-signal') {
      assert.equal(result.state.signalConnected,true);
      assert.equal(result.state.monitorInput,'displayport');
      assert.equal(verifyHardware(id,result.state).ok,false,'One repaired connection does not complete the two-fault ticket.');
    } else assert.notEqual(result.kind,'warning',`${id}: ${action}: ${result.message}`);
    state=result.state;
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
  return {state:deliveredHardware(entry.id),events,symptoms:'The monitor has power but does not show a picture.',plan:'The display cable may be in the wrong video output.',ideaSaved:true,notes:'I compared the symptom with the reported desk move.',closed:true,verified:true};
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

test('answered case questions survive long action logs for every detailed ticket and activity',()=>{
  for(const scenario of SCENARIOS.filter(item=>item.intake?.kind!=='follow-up')){
    const question=scenario.questions.map(item=>item.label).find(question=>{
      const reply=answerQuestion(scenario,question);
      return reply.accepted&&reply.kind==='answer'&&!['conversation','how-to','privacy','scope','safety'].includes(reply.topic);
    });
    assert.ok(question,scenario.id+' has an answered case question');
    const reply=answerQuestion(scenario,question);
    assert.equal(reply.kind,'answer',scenario.id);assert.equal(reply.accepted,true,scenario.id);
    const event=questionEvent(question,reply);let inquiryEvents=[event],experimentEvents=[event];
    for(let index=0;index<125;index++){
      const action={kind:'info',message:'Virtual inspection '+index};
      inquiryEvents=retainInquiryEvents(scenario,[...inquiryEvents,action]);
      experimentEvents=retainExperimentEvents(scenario,[...experimentEvents,action]);
    }
    for(const events of [inquiryEvents,experimentEvents]){
      assert.equal(events.length,100,scenario.id);assert.deepEqual(readQuestionEvents(events),readQuestionEvents([event]),scenario.id);
      const normalized=normalizeLabRecord(scenario,{events});
      const restored=normalizeLabRecord(scenario,progressSnapshot(normalized,scenario.id));
      assert.equal(readQuestionEvents(restored.events).length,1,scenario.id);
    }
  }
});

test('detailed-ticket retention keeps a contextual answer and its concrete question together',()=>{
  const scenario=SCENARIOS.find(item=>item.id==='INC-102'),events=[];
  for(const question of ['What happened before the problem?','Explain that more simply']){
    const reply=answerQuestion(scenario,question,{},readQuestionEvents(events));
    assert.equal(reply.kind,'answer');events.push(questionEvent(question,reply));
  }
  assert.equal(answerQuestion(scenario,'Explain that more simply').kind,'clarify');
  assert.deepEqual(inquiryProtectedEvents(scenario,events),events);
  const actions=Array.from({length:125},(_,index)=>({kind:'info',message:'Virtual inspection '+index}));
  const retained=retainInquiryEvents(scenario,[...events,...actions]);
  assert.equal(retained.length,100);assert.deepEqual(retained.slice(0,2),events);
  const pairs=readQuestionEvents(retained);
  assert.equal(answerQuestion(scenario,pairs[1].question,{},pairs.slice(0,1)).kind,'answer');
});

test('greetings and clarification-only questions never become protected case progress',()=>{
  const scenario=SCENARIOS.find(item=>item.id==='INC-102');
  const questions=['Hello!','Thanks!','Could you say that again?','What color is your dog?'];
  const events=questions.map(question=>questionEvent(question,answerQuestion(scenario,question))).filter(Boolean);
  assert.deepEqual(inquiryProtectedEvents(scenario,events),[]);
  const actions=Array.from({length:125},(_,index)=>({kind:'info',message:'Virtual inspection '+index}));
  assert.deepEqual(retainInquiryEvents(scenario,[...events,...actions]),actions.slice(-100));
});

test('classroom byte trimming preserves the answered question in a detailed ticket',()=>{
  const scenario=SCENARIOS.find(item=>item.id==='INC-102');
  const question='What happened before the problem?',answered=questionEvent(question,answerQuestion(scenario,question));
  const record=normalizeLabRecord(scenario,{symptoms:'The desktop has no lights or fan noise.',plan:'I think the power connection came loose.',ideaSaved:true,events:[answered,...Array.from({length:99},()=>({kind:'info',message:'🙂'.repeat(300)}))]});
  const before=structuredClone(record),snapshot=progressSnapshot(record,scenario.id);
  assert.ok(snapshot.events.length<record.events.length);assert.deepEqual(snapshot.events[0],record.events[0]);
  assert.equal(snapshot.ideaSaved,true);assert.equal(readQuestionEvents(snapshot.events).length,1);assert.deepEqual(record,before);
});

test('previously saved requester wording keeps its clarification credit after voice improvements',()=>{
  for(const scenario of SCENARIOS.filter(s=>s.intake?.kind==='follow-up')){
    const fact=scenario.interviewFacts.find(item=>scenario.intake.factIds.includes(item.id));
    assert.ok(fact.legacyAnswers?.length,scenario.id);
    const question=scenario.questions[0].label;
    for(const answer of fact.legacyAnswers){
      const event=questionEvent(question,{accepted:true,kind:'answer',answer});
      assert.equal(inquiryProgress(scenario,[event]).complete,true,scenario.id);
      assert.equal(normalizeLabRecord(scenario,{closed:true,symptoms:'The reported task does not work as expected.',plan:'I will compare the clues with the reported behavior.',ideaSaved:true,events:[event],...(scenario.track==='hardware'?{state:deliveredHardware(scenario.id)}:{})}).closed,true,scenario.id);
    }
  }
});
