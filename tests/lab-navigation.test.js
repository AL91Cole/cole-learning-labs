import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { SCENARIOS } from '../src/scenarios.js';
import { initialHardwareState, applyHardwareAction, verifyHardware } from '../src/hardware.js';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function bindLab(s){');
const end = source.indexOf('\nfunction reportText(', start);
assert.ok(start >= 0 && end > start, 'Exercise the actual student lab bindings.');

class Element {
  constructor(dataset = {}) {
    this.dataset = dataset; this.hidden = false; this.value = ''; this.textContent = ''; this.innerHTML = '';
    this.attributes = new Map(); this.listeners = new Map(); this.children = new Map(); this.focused = 0;
    const classes = new Set();
    this.classList = {
      add: value => classes.add(value),
      contains: value => classes.has(value),
      toggle(value, force) { const enabled = force === undefined ? !classes.has(value) : Boolean(force); if (enabled) classes.add(value); else classes.delete(value); return enabled; }
    };
  }
  addEventListener(name, listener) { this.listeners.set(name, [...(this.listeners.get(name) || []), listener]); }
  fire(name) { for (const listener of this.listeners.get(name) || []) listener({ target: this }); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  querySelector(selector) { if (!this.children.has(selector)) this.children.set(selector, new Element()); return this.children.get(selector); }
  focus() { this.focused++; }
  scrollIntoView() {}
  close() {}
}

function harness() {
  const scenario = SCENARIOS.find(item => item.id === 'INC-101');
  const record = { questions: [], evidence: [], plan: '', notes: '', reflection: '', events: [], verified: false, closed: false, state: initialHardwareState(scenario.id) };
  const elements = new Map();
  for (const selector of ['#workspace','.lab-shell','.case-sidebar','.bench-column','.evidence-sidebar','#lab-step-title','#lab-step-help','#focus-toggle','.save-status','#action-count','#verify-result','#action-feedback','#bench-log','#clue-count','#question-response','#evidence-detail','#evidence-list','#plan','#notes','#reflection','#verify-task','#close-ticket','#reading-toggle','#saving-options','#work-privacy details','#report-button','#finish-report','#reset-ticket','#cancel-reset','#reset-confirm','#confirm-reset','#dialog-close','#lab-dialog']) elements.set(selector, new Element());
  const groups = new Map([
    ['[data-lab-step]', [1,2,3].map(step => new Element({labStep: String(step)}))],
    ['[data-go-step]', [2,1,3,2].map(step => new Element({goStep: String(step)}))],
    ['[data-finish-check]', ['clues','plan','notes','reflection','verified'].map(finishCheck => new Element({finishCheck}))],
    ['[data-question]', scenario.questions.map((_, index) => new Element({question: String(index)}))],
    ['[data-clue]', scenario.clues.map(clue => new Element({clue: clue.id}))]
  ]);
  const calls = { saved: 0, rendered: 0, reports: 0, notices: [] };
  let workspaceAction;
  const context = vm.createContext({
    scenario, record, applyHardwareAction, verifyHardware,
    $: selector => { assert.ok(elements.has(selector), 'Unexpected lab selector: ' + selector); return elements.get(selector); },
    $$: selector => { assert.ok(groups.has(selector), 'Unexpected lab control group: ' + selector); return groups.get(selector); },
    bindWorkPrivacy() {}, recordFor: () => record,
    workStatus: () => 'Private session',
    renderHardware(_root, _id, _state, action) { calls.rendered++; workspaceAction = action; },
    renderWorkspace() { throw new Error('Wrong workspace selected.'); },
    save() { calls.saved++; }, eventList: () => '', evidenceList: () => '',
    showNotice(message) { calls.notices.push(message); }, openReport() { calls.reports++; }, renderRoute() {},
    normalizeLabRecord: (_scenario, value) => value,
    attachClassroomLab: () => null,
    matchMedia: () => ({ matches: true }), Date
  });
  vm.runInContext('let labGuide={id:scenario.id,step:1,all:false},workStorage={},classroomConnection=null,classroomSharingPaused=true,storageKey="test",store={labs:{}};\n' + source.slice(start, end) + '\nbindLab(scenario); globalThis.guide=()=>labGuide;', context);
  return { record, context, calls, elements, groups,
    step(number) { groups.get('[data-lab-step]')[number - 1].fire('click'); },
    input(field, value) { const element = elements.get('#' + field); element.value = value; element.fire('input'); },
    action(...args) { workspaceAction(...args); },
    visible() { return ['.case-sidebar','.bench-column','.evidence-sidebar'].map(selector => !elements.get(selector).hidden); }
  };
}

test('moving between guided steps preserves the learner inputs and current workbench', () => {
  const h = harness();
  h.input('plan', 'The fictional cable may be connected to the wrong output.');
  h.step(2);
  h.step(3);
  h.input('notes', 'I inspected the connection and compared the available outputs.');
  h.input('reflection', 'Checking the signal path helps explain the symptom.');
  h.step(1);
  assert.equal(h.record.plan, h.elements.get('#plan').value);
  assert.equal(h.record.notes, h.elements.get('#notes').value);
  assert.equal(h.record.reflection, h.elements.get('#reflection').value);
  assert.equal(h.calls.rendered, 1, 'Step navigation must not recreate the workbench or reset unsaved controls.');
  assert.equal(h.calls.saved, 3);
  assert.deepEqual(h.visible(), [true,false,false]);
  assert.equal(h.elements.get('.case-sidebar').focused, 1);
});

test('show-all mode can return to the selected guided step without resetting work', () => {
  const h = harness();
  h.input('plan', 'A fictional explanation that stays on the current page.');
  h.step(2);
  const toggle = h.elements.get('#focus-toggle');
  toggle.fire('click');
  assert.deepEqual(h.visible(), [true,true,true]);
  assert.equal(toggle.getAttribute('aria-pressed'), 'true');
  toggle.fire('click');
  assert.deepEqual(h.visible(), [false,true,false]);
  assert.equal(h.groups.get('[data-lab-step]')[1].getAttribute('aria-pressed'), 'true');
  assert.ok(h.record.plan.includes('stays on the current page'));
  assert.equal(h.calls.rendered, 1);
});

test('unexpected step values cannot break navigation or leave every panel hidden', () => {
  const h = harness();
  const button = h.groups.get('[data-lab-step]')[0];
  for (const value of ['not-a-step','0','9','1.5','Infinity','-2']) {
    button.dataset.labStep = value;
    assert.doesNotThrow(() => button.fire('click'), 'Invalid navigation value: ' + value);
    assert.equal(h.visible().filter(Boolean).length, 1);
    assert.ok(Number.isInteger(h.context.guide().step));
  }
});

test('navigating straight to finish cannot mark an unresolved lab complete', () => {
  const h = harness();
  h.input('plan', 'A fictional initial explanation with enough detail.');
  h.input('notes', 'A fictional explanation of the actions taken so far.');
  h.input('reflection', 'A fictional reflection on what I learned from the clues.');
  h.groups.get('[data-clue]')[0].fire('click');
  h.groups.get('[data-clue]')[1].fire('click');
  h.step(3);
  h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed, false);
  assert.equal(h.record.verified, false);
  assert.equal(h.calls.reports, 0);
  assert.match(h.elements.get('#verify-result').textContent, /not ready yet/);
});

test('a completed task still needs the learner explanation and edits reopen a finished investigation', () => {
  const h = harness();
  h.action('video-gpu');
  h.action('open-document');
  h.step(3);
  h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed, false);
  assert.equal(h.calls.reports, 0);
  assert.equal(h.context.guide().step, 1, 'Missing clues or explanation should return the learner to their first step.');
  h.groups.get('[data-clue]')[0].fire('click');
  h.groups.get('[data-clue]')[1].fire('click');
  h.input('plan', 'The monitor signal may be connected to the wrong output.');
  h.input('notes', 'I moved the cable and opened the requested lesson document.');
  h.input('reflection', 'I learned to trace the signal path before replacing a part.');
  h.step(3);
  h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed, true);
  assert.equal(h.record.verified, true);
  assert.equal(h.calls.reports, 1);
  h.input('notes', '');
  assert.equal(h.record.closed, false, 'A changed explanation needs a new finish check.');
});
