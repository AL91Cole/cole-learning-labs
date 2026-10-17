import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../src/three.module.js?release=20261017-tools13';
import { assemblyToolAction, assemblyDropAction, assembledPartFitted } from '../src/assembly-tools.js?release=20261017-tools13';
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

function harness({ width = 1366, height = 600, dpr = 3, unavailable = false, caseId = 'INC-106', onAction } = {}) {
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
  const host = {
    ownerDocument: page, children: [],
    getBoundingClientRect: () => ({ ...dimensions, left: 0, top: 0 }),
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
  const context = vm.createContext({ THREE: { ...THREE, WebGLRenderer: MockRenderer }, assemblyToolAction, assemblyDropAction, assembledPartFitted });
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
    return { clientX: (projected.x + 1) * dimensions.width / 2, clientY: (1 - projected.y) * dimensions.height / 2 };
  };
  const component = id => renderer.renders.at(-1).scene.children.find(node => node.userData.selectId === id && node.userData.partKey);
  const pointFor = id => {
    const node = component(id) || renderer.renders.at(-1).scene.children.find(node => node.userData.selectId === id);
    const point = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
    return project(point.toArray());
  };
  const pointer = (type, position, extra = {}) => canvas.fire(type, { button: 0, pointerId: 1, pointerType: 'mouse', ...position, ...extra });
  return { api, host, page, view, canvas, dimensions, renderer, queue, observer, hardware, assembly, events, selections, actions, interactions, flush, project, pointFor, pointer, component };
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
  assert.ok(meshes < 250, `Bounded original equipment scene: ${meshes} mesh objects`);
  assert.ok(triangles < 15000, `Bounded procedural geometry: ${triangles} triangles (not a device performance measurement)`);
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
  assert.match(source, /^import \* as THREE from '\.\/three\.module\.js\?release=20261017-tools13';/);
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
