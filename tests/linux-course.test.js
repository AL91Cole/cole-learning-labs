import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LINUX_COURSE,linuxLab,nextLinuxLab} from '../src/linux-catalog.js';
import {renderLinuxCourse,mountLinuxCourse,linuxStepText,currentLinuxStep} from '../src/linux-course.js?release=20261107-tech-team';
import {renderLinuxEntry} from '../src/home-entries.js?release=20261107-tech-team';
import {routeAccess} from '../src/access-policy.js?release=20261107-tech-team';
import {learningRoute} from '../src/learning-routes.js?release=20261107-tech-team';
import {remoteLabFor} from '../src/lab-remote.js?release=20261107-tech-team';
import {PUBLIC_SOURCE_FILES} from '../scripts/build.mjs';

// A small stand-in for the page: named nodes that remember their HTML and listeners.
function page(){
  const nodes=new Map();
  const node=name=>{if(!nodes.has(name)){const listeners={};nodes.set(name,{name,innerHTML:'',textContent:'',dataset:{},listeners,addEventListener:(type,handler)=>{listeners[type]=handler;},querySelector:()=>null});}return nodes.get(name);};
  return {node,root:{querySelector:selector=>node(selector)}};
}
const steps=(...done)=>done.map((completed,index)=>({id:'s'+index,title:'Step title '+index,description:'Type `cmd'+index+'` now',hint:'Hint '+index,completed}));
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));

test('the course lists five free beginner labs in order',()=>{
  assert.deepEqual(LINUX_COURSE.map(lab=>lab.id),['LNX-101','LNX-102','LNX-103','LNX-104','LNX-105']);
  assert.equal(linuxLab('LNX-103').title,'Read and Edit Text Files');
  assert.equal(linuxLab('NET-201'),null);assert.equal(linuxLab(undefined),null);
  assert.equal(nextLinuxLab('LNX-101').id,'LNX-102');assert.equal(nextLinuxLab('LNX-105'),null);
  for(const lab of LINUX_COURSE){
    assert.ok(Object.isFrozen(lab)&&Object.isFrozen(lab.skills));
    assert.equal(remoteLabFor(lab),lab.id,'the real-machine service is asked for the same id');
    assert.equal(routeAccess(learningRoute('#linux/'+lab.id)),'public');
  }
  assert.equal(routeAccess(learningRoute('#linux')),'public');
  assert.equal(routeAccess(learningRoute('#linux/LNX-999')),'unknown');
  assert.equal(routeAccess(learningRoute('#linux/LNX-101/extra')),'unknown');
  assert.equal(routeAccess(learningRoute('#linux/NET-203')),'unknown','the course route never opens a member lab');
});

test('the course page, a lab page and the entry card render escaped, linked markup',()=>{
  const index=renderLinuxCourse(undefined);
  for(const lab of LINUX_COURSE){assert.ok(index.includes('href="#linux/'+lab.id+'"'));assert.ok(index.includes(lab.title.replaceAll('&','&amp;')));}
  assert.match(index,/data-linux-availability role="status"/);
  const lab=renderLinuxCourse('LNX-102');
  assert.match(lab,/data-linux-lab="LNX-102"/);assert.match(lab,/<h1>LNX-102 · Make, Copy, Move and Delete<\/h1>/);
  assert.match(lab,/href="#linux\/LNX-103">Next lab/);assert.match(lab,/data-linux-step aria-live="polite"/);assert.match(lab,/data-linux-stage/);
  assert.match(renderLinuxCourse('LNX-105'),/href="#labs">All labs/);
  assert.equal(renderLinuxCourse('LNX-999'),index,'an unknown id shows the course page');
  assert.match(renderLinuxEntry(),/5 beginner labs · Free/);assert.match(renderLinuxEntry(),/href="#linux"/);
  assert.equal(linuxStepText('Type `ls -l <dir>` & press Enter'),'Type <code>ls -l &lt;dir&gt;</code> &amp; press Enter');
  assert.equal(currentLinuxStep(steps(true,false,false)),1);assert.equal(currentLinuxStep(steps(true,true)),1);assert.equal(currentLinuxStep([]),0);
});

test('a lab page mounts the real machine, follows the steps and reports completion once',async()=>{
  const {node,root}=page(),calls=[];let state={phase:'idle',milestones:[],complete:false},context=null,disposed=0,finished=[];
  const cleanup=mountLinuxCourse(root,{id:'LNX-101',probe:async()=>'enabled',hosts:id=>id==='LNX-101',render:lab=>{calls.push('render '+lab.id);return '<div data-lab-remote></div>';},
    mount:(stage,options)=>{context=options;calls.push('mount');return {remoteState:()=>state,dispose:()=>{disposed++;}};},onComplete:id=>finished.push(id)});
  await flush();
  const strip=node('[data-linux-step]'),progress=node('[data-linux-progress]');
  assert.deepEqual(calls,['render LNX-101','mount']);
  assert.equal(node('[data-linux-stage]').innerHTML,'<div data-lab-remote></div>');
  assert.equal(context.scenario.id,'LNX-101');assert.equal(context.checksOpen,false);assert.equal(context.verifyEveryMs,6000);
  assert.match(strip.innerHTML,/Press <b>Start machine<\/b>/);
  state={phase:'starting',milestones:[],complete:false};context.onActivity();assert.match(strip.innerHTML,/starting\. This takes about half a minute/);
  state={phase:'ready',milestones:steps(false,false,false),complete:false};context.onActivity();
  assert.match(strip.innerHTML,/Step 1 of 3<\/span> <b>Step title 0\.<\/b> Type <code>cmd0<\/code> now/);assert.match(strip.innerHTML,/<summary>Hint<\/summary><p>Hint 0<\/p>/);
  assert.equal(progress.textContent,'0 of 3 steps done');
  state={phase:'ready',milestones:steps(true,false,false),complete:false};context.onActivity();
  assert.match(strip.innerHTML,/Step 2 of 3/);assert.equal(progress.textContent,'1 of 3 steps done');
  // Stepping back to re-read keeps that step on screen while later checks arrive.
  const click=attribute=>strip.listeners.click({target:{closest:()=>({hasAttribute:name=>name===attribute})}});
  click('data-linux-prev');assert.match(strip.innerHTML,/is-done">✓ Step 1 of 3/);
  click('data-linux-prev');assert.match(strip.innerHTML,/Step 1 of 3/,'never before the first step');
  click('data-linux-next');click('data-linux-next');assert.match(strip.innerHTML,/Step 3 of 3/);
  state={phase:'ready',milestones:steps(true,true,false),complete:false};context.onActivity();assert.match(strip.innerHTML,/Step 3 of 3/);
  state={phase:'ready',milestones:steps(true,true,true),complete:true};context.onActivity();context.onActivity();
  assert.match(strip.innerHTML,/Lab complete\./);assert.match(strip.innerHTML,/href="#linux\/LNX-102">Go to LNX-102 · Make, Copy, Move and Delete/);
  assert.deepEqual(finished,['LNX-101']);
  cleanup();assert.equal(disposed,1);
});

test('without the lab server the page says so, starts nothing and can try again',async()=>{
  const {node,root}=page();let answers=['unavailable','enabled'],mounted=0,forced=[];
  const cleanup=mountLinuxCourse(root,{id:'LNX-104',probe:async options=>{forced.push(Boolean(options?.force));return answers.shift();},hosts:()=>true,render:()=>'<div data-lab-remote></div>',mount:()=>{mounted++;return {remoteState:()=>({phase:'idle',milestones:[],complete:false}),dispose(){}};}});
  await flush();
  assert.equal(mounted,0);
  assert.match(node('[data-linux-step]').innerHTML,/practice computers are not available right now/);
  assert.match(node('[data-linux-stage]').innerHTML,/Who May Read, Write and Run/);assert.match(node('[data-linux-stage]').innerHTML,/<code>chmod<\/code>/);
  node('[data-linux-retry]').listeners.click();await flush();
  assert.equal(mounted,1);assert.deepEqual(forced,[false,true]);
  cleanup();
  // A server that is up but does not host the lab yet is treated the same way.
  const other=page();let count=0;
  mountLinuxCourse(other.root,{id:'LNX-105',probe:async()=>'enabled',hosts:()=>false,render:()=>'',mount:()=>{count++;return {};}})();
  await flush();assert.equal(count,0);
});

test('the course page reports whether practice computers are ready',async()=>{
  for(const [state,hosted,expected,flag] of [['enabled',true,/are ready/,'ready'],['unavailable',true,/not available right now/,'unavailable'],['enabled',false,/not available right now/,'unavailable']]){
    const {node,root}=page();
    const cleanup=mountLinuxCourse(root,{id:undefined,probe:async()=>state,hosts:()=>hosted});
    await flush();
    assert.match(node('[data-linux-availability]').textContent,expected);assert.equal(node('[data-linux-availability]').dataset.state,flag);cleanup();
  }
});

test('the route is wired into the app, the build list and the styles',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),css=readFileSync(new URL('../src/lab-remote.css',import.meta.url),'utf8');
  assert.match(app,/linux:\{pages:\['linux'\],load:\(\)=>import\('\.\/lazy-linux\.js\?release=20261107-tech-team'\)/);
  assert.match(app,/if\(page==='linux'\)routeCleanup=mountLinuxCourse\(\$\('#main'\),\{id,showNotice\}\);/);
  for(const file of ['src/lazy-linux.js','src/linux-catalog.js','src/linux-course.js'])assert.ok(PUBLIC_SOURCE_FILES.includes(file),file);
  assert.match(css,/\.linux-lab\{[^}]*height:100dvh/);
  assert.match(css,/body:has\(\.linux-lab\) \.access-tools\{[^}]*top:3px/,'the floating buttons stay off the Linux screen');
});
