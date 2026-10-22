import test from 'node:test';
import assert from 'node:assert/strict';
import { initialHardwareState, normalizeHardwareState, applyHardwareAction, verifyHardware, getHardwareReadouts } from '../src/hardware.js';
import { assemblyFailure } from '../src/assembly-model.js';
import { normalizeLabRecord } from '../src/records.js';
import { SCENARIOS } from '../src/scenarios.js';

// Exercise the public hardware boundary used by buttons, saved drafts and reports.
// Scene rendering is deliberately absent: graphics cannot grant a successful build.
const hardwareIds = SCENARIOS.filter(item => item.track === 'hardware').map(item => item.id);
function step(id, state, action, succeeds = true) {
  const before = structuredClone(state);
  const result = applyHardwareAction(id, state, action);
  assert.deepEqual(state, before, `${action} mutated its input snapshot`);
  if (succeeds) assert.notEqual(result.kind, 'warning', `${action}: ${result.message}`);
  return result;
}
function sequence(id, state, actions) {
  for (const action of actions) state = step(id, state, action).state;
  return state;
}
function detailed(id) {
  return step(id, initialHardwareState(id), 'enable-assembly').state;
}
const BUILD = [
  'asm-fit-psu', ...[0, 1, 2, 3].map(index => `asm-tighten-psu-${index}`),
  'install-board', ...[0, 1, 2, 3].map(index => `asm-tighten-board-${index}`),
  'install-cpu', 'asm-close-retention', 'asm-apply-paste', 'install-cooler',
  ...[0, 3, 1, 2].map(index => `asm-tighten-cooler-${index}`), 'asm-connect-cpu-fan',
  'install-ram', 'asm-close-ram-clips', 'install-gpu', 'asm-close-pcie-latch',
  'asm-tighten-gpu-0', 'asm-tighten-gpu-1', 'install-drive', 'asm-tighten-ssd-0', 'asm-tighten-ssd-1',
  'connect-atx', 'connect-cpu-power', 'connect-gpu-power', 'connect-sata', 'connect-sata-power', 'connect-front-panel',
  'asm-fit-panel', 'asm-tighten-panel-0', 'asm-tighten-panel-1', 'video-gpu', 'plug-in', 'boot'
];

test('entering the repair workbench enables detailed checks while preserving every ticket fault', () => {
  for (const id of hardwareIds) {
    const original = initialHardwareState(id);
    assert.equal(original.assemblyEnabled, false);
    assert.equal(original.assembly, null);
    const enabled = detailed(id);
    assert.equal(enabled.assemblyEnabled, true);
    assert.equal(enabled.assembly.version, 1);
    for (const key of Object.keys(original).filter(key => !['assemblyEnabled', 'assembly', 'actions'].includes(key))) {
      assert.deepEqual(enabled[key], original[key], `${id}: enabling assembly silently repaired ${key}`);
    }
    assert.equal(verifyHardware(id, enabled).ok, false);
  }
});

test('entering a completed legacy repair keeps its physical result, delivered task, and written report', () => {
  const scenario = SCENARIOS.find(item => item.id === 'INC-101');
  const repaired = sequence('INC-101', initialHardwareState('INC-101'), ['video-gpu', 'open-document']);
  assert.equal(verifyHardware('INC-101', repaired).ok, true);
  const enabled = step('INC-101', repaired, 'enable-assembly').state;
  assert.equal(enabled.documentOpened, true);
  assert.equal(enabled.booted, true);
  assert.equal(verifyHardware('INC-101', enabled).ok, true);
  for (const key of Object.keys(repaired).filter(key => !['assemblyEnabled', 'assembly', 'actions'].includes(key))) assert.deepEqual(enabled[key], repaired[key], key);
  const record = normalizeLabRecord(scenario, { state: enabled, plan: 'I traced the display signal.', notes: 'The GPU output restored the original lesson.', reflection: 'Both cable ends and the selected output matter.', verified: true });
  assert.equal(record.verified, true); assert.equal(record.notes, 'The GPU output restored the original lesson.');
});

test('re-entering the workbench never reinitializes disturbed paste, removed screws, or prior actions', () => {
  let state = sequence('INC-106', detailed('INC-106'), BUILD);
  state = sequence('INC-106', state, ['power-off', 'unplug', 'asm-loosen-panel-0', 'asm-loosen-panel-1', 'asm-remove-panel', 'asm-disconnect-cpu-fan', ...[2, 1, 3, 0].map(index => `asm-loosen-cooler-${index}`), 'asm-remove-cooler']);
  assert.equal(state.assembly.paste, 'dry');
  const snapshot = structuredClone(state);
  for (let entry = 0; entry < 3; entry++) state = step('INC-106', state, 'enable-assembly').state;
  assert.deepEqual(state, snapshot);
  assert.equal(state.assembly.panelInstalled, false);
  assert.deepEqual(state.assembly.coolerScrews, [false, false, false, false]);
  assert.equal(verifyHardware('INC-106', state).ok, false);
});

test('reading a saved ticket before the learner opens the workbench does not enable or repair equipment', () => {
  const scenario = SCENARIOS.find(item => item.id === 'INC-108');
  const original = initialHardwareState(scenario.id);
  const restored = normalizeLabRecord(scenario, { state: JSON.parse(JSON.stringify(original)), notes: 'I will trace the display cable.' });
  assert.deepEqual(restored.state, original);
  assert.equal(restored.state.assemblyEnabled, false);
  assert.equal(restored.state.signalConnected, false);
  assert.equal(restored.notes, 'I will trace the display cable.');
});

test('the existing install aliases cannot skip fasteners or thermal preparation in detailed mode', () => {
  let state = detailed('INC-106');
  state = step('INC-106', state, 'install-board').state;
  assert.deepEqual(state.assembly.boardScrews, [false, false, false, false]);
  const looseBoard = step('INC-106', state, 'install-cpu', false);
  assert.equal(looseBoard.kind, 'warning');
  assert.equal(looseBoard.state.cpuInstalled, false);
  assert.match(looseBoard.message, /screw|secure/i);
  state = sequence('INC-106', state, [0, 1, 2, 3].map(index => `asm-tighten-board-${index}`));
  state = sequence('INC-106', state, ['install-cpu', 'asm-close-retention']);
  const bareCpu = step('INC-106', state, 'install-cooler', false);
  assert.equal(bareCpu.kind, 'warning');
  assert.equal(bareCpu.state.coolerInstalled, false);
  assert.match(bareCpu.message, /paste/i);
  assert.equal(state.assembly.paste, 'clean');
});

test('a complete detailed build requires real startup and original-file delivery through the shared API', () => {
  const state = sequence('INC-106', detailed('INC-106'), BUILD);
  assert.equal(assemblyFailure(state, state.assembly), '');
  assert.equal(state.booted, true);
  assert.equal(state.originalDriveInstalled, true);
  assert.equal(state.documentOpened, false);
  assert.equal(verifyHardware('INC-106', state).ok, false);
  assert.equal(getHardwareReadouts('INC-106', state).display.value, 'Classroom desktop visible');
  const delivered = step('INC-106', state, 'open-document').state;
  assert.equal(verifyHardware('INC-106', delivered).ok, true);
  assert.equal(delivered.selectedDrive, 'sata');
});

test('removing and replacing a cooler disturbs paste and cannot be bypassed by the legacy install button', () => {
  let state = sequence('INC-106', detailed('INC-106'), BUILD);
  state = sequence('INC-106', state, [
    'open-document', 'power-off', 'unplug', 'asm-loosen-panel-0', 'asm-loosen-panel-1', 'asm-remove-panel',
    'asm-disconnect-cpu-fan', ...[2, 1, 3, 0].map(index => `asm-loosen-cooler-${index}`), 'asm-remove-cooler'
  ]);
  assert.equal(state.assembly.paste, 'dry');
  assert.equal(state.booted, false);
  assert.equal(state.documentOpened, false);
  state = step('INC-106', state, 'install-cooler').state;
  assert.equal(state.assembly.paste, 'dry', 'refitting cannot silently supply new paste');
  assert.match(assemblyFailure(state, state.assembly), /paste/i);
  state = sequence('INC-106', state, ['asm-remove-cooler', 'asm-clean-paste', 'asm-apply-paste', 'install-cooler']);
  assert.equal(state.assembly.paste, 'pea');
  assert.deepEqual(state.assembly.coolerScrews, [false, false, false, false]);
  assert.equal(state.assembly.cpuFanConnected, false);
});

test('saved mechanical faults revoke fabricated startup and document flags', () => {
  const working = sequence('INC-106', detailed('INC-106'), [...BUILD, 'open-document']);
  for (const broken of [
    { ...working.assembly, boardScrews: [false, true, true, true] },
    { ...working.assembly, coolerScrews: [true, false, true, true] },
    { ...working.assembly, paste: 'excess' },
    { ...working.assembly, cpuFanConnected: false },
    { ...working.assembly, panelInstalled: false },
    { ...working.assembly, retentionOpen: true },
    { version: 99 }
  ]) {
    const normalized = normalizeHardwareState('INC-106', { ...working, assembly: broken, booted: true, documentOpened: true });
    assert.equal(normalized.booted, false, JSON.stringify(broken));
    assert.equal(normalized.documentOpened, false);
    assert.equal(verifyHardware('INC-106', normalized).ok, false);
    assert.notEqual(getHardwareReadouts('INC-106', normalized).display.value, 'Original lesson file open');
  }
});

test('assembly drafts survive the normal lab-record boundary with bounded, public action history', () => {
  const scenario = SCENARIOS.find(item => item.id === 'INC-106');
  const state = sequence('INC-106', detailed('INC-106'), BUILD.slice(0, BUILD.indexOf('install-cooler')+1));
  const record = normalizeLabRecord(scenario, JSON.parse(JSON.stringify({ state, notes: 'My assembly observations.' })));
  assert.deepEqual(record.state.assembly, state.assembly);
  assert.equal(record.state.assemblyEnabled, true);
  assert.equal(record.notes, 'My assembly observations.');
  for (const action of ['asm-tighten-board-0', 'asm-close-retention', 'asm-apply-paste', 'install-cooler']) {
    assert.ok(record.state.actions.includes(action), `historical action missing after normalization: ${action}`);
  }
  const malicious = normalizeHardwareState('INC-106', {
    ...state, studentEmail: 'unused@example.test',
    assembly: { ...state.assembly, paste: '<img src=x onerror=payload()>', studentId: 'private', constructor: { polluted: true } },
    actions: [...Array(300).fill('asm-tighten-board-0'), 'fetch-student-roster', '<script>payload()</script>']
  });
  assert.equal(malicious.actions.length, 250);
  assert.equal(Object.hasOwn(malicious, 'studentEmail'), false);
  assert.equal(Object.hasOwn(malicious.assembly, 'studentId'), false);
  assert.equal(Object.hasOwn(malicious.assembly, 'constructor'), false);
  assert.equal(malicious.assembly.paste, 'clean');
  assert.ok(!malicious.actions.includes('fetch-student-roster'));
});

test('detailed controls preserve the power interlock, including legacy aliases', () => {
  const initial = detailed('INC-101');
  for (const state of [initial, step('INC-101', initial, 'power-off').state]) {
    for (const action of ['asm-loosen-panel-0', 'asm-disconnect-cpu-fan', 'asm-clean-paste', 'unseat-ram', 'disconnect-sata']) {
      const blocked = step('INC-101', state, action, false);
      assert.equal(blocked.kind, 'warning', action);
      assert.deepEqual(blocked.state, state, action);
    }
  }
});

test('detailed monitor connections preserve a healthy running OS and require fresh task delivery', () => {
  let state = detailed('INC-108');
  assert.equal(state.booted, true);
  state = step('INC-108', state, 'asm-connect-display').state;
  assert.equal(state.booted, true);
  assert.equal(verifyHardware('INC-108', state).ok, false, 'A fitted cable does not correct the monitor source.');
  state = step('INC-108', state, 'input-hdmi').state;
  state = step('INC-108', state, 'open-document').state;
  assert.equal(verifyHardware('INC-108', state).ok, true);
  state = step('INC-108', state, 'asm-disconnect-display').state;
  assert.equal(state.pcOn, true);
  assert.equal(state.booted, true);
  assert.equal(state.documentOpened, false);
  assert.equal(verifyHardware('INC-108', state).ok, false);
  state = step('INC-108', state, 'asm-connect-display').state;
  assert.equal(state.booted, true);
  assert.equal(state.documentOpened, false);
  assert.equal(getHardwareReadouts('INC-108', state).display.value, 'Classroom desktop visible');
});
