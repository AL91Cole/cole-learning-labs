import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS } from '../src/assembly-model.js';
import { ASSEMBLY_TOOLS, assemblyToolAction } from '../src/assembly-tools.js';
import { initialHardwareState, applyHardwareAction } from '../src/hardware.js';

const source = readFileSync(new URL('../src/assembly-workbench.js', import.meta.url), 'utf8');
const lazyImport = /import\('\.\/assembly-scene\.js\?release=[^']+'\)/g;
assert.equal([...source.matchAll(lazyImport)].length, 1, 'the optional scene must have one explicit lazy-loading boundary');

// A small DOM boundary exercises the real controller and real mechanical model.
// Native focus, touch gestures and graphics remain browser QA, not mock claims.
function fixture({ hidden = false, loader } = {}) {
  const doc = { activeElement: null };
  const listeners = new Map(), fields = new Map();
  let staticButtons = [], actionButtons = [], rootWrites = 0;
  function node(dataset = {}) {
    return { dataset, textContent: '', value: '', attrs: {},
      setAttribute(name, value) { this.attrs[name] = value; },
      focus() { doc.activeElement = this; },
      closest(selector) { return selector === 'button' ? this : null; },
      matches(selector) { return selector === '[data-asm-select]' && this === fields.get(selector); }
    };
  }
  function buttons(html) {
    return [...html.matchAll(/<button\b([^>]*)>/g)].map(([, attrs]) => {
      const dataset = Object.fromEntries([...attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([, name, value]) => [name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
      return node(dataset);
    });
  }
  for (const key of ['scene', 'view-status', 'select', 'part-title', 'part-state', 'actions', 'feedback', 'power', 'next', 'delivery', 'loading', 'tool-help', 'tool-controls']) fields.set(`[data-asm-${key}]`, node());
  Object.defineProperty(fields.get('[data-asm-actions]'), 'innerHTML', { set(html) { actionButtons = buttons(html); }, get() { return ''; } });
  const root = { ownerDocument: doc, onclick: () => {}, onkeydown: () => {}, onchange: () => {},
    closest() { return hidden ? {} : null; }, contains(target) { return target === fields.get('[data-asm-select]') || staticButtons.includes(target) || actionButtons.includes(target); },
    querySelector(selector) { return selector === '[data-asm-actions] button' ? actionButtons[0] : fields.get(selector) || null; },
    querySelectorAll(selector) { return selector === '[data-asm-part]' ? staticButtons.filter(item => item.dataset.asmPart) : selector === '[data-assembly-action]' ? [...staticButtons, ...actionButtons].filter(item => item.dataset.assemblyAction) : []; },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); }
  };
  Object.defineProperty(root, 'innerHTML', { set(html) { rootWrites++; staticButtons = buttons(html); }, get() { return ''; } });
  const calls = { loads: 0, mounts: 0, updates: 0, pauses: 0, resumes: 0, disposals: 0 };
  const scene = { update() { calls.updates++; }, select() {}, pause() { calls.pauses++; }, resume() { calls.resumes++; }, dispose() { calls.disposals++; } };
  const sceneModule = { mountAssemblyScene(host) { assert.equal(host, fields.get('[data-asm-scene]')); calls.mounts++; return scene; } };
  const mount = vm.runInNewContext(`${source.replace(/^import[^\n]+\n/gm, '').replace('export function mountAssemblyWorkbench', 'function mountAssemblyWorkbench').replace(lazyImport, 'sceneLoader()')}; mountAssemblyWorkbench`, {
    assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS, ASSEMBLY_TOOLS, assemblyToolAction, sceneLoader() { calls.loads++; return loader ? loader(sceneModule) : Promise.resolve(sceneModule); }
  });
  let state = applyHardwareAction('INC-106', initialHardwareState('INC-106'), 'enable-assembly').state;
  let controller;
  controller = mount(root, { state, onAction(action) { const result = applyHardwareAction('INC-106', state, action); state = result.state; controller.update(state); return result; } });
  function click(field, value) {
    const target = [...staticButtons, ...actionButtons].find(item => item.dataset[field] === value);
    assert.ok(target, `visible control missing: ${value}`);
    target.focus(); listeners.get('click')?.({ target });
  }
  return { calls, controller, fields, doc, root, listeners, click, get state() { return state; }, get rootWrites() { return rootWrites; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('component controls operate without loading graphics and preserve the existing equipment host', () => {
  const current = fixture();
  assert.equal(current.doc.activeElement, current.fields.get('[data-asm-select]'));
  const host = current.fields.get('[data-asm-scene]');
  current.click('asmPart', 'psu');
  current.click('assemblyAction', 'asm-fit-psu');
  assert.equal(current.state.assembly.psuInstalled, true);
  assert.match(current.fields.get('[data-asm-feedback]').textContent, /Power supply/i);
  assert.equal(current.calls.loads, 0);
  assert.equal(current.rootWrites, 1, 'a model update must not replace the scene host or entire controls');
  assert.equal(current.fields.get('[data-asm-scene]'), host);
  assert.ok(current.doc.activeElement.dataset.assemblyAction.startsWith('asm-tighten-psu-'));
  current.controller.dispose();
  assert.equal(current.listeners.size, 0);
});

test('explicit loading waits for a visible workbench and pause survives section switches until resumed', async () => {
  const current = fixture({ hidden: true });
  assert.equal(current.doc.activeElement, null);
  current.click('asmCamera', 'load');
  assert.equal(current.calls.loads, 0);
  current.controller.setVisible(true); await settle();
  assert.equal(current.calls.loads, 1); assert.equal(current.calls.mounts, 1);
  current.click('asmCamera', 'off');
  const resumes = current.calls.resumes;
  current.controller.setVisible(false); current.controller.setVisible(true);
  assert.equal(current.calls.resumes, resumes, 'changing sections must not override an explicit pause');
  current.click('asmCamera', 'load');
  assert.equal(current.calls.resumes, resumes + 1);
  current.controller.setVisible(false); current.controller.setVisible(true);
  assert.equal(current.calls.resumes, resumes + 2, 'explicit resume must restore later section visibility handling');
  current.click('asmPart', 'psu'); current.click('assemblyAction', 'asm-fit-psu');
  assert.equal(current.calls.mounts, 1, 'hardware changes must update the existing renderer');
  assert.equal(current.calls.updates, 1);
  current.controller.dispose();
  assert.equal(current.calls.disposals, 1); assert.equal(current.listeners.size, 0);
});

test('disposing a workbench while its graphics import is pending never mounts a detached renderer', async () => {
  let finish;
  const current = fixture({ loader: module => new Promise(resolve => { finish = () => resolve(module); }) });
  current.click('asmCamera', 'load');
  assert.equal(current.calls.loads, 1);
  current.controller.dispose(); finish(); await settle();
  assert.equal(current.calls.mounts, 0);
  assert.equal(current.listeners.size, 0);
});

test('a graphics load failure leaves mechanical controls usable and permits a deliberate retry', async () => {
  let attempts = 0;
  const current = fixture({ loader: module => ++attempts === 1 ? Promise.reject(new Error('graphics unavailable')) : Promise.resolve(module) });
  current.click('asmCamera', 'load'); await settle();
  assert.match(current.fields.get('[data-asm-view-status]').textContent, /could not load/i);
  current.click('asmPart', 'psu'); current.click('assemblyAction', 'asm-fit-psu');
  assert.equal(current.state.assembly.psuInstalled, true);
  current.click('asmCamera', 'load'); await settle();
  assert.equal(current.calls.loads, 2); assert.equal(current.calls.mounts, 1);
  current.controller.dispose();
});
