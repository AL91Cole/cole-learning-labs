import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {routeAccess} from '../src/access-policy.js';
import {learningRoute} from '../src/learning-tools.js';
import {renderInboxDefender} from '../src/inbox-defender.js';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
test('actual game routing mounts no records or services and disposes before navigation',()=>{
  const calls={mounts:0,disposals:0,gates:0},nodes=new Map();
  const node=()=>({innerHTML:'',classList:{add(){},remove(){}},setAttribute(){}});
  const $=selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);};
  const forbidden=()=>assert.fail('Game routing reached records, reporting, collection, classroom or AI.');
  const context=vm.createContext({OWNER_PREVIEW:false,MEMBER_CONTENT:false,routeAccess,learningRoute,renderInboxDefender,
    location:{hash:'#play/inbox-defender?round=5&complete=true'},document:{body:node(),title:''},window:{scrollTo(){}},$,$$:()=>[],
    labNavigation:null,currentLab:null,routeCleanup:null,reportCleanup:null,classroomConnection:null,
    disposeHardware(){},preserveCodeDraft(){},renderSignIn:()=>'<h1>Sign in</h1>',
    mountInboxDefender(){calls.mounts++;return ()=>calls.disposals++;},
    membershipGate(){calls.gates++;return '<h1>Unavailable</h1>';},
    recordFor:forbidden,save:forbidden,bindWorkPrivacy:forbidden,mountWorkControls:forbidden,mountRequesterChat:forbidden,
    mountLabImprovements:forbidden,attachClassroomLab:forbidden,openReport:forbidden,fetch:forbidden,XMLHttpRequest:forbidden
  });
  const start=source.indexOf('function renderRoute('),end=source.indexOf('\nfunction setSiteMenuOpen(',start);
  vm.runInContext(source.slice(source.indexOf('function activityNotFound('),source.indexOf('\nfunction membershipGate(')),context);
  assert.ok(start>=0&&end>start);vm.runInContext(source.slice(start,end),context);
  context.renderRoute();assert.equal(calls.mounts,1);assert.match(nodes.get('#main').innerHTML,/01 \/ 05/);
  assert.doesNotMatch(nodes.get('#main').innerHTML,/lab-improvement-summary|work-privacy|data-requester/);
  context.location.hash='#signin';context.renderRoute();assert.equal(calls.disposals,1);
  context.location.hash='#play/inbox-defender';context.renderRoute();assert.equal(calls.mounts,2);
  context.location.hash='#play/SEC-403?member=true';context.renderRoute();assert.equal(calls.disposals,2);assert.equal(calls.gates,0);assert.match(nodes.get('#main').innerHTML,/Activity not found/u);assert.equal(calls.mounts,2);
});
