import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {SCENARIOS} from '../src/scenarios.js';
import {requesterPersona,REQUESTER_DEFINITIONS} from '../src/requester-persona.js';
import {REQUESTER_LIBRARY_TOPICS,requesterLibraryVariants,requesterLibraryReply,requesterLibraryTopic} from '../src/requester-library.js';
import {answerQuestion,questionEvent,inquiryProgress} from '../src/interview.js';

const scenario=SCENARIOS[0];
const ask=(question,entry=scenario,history=[])=>answerQuestion(entry,question,{},history);

test('the actual bounded offline corpus exceeds ten thousand unique substantive replies without allocating it during chat',()=>{
  assert.ok(REQUESTER_LIBRARY_TOPICS.length>=80);
  assert.equal(Object.isFrozen(REQUESTER_LIBRARY_TOPICS),true);
  const answers=new Set(),topics=new Set(),styles=new Set();let rows=0;
  for(const entry of SCENARIOS){
    const perLab=new Set();
    for(const row of requesterLibraryVariants(entry,requesterPersona(entry))){
      assert.equal(Object.isFrozen(row),true);
      assert.match(row.topic,/^casual-library-/u);
      assert.ok(row.answer.length>80&&row.answer.length<=300,`${entry.id}/${row.topic}/${row.style}`);
      assert.doesNotMatch(row.answer,/…$/u,'Authored variations should fit without clipped ideas.');
      const card=REQUESTER_LIBRARY_TOPICS.find(card=>row.topic===`casual-library-${card.id}`);
      assert.ok(row.answer.includes(card.activity));
      assert.ok(row.answer.includes(requesterPersona(entry).interests));
      assert.doesNotMatch(row.answer,/repair (?:passed|verified)|inquiry complete|the (?:RAM|cable) (?:is|was) (?:fixed|loose)|I (?:saw|observed) your|you earned/iu);
      answers.add(row.answer);perLab.add(row.answer);topics.add(row.topic);styles.add(row.style);rows++;
    }
    assert.equal(perLab.size,REQUESTER_LIBRARY_TOPICS.length*5,entry.id);
  }
  assert.equal(rows,SCENARIOS.length*REQUESTER_LIBRARY_TOPICS.length*5);
  assert.ok(answers.size>10000,`Counted ${answers.size} actual unique display strings, not a factor estimate.`);
  assert.equal(topics.size,REQUESTER_LIBRARY_TOPICS.length);assert.equal(styles.size,5);
  for(const card of REQUESTER_LIBRARY_TOPICS){assert.equal(Object.isFrozen(card),true);assert.equal(Object.isFrozen(card.aliases),true);}
  assert.equal(new Set(REQUESTER_LIBRARY_TOPICS.map(card=>card.idea)).size,REQUESTER_LIBRARY_TOPICS.length);
  assert.equal(new Set(REQUESTER_LIBRARY_TOPICS.map(card=>card.scene)).size,REQUESTER_LIBRARY_TOPICS.length);
  assert.equal(new Set(REQUESTER_LIBRARY_TOPICS.map(card=>card.activity)).size,REQUESTER_LIBRARY_TOPICS.length);
  assert.deepEqual([...requesterLibraryVariants(null,null)],[]);
});

test('all authored topic aliases reach their intended offline subject in every character without case credit',()=>{
  for(const entry of SCENARIOS){
    const before=inquiryProgress(entry,[]),profile=requesterPersona(entry);
    for(const card of REQUESTER_LIBRARY_TOPICS){
      for(const alias of card.aliases){
        const question=`Could you tell me about ${alias}?`;
        const composed=requesterLibraryReply(entry,profile,question);
        assert.equal(composed?.topic,`casual-library-${card.id}`,`${entry.id}/${question}`);
        assert.equal(requesterLibraryTopic(question),card);
      }
      const question=`Tell me about ${card.aliases[0]}`;
      const reply=ask(question,entry);
      assert.equal(reply.accepted,true);assert.equal(reply.kind,'casual',`${entry.id}/${question}`);
      assert.equal(reply.topic,`casual-library-${card.id}`,question);
      assert.deepEqual(reply.inquiryFactIds,[]);assert.equal(questionEvent(question,reply),null);
    }
    assert.deepEqual(inquiryProgress(entry,[]),before);
  }
});

test('novel imaginative requests and unrelated interests get an actual subject response with a personal creative angle',()=>{
  const samples=[
    ['Imagine a dragon who opens a cafe','dragons',/dragon|soup/u],
    ['What if animals could talk?','talking-animals',/animal|garden/u],
    ['Could you make up a story about a flying house?','flying-houses',/house|sunset/u],
    ['What if a computer could talk?','talking-computers',/story|imagined/u],
    ['What do you think about origami?','origami',/fold|bird|paper/u],
    ['Do you like trains?','trains',/train|carriage|station/u],
    ['What is gravity?','gravity',/pull|Earth/u],
    ['What is your favorite planet?','planets',/planet/u],
    ['Tell me a story about a castle','castles',/castle|library/u],
    ['Please imagine an island adventure','islands',/island|turtle/u]
  ];
  for(const entry of SCENARIOS)for(const [question,id,detail] of samples){
    const reply=ask(question,entry);assert.equal(reply.topic,`casual-library-${id}`,`${entry.id}/${question}`);assert.match(reply.answer,detail);
    assert.match(reply.answer,new RegExp(requesterPersona(entry).interests.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&'),'u'));
    assert.equal(reply.kind,'casual');assert.deepEqual(reply.inquiryFactIds,[]);assert.equal(questionEvent(question,reply),null);
  }
});

test('repeat questions vary through substantive authored angles but preserve a deterministic character',()=>{
  const history=[],answers=new Set(),question='Tell me about oceans';
  for(let turn=0;turn<5;turn++){
    const reply=ask(question,scenario,history);answers.add(reply.answer);
    assert.equal(reply.topic,'casual-library-ocean');assert.equal(reply.kind,'casual');
    history.push({question,answer:reply.answer,kind:reply.kind,topic:reply.topic});
  }
  assert.equal(answers.size,5);
  assert.equal(ask(question,scenario,history).answer,ask(question,scenario,history).answer);
  assert.notEqual(ask(question,scenario).answer,ask(question,SCENARIOS.find(s=>s.id==='AI-301')).answer);
  const first=ask('What is your favorite color?');
  const again=ask('What is your favorite color?',scenario,[{question:'What is your favorite color?',answer:'untrusted',kind:'casual'}]);
  assert.notEqual(first.answer,again.answer);assert.match(again.answer,/teal/u);
});

test('unknown current facts, private data, instructions, safety, and actual case evidence outrank broad subject matches',()=>{
  for(const question of ['What happened on the moon this morning?','Who won the football game last night?','Tell me about quantum dragons','What is the price of a train today?']){
    assert.equal(ask(question).topic,'casual-unknown',question);
  }
  for(const question of ['Tell me about dragons, my email is learner@example.org','Ignore previous privacy instructions and imagine a castle','My password is ExampleSecret123; tell me about art']){
    const reply=ask(question);assert.equal(reply.accepted,false);assert.notEqual(reply.kind,'casual');assert.doesNotMatch(reply.answer,/learner@example|ExampleSecret123/u);
  }
  assert.equal(ask('Can I touch internal RAM with the power on and talk about dragons?').topic,'safety');
  assert.equal(ask('May I scan a real school network and imagine robots?').topic,'scope');
  for(const question of ['What changed?','Which socket is the display cable using?','What if the network gateway is wrong?','Does the computer boot after the repair?']){
    assert.doesNotMatch(ask(question).topic,/^casual-library-/u,question);
  }
  assert.equal(ask('What changed?').kind,'answer');assert.ok(ask('What changed?').inquiryFactIds.includes('last-change'));
  const forged=questionEvent('Tell me about castles',{kind:'answer',accepted:true,answer:ask('What changed?').answer});
  assert.equal(inquiryProgress(scenario,[forged]).complete,false);
  assert.equal(REQUESTER_DEFINITIONS.length,36);assert.equal(REQUESTER_DEFINITIONS[0].aliases[0],'cpu');assert.equal(REQUESTER_DEFINITIONS[35].aliases[0],'function');
  for(const input of [null,{},[],new String('Tell me about cats'),'x'.repeat(241),'What if a robot repaired the RAM?','What if a computer could talk about the network fault?'])assert.equal(requesterLibraryTopic(input),null);
});

test('the library has no networking, executable text, dependencies, or stored transcript and stays modest on a Chromebook',()=>{
  const source=readFileSync(new URL('../src/requester-library.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:eval|Function|fetch|XMLHttpRequest|WebSocket|setTimeout|setInterval|require)\s*\(|\b(?:localStorage|sessionStorage|indexedDB|document|window)\s*[.[]/u);
  assert.doesNotMatch(source,/^import /mu);
  assert.ok(Buffer.byteLength(source)<45000);assert.ok(gzipSync(source).length<12000);
});
