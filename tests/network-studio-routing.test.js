import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {initialNetworkStudioState,applyNetworkStudioAction,networkStudioHasWork} from '../src/network-studio-model.js';
import {learningRoute} from '../src/learning-tools.js';
import {routeAccess} from '../src/access-policy.js';
import {CATALOG} from '../src/lab-catalog.js';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const route=source.slice(source.indexOf('function renderRoute('),source.indexOf("\n$('#menu-toggle').addEventListener"));
function harness(){
 const events=new Map(),nodes=new Map(),calls={mounts:[],disposed:0};
 const $=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',value:'',classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},replaceChildren(){this.innerHTML='';}});return nodes.get(selector);};
 // This is the protected member studio, not the reduced public application.
 const context=vm.createContext({MEMBER_CONTENT:true,routeAccess,CATALOG,networkStudioState:initialNetworkStudioState(),networkStudioHasWork,initialNetworkStudioState,codingStudioState:{},initialCodingStudioState:()=>({}),codingStudioHasWork:()=>false,practiceStates:{},practiceHasWork:()=>false,practiceScenarioFor:()=>null,foundationRecords:{},hasFoundationWork:()=>false,hasPrivateWork:()=>false,hasCodeDraft:()=>false,hasLessonPlanWork:()=>false,clearLessonPlanWork(){},hasCodingSandboxWork:()=>false,resetLabImprovements(){},mountLabImprovements(){return()=>{};},resetRequesterPreference(){},clearCodingSandboxWork(){},
 location:{hash:'#studio/network'},learningRoute,currentLab:null,labNavigation:null,routeCleanup:null,reportCleanup:null,classroomConnection:null,store:{labs:{}},workStorage:{persistent:true},
 document:{title:'',body:{classList:{add(){},remove(){}}}},window:{scrollTo(){},addEventListener(name,fn){events.set(name,fn);}},$,$$:()=>[],disposeHardware(){},preserveCodeDraft(){},
 renderNetworkStudio:()=>'<section>Editable network</section>',mountNetworkStudio(root,options){calls.mounts.push(options);return ()=>calls.disposed++;},renderCodingStudio:()=>'<section>Coding studio</section>',mountCodingStudio:()=>()=>{},
 });
 vm.runInContext(route,context);
 for(const event of ['beforeunload','pagehide'])vm.runInContext(source.split('\n').find(line=>line.startsWith("window.addEventListener('"+event+"'")),context);
 return {context,events,nodes,calls,render(hash='#studio/network'){context.location.hash=hash;context.renderRoute();return calls.mounts.at(-1);}};
}
test('network builder route preserves graph edits across navigation and disposes old animations',()=>{
 const h=harness(),first=h.render(),initial=first.getState();
 const edited=applyNetworkStudioAction(initial,'add-device',{type:'printer'}).state;first.onChange(edited);
 h.render('#studio/coding');assert.equal(h.calls.disposed,1);
 const returned=h.render();assert.equal(returned.getState(),edited);assert.ok(networkStudioHasWork(returned.getState()));
 assert.deepEqual(Object.keys(h.context.store.labs),[],'Creative layouts never become graded records or classroom uploads.');
 assert.match(h.context.document.title,/Network Studio/);
});
test('network edits warn on reload and pagehide clears private layouts and animation controller',()=>{
 const h=harness(),options=h.render();let warnings=0;
 const fire=()=>h.events.get('beforeunload')({preventDefault(){warnings++;}});
 fire();assert.equal(warnings,0);
 options.onChange(applyNetworkStudioAction(options.getState(),'add-device',{type:'server'}).state);fire();assert.equal(warnings,1);
 h.events.get('pagehide')();assert.equal(h.calls.disposed,1);assert.deepEqual(h.context.networkStudioState,initialNetworkStudioState());
 assert.equal(h.nodes.get('#main').innerHTML,'');
});
