import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const workbook=read('student-workbook.html'),quizzes=read('practice-quizzes.html');
const text=value=>value.replace(/<[^>]*>/gu,' ').replace(/&quot;/gu,'"').replace(/&#x27;|&#39;/gu,"'").replace(/&amp;/gu,'&').replace(/&lt;/gu,'<').replace(/&gt;/gu,'>').replace(/\s+/gu,' ').trim();
const attr=(tag,name)=>tag.match(new RegExp('\\b'+name+'="([^"]*)"','u'))?.[1];

test('student HTML alternatives have named native fields and navigation without a submission or storage path',()=>{
  for(const [name,html] of [['workbook',workbook],['quizzes',quizzes]]){
    assert.match(html,/<html lang="en">/u);
    assert.equal([...html.matchAll(/<h1\b/gu)].length,1,name);
    assert.match(html,/<a class="skip-link" href="#main">/u);
    assert.match(html,/<main[^>]*id="main"[^>]*tabindex="-1"/u);
    assert.match(html,/src\/accessibility\.css\?release=[^"]+">\s*<\/head>/u);
    assert.doesNotMatch(html,/<(?:script|form|iframe)\b|\bon\w+=|\b(?:fetch|localStorage|sessionStorage|indexedDB)\s*[.(]/iu,name);
    const ids=[...html.matchAll(/\bid="([^"]+)"/gu)].map(match=>match[1]);
    assert.equal(new Set(ids).size,ids.length,name+': duplicate ID');
    for(const match of html.matchAll(/<(?:input|textarea|select)\b[^>]*>/gu)){
      const id=attr(match[0],'id');
      assert.ok(id,name+': control needs an ID');
      assert.ok(html.includes('for="'+id+'"'),name+': control needs a native label');
      assert.equal(attr(match[0],'autocomplete'),'off');
    }
    for(const match of html.matchAll(/href="#([^"]+)"/gu))assert.ok(ids.includes(match[1]),name+': broken section link');
  }
});

test('workbook retains the original response prompts, six sections, and eight explicit ticket relationships',()=>{
  assert.equal([...workbook.matchAll(/<section class="curriculum-sheet"/gu)].length,6);
  const prompts=[
    'One device symptom I could describe without guessing its cause','One respectful question I could ask a person requesting help',
    'Write a question that would narrow down the problem','Name one thing we still do not know about the cause',
    'Original task and the symptom actually reported','My question and the new detail the requester gave me','Clue 1 and clue 2 that I actually collected','What do you think, and why?',
    'One label or connection I would check before choosing a part','Original task and observed symptom','Question I asked or evidence I still need',
    'I predict','Before the change I observed','I changed','After the test I observed','This supports or changes my idea because',
    'What did you change, and what did the test show?','Does the evidence support your hypothesis? Why?','The exact check I ran and its actual result','One uncertainty or next step and who could help'
  ];
  const labels=[...workbook.matchAll(/<label\b[^>]*>([\s\S]*?)(?:<input|<textarea|<select)/gu)].map(match=>text(match[1]));
  for(const prompt of prompts)assert.ok(labels.includes(prompt),'Missing original prompt: '+prompt);
  assert.equal(labels.filter(label=>/^[1-5]\. /u.test(label)).length,10,'both five-item guided-note word banks');
  assert.match(workbook,/<caption>Classroom ticket process reference<\/caption>/u);
  const stages=[...workbook.matchAll(/<th scope="row">([^<]+)<\/th>/gu)].map(match=>match[1]);
  assert.deepEqual(stages,['Aware','Identified','Contexted','Equipped','Fix Started','Fixed','Delivered','Done']);
  assert.match(workbook,/Paper alternative:/u);
  assert.match(workbook,/do not invent a successful repair/u);
  assert.match(workbook,/Current interface note:/u);
});

// Baselines derive from the exact approved PDF's extracted question/choice text,
// manually checked against all eight rendered forms. They preserve each variant's
// question and answer-choice order without shipping or testing an answer key.
const quizDigests=[
  'c7c058e87a1c45efb1ef204689837e0bff6d1fc6c8489bc7d4aa4b87a3d54fe5',
  'd068a45b22dff60f3123f0c21b869421db878e3b20864082c2fe0696731b72d8',
  '9a0d3392acdcd859556fb0015775c2b47a74848e8dcc0b0dede2c029d63225b9',
  '00cad1d21149529787f16485d5aa52b65c761ebda3823605bb098c5de9cc1ef0',
  '2b1a51de80495cb07102fd25f6c3bf44bfcbbfd186c242ed589b019b4051e2d1',
  'cdec47594610958bc5fb84210359ade71f0e21030e4f6ae28fa1b6acb9d7d599',
  '6096568b885a195179ca20d27a3e7d3743b8ef05b34645e5beba323e103a1f56',
  'b26220a0c58f95ab5b304c1f93a337536d2b4d2f7e929835c0b004c6d00f1d48'
];
test('every quiz variant preserves all five original questions and four choices in the reviewed PDF order',()=>{
  const forms=[...quizzes.matchAll(/<section class="curriculum-sheet"[\s\S]*?<\/section>/gu)];
  assert.equal(forms.length,8);
  for(const [index,form] of forms.entries()){
    const canonical=[...form[0].matchAll(/<fieldset class="quiz-question"[\s\S]*?<\/fieldset>/gu)].map(match=>{
      const legend=text(match[0].match(/<legend>([\s\S]*?)<\/legend>/u)[1]).replace(/^[1-5]\. /u,'');
      const choices=[...match[0].matchAll(/<label class="curriculum-choice"[\s\S]*?<\/label>/gu)].map(choice=>text(choice[0]).replace(/^[A-D]\. /u,''));
      assert.equal(choices.length,4);
      return [legend,choices];
    });
    assert.equal(canonical.length,5);
    assert.equal(createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),quizDigests[index],'Quiz form '+(index+1)+' differs from approved prompts or choice order');
  }
});

test('quiz choices use forty independent native radio groups with no preselected answer or scoring',()=>{
  const groups=new Map();
  for(const match of quizzes.matchAll(/<input type="radio"[^>]*>/gu)){
    const name=attr(match[0],'name');
    if(!groups.has(name))groups.set(name,[]);
    groups.get(name).push(attr(match[0],'value'));
    assert.doesNotMatch(match[0],/\bchecked\b|\bdisabled\b/u);
  }
  assert.equal(groups.size,40);
  assert.equal([...groups.values()].flat().length,160);
  for(const options of groups.values())assert.deepEqual(options,['A','B','C','D']);
  assert.doesNotMatch(quizzes,/data-correct|data-answer|answer-key|correct-answer/iu);
});

test('HTML alternatives retain printable content and state their temporary-answer and original-PDF limits',()=>{
  for(const html of [workbook,quizzes]){
    assert.match(html,/@media print/u);
    assert.match(html,/break-inside:avoid/u);
    assert.match(html,/Ctrl\+P/u);
    assert.match(html,/Command\+P/u);
    assert.match(html,/no submission or saving code/u);
    assert.match(html,/lost when you leave or reload/u);
    assert.doesNotMatch(html,/<meta[^>]+http-equiv="refresh"/iu);
  }
  assert.match(workbook,/assets\/cole-learning-labs-student-workbook\.pdf/u);
  assert.match(quizzes,/assets\/cole-learning-labs-pop-quizzes\.pdf/u);
  assert.match(workbook,/long answers are visible in print preview/u);
});
