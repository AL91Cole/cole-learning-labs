import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as BABYLON from '../src/babylon.js';
import { SCENARIOS } from '../src/scenarios.js';
import { initialWorkspaceState, applyWorkspaceAction } from '../src/workspaces.js';

const source=readFileSync(new URL('../src/virtual-lab-scene.js',import.meta.url),'utf8');
assert.match(source,/^import \* as BABYLON from '\.\/babylon\.js\?release=[^']+';/);

function events(){const handlers=new Map();return {handlers,addEventListener(name,fn){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);},removeEventListener(name,fn){handlers.get(name)?.delete(fn);if(!handlers.get(name)?.size)handlers.delete(name);},emit(name,event={}){for(const fn of [...handlers.get(name)||[]])fn(event);}};}
function fixture({id='NET-204',width=640,height=300,dpr=1.5,unavailable=false,hub=false}={}){
  const frames=new Map(),engines=[],scenes=[],observers=[],ready=[],draws=[],textureUpdates=[];let frameId=0,container=null,state=initialWorkspaceState(id),captured=null;
  const win={...events(),devicePixelRatio:dpr,requestAnimationFrame(fn){const id=++frameId;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
  const contexts=[];
  function canvas(){const ctx={texts:[],fillRect(){},clearRect(){},save(){},restore(){},setTransform(){},fillText(text){this.texts.push(String(text));}};contexts.push(ctx);const node={...events(),style:{},width:0,height:0,getContext:type=>type==='2d'?ctx:null,getBoundingClientRect:()=>({left:0,top:0,width,height}),setPointerCapture(id){captured=id;},hasPointerCapture:id=>captured===id,releasePointerCapture(){captured=null;},remove(){this.parent?.children.splice(this.parent.children.indexOf(this),1);}};return node;}
  function stage(){return {children:[],innerHTML:'',closest:()=>null,getBoundingClientRect:()=>({width,height}),appendChild(node){this.children.push(node);node.parent=this;}};}
  const hubStage=stage(),fields={'[data-vlab-title]':{textContent:''},'[data-vlab-summary]':{textContent:''},'[data-vlab-links]':{innerHTML:''}};
  const doc={...events(),hidden:false,defaultView:win,createElement(tag){if(tag==='canvas')return canvas();const stationStage=stage(),caption={textContent:''};return {...events(),className:'',innerHTML:'',setAttribute(){},contains:()=>true,querySelector:selector=>selector==='[data-station-stage]'?stationStage:selector==='[data-station-caption]'?caption:null,remove(){container=null;},stage:stationStage,caption};}};
  class TestEngine extends BABYLON.NullEngine{
    constructor(canvas){if(unavailable)throw new Error('No graphics context');super({renderWidth:1,renderHeight:1,textureSize:512,deterministicLockstep:false});this._renderingCanvas=canvas;engines.push(this);}
    setSize(w,h){this._options.renderWidth=w;this._options.renderHeight=h;this._renderingCanvas.width=w;this._renderingCanvas.height=h;}
    updateDynamicTexture(texture,canvas,invertY,...rest){textureUpdates.push({texture,invertY});return super.updateDynamicTexture(texture,canvas,invertY,...rest);}
  }
  class TestScene extends BABYLON.Scene{
    constructor(engine){super(engine);scenes.push(this);}
    render(...args){draws.push(this);return super.render(...args);}
    executeWhenReady(callback){ready.push(callback);}
  }
  const namespace=new Proxy(BABYLON,{get(target,name){return name==='Engine'?TestEngine:name==='Scene'?TestScene:target[name];}});
  const exports=vm.runInNewContext(source.replace(/^import[^\n]+\n/,'').replaceAll('export function ','function ')+';({mountVirtualLabRoom,mountLabStation3D,renderVirtualLabHubMarkup,bindPreviewPointers,PATHWAY_STATIONS});',{BABYLON:namespace,ResizeObserver:class{constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}},Math,JSON,Number,String,Array,Object,Set,Map,RegExp});
  const workspace={},host={...events(),ownerDocument:doc,hidden:false,closest:()=>null,contains:()=>true,querySelector:selector=>selector==='#workspace'?workspace:selector==='[data-vlab-stage]'?hubStage:fields[selector]||null,querySelectorAll:()=>[],insertBefore(node,target){assert.equal(target,workspace);container=node;}};
  const scenario=SCENARIOS.find(item=>item.id===id),selected=[];
  const cleanup=hub?null:exports.mountLabStation3D(host,{scenario,getRecord:()=>({state})});
  const room=hub?exports.mountVirtualLabRoom(host,{activeTrack:'hardware',onSelectTrack:id=>selected.push(id)}):null;
  return {exports,host,doc,win,frames,engines,scenes,observers,ready,draws,textureUpdates,contexts,fields,selected,room,get state(){return state;},set state(value){state=value;},get container(){return container;},get canvas(){return hub?hubStage.children[0]:container?.stage.children[0];},flush(){const queue=[...frames.values()];frames.clear();for(const fn of queue)fn();},change(event={detail:{id}}){doc.emit('cole:lab-state-change',event);},control(command){const button={dataset:{stationCam:command},closest(){return this;},textContent:''};container.emit('click',{target:button});return button;},dispose(){cleanup?.();room?.dispose();}};
}

test('native Babylon station API keeps optional hub controls and actual catalog titles',()=>{
  const f=fixture({unavailable:true}),html=f.exports.renderVirtualLabHubMarkup('network');
  for(const station of f.exports.PATHWAY_STATIONS){assert.ok(html.includes(`data-vlab-station="${station.id}"`));for(const featured of station.featured)assert.equal(featured.title,SCENARIOS.find(s=>s.id===featured.id)?.title);}
  assert.ok(html.includes('data-vlab-station="network" aria-pressed="true"'));assert.ok(html.includes('data-vlab-cam="overview"'));f.dispose();
});

test('every used station constructs real Babylon meshes, PBR surfaces and local dynamic screens',()=>{
  for(const id of ['NET-204','AI-301','SEC-401','CODE-501']){
    const f=fixture({id});f.flush();const scene=f.scenes[0];assert.equal(scene.useRightHandedSystem,true);assert.ok(scene.activeCamera instanceof BABYLON.FreeCamera);
    assert.ok(scene.meshes.length>25);assert.ok(scene.meshes.length<=120,'each workstation keeps a bounded procedural draw-object budget');assert.ok(scene.meshes.reduce((sum,mesh)=>sum+mesh.getTotalIndices()/3,0)<20000,'original station geometry remains lightweight');assert.ok(scene.meshes.every(mesh=>mesh instanceof BABYLON.Mesh));assert.ok(scene.materials.every(material=>material instanceof BABYLON.PBRMaterial));assert.ok(scene.textures.some(texture=>texture instanceof BABYLON.DynamicTexture));assert.ok(f.contexts.some(ctx=>ctx.texts.some(text=>text.includes(id))));assert.equal(f.draws.length,1);assert.equal(f.frames.size,0);
    f.dispose();assert.equal(scene.isDisposed,true);assert.equal(f.engines[0].isDisposed,true);assert.equal(f.container,null);assert.ok(f.observers.every(observer=>observer.disconnected));assert.equal(f.doc.handlers.size,0);assert.equal(f.win.handlers.size,0);
  }
});

test('state changes update actual network equipment and check captions without awarding task verification',()=>{
  const f=fixture();f.flush();const scene=f.scenes[0],ap=scene.getMeshByName('wireless-access-point'),coverage=scene.getMeshByName('coverage-visualization');
  assert.equal(ap.position.x,.72);assert.equal(coverage.scaling.x,.75);
  f.state=applyWorkspaceAction('NET-204',f.state,'save-expanded',{placement:'ceiling-center',band:'5',channel:'40',width:'20'}).state;
  f.state=applyWorkspaceAction('NET-204',f.state,'run-check').state;const before=JSON.stringify(f.state);f.change();f.flush();
  assert.equal(ap.position.x,.46);assert.equal(coverage.scaling.x,1.25);assert.match(f.container.caption.textContent,/All checks passing for NET-204/);assert.equal(JSON.stringify(f.state),before);assert.ok(f.contexts.some(ctx=>ctx.texts.includes('STATUS: CHECKS PASS · VERIFY THE TASK')));assert.doesNotMatch(f.container.caption.textContent,/task verified/i);
  const renders=f.draws.length,textCount=f.contexts.reduce((sum,ctx)=>sum+ctx.texts.length,0);f.change();f.flush();assert.equal(f.draws.length,renders);assert.equal(f.contexts.reduce((sum,ctx)=>sum+ctx.texts.length,0),textCount);f.dispose();
});

test('canvas monitors upload with the native Babylon vertical orientation and charcoal uses linear PBR colors',()=>{
  const f=fixture();f.flush();assert.ok(f.textureUpdates.length>0);assert.ok(f.textureUpdates.every(update=>update.invertY===true),'canvas text must not be uploaded upside down');
  const keyboard=f.scenes[0].getMeshByName('keyboard');assert.ok(keyboard.material.albedoColor.r<.05,'sRGB charcoal must be converted before use as a linear PBR input');f.dispose();
});

test('printer output, coding sensor and readiness nodes react only to real workspace fields',()=>{
  const network=fixture({id:'NET-203'});network.flush();const sheet=network.scenes[0].getMeshByName('printed-sheet');assert.equal(sheet.isVisible,false);
  network.state={...network.state,spooler:'running',queue:'resume',port:'approved',job:'release'};network.change();assert.equal(sheet.isVisible,true);network.dispose();
  const coding=fixture({id:'CODE-503'});coding.flush();const node=coding.scenes[0].getMeshByName('readiness-node-0'),initial=node.material.albedoColor.clone();coding.state={...coding.state,output:['Ready'],results:[]};coding.change();assert.notDeepEqual(node.material.albedoColor.asArray(),initial.asArray());coding.dispose();
});

test('pixel ratio and actual render dimensions remain within the 900k budget on tablets and large displays',()=>{
  for(const [width,height,dpr] of [[390,340,3],[1366,768,3],[4000,3000,2]]){
    const f=fixture({width,height,dpr});f.flush();const pixels=f.canvas.width*f.canvas.height;assert.ok(pixels<=900000,`${pixels} pixels`);assert.ok(f.canvas.width<=width*1.5);assert.equal(f.engines[0].getRenderWidth(),f.canvas.width);assert.equal(f.engines[0].getRenderHeight(),f.canvas.height);assert.equal(f.canvas.style.touchAction,'pan-y');f.dispose();
  }
});

test('render requests coalesce, settle idle, and redraw once when initial shaders become ready',()=>{
  const f=fixture();assert.equal(f.frames.size,1);f.observers[0].callback();f.observers[0].callback();assert.equal(f.frames.size,1);f.flush();assert.equal(f.frames.size,0);
  f.ready[0]();assert.equal(f.frames.size,1);f.flush();assert.equal(f.frames.size,0);assert.equal(f.draws.length,2);f.dispose();f.ready[0]();assert.equal(f.frames.size,0);
});

test('explicit pause survives page visibility changes, while hide cancels scheduled work',()=>{
  const f=fixture();f.flush();const button=f.control('toggle');assert.equal(button.textContent,'Resume 3D');f.doc.hidden=true;f.doc.emit('visibilitychange');f.doc.hidden=false;f.doc.emit('visibilitychange');assert.equal(f.frames.size,0);f.ready[0]();assert.equal(f.frames.size,0);
  f.control('toggle');assert.equal(f.frames.size,1);f.host.hidden=true;f.doc.emit('click');assert.equal(f.frames.size,0);f.host.hidden=false;f.doc.emit('click');assert.equal(f.frames.size,1);f.flush();f.dispose();
});

test('camera buttons change only the camera, keep finite bounded zoom and cancel transient gestures',()=>{
  const f=fixture();f.flush();const before=JSON.stringify(f.state);for(let i=0;i<80;i++){f.control('in');f.flush();}const camera=f.scenes[0].activeCamera;assert.ok(camera.position.length()>0);assert.ok(Number.isFinite(camera.position.x));for(let i=0;i<80;i++){f.control('out');f.flush();}assert.ok(camera.position.length()<12);f.control('screen');f.flush();assert.equal(camera.position.z,.62);assert.equal(JSON.stringify(f.state),before);assert.equal(f.frames.size,0);f.dispose();
});

test('context loss pauses pending work and restoration cannot resume an explicitly paused station',()=>{
  const f=fixture();f.flush();f.control('in');let prevented=false;f.canvas.emit('webglcontextlost',{preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(f.frames.size,0);f.canvas.emit('webglcontextrestored');assert.equal(f.frames.size,0,'DOM restoration must wait for Babylon resource restoration');f.engines[0].onContextRestoredObservable.notifyObservers(f.engines[0]);assert.equal(f.frames.size,1);f.flush();f.control('toggle');f.canvas.emit('webglcontextlost',{preventDefault(){}});f.canvas.emit('webglcontextrestored');f.engines[0].onContextRestoredObservable.notifyObservers(f.engines[0]);assert.equal(f.frames.size,0);f.dispose();
});

test('restored asynchronous shaders redraw after the first frame while respecting hidden, pause and dispose guards',()=>{
  const f=fixture();f.flush();
  const restore=()=>{f.canvas.emit('webglcontextlost',{preventDefault(){}});f.engines[0].onContextRestoredObservable.notifyObservers(f.engines[0]);return f.ready.at(-1);};
  const compiled=restore();assert.equal(f.ready.length,2);assert.equal(f.frames.size,1);f.flush();const renders=f.draws.length;assert.equal(f.frames.size,0);compiled();assert.equal(f.frames.size,1);f.flush();assert.equal(f.draws.length,renders+1);assert.equal(f.frames.size,0);
  const hiddenReady=restore();f.doc.hidden=true;f.doc.emit('visibilitychange');hiddenReady();assert.equal(f.frames.size,0);f.doc.hidden=false;f.doc.emit('visibilitychange');f.flush();
  const pausedReady=restore();f.control('toggle');pausedReady();assert.equal(f.frames.size,0);f.control('toggle');f.flush();
  const disposedReady=restore(),callbacks=f.ready.length;f.dispose();disposedReady();assert.equal(f.frames.size,0);f.engines[0].onContextRestoredObservable.notifyObservers(f.engines[0]);assert.equal(f.ready.length,callbacks,'the disposed adapter no longer observes engine restoration');
});

test('optional room uses real Babylon picking and disposes all owned scene resources',()=>{
  const f=fixture({hub:true});f.flush();assert.ok(f.room);assert.match(f.fields['[data-vlab-title]'].textContent,/Station 01/);const scene=f.scenes[0];assert.equal(scene.useRightHandedSystem,true);
  const target=scene.meshes.find(mesh=>mesh.name==='front-case-panel'&&mesh.metadata?.selectId==='hardware');target.computeWorldMatrix(true);
  const point=BABYLON.Vector3.Project(target.getAbsolutePosition(),BABYLON.Matrix.Identity(),scene.getTransformMatrix(),scene.activeCamera.viewport.toGlobal(f.canvas.width,f.canvas.height)),rect=f.canvas.getBoundingClientRect();
  const event={pointerId:1,pointerType:'mouse',button:0,target:f.canvas,clientX:point.x*rect.width/f.canvas.width,clientY:point.y*rect.height/f.canvas.height};f.canvas.emit('pointerdown',event);f.canvas.emit('pointerup',event);assert.deepEqual(f.selected,['hardware'],'a real Babylon ray hit selects the authored station');
  f.room.flyTo('security');f.flush();assert.deepEqual(f.selected,['hardware','security']);assert.match(f.fields['[data-vlab-links]'].innerHTML,/SEC-401/);
  const meshes=[...f.scenes[0].meshes],materials=[...f.scenes[0].materials],textures=[...f.scenes[0].textures];assert.ok(meshes.length>150);f.dispose();assert.ok(meshes.every(mesh=>mesh.isDisposed()));assert.ok(materials.every(material=>!material.getScene()?.materials.includes(material)));assert.ok(textures.every(texture=>!texture.getScene()?.textures.includes(texture)));assert.equal(f.canvas,undefined);assert.equal(f.doc.handlers.size,0);
});

test('graphics initialization failure keeps the native simulation and readable fallback intact',()=>{
  const f=fixture({unavailable:true});assert.ok(f.container.stage.innerHTML.includes('All simulation controls and reports remain available'));assert.equal(f.engines.length,0);assert.equal(f.frames.size,0);assert.equal(f.doc.handlers.size,0);f.dispose();assert.equal(f.container,null);
});

test('unrelated scenario events do not upload textures or render the active station',()=>{
  const f=fixture();f.flush();f.state={...f.state,tested:true};f.change({detail:{id:'NET-205'}});assert.equal(f.frames.size,0);assert.equal(f.draws.length,1);f.dispose();
});

test('only local Babylon is imported, without another 3D renderer, default environment downloads or persistence APIs',()=>{
  assert.doesNotMatch(source,/\bTHREE\b|three\.module|three\.core|runRenderLoop|createDefaultEnvironment|attachControl\(|\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b|https?:\/\//);
  assert.match(source,/scene\.detachControl\(\)/);assert.match(source,/scene\.useRightHandedSystem=true/);assert.match(source,/scene\.executeWhenReady/);assert.match(source,/new BABYLON\.Engine/);assert.match(source,/new BABYLON\.PBRMaterial/);
});

function pointerFixture(){const f=fixture({unavailable:true}),canvas={...events(),setPointerCapture(id){this.capture=id;this.captures++;},hasPointerCapture(id){return this.capture===id;},releasePointerCapture(){this.capture=null;this.releases++;},captures:0,releases:0},doc={...events(),hidden:false},win=events();let orbits=0,taps=0,enabled=true;const controller=f.exports.bindPreviewPointers(canvas,{doc,win,enabled:()=>enabled&&!doc.hidden,onOrbit(){orbits++;},onTap(){taps++;},onSuspend(){},onRestore(){}});const event=(x=0,y=0,id=1)=>({pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,target:canvas});return {canvas,doc,win,controller,event,setEnabled(value){enabled=value;},get orbits(){return orbits;},get taps(){return taps;},dispose(){controller.dispose();f.dispose();}};}

test('vertical touch scrolling is never captured and canceled or second-pointer gestures cannot select',()=>{
  const f=pointerFixture();f.canvas.emit('pointerdown',f.event());f.canvas.emit('pointermove',f.event(2,30));f.canvas.emit('pointerup',f.event(2,30));assert.equal(f.canvas.captures,0);assert.equal(f.orbits,0);assert.equal(f.taps,0);
  f.canvas.emit('pointerdown',f.event());f.canvas.emit('pointermove',f.event(30,2));assert.equal(f.canvas.captures,1);f.canvas.emit('pointercancel',f.event(30,2));f.canvas.emit('pointerup',f.event(30,2));assert.equal(f.canvas.releases,1);assert.equal(f.taps,0);
  f.canvas.emit('pointerdown',f.event());f.canvas.emit('pointerdown',f.event(10,10,2));f.canvas.emit('pointerup',f.event());assert.equal(f.taps,0);f.dispose();assert.equal(f.canvas.handlers.size+f.doc.handlers.size+f.win.handlers.size,0);
});

test('preview gestures cancel on hidden pages, context loss, Escape, blur and outside release',()=>{
  const f=pointerFixture(),start=()=>{f.canvas.emit('pointerdown',f.event());f.canvas.emit('pointermove',f.event(30,2));},finish=()=>{f.canvas.emit('pointerup',f.event(30,2));assert.equal(f.taps,0);};
  start();f.doc.hidden=true;f.doc.emit('visibilitychange');finish();f.doc.hidden=false;start();f.canvas.emit('webglcontextlost',{preventDefault(){}});finish();start();f.doc.emit('keydown',{key:'Escape'});finish();start();f.win.emit('blur');finish();start();f.doc.emit('pointerup',{...f.event(),target:{}});finish();start();f.setEnabled(false);f.canvas.emit('pointermove',f.event(40,2));finish();assert.equal(f.canvas.releases,f.canvas.captures);f.dispose();
});
