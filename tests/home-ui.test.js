import {SANDBOX_STARTERS} from '../src/coding-sandbox.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {SCENARIOS} from '../src/scenarios.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';

const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const esc=value=>String(value??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tracks=Object.fromEntries([...new Set(SCENARIOS.map(s=>s.track))].map(track=>[track,{name:track,short:track,color:track,description:track}]));
const cut=(start,end)=>{const first=source.indexOf(start),last=source.indexOf(end,first);assert.ok(first>=0&&last>first);return source.slice(first,last);};
class Control{
  constructor(dataset={}){this.dataset=dataset;this.listeners=new Map();this.attributes={};this.hidden=false;this.textContent='';this.innerHTML='';this.focused=0;const classes=new Set();this.classList={toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)};}
  addEventListener(name,callback){this.listeners.set(name,callback);}
  setAttribute(name,value){this.attributes[name]=value;}
  click(){this.listeners.get('click')?.({target:this});}
  focus(){this.focused++;}
}
function harness(){
  const hero=['video','power','keyboard'].map(heroCheck=>new Control({heroCheck}));
  const guardian=['before','after'].map(guardianView=>new Control({guardianView}));
  const elements=new Map(['#hero-demo-feedback','#guardian-before','#guardian-after','#guardian-demo-feedback','#lab-count','#lab-results','#clear-filters','#grade-filter','#duration-filter','#lab-search'].map(id=>[id,new Control()]));
  const pathwayButtons=['all',...Object.keys(tracks)].map(track=>new Control({track}));
  elements.get('#guardian-after').hidden=true;
  const record={state:{pcOn:false},events:[],verified:false,closed:false},store={labs:{'INC-101':record}},before=structuredClone(store);
  let renders=0;
  const forbidden=()=>assert.fail('Public previews must not create lab records, change equipment, save progress, or call a network service.');
  const context=vm.createContext({SANDBOX_STARTERS,SCENARIOS,FOUNDATION_LABS,tracks,esc,store,countComplete:()=>0,
    $:selector=>{assert.ok(elements.has(selector),selector);return elements.get(selector);},
    $$:selector=>{if(selector==='[data-hero-check]')return hero;if(selector==='[data-guardian-view]')return guardian;if(selector==='.track-filters [data-track]')return pathwayButtons;assert.fail(selector);},
    recordFor:forbidden,save:forbidden,applyHardwareAction:forbidden,applyWorkspaceAction:forbidden,fetch:forbidden,XMLHttpRequest:forbidden,
    history:{replaceState(){}},renderRoute(){renders++;}
  });
  vm.runInContext("let libraryTrack='all',libraryGrade='all',libraryMinutes='all',libraryQuery='';\n"+cut('function routeLink(','\nfunction about(')+'\n'+cut('function library(','\nfunction labPage('),context);
  return {context,hero,guardian,pathwayButtons,elements,store,before,get renders(){return renders;},filter({track='all',grade='all',minutes='all',query=''}={}){context.filterValues={track,grade,minutes,query};vm.runInContext('libraryTrack=filterValues.track;libraryGrade=filterValues.grade;libraryMinutes=filterValues.minutes;libraryQuery=filterValues.query;labCards();',context);return [...elements.get('#lab-results').innerHTML.matchAll(/href="#lab\/([A-Z]+-\d+)"/gu)].map(match=>match[1]);}};
}

test('the homepage explains its counts, real privacy boundaries, and manual report handoff',()=>{
  const h=harness(),html=h.context.home();
  assert.match(html,new RegExp(`<b>${FOUNDATION_LABS.length+SCENARIOS.length}</b><span>learning activities`));
  assert.match(html,new RegExp(`<b>${FOUNDATION_LABS.length}</b><span>starter modules`));
  assert.match(html,new RegExp(`<b>${SCENARIOS.length}</b><span>ticket investigations`));
  for(const copy of ['No account required for public labs','Practice stays on this device','School IT review available','Built-in replies remain available','downloaded reports','approved LMS'])assert.ok(html.includes(copy),copy);
  assert.match(html,/preview your report.*\.txt.*review it for personal information.*upload/iu);
  assert.doesNotMatch(html,/zero PII|FERPA.compliant|COPPA.compliant|automatically.*Google Classroom|guaranteed school approval/iu);
  assert.deepEqual(h.store,h.before);
});

test('all three native preview buttons give relevant immediate observations without touching a lab record',()=>{
  const h=harness(),html=h.context.home();h.context.bindHome();
  for(const label of ['Check video cable','Test wall outlet','Swap keyboard'])assert.ok(html.includes(label));
  assert.equal((html.match(/<button type="button" data-hero-check=/gu)||[]).length,3);
  assert.match(html,/id="hero-demo-feedback"[^>]*role="status"/u);assert.match(html,/href="#lab\/INC-101"/u);
  h.hero[0].click();assert.match(h.elements.get('#hero-demo-feedback').textContent,/motherboard.*graphics card/iu);
  h.hero[1].click();assert.match(h.elements.get('#hero-demo-feedback').textContent,/already have power/iu);
  h.hero[2].click();assert.match(h.elements.get('#hero-demo-feedback').textContent,/does not carry the picture/iu);
  assert.deepEqual(h.hero.map(button=>button.attributes['aria-pressed']),['false','false','true']);
  assert.deepEqual(h.store,h.before);assert.equal(h.renders,0);
});

test('Guardian before and after is reversible, accessible, and uses inert example text with no destination link',()=>{
  const h=harness(),html=h.context.guardianDemo();h.context.bindHome();
  assert.match(html,/guardian-before.*guardian-after/su);assert.match(html,/id="guardian-after"[^>]*hidden/u);
  assert.equal((html.match(/<button type="button" data-guardian-view=/gu)||[]).length,2);
  assert.match(html,/No links are opened or scanned/u);assert.match(html,/<code>login\.school-check\.invalid<\/code>/u);
  assert.doesNotMatch(html,/<a\b|<form\b|<iframe\b|<script\b|https?:\/\//iu);
  h.guardian[1].click();assert.equal(h.elements.get('#guardian-before').hidden,true);assert.equal(h.elements.get('#guardian-after').hidden,false);
  assert.deepEqual(h.guardian.map(button=>button.attributes['aria-pressed']),['false','true']);assert.match(h.elements.get('#guardian-demo-feedback').textContent,/warning signs/iu);
  h.guardian[0].click();assert.equal(h.elements.get('#guardian-before').hidden,false);assert.equal(h.elements.get('#guardian-after').hidden,true);
  assert.deepEqual(h.store,h.before);assert.equal(h.renders,0);
});

test('featured work reuses authored portfolio data and every project has a closed technical disclosure',()=>{
  const h=harness(),home=h.context.home(),portfolio=h.context.projectPage();
  assert.match(home,/AI Guardian Assistant — Project Labyrinth/u);assert.match(portfolio,/AI Guardian Assistant — Project Labyrinth/u);
  assert.match(home,/conflicting trust signals.*identity-aware decisions, audit trails, and decoy containment/su);
  assert.equal((portfolio.match(/<details class="project-details">/gu)||[]).length,4);
  assert.equal((home.match(/<details class="project-details">/gu)||[]).length,2);
  assert.doesNotMatch(portfolio,/<details\b[^>]*\bopen/iu);
  assert.match(styles,/\.project-details>summary\{[^}]*min-height:48px/u);
  assert.match(styles,/\.project-details>summary:focus-visible/u);
});

test('time filters use actual estimates and combine with pathway, grade, and text search',()=>{
  const h=harness(),html=h.context.library(),durations=[...new Set(SCENARIOS.map(s=>s.minutes))].sort((a,b)=>a-b);
  const options=html.match(/<select id="duration-filter">(.*?)<\/select>/su)?.[1];assert.ok(options);
  const shown=[...options.matchAll(/value="(\d+)"/gu)].map(match=>Number(match[1]));assert.deepEqual(shown,durations);assert.ok(!shown.includes(10));
  for(const minutes of durations){assert.deepEqual(h.filter({minutes:String(minutes)}),SCENARIOS.filter(s=>s.minutes===minutes).map(s=>s.id));}
  for(const track of Object.keys(tracks))for(const grade of ['7–8','9–10','11–12']){
    const expected=SCENARIOS.filter(s=>s.track===track&&s.grade===grade&&s.minutes===25).map(s=>s.id);
    assert.deepEqual(h.filter({track,grade,minutes:'25'}),expected);
  }
  assert.deepEqual(h.filter({minutes:'15',query:'monitor'}),SCENARIOS.filter(s=>s.minutes===15&&`${s.id} ${s.title} ${s.summary}`.toLowerCase().includes('monitor')).map(s=>s.id));
  h.filter({track:'coding',minutes:'15',query:'nothing'});h.elements.get('#clear-filters').click();
  assert.equal(h.renders,0);assert.equal(h.elements.get('#lab-search').focused,1);assert.equal(h.elements.get('#grade-filter').value,'all');assert.equal(h.elements.get('#duration-filter').value,'all');assert.equal(h.elements.get('#lab-search').value,'');assert.equal(vm.runInContext('libraryMinutes',h.context),'all');assert.equal(vm.runInContext('libraryTrack',h.context),'all');assert.equal(vm.runInContext('libraryGrade',h.context),'all');assert.equal(vm.runInContext('libraryQuery',h.context),'');
});

test('pathway changes keep the existing toolbar and focus instead of replacing the page',()=>{
  const h=harness(),button=h.pathwayButtons.find(item=>item.dataset.track==='hardware');button.focus();
  h.context.filterLibraryTrack('hardware');
  assert.equal(h.renders,0);assert.equal(button.focused,1);assert.equal(button.attributes['aria-pressed'],'true');
  for(const other of h.pathwayButtons.filter(item=>item!==button))assert.equal(other.attributes['aria-pressed'],'false');
  const ids=[...h.elements.get('#lab-results').innerHTML.matchAll(/href="#lab\/([A-Z]+-\d+)"/gu)].map(match=>match[1]);
  assert.deepEqual(ids,SCENARIOS.filter(item=>item.track==='hardware').map(item=>item.id));
  assert.deepEqual(h.store,h.before);
});

test('visible site pages omit the removed learning-profile links and preserve current chat/draft wiring',()=>{
  assert.doesNotMatch(source,/TryHackMe|tryhackme/iu);
  assert.match(source,/pair=\{question:question\.trim\(\),answer:reply\.answer,kind:reply\.kind,topic:reply\.topic/u);
  assert.match(source,/answerQuestion\(s,question,r\.state,chatPairs\.length\?chatPairs:readQuestionEvents\(r\.events\)\)/u);
  assert.match(source,/preserveDraft!==false&&labNavigation\?\.syncRoute\(route\)/u);
  assert.match(source,/standardsAlignmentHTML\(\)/u);assert.match(source,/mountStandardsAlignment\(\$\('#standards-alignment'\)\)/u);
  assert.match(styles,/\.standards-table-scroll\{[^}]*overflow-x:auto/u);assert.match(styles,/\.standards-table-scroll:focus-visible/u);
});
