import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {SCENARIOS} from '../src/scenarios.js';
import {labLanguage} from '../src/lab-language.js';
import {requesterPersona} from '../src/requester-persona.js';
import {mountRequesterChat} from '../src/requester-chat.js';
import {FOUNDATION_LABS,createFoundationRecord} from '../src/foundation-model.js';
import {renderFoundationLab} from '../src/foundation-labs.js';
import {CAPSTONE_STAGES,renderCapstone} from '../src/capstone.js';
import {initialHardwareState,applyHardwareAction,verifyHardware} from '../src/hardware.js';
import {initialWorkspaceState,applyWorkspaceAction,verifyWorkspace} from '../src/workspaces.js';
import {answerQuestion,questionEvent,readQuestionEvents,inquiryProgress,retainInquiryEvents} from '../src/interview.js';
import {retainExperimentEvents,experimentEventText,experimentReport,readExperiments} from '../src/experiments.js';
import {workbenchProgress} from '../src/records.js';
import {learningRoute,labPageHash} from '../src/learning-tools.js';
import {createTextReport} from '../src/report-downloads.js';

const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const renderStart=source.indexOf('function labPage('),renderEnd=source.indexOf('\nfunction bindLab(',renderStart);
const helperStart=source.indexOf('function evidenceList('),reportEnd=source.indexOf('\nfunction openReport(',helperStart);
assert.ok(renderStart>=0&&renderEnd>renderStart&&helperStart>renderStart&&reportEnd>helperStart);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tracks=Object.fromEntries(SCENARIOS.map(s=>[s.track,{name:s.track}]));
function recordFor(s){return {questions:[],evidence:[],symptoms:'',plan:'',ideaSaved:false,notes:'',reflection:'',events:[],verified:false,closed:false,state:s.track==='hardware'?initialHardwareState(s.id):initialWorkspaceState(s.id)};}
function renderTicket(s,record=recordFor(s)){
  return vm.runInNewContext('let currentLab=null,labView=null;\n'+source.slice(renderStart,renderEnd)+'\nlabPage(s)',{
    s,tracks,esc,labLanguage,requesterPersona,recordFor:()=>record,inquiryProgress,readQuestionEvents,experimentEventText,workStorage:{},workStatus:()=> 'Private session'
  });
}
function openingTag(html,id){const match=new RegExp('<[a-z][^>]*\\bid="'+id+'"[^>]*>','i').exec(html);assert.ok(match,'Missing '+id);return match[0];}
function ancestorIds(html,id){
  const stack=[],voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  for(const match of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)\b([^>]*)>/gi)){
    const closing=match[1]==='/',tag=match[2].toLowerCase();
    if(closing){const index=stack.findLastIndex(item=>item.tag===tag);if(index>=0)stack.splice(index);continue;}
    const elementId=/\bid="([^"]+)"/.exec(match[3])?.[1];
    if(elementId===id)return stack.map(item=>item.id).filter(Boolean);
    if(!voidTags.has(tag)&&!match[3].endsWith('/'))stack.push({tag,id:elementId});
  }
  assert.fail('Missing element '+id);
}

// Use the actual event controller and actual reducers, with a deliberately small
// DOM boundary. Computed dimensions, native pointer/touch and downloads still
// require browser/device QA; this suite tests composition and retained work.
class Node {
  constructor(dataset={}){
    this.dataset=dataset;this.hidden=false;this.value='';this.textContent='';this.innerHTML='';this.tabIndex=0;
    this.attrs=new Map();this.listeners=new Map();this.children=new Map();this.childNodes=[];this.focused=0;
    const classes=new Set();this.classList={add:v=>classes.add(v),contains:v=>classes.has(v),toggle(v,force){const on=force===undefined?!classes.has(v):Boolean(force);if(on)classes.add(v);else classes.delete(v);return on;}};
  }
  addEventListener(name,handler){this.listeners.set(name,[...(this.listeners.get(name)||[]),handler]);}
  fire(name,extra={}){const event={target:this,preventDefault(){this.defaultPrevented=true;},...extra};for(const handler of this.listeners.get(name)||[])handler(event);return event;}
  setAttribute(name,value){this.attrs.set(name,String(value));}
  removeAttribute(name){this.attrs.delete(name);}
  getAttribute(name){return this.attrs.get(name)??null;}
  querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Node());return this.children.get(selector);}
  closest(selector){return selector==='details'?this.disclosure||null:null;}
  appendChild(node){this.childNodes.push(node);}
  replaceChildren(...nodes){this.childNodes=[...nodes];}
  focus(){this.focused++;}
  scrollIntoView(){}
  close(){}
}
function controller(s){
  const location={hash:labPageHash(s.id,1)},history={pushState(_s,_t,url){location.hash=url;},replaceState(_s,_t,url){location.hash=url;}};
  const record=recordFor(s),nodes=new Map(),calls={renders:0,saves:0,reports:0,visible:[]};
  let caseQuestion=false;
  for(const question of [...s.questions.map(item=>item.label),...(s.interviewFacts||[]).flatMap(item=>item.keywords||[])]){
    const reply=answerQuestion(s,question,record.state,readQuestionEvents(record.events)),event=questionEvent(question,reply);
    if(event)record.events.push(event);
    if(reply.accepted&&reply.kind==='answer'&&!['conversation','how-to','privacy','scope','safety'].includes(reply.topic))caseQuestion=true;
    if(caseQuestion&&inquiryProgress(s,record.events).complete)break;
  }
  assert.ok(caseQuestion,s.id+' fixture needs a case question');
  assert.equal(inquiryProgress(s,record.events).complete,true,s.id+' fixture needs the missing requester fact');
  record.evidence=s.clues.slice(0,2).map(clue=>clue.id);record.symptoms='The classroom task is not working as the requester describes.';
  record.plan='I think a setting or connection does not match the clues.';record.ideaSaved=true;
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,new Node());return nodes.get(selector);};
  const panels=['.case-sidebar','.bench-column','.evidence-sidebar'].map(node);
  ['#lab-problem','#lab-workbench','#lab-finish'].forEach((id,index)=>nodes.set(id,panels[index]));
  const tabs=[1,2,3].map(section=>new Node({labSection:String(section)}));
  const groups=new Map([
    ['[data-lab-section]',tabs],['[data-jump-section]',[1,2,3].map(section=>new Node({jumpSection:String(section)}))],
    ['[data-finish-check]',['inquiry','clues','plan','notes','reflection','verified'].map(finishCheck=>new Node({finishCheck}))],
    ['[data-clue]',s.clues.map(clue=>new Node({clue:clue.id}))],['[data-question]',s.questions.map((_,index)=>new Node({question:String(index)}))]
  ]);
  function renderBench(){calls.renders++;node('#workspace').children=new Map();if(s.track==='coding'){const editor=new Node();editor.value=record.state.code;nodes.set('#coding-editor',editor);}}
  const context=vm.createContext({s,record,tracks,location,history,learningRoute,labPageHash,labLanguage,requesterPersona,mountRequesterChat:(root,options)=>mountRequesterChat(root,{...options,preference:{enabled:true},fetcher:async()=>new Response(JSON.stringify({enabled:false}),{status:200})}),esc,answerQuestion,questionEvent,readQuestionEvents,inquiryProgress,retainInquiryEvents,
    applyHardwareAction,verifyHardware,applyWorkspaceAction:(id,state,action,value)=>applyWorkspaceAction(id,state,action,value===undefined?undefined:structuredClone(value)),verifyWorkspace,
    retainExperimentEvents:(scenario,events)=>retainExperimentEvents(scenario,structuredClone(events)),experimentEventText,experimentReport,readExperiments,workbenchProgress,
    $:node,$$:selector=>{assert.ok(groups.has(selector),'Unknown control group '+selector);return groups.get(selector);},
    document:{createElement:()=>new Node(),dispatchEvent(){}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    matchMedia:()=>({matches:true}),recordFor:()=>record,bindWorkPrivacy(){},workStatus:()=> 'Private session',evidenceList:()=>'',
    renderHardware:renderBench,renderWorkspace:renderBench,cancelHardwareInteraction(){},cancelCodingWorkbench(){},setHardwareVisible(_workspace,visible){calls.visible.push(visible);},
    save(){calls.saves++;},showNotice(){},openReport(){calls.reports++;},renderRoute(){},attachClassroomLab:()=>null,normalizeLabRecord:(_scenario,value)=>value
  });
  vm.runInContext('let workStorage={},classroomConnection=null,classroomSharingPaused=true,storageKey="test",store={labs:{}},labView={id:s.id,section:1};\n'+source.slice(helperStart,reportEnd)+'\nbindLab(s)',context);
  return {record,nodes,calls,panels,tabs,node,select(section){tabs[section-1].fire('click');},report(){return context.reportText(s,record);}};
}

for(const scenario of SCENARIOS){
  test(scenario.id+': one page appears at a time without losing the retained workstation and drafts',()=>{
    const html=renderTicket(scenario);
    for(const id of ['lab-problem','lab-workbench']){
      const tag=openingTag(html,id);
      assert.doesNotMatch(tag,/role="tabpanel"/,'Pages retain their labelled region semantics.');
      assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1);
    }
    for(const id of ['workspace','question-form','student-question','report-button','close-ticket','work-privacy'])openingTag(html,id);
    assert.doesNotMatch(html,/id="finish-report"|Preview my report/,'The finish page has one final report action.');
    if(scenario.secondLook){
      assert.match(openingTag(html,'second-look'),/^<details\b/,'A second look is available without adding another required step.');
      assert.ok(ancestorIds(html,'second-look').includes('lab-workbench'),'The second look belongs to the test page.');
      assert.ok(html.includes(esc(scenario.secondLook.prompt)));
      for(const check of scenario.secondLook.checks)assert.ok(html.includes(esc(check)));
      assert.match(html,/Working on your own\?/,'Students can use the check independently.');
    }else assert.doesNotMatch(html,/id="second-look"/);
    assert.deepEqual(ancestorIds(html,'lab-finish'),ancestorIds(html,'lab-workbench'),'The finish page must be a sibling of the hidden workbench, so it remains visible independently.');
    assert.deepEqual(ancestorIds(html,'lab-workbench'),ancestorIds(html,'lab-problem'),'Hiding the request page must not hide the workbench through a parent.');
    assert.ok(html.includes(esc(scenario.brief)),scenario.id+' must retain its actual request');
    assert.ok(html.includes(esc(scenario.goal)),scenario.id+' must retain its actual goal');
    assert.doesNotMatch(html,/role="tablist"[^>]*aria-label="Investigation sections"/);

    const h=controller(scenario),before=structuredClone(h.record),renders=h.calls.renders;
    assert.equal(h.panels[1].hidden,true,'Page one keeps the equipment out of the student workflow.');
    const question=h.node('#student-question');question.value='An unfinished follow-up about the fictional equipment';
    const draft=h.node('#workspace').querySelector('[data-workspace-draft]');draft.value='An unapplied workspace choice';
    const editor=scenario.track==='coding'?h.node('#coding-editor'):null;
    if(editor)editor.value='print(quantity * 3); // unsaved practice draft';
    let section=1;
    for(const requested of [2,3,1,3,2,1]){
      h.select(requested);if(requested!==3)section=requested;
      assert.equal(h.panels[0].hidden,section!==1,'Request is shown only on page one.');
      assert.equal(h.panels[1].hidden,section!==2,'Workstation is shown only on page two.');
      assert.equal(h.panels[2].hidden,section!==3,'Check & explain follows the selected step.');
      assert.equal(h.tabs[2].disabled,true,'Page three remains locked while the notebook is unfinished.');
      assert.equal(h.node('#student-question'),question);assert.ok(question.value.startsWith('An unfinished'));
      assert.equal(h.node('#workspace').querySelector('[data-workspace-draft]'),draft);assert.equal(draft.value,'An unapplied workspace choice');
      if(editor){assert.equal(h.node('#coding-editor'),editor);assert.match(editor.value,/unsaved practice draft/);}
    }
    assert.deepEqual(h.record,before,'Navigation must not repair, test, execute code, save, or reset work.');
    assert.equal(h.calls.renders,renders,'Page navigation cannot remount the equipment.');
    if(scenario.track==='hardware'){assert.ok(h.calls.visible.includes(false),'Page one suspends hardware interaction.');assert.ok(h.calls.visible.includes(true),'The same workbench becomes active on the later pages.');}
  });
}

test('all five beginner pathways use ordered steps with a single persistent equipment stage',()=>{
  assert.deepEqual(new Set(FOUNDATION_LABS.map(lab=>lab.track)),new Set(['hardware','network','ai','security','coding']));
  for(const lab of FOUNDATION_LABS){
    const html=renderFoundationLab(lab,createFoundationRecord(lab.id));
    assert.match(html,/class="[^"]*foundation-flow/);assert.doesNotMatch(html,/foundation-split|foundation-instructions/);
    const stage=/<section\b[^>]*\bdata-foundation-stage\b[^>]*>/.exec(html)?.[0];
    assert.ok(stage,lab.id+' must have learning equipment');assert.doesNotMatch(stage,/\bhidden(?:\s|>|=)/);
    assert.equal([...html.matchAll(/\bdata-foundation-stage\b/g)].length,1);
    for(const section of ['explore','practice','check'])openingTag(html,'foundation-panel-'+section);
    assert.match(html,/data-foundation-report/);assert.match(html,/Your work stays on this page/);
  }
});

test('every capstone work order routes to the same split investigation rather than a separate workspace',()=>{
  const html=renderCapstone({},()=>({ok:false}));
  assert.equal(CAPSTONE_STAGES.length,5);
  for(const stage of CAPSTONE_STAGES){
    const scenario=SCENARIOS.find(s=>s.id===stage.id);assert.ok(scenario);
    assert.ok(html.includes('#lab/'+stage.id+'?mode=independent&amp;sequence=opening-day'));
    const ticket=renderTicket(scenario);openingTag(ticket,'lab-problem');openingTag(ticket,'lab-workbench');
  }
});

test('the shared split layout keeps learner content escaped and private assessment data out of reports',async()=>{
  const base=SCENARIOS.find(s=>s.id==='NET-201'),privateCanary='PRIVATE_ASSESSMENT_CANARY_SPLIT';
  const scenario={...base,brief:'</blockquote><img src=x onerror=alert(1)>',rubric:[privateCanary],answerKey:privateCanary};
  const record=recordFor(scenario);record.plan='<script>fictional hypothesis</script>';record.notes='Fictional learner notes';
  const html=renderTicket(scenario,record);
  assert.ok(html.includes(esc(scenario.brief)));assert.ok(html.includes(esc(record.plan)));
  assert.doesNotMatch(html,/<img src=x|<script>fictional|PRIVATE_ASSESSMENT_CANARY_SPLIT/);
  const h=controller(scenario);h.record.notes='My fictional observations remain in the learner report.';
  const text=h.report();assert.match(text,/My fictional observations/);assert.doesNotMatch(text,/PRIVATE_ASSESSMENT_CANARY_SPLIT/);
  const report=createTextReport(text,scenario.id,{FileType:null});
  assert.equal(report.filename,'cole-learning-labs-NET-201.txt');assert.equal(report.blob.type,'text/plain;charset=utf-8');
  assert.equal(await report.blob.text(),text.replace(/\r\n?/g,'\n').replace(/\n/g,'\r\n'));
});
