import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {sessionModes,studentHidesPage,studentLinkAction,createIdleWatch,mountSessionModes,CART_IDLE_MS,CART_WARNING_MS} from '../src/session-modes.js';
import {workStatus} from '../src/work-controls.js';
import {displayMenuHTML} from '../src/display-menu.js';
import {PUBLIC_SOURCE_FILES} from '../scripts/build.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('src/app.js'),schoolIt=read('school-it.html'),modes=read('src/session-modes.js');
const HOME='https://www.colelearninglabs.com/?mode=student';

test('the page address alone chooses a classroom link mode',()=>{
  assert.deepEqual({...sessionModes('')},{student:false,cart:false});
  assert.deepEqual({...sessionModes(undefined)},{student:false,cart:false});
  assert.deepEqual({...sessionModes('?mode=student')},{student:true,cart:false});
  assert.deepEqual({...sessionModes('?cart=true')},{student:false,cart:true});
  assert.deepEqual({...sessionModes('?mode=student&cart=true')},{student:true,cart:true});
  assert.equal(sessionModes('?mode=Student').student,true);
  assert.equal(sessionModes('?mode=teacher').student,false);
  assert.equal(sessionModes('?mode=owner&member=true&unlock=all').student,false,'Unknown flags select nothing.');
  assert.ok(Object.isFrozen(sessionModes('?cart=true')));
});

test('a mistyped shared-device value still protects, and only an explicit off turns it off',()=>{
  for(const search of ['?cart=true','?cart=TRUE','?cart=1','?cart=yes','?cart','?cart=','?cart=tru','?cart=false&cart=true'])assert.equal(sessionModes(search).cart,true,search);
  for(const search of ['?cart=false','?cart=0','?cart=off','?cart=No','?carts=true','?mode=cart'])assert.equal(sessionModes(search).cart,false,search);
});

test('student mode hides adult pages and keeps every learning route',()=>{
  for(const page of ['projects','about','connect','educators','signin','membership'])assert.equal(studentHidesPage(page),true,page);
  for(const page of ['home','labs','lab','learn','explore','arcade','quests','play','practice','studio','sandbox','capstone','guide','privacy'])assert.equal(studentHidesPage(page),false,page);
});

test('student mode keeps learning links and turns off every way out',()=>{
  for(const href of ['#labs','#lab/INC-101/workbench?mode=guided','#explore?band=k1','#privacy','/?mode=student#guide','ai-use-notice.html','compliance.html','/compliance','secure-reports.html','blob:https://www.colelearninglabs.com/2f1c'])assert.equal(studentLinkAction(href,HOME),'keep',href);
  for(const href of ['#projects','#about','#connect','#educators','#signin','#membership','school-it.html','/verify','verify.html','teacher/index.html'])assert.equal(studentLinkAction(href,HOME),'hide',href);
  for(const href of ['https://github.com/AL91Cole','https://www.linkedin.com/in/alan91cole','https://chromewebstore.google.com/detail/x','//example.com/','http://www.colelearninglabs.com/','https://colelearninglabs.com.example/','mailto:someone@example.com','tel:5550100','javascript:alert(1)','data:text/html,hi','http://['])assert.equal(studentLinkAction(href,HOME),'off',href);
});

test('a shared-device page warns, lets an active learner continue and clears at the limit',()=>{
  let clock=1_000_000;const events=[];
  const watch=createIdleWatch({now:()=>clock,onWarn:remaining=>events.push(['warn',remaining]),onResume:()=>events.push(['resume']),onExpire:()=>events.push(['expire'])});
  assert.equal(CART_IDLE_MS,40*60*1000);assert.equal(CART_WARNING_MS,2*60*1000);
  clock+=37*60*1000;assert.equal(watch.check(),'active');assert.deepEqual(events,[]);
  clock+=60*1000;assert.equal(watch.check(),'warning');assert.deepEqual(events.at(-1),['warn',2*60*1000]);
  assert.equal(watch.activity(),'active');assert.deepEqual(events.at(-1),['resume'],'Any activity dismisses the warning.');
  clock+=39*60*1000;assert.equal(watch.check(),'warning');
  clock+=60*1000;assert.equal(watch.check(),'expired');assert.deepEqual(events.at(-1),['expire']);
  assert.equal(watch.check(),'active','The limit starts again after a clear.');
  assert.equal(events.filter(([kind])=>kind==='expire').length,1);
});

test('a device woken by the next class clears before its first action counts',()=>{
  let clock=0,expired=0;
  const watch=createIdleWatch({now:()=>clock,onExpire:()=>{expired++;}});
  clock+=55*60*1000; // lid closed between periods: no timer ran
  assert.equal(watch.activity(),'expired');assert.equal(expired,1);
  assert.equal(watch.activity(),'active');assert.equal(expired,1);
  clock-=5*60*1000;assert.equal(watch.check(),'active','A clock moved backwards never clears early.');
});

test('the standard page starts no mode and adds nothing to the page',()=>{
  const dispose=mountSessionModes({modes:sessionModes(''),document:null,window:null});
  assert.equal(typeof dispose,'function');dispose();
});

test('a shared-device session is never handed the browser storage',()=>{
  const line=app.match(/^let deviceStorage;[^\n]*$/mu)?.[0];
  assert.ok(line,'The device storage line must be available.');
  const run=cart=>{let reads=0;const sandbox={SESSION:{cart},storageAvailable:true};Object.defineProperty(sandbox,'localStorage',{get(){reads++;return {marker:true};}});vm.runInNewContext(line.replace(/^let /u,'var ')+';result={deviceStorage,storageAvailable};',sandbox);return {...sandbox.result,reads};};
  assert.deepEqual(run(true),{deviceStorage:undefined,storageAvailable:true,reads:0});
  const standard=run(false);assert.equal(standard.reads,1);assert.deepEqual(standard.deviceStorage,{marker:true});
  assert.match(app,/let storageKey=MEMBER_CONTENT\?\(SESSION\.cart\?WORK_PREFIX:classroomStorageKey\(\)\):PUBLIC_WORK_PREFIX;/u,'The saved classroom selection is not read either.');
  assert.match(app,/mountWorkControls\(\{host:\$\('#work-privacy'\),shared:\(typeof SESSION!=='undefined'&&SESSION\.cart\),/u);
  assert.match(app,/function clearSharedSession\(\)\{[^\n]*history\.replaceState\(null,'',location\.pathname\+location\.search\+'#home'\);resetLocalSession\(\);/u,'Clearing returns to the home page and keeps the mode in the address.');
  const statusCalls=app.split('workStatus(').length-1,sharedStatusCalls=app.split("workStorage,(typeof SESSION!=='undefined'&&SESSION.cart))").length-1;
  assert.ok(statusCalls>=3);assert.equal(sharedStatusCalls,statusCalls,'Every lab status line knows about the shared-device session.');
  assert.equal(workStatus({},{persistent:false},true),'Shared-device session: download your report before you leave. Nothing is saved on this device.');
  assert.match(workStatus({},{persistent:false}),/^Private session:/u,'The standard wording is unchanged.');
  assert.match(displayMenuHTML({}),/Saved on this device only\. Nothing is sent anywhere\./u);
  assert.match(displayMenuHTML({},{saved:false}),/Used on this page only and not saved\. Nothing is sent anywhere\./u);
});

test('the modes only restrict: no storage, network, unlock or membership path',()=>{
  assert.doesNotMatch(modes,/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|WebSocket|import\(/u);
  assert.doesNotMatch(modes,/MEMBER_CONTENT|OWNER_PREVIEW|routeAccess|membership'\s*:/u);
  assert.ok(PUBLIC_SOURCE_FILES.includes('src/session-modes.js'),'The module is reviewed for public delivery.');
  assert.match(app,/import \{sessionModes,mountSessionModes,studentHidesPage\} from '\.\/session-modes\.js\?release=/u);
  assert.match(app,/if\(\(typeof SESSION!=='undefined'&&SESSION\.student\)&&studentHidesPage\(page\)\)\{page='student-mode';/u);
});

test('the school review summary states scoped facts and claims no approval',()=>{
  const summary=schoolIt.match(/<h2 id="review-summary">[\s\S]*?<h2 id="purpose">/u)?.[0];
  assert.ok(summary);
  assert.equal(summary.match(/<li>/gu).length,5);
  assert.match(summary,/It is not an approval, a certification or a legal determination\./u);
  assert.match(summary,/No student account for public labs/u);assert.match(summary,/approved adults only/u);
  assert.match(summary,/503 refusal before it reads configuration/u);
  assert.match(summary,/only a fictional lab ID and an authored topic code are sent/u);
  assert.match(summary,/The public labs perform no live scanning/u);
  assert.match(summary,/challenges\.cloudflare\.com/u);
  assert.doesNotMatch(summary,/100%|guarantee|green.?light|certified|compliant|zero.?PII/iu);
  for(const id of ['purpose','data-practices','hostnames','classroom-links'])assert.match(schoolIt,new RegExp(`<h2 id="${id}">`,'u'),id);
  const links=schoolIt.match(/<h2 id="classroom-links">[\s\S]*?<h2>Review the encrypted-file workflow<\/h2>/u)?.[0];
  assert.match(links,/\?mode=student/u);assert.match(links,/\?cart=true/u);
  assert.match(links,/not a content filter or a device policy/u);
  assert.match(links,/Work saved earlier stays in that browser/u);
});
