import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {learningRoute} from '../src/learning-tools.js';

const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
function fixture(){
  const events=new Map(),calls={renders:[],mounts:[],disposed:0,cleared:0},node={innerHTML:'',classList:{add(){},remove(){}},setAttribute(){},replaceChildren(){}};
  const context=vm.createContext({learningRoute,location:{hash:'#sandbox/rover'},document:{body:node,title:''},window:{scrollTo(){},addEventListener:(type,fn)=>events.set(type,fn)},$:()=>node,$$:()=>[],disposeHardware(){},preserveCodeDraft(){},SCENARIOS:[],store:{labs:{}},workStorage:{persistent:true},foundationRecords:{},labNavigation:null,labView:null,routeCleanup:null,reportCleanup:null,classroomConnection:null,currentLab:null,
    renderCodingSandbox(options){calls.renders.push(options.starterId);return '<h1>Sandbox</h1>';},mountCodingSandbox(_root,options){calls.mounts.push(options.starterId);return ()=>calls.disposed++;},clearCodingSandboxWork(){calls.cleared++;},hasCodingSandboxWork:()=>true,hasFoundationWork:()=>false,hasCodeDraft:()=>false,
    home:()=>'',projectPage:()=>'',about:()=>'',library:()=>'',educators:()=>'',guide:()=>'<h1>Guide</h1>',connect:()=>'',privacy:()=>'',mountLabTutorial:()=>()=>{},tracks:{},hasPrivateWork:()=>false});
  const from=source.indexOf('function renderRoute('),to=source.indexOf("\n$('#menu-toggle').addEventListener",from);
  vm.runInContext(source.slice(from,to),context);
  for(const name of ['beforeunload','pagehide'])vm.runInContext(source.split('\n').find(line=>line.startsWith(`window.addEventListener('${name}'`)),context);
  return {context,calls,events,node};
}

test('sandbox routes mount free code without a ticket record and dispose before leaving',()=>{
  const h=fixture();h.context.renderRoute();
  assert.deepEqual(h.calls.renders,['rover']);assert.deepEqual(h.calls.mounts,['rover']);
  assert.equal(h.context.currentLab,null);assert.equal(Object.keys(h.context.store.labs).length,0);
  h.context.location.hash='#guide';h.context.renderRoute();
  assert.equal(h.calls.disposed,1);assert.equal(h.calls.cleared,0,'Ordinary navigation retains sandbox drafts.');
  h.events.get('pagehide')();assert.equal(h.calls.cleared,1,'Leaving the document clears page-memory code.');
});

test('sandbox drafts receive an unload warning even when investigation device saving is enabled',()=>{
  const h=fixture(),event={prevented:false,preventDefault(){this.prevented=true;}};
  h.events.get('beforeunload')(event);assert.equal(event.prevented,true);assert.equal(event.returnValue,'');
});
