import test from 'node:test';
import assert from 'node:assert/strict';
import { initialHardwareState } from '../src/hardware.js';
import { ASSEMBLY_FASTENERS, initialAssemblyState, normalizeAssemblyState, applyAssemblyAction, assemblyFailure, assemblyActions } from '../src/assembly-model.js';

const setup = (id = 'INC-106') => { const hardware = initialHardwareState(id); return { hardware, assembly: initialAssemblyState(hardware) }; };
const run = (machine, action, expected = 'success') => {
  const result = applyAssemblyAction(machine.hardware, machine.assembly, action);
  assert.equal(result.kind, expected, `${action}: ${result.message}`);
  if (expected === 'success') { machine.hardware = result.hardware; machine.assembly = result.assembly; }
  return result;
};
const screws = (machine, operation, group, order) => {
  for (const index of order ?? Array.from({ length: ASSEMBLY_FASTENERS[group].count }, (_, index) => index)) run(machine, `asm-${operation}-${group}-${index}`);
};
const build = machine => {
  run(machine, 'asm-fit-psu'); screws(machine, 'tighten', 'psu');
  run(machine, 'asm-fit-board'); screws(machine, 'tighten', 'board');
  run(machine, 'asm-fit-cpu'); run(machine, 'asm-close-retention');
  run(machine, 'asm-apply-paste'); run(machine, 'asm-fit-cooler'); screws(machine, 'tighten', 'cooler', [0, 3, 1, 2]); run(machine, 'asm-connect-cpu-fan');
  run(machine, 'asm-fit-ram'); run(machine, 'asm-close-ram-clips');
  run(machine, 'asm-fit-gpu'); run(machine, 'asm-close-pcie-latch'); screws(machine, 'tighten', 'gpu');
  run(machine, 'asm-fit-ssd'); screws(machine, 'tighten', 'ssd');
  for (const lead of ['atx', 'eps', 'gpu-power', 'sata-data', 'sata-power', 'front-panel']) run(machine, `asm-connect-${lead}`);
  run(machine, 'asm-fit-panel'); screws(machine, 'tighten', 'panel');
};
const openPanel = machine => { screws(machine, 'loosen', 'panel'); run(machine, 'asm-remove-panel'); };

test('a complete workstation build needs each mounting, paste, latch, and fan step', () => {
  const machine = setup();
  assert.match(assemblyFailure(machine.hardware, machine.assembly), /motherboard/);
  build(machine);
  assert.equal(assemblyFailure(machine.hardware, machine.assembly), '');
  assert.equal(machine.hardware.selectedDrive, 'sata');
  assert.equal(machine.assembly.paste, 'pea');
  assert.equal(machine.hardware.actions.at(-1), 'asm-tighten-panel-1');
});

test('a fully assembled workstation can be safely torn down and rebuilt without erasing its SSD', () => {
  const machine = setup(); build(machine); openPanel(machine);
  run(machine, 'asm-remove-board', 'warning');
  for (const lead of ['atx', 'eps', 'gpu-power', 'sata-data', 'sata-power', 'front-panel', 'cpu-fan']) run(machine, `asm-disconnect-${lead}`);
  screws(machine, 'loosen', 'psu'); run(machine, 'asm-remove-psu');
  run(machine, 'asm-disconnect-display');
  screws(machine, 'loosen', 'gpu'); run(machine, 'asm-open-pcie-latch'); run(machine, 'asm-remove-gpu');
  screws(machine, 'loosen', 'ssd'); run(machine, 'asm-remove-ssd');
  run(machine, 'asm-open-ram-clips'); run(machine, 'asm-remove-ram');
  screws(machine, 'loosen', 'cooler', [2, 1, 3, 0]); run(machine, 'asm-remove-cooler');
  assert.equal(machine.assembly.paste, 'dry');
  run(machine, 'asm-open-retention'); run(machine, 'asm-remove-cpu', 'warning');
  run(machine, 'asm-clean-paste'); run(machine, 'asm-remove-cpu');
  screws(machine, 'loosen', 'board'); run(machine, 'asm-remove-board');
  for (const key of ['boardInstalled', 'cpuInstalled', 'coolerInstalled', 'ramSeated', 'gpuInstalled', 'originalDriveInstalled']) assert.equal(machine.hardware[key], false);
  build(machine);
  assert.equal(assemblyFailure(machine.hardware, machine.assembly), '');
  assert.equal(machine.hardware.originalDriveInstalled, true);
  assert.equal(Object.hasOwn(machine.hardware, 'driveErased'), false);
});

test('power, AC, and panel guards block changes without modifying state or action history', () => {
  const machine = setup('INC-101');
  const snapshot = structuredClone(machine);
  let result = run(machine, 'asm-loosen-panel-0', 'warning');
  assert.match(result.message, /power off/);
  assert.deepEqual(result.hardware, snapshot.hardware); assert.deepEqual(result.assembly, snapshot.assembly);
  machine.hardware.pcOn = false;
  run(machine, 'asm-loosen-panel-0', 'warning');
  machine.hardware.acConnected = false;
  result = run(machine, 'asm-remove-cooler', 'warning'); assert.match(result.message, /side.panel/);
  run(machine, 'asm-remove-panel', 'warning');
  openPanel(machine);
  run(machine, 'asm-remove-cooler', 'warning');
});

test('cooler screws use opposing corners and paste cannot be reused after lifting', () => {
  const machine = setup(); run(machine, 'asm-fit-psu'); screws(machine, 'tighten', 'psu'); run(machine, 'asm-fit-board'); screws(machine, 'tighten', 'board');
  run(machine, 'asm-fit-cpu'); run(machine, 'asm-fit-cooler', 'warning'); run(machine, 'asm-close-retention');
  run(machine, 'asm-fit-cooler', 'warning'); run(machine, 'asm-apply-paste'); run(machine, 'asm-fit-cooler');
  run(machine, 'asm-tighten-cooler-1', 'warning'); run(machine, 'asm-tighten-cooler-0');
  run(machine, 'asm-tighten-cooler-2', 'warning'); run(machine, 'asm-tighten-cooler-3'); run(machine, 'asm-tighten-cooler-1'); run(machine, 'asm-tighten-cooler-2');
  run(machine, 'asm-connect-cpu-fan'); run(machine, 'asm-remove-cooler', 'warning'); run(machine, 'asm-disconnect-cpu-fan');
  run(machine, 'asm-loosen-cooler-0', 'warning'); screws(machine, 'loosen', 'cooler', [2, 1, 3, 0]); run(machine, 'asm-remove-cooler');
  assert.equal(machine.assembly.paste, 'dry');
  run(machine, 'asm-apply-paste', 'warning');
  run(machine, 'asm-fit-cooler');
  assert.match(assemblyFailure(machine.hardware, machine.assembly), /disturbed/);
  run(machine, 'asm-remove-cooler'); run(machine, 'asm-clean-paste'); run(machine, 'asm-apply-paste');
  assert.equal(machine.assembly.paste, 'pea');
});

test('excess paste remains a teaching fault and needs cleaning before a fresh application', () => {
  const machine = setup(); run(machine, 'asm-fit-psu'); screws(machine, 'tighten', 'psu'); run(machine, 'asm-fit-board'); screws(machine, 'tighten', 'board'); run(machine, 'asm-fit-cpu'); run(machine, 'asm-close-retention');
  run(machine, 'asm-excess-paste'); run(machine, 'asm-apply-paste', 'warning'); run(machine, 'asm-fit-cooler');
  assert.match(assemblyFailure(machine.hardware, machine.assembly), /Too much/);
  run(machine, 'asm-remove-cooler'); run(machine, 'asm-clean-paste'); run(machine, 'asm-apply-paste');
  assert.equal(machine.assembly.paste, 'pea');
});

test('GPU and SSD cannot be lifted through connected leads or attached screws', () => {
  const machine = setup(); build(machine); openPanel(machine);
  run(machine, 'asm-open-pcie-latch'); run(machine, 'asm-remove-gpu', 'warning');
  run(machine, 'asm-loosen-gpu-0', 'warning'); run(machine, 'asm-disconnect-gpu-power');
  run(machine, 'asm-remove-gpu', 'warning'); run(machine, 'asm-disconnect-display');
  run(machine, 'asm-remove-gpu', 'warning'); screws(machine, 'loosen', 'gpu'); run(machine, 'asm-remove-gpu');
  run(machine, 'asm-remove-ssd', 'warning'); run(machine, 'asm-loosen-ssd-0', 'warning');
  run(machine, 'asm-disconnect-sata-data'); run(machine, 'asm-remove-ssd', 'warning'); run(machine, 'asm-disconnect-sata-power');
  screws(machine, 'loosen', 'ssd'); run(machine, 'asm-remove-ssd');
  assert.equal(machine.hardware.selectedDrive, 'sata');
});

test('safe migration preserves each investigation fault and starts fresh builds with loose fittings', () => {
  for (let number = 101; number <= 108; number++) {
    const hardware = initialHardwareState(`INC-${number}`), before = structuredClone(hardware), state = initialAssemblyState(hardware);
    assert.deepEqual(hardware, before);
    assert.equal(state.panelInstalled, hardware.boardInstalled);
    assert.equal(state.psuInstalled, hardware.boardInstalled);
    assert.equal(state.cpuFanConnected, hardware.coolerInstalled);
    assert.equal(state.boardScrews.every(Boolean), hardware.boardInstalled);
    assert.equal(state.paste, hardware.coolerInstalled ? 'pea' : 'clean');
  }
  const original = setup('INC-101');
  assert.equal(assemblyFailure(original.hardware, original.assembly), '');
  assert.equal(original.hardware.videoPort, 'board');
});

test('saved mechanics retain only bounded fixed fields and do not execute getters or inherit data', () => {
  const machine = setup();
  const hostile = { version: 1, panelInstalled: 'true', boardScrews: [true, true, true, true, true], coolerScrews: [1, 'true', {}, true], paste: '<script>', cpuFanConnected: true, unexpected: 'secret' };
  let getterCalls = 0; Object.defineProperty(hostile, 'retentionOpen', { enumerable: true, get() { getterCalls++; throw Error('getter must not run'); } });
  const state = normalizeAssemblyState(hostile, machine.hardware);
  assert.equal(getterCalls, 0); assert.equal(state.panelInstalled, false); assert.deepEqual(state.boardScrews, [false, false, false, false]);
  assert.equal(state.paste, 'clean'); assert.equal(state.cpuFanConnected, false); assert.equal(Object.hasOwn(state, 'unexpected'), false);
  assert.deepEqual(normalizeAssemblyState(Object.create({ version: 1, panelInstalled: true }), machine.hardware), initialAssemblyState(machine.hardware));
  assert.deepEqual(normalizeAssemblyState([], machine.hardware), initialAssemblyState(machine.hardware));
  assert.deepEqual(normalizeAssemblyState(null, machine.hardware), initialAssemblyState(machine.hardware));
  assert.deepEqual(normalizeAssemblyState({ version: 2 }, machine.hardware), initialAssemblyState(machine.hardware));
  const fittedHardware = initialHardwareState('INC-101');
  const malformed = normalizeAssemblyState({ version: 1 }, fittedHardware);
  assert.match(assemblyFailure(fittedHardware, malformed), /screws/);
  for (const saved of [[], { version: 2 }, Object.create({ version: 1 }), 'untrusted']) {
    const invalid = normalizeAssemblyState(saved, fittedHardware);
    assert.deepEqual(invalid.boardScrews, [false, false, false, false]);
    assert.equal(invalid.cpuFanConnected, false);
    assert.ok(assemblyFailure(fittedHardware, invalid));
  }
  const sparse = Array(4);
  Object.defineProperty(sparse, '0', { get() { throw Error('do not execute screw getters'); } });
  const sparseState = normalizeAssemblyState({ ...initialAssemblyState(fittedHardware), boardScrews: sparse }, fittedHardware);
  assert.deepEqual(sparseState.boardScrews, [false, false, false, false]);
  assert.match(assemblyFailure(fittedHardware, sparseState), /screws/);
});

test('published action availability is the same rule used by actual interactions', () => {
  const machine = setup(); const snapshot = structuredClone(machine);
  for (const descriptor of assemblyActions(machine.hardware, machine.assembly)) {
    assert.match(descriptor.id, /^asm-[a-z0-9-]+$/);
    const actual = applyAssemblyAction(machine.hardware, machine.assembly, descriptor.id);
    assert.equal(descriptor.disabled, actual.kind === 'warning', descriptor.id);
    assert.equal(descriptor.reason, descriptor.disabled ? actual.message : '');
  }
  assert.deepEqual(machine, snapshot);
  for (const action of ['asm-tighten-board-99', 'asm-fit-__proto__', 'asm-connect-constructor', {}, null, '<script>']) {
    const result = run(machine, action, 'warning'); assert.deepEqual(result.hardware, machine.hardware); assert.deepEqual(result.assembly, machine.assembly);
  }
});

test('successful mechanics invalidate old startup/delivery and keep history bounded on copies', () => {
  const machine = setup();
  machine.hardware.booted = true; machine.hardware.documentOpened = true;
  machine.hardware.actions = Array(250).fill('inspect-board');
  const oldHardware = machine.hardware, oldAssembly = machine.assembly;
  const result = run(machine, 'asm-fit-board');
  assert.equal(result.hardware.booted, false); assert.equal(result.hardware.documentOpened, false);
  assert.equal(result.hardware.actions.length, 250); assert.equal(result.hardware.actions.at(-1), 'asm-fit-board');
  assert.equal(oldHardware.boardInstalled, false); assert.equal(oldHardware.booted, true); assert.equal(oldHardware.actions.at(-1), 'inspect-board');
  assert.deepEqual(oldAssembly.boardScrews, [false, false, false, false]);
});

test('external HDMI changes preserve a running operating system and need no open case', () => {
  const machine = setup('INC-108');
  assert.equal(machine.hardware.pcOn, true); assert.equal(machine.hardware.booted, true);
  machine.hardware.documentOpened = true;
  run(machine, 'asm-connect-display');
  assert.equal(machine.hardware.booted, true); assert.equal(machine.hardware.pcOn, true); assert.equal(machine.hardware.documentOpened, false);
  run(machine, 'asm-disconnect-display');
  assert.equal(machine.hardware.booted, true); assert.equal(machine.assembly.panelInstalled, true);
});

test('mechanical state round-trips through JSON at every build step', () => {
  const machine = setup();
  const actions = assemblyActions(machine.hardware, machine.assembly).filter(item => !item.disabled);
  assert.ok(actions.some(item => item.id === 'asm-fit-board'));
  build(machine);
  const saved = JSON.parse(JSON.stringify(machine.assembly));
  assert.deepEqual(normalizeAssemblyState(saved, machine.hardware), saved);
  for (const [key, value] of [['panelScrews', [true, false]], ['psuInstalled', false], ['psuScrews', [true, true, false, true]], ['cpuFanConnected', false], ['paste', 'dry'], ['ramClipsOpen', true], ['retentionOpen', true]]) {
    const modified = { ...saved, [key]: value };
    assert.ok(assemblyFailure(machine.hardware, normalizeAssemblyState(modified, machine.hardware)), key);
  }
});

test('PSU can fit independently of the board but power leads require all four mounting screws', () => {
  const machine = setup();
  run(machine, 'asm-fit-psu');
  assert.equal(machine.assembly.psuInstalled, true); assert.equal(machine.hardware.boardInstalled, false);
  run(machine, 'asm-fit-board'); screws(machine, 'tighten', 'board');
  const blocked = run(machine, 'asm-connect-atx', 'warning'); assert.match(blocked.message, /power supply/);
  screws(machine, 'tighten', 'psu'); run(machine, 'asm-connect-atx');
  run(machine, 'asm-remove-psu', 'warning'); run(machine, 'asm-loosen-psu-0', 'warning');
  run(machine, 'asm-disconnect-atx');
  run(machine, 'asm-remove-psu', 'warning'); screws(machine, 'loosen', 'psu'); run(machine, 'asm-remove-psu');
  assert.equal(machine.hardware.boardInstalled, true); assert.equal(machine.assembly.psuInstalled, false);
  assert.match(assemblyFailure(machine.hardware, machine.assembly), /power supply/);
  run(machine, 'asm-fit-psu'); screws(machine, 'tighten', 'psu');
  assert.equal(machine.assembly.psuInstalled, true);
});

test('PSU removal checks each power lead but does not require unrelated front-panel or data leads', () => {
  const machine = setup(); build(machine); openPanel(machine);
  for (const lead of ['atx', 'eps', 'gpu-power', 'sata-power']) {
    run(machine, 'asm-remove-psu', 'warning'); run(machine, `asm-disconnect-${lead}`);
  }
  assert.equal(machine.hardware.sataDataConnected, true); assert.equal(machine.hardware.frontPanelConnected, true);
  screws(machine, 'loosen', 'psu'); run(machine, 'asm-remove-psu');
  assert.equal(machine.assembly.psuInstalled, false);
});

test('present detailed saves without PSU fields do not silently gain a secure power supply', () => {
  const hardware = initialHardwareState('INC-101'), saved = initialAssemblyState(hardware);
  delete saved.psuInstalled; delete saved.psuScrews;
  const normalized = normalizeAssemblyState(saved, hardware);
  assert.equal(normalized.psuInstalled, false); assert.deepEqual(normalized.psuScrews, [false, false, false, false]);
  assert.match(assemblyFailure(hardware, normalized), /power supply/);
  assert.equal(normalizeAssemblyState(undefined, hardware).psuInstalled, true);
});
