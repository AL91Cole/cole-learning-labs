import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS } from '../src/assembly-model.js';
import { ASSEMBLY_TOOLS, assemblyToolAction } from '../src/assembly-tools.js';
import { initialHardwareState, applyHardwareAction } from '../src/hardware.js';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from '../src/assembly-cables.js';

const source = readFileSync(new URL('../src/assembly-workbench.js', import.meta.url), 'utf8');
const lazyImport = /import\('\.\/assembly-scene\.js\?release=[^']+'\)/g;
assert.equal([...source.matchAll(lazyImport)].length, 1, 'the scene must have one visibility-gated lazy-loading boundary');

// A small DOM boundary exercises the real controller and real mechanical model.
// Native focus, touch gestures and graphics remain browser QA, not mock claims.
function fixture({ hidden = false, loader, webglUnavailable = false, caseId='INC-106' } = {}) {
  const doc = { activeElement: null };
  const listeners = new Map(), fields = new Map();
  let staticButtons = [], actionButtons = [], toolButtons = [], rootWrites = 0, markup = '';
  function node(dataset = {}) {
    const element={ dataset, textContent: '', value: '', attrs: {}, open: false, drawer:null,
      setAttribute(name, value) { this.attrs[name] = value; if(name==='hidden')this.hidden=true; },
      removeAttribute(name) { delete this.attrs[name]; if(name==='hidden')this.hidden=false; },
      focus() { doc.activeElement = this; },
      closest(selector) { return selector === 'button' ? this : selector==='[hidden]'&&this.hidden?this:selector==='details:not([open])'&&this.drawer&&!this.drawer.open?this.drawer:null; },
      matches(selector) { return this === fields.get(selector); }
    };
    let isHidden=false;
    Object.defineProperty(element,'hidden',{get:()=>isHidden,set(value){isHidden=!!value;if(isHidden&&doc.activeElement===element)doc.activeElement=null;}});
    return element;
  }
  function buttons(html) {
    return [...html.matchAll(/<button\b([^>]*)>/g)].map(([, attrs]) => {
      const dataset = Object.fromEntries([...attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([, name, value]) => [name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
      return node(dataset);
    });
  }
  for (const key of ['scene', 'view-status', 'select', 'part-title', 'part-state', 'actions', 'feedback', 'power', 'next', 'delivery', 'loading', 'loading-title', 'loading-text', 'tool-help', 'tool-controls', 'tool-drawer', 'tool-summary', 'component-drawer', 'view-drawer', 'fastener', 'cable', 'cable-target']) fields.set(`[data-asm-${key}]`, node());
  fields.get('[data-asm-select]').drawer=fields.get('[data-asm-component-drawer]');
  Object.defineProperty(fields.get('[data-asm-actions]'), 'innerHTML', { set(html) { actionButtons = buttons(html);actionButtons.forEach(button=>{button.drawer=fields.get('[data-asm-component-drawer]');}); }, get() { return ''; } });
  Object.defineProperty(fields.get('[data-asm-tool-controls]'), 'innerHTML', { set(html) { toolButtons = buttons(html); }, get() { return ''; } });
  const allButtons=()=>[...staticButtons,...actionButtons,...toolButtons];
  const root = { ownerDocument: doc, onclick: () => {}, onkeydown: () => {}, onchange: () => {},
    closest() { return hidden ? {} : null; }, contains(target) { return [...fields.values()].includes(target)||allButtons().includes(target); },
    querySelector(selector) { return selector === '[data-asm-actions] button' ? actionButtons[0] : fields.get(selector) || null; },
    querySelectorAll(selector) { return selector === '[data-asm-tool]' ? staticButtons.filter(item=>item.dataset.asmTool) : selector === '[data-asm-part]' ? staticButtons.filter(item => item.dataset.asmPart) : selector === '[data-assembly-action]' ? allButtons().filter(item => item.dataset.assemblyAction) : []; },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); }
  };
  Object.defineProperty(root, 'innerHTML', { set(html) { rootWrites++; markup=html; staticButtons = buttons(html); }, get() { return markup; } });
  const calls = { loads: 0, mounts: 0, updates: 0, pauses: 0, resumes: 0, disposals: 0 };
  const scene = { update() { calls.updates++; }, select() {}, pause() { calls.pauses++; }, resume() { calls.resumes++; }, dispose() { calls.disposals++; } };
  const sceneModule = { mountAssemblyScene(host,options) { assert.equal(host, fields.get('[data-asm-scene]')); calls.mounts++; calls.options=options; return webglUnavailable?null:scene; } };
  const mount = vm.runInNewContext(`${source.replace(/^import[^\n]+\n/gm, '').replace('export function mountAssemblyWorkbench', 'function mountAssemblyWorkbench').replace(lazyImport, 'sceneLoader()')}; mountAssemblyWorkbench`, {
    assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS, ASSEMBLY_TOOLS, assemblyToolAction, ASSEMBLY_CABLES, cableConnection, assemblyCableAction, sceneLoader() { calls.loads++; return loader ? loader(sceneModule) : Promise.resolve(sceneModule); }
  });
  let state = applyHardwareAction(caseId, initialHardwareState(caseId), 'enable-assembly').state;
  let controller;
  controller = mount(root, { state, onAction(action) { const result = applyHardwareAction(caseId, state, action); state = result.state; controller.update(state); return result; } });
  function click(field, value) {
    const target = allButtons().find(item => item.dataset[field] === value);
    assert.ok(target, `visible control missing: ${value}`);
    target.focus(); listeners.get('click')?.({ target });
  }
  function choose(selector,value){const target=fields.get(selector);target.value=value;target.focus();listeners.get('change')?.({target});}
  return { calls, controller, fields, doc, root, listeners, click, choose, get markup(){return markup;}, get state() { return state; }, get rootWrites() { return rootWrites; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('component controls operate while graphics are loading and preserve the existing equipment host', () => {
  const current = fixture({loader:()=>new Promise(()=>{})});
  assert.equal(current.doc.activeElement,null,'Starting the workbench must not steal keyboard focus');
  const host = current.fields.get('[data-asm-scene]');
  current.click('asmPart', 'psu');
  current.click('assemblyAction', 'asm-fit-psu');
  assert.equal(current.state.assembly.psuInstalled, true);
  assert.match(current.fields.get('[data-asm-feedback]').textContent, /Power supply/i);
  assert.equal(current.calls.loads, 1); assert.equal(current.calls.mounts,0);
  assert.equal(current.rootWrites, 1, 'a model update must not replace the scene host or entire controls');
  assert.equal(current.fields.get('[data-asm-scene]'), host);
  assert.ok(current.doc.activeElement.dataset.assemblyAction.startsWith('asm-tighten-psu-'));
  current.controller.dispose();
  assert.equal(current.listeners.size, 0);
});

test('automatic loading waits for a visible workbench and explicit pause survives section switches', async () => {
  const current = fixture({ hidden: true });
  assert.equal(current.doc.activeElement, null);
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
  assert.equal(current.calls.loads, 1);
  current.controller.dispose(); finish(); await settle();
  assert.equal(current.calls.mounts, 0);
  assert.equal(current.listeners.size, 0);
});

test('a graphics load failure leaves mechanical controls usable and permits a deliberate retry', async () => {
  let attempts = 0;
  const current = fixture({ loader: module => ++attempts === 1 ? Promise.reject(new Error('graphics unavailable')) : Promise.resolve(module) });
  await settle();
  assert.match(current.fields.get('[data-asm-view-status]').textContent, /could not load/i);
  assert.equal(current.fields.get('[data-asm-component-drawer]').open,true);
  assert.match(current.fields.get('[data-asm-loading-title]').textContent,/Part controls/);
  current.click('asmPart', 'psu'); current.click('assemblyAction', 'asm-fit-psu');
  assert.equal(current.state.assembly.psuInstalled, true);
  current.click('asmCamera', 'load'); await settle();
  assert.equal(current.calls.loads, 2); assert.equal(current.calls.mounts, 1);
  current.controller.dispose();
});

test('a visible workbench opens 3D automatically with compact test controls and default-closed drawers', async()=>{
  const current=fixture();
  assert.equal(current.calls.loads,1,'Entering the visible workbench initiates its one graphics import');
  assert.equal(current.calls.mounts,0);
  assert.equal(current.fields.get('[data-asm-tool-drawer]').hidden,true);
  for(const name of ['component-drawer','view-drawer']){
    assert.equal(current.fields.get(`[data-asm-${name}]`).open,false);
    assert.match(current.markup,new RegExp(`<details[^>]*data-asm-${name}[^>]*>`));
    assert.doesNotMatch(current.markup,new RegExp(`<details[^>]*data-asm-${name}[^>]*\\bopen\\b`));
  }
  assert.match(current.markup,/data-assembly-action="boot">Test PC</);
  assert.match(current.markup,/data-assembly-action="open-document">Open lesson</);
  assert.doesNotMatch(current.markup,/Load 3D view|Your equipment is ready|DETAILED EQUIPMENT LAB/);
  await settle();
  assert.equal(current.calls.mounts,1);
  assert.equal(current.fields.get('[data-asm-loading]').hidden,true);
  assert.equal(current.doc.activeElement,null);
  current.controller.dispose();
});

test('hiding during import prevents a detached graphics mount and later visibility reuses the loaded module',async()=>{
  let finish;
  const current=fixture({loader:module=>new Promise(resolve=>{finish=()=>resolve(module);})});
  current.controller.setVisible(false); finish(); await settle();
  assert.equal(current.calls.mounts,0);
  current.controller.setVisible(true); await settle();
  assert.equal(current.calls.mounts,1); assert.equal(current.calls.loads,1);
  current.controller.dispose();
});

test('pausing a pending load prevents automatic mounting until the user resumes',async()=>{
  let finish;
  const current=fixture({loader:module=>new Promise(resolve=>{finish=()=>resolve(module);})});
  current.click('asmCamera','off'); finish(); await settle();
  assert.equal(current.calls.mounts,0);
  current.controller.setVisible(false);current.controller.setVisible(true);await settle();
  assert.equal(current.calls.mounts,0);
  current.click('asmCamera','load');await settle();
  assert.equal(current.calls.mounts,1);assert.equal(current.calls.loads,1);
  current.controller.dispose();
});

test('resume requested while hidden waits for visibility instead of waking hidden WebGL',async()=>{
  const current=fixture();await settle();
  current.click('asmCamera','off');current.controller.setVisible(false);
  const resumed=current.calls.resumes;
  current.click('asmCamera','load');
  assert.equal(current.calls.resumes,resumed);
  current.controller.setVisible(true);
  assert.equal(current.calls.resumes,resumed+1);
  current.controller.dispose();
});

test('tool choice reveals its controls intentionally and model updates preserve native disclosure and focus',async()=>{
  const current=fixture();await settle();
  current.fields.get('[data-asm-view-drawer]').open=true;
  current.click('asmTool','cables');
  assert.equal(current.fields.get('[data-asm-tool-drawer]').hidden,false);
  assert.equal(current.fields.get('[data-asm-tool-drawer]').open,true);
  assert.equal(current.fields.get('[data-asm-tool-summary]').textContent,'Cable controls');
  current.fields.get('[data-asm-tool-drawer]').open=false;
  current.choose('[data-asm-cable]','sata-data');
  assert.equal(current.doc.activeElement,current.fields.get('[data-asm-cable]'));
  assert.equal(current.fields.get('[data-asm-tool-drawer]').open,false,'Cable selection does not reopen a drawer the user closed');
  current.controller.update(current.state);
  assert.equal(current.fields.get('[data-asm-tool-drawer]').open,false);
  assert.equal(current.fields.get('[data-asm-view-drawer]').open,true);
  assert.equal(current.doc.activeElement,current.fields.get('[data-asm-cable]'));
  current.click('asmTool','inspect');
  assert.equal(current.fields.get('[data-asm-tool-drawer]').hidden,true);
  current.controller.dispose();
});

test('an actual equipment selection reveals the matching part controls without stealing focus',async()=>{
  const current=fixture();await settle();
  assert.equal(current.fields.get('[data-asm-component-drawer]').open,false);
  const focus={description:'existing keyboard focus'};current.doc.activeElement=focus;
  current.calls.options.onSelect('ram');
  assert.equal(current.fields.get('[data-asm-component-drawer]').open,true);
  assert.equal(current.fields.get('[data-asm-select]').value,'ram');
  assert.match(current.fields.get('[data-asm-feedback]').textContent,/Memory.*selected.*Part controls/);
  assert.equal(current.doc.activeElement,focus);
  current.controller.dispose();
});

test('unavailable graphics expose the full native repair controls without repeated automatic retries',async()=>{
  const current=fixture({webglUnavailable:true});await settle();
  assert.equal(current.fields.get('[data-asm-component-drawer]').open,true);
  assert.match(current.fields.get('[data-asm-loading-title]').textContent,/Part controls/);
  current.controller.setVisible(false);current.controller.setVisible(true);await settle();
  assert.equal(current.calls.loads,1);assert.equal(current.calls.mounts,1);
  current.click('asmPart','psu');current.click('assemblyAction','asm-fit-psu');
  assert.equal(current.state.assembly.psuInstalled,true);
  current.controller.dispose();
});

test('completed power steps hand keyboard focus to the next visible power control',()=>{
  const current=fixture({caseId:'INC-101',loader:()=>new Promise(()=>{})});
  const partDrawer=current.fields.get('[data-asm-component-drawer]');
  assert.equal(partDrawer.open,false);
  for(const [action,next] of [['power-off','unplug'],['unplug','plug-in'],['plug-in','boot']]){
    current.click('assemblyAction',action);
    assert.equal(current.doc.activeElement?.dataset?.assemblyAction,next,`${action} should continue to ${next}`);
    assert.equal(current.doc.activeElement.hidden,false,'Focus cannot remain on a completed hidden power step');
    assert.equal(current.doc.activeElement.closest('details:not([open])'),null,'Power actions must never move focus into a closed drawer');
    assert.equal(partDrawer.open,false);
  }
  current.click('assemblyAction','boot');
  assert.equal(current.doc.activeElement?.dataset?.assemblyAction,'boot','A visible Test PC button keeps focus');
  current.controller.dispose();
});

test('background model updates do not focus an action belonging to another surface',()=>{
  const current=fixture({loader:()=>new Promise(()=>{})});
  const external={dataset:{assemblyAction:'boot'}};current.doc.activeElement=external;
  current.controller.update(current.state);
  assert.equal(current.doc.activeElement,external);
  assert.equal(current.fields.get('[data-asm-component-drawer]').open,false);
  current.controller.dispose();
});
