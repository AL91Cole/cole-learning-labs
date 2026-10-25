import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SCENARIOS} from '../src/scenarios.js';
import {SANDBOX_STARTERS} from '../src/coding-sandbox.js';
import {LESSON_GRADES,LESSON_CATEGORIES,LESSON_PRACTICE_LINKS,READY_LESSON_PLANS,filterLessonPlans,normalizeLessonPlan,hasLessonPlanWork,clearLessonPlanWork,lessonPlanDraft,savedLessonPlans,startLessonPlan,updateLessonPlanDraft,discardLessonPlanDraft,saveLessonPlan,removeLessonPlan,lessonPlanText,lessonPlanPreview,renderLessonPlans,mountLessonPlans} from '../src/lesson-plans.js';

test('ready plans cover each secondary grade and category with distinct classroom tasks',()=>{
 assert.equal(READY_LESSON_PLANS.length,30);
 const titles=new Set(),goals=new Set(),assessments=new Set();
 for(const grade of LESSON_GRADES)for(const category of LESSON_CATEGORIES){
  const matches=filterLessonPlans({grade,category:category.id});assert.equal(matches.length,1);
  const p=matches[0];assert.ok(Object.isFrozen(p));assert.ok(p.materials.includes('virtual controls'));
  assert.equal([...p.sequence.matchAll(/^(\d+) min/gm)].reduce((n,row)=>n+Number(row[1]),0),p.duration);
  assert.match(p.sequence,/Build and test/);assert.match(p.sequence,/Compare/);
  const route=p.link.slice(1).split('/');
  if(['lab','practice'].includes(route[0]))assert.ok(SCENARIOS.some(s=>s.id===route[1].split('?')[0]),p.link);
  else if(route[0]==='sandbox')assert.ok(SANDBOX_STARTERS.some(s=>s.id===route[1]),p.link);
  else assert.equal(p.link,'#studio/network');
  titles.add(p.title);goals.add(p.goals);assessments.add(p.assessment);
 }
 assert.equal(titles.size,30);assert.equal(goals.size,30);assert.equal(assessments.size,30);
 assert.equal(filterLessonPlans({grade:'all',category:'coding'}).length,6);
 assert.equal(filterLessonPlans({grade:7,category:'all'}).length,5);
 assert.equal(filterLessonPlans({grade:999}).length,0);
 assert.equal(new Set(LESSON_GRADES.map(g=>filterLessonPlans({grade:g})[0].support)).size,6);
});

test('lesson task links match the actual source, threshold and security board controls',()=>{
 const plan=(grade,category)=>filterLessonPlans({grade,category})[0];
 assert.equal(plan(9,'ai').link,'#practice/AI-304');
 assert.equal(plan(10,'ai').link,'#practice/AI-305');assert.match(plan(10,'ai').goals,/source material/);
 assert.equal(plan(11,'ai').link,'#practice/AI-306');assert.match(plan(11,'ai').goals,/threshold/);
 assert.equal(plan(8,'security').link,'#practice/SEC-403');
 assert.equal(plan(9,'security').link,'#practice/SEC-402');
 assert.equal(plan(10,'security').link,'#practice/SEC-405');
 assert.equal(plan(11,'security').link,'#practice/SEC-406');
 assert.equal(plan(12,'security').link,'#practice/SEC-404');assert.match(plan(12,'security').goals,/recovery request/);
 assert.match(plan(10,'network').sequence,/50 hosts/);assert.match(plan(10,'network').sequence,/neighbor areas/);
 assert.equal(plan(7,'coding').link,'#sandbox/tiles');
});

test('plan normalizer bounds fields, rejects arbitrary routes and does not execute host coercion',()=>{
 let called=0;const host={valueOf(){called++;throw new Error('never');},toString(){called++;throw new Error('never');}};
 const input={grade:host,duration:Symbol('duration'),category:'constructor',title:'x'.repeat(1000),link:'javascript:alert(1)',sequence:'a\r\nb\u0000\u202ec'};
 Object.defineProperty(input,'goals',{get(){called++;throw new Error('never');}});
 const p=normalizeLessonPlan(input);
 assert.equal(called,0);assert.equal(p.grade,7);assert.equal(p.duration,40);assert.equal(p.category,'hardware');assert.equal(p.link,'');assert.equal(p.title.length,100);assert.equal(p.goals,'');assert.equal(p.sequence,'a\nbc');
 assert.equal(normalizeLessonPlan({grade:'12',duration:'60'}).grade,12);
 assert.equal(filterLessonPlans({grade:host}).length,0);assert.equal(called,0);
});

test('cloning and editing never modify a ready plan, and every custom draft participates in clearing',()=>{
 clearLessonPlanWork();renderLessonPlans();assert.equal(hasLessonPlanWork(),false);
 const source=READY_LESSON_PLANS[0],original=source.title;
 startLessonPlan(source.id);assert.equal(hasLessonPlanWork(),true);
 updateLessonPlanDraft({title:'My classroom lesson'});assert.equal(source.title,original);
 const copy=lessonPlanDraft();copy.title='external mutation';assert.equal(lessonPlanDraft().title,'My classroom lesson');
 assert.throws(()=>startLessonPlan(READY_LESSON_PLANS[1].id),/Save your current draft/);
 const id=saveLessonPlan();assert.equal(savedLessonPlans().length,1);
 updateLessonPlanDraft({title:'Revised classroom lesson'});assert.equal(saveLessonPlan(),id);assert.equal(savedLessonPlans().length,1);
 const saved=savedLessonPlans();saved[0].title='external mutation';assert.equal(savedLessonPlans()[0].title,'Revised classroom lesson');
 discardLessonPlanDraft();assert.equal(hasLessonPlanWork(),true);assert.equal(lessonPlanDraft().title,'');
 startLessonPlan(id);assert.equal(lessonPlanDraft().title,'Revised classroom lesson');
 assert.equal(removeLessonPlan(id),true);assert.equal(savedLessonPlans().length,0);assert.equal(lessonPlanDraft().title,'Revised classroom lesson');
 assert.notEqual(saveLessonPlan(),id);
 clearLessonPlanWork();assert.equal(hasLessonPlanWork(),false);assert.equal(savedLessonPlans().length,0);assert.equal(lessonPlanDraft().sequence,'');
 updateLessonPlanDraft({title:'Unsaved idea'});assert.equal(hasLessonPlanWork(),true);clearLessonPlanWork();assert.equal(hasLessonPlanWork(),false);
});

test('saved custom plans require a teachable core and remain bounded to twenty copies',()=>{
 clearLessonPlanWork();assert.throws(()=>saveLessonPlan(),/learning goal/);assert.equal(savedLessonPlans().length,0);
 for(let i=0;i<20;i++){startLessonPlan(READY_LESSON_PLANS[i].id);updateLessonPlanDraft({title:'Plan '+i});saveLessonPlan();}
 startLessonPlan(READY_LESSON_PLANS[20].id);assert.throws(()=>saveLessonPlan(),/20 plans/);assert.equal(savedLessonPlans().length,20);
 removeLessonPlan(savedLessonPlans()[0].id);saveLessonPlan();assert.equal(savedLessonPlans().length,20);
 clearLessonPlanWork();
});

test('custom lesson text stays literal in editable fields, previews and plain text exports',()=>{
 clearLessonPlanWork();startLessonPlan(READY_LESSON_PLANS[0].id);
 const payload='</textarea><ScRiPt>alert(1)</ScRiPt><img src=x onerror="alert(1)">';
 updateLessonPlanDraft({title:payload,sequence:payload,link:'https://unreviewed.example/'});saveLessonPlan();
 const html=renderLessonPlans(),preview=lessonPlanPreview(lessonPlanDraft()),text=lessonPlanText(lessonPlanDraft());
 for(const rendered of [html,preview]){assert.doesNotMatch(rendered,/<script\b|<img\b/i);assert.match(rendered,/&lt;ScRiPt&gt;/);}
 assert.ok(text.includes(payload));assert.ok(!text.includes('unreviewed.example'));
 assert.ok(html.includes('type="text"'));assert.ok(html.includes('data-plan-discard'));assert.ok(html.includes('data-plan-clear'));
 clearLessonPlanWork();
});


test('custom practice chooser includes all reviewed investigations, basics and project starters',()=>{
 const choices=LESSON_PRACTICE_LINKS.map(p=>p.link);assert.equal(new Set(choices).size,choices.length);
 for(const scenario of SCENARIOS){assert.ok(choices.includes('#lab/'+scenario.id));if(['network','ai','security'].includes(scenario.track))assert.ok(choices.includes('#practice/'+scenario.id));}
 for(const category of LESSON_CATEGORIES)assert.ok(choices.includes('#learn/'+category.id));
 for(const starter of SANDBOX_STARTERS)assert.ok(choices.includes('#sandbox/'+starter.id));
 assert.ok(choices.includes('#studio/coding'));assert.ok(choices.includes('#studio/network'));
 assert.ok(LESSON_PRACTICE_LINKS.every(p=>p.title.length>10&&!p.title.startsWith('#')));
 const plan=normalizeLessonPlan({link:'#learn/security'});assert.equal(plan.link,'#learn/security');
 assert.equal(normalizeLessonPlan({link:'#lab/INC-999'}).link,'');assert.equal(normalizeLessonPlan({link:'#learn/security?student=real'}).link,'');
});

function fixture(){
 const nodes=new Map(),listeners=new Map();
 const find=key=>{if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',open:false,focus(){}});return nodes.get(key);};
 const host={querySelector:find,querySelectorAll:()=>[],contains:()=>true,addEventListener(type,fn,options){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push({fn,signal:options.signal});}};
 const root={querySelector:key=>key==='.lesson-plan-bank'?host:null,addEventListener(){}};
 const send=(type,target)=>Promise.all((listeners.get(type)||[]).filter(listener=>!listener.signal.aborted).map(listener=>listener.fn({target,preventDefault(){}})));
 const button=(attribute,value='')=>({closest(){return this;},hasAttribute:name=>name===attribute,getAttribute:name=>name===attribute?value:null});
 return {root,host,find,send,button};
}

test('editor events update the preview and preserve custom plans across remounts until cleared',()=>{
 clearLessonPlanWork();const f=fixture(),dispose=mountLessonPlans(f.root);
 f.send('click',f.button('data-plan-clone'));
 assert.equal(hasLessonPlanWork(),true);assert.equal(f.find('[data-plan-field="title"]').value,READY_LESSON_PLANS[0].title);
 f.send('input',{value:'My interactive lesson',getAttribute:key=>key==='data-plan-field'?'title':null});
 assert.match(f.find('[data-plan-preview]').innerHTML,/My interactive lesson/);
 f.send('submit',{matches:selector=>selector==='[data-plan-form]'});
 assert.equal(savedLessonPlans()[0].title,'My interactive lesson');assert.match(f.find('[data-plan-status]').textContent,/saved in this page/);
 dispose();assert.equal(savedLessonPlans().length,1);
 const g=fixture(),second=mountLessonPlans(g.root);
 g.send('click',g.button('data-plan-clear'));assert.equal(savedLessonPlans().length,0);assert.equal(hasLessonPlanWork(),false);assert.equal(g.find('[data-plan-field="title"]').value,'');
 second();f.send('input',{value:'Disposed event',getAttribute:()=> 'title'});assert.equal(hasLessonPlanWork(),false);
 assert.equal(typeof mountLessonPlans(null),'function');assert.equal(typeof mountLessonPlans({querySelector:()=>null,addEventListener(){}}),'function');
});

test('lesson planner has no provider, persistent storage or dynamic code execution',async()=>{
 const source=await readFile(new URL('../src/lesson-plans.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|eval|Function)\s*[.(]/);
 assert.match(source,/createTextReport\(lessonPlanText\(shown\)\)/);
 assert.match(source,/controller\.abort\(\);urls\.clear\(\)/);
});


test('copy and download keep the current displayed plan in a static plain-text artifact',async t=>{
 clearLessonPlanWork();const f=fixture();let link,blob,copied='';
 f.root.ownerDocument={createElement(){return link={click(){this.clicked=true;},remove(){this.removed=true;}};}};f.host.append=()=>{};
 const clipboard=Object.getOwnPropertyDescriptor(globalThis.navigator,'clipboard');
 Object.defineProperty(globalThis.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text;}}});
 t.after(()=>{clearLessonPlanWork();if(clipboard)Object.defineProperty(globalThis.navigator,'clipboard',clipboard);else delete globalThis.navigator.clipboard;});
 t.mock.method(URL,'createObjectURL',value=>{blob=value;return 'blob:lesson-export';});
 const dispose=mountLessonPlans(f.root);t.after(dispose);
 await f.send('click',f.button('data-plan-clone'));
 await f.send('input',{value:'Fictional <b>network</b> lesson',getAttribute:key=>key==='data-plan-field'?'title':null});
 await f.send('click',f.button('data-plan-copy'));assert.ok(copied.includes('Fictional <b>network</b> lesson'));assert.ok(copied.includes('Learning goal')||copied.includes('Goal'));
 await f.send('click',f.button('data-plan-download'));
 assert.equal(blob.type,'text/plain;charset=utf-8');assert.equal((await blob.text()).replace(/\r\n/g,'\n'),copied);
 assert.equal(link.download,'cole-learning-labs-lesson-plan.txt');assert.equal(link.clicked,true);assert.equal(link.removed,true);
 assert.match(f.find('[data-plan-status]').textContent,/Download requested/);
});


test('removing a saved plan restores keyboard focus to a remaining plan or the clear control',async()=>{
 clearLessonPlanWork();startLessonPlan(READY_LESSON_PLANS[0].id);const first=saveLessonPlan();
 startLessonPlan(READY_LESSON_PLANS[1].id);const second=saveLessonPlan();
 const f=fixture(),dispose=mountLessonPlans(f.root);let focused='';
 f.find('[data-plan-edit]').focus=()=>{focused='saved';};f.find('[data-plan-clear]').focus=()=>{focused='clear';};
 await f.send('click',f.button('data-plan-remove',first));assert.equal(focused,'saved');assert.equal(savedLessonPlans().length,1);
 f.host.querySelector=selector=>selector==='[data-plan-edit]'?null:f.find(selector);
 await f.send('click',f.button('data-plan-remove',second));assert.equal(focused,'clear');assert.equal(savedLessonPlans().length,0);
 dispose();clearLessonPlanWork();
});
