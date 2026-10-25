import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {supportsSecurityActivity,renderSecurityActivity,securityActivityAction} from '../src/security-activities.js';
import {initialWorkspaceState,applyWorkspaceAction,verifyWorkspace} from '../src/workspaces.js';
const ids=['SEC-401','SEC-402','SEC-403','SEC-404','SEC-405','SEC-406'];
const reduce=(id,s,action,value)=>applyWorkspaceAction(id,s,action,value).state;
function choose(id,s,name,value){const action=securityActivityAction(id,s,name,value);assert.ok(action,`${id}: ${name}=${value}`);return reduce(id,s,action.action,action.value);}
const solve=(id,s,entries)=>entries.reduce((state,[name,value])=>choose(id,state,name,value),s);
for(const id of ids)test(`${id} activity controls use fixed reducers and require an explicit test`,()=>{
  assert.equal(supportsSecurityActivity(id),true);
  let state=initialWorkspaceState(id);
  if(id==='SEC-403')state=choose(id,state,'scope',true);
  const html=renderSecurityActivity(id,state),buttons=[...html.matchAll(/data-la-choice="([^"]+)" data-la-value="([^"]+)"/g)];
  assert.ok(buttons.length>3);assert.doesNotMatch(html,/<script\b|<form\b|onclick=|href=/i);
  for(const [,name,value] of buttons){state=choose(id,state,name,value);assert.equal(state.checkRuns,0);assert.equal(state.tested,false);assert.equal(verifyWorkspace(id,state).ok,false);}
});
test('phishing inbox preserves the comparison and applies selected evidence',()=>{
  let s=initialWorkspaceState('SEC-401');
  s=solve('SEC-401',s,[['flags','sender'],['flags','destination'],['flags','urgency'],['verdict','phishing'],['permission','Read only']]);
  assert.match(renderSecurityActivity('SEC-401',s),/sender marked/);
  assert.equal(verifyWorkspace('SEC-401',s).ok,false);
  s=reduce('SEC-401',s,'run-check');assert.equal(verifyWorkspace('SEC-401',s).ok,true);
  s=choose('SEC-401',s,'message','routine');
  const html=renderSecurityActivity('SEC-401',s);assert.match(html,/helpdesk@school.test/);assert.match(html,/teacher’s class-portal bookmark/);assert.equal(s.tested,true,'Opening a supplied comparison does not change the saved review');
  s=choose('SEC-401',s,'flags','sender');assert.equal(s.tested,false);assert.equal(verifyWorkspace('SEC-401',s).ok,false);
});
test('gateway separates suspicious source containment from classroom availability',()=>{
  let s=initialWorkspaceState('SEC-402');
  s=solve('SEC-402',s,[['events','EVT-102'],['events','EVT-103'],['source','10.24.8.25'],['port','443']]);
  let html=renderSecurityActivity('SEC-402',s);assert.match(html,/Source passes/);assert.match(html,/Suspicious source still allowed/);assert.match(html,/sa-rule-risk/);assert.match(html,/Portal blocked/);
  s=solve('SEC-402',s,[['source','198.51.100.24'],['port','23'],['keepHttps','true']]);
  html=renderSecurityActivity('SEC-402',s);assert.match(html,/Source denied/);assert.match(html,/Suspicious traffic contained/);assert.match(html,/Portal available/);assert.match(html,/Telnet listener closed/);
  assert.equal(s.tested,false);s=reduce('SEC-402',s,'run-check');assert.equal(verifyWorkspace('SEC-402',s).ok,true);
  s=choose('SEC-402',s,'keepHttps','false');assert.match(renderSecurityActivity('SEC-402',s),/Portal blocked/);assert.equal(verifyWorkspace('SEC-402',s).ok,false);
});
test('record board requires scope, observes the defect, and tests exact fictional records',()=>{
  let s=initialWorkspaceState('SEC-403');
  assert.match(renderSecurityActivity('SEC-403',s),/data-la-scope/);
  assert.equal(securityActivityAction('SEC-403',s,'record','102'),null);
  assert.equal(securityActivityAction('SEC-403',s,'patch','owner'),null);
  s=choose('SEC-403',s,'scope',true);s=choose('SEC-403',s,'patch','owner');s=reduce('SEC-403',s,'run-check');
  assert.equal(verifyWorkspace('SEC-403',s).ok,false,'A patch without observing the original defect is incomplete');
  s=choose('SEC-403',s,'patch','none');s=choose('SEC-403',s,'record','102');assert.equal(s.observed,true);assert.equal(s.response.status,200);
  s=choose('SEC-403',s,'patch','hidden');s=choose('SEC-403',s,'record','102');assert.equal(s.response.status,200,'Hiding links is not authorization');
  s=choose('SEC-403',s,'patch','owner');s=choose('SEC-403',s,'record','101');assert.equal(s.response.status,200);s=choose('SEC-403',s,'record','102');assert.equal(s.response.status,403);
  assert.equal(s.tested,false);s=reduce('SEC-403',s,'run-check');assert.equal(verifyWorkspace('SEC-403',s).ok,true);
  s=choose('SEC-403',s,'scope',false);assert.equal(securityActivityAction('SEC-403',s,'record','101'),null);assert.equal(verifyWorkspace('SEC-403',s).ok,false);
});
test('recovery stations retain MFA and update safeguards without requesting credentials',()=>{
  let s=initialWorkspaceState('SEC-404');assert.match(renderSecurityActivity('SEC-404',s),/0\/4 safeguards/);
  s=solve('SEC-404',s,[['identity','approved'],['factor','revoke'],['reset','supervised'],['audit','record']]);
  const html=renderSecurityActivity('SEC-404',s);assert.match(html,/4\/4 safeguards selected/);assert.doesNotMatch(html,/type="(?:password|text)"/);
  assert.equal(verifyWorkspace('SEC-404',s).ok,false);s=reduce('SEC-404',s,'run-check');assert.equal(verifyWorkspace('SEC-404',s).ok,true);
  s=choose('SEC-404',s,'reset','disable');assert.equal(s.tested,false);assert.equal(verifyWorkspace('SEC-404',s).ok,false);
});
test('clean recovery remains blocked until the affected endpoint is isolated and evidence preserved',()=>{
  let s=initialWorkspaceState('SEC-405');s=choose('SEC-405',s,'recovery','clean');
  assert.match(renderSecurityActivity('SEC-405',s),/Containment \/ evidence needed/);
  s=solve('SEC-405',s,[['containment','isolate'],['evidence','preserve'],['notify','team']]);
  assert.match(renderSecurityActivity('SEC-405',s),/Clean staging ready/);assert.equal(verifyWorkspace('SEC-405',s).ok,false);
  s=reduce('SEC-405',s,'run-check');assert.equal(verifyWorkspace('SEC-405',s).ok,true);
  s=choose('SEC-405',s,'containment','connected');assert.match(renderSecurityActivity('SEC-405',s),/Containment \/ evidence needed/);s=reduce('SEC-405',s,'run-check');assert.equal(verifyWorkspace('SEC-405',s).ok,false);
  s=choose('SEC-405',s,'recovery','infected');assert.match(renderSecurityActivity('SEC-405',s),/Unsafe: affected endpoint/);
});
test('package inspections expose fixed proof and never approve B or C just because verification was selected',()=>{
  let s=initialWorkspaceState('SEC-406'),html=renderSecurityActivity('SEC-406',s);
  assert.match(html,/<p class="sa-proof">Signature not inspected/);assert.match(html,/<p class="sa-proof">Digest not inspected/);
  s=solve('SEC-406',s,[['signature','verify'],['digest','verify'],['deployment','pilot']]);
  for(const candidate of ['B','C']){
    s=choose('SEC-406',s,'package',candidate);html=renderSecurityActivity('SEC-406',s);
    assert.match(html,/Selected plan needs review/);assert.doesNotMatch(html,/Selected plan ready to test/);
    s=reduce('SEC-406',s,'run-check');assert.equal(verifyWorkspace('SEC-406',s).ok,false);
  }
  assert.match(html,/LAB-MISMATCH/);
  s=choose('SEC-406',s,'package','A');html=renderSecurityActivity('SEC-406',s);assert.match(html,/LAB-DIGEST-42 · matches/);assert.match(html,/Selected plan ready to test/);assert.equal(s.tested,false);
  s=reduce('SEC-406',s,'run-check');assert.equal(verifyWorkspace('SEC-406',s).ok,true);
});
test('forged fields, arbitrary records, scope strings, and object values are rejected',()=>{
  for(const id of ids){
    const s=initialWorkspaceState(id),before=structuredClone(s);
    for(const [name,value] of [['__proto__','owner'],['constructor','x'],['record','103'],['record','https://real.test/records'],['scope','true'],['scope',1],['patch','execute'],['source','127.0.0.1'],['flags','<script>'],['notify','email-real-team'],['signature',{toString(){throw Error('Unexpected coercion');}}]])assert.equal(securityActivityAction(id,s,name,value),null,`${id}: rejects ${name}`);
    assert.deepEqual(s,before);
  }
  assert.equal(securityActivityAction('SEC-403',{scope:'true'},'record','101'),null);
  assert.equal(securityActivityAction('unknown',{},'scope',true),null);
});
test('saved response text is escaped and styles retain touch targets and reduced motion',async()=>{
  const html=renderSecurityActivity('SEC-403',{scope:true,response:{id:'102',status:200,body:'<img src=x onerror=alert(1)>&"'}});
  assert.doesNotMatch(html,/<img\b|<script\b/i);assert.match(html,/&lt;img/);assert.match(html,/&amp;&quot;/);
  assert.equal(renderSecurityActivity('SEC-999',{}),'');assert.equal(supportsSecurityActivity(null),false);
  for(const id of ids)assert.equal(typeof renderSecurityActivity(id,null),'string');
  const css=await readFile(new URL('../src/security-activities.css',import.meta.url),'utf8');
  assert.match(css,/min-height:44px/);assert.match(css,/prefers-reduced-motion:reduce/);
});
