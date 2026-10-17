import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from '../src/assembly-cables.js';
import { initialHardwareState, normalizeHardwareState, applyHardwareAction, verifyHardware, getHardwareReadouts, renderHardware } from '../src/hardware.js';
import { initialAssemblyState, applyAssemblyAction } from '../src/assembly-model.js';
import { normalizeLabRecord } from '../src/records.js';
import { SCENARIOS } from '../src/scenarios.js';

const step = (state, action) => applyHardwareAction(state.caseId, state, action);
const detailed = id => step(initialHardwareState(id), 'enable-assembly').state;
const connected = () => { const h = initialHardwareState('INC-108'); h.signalConnected = true; return { h, a: initialAssemblyState(h) }; };
const expectedActions = {
  ac: ['plug-in', 'unplug'], 'hdmi-pc': ['video-gpu', 'disconnect-video'], 'hdmi-monitor': ['connect-signal', 'disconnect-signal'],
  atx: ['asm-connect-atx', 'asm-disconnect-atx'], eps: ['asm-connect-eps', 'asm-disconnect-eps'],
  'gpu-power': ['asm-connect-gpu-power', 'asm-disconnect-gpu-power'], 'sata-data': ['asm-connect-sata-data', 'asm-disconnect-sata-data'],
  'sata-power': ['asm-connect-sata-power', 'asm-disconnect-sata-power'], 'front-panel': ['asm-connect-front-panel', 'asm-disconnect-front-panel'],
  'cpu-fan': ['asm-connect-cpu-fan', 'asm-disconnect-cpu-fan']
};
const flags = { ac: 'acConnected', 'hdmi-pc': 'pcVideoConnected', 'hdmi-monitor': 'signalConnected', atx: 'atxConnected', eps: 'cpuPowerConnected', 'gpu-power': 'gpuPowerConnected', 'sata-data': 'sataDataConnected', 'sata-power': 'sataPowerConnected', 'front-panel': 'frontPanelConnected', 'cpu-fan': 'cpuFanConnected' };

test('ten immutable authored cables expose only their fixed connector sockets', () => {
  assert.deepEqual(ASSEMBLY_CABLES.map(item => item.id), Object.keys(expectedActions));
  assert.equal(Object.isFrozen(ASSEMBLY_CABLES), true);
  const sockets = [];
  for (const cable of ASSEMBLY_CABLES) {
    assert.equal(Object.isFrozen(cable), true); assert.equal(Object.isFrozen(cable.sockets), true);
    assert.equal(cable.internal, !['ac', 'hdmi-pc', 'hdmi-monitor'].includes(cable.id));
    for (const socket of cable.sockets) { assert.equal(Object.isFrozen(socket), true); sockets.push(socket.id); }
  }
  assert.deepEqual(sockets, ['ac-inlet', 'hdmi-gpu', 'hdmi-board', 'monitor-hdmi', 'atx-header', 'eps-header', 'gpu-power-header', 'ssd-data', 'ssd-power', 'front-panel-header', 'cpu-fan-header']);
});

test('each cable proposes the correct connect/disconnect actions and rejects unchanged placement', () => {
  const { h, a } = connected();
  const before = structuredClone({ h, a });
  for (const cable of ASSEMBLY_CABLES) {
    const socket = cable.sockets[0].id;
    assert.equal(cableConnection(h, a, cable.id), socket, cable.id);
    assert.equal(assemblyCableAction(h, a, cable.id, socket).action, null);
    assert.equal(assemblyCableAction(h, a, cable.id, 'cable-rest').action, expectedActions[cable.id][1]);
    const looseH = { ...h }, looseA = { ...a };
    (cable.id === 'cpu-fan' ? looseA : looseH)[flags[cable.id]] = false;
    assert.equal(cableConnection(looseH, looseA, cable.id), null);
    assert.equal(assemblyCableAction(looseH, looseA, cable.id, socket).action, expectedActions[cable.id][0]);
    assert.equal(assemblyCableAction(looseH, looseA, cable.id, 'cable-rest').action, null);
  }
  assert.deepEqual({ h, a }, before);
  assert.equal(assemblyCableAction(h, a, 'hdmi-pc', 'hdmi-board').action, 'video-board');
});

test('wrong sockets, forged IDs, and foreign destinations never produce commands', () => {
  const { h, a } = connected();
  const sockets = ASSEMBLY_CABLES.flatMap(cable => cable.sockets.map(socket => socket.id));
  for (const cable of ASSEMBLY_CABLES) for (const socket of sockets.filter(socket => !cable.sockets.some(allowed => allowed.id === socket))) assert.equal(assemblyCableAction(h, a, cable.id, socket).action, null, `${cable.id} -> ${socket}`);
  for (const id of ['constructor', '__proto__', 'acConnected', 'hdmi', 'storage', '<script>', {}, null]) {
    assert.equal(cableConnection(h, a, id), null); assert.equal(assemblyCableAction(h, a, id, 'cable-rest').action, null);
  }
  for (const destination of ['tray', 'case', 'asm-connect-atx', 'https://example.test', {}, null, undefined]) assert.equal(assemblyCableAction(h, a, 'atx', destination).action, null);
});

test('connector state uses own strict booleans, with only absent legacy PC-end data migrated', () => {
  const { h, a } = connected();
  const old = { ...h }; delete old.pcVideoConnected;
  assert.equal(cableConnection(old, a, 'hdmi-pc'), 'hdmi-gpu');
  for (const bad of ['true', 1, null, false]) assert.equal(cableConnection({ ...h, pcVideoConnected: bad }, a, 'hdmi-pc'), null);
  assert.equal(cableConnection({ ...h, atxConnected: 'true' }, a, 'atx'), null);
  assert.equal(cableConnection(Object.create({ acConnected: true }), a, 'ac'), null);
  const getters = {}; Object.defineProperty(getters, 'acConnected', { get() { throw Error('do not execute'); } });
  assert.equal(cableConnection(getters, a, 'ac'), null);
  assert.equal(cableConnection(h, { cpuFanConnected: 'true' }, 'cpu-fan'), null);
});

test('PC and monitor HDMI ends change independently while the original operating system keeps running', () => {
  let state = step(initialHardwareState('INC-108'), 'connect-signal').state;
  state = step(state, 'open-document').state;
  assert.equal(verifyHardware(state.caseId, state).ok, true);
  const bootCount = state.bootCount;
  state = step(state, assemblyCableAction(state, null, 'hdmi-pc', 'cable-rest').action).state;
  assert.equal(state.pcVideoConnected, false); assert.equal(state.signalConnected, true);
  assert.equal(state.booted, true); assert.equal(state.pcOn, true); assert.equal(state.documentOpened, false);
  assert.equal(verifyHardware(state.caseId, state).ok, false);
  assert.equal(getHardwareReadouts(state.caseId, state).display.value, 'PC cable disconnected');
  state = step(state, 'disconnect-signal').state;
  state = step(state, 'video-gpu').state;
  assert.equal(state.pcVideoConnected, true); assert.equal(state.signalConnected, false); assert.equal(state.booted, true);
  assert.equal(verifyHardware(state.caseId, state).ok, false);
  state = step(state, 'connect-signal').state;
  assert.equal(getHardwareReadouts(state.caseId, state).display.value, 'Classroom desktop visible');
  assert.equal(state.bootCount, bootCount); assert.equal(state.documentOpened, false);
  state = step(state, 'open-document').state;
  assert.equal(verifyHardware(state.caseId, state).ok, true);
});

test('reconnecting a nonexistent PC output does not change either end or the chosen port', () => {
  const state = { ...initialHardwareState('INC-106'), pcVideoConnected: false };
  for (const action of ['video-gpu', 'video-board']) {
    const failed = step(state, action);
    assert.equal(failed.kind, 'warning'); assert.deepEqual(failed.state, state);
  }
  const absentPsu = detailed('INC-106');
  assert.equal(step(absentPsu, 'plug-in').kind, 'warning');
  assert.equal(step(absentPsu, 'plug-in').state.acConnected, false);
});

test('internal cable gestures retain power, panel, mount, and matching-component guards', () => {
  let state = detailed('INC-101');
  const action = assemblyCableAction(state, state.assembly, 'atx', 'cable-rest').action;
  assert.equal(action, 'asm-disconnect-atx');
  const blocked = step(state, action); assert.equal(blocked.kind, 'warning'); assert.deepEqual(blocked.state, state);
  state = step(state, 'power-off').state; state = step(state, 'unplug').state;
  assert.match(step(state, action).message, /side.panel/);
  for (const partAction of ['asm-loosen-panel-0', 'asm-loosen-panel-1', 'asm-remove-panel']) state = step(state, partAction).state;
  const unplugged = step(state, action); assert.notEqual(unplugged.kind, 'warning'); state = unplugged.state;
  assert.equal(state.atxConnected, false); assert.equal(state.booted, false);
  const reconnect = assemblyCableAction(state, state.assembly, 'atx', 'atx-header');
  assert.equal(step(state, reconnect.action).state.atxConnected, true);
  const fresh = detailed('INC-106');
  assert.equal(step(fresh, assemblyCableAction(fresh, fresh.assembly, 'sata-power', 'ssd-power').action).kind, 'warning');
});

test('disconnecting only the monitor end cannot release a graphics card still cabled at the PC', () => {
  let state = detailed('INC-108');
  for (const action of ['power-off', 'unplug', 'asm-loosen-panel-0', 'asm-loosen-panel-1', 'asm-remove-panel', 'asm-disconnect-gpu-power', 'asm-loosen-gpu-0', 'asm-loosen-gpu-1', 'asm-open-pcie-latch']) state = step(state, action).state;
  assert.equal(state.signalConnected, false); assert.equal(state.pcVideoConnected, true);
  const stillCabled = step(state, 'asm-remove-gpu'); assert.equal(stillCabled.kind, 'warning'); assert.match(stillCabled.message, /at the PC/);
  state = step(state, 'disconnect-video').state;
  state = step(state, 'asm-remove-gpu').state;
  assert.equal(state.gpuInstalled, false); assert.equal(state.signalConnected, false);
  const independentMonitor = step(state, 'asm-connect-display');
  assert.notEqual(independentMonitor.kind, 'warning'); assert.equal(independentMonitor.state.signalConnected, true);
  assert.equal(independentMonitor.state.pcVideoConnected, false);
});

test('the motherboard output also has to be disconnected before board removal', () => {
  const h = { ...initialHardwareState('INC-106'), boardInstalled: true }, a = initialAssemblyState(h);
  a.panelInstalled = false; a.panelScrews = [false, false]; a.boardScrews = [false, false, false, false];
  const connectedBoard = applyAssemblyAction(h, a, 'asm-remove-board');
  assert.equal(connectedBoard.kind, 'warning'); assert.match(connectedBoard.message, /HDMI cable at the PC/);
  const released = applyAssemblyAction({ ...h, pcVideoConnected: false }, a, 'asm-remove-board');
  assert.equal(released.kind, 'success'); assert.equal(released.hardware.boardInstalled, false);
});

test('independent cable ends survive device-save normalization and lab-record boundaries', () => {
  const original = initialHardwareState('INC-108');
  const old = { ...original }; delete old.pcVideoConnected;
  assert.equal(normalizeHardwareState('INC-108', old).pcVideoConnected, true);
  const changed = step(step(original, 'connect-signal').state, 'disconnect-video').state;
  const saved = normalizeHardwareState(changed.caseId, JSON.parse(JSON.stringify(changed)));
  assert.equal(saved.pcVideoConnected, false); assert.equal(saved.signalConnected, true); assert.ok(saved.actions.includes('disconnect-video'));
  const scenario = SCENARIOS.find(item => item.id === changed.caseId);
  const record = normalizeLabRecord(scenario, { state: changed, notes: 'I traced both cable ends.' });
  assert.equal(record.state.pcVideoConnected, false); assert.equal(record.state.signalConnected, true);
  assert.equal(record.notes, 'I traced both cable ends.');
  assert.equal(normalizeHardwareState('INC-108', { ...changed, pcVideoConnected: 'false' }).pcVideoConnected, true);
});

test('the illustrated fallback labels a loose PC connector and does not draw a connection into a rear socket', () => {
  const state = step(initialHardwareState('INC-108'), 'disconnect-video').state;
  const root = { innerHTML: '', ownerDocument: { activeElement: null }, contains: () => false, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {} };
  renderHardware(root, state.caseId, state, () => {});
  assert.match(root.innerHTML, /PC cable end is disconnected/);
  assert.match(root.innerHTML, /Loose at PC/);
  assert.match(root.innerHTML, /data-hw-action="disconnect-video"/);
  assert.doesNotMatch(root.innerHTML, /Cable currently at graphics card/);
  renderHardware(root, state.caseId, { ...state, view: 'rear' }, () => {});
  assert.match(root.innerHTML, /PC END UNPLUGGED/);
});
