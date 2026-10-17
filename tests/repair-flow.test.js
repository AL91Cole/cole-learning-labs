import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {SCENARIOS} from '../src/scenarios.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';
import {normalizeLabRecord} from '../src/records.js';
import {inquiryProgress} from '../src/interview.js';
import {renderLabLearning} from '../src/teaching.js';

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
  const context=vm.createContext({SCENARIOS,FOUNDATION_LABS,tracks,esc,countComplete:()=>0,store:{labs:{}},libraryTrack:'all',libraryGrade:'all',libraryQuery:'',
    currentLab:null,labView:null,workStorage:{},recordFor:normalizeLabRecord,inquiryProgress,
    workStatus:()=> 'Private session',eventList:()=>'',eventMessage:()=>'',interviewList:()=>'',evidenceList:()=>'',
    renderVirtualLabHubMarkup(){assert.fail('Choosing a lab must not create a 3D classroom hub.');}});
  vm.runInContext(extract('function routeLink(','\nfunction projectPage(')+'\n'+extract('function library(','\nfunction labCards(')+'\n'+extract('function labPage(s){','\nfunction evidenceList('),context);
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
  assert.equal((catalog.match(/data-track="/g)||[]).length,6);
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

test('every investigation begins with the ticket and leaves optional help closed',()=>{
  const rendered=pages();
  for(const scenario of SCENARIOS) {
    rendered.labView=null;
    const html=rendered.labPage(scenario),request=html.indexOf('id="lab-problem"'),bench=html.indexOf('id="lab-workbench"');
    assert.ok(request>=0&&bench>request,scenario.id);
    assert.ok(html.indexOf(esc(scenario.brief),request)<bench,scenario.id+' must present the actual ticket before repair');
    const firstRepairLink=html.indexOf('data-jump-section="2"',request);
    assert.ok(firstRepairLink>request&&firstRepairLink<html.indexOf('id="lab-learning"'),scenario.id+' needs a clear repair entry beside the ticket');
    for(const name of ['lab-options','intake-questions','conversation-history','repair-notes','guide-plan','hypothesis-test','bench-log'])assert.doesNotMatch(detailTag(html,name),/\bopen(?:\s|=|>)/,scenario.id+' '+name);
    const modeHelp=enclosingDetails(html,'learning-mode');
    assert.equal(modeHelp.length,1,scenario.id+' practice settings belong in optional help');
    assert.doesNotMatch(modeHelp[0],/\bopen(?:\s|=|>)/,scenario.id);
    assert.equal(enclosingDetails(html,'student-question').length,0,scenario.id+' own-word questions must be immediately usable');
    for(const control of ['verify-task','close-ticket'])assert.equal(enclosingDetails(html,control).length,0,scenario.id+' final test/handoff must not be hidden in optional help');
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
