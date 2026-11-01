import {SANDBOX_STARTERS} from '../src/coding-sandbox.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {SCENARIOS} from '../src/scenarios.js';
import {labLanguage} from '../src/lab-language.js';
import {requesterPersona} from '../src/requester-persona.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';
import {normalizeLabRecord} from '../src/records.js';
import {inquiryProgress} from '../src/interview.js';
import {renderLabLearning} from '../src/teaching.js';
import {renderExperiments} from '../src/experiments.js';
import {routeAccess} from '../src/access-policy.js';
import {CATALOG} from '../src/lab-catalog.js';

const appUrl=new URL('../src/app.js',import.meta.url);
const source=await readFile(appUrl,'utf8');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tracks=Object.fromEntries([...new Set(SCENARIOS.map(s=>s.track))].map(id=>[id,{name:id,short:id,description:id,color:id,symbol:'○'}]));

function extract(start,end) {
  const first=source.indexOf(start),last=source.indexOf(end,first);
  assert.ok(first>=0&&last>first,'Exercise the production page renderer.');
  return source.slice(first,last);
}
function pages() {
  // Preserve the full investigation UI checks in its protected member context.
  const context=vm.createContext({MEMBER_CONTENT:true,routeAccess,CATALOG,SANDBOX_STARTERS,SCENARIOS,FOUNDATION_LABS,tracks,esc,countComplete:()=>0,store:{labs:{}},libraryTrack:'all',libraryGrade:'all',libraryMinutes:'all',libraryQuery:'',
    currentLab:null,labView:null,workStorage:{},recordFor:normalizeLabRecord,inquiryProgress,labLanguage,requesterPersona,
    workStatus:()=> 'Private session',eventList:()=>'',eventMessage:()=>'',interviewList:()=>'',evidenceList:()=>'',
    renderVirtualLabHubMarkup(){assert.fail('Choosing a lab must not create a 3D classroom hub.');}});
  vm.runInContext(extract('function routeLink(','\nfunction projectPage(')+'\n'+extract('function networkSequence(','\nfunction labCards(')+'\n'+extract('function labPage(s){','\nfunction evidenceList('),context);
  return context;
}
function detailTag(html,name) {
  const opening=[...html.matchAll(/<details\b[^>]*>/g)].find(([tag])=>new RegExp('\\bclass="[^"\\n]*\\b'+name+'\\b').test(tag))?.[0];
  assert.ok(opening,'Optional '+name+' help must remain a native disclosure.');
  return opening;
}
function enclosingDetails(html,id) {
  const stack=[];
  for(const match of html.matchAll(/<\/?details\b[^>]*>|<[a-z][^>]*\bid="([^"]+)"[^>]*>/g)) {
    if(match[1]===id)return [...stack];
    if(match[0].startsWith('</details'))stack.pop();
    else if(match[0].startsWith('<details'))stack.push(match[0]);
  }
  assert.fail('Missing control '+id);
}

test('home and catalog offer direct lab links and filters without a 3D hub',()=>{
  const rendered=pages(),home=rendered.home(),catalog=rendered.library();
  assert.match(home,/href="#labs"/);assert.match(home,/href="#lab\/INC-101"/);
  assert.match(catalog,/id="lab-search"/);assert.match(catalog,/id="grade-filter"/);
  assert.equal((catalog.match(/<button\b[^>]*\bdata-track="/g)||[]).length,6);
  for(const html of [home,catalog])assert.doesNotMatch(html,/<canvas\b|data-vlab-hub|vlab-room|3D classroom/i);
});

test('the initial application module graph does not download a 3D engine or scene',async()=>{
  const seen=new Set();
  async function visit(url) {
    url=new URL(url);url.search='';
    if(seen.has(url.href))return;
    seen.add(url.href);
    const text=await readFile(url,'utf8');
    for(const [,specifier] of text.matchAll(/^import\s+(?:[^'"\n]*?\sfrom\s*)?['"](\.[^'"]+)['"]/gm))await visit(new URL(specifier,url));
  }
  await visit(appUrl);
  assert.ok(seen.size>10,'Check the actual local module graph, not only one import line.');
  assert.doesNotMatch([...seen].join('\n'),/\/(?:virtual-lab-scene|assembly-scene|babylon|three\.(?:module|core)(?:\.min)?)\.js(?:$|\n)/);
});

test('every investigation puts required first-page work before its single Next button',()=>{
  const rendered=pages();
  for(const scenario of SCENARIOS) {
    rendered.labView=null;
    const html=rendered.labPage(scenario),request=html.indexOf('id="lab-problem"'),bench=html.indexOf('id="lab-workbench"');
    assert.ok(request>=0&&bench>request,scenario.id);
    assert.ok(html.indexOf(esc(scenario.brief),request)<bench,scenario.id+' must present the actual ticket before repair');
    const firstPage=html.slice(request,bench),next=firstPage.indexOf('id="page-one-next"');
    assert.ok(next>firstPage.indexOf('id="idea-form"'),scenario.id+' Next must follow the first-idea answers');
    assert.equal((firstPage.match(/data-jump-section="2"/g)||[]).length,1,scenario.id+' must not offer a shortcut above the required work');
    assert.match(firstPage,/<button[^>]*id="page-one-next"[^>]*\bdisabled\b/,scenario.id+' starts with the next page locked');
    assert.ok(firstPage.indexOf('id="student-question"')<firstPage.indexOf('id="interview-history"'),scenario.id+' question box must precede conversation history');
    assert.match(firstPage,/Conversation history/);
    assert.match(firstPage,/at least two clues/);
    assert.doesNotMatch(detailTag(html,'intake-questions'),/\bopen(?:\s|=|>)/,scenario.id+' question starters stay optional');
    for(const control of ['run-hypothesis-test','experiment-hypothesis','experiment-symptoms','experiment-result','bench-log'])assert.equal(enclosingDetails(html,control).length,0,scenario.id+' required workbench tools stay visible');
    assert.match(html,/<button\b[^>]*id="run-hypothesis-test"[^>]*>Test my idea<\/button>/,scenario.id+' names the action directly');
    for(const id of ['first-idea-evidence','first-idea-questions','workbench-test-status'])assert.ok(html.includes('id="'+id+'"'),scenario.id+' includes '+id);
    assert.doesNotMatch(html,/class="lab-options"|id="learning-mode"|AI replies on/);
    assert.match(html,/data-ai-toggle aria-pressed="false"/);
    assert.match(html,/<div id="work-privacy" hidden>/);
    assert.match(html,/<button\b[^>]*id="workbench-next"[^>]*\bdisabled\b/,scenario.id+' starts page three locked until the saved test is complete');
    for(const control of ['student-question','interview-history','symptoms','plan','save-idea'])assert.equal(enclosingDetails(html,control).length,0,scenario.id+' required first-page work must be immediately available');
    for(const control of ['verify-task','close-ticket'])assert.equal(enclosingDetails(html,control).length,0,scenario.id+' final test/handoff must not be hidden in optional help');
  }
});

test('the next-idea notebook keeps every writing and test control available without an optional disclosure',()=>{
  for(const scenario of SCENARIOS){
    const html=renderExperiments(scenario,normalizeLabRecord(scenario,{}));
    for(const id of ['experiment-predict','experiment-evidence','experiment-changed','experiment-observed','experiment-explain'])assert.equal(enclosingDetails(html,id).length,0,scenario.id+' '+id+' stays visible');
    for(const name of ['data-experiment-start','data-experiment-capture','data-experiment-save']){
      assert.match(html,new RegExp('<button\\b[^>]*\\b'+name+'(?:\\s|>)'),scenario.id+' exposes '+name);
    }
    assert.doesNotMatch(html,/<details[^>]*class="[^"]*experiment-workspace|optional experiment|optional notebook/i);
  }
});

test('the composed lab and notebook have unique IDs and each notebook label names its own textarea',()=>{
  const rendered=pages();
  for(const scenario of SCENARIOS){
    const notebook=renderExperiments(scenario,normalizeLabRecord(scenario,{}));
    const html=rendered.labPage(scenario).replace('<div id="experiment-tools"></div>','<div id="experiment-tools">'+notebook+'</div>');
    assert.ok(html.includes(notebook),scenario.id+' includes the mounted notebook');
    const counts=new Map();
    for(const [,id] of html.matchAll(/\sid="([^"]+)"/g))counts.set(id,(counts.get(id)||0)+1);
    assert.deepEqual([...counts].filter(([,count])=>count!==1),[],scenario.id+' must not repeat an element ID when the notebook mounts');
    for(const part of ['predict','evidence','changed','observed','explain']){
      const id='experiment-'+part;
      assert.equal(counts.get(id),1,scenario.id+' has one '+id);
      assert.match(html,new RegExp('<label\\b[^>]*\\bfor="'+id+'"'),scenario.id+' provides the '+part+' label');
      assert.match(html,new RegExp('<textarea\\b[^>]*\\bid="'+id+'"'),scenario.id+' label points to its textarea');
    }
    for(const id of ['first-idea-evidence','first-idea-questions'])assert.equal(counts.get(id),1,scenario.id+' keeps first-idea context distinct');
  }
});

test('worked examples and vocabulary remain available without opening themselves in any support mode',()=>{
  for(const scenario of SCENARIOS)for(const mode of ['guided','independent','challenge']) {
    const html=renderLabLearning(scenario,mode);
    for(const name of ['learning-model','learning-words'])assert.doesNotMatch(detailTag(html,name),/\bopen(?:\s|=|>)/,scenario.id+' '+mode+' '+name);
    assert.match(html,/See a worked example of the process/);assert.match(html,/Words you can tap to define/);
  }
});

test('all workbenches use the current local models without a 3D preview mount',()=>{
  assert.doesNotMatch(source,/mountInvestigationPreview|mountLabStation3D|virtual-lab-scene/);
  assert.match(source,/renderHardware\(workspace,s.id,r.state,action\)/);
  assert.match(source,/renderWorkspace\(workspace,s,r.state,action\)/);
  assert.match(source,/!r.state.assemblyEnabled\)action\('enable-assembly'\)/);
});
