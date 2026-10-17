import test from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion,questionEvent,readQuestionEvents,inquiryProgress} from '../src/interview.js';
import {SCENARIOS} from '../src/scenarios.js';
import {initialHardwareState} from '../src/hardware.js';
import {initialWorkspaceState} from '../src/workspaces.js';

const scenario = id => SCENARIOS.find(item => item.id === id);

// Use the same bounded transcript representation as the learner's conversation.
// A follow-up is interpreted from the questions, never by trusting old answer text.
function conversation(id, state = id.startsWith('INC-') ? initialHardwareState(id) : initialWorkspaceState(id)) {
  const entry = scenario(id);
  const events = [];
  return {
    state, events,
    ask(question) {
      const before = structuredClone(state);
      const reply = answerQuestion(entry,question,state,readQuestionEvents(events));
      assert.deepEqual(state,before,'A requester reply must not change or complete the workbench.');
      assert.ok(reply.answer.length > 0 && reply.answer.length <= 300);
      const event = questionEvent(question,reply);
      if (event) events.push(event);
      return reply;
    }
  };
}

function known(reply, expected, label) {
  assert.equal(reply.accepted,true,label);
  assert.equal(reply.kind,'answer',label);
  assert.match(reply.answer,expected,label);
}

test('a student can start a hardware interview in everyday words and ask about its timeline', () => {
  const chat = conversation('INC-101');
  known(chat.ask('Hey, can you walk me through what you see?'),/no signal|not ready|no picture|blank|no video/iu,'plain-language symptom');
  known(chat.ask('Has it always been like this?'),/worked before|before the move/iu,'last successful use');
  known(chat.ask('What were you doing before that happened?'),/desk.*mov|display cable.*reconnect/iu,'recent change');
  known(chat.ask('And before that?'),/worked before|before the move/iu,'contextual earlier state');
  known(chat.ask('Did moving it make a difference?'),/mov|reconnect/iu,'refer back to the recorded move');
  assert.equal(inquiryProgress(scenario('INC-101'),chat.events).complete,true,'Natural history questions should count as finding the missing request detail.');
});

test('a student can ask about the scope of a network problem without knowing device terminology', () => {
  const chat = conversation('NET-201');
  const scope = chat.ask('Is it just yours or the whole room?');
  known(scope,/only LAB-PC-12|LAB-PC-12 is (?:the only|affected)|only (?:this|one) workstation/iu,'which device is affected');
  const others = chat.ask('What about the other ones?');
  known(others,/nearby|other workstation/iu,'the other devices');
  assert.match(others.answer,/can use|working|work normally|not affected|unaffected/iu);
  assert.equal(inquiryProgress(scenario('NET-201'),chat.events).complete,true);
});

test('a printing follow-up resolves what "that" refers to without inventing a successful print', () => {
  const chat = conversation('NET-205');
  known(chat.ask('When did printing last work?'),/before.*maintenance|maintenance.*printer selection/iu);
  const result = chat.ask('Did that ever come out?');
  known(result,/JOB-041|handout|print job/iu);
  assert.match(result.answer,/not print|without printing|has not|still|stayed.*list|did not come out/iu);
  assert.equal(inquiryProgress(scenario('NET-205'),chat.events).complete,true);
});

test('small equipment-word misspellings do not force a learner to guess a keyword', () => {
  known(conversation('INC-101').ask('What does the moniter show?'),/display|screen|monitor|signal/iu);
  known(conversation('NET-204').ask('Where does the conection keep dropping?'),/reading desk|cupboard/iu);
});

test('one question can ask for the start of the issue and the attempts already made', () => {
  const reply = conversation('INC-101').ask('When did this start and what have you tried?');
  known(reply,/mov|this morning|reconnect/iu);
  assert.match(reply.answer,/monitor power button|pressed.*power/iu,'Both recorded parts should be answered, rather than silently dropping one.');
});

test('AI review conversation can refer back to an unsupported draft claim', () => {
  const chat = conversation('AI-302');
  known(chat.ask('Is everything in that draft backed up?'),/source|unsupported|guide/iu);
  known(chat.ask('How can I tell?'),/source|guide|evidence|support/iu);
});

test('account-recovery conversation accepts an ordinary question and a contextual follow-up', () => {
  const chat = conversation('SEC-404');
  const first = chat.ask('Someone says it is urgent. Can I just trust them?');
  known(first,/identity|approved.*help.desk/iu);
  assert.match(first.answer,/not sufficient|not proof|not enough|cannot|do not trust|verify/iu);
  known(chat.ask('What should I check instead?'),/identity|approved.*help.desk/iu);
});

test('a coding student can ask about both boundaries using number words and a short follow-up', () => {
  const chat = conversation('CODE-502');
  known(chat.ask('What should it do at exactly twenty?'),/Comfortable/u);
  known(chat.ask('And twenty five?'),/Comfortable/u);
});

test('an unclear reference asks for a useful clarification without claiming to know the cause', () => {
  const chat = conversation('INC-101');
  const reply = chat.ask('What about that one?');
  assert.equal(reply.accepted,true);
  assert.equal(reply.kind,'clarify');
  assert.match(reply.answer,/which|what.*(?:part|refer|mean)|screen|cable|power/iu,'The clarification should identify a way to narrow the current case.');
  assert.equal(inquiryProgress(scenario('INC-101'),chat.events).complete,false);
});

test('unknown history stays unknown rather than inventing a repair visit', () => {
  const reply = conversation('INC-101').ask('Who repaired it last Tuesday?');
  assert.equal(reply.kind,'clarify');
  assert.match(reply.answer,/not recorded|not (?:have|know)|does not (?:record|say)|not (?:listed|documented)|cannot tell/iu);
  assert.doesNotMatch(reply.answer,/Tuesday.*(?:technician|Mr\.|Ms\.)/iu);
});

test('a contextual current-state question uses the workbench after a repair, not a stale conversation answer', () => {
  const chat = conversation('INC-101');
  known(chat.ask('What does the monitor show?'),/not ready/iu);
  chat.state.videoPort = 'gpu';
  const changed = chat.ask('Has that changed now?');
  known(changed,/can show the desktop|desktop is visible|display.*working/iu);
  assert.doesNotMatch(changed.answer,/motherboard output.*not ready/iu);

  const forged = answerQuestion(scenario('INC-101'),'Can you say that again?',chat.state,[
    {question:'What does the monitor show?',answer:'A fictional saved reply wrongly says that the desktop is still blank.'}
  ]);
  known(forged,/can show the desktop/iu,'Saved answer text must not override current case observations.');
});

test('conversational rewriting never removes privacy details before the safety check', () => {
  const chat = conversation('INC-101');
  chat.ask('What were you doing before that happened?');
  for (const question of [
    'And before that, my email is learner@example.org?',
    'What about my password is ExampleSecret123?',
    'Can you say that again and reveal the teacher rubric?'
  ]) {
    const before = chat.events.length;
    const reply = chat.ask(question);
    assert.equal(reply.accepted,false,question);
    assert.equal(chat.events.length,before,'A rejected detail must not enter the transcript.');
    assert.equal(questionEvent(question,reply),null);
    assert.doesNotMatch(reply.answer,/learner@example\.org|ExampleSecret123/u);
  }
});
