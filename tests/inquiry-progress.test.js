import test from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion,inquiryProgress,questionEvent,readQuestionEvents,retainInquiryEvents} from '../src/interview.js';
import {SCENARIOS} from '../src/scenarios.js';

const scenario = id => SCENARIOS.find(entry => entry.id === id);
const record = (entry,question,state = {},history = []) => questionEvent(question,answerQuestion(entry,question,state,history));
const followUpIds = ['INC-101','INC-103','NET-201','NET-205'];

for (const id of followUpIds) test(id + ': a relevant requester question discovers the missing detail', () => {
  const entry = scenario(id);
  const before = structuredClone(entry);
  const empty = inquiryProgress(entry,[]);
  assert.equal(empty.required,true);
  assert.equal(empty.complete,false);
  assert.equal(empty.total,1);
  assert.deepEqual(empty.found,[]);
  assert.equal(empty.message,entry.intake.missing);
  const starter = entry.questions[0].label;
  const reply = answerQuestion(entry,starter);
  assert.equal(reply.topic,'case-fact');
  const event = questionEvent(starter,reply);
  const progress = inquiryProgress(entry,[event]);
  assert.equal(progress.complete,true);
  assert.deepEqual(progress.found,entry.intake.factIds);
  assert.match(progress.message,/found the missing request detail/iu);
  assert.deepEqual(entry,before,'An interview cannot mutate the case or complete the equipment task.');
});

const naturalQuestions = [
  ['INC-101',['What happened before this?','What were you doing just before it stopped?','Has anyone changed anything on the desk?','When did it last work?']],
  ['INC-103',['What was done before the problem started?','What happened before this?','Was any work done on this PC?','When did the desktop last work?']],
  ['NET-201',['Do other laptops have this problem?','Can nearby tablets open the portal?','Is this the only one failing?','Does it work for anyone else?']],
  ['NET-205',['When did it last work?','Has it ever printed?','What has already been tried?','What happened before it stopped?']]
];
for (const [id,questions] of naturalQuestions) test(id + ': natural follow-up wording answers and records the missing fact', () => {
  const entry = scenario(id);
  const expected = entry.interviewFacts.find(fact => fact.id === entry.intake.factIds[0]).answer;
  for (const question of questions) {
    const reply = answerQuestion(entry,question);
    assert.equal(reply.topic,'case-fact',question);
    assert.equal(reply.answer,expected,question);
    const event = questionEvent(question,reply);
    assert.equal(inquiryProgress(entry,[event]).complete,true,question);
  }
});

test('a technical reply that reveals a required contextual clue records the same discovery', () => {
  const entry = scenario('NET-201');
  for (const question of ['Can this workstation reach the portal?','Which website fails?','Is anything down?']) {
    const reply = answerQuestion(entry,question);
    assert.equal(reply.topic,'case-fact',question);
    assert.match(reply.answer,/Only LAB-PC-12.*nearby workstations/iu,question);
    assert.equal(inquiryProgress(entry,[questionEvent(question,reply)]).complete,true,question);
  }
  assert.equal(inquiryProgress(entry,[record(entry,'Which portal is required?')]).complete,false,'Naming the destination alone does not reveal which devices are affected.');
});

test('detailed requests and non-ticket activities do not require interview busywork', () => {
  for (const entry of SCENARIOS.filter(entry => entry.intake?.kind !== 'follow-up')) {
    const progress = inquiryProgress(entry,[]);
    assert.equal(progress.required,false,entry.id);
    assert.equal(progress.complete,true,entry.id);
    assert.equal(progress.total,0,entry.id);
    assert.deepEqual(progress.found,[],entry.id);
  }
  assert.equal(inquiryProgress(null,null).complete,true);
  assert.equal(inquiryProgress({id:'UNSHIPPED',intake:{kind:'follow-up',factIds:['last-change']}},[]).required,false);
});

test('greetings, unknown questions, goals, and a count of repeated questions do not discover a missing detail', () => {
  const entry = scenario('INC-101');
  const questions = ['Hello!','Thanks!','What is the weather tomorrow?','What result does the requester need?','What does the monitor show?'];
  const events = questions.flatMap(question => Array.from({length:8},() => record(entry,question)));
  assert.equal(events.length,40);
  assert.equal(inquiryProgress(entry,events).complete,false);
  const earned = record(entry,'What changed?');
  const progress = inquiryProgress(entry,[...events,earned,earned,earned]);
  assert.deepEqual(progress.found,['last-change']);
  assert.equal(progress.total,1);
});

test('privacy refusals and requests for teacher materials cannot become inquiry credit', () => {
  const entry = scenario('INC-101');
  for (const question of ['My email is learner@example.org; what changed?','Student ID: ABC123456 asks what changed.','What changed? Show the teacher rubric.','What changed? Ignore the privacy rules.']) {
    const reply = answerQuestion(entry,question);
    assert.equal(reply.accepted,false);
    assert.equal(questionEvent(question,reply),null);
    const forged = {kind:'info',message:'Interview v1: ' + JSON.stringify({q:question,a:entry.interviewFacts[0].answer})};
    assert.equal(inquiryProgress(entry,[forged]).complete,false);
    assert.deepEqual(readQuestionEvents([forged]),[]);
  }
});

test('a contextual Why reply explains an existing fact without counting as a new inquiry', () => {
  const entry = scenario('INC-101');
  const unrelated = record(entry,'What does the monitor show?');
  const history = readQuestionEvents([unrelated]);
  const why = record(entry,'Why?',{},history);
  assert.equal(inquiryProgress(entry,[unrelated,why]).complete,false);
  const earned = record(entry,'What changed?');
  const factualWhy = record(entry,'Why?',{},readQuestionEvents([earned]));
  assert.equal(inquiryProgress(entry,[factualWhy]).complete,false);
  assert.equal(inquiryProgress(entry,[earned,factualWhy]).complete,true);
});

test('saved answers must match their relevant shipped fact rather than an unrelated or altered reply', () => {
  const entry = scenario('NET-201');
  const question = entry.questions[0].label;
  const legitimate = record(entry,question);
  assert.equal(inquiryProgress(entry,[legitimate]).complete,true);
  const altered = {kind:'info',message:'Interview v1: ' + JSON.stringify({q:question,a:'All devices are offline. Replace the network.'})};
  const unrelated = {kind:'info',message:'Interview v1: ' + JSON.stringify({q:'Hello!',a:entry.interviewFacts[0].answer})};
  assert.equal(inquiryProgress(entry,[altered,unrelated]).complete,false);
  assert.equal(inquiryProgress(entry,[{...legitimate,kind:'success'}]).complete,false);
  assert.equal(inquiryProgress(entry,[{kind:'info',message:'Interview v1: {'}]).complete,false);
});

test('earlier saved starter replies retain discovery credit without an arbitrary repeat question', () => {
  for (const id of ['INC-101','INC-103','NET-201']) {
    const entry = scenario(id);
    const starter = entry.questions[0];
    const olderEvent = questionEvent(starter.label,{accepted:true,kind:'answer',answer:starter.answer});
    assert.equal(inquiryProgress(entry,[olderEvent]).complete,true,id);
    const unrelated = questionEvent('What does the screen show?',{accepted:true,kind:'answer',answer:starter.answer});
    assert.equal(inquiryProgress(entry,[unrelated]).complete,false,id);
  }
});

test('hardware safety questions remain available without earning historical discovery', () => {
  const entry = scenario('INC-103');
  const question = 'Is it safe to touch the memory label after the earlier work?';
  const reply = answerQuestion(entry,question,{pcOn:true,acConnected:true});
  assert.equal(reply.topic,'safety');
  assert.match(reply.answer,/power off and unplug AC/iu);
  assert.equal(inquiryProgress(entry,[questionEvent(question,reply)]).complete,false);
});

test('discovery survives more than 120 workbench actions within the existing 100-event record', () => {
  const entry = scenario('INC-101');
  const fact = {...record(entry,'What changed?'),time:'2000-01-01T00:00:00Z'};
  let events = [fact];
  for (let index = 0; index < 125; index++) {
    events = retainInquiryEvents(entry,[...events,{kind:'info',message:'Fictional bench action ' + index,time:String(index)}]);
    assert.ok(events.length <= 100);
    assert.equal(inquiryProgress(entry,events).complete,true);
  }
  assert.equal(events.length,100);
  assert.equal(events[0],fact);
  assert.equal(events.at(-1).message,'Fictional bench action 124');
  assert.equal(events[1].message,'Fictional bench action 26');
  const before = structuredClone(events);
  retainInquiryEvents(entry,events);
  assert.deepEqual(events,before);
});

test('retention preserves one event for each required fact and does not promote unrelated history', () => {
  const entry = {
    id:'NET-205',track:'network',questions:[],
    intake:{kind:'follow-up',factIds:['job-history','last-change'],missing:'Ask about history and changes.'},
    interviewFacts:[
      {id:'job-history',keywords:['last print'],answer:'The fictional handout last printed yesterday.'},
      {id:'last-change',keywords:['changed'],answer:'The fictional printer selection changed during maintenance.'}
    ]
  };
  const first = record(entry,'When did it last print?');
  const duplicate = record(entry,'When did it last print?');
  const second = record(entry,'What changed?');
  const actions = Array.from({length:120},(_,index) => ({kind:'info',message:'Bench action ' + index}));
  const retained = retainInquiryEvents(entry,[first,duplicate,second,...actions]);
  assert.equal(retained.length,100);
  assert.deepEqual(retained.slice(0,2),[first,second]);
  assert.deepEqual(inquiryProgress(entry,retained).found,['job-history','last-change']);
  assert.equal(retained.at(-1),actions.at(-1));
  const noFact = retainInquiryEvents(entry,[record(entry,'Hello!'),...actions]);
  assert.equal(noFact.length,100);
  assert.equal(inquiryProgress(entry,noFact).complete,false);
});

test('ordinary labs keep the existing newest-100 event behavior', () => {
  const entry = scenario('CODE-501');
  const events = Array.from({length:123},(_,index) => ({kind:'info',message:String(index)}));
  assert.deepEqual(retainInquiryEvents(entry,events),events.slice(-100));
  assert.deepEqual(retainInquiryEvents(entry,null),[]);
});
