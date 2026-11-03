import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CODE_QUESTS} from '../src/code-quest-catalog.js';
import {courseLessons,courseTemplate,courseChip,checkCourse,initialCourse,courseAction,resolveCourseChip} from '../src/code-course-model.js';
import {renderCodeQuest,renderCodeQuestHub,mountCodeQuest} from '../src/code-quests.js';
import {routeAccess} from '../src/access-policy.js';
import {learningRoute} from '../src/learning-tools.js';
const answers=id=>id==='sql'?['hello','six','plus','at-least','asc','sum','name','at-least']:['hello','six','plus','at-least','three','times','one','times'];
test('twelve language paths contain 96 sequential lessons, including a distinct SQL sequence',()=>{
  assert.equal(CODE_QUESTS.length,12);assert.equal(new Set(CODE_QUESTS.map(q=>q.id)).size,12);
  assert.equal((renderCodeQuestHub().match(/href="#quests\//g)||[]).length,12);
  assert.match(courseLessons('sql')[4].title,/Order/);assert.match(courseLessons('sql')[5].title,/Summarize/);
  assert.match(courseLessons('python')[4].title,/Repeat/);assert.match(courseLessons('python')[5].title,/function/);
  for(const quest of CODE_QUESTS){assert.equal(courseLessons(quest.id).length,8);assert.equal(routeAccess(learningRoute('#quests/'+quest.id)),'public');assert.match(renderCodeQuest(quest.id),/Eight lessons/);}
  for(const hash of ['#quests/unknown','#quests/__proto__','#quests/python/skip','#quests/Python'])assert.equal(routeAccess(learningRoute(hash)),'unknown',hash);
});
for(const quest of CODE_QUESTS)test(quest.title+' teaches, checks all eight lessons and requires both project gaps',()=>{
  let state=initialCourse(quest.id);
  for(let index=0;index<8;index++){
    const lesson=courseLessons(quest.id)[index];assert.equal(state.lesson,index);assert.ok(lesson.teach.length>15&&lesson.teach.split(/\s+/).length<=30);assert.ok(lesson.example.length>8&&lesson.example.length<=120);assert.match(courseTemplate(quest.id,index),/□/);
    assert.equal(courseAction(state,'next'),state,'Unfinished lessons cannot be skipped');
    assert.equal(courseAction(state,'check').passed,false,'A blank answer cannot pass');
    for(const wrong of lesson.choices.filter(choice=>choice!==answers(quest.id)[index])){
      const result=checkCourse(quest.id,index,wrong,index===7?(quest.id==='sql'?'desc':'at-least'):undefined);assert.equal(result.ok,false,quest.id+' lesson '+index+' wrong '+wrong);
    }
    if(index>=5){state=courseAction(state,'type',{first:courseChip(quest.id,answers(quest.id)[index]),second:index===7?(quest.id==='sql'?'DESC':'>='):''});}
    else state=courseAction(state,'choose',answers(quest.id)[index]);
    if(index===7)assert.equal(checkCourse(quest.id,index,state.choice,null).ok,false);
    state=courseAction(state,'check');assert.equal(state.passed,true,state.output);assert.equal(courseAction(state,'choose','bye'),state);state=courseAction(state,'next');
  }
  assert.equal(state.finished,true);assert.deepEqual(courseAction(state,'restart'),initialCourse(quest.id));
});
test('later typed fragments are bounded literal choices; executable or HTML-shaped text has no authority',async()=>{
  for(const id of CODE_QUESTS.map(q=>q.id))for(const text of ['<img src=x onerror=alert(1)>','fetch("/")','__proto__','while(true){}','x'.repeat(161)])assert.equal(resolveCourseChip(id,5,text),null);
  assert.equal(resolveCourseChip('python',5,' * '),'times');assert.equal(resolveCourseChip('sql',7,' DESC ',true),'desc');
  assert.equal(resolveCourseChip('sql',5,'sum'),'sum');assert.equal(resolveCourseChip('sql',7,'desc',true),'desc');
  assert.equal(initialCourse('__proto__'),null);assert.equal(checkCourse('unknown',0,'hello').ok,false);
  const state=initialCourse('python');for(const action of ['complete','grade','member','save','execute'])assert.equal(courseAction(state,action,'hello'),state);
  for(const file of ['code-course-model.js','code-quests.js']){const source=await readFile(new URL('../src/'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/\b(?:eval|Function|fetch|XMLHttpRequest|WebSocket|setInterval)\s*\(|\b(?:localStorage|sessionStorage|document\.cookie)\b/);}
});
test('the practical helper checks equality and an insufficient-budget case; SQL checks filtering and ordering together',()=>{
  assert.match(checkCourse('python',7,'times','at-least').output,/budget 6 → Ready/);assert.match(checkCourse('python',7,'times','at-least').output,/budget 8 → Save more/);
  assert.equal(checkCourse('python',7,'times','greater').ok,false);assert.equal(checkCourse('python',7,'plus','at-least').ok,false);
  assert.equal(checkCourse('sql',7,'at-least','desc').output,'Pip\nLuna');assert.equal(checkCourse('sql',7,'at-least','asc').ok,false);assert.equal(checkCourse('sql',7,'greater','desc').ok,false);
});
function fixture(id){
  const listeners=new Map(),live={textContent:''};let buttons=[],inputs=[],html='';const code={textContent:''};
  const host={set innerHTML(value){html=value;buttons=[...value.matchAll(/<button\b([^>]*)>/g)].map(([,attrs])=>{const node={dataset:{cq:attrs.match(/data-cq="([^"]+)"/)?.[1],value:attrs.match(/data-value="([^"]+)"/)?.[1]},disabled:/ disabled/.test(attrs),focus(){}};node.closest=()=>node;return node;});inputs=[...value.matchAll(/<input\b([^>]*)>/g)].map(([,attrs])=>({value:attrs.match(/value="([^"]*)"/)?.[1]||'',second:attrs.includes('data-cq-second'),matches:()=>true}));},get innerHTML(){return html;},contains:node=>buttons.includes(node)||inputs.includes(node),querySelector:selector=>selector==='[data-cq-first]'?inputs.find(i=>!i.second):selector==='[data-cq-second]'?inputs.find(i=>i.second):selector==='[data-cq-snippet]'?code:{focus(){}},querySelectorAll:()=>buttons,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type);},replaceChildren(){html='';buttons=[];inputs=[];}};
  host.innerHTML=renderCodeQuest(id);return {root:{querySelector:selector=>selector==='[data-cq-board]'?host:live},host,live,code,listeners,button:(action,value)=>buttons.find(b=>b.dataset.cq===action&&b.dataset.value===value),click:button=>listeners.get('click')?.({target:button}),type(value,second=false){const input=inputs.find(i=>i.second===second);input.value=value;listeners.get('input')?.({target:input});}};
}
test('the controller progresses from chips to typed function practice and handles typed markup as text',()=>{
  const f=fixture('python'),cleanup=mountCodeQuest(f.root,{id:'python'});
  for(const choice of answers('python').slice(0,5)){f.click(f.button('choose',choice));f.click(f.button('check'));assert.match(f.host.innerHTML,/Next small win/);f.click(f.button('next'));}
  assert.match(f.host.innerHTML,/data-cq-first/);assert.doesNotMatch(f.host.innerHTML,/data-cq="choose"/);
  f.type('<img src=x onerror=alert(1)>');assert.match(f.code.textContent,/<img src=x/);assert.doesNotMatch(f.host.innerHTML,/<img src=x/);f.click(f.button('check'));assert.match(f.host.innerHTML,/&lt;img src=x/);assert.doesNotMatch(f.host.innerHTML,/cq-pass/);
  f.type('*');f.click(f.button('check'));assert.match(f.host.innerHTML,/cq-pass/);const stale=f.button('next');cleanup();cleanup();assert.equal(f.listeners.size,0);f.click(stale);assert.equal(f.host.innerHTML,'');
});
