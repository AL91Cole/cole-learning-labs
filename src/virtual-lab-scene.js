import * as BABYLON from './babylon.js?release=20261017-babylon18';

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

// Authored hex swatches are sRGB; Babylon PBR colors are linear inputs.
const color=hex=>BABYLON.Color3.FromInts((hex>>>16)&255,(hex>>>8)&255,hex&255).toLinearSpace();
const vector=values=>BABYLON.Vector3.FromArray(values);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Original procedural equipment: no model loader, downloaded textures or physics. */
function createEquipment(scene,doc){
  let serial=0;
  const materials=new Map(),textures=new Set();
  function mat(hex,roughness=.58,metallic=.15,{emissive=0,intensity=0,alpha=1,unique=false}={}){
    const key=[hex,roughness,metallic,emissive,intensity,alpha].join(':');
    if(!unique&&materials.has(key))return materials.get(key);
    const material=new BABYLON.PBRMaterial(`equipment-material-${serial++}`,scene);
    material.albedoColor=color(hex);material.metallic=metallic;material.roughness=roughness;
    material.emissiveColor=color(emissive).scale(intensity);material.alpha=alpha;
    material.environmentIntensity=.5;material.directIntensity=1;
    if(alpha<1){material.transparencyMode=BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;material.backFaceCulling=false;material.disableDepthWrite=true;}
    if(!unique)materials.set(key,material);
    return material;
  }
  function place(mesh,material,pos=[0,0,0],rot=[0,0,0],parent=null){mesh.material=material;mesh.position.copyFromFloats(...pos);mesh.rotation.copyFromFloats(...rot);mesh.parent=parent;mesh.receiveShadows=true;return mesh;}
  const box=(name,w,h,d,material,pos,rot,parent)=>place(BABYLON.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene),material,pos,rot,parent);
  const cylinder=(name,top,bottom,height,segments,material,pos,rot,parent)=>place(BABYLON.MeshBuilder.CreateCylinder(name,{diameterTop:top*2,diameterBottom:bottom*2,height,tessellation:segments},scene),material,pos,rot,parent);
  const sphere=(name,radius,segments,material,pos,parent)=>place(BABYLON.MeshBuilder.CreateSphere(name,{diameter:radius*2,segments},scene),material,pos,undefined,parent);
  const group=(name,pos=[0,0,0],parent=null)=>{const node=new BABYLON.TransformNode(name,scene);node.position.copyFromFloats(...pos);node.parent=parent;return node;};
  function cable(name,points,hex,parent){const mesh=BABYLON.MeshBuilder.CreateTube(name,{path:points.map(vector),radius:.008,tessellation:6,cap:BABYLON.Mesh.CAP_ALL},scene);mesh.material=mat(hex,.78,0);mesh.parent=parent;return mesh;}
  function screen(name,width,height,draw,parent){
    const canvas=doc.createElement('canvas');canvas.width=512;canvas.height=288;
    const ctx=canvas.getContext?.('2d');let texture=null;
    if(ctx){texture=new BABYLON.DynamicTexture(`${name}-texture`,canvas,scene,false,BABYLON.Texture.BILINEAR_SAMPLINGMODE);texture.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;texture.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;textures.add(texture);}
    const material=mat(0xffffff,.35,0,{unique:true});
    material.unlit=true;material.albedoTexture=texture;material.emissiveTexture=texture;material.emissiveColor=color(0xffffff);material.backFaceCulling=false;
    const mesh=BABYLON.MeshBuilder.CreatePlane(name,{width,height,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene);mesh.material=material;mesh.parent=parent;mesh.isPickable=false;
    function redraw(fn=draw){if(!ctx||!texture)return;ctx.save?.();ctx.setTransform?.(1,0,0,1,0,0);ctx.clearRect?.(0,0,512,288);fn(ctx,512,288);ctx.restore?.();texture.update(true);}
    redraw();return {mesh,redraw,texture};
  }
  function tag(node,id){node.metadata={...node.metadata,selectId:id};for(const child of node.getChildMeshes())child.metadata={...child.metadata,selectId:id};}
  return {mat,box,cylinder,sphere,group,cable,screen,tag,dispose(){for(const texture of textures)texture.dispose();textures.clear();materials.clear();}};
}

function tint(material,hex,emissive=hex,intensity=.28){material.albedoColor.copyFrom(color(hex));material.emissiveColor.copyFrom(color(emissive).scale(intensity));}

function addLighting(scene){
  const hemi=new BABYLON.HemisphericLight('soft-studio-fill',new BABYLON.Vector3(0,1,0),scene);
  hemi.intensity=.65;hemi.diffuse=color(0xf1f5f9);hemi.groundColor=color(0x3b4351);
  const key=new BABYLON.DirectionalLight('window-key',new BABYLON.Vector3(-.6,-1,-.5),scene);
  key.position.copyFromFloats(3.5,5,3.5);key.intensity=1.6;key.diffuse=color(0xfff8ed);
  key.shadowMinZ=.1;key.shadowMaxZ=18;
  const fill=new BABYLON.DirectionalLight('equipment-rim',new BABYLON.Vector3(.7,-.5,.8),scene);
  fill.intensity=.4;fill.diffuse=color(0xdbe7ef);
  // One bounded map, sampled only when this on-demand scene renders.
  const shadows=new BABYLON.ShadowGenerator(512,key);
  shadows.usePoissonSampling=true;shadows.bias=.0015;shadows.normalBias=.015;
  return shadows;
}

function buildDesk(t,parent,width=1.85,depth=.96){
  const steel=t.mat(0x303844,.4,.48),top=t.mat(0x30343a,.77,.03),wood=t.mat(0x785843,.65,.05);
  const desk=t.group('service-desk',[0,0,0],parent);
  t.box('laminate-tabletop',width,.055,depth,top,[0,.74,0],undefined,desk);
  t.box('table-edge',width,.055,.022,wood,[0,.74,depth/2+.006],undefined,desk);
  for(const x of [-width/2+.08,width/2-.08])for(const z of [-depth/2+.08,depth/2-.08])t.box('steel-leg',.045,.74,.045,steel,[x,.37,z],undefined,desk);
  t.box('bench-mat',width*.9,.007,depth*.79,t.mat(0x192a2a,.92,0),[0,.772,.025],undefined,desk);
  return desk;
}

function monitor(t,parent,name,width,height,pos,rot=0,draw=()=>{}){
  const node=t.group(name,pos,parent);node.rotation.y=rot;
  const bezel=t.mat(0x1a1d22,.58,.06),metal=t.mat(0x525a63,.36,.6);
  t.box(`${name}-foot`,width*.46,.018,.16,metal,[0,.01,0],undefined,node);
  t.box(`${name}-stand`,.035,.16,.035,metal,[0,.09,-.02],undefined,node);
  t.box(`${name}-bezel`,width,height,.035,bezel,[0,.16+height/2,0],undefined,node);
  const display=t.screen(`${name}-display`,width-.035,height-.035,draw,node);display.mesh.position.copyFromFloats(0,.16+height/2,.019);
  t.sphere(`${name}-power-led`,.005,6,t.mat(0x8ad4bd,.5,0,{emissive:0x39c998,intensity:.5}),[width/2-.04,.16+.008,.021],node);
  return {node,screen:display};
}

function drawText(ctx,w,h,title,lines,accent='#8bc7c4'){
  ctx.fillStyle='#10171f';ctx.fillRect(0,0,w,h);ctx.fillStyle='#252e38';ctx.fillRect(0,0,w,48);
  ctx.fillStyle=accent;ctx.font='bold 21px sans-serif';ctx.fillText(String(title).slice(0,39),20,32);
  ctx.font='20px sans-serif';ctx.fillStyle='#e2e8f0';lines.forEach((line,index)=>ctx.fillText(String(line).slice(0,47),20,86+index*41));
}

function buildStation(t,scene,track,{parent=null,preview=false}={}){
  const root=t.group(`${track}-station`,[0,0,0],parent),metal=t.mat(0x4e5964,.4,.55),black=t.mat(0x151b21,.63,.12),plastic=t.mat(0x242a31,.7,.02),paper=t.mat(0xe9edf1,.9,0);
  buildDesk(t,root);
  const main=monitor(t,root,`${track}-main-monitor`,.68,.42,[0,.77,-.14]);
  t.box('keyboard',.44,.018,.14,plastic,[0,.792,.24],undefined,root);
  for(let row=0;row<4;row++)t.box('key-row',.4,.006,.014,t.mat(0x4a535e,.74,.02),[0,.803,.19+row*.025],undefined,root);
  t.box('mouse',.055,.025,.085,plastic,[.34,.8,.26],undefined,root);
  t.cable('monitor-signal-lead',[[0,.95,-.16],[.05,.79,-.3],[.3,.79,-.32],[.44,.79,-.2]],0x14191f,root);
  const leds=[];
  for(let i=0;i<4;i++){const material=t.mat(0x64748b,.3,.05,{unique:true,emissive:0x334155,intensity:.22});t.sphere(`status-led-${i}`,.012,8,material,[-.55+i*.07,.794,.34],root);leds.push(material);}
  let wifiDome=null,wifiAp=null,printerSheet=null,thermostat=null;const codeNodes=[];
  if(track==='network'){
    // Rack rails, blanking panels and keyed Ethernet ports remain recognizable at desk view.
    t.box('rack-back',.4,.66,.028,black,[-.65,1.11,-.33],undefined,root);
    for(const x of [-.865,-.435])t.box('rack-rail',.03,.7,.36,metal,[x,1.12,-.15],undefined,root);
    for(let row=0;row<3;row++){
      t.box('rack-appliance',.4,.1,.34,black,[-.65,.88+row*.17,-.14],undefined,root);
      t.box('rack-front-panel',.4,.095,.016,metal,[-.65,.88+row*.17,.038],undefined,root);
      for(let port=0;port<6;port++)t.box('ethernet-socket',.038,.034,.012,black,[-.798+port*.059,.88+row*.17,.052],undefined,root);
    }
    t.cable('patch-lead-blue',[[-.798,1.05,.065],[-.8,.99,.11],[-.59,.96,.11],[-.562,.88,.065]],0x2e64a5,root);
    t.cable('patch-lead-yellow',[[-.68,1.22,.065],[-.68,1.13,.13],[-.45,1.12,.12],[-.444,1.05,.065]],0xcbb574,root);
    wifiAp=t.cylinder('wireless-access-point',.075,.085,.025,20,t.mat(0xd7dde1,.45,.03),[.56,.79,.12],undefined,root);
    t.cylinder('ap-led',.012,.012,.027,12,t.mat(0x62bda9,.4,0,{emissive:0x37ae8a,intensity:.35}),[.56,.792,.12],undefined,root);
    wifiDome=t.sphere('coverage-visualization',.2,12,t.mat(0x70a8ba,.65,0,{alpha:.13,unique:true,emissive:0x256b83,intensity:.12}),[.56,.86,.12],root);wifiDome.isPickable=false;wifiDome.receiveShadows=false;
    t.box('printer-base',.34,.17,.27,t.mat(0xbcc4cb,.68,.04),[.56,.862,-.18],undefined,root);
    t.box('printer-lid',.36,.045,.29,plastic,[.56,.97,-.18],undefined,root);
    t.box('printer-output-slot',.23,.018,.015,black,[.56,.916,-.036],undefined,root);
    printerSheet=t.box('printed-sheet',.16,.005,.18,paper,[.56,.926,.015],undefined,root);
  }else if(track==='ai'||track==='security'){
    const title=track==='ai'?'AI AUDIT CHECKLIST':'DEFENSIVE SOC';
    monitor(t,root,`${track}-side-monitor`,.44,.3,[-.58,.77,-.07],.2,(ctx,w,h)=>drawText(ctx,w,h,title,track==='ai'?['Protect private data','Verify sources and fairness','Keep a human reviewer']:['Authorized practice scope','Least privilege and logs','Contain, test and explain']));
    t.box('sealed-appliance',.35,.075,.25,metal,[.58,.815,-.08],undefined,root);
    for(let port=0;port<4;port++)t.box('appliance-network-port',.041,.028,.008,black,[.47+port*.066,.82,.049],undefined,root);
    t.box('review-tablet',.22,.015,.29,black,[.58,.79,.24],[-.04,0,0],root);
    const tablet=t.screen('review-tablet-display',.195,.25,(ctx,w,h)=>drawText(ctx,w,h,track==='ai'?'HUMAN REVIEW':'SCOPE AND ACCESS',track==='ai'?['Evidence','Fairness','Decision']:['Fictional system only','Permission required','No real credentials']),root);
    tablet.mesh.position.copyFromFloats(.58,.800,.24);tablet.mesh.rotation.x=-Math.PI/2;
  }else if(track==='coding'){
    t.cylinder('thermostat-housing',.105,.105,.035,24,plastic,[.58,.8,-.04],undefined,root);
    thermostat=t.mat(0x53768d,.4,.25,{unique:true,emissive:0x29637c,intensity:.22});
    t.cylinder('thermostat-status-ring',.082,.082,.039,24,thermostat,[.58,.803,-.04],undefined,root);
    for(let i=0;i<6;i++){const material=t.mat(0x475569,.45,.16,{unique:true,emissive:0x1e293b,intensity:.15});t.box(`readiness-node-${i}`,.07,.045,.07,material,[-.73+i*.085,.8,.13],undefined,root);codeNodes.push(material);}
    t.box('sensor-controller',.22,.018,.14,t.mat(0x254e43,.72,.05),[.57,.79,.23],undefined,root);
    t.box('controller-chip',.055,.009,.055,black,[.57,.807,.23],undefined,root);
    t.cable('sensor-wire',[[.57,.81,.23],[.74,.82,.21],[.74,.81,-.04],[.65,.82,-.04]],0x98784e,root);
  }else{
    t.box('tower',.29,.43,.35,metal,[-.61,.99,-.09],undefined,root);
    t.box('front-case-panel',.28,.42,.018,black,[-.61,.99,.095],undefined,root);
    for(let i=0;i<5;i++)t.box('case-air-slot',.2,.008,.006,plastic,[-.61,.85+i*.022,.108],undefined,root);
  }
  if(preview)main.screen.redraw((ctx,w,h)=>drawText(ctx,w,h,PATHWAY_STATIONS.find(s=>s.id===track)?.short||'HARDWARE', ['Choose a ticket to investigate','All equipment here is simulated']));
  return {root,main,leds,wifiAp,wifiDome,printerSheet,thermostat,codeNodes};
}

/** Babylon owns rendering resources; the caller continues to own all lab state. */
function createPreviewRuntime(stage,doc){
  const win=doc.defaultView||globalThis,canvas=doc.createElement('canvas');canvas.className='vlab-canvas';
  canvas.style&&(canvas.style.touchAction='pan-y');
  let engine;
  try{engine=new BABYLON.Engine(canvas,false,{alpha:false,antialias:false,stencil:false,powerPreference:'low-power',preserveDrawingBuffer:false,premultipliedAlpha:false,doNotHandleTouchAction:true},false);}
  catch{return null;}
  const scene=new BABYLON.Scene(engine);scene.useRightHandedSystem=true;
  scene.clearColor=new BABYLON.Color4(.033,.045,.061,1);scene.skipPointerMovePicking=true;
  scene.detachControl();
  scene.imageProcessingConfiguration.toneMappingEnabled=true;
  scene.imageProcessingConfiguration.toneMappingType=BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure=1.05;scene.imageProcessingConfiguration.contrast=1.08;
  const camera=new BABYLON.FreeCamera('equipment-camera',new BABYLON.Vector3(0,1.85,1.55),scene);camera.fov=38*Math.PI/180;camera.minZ=.035;camera.maxZ=45;
  scene.activeCamera=camera;
  const equipment=createEquipment(scene,doc),shadows=addLighting(scene);
  stage.appendChild(canvas);
  let frame=0,disposed=false,paused=false,lost=false,visible=true,pointers=null;
  let camPos=[0,1.85,1.55],target=[0,.96,-.08];
  const enabled=()=>!disposed&&!paused&&!lost&&visible&&!doc.hidden&&!stage.closest?.('[hidden]');
  function resize(){
    const rect=stage.getBoundingClientRect?.()||{width:stage.clientWidth||640,height:stage.clientHeight||300};if(rect.width<2||rect.height<2)return false;
    const ratio=Math.min(Math.max(.25,Number(win.devicePixelRatio)||1),MAX_PIXEL_RATIO,Math.sqrt(MAX_RENDER_PIXELS/(rect.width*rect.height)));
    const width=Math.max(1,Math.floor(rect.width*ratio)),height=Math.max(1,Math.floor(rect.height*ratio));
    if(canvas.width!==width||canvas.height!==height)engine.setSize(width,height,false);
    if(canvas.style){canvas.style.width='100%';canvas.style.height='100%';}
    return true;
  }
  function draw(){frame=0;if(!enabled()||!resize())return;camera.position.copyFromFloats(...camPos);camera.setTarget(vector(target));engine.beginFrame();scene.render();engine.endFrame();}
  function schedule(){if(enabled()&&!frame)frame=win.requestAnimationFrame(draw);}
  function cancel(){pointers?.cancel();}
  function stop(){if(frame)win.cancelAnimationFrame(frame);frame=0;}
  function setView(pos,point){cancel();camPos=pos.slice();target=point.slice();schedule();}
  function zoom(direction,min=.38,max=10){cancel();const delta=camPos.map((value,i)=>value-target[i]),distance=Math.hypot(...delta);if(!distance)return;const factor=Math.max(min,Math.min(max,distance*(direction==='in'?.85:1.16)))/distance;camPos=delta.map((value,i)=>target[i]+value*factor);schedule();}
  function orbit(dx,dy){const x=camPos[0]-target[0],z=camPos[2]-target[2],angle=-dx*.007,c=Math.cos(angle),s=Math.sin(angle);camPos[0]=target[0]+x*c-z*s;camPos[2]=target[2]+x*s+z*c;camPos[1]=Math.max(target[1]+.06,Math.min(target[1]+4,camPos[1]+dy*.006));schedule();}
  function suspend(reason){if(reason==='context')lost=true;cancel();stop();}
  function restore(reason){if(reason==='context')return;schedule();}
  // The DOM restore event precedes Babylon rebuilding its GPU resources.
  // Resume only after the engine reports that its own restoration is complete.
  const contextRestored=engine.onContextRestoredObservable.add(()=>{
    lost=false;schedule();
    // Restoring the engine can start asynchronous material recompilation.
    // Request the completed image as well as the immediate restoration frame.
    scene.executeWhenReady(()=>{if(!disposed)schedule();});
  });
  function observe(){const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;observer?.observe(stage);if(!observer)win.addEventListener?.('resize',schedule);return ()=>{observer?.disconnect();if(!observer)win.removeEventListener?.('resize',schedule);};}
  const stopObserve=observe();
  function bind(onTap){pointers=bindPreviewPointers(canvas,{doc,win,enabled,onOrbit:orbit,onTap,onSuspend:suspend,onRestore:restore});}
  function setVisible(value){visible=!!value;if(!visible){cancel();stop();}else schedule();}
  function pause(){paused=true;cancel();stop();}
  function resume(){paused=false;schedule();}
  function finish(){
    for(const mesh of scene.meshes){if(mesh.name==='coverage-visualization'||mesh.name.endsWith('-display'))continue;shadows.addShadowCaster(mesh,false);}
    scene.executeWhenReady(()=>{if(!disposed)schedule();});schedule();
  }
  function dispose(){if(disposed)return;disposed=true;cancel();stop();pointers?.dispose();stopObserve();if(contextRestored)engine.onContextRestoredObservable.remove(contextRestored);shadows.dispose();equipment.dispose();scene.dispose();engine.dispose();canvas.remove?.();}
  return {scene,camera,engine,canvas,equipment,schedule,setView,zoom,bind,finish,setVisible,pause,resume,cancel,dispose,get paused(){return paused;},get disposed(){return disposed;}};
}

/** Optional legacy room view. Main lesson routes never mount a decorative hub. */
export function mountVirtualLabRoom(host,{activeTrack='all',onSelectTrack,onOpenLab}={}){
  if(!host?.ownerDocument)return null;
  const stage=host.querySelector('[data-vlab-stage]')||host,doc=host.ownerDocument,runtime=createPreviewRuntime(stage,doc);if(!runtime)return null;
  const {scene,equipment:t}=runtime;
  t.box('classroom-floor',11,.07,6,t.mat(0x353a42,.88,.02),[0,-.04,-1]);
  const stations=new Map();
  for(const station of PATHWAY_STATIONS){const equipment=buildStation(t,scene,station.id,{preview:true});equipment.root.position.copyFromFloats(...station.pos);t.tag(equipment.root,station.id);stations.set(station.id,equipment);}
  let selected=PATHWAY_STATIONS.some(station=>station.id===activeTrack)?activeTrack:'hardware';
  const overview={pos:[0,3.65,5.5],target:[0,.85,-1.25]};
  function sync(){const info=PATHWAY_STATIONS.find(station=>station.id===selected);host.querySelectorAll('[data-vlab-station]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.vlabStation===selected)));const title=host.querySelector('[data-vlab-title]'),summary=host.querySelector('[data-vlab-summary]'),links=host.querySelector('[data-vlab-links]');if(title)title.textContent=`Station ${info.number} · ${info.name}`;if(summary)summary.textContent=info.summary;if(links)links.innerHTML=info.featured.map(lab=>`<a class="vlab-ticket-pill" href="#lab/${escape(lab.id)}"><strong>${escape(lab.id)}</strong><span>${escape(lab.title)}</span><span aria-hidden="true">↗</span></a>`).join('')+`<a class="vlab-pathway-btn" href="#labs/${info.id}" data-vlab-filter="${info.id}">Filter ${info.short} pathway →</a>`;}
  function flyTo(id){if(runtime.disposed)return;if(id==='overview'){runtime.setView(overview.pos,overview.target);return;}const station=PATHWAY_STATIONS.find(station=>station.id===id);if(!station)return;selected=id;runtime.setView(station.cam.pos,station.cam.target);sync();onSelectTrack?.(id);}
  runtime.bind(event=>{const rect=runtime.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const hit=scene.pick((event.clientX-rect.left)*runtime.canvas.width/rect.width,(event.clientY-rect.top)*runtime.canvas.height/rect.height,mesh=>!!mesh.metadata?.selectId,false,runtime.camera);if(hit?.hit)flyTo(hit.pickedMesh.metadata.selectId);});
  function click(event){const filter=event.target.closest?.('[data-vlab-filter]');if(filter&&host.contains(filter))onSelectTrack?.(filter.dataset.vlabFilter,true);const button=event.target.closest?.('button');if(!button||!host.contains(button))return;if(button.dataset.vlabStation)flyTo(button.dataset.vlabStation);else if(button.dataset.vlabCam){const id=button.dataset.vlabCam;if(id==='overview')flyTo(id);else if(id==='in'||id==='out')runtime.zoom(id,.5,12);else if(id==='toggle'){runtime.paused?runtime.resume():runtime.pause();button.textContent=runtime.paused?'Resume 3D':'Pause 3D';}}else if(button.dataset.vlabOpen)onOpenLab?.(button.dataset.vlabOpen);}
  host.addEventListener('click',click);sync();const initial=PATHWAY_STATIONS.find(station=>station.id===activeTrack);runtime.setView(initial?.cam.pos||overview.pos,initial?.cam.target||overview.target);runtime.finish();
  return {flyTo,pause:runtime.pause,resume:runtime.resume,cancelInteraction:runtime.cancel,dispose(){host.removeEventListener('click',click);runtime.dispose();}};
}

/** Live read-only equipment views. Ordinary workspace controls remain authoritative. */
export function mountLabStation3D(benchColumn,{scenario,getRecord}={}){
  if(!benchColumn?.ownerDocument||!scenario||scenario.track==='hardware')return ()=>{};
  const doc=benchColumn.ownerDocument,workspace=benchColumn.querySelector('#workspace');if(!workspace)return ()=>{};
  const container=doc.createElement('section');container.className=`vlab-station-card track-${scenario.track}`;container.setAttribute('aria-label','Interactive 3D pathway station view');
  const name={network:'Network & Systems Rack',ai:'AI Evaluation & Audit Station',security:'Cybersecurity SOC Console',coding:'Coding & Physical Computing Bench'}[scenario.track]||'Practice Station';
  container.innerHTML=`<div class="vlab-station-head"><div><span class="hw-eyebrow">LIVE EQUIPMENT · ${escape(scenario.id)}</span><h3>${name}</h3></div><div class="vlab-station-controls" role="group" aria-label="3D station camera controls"><button type="button" data-station-cam="iso">Desk view</button><button type="button" data-station-cam="screen">Monitor</button><button type="button" data-station-cam="device">Equipment</button><button type="button" data-station-cam="in">Zoom +</button><button type="button" data-station-cam="out">Zoom −</button><button type="button" data-station-cam="toggle">Pause 3D</button></div></div><div class="vlab-station-stage" data-station-stage role="img" aria-label="3D equipment synchronized with the ordinary workbench controls below."></div><p class="vlab-station-caption" data-station-caption>Drag sideways to orbit. Use the workbench controls below to make and test changes.</p>`;
  benchColumn.insertBefore(container,workspace);
  const stage=container.querySelector('[data-station-stage]'),caption=container.querySelector('[data-station-caption]'),runtime=createPreviewRuntime(stage,doc);
  if(!runtime){stage.innerHTML='<div class="vlab-fallback">The 3D equipment view is unavailable here. All simulation controls and reports remain available below.</div>';return ()=>container.remove();}
  const station=buildStation(runtime.equipment,runtime.scene,scenario.track);
  const presets={iso:{pos:[0,1.85,1.55],target:[0,.96,-.08]},screen:{pos:[0,1.12,.62],target:[0,1.08,-.14]},device:{pos:[.58,1.38,.95],target:[.35,.88,-.05]}};
  let disposed=false,lastState='';
  function syncFromState(){
    const state=getRecord?.()?.state||{};
    // No redraw, texture upload, or render request for repeated unchanged records.
    const serialized=JSON.stringify(state);if(lastState===serialized)return false;lastState=serialized;
    const results=Array.isArray(state.results)?state.results:[],passed=results.filter(result=>result?.ok).length,allPass=results.length>0&&results.every(result=>result?.ok);
    station.leds.forEach((material,index)=>tint(material,allPass||index<passed?0x10b981:state.tested?0xc99849:0x64748b,allPass||index<passed?0x059669:state.tested?0x9a6c26:0x334155,.32));
    if(station.wifiAp){const centered=state.placement==='ceiling-center',clear=state.band==='5'&&state.channel==='40';station.wifiAp.position.x=centered?.46:.72;station.wifiDome.position.x=station.wifiAp.position.x;station.wifiDome.scaling.setAll(centered?1.25:.75);tint(station.wifiDome.material,clear?0x10b981:0xf59e0b,clear?0x059669:0xd97706,.12);station.printerSheet.isVisible=state.spooler==='running'&&state.queue==='resume'&&state.port==='approved'&&state.job==='release';}
    if(station.thermostat){const code=String(state.code||''),branches=/Heating/i.test(code)&&/Comfortable/i.test(code)&&/Cooling/i.test(code);tint(station.thermostat,allPass?0x10b981:branches?0x537e96:0xc99849,allPass?0x059669:branches?0x29637c:0x9a6c26,.25);}
    const output=Array.isArray(state.output)?state.output:[];station.codeNodes.forEach((material,index)=>tint(material,allPass||index<output.length?0xc8789e:0x475569,allPass||index<output.length?0x9c3e6f:0x1e293b,.25));
    station.main.screen.redraw((ctx,w,h)=>{
      let lines;
      if(scenario.track==='network')lines=[state.ip?`IPv4: ${state.ip}  GW: ${state.gateway||'-'}`:state.portVlan?`Port VLAN: ${state.portVlan} (${state.mode||'-'})`:state.placement?`AP: ${state.placement}`:state.spooler?`Spooler: ${state.spooler} · Port: ${state.port||'-'}`:`Checks run: ${state.checkRuns||0}`,state.dns?`DNS: ${state.dns}`:state.band?`Band: ${state.band} GHz · Ch: ${state.channel||'-'} (${state.width||'-'} MHz)`:state.queue?`Queue: ${state.queue} · Job: ${state.job||'-'}`:`Tested: ${state.tested?'Yes':'Pending'}`];
      else if(scenario.track==='ai')lines=[`AI audit runs: ${state.checkRuns||0}`,allPass?'Privacy, evidence and fairness checks pass':'Review prompt, sources and policy below'];
      else if(scenario.track==='security')lines=[`Scope: ${state.scope?'AUTHORIZED':'Awaiting check'}`,allPass?'Defensive controls checked':`Triage checks passing: ${passed}/${results.length||3}`];
      else lines=[`Fixture runs: ${state.checkRuns||0}`,output[0]!==undefined?`Out: ${output[0]}`:'Run program fixtures to see output'];
      drawText(ctx,w,h,`${scenario.id} · ${String(scenario.title).slice(0,28)}`,lines);
      ctx.fillStyle=allPass?'#267b61':state.tested?'#b08b4e':'#465468';ctx.fillRect(16,218,w-32,48);ctx.fillStyle='#f1f5f9';ctx.font='bold 17px sans-serif';ctx.fillText(allPass?'STATUS: CHECKS PASS · VERIFY THE TASK':state.tested?`STATUS: ${passed}/${results.length||3} CHECKS PASSING`:'STATUS: READY FOR WORKBENCH TEST',25,249);
    });
    if(caption)caption.textContent=allPass?`3D Station Status: All checks passing for ${scenario.id}. Ready to verify and explain!`:`3D Station Status: Live view synced with ${scenario.id}. Make changes below and test to update the 3D equipment.`;
    return true;
  }
  function click(event){const button=event.target.closest?.('button[data-station-cam]');if(!button||!container.contains?.(button))return;const command=button.dataset.stationCam;runtime.cancel();if(presets[command])runtime.setView(presets[command].pos,presets[command].target);else if(command==='in'||command==='out')runtime.zoom(command);else if(command==='toggle'){runtime.paused?runtime.resume():runtime.pause();button.textContent=runtime.paused?'Resume 3D':'Pause 3D';}}
  function change(event){if(disposed||event?.detail?.id&&event.detail.id!==scenario.id)return;if(syncFromState())runtime.schedule();}
  function reveal(){runtime.setVisible(!benchColumn.hidden&&!benchColumn.closest?.('[hidden]'));}
  runtime.bind();container.addEventListener('click',click);doc.addEventListener('cole:lab-state-change',change);doc.addEventListener('click',reveal);doc.addEventListener('keydown',reveal);
  syncFromState();reveal();runtime.setView(presets.iso.pos,presets.iso.target);runtime.finish();
  return ()=>{if(disposed)return;disposed=true;container.removeEventListener('click',click);doc.removeEventListener('cole:lab-state-change',change);doc.removeEventListener('click',reveal);doc.removeEventListener('keydown',reveal);runtime.dispose();container.remove();};
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
