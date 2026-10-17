import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../src/three.module.js?release=20261017-assembly12';
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

function harness({ width = 1366, height = 600, dpr = 3, unavailable = false, caseId = 'INC-106' } = {}) {
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
  const context = vm.createContext({ THREE: { ...THREE, WebGLRenderer: MockRenderer } });
  const code = source.replace(/^import[^\n]*\n/, '').replace('export function mountAssemblyScene', 'function mountAssemblyScene');
  const mount = vm.runInContext(`${code}\nmountAssemblyScene;`, context);
  const hardware = initialHardwareState(caseId);
  const assembly = initialAssemblyState(hardware);
  const events = []; const selections = [];
  const api = mount(host, { hardware, assembly, onStatus: value => events.push(value), onSelect: id => selections.push(id) });
  const flush = () => {
    let count = 0;
    while (queue.size) {
      assert.ok(++count < 20, 'The scene must settle without a perpetual animation loop');
      const [id, callback] = queue.entries().next().value;
      queue.delete(id); callback(0);
    }
  };
  return { api, host, page, view, canvas, dimensions, renderer, queue, observer, hardware, assembly, events, selections, flush };
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
  assert.match(source, /^import \* as THREE from '\.\/three\.module\.js\?release=20261017-assembly12';/);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b|https?:\/\//);
});
