import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { SCENARIOS } from '../src/scenarios.js';
import { labLanguage } from '../src/lab-language.js';
import { requesterPersona } from '../src/requester-persona.js';
import { mountRequesterChat } from '../src/requester-chat.js';
import { initialHardwareState, applyHardwareAction, verifyHardware } from '../src/hardware.js';
import { initialWorkspaceState, applyWorkspaceAction, verifyWorkspace } from '../src/workspaces.js';
import { answerQuestion, questionEvent, readQuestionEvents, inquiryProgress, retainInquiryEvents } from '../src/interview.js';
import { createWorkStorage, WORK_PREFIX } from '../src/local-work.js';
import { normalizeLabRecord,workbenchProgress } from '../src/records.js';

import {retainExperimentEvents,experimentEventText,experimentReport,readExperiments,setExperimentDraft,startExperiment,captureExperimentResult,saveExperiment} from '../src/experiments.js';
import {learningRoute,labPageHash} from '../src/learning-tools.js';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const helperStart = source.indexOf('function evidenceList(');
const bindingStart = source.indexOf('function bindLab(');
const reportStart = source.indexOf('\nfunction reportText(', bindingStart);
const reportEnd = source.indexOf('\nfunction openReport(', reportStart);
assert.ok(helperStart >= 0 && bindingStart > helperStart && reportStart > bindingStart && reportEnd > reportStart, 'Exercise the actual student lab, interview, and report functions.');
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const tracks = Object.fromEntries(SCENARIOS.map(scenario => [scenario.track, {name:scenario.track}]));

class Element {
  constructor(dataset = {}) {
    this.dataset = dataset; this.hidden = false; this.value = ''; this.textContent = ''; this.innerHTML = ''; this.tabIndex = 0; this.checked = false; this.disabled = false;
    this.attributes = new Map(); this.listeners = new Map(); this.children = new Map(); this.childNodes = []; this.focused = 0; this.scrolled = [];
    const classes = new Set();
    this.classList = {
      add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value),
      toggle(value, force) { const enabled = force === undefined ? !classes.has(value) : Boolean(force); if (enabled) classes.add(value); else classes.delete(value); return enabled; }
    };
  }
  addEventListener(name, listener) { this.listeners.set(name, [...(this.listeners.get(name) || []), listener]); }
  fire(name, extra = {}) {
    const event = {target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};
    for (const listener of this.listeners.get(name) || []) listener(event);
    return event;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  querySelector(selector) { if (!this.children.has(selector)) this.children.set(selector, new Element()); return this.children.get(selector); }
  querySelectorAll(selector) { return selector==='select[name]'?this.selects||[]:[]; }
  closest(selector) { return selector === 'details' ? this.disclosure || null : null; }
  appendChild(child) { this.childNodes.push(child); return child; }
  replaceChildren(...children) { this.childNodes = [...children]; }
  focus() { this.focused++; }
  scrollIntoView(options) { this.scrolled.push(options); }
  close() {}
}

function harness(id = 'INC-101', initialSection = 1, replyForQuestion = answerQuestion, prepareRecord = () => {}, routeOptions = {}, requesterOptions = {}) {
  const scenario = SCENARIOS.find(item => item.id === id);
  const record = {questions:[],evidence:[],symptoms:'',plan:'',ideaSaved:false,notes:'',reflection:'',events:[],verified:false,closed:false,state:scenario.track === 'hardware' ? initialHardwareState(id) : initialWorkspaceState(id)};
  prepareRecord(record);
  const elements = new Map();
  for (const selector of ['#main','#learning-mode','#experiment-predict','#lab-page-title','#lab-page-progress','#reply-source','#requester-options','#workspace','#coding-editor','.lab-shell','.lab-topbar .back-link','.save-status','#action-count','#verify-result','#action-feedback','#bench-log','#clue-count','#question-response','#question-suggestions','#intake-progress','#question-form','#student-question','#interview-history','#experiment-hypothesis','#experiment-symptoms','#first-idea-evidence','#first-idea-questions','#workbench-test-status','#workbench-next','#experiment-result','#run-hypothesis-test','#evidence-detail','#evidence-list','#symptoms','#plan','#save-idea','#idea-form','#idea-status','#page-one-progress','#clues-progress','#page-one-next','#notes','#reflection','#verify-task','#close-ticket','#reading-toggle','#saving-options','#work-privacy','#work-privacy details','#report-button','#reset-ticket','#cancel-reset','#reset-confirm','#confirm-reset','#dialog-close','#lab-dialog']) elements.set(selector,new Element());
  elements.get('#question-suggestions').hidden=true;
  elements.get('#work-privacy').hidden=true;
  for(const field of ['symptoms','plan','notes','reflection']){const error=new Element();error.hidden=true;elements.set('#'+field+'-error',error);}
  for (const [className,panelId] of [['.case-sidebar','#lab-problem'],['.bench-column','#lab-workbench'],['.evidence-sidebar','#lab-finish']]) { const panel = new Element(); elements.set(className,panel); elements.set(panelId,panel); }
  const groups = new Map([
    ['[data-lab-section]',[1,2,3].map(section => new Element({labSection:String(section)}))],
    ['[data-jump-section]',[2,1,3,2].map((section,index) => index===0||index===2?Object.assign(elements.get(index===0?'#page-one-next':'#workbench-next'),{dataset:{jumpSection:String(section)}}):new Element({jumpSection:String(section)}))],
    ['[data-finish-check]',[...(scenario.intake?.kind==='follow-up'?['inquiry']:[]),'clues','plan','notes','reflection','verified'].map(finishCheck => new Element({finishCheck}))],
    ['[data-question]',scenario.questions.map((_,index) => new Element({question:String(index)}))],
    ['[data-clue]',scenario.clues.map(clue => new Element({clue:clue.id}))]
  ]);
  const calls = {saved:0,rendered:0,reports:0,benchCancelled:0,workspaceDisposed:[],hardwareVisible:[],forcedRenders:[],notices:[],modeChanges:[]}; let workspaceAction;
  const location={hash:labPageHash(id,initialSection,routeOptions)},historyEntries=[location.hash];let historyIndex=0;
  elements.get('#learning-mode').value=routeOptions.mode||'guided';
  const history={pushState(_state,_title,url){historyEntries.splice(++historyIndex);historyEntries.push(url);location.hash=url;},replaceState(_state,_title,url){historyEntries[historyIndex]=url;location.hash=url;}};
  function renderBench(root,callback) {
    calls.rendered++; workspaceAction = callback;
    // The real renderer replaces inputs; this draft detects unexpected replacement.
    root.children = new Map(); root.querySelector('[data-unsaved-workbench-draft]').value = '';
  }
  const context = vm.createContext({networkStudioState:{},networkStudioHasWork:()=>false,initialNetworkStudioState:()=>({}),codingStudioState:{},codingStudioHasWork:()=>false,initialCodingStudioState:()=>({}),practiceStates:{},practiceHasWork:()=>false,practiceScenarioFor:()=>null,
    scenario,record,initialSection,applyHardwareAction,verifyHardware,location,history,learningRoute,labPageHash,labLanguage,requesterPersona,
    mountRequesterChat:(root,options)=>mountRequesterChat(root,{...options,preference:{enabled:true},fetcher:async()=>new Response(JSON.stringify({enabled:false}),{status:200}),...requesterOptions}),
    // Production modules share one realm. Transfer VM-created action data into
    // the model's realm so its strict plain-object boundary is tested fairly.
    applyWorkspaceAction:(caseId,previous,action,value)=>applyWorkspaceAction(caseId,previous,action,value===undefined?undefined:structuredClone(value)),
    retainExperimentEvents:(s,events)=>retainExperimentEvents(s,structuredClone(events)),experimentEventText,experimentReport,readExperiments,workbenchProgress,verifyWorkspace,answerQuestion:replyForQuestion,questionEvent,readQuestionEvents,inquiryProgress,retainInquiryEvents,tracks,esc:escapeHtml,
    document:{title:'',createElement(tagName){const element=new Element();element.tagName=tagName.toUpperCase();return element;},dispatchEvent(){}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    $: selector => { assert.ok(elements.has(selector),'Unexpected lab selector: '+selector); return elements.get(selector); },
    $$: selector => { assert.ok(groups.has(selector),'Unexpected lab control group: '+selector); return groups.get(selector); },
    bindWorkPrivacy() {},recordFor:() => record,workStatus:() => 'Private session',evidenceList:() => '',
    renderHardware(root,_id,_state,callback) { assert.equal(scenario.track,'hardware'); renderBench(root,callback); },
    cancelHardwareInteraction(root) { assert.equal(root,elements.get('#workspace')); calls.benchCancelled++; },
    setHardwareVisible(root,visible) { assert.equal(root,elements.get('#workspace')); assert.equal(typeof visible,'boolean'); calls.hardwareVisible.push(visible); },
    disposeWorkspace(root) { calls.workspaceDisposed.push(root); },
    renderWorkspace(root,_scenario,_state,callback) { assert.notEqual(scenario.track,'hardware'); renderBench(root,callback); root.selects=Object.entries(_state).filter(([,value])=>typeof value==='string').map(([name,value])=>Object.assign(new Element(),{name,value})); if(scenario.track==='coding'){const editor=new Element();editor.value=_state.code;elements.set('#coding-editor',editor);} },
    save() { calls.saved++; },showNotice(message) { calls.notices.push(message); },openReport() { calls.reports++; },renderRoute(preserveDraft) { calls.forcedRenders.push(preserveDraft); },
    onModeChange(mode) { calls.modeChanges.push(mode);elements.get('#learning-mode').value=mode; },
    normalizeLabRecord:(_scenario,value) => value,attachClassroomLab:() => null,matchMedia:() => ({matches:true}),Date
  });
  vm.runInContext('let workStorage={},classroomConnection=null,classroomSharingPaused=true,storageKey="test",store={labs:{[scenario.id]:record}},labNavigation=null,labView={id:scenario.id,section:initialSection};\n'+source.slice(helperStart,reportStart)+source.slice(reportStart,reportEnd)+'\nglobalThis.navigation=bindLab(scenario,learningRoute(location.hash),{onModeChange});',context);
  return {scenario,record,context,controller:context.navigation,calls,elements,groups,location,historyEntries,
    back(){if(historyIndex===0)return false;location.hash=historyEntries[--historyIndex];return context.navigation.syncRoute(learningRoute(location.hash));},
    forward(){if(historyIndex===historyEntries.length-1)return false;location.hash=historyEntries[++historyIndex];return context.navigation.syncRoute(learningRoute(location.hash));},
    sync(hash){location.hash=hash;return context.navigation.syncRoute(learningRoute(hash));},
    changeMode(mode){elements.get('#learning-mode').value=mode;history.replaceState(null,'',labPageHash(id,elements.get('.lab-shell').dataset.section,{mode,sequence:routeOptions.sequence}));},
    section(number) { groups.get('[data-lab-section]')[number-1].fire('click'); },
    key(index,key) { return groups.get('[data-lab-section]')[index].fire('keydown',{key}); },
    input(field,value) { const element = elements.get('#'+field); element.value = value; element.fire('input'); },
    ask(question) { elements.get('#student-question').value = question; return elements.get('#question-form').fire('submit'); },
    action(...args) { return workspaceAction(...args); },
    visible() { return ['.case-sidebar','.bench-column','.evidence-sidebar'].map(selector => !elements.get(selector).hidden); },
    selected() { return groups.get('[data-lab-section]').map(tab => String(tab.getAttribute('aria-current')==='step')); },
    report() { return context.reportText(scenario,record); }
  };
}

function completePageOne(scenario,record) {
  let caseQuestion=false;
  for(const question of [...scenario.questions.map(item=>item.label),...(scenario.interviewFacts||[]).flatMap(item=>item.keywords||[])]) {
    const reply=answerQuestion(scenario,question,record.state,readQuestionEvents(record.events));
    const event=questionEvent(question,reply);
    if(event)record.events.push(event);
    if(reply.accepted&&reply.kind==='answer'&&!['conversation','how-to','privacy','scope','safety'].includes(reply.topic))caseQuestion=true;
    if(caseQuestion&&inquiryProgress(scenario,record.events).complete)break;
  }
  assert.ok(caseQuestion,scenario.id+' fixture needs an accepted question about the case');
  assert.equal(inquiryProgress(scenario,record.events).complete,true,scenario.id+' fixture needs any missing requester detail');
  record.evidence=scenario.clues.slice(0,2).map(item=>item.id);
  record.symptoms='The requested classroom task does not work as described.';
  record.plan='I think a connection or setting does not match the clues.';
  record.ideaSaved=true;
}

function readyHarness(id='INC-101',initialSection=1,reply=answerQuestion,prepare=()=>{},routeOptions={},requesterOptions={}) {
  const scenario=SCENARIOS.find(item=>item.id===id);
  return harness(id,initialSection,reply,record=>{completePageOne(scenario,record);prepare(record);},routeOptions,requesterOptions);
}

function saveSuccessfulTest(scenario,record){
  const actual=scenario.track==='hardware'?verifyHardware(scenario.id,record.state):verifyWorkspace(scenario.id,record.state);
  assert.equal(actual.ok,true,scenario.id+' needs an actually passing setup before this saved-test fixture');
  setExperimentDraft(scenario,record,{predict:record.plan,evidence:'The collected clues and the current task result support this test.'});
  assert.equal(startExperiment(scenario,record,record.state).ok,true);
  setExperimentDraft(scenario,record,{changed:'I applied the change described by my test idea.'});
  assert.equal(captureExperimentResult(scenario,record,record.state,actual).ok,true);
  setExperimentDraft(scenario,record,{observed:'The original classroom task worked when I tested it.',explain:'The test supports my idea because the requested result now works.'});
  assert.equal(saveExperiment(scenario,record).ok,true);record.verified=true;
}

function saveCurrentTest(h){saveSuccessfulTest(h.scenario,h.record);h.controller.refreshStatus();}

function connectMotherboardPower(h){
  for(const action of ['power-off','unplug','asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel','asm-connect-atx','asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1'])h.action(action);
  assert.equal(h.record.state.atxConnected,true,'The motherboard power cable is repaired through the guarded workbench actions.');
}

function finishedHarness(id='INC-101',initialSection=1,prepare=()=>{}){
  return readyHarness(id,initialSection,answerQuestion,record=>{
    record.state=applyHardwareAction(id,{...initialHardwareState('INC-101'),caseId:id,videoPort:'gpu',documentOpened:true},'enable-assembly').state;
    prepare(record);saveSuccessfulTest(SCENARIOS.find(item=>item.id===id),record);
  });
}

test('a fresh first page blocks every route forward until the question, two clues and saved answers are complete',()=>{
  const h=harness('INC-102'),next=h.elements.get('#page-one-next');
  assert.deepEqual(h.visible(),[true,false,false]);assert.equal(next.disabled,true);
  assert.deepEqual(h.groups.get('[data-lab-section]').map(button=>button.disabled),[false,true,true]);
  for(const section of [2,3]){h.section(section);assert.deepEqual(h.visible(),[true,false,false]);}
  for(const key of ['ArrowRight','ArrowLeft','End']){assert.equal(h.key(0,key).defaultPrevented,true);assert.deepEqual(h.visible(),[true,false,false]);}
  next.fire('click');assert.deepEqual(h.visible(),[true,false,false]);
  h.ask('Are any lights on?');assert.equal(next.disabled,true);
  h.groups.get('[data-clue]')[0].fire('click');h.groups.get('[data-clue]')[1].fire('click');assert.equal(next.disabled,true);
  assert.match(h.elements.get('#clues-progress').textContent,/2/);
  h.input('symptoms','Pressing the power button gives no lights or fan noise.');
  h.input('plan','I think the desktop is not receiving power because its AC cable is disconnected.');
  assert.equal(h.record.ideaSaved,false);assert.equal(next.disabled,true,'Typing both answers does not count as Save first idea.');
  h.elements.get('#idea-form').fire('submit');assert.equal(h.record.ideaSaved,true);assert.equal(next.disabled,false);
  assert.deepEqual(h.groups.get('[data-lab-section]').map(button=>button.disabled),[false,false,true]);
  h.section(3);assert.deepEqual(h.visible(),[true,false,false],'Check & explain cannot skip visiting the workbench.');
  next.fire('click');assert.deepEqual(h.visible(),[false,true,false]);
  assert.equal(h.groups.get('[data-lab-section]')[2].disabled,true,'Visiting page two does not replace a complete saved test.');
  h.section(3);assert.deepEqual(h.visible(),[false,true,false]);
});

test('page three stays locked through click, keyboard, jump and finish attempts until the successful notebook is saved',()=>{
  const h=readyHarness('INC-102',2);connectMotherboardPower(h);h.action('plug-in');h.action('boot');h.action('open-document');
  h.elements.get('#run-hypothesis-test').fire('click');assert.equal(h.record.verified,true);
  const route=routeHarness('INC-102',h.controller);
  for(const forward of [()=>h.section(3),()=>h.key(1,'End'),()=>h.elements.get('#workbench-next').fire('click'),()=>h.elements.get('#close-ticket').fire('click')]){
    forward();assert.deepEqual(h.visible(),[false,true,false]);assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);
  }
  assert.equal(h.groups.get('[data-lab-section]')[2].disabled,true);assert.equal(h.elements.get('#workbench-next').disabled,true);
  setExperimentDraft(h.scenario,h.record,{predict:h.record.plan,evidence:'The AC clue and the working lesson file support my power test.'});
  startExperiment(h.scenario,h.record,h.record.state);captureExperimentResult(h.scenario,h.record,h.record.state);
  assert.equal(saveExperiment(h.scenario,h.record).ok,false,'A passing result still needs the separate change, observation and explanation.');
  route.learning.onSave();h.section(3);assert.deepEqual(h.visible(),[false,true,false]);
  setExperimentDraft(h.scenario,h.record,{changed:'I connected the power cable and started the PC.',observed:'The requested lesson file opened.',explain:'The restored power path explains why the task works now.'});
  assert.equal(saveExperiment(h.scenario,h.record).ok,true);route.learning.onSave();
  assert.equal(h.groups.get('[data-lab-section]')[2].disabled,false);assert.equal(h.elements.get('#workbench-next').disabled,false);
  h.elements.get('#workbench-next').fire('click');assert.deepEqual(h.visible(),[false,false,true]);
});

test('restoring page three requires a current saved successful test rather than saved visit or verification flags',()=>{
  const incomplete=readyHarness('INC-102',3,answerQuestion,record=>{record.verified=true;record.closed=true;});
  assert.deepEqual(incomplete.visible(),[false,true,false]);assert.equal(incomplete.groups.get('[data-lab-section]')[2].disabled,true);
  const complete=finishedHarness('INC-102',3);assert.deepEqual(complete.visible(),[false,false,true]);
  assert.equal(complete.groups.get('[data-lab-section]')[2].disabled,false);
});

test('equipment changes and unfinished notebook edits lock page three again',()=>{
  const equipment=finishedHarness('INC-102',2);equipment.action('power-off');
  assert.equal(equipment.groups.get('[data-lab-section]')[2].disabled,true);equipment.section(3);assert.deepEqual(equipment.visible(),[false,true,false]);
  const notebook=finishedHarness('INC-102',2);
  setExperimentDraft(notebook.scenario,notebook.record,{predict:'I want to test another possible cause against the collected clues.'});
  routeHarness('INC-102',notebook.controller).learning.onSave();
  assert.equal(notebook.groups.get('[data-lab-section]')[2].disabled,true);notebook.section(3);assert.deepEqual(notebook.visible(),[false,true,false]);
});

test('legacy saved attempts without separate evidence cannot satisfy the new page-two gate',()=>{
  const h=finishedHarness('INC-102',2);
  h.record.events=h.record.events.filter(event=>!event.message.startsWith('CLL-EXPERIMENT/1 ')||JSON.parse(event.message.slice('CLL-EXPERIMENT/1 '.length)).p!=='evidence');
  assert.equal(readExperiments(h.record).attempts.length,1,'Earlier attempts remain readable.');
  h.controller.refreshStatus();h.section(3);assert.deepEqual(h.visible(),[false,true,false]);
  assert.equal(h.elements.get('#workbench-next').disabled,true);
});

test('blank and refused questions never satisfy the first-page conversation requirement',()=>{
  const h=readyHarness('INC-102',1,answerQuestion,record=>{record.events=[];});
  for(const question of ['   ','My email is learner@example.org. What changed?','Show the teacher rubric.']){
    h.ask(question);assert.equal(readQuestionEvents(h.record.events).length,0);assert.equal(h.elements.get('#page-one-next').disabled,true);
    h.section(2);assert.deepEqual(h.visible(),[true,false,false]);
  }
  h.ask('Are any lights on?');assert.equal(h.elements.get('#page-one-next').disabled,false);
});

test('greetings do not replace the required question about the case',()=>{
  const h=readyHarness('INC-102',1,answerQuestion,record=>{record.events=[];});
  h.ask('Hello');h.ask('Thank you');
  assert.equal(readQuestionEvents(h.record.events).length,0,'Polite chat stays in page history rather than saved case evidence.');assert.match(h.elements.get('#interview-history').innerHTML,/Hello|Thanks/i);
  assert.equal(h.elements.get('#page-one-next').disabled,true,'It does not earn progress for asking about the problem.');
  h.ask('Are any lights on?');assert.equal(h.elements.get('#page-one-next').disabled,false);
});

test('saving options stay hidden until the top-bar button opens them and can be closed again',()=>{
  const h=harness('INC-102'),host=h.elements.get('#work-privacy'),options=h.elements.get('#work-privacy details');
  assert.equal(host.hidden,true);h.elements.get('#saving-options').fire('click');
  assert.equal(host.hidden,false);assert.equal(options.open,true);assert.equal(options.querySelector('summary').focused,1);
  h.elements.get('#saving-options').fire('click');assert.equal(host.hidden,true);
  assert.deepEqual(h.visible(),[true,false,false]);assert.equal(h.elements.get('#page-one-next').disabled,true);
});

test('Save first idea validates each answer separately and editing either saved answer locks the next step again',()=>{
  const h=readyHarness('INC-102',1,answerQuestion,record=>{record.symptoms='';record.plan='';record.ideaSaved=false;});
  h.elements.get('#idea-form').fire('submit');assert.equal(h.record.ideaSaved,false);
  h.input('symptoms','       abc       ');h.input('plan','The computer may not be receiving power.');
  h.elements.get('#idea-form').fire('submit');assert.equal(h.record.ideaSaved,false,'Whitespace cannot pad a short symptoms answer.');
  h.input('symptoms','The PC has no lights and no fan noise.');h.input('plan','        abc       ');
  h.elements.get('#idea-form').fire('submit');assert.equal(h.record.ideaSaved,false,'The explanation also needs a full answer.');
  h.input('plan','The disconnected AC cable may stop power from reaching the PC.');h.elements.get('#idea-form').fire('submit');
  assert.equal(h.record.ideaSaved,true);assert.equal(h.elements.get('#page-one-next').disabled,false);
  for(const field of ['symptoms','plan']){
    h.input(field,h.record[field]+' I checked the clue.');
    assert.equal(h.record.ideaSaved,false);assert.equal(h.elements.get('#page-one-next').disabled,true);
    h.section(2);assert.deepEqual(h.visible(),[true,false,false]);
    h.elements.get('#idea-form').fire('submit');assert.equal(h.record.ideaSaved,true);
  }
  assert.ok(h.report().includes('The PC has no lights and no fan noise. I checked the clue.'));
});

test('only two distinct available case clues satisfy first-page progress',()=>{
  const h=readyHarness('INC-101',1,answerQuestion,record=>{record.events=[];record.evidence=[];});
  const locked=h.groups.get('[data-clue]').find(button=>button.dataset.clue==='history');
  locked.fire('click');assert.deepEqual(h.record.evidence,[]);assert.equal(locked.getAttribute('aria-disabled'),'true');
  const clue=h.groups.get('[data-clue]')[0];clue.fire('click');clue.fire('click');
  assert.equal(h.record.evidence.length,1);assert.match(h.elements.get('#clues-progress').textContent,/1/);assert.equal(h.elements.get('#page-one-next').disabled,true);
  h.ask('What changed?');assert.equal(locked.getAttribute('aria-disabled'),'false');locked.fire('click');
  assert.equal(h.record.evidence.length,2);assert.equal(h.elements.get('#page-one-next').disabled,false);
  const damaged=readyHarness('INC-102',1,answerQuestion,record=>{record.evidence=['power','power','invented-clue'];});
  assert.equal(damaged.elements.get('#page-one-next').disabled,true,'Duplicates and unknown IDs do not stand in for two case clues.');
  damaged.groups.get('[data-clue]')[1].fire('click');assert.equal(damaged.elements.get('#page-one-next').disabled,false);
});

test('follow-up requests need their missing fact even after an accepted question and saved answers',()=>{
  const h=readyHarness('INC-101',1,answerQuestion,record=>{record.events=[];});
  h.ask('Which port is the monitor using?');assert.equal(readQuestionEvents(h.record.events).length,1);
  assert.equal(inquiryProgress(h.scenario,h.record.events).complete,false);assert.equal(h.elements.get('#page-one-next').disabled,true);
  h.ask('What changed?');assert.equal(h.elements.get('#page-one-next').disabled,false);
});

test('incomplete records cannot resume in later sections and saved page-one answers survive navigation',()=>{
  const locked=harness('INC-102',3);assert.deepEqual(locked.visible(),[true,false,false]);
  const h=readyHarness('INC-102',2),before=structuredClone(h.record),rendered=h.calls.rendered;
  h.section(3);h.section(1);h.section(2);
  assert.deepEqual(h.record,before);assert.equal(h.calls.rendered,rendered);
  assert.equal(h.record.ideaSaved,true);assert.ok(h.report().includes(h.record.symptoms));
});

test('leaving the hardware workbench cancels gestures without rebuilding or changing the investigation', () => {
  const h=finishedHarness('INC-101',2),before=structuredClone(h.record),renders=h.calls.rendered;
  assert.equal(h.calls.benchCancelled,0);
  h.section(3);assert.equal(h.calls.benchCancelled,1);
  h.section(2);assert.equal(h.calls.benchCancelled,1);
  h.section(1);assert.equal(h.calls.benchCancelled,2);
  assert.deepEqual(h.record,before);assert.equal(h.calls.rendered,renders);
});

test('every visible hardware workbench adopts mechanics once without repairing its ticket fault', () => {
  for(const scenario of SCENARIOS.filter(item=>item.track==='hardware')) {
    const before=initialHardwareState(scenario.id),h=readyHarness(scenario.id);
    assert.equal(h.record.state.assemblyEnabled,true,scenario.id);
    for(const [key,value] of Object.entries(before)) {
      if(['assemblyEnabled','assembly','actions'].includes(key))continue;
      assert.deepEqual(h.record.state[key],value,scenario.id+' must preserve '+key);
    }
    assert.equal(h.record.verified,false,scenario.id);assert.equal(h.record.closed,false,scenario.id);
    assert.equal(h.calls.saved,1,scenario.id);assert.equal(h.record.events.length,readQuestionEvents(h.record.events).length+1,scenario.id);
    const adopted=structuredClone(h.record),renders=h.calls.rendered;
    h.section(1);h.section(2);h.section(3);h.section(2);
    assert.deepEqual(h.record,adopted,scenario.id+' navigation must not reinitialize equipment or work');
    assert.equal(h.calls.rendered,renders,scenario.id);
  }
});

test('resumed detailed repairs preserve mechanical changes, explanations and verification on repair entry',()=>{
  const h=readyHarness('INC-106',1,answerQuestion,record=>{
    record.state=applyHardwareAction('INC-106',record.state,'enable-assembly').state;
    record.state=applyHardwareAction('INC-106',record.state,'asm-fit-psu').state;
    record.state=applyHardwareAction('INC-106',record.state,'asm-tighten-psu-0').state;
    record.plan='I will verify each connected power path.';record.notes='The power supply has one secured screw.';
    record.verified=true;record.closed=true;
  });
  const before=structuredClone(h.record);h.section(2);h.section(1);h.section(2);
  assert.deepEqual(h.record,before);assert.equal(h.calls.saved,0);assert.equal(h.calls.rendered,1);
  assert.equal(h.record.state.assembly.psuScrews[0],true);
});

test('section focus shows one page while preserving questions, notes and workstation drafts', () => {
  const h = finishedHarness(); assert.deepEqual(h.visible(),[true,false,false]); assert.deepEqual(h.selected(),['true','false','false']);
  h.elements.get('#student-question').value='What happened before the display stopped?';
  const initial=structuredClone(h.record.state);
  h.section(2);
  assert.equal(h.record.state.assemblyEnabled,true,'Opening the repair section adopts detailed mechanics once.');
  assert.equal(h.record.state.videoPort,initial.videoPort,'Entering repair does not solve the ticket fault.');
  assert.equal(h.elements.get('#student-question').value,'What happened before the display stopped?');
  h.section(1);
  const rendered=h.calls.rendered,saved=h.calls.saved;
  const draft = h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'); draft.value = 'An unfinished virtual workbench setting';
  h.input('plan','The fictional cable may be connected to the wrong output.');
  h.elements.get('#idea-form').fire('submit');saveCurrentTest(h);
  h.section(2); assert.deepEqual(h.visible(),[false,true,false]); h.section(3); assert.deepEqual(h.visible(),[false,false,true]);
  h.input('notes','I inspected the connection and compared the available outputs.'); h.input('reflection','Checking the signal path helps explain the symptom.'); h.section(1);
  for (const field of ['plan','notes','reflection']) assert.equal(h.record[field],h.elements.get('#'+field).value);
  assert.equal(h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'),draft); assert.equal(draft.value,'An unfinished virtual workbench setting');
  assert.equal(h.calls.rendered,rendered,'Returning between sections must not recreate an adopted workbench.'); assert.equal(h.calls.saved,saved+4,'Field edits and the explicit Save first idea save the record.');
  assert.deepEqual(h.visible(),[true,false,false]); assert.deepEqual(h.groups.get('[data-lab-section]').map(tab=>tab.focused),[2,2,1]);
});

test('page two shows the saved symptoms, first idea, collected clues and requester replies',()=>{
  const h=readyHarness('INC-102',2),pairs=readQuestionEvents(h.record.events);
  assert.equal(h.elements.get('#experiment-symptoms').textContent,h.record.symptoms);
  assert.equal(h.elements.get('#experiment-hypothesis').textContent,h.record.plan);
  for(const id of h.record.evidence){
    const clue=h.scenario.clues.find(item=>item.id===id);
    assert.ok(h.elements.get('#first-idea-evidence').innerHTML.includes(escapeHtml(clue.text)));
  }
  for(const pair of pairs){
    assert.ok(h.elements.get('#first-idea-questions').innerHTML.includes(escapeHtml(pair.question)));
    assert.ok(h.elements.get('#first-idea-questions').innerHTML.includes(escapeHtml(pair.answer)));
  }
  assert.deepEqual(h.visible(),[false,true,false]);
});

test('page two hides unrelated top-bar links and closes saving options while preserving page-one access',()=>{
  const h=finishedHarness('INC-102'),controls=['.lab-topbar .back-link','#saving-options','#report-button'];
  for(const selector of controls)assert.equal(h.elements.get(selector).hidden,false,selector+' is available on page one');
  h.elements.get('#saving-options').fire('click');assert.equal(h.elements.get('#work-privacy').hidden,false);
  h.section(2);
  for(const selector of controls)assert.equal(h.elements.get(selector).hidden,true,selector+' is hidden on page two');
  assert.equal(h.elements.get('#work-privacy').hidden,true);assert.equal(h.elements.get('#reading-toggle').hidden,false);
  h.section(3);for(const selector of controls)assert.equal(h.elements.get(selector).hidden,false,selector+' is available again on page three');
  h.section(1);assert.deepEqual(h.visible(),[true,false,false]);
});

test('the action log shows every retained action rather than only its latest ten entries',()=>{
  const h=readyHarness('INC-102',2,answerQuestion,record=>{
    for(let index=0;index<15;index++)record.events.push({kind:'info',time:'2026-10-22T12:00:00Z',message:'Earlier virtual action '+index});
  });
  h.action('inspect-monitor');
  const html=h.elements.get('#bench-log').innerHTML;
  assert.equal((html.match(/<li>/g)||[]).length,h.record.events.length);
  assert.ok(html.includes('Earlier virtual action 0'));assert.ok(html.includes('Earlier virtual action 14'));
});

test('Test my idea distinguishes a failed test, a changed setup and a fresh successful test',()=>{
  const h=readyHarness('INC-102',2);
  h.elements.get('#run-hypothesis-test').fire('click');
  assert.equal(h.record.verified,false);assert.match(h.elements.get('#experiment-result').textContent,/not ready|not work|not fixed yet|try again/i);
  assert.match(h.elements.get('#experiment-result').textContent,/notebook|next idea/i,'A failed result directs the learner to another idea.');
  h.action('plug-in');h.action('boot');h.elements.get('#run-hypothesis-test').fire('click');
  assert.equal(h.record.verified,false,'Connecting only AC must leave the second power fault unresolved.');
  assert.equal(h.record.state.atxConnected,false);assert.equal(h.record.state.booted,false);
  assert.equal(h.groups.get('[data-lab-section]')[2].disabled,true,'The AC-only test cannot unlock step three.');
  connectMotherboardPower(h);h.action('plug-in');h.action('boot');h.action('open-document');
  assert.equal(h.record.verified,false,'Repairing the state alone cannot count as a fresh successful test.');
  assert.match(h.elements.get('#experiment-result').textContent,/changed|test again|fresh test/i);
  h.elements.get('#run-hypothesis-test').fire('click');
  assert.equal(h.record.verified,true);assert.match(h.elements.get('#experiment-result').textContent,/works|success/i);
  assert.match(h.elements.get('#experiment-result').textContent,/Check.*explain/i,'A successful result directs the learner to explain the result.');
  assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);
});

test('a successful notebook retest does not label the original wrong hypothesis as successful',()=>{
  const h=readyHarness('INC-102',2,answerQuestion,record=>{record.plan='I think missing memory is stopping this PC from starting.';});
  h.elements.get('#run-hypothesis-test').fire('click');
  assert.equal(h.record.verified,false);assert.equal(h.elements.get('#experiment-result').dataset.kind,'warning');
  connectMotherboardPower(h);h.action('plug-in');h.action('boot');h.action('open-document');
  const firstCard=h.elements.get('#experiment-result'),before=firstCard.textContent,tone=firstCard.dataset.kind;
  const nextIdea='I think connecting AC and the loose motherboard power cable will let the PC start.';
  // Use the real renderRoute callback with the real controller. This catches
  // losing the firstIdea:false option between the notebook and the controller.
  const route=routeHarness('INC-102',h.controller);
  assert.equal(route.learning.onTest(nextIdea),true);
  assert.equal(h.record.verified,true);assert.equal(h.record.closed,false);
  assert.equal(firstCard.textContent,before);assert.equal(firstCard.dataset.kind,tone);
  assert.equal(h.elements.get('#experiment-hypothesis').textContent,'I think missing memory is stopping this PC from starting.');
  assert.match(h.elements.get('#workbench-test-status').textContent,/complete.*save.*notebook/i,'A working task still needs a saved explanation.');
  assert.ok(h.record.events.some(event=>event.message.includes(nextIdea)),'The new idea receives its own test log entry.');
});

test('a running desktop still needs the lesson file opened and retested before verification',()=>{
  const h=readyHarness('INC-102',2);connectMotherboardPower(h);h.action('plug-in');h.action('boot');
  assert.equal(h.record.state.booted,true);assert.equal(h.record.state.documentOpened,false);
  assert.equal(verifyHardware(h.scenario.id,h.record.state).needsDocument,true);
  h.elements.get('#run-hypothesis-test').fire('click');
  assert.equal(h.record.verified,false);assert.equal(h.record.closed,false);
  const feedback=h.elements.get('#experiment-result').textContent;
  assert.match(feedback,/Click Lesson_Practice_File\.docx on the monitor/i);
  assert.match(feedback,/Test my idea again/i);assert.doesNotMatch(feedback,/notebook|next idea|not fixed yet/i);
  assert.match(h.elements.get('#workbench-test-status').textContent,/(?:Open|Click) the lesson file.*test.*save/i);
  h.action('open-document');assert.equal(h.record.verified,false,'Opening the file still needs a fresh test.');
  h.elements.get('#run-hypothesis-test').fire('click');assert.equal(h.record.verified,true);
});

const codingPrograms={
  'CODE-501':'print(quantity * 3);',
  'CODE-502':'if (temperature < 20) { print("Heating"); } else { if (temperature <= 25) { print("Comfortable"); } else { print("Cooling"); } }',
  'CODE-503':'let station = 1; repeat(stations) { print("Ready " + station); station = station + 1; }'
};

function explainCodingWork(h) {
  h.ask(h.scenario.questions[0].label);
  h.groups.get('[data-clue]')[0].fire('click');h.groups.get('[data-clue]')[1].fire('click');
  h.input('symptoms','The program output does not match the requested classroom result.');
  h.input('plan','The program should use its supplied input rather than a fixed answer.');
  h.elements.get('#idea-form').fire('submit');h.section(2);
  h.input('notes','I changed the program and ran every changing input fixture to compare its actual output.');
  h.input('reflection','The passing fixtures support my hypothesis because the same program handles each supplied input.');
}

function saveFirstIdea(h) {
  h.groups.get('[data-clue]')[0].fire('click');h.groups.get('[data-clue]')[1].fire('click');
  h.input('symptoms','The requested classroom task does not work as described.');
  h.input('plan','I think a connection or setting does not match the clues.');
  h.elements.get('#idea-form').fire('submit');
}

test('coding editor drafts remain intact across all three tabs without being saved or executed',()=>{
  const h=readyHarness('CODE-501'),editor=h.elements.get('#coding-editor'),savedSource=h.record.state.code;
  editor.value=codingPrograms['CODE-501'];const savedBefore=h.calls.saved,renderedBefore=h.calls.rendered;
  h.section(2);h.section(3);h.section(1);h.section(2);
  assert.equal(h.elements.get('#coding-editor'),editor);
  assert.equal(editor.value,codingPrograms['CODE-501']);assert.equal(h.record.state.code,savedSource);
  assert.equal(h.record.state.tested,false);assert.equal(h.record.state.checkRuns,0);
  assert.equal(h.calls.saved,savedBefore);assert.equal(h.calls.rendered,renderedBefore);
});



test('direct entry opens the requested lab page without stealing focus or executing work',()=>{
  for(const [index,title] of ['Request & clues','Workbench & test','Check & Explain'].entries()) {
    const h=readyHarness('CODE-501',index+1,answerQuestion,record=>{record.state=applyWorkspaceAction('CODE-501',record.state,'run-check',{code:codingPrograms['CODE-501']}).state;saveSuccessfulTest(SCENARIOS.find(s=>s.id==='CODE-501'),record);});
    assert.deepEqual(h.visible(),[0,1,2].map(value=>value===index));
    assert.equal(h.elements.get('#lab-page-title').textContent,title);
    assert.ok(h.context.document.title.includes(title));
    assert.deepEqual(h.groups.get('[data-lab-section]').map(button=>button.focused),[0,0,0]);
    assert.equal(h.calls.saved,0);assert.equal(h.calls.rendered,1);assert.equal(h.record.state.checkRuns,1);
    assert.equal(h.historyEntries.length,1,'Opening a deep link does not create another history entry.');
  }
});

test('starting a lab over clears its work and forces a fresh Request & clues page',()=>{
  const h=harness('CODE-501',3,answerQuestion,record=>{record.notes='Earlier fictional notes';},{mode:'challenge',sequence:'opening-day'});
  h.elements.get('#coding-editor').value='print("Draft to discard");';
  h.elements.get('#reset-ticket').fire('click');assert.equal(h.elements.get('#reset-confirm').hidden,false);
  h.elements.get('#cancel-reset').fire('click');assert.equal(h.elements.get('#reset-confirm').hidden,true);
  assert.ok(vm.runInContext('store.labs[scenario.id]',h.context));
  h.elements.get('#confirm-reset').fire('click');
  assert.equal(vm.runInContext('store.labs[scenario.id]',h.context),undefined);
  assert.equal(vm.runInContext('labView.section',h.context),1);
  assert.equal(h.location.hash,'#lab/CODE-501/request?mode=challenge&sequence=opening-day');
  assert.deepEqual(h.calls.forcedRenders,[false],'An explicit reset must bypass same-ticket retained-DOM navigation.');
  assert.equal(h.calls.saved,1);assert.equal(h.historyEntries.length,1,'Reset replaces the active page URL.');
  assert.equal(h.record.state.code,initialWorkspaceState('CODE-501').code,'A discarded draft cannot become saved work.');
});

test('reset confirmation moves focus to the safe choice and Escape or cancellation returns it to the trigger',()=>{
  const h=harness('INC-101',3),before=structuredClone(h.record),trigger=h.elements.get('#reset-ticket'),cancel=h.elements.get('#cancel-reset'),prompt=h.elements.get('#reset-confirm');
  trigger.fire('click');assert.equal(prompt.hidden,false);assert.equal(trigger.getAttribute('aria-expanded'),'true');assert.equal(cancel.focused,1);
  assert.equal(prompt.fire('keydown',{key:'Escape'}).defaultPrevented,true);assert.equal(prompt.hidden,true);assert.equal(trigger.focused,1);assert.equal(trigger.getAttribute('aria-expanded'),'false');
  trigger.fire('click');cancel.fire('click');assert.equal(prompt.hidden,true);assert.equal(trigger.focused,2);assert.deepEqual(h.record,before);
});

test('page URLs, browser Back and Forward keep the same question, equipment and coding draft',()=>{
  const h=readyHarness('CODE-501',1,answerQuestion,record=>{record.state=applyWorkspaceAction('CODE-501',record.state,'run-check',{code:codingPrograms['CODE-501']}).state;saveSuccessfulTest(SCENARIOS.find(s=>s.id==='CODE-501'),record);},{mode:'independent',sequence:'opening-day'});
  const question=h.elements.get('#student-question'),editor=h.elements.get('#coding-editor');
  const workspaceDraft=h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]');
  question.value='My unfinished case question';editor.value=codingPrograms['CODE-501'];workspaceDraft.value='An unapplied workbench setting';
  const before=structuredClone(h.record),renders=h.calls.rendered,saves=h.calls.saved;
  h.section(2);h.section(3);
  assert.deepEqual(h.historyEntries,[
    '#lab/CODE-501/request?mode=independent&sequence=opening-day',
    '#lab/CODE-501/workbench?mode=independent&sequence=opening-day',
    '#lab/CODE-501/explain?mode=independent&sequence=opening-day'
  ]);
  for(const [direction,expected] of [['back',2],['back',1],['forward',2],['forward',3]]) {
    assert.equal(h[direction](),true);
    assert.deepEqual(h.visible(),[1,2,3].map(section=>section===expected));
    assert.equal(h.elements.get('#student-question'),question);assert.equal(question.value,'My unfinished case question');
    assert.equal(h.elements.get('#coding-editor'),editor);assert.equal(editor.value,codingPrograms['CODE-501']);
    assert.equal(h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'),workspaceDraft);
    assert.equal(workspaceDraft.value,'An unapplied workbench setting');
    assert.match(h.elements.get('#lab-page-progress').textContent,new RegExp(String(expected)+'[^0-9]+3'));
  }
  assert.equal(h.historyEntries.length,3,'History traversal must not create replacement navigation entries.');
  assert.equal(h.calls.rendered,renders);assert.equal(h.calls.saved,saves);assert.deepEqual(h.record,before);
});

test('hardware only runs on its own page and Back/Forward retains repaired equipment',()=>{
  const h=finishedHarness('INC-101',2),draft=h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]');
  draft.value='A pending equipment setting';
  const before=structuredClone(h.record),renders=h.calls.rendered,saves=h.calls.saved;
  h.section(3);assert.equal(h.calls.hardwareVisible.at(-1),false);h.back();assert.equal(h.calls.hardwareVisible.at(-1),true);
  h.section(1);assert.equal(h.calls.hardwareVisible.at(-1),false);h.back();assert.equal(h.calls.hardwareVisible.at(-1),true);
  assert.deepEqual(h.record,before);assert.equal(h.calls.rendered,renders);assert.equal(h.calls.saved,saves);
  assert.equal(draft.value,'A pending equipment setting');assert.equal(h.calls.benchCancelled,2);
});

for(const id of ['INC-101','NET-201','CODE-501'])test(id+': historical support modes restore without replacing drafts or equipment',()=>{
  const h=readyHarness(id,1,answerQuestion,record=>{if(id==='INC-101')record.state=applyHardwareAction(id,{...record.state,videoPort:'gpu',documentOpened:true},'enable-assembly').state;else if(id==='NET-201'){record.state=applyWorkspaceAction(id,record.state,'save-network',{ip:'10.24.8.25',mask:'255.255.255.0',gateway:'10.24.8.1',dns:'10.24.8.53'}).state;record.state=applyWorkspaceAction(id,record.state,'run-check').state;}else record.state=applyWorkspaceAction(id,record.state,'run-check',{code:codingPrograms[id]}).state;saveSuccessfulTest(SCENARIOS.find(s=>s.id===id),record);},{mode:'guided',sequence:'opening-day'});
  const question=h.elements.get('#student-question'),notebook=h.elements.get('#experiment-predict');
  const workbench=h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]');
  question.value='An unfinished follow-up for the fictional requester';
  workbench.value='An unapplied configuration choice';notebook.value='An unfinished experiment prediction';
  const editor=h.scenario.track==='coding'?h.elements.get('#coding-editor'):null;
  if(editor)editor.value=codingPrograms[id];
  const before=structuredClone(h.record),renders=h.calls.rendered,saves=h.calls.saved;
  h.section(2);h.changeMode('independent');
  for(const [direction,section,mode] of [['back',1,'guided'],['forward',2,'independent']]) {
    assert.equal(h[direction](),true,'A support change in history must remain same-lab navigation.');
    assert.equal(h.elements.get('#learning-mode').value,mode);
    assert.equal(h.calls.modeChanges.at(-1),mode);
    assert.deepEqual(h.visible(),[1,2,3].map(value=>value===section));
  }
  h.section(3);h.changeMode('challenge');
  for(const [direction,section,mode] of [['back',2,'independent'],['back',1,'guided'],['forward',2,'independent'],['forward',3,'challenge']]) {
    assert.equal(h[direction](),true);assert.equal(h.elements.get('#learning-mode').value,mode);
    assert.deepEqual(h.visible(),[1,2,3].map(value=>value===section));
    assert.equal(h.elements.get('#student-question'),question);assert.match(question.value,/unfinished follow-up/);
    assert.equal(h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'),workbench);
    assert.equal(workbench.value,'An unapplied configuration choice');
    assert.equal(h.elements.get('#experiment-predict'),notebook);assert.equal(notebook.value,'An unfinished experiment prediction');
    if(editor){assert.equal(h.elements.get('#coding-editor'),editor);assert.equal(editor.value,codingPrograms[id]);}
    if(h.scenario.track==='hardware')assert.equal(h.calls.hardwareVisible.at(-1),section===2);
  }
  assert.equal(h.historyEntries.length,3,'Restoring support must not add or rewrite history.');
  assert.equal(h.calls.rendered,renders);assert.equal(h.calls.saved,saves);assert.deepEqual(h.record,before);
});

test('route synchronization refuses a different ticket or assignment context',()=>{
  const h=readyHarness('CODE-501',2,answerQuestion,()=>{},{mode:'challenge',sequence:'opening-day'});
  for(const hash of ['#lab/CODE-502/explain?mode=challenge&sequence=opening-day','#lab/CODE-501/explain?mode=challenge','#labs']) {
    assert.equal(h.sync(hash),false,hash);assert.deepEqual(h.visible(),[false,true,false]);
  }
});

test('the hypothesis test saves and executes the actual coding draft instead of reusing an old passing source',()=>{
  const h=readyHarness('CODE-501');h.input('plan','The supplied quantity should determine the total for every fixture.');h.elements.get('#idea-form').fire('submit');h.section(2);
  h.action('run-check',{code:codingPrograms['CODE-501']});h.elements.get('#verify-task').fire('click');
  assert.equal(h.record.verified,true);assert.equal(h.record.state.checkRuns,1);
  h.elements.get('#coding-editor').value='print(6);';
  h.elements.get('#run-hypothesis-test').fire('click');
  assert.equal(h.record.state.code,'print(6);');assert.equal(h.record.state.sourceAtRun,'print(6);');
  assert.equal(h.record.state.checkRuns,2);assert.equal(h.record.state.tested,true);
  assert.equal(h.record.verified,false);assert.equal(h.record.closed,false);
  assert.ok(h.record.state.results.some(result=>!result.ok));
  assert.match(h.elements.get('#experiment-result').textContent,/not ready|not fixed yet/iu);assert.equal(h.calls.reports,0);
});

for(const control of ['verify-task','close-ticket']) {
  test('untested coding edits block '+control+' even after a previously completed program',()=>{
    const h=harness('CODE-501');explainCodingWork(h);
    h.elements.get('#coding-editor').value=codingPrograms['CODE-501'];h.elements.get('#run-hypothesis-test').fire('click');saveCurrentTest(h);h.section(3);h.elements.get('#close-ticket').fire('click');
    assert.equal(h.record.closed,true);assert.equal(h.record.verified,true);assert.equal(h.calls.reports,1);
    h.elements.get('#coding-editor').value='print(6);';
    const reportsBefore=h.calls.reports;
    h.elements.get('#'+control).fire('click');
    assert.equal(h.record.verified,false,'An earlier passing program cannot verify a different editor draft.');
    assert.equal(h.record.closed,false,'The old completion cannot carry over to an untested draft.');
    assert.equal(h.calls.reports,reportsBefore,'A failed finish must not open another completed report.');
    assert.match(h.elements.get('#verify-result').textContent,/untested changes/iu);
    assert.equal(h.record.state.code,codingPrograms['CODE-501'],'Checking does not silently overwrite saved source.');
  });
}

test('a different passing program still needs a new saved notebook test for page three',()=>{
  const h=readyHarness('CODE-501',2);h.elements.get('#coding-editor').value=codingPrograms['CODE-501'];
  h.elements.get('#run-hypothesis-test').fire('click');saveCurrentTest(h);
  assert.equal(h.elements.get('#workbench-next').disabled,false);
  h.elements.get('#coding-editor').value='print(3 * quantity);';h.elements.get('#run-hypothesis-test').fire('click');
  assert.equal(h.record.verified,true,'The revised program also passes its actual fixtures.');
  assert.equal(h.elements.get('#workbench-next').disabled,true,'An old saved result must not match a different tested source.');
  h.section(3);assert.deepEqual(h.visible(),[false,true,false]);saveCurrentTest(h);
  h.section(3);assert.deepEqual(h.visible(),[false,false,true]);
});

for(const [id,program] of Object.entries(codingPrograms)) {
  test(id+' finishes only after fresh execution and includes saved code and output in the report',()=>{
    const h=harness(id);explainCodingWork(h);
    h.elements.get('#coding-editor').value=program;h.section(3);h.elements.get('#close-ticket').fire('click');
    assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);
    h.section(2);h.elements.get('#run-hypothesis-test').fire('click');
    assert.equal(h.record.state.code,program);assert.equal(h.record.state.sourceAtRun,program);
    assert.equal(h.record.state.checkRuns,1);assert.equal(h.record.verified,true);assert.equal(h.record.closed,false);
    saveCurrentTest(h);h.section(3);h.elements.get('#close-ticket').fire('click');
    assert.equal(h.record.closed,true);assert.equal(h.calls.reports,1);
    const report=h.report();
    assert.match(report,/Status: DELIVERED/u);assert.ok(report.includes('SAVED PRACTICE CODE\n'+program));
    assert.ok(report.includes('PRACTICE OUTPUT\n'+h.record.state.output.join('\n')));
    assert.equal(h.record.evidence.length,2);assert.equal(h.record.plan,h.elements.get('#plan').value);
  });
}

test('section buttons stay keyboard reachable and support wrap, Home, and End without replacing the workbench', () => {
  const h = finishedHarness(),tabs = h.groups.get('[data-lab-section]'); assert.deepEqual(tabs.map(tab => tab.tabIndex),[0,0,0]);
  assert.equal(h.key(0,'ArrowRight').defaultPrevented,true); assert.deepEqual(h.selected(),['false','true','false']); assert.deepEqual(tabs.map(tab => tab.tabIndex),[0,0,0]); assert.equal(tabs[1].focused,1);
  h.key(1,'End'); assert.deepEqual(h.visible(),[false,false,true]); h.key(2,'Home'); assert.deepEqual(h.visible(),[true,false,false]);
  h.key(0,'ArrowLeft'); assert.deepEqual(h.visible(),[false,false,true]); h.key(2,'ArrowRight'); assert.deepEqual(h.visible(),[true,false,false]);
  assert.equal(h.key(0,'Tab').defaultPrevented,false); assert.deepEqual(h.visible(),[true,false,false]); assert.equal(h.calls.rendered,1); assert.equal(h.calls.saved,0,'Navigation does not rewrite the completed test fixture.');
});

test('Continue and Back controls reveal and focus the requested panel while retaining the investigation', () => {
  const h = finishedHarness(); h.input('plan','A fictional explanation that stays on the current page.');h.elements.get('#idea-form').fire('submit');saveCurrentTest(h);
  for (const button of h.groups.get('[data-jump-section]')) { button.fire('click'); const section = Number(button.dataset.jumpSection); assert.deepEqual(h.visible(),[section===1,section===2,section===3]); }
  assert.equal(h.elements.get('.bench-column').focused,2); assert.equal(h.elements.get('.case-sidebar').focused,1); assert.equal(h.elements.get('.evidence-sidebar').focused,1);
  assert.ok(h.record.plan.includes('stays on the current page')); assert.equal(h.calls.rendered,1); assert.equal(h.calls.saved,2);
});

test('section focus returns each retained pane to its start without resetting its draft or the other pane',()=>{
  const h=finishedHarness(),request=h.elements.get('.case-sidebar'),bench=h.elements.get('.bench-column');
  const draft=h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]');draft.value='A setting still being edited';
  request.scrollTop=240;bench.scrollTop=780;h.section(2);
  assert.equal(bench.scrollTop,0);assert.equal(request.scrollTop,240);
  bench.scrollTop=380;h.section(1);assert.equal(request.scrollTop,0);assert.equal(bench.scrollTop,380);
  h.section(3);assert.equal(h.elements.get('#lab-page-title').scrolled.at(-1).block,'start');
  assert.equal(draft.value,'A setting still being edited');assert.deepEqual(h.visible(),[false,false,true]);
  // A pending smooth scroll to the nested finish region could otherwise win
  // after a fast 3 → 1 → 2 sequence and push the equipment offscreen again.
  h.section(1);h.section(2);assert.equal(bench.scrollTop,0);
  for(const pane of [request,bench,h.elements.get('.evidence-sidebar')])assert.ok(pane.scrolled.every(options=>options.behavior==='instant'),'Section navigation must not enqueue an animation that can outlive a later step.');
  assert.equal(draft.value,'A setting still being edited');
});

test('page navigation starts the selected page without resetting its draft or other pages',()=>{
  const h=finishedHarness(),request=h.elements.get('.case-sidebar'),bench=h.elements.get('.bench-column');
  const draft=h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]');draft.value='A setting still being edited';
  request.scrollTop=240;bench.scrollTop=780;h.section(2);
  assert.equal(bench.scrollTop,0);assert.equal(request.scrollTop,240);
  bench.scrollTop=380;h.section(1);assert.equal(request.scrollTop,0);assert.equal(bench.scrollTop,380);
  h.section(3);assert.equal(h.elements.get('#lab-page-title').scrolled.at(-1).block,'start');
  assert.equal(draft.value,'A setting still being edited');assert.deepEqual(h.visible(),[false,false,true]);
  // A pending smooth scroll to another page could otherwise win
  // after a fast 3 → 1 → 2 sequence and push the equipment offscreen again.
  h.section(1);h.section(2);assert.equal(bench.scrollTop,0);
  assert.ok(h.elements.get('#lab-page-title').scrolled.every(options=>options.behavior==='instant'),'Page navigation must not enqueue an animation that can outlive a later step.');
  assert.equal(draft.value,'A setting still being edited');
});

test('invalid tab values fall back to the request without discarding current work', () => {
  const h = readyHarness(); h.input('plan','This fictional work must survive an invalid navigation value.');h.elements.get('#idea-form').fire('submit'); const button = h.groups.get('[data-lab-section]')[0];
  for (const value of ['not-a-section','0','9','1.5','Infinity','-2']) { h.section(2); button.dataset.labSection = value; assert.doesNotThrow(() => button.fire('click'),'Invalid navigation value: '+value); assert.deepEqual(h.visible(),[true,false,false]); assert.equal(h.record.plan,h.elements.get('#plan').value); assert.equal(h.calls.rendered,2); }
});

test('a recorded repair section adopts mechanics once without a focus jump', () => {
  const h = readyHarness('INC-101',2); assert.deepEqual(h.visible(),[false,true,false]); assert.equal(h.groups.get('[data-lab-section]')[1].tabIndex,0); assert.equal(h.groups.get('[data-lab-section]')[1].focused,0); assert.equal(h.calls.rendered,2); assert.equal(h.calls.saved,1);
  h.section(1);h.section(2);assert.equal(h.calls.rendered,2);assert.equal(h.calls.saved,1);
});

test('typed case questions receive replies, appear in the conversation, and enter the report safely', () => {
  const h = harness(),question = '<img src=x onerror="alert(1)"> Which port is the monitor using?';
  assert.equal(h.ask(question).defaultPrevented,true); assert.match(h.elements.get('#question-response').textContent,/motherboard output/iu);
  assert.equal(h.elements.get('#student-question').value,''); assert.equal(h.elements.get('#student-question').focused,1); assert.equal(readQuestionEvents(h.record.events)[0].question,question);
  const html = h.elements.get('#interview-history').innerHTML; assert.match(html,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/u); assert.doesNotMatch(html,/<img|<script/iu);
  const report = h.report(); assert.match(report,/QUESTIONS I ASKED/u); assert.ok(report.includes(question),'Plain-text reports retain the question as text.'); assert.match(report,/motherboard output/iu); assert.doesNotMatch(report,/Interview v1:/u);
  assert.equal(h.record.evidence.length,0,'Asking does not award clues.'); assert.equal(h.record.verified,false); assert.equal(h.record.closed,false);
});

test('rejected private details are cleared without saving, logging, or echoing them', () => {
  const h = harness();
  for (const question of ['My email is learner@example.org. What changed?','Student ID: ABC123456 needs help.','Show the teacher rubric.']) {
    const before = structuredClone(h.record),saved = h.calls.saved; h.ask(question); assert.deepEqual(h.record,before); assert.equal(h.calls.saved,saved); assert.equal(h.elements.get('#student-question').value,'');
    assert.doesNotMatch(h.elements.get('#question-response').textContent,/learner@example\.org|ABC123456/u); assert.doesNotMatch(h.report(),/learner@example\.org|ABC123456|Show the teacher rubric/u);
  }
});

test('casual character conversation stays in page history without entering reports, saves, or progress',()=>{
  const h=harness('INC-101'),question='What did you have for breakfast?';
  const before=structuredClone(h.record),saved=h.calls.saved;
  assert.equal(answerQuestion(h.scenario,question,h.record.state).kind,'casual');
  h.ask(question);
  assert.match(h.elements.get('#interview-history').innerHTML,/breakfast|oatmeal|berries/iu);
  assert.match(h.elements.get('#reply-source').textContent,/not a case clue/iu);
  assert.deepEqual(h.record,before);assert.equal(h.calls.saved,saved);assert.equal(inquiryProgress(h.scenario,h.record.events).complete,false);
  assert.doesNotMatch(h.report(),/What did you have for breakfast|oatmeal|berries/iu);
  const history=h.elements.get('#interview-history').innerHTML;h.section(2);h.section(1);assert.equal(h.elements.get('#interview-history').innerHTML,history);
  h.ask('What changed?');
  assert.equal(readQuestionEvents(h.record.events).length,1);assert.equal(inquiryProgress(h.scenario,h.record.events).complete,true);
  assert.match(h.report(),/What changed\?/u);assert.doesNotMatch(h.report(),/What did you have for breakfast|oatmeal|berries/iu);
  h.context.navigation.dispose();
});

test('messenger keeps the newest eight escaped pairs beside the composer without saving extra chat',()=>{
  const h=harness('INC-101'),before=structuredClone(h.record),saved=h.calls.saved,log=h.elements.get('#interview-history');
  log.scrollHeight=900;log.clientHeight=260;log.scrollTop=0;
  const questions=['What did you have for breakfast?','What is your favorite color?','What are your hobbies?','What is your favorite food?','What is your favorite book?','What is your favorite music?','Tell me about dragons','Tell me about trains','Tell me about oceans','Tell me about mountains'];
  for(const question of questions)h.ask(question);
  assert.equal((log.innerHTML.match(/class="interview-pair"/gu)||[]).length,8);
  assert.doesNotMatch(log.innerHTML,/What did you have for breakfast|What is your favorite color/u);
  assert.ok(log.innerHTML.indexOf('What are your hobbies?')<log.innerHTML.indexOf('Tell me about mountains'));
  assert.match(log.innerHTML,/interview-user.*You.*interview-requester.*Ms\. Rivera/su);
  assert.equal(log.scrollTop,log.scrollHeight);assert.deepEqual(h.record,before);assert.equal(h.calls.saved,saved);
  assert.doesNotMatch(h.report(),/What are your hobbies|Tell me about mountains/u);
  h.section(2);h.section(1);assert.equal((log.innerHTML.match(/class="interview-pair"/gu)||[]).length,8);
  h.ask('My email is learner@example.org. Tell me about dragons');
  assert.match(log.innerHTML,/conversation-feedback.*leave out personal details/su);assert.doesNotMatch(log.innerHTML,/learner@example/u);
  assert.equal((log.innerHTML.match(/class="interview-pair"/gu)||[]).length,8);assert.deepEqual(h.record,before);
});

test('core task controls stay available while moving between the unlocked pages',()=>{
  const h=finishedHarness(),controls=['#plan','#evidence-detail','#run-hypothesis-test'].map(selector=>h.elements.get(selector));
  const renders=h.calls.rendered,before=structuredClone(h.record);
  for(const section of [2,3,1,2,1])h.section(section);
  assert.deepEqual(controls,['#plan','#evidence-detail','#run-hypothesis-test'].map(selector=>h.elements.get(selector)));assert.equal(h.calls.rendered,renders);assert.deepEqual(h.record,before);
});

test('Python language and an unfinished Python source stay together through page navigation and fresh testing',()=>{
  const h=readyHarness('CODE-501');h.input('plan','The changing quantity should determine the total in the chosen language.');h.elements.get('#idea-form').fire('submit');
  h.action('set-language',{language:'python',code:'print(quantity + 3)'});
  assert.equal(h.record.state.language,'python');assert.equal(h.record.state.tested,false);
  const editor=h.elements.get('#coding-editor');editor.value='total = quantity * 3\nprint(total)';
  for(const section of [3,1,2])h.section(section);
  assert.equal(h.elements.get('#coding-editor'),editor);assert.equal(editor.value,'total = quantity * 3\nprint(total)');assert.equal(h.record.state.language,'python');assert.equal(h.record.state.tested,false);
  h.elements.get('#run-hypothesis-test').fire('click');
  assert.equal(h.record.state.code,editor.value);assert.equal(h.record.state.language,'python');assert.equal(h.record.state.languageAtRun,'python');assert.equal(h.record.verified,true);
});

test('an available cloud extra reply changes only the current RAM conversation and cannot become case evidence',async()=>{
  const requests=[],answer='<b>A fictional AI extra response.</b>';
  const h=harness('INC-101',1,answerQuestion,()=>{},{},{fetcher:async(path,options)=>{
    requests.push({path,options});
    return new Response(JSON.stringify(options.method==='GET'?{enabled:true}:{kind:'ai',ungraded:true,answer}),{status:200});
  }});
  const options=h.elements.get('#requester-options');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(options.querySelector('[data-ai-toggle]').getAttribute('aria-pressed'),'true');
  const before=structuredClone(h.record),saved=h.calls.saved;
  h.ask('What did you have for breakfast?');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(requests.map(request=>request.options.method),['GET','POST']);
  assert.deepEqual(JSON.parse(requests[1].options.body),{scenarioId:'INC-101',topic:'breakfast'});
  assert.doesNotMatch(requests[1].options.body,/What did you|question|notes|history|state/u,'Only an authored topic reaches transport.');
  assert.equal(h.elements.get('#question-response').textContent,answer);
  assert.match(h.elements.get('#interview-history').innerHTML,/&lt;b&gt;A fictional AI extra response\.&lt;\/b&gt;.*AI reply.*may be wrong.*not case evidence/u);
  assert.doesNotMatch(h.elements.get('#interview-history').innerHTML,/<b>A fictional/u,'Even generated markup must display as escaped text.');
  assert.deepEqual(h.record,before);assert.equal(h.calls.saved,saved);assert.equal(inquiryProgress(h.scenario,h.record.events).complete,false);
  assert.doesNotMatch(h.report(),/fictional AI extra response|What did you have for breakfast/iu);
  h.context.navigation.dispose();
});

test('a delayed cloud reply does not pull a reader away from older visible messages',async()=>{
  let deliver;
  const h=harness('INC-101',1,answerQuestion,()=>{},{},{fetcher:async(_path,options)=>options.method==='GET'?new Response(JSON.stringify({enabled:true}),{status:200}):new Promise(resolve=>{deliver=()=>resolve(new Response(JSON.stringify({kind:'ai',ungraded:true,answer:'A quiet creative breakfast idea.'}),{status:200}));})});
  await new Promise(resolve=>setImmediate(resolve));
  const log=h.elements.get('#interview-history');log.scrollHeight=1000;log.clientHeight=250;log.scrollTop=0;
  h.ask('What did you have for breakfast?');assert.equal(log.scrollTop,1000);
  log.scrollTop=0;const before=structuredClone(h.record);deliver();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(log.scrollTop,0);assert.match(log.innerHTML,/A quiet creative breakfast idea/u);assert.match(log.innerHTML,/AI reply.*may be wrong/u);
  assert.deepEqual(h.record,before);h.context.navigation.dispose();
});

test('optional follow-up suggestions render bounded plain text as ordinary buttons',()=>{
  const markup='<img src=x onerror="alert(1)"> What is on the screen?';
  const h=harness('INC-101',1,(...args)=>({...answerQuestion(...args),suggestions:['  What changed?  ','What changed?',markup,null,'x'.repeat(241),'What have you tried?','One more prompt']}));
  assert.equal(h.elements.get('#question-suggestions').hidden,true);
  h.ask('What changed?');
  const group=h.elements.get('#question-suggestions'),buttons=group.childNodes.filter(child=>child.tagName==='BUTTON');
  assert.equal(group.hidden,false);assert.equal(buttons.length,3);assert.deepEqual(buttons.map(button=>button.textContent),['What changed?',markup,'What have you tried?']);
  for(const button of buttons){assert.equal(button.type,'button');assert.equal(button.innerHTML,'');}
  assert.match(group.childNodes[0].textContent,/your own words/u);assert.equal(readQuestionEvents(h.record.events).length,1,'Suggestions are not sent automatically.');
});

test('a suggested follow-up uses current history and equipment without clearing an unfinished question',()=>{
  const calls=[],prompt='Which port is the monitor using?';
  const h=harness('INC-101',1,(scenario,question,state,history)=>{if(state.videoPort!==undefined)calls.push({question,history:structuredClone(history),videoPort:state.videoPort});return {...answerQuestion(scenario,question,state,history),suggestions:[prompt]};});
  h.ask('What changed?');saveFirstIdea(h);h.section(2);h.action('video-gpu');h.section(1);
  const input=h.elements.get('#student-question'),draft=h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]');input.value='Would it help if we';draft.value='An unfinished workbench choice';
  const rendered=h.calls.rendered;h.section(2);h.section(1);
  h.elements.get('#question-suggestions').childNodes.find(child=>child.tagName==='BUTTON').fire('click');
  assert.equal(calls.length,2);assert.equal(calls[1].question,prompt);assert.equal(calls[1].history.length,1);assert.equal(calls[1].history[0].question,'What changed?');
  assert.match(h.elements.get('#question-response').textContent,/graphics[- ]card|GPU/iu);
  assert.equal(input.value,'Would it help if we');assert.equal(input.focused,2);assert.equal(draft.value,'An unfinished workbench choice');assert.equal(h.calls.rendered,rendered);
  assert.equal(readQuestionEvents(h.record.events).length,2);assert.equal(readQuestionEvents(h.record.events)[1].question,prompt);assert.ok(h.report().includes(prompt));assert.equal(h.record.verified,false);
});

test('suggested questions pass through the same privacy refusal and never enter reports or progress',()=>{
  const privateQuestion='My email is learner@example.org. What changed?';
  const h=harness('INC-101',1,(...args)=>{const reply=answerQuestion(...args);return {...reply,suggestions:reply.kind==='privacy'?[]:[privateQuestion]};});
  h.ask('Hello');const before=structuredClone(h.record),saved=h.calls.saved;
  const input=h.elements.get('#student-question');input.value='My next fictional question';
  h.elements.get('#question-suggestions').childNodes.find(child=>child.tagName==='BUTTON').fire('click');
  assert.deepEqual(structuredClone(h.record),before);assert.equal(h.calls.saved,saved);assert.equal(input.value,'My next fictional question');
  assert.equal(h.elements.get('#question-suggestions').hidden,true);assert.equal(h.elements.get('#question-suggestions').childNodes.length,0);
  assert.doesNotMatch(h.report(),/learner@example\.org/u);assert.doesNotMatch(h.elements.get('#question-response').textContent,/learner@example\.org/u);
  assert.equal(inquiryProgress(h.scenario,h.record.events).complete,false);
});

test('hypothesis tests observe actual equipment state and cannot finish the investigation alone', () => {
  const h = harness(); h.elements.get('#run-hypothesis-test').fire('click'); assert.deepEqual(h.visible(),[true,false,false]); assert.equal(h.record.events.length,1,'Only the first repair entry setup is recorded.'); assert.doesNotMatch(h.record.events[0].message,/Hypothesis test/u); assert.equal(h.record.verified,false);
  assert.equal(h.elements.get('.case-sidebar').focused,1,'The first-page gate returns focus to the work that must be completed.');
  assert.match(h.calls.notices.at(-1),/Ask a question/i);
  h.ask('What changed?');saveFirstIdea(h);h.input('plan','The monitor cable may be using the wrong graphics output.');h.elements.get('#idea-form').fire('submit'); h.section(2); h.elements.get('#run-hypothesis-test').fire('click'); assert.match(h.elements.get('#experiment-result').textContent,/not ready|not fixed yet/iu); assert.equal(h.record.verified,false); assert.equal(h.record.closed,false);
  h.action('video-gpu'); h.action('open-document'); h.elements.get('#run-hypothesis-test').fire('click'); assert.match(h.elements.get('#experiment-result').textContent,/task works/iu); assert.match(h.elements.get('#experiment-result').textContent,/Check.*explain/iu); assert.equal(h.record.verified,true); assert.equal(h.record.closed,false); assert.equal(h.calls.reports,0);
  h.section(3); h.elements.get('#close-ticket').fire('click'); assert.equal(h.record.closed,false,'Verification cannot bypass the saved notebook answers.'); assert.deepEqual(h.visible(),[false,true,false]);
  h.action('video-board'); assert.equal(h.record.verified,false); assert.match(h.elements.get('#experiment-result').textContent,/setup changed.*(?:Test my idea|fresh test)/iu);
});

test('non-hardware hypothesis checks run the real simulated tests and recheck changed settings', () => {
  const h = readyHarness('NET-201'); h.input('plan','The workstation needs the addresses listed on its configuration sheet.');h.elements.get('#idea-form').fire('submit');h.section(2); h.elements.get('#run-hypothesis-test').fire('click'); assert.equal(h.record.state.tested,true); assert.equal(h.record.verified,false);
  h.action('save-network',{ip:'10.24.8.25',mask:'255.255.255.0',gateway:'10.24.8.1',dns:'10.24.8.53'}); h.elements.get('#run-hypothesis-test').fire('click'); assert.equal(h.record.verified,true); assert.equal(h.record.closed,false);
  h.action('save-network',{ip:'10.24.8.25',mask:'255.255.255.0',gateway:'10.24.8.1',dns:'192.168.1.53'}); assert.equal(h.record.verified,false); h.elements.get('#run-hypothesis-test').fire('click'); assert.equal(h.record.verified,false); assert.match(h.elements.get('#experiment-result').textContent,/(?:not ready|not fixed yet).*resolves/iu);
});

test('read-only practice commands do not rerender or discard unsaved workbench fields', () => {
  const h = readyHarness('NET-201',2); h.action('save-network',{ip:'10.24.8.25',mask:'255.255.255.0',gateway:'10.24.8.1',dns:'10.24.8.53'}); h.action('run-check'); h.elements.get('#verify-task').fire('click'); assert.equal(h.record.verified,true);
  const draft = h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'); draft.value = 'An unfinished DNS edit'; const stateBefore = structuredClone(h.record.state),renderedBefore = h.calls.rendered;
  const result = h.action('inspect-command',{command:'ipconfig'}); assert.match(result.message,/10\.24\.8\.25/u); assert.equal(h.calls.rendered,renderedBefore); assert.equal(h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'),draft); assert.equal(draft.value,'An unfinished DNS edit'); assert.deepEqual(h.record.state,stateBefore); assert.equal(h.record.verified,true);
});

test('starter questions share the current-state interview behavior after a virtual repair', () => {
  const h = harness('INC-102'); connectMotherboardPower(h); h.action('plug-in'); h.action('boot'); h.groups.get('[data-question]')[0].fire('click'); assert.match(h.elements.get('#question-response').textContent,/on.*fans running/iu); assert.equal(readQuestionEvents(h.record.events).length,1); assert.deepEqual(h.record.questions,[0]);
});

test('jumping straight to finish cannot mark an unresolved lab complete', () => {
  const h = readyHarness('INC-101',2); h.input('notes','A fictional explanation of the actions taken so far.'); h.input('reflection','A fictional reflection on what I learned from the clues.'); h.section(3); h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed,false); assert.equal(h.record.verified,false); assert.equal(h.calls.reports,0); assert.deepEqual(h.visible(),[false,true,false]);
});

test('a completed task needs learner explanations and later edits reopen the investigation', () => {
  const h = harness(); h.action('video-gpu'); h.action('open-document'); h.section(3); h.elements.get('#close-ticket').fire('click'); assert.equal(h.record.closed,false); assert.equal(h.calls.reports,0); assert.deepEqual(h.visible(),[true,false,false]);
  h.ask('What changed?');saveFirstIdea(h);h.input('plan','The monitor signal may be connected to the wrong output.');h.elements.get('#idea-form').fire('submit'); h.input('notes','I moved the cable and opened the requested lesson document.'); h.input('reflection','I learned to trace the signal path before replacing a part.');h.section(2);h.elements.get('#run-hypothesis-test').fire('click');saveCurrentTest(h); h.section(3); h.elements.get('#close-ticket').fire('click'); assert.equal(h.record.closed,true); assert.equal(h.record.verified,true); assert.equal(h.calls.reports,1); h.input('notes',''); assert.equal(h.record.closed,false);
});

test('finishing a technically repaired ticket returns to the next missing first-page answer',()=>{
  const h=harness('INC-102');connectMotherboardPower(h);h.action('plug-in');h.action('boot');h.action('open-document');h.section(3);
  h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);assert.deepEqual(h.visible(),[true,false,false]);
  assert.equal(h.groups.get('[data-lab-section]')[2].disabled,true);
  h.ask('Are any lights on?');h.elements.get('#close-ticket').fire('click');
  assert.deepEqual(h.visible(),[true,false,false],'A repaired device cannot bypass the separate symptoms answer.');
  h.input('symptoms','The PC has no lights or fan noise when the power button is pressed.');
  h.elements.get('#close-ticket').fire('click');assert.deepEqual(h.visible(),[true,false,false],'The possible cause still needs its own saved answer.');
  assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);
});

test('all cases render labelled pages and accessible navigation with one retained workstation', () => {
  const renderStart = source.indexOf('function labPage(s){'),renderEnd = source.indexOf('\nfunction evidenceList(',renderStart); assert.ok(renderStart >= 0 && renderEnd > renderStart);
  const context = vm.createContext({currentLab:null,labView:null,workStorage:{},recordFor:() => ({questions:[],evidence:[],plan:'',notes:'',reflection:'',events:[],verified:false,closed:false}),tracks,inquiryProgress,labLanguage,requesterPersona,esc:escapeHtml,eventList:() => '',eventMessage:() => '',interviewList:() => '',evidenceList:() => '',workStatus:() => 'Private session'});
  vm.runInContext(source.slice(renderStart,renderEnd),context);
  for (const scenario of SCENARIOS) {
    const html = context.labPage(scenario);
    for (const [index,id] of ['lab-problem','lab-workbench','lab-finish'].entries()) {
      const matches = html.match(new RegExp('<(?:aside|section|div)\\b[^>]*\\bid="'+id+'"[^>]*>','g')) || []; assert.equal(matches.length,1,scenario.id+' must include one '+id+' panel.'); assert.match(matches[0],/role="region"/u); assert.match(matches[0],new RegExp('aria-labelledby="lab-tab-'+(index+1)+'"','u')); assert.equal(/\bhidden(?:\s|=|>)/u.test(matches[0]),index !== 0);
      const tab = html.match(new RegExp('<button\\b[^>]*\\bid="lab-tab-'+(index+1)+'"[^>]*>','u'))?.[0]; assert.ok(tab); assert.doesNotMatch(tab,/role="tab"/u); assert.match(tab,new RegExp('aria-controls="'+id+'"','u')); if(index===0)assert.match(tab,/aria-current="step"/u);else assert.doesNotMatch(tab,/aria-current=/u);if(index===2)assert.match(tab,/aria-expanded="false"/u);
    }
    for (const id of ['plan','workspace','notes','reflection','verify-task','close-ticket','question-form','student-question','question-suggestions','interview-history','run-hypothesis-test','experiment-result']) assert.equal((html.match(new RegExp('\\bid="'+id+'"','g')) || []).length,1,scenario.id+' must include '+id+'.');
    for(const field of ['plan','notes','reflection']){
      const input=html.match(new RegExp('<textarea\\b[^>]*id="'+field+'"[^>]*>','u'))?.[0];
      assert.match(input,new RegExp('aria-describedby="[^"]*'+field+'-error','u'));
      assert.match(html,new RegExp('<p id="'+field+'-error"[^>]*role="alert"[^>]*hidden>','u'));
    }
    assert.match(html,/<div id="question-suggestions"[^>]*role="group"[^>]*aria-label="Suggested follow-up questions"[^>]*hidden/u);
    assert.equal((html.match(/\brole="region"/g) || []).length,3); assert.equal((html.match(/\brole="tablist"/g) || []).length,0); assert.equal((html.match(/\bdata-lab-section="/g) || []).length,3); assert.match(html,/My first idea/u); assert.match(html,/Conversation history/u); assert.doesNotMatch(html,/id="focus-toggle"|Show all steps|One step at a time/u);
  }
});

test('first-page copy keeps the question above history and removes distracting reply and help controls',()=>{
  const renderStart=source.indexOf('function labPage(s){'),renderEnd=source.indexOf('\nfunction evidenceList(',renderStart);
  const context=vm.createContext({currentLab:null,labView:null,workStorage:{},recordFor:()=>({questions:[],evidence:[],symptoms:'',plan:'',ideaSaved:false,notes:'',reflection:'',events:[],verified:false,closed:false}),tracks,inquiryProgress,labLanguage,requesterPersona,esc:escapeHtml,eventList:()=>'',eventMessage:()=>'',interviewList:()=>'',evidenceList:()=>'',workStatus:()=> 'Private session'});
  vm.runInContext(source.slice(renderStart,renderEnd),context);
  for(const scenario of SCENARIOS){
    const html=context.labPage(scenario),first=html.slice(html.indexOf('id="lab-problem"'),html.indexOf('id="lab-workbench"'));
    assert.ok(first.indexOf('id="student-question"')<first.indexOf('id="interview-history"'),scenario.id+' question entry precedes its history');
    assert.match(first,/Conversation history/u);assert.match(first,/Ask at least one question about the problem/u);
    assert.match(first,/at least two clues/u);
    for(const id of ['symptoms','plan','save-idea','page-one-next','page-one-progress','clues-progress'])assert.equal((first.match(new RegExp('id="'+id+'"','g'))||[]).length,1,scenario.id+' includes '+id);
    assert.equal((first.match(/data-jump-section="2"/g)||[]).length,1,'Only the last control advances page one.');
    assert.ok(first.indexOf('id="page-one-next"')>first.indexOf('id="save-idea"'));
    assert.match(first,/<button[^>]*id="page-one-next"[^>]*disabled/u);
    assert.match(html,/<div id="work-privacy" hidden>/u);assert.match(html,/id="saving-options"/u);
    assert.doesNotMatch(html,/id="interview-mode"|AI replies on|Reply privacy|Teacher lesson plans|Help &amp; practice options/u);
  }
});

function routeHarness(id='CODE-501',initialPath='',suppliedController) {
  if(typeof initialPath==='object'){suppliedController=initialPath;initialPath='';}
  const draftStart=source.indexOf('function hasCodeDraft('),draftEnd=source.indexOf("\nwindow.addEventListener('beforeunload'",draftStart);
  const routeStart=source.indexOf('function renderRoute('),routeEnd=source.indexOf("\n$('#menu-toggle').addEventListener",routeStart);
  assert.ok(draftStart>=0 && draftEnd>draftStart && routeStart>=0 && routeEnd>routeStart);
  const lifecycle=['save','resetLocalSession','bindWorkPrivacy','recordFor'].map(name=>{
    const line=source.match(new RegExp('^function '+name+'\\([^\\n]*$','m'))?.[0];assert.ok(line,name);return line;
  });
  const hashListener=source.match(/^window\.addEventListener\('hashchange',[^\n]*$/m)?.[0];assert.ok(hashListener);
  const data=new Map(),writes=[],reads=[],order=[],events=new Map(),elements=new Map(),routeSyncs=[],learningCalls={mounts:0,disposals:0,modes:[]};let editor=null,mounted,learning;
  const storage={
    get length(){return data.size;},key(index){return [...data.keys()][index]??null;},
    getItem(name){reads.push(name);return data.get(name)??null;},
    setItem(name,value){writes.push({name,value});data.set(name,String(value));},removeItem(name){data.delete(name);}
  };
  const main=new Element();let markup='';
  Object.defineProperty(main,'innerHTML',{get:()=>markup,set(value){order.push('replace DOM');markup=value;editor=null;}});
  const location={hash:'#lab/'+id+initialPath};
  const initialStore={version:2,labs:{}};
  const context=vm.createContext({networkStudioState:{},networkStudioHasWork:()=>false,initialNetworkStudioState:()=>({}),codingStudioState:{},codingStudioHasWork:()=>false,initialCodingStudioState:()=>({}),practiceStates:{},practiceHasWork:()=>false,practiceScenarioFor:()=>null,
    SCENARIOS,learningRoute,labPageHash,retainExperimentEvents:(s,events)=>retainExperimentEvents(s,structuredClone(events)),
    mountLabLearning(_root,options){learning=options;const {mode}=options;learningCalls.mounts++;const dispose=()=>{learningCalls.disposals++;};dispose.setMode=value=>learningCalls.modes.push(value);return dispose;},
    mountInvestigationPreview:()=>null,mountTeachingPage:()=>()=>{},renderCapstone:()=>'capstone',mountCapstone:()=>()=>{},capstoneReport:()=>'capstone report',checkCapstoneState:()=>({ok:false}),normalizeLabRecord,createWorkStorage,WORK_PREFIX,deviceStorage:storage,initialStore,tracks,location,Date,
    applyWorkspaceAction:(caseId,previous,action,value)=>{order.push('save current draft');return applyWorkspaceAction(caseId,previous,action,structuredClone(value));},
    disposeHardware(){order.push('dispose hardware gestures');},
    $:selector=>{if(selector==='#coding-editor')return editor;if(selector==='#main')return main;if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);},
    $$:()=>[],document:{body:{classList:new Element().classList},title:''},history:{replaceState(_state,_title,url){location.hash=url;},pushState(_state,_title,url){location.hash=url;}},
    window:{addEventListener(name,listener){events.set(name,listener);},scrollTo(){}},
    mountWorkControls(options){mounted=options;},workStatus:()=>'',showNotice(){},
    onBind(scenario,record){if(scenario.track==='coding'){editor=new Element();editor.value=record.state.code;}},
    makeNavigation(scenario,route,{onModeChange}={}){if(suppliedController)return suppliedController;const mountedRoute=route||learningRoute(location.hash);let mode=mountedRoute.mode;return {syncRoute(next){routeSyncs.push(next);if(next.page!=='lab'||next.id!==scenario.id||next.sequence!==mountedRoute.sequence)return false;if(next.mode!==mode){onModeChange?.(next.mode);mode=next.mode;}return true;},refreshStatus(){},runHypothesisTest(){},currentTaskResult(){return {ok:false};},dispose(){}};},
    eventList:()=>'',routeLink:()=>'',labCards(){},bindHome(){},mountStandardsAlignment:()=>()=>{},mountLabTutorial:()=>()=>{},hasLessonPlanWork:()=>false,clearLessonPlanWork(){},hasCodingSandboxWork:()=>false,clearCodingSandboxWork(){},home:()=> 'home',projectPage:()=> 'projects',about:()=> 'about',library:()=> 'labs',educators:()=> 'educators',guide:()=> 'guide',connect:()=> 'connect',privacy:()=> 'privacy'
  });
  vm.runInContext('let routeCleanup=null,store=initialStore,currentLab=null,labNavigation=null,labView=null,reportCleanup=null,classroomConnection=null,classroomSharingPaused=true,storageAvailable=true,storageKey=WORK_PREFIX,libraryTrack="all";\n'+
    'let workStorage=createWorkStorage({storage:deviceStorage,key:storageKey,scenarios:SCENARIOS});\n'+lifecycle.join('\n')+'\n'+
    'function labPage(s){currentLab=s;recordFor(s);return "lab "+s.id;}\nfunction bindLab(s,route,options){onBind(s,recordFor(s));return makeNavigation(s,route,options);}\n'+
    source.slice(draftStart,draftEnd)+'\n'+source.slice(routeStart,routeEnd)+'\n'+hashListener+'\n'+
    'globalThis.routeState=()=>({store,currentLab,manager:workStorage});\n'+
    'globalThis.replaceRouteWork=value=>{store=value;};\n'+
    'renderRoute(false);',context);
  order.length=0;
  return {context,storage,writes,reads,order,routeSyncs,learningCalls,elements,location,main,state:()=>context.routeState(),get editor(){return editor;},get learning(){return learning;},
    navigate(hash){location.hash=hash;events.get('hashchange')();},
    privacy(){context.bindWorkPrivacy(context.routeState().currentLab);return mounted;}
  };
}


test('the actual hashchange router keeps same-ticket step history ahead of draft preservation and disposal',()=>{
  const h=routeHarness('CODE-501','/request?mode=independent&sequence=opening-day'),editor=h.editor;
  editor.value=codingPrograms['CODE-501'];const before=structuredClone(h.state().store.labs['CODE-501']);
  for(const step of ['workbench','explain','workbench','request','workbench','explain']) {
    h.navigate(`#lab/CODE-501/${step}?mode=independent&sequence=opening-day`);
    assert.equal(h.editor,editor,'Step history retains the actual editor node.');assert.equal(editor.value,codingPrograms['CODE-501']);
    assert.deepEqual(h.order,[],'Step history must not dispose gestures, save drafts or replace DOM.');
  }
  assert.equal(h.routeSyncs.length,6);assert.deepEqual(h.state().store.labs['CODE-501'],before);
  assert.equal(h.writes.length,0);assert.equal(h.reads.length,0);
  assert.equal(h.main.focused,0,'Page synchronization owns focus; the router must not override it.');
  h.navigate('#lab/CODE-501/explain?mode=challenge');
  assert.equal(h.state().store.labs['CODE-501'].state.code,codingPrograms['CODE-501']);
  assert.deepEqual(h.order.slice(0,3),['dispose hardware gestures','save current draft','replace DOM'],'A changed assignment context still follows normal preservation and remounting.');
});

test('the actual hashchange router applies historical modes through the mounted learning controller',()=>{
  const h=routeHarness('CODE-501','/request?mode=guided&sequence=opening-day'),editor=h.editor;
  editor.value='print("A draft that has not run");';
  const before=structuredClone(h.state().store.labs['CODE-501']);
  for(const [step,mode] of [['workbench','independent'],['request','guided'],['workbench','independent'],['explain','challenge']]) {
    const hash=`#lab/CODE-501/${step}?mode=${mode}&sequence=opening-day`;h.navigate(hash);
    assert.equal(h.learningCalls.modes.at(-1),mode,'The router must connect historical modes to the existing support controller.');
    assert.equal(h.location.hash,hash);assert.equal(h.editor,editor);assert.equal(editor.value,'print("A draft that has not run");');
    assert.equal(h.learningCalls.mounts,1);assert.equal(h.learningCalls.disposals,0);
    assert.deepEqual(h.order,[],'Changing historical support cannot dispose hardware, save the draft, or replace the page.');
  }
  assert.deepEqual(h.state().store.labs['CODE-501'],before);assert.equal(h.writes.length,0);assert.equal(h.reads.length,0);
});

test('leaving a coding lab preserves its draft before DOM replacement and returns it through hash history',()=>{
  const h=routeHarness(),draft=codingPrograms['CODE-501'];h.editor.value=draft;
  const oldRecord=h.state().store.labs['CODE-501'];oldRecord.verified=true;oldRecord.closed=true;
  h.navigate('#labs/coding');
  assert.equal(h.editor,null);assert.deepEqual(h.order.slice(0,3),['dispose hardware gestures','save current draft','replace DOM']);
  const kept=h.state().store.labs['CODE-501'];assert.equal(kept.state.code,draft);assert.equal(kept.state.tested,false);
  assert.equal(kept.verified,false);assert.equal(kept.closed,false);assert.match(kept.events.at(-1).message,/Draft program preserved/);
  assert.equal(h.writes.length,0);assert.equal(h.reads.length,0);assert.equal(h.state().manager.persistent,false);
  h.navigate('#lab/CODE-501');assert.equal(h.editor.value,draft);
  h.navigate('#guide');h.navigate('#lab/CODE-501');assert.equal(h.editor.value,draft);
  assert.equal(h.state().store.labs['CODE-501'].events.length,1,'Returning and leaving unchanged code does not create extra saves.');
});

test('switching between coding cases keeps independent drafts in the current private session',()=>{
  const h=routeHarness();h.editor.value=codingPrograms['CODE-501'];h.navigate('#lab/CODE-502');
  h.editor.value=codingPrograms['CODE-502'];h.navigate('#lab/CODE-501');assert.equal(h.editor.value,codingPrograms['CODE-501']);
  h.navigate('#lab/CODE-502');assert.equal(h.editor.value,codingPrograms['CODE-502']);
  assert.equal(h.state().store.labs['CODE-501'].state.code,codingPrograms['CODE-501']);
  assert.equal(h.state().store.labs['CODE-502'].state.code,codingPrograms['CODE-502']);
  assert.equal(h.writes.length,0);assert.equal(h.reads.length,0);
});

test('route preservation writes to the device only after explicit device saving',()=>{
  const h=routeHarness();assert.equal(h.state().manager.enable(h.state().store),true);const before=h.writes.length;
  h.editor.value=codingPrograms['CODE-501'];h.navigate('#projects');
  assert.equal(h.writes.length,before+1);assert.equal(h.state().manager.persistent,true);
  const saved=JSON.parse(h.writes.at(-1).value);assert.equal(saved.labs['CODE-501'].state.code,codingPrograms['CODE-501']);
  assert.equal(saved.labs['CODE-501'].state.tested,false);assert.equal(saved.labs['CODE-501'].closed,false);
});

test('route preservation does not recreate a deleted record from an old editor',()=>{
  const h=routeHarness();h.editor.value=codingPrograms['CODE-501'];delete h.state().store.labs['CODE-501'];
  h.navigate('#labs');assert.equal(Object.hasOwn(h.state().store.labs,'CODE-501'),false);
  assert.deepEqual(h.order,['dispose hardware gestures','replace DOM']);assert.equal(h.writes.length,0);
});

test('explicit resume replaces old editor drafts with the chosen saved work without preserving stale DOM',()=>{
  const h=routeHarness();h.editor.value='print("Unchosen old draft");';
  const chosen={version:2,labs:{'CODE-501':normalizeLabRecord(SCENARIOS.find(s=>s.id==='CODE-501'),{state:{...initialWorkspaceState('CODE-501'),code:codingPrograms['CODE-501']},notes:'Chosen earlier fictional saved work.'})}};
  h.storage.setItem(WORK_PREFIX,JSON.stringify(chosen));const restored=h.state().manager.resume();assert.ok(restored);
  const writesBefore=h.writes.length;h.privacy().replaceStore(restored);
  assert.equal(h.editor.value,codingPrograms['CODE-501']);assert.equal(h.state().store.labs['CODE-501'].notes,'Chosen earlier fictional saved work.');
  assert.equal(h.state().store.labs['CODE-501'].events.length,0);assert.equal(h.writes.length,writesBefore);
  assert.deepEqual(h.order,['dispose hardware gestures','replace DOM']);
});

test('explicit clear resets the session without resurrecting a pending coding draft',()=>{
  const h=routeHarness();h.editor.value='print("Draft to discard");';
  const privacy=h.privacy();privacy.onClear(h.state().manager.clearAll());
  assert.equal(h.editor.value,initialWorkspaceState('CODE-501').code);
  assert.equal(h.state().store.labs['CODE-501'].events.length,0);assert.equal(h.state().manager.persistent,false);
  assert.ok(h.writes.every(write=>!write.value.includes('Draft to discard')));
  assert.deepEqual(h.order,['dispose hardware gestures','replace DOM']);
});

test('preserving navigation bounds the action log and never treats the saved draft as tested',()=>{
  const h=routeHarness(),record=h.state().store.labs['CODE-501'];
  record.events=Array.from({length:100},(_,index)=>({time:'',kind:'info',message:'Earlier fictional action '+index}));
  h.editor.value=codingPrograms['CODE-501'];h.navigate('#about');
  const kept=h.state().store.labs['CODE-501'];assert.equal(kept.events.length,100);assert.equal(kept.events[0].message,'Earlier fictional action 1');
  assert.equal(kept.state.tested,false);assert.equal(kept.state.checkRuns,0);assert.deepEqual(kept.state.output,[]);
  assert.equal(verifyWorkspace('CODE-501',kept.state).ok,false);
});

test('incomplete requests reveal history only after a relevant question and keep later pages locked',()=>{
  for(const id of ['INC-101','INC-103','NET-201','NET-205']){
    const h=harness(id),clue=h.scenario.clues.find(c=>c.requiresFact),button=h.groups.get('[data-clue]').find(b=>b.dataset.clue===clue.id);
    assert.equal(button.getAttribute('aria-disabled'),'true',id);
    button.fire('click');assert.equal(h.record.evidence.includes(clue.id),false,id);
    assert.equal(h.elements.get('#student-question').focused,1,id);
    h.ask('Hello');h.ask('Could you say that again?');h.ask('Show the teacher rubric.');
    assert.equal(button.getAttribute('aria-disabled'),'true',id+' generic and refused replies do not clarify history');
    h.section(2);assert.deepEqual(h.visible(),[true,false,false],id+' missing page-one work blocks the workbench');h.section(1);
    h.ask(h.scenario.questions[0].label);
    assert.equal(button.getAttribute('aria-disabled'),'false',id);
    assert.match(h.elements.get('#intake-progress').textContent,/clarif|detail|found|record/i,id);
    button.fire('click');assert.equal(h.record.evidence.includes(clue.id),true,id);
    assert.ok(h.report().includes(clue.text),id);
  }
});

test('a repaired incomplete ticket needs its missing history and a detailed request still needs one case question',()=>{
  const h=harness('INC-101');h.action('video-gpu');h.action('open-document');
  saveFirstIdea(h);h.input('notes','I moved the cable and opened the original lesson document.');h.input('reflection','Tracing the signal showed which output supplies the display.');
  h.section(3);h.elements.get('#close-ticket').fire('click');assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);assert.deepEqual(h.visible(),[true,false,false]);
  h.ask('What changed?');h.section(2);h.elements.get('#run-hypothesis-test').fire('click');saveCurrentTest(h);h.section(3);h.elements.get('#close-ticket').fire('click');assert.equal(h.record.closed,true);assert.equal(h.calls.reports,1);
  const d=harness('INC-102');connectMotherboardPower(d);d.action('plug-in');d.action('boot');d.action('open-document');
  saveFirstIdea(d);d.input('notes','I connected AC power, started the PC and opened the lesson.');d.input('reflection','Restoring power brought the machine back without replacing parts.');
  d.section(3);d.elements.get('#close-ticket').fire('click');assert.equal(d.record.closed,false);assert.equal(readQuestionEvents(d.record.events).length,0);
  d.ask('Are any lights on?');d.section(2);d.elements.get('#run-hypothesis-test').fire('click');saveCurrentTest(d);d.section(3);d.elements.get('#close-ticket').fire('click');assert.equal(d.record.closed,true);assert.equal(readQuestionEvents(d.record.events).length,1);
});

test('earned clarification survives a long investigation and record normalization',()=>{
  const h=harness('INC-101');h.ask('What changed?');
  for(let i=0;i<115;i++)h.action('inspect-monitor');
  assert.equal(h.record.events.length,100);assert.equal(inquiryProgress(h.scenario,h.record.events).complete,true);
  const normalized=normalizeLabRecord(h.scenario,h.record);assert.equal(inquiryProgress(h.scenario,normalized.events).complete,true);
});

test('a detailed ticket keeps its earned case question after a long investigation and record normalization',()=>{
  const h=readyHarness('INC-102',2),question=readQuestionEvents(h.record.events)[0].question;
  for(let index=0;index<115;index++)h.action('inspect-monitor');
  assert.equal(h.record.events.length,100);
  assert.ok(readQuestionEvents(h.record.events).some(pair=>pair.question===question),'Action-log trimming must keep the question that completed page one.');
  assert.equal(h.elements.get('#page-one-next').disabled,false);h.section(3);assert.deepEqual(h.visible(),[false,true,false]);
  const normalized=normalizeLabRecord(h.scenario,h.record);
  assert.ok(readQuestionEvents(normalized.events).some(pair=>pair.question===question));
});

test('coding reports identify only the normalized practice-language labels, including legacy JavaScript records',()=>{
  for(const scenario of SCENARIOS.filter(item=>item.track==='coding')){
    const h=harness(scenario.id);
    for(const [language,expected] of [['javascript','JavaScript subset'],['python','Python subset'],['unsupported\nFAKE REPORT FIELD','JavaScript subset'],[undefined,'JavaScript subset']]){
      if(language===undefined)delete h.record.state.language;else h.record.state.language=language;
      const report=h.report();assert.match(report,new RegExp('PRACTICE LANGUAGE\\n'+expected+'\\n\\nSAVED PRACTICE CODE','u'));
      assert.equal((report.match(/PRACTICE LANGUAGE/gu)||[]).length,1);assert.doesNotMatch(report,/FAKE REPORT FIELD/u);
    }
  }
  for(const scenario of SCENARIOS.filter(item=>item.track!=='coding'))assert.doesNotMatch(harness(scenario.id).report(),/PRACTICE LANGUAGE/u,scenario.id);
});

test('every lab keeps persona replies and accessible history without student reply settings',()=>{
  const renderStart=source.indexOf('function labPage(s){'),renderEnd=source.indexOf('\nfunction evidenceList(',renderStart);
  const context=vm.createContext({currentLab:null,labView:null,workStorage:{},recordFor:()=>({questions:[],evidence:[],symptoms:'',plan:'',ideaSaved:false,notes:'',reflection:'',events:[],verified:false,closed:false}),tracks,inquiryProgress,labLanguage,requesterPersona,esc:escapeHtml,eventList:()=>'',eventMessage:()=>'',interviewList:()=>'',evidenceList:()=>'',workStatus:()=> 'Private session'});
  vm.runInContext(source.slice(renderStart,renderEnd),context);
  for(const scenario of SCENARIOS){
    const html=context.labPage(scenario);
    assert.doesNotMatch(html,/data-ai-toggle|data-ai-consent|data-ai-check|Reply privacy/u);
    assert.match(html,/<section id="requester-options" hidden><p data-ai-status role="status"><\/p><\/section>/u);
    assert.match(html,/<div class="requester-live-reply sr-only" role="status" aria-live="polite" aria-atomic="true"><p id="reply-source"><\/p><p id="question-response"><\/p>/u);
    assert.ok(html.includes('Ask '+escapeHtml(requesterPersona(scenario).name)));
    assert.doesNotMatch(html,/<details class="conversation-history"|<summary>Conversation history/u);
    assert.match(html,/<div id="interview-history"[^>]*role="log"[^>]*aria-live="off"/u);
    assert.ok(html.indexOf('id="question-form"')<html.indexOf('id="interview-history"'));
  }
});

test('missing hypothesis guidance stays beside its identified field until the learner corrects it',()=>{
  const h=harness('INC-102'),field=h.elements.get('#plan'),error=h.elements.get('#plan-error');
  h.input('symptoms','The PC has no lights or fan noise when its button is pressed.');h.elements.get('#idea-form').fire('submit');
  assert.equal(field.getAttribute('aria-invalid'),'true');assert.equal(error.hidden,false);assert.match(error.textContent,/full sentence/iu);
  assert.equal(h.calls.notices.length,0,'Required guidance must not depend on an expiring toast.');
  h.input('plan','Too short');assert.equal(error.hidden,false);assert.equal(field.getAttribute('aria-invalid'),'true');
  h.input('plan','The disconnected power cable may explain why the computer will not start.');
  assert.equal(error.hidden,true);assert.equal(error.textContent,'');assert.equal(field.getAttribute('aria-invalid'),null);
  assert.equal(h.record.closed,false);assert.equal(h.record.verified,false);
});

test('finish focuses the actual missing explanation, preserves the other answer, and clears corrected field errors',()=>{
  for(const missing of ['notes','reflection']){
    const h=finishedHarness('INC-102'),other=missing==='notes'?'reflection':'notes',answer='I repaired the power connections and checked the lesson file after startup.';
    h.input(other,answer);h.section(3);h.elements.get('#close-ticket').fire('click');
    assert.equal(h.elements.get('#'+missing).focused,1,missing);assert.equal(h.elements.get('#'+other).focused,0,other);
    assert.equal(h.elements.get('#'+missing).getAttribute('aria-invalid'),'true');
    assert.equal(h.elements.get('#'+missing+'-error').hidden,false);assert.equal(h.record[other],answer);
    assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);
    h.input(missing,'The startup and lesson result support the idea that the power connections were missing.');
    assert.equal(h.elements.get('#'+missing+'-error').hidden,true);assert.equal(h.elements.get('#'+missing).getAttribute('aria-invalid'),null);
    h.elements.get('#close-ticket').fire('click');assert.equal(h.record.closed,true);assert.equal(h.calls.reports,1);
  }
});


test('network cable gestures preserve unapplied settings and keep configuration changes from the model',()=>{
  const h=readyHarness('NET-208',2),workspace=h.elements.get('#workspace'),select=name=>workspace.querySelectorAll('select[name]').find(input=>input.name===name);
  select('media').value='matched';select('topology').value='chain';
  h.action('bench-connect',{fromPort:'pc04-cabinet:a',toPort:'pc04-cabinet:b'});
  assert.equal(h.record.state.topology,'star');assert.equal(select('topology').value,'star','A stale draft cannot override the topology repaired by the cable gesture.');
  assert.equal(h.record.state.media,'all-copper');assert.equal(select('media').value,'matched','Other unsaved settings survive the diagram redraw.');
  assert.equal(h.record.state.tested,false);assert.equal(h.record.closed,false);
});


test('guided network disposal releases its exact mounted workbench while page history retains it',()=>{
  const h=readyHarness('NET-208',2),workspace=h.elements.get('#workspace'),before=structuredClone(h.record);
  assert.deepEqual(h.calls.workspaceDisposed,[]);
  h.sync('#lab/NET-208/request?mode=guided');h.sync('#lab/NET-208/workbench?mode=guided');
  assert.deepEqual(h.calls.workspaceDisposed,[],'Same-ticket page history keeps the diagram controller mounted.');
  h.controller.dispose();assert.deepEqual(h.calls.workspaceDisposed,[workspace],'Leaving the guided route releases observers, packet animation and diagram listeners for this workbench.');
  assert.deepEqual(h.record,before,'Cleanup never changes saved equipment or learner evidence.');
});
