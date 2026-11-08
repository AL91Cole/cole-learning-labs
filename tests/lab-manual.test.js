import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {labFormat,labManual,renderLabManual,labManualReport,MANUAL_SECTIONS} from '../src/lab-manual.js';
import {SCENARIOS} from '../src/scenarios.js';
import {CODING_SCENARIOS,initialCodingState,applyCodingAction,codingChallengeComplete,codingStarter,normalizeCodingState} from '../src/coding-lab.js';
import {normalizeLabRecord} from '../src/records.js';
import {answerQuestion,readQuestionEvents,inquiryProgress} from '../src/interview.js';

const byId=id=>SCENARIOS.find(item=>item.id===id);
const facts=(overrides={})=>({section:1,persona:'Finley',language:'javascript',acknowledged:[],asked:false,clarified:true,clues:false,saved:false,started:false,edited:false,tested:false,works:false,ready:false,verified:false,notes:false,reflection:false,closed:false,challenge:false,mission:null,transfer:null,...overrides});

test('every investigation gets a three-section manual with an introduction, objectives, tools and deliverables',()=>{
  for(const scenario of SCENARIOS){
    const manual=labManual(scenario,facts());
    assert.equal(manual.sections.length,3);
    assert.deepEqual(manual.sections.map(section=>section.id),MANUAL_SECTIONS.map(section=>section.id));
    assert.equal(manual.introduction,scenario.brief);
    assert.equal(manual.objectives[0],scenario.goal);
    assert.ok(manual.objectives.length>=4&&manual.tools.length===3&&manual.deliverables.length===4,scenario.id);
    for(const section of manual.sections){
      assert.ok(section.steps.length>=3,scenario.id+' '+section.id);
      for(const step of section.steps)assert.ok(step.id&&step.instruction&&step.check,scenario.id+' step shape');
    }
    const challenge=manual.sections[2].steps.find(step=>step.challenge);
    assert.ok(challenge?.optional,scenario.id+' ends with an optional challenge');
    assert.equal(challenge.detail,'','No walkthrough text accompanies the challenge: '+scenario.id);
  }
});

test('coding labs drop the required requester conversation and read like a lab manual; other tracks keep it',()=>{
  for(const scenario of SCENARIOS){
    const format=labFormat(scenario);
    if(scenario.track==='coding'){
      assert.equal(format.interview,false);assert.equal(format.evidenceTitle,'Reference sheet');assert.equal(format.planTitle,'Plan your fix');
      const ask=labManual(scenario,facts()).sections[0].steps.find(step=>step.id==='ask');
      assert.equal(ask.optional,true,'asking stays available but optional');
    }else{
      assert.equal(format.interview,true);assert.equal(format.evidenceTitle,'Clues & evidence');
      const ask=labManual(scenario,facts()).sections[0].steps.find(step=>step.id==='ask');
      assert.equal(ask.optional,undefined);assert.match(ask.instruction,/^Ask /);
    }
    assert.deepEqual(format.pageNames,['Introduction & setup','Guided practice','Challenge & report']);
  }
});

test('coding walkthroughs show the exact starter line to change in the selected language, and the shown fix really passes',()=>{
  for(const scenario of CODING_SCENARIOS){
    for(const language of ['javascript','python']){
      const step=labManual(scenario,facts({language})).sections[1].steps.find(step=>step.id==='edit');
      assert.equal(step.code,true);
      const body=step.detail,start=body.indexOf('Change this line:\n'),middle=body.indexOf('\nto:\n'),last=body.lastIndexOf('\n');
      assert.ok(start===0&&middle>start&&last>middle,scenario.id+' '+language+' names a from/to change and a one-line reason');
      const from=body.slice('Change this line:\n'.length,middle),to=body.slice(middle+'\nto:\n'.length,last);
      const starter=codingStarter(scenario.id,language);
      assert.ok(starter.includes(from),scenario.id+' '+language+': the walkthrough quotes a real starter line');
      const fixed=starter.replace(from,to),state=applyCodingAction(scenario.id,{...initialCodingState(scenario.id),language,code:fixed},'run-check',{code:fixed}).state;
      assert.ok(state.results.length>0&&state.results.every(result=>result.ok),scenario.id+' '+language+': the demonstrated fix passes every fixture');
    }
  }
});

test('hardware walkthroughs carry an authored demonstration; other tracks use the live mission hint',()=>{
  const hardware=labManual(byId('INC-101'),facts()).sections[1].steps.find(step=>step.id==='change');
  assert.match(hardware.instruction,/graphics card/);assert.match(hardware.detail,/expansion-slot output/);
  const network=labManual(byId('NET-201'),facts({mission:{next:'Investigate: the saved address.',hints:['Read the sheet.','Compare it.','Test it.']}})).sections[1].steps.find(step=>step.id==='change');
  assert.equal(network.instruction,'Investigate: the saved address.');assert.equal(network.detail,'Read the sheet. Compare it. Test it.');
  const fallback=labManual(byId('NET-201'),facts()).sections[1].steps.find(step=>step.id==='change');
  assert.match(fallback.instruction,/Make one change at the network workbench/);
});

test('steps complete from facts, acknowledged ids only count for read steps, and sections unlock in order',()=>{
  const scenario=byId('INC-101');
  const fresh=labManual(scenario,facts());
  assert.deepEqual(fresh.unlocked,[true,false,false]);assert.equal(fresh.sections[0].done,0);
  const partial=labManual(scenario,facts({acknowledged:['read-scenario','verify','plan'],asked:true,clues:true}));
  const [read,practice,challenge]=partial.sections;
  assert.equal(read.steps.find(step=>step.id==='read-scenario').done,true);
  assert.equal(read.steps.find(step=>step.id==='plan').done,false,'a boolean-checked step ignores acknowledgements');
  assert.equal(read.done,3);assert.equal(read.total,4);assert.equal(read.complete,false);
  assert.equal(challenge.steps.find(step=>step.id==='verify').done,false);
  const done=labManual(scenario,facts({acknowledged:['read-scenario'],asked:true,clues:true,saved:true,started:true,works:true,tested:true,ready:true}));
  assert.deepEqual(done.unlocked,[true,true,true]);assert.ok(done.sections[0].complete&&done.sections[1].complete&&!done.sections[2].complete);
  assert.equal(practice.steps.filter(step=>step.optional).length,0,'every hands-on step is required');
});

test('the rendered manual marks the current step, escapes authored text and offers Show me demonstrations and Mark step done controls',()=>{
  const scenario={...byId('CODE-501'),brief:'<script>alert(1)</script> brief'};
  const html=renderLabManual(scenario,facts({section:1}));
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
  assert.match(html,/aria-labelledby="lab-manual-title"/);
  assert.match(html,/LAB MANUAL · SECTION 1 OF 3/);
  assert.match(html,/data-manual-step="read-scenario"[^>]*aria-current="step"/,'the first undone required step is current');
  assert.match(html,/data-manual-ack="read-scenario"/);
  assert.match(html,/<div data-lab-next><\/div>/,'the next-move brief keeps its host inside the manual');
  const practice=renderLabManual(scenario,facts({section:2,acknowledged:['read-scenario'],clues:true,saved:true}));
  assert.match(practice,/<pre class="manual-code"[^>]*>Change this line:\nlet total = quantity \+ 3;\nto:\nlet total = quantity \* 3;/);
  assert.match(practice,/<summary>Show me<\/summary>/);
  const challenge=renderLabManual(scenario,facts({section:3,challenge:true}));
  assert.match(challenge,/Challenge complete\./);assert.match(challenge,/No walkthrough for the challenge/);
  const alternate=renderLabManual(byId('INC-101'),facts({section:3,transfer:'INC-107',transferHref:'#lab/INC-107/request?mode=challenge'}));
  assert.match(alternate,/href="#lab\/INC-107\/request\?mode=challenge"/);
  assert.match(alternate,/open the alternate case INC-107/i);
});

test('the report line summarises section progress and the challenge without storing anything new',()=>{
  const scenario=byId('CODE-502');
  assert.equal(labManualReport(scenario,facts()),'Section 1 · Read the lab: 0 of 3 steps\nSection 2 · Hands-on walkthrough: 0 of 5 steps\nSection 3 · Challenge & analysis: 0 of 4 steps\nChallenge: not attempted');
  assert.match(labManualReport(scenario,facts({challenge:true})),/Challenge: complete$/);
});

test('the coding challenge remembers a passing solution per language and only when the saved source still passes',()=>{
  const id='CODE-501',js='let total = quantity * 3;\nprint(total);',py='total = quantity * 3\nprint(total)';
  let state=applyCodingAction(id,initialCodingState(id),'run-check',{code:js}).state;
  assert.deepEqual(state.solutions,{javascript:js});assert.equal(codingChallengeComplete(state),false);
  state=applyCodingAction(id,state,'set-language',{language:'python',code:py}).state;
  state=applyCodingAction(id,state,'run-check',{code:py}).state;
  assert.deepEqual(state.solutions,{javascript:js,python:py});assert.equal(codingChallengeComplete(state),true);
  const forged=normalizeCodingState(id,{...state,solutions:{javascript:'print(6);',python:py}});
  assert.deepEqual(forged.solutions,{python:py},'a remembered solution must pass every fixture today');
  const broken=applyCodingAction(id,state,'run-check',{code:'print(1)'}).state;
  assert.equal(codingChallengeComplete(broken),true,'a later failing draft does not erase an earned challenge');
  assert.equal(normalizeLabRecord(byId(id),{state:broken}).state.solutions.python,py);
});

test('saved records keep acknowledged manual step ids as a bounded list of authored ids',()=>{
  const scenario=byId('INC-101');
  assert.deepEqual(normalizeLabRecord(scenario,{}).manual,[]);
  const record=normalizeLabRecord(scenario,{manual:['read-scenario','read-scenario','<img src=x>','x'.repeat(41),42,'verify']});
  assert.deepEqual(record.manual,['read-scenario','verify']);
});

test('the first page of a coding lab no longer waits for a requester question, while other tracks still do',()=>{
  const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const start=source.indexOf('function firstPageProgress('),end=source.indexOf('\n// Facts the lab manual',start);
  assert.ok(start>0&&end>start);
  const context=vm.createContext({inquiryProgress,readQuestionEvents,answerQuestion});
  vm.runInContext(source.slice(start,end),context);
  const ready=(id,extra={})=>{const scenario=byId(id);const record=normalizeLabRecord(scenario,{evidence:scenario.clues.slice(0,2).map(clue=>clue.id),symptoms:'The starter output is wrong.',plan:'I will multiply instead of add.',ideaSaved:true,...extra});return context.firstPageProgress(scenario,record);};
  assert.equal(ready('CODE-501').ready,true);
  assert.equal(ready('CODE-501').message,'Section 1 complete. You can continue.');
  assert.equal(ready('INC-102').ready,false);
  assert.equal(ready('INC-102').message,'Ask a question about the problem.');
  const coding=byId('CODE-501'),partial=context.firstPageProgress(coding,normalizeLabRecord(coding,{evidence:[coding.clues[0].id]}));
  assert.equal(partial.message,'Read 1 more reference card.');
});

test('the lab page renders the guided-lab wording for every scenario with the real format module',()=>{
  const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const start=source.indexOf('function labPage(s){'),end=source.indexOf('\nfunction evidenceList(',start);
  const context=vm.createContext({labFormat,sceneArtHTML:()=>'',currentLab:null,labView:null,workStorage:{},SESSION:{},recordFor:()=>({questions:[],evidence:[],symptoms:'',plan:'',notes:'',reflection:'',events:[],state:{}}),labLanguage:()=>({goalLabel:'Your goal'}),requesterPersona:()=>({name:'Finley',role:'Coordinator',intro:'Hi.'}),tracks:{hardware:{name:'Hardware'},network:{name:'Network'},ai:{name:'AI'},security:{name:'Security'},coding:{name:'Coding'}},esc:value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character])),interviewList:()=>'',evidenceList:()=>'',eventList:()=>'',eventMessage:()=>'',workStatus:()=>''});
  vm.runInContext(source.slice(start,end),context);
  for(const scenario of SCENARIOS){
    const html=context.labPage(scenario);
    assert.ok(html.includes('id="lab-manual" data-lab-manual'),scenario.id+' hosts the manual');
    assert.ok(html.includes('LAB SCENARIO')&&!html.includes('READ THE TICKET'),scenario.id);
    assert.ok(html.includes('Introduction &amp; setup')&&html.includes('Guided practice')&&html.includes('Challenge &amp; report'),scenario.id+' page names');
    assert.ok(html.includes('Finish lab & open report'),scenario.id);
    if(scenario.track==='coding'){
      assert.ok(html.includes('Reference sheet')&&html.includes('Plan your fix')&&html.includes('Ask the lab assistant (optional)'),scenario.id+' reads like a coding lab manual');
      assert.ok(!html.includes('Ask at least one question'),scenario.id+' never requires the conversation');
    }else assert.ok(html.includes('Clues &amp; evidence')&&html.includes('Ask at least one question'),scenario.id);
  }
});
