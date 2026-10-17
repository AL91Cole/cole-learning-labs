import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSEMBLY_FASTENERS, initialAssemblyState, applyAssemblyAction, assemblyActions } from '../src/assembly-model.js';
import { ASSEMBLY_TOOLS, assemblyToolAction, assemblyDropAction, assembledPartFitted } from '../src/assembly-tools.js';

const PART_IDS = ['panel', 'psu', 'board', 'cpu', 'cooler', 'ram', 'gpu', 'ssd'];
const hardware = fitted => ({
  boardInstalled: fitted, cpuInstalled: fitted, coolerInstalled: fitted, ramSeated: fitted,
  gpuInstalled: fitted, originalDriveInstalled: fitted, atxConnected: fitted, cpuPowerConnected: fitted,
  gpuPowerConnected: fitted, sataDataConnected: fitted, sataPowerConnected: fitted, frontPanelConnected: fitted,
  pcOn: fitted, acConnected: fitted, signalConnected: true, videoPort: 'gpu', booted: fitted, documentOpened: fitted, actions: []
});
const machine = fitted => { const h = hardware(fitted); return { h, a: initialAssemblyState(h) }; };

test('tool catalogue has fixed, unique IDs and cannot be changed by a view', () => {
  assert.deepEqual(ASSEMBLY_TOOLS.map(item => item.id), ['inspect', 'move', 'cables', 'screwdriver', 'paste', 'clean']);
  assert.equal(Object.isFrozen(ASSEMBLY_TOOLS), true);
  for (const tool of ASSEMBLY_TOOLS) { assert.equal(Object.isFrozen(tool), true); assert.ok(tool.label); assert.ok(tool.description); }
});

test('move tool maps each authored part to an explicit fit or remove attempt', () => {
  const loose = machine(false), fitted = machine(true);
  for (const part of PART_IDS) {
    assert.equal(assemblyToolAction(loose.h, loose.a, 'move', part).action, `asm-fit-${part}`);
    assert.equal(assemblyToolAction(fitted.h, fitted.a, 'move', part, 'remove').action, `asm-remove-${part}`);
    assert.equal(assemblyToolAction(fitted.h, fitted.a, 'move', part, 'fit').action, null);
    assert.equal(assemblyToolAction(loose.h, loose.a, 'move', part, 'remove').action, null);
    for (const operation of ['toggle', 'connect', 'fit-cpu', {}, null, 1]) assert.equal(assemblyToolAction(loose.h, loose.a, 'move', part, operation).action, null);
  }
});

test('part fitted reads accept only authored IDs, own data fields, and strict booleans', () => {
  const { h, a } = machine(true);
  for (const part of PART_IDS) assert.equal(assembledPartFitted(part, h, a), true);
  for (const part of ['constructor', '__proto__', 'boardInstalled', 'storage', 'atx', {}, undefined]) assert.equal(assembledPartFitted(part, h, a), false);
  assert.equal(assembledPartFitted('board', { boardInstalled: 'true' }, a), false);
  assert.equal(assembledPartFitted('board', Object.create({ boardInstalled: true }), a), false);
  assert.equal(assembledPartFitted('psu', h, { psuInstalled: 1 }), false);
  assert.equal(assembledPartFitted('panel', h, []), false);
  const getter = {}; Object.defineProperty(getter, 'boardInstalled', { get() { throw Error('must not execute'); } });
  assert.equal(assembledPartFitted('board', getter, a), false);
});

test('screwdriver toggles exactly the authored fastener counts using normalized screw state', () => {
  const { h, a } = machine(true);
  let total = 0;
  for (const [group, spec] of Object.entries(ASSEMBLY_FASTENERS)) {
    for (let index = 0; index < spec.count; index++) {
      total++;
      assert.equal(assemblyToolAction(h, a, 'screwdriver', `${group}-${index}`).action, `asm-loosen-${group}-${index}`);
      const loose = structuredClone(a); loose[spec.stateKey][index] = false;
      assert.equal(assemblyToolAction(h, loose, 'screwdriver', `${group}-${index}`).action, `asm-tighten-${group}-${index}`);
    }
    for (const suffix of [spec.count, -1, '00', '1.0', '1e0', '1-extra', '999999999999999999999']) assert.equal(assemblyToolAction(h, a, 'screwdriver', `${group}-${suffix}`).action, null);
  }
  assert.equal(total, 18);
  for (const target of ['cpu-0', 'ram-0', 'atx-0', 'constructor-0', '__proto__-0', '<script>', {}, null]) assert.equal(assemblyToolAction(h, a, 'screwdriver', target).action, null);
});

test('sparse and malformed screw arrays do not map to a falsely secured fastener', () => {
  const { h, a } = machine(true);
  const sparse = Array(4); Object.defineProperty(sparse, '0', { get() { throw Error('must not execute'); } });
  const result = assemblyToolAction(h, { ...a, boardScrews: sparse }, 'screwdriver', 'board-0');
  assert.equal(result.action, 'asm-tighten-board-0');
  assert.equal(assemblyToolAction(h, { ...a, psuScrews: [1, 'true', {}, null] }, 'screwdriver', 'psu-0').action, 'asm-tighten-psu-0');
});

test('inspect and wrong-tool targets provide help without creating actions', () => {
  const { h, a } = machine(true);
  for (const target of [...PART_IDS, 'board-0', 'cooler-3', 'cpu-fan', 'retention', 'monitor', 'unknown']) assert.equal(assemblyToolAction(h, a, 'inspect', target).action, null);
  assert.match(assemblyToolAction(h, a, 'screwdriver', 'cpu').message, /screw head/);
  assert.match(assemblyToolAction(h, a, 'move', 'atx').message, /cable controls/);
  for (const tool of ['power', 'Screwdriver', '__proto__', 'constructor', {}, null, undefined]) assert.equal(assemblyToolAction(h, a, tool, 'board').action, null);
  assert.equal(assemblyToolAction(h, a, 'inspect', 'Student Jane secret@example.com').message.includes('secret@example.com'), false);
});

test('paste and cleaning use only the exposed processor target and remain guarded attempts', () => {
  const { h, a } = machine(true);
  assert.equal(assemblyToolAction(h, a, 'paste', 'cpu').action, 'asm-apply-paste');
  assert.equal(assemblyToolAction(h, a, 'clean', 'cpu').action, 'asm-clean-paste');
  for (const target of ['cooler', 'board', 'paste', 'cpu-0', 'ssd', undefined]) {
    assert.equal(assemblyToolAction(h, a, 'paste', target).action, null);
    assert.equal(assemblyToolAction(h, a, 'clean', target).action, null);
  }
  const action = assemblyToolAction(h, a, 'paste', 'cpu');
  assert.match(action.message, /Try/);
  assert.equal(applyAssemblyAction(h, a, action.action).kind, 'warning');
  const safe = { ...h, pcOn: false, acConnected: false }, open = { ...a, panelInstalled: false, panelScrews: [false, false] };
  assert.match(applyAssemblyAction(safe, open, action.action).message, /Remove the CPU cooler/);
});

test('part releases accept only the matching mount or tray and reject same-location noops', () => {
  const loose = machine(false), fitted = machine(true);
  for (const part of PART_IDS) {
    assert.equal(assemblyDropAction(loose.h, loose.a, part, part).action, `asm-fit-${part}`);
    assert.equal(assemblyDropAction(fitted.h, fitted.a, part, 'tray').action, `asm-remove-${part}`);
    assert.equal(assemblyDropAction(loose.h, loose.a, part, 'tray').action, null);
    assert.equal(assemblyDropAction(fitted.h, fitted.a, part, part).action, null);
    for (const mount of PART_IDS.filter(id => id !== part)) assert.equal(assemblyDropAction(loose.h, loose.a, part, mount).action, null);
  }
  for (const target of ['cpu-0', 'atx', 'storage', '__proto__', {}, null]) assert.equal(assemblyDropAction(loose.h, loose.a, target, 'tray').action, null);
  for (const destination of ['case', 'workbench', 'body', 'asm-fit-cpu', {}, null, undefined]) assert.equal(assemblyDropAction(loose.h, loose.a, 'cpu', destination).action, null);
});

test('mapped actions are all in the mechanical allowlist and mapping does not mutate work', () => {
  for (const fitted of [false, true]) {
    const { h, a } = machine(fitted), before = structuredClone({ h, a });
    const allowed = new Set(assemblyActions(h, a).map(item => item.id));
    const targets = [...PART_IDS, ...Object.entries(ASSEMBLY_FASTENERS).flatMap(([group, spec]) => Array.from({ length: spec.count }, (_, index) => `${group}-${index}`)), 'atx', 'cpu-fan', 'unknown'];
    for (const tool of ASSEMBLY_TOOLS) for (const target of targets) for (const operation of ['fit', 'remove']) {
      const result = assemblyToolAction(h, a, tool.id, target, operation);
      if (result.action !== null) assert.equal(allowed.has(result.action), true, result.action);
    }
    assert.deepEqual({ h, a }, before);
  }
});

test('mapping never grants safety permission and rejected drags leave the actual model unchanged', () => {
  const { h, a } = machine(true), before = structuredClone({ h, a });
  const attempted = assemblyDropAction(h, a, 'psu', 'tray');
  assert.equal(attempted.action, 'asm-remove-psu');
  const denied = applyAssemblyAction(h, a, attempted.action);
  assert.equal(denied.kind, 'warning'); assert.match(denied.message, /power off/);
  assert.deepEqual(denied.hardware, before.h); assert.deepEqual(denied.assembly, before.a);
  const fresh = machine(false);
  const board = assemblyDropAction(fresh.h, fresh.a, 'board', 'board');
  assert.equal(applyAssemblyAction(fresh.h, fresh.a, board.action).kind, 'success');
});
