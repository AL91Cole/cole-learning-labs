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
    const element={ dataset, textContent: '', value: '', attrs: {}, open: false, drawer:null, scrolled:[],
      setAttribute(name, value) { this.attrs[name] = value; if(name==='hidden')this.hidden=true; },
      removeAttribute(name) { delete this.attrs[name]; if(name==='hidden')this.hidden=false; },
      focus() { doc.activeElement = this; },
      scrollIntoView(options){this.scrolled.push({block:options.block,behavior:options.behavior});},
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
      const element=node(dataset);element.disabled=/\bdisabled(?:\s|=|$)/.test(attrs);return element;
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
    querySelectorAll(selector) { return selector === '[data-asm-tool]' ? staticButtons.filter(item=>item.dataset.asmTool) : selector === '[data-asm-part]' ? staticButtons.filter(item => item.dataset.asmPart) : selector === '[data-assembly-action]' ? allButtons().filter(item => item.dataset.assemblyAction) : selector==='[data-asm-quick-view]'?staticButtons.filter(item=>item.dataset.asmQuickView):[]; },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); }
  };
  Object.defineProperty(root, 'innerHTML', { set(html) { rootWrites++; markup=html; staticButtons = buttons(html); }, get() { return markup; } });
  const calls = { loads: 0, mounts: 0, updates: 0, pauses: 0, resumes: 0, disposals: 0, views:[], selections:[], repairs:[] };
  const scene = { update() { calls.updates++; }, select(id) {calls.selections.push(id);}, cancelInteraction(){calls.views.push('cancel');}, zoom(direction){calls.views.push('zoom:'+direction);},fit(){calls.views.push('fit');},focusSelected(){calls.views.push('focus');},resetView(){calls.views.push('reset');},setView(name){calls.views.push('preset:'+name);}, pause() { calls.pauses++; }, resume() { calls.resumes++; }, dispose() { calls.disposals++; } };
  const sceneModule = { mountAssemblyScene(host,options) { assert.equal(host, fields.get('[data-asm-scene]')); calls.mounts++; calls.options=options; return webglUnavailable?null:scene; } };
  const mount = vm.runInNewContext(`${source.replace(/^import[^\n]+\n/gm, '').replace('export function mountAssemblyWorkbench', 'function mountAssemblyWorkbench').replace(lazyImport, 'sceneLoader()')}; mountAssemblyWorkbench`, {
    assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS, ASSEMBLY_TOOLS, assemblyToolAction, ASSEMBLY_CABLES, cableConnection, assemblyCableAction, sceneLoader() { calls.loads++; return loader ? loader(sceneModule) : Promise.resolve(sceneModule); }
  });
  let state = applyHardwareAction(caseId, initialHardwareState(caseId), 'enable-assembly').state;
  let controller;
  controller = mount(root, { state, onAction(action) { calls.repairs.push(action);const result = applyHardwareAction(caseId, state, action); state = result.state; controller.update(state); return result; } });
  function click(field, value) {
    const target = allButtons().find(item => item.dataset[field] === value);
    assert.ok(target, `visible control missing: ${value}`);
    if(!target.disabled){target.focus(); listeners.get('click')?.({ target });}
  }
  function choose(selector,value){const target=fields.get(selector);target.value=value;target.focus();listeners.get('change')?.({target});}
  return { calls, controller, fields, doc, root, listeners, click, choose,button:(field,value)=>allButtons().find(item=>item.dataset[field]===value), get markup(){return markup;}, get state() { return state; }, get rootWrites() { return rootWrites; } };
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

test('zoom, fit and part focus are available beside the equipment without opening a drawer',async()=>{
  const current=fixture();
  const start=current.markup.indexOf('<div class="asm-quick-view"'),end=current.markup.indexOf('</div>',start),row=current.markup.slice(start,end);
  assert.ok(start>current.markup.indexOf('data-asm-scene'));
  assert.ok(end<current.markup.indexOf('class="asm-drawers"'),'View controls must sit outside all optional drawers');
  assert.match(row,/role="group" aria-label="Adjust the 3D view"/);
  for(const [id,label] of [['out','Zoom out'],['fit','Fit PC'],['in','Zoom in'],['focus','Focus part']]) {
    assert.match(row,new RegExp('data-asm-camera="'+id+'"[^>]*>'+label+'<'));
    assert.equal(current.button('asmCamera',id).disabled,true,'Loading graphics must not offer an inactive camera action');
  }
  await settle();
  for(const id of ['out','fit','in','focus'])assert.equal(current.button('asmCamera',id).disabled,false);
  for(const name of ['component-drawer','view-drawer'])assert.equal(current.fields.get(`[data-asm-${name}]`).open,false);
  assert.equal(current.rootWrites,1);current.controller.dispose();
});

test('camera buttons cancel a held gesture and use only the bounded renderer APIs without recording repairs',async()=>{
  const current=fixture();await settle();
  const before=structuredClone(current.state),host=current.fields.get('[data-asm-scene]');
  current.calls.views.length=0;
  for(const id of ['in','out','fit','focus','reset','monitor','rear-io'])current.click('asmCamera',id);
  assert.deepEqual(current.calls.views,['cancel','zoom:in','cancel','zoom:out','cancel','fit','cancel','focus','cancel','reset','cancel','preset:monitor','cancel','preset:rear-io']);
  assert.deepEqual(current.state,before);assert.deepEqual(current.calls.repairs,[]);
  assert.equal(current.rootWrites,1);assert.equal(current.fields.get('[data-asm-scene]'),host);
  assert.equal(current.doc.activeElement,current.button('asmCamera','rear-io'),'View changes keep keyboard focus on the selected control');
  assert.equal(current.fields.get('[data-asm-component-drawer]').open,false);
  current.controller.dispose();
});

test('zoom remains unavailable during an explicit pause, hidden section or graphics loss and recovers deliberately',async()=>{
  const current=fixture();await settle();
  const assertReady=ready=>{for(const id of ['out','fit','in','focus'])assert.equal(current.button('asmCamera',id).disabled,!ready,id);};
  assertReady(true);current.click('asmCamera','off');assertReady(false);
  const views=current.calls.views.length;current.click('asmCamera','in');assert.equal(current.calls.views.length,views,'Native disabled controls do not dispatch');
  current.controller.setVisible(false);current.controller.setVisible(true);assertReady(false);
  current.click('asmCamera','load');assertReady(true);
  current.controller.setVisible(false);assertReady(false);current.controller.setVisible(true);assertReady(true);
  current.calls.options.onStatus({kind:'context-lost',message:'Graphics paused.'});assertReady(false);
  current.calls.options.onStatus({kind:'context-restored',message:'Graphics restored.'});assertReady(true);
  assert.deepEqual(current.calls.repairs,[]);current.controller.dispose();
});

test('opening graphics does not highlight the case panel before an actual part is selected',async()=>{
  const current=fixture();await settle();
  assert.deepEqual(current.calls.selections,[],'The initial equipment picture must not draw an unsolicited selection outline');
  current.calls.options.onSelect('ram');assert.deepEqual(current.calls.selections,['ram']);
  assert.equal(current.fields.get('[data-asm-select]').value,'ram');
  assert.deepEqual(current.calls.repairs,[]);current.controller.dispose();
});

test('a deliberate component choice made during graphics loading is selected when its scene arrives',async()=>{
  let finish;
  const current=fixture({loader:module=>new Promise(resolve=>{finish=()=>resolve(module);})});
  current.choose('[data-asm-select]','cpu');assert.deepEqual(current.calls.selections,[]);
  finish();await settle();assert.deepEqual(current.calls.selections,['cpu']);
  assert.deepEqual(current.calls.repairs,[]);current.controller.dispose();
});

test('explicit ready quick-view actions reveal the equipment without moving focus or changing work',async()=>{
  const current=fixture(),host=current.fields.get('[data-asm-scene]');await settle();
  assert.deepEqual(host.scrolled,[],'Automatic graphics loading must not scroll the student away from the ticket');
  const before=structuredClone(current.state);
  current.choose('[data-asm-select]','ram');current.controller.update(current.state);
  assert.deepEqual(host.scrolled,[],'Part selection and model feedback must not move the page');
  for(const id of ['focus','in','out','fit']) {
    const count=host.scrolled.length;current.click('asmCamera',id);
    assert.equal(host.scrolled.length,count+1);
    assert.deepEqual(host.scrolled.at(-1),{block:'start',behavior:'instant'});
    assert.equal(current.doc.activeElement,current.button('asmCamera',id),'The selected camera button retains keyboard focus');
  }
  for(const id of ['monitor','reset','off'])current.click('asmCamera',id);
  const count=host.scrolled.length;current.click('asmCamera','in');
  assert.equal(host.scrolled.length,count,'Drawer presets and disabled paused camera controls do not cause quick-view scrolling');
  assert.deepEqual(current.state,before);assert.deepEqual(current.calls.repairs,[]);current.controller.dispose();
});

test('quick-view controls do not scroll while graphics are loading or unavailable',async()=>{
  for(const options of [{loader:()=>new Promise(()=>{})},{webglUnavailable:true}]) {
    const current=fixture(options);await settle();
    for(const id of ['focus','in','out','fit'])current.click('asmCamera',id);
    assert.deepEqual(current.fields.get('[data-asm-scene]').scrolled,[]);
    assert.deepEqual(current.calls.repairs,[]);current.controller.dispose();
  }
});
