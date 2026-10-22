import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkspaceState,applyWorkspaceAction,verifyWorkspace,workspaceDiagnostic} from '../src/workspaces.js';

const apply=(id,state,action,value)=>applyWorkspaceAction(id,state,action,value).state;
const run=(id,state)=>apply(id,state,'run-check');
const passed=(id,state)=>verifyWorkspace(id,state).ok;

test('NET-201 needs an address repair and a separate DNS repair, with honest intermediate diagnostics',()=>{
  const id='NET-201';let state=initialWorkspaceState(id);
  assert.equal(state.gateway,'10.24.8.1');assert.equal(state.mask,'255.255.255.0');
  assert.match(workspaceDiagnostic(id,state,'ping 10.24.8.1'),/Destination unreachable/);
  state=apply(id,state,'save-network',{...state,ip:'10.24.8.25'});
  assert.match(workspaceDiagnostic(id,state,'ping 10.24.8.1'),/received=4 lost=0/);
  assert.match(workspaceDiagnostic(id,state,'nslookup learn.school.test'),/No answer/);
  state=run(id,state);
  assert.deepEqual(state.results.map(row=>row.ok),[true,true,false]);assert.equal(passed(id,state),false);
  state=apply(id,state,'save-network',{...state,dns:'10.24.8.53'});
  assert.equal(passed(id,state),false,'Changed settings still need a current test.');
  state=run(id,state);assert.equal(passed(id,state),true);assert.equal(state.checkRuns,2);
});

test('NET-202 has one network-path fault and preserves correct read-only sharing',()=>{
  const id='NET-202';let state=initialWorkspaceState(id);
  assert.equal(state.folder,'Project Materials');assert.equal(state.permission,'Read');
  assert.match(workspaceDiagnostic(id,state,'read handout'),/unavailable or access denied/);
  state=apply(id,state,'save-access',{...state,network:'Staff-Lab'});
  state=run(id,state);assert.equal(passed(id,state),true);assert.equal(state.checkRuns,1,'No failed first test is required.');
  assert.match(workspaceDiagnostic(id,state,'read handout'),/read allowed/);
  assert.match(workspaceDiagnostic(id,state,'write handout'),/edit denied/);
  state=run(id,apply(id,state,'save-access',{...state,permission:'Full control'}));
  assert.equal(passed(id,state),false,'Opening the handout cannot excuse excess access.');
});

test('AI-303 isolates an ownership defect while retaining already-correct secret and query handling',()=>{
  const id='AI-303';let state=initialWorkspaceState(id);
  assert.equal(state.secret,'environment');assert.equal(state.query,'parameterized');
  assert.match(workspaceDiagnostic(id,state,'inspect key'),/missing key raises an error/i);
  assert.match(workspaceDiagnostic(id,state,'inspect query'),/separate parameter/);
  assert.match(workspaceDiagnostic(id,state,'request own'),/HTTP 200/);
  assert.match(workspaceDiagnostic(id,state,'request other'),/HTTP 200/);
  const hidden=run(id,apply(id,state,'save-code',{...state,authorization:'hidden'}));
  assert.equal(passed(id,hidden),false);assert.match(workspaceDiagnostic(id,hidden,'request other'),/HTTP 200/);
  state=run(id,apply(id,state,'save-code',{...state,authorization:'owner'}));
  assert.equal(passed(id,state),true);assert.equal(state.checkRuns,1);
  assert.match(workspaceDiagnostic(id,state,'request own'),/HTTP 200/);
  assert.match(workspaceDiagnostic(id,state,'request other'),/HTTP 403/);
});

test('NET-204 has one coverage fault and does not require changing its working radio settings',()=>{
  const id='NET-204';let state=initialWorkspaceState(id);
  assert.deepEqual([state.band,state.channel,state.width],['5','40','20']);
  const initial=run(id,state);assert.deepEqual(initial.results.map(row=>row.ok),[false,true,true,true]);
  state=run(id,apply(id,state,'save-expanded',{placement:'ceiling-center'}));
  assert.equal(passed(id,state),true);assert.equal(state.checkRuns,1);
  state=run(id,apply(id,state,'save-expanded',{channel:'36'}));
  assert.equal(passed(id,state),false,'A stronger signal does not excuse a newly overlapping channel.');
});

test('AI-304 fixes unnecessary private input without inventing additional participation or processing faults',()=>{
  const id='AI-304';let state=initialWorkspaceState(id);
  assert.deepEqual([state.identifiers,state.route,state.participation],['none','local','alternative']);
  const initial=run(id,state);assert.deepEqual(initial.results.map(row=>row.ok),[false,true,true,true]);
  state=run(id,apply(id,state,'save-expanded',{input:'fiction'}));
  assert.equal(passed(id,state),true);assert.equal(state.checkRuns,1);
  state=run(id,apply(id,state,'save-expanded',{identifiers:'collect'}));
  assert.equal(passed(id,state),false,'Fictional input does not justify collecting learner identifiers.');
});

test('NET-203 startup recovery does not hide a stopped or nonautomatic update service',()=>{
  const id='NET-203';let state=initialWorkspaceState(id);
  state=run(id,apply(id,state,'save-recovery',{...state,recovery:'Roll back KB-LAB-17'}));
  assert.deepEqual(state.results.map(row=>row.ok),[true,true,false]);assert.equal(passed(id,state),false);
  state=run(id,apply(id,state,'save-recovery',{...state,status:'Running',startup:'Manual'}));
  assert.equal(passed(id,state),false,'Running now is different from returning after a restart.');
  state=run(id,apply(id,state,'save-recovery',{...state,startup:'Automatic'}));assert.equal(passed(id,state),true);
  state=run(id,apply(id,state,'save-recovery',{...state,recovery:'Reset and erase files'}));
  assert.equal(passed(id,state),false,'A fresh desktop cannot replace the requested classroom files.');
});

test('NET-205 a running spooler alone cannot print an original job still paused or aimed at an offline printer',()=>{
  const id='NET-205';let state=initialWorkspaceState(id);
  state=run(id,apply(id,state,'save-expanded',{spooler:'running'}));
  assert.deepEqual(state.results.map(row=>row.ok),[true,false,false,false]);assert.equal(passed(id,state),false);
  state=run(id,apply(id,state,'save-expanded',{queue:'resume',port:'approved'}));
  assert.equal(passed(id,state),false,'The requested job still needs release.');
  state=run(id,apply(id,state,'save-expanded',{job:'release'}));assert.equal(passed(id,state),true);
  state=run(id,apply(id,state,'save-expanded',{job:'delete'}));assert.equal(passed(id,state),false);
});

test('SEC-402 correlation and containment still need a separate service and availability check',()=>{
  const id='SEC-402';let state=initialWorkspaceState(id);
  state=run(id,apply(id,state,'save-response',{...state,events:['EVT-102','EVT-103'],source:'198.51.100.24'}));
  assert.deepEqual(state.results.map(row=>row.ok),[true,true,false,true]);assert.equal(passed(id,state),false);
  state=run(id,apply(id,state,'save-response',{...state,port:'23',keepHttps:false}));
  assert.equal(passed(id,state),false,'Closing the legacy service must not close the classroom portal.');
  state=run(id,apply(id,state,'save-response',{...state,keepHttps:true}));assert.equal(passed(id,state),true);
});
