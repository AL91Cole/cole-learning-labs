import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../src/three.module.js?release=20261017-realism16';
import { assemblyToolAction, assemblyDropAction, assembledPartFitted } from '../src/assembly-tools.js?release=20261017-realism16';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from '../src/assembly-cables.js?release=20261017-realism16';
import { initialHardwareState } from '../src/hardware.js';
import { initialAssemblyState } from '../src/assembly-model.js';

const source = await readFile(new URL('../src/assembly-scene.js', import.meta.url), 'utf8');

class Surface extends EventTarget {
  listeners = new Map();
  addEventListener(type, listener, options) {
    const set = this.listeners.get(type) || new Set(); set.add(listener); this.listeners.set(type, set);
    super.addEventListener(type, listener, options);
  }
  removeEventListener(type, listener, options) {
    this.listeners.get(type)?.delete(listener);
    super.removeEventListener(type, listener, options);
  }
  listenerCount() { return [...this.listeners.values()].reduce((count, set) => count + set.size, 0); }
  fire(type, fields = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(fields)) Object.defineProperty(event, key, { value, configurable: true });
    this.dispatchEvent(event);
    return event;
  }
}

function harness({ width = 1366, height = 600, dpr = 3, unavailable = false, caseId = 'INC-106', onAction, left = 0, top = 0 } = {}) {
  const page = new Surface(); page.hidden = false;
  const view = new Surface(); page.defaultView = view; view.devicePixelRatio = dpr;
  let nextFrame = 1;
  const queue = new Map();
  view.requestAnimationFrame = callback => { const id = nextFrame++; queue.set(id, callback); return id; };
  view.cancelAnimationFrame = id => queue.delete(id);
  let observer;
  view.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(element) { this.element = element; }
    disconnect() { this.disconnected = true; }
  };
  const dimensions = { width, height };
  const element = () => ({ style: {}, children: [], attributes: new Map(), setAttribute(key, value) { this.attributes.set(key, value); }, appendChild(child) { this.children.push(child); child.parent = this; }, remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); } });
  page.createElement = element;
  const host = {
    ownerDocument: page, children: [],
    getBoundingClientRect: () => ({ ...dimensions, left, top }),
    appendChild(canvas) { this.children.push(canvas); canvas.parent = this; }
  };
  const canvas = new Surface();
  canvas.style = {}; canvas.attributes = new Map(); canvas.captures = new Set();
  canvas.setAttribute = (key, value) => canvas.attributes.set(key, value);
  canvas.getBoundingClientRect = host.getBoundingClientRect;
  canvas.setPointerCapture = id => canvas.captures.add(id);
  canvas.hasPointerCapture = id => canvas.captures.has(id);
  canvas.releasePointerCapture = id => canvas.captures.delete(id);
  canvas.remove = () => { host.children = host.children.filter(child => child !== canvas); };
  let renderer;
  class MockRenderer {
    constructor(options) {
      if (unavailable) throw new Error('WebGL2 not available');
      this.options = options; this.domElement = canvas; this.renders = [];
      renderer = this;
    }
    setClearColor() {}
    setPixelRatio(ratio) { this.ratio = ratio; }
    setSize(w, h) { canvas.width = Math.floor(w * this.ratio); canvas.height = Math.floor(h * this.ratio); }
    render(scene, camera) { this.renders.push({ scene, camera }); }
    dispose() { this.disposed = true; }
  }
  const context = vm.createContext({ THREE: { ...THREE, WebGLRenderer: MockRenderer }, assemblyToolAction, assemblyDropAction, assembledPartFitted, ASSEMBLY_CABLES, cableConnection, assemblyCableAction });
  const code = source.replace(/^import[^\n]*\n/gm, '').replace('export function mountAssemblyScene', 'function mountAssemblyScene');
  const mount = vm.runInContext(`${code}\nmountAssemblyScene;`, context);
  const hardware = initialHardwareState(caseId);
  const assembly = initialAssemblyState(hardware);
  const events = []; const selections = []; const actions = []; const interactions = [];
  const api = mount(host, { hardware, assembly, onStatus: value => events.push(value), onSelect: id => selections.push(id), onAction: action => { actions.push(action); return onAction?.(action); }, onInteraction: info => interactions.push(info) });
  const flush = () => {
    let count = 0;
    while (queue.size) {
      assert.ok(++count < 20, 'The scene must settle without a perpetual animation loop');
      const [id, callback] = queue.entries().next().value;
      queue.delete(id); callback(0);
    }
  };
  const project = point => {
    const camera = renderer.renders.at(-1).camera;
    const projected = new THREE.Vector3(...point).project(camera);
    return { clientX: left + (projected.x + 1) * dimensions.width / 2, clientY: top + (1 - projected.y) * dimensions.height / 2 };
  };
  const component = id => renderer.renders.at(-1).scene.children.find(node => node.userData.selectId === id && node.userData.partKey);
  const cableNode = (id, port = false) => renderer.renders.at(-1).scene.children.find(node => port ? node.userData.cablePortId === id : node.userData.cableEndpointId === id);
  const pointFor = id => {
    const node = component(id) || cableNode(id) || cableNode(id, true) || renderer.renders.at(-1).scene.children.find(node => node.userData.selectId === id);
    const point = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
    return project(point.toArray());
  };
  const pointer = (type, position, extra = {}) => canvas.fire(type, { button: 0, pointerId: 1, pointerType: 'mouse', ...position, ...extra });
  return { api, host, page, view, canvas, dimensions, renderer, queue, observer, hardware, assembly, events, selections, actions, interactions, flush, project, pointFor, pointer, component, cableNode };
}

test('3D is an on-demand, bounded-resolution adapter using real procedural Three geometry', () => {
  const h = harness();
  assert.equal(h.renderer.options.powerPreference, 'low-power');
  assert.equal(h.renderer.options.antialias, false);
  assert.equal(h.queue.size, 1);
  h.flush();
  assert.equal(h.renderer.renders.length, 1);
  assert.equal(h.queue.size, 0);
  assert.ok(h.canvas.width * h.canvas.height <= 900000);
  assert.ok(h.renderer.ratio <= 1.5);
  assert.equal(h.canvas.style.touchAction, 'pan-y');
  assert.equal(h.canvas.attributes.has('tabindex'), false);
  const { scene } = h.renderer.renders[0];
  const ids = new Set(); let triangles = 0; let meshes = 0;
  scene.traverse(object => {
    if (object.userData.selectId) ids.add(object.userData.selectId);
    if (object.isMesh) {
      meshes += 1;
      triangles += ((object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3) * (object.isInstancedMesh ? object.count : 1);
    }
  });
  for (const id of ['board', 'cpu', 'cooler', 'ram', 'gpu', 'ssd', 'psu', 'panel', 'atx', 'cpu-fan']) assert.ok(ids.has(id), id);
  for (const [group, count] of Object.entries({ panel: 2, psu: 4, board: 4, cooler: 4, gpu: 2, ssd: 2 })) {
    for (let i = 0; i < count; i += 1) assert.ok(ids.has(`${group}-${i}`), `${group}-${i}`);
  }
  assert.ok(meshes < 280, `Bounded equipment and connector catalog: ${meshes} mesh objects (including hidden endpoint/port views)`);
  assert.ok(triangles < 18000, `Bounded procedural equipment, silkscreen, and sleeved cables: ${triangles} triangles including hidden states (not a device performance measurement)`);
  h.api.dispose();
});

test('updates preserve authored work, coalesce frames, and fit removed parts to the table', () => {
  const h = harness({ caseId: 'INC-101' }); h.flush();
  const before = structuredClone({ hardware: h.hardware, assembly: h.assembly });
  const nextHardware = { ...h.hardware, cpuInstalled: false, coolerInstalled: false };
  const nextAssembly = { ...h.assembly, panelInstalled: false, psuInstalled: false, paste: 'clean' };
  const snapshot = structuredClone({ hardware: nextHardware, assembly: nextAssembly });
  h.api.update(nextHardware, nextAssembly);
  h.api.update(nextHardware, nextAssembly);
  assert.equal(h.queue.size, 1);
  h.flush();
  assert.deepEqual({ hardware: h.hardware, assembly: h.assembly }, before);
  assert.deepEqual({ hardware: nextHardware, assembly: nextAssembly }, snapshot);
  const scene = h.renderer.renders.at(-1).scene;
  const movable = id => scene.children.find(node => node.userData.selectId === id && node.userData.partKey);
  assert.equal(movable('cpu').position.x, movable('cpu').userData.loose[0]);
  assert.equal(movable('psu').position.x, movable('psu').userData.loose[0]);
  assert.equal(movable('panel').position.x, movable('panel').userData.loose[0]);
  h.api.dispose();
});

test('explicit pause survives page visibility changes; resume renders only once', () => {
  const h = harness(); h.flush();
  const renders = h.renderer.renders.length;
  h.api.pause();
  h.api.setView('top'); h.api.zoom('in'); h.api.update(h.hardware, h.assembly);
  h.page.hidden = true; h.page.fire('visibilitychange');
  h.page.hidden = false; h.page.fire('visibilitychange');
  assert.equal(h.queue.size, 0, 'Foregrounding must not override a hidden workbench or explicit pause');
  h.flush(); assert.equal(h.renderer.renders.length, renders);
  h.api.resume(); assert.equal(h.queue.size, 1); h.flush();
  assert.equal(h.renderer.renders.length, renders + 1);
  h.api.setView('rear'); assert.equal(h.queue.size, 1);
  h.page.hidden = true; h.page.fire('visibilitychange');
  assert.equal(h.queue.size, 0, 'Backgrounding releases an outstanding frame');
  h.page.hidden = false; h.page.fire('visibilitychange'); h.flush();
  assert.equal(h.renderer.renders.length, renders + 2);
  h.api.dispose();
});

test('context loss preserves simulation data and restores the existing scene safely', () => {
  const h = harness(); h.flush();
  const original = structuredClone({ hardware: h.hardware, assembly: h.assembly });
  const event = h.canvas.fire('webglcontextlost');
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.events.at(-1).kind, 'context-lost');
  h.api.setView('top'); h.api.update(h.hardware, h.assembly);
  assert.equal(h.queue.size, 0);
  h.canvas.fire('webglcontextrestored'); h.flush();
  assert.equal(h.events.at(-1).kind, 'context-restored');
  assert.equal(h.renderer.renders.length, 2);
  assert.deepEqual({ hardware: h.hardware, assembly: h.assembly }, original);
  h.api.dispose();
});

test('resize keeps high-DPI tablet buffers bounded and skips hidden zero-sized regions', () => {
  const h = harness({ width: 768, height: 500, dpr: 4 }); h.flush();
  assert.ok(h.canvas.width * h.canvas.height <= 900000);
  h.dimensions.width = 4096; h.dimensions.height = 2160; h.observer.callback(); h.flush();
  assert.ok(h.canvas.width * h.canvas.height <= 900000);
  assert.ok(h.renderer.ratio < 1, 'Large viewports can use a deliberately smaller internal framebuffer');
  const renders = h.renderer.renders.length;
  h.dimensions.width = 0; h.dimensions.height = 0; h.observer.callback();
  assert.equal(h.queue.size, 0); assert.equal(h.renderer.renders.length, renders);
  h.api.dispose();
});

test('an uncaptured pointer released outside the canvas cannot leave camera gestures stuck', () => {
  const h = harness(); h.flush();
  const pointer = { button: 0, pointerId: 7, pointerType: 'mouse', clientX: 30, clientY: 30 };
  h.canvas.fire('pointerdown', pointer);
  h.page.fire('pointerup', { ...pointer, clientX: 1400 });
  h.canvas.fire('pointerdown', pointer);
  h.canvas.fire('pointermove', { ...pointer, clientX: 100 });
  assert.equal(h.canvas.hasPointerCapture(7), true, 'A new drag works after the outside release');
  h.api.pause();
  assert.equal(h.canvas.hasPointerCapture(7), false);
  assert.equal(h.queue.size, 0);
  h.api.dispose();
});

test('dispose releases the canvas, observers, event handlers, GPU objects, and pending frame', () => {
  const h = harness(); h.flush();
  const resources = new Set();
  h.renderer.renders[0].scene.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) resources.add(material);
  });
  const released = new Set(); for (const resource of resources) resource.addEventListener('dispose', () => released.add(resource));
  h.api.zoom('out'); assert.equal(h.queue.size, 1);
  h.api.dispose(); h.api.dispose();
  assert.equal(h.queue.size, 0); assert.equal(h.host.children.length, 0);
  assert.equal(h.observer.disconnected, true); assert.equal(h.renderer.disposed, true);
  assert.equal(h.canvas.listenerCount(), 0); assert.equal(h.page.listenerCount(), 0); assert.equal(h.view.listenerCount(), 0);
  assert.equal(released.size, resources.size, 'Each real shared geometry and material is disposed');
  const renders = h.renderer.renders.length;
  h.api.resume(); h.api.setView('side'); h.api.update(h.hardware, h.assembly); h.flush();
  assert.equal(h.renderer.renders.length, renders);
});

test('unsupported WebGL2 uses labeled-workbench fallback without creating listeners or canvas', () => {
  const h = harness({ unavailable: true });
  assert.equal(h.api, null); assert.equal(h.host.children.length, 0);
  assert.equal(h.events.length, 1); assert.equal(h.events[0].kind, 'unavailable');
  assert.match(h.events[0].message, /labeled workbench controls/);
  assert.equal(h.page.listenerCount(), 0); assert.equal(h.view.listenerCount(), 0); assert.equal(h.queue.size, 0);
});

test('3D assets remain same-origin with no network or student-work storage in the view adapter', () => {
  assert.match(source, /^import \* as THREE from '\.\/three\.module\.js\?release=20261017-realism16';/);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b|https?:\/\//);
});

test('real raycast drag fits only on release into the matching authored socket', () => {
  const h = harness(); h.flush(); h.api.setView('top'); h.api.setTool('move'); h.flush();
  const origin = h.component('cpu').position.clone();
  const from = h.pointFor('cpu'); const to = h.project(h.component('cpu').userData.fitted);
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.flush();
  assert.equal(h.actions.length, 0, 'A preview must never change the model');
  assert.equal(h.component('cpu').visible, false);
  assert.ok(h.renderer.renders.at(-1).scene.children.some(node => node.userData.assemblyGhost));
  assert.equal(h.interactions.at(-1).kind, 'valid');
  h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['asm-fit-cpu']);
  assert.equal(h.component('cpu').visible, true);
  assert.deepEqual(h.component('cpu').position.toArray(), origin.toArray());
  assert.equal(h.canvas.captures.size, 0);
  assert.equal(h.renderer.renders.at(-1).scene.children.some(node => node.userData.assemblyGhost), false);
  h.api.dispose();
});

test('loose equipment is directly selectable on the bench rather than hidden behind the monitor', () => {
  const h = harness(); h.flush(); h.api.setView('top'); h.flush();
  for (const id of ['board', 'cpu', 'cooler', 'ram', 'gpu', 'ssd', 'psu', 'panel']) {
    const point = h.pointFor(id);
    h.pointer('pointerdown', point); h.pointer('pointerup', point);
    assert.equal(h.selections.at(-1), id, `The ${id} must be directly selectable at its visible center`);
  }
  h.api.dispose();
});

test('an incompatible 3D socket cancels the ghost without dispatching an action', () => {
  const h = harness(); h.flush(); h.api.setView('top'); h.api.setTool('move'); h.flush();
  const from = h.pointFor('cpu'); const to = h.project(h.component('ram').userData.fitted);
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.flush();
  assert.equal(h.interactions.at(-1).kind, 'dragging');
  h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, []);
  assert.equal(h.interactions.at(-1).kind, 'warning');
  assert.equal(h.component('cpu').visible, true);
  h.api.dispose();
});

test('a rejected model action restores the ghost before a synchronous scene update', () => {
  let h;
  h = harness({ onAction: () => {
    assert.equal(h.component('cpu').visible, true, 'Model callback never observes a hidden original');
    assert.equal(h.renderer.renders.at(-1).scene.children.some(node => node.userData.assemblyGhost), false);
    h.api.update(h.hardware, h.assembly);
    return { kind: 'warning', message: 'Fit and secure the board first.' };
  } });
  h.flush(); h.api.setView('top'); h.api.setTool('move'); h.flush();
  const from = h.pointFor('cpu'); const to = h.project(h.component('cpu').userData.fitted);
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['asm-fit-cpu']);
  assert.equal(h.interactions.at(-1).message, 'Fit and secure the board first.');
  assert.equal(h.component('cpu').visible, true);
  h.api.dispose();
});

test('Escape, blur, modal cancel, second pointer, state update, and camera changes abandon movement', () => {
  const cases = [
    h => h.page.fire('keydown', { key: 'Escape' }),
    h => h.view.fire('blur'),
    h => h.api.cancelInteraction(),
    h => h.pointer('pointerdown', h.pointFor('cpu'), { pointerId: 2 }),
    h => h.api.update(h.hardware, h.assembly),
    h => h.api.setView('side'),
    h => h.api.zoom('in'),
    h => h.api.setTool('inspect'),
    h => h.pointer('pointercancel', {}),
    h => { h.page.hidden = true; h.page.fire('visibilitychange'); },
    h => h.canvas.fire('webglcontextlost'),
    h => { h.dimensions.width -= 30; h.observer.callback(); },
    h => h.api.pause()
  ];
  for (const cancel of cases) {
    const h = harness(); h.flush(); h.api.setView('top'); h.api.setTool('move'); h.flush();
    const from = h.pointFor('cpu'); const to = h.project(h.component('cpu').userData.fitted);
    h.pointer('pointerdown', from); h.pointer('pointermove', to); h.flush();
    assert.equal(h.component('cpu').visible, false);
    cancel(h);
    h.pointer('pointerup', to);
    assert.equal(h.component('cpu').visible, true);
    assert.equal(h.canvas.captures.size, 0);
    assert.deepEqual(h.actions, [], String(cancel));
    assert.equal(h.renderer.renders.at(-1).scene.children.some(node => node.userData.assemblyGhost), false);
    h.api.dispose();
  }
});

test('3D screwdriver and paste tools dispatch only the authored model actions', () => {
  const h = harness(); h.flush(); h.api.setView('top'); h.flush();
  h.api.setTool('screwdriver'); h.flush();
  const screw = h.pointFor('panel-0'); h.pointer('pointerdown', screw); h.pointer('pointerup', screw);
  assert.deepEqual(h.actions, ['asm-tighten-panel-0']);
  h.api.setTool('paste'); h.flush();
  const cpu = h.pointFor('cpu'); h.pointer('pointerdown', cpu); h.pointer('pointerup', cpu);
  h.api.setPasteAmount('excess'); h.pointer('pointerdown', cpu); h.pointer('pointerup', cpu);
  h.api.setTool('clean'); h.pointer('pointerdown', cpu); h.pointer('pointerup', cpu);
  assert.deepEqual(h.actions.slice(1), ['asm-apply-paste', 'asm-excess-paste', 'asm-clean-paste']);
  const ram = h.pointFor('ram'); h.pointer('pointerdown', ram); h.pointer('pointerup', ram);
  assert.equal(h.actions.length, 4, 'A cleaning tool cannot clean a RAM module');
  assert.equal(h.interactions.at(-1).kind, 'warning');
  h.api.setTool('inspect'); assert.equal(h.canvas.style.touchAction, 'pan-y');
  h.api.setTool('move'); assert.equal(h.canvas.style.touchAction, 'none');
  h.api.dispose();
});

test('screwdriver offers a forgiving visible-head tap area without turning occluded screws', () => {
  const h = harness({ caseId: 'INC-101' }); h.flush(); h.api.setView('side'); h.api.setTool('screwdriver'); h.flush();
  const center = h.pointFor('panel-0');
  const near = { clientX: center.clientX + 12, clientY: center.clientY };
  h.pointer('pointerdown', near); h.pointer('pointerup', near);
  assert.deepEqual(h.actions, ['asm-loosen-panel-0']);
  const behindPsu = h.pointFor('psu-0');
  h.pointer('pointerdown', behindPsu); h.pointer('pointerup', behindPsu);
  assert.deepEqual(h.actions, ['asm-loosen-panel-0'], 'A rear PSU screw cannot be turned through the front of the power supply');
  h.api.dispose();
});

test('fitted parts release toward the bounded parts tray and leave model checks authoritative', () => {
  const h = harness({ caseId: 'INC-101', onAction: () => ({ kind: 'warning', message: 'Remove the side panel first.' }) }); h.flush();
  h.api.setView('side'); h.api.setTool('move'); h.flush();
  const from = h.pointFor('panel'); const to = h.project([4.8, -0.1, 0.2]);
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.flush();
  assert.equal(h.actions.length, 0);
  h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['asm-remove-panel']);
  assert.equal(h.component('panel').visible, true);
  assert.equal(h.interactions.at(-1).kind, 'warning');
  h.api.dispose();
});

test('HDMI PC-end drag fits the authored GPU output only on release', () => {
  const h = harness({ caseId: 'INC-101', left: 180, top: 90 }); h.flush();
  h.api.setTool('cables'); h.api.setCable('hdmi-pc'); h.flush();
  const from = h.pointFor('hdmi-pc'); const to = h.pointFor('hdmi-gpu');
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.flush();
  assert.deepEqual(h.actions, []);
  assert.equal(h.interactions.at(-1).kind, 'valid');
  assert.equal(h.renderer.renders.at(-1).scene.children.find(node => node.userData.assemblyCableGhost).visible, true);
  h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['video-gpu']);
  assert.equal(h.canvas.captures.size, 0);
  assert.equal(h.cableNode('hdmi-pc').visible, true);
  assert.equal(h.renderer.renders.at(-1).scene.children.find(node => node.userData.assemblyCableGhost).visible, false);
  assert.equal(h.hardware.videoPort, 'board', 'Only the authoritative callback may change the model');
  h.api.dispose();
});

test('wrong cable type and off-canvas releases never dispatch a connection', () => {
  for (const outside of [false, true]) {
    const h = harness({ caseId: 'INC-101' }); h.flush(); h.api.setTool('cables'); h.api.setCable('hdmi-pc'); h.flush();
    const from = h.pointFor('hdmi-pc'); const to = outside ? { clientX: -30, clientY: 200 } : h.pointFor('ac-inlet');
    h.pointer('pointerdown', from); h.pointer('pointermove', to); h.pointer('pointerup', to); h.flush();
    assert.deepEqual(h.actions, []); assert.equal(h.interactions.at(-1).kind, 'warning');
    assert.equal(h.cableNode('hdmi-pc').visible, true); assert.equal(h.canvas.captures.size, 0);
    h.api.dispose();
  }
});

test('cable rest explicitly disconnects the selected PC end without altering the monitor end', () => {
  const h = harness({ caseId: 'INC-101' }); h.flush(); h.api.setTool('cables'); h.api.setCable('hdmi-pc'); h.flush();
  const from = h.pointFor('hdmi-pc'); const rest = { clientX: h.dimensions.width - 80, clientY: h.dimensions.height - 28 };
  h.pointer('pointerdown', from); h.pointer('pointermove', rest); h.pointer('pointerup', rest); h.flush();
  assert.deepEqual(h.actions, ['disconnect-video']);
  assert.equal(h.hardware.signalConnected, true);
  h.api.dispose();
});

test('tap plug then tap matching port works as an alternative to dragging', () => {
  const h = harness({ caseId: 'INC-101' }); h.flush(); h.api.setTool('cables'); h.api.setCable('hdmi-pc'); h.flush();
  const from = h.pointFor('hdmi-pc'); h.pointer('pointerdown', from); h.pointer('pointerup', from); h.flush();
  assert.equal(h.selections.at(-1), 'cable-hdmi-pc');
  const to = h.pointFor('hdmi-gpu'); h.pointer('pointerdown', to); h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['video-gpu']);
  h.api.dispose();
});

test('internal plugs and ports are hidden behind a closed panel, then SATA fits its narrow data socket', () => {
  const h = harness({ caseId: 'INC-104' }); h.flush(); h.api.setTool('cables'); h.api.setCable('sata-data'); h.flush();
  assert.equal(h.cableNode('sata-data').visible, false);
  assert.equal(h.cableNode('ssd-data', true).visible, false);
  h.api.update(h.hardware, { ...h.assembly, panelInstalled: false }); h.api.setCable('sata-data'); h.flush();
  assert.equal(h.cableNode('sata-data').visible, true); assert.equal(h.cableNode('ssd-data', true).visible, true);
  const from = h.pointFor('sata-data'); const to = h.pointFor('ssd-data');
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['asm-connect-sata-data'], JSON.stringify(h.interactions));
  h.api.dispose();
});

test('cable ghost and captured pointer are discarded by modal, escape, state change, or a second pointer', () => {
  const cancelers = [h => h.api.cancelInteraction(), h => h.page.fire('keydown', { key: 'Escape' }), h => h.view.fire('blur'), h => h.api.update(h.hardware, h.assembly), h => h.pointer('pointerdown', {}, { pointerId: 2 }), h => h.api.pause(), h => h.canvas.fire('webglcontextlost')];
  for (const cancel of cancelers) {
    const h = harness({ caseId: 'INC-101' }); h.flush(); h.api.setTool('cables'); h.api.setCable('hdmi-pc'); h.flush();
    const from = h.pointFor('hdmi-pc'); const to = h.pointFor('hdmi-gpu');
    h.pointer('pointerdown', from); h.pointer('pointermove', to); h.flush();
    cancel(h); h.pointer('pointerup', to); h.flush();
    assert.deepEqual(h.actions, []); assert.equal(h.canvas.captures.size, 0); assert.equal(h.cableNode('hdmi-pc').visible, true);
    assert.equal(h.renderer.renders.at(-1).scene.children.find(node => node.userData.assemblyCableGhost).visible, false);
    h.api.dispose();
  }
});

test('the loose AC plug can be dragged onto the visible PSU inlet in rear I/O view', () => {
  const h = harness({ caseId: 'INC-102' }); h.flush(); h.api.setTool('cables'); h.api.setCable('ac'); h.flush();
  const from = h.pointFor('ac'); const to = h.pointFor('ac-inlet');
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['plug-in'], JSON.stringify(h.interactions));
  assert.equal(h.hardware.acConnected, false, 'The view submits an attempt, not a direct model mutation');
  h.api.dispose();
});

test('the loose monitor-end plug fits its own HDMI input without changing the PC-end routing', () => {
  const h = harness({ caseId: 'INC-108' }); h.flush(); h.api.setTool('cables'); h.api.setCable('hdmi-monitor'); h.flush();
  const from = h.pointFor('hdmi-monitor'); const to = h.pointFor('monitor-hdmi');
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['connect-signal'], JSON.stringify(h.interactions));
  assert.equal(h.hardware.videoPort, 'gpu');
  h.api.dispose();
});

test('the disconnected PC-end plug remains reachable from the rear camera', () => {
  const h = harness({ caseId: 'INC-101' }); h.flush();
  h.api.update({ ...h.hardware, pcVideoConnected: false }, h.assembly);
  h.api.setTool('cables'); h.api.setCable('hdmi-pc'); h.flush();
  const from = h.pointFor('hdmi-pc'); const to = h.pointFor('hdmi-gpu');
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['video-gpu'], JSON.stringify(h.interactions));
  h.api.dispose();
});

test('a rejected cable attempt restores visual state before a reentrant authoritative update', () => {
  let h;
  h = harness({ caseId: 'INC-101', onAction: () => {
    assert.equal(h.cableNode('hdmi-pc').visible, true);
    assert.equal(h.renderer.renders.at(-1).scene.children.find(node => node.userData.assemblyCableGhost).visible, false);
    h.api.update(h.hardware, h.assembly);
    return { kind: 'warning', message: 'The existing display lead is still attached.' };
  } });
  h.flush(); h.api.setTool('cables'); h.api.setCable('hdmi-pc'); h.flush();
  const from = h.pointFor('hdmi-pc'); const to = h.pointFor('hdmi-gpu');
  h.pointer('pointerdown', from); h.pointer('pointermove', to); h.pointer('pointerup', to); h.flush();
  assert.deepEqual(h.actions, ['video-gpu']);
  assert.equal(h.interactions.at(-1).message, 'The existing display lead is still attached.');
  h.api.dispose();
});

test('connector tap areas are forgiving and the overlay is removed on disposal', () => {
  const h = harness({ caseId: 'INC-101' }); h.flush(); h.api.setTool('cables'); h.api.setCable('hdmi-pc'); h.flush();
  const from = h.pointFor('hdmi-pc'); const near = { clientX: from.clientX + 16, clientY: from.clientY };
  h.pointer('pointerdown', near); h.pointer('pointerup', near); h.flush();
  assert.equal(h.selections.at(-1), 'cable-hdmi-pc');
  const overlay = h.host.children.find(node => node !== h.canvas);
  assert.equal(overlay.attributes.get('aria-hidden'), 'true');
  assert.ok(overlay.children.some(node => node.textContent?.includes('Cable rest') && node.style.display === 'block'));
  h.api.dispose();
  assert.equal(h.host.children.length, 0);
});

test('Fit PC opens close to the tower and keeps its case inside desktop and tablet viewports',()=>{
  for(const width of [1366,768,390]){
    const h=harness({width,height:600});h.flush();
    const camera=h.renderer.renders.at(-1).camera;
    for(const x of [-2.85,2.85])for(const y of [-.25,6.4])for(const z of [-1.12,1.62]){
      const projected=new THREE.Vector3(x,y,z).project(camera);
      assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,`The tower must fit at ${width}px: ${projected.toArray()}`);
    }
    const initial=camera.position.distanceTo(new THREE.Vector3(0,3.05,.12));
    h.api.resetView();h.flush();
    const whole=camera.position.distanceTo(new THREE.Vector3(-.45,2.65,0));
    assert.ok(initial<whole*.8,'Fit PC should show a larger tower than Whole bench');
    h.api.focusSelected();h.flush();
    assert.ok(camera.position.distanceTo(new THREE.Vector3(0,3.05,.12))-initial<.001,'Focus without a selection falls back to Fit PC');
    assert.equal(h.queue.size,0);assert.deepEqual(h.actions,[]);h.api.dispose();
  }
});

test('Focus part pivots onto the processor and zoom reaches a bounded close-up without model changes',()=>{
  const h=harness();h.flush();const original=structuredClone({hardware:h.hardware,assembly:h.assembly});
  h.api.select('cpu');h.api.focusSelected();h.flush();
  const camera=h.renderer.renders.at(-1).camera;
  const center=new THREE.Box3().setFromObject(h.component('cpu')).getCenter(new THREE.Vector3());
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).dot(center.clone().sub(camera.position).normalize())>.9999,'Camera must pivot onto the selected processor');
  assert.ok(camera.position.distanceTo(center)<3,'Processor focus must get closer than the old whole-PC minimum distance');
  for(let i=0;i<25;i++)h.api.zoom('in');h.flush();
  assert.ok(camera.position.distanceTo(center)>=2.19&&camera.position.distanceTo(center)<=2.21);
  for(let i=0;i<35;i++)h.api.zoom('out');h.flush();
  assert.ok(camera.position.distanceTo(center)<=40.001);
  assert.deepEqual(h.actions,[]);assert.deepEqual({hardware:h.hardware,assembly:h.assembly},original);
  assert.equal(h.queue.size,0);h.api.dispose();
});

test('fit and focus discard a held part before changing the camera',()=>{
  for(const method of ['fit','focusSelected']){
    const h=harness();h.flush();h.api.setView('top');h.api.setTool('move');h.flush();
    const from=h.pointFor('cpu'),to=h.project(h.component('cpu').userData.fitted);
    h.pointer('pointerdown',from);h.pointer('pointermove',to);h.flush();
    assert.equal(h.component('cpu').visible,false);
    h.api[method]();h.pointer('pointerup',to);h.flush();
    assert.equal(h.component('cpu').visible,true);assert.equal(h.canvas.captures.size,0);assert.deepEqual(h.actions,[]);
    h.api.dispose();
  }
});

test('a camera preset restores a useful equipment view after a close-up',()=>{
  const h=harness({caseId:'INC-101'});h.flush();
  const target=new THREE.Vector3(-.45,2.65,0);
  for(const preset of ['iso','side','top','rear-io']){
    h.api.select('cpu');h.api.focusSelected();h.flush();
    h.api.zoom('in');h.flush();
    h.api.setView(preset);h.flush();
    assert.ok(h.renderer.renders.at(-1).camera.position.distanceTo(target)>10,`${preset} restores a wider equipment view`);
  }
  assert.equal(h.actions.length,0);assert.equal(h.queue.size,0);h.api.dispose();
});

test('board labels and physical connector details stay procedural with a bounded visible draw budget',()=>{
  const h=harness({caseId:'INC-101'});h.flush();
  const scene=h.renderer.renders.at(-1).scene;let visible=0,triangles=0;
  scene.traverse(object=>{
    if(!object.isMesh)return;
    for(let ancestor=object;ancestor;ancestor=ancestor.parent)if(!ancestor.visible)return;
    visible++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);
    for(const material of Array.isArray(object.material)?object.material:[object.material])assert.equal(material.map??null,null,'Equipment detail must not add downloaded texture maps');
  });
  assert.ok(visible<210,`${visible} visible meshes must remain below the previous 219-mesh baseline`);
  assert.ok(triangles<13000,`${triangles} visible triangles must remain bounded`);
  const silk=h.component('board').children.find(node=>node.userData.detail==='board-silkscreen');
  assert.ok(silk?.geometry.attributes.position.count>0);
  for(const id of ['atx','hdmi-pc','sata-data','sata-power','ac'])assert.ok(h.cableNode(id).children.some(node=>node.userData.detail==='keyed-housing'));
  h.api.dispose();
});
