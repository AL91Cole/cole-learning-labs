import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../src/three.module.js';
import { SCENARIOS } from '../src/scenarios.js';
import { initialWorkspaceState, applyWorkspaceAction } from '../src/workspaces.js';

const source = readFileSync(new URL('../src/virtual-lab-scene.js', import.meta.url), 'utf8');
assert.match(source, /^import \* as THREE from '\.\/three\.module\.js\?release=20261017-tools13';/, 'virtual-lab-scene must use the local versioned Three bundle');

function createGlContext() {
  const noop = () => {};
  const parameterMap = new Map([
    [0x8b4c, 16], [0x8b4a, 16], [0x8872, 16], [0x8b49, 1024], [0x8b4b, 1024],
    [0x8dfa, 1024], [0x8dfd, 16], [0x0d33, 4096], [0x851c, 4096], [0x8073, 2048],
    [0x88ff, 2048], [0x84e8, 4096], [0x8cdf, 8], [0x8d57, 4], [0x9122, 16],
    [0x8904, -8], [0x8905, 7], [0x7938, 'WebGL 2.0'], [0x8b8c, 'WebGL GLSL ES 3.00']
  ]);
  const proxy = new Proxy({
    VERSION: 0x1f02, SHADING_LANGUAGE_VERSION: 0x8b8c, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
    MAX_TEXTURE_IMAGE_UNITS: 0x8872, MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d, MAX_TEXTURE_SIZE: 0x0d33,
    MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c, MAX_3D_TEXTURE_SIZE: 0x8073, MAX_ARRAY_TEXTURE_LAYERS: 0x88ff,
    MAX_RENDERBUFFER_SIZE: 0x84e8, MAX_VERTEX_ATTRIBS: 0x8869, MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
    MAX_VARYING_VECTORS: 0x8dfc, MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd, MAX_SAMPLES: 0x8d57,
    MAX_COLOR_ATTACHMENTS: 0x8cdf, MAX_UNIFORM_BUFFER_BINDINGS: 0x8a2f,
    getExtension() { return null; },
    getSupportedExtensions() { return []; },
    getParameter(id) { return parameterMap.get(id) ?? 16; },
    getShaderPrecisionFormat() { return { rangeMin: 127, rangeMax: 127, precision: 23 }; },
    createTexture: () => ({}), createFramebuffer: () => ({}), createRenderbuffer: () => ({}),
    createBuffer: () => ({}), createVertexArray: () => ({}), createProgram: () => ({}),
    createShader: () => ({}), getProgramParameter: () => true, getShaderParameter: () => true,
    getProgramInfoLog: () => '', getShaderInfoLog: () => '', getUniformLocation: () => ({}),
    getAttribLocation: () => 0, getUniformBlockIndex: () => 0, checkFramebufferStatus: () => 0x8cd5,
    isContextLost: () => false
  }, {
    get(target, prop) { return prop in target ? target[prop] : noop; }
  });
  return proxy;
}

function loadSceneModule() {
  let lastScene = null;
  let renders = 0;
  let rendererDisposed = 0;
  class StubRenderer {
    constructor({ canvas }) { this.domElement = canvas; }
    setPixelRatio() {}
    setSize(w, h) { this.domElement.width = w; this.domElement.height = h; }
    render(scene) { lastScene = scene; renders++; }
    dispose() { rendererDisposed++; }
  }
  const threeProxy = new Proxy(THREE, {
    get(target, prop) { return prop === 'WebGLRenderer' ? StubRenderer : target[prop]; }
  });
  const transformed = source
    .replace(/^import[^\n]+\n/, '')
    .replaceAll('export function ', 'function ') +
    '\n;({ mountVirtualLabRoom, mountLabStation3D, renderVirtualLabHubMarkup, bindPreviewPointers, PATHWAY_STATIONS });';
  const exports = vm.runInNewContext(transformed, { THREE: threeProxy, ResizeObserver: class { observe() {} disconnect() {} }, Math, Object, Array, String, Number, Boolean, Set, Map, RegExp });
  return { ...exports, get lastScene() { return lastScene; }, get renders() { return renders; }, get rendererDisposed() { return rendererDisposed; } };
}

test('renderVirtualLabHubMarkup includes all 5 pathway station controls and camera presets', () => {
  const mod = loadSceneModule();
  const html = mod.renderVirtualLabHubMarkup('network');
  for (const id of ['hardware', 'network', 'ai', 'security', 'coding']) {
    assert.match(html, new RegExp(`data-vlab-station="${id}"`));
  }
  assert.match(html, /data-vlab-station="network" aria-pressed="true"/);
  assert.match(html, /data-vlab-cam="overview"/);
});

test('mountVirtualLabRoom builds the 3D classroom, switches stations, and disposes every GPU resource', () => {
  const mod = loadSceneModule();
  const docListeners = new Map();
  const titleEl = { textContent: '' };
  const summaryEl = { textContent: '' };
  const linksEl = { innerHTML: '' };
  const stageHost = {
    children: [],
    appendChild(child) { this.children.push(child); child.remove = () => { this.children = this.children.filter(c => c !== child); }; },
    getBoundingClientRect: () => ({ width: 800, height: 420 })
  };
  const doc = {
    hidden: false,
    defaultView: {
      devicePixelRatio: 2,
      requestAnimationFrame(fn) { fn(); return 1; },
      cancelAnimationFrame() {}
    },
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          width: 0, height: 0, className: '',
          addEventListener() {}, removeEventListener() {},
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 420 }),
          getContext(type) {
            if (type === '2d') return { fillStyle: '', font: '', fillRect() {}, fillText() {} };
            return createGlContext();
          }
        };
      }
      return {};
    },
    addEventListener(name, fn) { docListeners.set(name, fn); },
    removeEventListener(name) { docListeners.delete(name); }
  };
  const host = {
    ownerDocument: doc,
    contains: () => true,
    addEventListener() {}, removeEventListener() {},
    querySelector(sel) {
      if (sel === '[data-vlab-stage]') return stageHost;
      if (sel === '[data-vlab-title]') return titleEl;
      if (sel === '[data-vlab-summary]') return summaryEl;
      if (sel === '[data-vlab-links]') return linksEl;
      return null;
    },
    querySelectorAll: () => []
  };

  const selectedTracks = [];
  const hub = mod.mountVirtualLabRoom(host, { activeTrack: 'hardware', onSelectTrack: id => selectedTracks.push(id) });
  assert.ok(hub);
  assert.equal(stageHost.children.length, 1);
  assert.match(titleEl.textContent, /Station 01 · Hardware/i);

  hub.flyTo('security');
  assert.deepEqual(selectedTracks, ['security']);
  assert.match(titleEl.textContent, /Station 04 · Ethical Cybersecurity/i);
  assert.match(linksEl.innerHTML, /SEC-401/);

  const resources = new Set();
  const released = new Set();
  mod.lastScene.traverse(obj => {
    for (const item of [obj.geometry, ...(Array.isArray(obj.material) ? obj.material : [obj.material])].filter(Boolean)) {
      resources.add(item);
      const orig = item.dispose.bind(item);
      item.dispose = () => { released.add(item); orig(); };
    }
  });
  assert.ok(resources.size > 25, '3D classroom hub should contain procedural station meshes and materials');
  hub.dispose();
  assert.equal(released.size, resources.size, 'every geometry and material in the 3D classroom hub must be disposed');
  assert.equal(stageHost.children.length, 0);
});

test('mountLabStation3D updates live on cole:lab-state-change across non-hardware tracks and cleans up on dispose', () => {
  const mod = loadSceneModule();
  const scenario = SCENARIOS.find(s => s.id === 'NET-204');
  let state = initialWorkspaceState('NET-204');
  const docListeners = new Map();
  let insertedContainer = null;

  const doc = {
    hidden: false,
    defaultView: {
      devicePixelRatio: 1.25,
      requestAnimationFrame(fn) { fn(); return 1; },
      cancelAnimationFrame() {}
    },
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          width: 0, height: 0, className: '',
          addEventListener() {}, removeEventListener() {},
          getContext(type) {
            if (type === '2d') return { fillStyle: '', font: '', fillRect() {}, fillText() {} };
            return createGlContext();
          }
        };
      }
      const stage = {
        children: [], innerHTML: '',
        appendChild(c) { this.children.push(c); },
        getBoundingClientRect: () => ({ width: 640, height: 260 })
      };
      const caption = { textContent: '' };
      return {
        className: '', innerHTML: '',
        setAttribute() {}, addEventListener() {}, removeEventListener() {},
        querySelector(sel) {
          if (sel === '[data-station-stage]') return stage;
          if (sel === '[data-station-caption]') return caption;
          return null;
        },
        remove() { insertedContainer = null; },
        caption
      };
    },
    addEventListener(name, fn) { docListeners.set(name, fn); },
    removeEventListener(name, fn) { if (docListeners.get(name) === fn) docListeners.delete(name); }
  };

  const workspaceEl = {};
  const benchColumn = {
    hidden: false,
    ownerDocument: doc,
    querySelector: sel => sel === '#workspace' ? workspaceEl : null,
    insertBefore(node, ref) { assert.equal(ref, workspaceEl); insertedContainer = node; }
  };

  const cleanup = mod.mountLabStation3D(benchColumn, { scenario, getRecord: () => ({ state }) });
  assert.ok(insertedContainer);
  assert.match(insertedContainer.caption.textContent, /NET-204/);

  state = applyWorkspaceAction('NET-204', state, 'save-expanded', { placement: 'ceiling-center', band: '5', channel: '40', width: '20' }).state;
  state = applyWorkspaceAction('NET-204', state, 'run-check').state;
  docListeners.get('cole:lab-state-change')?.({ detail: { id: 'NET-204', changed: true } });
  assert.match(insertedContainer.caption.textContent, /All checks passing for NET-204/);

  cleanup();
  assert.equal(insertedContainer, null);
  assert.equal(docListeners.size, 0);
});

test('virtual-lab-scene remains 100% same-origin with no network or browser storage calls', () => {
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b|https?:\/\//);
});

test('featured hub investigations use the actual catalog titles rather than different fictional requests', () => {
  const mod = loadSceneModule();
  for (const station of mod.PATHWAY_STATIONS) {
    for (const featured of station.featured) {
      const scenario = SCENARIOS.find(item => item.id === featured.id);
      assert.ok(scenario, featured.id);
      assert.equal(featured.title, scenario.title, featured.id);
    }
  }
  assert.doesNotMatch(source, /STATUS: ORIGINAL TASK VERIFIED/);
  assert.match(source, /STATUS: CHECKS PASS · VERIFY THE TASK/);
});

function pointerFixture() {
  const mod = loadSceneModule();
  const listeners = () => ({ handlers: new Map(), addEventListener(name, callback) { this.handlers.set(name, callback); }, removeEventListener(name, callback) { if (this.handlers.get(name) === callback) this.handlers.delete(name); }, emit(name, event = {}) { this.handlers.get(name)?.(event); } });
  const doc = { ...listeners(), hidden: false }, win = listeners();
  let captured = null, captures = 0, releases = 0, orbits = 0, taps = 0, enabled = true;
  const suspended = [], restored = [];
  const canvas = { ...listeners(), setPointerCapture(id) { captured = id; captures++; }, hasPointerCapture(id) { return captured === id; }, releasePointerCapture() { captured = null; releases++; } };
  const controller = mod.bindPreviewPointers(canvas, { doc, win, enabled: () => enabled && !doc.hidden, onOrbit() { orbits++; }, onTap() { taps++; }, onSuspend(reason) { suspended.push(reason); }, onRestore(reason) { restored.push(reason); } });
  const event = (x = 0, y = 0, id = 1) => ({ pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y, target: canvas });
  return { canvas, doc, win, controller, event, suspended, restored, setEnabled(value) { enabled = value; }, get captures() { return captures; }, get releases() { return releases; }, get orbits() { return orbits; }, get taps() { return taps; } };
}

test('preview touch scrolling is not captured and pointer cancellation cannot later select a station', () => {
  const f = pointerFixture();
  f.canvas.emit('pointerdown', f.event());
  f.canvas.emit('pointermove', f.event(2, 30));
  f.canvas.emit('pointerup', f.event(2, 30));
  assert.equal(f.captures, 0); assert.equal(f.orbits, 0); assert.equal(f.taps, 0);
  f.canvas.emit('pointerdown', f.event());
  f.canvas.emit('pointermove', f.event(30, 2));
  assert.equal(f.captures, 1); assert.equal(f.orbits, 1);
  f.canvas.emit('pointercancel', f.event(30, 2));
  f.canvas.emit('pointerup', f.event(30, 2));
  assert.equal(f.releases, 1); assert.equal(f.taps, 0);
  f.controller.dispose();
  assert.equal(f.canvas.handlers.size + f.doc.handlers.size + f.win.handlers.size, 0);
});

test('preview gestures cancel on hidden pages, context loss, Escape, blur and an outside release', () => {
  const f = pointerFixture();
  const start = () => { f.canvas.emit('pointerdown', f.event()); f.canvas.emit('pointermove', f.event(30, 2)); };
  const finish = () => { f.canvas.emit('pointerup', f.event(30, 2)); assert.equal(f.taps, 0); };
  start(); f.doc.hidden = true; f.doc.emit('visibilitychange'); finish();
  assert.deepEqual(f.suspended, ['visibility']);
  f.doc.hidden = false; f.doc.emit('visibilitychange');
  assert.deepEqual(f.restored, ['visibility']);
  start(); let prevented = false;
  f.canvas.emit('webglcontextlost', { preventDefault() { prevented = true; } }); finish();
  assert.equal(prevented, true); assert.equal(f.suspended.at(-1), 'context');
  f.canvas.emit('webglcontextrestored'); assert.equal(f.restored.at(-1), 'context');
  start(); f.doc.emit('keydown', { key: 'Escape' }); finish();
  start(); f.win.emit('blur'); finish();
  start(); f.doc.emit('pointerup', { ...f.event(), target: {} }); finish();
  start(); f.setEnabled(false); f.canvas.emit('pointermove', f.event(40, 2)); finish();
  assert.equal(f.releases, f.captures);
  f.controller.dispose();
});
