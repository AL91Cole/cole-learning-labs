import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {SCENARIOS} from '../src/scenarios.js';

const source=await readFile(new URL('../src/classroom-portal.js',import.meta.url),'utf8');
const cut=(start,end)=>{const first=source.indexOf(start),last=source.indexOf(end,first);assert.ok(first>=0&&last>first);return source.slice(first,last);};
const announce=cut('function announcePortalStatus(', '\nfunction portalInputError(');
const refresh=cut('async function refresh(', '\nasync function loadClasses(');
const esc=value=>String(value??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {resolve,promise};}
function refreshHarness(api){
  const status={textContent:''},renders=[];
  const context=vm.createContext({document:{querySelector:selector=>selector==='#portal-service-status'?status:null},
    model:{mode:'unavailable'},refreshGeneration:0,teacherEntry:false,api,
    render(){renders.push(context.model.mode);},assertPinnedStudent(){},syncActiveSession(){},errorMessage:error=>error.message});
  vm.runInContext(announce+'\n'+refresh+'\nglobalThis.refreshPortal=refresh;',context);
  return {context,status,renders};
}

test('both portal entry points keep an initially empty status region outside refreshed content',async()=>{
  for(const file of ['classroom.html','teacher/index.html']){
    const html=await readFile(new URL('../'+file,import.meta.url),'utf8');
    const status=html.match(/<p\b[^>]*id="portal-service-status"[^>]*><\/p>/u)?.[0];
    assert.ok(status,file);assert.match(status,/class="sr-only"/u);assert.match(status,/role="status"/u);
    assert.match(status,/aria-live="polite"/u);assert.match(status,/aria-atomic="true"/u);
    assert.doesNotMatch(status,/\bhidden(?:\s|=|>)/u);
    assert.ok(html.indexOf(status)>html.indexOf('</main>'),file+' must retain the region when main content is replaced.');
  }
});

test('availability refresh announces checking and its actual result without stale responses overwriting it',async()=>{
  const success=refreshHarness(async()=>({enabled:true,role:'guest'}));
  const loading=success.context.refreshPortal();
  assert.match(success.status.textContent,/Checking classroom availability/u);
  await loading;assert.match(success.status.textContent,/Classroom service available/u);
  const failed=refreshHarness(async()=>{throw new Error('Synthetic unavailable service.');});
  await failed.context.refreshPortal();
  assert.match(failed.status.textContent,/unavailable.*Independent labs.*demo/su);
  assert.equal(failed.context.model.mode,'unavailable');
  const first=deferred(),second=deferred();let requests=0;
  const racing=refreshHarness(()=>++requests===1?first.promise:second.promise);
  const older=racing.context.refreshPortal(),newer=racing.context.refreshPortal();
  second.resolve({enabled:false,role:'guest'});await newer;
  const finalStatus=racing.status.textContent;
  first.resolve({enabled:true,role:'guest'});await older;
  assert.equal(racing.status.textContent,finalStatus);assert.equal(racing.context.model.mode,'unavailable');
});

test('repeated submitted-version controls identify their investigation in the accessible name',()=>{
  const labs=SCENARIOS.slice(0,3);
  const model={mode:'demo',selectedWork:null,studentWork:{student:{id:'Learner-A',alias:'Learner A',joinedAt:'2026-10-20'},work:labs.map((lab,index)=>({labId:lab.id,assignmentId:'assignment-'+index,submissions:[{id:'submission-'+index,draftVersion:1,status:'submitted',createdAt:'2026-10-20'}]}))}};
  const context=vm.createContext({model,esc,lab:id=>SCENARIOS.find(lab=>lab.id===id),date:value=>value,button:()=>'',chosenSubmission:()=>null,workEvidence:()=>''});
  vm.runInContext(cut('function workPanel(', '\nfunction submissionPanel(')+'\nglobalThis.renderWork=workPanel;',context);
  const html=context.renderWork(),names=[...html.matchAll(/aria-label="(Submitted version [^"]+)"/gu)].map(match=>match[1]);
  assert.equal(names.length,3);assert.equal(new Set(names).size,3);
  for(const lab of labs)assert.ok(names.includes(`Submitted version 1 for ${esc(lab.id)} · ${esc(lab.title)}`));
  assert.equal((html.match(/<b>Submitted version 1<\/b>/gu)||[]).length,3,'Accessible names must retain the visible action wording.');
});

test('manual progress refresh announces the refreshed view after its validated read succeeds',async()=>{
  const status={textContent:''},control={dataset:{action:'refresh-progress'},addEventListener(name,listener){this[name]=listener;}};
  const detail={classroom:{id:'class-A'},students:[],assignments:[],progress:[]},reads=[],patched=[];
  const main={querySelectorAll:selector=>selector==='[data-action]'?[control]:[],querySelector:()=>null};
  const context=vm.createContext({main,document:{querySelector:()=>status},model:{selectedClass:'class-A'},
    act:operation=>operation(),api:async path=>{reads.push(path);return detail;},validateDetail:value=>{assert.equal(value,detail);return value;},
    idPath:encodeURIComponent,patchProgress:value=>patched.push(value),Date});
  vm.runInContext(announce+'\n'+cut('function bind(', "\ndocument.addEventListener('visibilitychange'")+'\nbind();',context);
  await control.click();
  assert.deepEqual(reads,['/api/teacher/classes/class-A']);assert.deepEqual(patched,[detail]);
  assert.match(status.textContent,/Classroom progress refreshed/u);
  assert.equal(context.model.detail,detail);
});
