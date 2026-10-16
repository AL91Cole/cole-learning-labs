import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { SCENARIOS } from '../src/scenarios.js';
import { initialHardwareState, applyHardwareAction, verifyHardware } from '../src/hardware.js';
import { initialWorkspaceState, applyWorkspaceAction, verifyWorkspace } from '../src/workspaces.js';
import { answerQuestion, questionEvent, readQuestionEvents } from '../src/interview.js';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const helperStart = source.indexOf('function interviewList(');
const bindingStart = source.indexOf('function bindLab(s){');
const reportStart = source.indexOf('\nfunction reportText(', bindingStart);
const reportEnd = source.indexOf('\nfunction openReport(', reportStart);
assert.ok(helperStart >= 0 && bindingStart > helperStart && reportStart > bindingStart && reportEnd > reportStart, 'Exercise the actual student lab, interview, and report functions.');
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const tracks = Object.fromEntries(SCENARIOS.map(scenario => [scenario.track, {name:scenario.track}]));

class Element {
  constructor(dataset = {}) {
    this.dataset = dataset; this.hidden = false; this.value = ''; this.textContent = ''; this.innerHTML = ''; this.tabIndex = 0;
    this.attributes = new Map(); this.listeners = new Map(); this.children = new Map(); this.focused = 0; this.scrolled = [];
    const classes = new Set();
    this.classList = {
      add: value => classes.add(value), contains: value => classes.has(value),
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
  focus() { this.focused++; }
  scrollIntoView(options) { this.scrolled.push(options); }
  close() {}
}

function harness(id = 'INC-101', initialSection = 1) {
  const scenario = SCENARIOS.find(item => item.id === id);
  const record = {questions:[],evidence:[],plan:'',notes:'',reflection:'',events:[],verified:false,closed:false,state:scenario.track === 'hardware' ? initialHardwareState(id) : initialWorkspaceState(id)};
  const elements = new Map();
  for (const selector of ['#workspace','.lab-shell','.save-status','#action-count','#verify-result','#action-feedback','#bench-log','#clue-count','#question-response','#question-form','#student-question','#interview-history','#experiment-hypothesis','#experiment-result','#run-hypothesis-test','#evidence-detail','#evidence-list','#plan','#notes','#reflection','#verify-task','#close-ticket','#reading-toggle','#saving-options','#work-privacy details','#report-button','#finish-report','#reset-ticket','#cancel-reset','#reset-confirm','#confirm-reset','#dialog-close','#lab-dialog']) elements.set(selector,new Element());
  for (const [className,panelId] of [['.case-sidebar','#lab-problem'],['.bench-column','#lab-workbench'],['.evidence-sidebar','#lab-finish']]) { const panel = new Element(); elements.set(className,panel); elements.set(panelId,panel); }
  const groups = new Map([
    ['[data-lab-section]',[1,2,3].map(section => new Element({labSection:String(section)}))],
    ['[data-jump-section]',[2,1,3,2].map(section => new Element({jumpSection:String(section)}))],
    ['[data-finish-check]',['clues','plan','notes','reflection','verified'].map(finishCheck => new Element({finishCheck}))],
    ['[data-question]',scenario.questions.map((_,index) => new Element({question:String(index)}))],
    ['[data-clue]',scenario.clues.map(clue => new Element({clue:clue.id}))]
  ]);
  const calls = {saved:0,rendered:0,reports:0,notices:[]}; let workspaceAction;
  function renderBench(root,callback) {
    calls.rendered++; workspaceAction = callback;
    // The real renderer replaces inputs; this draft detects unexpected replacement.
    root.children = new Map(); root.querySelector('[data-unsaved-workbench-draft]').value = '';
  }
  const context = vm.createContext({
    scenario,record,initialSection,applyHardwareAction,verifyHardware,applyWorkspaceAction,verifyWorkspace,answerQuestion,questionEvent,readQuestionEvents,tracks,esc:escapeHtml,
    $: selector => { assert.ok(elements.has(selector),'Unexpected lab selector: '+selector); return elements.get(selector); },
    $$: selector => { assert.ok(groups.has(selector),'Unexpected lab control group: '+selector); return groups.get(selector); },
    bindWorkPrivacy() {},recordFor:() => record,workStatus:() => 'Private session',evidenceList:() => '',
    renderHardware(root,_id,_state,callback) { assert.equal(scenario.track,'hardware'); renderBench(root,callback); },
    renderWorkspace(root,_scenario,_state,callback) { assert.notEqual(scenario.track,'hardware'); renderBench(root,callback); },
    save() { calls.saved++; },showNotice(message) { calls.notices.push(message); },openReport() { calls.reports++; },renderRoute() {},
    normalizeLabRecord:(_scenario,value) => value,attachClassroomLab:() => null,matchMedia:() => ({matches:true}),Date
  });
  vm.runInContext('let workStorage={},classroomConnection=null,classroomSharingPaused=true,storageKey="test",store={labs:{}},labView={id:scenario.id,section:initialSection};\n'+source.slice(helperStart,reportStart)+source.slice(reportStart,reportEnd)+'\nbindLab(scenario);',context);
  return {scenario,record,context,calls,elements,groups,
    section(number) { groups.get('[data-lab-section]')[number-1].fire('click'); },
    key(index,key) { return groups.get('[data-lab-section]')[index].fire('keydown',{key}); },
    input(field,value) { const element = elements.get('#'+field); element.value = value; element.fire('input'); },
    ask(question) { elements.get('#student-question').value = question; return elements.get('#question-form').fire('submit'); },
    action(...args) { return workspaceAction(...args); },
    visible() { return ['.case-sidebar','.bench-column','.evidence-sidebar'].map(selector => !elements.get(selector).hidden); },
    selected() { return groups.get('[data-lab-section]').map(tab => tab.getAttribute('aria-selected')); },
    report() { return context.reportText(scenario,record); }
  };
}

test('three in-page tabs expose one panel and preserve notes and unsubmitted workbench drafts', () => {
  const h = harness(); assert.deepEqual(h.visible(),[true,false,false]); assert.deepEqual(h.selected(),['true','false','false']);
  const draft = h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'); draft.value = 'An unfinished virtual workbench setting';
  h.input('plan','The fictional cable may be connected to the wrong output.');
  h.section(2); assert.deepEqual(h.visible(),[false,true,false]); h.section(3); assert.deepEqual(h.visible(),[false,false,true]);
  h.input('notes','I inspected the connection and compared the available outputs.'); h.input('reflection','Checking the signal path helps explain the symptom.'); h.section(1);
  for (const field of ['plan','notes','reflection']) assert.equal(h.record[field],h.elements.get('#'+field).value);
  assert.equal(h.elements.get('#workspace').querySelector('[data-unsaved-workbench-draft]'),draft); assert.equal(draft.value,'An unfinished virtual workbench setting');
  assert.equal(h.calls.rendered,1,'Changing tabs must not recreate the workbench.'); assert.equal(h.calls.saved,3,'Changing tabs must not save or change learner work.');
  assert.deepEqual(h.visible(),[true,false,false]); for (const tab of h.groups.get('[data-lab-section]')) assert.equal(tab.focused,1);
});

test('tab keyboard controls use roving focus, wrap, Home, and End without replacing the workbench', () => {
  const h = harness(),tabs = h.groups.get('[data-lab-section]'); assert.deepEqual(tabs.map(tab => tab.tabIndex),[0,-1,-1]);
  assert.equal(h.key(0,'ArrowRight').defaultPrevented,true); assert.deepEqual(h.selected(),['false','true','false']); assert.deepEqual(tabs.map(tab => tab.tabIndex),[-1,0,-1]); assert.equal(tabs[1].focused,1);
  h.key(1,'End'); assert.deepEqual(h.visible(),[false,false,true]); h.key(2,'Home'); assert.deepEqual(h.visible(),[true,false,false]);
  h.key(0,'ArrowLeft'); assert.deepEqual(h.visible(),[false,false,true]); h.key(2,'ArrowRight'); assert.deepEqual(h.visible(),[true,false,false]);
  assert.equal(h.key(0,'Tab').defaultPrevented,false); assert.deepEqual(h.visible(),[true,false,false]); assert.equal(h.calls.rendered,1); assert.equal(h.calls.saved,0);
});

test('Continue and Back controls reveal and focus the requested panel while retaining the investigation', () => {
  const h = harness(); h.input('plan','A fictional explanation that stays on the current page.');
  for (const button of h.groups.get('[data-jump-section]')) { button.fire('click'); const expected = Number(button.dataset.jumpSection)-1; assert.deepEqual(h.visible(),[0,1,2].map(index => index === expected)); }
  assert.equal(h.elements.get('.bench-column').focused,2); assert.equal(h.elements.get('.case-sidebar').focused,1); assert.equal(h.elements.get('.evidence-sidebar').focused,1);
  assert.ok(h.record.plan.includes('stays on the current page')); assert.equal(h.calls.rendered,1); assert.equal(h.calls.saved,1);
});

test('invalid tab values fall back to the request without discarding current work', () => {
  const h = harness(); h.input('plan','This fictional work must survive an invalid navigation value.'); const button = h.groups.get('[data-lab-section]')[0];
  for (const value of ['not-a-section','0','9','1.5','Infinity','-2']) { h.section(2); button.dataset.labSection = value; assert.doesNotThrow(() => button.fire('click'),'Invalid navigation value: '+value); assert.deepEqual(h.visible(),[true,false,false]); assert.equal(h.record.plan,h.elements.get('#plan').value); assert.equal(h.calls.rendered,1); }
});

test('a recorded case section restores without a focus jump or workspace recreation', () => {
  const h = harness('INC-101',2); assert.deepEqual(h.visible(),[false,true,false]); assert.equal(h.groups.get('[data-lab-section]')[1].tabIndex,0); assert.equal(h.groups.get('[data-lab-section]')[1].focused,0); assert.equal(h.calls.rendered,1);
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

test('hypothesis tests observe actual equipment state and cannot finish the investigation alone', () => {
  const h = harness(); h.section(2); h.elements.get('#run-hypothesis-test').fire('click'); assert.deepEqual(h.visible(),[true,false,false]); assert.equal(h.record.events.length,0); assert.equal(h.record.verified,false);
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
  h.groups.get('[data-clue]')[0].fire('click'); h.groups.get('[data-clue]')[1].fire('click'); h.input('plan','The monitor signal may be connected to the wrong output.'); h.input('notes','I moved the cable and opened the requested lesson document.'); h.input('reflection','I learned to trace the signal path before replacing a part.'); h.section(3); h.elements.get('#close-ticket').fire('click'); assert.equal(h.record.closed,true); assert.equal(h.record.verified,true); assert.equal(h.calls.reports,1); h.input('notes',''); assert.equal(h.record.closed,false);
});

test('all cases render three labelled tabpanels and visible instructions on the same page', () => {
  const renderStart = source.indexOf('function labPage(s){'),renderEnd = source.indexOf('\nfunction evidenceList(',renderStart); assert.ok(renderStart >= 0 && renderEnd > renderStart);
  const context = vm.createContext({currentLab:null,labView:null,workStorage:{},recordFor:() => ({questions:[],evidence:[],plan:'',notes:'',reflection:'',events:[],verified:false,closed:false}),tracks,esc:escapeHtml,eventList:() => '',eventMessage:() => '',interviewList:() => '',evidenceList:() => '',workStatus:() => 'Private session'});
  vm.runInContext(source.slice(renderStart,renderEnd),context);
  for (const scenario of SCENARIOS) {
    const html = context.labPage(scenario);
    for (const [index,id] of ['lab-problem','lab-workbench','lab-finish'].entries()) {
      const matches = html.match(new RegExp('<(?:aside|section|div)\\b[^>]*\\bid="'+id+'"[^>]*>','g')) || []; assert.equal(matches.length,1,scenario.id+' must include one '+id+' panel.'); assert.match(matches[0],/role="tabpanel"/u); assert.match(matches[0],new RegExp('aria-labelledby="lab-tab-'+(index+1)+'"','u')); assert.equal(/\bhidden(?:\s|=|>)/u.test(matches[0]),index !== 0);
      const tab = html.match(new RegExp('<button\\b[^>]*\\bid="lab-tab-'+(index+1)+'"[^>]*>','u'))?.[0]; assert.ok(tab); assert.match(tab,/role="tab"/u); assert.match(tab,new RegExp('aria-controls="'+id+'"','u')); assert.match(tab,new RegExp('aria-selected="'+String(index === 0)+'"','u')); assert.match(tab,new RegExp('tabindex="'+(index === 0 ? 0 : -1)+'"','u'));
    }
    for (const id of ['plan','workspace','notes','reflection','verify-task','close-ticket','question-form','student-question','interview-history','run-hypothesis-test','experiment-result']) assert.equal((html.match(new RegExp('\\bid="'+id+'"','g')) || []).length,1,scenario.id+' must include '+id+'.');
    assert.equal((html.match(/\brole="tabpanel"/g) || []).length,3); assert.equal((html.match(/\brole="tablist"/g) || []).length,1); assert.equal((html.match(/\bdata-lab-section="/g) || []).length,3); assert.match(html,/How to use this lab/u); assert.match(html,/scripted simulation/iu); assert.doesNotMatch(html,/id="focus-toggle"|Show all steps|One step at a time/u);
  }
});
