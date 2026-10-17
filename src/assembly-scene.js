import * as THREE from './three.module.js?release=20261017-assembly12';

/**
 * Original, procedural equipment artwork. This module is a view adapter only:
 * authored mechanical rules and student work remain outside the scene graph.
 * No textures, remote assets, physics engine, or continuous animation loop.
 */
export function mountAssemblyScene(host, { hardware = {}, assembly = {}, onSelect = () => {}, onStatus = () => {} } = {}) {
  if (!host?.ownerDocument || typeof host.appendChild !== 'function') return null;
  const doc = host.ownerDocument;
  const view = doc.defaultView;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  } catch {
    onStatus({ kind: 'unavailable', message: 'This device cannot start the 3D view. All assembly tools remain available in the labeled workbench controls.' });
    return null;
  }

  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive 3D classroom workstation. Labeled component and camera buttons provide the same actions without dragging.');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  // Vertical gestures can scroll the page; horizontal gestures rotate equipment.
  canvas.style.touchAction = 'pan-y';
  canvas.style.userSelect = 'none';
  renderer.setClearColor(0x0b1724, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(1);
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const target = new THREE.Vector3(-0.15, 2.7, 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const geometries = new Map();
  const materials = new Map();
  const nodes = new Map();
  const screws = [];
  const cables = [];
  const selectables = [];
  const disposals = [];
  let stopped = false;
  let paused = false;
  let contextLost = false;
  let frame = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  let yaw = 0.52;
  let pitch = 0.33;
  let distance = 16;
  let fittedDistance = 16;
  let gesture = null;
  let selectedId = '';
  let modelHardware = hardware;
  let modelAssembly = assembly;

  function material(color, options = {}) {
    const key = `${color}:${JSON.stringify(options)}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.18, ...options }));
    return materials.get(key);
  }
  function geometry(key, build) {
    if (!geometries.has(key)) geometries.set(key, build());
    return geometries.get(key);
  }
  function box(parent, width, height, depth, x, y, z, color, options = {}) {
    const mesh = new THREE.Mesh(geometry(`b:${width}:${height}:${depth}`, () => new THREE.BoxGeometry(width, height, depth)), material(color, options));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, radius, height, x, y, z, color, orientation = 'z', options = {}) {
    const mesh = new THREE.Mesh(geometry(`c:${radius}:${height}`, () => new THREE.CylinderGeometry(radius, radius, height, 12)), material(color, options));
    if (orientation === 'z') mesh.rotation.x = Math.PI / 2;
    if (orientation === 'x') mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function group(id, parent = scene, register = true) {
    const node = new THREE.Group();
    if (id) {
      node.userData.selectId = id;
      if (register) nodes.set(id, node);
      selectables.push(node);
    }
    parent.add(node);
    return node;
  }
  function instanceBoxes(parent, size, positions, color) {
    const geo = geometry(`b:${size.join(':')}`, () => new THREE.BoxGeometry(...size));
    const mesh = new THREE.InstancedMesh(geo, material(color), positions.length);
    const transform = new THREE.Object3D();
    positions.forEach((pos, index) => {
      transform.position.set(...pos);
      transform.rotation.set(0, 0, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
    return mesh;
  }
  function cableGeometry(points, radius) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    return geometry(`lead:${radius}:${points.flat().join(':')}`, () => new THREE.TubeGeometry(curve, 16, radius, 4, false));
  }
  function lead(id, key, points, color, width = 0.045, requirePart = '') {
    const node = group(id);
    const mesh = new THREE.Mesh(cableGeometry(points, width), material(color, { roughness: 0.92, metalness: 0 }));
    node.add(mesh);
    const end = points.at(-1);
    box(node, width * 4, width * 3, width * 3, ...end, 0x17202c);
    // A connected and a visibly loose cable are separate render states.
    const loose = group(id, scene, false);
    const start = points[0];
    const loosePoints = [start, [start[0] + 0.5, 0.55, 0.7], [start[0] + 0.55, 0.22, 1.15]];
    loose.add(new THREE.Mesh(cableGeometry(loosePoints, width), material(color, { roughness: 0.92, metalness: 0 })));
    box(loose, width * 4, width * 3, width * 3, ...loosePoints.at(-1), 0x38495b);
    cables.push({ node, loose, key, requirePart, assemblyKey: key === 'cpuFanConnected' });
    return node;
  }
  function movable(id, fitted, loose, partKey, rotation = null) {
    const node = group(id);
    node.userData.fitted = fitted;
    node.userData.loose = loose;
    node.userData.partKey = partKey;
    node.userData.looseRotation = rotation || [0, 0, 0];
    return node;
  }

  scene.add(new THREE.HemisphereLight(0xc7e9ff, 0x17222e, 2.6));
  const keyLight = new THREE.DirectionalLight(0xf5fbff, 3.5);
  keyLight.position.set(-6, 10, 10);
  scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0x30d5c0, 1.2);
  rim.position.set(5, 5, -5);
  scene.add(rim);

  // Worktable, grounded mat, and a few etched lines use no bitmap textures.
  box(scene, 16, 0.15, 9, 0, -0.43, 0, 0x243848);
  box(scene, 7.2, 0.025, 4.7, 0, -0.34, 0.1, 0x0c403d);
  box(scene, 3.2, 0.04, 4.1, 5, -0.32, 0, 0x172833);
  const lines = [];
  for (let i = -6; i <= 6; i += 1) lines.push(i * 0.5, -0.32, -2.1, i * 0.5, -0.32, 2.1);
  for (let i = -4; i <= 4; i += 1) lines.push(-3, -0.32, i * 0.5, 3, -0.32, i * 0.5);
  const gridGeo = geometry('mat-grid', () => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)));
  const gridMat = new THREE.LineBasicMaterial({ color: 0x27605a, transparent: true, opacity: 0.65 });
  disposals.push(gridMat);
  scene.add(new THREE.LineSegments(gridGeo, gridMat));

  const chassis = group();
  box(chassis, 5.4, 4.68, 0.12, 0, 3.92, -1.02, 0x344451);
  box(chassis, 5.55, 0.15, 2.65, 0, 6.3, 0.22, 0x62717b);
  box(chassis, 5.55, 0.18, 2.65, 0, 0, 0.22, 0x536573);
  box(chassis, 0.16, 6.2, 2.5, -2.7, 3.1, 0.22, 0x2d3a47);
  box(chassis, 0.18, 6.2, 2.5, 2.7, 3.1, 0.22, 0x253b48);
  // Front grille and rear cut-outs stay legible from the default side view.
  instanceBoxes(chassis, [0.19, 0.07, 1.8], Array.from({ length: 18 }, (_, i) => [2.805, 1.7 + i * 0.2, 0.2]), 0x0c1a25);
  instanceBoxes(chassis, [0.15, 0.07, 1.9], Array.from({ length: 8 }, (_, i) => [-2.8, 1.5 + i * 0.18, 0.2]), 0x0c1a25);
  box(chassis, 0.12, 6.2, 0.12, -2.67, 3.1, 1.5, 0x6c838e);
  box(chassis, 0.12, 6.2, 0.12, 2.67, 3.1, 1.5, 0x6c838e);
  [-2.1, 2.1].forEach(x => [-0.55, 1].forEach(z => box(chassis, 0.48, 0.18, 0.48, x, -0.15, z, 0x080e16)));
  box(chassis, 0.2, 0.2, 0.14, 2.83, 5.85, 0.7, 0x1dd8bd);
  // Exposed standoffs identify the board's mounting surface when it is removed.
  [[-1.83, 5.75], [1.6, 5.75], [-1.83, 2.25], [1.6, 2.25]].forEach(([x, y]) => cylinder(chassis, 0.095, 0.27, x, y, -0.79, 0xa78946));

  const board = movable('board', [0, 3.93, -0.76], [-4.5, -0.16, -0.25], 'boardInstalled', [-Math.PI / 2, 0, 0]);
  box(board, 3.9, 4.1, 0.1, 0, 0, 0, 0x116153);
  box(board, 1.8, 0.5, 0.25, -0.82, 1.8, 0.19, 0x95abb3);
  box(board, 0.4, 1.15, 0.45, -1.74, 1.09, 0.21, 0x8398a6);
  box(board, 1.25, 0.58, 0.17, 0.1, -1.25, 0.16, 0x1a292f);
  box(board, 1.0, 0.68, 0.23, 0.6, -0.72, 0.17, 0x647b83);
  instanceBoxes(board, [0.035, 0.52, 0.02], Array.from({ length: 12 }, (_, i) => [0.15 + i * 0.08, -0.72, 0.3]), 0xa8bbc0);
  instanceBoxes(board, [0.23, 0.15, 0.10], Array.from({ length: 7 }, (_, i) => [-1.38 + i * 0.25, 1.15, 0.12]), 0x263238);
  instanceBoxes(board, [0.08, 0.23, 0.07], Array.from({ length: 8 }, (_, i) => [-1.45 + i * 0.19, -1.65, 0.11]), 0xbbad83);
  const traces = [];
  for (let i = 0; i < 8; i += 1) {
    traces.push([-1.45 + i * 0.24, 0.12, 0.068]);
    traces.push([-1.45 + i * 0.24, -0.52, 0.068]);
  }
  instanceBoxes(board, [0.015, 0.66, 0.008], traces, 0x45a488);
  instanceBoxes(board, [1.5, 0.012, 0.008], Array.from({ length: 7 }, (_, i) => [-0.7, -0.3 - i * 0.085, 0.068]), 0x3d9a81);
  // Empty keyed sockets are attached to the motherboard, never to the CPU/RAM.
  box(board, 1.23, 1.07, 0.07, -0.61, 0.7, 0.1, 0x202b31);
  instanceBoxes(board, [0.047, 0.047, 0.018], Array.from({ length: 48 }, (_, i) => [-1.05 + (i % 8) * 0.13, 0.35 + Math.floor(i / 8) * 0.13, 0.15]), 0xb4a26a);
  [0.96, 1.32].forEach(x => box(board, 0.18, 2.03, 0.18, x, 0.42, 0.14, 0x151f29));
  box(board, 2.52, 0.16, 0.22, -0.35, -0.84, 0.16, 0x18232c);
  box(board, 0.19, 0.8, 0.22, 1.73, 0.15, 0.16, 0x18232c);
  box(board, 0.38, 0.2, 0.2, -1.53, 1.69, 0.17, 0x18232c);
  box(board, 0.36, 0.15, 0.19, 1.56, -1.38, 0.17, 0x202b35);

  const retention = group('cpu', scene, false);
  const retentionFrame = group('', retention);
  box(retentionFrame, 1.25, 0.07, 0.07, 0, 0, 0, 0xb6c3c5);
  box(retentionFrame, 1.25, 0.07, 0.07, 0, -1.08, 0, 0xb6c3c5);
  [-0.59, 0.59].forEach(x => box(retentionFrame, 0.07, 1.08, 0.07, x, -0.54, 0, 0xb6c3c5));
  box(retentionFrame, 0.045, 1.3, 0.045, 0.71, -0.43, 0, 0xd0d6d3);
  retention.position.set(-0.61, 5.18, -0.49);

  const cpu = movable('cpu', [-0.61, 4.63, -0.47], [3.82, -0.12, 1.35], 'cpuInstalled', [-Math.PI / 2, 0, 0]);
  box(cpu, 1.0, 0.88, 0.055, 0, 0, 0, 0x667d6d);
  box(cpu, 0.83, 0.72, 0.07, 0, 0, 0.06, 0xc8d1cf, { metalness: 0.72, roughness: 0.4 });
  box(cpu, 0.09, 0.09, 0.01, -0.42, -0.35, 0.04, 0xf8c75c);
  instanceBoxes(cpu, [0.42, 0.015, 0.01], [[0, 0.12, 0.103], [-0.04, 0.06, 0.103], [0.03, -0.02, 0.103]], 0x7d8b8c);

  const paste = group('', cpu);
  const pasteGeo = geometry('paste-sphere', () => new THREE.SphereGeometry(1, 12, 8));
  const pastePea = new THREE.Mesh(pasteGeo, material(0xbfc6cc, { metalness: 0, roughness: 0.92 }));
  pastePea.scale.set(0.13, 0.13, 0.07);
  pastePea.position.z = 0.15;
  paste.add(pastePea);
  const pasteDry = new THREE.Mesh(pasteGeo, material(0x727d85, { metalness: 0, roughness: 1 }));
  pasteDry.scale.set(0.36, 0.3, 0.015);
  pasteDry.position.z = 0.13;
  paste.add(pasteDry);
  const pasteExcess = new THREE.Mesh(pasteGeo, material(0xc6cbd0, { metalness: 0, roughness: 0.9 }));
  pasteExcess.scale.set(0.51, 0.44, 0.08);
  pasteExcess.position.z = 0.16;
  paste.add(pasteExcess);

  const cooler = movable('cooler', [-0.61, 4.63, 0.02], [-4.3, 0.35, 2.75], 'coolerInstalled');
  box(cooler, 1.19, 1.04, 0.14, 0, 0, -0.34, 0xaa6c3c, { metalness: 0.72 });
  instanceBoxes(cooler, [1.25, 0.035, 0.51], Array.from({ length: 19 }, (_, i) => [0, -0.48 + i * 0.054, 0]), 0xa7bbc0);
  box(cooler, 1.39, 1.29, 0.13, 0, 0, 0.31, 0x172b35);
  const fan = group('', cooler);
  cylinder(fan, 0.53, 0.15, 0, 0, 0.4, 0x38545c);
  cylinder(fan, 0.16, 0.18, 0, 0, 0.51, 0x99b8c1);
  const bladeGeo = geometry('fan-blade', () => new THREE.BoxGeometry(0.14, 0.4, 0.03));
  for (let i = 0; i < 7; i += 1) {
    const blade = new THREE.Mesh(bladeGeo, material(0x1bb9b4, { metalness: 0.28 }));
    const angle = i * Math.PI * 2 / 7;
    blade.position.set(Math.sin(angle) * 0.29, Math.cos(angle) * 0.29, 0.51);
    blade.rotation.z = -angle + 0.4;
    fan.add(blade);
  }
  [[-0.78, -0.68], [0.78, -0.68], [-0.78, 0.68], [0.78, 0.68]].forEach(([x, y]) => box(cooler, 0.2, 0.22, 0.08, x, y, -0.27, 0x84949c));

  const ram = movable('ram', [0.96, 4.35, -0.38], [4.3, -0.2, 0.63], 'ramSeated', [0, 0, Math.PI / 2]);
  box(ram, 0.08, 2.0, 0.58, 0, 0, 0, 0x1f7056);
  box(ram, 0.12, 2.04, 0.07, 0, 0, 0.29, 0x8faaa8);
  instanceBoxes(ram, [0.09, 0.21, 0.31], Array.from({ length: 7 }, (_, i) => [0.085, -0.78 + i * 0.25, 0.03]), 0x192b31);
  box(ram, 0.1, 1.7, 0.06, 0, 0, -0.29, 0xc4a969);
  const upperClip = group('ram', scene, false);
  const lowerClip = group('ram', scene, false);
  box(upperClip, 0.23, 0.24, 0.2, 0, 0, 0, 0xc8d0c7);
  box(lowerClip, 0.23, 0.24, 0.2, 0, 0, 0, 0xc8d0c7);

  const gpu = movable('gpu', [-0.6, 2.93, 0.1], [4.72, -0.17, -0.4], 'gpuInstalled', [0, 0, Math.PI]);
  box(gpu, 3.32, 0.11, 1.3, 0, 0, 0, 0x226d57);
  box(gpu, 3.42, 0.44, 1.34, 0, -0.25, 0, 0x203440);
  instanceBoxes(gpu, [0.035, 0.28, 1.2], Array.from({ length: 20 }, (_, i) => [-1.48 + i * 0.15, -0.2, 0]), 0x859ba3);
  [-0.84, 0.77].forEach(x => {
    cylinder(gpu, 0.49, 0.08, x, -0.5, 0, 0x14242e, 'y');
    cylinder(gpu, 0.16, 0.10, x, -0.56, 0, 0x28bfb6, 'y');
  });
  box(gpu, 0.13, 0.73, 1.5, -1.83, -0.14, 0, 0xa6b3b5);
  box(gpu, 0.15, 0.13, 0.39, -1.91, -0.24, 0.2, 0x14242d);
  box(gpu, 0.15, 0.13, 0.39, -1.91, -0.24, -0.35, 0x14242d);
  box(gpu, 0.23, 0.26, 0.38, 1.43, 0.08, 0.3, 0x151f29);
  const pcieLatch = group('gpu', scene, false);
  box(pcieLatch, 0.18, 0.24, 0.25, 0, 0, 0, 0xbed1c6);

  const ssd = movable('ssd', [1.97, 1.83, -0.27], [5.5, -0.14, 1.2], 'originalDriveInstalled', [-Math.PI / 2, 0, 0]);
  box(ssd, 0.91, 1.36, 0.16, 0, 0, 0, 0x141f2b);
  box(ssd, 0.73, 0.82, 0.014, 0, 0.08, 0.09, 0x3a7d88);
  box(ssd, 0.6, 0.06, 0.014, 0, 0.24, 0.105, 0x97d2d1);
  instanceBoxes(ssd, [0.5, 0.018, 0.014], [[0, 0.03, 0.105], [-0.03, -0.05, 0.105], [-0.03, -0.13, 0.105]], 0xa8c5c8);
  box(ssd, 0.25, 0.11, 0.12, -0.22, -0.71, 0, 0xbc9a59);
  box(ssd, 0.4, 0.11, 0.12, 0.16, -0.71, 0, 0xbc9a59);

  const psu = movable('psu', [0.95, 0.58, -0.01], [5.15, 0.2, -2.72], 'psuInstalled');
  box(psu, 2.4, 0.95, 1.78, 0, 0, 0, 0x253642);
  box(psu, 1.7, 0.65, 0.016, 0, 0.05, 0.9, 0x14252f);
  instanceBoxes(psu, [1.4, 0.025, 0.02], Array.from({ length: 8 }, (_, i) => [0, -0.2 + i * 0.07, 0.92]), 0x56737b);
  box(psu, 0.64, 0.16, 0.02, 0, 0.08, 0.94, 0xe1ba65);
  box(psu, 2.36, 0.91, 0.04, 0, 0, -0.9, 0x7a8e96);
  box(psu, 0.45, 0.26, 0.06, -0.57, 0, -0.94, 0x111b23);
  box(psu, 0.17, 0.2, 0.07, -0.14, 0, -0.94, 0x18242a);
  instanceBoxes(psu, [0.67, 0.025, 0.02], Array.from({ length: 7 }, (_, i) => [0.63, -0.23 + i * 0.075, -0.94]), 0x223540);

  const panel = movable('panel', [0, 3.15, 1.54], [-5.2, 2.8, -1.8], 'panelInstalled', [0, -0.25, 0]);
  box(panel, 5.4, 0.18, 0.1, 0, 3.04, 0, 0x3f5565);
  box(panel, 5.4, 0.18, 0.1, 0, -3.04, 0, 0x3f5565);
  [-2.61, 2.61].forEach(x => box(panel, 0.18, 6.1, 0.1, x, 0, 0, 0x3f5565));
  box(panel, 5.1, 5.87, 0.035, 0, 0, 0, 0x3b777d, { transparent: true, opacity: 0.13, depthWrite: false, metalness: 0.1 });
  // This reusable clear teaching panel permits inspection while installed.
  box(panel, 0.22, 0.8, 0.15, -2.35, -0.2, 0.12, 0x9bb0b6);

  const fasteners = {
    panel: { state: 'panelScrews', part: 'panel', points: [[-2.58, 2.6, 0.13], [-2.58, -2.6, 0.13]] },
    board: { state: 'boardScrews', part: 'board', points: [[-1.83, 1.82, 0.15], [1.6, 1.82, 0.15], [-1.83, -1.68, 0.15], [1.6, -1.68, 0.15]] },
    cooler: { state: 'coolerScrews', part: 'cooler', points: [[-0.78, 0.68, -0.14], [0.78, 0.68, -0.14], [-0.78, -0.68, -0.14], [0.78, -0.68, -0.14]] },
    gpu: { state: 'gpuScrews', part: 'gpu', points: [[-1.83, 0.24, -0.43], [-1.83, 0.24, 0.45]] },
    ssd: { state: 'ssdScrews', part: 'ssd', points: [[-0.32, 0.54, 0.13], [0.32, -0.54, 0.13]] },
    psu: { state: 'psuScrews', part: 'psu', points: [[-1.04, 0.34, -0.96], [1.04, 0.34, -0.96], [-1.04, -0.34, -0.96], [1.04, -0.34, -0.96]] }
  };
  let screwIndex = 0;
  for (const [name, set] of Object.entries(fasteners)) {
    set.points.forEach((pos, index) => {
      const screw = group(`${name}-${index}`);
      cylinder(screw, 0.085, 0.06, 0, 0, 0, name === 'panel' ? 0xb3c1c4 : 0xd8d9cc);
      cylinder(screw, 0.035, 0.13, 0, 0, -0.07, 0x8a969b);
      box(screw, 0.105, 0.018, 0.009, 0, 0, 0.034, 0x26323c);
      box(screw, 0.018, 0.105, 0.009, 0, 0, 0.034, 0x26323c);
      const tray = [-3.35 + (screwIndex % 4) * 0.23, -0.25, 2.02 + Math.floor(screwIndex / 4) * 0.23];
      screws.push({ screw, part: set.part, stateKey: set.state, index, pos, tray, rear: name === 'psu' });
      screwIndex += 1;
    });
  }
  box(scene, 1.24, 0.04, 1.38, -2.99, -0.29, 2.5, 0x102632);
  // Original hand tools are decorative; the accessible tool controls run rules.
  const screwdriver = group();
  cylinder(screwdriver, 0.085, 1.1, 5.92, -0.16, -1.85, 0x19c4ad, 'z');
  cylinder(screwdriver, 0.025, 0.7, 5.92, -0.16, -1.0, 0xb3c6ca, 'z');
  box(scene, 0.17, 0.12, 0.59, 4.28, -0.2, -1.93, 0xc0c9ca);
  box(scene, 0.09, 0.09, 0.19, 4.28, -0.2, -1.54, 0x47c8bc);

  lead('atx', 'atxConnected', [[1.5, 0.72, 0.26], [2.28, 1.25, 0.85], [2.31, 3.9, 0.52], [1.75, 4.1, -0.45]], 0x343d47, 0.075, 'boardInstalled');
  lead('eps', 'cpuPowerConnected', [[0.26, 0.74, 0.22], [-2.33, 1.08, 0.4], [-2.25, 5.83, 0.27], [-1.53, 5.64, -0.46]], 0xc6a844, 0.049, 'boardInstalled');
  lead('gpu-power', 'gpuPowerConnected', [[1.28, 0.77, 0.36], [1.8, 1.5, 1.04], [1.45, 2.6, 0.97], [0.84, 3.02, 0.42]], 0x556b76, 0.066, 'gpuInstalled');
  lead('sata-data', 'sataDataConnected', [[1.6, 2.59, -0.45], [2.3, 2.7, 0.75], [2.37, 1.47, 0.61], [1.74, 1.1, -0.17]], 0xf0ab49, 0.036, 'originalDriveInstalled');
  lead('sata-power', 'sataPowerConnected', [[1.57, 0.73, 0.36], [2.4, 0.58, 0.96], [2.43, 1.2, 0.8], [2.12, 1.1, -0.17]], 0x344454, 0.058, 'originalDriveInstalled');
  lead('front-panel', 'frontPanelConnected', [[2.53, 0.24, 0.8], [1.65, 0.45, 0.8], [1.24, 1.52, 0.12], [1.51, 2.3, -0.45]], 0x47bfc1, 0.028, 'boardInstalled');
  lead('cpu-fan', 'cpuFanConnected', [[-0.08, 5.18, 0.31], [0.3, 5.5, 0.58], [0.25, 5.8, 0.1], [-0.1, 5.66, -0.46]], 0x1a242d, 0.027, 'coolerInstalled');

  const selection = new THREE.BoxHelper(new THREE.Object3D(), 0x52f2cc);
  selection.material.depthTest = false;
  selection.material.transparent = true;
  selection.material.opacity = 0.8;
  selection.visible = false;
  scene.add(selection);

  function isVisible(object) {
    for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
    return true;
  }
  function highlight(id) {
    selectedId = typeof id === 'string' ? id : '';
    const known = nodes.get(selectedId);
    const node = known && isVisible(known) ? known : selectables.find(item => item.userData.selectId === selectedId && isVisible(item));
    selection.visible = !!node && isVisible(node);
    if (selection.visible) selection.setFromObject(node);
  }
  function updateModel(nextHardware, nextAssembly) {
    if (stopped) return;
    modelHardware = nextHardware || {};
    modelAssembly = nextAssembly || {};
    for (const node of nodes.values()) {
      if (!node.userData.partKey) continue;
      const fitted = node.userData.partKey === 'panelInstalled' ? !!modelAssembly.panelInstalled : node.userData.partKey === 'psuInstalled' ? modelAssembly.psuInstalled !== false : !!modelHardware[node.userData.partKey];
      node.position.fromArray(fitted ? node.userData.fitted : node.userData.loose);
      node.rotation.set(...(fitted ? [0, 0, 0] : node.userData.looseRotation));
    }
    // Keep retention and clips attached to the socket even when the CPU is out.
    retention.visible = !!modelHardware.boardInstalled;
    retentionFrame.rotation.x = modelAssembly.retentionOpen ? -1.23 : 0;
    upperClip.visible = lowerClip.visible = !!modelHardware.boardInstalled;
    upperClip.position.set(0.96, 5.46, modelAssembly.ramClipsOpen ? -0.24 : -0.45);
    lowerClip.position.set(0.96, 3.26, modelAssembly.ramClipsOpen ? -0.24 : -0.45);
    upperClip.rotation.x = modelAssembly.ramClipsOpen ? -0.75 : 0;
    lowerClip.rotation.x = modelAssembly.ramClipsOpen ? 0.75 : 0;
    pcieLatch.visible = !!modelHardware.boardInstalled;
    pcieLatch.position.set(0.98, 3.08, modelAssembly.pcieLatchOpen ? -0.28 : -0.49);
    pcieLatch.rotation.x = modelAssembly.pcieLatchOpen ? -0.7 : 0;
    paste.visible = !!modelHardware.cpuInstalled && !modelHardware.coolerInstalled;
    pastePea.visible = modelAssembly.paste === 'pea';
    pasteExcess.visible = modelAssembly.paste === 'excess';
    pasteDry.visible = modelAssembly.paste === 'dry';
    fan.rotation.z = modelHardware.pcOn ? 0.3 : 0;
    scene.updateMatrixWorld(true);
    for (const fastener of screws) {
      const fitted = !!modelAssembly[fastener.stateKey]?.[fastener.index];
      const parent = nodes.get(fastener.part);
      if (fitted && parent) {
        const position = new THREE.Vector3(...fastener.pos);
        parent.localToWorld(position);
        fastener.screw.position.copy(position);
        fastener.screw.quaternion.copy(parent.quaternion);
        if (fastener.rear) fastener.screw.rotateY(Math.PI);
      } else {
        fastener.screw.position.fromArray(fastener.tray);
        fastener.screw.rotation.set(-Math.PI / 2, 0, 0);
      }
    }
    for (const lead of cables) {
      const connected = !!(lead.assemblyKey ? modelAssembly[lead.key] : modelHardware[lead.key]) && (['atx', 'eps', 'gpu-power', 'sata-power'].includes(lead.node.userData.selectId) ? modelAssembly.psuInstalled !== false : true);
      const available = !lead.requirePart || !!modelHardware[lead.requirePart];
      lead.node.visible = connected && available;
      lead.loose.visible = !connected || !available;
      if (lead.assemblyKey && !available) lead.loose.visible = false;
    }
    highlight(selectedId);
    requestRender();
  }
  function updateCamera() {
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * distance, target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * Math.cos(pitch) * distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }
  function render() {
    frame = 0;
    if (stopped || paused || doc.hidden || contextLost || !lastWidth || !lastHeight) return;
    updateCamera();
    renderer.render(scene, camera);
  }
  function requestRender() {
    if (!frame && !stopped && !paused && !doc.hidden && !contextLost) frame = view.requestAnimationFrame(render);
  }
  function resize() {
    if (stopped) return;
    const bounds = host.getBoundingClientRect();
    const width = Math.round(bounds.width);
    const height = Math.round(bounds.height);
    if (!width || !height) {
      lastWidth = lastHeight = 0;
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (width === lastWidth && height === lastHeight) return;
    lastWidth = width;
    lastHeight = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // At most ~900k framebuffer pixels, even on high-DPI tablets.
    const ratio = Math.min(1.5, Math.max(1, view.devicePixelRatio || 1), Math.sqrt(900000 / (width * height)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    const nextFittedDistance = Math.max(15, 16.4 / camera.aspect);
    distance *= nextFittedDistance / fittedDistance;
    fittedDistance = nextFittedDistance;
    distance = Math.max(7, Math.min(40, distance));
    requestRender();
  }
  function selectedAt(event) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return '';
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    updateCamera();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(selectables, true).filter(hit => isVisible(hit.object));
    for (const hit of hits) {
      for (let node = hit.object; node && node !== scene; node = node.parent) if (node.userData.selectId) return node.userData.selectId;
    }
    return '';
  }
  function releaseGesture() {
    const previous = gesture;
    gesture = null;
    if (previous && canvas.hasPointerCapture?.(previous.id)) canvas.releasePointerCapture(previous.id);
    canvas.style.cursor = 'grab';
  }
  function down(event) {
    if (paused || contextLost || event.button !== 0 || gesture) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch, orbit: false, touch: event.pointerType !== 'mouse' };
  }
  function move(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.orbit && Math.hypot(dx, dy) > 7) {
      // Leave predominantly vertical touch movement to normal page scrolling.
      if (gesture.touch && Math.abs(dx) <= Math.abs(dy) * 1.15) return;
      gesture.orbit = true;
      canvas.setPointerCapture?.(event.pointerId);
      canvas.style.cursor = 'grabbing';
    }
    if (!gesture.orbit) return;
    yaw = gesture.yaw - dx * 0.008;
    pitch = Math.max(-0.15, Math.min(1.35, gesture.pitch + dy * 0.005));
    requestRender();
  }
  function up(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const tap = !gesture.orbit && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 8;
    releaseGesture();
    if (tap) {
      const id = selectedAt(event);
      if (id) {
        highlight(id);
        requestRender();
        onSelect(id);
      }
    }
  }
  function lost() { releaseGesture(); }
  function outsideUp(event) {
    if (gesture && event.pointerId === gesture.id && event.target !== canvas) releaseGesture();
  }
  function leave() {
    if (gesture && !gesture.orbit) releaseGesture();
  }
  function loss(event) {
    event.preventDefault();
    contextLost = true;
    releaseGesture();
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    onStatus({ kind: 'context-lost', message: 'The device paused 3D graphics. Your work is preserved; continue with the labeled assembly tools.' });
  }
  function restored() {
    contextLost = false;
    onStatus({ kind: 'context-restored', message: '3D graphics restored. Your existing assembly state is unchanged.' });
    resize();
    requestRender();
  }
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', lost);
  canvas.addEventListener('lostpointercapture', lost);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('webglcontextlost', loss);
  canvas.addEventListener('webglcontextrestored', restored);
  view.addEventListener('blur', lost);
  doc.addEventListener('pointerup', outsideUp);
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : null;
  observer?.observe(host);
  if (!observer) view.addEventListener('resize', resize);

  function pause() {
    paused = true;
    releaseGesture();
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
  }
  function resume() {
    if (stopped) return;
    paused = false;
    resize();
    requestRender();
  }
  function visibility() {
    if (doc.hidden) {
      releaseGesture();
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
    } else if (!paused) {
      resize();
      requestRender();
    }
  }
  doc.addEventListener('visibilitychange', visibility);

  function setView(name) {
    const presets = { iso: [0.52, 0.33], side: [0, 0.02], front: [1.29, 0.15], top: [0.24, 1.31], rear: [Math.PI, 0.08] };
    if (!Object.hasOwn(presets, name)) return;
    [yaw, pitch] = presets[name];
    releaseGesture();
    requestRender();
  }
  function resetView() {
    distance = fittedDistance;
    setView('iso');
  }
  function zoom(direction) {
    if (!['in', 'out'].includes(direction)) return;
    distance = Math.max(7, Math.min(40, distance * (direction === 'in' ? 0.84 : 1.19)));
    requestRender();
  }
  function dispose() {
    if (stopped) return;
    stopped = true;
    pause();
    observer?.disconnect();
    view.removeEventListener('resize', resize);
    view.removeEventListener('blur', lost);
    doc.removeEventListener('visibilitychange', visibility);
    doc.removeEventListener('pointerup', outsideUp);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', lost);
    canvas.removeEventListener('lostpointercapture', lost);
    canvas.removeEventListener('pointerleave', leave);
    canvas.removeEventListener('webglcontextlost', loss);
    canvas.removeEventListener('webglcontextrestored', restored);
    for (const geo of geometries.values()) geo.dispose();
    for (const mat of materials.values()) mat.dispose();
    for (const item of disposals) item.dispose();
    selection.geometry.dispose();
    selection.material.dispose();
    renderer.dispose();
    canvas.remove();
    scene.clear();
    geometries.clear();
    materials.clear();
    nodes.clear();
    selectables.length = 0;
  }
  updateModel(hardware, assembly);
  resize();
  onStatus({ kind: 'ready', message: '3D view ready. Tap a part to select it. Drag sideways to rotate, or use the camera buttons.' });
  return { update: updateModel, select: id => { highlight(id); requestRender(); }, resetView, setView, zoom, pause, resume, dispose };
}
