import * as THREE from './three.module.js?release=20261017-realism16';

const MAX_PIXEL_RATIO = 1.5;
const MAX_RENDER_PIXELS = 900000;

// Both decorative previews leave vertical touch gestures to page scrolling.
// A canceled or hidden gesture cannot later select a station or orbit equipment.
function bindPreviewPointers(canvas, { doc, win, enabled, onOrbit, onTap, onSuspend, onRestore }) {
  let gesture = null;
  function cancel() {
    const previous = gesture;
    gesture = null;
    if (previous && canvas.hasPointerCapture?.(previous.id)) canvas.releasePointerCapture?.(previous.id);
  }
  function down(event) {
    if (gesture) { cancel(); return; }
    if (!enabled() || (event.button !== undefined && event.button !== 0)) return;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false, touch: event.pointerType === 'touch' || event.pointerType === 'pen' };
  }
  function move(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (!enabled()) { cancel(); return; }
    const totalX = event.clientX - gesture.startX, totalY = event.clientY - gesture.startY;
    if (!gesture.moved) {
      if (Math.hypot(totalX, totalY) < 8) return;
      if (gesture.touch && Math.abs(totalX) <= Math.abs(totalY) * 1.15) { cancel(); return; }
      gesture.moved = true;
      canvas.setPointerCapture?.(event.pointerId);
    }
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    gesture.x = event.clientX; gesture.y = event.clientY;
    onOrbit(dx, dy);
  }
  function up(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const tap = !gesture.moved && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 8;
    cancel();
    if (tap && enabled()) onTap?.(event);
  }
  function outsideUp(event) { if (gesture && event.pointerId === gesture.id && event.target !== canvas) cancel(); }
  function leave() { if (gesture && !gesture.moved) cancel(); }
  function key(event) { if (event.key === 'Escape') cancel(); }
  function visibility() {
    if (doc.hidden) { cancel(); onSuspend('visibility'); }
    else onRestore('visibility');
  }
  function loss(event) { event.preventDefault(); cancel(); onSuspend('context'); }
  function restore() { onRestore('context'); }
  const events = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancel], ['lostpointercapture', cancel], ['pointerleave', leave], ['webglcontextlost', loss], ['webglcontextrestored', restore]];
  for (const [name, handler] of events) canvas.addEventListener(name, handler);
  doc.addEventListener('pointerup', outsideUp); doc.addEventListener('keydown', key); doc.addEventListener('visibilitychange', visibility);
  win.addEventListener?.('blur', cancel);
  return { cancel, dispose() {
    cancel();
    for (const [name, handler] of events) canvas.removeEventListener(name, handler);
    doc.removeEventListener('pointerup', outsideUp); doc.removeEventListener('keydown', key); doc.removeEventListener('visibilitychange', visibility);
    win.removeEventListener?.('blur', cancel);
  } };
}

const PATHWAY_STATIONS = Object.freeze([
  {
    id: 'hardware',
    number: '01',
    name: 'Hardware & ServiceDesk',
    short: 'Hardware Bench',
    color: 0x18b7a0,
    hex: '#18b7a0',
    pos: [-3.2, 0, -1.1],
    cam: { pos: [-3.2, 2.35, 1.65], target: [-3.2, 0.95, -1.1] },
    summary: 'ESD service bench with open ATX tower, component tray, thermal paste, and HDMI test monitor.',
    featured: [
      { id: 'INC-101', title: 'The Blank Monitor' },
      { id: 'INC-103', title: 'The Interrupted Startup' },
      { id: 'INC-106', title: 'Complete Desktop Assembly' }
    ]
  },
  {
    id: 'network',
    number: '02',
    name: 'Networking & Operating Systems',
    short: 'Network Rack',
    color: 0x3b82f6,
    hex: '#3b82f6',
    pos: [-1.6, 0, -1.45],
    cam: { pos: [-1.6, 2.35, 1.35], target: [-1.6, 1.05, -1.45] },
    summary: '42U classroom switch rack, VLAN patch panel, ceiling Wi-Fi access point, and networked laser printer.',
    featured: [
      { id: 'NET-201', title: 'The Offline Library Workstation' },
      { id: 'NET-202', title: 'Guest Wi-Fi & Share Permission Lockout' },
      { id: 'NET-204', title: 'Wireless Survey & Classroom Coverage' }
    ]
  },
  {
    id: 'ai',
    number: '03',
    name: 'AI Literacy & Audit',
    short: 'AI Audit Desk',
    color: 0x8b5cf6,
    hex: '#8b5cf6',
    pos: [0, 0, -1.55],
    cam: { pos: [0, 2.35, 1.25], target: [0, 1.0, -1.55] },
    summary: 'Dual-monitor AI evaluation station with privacy redaction shield, citation verifier, and fairness telemetry.',
    featured: [
      { id: 'AI-301', title: 'Prompt Engineering & Student Privacy' },
      { id: 'AI-302', title: 'Hallucination Audit & Ticket Classifier Bias' },
      { id: 'AI-304', title: 'Minimum Data, Meaningful Permission' }
    ]
  },
  {
    id: 'security',
    number: '04',
    name: 'Ethical Cybersecurity',
    short: 'Cyber SOC',
    color: 0xf59e0b,
    hex: '#f59e0b',
    pos: [1.6, 0, -1.45],
    cam: { pos: [1.6, 2.35, 1.35], target: [1.6, 1.0, -1.45] },
    summary: 'Triple-display defensive SOC console, hardware firewall appliance, and Zero-Trust identity reader.',
    featured: [
      { id: 'SEC-401', title: 'Phishing Triage & Least-Privilege Audit' },
      { id: 'SEC-402', title: 'SIEM Log Analysis & Exposed Legacy Ports' },
      { id: 'SEC-403', title: 'Authorized Web App: Patch & Retest' }
    ]
  },
  {
    id: 'coding',
    number: '05',
    name: 'Coding Sandbox',
    short: 'Coding Bench',
    color: 0xec4899,
    hex: '#ec4899',
    pos: [3.2, 0, -1.1],
    cam: { pos: [3.2, 2.35, 1.65], target: [3.2, 0.95, -1.1] },
    summary: 'Automation bench with vertical code display, smart classroom thermostat sensor, and station readiness array.',
    featured: [
      { id: 'CODE-501', title: 'The Supply Calculator' },
      { id: 'CODE-502', title: 'The Classroom Thermostat' },
      { id: 'CODE-503', title: 'The Workstation Readiness Loop' }
    ]
  }
]);

function createResourceTracker() {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const mat = (color, roughness = 0.55, metalness = 0.25, extra = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    materials.add(material);
    return material;
  };
  const trackGeo = geometry => {
    geometries.add(geometry);
    return geometry;
  };
  const box = (w, h, d, material, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot[0] || rot[1] || rot[2]) mesh.rotation.set(rot[0], rot[1], rot[2]);
    return mesh;
  };
  const cyl = (rt, rb, h, segs, material, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(rt, rb, h, segs)), material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot[0] || rot[1] || rot[2]) mesh.rotation.set(rot[0], rot[1], rot[2]);
    return mesh;
  };
  const sphere = (r, wSeg, hSeg, material, pos = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(r, wSeg, hSeg)), material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    return mesh;
  };
  const tagSelect = (root, selectId) => {
    root.userData.selectId = selectId;
    root.traverse(node => { node.userData.selectId = selectId; });
    return root;
  };
  const createScreenPlane = (doc, width, height, drawFn) => {
    const canvas = doc.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext?.('2d') || null;
    let texture = null;
    if (ctx) {
      drawFn(ctx, canvas.width, canvas.height);
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.add(texture);
    }
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.05,
      map: texture || null,
      emissive: 0x1e293b,
      emissiveMap: texture || null,
      emissiveIntensity: 0.65
    });
    materials.add(material);
    const mesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(width, height)), material);
    return {
      mesh,
      redraw(customDraw = drawFn) {
        if (!ctx || !texture) return;
        customDraw(ctx, canvas.width, canvas.height);
        texture.needsUpdate = true;
      }
    };
  };
  const disposeAll = scene => {
    scene.traverse(obj => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (Array.isArray(obj.material)) obj.material.forEach(m => materials.add(m));
      else if (obj.material) materials.add(obj.material);
    });
    geometries.forEach(g => g.dispose?.());
    materials.forEach(m => m.dispose?.());
    textures.forEach(t => t.dispose?.());
    geometries.clear();
    materials.clear();
    textures.clear();
  };
  return { mat, trackGeo, box, cyl, sphere, tagSelect, createScreenPlane, disposeAll };
}

function addStudioLighting(scene, tracker) {
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.3);
  const key = new THREE.DirectionalLight(0xfffbeb, 1.55);
  key.position.set(4.5, 6.8, 5.2);
  const fill = new THREE.DirectionalLight(0x67e8f9, 0.72);
  fill.position.set(-5.2, 4.2, 3.6);
  const rim = new THREE.DirectionalLight(0xa78bfa, 0.52);
  rim.position.set(0, 4.8, -4.5);
  scene.add(hemi, key, fill, rim);

  // Architectural classroom shell
  const room = new THREE.Group();
  const floorMat = tracker.mat(0x0f172a, 0.68, 0.18);
  const tileStripMat = tracker.mat(0x1e293b, 0.5, 0.25);
  const wallMat = tracker.mat(0x132033, 0.82, 0.1);
  const baseboardMat = tracker.mat(0x334155, 0.5, 0.35);
  const woodTrimMat = tracker.mat(0x784b2a, 0.6, 0.12);
  const lightBarMat = tracker.mat(0xe0f2fe, 0.2, 0.1, { emissive: 0x38bdf8, emissiveIntensity: 0.7 });

  room.add(
    tracker.box(10.5, 0.12, 6.6, floorMat, [0, -0.06, -0.4]),
    tracker.box(10.5, 3.6, 0.14, wallMat, [0, 1.8, -3.65]),
    tracker.box(10.5, 0.14, 0.16, baseboardMat, [0, 0.07, -3.56]),
    tracker.box(10.5, 0.08, 0.18, woodTrimMat, [0, 1.2, -3.56])
  );
  for (let i = -4; i <= 4; i += 2) {
    room.add(tracker.box(0.03, 0.005, 6.4, tileStripMat, [i, 0.003, -0.4]));
  }
  for (let z = -3; z <= 2; z += 1.25) {
    room.add(tracker.box(10.2, 0.005, 0.03, tileStripMat, [0, 0.003, z]));
  }
  // Overhead suspended classroom LED fixtures
  for (const x of [-2.8, 0, 2.8]) {
    room.add(
      tracker.box(1.9, 0.05, 0.18, baseboardMat, [x, 3.25, -1.2]),
      tracker.box(1.82, 0.025, 0.12, lightBarMat, [x, 3.22, -1.2])
    );
  }
  scene.add(room);
}

function buildDeskBase(tracker, accentHex, width = 1.32, depth = 0.86) {
  const group = new THREE.Group();
  const topMat = tracker.mat(0x1e293b, 0.58, 0.16);
  const woodEdge = tracker.mat(0x85532f, 0.55, 0.12);
  const legMat = tracker.mat(0x334155, 0.4, 0.65);
  const matSurface = tracker.mat(accentHex, 0.72, 0.12);

  // Tabletop at y = 0.74
  group.add(
    tracker.box(width, 0.05, depth, topMat, [0, 0.74, 0]),
    tracker.box(width + 0.02, 0.052, 0.035, woodEdge, [0, 0.74, depth / 2 + 0.01]),
    tracker.box(width * 0.78, 0.01, depth * 0.68, matSurface, [0, 0.77, 0.02])
  );
  // 4 steel legs
  const lx = width / 2 - 0.08;
  const lz = depth / 2 - 0.08;
  for (const [x, z] of [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]]) {
    group.add(tracker.box(0.05, 0.74, 0.05, legMat, [x, 0.37, z]));
  }
  // Floor anti-fatigue mat
  group.add(tracker.box(width * 0.92, 0.012, 0.55, matSurface, [0, 0.006, depth / 2 + 0.32]));
  return group;
}

function buildMonitorMesh(tracker, doc, width, height, pos, rotY, drawFn) {
  const group = new THREE.Group();
  group.position.set(pos[0], pos[1], pos[2]);
  if (rotY) group.rotation.y = rotY;
  const bezelMat = tracker.mat(0x0f172a, 0.42, 0.45);
  const standMat = tracker.mat(0x475569, 0.38, 0.65);
  group.add(
    tracker.box(width * 0.45, 0.018, 0.16, standMat, [0, 0.01, 0]),
    tracker.box(0.045, 0.16, 0.035, standMat, [0, 0.09, -0.02]),
    tracker.box(width, height, 0.03, bezelMat, [0, 0.16 + height / 2, 0])
  );
  const screen = tracker.createScreenPlane(doc, width - 0.04, height - 0.04, drawFn);
  screen.mesh.position.set(0, 0.16 + height / 2, 0.017);
  group.add(screen.mesh);
  return { group, screen };
}

/**
 * Mounts the Interactive 3D Virtual Learning Lab Room Hub (#home and #labs).
 * Students and educators can orbit the 3D classroom, click any of the 5 pathway
 * benches, fly the camera to inspect each station, and jump into investigations.
 */
export function mountVirtualLabRoom(host, { activeTrack = 'all', onSelectTrack, onOpenLab } = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView || globalThis;
  const canvas = doc.createElement('canvas');
  canvas.className = 'vlab-canvas';
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081221);
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 45);
  const tracker = createResourceTracker();
  addStudioLighting(scene, tracker);

  // Classroom Smartboard on back wall
  const smartboard = new THREE.Group();
  smartboard.position.set(0, 2.15, -3.52);
  smartboard.add(tracker.box(3.7, 1.25, 0.05, tracker.mat(0x1e293b, 0.35, 0.55)));
  const boardScreen = tracker.createScreenPlane(doc, 3.52, 1.1, (ctx, w, h) => {
    ctx.fillStyle = '#09192c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0f3156';
    ctx.fillRect(0, 0, w, 34);
    ctx.fillStyle = '#5eead4';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('COLE LEARNING LABS · 3D VIRTUAL TECH CLASSROOM', 14, 22);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Select a Pathway Station to Explore', 14, 68);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('01 Hardware  ·  02 Network Rack  ·  03 AI Audit  ·  04 Cyber SOC  ·  05 Coding', 14, 98);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('29 Interactive Investigations · Grades 7–12 · Safe Browser Simulation', 14, 130);
  });
  boardScreen.mesh.position.set(0, 0, 0.028);
  smartboard.add(boardScreen.mesh);
  scene.add(smartboard);

  const stationGroups = new Map();
  const pickTargets = [];
  const selectionRings = new Map();

  for (const station of PATHWAY_STATIONS) {
    const group = new THREE.Group();
    group.position.set(station.pos[0], station.pos[1], station.pos[2]);
    group.add(buildDeskBase(tracker, station.color));

    // Selection glow ring under station
    const ringMat = tracker.mat(station.color, 0.3, 0.2, { emissive: station.color, emissiveIntensity: 0.15 });
    const ring = tracker.cyl(0.76, 0.78, 0.016, 24, ringMat, [0, 0.01, 0]);
    group.add(ring);
    selectionRings.set(station.id, ringMat);

    // Build pathway-specific 3D equipment on the desk
    if (station.id === 'hardware') {
      // Open PC chassis + glowing cooler + monitor
      const tower = tracker.box(0.28, 0.44, 0.38, tracker.mat(0x1e293b, 0.4, 0.6), [-0.32, 0.99, -0.05]);
      const board = tracker.box(0.02, 0.32, 0.28, tracker.mat(0x0f766e, 0.5, 0.25), [-0.31, 1.0, -0.05]);
      const fan = tracker.cyl(0.06, 0.06, 0.04, 14, tracker.mat(0x2dd4bf, 0.3, 0.3, { emissive: 0x14b8a6, emissiveIntensity: 0.45 }), [-0.28, 1.04, -0.05], [0, 0, Math.PI / 2]);
      const mon = buildMonitorMesh(tracker, doc, 0.48, 0.3, [0.16, 0.77, -0.12], -0.15, (ctx, w, h) => {
        ctx.fillStyle = '#072a2d'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2dd4bf'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('01 · HARDWARE BENCH', 16, 42);
        ctx.fillStyle = '#e2e8f0'; ctx.font = '14px sans-serif'; ctx.fillText('8 ServiceDesk & PC Assembly Labs', 16, 80);
        ctx.fillStyle = '#5eead4'; ctx.fillText('INC-101 → INC-108 · Ready', 16, 122);
      });
      group.add(tower, board, fan, mon.group);
    } else if (station.id === 'network') {
      // Server/Switch rack + blinking LEDs + Wi-Fi AP dome + printer
      const rack = tracker.box(0.42, 0.72, 0.36, tracker.mat(0x0f172a, 0.38, 0.65), [-0.3, 1.13, -0.12]);
      const sw1 = tracker.box(0.38, 0.07, 0.37, tracker.mat(0x1d4ed8, 0.35, 0.5, { emissive: 0x2563eb, emissiveIntensity: 0.35 }), [-0.3, 1.32, -0.12]);
      const sw2 = tracker.box(0.38, 0.07, 0.37, tracker.mat(0x0284c7, 0.35, 0.5, { emissive: 0x0ea5e9, emissiveIntensity: 0.3 }), [-0.3, 1.18, -0.12]);
      const ap = tracker.cyl(0.09, 0.09, 0.025, 16, tracker.mat(0xf8fafc, 0.3, 0.2), [0.35, 0.79, 0.14]);
      const mon = buildMonitorMesh(tracker, doc, 0.46, 0.28, [0.18, 0.77, -0.12], -0.08, (ctx, w, h) => {
        ctx.fillStyle = '#0b1e3b'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('02 · NETWORK & OS', 16, 42);
        ctx.fillStyle = '#e2e8f0'; ctx.font = '14px sans-serif'; ctx.fillText('VLANs · IPv4 · DNS · Wi-Fi · Printers', 16, 80);
        ctx.fillStyle = '#38bdf8'; ctx.fillText('NET-201 → NET-206 · Online', 16, 122);
      });
      group.add(rack, sw1, sw2, ap, mon.group);
    } else if (station.id === 'ai') {
      // Dual curved monitors + glowing AI ethics core
      const monL = buildMonitorMesh(tracker, doc, 0.44, 0.28, [-0.23, 0.77, -0.1], 0.18, (ctx, w, h) => {
        ctx.fillStyle = '#1e103a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#c4b5fd'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('03 · AI AUDIT LAB', 16, 42);
        ctx.fillStyle = '#e2e8f0'; ctx.font = '14px sans-serif'; ctx.fillText('Privacy · Citations · Fairness', 16, 80);
        ctx.fillStyle = '#a78bfa'; ctx.fillText('AI-301 → AI-306 · Verified', 16, 122);
      });
      const monR = buildMonitorMesh(tracker, doc, 0.44, 0.28, [0.23, 0.77, -0.1], -0.18, (ctx, w, h) => {
        ctx.fillStyle = '#160d2e'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#a78bfa'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('ETHICS & EVIDENCE', 16, 40);
        ctx.fillStyle = '#34d399'; ctx.fillRect(16, 65, 190, 14);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(16, 92, 165, 14);
        ctx.fillStyle = '#c084fc'; ctx.fillRect(16, 119, 210, 14);
      });
      const shield = tracker.sphere(0.075, 14, 12, tracker.mat(0x8b5cf6, 0.25, 0.4, { emissive: 0x7c3aed, emissiveIntensity: 0.5 }), [0, 0.86, 0.18]);
      group.add(monL.group, monR.group, shield);
    } else if (station.id === 'security') {
      // Triple SOC monitor array + firewall appliance
      const monC = buildMonitorMesh(tracker, doc, 0.42, 0.27, [0, 0.77, -0.14], 0, (ctx, w, h) => {
        ctx.fillStyle = '#271705'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('04 · CYBERSECURITY SOC', 14, 42);
        ctx.fillStyle = '#fde68a'; ctx.font = '14px sans-serif'; ctx.fillText('Defensive Triage · Zero Trust', 14, 80);
        ctx.fillStyle = '#f59e0b'; ctx.fillText('SEC-401 → SEC-406 · Scope Ready', 14, 122);
      });
      const monL = buildMonitorMesh(tracker, doc, 0.34, 0.25, [-0.38, 0.77, -0.06], 0.32, (ctx, w, h) => {
        ctx.fillStyle = '#1c1206'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('SIEM TIMELINE', 16, 44);
        ctx.fillStyle = '#10b981'; ctx.fillText('● Zero-Trust Active', 16, 90);
      });
      const firewall = tracker.box(0.32, 0.065, 0.2, tracker.mat(0xb45309, 0.35, 0.55, { emissive: 0xd97706, emissiveIntensity: 0.28 }), [0.36, 0.81, 0.08]);
      group.add(monC.group, monL.group, firewall);
    } else if (station.id === 'coding') {
      // Coding monitor + smart thermostat + station readiness LED bar
      const mon = buildMonitorMesh(tracker, doc, 0.46, 0.29, [-0.14, 0.77, -0.12], 0.1, (ctx, w, h) => {
        ctx.fillStyle = '#290b1d'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f472b6'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('05 · CODING SANDBOX', 14, 42);
        ctx.fillStyle = '#fbcfe8'; ctx.font = '14px sans-serif'; ctx.fillText('Variables · Conditionals · Loops', 14, 80);
        ctx.fillStyle = '#ec4899'; ctx.fillText('CODE-501 → CODE-503 · Ready', 14, 122);
      });
      const sensor = tracker.cyl(0.085, 0.085, 0.04, 16, tracker.mat(0xec4899, 0.3, 0.4, { emissive: 0xdb2777, emissiveIntensity: 0.4 }), [0.3, 0.81, 0.06]);
      group.add(mon.group, sensor);
    }

    tracker.tagSelect(group, station.id);
    stationGroups.set(station.id, group);
    pickTargets.push(group);
    scene.add(group);
  }

  const overviewCam = { pos: [0, 3.65, 4.55], target: [0, 0.85, -1.25] };
  let targetPos = overviewCam.target.slice();
  let camPos = overviewCam.pos.slice();
  let selectedTrack = PATHWAY_STATIONS.some(s => s.id === activeTrack) ? activeTrack : 'hardware';
  let frame = 0;
  let paused = false;
  let disposed = false;
  let contextLost = false;
  let pointers = null;

  const stageHost = host.querySelector('[data-vlab-stage]') || host;
  stageHost.appendChild(canvas);

  function syncSelectionAppearance() {
    for (const station of PATHWAY_STATIONS) {
      const mat = selectionRings.get(station.id);
      if (mat) mat.emissiveIntensity = station.id === selectedTrack ? 0.75 : 0.14;
    }
    host.querySelectorAll('[data-vlab-station]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.vlabStation === selectedTrack));
    });
    const info = PATHWAY_STATIONS.find(s => s.id === selectedTrack) || PATHWAY_STATIONS[0];
    const titleEl = host.querySelector('[data-vlab-title]');
    const summaryEl = host.querySelector('[data-vlab-summary]');
    const linksEl = host.querySelector('[data-vlab-links]');
    if (titleEl) titleEl.textContent = `Station ${info.number} · ${info.name}`;
    if (summaryEl) summaryEl.textContent = info.summary;
    if (linksEl) {
      linksEl.innerHTML = info.featured.map(lab => `<a class="vlab-ticket-pill" href="#lab/${lab.id}"><strong>${lab.id}</strong><span>${lab.title}</span><span aria-hidden="true">↗</span></a>`).join('') +
        `<a class="vlab-pathway-btn" href="#labs/${info.id}" data-vlab-filter="${info.id}">Filter ${info.short} pathway →</a>`;
    }
  }

  function resize() {
    const rect = stageHost.getBoundingClientRect?.() || { width: stageHost.clientWidth || 720, height: stageHost.clientHeight || 380 };
    if (rect.width < 2 || rect.height < 2) return false;
    let ratio = Math.min(win.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    if (rect.width * rect.height * ratio * ratio > MAX_RENDER_PIXELS) {
      ratio = Math.sqrt(MAX_RENDER_PIXELS / (rect.width * rect.height));
    }
    renderer.setPixelRatio(ratio);
    renderer.setSize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)), false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    return true;
  }

  function draw() {
    frame = 0;
    if (disposed || paused || contextLost || doc.hidden || !resize()) return;
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    camera.lookAt(targetPos[0], targetPos[1], targetPos[2]);
    renderer.render(scene, camera);
  }

  function schedule() {
    if (!disposed && !paused && !contextLost && !doc.hidden && !frame) {
      frame = win.requestAnimationFrame(draw);
    }
  }

  function flyTo(viewId) {
    pointers?.cancel();
    if (viewId === 'overview') {
      camPos = overviewCam.pos.slice();
      targetPos = overviewCam.target.slice();
    } else {
      const st = PATHWAY_STATIONS.find(s => s.id === viewId);
      if (st) {
        selectedTrack = st.id;
        camPos = st.cam.pos.slice();
        targetPos = st.cam.target.slice();
        syncSelectionAppearance();
        onSelectTrack?.(st.id);
      }
    }
    schedule();
  }

  function zoom(direction) {
    pointers?.cancel();
    const factor = direction === 'in' ? 0.86 : 1.15;
    camPos = camPos.map((c, i) => targetPos[i] + (c - targetPos[i]) * factor);
    schedule();
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function orbit(dx, dy) {
    const vx = camPos[0] - targetPos[0];
    const vz = camPos[2] - targetPos[2];
    const angle = -dx * 0.0065;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    camPos[0] = targetPos[0] + vx * cos - vz * sin;
    camPos[2] = targetPos[2] + vx * sin + vz * cos;
    camPos[1] = Math.max(1.05, Math.min(5.2, camPos[1] + dy * 0.008));
    schedule();
  }
  function tap(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickTargets, true).find(item => item.object.userData.selectId);
    if (hit) flyTo(hit.object.userData.selectId);
  }

  function onHostClick(event) {
    const filterLink = event.target.closest?.('[data-vlab-filter]');
    if (filterLink && onSelectTrack) {
      onSelectTrack(filterLink.dataset.vlabFilter, true);
    }
    const btn = event.target.closest?.('button');
    if (!btn || !host.contains(btn)) return;
    if (btn.dataset.vlabStation) {
      flyTo(btn.dataset.vlabStation);
    } else if (btn.dataset.vlabCam) {
      const cmd = btn.dataset.vlabCam;
      if (cmd === 'overview') flyTo('overview');
      else if (cmd === 'in' || cmd === 'out') zoom(cmd);
      else if (cmd === 'toggle') {
        pointers?.cancel();
        paused = !paused;
        btn.textContent = paused ? 'Resume 3D' : 'Pause 3D';
        if (!paused) schedule();
      }
    } else if (btn.dataset.vlabOpen && onOpenLab) {
      onOpenLab(btn.dataset.vlabOpen);
    }
  }

  pointers = bindPreviewPointers(canvas, { doc, win, enabled: () => !disposed && !paused && !contextLost && !doc.hidden, onOrbit: orbit, onTap: tap,
    onSuspend(reason) { if (reason === 'context') contextLost = true; if (frame) win.cancelAnimationFrame(frame); frame = 0; },
    onRestore(reason) { if (reason === 'context') contextLost = false; schedule(); }
  });
  host.addEventListener('click', onHostClick);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  observer?.observe(stageHost);

  syncSelectionAppearance();
  if (PATHWAY_STATIONS.some(s => s.id === activeTrack)) {
    const st = PATHWAY_STATIONS.find(s => s.id === activeTrack);
    camPos = st.cam.pos.slice();
    targetPos = st.cam.target.slice();
  }
  schedule();

  return {
    flyTo,
    dispose() {
      if (disposed) return;
      disposed = true;
      pointers.dispose();
      if (frame) win.cancelAnimationFrame(frame);
      observer?.disconnect();
      host.removeEventListener('click', onHostClick);
      tracker.disposeAll(scene);
      renderer.dispose();
      canvas.remove();
    }
  };
}

/**
 * Mounts a live, state-reactive 3D Pathway Station inside #lab-workbench for
 * any investigation (NET-201..206, AI-301..306, SEC-401..406, CODE-501..503).
 * Updates its 3D monitors, LEDs, Wi-Fi coverage dome, printer tray, and sensors
 * whenever `cole:lab-state-change` fires.
 */
export function mountLabStation3D(benchColumn, { scenario, getRecord }) {
  if (!benchColumn || !scenario || scenario.track === 'hardware') return () => {};
  const doc = benchColumn.ownerDocument;
  const win = doc.defaultView || globalThis;
  const workspaceEl = benchColumn.querySelector('#workspace');
  if (!workspaceEl) return () => {};

  const container = doc.createElement('section');
  container.className = `vlab-station-card track-${scenario.track}`;
  container.setAttribute('aria-label', 'Interactive 3D pathway station view');
  container.innerHTML = `<div class="vlab-station-head">
    <div><span class="hw-eyebrow">3D VIRTUAL LAB ENVIRONMENT · ${scenario.id}</span><h3>Live 3D ${scenario.track === 'network' ? 'Network & Systems Rack' : scenario.track === 'ai' ? 'AI Evaluation & Audit Station' : scenario.track === 'security' ? 'Cybersecurity SOC Console' : 'Coding & Physical Computing Bench'}</h3></div>
    <div class="vlab-station-controls" role="group" aria-label="3D station camera controls">
      <button type="button" data-station-cam="iso">Desk view</button>
      <button type="button" data-station-cam="screen">Monitor</button>
      <button type="button" data-station-cam="device">Equipment</button>
      <button type="button" data-station-cam="in">Zoom +</button>
      <button type="button" data-station-cam="out">Zoom −</button>
      <button type="button" data-station-cam="toggle">Pause 3D</button>
    </div>
  </div>
  <div class="vlab-station-stage" data-station-stage role="img" aria-label="3D virtual station that updates as you test changes in the workbench below."></div>
  <p class="vlab-station-caption" data-station-caption>Drag horizontally to orbit the 3D station. Changes you make in the workspace below update the 3D equipment and monitors live.</p>`;

  benchColumn.insertBefore(container, workspaceEl);
  const stage = container.querySelector('[data-station-stage]');
  const caption = container.querySelector('[data-station-caption]');
  const canvas = doc.createElement('canvas');
  canvas.className = 'vlab-canvas';
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) {
    stage.innerHTML = `<div class="vlab-fallback">3D station preview is unavailable on this device. All simulation controls below remain active.</div>`;
    return () => container.remove();
  }

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x091426);
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 30);
  const tracker = createResourceTracker();
  addStudioLighting(scene, tracker);

  const accent = { network: 0x3b82f6, ai: 0x8b5cf6, security: 0xf59e0b, coding: 0xec4899 }[scenario.track] || 0x18b7a0;
  const desk = buildDeskBase(tracker, accent, 1.85, 0.96);
  scene.add(desk);

  // Dynamic state-reactive 3D elements
  const leds = [];
  for (let i = 0; i < 4; i++) {
    const ledMat = tracker.mat(0x64748b, 0.25, 0.2, { emissive: 0x334155, emissiveIntensity: 0.5 });
    const led = tracker.sphere(0.018, 10, 8, ledMat, [-0.55 + i * 0.08, 0.81, 0.28]);
    scene.add(led);
    leds.push(ledMat);
  }

  // Primary 3D monitor on desk
  const mainMonitor = buildMonitorMesh(tracker, doc, 0.68, 0.42, [0, 0.77, -0.14], 0, () => {});
  scene.add(mainMonitor.group);

  // Track-specific 3D equipment
  let wifiDome = null;
  let wifiAp = null;
  let printerSheet = null;
  let thermostatRingMat = null;
  const codeNodeMats = [];

  if (scenario.track === 'network') {
    // 42U Network Rack & Switch on left, Printer/Wi-Fi AP on right
    const rack = tracker.box(0.46, 0.68, 0.36, tracker.mat(0x0f172a, 0.4, 0.65), [-0.62, 1.11, -0.12]);
    const sw = tracker.box(0.42, 0.08, 0.37, tracker.mat(0x1d4ed8, 0.35, 0.5, { emissive: 0x2563eb, emissiveIntensity: 0.35 }), [-0.62, 1.28, -0.12]);
    scene.add(rack, sw);
    // Wi-Fi AP & translucent coverage dome
    wifiAp = tracker.cyl(0.08, 0.08, 0.025, 16, tracker.mat(0xf8fafc, 0.3, 0.2), [0.56, 0.79, 0.05]);
    const domeMat = tracker.mat(0x38bdf8, 0.2, 0.1, { transparent: true, opacity: 0.24, emissive: 0x0284c7, emissiveIntensity: 0.35 });
    wifiDome = tracker.sphere(0.24, 18, 12, domeMat, [0.56, 0.88, 0.05]);
    // Classroom Laser Printer
    const printerBody = tracker.box(0.34, 0.22, 0.28, tracker.mat(0xcbd5e1, 0.5, 0.2), [0.56, 0.88, -0.18]);
    printerSheet = tracker.box(0.16, 0.008, 0.18, tracker.mat(0xffffff, 0.6, 0.05), [0.56, 0.995, -0.06]);
    scene.add(wifiAp, wifiDome, printerBody, printerSheet);
  } else if (scenario.track === 'ai') {
    const sideMon = buildMonitorMesh(tracker, doc, 0.46, 0.32, [-0.56, 0.77, -0.06], 0.25, (ctx, w, h) => {
      ctx.fillStyle = '#190d33'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c4b5fd'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('AI AUDIT CHECKLIST', 16, 36);
      ctx.fillStyle = '#a78bfa'; ctx.font = '13px sans-serif';
      ctx.fillText('1. Protect private data', 16, 72);
      ctx.fillText('2. Verify real sources', 16, 102);
      ctx.fillText('3. Keep humans in the loop', 16, 132);
    });
    const totem = tracker.sphere(0.09, 16, 14, tracker.mat(0x8b5cf6, 0.22, 0.4, { emissive: 0x7c3aed, emissiveIntensity: 0.45 }), [0.56, 0.88, 0.06]);
    scene.add(sideMon.group, totem);
  } else if (scenario.track === 'security') {
    const sideMon = buildMonitorMesh(tracker, doc, 0.46, 0.32, [-0.56, 0.77, -0.06], 0.25, (ctx, w, h) => {
      ctx.fillStyle = '#241404'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('DEFENSIVE SOC TELEMETRY', 14, 36);
      ctx.fillStyle = '#fde68a'; ctx.font = '13px sans-serif';
      ctx.fillText('• Authorized lab scope only', 14, 74);
      ctx.fillText('• Least privilege & audit logs', 14, 104);
      ctx.fillText('• Contain & verify safely', 14, 134);
    });
    const appliance = tracker.box(0.38, 0.08, 0.24, tracker.mat(0xb45309, 0.35, 0.55, { emissive: 0xd97706, emissiveIntensity: 0.3 }), [0.56, 0.81, 0.02]);
    scene.add(sideMon.group, appliance);
  } else if (scenario.track === 'coding') {
    // Thermostat cylinder + 6 station readiness nodes
    const thermoBase = tracker.cyl(0.11, 0.11, 0.045, 20, tracker.mat(0x1e293b, 0.35, 0.5), [0.55, 0.8, -0.08]);
    thermostatRingMat = tracker.mat(0x38bdf8, 0.25, 0.3, { emissive: 0x0284c7, emissiveIntensity: 0.55 });
    const thermoRing = tracker.cyl(0.085, 0.085, 0.052, 20, thermostatRingMat, [0.55, 0.805, -0.08]);
    scene.add(thermoBase, thermoRing);
    for (let i = 0; i < 6; i++) {
      const m = tracker.mat(0x475569, 0.3, 0.3, { emissive: 0x1e293b, emissiveIntensity: 0.4 });
      const node = tracker.box(0.065, 0.05, 0.065, m, [-0.72 + i * 0.09, 0.8, 0.12]);
      codeNodeMats.push(m);
      scene.add(node);
    }
  }

  function syncFromState() {
    const rec = getRecord?.() || {};
    const st = rec.state || {};
    const results = Array.isArray(st.results) ? st.results : [];
    const passCount = results.filter(r => r && r.ok).length;
    const allPass = results.length > 0 && results.every(r => r && r.ok);

    // Update 4 status LEDs on desk
    leds.forEach((mat, idx) => {
      const ok = allPass || idx < passCount;
      mat.color.setHex(ok ? 0x10b981 : st.tested ? 0xf59e0b : 0x64748b);
      mat.emissive.setHex(ok ? 0x059669 : st.tested ? 0xd97706 : 0x334155);
      mat.emissiveIntensity = ok ? 0.85 : 0.45;
    });

    // Update track-specific 3D props
    if (wifiDome && wifiAp) {
      const centered = st.placement === 'ceiling-center';
      const clean5g = st.band === '5' && st.channel === '40';
      wifiAp.position.x = centered ? 0.46 : 0.72;
      wifiDome.position.x = wifiAp.position.x;
      wifiDome.scale.setScalar(centered ? 1.25 : 0.75);
      wifiDome.material.color.setHex(clean5g ? 0x10b981 : 0xf59e0b);
      wifiDome.material.emissive.setHex(clean5g ? 0x059669 : 0xd97706);
    }
    if (printerSheet) {
      const ready = st.spooler === 'running' && st.queue === 'resume' && st.port === 'approved' && st.job === 'release';
      printerSheet.visible = ready;
    }
    if (thermostatRingMat) {
      const code = String(st.code || '');
      const hasBranches = /Heating/i.test(code) && /Comfortable/i.test(code) && /Cooling/i.test(code);
      thermostatRingMat.color.setHex(allPass ? 0x10b981 : hasBranches ? 0x38bdf8 : 0xf59e0b);
      thermostatRingMat.emissive.setHex(allPass ? 0x059669 : hasBranches ? 0x0284c7 : 0xd97706);
    }
    if (codeNodeMats.length) {
      const lines = Array.isArray(st.output) ? st.output.length : 0;
      codeNodeMats.forEach((m, idx) => {
        const lit = allPass || idx < lines;
        m.color.setHex(lit ? 0xec4899 : 0x475569);
        m.emissive.setHex(lit ? 0xdb2777 : 0x1e293b);
      });
    }

    // Redraw 3D Main Monitor screen with live lab telemetry
    mainMonitor.screen.redraw((ctx, w, h) => {
      ctx.fillStyle = '#071120';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = allPass ? '#065f46' : '#1e293b';
      ctx.fillRect(0, 0, w, 32);
      ctx.fillStyle = allPass ? '#6ee7b7' : '#38bdf8';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${scenario.id} · ${scenario.title.slice(0, 28)}`, 12, 21);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px sans-serif';
      if (scenario.track === 'network') {
        const line1 = st.ip ? `IPv4: ${st.ip}  GW: ${st.gateway || '-'}` : st.portVlan ? `Port VLAN: ${st.portVlan} (${st.mode || '-'})` : st.placement ? `AP: ${st.placement}` : st.spooler ? `Spooler: ${st.spooler} · Port: ${st.port || '-'}` : `Checks run: ${st.checkRuns || 0}`;
        const line2 = st.dns ? `DNS: ${st.dns}` : st.band ? `Band: ${st.band} GHz · Ch: ${st.channel || '-'} (${st.width || '-'} MHz)` : st.queue ? `Queue: ${st.queue} · Job: ${st.job || '-'}` : `Tested: ${st.tested ? 'Yes' : 'Pending'}`;
        ctx.fillText(line1.slice(0, 38), 12, 64);
        ctx.fillStyle = '#93c5fd';
        ctx.font = '13px sans-serif';
        ctx.fillText(line2.slice(0, 42), 12, 92);
      } else if (scenario.track === 'ai') {
        ctx.fillText(`AI Audit Runs: ${st.checkRuns || 0}`, 12, 64);
        ctx.fillStyle = '#c4b5fd';
        ctx.font = '13px sans-serif';
        ctx.fillText(allPass ? '✓ All privacy, evidence & fairness checks pass' : 'Review prompt, sources, or policy controls below', 12, 92);
      } else if (scenario.track === 'security') {
        ctx.fillText(`Scope Authorized: ${st.scope ? 'YES (Active)' : 'Awaiting Check'}`, 12, 64);
        ctx.fillStyle = '#fcd34d';
        ctx.font = '13px sans-serif';
        ctx.fillText(allPass ? '✓ Defensive controls verified' : `Triage checks passing: ${passCount}/${results.length || 3}`, 12, 92);
      } else if (scenario.track === 'coding') {
        const firstLine = (Array.isArray(st.output) && st.output[0]) ? `Out: ${st.output[0]}` : 'Run program fixtures to see output';
        ctx.fillText(`Fixture Runs: ${st.checkRuns || 0}`, 12, 64);
        ctx.fillStyle = '#f9a8d4';
        ctx.font = '13px monospace';
        ctx.fillText(String(firstLine).slice(0, 38), 12, 92);
      }

      ctx.fillStyle = allPass ? '#10b981' : st.tested ? '#f59e0b' : '#64748b';
      ctx.fillRect(12, 118, w - 24, 42);
      ctx.fillStyle = '#041019';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(allPass ? 'STATUS: CHECKS PASS · VERIFY THE TASK' : st.tested ? `STATUS: ${passCount}/${results.length || 3} CHECKS PASSING` : 'STATUS: READY FOR WORKBENCH TEST', 22, 144);
    });

    if (caption) {
      caption.textContent = allPass
        ? `3D Station Status: All checks passing for ${scenario.id}. Ready to verify and explain!`
        : `3D Station Status: Live view synced with ${scenario.id}. Make changes below and test to update the 3D equipment.`;
    }
  }

  const presets = {
    iso: { pos: [0, 1.85, 1.55], target: [0, 0.96, -0.08] },
    screen: { pos: [0, 1.12, 0.62], target: [0, 1.08, -0.14] },
    device: { pos: [0.58, 1.38, 0.95], target: [0.35, 0.88, -0.05] }
  };
  let camPos = presets.iso.pos.slice();
  let targetPos = presets.iso.target.slice();
  let frame = 0;
  let paused = false;
  let disposed = false;
  let stationContextLost = false;
  let stationPointers = null;

  function resize() {
    if (benchColumn.hidden) return false;
    const rect = stage.getBoundingClientRect?.() || { width: stage.clientWidth || 640, height: stage.clientHeight || 260 };
    if (rect.width < 2 || rect.height < 2) return false;
    let ratio = Math.min(win.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    if (rect.width * rect.height * ratio * ratio > MAX_RENDER_PIXELS) {
      ratio = Math.sqrt(MAX_RENDER_PIXELS / (rect.width * rect.height));
    }
    renderer.setPixelRatio(ratio);
    renderer.setSize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)), false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    return true;
  }

  function draw() {
    frame = 0;
    if (disposed || paused || stationContextLost || doc.hidden || !resize()) return;
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    camera.lookAt(targetPos[0], targetPos[1], targetPos[2]);
    renderer.render(scene, camera);
  }

  function schedule() {
    if (!disposed && !paused && !stationContextLost && !doc.hidden && !benchColumn.hidden && !frame) {
      frame = win.requestAnimationFrame(draw);
    }
  }

  function orbit(dx, dy) {
    const vx = camPos[0] - targetPos[0];
    const vz = camPos[2] - targetPos[2];
    const angle = -dx * 0.007;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    camPos[0] = targetPos[0] + vx * cos - vz * sin;
    camPos[2] = targetPos[2] + vx * sin + vz * cos;
    camPos[1] = Math.max(0.88, Math.min(2.8, camPos[1] + dy * 0.006));
    schedule();
  }

  function onControlsClick(event) {
    const btn = event.target.closest?.('button[data-station-cam]');
    if (!btn) return;
    const cmd = btn.dataset.stationCam;
    stationPointers.cancel();
    if (presets[cmd]) {
      camPos = presets[cmd].pos.slice();
      targetPos = presets[cmd].target.slice();
      schedule();
    } else if (cmd === 'in' || cmd === 'out') {
      const factor = cmd === 'in' ? 0.85 : 1.16;
      camPos = camPos.map((c, i) => targetPos[i] + (c - targetPos[i]) * factor);
      schedule();
    } else if (cmd === 'toggle') {
      paused = !paused;
      btn.textContent = paused ? 'Resume 3D' : 'Pause 3D';
      if (!paused) schedule();
    }
  }

  function onStateChange(event) {
    if (!event?.detail?.id || event.detail.id === scenario.id) {
      syncFromState();
      schedule();
    }
  }

  function onTabReveal() {
    if (benchColumn.hidden) stationPointers.cancel();
    else schedule();
  }

  stationPointers = bindPreviewPointers(canvas, { doc, win, enabled: () => !disposed && !paused && !stationContextLost && !doc.hidden && !benchColumn.hidden, onOrbit: orbit,
    onSuspend(reason) { if (reason === 'context') stationContextLost = true; if (frame) win.cancelAnimationFrame(frame); frame = 0; },
    onRestore(reason) { if (reason === 'context') stationContextLost = false; schedule(); }
  });
  container.addEventListener('click', onControlsClick);
  doc.addEventListener('cole:lab-state-change', onStateChange);
  doc.addEventListener('click', onTabReveal);
  doc.addEventListener('keydown', onTabReveal);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  observer?.observe(stage);

  syncFromState();
  schedule();

  return () => {
    if (disposed) return;
    disposed = true;
    stationPointers.dispose();
    if (frame) win.cancelAnimationFrame(frame);
    observer?.disconnect();
    container.removeEventListener('click', onControlsClick);
    doc.removeEventListener('cole:lab-state-change', onStateChange);
    doc.removeEventListener('click', onTabReveal);
    doc.removeEventListener('keydown', onTabReveal);
    tracker.disposeAll(scene);
    renderer.dispose();
    container.remove();
  };
}

export function renderVirtualLabHubMarkup(activeTrack = 'all') {
  return `<section class="vlab-hub" data-vlab-hub aria-label="Interactive 3D Virtual Learning Lab Room">
    <div class="vlab-hub-header">
      <div>
        <p class="eyebrow"><span class="status-dot"></span> INTERACTIVE 3D VIRTUAL LEARNING LAB ENVIRONMENT</p>
        <h2>Step inside the 3D classroom lab.</h2>
        <p class="vlab-hub-sub">Orbit the 3D tech lab room, tap any of the five pathway benches to fly the camera to that station, and launch an investigation.</p>
      </div>
      <div class="vlab-cam-bar" role="group" aria-label="3D classroom camera controls">
        <button type="button" data-vlab-cam="overview">Whole Lab Room</button>
        <button type="button" data-vlab-cam="in">Zoom +</button>
        <button type="button" data-vlab-cam="out">Zoom −</button>
        <button type="button" data-vlab-cam="toggle">Pause 3D</button>
      </div>
    </div>
    <div class="vlab-station-switcher" role="group" aria-label="Jump camera to pathway station">
      ${PATHWAY_STATIONS.map(st => `<button type="button" class="vlab-station-pill" data-vlab-station="${st.id}" aria-pressed="${st.id === activeTrack}">
        <span class="vlab-pill-num">${st.number}</span>
        <span>${st.short}</span>
      </button>`).join('')}
    </div>
    <div class="vlab-hub-body">
      <div class="vlab-stage" data-vlab-stage role="img" aria-label="3D virtual classroom with five technology pathway benches. Use the station buttons to inspect each bench and open labs."></div>
      <aside class="vlab-inspector" aria-live="polite">
        <span class="hw-eyebrow">SELECTED 3D WORKSTATION</span>
        <h3 data-vlab-title>Station 01 · Hardware &amp; ServiceDesk</h3>
        <p data-vlab-summary>ESD service bench with open ATX tower, component tray, thermal paste, and HDMI test monitor.</p>
        <div class="vlab-ticket-list" data-vlab-links></div>
      </aside>
    </div>
  </section>`;
}
