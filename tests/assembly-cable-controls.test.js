import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from '../src/assembly-cables.js';
import { ASSEMBLY_TOOLS, assemblyToolAction } from '../src/assembly-tools.js';
import { ASSEMBLY_FASTENERS, assemblyActions, assemblyFailure } from '../src/assembly-model.js';
import { initialHardwareState, applyHardwareAction } from '../src/hardware.js';
const detailed=id=>applyHardwareAction(id,initialHardwareState(id),'enable-assembly').state;
function attempt(state,action){const before=structuredClone(state);const result=applyHardwareAction(state.caseId,state,action);assert.deepEqual(state,before);return result;}
// Exercise native cable controls with the real equipment model.
function cableBench(id = 'INC-106') {
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
  for (const name of ['scene', 'view-status', 'select', 'part-title', 'part-state', 'actions', 'feedback', 'power', 'next', 'delivery', 'loading', 'tool-help', 'tool-controls', 'tool-drawer', 'tool-summary', 'component-drawer', 'view-drawer', 'loading-title', 'loading-text', 'fastener', 'cable', 'cable-target', 'cable-state']) fields.set(`[data-asm-${name}]`, element());
  for (const name of ['actions', 'tool-controls']) Object.defineProperty(fields.get(`[data-asm-${name}]`), 'innerHTML', { set(html) { this.markup=html;dynamic.set(name, parse(html)); }, get() { return this.markup || ''; } });
  const allButtons = () => [...buttons, ...[...dynamic.values()].flat()];
  const root = { ownerDocument: doc, closest: () => null, contains: target => allButtons().includes(target) || [...fields.values()].includes(target),
    querySelector: selector => selector === '[data-asm-actions] button' ? dynamic.get('actions')?.[0] : fields.get(selector) || null,
    querySelectorAll: selector => allButtons().filter(item => selector === '[data-asm-tool]' ? item.dataset.asmTool : selector === '[data-asm-part]' ? item.dataset.asmPart : selector === '[data-assembly-action]' ? item.dataset.assemblyAction : false),
    addEventListener(name, handler) { listeners.set(name, handler); }, removeEventListener(name, handler) { if (listeners.get(name) === handler) listeners.delete(name); } };
  Object.defineProperty(root, 'innerHTML', { set(html) { writes++; buttons = parse(html); } });
  const scene = { update() {}, select() {}, setTool(tool) { calls.tools.push(tool); }, setCable(id) { calls.cable=id; }, cancelInteraction() { calls.canceled++; }, pause() { calls.pauses++; }, resume() {}, dispose() { calls.disposed++; } };
  const mount = vm.runInNewContext(`${source.replace(/^import[^\n]+\n/gm, '').replace('export function mountAssemblyWorkbench', 'function mountAssemblyWorkbench').replace(/import\('\.\/assembly-scene\.js\?release=[^']+'\)/, 'sceneLoader()')}; mountAssemblyWorkbench`, {
    ASSEMBLY_TOOLS, assemblyToolAction, ASSEMBLY_FASTENERS, assemblyActions, assemblyFailure, ASSEMBLY_CABLES, cableConnection, assemblyCableAction,
    sceneLoader: async () => ({ mountAssemblyScene(_host, options) { calls.mounts++; sceneOptions = options; return scene; } })
  });
  let state = detailed(id), controller;
  const committed = [];
  controller = mount(root, { state, onAction(action) { committed.push(action); const response = attempt(state, action); state = response.state; controller.update(state); return response; } });
  function click(field, value) { const target = allButtons().find(item => item.dataset[field] === value); assert.ok(target, `missing ${field}=${value}`); target.focus(); listeners.get('click')({ target }); }
  function choose(selector, value) { const target = fields.get(selector); target.value = value; target.focus(); listeners.get('change')({ target }); }
  return { controller, fields, calls, committed, listeners, click, choose, toolButtons: () => buttons.filter(item => item.dataset.asmTool), button: (field,value) => allButtons().find(item=>item.dataset[field]===value), get state() { return state; }, get sceneOptions() { return sceneOptions; }, get writes() { return writes; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('all ten cables have native selection and connection controls without changing equipment on selection',()=>{
  const bench=cableBench('INC-101'),before=structuredClone(bench.state);
  bench.click('asmTool','cables');
  assert.equal(ASSEMBLY_CABLES.length,10);
  for(const cable of ASSEMBLY_CABLES){
    bench.choose('[data-asm-cable]',cable.id);
    assert.ok(bench.fields.get('[data-asm-cable-state]').textContent.startsWith(cable.label+':'));
    const html=bench.fields.get('[data-asm-tool-controls]').innerHTML;
    assert.match(html,/aria-label="Choose a cable"/);
    assert.match(html,/aria-label="Choose a connection point"/);
    assert.ok(html.includes(`value="${cable.sockets[0].id}"`));
    assert.ok(bench.button('asmCableAction','connect'));assert.ok(bench.button('asmCableAction','disconnect'));
  }
  assert.deepEqual(bench.state,before);assert.equal(bench.committed.length,0);
  assert.equal(bench.writes,1,'picker changes must retain the equipment host');
  bench.controller.dispose();
});

test('large HDMI controls preserve independent PC and monitor ends and leave the running OS loaded',()=>{
  const bench=cableBench('INC-101');bench.click('asmTool','cables');
  bench.choose('[data-asm-cable]','hdmi-pc');bench.choose('[data-asm-cable-target]','hdmi-gpu');bench.click('asmCableAction','connect');
  assert.equal(bench.state.videoPort,'gpu');assert.equal(bench.state.pcVideoConnected,true);
  bench.click('asmCableAction','disconnect');
  assert.equal(bench.state.pcVideoConnected,false);assert.equal(bench.state.signalConnected,true);assert.equal(bench.state.booted,true);
  assert.match(bench.fields.get('[data-asm-cable-state]').textContent,/disconnected.*parked/);
  bench.click('asmCableAction','connect');assert.equal(bench.state.pcVideoConnected,true);
  bench.choose('[data-asm-cable]','hdmi-monitor');bench.click('asmCableAction','disconnect');
  assert.equal(bench.state.signalConnected,false);assert.equal(bench.state.pcVideoConnected,true);assert.equal(bench.state.booted,true);
  bench.click('asmCableAction','connect');assert.equal(bench.state.signalConnected,true);
  assert.match(bench.fields.get('[data-asm-cable-state]').textContent,/connected at/);
  assert.equal(bench.state.documentOpened,false,'a picture alone does not deliver the lesson');
  bench.controller.dispose();
});

test('internal cable controls cannot bypass PC, AC or case-panel safety checks',()=>{
  const bench=cableBench('INC-101');bench.click('asmTool','cables');bench.choose('[data-asm-cable]','atx');
  const before=structuredClone(bench.state);bench.click('asmCableAction','disconnect');assert.deepEqual(bench.state,before);
  bench.click('assemblyAction','power-off');bench.click('asmCableAction','disconnect');assert.equal(bench.state.atxConnected,true);
  bench.click('assemblyAction','unplug');bench.click('asmCableAction','disconnect');assert.equal(bench.state.atxConnected,true);
  bench.click('asmPart','panel');
  for(const action of ['asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel'])bench.click('assemblyAction',action);
  bench.click('asmCableAction','disconnect');assert.equal(bench.state.atxConnected,false);
  assert.match(bench.fields.get('[data-asm-cable-state]').textContent,/disconnected/);
  bench.controller.dispose();
});

test('malformed native picker values and forged button commands do not become equipment actions',()=>{
  const bench=cableBench('INC-101');bench.click('asmTool','cables');bench.choose('[data-asm-cable]','hdmi-pc');
  const before=structuredClone(bench.state),count=bench.committed.length;
  for(const value of ['__proto__','constructor','<script>','student-email'])bench.choose('[data-asm-cable]',value);
  for(const value of ['ssd-data','__proto__','upload-roster'])bench.choose('[data-asm-cable-target]',value);
  assert.deepEqual(bench.state,before);assert.equal(bench.committed.length,count);
  const target=bench.button('asmCableAction','connect');target.dataset.asmCableAction='upload';bench.listeners.get('click')({target});
  assert.deepEqual(bench.state,before);assert.equal(bench.committed.length,count);
  bench.controller.dispose();
});

test('selected native cable status persists and report or section cancellation commits nothing',()=>{
  const bench=cableBench('INC-101');bench.click('asmTool','cables');bench.choose('[data-asm-cable]','hdmi-monitor');
  assert.match(bench.fields.get('[data-asm-cable-state]').textContent,/HDMI.*monitor/i);
  const before=structuredClone(bench.state),count=bench.committed.length;
  bench.controller.cancel();bench.controller.setVisible(false);bench.click('asmCableAction','disconnect');
  assert.deepEqual(bench.state,before);assert.equal(bench.committed.length,count);
  bench.controller.setVisible(true);assert.match(bench.fields.get('[data-asm-cable-state]').textContent,/HDMI.*monitor/i);
  bench.controller.dispose();assert.equal(bench.listeners.size,0);
});

test('the actual report includes both disconnected HDMI ends and the other authored cable states',()=>{
  const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const start=source.indexOf('function hardwareCableSummary('),end=source.indexOf('\nfunction openReport',start);
  assert.ok(start>=0&&end>start,'the report must include the hardware cable summary');
  const report=vm.runInNewContext(`${source.slice(start,end)}; reportText`,{
    tracks:{hardware:{name:'Hardware & ServiceDesk'}},readQuestionEvents:()=>[],experimentReport:()=>'',eventMessage:event=>event.message
  });
  for(const enabled of [false,true]){
    let state=enabled?detailed('INC-101'):initialHardwareState('INC-101');
    for(const action of ['disconnect-video','disconnect-signal'])state=attempt(state,action).state;
    assert.equal(state.pcVideoConnected,false);assert.equal(state.signalConnected,false);
    const result=report({id:'INC-101',title:'The Blank Monitor',grade:'7–12',track:'hardware',goal:'Open the original lesson.',clues:[]},{state,events:[],evidence:[],plan:'',notes:'',reflection:'',closed:false,verified:false});
    assert.match(result,/CABLE CONNECTIONS\nAC power: connected\nHDMI PC end: disconnected\nHDMI monitor end: disconnected/);
    for(const label of ['ATX 24-pin','CPU 8-pin','GPU power','SATA data','SATA power','Front panel'])assert.ok(result.includes(label+': connected'),label);
    assert.match(result,/PC video output: board\nMonitor source: hdmi/);
    if(enabled)assert.match(result,/CPU fan: connected/);
  }
});
