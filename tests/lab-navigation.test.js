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
    this.attributes = new Map(); this.listeners = new Map(); this.children = new Map(); this.focused = 0; this.scrolled = [];
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
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  querySelector(selector) { if (!this.children.has(selector)) this.children.set(selector, new Element()); return this.children.get(selector); }
  focus() { this.focused++; }
  scrollIntoView(options) { this.scrolled.push(options); }
  close() {}
}

function harness() {
  const scenario = SCENARIOS.find(item => item.id === 'INC-101');
  const record = { questions: [], evidence: [], plan: '', notes: '', reflection: '', events: [], verified: false, closed: false, state: initialHardwareState(scenario.id) };
  const elements = new Map();
  for (const selector of ['#workspace','.lab-shell','.save-status','#action-count','#verify-result','#action-feedback','#bench-log','#clue-count','#question-response','#evidence-detail','#evidence-list','#plan','#notes','#reflection','#verify-task','#close-ticket','#reading-toggle','#saving-options','#work-privacy details','#report-button','#finish-report','#reset-ticket','#cancel-reset','#reset-confirm','#confirm-reset','#dialog-close','#lab-dialog']) elements.set(selector, new Element());
  for (const [className, id] of [['.case-sidebar','#lab-problem'],['.bench-column','#lab-workbench'],['.evidence-sidebar','#lab-finish']]) {
    const panel = new Element();
    elements.set(className, panel); elements.set(id, panel);
  }
  const groups = new Map([
    ['[data-lab-section]', [1,2,3].map(section => new Element({labSection: String(section)}))],
    ['[data-jump-section]', [2,1,3,2].map(section => new Element({jumpSection: String(section)}))],
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
  vm.runInContext('let workStorage={},classroomConnection=null,classroomSharingPaused=true,storageKey="test",store={labs:{}};\n' + source.slice(start, end) + '\nbindLab(scenario);', context);
  return { record, context, calls, elements, groups,
    section(number) { groups.get('[data-lab-section]')[number - 1].fire('click'); },
    input(field, value) { const element = elements.get('#' + field); element.value = value; element.fire('input'); },
    action(...args) { workspaceAction(...args); },
    visible() { return ['.case-sidebar','.bench-column','.evidence-sidebar'].map(selector => !elements.get(selector).hidden); }
  };
}

test('all lab sections remain visible while jump navigation preserves learner work', () => {
  const h = harness();
  assert.deepEqual(h.visible(), [true,true,true]);
  h.input('plan', 'The fictional cable may be connected to the wrong output.');
  h.section(2);
  h.section(3);
  h.input('notes', 'I inspected the connection and compared the available outputs.');
  h.input('reflection', 'Checking the signal path helps explain the symptom.');
  h.section(1);
  assert.equal(h.record.plan, h.elements.get('#plan').value);
  assert.equal(h.record.notes, h.elements.get('#notes').value);
  assert.equal(h.record.reflection, h.elements.get('#reflection').value);
  assert.equal(h.calls.rendered, 1, 'Section navigation must not recreate the workbench or reset its controls.');
  assert.equal(h.calls.saved, 3, 'Jumping to another section must not save, reset, or change the learner record.');
  assert.deepEqual(h.visible(), [true,true,true]);
  for (const selector of ['.case-sidebar','.bench-column','.evidence-sidebar']) {
    assert.equal(h.elements.get(selector).focused, 1);
    assert.equal(h.elements.get(selector).scrolled.length, 1);
  }
  assert.equal(h.groups.get('[data-lab-section]')[0].getAttribute('aria-current'), 'location');
});

test('in-page Continue and Back controls scroll to the requested section without replacing the workbench', () => {
  const h = harness();
  h.input('plan', 'A fictional explanation that stays on the current page.');
  for (const button of h.groups.get('[data-jump-section]')) {
    button.fire('click');
    assert.deepEqual(h.visible(), [true,true,true]);
  }
  assert.equal(h.elements.get('.bench-column').focused, 2);
  assert.equal(h.elements.get('.case-sidebar').focused, 1);
  assert.equal(h.elements.get('.evidence-sidebar').focused, 1);
  assert.ok(h.record.plan.includes('stays on the current page'));
  assert.equal(h.calls.rendered, 1);
  assert.equal(h.calls.saved, 1);
});

test('unexpected section values cannot hide a section or discard current work', () => {
  const h = harness();
  h.input('plan', 'This fictional work must survive an invalid navigation value.');
  const button = h.groups.get('[data-lab-section]')[0];
  for (const value of ['not-a-section','0','9','1.5','Infinity','-2']) {
    button.dataset.labSection = value;
    assert.doesNotThrow(() => button.fire('click'), 'Invalid navigation value: ' + value);
    assert.deepEqual(h.visible(), [true,true,true]);
    assert.equal(h.record.plan, h.elements.get('#plan').value);
    assert.equal(h.calls.rendered, 1);
  }
});

test('jumping straight to finish cannot mark an unresolved lab complete', () => {
  const h = harness();
  h.input('plan', 'A fictional initial explanation with enough detail.');
  h.input('notes', 'A fictional explanation of the actions taken so far.');
  h.input('reflection', 'A fictional reflection on what I learned from the clues.');
  h.groups.get('[data-clue]')[0].fire('click');
  h.groups.get('[data-clue]')[1].fire('click');
  h.section(3);
  h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed, false);
  assert.equal(h.record.verified, false);
  assert.equal(h.calls.reports, 0);
  assert.match(h.elements.get('#verify-result').textContent, /not ready yet/);
  assert.deepEqual(h.visible(), [true,true,true]);
});

test('a completed task still needs the learner explanation and edits reopen a finished investigation', () => {
  const h = harness();
  h.action('video-gpu');
  h.action('open-document');
  h.section(3);
  h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed, false);
  assert.equal(h.calls.reports, 0);
  assert.equal(h.elements.get('.case-sidebar').focused, 1, 'Missing clues or explanation should bring the relevant section into view.');
  assert.deepEqual(h.visible(), [true,true,true]);
  h.groups.get('[data-clue]')[0].fire('click');
  h.groups.get('[data-clue]')[1].fire('click');
  h.input('plan', 'The monitor signal may be connected to the wrong output.');
  h.input('notes', 'I moved the cable and opened the requested lesson document.');
  h.input('reflection', 'I learned to trace the signal path before replacing a part.');
  h.section(3);
  h.elements.get('#close-ticket').fire('click');
  assert.equal(h.record.closed, true);
  assert.equal(h.record.verified, true);
  assert.equal(h.calls.reports, 1);
  h.input('notes', '');
  assert.equal(h.record.closed, false, 'A changed explanation needs a new finish check.');
});

test('every lab renders its problem, interactive workspace, and finish controls together', () => {
  const renderStart = source.indexOf('function labPage(s){');
  const renderEnd = source.indexOf('\nfunction evidenceList(', renderStart);
  assert.ok(renderStart >= 0 && renderEnd > renderStart);
  const context = vm.createContext({
    currentLab: null,
    workStorage: {},
    recordFor: () => ({ questions: [], evidence: [], plan: '', notes: '', reflection: '', events: [], verified: false, closed: false }),
    tracks: Object.fromEntries(SCENARIOS.map(scenario => [scenario.track, {name: scenario.track}])),
    esc: value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
    eventList: () => '', evidenceList: () => '', workStatus: () => 'Private session'
  });
  vm.runInContext(source.slice(renderStart, renderEnd), context);
  for (const scenario of SCENARIOS) {
    const html = context.labPage(scenario);
    for (const id of ['lab-problem','lab-workbench','lab-finish']) {
      const matches = html.match(new RegExp('<(?:aside|section|div)\\b[^>]*\\bid="' + id + '"[^>]*>', 'g')) || [];
      assert.equal(matches.length, 1, scenario.id + ' must include one ' + id + ' section.');
      assert.doesNotMatch(matches[0], /\bhidden(?:\s|=|>)/, scenario.id + ' must not require switching modes to reveal ' + id + '.');
      assert.doesNotMatch(matches[0], /\baria-hidden="true"/);
    }
    for (const id of ['plan','workspace','notes','reflection','verify-task','close-ticket']) {
      assert.equal((html.match(new RegExp('\\bid="' + id + '"', 'g')) || []).length, 1, scenario.id + ' must include its ' + id + ' control on the page.');
    }
    assert.equal((html.match(/\bdata-lab-section="/g) || []).length, 3);
    assert.doesNotMatch(html, /id="focus-toggle"|Show all steps|One step at a time/);
  }
});
