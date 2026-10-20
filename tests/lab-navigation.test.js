import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { SCENARIOS } from '../src/scenarios.js';
import { initialHardwareState, applyHardwareAction, verifyHardware } from '../src/hardware.js';
import { initialWorkspaceState, applyWorkspaceAction, verifyWorkspace } from '../src/workspaces.js';
import { answerQuestion, questionEvent, readQuestionEvents, inquiryProgress, retainInquiryEvents } from '../src/interview.js';
import { createWorkStorage, WORK_PREFIX } from '../src/local-work.js';
import { normalizeLabRecord } from '../src/records.js';

import {retainExperimentEvents,experimentEventText,experimentReport} from '../src/experiments.js';
import {learningRoute,labPageHash} from '../src/learning-tools.js';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const helperStart = source.indexOf('function interviewList(');
const bindingStart = source.indexOf('function bindLab(');
const reportStart = source.indexOf('\nfunction reportText(', bindingStart);
const reportEnd = source.indexOf('\nfunction openReport(', reportStart);
assert.ok(helperStart >= 0 && bindingStart > helperStart && reportStart > bindingStart && reportEnd > reportStart, 'Exercise the actual student lab, interview, and report functions.');
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const tracks = Object.fromEntries(SCENARIOS.map(scenario => [scenario.track, {name:scenario.track}]));

class Element {
  constructor(dataset = {}) {
    this.dataset = dataset; this.hidden = false; this.value = ''; this.textContent = ''; this.innerHTML = ''; this.tabIndex = 0;
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
  closest(selector) { return selector === 'details' ? this.disclosure || null : null; }
  appendChild(child) { this.childNodes.push(child); return child; }
  replaceChildren(...children) { this.childNodes = [...children]; }
  focus() { this.focused++; }
  scrollIntoView(options) { this.scrolled.push(options); }
  close() {}
}

function harness(id = 'INC-101', initialSection = 1, replyForQuestion = answerQuestion, prepareRecord = () => {}, routeOptions = {}) {
  const scenario = SCENARIOS.find(item => item.id === id);
  const record = {questions:[],evidence:[],plan:'',notes:'',reflection:'',events:[],verified:false,closed:false,state:scenario.track === 'hardware' ? initialHardwareState(id) : initialWorkspaceState(id)};
  prepareRecord(record);
  const elements = new Map();
  for (const selector of ['#workspace','#coding-editor','#learning-mode','#lab-page-title','#lab-page-progress','.lab-shell','.save-status','#action-count','#verify-result','#action-feedback','#bench-log','#clue-count','#question-response','#question-suggestions','#intake-progress','#question-form','#student-question','#interview-history','#experiment-hypothesis','#experiment-result','#run-hypothesis-test','#evidence-detail','#evidence-list','#plan','#notes','#reflection','#verify-task','#close-ticket','#reading-toggle','#saving-options','#work-privacy details','#report-button','#finish-report','#reset-ticket','#cancel-reset','#reset-confirm','#confirm-reset','#dialog-close','#lab-dialog']) elements.set(selector,new Element());
  elements.get('#question-suggestions').hidden=true;
  for(const selector of ['#plan','#evidence-detail']){const drawer=new Element();drawer.open=false;elements.get(selector).disclosure=drawer;}
  for (const [className,panelId] of [['.case-sidebar','#lab-problem'],['.bench-column','#lab-workbench'],['.evidence-sidebar','#lab-finish']]) { const panel = new Element(); elements.set(className,panel); elements.set(panelId,panel); }
  const groups = new Map([
    ['[data-lab-section]',[1,2,3].map(section => new Element({labSection:String(section)}))],
    ['[data-jump-section]',[2,2,1,3,2].map(section => new Element({jumpSection:String(section)}))],
    ['[data-finish-check]',[...(scenario.intake?.kind==='follow-up'?['inquiry']:[]),'clues','plan','notes','reflection','verified'].map(finishCheck => new Element({finishCheck}))],
    ['[data-question]',scenario.questions.map((_,index) => new Element({question:String(index)}))],
    ['[data-clue]',scenario.clues.map(clue => new Element({clue:clue.id}))]
  ]);
  const calls = {saved:0,rendered:0,reports:0,benchCancelled:0,hardwareVisible:[],forcedRenders:[],notices:[]}; let workspaceAction;
  const location={hash:labPageHash(id,initialSection,routeOptions)},historyEntries=[location.hash];let historyIndex=0;
  elements.get('#learning-mode').value=routeOptions.mode||'guided';
  const history={pushState(_state,_title,url){historyEntries.splice(++historyIndex);historyEntries.push(url);location.hash=url;},replaceState(_state,_title,url){historyEntries[historyIndex]=url;location.hash=url;}};
  function renderBench(root,callback) {
    calls.rendered++; workspaceAction = callback;
    // The real renderer replaces inputs; this draft detects unexpected replacement.
    root.children = new Map(); root.querySelector('[data-unsaved-workbench-draft]').value = '';
  }
  const context = vm.createContext({
    scenario,record,initialSection,applyHardwareAction,verifyHardware,location,history,learningRoute,labPageHash,
    // Production modules share one realm. Transfer VM-created action data into
    // the model's realm so its strict plain-object boundary is tested fairly.
    applyWorkspaceAction:(caseId,previous,action,value)=>applyWorkspaceAction(caseId,previous,action,value===undefined?undefined:structuredClone(value)),
    retainExperimentEvents:(s,events)=>retainExperimentEvents(s,structuredClone(events)),experimentEventText,experimentReport,verifyWorkspace,answerQuestion:replyForQuestion,questionEvent,readQuestionEvents,inquiryProgress,retainInquiryEvents,tracks,esc:escapeHtml,
    document:{title:'',createElement(tagName){const element=new Element();element.tagName=tagName.toUpperCase();return element;},dispatchEvent(){}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    $: selector => { assert.ok(elements.has(selector),'Unexpected lab selector: '+selector); return elements.get(selector); },
    $$: selector => { assert.ok(groups.has(selector),'Unexpected lab control group: '+selector); return groups.get(selector); },
    bindWorkPrivacy() {},recordFor:() => record,workStatus:() => 'Private session',evidenceList:() => '',
    renderHardware(root,_id,_state,callback) { assert.equal(scenario.track,'hardware'); renderBench(root,callback); },
    cancelHardwareInteraction(root) { assert.equal(root,elements.get('#workspace')); calls.benchCancelled++; },
    setHardwareVisible(root,visible) { assert.equal(root,elements.get('#workspace')); assert.equal(typeof visible,'boolean'); calls.hardwareVisible.push(visible); },
    renderWorkspace(root,_scenario,_state,callback) { assert.notEqual(scenario.track,'hardware'); renderBench(root,callback); if(scenario.track==='coding'){const editor=new Element();editor.value=_state.code;elements.set('#coding-editor',editor);} },
    save() { calls.saved++; },showNotice(message) { calls.notices.push(message); },openReport() { calls.reports++; },renderRoute(preserveDraft) { calls.forcedRenders.push(preserveDraft); },
    normalizeLabRecord:(_scenario,value) => value,attachClassroomLab:() => null,matchMedia:() => ({matches:true}),Date
  });
  vm.runInContext('let workStorage={},classroomConnection=null,classroomSharingPaused=true,storageKey="test",store={labs:{[scenario.id]:record}},labNavigation=null,labView={id:scenario.id,section:initialSection};\n'+source.slice(helperStart,reportStart)+source.slice(reportStart,reportEnd)+'\nglobalThis.navigation=bindLab(scenario,learningRoute(location.hash));',context);
  return {scenario,record,context,calls,elements,groups,location,historyEntries,
    back(){if(historyIndex===0)return false;location.hash=historyEntries[--historyIndex];return context.navigation.syncRoute(learningRoute(location.hash));},
    forward(){if(historyIndex===historyEntries.length-1)return false;location.hash=historyEntries[++historyIndex];return context.navigation.syncRoute(learningRoute(location.hash));},
    sync(hash){location.hash=hash;return context.navigation.syncRoute(learningRoute(hash));},
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

test('leaving the hardware workbench cancels gestures without rebuilding or changing the investigation', () => {
  const h=harness('INC-101',2),before=structuredClone(h.record),renders=h.calls.rendered;
  assert.equal(h.calls.benchCancelled,0);
  h.section(3);assert.equal(h.calls.benchCancelled,1);
  h.section(2);assert.equal(h.calls.benchCancelled,1);
  h.section(1);assert.equal(h.calls.benchCancelled,2);
  assert.deepEqual(h.record,before);assert.equal(h.calls.rendered,renders);
});

test('every visible hardware workbench adopts mechanics once without repairing its ticket fault', () => {
  for(const scenario of SCENARIOS.filter(item=>item.track==='hardware')) {
    const before=initialHardwareState(scenario.id),h=harness(scenario.id);
    assert.equal(h.record.state.assemblyEnabled,true,scenario.id);
    for(const [key,value] of Object.entries(before)) {
      if(['assemblyEnabled','assembly','actions'].includes(key))continue;
      assert.deepEqual(h.record.state[key],value,scenario.id+' must preserve '+key);
    }
    assert.equal(h.record.verified,false,scenario.id);assert.equal(h.record.closed,false,scenario.id);
    assert.equal(h.calls.saved,1,scenario.id);assert.equal(h.record.events.length,1,scenario.id);
    const adopted=structuredClone(h.record),renders=h.calls.rendered;
    h.section(1);h.section(2);h.section(3);h.section(2);
    assert.deepEqual(h.record,adopted,scenario.id+' navigation must not reinitialize equipment or work');
    assert.equal(h.calls.rendered,renders,scenario.id);
  }
});

test('resumed detailed repairs preserve mechanical changes, explanations and verification on repair entry',()=>{
  const h=harness('INC-106',1,answerQuestion,record=>{
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

test('each page shows only its own part and preserves questions, notes and drafts', () => {
  const h = harness(); assert.deepEqual(h.visible(),[true,false,false]); assert.deepEqual(h.selected(),['true','false','false']);
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
  h.section(2); assert.deepEqual(h.visible(),[false,true,false]); h.section(3); assert.deepEqual(h.visible(),[false,false,true]);
  h.input('notes','I inspected the connection and compared the available outputs.'); h.input('reflection','Checking the signal path helps explain the symptom.'); h.section(1);
  for (const field of ['plan','notes','reflection']) assert.equal(h.record[field],h.elements.get('#'+field).value);
  assert.equal(h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'),draft); assert.equal(draft.value,'An unfinished virtual workbench setting');
  assert.equal(h.calls.rendered,rendered,'Returning between sections must not recreate an adopted workbench.'); assert.equal(h.calls.saved,saved+3,'Only field edits save after first repair entry.');
  assert.deepEqual(h.visible(),[true,false,false]); assert.deepEqual(h.groups.get('[data-lab-section]').map(tab=>tab.focused),[2,2,1]);
});

const codingPrograms={
  'CODE-501':'print(quantity * 3);',
  'CODE-502':'if (temperature < 20) { print("Heating"); } else { if (temperature <= 25) { print("Comfortable"); } else { print("Cooling"); } }',
  'CODE-503':'let station = 1; repeat(stations) { print("Ready " + station); station = station + 1; }'
};

function explainCodingWork(h) {
  h.groups.get('[data-clue]')[0].fire('click');h.groups.get('[data-clue]')[1].fire('click');
  h.input('plan','The program should use its supplied input rather than a fixed answer.');
  h.input('notes','I changed the program and ran every changing input fixture to compare its actual output.');
  h.input('reflection','The passing fixtures support my hypothesis because the same program handles each supplied input.');
}

test('coding editor drafts remain intact across all three pages without being saved or executed',()=>{
  const h=harness('CODE-501'),editor=h.elements.get('#coding-editor'),savedSource=h.record.state.code;
  editor.value=codingPrograms['CODE-501'];const savedBefore=h.calls.saved,renderedBefore=h.calls.rendered;
  h.section(2);h.section(3);h.section(1);h.section(2);
  assert.equal(h.elements.get('#coding-editor'),editor);
  assert.equal(editor.value,codingPrograms['CODE-501']);assert.equal(h.record.state.code,savedSource);
  assert.equal(h.record.state.tested,false);assert.equal(h.record.state.checkRuns,0);
  assert.equal(h.calls.saved,savedBefore);assert.equal(h.calls.rendered,renderedBefore);
});



test('direct entry opens the requested lab page without stealing focus or executing work',()=>{
  for(const [index,title] of ['Request & clues','Workbench & test','Check & Explain'].entries()) {
    const h=harness('CODE-501',index+1);
    assert.deepEqual(h.visible(),[0,1,2].map(value=>value===index));
    assert.equal(h.elements.get('#lab-page-title').textContent,title);
    assert.ok(h.context.document.title.includes(title));
    assert.deepEqual(h.groups.get('[data-lab-section]').map(button=>button.focused),[0,0,0]);
    assert.equal(h.calls.saved,0);assert.equal(h.calls.rendered,1);assert.equal(h.record.state.checkRuns,0);
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

test('page URLs, browser Back and Forward keep the same question, equipment and coding draft',()=>{
  const h=harness('CODE-501',1,answerQuestion,()=>{},{mode:'independent',sequence:'opening-day'});
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
  const h=harness('INC-101',2),draft=h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]');
  h.action('video-gpu');draft.value='A pending equipment setting';
  const before=structuredClone(h.record),renders=h.calls.rendered,saves=h.calls.saved;
  h.section(3);assert.equal(h.calls.hardwareVisible.at(-1),false);h.back();assert.equal(h.calls.hardwareVisible.at(-1),true);
  h.section(1);assert.equal(h.calls.hardwareVisible.at(-1),false);h.back();assert.equal(h.calls.hardwareVisible.at(-1),true);
  assert.deepEqual(h.record,before);assert.equal(h.calls.rendered,renders);assert.equal(h.calls.saved,saves);
  assert.equal(draft.value,'A pending equipment setting');assert.equal(h.calls.benchCancelled,2);
});

test('route synchronization refuses a different ticket or assignment context',()=>{
  const h=harness('CODE-501',2,answerQuestion,()=>{},{mode:'challenge',sequence:'opening-day'});
  for(const hash of ['#lab/CODE-502/explain?mode=challenge&sequence=opening-day','#lab/CODE-501/explain?mode=guided&sequence=opening-day','#lab/CODE-501/explain?mode=challenge','#labs']) {
    assert.equal(h.sync(hash),false,hash);assert.deepEqual(h.visible(),[false,true,false]);
  }
});

test('the hypothesis test saves and executes the actual coding draft instead of reusing an old passing source',()=>{
  const h=harness('CODE-501');h.input('plan','The supplied quantity should determine the total for every fixture.');
  h.action('run-check',{code:codingPrograms['CODE-501']});h.elements.get('#verify-task').fire('click');
  assert.equal(h.record.verified,true);assert.equal(h.record.state.checkRuns,1);
  h.elements.get('#coding-editor').value='print(6);';
  h.elements.get('#run-hypothesis-test').fire('click');
  assert.equal(h.record.state.code,'print(6);');assert.equal(h.record.state.sourceAtRun,'print(6);');
  assert.equal(h.record.state.checkRuns,2);assert.equal(h.record.state.tested,true);
  assert.equal(h.record.verified,false);assert.equal(h.record.closed,false);
  assert.ok(h.record.state.results.some(result=>!result.ok));
  assert.match(h.elements.get('#experiment-result').textContent,/not ready/iu);assert.equal(h.calls.reports,0);
});

for(const control of ['verify-task','close-ticket']) {
  test('untested coding edits block '+control+' even after a previously completed program',()=>{
    const h=harness('CODE-501');explainCodingWork(h);
    h.action('run-check',{code:codingPrograms['CODE-501']});h.elements.get('#close-ticket').fire('click');
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

for(const [id,program] of Object.entries(codingPrograms)) {
  test(id+' finishes only after fresh execution and includes saved code and output in the report',()=>{
    const h=harness(id);explainCodingWork(h);
    h.elements.get('#coding-editor').value=program;h.section(3);h.elements.get('#close-ticket').fire('click');
    assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);
    h.section(2);h.elements.get('#run-hypothesis-test').fire('click');
    assert.equal(h.record.state.code,program);assert.equal(h.record.state.sourceAtRun,program);
    assert.equal(h.record.state.checkRuns,1);assert.equal(h.record.verified,true);assert.equal(h.record.closed,false);
    h.section(3);h.elements.get('#close-ticket').fire('click');
    assert.equal(h.record.closed,true);assert.equal(h.calls.reports,1);
    const report=h.report();
    assert.match(report,/Status: DELIVERED/u);assert.ok(report.includes('SAVED PRACTICE CODE\n'+program));
    assert.ok(report.includes('PRACTICE OUTPUT\n'+h.record.state.output.join('\n')));
    assert.equal(h.record.evidence.length,2);assert.equal(h.record.plan,h.elements.get('#plan').value);
  });
}

test('section buttons stay keyboard reachable and support wrap, Home, and End without replacing the workbench', () => {
  const h = harness(),tabs = h.groups.get('[data-lab-section]'); assert.deepEqual(tabs.map(tab => tab.tabIndex),[0,0,0]);
  assert.equal(h.key(0,'ArrowRight').defaultPrevented,true); assert.deepEqual(h.selected(),['false','true','false']); assert.deepEqual(tabs.map(tab => tab.tabIndex),[0,0,0]); assert.equal(tabs[1].focused,1);
  h.key(1,'End'); assert.deepEqual(h.visible(),[false,false,true]); h.key(2,'Home'); assert.deepEqual(h.visible(),[true,false,false]);
  h.key(0,'ArrowLeft'); assert.deepEqual(h.visible(),[false,false,true]); h.key(2,'ArrowRight'); assert.deepEqual(h.visible(),[true,false,false]);
  assert.equal(h.key(0,'Tab').defaultPrevented,false); assert.deepEqual(h.visible(),[true,false,false]); assert.equal(h.calls.rendered,2); assert.equal(h.calls.saved,1,'Only first repair entry records setup.');
});

test('Continue and Back controls reveal and focus the requested panel while retaining the investigation', () => {
  const h = harness(); h.input('plan','A fictional explanation that stays on the current page.');
  for (const button of h.groups.get('[data-jump-section]')) { button.fire('click'); const expected = Number(button.dataset.jumpSection)-1; assert.deepEqual(h.visible(),[0,1,2].map(index=>index===expected)); }
  assert.equal(h.elements.get('.bench-column').focused,3); assert.equal(h.elements.get('.case-sidebar').focused,1); assert.equal(h.elements.get('.evidence-sidebar').focused,1);
  assert.ok(h.record.plan.includes('stays on the current page')); assert.equal(h.calls.rendered,2); assert.equal(h.calls.saved,2);
});

test('page navigation starts the selected page without resetting its draft or other pages',()=>{
  const h=harness(),request=h.elements.get('.case-sidebar'),bench=h.elements.get('.bench-column');
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
  const h = harness(); h.input('plan','This fictional work must survive an invalid navigation value.'); const button = h.groups.get('[data-lab-section]')[0];
  for (const value of ['not-a-section','0','9','1.5','Infinity','-2']) { h.section(2); button.dataset.labSection = value; assert.doesNotThrow(() => button.fire('click'),'Invalid navigation value: '+value); assert.deepEqual(h.visible(),[true,false,false]); assert.equal(h.record.plan,h.elements.get('#plan').value); assert.equal(h.calls.rendered,2); }
});

test('a recorded repair section adopts mechanics once without a focus jump', () => {
  const h = harness('INC-101',2); assert.deepEqual(h.visible(),[false,true,false]); assert.equal(h.groups.get('[data-lab-section]')[1].tabIndex,0); assert.equal(h.groups.get('[data-lab-section]')[1].focused,0); assert.equal(h.calls.rendered,2); assert.equal(h.calls.saved,1);
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

test('optional follow-up suggestions render bounded plain text as ordinary buttons',()=>{
  const markup='<img src=x onerror="alert(1)"> What is on the screen?';
  const h=harness('INC-101',1,(...args)=>({...answerQuestion(...args),suggestions:['  What changed?  ','What changed?',markup,null,'x'.repeat(241),'What have you tried?','One more prompt']}));
  assert.equal(h.elements.get('#question-suggestions').hidden,true);
  h.ask('What happened?');
  const group=h.elements.get('#question-suggestions'),buttons=group.childNodes.filter(child=>child.tagName==='BUTTON');
  assert.equal(group.hidden,false);assert.equal(buttons.length,3);assert.deepEqual(buttons.map(button=>button.textContent),['What changed?',markup,'What have you tried?']);
  for(const button of buttons){assert.equal(button.type,'button');assert.equal(button.innerHTML,'');}
  assert.match(group.childNodes[0].textContent,/your own words/u);assert.equal(readQuestionEvents(h.record.events).length,1,'Suggestions are not sent automatically.');
});

test('a suggested follow-up uses current history and equipment without clearing an unfinished question',()=>{
  const calls=[],prompt='Which port is the monitor using?';
  const h=harness('INC-101',1,(scenario,question,state,history)=>{calls.push({question,history:structuredClone(history),videoPort:state.videoPort});return {...answerQuestion(scenario,question,state,history),suggestions:[prompt]};});
  h.ask('What changed?');h.section(2);h.action('video-gpu');h.section(1);
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
  const h = harness(); h.section(2); h.elements.get('#run-hypothesis-test').fire('click'); assert.deepEqual(h.visible(),[true,false,false]); assert.equal(h.record.events.length,1,'Only the first repair entry setup is recorded.'); assert.doesNotMatch(h.record.events[0].message,/Hypothesis test/u); assert.equal(h.record.verified,false);
  assert.equal(h.elements.get('#plan').disclosure.open,true,'Missing required reasoning must open its drawer before focusing the field.');assert.equal(h.elements.get('#plan').focused,1);
  h.input('plan','The monitor cable may be using the wrong graphics output.'); h.section(2); h.elements.get('#run-hypothesis-test').fire('click'); assert.match(h.elements.get('#experiment-result').textContent,/not ready/iu); assert.equal(h.record.verified,false); assert.equal(h.record.closed,false);
  h.action('video-gpu'); h.action('open-document'); h.elements.get('#run-hypothesis-test').fire('click'); assert.match(h.elements.get('#experiment-result').textContent,/original task works/iu); assert.match(h.elements.get('#experiment-result').textContent,/Does this support your idea/iu); assert.equal(h.record.verified,true); assert.equal(h.record.closed,false); assert.equal(h.calls.reports,0);
  h.section(3); h.elements.get('#close-ticket').fire('click'); assert.equal(h.record.closed,false,'Verification cannot bypass required evidence and explanations.'); assert.deepEqual(h.visible(),[true,false,false]);
  h.action('video-board'); assert.equal(h.record.verified,false); assert.match(h.elements.get('#experiment-result').textContent,/setup changed.*fresh hypothesis test/iu);
});

test('non-hardware hypothesis checks run the real simulated tests and recheck changed settings', () => {
  const h = harness('NET-201'); h.input('plan','The workstation needs the addresses listed on its configuration sheet.'); h.elements.get('#run-hypothesis-test').fire('click'); assert.equal(h.record.state.tested,true); assert.equal(h.record.verified,false);
  h.action('save-network',{ip:'10.24.8.25',mask:'255.255.255.0',gateway:'10.24.8.1',dns:'10.24.8.53'}); h.elements.get('#run-hypothesis-test').fire('click'); assert.equal(h.record.verified,true); assert.equal(h.record.closed,false);
  h.action('save-network',{ip:'10.24.8.25',mask:'255.255.255.0',gateway:'10.24.8.1',dns:'192.168.1.53'}); assert.equal(h.record.verified,false); h.elements.get('#run-hypothesis-test').fire('click'); assert.equal(h.record.verified,false); assert.match(h.elements.get('#experiment-result').textContent,/not ready.*resolves/iu);
});

test('read-only practice commands do not rerender or discard unsaved workbench fields', () => {
  const h = harness('NET-201'); h.action('save-network',{ip:'10.24.8.25',mask:'255.255.255.0',gateway:'10.24.8.1',dns:'10.24.8.53'}); h.action('run-check'); h.elements.get('#verify-task').fire('click'); assert.equal(h.record.verified,true);
  const draft = h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'); draft.value = 'An unfinished DNS edit'; const stateBefore = structuredClone(h.record.state),renderedBefore = h.calls.rendered;
  const result = h.action('inspect-command',{command:'ipconfig'}); assert.match(result.message,/10\.24\.8\.25/u); assert.equal(h.calls.rendered,renderedBefore); assert.equal(h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'),draft); assert.equal(draft.value,'An unfinished DNS edit'); assert.deepEqual(h.record.state,stateBefore); assert.equal(h.record.verified,true);
});

test('starter questions share the current-state interview behavior after a virtual repair', () => {
  const h = harness('INC-102'); h.action('plug-in'); h.action('boot'); h.groups.get('[data-question]')[0].fire('click'); assert.match(h.elements.get('#question-response').textContent,/on.*fans running/iu); assert.equal(readQuestionEvents(h.record.events).length,1); assert.deepEqual(h.record.questions,[0]);
});

test('jumping straight to finish cannot mark an unresolved lab complete', () => {
  const h = harness(); h.input('plan','A fictional initial explanation with enough detail.'); h.input('notes','A fictional explanation of the actions taken so far.'); h.input('reflection','A fictional reflection on what I learned from the clues.'); h.groups.get('[data-clue]')[0].fire('click'); h.groups.get('[data-clue]')[1].fire('click'); h.section(3); h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed,false); assert.equal(h.record.verified,false); assert.equal(h.calls.reports,0); assert.match(h.elements.get('#verify-result').textContent,/not ready yet/u); assert.deepEqual(h.visible(),[false,false,true]);
});

test('a completed task needs learner explanations and later edits reopen the investigation', () => {
  const h = harness(); h.action('video-gpu'); h.action('open-document'); h.section(3); h.elements.get('#close-ticket').fire('click'); assert.equal(h.record.closed,false); assert.equal(h.calls.reports,0); assert.equal(h.elements.get('.case-sidebar').focused,1); assert.deepEqual(h.visible(),[true,false,false]);
  h.ask('What changed?'); h.groups.get('[data-clue]')[0].fire('click'); h.groups.get('[data-clue]')[1].fire('click'); h.input('plan','The monitor signal may be connected to the wrong output.'); h.input('notes','I moved the cable and opened the requested lesson document.'); h.input('reflection','I learned to trace the signal path before replacing a part.'); h.section(3); h.elements.get('#close-ticket').fire('click'); assert.equal(h.record.closed,true); assert.equal(h.record.verified,true); assert.equal(h.calls.reports,1); h.input('notes',''); assert.equal(h.record.closed,false);
});

test('finishing a technically repaired detailed ticket opens the missing evidence and idea controls',()=>{
  const h=harness('INC-102');h.action('plug-in');h.action('boot');h.action('open-document');h.section(3);
  h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);assert.deepEqual(h.visible(),[true,false,false]);
  for(const field of ['#evidence-detail','#plan'])assert.equal(h.elements.get(field).disclosure.open,true,field+' must be exposed before continuing');
  assert.equal(h.elements.get('#plan').focused,1);
  assert.equal(h.elements.get('#plan').scrolled.length,1,'Missing reasoning must be brought into view on the request page.');
  assert.equal(h.elements.get('#plan').scrolled[0].block,'nearest','Reveal the required field without scrolling past the request pane.');
  assert.equal(h.elements.get('#plan').scrolled[0].behavior,'instant','Validation focus must not race an earlier navigation scroll.');
});

test('all cases render labelled pages and accessible navigation with only the request visible initially', () => {
  const renderStart = source.indexOf('function labPage(s){'),renderEnd = source.indexOf('\nfunction evidenceList(',renderStart); assert.ok(renderStart >= 0 && renderEnd > renderStart);
  const context = vm.createContext({currentLab:null,labView:null,workStorage:{},recordFor:() => ({questions:[],evidence:[],plan:'',notes:'',reflection:'',events:[],verified:false,closed:false}),tracks,inquiryProgress,esc:escapeHtml,eventList:() => '',eventMessage:() => '',interviewList:() => '',evidenceList:() => '',workStatus:() => 'Private session'});
  vm.runInContext(source.slice(renderStart,renderEnd),context);
  for (const scenario of SCENARIOS) {
    const html = context.labPage(scenario);
    for (const [index,id] of ['lab-problem','lab-workbench','lab-finish'].entries()) {
      const matches = html.match(new RegExp('<(?:aside|section|div)\\b[^>]*\\bid="'+id+'"[^>]*>','g')) || []; assert.equal(matches.length,1,scenario.id+' must include one '+id+' panel.'); assert.match(matches[0],/role="region"/u); assert.match(matches[0],new RegExp('aria-labelledby="lab-tab-'+(index+1)+'"','u')); assert.equal(/\bhidden(?:\s|=|>)/u.test(matches[0]),index !== 0);
      const tab = html.match(new RegExp('<button\\b[^>]*\\bid="lab-tab-'+(index+1)+'"[^>]*>','u'))?.[0]; assert.ok(tab); assert.doesNotMatch(tab,/role="tab"/u); assert.match(tab,new RegExp('aria-controls="'+id+'"','u')); if(index===0)assert.match(tab,/aria-current="step"/u);else assert.doesNotMatch(tab,/aria-current=/u);
    }
    for (const id of ['plan','workspace','notes','reflection','verify-task','close-ticket','question-form','student-question','question-suggestions','interview-history','run-hypothesis-test','experiment-result']) assert.equal((html.match(new RegExp('\\bid="'+id+'"','g')) || []).length,1,scenario.id+' must include '+id+'.');
    assert.match(html,/<div id="question-suggestions"[^>]*role="group"[^>]*aria-label="Suggested follow-up questions"[^>]*hidden/u);
    assert.equal((html.match(/\brole="region"/g) || []).length,3); assert.equal((html.match(/\brole="tablist"/g) || []).length,0); assert.equal((html.match(/\bdata-lab-section="/g) || []).length,3); assert.match(html,/How to use this lab/u); assert.match(html,/scripted simulation/iu); assert.doesNotMatch(html,/id="focus-toggle"|Show all steps|One step at a time/u);
  }
});

test('every lab defaults to on-device question replies and clearly disables the unconnected live AI option',()=>{
  const renderStart=source.indexOf('function labPage(s){'),renderEnd=source.indexOf('\nfunction evidenceList(',renderStart);
  const context=vm.createContext({currentLab:null,labView:null,workStorage:{},recordFor:()=>({questions:[],evidence:[],plan:'',notes:'',reflection:'',events:[],verified:false,closed:false}),tracks,inquiryProgress,esc:escapeHtml,eventList:()=>'',eventMessage:()=>'',interviewList:()=>'',evidenceList:()=>'',workStatus:()=> 'Private session'});
  vm.runInContext(source.slice(renderStart,renderEnd),context);
  for(const scenario of SCENARIOS) {
    const html=context.labPage(scenario),selector=html.match(/<select id="interview-mode"[^>]*>(.*?)<\/select>/s)?.[1];
    assert.ok(selector,scenario.id+' must explain the available question response mode.');
    const options=[...selector.matchAll(/<option\b([^>]*)>(.*?)<\/option>/gs)];
    assert.equal(options.length,2,scenario.id);
    assert.match(options[0][1],/value="device"/u);assert.doesNotMatch(options[0][1],/\bdisabled\b/u);
    assert.equal(options[0][2],'On-device practice chat',scenario.id);
    assert.match(options[1][1],/value="live"/u);assert.match(options[1][1],/\bdisabled\b/u);assert.doesNotMatch(options[1][1],/\bselected\b/u);
    assert.match(options[1][2],/awaiting school\/privacy approval/u);
    assert.match(html,/Live AI is not connected\. It would send question text to an approved provider\./u);
    assert.match(html,/Teacher access, provider terms, privacy review, and a separate approved deployment are required before enabling it\./u);
    assert.match(html,/This scripted simulation uses authored facts about this fictional case and your earlier questions\./u);
    assert.match(html,/Replies run on this device and do not contact an AI provider\./u);
    assert.match(html,/(?:Ask in|Use) your own words\./u);assert.match(html,/Suggestions are optional\./u);
  }
});

function routeHarness(id='CODE-501',initialPath='') {
  const draftStart=source.indexOf('function hasCodeDraft('),draftEnd=source.indexOf("\nwindow.addEventListener('beforeunload'",draftStart);
  const routeStart=source.indexOf('function renderRoute('),routeEnd=source.indexOf("\n$('#menu-toggle').addEventListener",routeStart);
  assert.ok(draftStart>=0 && draftEnd>draftStart && routeStart>=0 && routeEnd>routeStart);
  const lifecycle=['save','resetLocalSession','bindWorkPrivacy','recordFor'].map(name=>{
    const line=source.match(new RegExp('^function '+name+'\\([^\\n]*$','m'))?.[0];assert.ok(line,name);return line;
  });
  const hashListener=source.match(/^window\.addEventListener\('hashchange',[^\n]*$/m)?.[0];assert.ok(hashListener);
  const data=new Map(),writes=[],reads=[],order=[],events=new Map(),elements=new Map(),routeSyncs=[];let editor=null,mounted;
  const storage={
    get length(){return data.size;},key(index){return [...data.keys()][index]??null;},
    getItem(name){reads.push(name);return data.get(name)??null;},
    setItem(name,value){writes.push({name,value});data.set(name,String(value));},removeItem(name){data.delete(name);}
  };
  const main=new Element();let markup='';
  Object.defineProperty(main,'innerHTML',{get:()=>markup,set(value){order.push('replace DOM');markup=value;editor=null;}});
  const location={hash:'#lab/'+id+initialPath};
  const initialStore={version:2,labs:{}};
  const context=vm.createContext({
    SCENARIOS,learningRoute,labPageHash,retainExperimentEvents:(s,events)=>retainExperimentEvents(s,structuredClone(events)),mountLabLearning:()=>()=>{},mountInvestigationPreview:()=>null,mountTeachingPage:()=>()=>{},renderCapstone:()=>'capstone',mountCapstone:()=>()=>{},capstoneReport:()=>'capstone report',checkCapstoneState:()=>({ok:false}),normalizeLabRecord,createWorkStorage,WORK_PREFIX,deviceStorage:storage,initialStore,tracks,location,Date,
    applyWorkspaceAction:(caseId,previous,action,value)=>{order.push('save current draft');return applyWorkspaceAction(caseId,previous,action,structuredClone(value));},
    disposeHardware(){order.push('dispose hardware gestures');},
    $:selector=>{if(selector==='#coding-editor')return editor;if(selector==='#main')return main;if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);},
    $$:()=>[],document:{body:{classList:new Element().classList},title:''},history:{replaceState(_state,_title,url){location.hash=url;},pushState(_state,_title,url){location.hash=url;}},
    window:{addEventListener(name,listener){events.set(name,listener);},scrollTo(){}},
    mountWorkControls(options){mounted=options;},workStatus:()=>'',showNotice(){},
    onBind(scenario,record){if(scenario.track==='coding'){editor=new Element();editor.value=record.state.code;}},
    makeNavigation(scenario,route){const mountedRoute=route||learningRoute(location.hash);return {syncRoute(next){routeSyncs.push(next);return next.page==='lab'&&next.id===scenario.id&&next.mode===mountedRoute.mode&&next.sequence===mountedRoute.sequence;}};},
    routeLink:()=>'',labCards(){},home:()=> 'home',projectPage:()=> 'projects',about:()=> 'about',library:()=> 'labs',educators:()=> 'educators',guide:()=> 'guide',connect:()=> 'connect',privacy:()=> 'privacy'
  });
  vm.runInContext('let routeCleanup=null,store=initialStore,currentLab=null,labNavigation=null,labView=null,reportCleanup=null,classroomConnection=null,classroomSharingPaused=true,storageAvailable=true,storageKey=WORK_PREFIX,libraryTrack="all";\n'+
    'let workStorage=createWorkStorage({storage:deviceStorage,key:storageKey,scenarios:SCENARIOS});\n'+lifecycle.join('\n')+'\n'+
    'function labPage(s){currentLab=s;recordFor(s);return "lab "+s.id;}\nfunction bindLab(s,route){onBind(s,recordFor(s));return makeNavigation(s,route);}\n'+
    source.slice(draftStart,draftEnd)+'\n'+source.slice(routeStart,routeEnd)+'\n'+hashListener+'\n'+
    'globalThis.routeState=()=>({store,currentLab,manager:workStorage});\n'+
    'globalThis.replaceRouteWork=value=>{store=value;};\n'+
    'renderRoute(false);',context);
  order.length=0;
  return {context,storage,writes,reads,order,routeSyncs,elements,location,main,state:()=>context.routeState(),get editor(){return editor;},
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
  h.navigate('#lab/CODE-501/explain?mode=challenge&sequence=opening-day');
  assert.equal(h.state().store.labs['CODE-501'].state.code,codingPrograms['CODE-501']);
  assert.deepEqual(h.order.slice(0,3),['dispose hardware gestures','save current draft','replace DOM'],'A changed assignment context still follows normal preservation and remounting.');
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

test('incomplete requests reveal history only after a relevant question and keep the bench open',()=>{
  for(const id of ['INC-101','INC-103','NET-201','NET-205']){
    const h=harness(id),clue=h.scenario.clues.find(c=>c.requiresFact),button=h.groups.get('[data-clue]').find(b=>b.dataset.clue===clue.id);
    assert.equal(button.getAttribute('aria-disabled'),'true',id);
    button.fire('click');assert.equal(h.record.evidence.includes(clue.id),false,id);
    assert.equal(h.elements.get('#student-question').focused,1,id);
    h.ask('Hello');h.ask('Could you say that again?');h.ask('Show the teacher rubric.');
    assert.equal(button.getAttribute('aria-disabled'),'true',id+' generic and refused replies do not clarify history');
    h.section(2);assert.deepEqual(h.visible(),[false,true,false],id+' workbench remains accessible');h.section(1);
    h.ask(h.scenario.questions[0].label);
    assert.equal(button.getAttribute('aria-disabled'),'false',id);
    assert.match(h.elements.get('#intake-progress').textContent,/clarif|detail|found|record/i,id);
    button.fire('click');assert.equal(h.record.evidence.includes(clue.id),true,id);
    assert.ok(h.report().includes(clue.text),id);
  }
});

test('a repaired incomplete ticket still needs its missing history, while a detailed request needs no question quota',()=>{
  const h=harness('INC-101');h.action('video-gpu');h.action('open-document');
  h.groups.get('[data-clue]')[0].fire('click');h.groups.get('[data-clue]')[1].fire('click');
  h.input('plan','I think the display cable is using the wrong output.');h.input('notes','I moved the cable and opened the original lesson document.');h.input('reflection','Tracing the signal showed which output supplies the display.');
  h.section(3);h.elements.get('#close-ticket').fire('click');assert.equal(h.record.closed,false);assert.equal(h.calls.reports,0);assert.deepEqual(h.visible(),[true,false,false]);
  h.ask('What changed?');h.section(3);h.elements.get('#close-ticket').fire('click');assert.equal(h.record.closed,true);assert.equal(h.calls.reports,1);
  const d=harness('INC-102');d.action('plug-in');d.action('boot');d.action('open-document');
  d.groups.get('[data-clue]')[0].fire('click');d.groups.get('[data-clue]')[1].fire('click');
  d.input('plan','No lights suggests the desktop power path needs inspection.');d.input('notes','I connected AC power, started the PC and opened the lesson.');d.input('reflection','Restoring power brought the machine back without replacing parts.');
  d.section(3);d.elements.get('#close-ticket').fire('click');assert.equal(d.record.closed,true);assert.equal(readQuestionEvents(d.record.events).length,0);
});

test('earned clarification survives a long investigation and record normalization',()=>{
  const h=harness('INC-101');h.ask('What changed?');
  for(let i=0;i<115;i++)h.action('inspect-monitor');
  assert.equal(h.record.events.length,100);assert.equal(inquiryProgress(h.scenario,h.record.events).complete,true);
  const normalized=normalizeLabRecord(h.scenario,h.record);assert.equal(inquiryProgress(h.scenario,normalized.events).complete,true);
});
