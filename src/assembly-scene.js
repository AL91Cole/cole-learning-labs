import * as THREE from './three.module.js?release=20261017-realism16';
import { assemblyToolAction, assemblyDropAction, assembledPartFitted } from './assembly-tools.js?release=20261017-realism16';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from './assembly-cables.js?release=20261017-realism16';

/**
 * Original, procedural 3D hardware lab & workstation artwork.
 * This module is a view adapter only: authored mechanical rules and student work
 * remain outside the scene graph. No external textures, remote assets, physics
 * engine, or continuous animation loop.
 */
export function mountAssemblyScene(host, { hardware = {}, assembly = {}, onSelect = () => {}, onStatus = () => {}, onAction = () => {}, onInteraction = () => {} } = {}) {
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
  canvas.setAttribute('aria-label', 'Interactive 3D classroom workstation and monitor bench. Labeled component and camera buttons provide the same actions without dragging.');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  // Vertical gestures can scroll the page; horizontal gestures rotate equipment.
  canvas.style.touchAction = 'pan-y';
  canvas.style.userSelect = 'none';
  renderer.setClearColor(0x091521, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setPixelRatio(1);
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const target = new THREE.Vector3(-0.45, 2.65, 0);
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
  let distance = 16.5;
  let fittedDistance = 16.5;
  let cameraFraming = 'bench';
  let framingReference = 16.5;
  let focusDiameter = 0;
  let gesture = null;
  let selectedId = '';
  let modelHardware = hardware;
  let modelAssembly = assembly;
  let tool = 'inspect';
  let pasteAmount = 'pea';
  let drag = null;
  let cableDrag = null;
  let selectedCable = 'ac';
  let armedCable = '';
  let dispatchVersion = 0;

  const steel = { color: 0x34383e, roughness: 0.48, metalness: 0.66, bevel: true };
  const aluminum = { color: 0xb0b3b6, roughness: 0.34, metalness: 0.82 };
  const rubber = { color: 0x191d21, roughness: 0.85, metalness: 0.02 };
  const finishes = new Map([
    ...[0x566774,0x455664,0x283644,0x223544,0x6f8794,0x3b5060,0x1e2e3a].map(color=>[color,steel]),
    ...[0xa2b8c2,0x8ea4b2,0x728a94,0xb8ccd2,0xc8d6da,0xd4dde0].map(color=>[color,aluminum]),
    ...[0x22d1c6,0x28bfb6,0x2e4954,0x162834,0x17202c,0x38495b].map(color=>[color,rubber]),
    [0x2c3b48,{color:0x242a30,roughness:0.61,metalness:0.55}],
    [0x0e584a,{color:0x173a2d,roughness:0.72,metalness:0.04}],
    [0x4cc49e,{color:0x96784e,roughness:0.52,metalness:0.65}],
    [0x42b592,{color:0x786746,roughness:0.55,metalness:0.55}],
    [0xa8c6cf,{color:0x454b50,roughness:0.57,metalness:0.32}]
  ]);
  function material(color, options = {}) {
    const finish=finishes.get(color);
    const resolved={color,roughness:0.68,metalness:0.18,...options,...finish};
    delete resolved.bevel;
    const key = JSON.stringify(resolved);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial(resolved));
    return materials.get(key);
  }
  function geometry(key, build) {
    if (!geometries.has(key)) geometries.set(key, build());
    return geometries.get(key);
  }
  function box(parent, width, height, depth, x, y, z, color, options = {}) {
    const beveled=finishes.get(color)?.bevel&&Math.min(width,height,depth)>.06;
    const geo=geometry(`${beveled?'bevel':'b'}:${width}:${height}:${depth}`,()=>{
      if(!beveled)return new THREE.BoxGeometry(width,height,depth);
      const bevel=Math.min(.035,Math.min(width,height,depth)/4),shape=new THREE.Shape();
      const w=width/2-bevel,h=height/2-bevel;
      shape.moveTo(-w,-h);shape.lineTo(w,-h);shape.lineTo(w,h);shape.lineTo(-w,h);shape.closePath();
      return new THREE.ExtrudeGeometry(shape,{depth:depth-2*bevel,steps:1,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:1}).translate(0,0,-depth/2+bevel);
    });
    const mesh = new THREE.Mesh(geo, material(color, options));
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
  function instanceBoxes(parent, size, positions, color, options = {}) {
    const geo = geometry(`b:${size.join(':')}`, () => new THREE.BoxGeometry(...size));
    const mesh = new THREE.InstancedMesh(geo, material(color, options), positions.length);
    const transform = new THREE.Object3D();
    positions.forEach((pos, index) => {
      transform.position.set(pos[0], pos[1], pos[2]);
      transform.rotation.set(pos[3] || 0, pos[4] || 0, pos[5] || 0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
    return mesh;
  }
  function mergedGeometry(key,pieces){
    return geometry(key,()=>{
      const position=[],normal=[];
      for(const [base,transform] of pieces){
        const part=base.index?base.toNonIndexed():base.clone();
        if(transform)part.applyMatrix4(transform);
        position.push(...part.attributes.position.array);normal.push(...part.attributes.normal.array);part.dispose();base.dispose();
      }
      const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.Float32BufferAttribute(position,3));merged.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));return merged;
    });
  }
  function mergedBoxes(parent,key,size,positions,color,options={}){
    if(geometries.has(key)){const mesh=new THREE.Mesh(geometries.get(key),material(color,options));parent.add(mesh);return mesh;}
    const pieces=positions.map(([x,y,z,rx=0,ry=0,rz=0])=>{const t=new THREE.Object3D();t.position.set(x,y,z);t.rotation.set(rx,ry,rz);t.updateMatrix();return[new THREE.BoxGeometry(...size),t.matrix];});
    const mesh=new THREE.Mesh(mergedGeometry(key,pieces),material(color,options));parent.add(mesh);return mesh;
  }
  function silkScreen(parent,labels){
    const font={A:['01110','10001','10001','11111','10001','10001','10001'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],I:['11111','00100','00100','00100','00100','00100','11111'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','11001','10101','10011','10011','10001'],P:['11110','10001','10001','11110','10000','10000','10000'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],W:['10001','10001','10001','10101','10101','11011','10001'],X:['10001','10001','01010','00100','01010','10001','10001'],'0':['01110','10011','10101','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'6':['01110','10000','10000','11110','10001','10001','01110'],'_':['00000','00000','00000','00000','00000','00000','11111']};
    const vertices=[];
    for(const {text,x,y,z=.067,size=.012} of labels){
      [...text].forEach((letter,i)=>{const rows=font[letter];if(!rows)return;rows.forEach((row,line)=>{let column=0;while(column<5){if(row[column]!=='1'){column++;continue;}const start=column;while(column<5&&row[column]==='1')column++;const l=x+(i*6+start)*size,r=x+(i*6+column)*size,b=y+(6-line)*size,t=b+size*.86;vertices.push(l,b,z,r,b,z,r,t,z,l,b,z,r,t,z,l,t,z);}});});
    }
    const geo=geometry('board-silkscreen',()=>new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)));
    const mat=new THREE.MeshBasicMaterial({color:0xd5dacb,side:THREE.FrontSide});disposals.push(mat);
    const mesh=new THREE.Mesh(geo,mat);mesh.userData.detail='board-silkscreen';parent.add(mesh);
  }
  function capacitorBank(parent,positions){
    const geo=geometry('capacitor',()=>new THREE.CylinderGeometry(.055,.055,.15,8).rotateX(Math.PI/2));
    const mesh=new THREE.InstancedMesh(geo,material(0xb8ccd2),positions.length),t=new THREE.Object3D();
    positions.forEach((p,i)=>{t.position.set(...p);t.updateMatrix();mesh.setMatrixAt(i,t.matrix);});mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);
  }
  function cableGeometry(points, radius) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    return geometry(`lead:${radius}:${points.flat().join(':')}`, () => new THREE.TubeGeometry(curve, 16, radius, 5, false));
  }
  function sleeving(points,radius){
    const key=`sleeve:${radius}:${points.flat().join(':')}`;
    if(geometries.has(key))return geometries.get(key);
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const strands=[0,Math.PI].map(phase=>{
      const route=Array.from({length:19},(_,i)=>{const t=i/18,p=curve.getPoint(t),a=t*Math.PI*10+phase;p.x+=Math.cos(a)*radius*.75;p.z+=Math.sin(a)*radius*.75;return p;});
      return[new THREE.TubeGeometry(new THREE.CatmullRomCurve3(route),12,Math.max(.006,radius*.17),4,false)];
    });
    return mergedGeometry(key,strands);
  }
  function lead(id, key, points, color, width = 0.045, requirePart = '') {
    const node = group(id);
    const wireColor=id==='sata-data'?0x8f3f33:0x25292e;
    const mesh = new THREE.Mesh(cableGeometry(points, width), material(wireColor, { roughness: 0.87, metalness: 0.03 }));
    node.add(mesh);
    const end = points.at(-1);
    box(node, width * 4, width * 3, width * 3, ...end, 0x17202c, { roughness: 0.5, metalness: 0.2 });
    // A connected and a visibly loose cable are separate render states.
    const loose = group(id, scene, false);
    const start = points[0];
    const loosePoints = [start, [start[0] + 0.5, 0.55, 0.7], [start[0] + 0.55, 0.22, 1.15]];
    loose.add(new THREE.Mesh(cableGeometry(loosePoints, width), material(wireColor, { roughness: 0.87, metalness: 0.03 })));
    box(loose, width * 4, width * 3, width * 3, ...loosePoints.at(-1), 0x38495b, { roughness: 0.5, metalness: 0.2 });
    const braid=new THREE.Mesh(sleeving(points,width),material(0x62676c,{roughness:.95,metalness:0}));braid.userData.flexibleLead=true;node.add(braid);
    const looseBraid=new THREE.Mesh(sleeving(loosePoints,width),material(0x62676c,{roughness:.95,metalness:0}));looseBraid.userData.flexibleLead=true;loose.add(looseBraid);
    cables.push({ node, loose, key, requirePart, start: points[0], width, looseBraid, assemblyKey: key === 'cpuFanConnected' });
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

  // Multi-point studio + warm classroom tech-lab lighting
  scene.add(new THREE.HemisphereLight(0xe8edf3, 0x202329, 1.65));
  const keyLight = new THREE.DirectionalLight(0xfff6e8, 2.6);
  keyLight.position.set(-5, 11, 9);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xdce7f0, 0.9);
  fillLight.position.set(8, 7, 6);
  scene.add(fillLight);
  const rim = new THREE.DirectionalLight(0xc3d0db, 0.85);
  rim.position.set(4, 6, -7);
  scene.add(rim);

  // Realistic Tech Lab Workbench, Backboard, ESD Mat & Staging Trays
  const labBench = group();
  // Wood-trimmed dark composite workbench top & front bevel
  box(labBench, 19.2, 0.24, 10.2, -0.4, -0.48, 0.1, 0x1e2f3d, { roughness: 0.72, metalness: 0.12 });
  box(labBench, 19.24, 0.09, 0.18, -0.4, -0.39, 5.18, 0x8b6b4a, { roughness: 0.65, metalness: 0.08 });
  // Subtle lab backboard wall and overhead LED task light bar
  const backboard = box(labBench, 19.2, 8.6, 0.16, -0.4, 3.7, -4.85, 0x0f1e2c, { roughness: 0.88, metalness: 0.1 });
  box(labBench, 11.5, 0.14, 0.45, -0.4, 7.65, -4.4, 0x2c4255, { roughness: 0.4, metalness: 0.6 });
  box(labBench, 10.8, 0.05, 0.22, -0.4, 7.57, -4.4, 0xdff9ff, { emissive: 0x8be9ff, emissiveIntensity: 0.85, roughness: 0.2 });
  // Grounded anti-static ESD mat with snap button & parts staging mat
  box(labBench, 7.8, 0.03, 5.1, 0, -0.34, 0.15, 0x0b4440, { roughness: 0.82, metalness: 0.05 });
  cylinder(labBench, 0.11, 0.04, -3.55, -0.31, 2.35, 0xe8c44a, 'y', { metalness: 0.75, roughness: 0.3 });
  box(labBench, 3.7, 0.04, 4.5, 5.05, -0.32, 0.05, 0x152634, { roughness: 0.76, metalness: 0.15 });
  // A separate ESD foam staging pad keeps the loose board in front of, rather
  // than underneath, the monitor and above the bare worktop.
  box(labBench, 3.98, 0.12, 4.18, -5.8, -0.28, 3, 0x123d3a, { roughness: 0.94, metalness: 0.02 });

  const lines = [];
  for (let i = -7; i <= 7; i += 1) lines.push(i * 0.5, -0.32, -2.2, i * 0.5, -0.32, 2.5);
  for (let i = -4; i <= 5; i += 1) lines.push(-3.5, -0.32, i * 0.5, 3.5, -0.32, i * 0.5);
  const gridGeo = geometry('mat-grid', () => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)));
  const gridMat = new THREE.LineBasicMaterial({ color: 0x2a6d66, transparent: true, opacity: 0.6 });
  disposals.push(gridMat);
  scene.add(new THREE.LineSegments(gridGeo, gridMat));

  // 3D Classroom Monitor on the left side of the bench (selectable as 'display')
  const monitor = group('display');
  monitor.position.set(-5.35, 0, -0.25);
  monitor.rotation.y = 0.28;
  // Monitor base, neck, and sleek bezel
  box(monitor, 2.1, 0.1, 1.35, 0, -0.28, 0.1, 0x263544, { metalness: 0.55, roughness: 0.42 });
  box(monitor, 0.34, 1.75, 0.22, 0, 0.6, -0.22, 0x324556, { metalness: 0.6, roughness: 0.38 });
  box(monitor, 4.35, 2.72, 0.18, 0, 2.45, 0, 0x1b2836, { metalness: 0.45, roughness: 0.48 });
  box(monitor, 4.12, 2.46, 0.04, 0, 2.47, 0.09, 0x08111b, { roughness: 0.28, metalness: 0.15 });
  // Monitor rear input block (HDMI & DisplayPort sockets)
  box(monitor, 0.95, 0.42, 0.14, 0.55, 1.52, -0.12, 0x101a24, { roughness: 0.6, metalness: 0.3 });
  // Screen states: Desktop ready, Lesson Document open, and No-Signal OSD
  const screenDesktop = box(monitor, 4.04, 2.38, 0.02, 0, 2.47, 0.11, 0x0f4c5c, { emissive: 0x0d5c68, emissiveIntensity: 0.55, roughness: 0.22 });
  // Taskbar on desktop
  box(screenDesktop, 4.02, 0.2, 0.01, 0, -1.08, 0.015, 0x071e29, { roughness: 0.4 });
  // Lesson_Practice_File.docx window on the 3D monitor
  const screenDoc = group('display', screenDesktop, false);
  box(screenDoc, 2.65, 1.58, 0.015, 0.12, 0.08, 0.02, 0xf2f7fa, { emissive: 0xd8eef5, emissiveIntensity: 0.32, roughness: 0.3 });
  box(screenDoc, 2.65, 0.24, 0.018, 0.12, 0.75, 0.025, 0x007f78, { emissive: 0x005954, emissiveIntensity: 0.35 });
  instanceBoxes(screenDoc, [1.85, 0.07, 0.01], [
    [0.02, 0.42, 0.03], [0.02, 0.22, 0.03], [0.02, 0.02, 0.03], [-0.18, -0.18, 0.03], [0.02, -0.38, 0.03]
  ], 0x3b5568);
  // Standby / No Signal OSD card
  const screenNoSignal = group('display', monitor, false);
  box(screenNoSignal, 1.75, 0.72, 0.02, 0, 2.47, 0.12, 0x1b2d3e, { emissive: 0x20384c, emissiveIntensity: 0.4 });
  box(screenNoSignal, 1.45, 0.12, 0.025, 0, 2.55, 0.13, 0xf0ab49, { emissive: 0xd98a2b, emissiveIntensity: 0.65 });
  const monitorLed = box(monitor, 0.12, 0.05, 0.04, 1.85, 1.16, 0.1, 0x28d7be, { emissive: 0x28d7be, emissiveIntensity: 0.8 });

  // External HDMI Display Cable (routes from GPU or Motherboard to Monitor)
  const hdmiGpuToMonitor = new THREE.Mesh(
    cableGeometry([[-2.55, 2.68, -0.05], [-3.25, 1.15, -0.65], [-4.15, 0.65, -0.55], [-4.85, 1.52, -0.25]], 0.052),
    material(0x1f2d3a, { roughness: 0.75, metalness: 0.15 })
  );
  hdmiGpuToMonitor.userData.selectId = 'display';
  selectables.push(hdmiGpuToMonitor);
  scene.add(hdmiGpuToMonitor);

  const hdmiBoardToMonitor = new THREE.Mesh(
    cableGeometry([[-2.55, 5.02, -0.55], [-3.35, 3.1, -0.75], [-4.15, 1.1, -0.6], [-4.85, 1.52, -0.25]], 0.052),
    material(0x283848, { roughness: 0.75, metalness: 0.15 })
  );
  hdmiBoardToMonitor.userData.selectId = 'display';
  selectables.push(hdmiBoardToMonitor);
  scene.add(hdmiBoardToMonitor);

  const hdmiLooseMonitor = new THREE.Mesh(
    cableGeometry([[-2.55, 2.68, -0.05], [-3.35, 0.65, -0.45], [-4.2, -0.18, 0.35], [-4.55, -0.24, 0.85]], 0.052),
    material(0x3a4d5e, { roughness: 0.78, metalness: 0.12 })
  );
  hdmiLooseMonitor.userData.selectId = 'display';
  selectables.push(hdmiLooseMonitor);
  scene.add(hdmiLooseMonitor);

  // PC Workstation Chassis (Brushed steel frame, PSU shroud, vents, front I/O)
  const chassis = group();
  // Motherboard tray & backplate
  box(chassis, 5.4, 4.68, 0.12, 0, 3.92, -1.02, 0x2c3b48, { metalness: 0.55, roughness: 0.46 });
  // Top, bottom, rear, and front structural panels
  box(chassis, 5.58, 0.16, 2.68, 0, 6.3, 0.22, 0x566774, { metalness: 0.58, roughness: 0.38 });
  box(chassis, 5.58, 0.18, 2.68, 0, 0, 0.22, 0x455664, { metalness: 0.58, roughness: 0.42 });
  box(chassis, 0.16, 6.2, 2.52, -2.7, 3.1, 0.22, 0x283644, { metalness: 0.52, roughness: 0.48 });
  box(chassis, 0.2, 6.2, 2.52, 2.7, 3.1, 0.22, 0x223544, { metalness: 0.52, roughness: 0.45 });
  // PSU shroud divider bar with cable pass-through
  box(chassis, 3.62, 0.08, 2.38, -0.8, 1.18, 0.18, 0x1d2b36, { metalness: 0.48, roughness: 0.52 });
  // The SSD cable opening stays physically open rather than hiding the sockets
  // beneath a solid shroud. It is a fixed teaching-case cutout.
  box(chassis, 1.65, 0.08, 0.15, 1.8, 1.18, -0.94, 0x1d2b36, { metalness: 0.48, roughness: 0.52 });
  box(chassis, 1.65, 0.08, 0.15, 1.8, 1.18, 1.3, 0x1d2b36, { metalness: 0.48, roughness: 0.52 });
  // Front airflow grille and rear exhaust cut-outs
  instanceBoxes(chassis, [0.21, 0.07, 1.85], Array.from({ length: 18 }, (_, i) => [2.805, 1.7 + i * 0.2, 0.2]), 0x0b1620, { roughness: 0.7 });
  instanceBoxes(chassis, [0.16, 0.07, 1.9], Array.from({ length: 8 }, (_, i) => [-2.8, 1.5 + i * 0.18, 0.2]), 0x0b1620, { roughness: 0.7 });
  // Front & rear vertical corner pillars
  box(chassis, 0.14, 6.2, 0.14, -2.67, 3.1, 1.5, 0x6f8794, { metalness: 0.62, roughness: 0.35 });
  box(chassis, 0.14, 6.2, 0.14, 2.67, 3.1, 1.5, 0x6f8794, { metalness: 0.62, roughness: 0.35 });
  // Rubberized case feet
  [-2.1, 2.1].forEach(x => [-0.55, 1].forEach(z => box(chassis, 0.52, 0.2, 0.52, x, -0.15, z, 0x0a1017, { roughness: 0.9 })));
  // Illuminated front power button LED
  const powerLed = box(chassis, 0.22, 0.22, 0.15, 2.83, 5.85, 0.7, 0x1dd8bd, { emissive: 0x1dd8bd, emissiveIntensity: 0.75, roughness: 0.25 });
  // Brass motherboard standoffs
  [[-1.83, 5.75], [1.6, 5.75], [-1.83, 2.25], [1.6, 2.25]].forEach(([x, y]) => cylinder(chassis, 0.095, 0.27, x, y, -0.79, 0xc7a34f, 'z', { metalness: 0.82, roughness: 0.28 }));

  // Motherboard (Micro-ATX PCB, VRM heatsinks, I/O shroud, chipset, traces, sockets)
  const board = movable('board', [0, 3.93, -0.76], [-5.8, -0.16, 3], 'boardInstalled', [-Math.PI / 2, 0, 0]);
  box(board, 3.9, 4.1, 0.1, 0, 0, 0, 0x0e584a, { roughness: 0.52, metalness: 0.18 });
  // Top VRM heatsink & rear I/O shield shroud
  box(board, 1.82, 0.5, 0.28, -0.82, 1.8, 0.19, 0xa2b8c2, { metalness: 0.76, roughness: 0.28 });
  box(board, 0.42, 1.18, 0.48, -1.74, 1.09, 0.21, 0x8ea4b2, { metalness: 0.74, roughness: 0.3 });
  // Chipset heatsinks. This authored SATA board has no M.2 socket.
  box(board, 1.25, 0.58, 0.17, 0.1, -1.25, 0.16, 0x1c2d36, { metalness: 0.55, roughness: 0.4 });
  box(board, 1.0, 0.68, 0.24, 0.6, -0.72, 0.17, 0x728a94, { metalness: 0.72, roughness: 0.32 });
  // Brushed heatsink fins, VRM chokes & solid capacitors
  instanceBoxes(board, [0.035, 0.52, 0.025], Array.from({ length: 12 }, (_, i) => [0.15 + i * 0.08, -0.72, 0.3]), 0xb8ccd2, { metalness: 0.8, roughness: 0.25 });
  instanceBoxes(board, [0.23, 0.15, 0.12], Array.from({ length: 7 }, (_, i) => [-1.38 + i * 0.25, 1.15, 0.12]), 0x2a3740, { metalness: 0.5, roughness: 0.45 });
  instanceBoxes(board, [0.08, 0.23, 0.08], Array.from({ length: 8 }, (_, i) => [-1.45 + i * 0.19, -1.65, 0.11]), 0xd2be82, { metalness: 0.7, roughness: 0.3 });
  // CMOS coin-cell battery
  cylinder(board, 0.21, 0.05, -1.15, -0.28, 0.08, 0xd8e2e6, 'z', { metalness: 0.88, roughness: 0.18 });
  const traces = [];
  for (let i = 0; i < 8; i += 1) {
    traces.push([-1.45 + i * 0.24, 0.12, 0.068]);
    traces.push([-1.45 + i * 0.24, -0.52, 0.068]);
  }
  instanceBoxes(board, [0.016, 0.66, 0.008], traces, 0x4cc49e, { metalness: 0.65, roughness: 0.35 });
  instanceBoxes(board, [1.5, 0.014, 0.008], Array.from({ length: 7 }, (_, i) => [-0.7, -0.3 - i * 0.085, 0.068]), 0x42b592, { metalness: 0.65, roughness: 0.35 });
  // Empty keyed sockets attached to the motherboard
  box(board, 1.23, 1.07, 0.07, -0.61, 0.7, 0.1, 0x1e2930, { roughness: 0.6 });
  instanceBoxes(board, [0.047, 0.047, 0.018], Array.from({ length: 48 }, (_, i) => [-1.05 + (i % 8) * 0.13, 0.35 + Math.floor(i / 8) * 0.13, 0.15]), 0xd4b663, { metalness: 0.85, roughness: 0.25 });
  // Dual DDR4 DIMM slots, steel-reinforced PCIe x16 slot, ATX 24-pin, EPS 8-pin, SATA headers
  [0.96, 1.32].forEach(x => box(board, 0.18, 2.03, 0.18, x, 0.42, 0.14, 0x15202b));
  box(board, 2.52, 0.17, 0.22, -0.35, -0.84, 0.16, 0x8a9da8, { metalness: 0.72, roughness: 0.32 });
  box(board, 0.2, 0.82, 0.22, 1.73, 0.15, 0.16, 0x16222c);
  box(board, 0.38, 0.2, 0.2, -1.53, 1.69, 0.17, 0x16222c);
  box(board, 0.36, 0.15, 0.19, 1.56, -1.38, 0.17, 0x202b35);
  silkScreen(board,[{text:'CLL_MATX',x:-1.65,y:-1.96},{text:'CPU',x:-1.28,y:1.29},{text:'DDR4',x:.9,y:1.56},{text:'ATX_PWR',x:1.15,y:-.53},{text:'CPU_PWR',x:-1.78,y:1.43},{text:'PCIEX16',x:-1.48,y:-1.11},{text:'SATA_1',x:1.05,y:-1.76},{text:'F_PANEL',x:.5,y:-1.94},{text:'CPU_FAN',x:-.27,y:1.51}]);
  capacitorBank(board,[[-1.42,.98,.18],[-1.23,.98,.18],[-1.04,.98,.18],[-.85,.98,.18],[-1.58,-1.15,.18],[-1.36,-1.15,.18],[-1.6,-1.43,.18],[-1.38,-1.43,.18]]);
  instanceBoxes(board,[.11,.055,.04],Array.from({length:28},(_,i)=>[-1.58+(i%7)*.2,-.08-Math.floor(i/7)*.19,.088]),0x22282b,{roughness:.85,metalness:.05});
  instanceBoxes(board,[.055,.022,.02],Array.from({length:24},(_,i)=>[-1.71+(i%8)*.15,-1.72-Math.floor(i/8)*.07,.08]),0xb3a17a,{roughness:.7,metalness:.25});

  // CPU Socket Retention Frame & Lever
  const retention = group('cpu', scene, false);
  const retentionFrame = group('', retention);
  box(retentionFrame, 1.25, 0.07, 0.07, 0, 0, 0, 0xc8d6da, { metalness: 0.82, roughness: 0.24 });
  box(retentionFrame, 1.25, 0.07, 0.07, 0, -1.08, 0, 0xc8d6da, { metalness: 0.82, roughness: 0.24 });
  [-0.59, 0.59].forEach(x => box(retentionFrame, 0.07, 1.08, 0.07, x, -0.54, 0, 0xc8d6da, { metalness: 0.82, roughness: 0.24 }));
  box(retentionFrame, 0.045, 1.3, 0.045, 0.71, -0.43, 0, 0xdce4e6, { metalness: 0.85, roughness: 0.2 });
  retention.position.set(-0.61, 5.18, -0.49);

  // Processor (LGA package + nickel-plated heatspreader + gold triangle)
  const cpu = movable('cpu', [-0.61, 4.63, -0.47], [3.82, -0.12, 1.35], 'cpuInstalled', [-Math.PI / 2, 0, 0]);
  box(cpu, 1.0, 0.88, 0.055, 0, 0, 0, 0x296e5c, { roughness: 0.48, metalness: 0.22 });
  box(cpu, 0.84, 0.73, 0.072, 0, 0, 0.06, 0xd4dde0, { metalness: 0.82, roughness: 0.22 });
  box(cpu, 0.095, 0.095, 0.012, -0.42, -0.35, 0.04, 0xf8c954, { metalness: 0.88, roughness: 0.2 });
  instanceBoxes(cpu, [0.42, 0.015, 0.01], [[0, 0.12, 0.103], [-0.04, 0.06, 0.103], [0.03, -0.02, 0.103]], 0x7d8b8c);

  // Thermal interface paste states
  const paste = group('', cpu);
  const pasteGeo = geometry('paste-sphere', () => new THREE.SphereGeometry(1, 12, 8));
  const pastePea = new THREE.Mesh(pasteGeo, material(0xc5cdd4, { metalness: 0.05, roughness: 0.85 }));
  pastePea.scale.set(0.13, 0.13, 0.07);
  pastePea.position.z = 0.15;
  paste.add(pastePea);
  const pasteDry = new THREE.Mesh(pasteGeo, material(0x6e7982, { metalness: 0, roughness: 1 }));
  pasteDry.scale.set(0.36, 0.3, 0.015);
  pasteDry.position.z = 0.13;
  paste.add(pasteDry);
  const pasteExcess = new THREE.Mesh(pasteGeo, material(0xcad0d6, { metalness: 0.05, roughness: 0.85 }));
  pasteExcess.scale.set(0.51, 0.44, 0.08);
  pasteExcess.position.z = 0.16;
  paste.add(pasteExcess);

  // Tower CPU Cooler (Copper coldplate, 4 copper heatpipes, aluminum fin stack, 7-blade PWM fan)
  const cooler = movable('cooler', [-0.61, 4.63, 0.02], [-1.4, 0.35, 3.6], 'coolerInstalled');
  box(cooler, 1.19, 1.04, 0.14, 0, 0, -0.34, 0xc87842, { metalness: 0.84, roughness: 0.25 });
  // 4 Copper heatpipes running through the fin stack
  instanceBoxes(cooler, [0.075, 1.18, 0.56], [[-0.38, 0, -0.02], [-0.13, 0, -0.02], [0.13, 0, -0.02], [0.38, 0, -0.02]], 0xd4834a, { metalness: 0.86, roughness: 0.22 });
  instanceBoxes(cooler, [1.26, 0.032, 0.52], Array.from({ length: 19 }, (_, i) => [0, -0.48 + i * 0.054, 0]), 0xb8ccd2, { metalness: 0.78, roughness: 0.26 });
  box(cooler, 1.39, 1.29, 0.14, 0, 0, 0.31, 0x162834, { roughness: 0.5, metalness: 0.25 });
  const fan = group('', cooler);
  cylinder(fan, 0.54, 0.15, 0, 0, 0.4, 0x2e4954, 'z', { roughness: 0.45, metalness: 0.35 });
  cylinder(fan, 0.17, 0.19, 0, 0, 0.51, 0xa8c6cf, 'z', { metalness: 0.75, roughness: 0.25 });
  mergedBoxes(fan,'cooler-fan-blades',[.14,.4,.035],Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7;return[Math.sin(a)*.29,Math.cos(a)*.29,.51,0,0,-a+.4];}),0x22d1c6);
  [[-0.78, -0.68], [0.78, -0.68], [-0.78, 0.68], [0.78, 0.68]].forEach(([x, y]) => box(cooler, 0.2, 0.22, 0.08, x, y, -0.27, 0x96a8b2, { metalness: 0.75, roughness: 0.28 }));

  // DDR4 Memory DIMM + Top/Bottom Clips
  const ram = movable('ram', [0.96, 4.35, -0.38], [4.3, -0.2, 0.63], 'ramSeated', [0, 0, Math.PI / 2]);
  box(ram, 0.08, 2.0, 0.58, 0, 0, 0, 0x1b6d54, { roughness: 0.45, metalness: 0.25 });
  box(ram, 0.13, 2.04, 0.08, 0, 0, 0.29, 0xa6c2c6, { metalness: 0.82, roughness: 0.22 });
  instanceBoxes(ram, [0.09, 0.21, 0.31], Array.from({ length: 7 }, (_, i) => [0.085, -0.78 + i * 0.25, 0.03]), 0x15252c, { roughness: 0.4 });
  box(ram, 0.1, 1.7, 0.06, 0, 0, -0.29, 0xd8b862, { metalness: 0.86, roughness: 0.22 });
  const upperClip = group('ram', scene, false);
  const lowerClip = group('ram', scene, false);
  box(upperClip, 0.23, 0.24, 0.2, 0, 0, 0, 0xd0dad4, { metalness: 0.5, roughness: 0.35 });
  box(lowerClip, 0.23, 0.24, 0.2, 0, 0, 0, 0xd0dad4, { metalness: 0.5, roughness: 0.35 });

  // Dedicated PCIe x16 Dual-Fan Graphics Card
  const gpu = movable('gpu', [-0.6, 2.93, 0.1], [4.72, -0.17, -0.4], 'gpuInstalled', [0, 0, Math.PI]);
  // PCB & anodized metallic backplate
  box(gpu, 3.34, 0.08, 1.3, 0, 0.04, 0, 0x263844, { metalness: 0.72, roughness: 0.3 });
  box(gpu, 3.32, 0.09, 1.28, 0, -0.02, 0, 0x1d6852, { roughness: 0.48, metalness: 0.2 });
  // Sculpted dual-fan GPU shroud & exposed copper heatpipe bar
  box(gpu, 3.44, 0.44, 1.35, 0, -0.26, 0, 0x1c2f3c, { metalness: 0.48, roughness: 0.42 });
  box(gpu, 2.85, 0.06, 0.12, 0, -0.12, 0.66, 0xd08046, { metalness: 0.85, roughness: 0.22 });
  instanceBoxes(gpu, [0.035, 0.28, 1.22], Array.from({ length: 20 }, (_, i) => [-1.48 + i * 0.15, -0.2, 0]), 0x9ab0b8, { metalness: 0.78, roughness: 0.26 });
  [-0.84, 0.77].forEach(x => {
    cylinder(gpu, 0.49, 0.09, x, -0.5, 0, 0x101f28, 'y', { roughness: 0.45, metalness: 0.3 });
    cylinder(gpu, 0.17, 0.11, x, -0.56, 0, 0x2ce0d4, 'y', { metalness: 0.65, roughness: 0.25 });
  });
  // Dual-slot stainless I/O bracket & video output ports
  box(gpu, 0.13, 0.75, 1.52, -1.83, -0.14, 0, 0xb8c6cc, { metalness: 0.82, roughness: 0.25 });
  box(gpu, 0.16, 0.13, 0.39, -1.91, -0.24, 0.2, 0x12222b);
  box(gpu, 0.16, 0.13, 0.39, -1.91, -0.24, -0.35, 0x12222b);
  // 6-pin PCIe power header
  box(gpu, 0.24, 0.26, 0.38, 1.43, 0.08, 0.3, 0x141f29);
  const pcieLatch = group('gpu', scene, false);
  box(pcieLatch, 0.18, 0.24, 0.25, 0, 0, 0, 0xc4d8ce, { metalness: 0.5, roughness: 0.35 });

  // Original 2.5-inch SATA Classroom SSD
  const ssd = movable('ssd', [1.97, 1.83, -0.27], [5.5, -0.14, 1.2], 'originalDriveInstalled', [-Math.PI / 2, 0, 0]);
  box(ssd, 0.92, 1.38, 0.17, 0, 0, 0, 0x172432, { metalness: 0.62, roughness: 0.35 });
  box(ssd, 0.74, 0.84, 0.016, 0, 0.08, 0.09, 0x0e6e78, { roughness: 0.42, metalness: 0.2 });
  box(ssd, 0.62, 0.07, 0.016, 0, 0.24, 0.105, 0x99ebe6, { emissive: 0x227772, emissiveIntensity: 0.25 });
  instanceBoxes(ssd, [0.5, 0.018, 0.014], [[0, 0.03, 0.105], [-0.03, -0.05, 0.105], [-0.03, -0.13, 0.105]], 0xb6d6da);
  box(ssd, 0.25, 0.11, 0.12, -0.22, -0.71, 0, 0xd4ad5c, { metalness: 0.85, roughness: 0.22 });
  box(ssd, 0.4, 0.11, 0.12, 0.16, -0.71, 0, 0xd4ad5c, { metalness: 0.85, roughness: 0.22 });

  // Modular ATX Power Supply Unit (PSU)
  const psu = movable('psu', [0.95, 0.58, -0.01], [5.15, 0.2, -2.72], 'psuInstalled');
  box(psu, 2.4, 0.95, 1.78, 0, 0, 0, 0x1e2e3a, { metalness: 0.58, roughness: 0.38 });
  box(psu, 1.7, 0.65, 0.018, 0, 0.05, 0.9, 0x12222c);
  instanceBoxes(psu, [1.4, 0.025, 0.02], Array.from({ length: 8 }, (_, i) => [0, -0.2 + i * 0.07, 0.92]), 0x62808a, { metalness: 0.7 });
  box(psu, 0.66, 0.17, 0.022, 0, 0.08, 0.94, 0xefc662, { metalness: 0.78, roughness: 0.25 });
  box(psu, 2.36, 0.91, 0.04, 0, 0, -0.9, 0x7e949e, { metalness: 0.65, roughness: 0.35 });
  box(psu, 0.45, 0.26, 0.06, -0.57, 0, -0.94, 0x0f1820);
  box(psu, 0.17, 0.2, 0.07, -0.14, 0, -0.94, 0xc93b3b, { roughness: 0.4 });
  instanceBoxes(psu, [0.67, 0.025, 0.02], Array.from({ length: 7 }, (_, i) => [0.63, -0.23 + i * 0.075, -0.94]), 0x223540);

  // Tempered-Glass Teaching Side Panel
  const panel = movable('panel', [0, 3.15, 1.54], [5.3, 2.8, -4.3], 'panelInstalled');
  box(panel, 5.4, 0.18, 0.1, 0, 3.04, 0, 0x3b5060, { metalness: 0.62, roughness: 0.35 });
  box(panel, 5.4, 0.18, 0.1, 0, -3.04, 0, 0x3b5060, { metalness: 0.62, roughness: 0.35 });
  [-2.61, 2.61].forEach(x => box(panel, 0.18, 6.1, 0.1, x, 0, 0, 0x3b5060, { metalness: 0.62, roughness: 0.35 }));
  box(panel, 5.1, 5.87, 0.035, 0, 0, 0, 0x458b94, { transparent: true, opacity: 0.14, depthWrite: false, metalness: 0.2, roughness: 0.12 });
  box(panel, 0.22, 0.8, 0.15, -2.35, -0.2, 0.12, 0xa8bec6, { metalness: 0.78, roughness: 0.25 });

  // 18 Individually Modeled Fasteners (Screws) & Magnetic Parts Tray
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
      const body=geometries.get('fastener-body')||mergedGeometry('fastener-body',[
        [new THREE.CylinderGeometry(.085,.085,.06,12).rotateX(Math.PI/2)],
        [new THREE.CylinderGeometry(.035,.035,.13,8).rotateX(Math.PI/2).translate(0,0,-.07)],
        [new THREE.RingGeometry(.065,.105,12).translate(0,0,.015)]
      ]);
      screw.add(new THREE.Mesh(body,material(0xb8ccd2)));
      mergedBoxes(screw,'fastener-phillips',[.105,.018,.009],[[0,0,.034],[0,0,.034,0,0,Math.PI/2]],0x222e38);
      const tray = [-3.35 + (screwIndex % 4) * 0.23, -0.25, 2.02 + Math.floor(screwIndex / 4) * 0.23];
      screws.push({ screw, part: set.part, stateKey: set.state, index, pos, tray, rear: name === 'psu' });
      screwIndex += 1;
    });
  }
  // Selectable tools choose the same mode as the accessible DOM toolbar.
  box(scene, 1.32, 0.05, 1.46, -2.99, -0.29, 2.5, 0x102836, { metalness: 0.65, roughness: 0.32 });
  const screwdriver = group('tool-screwdriver');
  cylinder(screwdriver, 0.09, 1.15, 5.92, -0.16, -1.85, 0x1ed4bc, 'z', { roughness: 0.38, metalness: 0.22 });
  cylinder(screwdriver, 0.026, 0.75, 5.92, -0.16, -0.98, 0xc8d8de, 'z', { metalness: 0.88, roughness: 0.18 });
  const syringe = group('tool-paste');
  box(syringe, 0.18, 0.13, 0.62, 4.28, -0.2, -1.93, 0xcad4d8, { metalness: 0.4, roughness: 0.35 });
  box(syringe, 0.095, 0.095, 0.21, 4.28, -0.2, -1.52, 0x3be0cf, { roughness: 0.35 });
  const wipe = group('tool-clean');
  box(wipe, 0.7, 0.05, 0.6, 6.38, -0.22, 1.85, 0xc8e1da, { roughness: 1, metalness: 0 });

  // Internal power & data leads
  lead('atx', 'atxConnected', [[1.5, 0.72, 0.26], [2.28, 1.25, 0.85], [2.31, 3.9, 0.52], [1.75, 4.1, -0.45]], 0x2c3742, 0.075, 'boardInstalled');
  lead('eps', 'cpuPowerConnected', [[0.26, 0.74, 0.22], [-2.33, 1.08, 0.4], [-2.25, 5.83, 0.27], [-1.53, 5.64, -0.46]], 0xd4b24c, 0.049, 'boardInstalled');
  lead('gpu-power', 'gpuPowerConnected', [[1.28, 0.77, 0.36], [1.8, 1.5, 1.04], [1.45, 2.6, 0.97], [0.84, 3.02, 0.42]], 0x4f6876, 0.066, 'gpuInstalled');
  lead('sata-data', 'sataDataConnected', [[1.6, 2.59, -0.45], [2.3, 2.7, 0.75], [2.37, 1.47, 0.61], [1.74, 1.1, -0.17]], 0xf2a63b, 0.036, 'originalDriveInstalled');
  lead('sata-power', 'sataPowerConnected', [[1.57, 0.73, 0.36], [2.4, 0.58, 0.96], [2.43, 1.2, 0.8], [2.12, 1.1, -0.17]], 0x344656, 0.058, 'originalDriveInstalled');
  lead('front-panel', 'frontPanelConnected', [[2.53, 0.24, 0.8], [1.65, 0.45, 0.8], [1.24, 1.52, 0.12], [1.51, 2.3, -0.45]], 0x3fd0d4, 0.028, 'boardInstalled');
  lead('cpu-fan', 'cpuFanConnected', [[-0.08, 5.18, 0.31], [0.3, 5.5, 0.58], [0.25, 5.8, 0.1], [-0.1, 5.66, -0.46]], 0x1a2630, 0.027, 'coolerInstalled');

  const selection = new THREE.BoxHelper(new THREE.Object3D(), 0x52f2cc);
  selection.material.depthTest = false;
  selection.material.transparent = true;
  selection.material.opacity = 0.85;
  selection.visible = false;
  scene.add(selection);

  // Small, authored component sockets are independent of camera angle and GPU
  // hit geometry. A box never represents "anywhere inside the case".
  const socketSizes = { board: [4, 4.2, 0.25], cpu: [1.13, 1.03, 0.26], cooler: [1.7, 1.48, 0.8], ram: [0.43, 2.28, 0.7], gpu: [3.65, 0.65, 1.5], ssd: [1.1, 1.55, 0.35], psu: [2.5, 1.06, 1.95], panel: [5.5, 6.25, 0.2] };
  const dropBoxes = new Map(Object.entries(socketSizes).map(([id, size]) => [id, new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...nodes.get(id).userData.fitted), new THREE.Vector3(...size))]));
  dropBoxes.set('tray', new THREE.Box3(new THREE.Vector3(3.2, -0.34, -2.2), new THREE.Vector3(6.95, 0.15, 2.3)));
  const dropMarker = new THREE.Box3Helper(new THREE.Box3(), 0x35e3bc);
  dropMarker.material.depthTest = false;
  dropMarker.material.transparent = true;
  dropMarker.material.opacity = 0.9;
  dropMarker.visible = false;
  dropMarker.userData.assemblyTargetMarker = true;
  scene.add(dropMarker);
  const ghostMaterial = new THREE.MeshStandardMaterial({ color: 0xf2b14e, emissive: 0x5d3510, transparent: true, opacity: 0.48, depthWrite: false, roughness: 0.8, metalness: 0 });
  disposals.push(ghostMaterial);

  const portSpecs = {
    'ac-inlet': { at: [0.38, 0.58, -1.12], normal: [0, 0, -1], size: [0.46, 0.28, 0.1], owner: 'psuInstalled' },
    'hdmi-gpu': { at: [-1.9, 2.68, -1.15], normal: [0, 0, -1], size: [0.34, 0.14, 0.1], owner: 'gpuInstalled' },
    'hdmi-board': { at: [-1.65, 5.02, -1.15], normal: [0, 0, -1], size: [0.34, 0.14, 0.1], owner: 'boardInstalled' },
    'monitor-hdmi': { at: [-4.87, 1.52, -0.65], normal: [-0.28, 0, -0.96], size: [0.34, 0.14, 0.1] },
    'atx-header': { at: [1.75, 4.1, -0.43], normal: [0, 0, 1], size: [0.24, 0.78, 0.17], owner: 'boardInstalled', internal: true },
    'eps-header': { at: [-1.53, 5.64, -0.43], normal: [0, 0, 1], size: [0.4, 0.23, 0.17], owner: 'boardInstalled', internal: true },
    'gpu-power-header': { at: [0.84, 3.02, 0.55], normal: [0, 0, 1], size: [0.35, 0.28, 0.15], owner: 'gpuInstalled', internal: true },
    'ssd-data': { at: [1.72, 1.08, -0.12], normal: [0, 0, 1], size: [0.27, 0.13, 0.17], owner: 'originalDriveInstalled', internal: true },
    'ssd-power': { at: [2.15, 1.08, -0.12], normal: [0, 0, 1], size: [0.4, 0.13, 0.17], owner: 'originalDriveInstalled', internal: true },
    'front-panel-header': { at: [1.51, 2.3, -0.43], normal: [0, 0, 1], size: [0.3, 0.17, 0.16], owner: 'boardInstalled', internal: true },
    'cpu-fan-header': { at: [-0.1, 5.66, -0.43], normal: [0, 0, 1], size: [0.28, 0.15, 0.15], owner: 'boardInstalled', internal: true }
  };
  const portNodes = new Map();
  const cableEnds = new Map();
  const cableColors = [0xe6c87a, 0x69b8ff, 0x69b8ff, 0x8bdac0, 0xe8cc69, 0x9caaff, 0xf6ad50, 0xcf94dc, 0x70d8de, 0xc5d8db];
  let overlay = null;
  const labels = new Map();
  if (typeof doc.createElement === 'function') {
    overlay = doc.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
    if (host.style && !host.style.position) host.style.position = 'relative';
    host.appendChild(overlay);
  }
  function label(id, text) {
    if (!overlay) return;
    const element = doc.createElement('span');
    element.textContent = text;
    Object.assign(element.style, { position: 'absolute', padding: '4px 7px', border: '1px solid #6ee7cf', borderRadius: '6px', background: '#102332ee', color: '#edf9f6', font: '600 11px/1.25 system-ui,sans-serif', whiteSpace: 'nowrap', transform: 'translate(-50%,-100%)', display: 'none' });
    overlay.appendChild(element); labels.set(id, element);
  }
  for (const [id, spec] of Object.entries(portSpecs)) {
    const node = group(); node.position.fromArray(spec.at); node.userData.cablePortId = id;
    box(node, ...spec.size, 0, 0, 0, 0x46bda9, { emissive: 0x123d36, emissiveIntensity: 0.5, roughness: 0.5 });
    node.children[0].material = node.children[0].material.clone(); disposals.push(node.children[0].material);
    portNodes.set(id, node);
    label(id, ASSEMBLY_CABLES.flatMap(item => item.sockets).find(item => item.id === id)?.label || id);
  }
  ASSEMBLY_CABLES.forEach((item, index) => {
    const node = group(); node.userData.cableEndpointId = item.id;
    const shape = item.id === 'atx' ? [0.2, 0.46, 0.19] : item.id.includes('hdmi') ? [0.31, 0.15, 0.2] : [0.26, 0.2, 0.2];
    const [w,h,d]=shape;
    const housing=geometry(`connector:${item.id.includes('hdmi')?'hdmi':item.id}`,()=>{
      const profile=new THREE.Shape(),cut=item.id.includes('hdmi')?w*.16:w*.1;
      if(item.id.startsWith('sata-')){
        // The notch forms the SATA L key; the wider power plug has 15 contacts.
        profile.moveTo(-w/2,-h/2);profile.lineTo(w/2,-h/2);profile.lineTo(w/2,h*.08);profile.lineTo(w*.25,h*.08);profile.lineTo(w*.25,h/2);profile.lineTo(-w/2,h/2);profile.closePath();
      }else{profile.moveTo(-w/2+cut,-h/2);profile.lineTo(w/2-cut,-h/2);profile.lineTo(w/2,h/2-cut);profile.lineTo(w/2-cut,h/2);profile.lineTo(-w/2+cut,h/2);profile.lineTo(-w/2,h/2-cut);profile.closePath();}
      return new THREE.ExtrudeGeometry(profile,{depth:d-.014,steps:1,bevelEnabled:true,bevelThickness:.007,bevelSize:.007,bevelSegments:1,curveSegments:1}).translate(0,0,-d/2+.007);
    });
    const body=new THREE.Mesh(housing,material(0x25292e,{roughness:.75,metalness:.04}));body.userData.detail='keyed-housing';node.add(body);
    const pinCount=item.id==='atx'?24:item.id.includes('hdmi')?19:item.id==='sata-power'?15:item.id==='sata-data'?7:item.id==='ac'?3:item.id==='gpu-power'?6:item.id==='cpu-fan'?4:item.id==='front-panel'?2:8;
    const rows=item.id==='atx'?12:item.id==='ac'||item.id.startsWith('sata-')?1:2,columns=Math.ceil(pinCount/rows);
    const pins=item.id==='ac'?[[-w*.24,-h*.18,d/2+.012],[w*.24,-h*.18,d/2+.012],[0,h*.22,d/2+.012]]:Array.from({length:pinCount},(_,i)=>[(i%columns-(columns-1)/2)*(w*.68/Math.max(1,columns-1)),(Math.floor(i/columns)-(rows-1)/2)*(h*.67/Math.max(1,rows-1)),d/2+.012]);
    instanceBoxes(node,[Math.min(.032,w*.45/columns),Math.min(.026,h*.4/rows),.018],pins,0xc6ac68,{roughness:.45,metalness:.78});
    mergedBoxes(node,`strain-relief:${w}:${h}:${d}`,[w*.64,h*.58,.018],Array.from({length:4},(_,i)=>[0,0,-d/2-.018-i*.035]),0x191d21,{roughness:.92,metalness:0});
    box(node,w*.7,.025,.012,0,h/2+.006,0,cableColors[index],{roughness:.8,metalness:.05});
    const home = item.internal ? [3.6 + (index - 3) * 0.58, -0.14, 2.72] : item.id === 'hdmi-monitor' ? [-6.4, -0.14, -2.45] : [-0.15 - index * 0.65, -0.14, -2.6];
    cableEnds.set(item.id, { node, home, spec: item });
    label(`cable-${item.id}`, `${item.label} · plug`);
  });
  const cableRest = group(); cableRest.position.set(7.6, -0.2, 3.7); cableRest.userData.cablePortId = 'cable-rest';
  box(cableRest, 1.85, 0.08, 1.1, 0, 0, 0, 0x245c58, { roughness: 0.9 });
  label('cable-rest', '↩ Cable rest · unplug here');
  const cableGhost = group(); cableGhost.visible = false; cableGhost.userData.assemblyCableGhost = true;
  box(cableGhost, 0.3, 0.22, 0.23, 0, 0, 0, 0x67eccb, { transparent: true, opacity: 0.65, depthWrite: false });
  const cableLineGeo = geometry('cable-drag-line', () => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array(9).fill(0), 3)));
  const cableLineMat = new THREE.LineBasicMaterial({ color: 0x67eccb, transparent: true, opacity: 0.9 }); disposals.push(cableLineMat);
  const cableLine = new THREE.Line(cableLineGeo, cableLineMat); cableLine.visible = false; scene.add(cableLine);
  const acConnectedMesh = new THREE.Mesh(cableGeometry([[-7.9, 1.4, -4.6], [-7, 0, -3.8], [-1.5, -0.1, -2.3], [0.38, 0.58, -1.12]], 0.06), material(0x28323c)); scene.add(acConnectedMesh);
  const acLooseMesh = new THREE.Mesh(cableGeometry([[-7.9, 1.4, -4.6], [-7, 0, -3.8], [-2, -0.1, -2.9], cableEnds.get('ac').home], 0.06), material(0x28323c)); scene.add(acLooseMesh);
  box(scene, 0.7, 0.8, 0.12, -7.9, 1.4, -4.7, 0xc3d1cf);
  box(scene, 0.25, 0.33, 0.14, -7.9, 1.4, -4.6, 0x202e36);

  function portAvailable(id) {
    const spec = portSpecs[id];
    if (!spec || (spec.internal && modelAssembly.panelInstalled)) return false;
    return !spec.owner || (spec.owner === 'psuInstalled' ? modelAssembly.psuInstalled !== false : !!modelHardware[spec.owner]);
  }
  function cableVisible(item) { return !item.internal || !modelAssembly.panelInstalled; }
  function updateCableViews() {
    for (const [id, node] of portNodes) {
      node.visible = tool === 'cables' && portAvailable(id);
      const compatible = ASSEMBLY_CABLES.find(item => item.id === selectedCable)?.sockets.some(socket => socket.id === id);
      node.children[0].material.emissiveIntensity = compatible ? 1 : 0.12;
    }
    for (const [id, item] of cableEnds) {
      const socket = cableConnection(modelHardware, modelAssembly, id);
      const spec = portSpecs[socket];
      item.node.position.fromArray(spec ? spec.at.map((value, i) => value + spec.normal[i] * 0.18) : item.home);
      if(spec)item.node.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...spec.normal).negate());
      else item.node.rotation.set(0,0,id==='atx'?Math.PI/2:0);
      item.node.visible = tool === 'cables' && cableVisible(item.spec) && !(cableDrag?.id === id);
      item.node.scale.setScalar(selectedCable === id ? 1.3 : 1);
    }
    for (const lead of cables) {
      const item = cableEnds.get(lead.node.userData.selectId);
      if (!item) continue;
      const home = item.home;
      const route=[lead.start, [lead.start[0] + 0.45, 0.35, 1.4], [home[0] - 0.4, -0.06, home[2] - 0.35], home];
      lead.loose.children[0].geometry = cableGeometry(route,lead.width);
      lead.looseBraid.geometry=sleeving(route,lead.width);
      lead.loose.children[1].position.fromArray(home);
    }
    cableRest.visible = tool === 'cables';
    acConnectedMesh.visible = !!modelHardware.acConnected;
    acLooseMesh.visible = !modelHardware.acConnected;
  }
  function screenPoint(node) {
    const point = node.getWorldPosition(new THREE.Vector3()).project(camera);
    const bounds = canvas.getBoundingClientRect();
    const x = (point.x + 1) * lastWidth / 2; const y = (1 - point.y) * lastHeight / 2;
    return { clientX: bounds.left + x, clientY: bounds.top + y, x, y, depth: point.z };
  }
  function unobscured(node) {
    const position = screenPoint(node);
    if (position.depth < -1 || position.depth > 1 || !rayAt(position)) return false;
    const distanceToNode = node.getWorldPosition(new THREE.Vector3()).distanceTo(raycaster.ray.origin);
    // Thin flexible leads crossing the center ray do not erase a port's tap
    // area. Solid housings still occlude; closed-panel guards are explicit.
    const obstacle = raycaster.intersectObjects(scene.children, true).find(hit => hit.object.isMesh && hit.object.geometry?.type !== 'TubeGeometry' && !hit.object.userData.flexibleLead && isVisible(hit.object) && !hit.object.material?.wireframe && !(hit.object.material?.transparent && hit.object.material.opacity < 0.2) && !hit.object.parent?.userData.assemblyCableGhost);
    for(let part=obstacle?.object;part&&part!==scene;part=part.parent){
      if(part===node)return true;
      if(node.userData.cablePortId&&part.userData.cableEndpointId&&cableConnection(modelHardware,modelAssembly,part.userData.cableEndpointId)===node.userData.cablePortId)return true;
    }
    return !obstacle || obstacle.distance + 0.18 >= distanceToNode;
  }
  function updateCableLabels() {
    if (!overlay) return;
    for (const element of labels.values()) element.style.display = 'none';
    if (tool !== 'cables') return;
    const chosen = cableEnds.get(selectedCable);
    const show = (id, node) => {
      const element = labels.get(id); if (!element || !node.visible || !unobscured(node)) return;
      const point = screenPoint(node);
      if (point.x < 0 || point.y < 0 || point.x > lastWidth || point.y > lastHeight) return;
      element.style.left = `${point.x}px`; element.style.top = `${point.y + (id.startsWith('cable-') ? -14 : 26)}px`; element.style.display = 'block';
    };
    if (chosen) {
      show(`cable-${selectedCable}`, chosen.node);
      for (const socket of chosen.spec.sockets) show(socket.id, portNodes.get(socket.id));
    }
    const rest = labels.get('cable-rest');
    if (rest) { rest.style.display = 'block'; rest.style.left = `${lastWidth - 82}px`; rest.style.top = `${lastHeight - 12}px`; rest.style.padding = '11px 9px'; }
  }

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
    cancelInteraction();
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
    fan.rotation.z = modelHardware.pcOn ? 0.35 : 0;
    powerLed.material.emissiveIntensity = modelHardware.pcOn ? 0.95 : 0.08;

    // Update 3D Monitor screen & external HDMI display cable routing
    const desktopVisible = !!modelHardware.pcOn && !!modelHardware.booted && !!modelHardware.gpuInstalled && !!modelHardware.gpuPowerConnected && modelHardware.videoPort === 'gpu' && modelHardware.pcVideoConnected !== false && !!modelHardware.signalConnected && (modelHardware.monitorInput || 'hdmi') === 'hdmi';
    screenDesktop.visible = desktopVisible;
    screenDoc.visible = desktopVisible && !!modelHardware.documentOpened;
    screenNoSignal.visible = !desktopVisible && !!modelHardware.pcOn;
    monitorLed.material.emissiveIntensity = desktopVisible ? 0.95 : modelHardware.pcOn ? 0.45 : 0.12;
    const signalConnected = modelHardware.signalConnected !== false;
    const onGpuPort = (modelHardware.videoPort || 'gpu') === 'gpu';
    const pcEnd = modelHardware.pcVideoConnected !== false;
    const hdmiStart = pcEnd ? portSpecs[onGpuPort ? 'hdmi-gpu' : 'hdmi-board'].at : cableEnds.get('hdmi-pc').home;
    const hdmiEnd = signalConnected ? portSpecs['monitor-hdmi'].at : cableEnds.get('hdmi-monitor').home;
    const route = pcEnd && signalConnected ? [hdmiStart, [-3.2, 0.8, -1.5], [-4.1, 0.45, -1.2], hdmiEnd] : !pcEnd && !signalConnected ? [hdmiStart, [-0.3, -0.11, 3.65], [-1.8, -0.11, 3.65], hdmiEnd] : [hdmiStart, [-3.2, 0.35, 1.2], [-3.9, 0.1, 2.6], hdmiEnd];
    hdmiGpuToMonitor.geometry = cableGeometry(route, 0.052);
    hdmiGpuToMonitor.visible = true;
    hdmiBoardToMonitor.visible = hdmiLooseMonitor.visible = false;

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
    updateCableViews();
    requestRender();
  }
  function updateCamera() {
    backboard.visible = Math.cos(yaw) > -0.1;
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * distance, target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * Math.cos(pitch) * distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }
  function render() {
    frame = 0;
    if (stopped || paused || doc.hidden || contextLost || !lastWidth || !lastHeight) return;
    updateCamera();
    updateCableLabels();
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
      cancelInteraction();
      lastWidth = lastHeight = 0;
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (width === lastWidth && height === lastHeight) return;
    cancelInteraction();
    lastWidth = width;
    lastHeight = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // At most ~900k framebuffer pixels, even on high-DPI tablets.
    const ratio = Math.min(1.5, Math.max(1, view.devicePixelRatio || 1), Math.sqrt(900000 / (width * height)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    const nextFittedDistance = Math.max(15.5, 16.8 / camera.aspect);
    const reference=cameraFraming==='pc'?pcFitDistance():cameraFraming==='part'?partFitDistance():cameraFraming==='monitor'?Math.max(8,9/camera.aspect):nextFittedDistance;
    distance *= reference / framingReference;
    framingReference=reference;
    fittedDistance = nextFittedDistance;
    distance = Math.max(cameraFraming==='part'?2.2:7, Math.min(40, distance));
    requestRender();
  }
  function rayAt(event) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height || event.clientX < bounds.left || event.clientY < bounds.top || event.clientX > bounds.left + bounds.width || event.clientY > bounds.top + bounds.height) return null;
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    updateCamera();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray;
  }
  function selectedAt(event) {
    if (!rayAt(event)) return '';
    if (tool === 'cables') {
      const endpoint = cableHit(event, true);
      if (endpoint) return `cable-${endpoint}`;
      const port = cableHit(event, false);
      return port ? `port-${port}` : '';
    }
    if (tool === 'screwdriver') {
      const rect = canvas.getBoundingClientRect();
      const candidates = screws.map(({ screw }) => {
        const projected = screw.getWorldPosition(new THREE.Vector3()).project(camera);
        const x = rect.left + (projected.x + 1) * rect.width / 2;
        const y = rect.top + (1 - projected.y) * rect.height / 2;
        return { screw, x, y, depth: projected.z, distance: Math.hypot(x - event.clientX, y - event.clientY) };
      }).filter(item => isVisible(item.screw) && item.depth >= -1 && item.depth <= 1 && item.distance <= 17).sort((a, b) => a.distance - b.distance);
      for (const candidate of candidates) {
        if (!rayAt({ clientX: candidate.x, clientY: candidate.y })) continue;
        // A generous tap target must not turn a screw through a solid case,
        // cooler, or closed panel. Test the visible head's own center ray.
        const occluders = raycaster.intersectObjects(scene.children, true).filter(hit => hit.object.isMesh && isVisible(hit.object) && !hit.object.material?.wireframe);
        const closest = occluders[0]?.object;
        for (let node = closest; node && node !== scene; node = node.parent) if (node === candidate.screw) return candidate.screw.userData.selectId;
      }
      rayAt(event);
    }
    const hits = raycaster.intersectObjects(selectables, true).filter(hit => isVisible(hit.object));
    for (const hit of hits) {
      for (let node = hit.object; node && node !== scene; node = node.parent) if (node.userData.selectId) {
        // Screwdriver targets were already checked against real occlusion.
        if (tool === 'screwdriver' && /^(panel|psu|board|cooler|gpu|ssd)-[0-9]+$/.test(node.userData.selectId)) return '';
        return node.userData.selectId;
      }
    }
    return '';
  }
  function releaseGesture() {
    const previous = gesture;
    gesture = null;
    if (previous && canvas.hasPointerCapture?.(previous.id)) canvas.releasePointerCapture(previous.id);
    canvas.style.cursor = tool === 'inspect' ? 'grab' : tool === 'move' ? 'move' : 'crosshair';
  }
  function notify(kind, message, extra = {}) {
    if (!stopped) onInteraction({ kind, message, ...extra });
  }
  function cancelInteraction(message = '') {
    const hadDrag = !!drag || !!cableDrag;
    releaseGesture();
    if (drag) {
      drag.source.visible = drag.sourceVisible;
      drag.ghost.traverse(node => { if (node.isInstancedMesh) node.dispose(); });
      drag.ghost.removeFromParent();
      drag = null;
    }
    cableDrag = null;
    armedCable = '';
    cableGhost.visible = cableLine.visible = false;
    updateCableViews();
    dropMarker.visible = false;
    highlight(selectedId);
    if (message || hadDrag) notify('idle', message || 'Movement canceled. Your assembly is unchanged.');
    requestRender();
  }
  function action(mapped) {
    if (stopped || paused || contextLost || doc.hidden) return;
    // Restore transient transforms before calling the model: the callback may
    // synchronously update or dispose this scene through the workbench adapter.
    cancelInteraction();
    if (!mapped?.action) { notify('warning', mapped?.message || 'Choose a compatible part or tool target.'); return; }
    const version = ++dispatchVersion;
    const done = result => {
      if (stopped || version !== dispatchVersion) return;
      notify(result?.kind === 'warning' ? 'warning' : 'info', result?.message || mapped.message, { action: mapped.action });
      requestRender();
    };
    try {
      const result = onAction(mapped.action);
      if (result?.then) result.then(done, () => done({ kind: 'warning', message: 'The action could not finish. Your assembly is unchanged; try the labeled controls.' }));
      else done(result);
    } catch {
      done({ kind: 'warning', message: 'The action could not finish. Continue using the labeled assembly controls.' });
    }
  }
  function destinationAt(event, intended) {
    const ray = rayAt(event);
    if (!ray) return '';
    // Stacked sockets overlap in projection (CPU below cooler). The exact
    // intended socket has priority; incompatible regions never become valid.
    if (ray.intersectBox(dropBoxes.get(intended), new THREE.Vector3())) return intended;
    let nearest = Infinity; let destination = '';
    for (const [id, bounds] of dropBoxes) {
      const hit = ray.intersectBox(bounds, new THREE.Vector3());
      if (hit && hit.distanceTo(ray.origin) < nearest) { nearest = hit.distanceTo(ray.origin); destination = id; }
    }
    return destination;
  }
  function beginMove(event) {
    const source = nodes.get(gesture.partId);
    if (!source?.userData.partKey) return false;
    const ghost = source.clone(true);
    ghost.userData.assemblyGhost = true;
    ghost.traverse(node => { if (node.isMesh) node.material = ghostMaterial; });
    const normal = camera.getWorldDirection(new THREE.Vector3());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, source.position);
    const startRay = rayAt({ clientX: gesture.x, clientY: gesture.y });
    const start = startRay?.intersectPlane(plane, new THREE.Vector3());
    if (!start) return false;
    scene.add(ghost);
    drag = { source, sourceVisible: source.visible, ghost, plane, start, origin: source.position.clone(), partId: gesture.partId, intended: assembledPartFitted(gesture.partId, modelHardware, modelAssembly) ? 'tray' : gesture.partId, destination: '', valid: false };
    source.visible = false;
    selection.visible = false;
    dropMarker.box.copy(dropBoxes.get(drag.intended));
    dropMarker.visible = true;
    canvas.setPointerCapture?.(event.pointerId);
    canvas.style.cursor = 'grabbing';
    return true;
  }
  function movePart(event) {
    const ray = rayAt(event);
    const hit = ray?.intersectPlane(drag.plane, new THREE.Vector3());
    if (hit) {
      drag.ghost.position.copy(drag.origin).add(hit.sub(drag.start));
      drag.ghost.position.clamp(new THREE.Vector3(-8, -0.24, -3.3), new THREE.Vector3(8.2, 6.5, 4.6));
    }
    const destination = destinationAt(event, drag.intended);
    const mapped = assemblyDropAction(modelHardware, modelAssembly, drag.partId, destination);
    drag.destination = destination;
    drag.valid = destination === drag.intended && !!mapped.action;
    ghostMaterial.color.set(drag.valid ? 0x42ebc5 : 0xf2b14e);
    ghostMaterial.emissive.set(drag.valid ? 0x124f40 : 0x5d3510);
    dropMarker.material.color.set(drag.valid ? 0x42ebc5 : 0xf2b14e);
    if (drag.valid) {
      drag.ghost.position.fromArray(drag.intended === 'tray' ? drag.source.userData.loose : drag.source.userData.fitted);
      drag.ghost.rotation.set(...(drag.intended === 'tray' ? drag.source.userData.looseRotation : [0, 0, 0]));
    }
    const message = drag.valid ? `Release to attempt ${drag.intended === 'tray' ? 'removing' : 'fitting'} ${drag.partId}. Safety, screws, and cables are still checked.` : `Move ${drag.partId} onto its outlined ${drag.intended === 'tray' ? 'parts tray' : 'matching socket'}. Release elsewhere to cancel.`;
    if (gesture.lastMessage !== message) { gesture.lastMessage = message; notify(drag.valid ? 'valid' : 'dragging', message, { partId: drag.partId, targetId: destination }); }
    requestRender();
  }
  function cableHit(event, endpoint) {
    if (!rayAt(event)) return '';
    const bounds = canvas.getBoundingClientRect();
    if (!endpoint && event.clientX >= bounds.left + lastWidth - 155 && event.clientX <= bounds.left + lastWidth - 8 && event.clientY >= bounds.top + lastHeight - 55 && event.clientY <= bounds.top + lastHeight - 8) return 'cable-rest';
    const items = endpoint ? [...cableEnds].map(([id, item]) => [id, item.node]) : [...portNodes, ['cable-rest', cableRest]];
    const candidates = items.map(([id, node]) => { const p = screenPoint(node); return { id, node, p, distance: Math.hypot(p.clientX - event.clientX, p.clientY - event.clientY) }; }).filter(item => item.node.visible && item.p.depth >= -1 && item.p.depth <= 1 && item.distance <= (endpoint ? 22 : 24)).sort((a, b) => a.distance - b.distance);
    return candidates.find(item => unobscured(item.node))?.id || '';
  }
  function beginCable(event) {
    const id = gesture.partId.startsWith('cable-') ? gesture.partId.slice(6) : '';
    const item = cableEnds.get(id);
    if (!item || !cableVisible(item.spec)) return false;
    selectedCable = id;
    updateCableViews();
    const normal = camera.getWorldDirection(new THREE.Vector3());
    cableDrag = { id, origin: item.node.position.clone(), plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, item.node.position), destination: '' };
    item.node.visible = false;
    cableGhost.position.copy(item.node.position); cableGhost.visible = cableLine.visible = true;
    canvas.setPointerCapture?.(event.pointerId);
    canvas.style.cursor = 'grabbing';
    return true;
  }
  function moveCable(event) {
    const ray = rayAt(event);
    const point = ray?.intersectPlane(cableDrag.plane, new THREE.Vector3());
    if (point) cableGhost.position.copy(point).clamp(new THREE.Vector3(-8.5, -0.2, -4.5), new THREE.Vector3(8.7, 6.3, 4.8));
    const destination = cableHit(event, false);
    const mapped = assemblyCableAction(modelHardware, modelAssembly, cableDrag.id, destination);
    cableDrag.destination = destination;
    cableDrag.valid = !!mapped.action;
    if (mapped.action && portNodes.has(destination)) cableGhost.position.copy(portNodes.get(destination).position);
    if (mapped.action && destination === 'cable-rest') cableGhost.position.fromArray(cableEnds.get(cableDrag.id).home);
    const positions = cableLineGeo.attributes.position;
    const mid = cableDrag.origin.clone().lerp(cableGhost.position, 0.5); mid.y -= 0.35;
    [cableDrag.origin, mid, cableGhost.position].forEach((p, i) => positions.setXYZ(i, p.x, p.y, p.z)); positions.needsUpdate = true; cableLineGeo.computeBoundingSphere();
    cableLineMat.color.set(mapped.action ? 0x67eccb : 0xf2b14e);
    const message = mapped.action ? `✓ Release: ${mapped.message}` : destination ? `Not a match: ${mapped.message}` : 'Move the plug to a labeled matching port, or Cable rest to unplug. Release elsewhere to cancel.';
    if (gesture.lastMessage !== message) { gesture.lastMessage = message; notify(mapped.action ? 'valid' : 'dragging', message, { cableId: cableDrag.id, targetId: destination }); }
    requestRender();
  }
  function down(event) {
    if (stopped || paused || doc.hidden || contextLost || event.button !== 0) return;
    if (gesture && event.pointerId !== gesture.id) { cancelInteraction('Movement canceled: use one pointer at a time.'); return; }
    if (gesture) return;
    const partId = selectedAt(event);
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch, orbit: false, moved: false, partId, touch: event.pointerType !== 'mouse' };
  }
  function move(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (tool !== 'inspect') {
      if (Math.hypot(dx, dy) > 7) {
        gesture.moved = true;
        if (tool === 'move' && !drag && !beginMove(event)) return;
        if (tool === 'cables' && !cableDrag && !beginCable(event)) return;
      }
      if (drag) movePart(event);
      if (cableDrag) moveCable(event);
      return;
    }
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
    if (cableDrag) {
      moveCable(event);
      const mapped = cableDrag.valid ? assemblyCableAction(modelHardware, modelAssembly, cableDrag.id, cableDrag.destination) : { action: null, message: 'Connection canceled. Choose the matching labeled port; your cables are unchanged.' };
      action(mapped);
      return;
    }
    if (drag) {
      movePart(event);
      const mapped = drag.valid ? assemblyDropAction(modelHardware, modelAssembly, drag.partId, drag.destination) : { action: null, message: 'Movement canceled. Drop the part on its matching outline or the parts tray.' };
      action(mapped);
      return;
    }
    const tap = !gesture.orbit && !gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 8;
    releaseGesture();
    if (tap) {
      const id = selectedAt(event);
      if (tool === 'cables') {
        if (id.startsWith('cable-')) {
          selectedCable = armedCable = id.slice(6);
          updateCableViews(); requestRender();
          onSelect(id);
          notify('info', `${cableEnds.get(selectedCable)?.spec.label || 'Cable'} selected. Tap its matching port, or drag this plug to connect it.`, { cableId: selectedCable });
        } else if (id.startsWith('port-')) {
          if (armedCable) action(assemblyCableAction(modelHardware, modelAssembly, armedCable, id.slice(5)));
          else notify('info', 'Select a plug or choose a cable in the toolbar first.');
        }
        return;
      }
      if (id) {
        highlight(id);
        requestRender();
        onSelect(id);
        if (id.startsWith('tool-')) { setTool(id.slice(5)); return; }
        if (tool !== 'inspect' && tool !== 'move') {
          const mapped = assemblyToolAction(modelHardware, modelAssembly, tool, id);
          if (tool === 'paste' && pasteAmount === 'excess' && mapped.action === 'asm-apply-paste') mapped.action = 'asm-excess-paste';
          action(mapped);
        }
      }
    }
  }
  function lost() { cancelInteraction(); }
  function outsideUp(event) {
    if (gesture && event.pointerId === gesture.id && event.target !== canvas) cancelInteraction();
  }
  function leave() {
    if (gesture && !gesture.orbit && !drag && !cableDrag) cancelInteraction();
  }
  function loss(event) {
    event.preventDefault();
    contextLost = true;
    cancelInteraction();
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
  function secondPointer(event) {
    if (gesture && event.pointerId !== gesture.id) cancelInteraction('Movement canceled: use one pointer at a time.');
  }
  function key(event) {
    if (event.key === 'Escape') cancelInteraction('Movement canceled. Your assembly is unchanged.');
  }
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
  doc.addEventListener('pointerdown', secondPointer);
  doc.addEventListener('keydown', key);
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : null;
  observer?.observe(host);
  if (!observer) view.addEventListener('resize', resize);

  function pause() {
    paused = true;
    cancelInteraction();
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
      cancelInteraction();
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
    } else if (!paused) {
      resize();
      requestRender();
    }
  }
  doc.addEventListener('visibilitychange', visibility);

  function setView(name) {
    const presets = { iso: [0.52, 0.33], monitor: [-0.36, 0.18], side: [0, 0.02], front: [1.29, 0.15], top: [0.24, 1.31], rear: [Math.PI, 0.08], 'rear-io': [Math.PI, 0.18], 'monitor-ports': [-2.86, 0.17] };
    if (!Object.hasOwn(presets, name)) return;
    [yaw, pitch] = presets[name];
    cameraFraming='bench';framingReference=fittedDistance;distance=fittedDistance;
    target.set(-0.45, 2.65, 0);
    if (name === 'monitor-ports') {target.set(-5.1,1.7,-.3);distance=Math.max(8,9/camera.aspect);cameraFraming='monitor';framingReference=distance;}
    else if (name === 'rear-io') distance = fittedDistance;
    cancelInteraction();
    requestRender();
  }
  function resetView() {
    distance = fittedDistance;
    setView('iso');
  }
  function zoom(direction) {
    if (!['in', 'out'].includes(direction)) return;
    cancelInteraction();
    distance = Math.max(cameraFraming==='part'?2.2:7, Math.min(40, distance * (direction === 'in' ? 0.84 : 1.19)));
    requestRender();
  }
  function pcFitDistance(){
    const angle=.35,elevation=.18,tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const right=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle));
    const up=new THREE.Vector3(-Math.sin(angle)*Math.sin(elevation),Math.cos(elevation),-Math.cos(angle)*Math.sin(elevation));
    const outward=new THREE.Vector3(Math.sin(angle)*Math.cos(elevation),Math.sin(elevation),Math.cos(angle)*Math.cos(elevation));
    let required=7;
    for(const x of [-2.85,2.85])for(const y of [-.25,6.4])for(const z of [-1.12,1.62]){
      const point=new THREE.Vector3(x,y-3.05,z-.12);
      required=Math.max(required,point.dot(outward)+Math.max(Math.abs(point.dot(right))/(tangent*camera.aspect*.94),Math.abs(point.dot(up))/(tangent*.94)));
    }
    return Math.min(40,required);
  }
  function partFitDistance(){return Math.min(30,Math.max(2.2,focusDiameter*1.9/Math.min(1,camera.aspect)));}
  function fit(){
    if(stopped)return;
    cancelInteraction();cameraFraming='pc';target.set(0,3.05,.12);yaw=.35;pitch=.18;
    distance=framingReference=pcFitDistance();requestRender();
  }
  function focusSelected(){
    if(stopped)return;
    const node=tool==='cables'?cableEnds.get(selectedCable)?.node:nodes.get(selectedId);
    if(!node||!isVisible(node)){fit();return;}
    cancelInteraction();scene.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(node),size=bounds.getSize(new THREE.Vector3());
    if(bounds.isEmpty()){fit();return;}
    bounds.getCenter(target);focusDiameter=Math.max(size.x,size.y,size.z,.55);cameraFraming='part';
    const loose=node.userData.partKey&&!assembledPartFitted(node.userData.selectId,modelHardware,modelAssembly);
    if(loose){yaw=.18;pitch=1.02;}else if(tool!=='cables'){yaw=.12;pitch=.1;}
    distance=framingReference=partFitDistance();requestRender();
  }
  function setTool(next) {
    if (stopped || !['inspect', 'move', 'cables', 'screwdriver', 'paste', 'clean'].includes(next)) return;
    cancelInteraction();
    tool = next;
    // Move is an explicit manipulation mode. Its canvas captures touch drags;
    // Inspect restores normal vertical scrolling. The page outside is unchanged.
    canvas.style.touchAction = ['move', 'cables'].includes(tool) ? 'none' : 'pan-y';
    canvas.style.cursor = tool === 'inspect' ? 'grab' : tool === 'move' ? 'move' : 'crosshair';
    if (tool === 'cables') armedCable = selectedCable;
    updateCableViews(); requestRender();
    notify('info', tool === 'cables' ? 'Cables: drag a plug to its labeled matching port, or tap the plug then the port. Cable rest unplugs it. Open the panel before internal cable work.' : tool === 'move' ? 'Move tool: drag a component to its matching outline, or a fitted part to the right-hand parts tray. Release to attempt the change.' : tool === 'screwdriver' ? 'Screwdriver: tap a screw once to turn it. Its current fitting decides tighten or remove; the safety rules still apply.' : tool === 'paste' ? 'Paste tool: tap the exposed CPU to apply thermal paste. Clean old paste first.' : tool === 'clean' ? 'Cleaning tool: tap the exposed CPU to clean its thermal paste.' : 'Inspect: tap a part to select it, or drag sideways to rotate. Vertical touch swipes scroll the page.');
  }
  function setCable(id) {
    if (stopped || !cableEnds.has(id)) return;
    cancelInteraction();
    selectedCable = id;
    const item = cableEnds.get(id);
    if (tool === 'cables') {
      if (!item.spec.internal) setView(id === 'hdmi-monitor' ? 'monitor-ports' : 'rear-io');
      else {setView('side');distance=framingReference=fittedDistance;}
    }
    armedCable = id;
    updateCableViews(); requestRender();
  }
  function setPasteAmount(amount) {
    if (!['pea', 'excess'].includes(amount)) return;
    cancelInteraction();
    pasteAmount = amount;
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
    doc.removeEventListener('pointerdown', secondPointer);
    doc.removeEventListener('keydown', key);
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
    dropMarker.geometry.dispose();
    dropMarker.material.dispose();
    renderer.dispose();
    canvas.remove();
    overlay?.remove();
    scene.clear();
    geometries.clear();
    materials.clear();
    nodes.clear();
    selectables.length = 0;
  }
  updateModel(hardware, assembly);
  resize();
  fit();
  onStatus({ kind: 'ready', message: '3D Tech Lab bench ready. Tap any PC component or the 3D monitor to select it, or drag sideways to orbit.' });
  return { update: updateModel, select: id => { highlight(id); requestRender(); }, fit, focusSelected, resetView, setView, zoom, setTool, setCable, setPasteAmount, cancelInteraction, pause, resume, dispose };
}
