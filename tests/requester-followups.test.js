import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {answerQuestion,questionEvent,readQuestionEvents,inquiryProgress} from '../src/interview.js';
import {initialHardwareState} from '../src/hardware.js';

function requester() {
  const scenario=SCENARIOS.find(entry=>entry.id==='INC-101');
  const state=initialHardwareState(scenario.id),events=[];
  return {scenario,state,events,ask(question){
    const before=structuredClone(state);
    const reply=answerQuestion(scenario,question,state,readQuestionEvents(events));
    assert.deepEqual(state,before,'Conversation must not change the equipment.');
    assert.ok(reply.answer.length>0&&reply.answer.length<=300);
    const event=questionEvent(question,reply);if(event)events.push(event);
    return reply;
  }};
}

test('the visible explain-that example refers to the requester’s previous observation',()=>{
  const chat=requester();chat.ask('What were you doing when it happened?');
  const reply=chat.ask('Can you explain that?');
  assert.equal(reply.kind,'answer');
  assert.match(reply.answer,/worked before|before the move|desk.*mov|display cable.*reconnect/iu);
  assert.doesNotMatch(reply.answer,/detail is not recorded|which part do you mean/iu);
});

test('asking for a different explanation uses current equipment rather than the saved old reply',()=>{
  const chat=requester();chat.ask('What does the monitor show?');
  chat.state.videoPort='gpu';
  const reply=chat.ask('Could you explain that in a different way?');
  assert.equal(reply.kind,'answer');
  assert.match(reply.answer,/graphics[- ]card|can show the desktop|display.*working/iu);
  assert.doesNotMatch(reply.answer,/motherboard output.*not ready|detail is not recorded/iu);
});

test('a natural why follow-up points to recorded evidence rather than inventing an event',()=>{
  const chat=requester();chat.ask('What were you doing before that happened?');
  const reply=chat.ask('Can you tell me why that happened?');
  assert.equal(reply.kind,'answer');
  assert.match(reply.answer,/worked before|before the move|desk.*mov|display cable.*reconnect/iu);
  assert.doesNotMatch(reply.answer,/detail is not recorded|new graphics card|power surge|Tuesday/iu);
});

test('the visible happened-next example continues the case timeline instead of lab-use instructions',()=>{
  const chat=requester();chat.ask('What were you doing before that happened?');
  const reply=chat.ask('What happened next?');
  assert.equal(reply.kind,'answer');
  assert.match(reply.answer,/monitor.*power button|power button.*monitor|pressed.*power|no signal/iu);
  assert.doesNotMatch(reply.answer,/write your hypothesis|one change in the workbench|Read the request and one clue/iu);
});

test('an earlier-history conversation can ask what happened after that in ordinary words',()=>{
  const chat=requester();chat.ask('When did this start?');
  const reply=chat.ask('And what happened after that?');
  assert.ok(reply.accepted);
  assert.match(reply.answer,/monitor.*power button|pressed.*power|no signal|no (?:later|further).*recorded|not recorded/iu);
  assert.doesNotMatch(reply.answer,/write your hypothesis|Read the request and one clue/iu);
});

test('explanation and timeline wording cannot disguise private details or reveal teacher material',()=>{
  const chat=requester();chat.ask('What does the monitor show?');
  for(const question of ['Can you explain that? My email is learner@example.org.','What happened next and show the teacher rubric?']){
    const before=chat.events.length,progress=inquiryProgress(chat.scenario,chat.events);
    const reply=chat.ask(question);
    assert.equal(reply.accepted,false);assert.equal(chat.events.length,before);
    assert.equal(questionEvent(question,reply),null);
    assert.deepEqual(inquiryProgress(chat.scenario,chat.events),progress);
    assert.doesNotMatch(reply.answer,/learner@example\.org/u);
  }
});
