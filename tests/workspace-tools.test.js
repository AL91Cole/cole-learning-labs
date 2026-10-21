import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {initialWorkspaceState,applyWorkspaceAction,workspaceDiagnostic,verifyWorkspace,renderWorkspace} from '../src/workspaces.js';

function inspect(id,state,command) {
  const before=structuredClone(state);
  const result=applyWorkspaceAction(id,state,'inspect-command',{command});
  assert.deepEqual(state,before,'Inspecting must not mutate the supplied model');
  assert.deepEqual(result.state,before,'Inspecting must not award edits, tests, observations, or completion');
  assert.equal(result.message,workspaceDiagnostic(id,state,command));
  assert.ok(result.message.length>0 && result.message.length<=600,'Inspection output must be bounded');
  return result.message;
}

test('workstation console separates addressing, gateway reachability, and DNS using saved state',()=>{
  let state=initialWorkspaceState('NET-201');
  assert.match(inspect('NET-201',state,'ipconfig'),/192\.168\.1\.25/);
  assert.match(inspect('NET-201',state,'ping 10.24.8.1'),/Destination unreachable/);
  assert.match(inspect('NET-201',state,'nslookup learn.school.test'),/No answer/);
  state=applyWorkspaceAction('NET-201',state,'save-network',{ip:'10.24.8.25',mask:'255.255.255.0',gateway:'10.24.8.1',dns:'192.168.1.53'}).state;
  assert.match(inspect('NET-201',state,'ping 10.24.8.1'),/received=4 lost=0/);
  assert.match(inspect('NET-201',state,'nslookup learn.school.test'),/No answer/);
  state=applyWorkspaceAction('NET-201',state,'save-network',{...state,dns:'10.24.8.53'}).state;
  assert.match(inspect('NET-201',state,' NSLOOKUP  learn.school.test '),/10\.24\.8\.80/);
  assert.equal(verifyWorkspace('NET-201',state).ok,false,'Individual observations are not the full test');
  assert.equal(verifyWorkspace('NET-201',applyWorkspaceAction('NET-201',state,'run-check').state).ok,true);
  const wrongGateway=applyWorkspaceAction('NET-201',state,'save-network',{...state,gateway:'192.168.1.1'}).state;
  assert.match(inspect('NET-201',wrongGateway,'ping 10.24.8.1'),/received=4 lost=0/,'A same-subnet ping does not use the default gateway field');
  assert.match(inspect('NET-201',wrongGateway,'nslookup learn.school.test'),/10\.24\.8\.80/,'The supplied DNS server is on the local subnet');
  assert.equal(verifyWorkspace('NET-201',applyWorkspaceAction('NET-201',wrongGateway,'run-check').state).ok,false,'Local replies alone must not pass the required gateway configuration');
  state=applyWorkspaceAction('NET-201',state,'save-network',{...state,mask:'255.0.0.0'}).state;
  assert.match(inspect('NET-201',state,'nslookup learn.school.test'),/No answer/);
  assert.equal(verifyWorkspace('NET-201',applyWorkspaceAction('NET-201',state,'run-check').state).ok,false);
});

test('shared-folder tools distinguish a reachable handout from excessive editing access',()=>{
  let state=initialWorkspaceState('NET-202');
  assert.match(inspect('NET-202',state,'read handout'),/unavailable or access denied/);
  state=applyWorkspaceAction('NET-202',state,'save-access',{network:'Staff-Lab',folder:'All folders',permission:'Full control'}).state;
  assert.match(inspect('NET-202',state,'read handout'),/read allowed/);
  assert.match(inspect('NET-202',state,'write handout'),/edit allowed/);
  assert.equal(verifyWorkspace('NET-202',applyWorkspaceAction('NET-202',state,'run-check').state).ok,false,'Read success must not excuse excessive access');
  state=applyWorkspaceAction('NET-202',state,'save-access',{network:'Staff-Lab',folder:'Project Materials',permission:'Read'}).state;
  assert.match(inspect('NET-202',state,'read handout'),/read allowed/);
  assert.match(inspect('NET-202',state,'write handout'),/edit denied/);
  assert.match(inspect('NET-202',state,'net use'),/Share scope: Project Materials/);
  assert.equal(verifyWorkspace('NET-202',state).ok,false);
});

test('recovery inspector shows boot, document preservation, and service startup separately',()=>{
  let state=initialWorkspaceState('NET-203');
  assert.match(inspect('NET-203',state,'boot status'),/startup still stops/);
  state=applyWorkspaceAction('NET-203',state,'save-recovery',{recovery:'Reset and erase files',status:'Running',startup:'Manual'}).state;
  assert.match(inspect('NET-203',state,'boot status'),/documents have been erased/);
  assert.match(inspect('NET-203',state,'list classroom-files'),/No files remain/);
  assert.match(inspect('NET-203',state,'service school-update'),/not configured for automatic/);
  assert.equal(verifyWorkspace('NET-203',applyWorkspaceAction('NET-203',state,'run-check').state).ok,false);
  state=applyWorkspaceAction('NET-203',state,'save-recovery',{recovery:'Roll back KB-LAB-17',status:'Running',startup:'Automatic'}).state;
  assert.match(inspect('NET-203',state,'boot status'),/OS reaches the classroom desktop/);
  assert.match(inspect('NET-203',state,'list classroom-files'),/All three fictional files are preserved/);
  assert.match(inspect('NET-203',state,'service school-update'),/configured to start automatically/);
});

test('AI previews stay fictional and do not mistake authentication for record ownership',()=>{
  const prompt=initialWorkspaceState('AI-301');
  assert.match(inspect('AI-301',prompt,'preview response'),/not a live AI model/);
  assert.match(inspect('AI-301',prompt,'inspect privacy'),/cannot prove the absence/);
  assert.doesNotMatch(inspect('AI-301',prompt,'inspect privacy'),/\[student email\]/);
  const review=initialWorkspaceState('AI-302');
  assert.match(inspect('AI-302',review,'open source'),/SOURCE CARD v4\.2/);
  assert.match(inspect('AI-302',review,'compare tickets'),/technical symptoms are the same/);
  let code=initialWorkspaceState('AI-303');
  assert.match(inspect('AI-303',code,'request other'),/HTTP 200/);
  code=applyWorkspaceAction('AI-303',code,'save-code',{secret:'environment',query:'parameterized',authorization:'hidden'}).state;
  assert.match(inspect('AI-303',code,'request other'),/HTTP 200/);
  assert.match(inspect('AI-303',code,'inspect query'),/separate parameter/);
  code=applyWorkspaceAction('AI-303',code,'save-code',{...code,authorization:'owner'}).state;
  assert.match(inspect('AI-303',code,'request own'),/HTTP 200/);
  assert.match(inspect('AI-303',code,'request other'),/HTTP 403/);
  assert.equal(verifyWorkspace('AI-303',code).ok,false);
});

test('message tools inspect the selected fictional email without opening its destination',()=>{
  let state=initialWorkspaceState('SEC-401');
  assert.match(inspect('SEC-401',state,'inspect sender'),/verify@school-account-check\.test/);
  assert.match(inspect('SEC-401',state,'inspect link'),/No link was opened/);
  assert.match(inspect('SEC-401',state,'inspect headers'),/not supplied/);
  state=applyWorkspaceAction('SEC-401',state,'view-message','routine').state;
  assert.match(inspect('SEC-401',state,'inspect sender'),/helpdesk@school\.test/);
  assert.match(inspect('SEC-401',state,'inspect link'),/portal\.school\.test\/checklist/);
  assert.equal(state.verdict,'unreviewed');
});

test('gateway probes expose service disruption and do not automatically approve containment',()=>{
  let state=initialWorkspaceState('SEC-402');
  assert.match(inspect('SEC-402',state,'show listeners'),/TCP 23 \/ Telnet: open/);
  state=applyWorkspaceAction('SEC-402',state,'save-response',{events:['EVT-102','EVT-103'],source:'198.51.100.24',port:'443',keepHttps:true}).state;
  assert.match(inspect('SEC-402',state,'probe portal'),/unavailable/);
  assert.match(inspect('SEC-402',state,'inspect source'),/contained: yes/);
  assert.equal(verifyWorkspace('SEC-402',applyWorkspaceAction('SEC-402',state,'run-check').state).ok,false);
  state=applyWorkspaceAction('SEC-402',state,'save-response',{...state,port:'23'}).state;
  assert.match(inspect('SEC-402',state,'probe portal'),/HTTP 200/);
  assert.match(inspect('SEC-402',state,'show listeners'),/TCP 23 \/ Telnet: closed/);
  assert.equal(verifyWorkspace('SEC-402',state).ok,false);
});

test('application inspections cannot acknowledge scope, reproduce a defect, or pass a test',()=>{
  const state=initialWorkspaceState('SEC-403');
  assert.match(inspect('SEC-403',state,'show session'),/does not request a record/);
  assert.match(inspect('SEC-403',state,'inspect rule'),/Scope acknowledged: no/);
  assert.equal(state.scope,false);
  assert.equal(state.observed,false);
  assert.deepEqual(state.history,[]);
  assert.equal(state.response,null);
  assert.equal(verifyWorkspace('SEC-403',applyWorkspaceAction('SEC-403',state,'run-check').state).ok,false);
});

test('every software lab keeps its practice diagnostics bounded and rejects real or chained commands',()=>{
  for(const scenario of SCENARIOS.filter(item=>item.track!=='hardware')) {
    const state=initialWorkspaceState(scenario.id);
    assert.match(inspect(scenario.id,state,'help'),/practice (?:tools|diagnostics)/i);
    for(const command of ['ping 8.8.8.8','curl https://example.com','ipconfig; echo private@example.com','ipconfig\nping 10.24.8.1','x'.repeat(97),null,{toString(){throw new Error('Must not coerce objects');}}]) {
      const output=inspect(scenario.id,state,command);
      assert.match(output,/outside this simulation|displayed practice tool|commands are unavailable/);
      assert.doesNotMatch(output,/private@example\.com|8\.8\.8\.8|https:\/\/example\.com/);
    }
    const elements=new Map();
    const root={innerHTML:'',querySelector:selector=>{if(!elements.has(selector))elements.set(selector,{value:'',textContent:'',addEventListener(){},setAttribute(){}});return elements.get(selector);},querySelectorAll:()=>[]};
    renderWorkspace(root,scenario,state,()=>assert.fail('Rendering tools must not run one'));
    if(scenario.track==='coding') {
      assert.match(root.innerHTML,/aria-label="Coding simulation"/);
      assert.match(root.innerHTML,/id="coding-editor"/);
      assert.match(root.innerHTML,/Run all fixtures/);
      assert.match(root.innerHTML,/No full runtime, installation, network, packages, real files or browser APIs/);
      continue;
    }
    if(/^(?:NET-20[4-6]|AI-30[4-6]|SEC-40[4-6])$/.test(scenario.id)) {
      assert.match(root.innerHTML,/aria-label="Local practice inspection tools"/);
      assert.match(root.innerHTML,/data-exp-command=/);
      assert.match(root.innerHTML,/exp-console/);
      assert.match(root.innerHTML,/runs locally/);
      continue;
    }
    assert.match(root.innerHTML,/aria-label="Hands-on practice tools"/);
    assert.match(root.innerHTML,/maxlength="96"/);
    assert.match(root.innerHTML,/data-inspection-output role="status"/);
    assert.match(root.innerHTML,/No system command or network request runs/);
  }
});
