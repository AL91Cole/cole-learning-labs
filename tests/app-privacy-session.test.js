import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createWorkStorage, CLEAR_WORK_KEY, WORK_PREFIX } from '../src/local-work.js';
import { SCENARIOS } from '../src/scenarios.js';
import { normalizeLabRecord } from '../src/records.js';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const production = ['save', 'resetLocalSession', 'bindWorkPrivacy', 'recordFor'].map(name => {
  const line = source.match(new RegExp(`^function ${name}\\([^\\n]*$`, 'm'))?.[0];
  assert.ok(line, `The actual ${name} handler must be available for lifecycle testing.`);
  return line;
});
const storageListener = source.match(/^window\.addEventListener\('storage',[^\n]*$/m)?.[0];
assert.ok(storageListener, 'The actual cross-tab clear handler must be exercised.');
const ACTIVE_KEY = 'cole-learning-labs:classroom:v1';
const classId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const studentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const classroomKey = `${WORK_PREFIX}:classroom:${classId}:${studentId}`;
const record = notes => ({ version: 2, labs: { 'INC-101': { notes, plan: '', reflection: '', verified: false, closed: false } } });

class DeviceStorage {
  data = new Map();
  failRemoval = false;
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { if (this.failRemoval) throw new Error('Synthetic device deletion denial.'); this.data.delete(key); }
}

function harness() {
  const storage = new DeviceStorage();
  const initialStore = record('Earlier fictional classroom draft.');
  const events = new Map(), notices = [], calls = { disposed: 0, scheduled: 0, rendered: 0 };
  const status = { textContent: '' };
  let mounted;
  const context = vm.createContext({
    SCENARIOS, normalizeLabRecord, createWorkStorage, CLEAR_WORK_KEY, WORK_PREFIX, deviceStorage: storage,
    initialKey: classroomKey, initialStore,
    initialConnection: { dispose() { calls.disposed++; }, schedule() { calls.scheduled++; } },
    window: { addEventListener(name, listener) { events.set(name, listener); } },
    $: selector => selector === '#work-privacy' ? {} : selector === '.save-status' ? status : null,
    workStatus: currentRecord => currentRecord.notes || '',
    mountWorkControls(options) { mounted = options; },
    renderRoute() { calls.rendered++; }, showNotice(message) { notices.push(message); }
  });
  // Use the production lifecycle functions with the real storage manager. Only
  // rendering and the mount boundary are replaced; persistence is not simulated.
  vm.runInContext(`
    let storageKey=initialKey, store=initialStore, classroomSharingPaused=false, labView={id:'INC-101',section:2};
    let classroomConnection=initialConnection, storageAvailable=true;
    let workStorage=createWorkStorage({storage:deviceStorage,key:storageKey,scenarios:SCENARIOS});
    ${production.join('\n')}
    ${storageListener}
    globalThis.sessionState=()=>({storageKey,store,manager:workStorage,classroomSharingPaused,classroomConnection,storageAvailable});
    globalThis.setCurrentWork=value=>{store=value;};
    globalThis.saveCurrentWork=save;
    globalThis.mountPrivacy=()=>bindWorkPrivacy(SCENARIOS.find(s=>s.id==='INC-101'));
    globalThis.boundWork=recordFor(SCENARIOS.find(s=>s.id==='INC-101'));
  `, context);
  const originalManager = context.sessionState().manager;
  assert.equal(originalManager.enable(initialStore), true);
  storage.setItem(ACTIVE_KEY, JSON.stringify({ classId, studentId }));
  storage.setItem(WORK_PREFIX, JSON.stringify(record('Earlier fictional independent draft.')));
  storage.setItem('unrelated-browser-setting', 'keep');
  context.mountPrivacy();
  return { storage, context, events, notices, calls, status, originalManager, get mounted() { return mounted; }, state: () => context.sessionState() };
}

function assertReset(h) {
  const state = h.state();
  assert.equal(state.storageKey, WORK_PREFIX);
  assert.equal(state.manager.persistent, false);
  assert.notEqual(state.manager, h.originalManager);
  assert.equal(h.originalManager.persistent, false);
  assert.equal(state.classroomSharingPaused, true);
  assert.equal(state.classroomConnection, null);
  assert.deepEqual(JSON.parse(JSON.stringify(state.store)), { version: 2, labs: {} });
  assert.equal(h.calls.disposed, 1); assert.equal(h.calls.rendered, 1);
}

function saveAndResumeIndependent(h) {
  const next = record('New fictional independent work after clearing.');
  h.context.setCurrentWork(next);
  assert.equal(h.state().manager.enable(next), true);
  h.context.saveCurrentWork();
  const reloaded = createWorkStorage({ storage: h.storage, key: WORK_PREFIX, scenarios: SCENARIOS });
  const restored = reloaded.resume();
  assert.equal(restored.labs['INC-101'].notes, next.labs['INC-101'].notes);
  assert.equal(reloaded.persistent, true);
  assert.equal(h.calls.scheduled, 0, 'Saving after clearing must not schedule classroom uploads.');
  return restored;
}

test('clearing a classroom-scoped page starts a new independent saving scope that survives reload', () => {
  const h = harness();
  const cleared = h.mounted.manager.clearAll();
  assert.equal(cleared, true);
  h.mounted.onClear(cleared);
  assertReset(h);
  assert.equal(h.storage.getItem(classroomKey), null);
  assert.equal(h.storage.getItem(ACTIVE_KEY), null);
  assert.equal(h.storage.getItem(WORK_PREFIX), null);
  assert.ok(h.storage.getItem(CLEAR_WORK_KEY));
  assert.equal(h.storage.getItem('unrelated-browser-setting'), 'keep');
  saveAndResumeIndependent(h);
  assert.equal(h.storage.getItem(classroomKey), null, 'The prior classroom namespace must never be recreated.');
  assert.equal(h.storage.getItem(ACTIVE_KEY), null);
  assert.match(h.notices.at(-1), /Local lab data cleared/);
});

test('the production cross-tab clear handler pauses old classroom sharing and changes later saves to independent work', () => {
  const h = harness();
  const oldManager = h.state().manager;
  const remoteTab = createWorkStorage({ storage: h.storage, key: classroomKey, scenarios: SCENARIOS });
  assert.equal(remoteTab.clearAll(), true);
  h.events.get('storage')({ key: CLEAR_WORK_KEY, newValue: h.storage.getItem(CLEAR_WORK_KEY) });
  assertReset(h);
  assert.notEqual(h.state().manager, oldManager);
  saveAndResumeIndependent(h);
  assert.equal(h.storage.getItem(classroomKey), null);
  assert.equal(h.storage.getItem(ACTIVE_KEY), null);
  assert.match(h.notices.at(-1), /cleared in another tab/);
});

test('failed device deletion still clears page memory and stops sharing without reviving the previous classroom scope', () => {
  const h = harness();
  const oldDraft = h.storage.getItem(classroomKey);
  h.storage.failRemoval = true;
  const cleared = h.mounted.manager.clearAll();
  assert.equal(cleared, false);
  h.mounted.onClear(cleared);
  assertReset(h);
  assert.match(h.notices.at(-1), /device deletion could not be confirmed/);
  h.context.setCurrentWork(record('New private work before choosing device saving.'));
  h.context.saveCurrentWork();
  assert.equal(h.storage.getItem(classroomKey), oldDraft, 'A failed deletion must not be represented as successful erasure or overwrite the old classroom draft.');
  assert.equal(h.calls.scheduled, 0);
  saveAndResumeIndependent(h);
  assert.equal(h.storage.getItem(classroomKey), oldDraft, 'Explicit new independent saving must not resume the previous classroom scope.');
  assert.equal(h.state().classroomSharingPaused, true);
});

test('unrelated storage notifications do not reset active work or stop its current session', () => {
  const h = harness();
  for (const event of [{ key: 'unrelated-browser-setting', newValue: 'changed' }, { key: CLEAR_WORK_KEY, newValue: null }]) h.events.get('storage')(event);
  assert.equal(h.state().storageKey, classroomKey);
  assert.equal(h.state().manager, h.originalManager);
  assert.equal(h.state().classroomSharingPaused, false);
  assert.equal(h.state().manager.persistent, true);
  assert.equal(h.calls.disposed, 0); assert.equal(h.calls.rendered, 0);
  assert.equal(h.notices.length, 0);
});

test('saving-mode changes keep the same live bound record and persist later learner edits', () => {
  const h = harness();
  const bound = h.context.boundWork;
  assert.equal(h.state().store.labs['INC-101'],bound);
  bound.notes = 'A fictional observation before pausing device saving.';
  h.context.saveCurrentWork();
  const previousSaved = h.storage.getItem(classroomKey);
  h.state().manager.pause(); h.mounted.onChange();
  assert.equal(h.state().store.labs['INC-101'],bound,'Updating the privacy controls must not normalize into a replacement object and orphan the live lab bindings.');
  assert.equal(h.status.textContent,bound.notes);
  bound.notes = 'A fictional observation made while saving is paused.';
  h.context.saveCurrentWork();
  assert.equal(h.storage.getItem(classroomKey),previousSaved,'Private edits must not silently update the previous saved copy.');
  assert.equal(h.state().manager.enable(h.state().store),true);
  h.mounted.onChange();
  assert.equal(h.state().store.labs['INC-101'],bound);
  bound.notes = 'A later fictional edit after device saving was explicitly enabled again.';
  h.context.saveCurrentWork();
  assert.equal(JSON.parse(h.storage.getItem(classroomKey)).labs['INC-101'].notes,bound.notes);
  assert.equal(h.calls.rendered,0,'Saving-mode changes must preserve the current mounted lab.');
});
