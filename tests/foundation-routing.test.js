import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {SCENARIOS} from '../src/scenarios.js';
import {FOUNDATION_LABS,getFoundation,createFoundationRecord,applyFoundationAction,foundationSummary,foundationReport} from '../src/foundation-model.js';
import {learningRoute} from '../src/learning-tools.js';

const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
function extract(start,end){const from=source.indexOf(start),to=source.indexOf(end,from);assert.ok(from>=0&&to>from);return source.slice(from,to);}
function fixture(){
  const calls={mounts:[],disposals:0,reports:[],unload:0},events=new Map();
  const elements=new Map();
  function node(){return {innerHTML:'',value:'',classList:{add(){},remove(){}},setAttribute(){},addEventListener(name,fn){this[name]=fn;},close(){},replaceChildren(){this.innerHTML='';}};}
  const $=selector=>{if(!elements.has(selector))elements.set(selector,node());return elements.get(selector);};
  const context=vm.createContext({SCENARIOS,FOUNDATION_LABS,getFoundation,createFoundationRecord,foundationSummary,foundationReport,learningRoute,
    foundationRecords:Object.create(null),location:{hash:'#learn/hardware'},currentLab:null,labNavigation:null,routeCleanup:null,reportCleanup:null,classroomConnection:null,
    document:{body:{classList:{add(){},remove(){}}},title:''},window:{scrollTo(){},addEventListener(name,fn){events.set(name,fn);}},
    $,$$:()=>[],disposeHardware(){},preserveCodeDraft(){},hasCodeDraft:()=>false,workStorage:{persistent:true},store:{labs:{}},
    renderFoundationLab:(lab,record)=>`<section>${lab.code} ${record.labId}</section>`,
    mountFoundationLab(root,options){calls.mounts.push(options);return {dispose(){calls.disposals++;},cancelInteraction(){}};},
    openReport(...args){calls.reports.push(args);},routeLink:(route,label)=>`<a href="#${route}">${label}</a>`});
  vm.runInContext(extract('function foundationRecordFor(','\nlet storageAvailable='),context);
  vm.runInContext(extract('function renderRoute(','\n$(\'#menu-toggle\').addEventListener'),context);
  vm.runInContext(source.split('\n').find(line=>line.startsWith("window.addEventListener('beforeunload'")),context);
  vm.runInContext(source.split('\n').find(line=>line.startsWith("window.addEventListener('pagehide'")),context);
  return {context,calls,events,elements,render(id){context.location.hash='#learn/'+id;context.renderRoute();return calls.mounts.at(-1);}};
}

test('five beginner routes keep the established investigation catalog and next tickets intact',()=>{
  assert.equal(SCENARIOS.length,32);
  assert.deepEqual(FOUNDATION_LABS.map(lab=>lab.id),['hardware','network','ai','security','coding']);
  const f=fixture();
  for(const lab of FOUNDATION_LABS){
    const options=f.render(lab.id);assert.equal(options.lab,lab);assert.equal(options.record.labId,lab.id);
    assert.ok(SCENARIOS.some(ticket=>ticket.id===lab.nextLab));
    assert.match(f.context.document.title,new RegExp(lab.code));
  }
  assert.equal(f.calls.disposals,4,'Changing topic disposes the previous visual/controller.');
});

test('foundation progress survives site routes and code aliases use the same page-memory record',()=>{
  const f=fixture(),options=f.render('hardware');
  const next=applyFoundationAction('hardware',options.record,{type:'inspect',item:'ram'}).state;
  options.onChange(next);f.render('network');const returned=f.render('HW-100');
  assert.equal(returned.record,next);assert.deepEqual(returned.record.explored,['ram']);
  assert.deepEqual(Object.keys(f.context.store.labs),[],'Beginner work must not enter the assignment or device-saving collection.');
});

test('foundation reports use the existing reviewed export handoff with the latest work',()=>{
  const f=fixture(),options=f.render('network');
  options.onChange(applyFoundationAction('network',options.record,{type:'inspect',item:'switch'}).state);options.onReport();
  const [meta,,content]=f.calls.reports[0];assert.equal(meta.id,'NET-200');assert.match(content,/Network switch/);assert.match(content,/IN PROGRESS/);
  assert.ok(content.includes(foundationReport('network',f.context.foundationRecords.network)));
});

test('private beginner work gets an unload warning even when investigation device saving is enabled',()=>{
  const f=fixture(),options=f.render('hardware');let prevented=0;
  const fire=()=>{const event={preventDefault(){prevented++;}};f.events.get('beforeunload')(event);return event;};
  fire();assert.equal(prevented,0,'Prepared equipment is not learner work.');
  options.onChange(applyFoundationAction('hardware',options.record,{type:'inspect',item:'ram'}).state);
  const event=fire();assert.equal(prevented,1);assert.equal(event.returnValue,'');
  f.events.get('pagehide')();assert.deepEqual(Object.keys(f.context.foundationRecords),[],'Page-only beginner records clear regardless of other saving choices.');
  assert.equal(f.elements.get('#main').innerHTML,'','Cached page markup must also discard private beginner work when ticket saving is enabled.');
});

test('unknown and prototype-shaped beginner routes cannot mount a lab',()=>{
  const f=fixture();for(const id of ['__proto__','constructor','NO-999','']){
    f.render(id);assert.equal(f.calls.mounts.length,0);assert.match(f.elements.get('#main').innerHTML,/Choose a beginner lab/);
  }
});
