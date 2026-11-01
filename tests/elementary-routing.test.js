import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {learningRoute} from '../src/learning-tools.js';
import {routeAccess,ELEMENTARY_LAB_IDS} from '../src/access-policy.js';

const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
function fixture(){
  const calls={catalogues:[],rendered:[],mounted:[],disposed:[],gates:[]},events=new Map(),nodes=new Map();
  const node=()=>({innerHTML:'',classList:{add(){},remove(){}},setAttribute(){},replaceChildren(){this.innerHTML='';}});
  const $=selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);};
  const forbidden=()=>assert.fail('Elementary routes must not mount reporting, cloud replies, collection, classroom connections or device-saving controls.');
  const context=vm.createContext({MEMBER_CONTENT:false,routeAccess,learningRoute,ELEMENTARY_LABS:ELEMENTARY_LAB_IDS.map(id=>({id,title:'Activity '+id})),
    location:{hash:'#explore'},document:{body:node(),title:''},window:{scrollTo(){},addEventListener:(name,listener)=>events.set(name,listener)},$,$$:()=>[],
    labNavigation:null,currentLab:null,routeCleanup:null,reportCleanup:null,classroomConnection:null,
    store:{labs:{}},foundationRecords:{},practiceStates:{},workStorage:{persistent:true},labView:null,
    disposeHardware(){},preserveCodeDraft(){},resetLabImprovements(){},resetRequesterPreference(){},
    initialNetworkStudioState:()=>({}),initialCodingStudioState:()=>({}),clearCodingSandboxWork(){},clearLessonPlanWork(){},
    renderElementaryCatalogue(options){calls.catalogues.push(structuredClone(options));return '<h1>Choose an activity</h1>';},
    renderElementaryLab(id){calls.rendered.push(id);return '<h1>'+id+'</h1>';},
    mountElementaryLab(_root,{id}){calls.mounted.push(id);return {dispose(){calls.disposed.push(id);}};},
    membershipGate(route,{unknown}){calls.gates.push({id:route.id,unknown});return '<h1>Activity unavailable</h1>';},
    recordFor:forbidden,save:forbidden,bindWorkPrivacy:forbidden,mountWorkControls:forbidden,mountRequesterChat:forbidden,
    mountLabImprovements:forbidden,attachClassroomLab:forbidden,openReport:forbidden,fetch:forbidden,XMLHttpRequest:forbidden
  });
  const start=source.indexOf('function renderRoute('),end=source.indexOf("\n$('#menu-toggle').addEventListener",start);
  assert.ok(start>=0&&end>start);vm.runInContext(source.slice(start,end),context);
  vm.runInContext(source.split('\n').find(line=>line.startsWith("window.addEventListener('pagehide'")),context);
  return {context,calls,events,nodes,render(hash){context.location.hash=hash;context.renderRoute();}};
}

test('each public elementary route mounts only its own activity and disposes before the next route',()=>{
  const f=fixture();
  for(const id of ELEMENTARY_LAB_IDS){
    f.render('#explore/'+id);assert.equal(f.calls.rendered.at(-1),id);assert.equal(f.calls.mounted.at(-1),id);
    assert.match(f.context.document.title,new RegExp(id));
    assert.doesNotMatch(f.nodes.get('#main').innerHTML,/lab-improvement-summary|work-privacy|requester|report/iu);
  }
  assert.deepEqual(f.calls.disposed,ELEMENTARY_LAB_IDS.slice(0,-1));
  assert.deepEqual(f.context.store.labs,{});assert.deepEqual(f.context.foundationRecords,{});assert.deepEqual(f.context.practiceStates,{});
  f.render('#explore');assert.equal(f.calls.disposed.length,15);assert.equal(f.calls.mounted.length,15);
  assert.equal(f.calls.catalogues.length,1);assert.deepEqual(f.calls.gates,[]);
});

test('grade-band catalogue routes retain only authored choices and never create activity records',()=>{
  const f=fixture();
  for(const [code,band]of [['k1','K–1'],['2-3','2–3'],['4-6','4–6']]){
    f.render('#explore?band='+code+'&name=PRIVATE_MARKER');assert.deepEqual(f.calls.catalogues.at(-1),{band});
  }
  assert.equal(f.calls.mounted.length,0);assert.deepEqual(f.context.store.labs,{});
  assert.doesNotMatch(JSON.stringify(f.calls),/PRIVATE_MARKER|name/u);
});

test('unknown or extended elementary URLs remain closed without mounting or rendering a real activity',()=>{
  const f=fixture();
  for(const hash of ['#explore/INC-101','#explore/EX-HW-0','#explore/EX-HW-1/extra','#explore/ex-hw-1','#explore/EX%2DHW%2D1'])f.render(hash);
  assert.equal(f.calls.gates.length,5);assert.ok(f.calls.gates.every(call=>call.unknown));
  assert.deepEqual(f.calls.mounted,[]);assert.deepEqual(f.calls.rendered,[]);assert.deepEqual(f.calls.catalogues,[]);
});

test('document exit disposes the mounted elementary controller and clears its rendered activity',()=>{
  const f=fixture();f.render('#explore/EX-HW-1');f.events.get('pagehide')();
  assert.deepEqual(f.calls.disposed,['EX-HW-1']);assert.equal(f.context.routeCleanup,null);assert.equal(f.nodes.get('#main').innerHTML,'');
  f.render('#explore/EX-HW-1');assert.deepEqual(f.calls.mounted,['EX-HW-1','EX-HW-1']);
});
