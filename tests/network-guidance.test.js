import test from 'node:test';
import assert from 'node:assert/strict';
import {NETWORK_SCENARIOS,NETWORK_CONFIG} from '../src/network-labs.js';
import {answerQuestion} from '../src/interview.js';
import {resolveQuestion} from '../src/conversation.js';
import {lessonFor,buildLessonPlan,renderLabLearning} from '../src/teaching.js';
import {observationSnapshot} from '../src/experiments.js';
import {initialWorkspaceState,applyWorkspaceAction} from '../src/workspaces.js';

const everyday=[
  ['NET-207','Which layer handles this part of the request?','protocol.layers',/OSI 5–7.*IP to 3/],
  ['NET-208','Would the copper cable reach the other building?','ethernet.media',/180 m.*fiber/],
  ['NET-209','Does translating the private address make it secure?','addressing.translation',/NAT.*approved internet edge/],
  ['NET-210','Will the spare cable create a switching loop?','switching.loop',/spanning tree.*loop-free/],
  ['NET-211','Does that alert prove the IDS blocked the connection?','portal.alert',/alert-only IDS.*firewall block/],
  ['NET-212','Should I replace the local cable when the remote library fails?','wan.scope',/approved cable.*gateway 10\.50\.0\.1/],
  ['NET-213','Why is the call choppy even though it connects?','voice.quality',/RTP priority.*loss.*jitter/],
  ['NET-214','How can I undo the change if the pilot fails?','plan.validation',/baseline.*rollback/],
  ['NET-215','Why is the frame going to the gateway instead of the remote IP address?','capture.addresses',/gateway LAN MAC.*ARP record/],
  ['NET-216','Do two counter totals tell us the rate without the time interval?','monitoring.baseline',/60 seconds.*1 error\/second/]
];

test('network requester paraphrases reach authored facts without inventing equipment details',()=>{
  for(const [id,question,intent,expected] of everyday){
    const scenario=NETWORK_SCENARIOS.find(item=>item.id===id), state=initialWorkspaceState(id);
    assert.ok(scenario,id);
    assert.equal(resolveQuestion(scenario,question).intent,intent,id);
    const reply=answerQuestion(scenario,question,state);
    assert.equal(reply.accepted,true,id);assert.equal(reply.kind,'answer',id);
    assert.ok(['case-fact','requester'].includes(reply.topic),`${id}: ${reply.topic}`);
    assert.match(reply.answer,expected,id);
    assert.equal(answerQuestion(scenario,'What is the manufacturer serial number?',state).kind,'clarify',id);
    assert.equal(answerQuestion(scenario,'Can I scan the real school network?',state).topic,'scope',id);
  }
});

test('network experiment snapshots retain the four saved choices and fresh test status',()=>{
  for(const scenario of NETWORK_SCENARIOS){
    const config=NETWORK_CONFIG[scenario.id.replaceAll('-','')], state={...initialWorkspaceState(scenario.id),privateNote:'PRIVATE_CANARY'};
    const before=structuredClone(state),rows=observationSnapshot(scenario,state);
    assert.deepEqual(state,before,scenario.id);
    assert.equal(rows.length,6,scenario.id);
    assert.deepEqual(rows.slice(0,4).map(([,value])=>value),config.fields.map(field=>state[field.name].slice(0,40)),scenario.id);
    assert.equal(rows[5][1],'Not run for this setup',scenario.id);
    const tested=applyWorkspaceAction(scenario.id,state,'run-check').state;
    assert.match(observationSnapshot(scenario,tested)[5][1],/^\d+ of \d+ checks passed$/,scenario.id);
    assert.doesNotMatch(JSON.stringify(rows),/undefined|PRIVATE_CANARY/,scenario.id);
  }
});

test('packet and topology references do not imply a live capture or emulator',()=>{
  for(const [id,question] of [['NET-207','Can I run Wireshark here?'],['NET-215','Can I capture my traffic with Wireshark?'],['NET-214','Does this start GNS3?']]){
    const scenario=NETWORK_SCENARIOS.find(item=>item.id===id),reply=answerQuestion(scenario,question,initialWorkspaceState(id));
    assert.equal(reply.topic,'scope',id);assert.match(reply.answer,/supplied fictional packet records/);
    assert.match(reply.answer,/does not launch Wireshark or GNS3/);
  }
});

test('new network lesson supports keep plain steps, topic vocabulary, and reviewed discussion',()=>{
  for(const scenario of NETWORK_SCENARIOS){
    const lesson=lessonFor(scenario),plan=buildLessonPlan(scenario),html=renderLabLearning(scenario);
    assert.equal(lesson.id,scenario.id);assert.equal(plan.id,scenario.id);
    assert.equal(lesson.vocabulary.length,3);assert.ok(lesson.vocabulary.every(word=>word.definition.length>30));
    assert.equal(plan.steps.reduce((minutes,step)=>minutes+step.minutes,0),40);
    assert.match(html,/Read the ticket and clues/);
    assert.ok(lesson.discussion.endsWith('?'));assert.ok(lesson.exitQuestion.endsWith('?'));
  }
  const voice=lessonFor(NETWORK_SCENARIOS.find(scenario=>scenario.id==='NET-213'));
  const management=voice.vocabulary.find(word=>word.term==='FCAPS');
  assert.match(management.definition,/fault, configuration, accounting, performance, and security/i);
  assert.doesNotMatch(management.definition,/asset control/i);
});
