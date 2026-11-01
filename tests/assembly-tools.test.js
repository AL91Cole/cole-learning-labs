import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ASSEMBLY_TOOLS, assemblyToolAction, assemblyDropAction } from '../src/assembly-tools.js';
import { ASSEMBLY_FASTENERS, assemblyActions, assemblyFailure } from '../src/assembly-model.js';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from '../src/assembly-cables.js';
import { initialHardwareState, applyHardwareAction } from '../src/hardware.js';

import { workbenchGuidance } from '../src/workbench-guidance.js';
import { pcActivity } from '../src/pc-activity.js';
import { assemblyBuilderView, renderAssemblyBuilder } from '../src/assembly-builder.js';
const detailed = id => applyHardwareAction(id, initialHardwareState(id), 'enable-assembly').state;
function attempt(state, action) {
  const before = structuredClone(state);
  const result = applyHardwareAction(state.caseId, state, action);
  assert.deepEqual(state, before, 'an attempted tool action must preserve its input snapshot');
  return result;
}

test('dragging maps only a known component to its matching mount or the parts tray', () => {
  const state = detailed('INC-106'), before = structuredClone(state);
  assert.equal(assemblyDropAction(state, state.assembly, 'cpu', 'cpu').action, 'asm-fit-cpu');
  assert.equal(assemblyDropAction(state, state.assembly, 'cpu', 'ram').action, null);
  assert.equal(assemblyDropAction(state, state.assembly, 'cpu', 'tray').action, null);
  for (const part of ['__proto__', 'constructor', 'atx', 'panel-0', '<script>', {}, null]) {
    assert.equal(assemblyDropAction(state, state.assembly, part, 'cpu').action, null);
  }
  assert.deepEqual(state, before, 'a proposal is not a committed equipment change');
});

test('Move and screwdriver proposals remain subject to power and assembly prerequisites', () => {
  const live = detailed('INC-101');
  const screw = assemblyToolAction(live, live.assembly, 'screwdriver', 'panel-0');
  assert.equal(screw.action, 'asm-loosen-panel-0');
  const blocked = attempt(live, screw.action);
  assert.equal(blocked.kind, 'warning'); assert.deepEqual(blocked.state, live);
  const empty = detailed('INC-106');
  const fitting = assemblyDropAction(empty, empty.assembly, 'cpu', 'cpu');
  assert.equal(attempt(empty, fitting.action).kind, 'warning');
  assert.equal(attempt(empty, fitting.action).state.cpuInstalled, false);
  const prematureScrew = assemblyToolAction(empty, empty.assembly, 'screwdriver', 'cooler-0');
  assert.equal(attempt(empty, prematureScrew.action).kind, 'warning');
  assert.deepEqual(attempt(empty, prematureScrew.action).state.assembly.coolerScrews, [false, false, false, false]);
});

test('tool names and fastener indices are fixed, while inspect and wrong-surface operations never modify equipment', () => {
  const state = detailed('INC-106');
  for (const tool of ['inspect', 'paste', 'clean', 'move']) {
    assert.equal(assemblyToolAction(state, state.assembly, tool, 'not-equipment').action, null);
  }
  for (const screw of ['psu-4', 'panel-2', 'board-01', 'cooler--1', 'gpu-9007199254740992', 'constructor-0']) {
    assert.equal(assemblyToolAction(state, state.assembly, 'screwdriver', screw).action, null);
  }
  assert.equal(assemblyToolAction(state, state.assembly, 'fetch-roster', 'cpu').action, null);
  assert.equal(assemblyToolAction(state, state.assembly, 'inspect', 'cpu').action, null);
  assert.equal(assemblyToolAction(state, state.assembly, 'paste', 'cpu').action, 'asm-apply-paste');
  assert.equal(assemblyToolAction(state, state.assembly, 'clean', 'cpu').action, 'asm-clean-paste');
  assert.equal(attempt(state, 'asm-apply-paste').kind, 'warning', 'paste requires a fitted, exposed processor');
});

// Native controls exercise the actual controller against the real model.
function workbench(id = 'INC-106') {
  const source = readFileSync(new URL('../src/assembly-workbench.js', import.meta.url), 'utf8');
  const fields = new Map(), listeners = new Map(), doc = { activeElement: null };
  const dynamic = new Map(); let buttons = [], sceneOptions, writes = 0;
  const calls = { tools: [], canceled: 0, mounts: 0, pauses: 0, disposed: 0 };
  function element(dataset = {}) {
    return { dataset, textContent: '', value: '', attrs: {}, focus() { doc.activeElement = this; }, setAttribute(k, v) { this.attrs[k] = v; },
      closest(selector) { return selector === 'button' ? this : null; }, matches(selector) { return fields.get(selector) === this; } };
  }
  function parse(html) {
    return [...html.matchAll(/<button\b([^>]*)>/g)].map(([, attrs]) => element(Object.fromEntries([...attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([, name, value]) => [name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]))));
  }
  for (const name of ['on','ac-label','power-reference','monitor-readout','build-help','diagnostic-detail','ticket-title','instruction','activity-label','activity-detail','component-status','fan-status','all','scene', 'view-status', 'select', 'part-title', 'part-state', 'actions', 'feedback', 'power', 'power-state', 'next', 'delivery', 'loading', 'tool-help', 'tool-controls', 'tool-drawer', 'tool-summary', 'component-drawer', 'view-drawer', 'loading-title', 'loading-text', 'fastener']) fields.set(`[data-asm-${name}]`, element());
  for (const name of ['actions', 'tool-controls']) Object.defineProperty(fields.get(`[data-asm-${name}]`), 'innerHTML', { set(html) { dynamic.set(name, parse(html)); }, get() { return ''; } });
  const allButtons = () => [...buttons, ...[...dynamic.values()].flat()];
  const root = { ownerDocument: doc, closest: () => null, contains: target => allButtons().includes(target) || [...fields.values()].includes(target),
    querySelector: selector => selector === '[data-asm-actions] button' ? dynamic.get('actions')?.[0] : selector.startsWith('[data-asm-toggle=') ? allButtons().find(button=>button.dataset.asmToggle===selector.match(/="([^"]+)"/)[1]) : fields.get(selector) || null,
    querySelectorAll: selector => allButtons().filter(item => selector === '[data-asm-tool]' ? item.dataset.asmTool : selector === '[data-asm-part]' ? item.dataset.asmPart : selector === '[data-assembly-action]' ? item.dataset.assemblyAction : false),
    addEventListener(name, handler) { listeners.set(name, handler); }, removeEventListener(name, handler) { if (listeners.get(name) === handler) listeners.delete(name); } };
  Object.defineProperty(root, 'innerHTML', { set(html) { writes++; buttons = parse(html); } });
  const scene = { update() {}, select() {}, setTool(tool) { calls.tools.push(tool); }, cancelInteraction() { calls.canceled++; }, pause() { calls.pauses++; }, resume() {}, dispose() { calls.disposed++; } };
  const mount = vm.runInNewContext(`${source.replace(/^import[^\n]+\n/gm, '').replace('export function mountAssemblyWorkbench', 'function mountAssemblyWorkbench').replace(/import\('\.\/assembly-scene\.js\?release=[^']+'\)/, 'sceneLoader()')}; mountAssemblyWorkbench`, {
    ASSEMBLY_TOOLS, assemblyToolAction, ASSEMBLY_FASTENERS, assemblyActions, assemblyFailure, ASSEMBLY_CABLES, cableConnection, assemblyCableAction, workbenchGuidance, pcActivity, assemblyBuilderView, renderAssemblyBuilder,
    sceneLoader: async () => ({ mountAssemblyScene(_host, options) { calls.mounts++; sceneOptions = options; return scene; } })
  });
  let state = detailed(id), controller;
  const committed = [];
  controller = mount(root, { state, onAction(action) { committed.push(action); const response = attempt(state, action); state = response.state; controller.update(state); return response; } });
  function click(field, value) { const target = allButtons().find(item => item.dataset[field] === value); assert.ok(target, `missing ${field}=${value}`); target.focus(); listeners.get('click')({ target }); }
  function complete(value=true) { const target=fields.get('[data-asm-all]'); target.checked=value; target.focus(); listeners.get('change')({target}); }
  function choose(selector, value) { const target = fields.get(selector); target.value = value; target.focus(); listeners.get('change')({ target }); }
  return { controller, fields, calls, committed, listeners, click, choose, complete, toolButtons: () => buttons.filter(item => item.dataset.asmTool), get state() { return state; }, get sceneOptions() { return sceneOptions; }, get writes() { return writes; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('accessible tool choices are ephemeral and fit, screw and paste buttons use the real mechanical rules', () => {
  const bench = workbench(), original = structuredClone(bench.state);
  for (const tool of ASSEMBLY_TOOLS) {
    bench.click('asmTool', tool.id);
    assert.equal(bench.toolButtons().find(item => item.dataset.asmTool === tool.id).attrs['aria-pressed'], 'true');
  }
  assert.deepEqual(bench.state, original); assert.equal(bench.committed.length, 0);
  bench.click('asmTool', 'move'); bench.click('asmPart', 'psu'); bench.click('asmUseTool', 'fit');
  assert.equal(bench.state.assembly.psuInstalled, true);
  bench.click('asmTool', 'screwdriver'); bench.choose('[data-asm-fastener]', 'psu-0'); bench.click('asmUseTool', 'turn');
  assert.equal(bench.state.assembly.psuScrews[0], true);
  bench.click('asmTool', 'paste'); bench.click('asmUseTool', 'apply');
  assert.equal(bench.state.assembly.paste, 'clean'); assert.match(bench.fields.get('[data-asm-feedback]').textContent, /processor/i);
  assert.equal(bench.writes, 1, 'tool changes must retain the equipment host');
  bench.controller.dispose();
});

test('native tool controls keep power guards and report or section cancellation commits nothing',()=>{
  const bench=workbench('INC-101'),before=structuredClone(bench.state);bench.complete();
  bench.click('asmTool','screwdriver');bench.choose('[data-asm-fastener]','panel-0');bench.click('asmUseTool','turn');
  assert.deepEqual(bench.state,before);assert.equal(bench.committed.at(-1),'asm-loosen-panel-0');
  const count=bench.committed.length;bench.controller.cancel();bench.controller.setVisible(false);
  bench.click('asmUseTool','turn');assert.deepEqual(bench.state,before);assert.equal(bench.committed.length,count);
  bench.controller.dispose();assert.equal(bench.listeners.size,0);
});
