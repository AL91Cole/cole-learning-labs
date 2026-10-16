import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/scenarios.js';
import { initialHardwareState, applyHardwareAction, renderHardware, verifyHardware } from '../src/hardware.js';
import { initialWorkspaceState, applyWorkspaceAction, getWorkspaceMission, verifyWorkspace } from '../src/workspaces.js';

// Capture the view boundary without a browser. Physical layout, focus, and native
// details interaction remain browser QA; rendering must never change learner work.
function hardwareView(id, state) {
  let dispatched = 0;
  const root = {
    ownerDocument: { activeElement: null },
    contains: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
    innerHTML: ''
  };
  const before = structuredClone(state);
  renderHardware(root, id, state, () => { dispatched += 1; });
  assert.deepEqual(state, before, 'Rendering changed the saved hardware state');
  assert.equal(dispatched, 0, 'Rendering dispatched a repair action');
  const progress = root.innerHTML.match(/<progress value="(\d+)" max="3"/);
  assert.ok(progress, 'The hardware mission must expose a labeled progress indicator');
  return { html: root.innerHTML, completed: Number(progress[1]) };
}

const hardwareStep = (state, action) => applyHardwareAction(state.caseId, state, action).state;
const workingNetwork = { ip: '10.24.8.25', mask: '255.255.255.0', gateway: '10.24.8.1', dns: '10.24.8.53' };

for (const scenario of SCENARIOS.filter(item => item.track !== 'hardware')) {
  test(`${scenario.id}: reading progressive hints cannot pass an untested mission`, () => {
    const state = initialWorkspaceState(scenario.id);
    const before = structuredClone(state);
    const mission = getWorkspaceMission(scenario.id, state);
    for (const hint of mission.hints) {
      assert.equal(typeof hint, 'string');
      assert.ok(hint.length > 20);
    }
    assert.deepEqual(state, before);
    assert.equal(mission.tested, false);
    assert.equal(mission.passed, 0);
    assert.equal(mission.complete, false);
    assert.equal(verifyWorkspace(scenario.id, state).ok, false);
  });
}

test('workspace progress requires a fresh test and is revoked after an edit', () => {
  let state = initialWorkspaceState('NET-201');
  state = applyWorkspaceAction('NET-201', state, 'save-network', workingNetwork).state;
  let mission = getWorkspaceMission('NET-201', state);
  assert.equal(mission.stage, 'Ready to test');
  assert.equal(mission.passed, 0);
  assert.equal(mission.complete, false);

  state = applyWorkspaceAction('NET-201', state, 'run-check').state;
  mission = getWorkspaceMission('NET-201', state);
  assert.equal(mission.passed, mission.total);
  assert.equal(mission.complete, true);
  assert.equal(mission.attempts, 1);

  state = applyWorkspaceAction('NET-201', state, 'save-network', { ...workingNetwork, dns: '192.168.1.53' }).state;
  mission = getWorkspaceMission('NET-201', state);
  assert.equal(mission.tested, false);
  assert.equal(mission.passed, 0);
  assert.equal(mission.complete, false);
  assert.equal(mission.attempts, 1);

  state = applyWorkspaceAction('NET-201', state, 'run-check').state;
  mission = getWorkspaceMission('NET-201', state);
  assert.equal(mission.passed, 2);
  assert.equal(mission.currentCheck, 2);
  assert.equal(mission.complete, false);
  assert.equal(mission.attempts, 2);
});

test('workspace mission recomputes current conditions instead of trusting stale saved result labels', () => {
  const state = {
    ...initialWorkspaceState('NET-201'),
    tested: true,
    results: [{ ok: true, label: 'A stale result claimed success' }]
  };
  const mission = getWorkspaceMission('NET-201', state);
  assert.equal(mission.passed, 0);
  assert.equal(mission.total, 3);
  assert.equal(mission.complete, false);
  assert.equal(verifyWorkspace('NET-201', state).ok, false);
});

test('pre-coach saved workspace states remain usable without new counters', () => {
  let state = { ...initialWorkspaceState('NET-201'), ...workingNetwork };
  delete state.workspaceEdits;
  delete state.checkRuns;
  const before = structuredClone(state);
  const mission = getWorkspaceMission('NET-201', state);
  assert.deepEqual(state, before, 'Read-only compatibility defaults were written to the save');
  assert.equal(mission.attempts, 0);
  assert.equal(mission.complete, false);

  state = applyWorkspaceAction('NET-201', state, 'run-check').state;
  assert.equal(getWorkspaceMission('NET-201', state).complete, true);
  assert.equal(state.checkRuns, 1);
  assert.equal(state.workspaceEdits, 0);
});

test('every initial hardware fault starts with zero mission checkpoints; rendering hints changes nothing', () => {
  for (const scenario of SCENARIOS.filter(item => item.track === 'hardware')) {
    const state = initialHardwareState(scenario.id);
    const view = hardwareView(scenario.id, state);
    assert.equal(view.completed, 0, scenario.id);
    assert.match(view.html, /Need a nudge\? Open the coach/);
    assert.match(view.html, /Show a more specific hint/);
    assert.match(view.html, /Show the next move/);
    assert.equal(verifyHardware(scenario.id, state).ok, false);
  }
});

test('blocked internal repairs earn no checkpoint and the coach follows both safety conditions', () => {
  let state = initialHardwareState('INC-103');
  let view = hardwareView('INC-103', state);
  assert.match(view.html, /Power off the virtual PC/);

  const blocked = applyHardwareAction('INC-103', state, 'seat-ram');
  assert.equal(blocked.kind, 'warning');
  assert.equal(hardwareView('INC-103', blocked.state).completed, 0);
  assert.equal(blocked.state.ramSeated, false);

  state = hardwareStep(state, 'power-off');
  view = hardwareView('INC-103', state);
  assert.equal(view.completed, 0);
  assert.match(view.html, /Disconnect the virtual AC cord/);
  assert.equal(applyHardwareAction('INC-103', state, 'seat-ram').state.ramSeated, false);

  state = hardwareStep(state, 'unplug');
  view = hardwareView('INC-103', state);
  assert.equal(view.completed, 0);
  assert.match(view.html, /Reseat the DDR4 memory/);
});

test('hardware checkpoints distinguish correction, startup, and original-task delivery, and can regress', () => {
  let state = initialHardwareState('INC-103');
  for (const action of ['power-off', 'unplug', 'seat-ram']) state = hardwareStep(state, action);
  assert.equal(hardwareView('INC-103', state).completed, 1);
  assert.equal(verifyHardware('INC-103', state).ok, false);

  for (const action of ['plug-in', 'boot']) state = hardwareStep(state, action);
  assert.equal(hardwareView('INC-103', state).completed, 2);
  assert.equal(verifyHardware('INC-103', state).ok, false);

  state = hardwareStep(state, 'open-document');
  assert.equal(hardwareView('INC-103', state).completed, 3);
  assert.equal(verifyHardware('INC-103', state).ok, true);

  state = hardwareStep(state, 'close-document');
  assert.equal(hardwareView('INC-103', state).completed, 2);
  assert.equal(verifyHardware('INC-103', state).ok, false);

  for (const action of ['power-off', 'unplug', 'unseat-ram']) state = hardwareStep(state, action);
  assert.equal(hardwareView('INC-103', state).completed, 0);
});

test('assembly progress does not award a correction checkpoint for unfitted parts or a missing display route', () => {
  let state = initialHardwareState('INC-106');
  const actions = ['install-board', 'install-cpu', 'install-cooler', 'install-ram', 'install-gpu', 'install-drive', 'connect-atx', 'connect-cpu-power', 'connect-gpu-power', 'connect-sata', 'connect-sata-power', 'connect-front-panel'];
  for (const action of actions) {
    state = hardwareStep(state, action);
    assert.equal(hardwareView('INC-106', state).completed, 0);
  }
  state = hardwareStep(state, 'video-gpu');
  assert.equal(hardwareView('INC-106', state).completed, 1);
});
