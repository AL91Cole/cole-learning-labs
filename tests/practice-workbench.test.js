import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {initialWorkspaceState,verifyWorkspace} from '../src/workspaces.js';
import {getNetworkBenchSpec} from '../src/network-bench.js';
import {practiceScenarioFor,practiceHasWork,applyPracticeAction,renderPracticeWorkbench,mountPracticeWorkbench} from '../src/practice-workbench.js';

test('practice accepts canonical network, AI and security cases and rejects unsupported workbenches',()=>{
  const supported=SCENARIOS.filter(item=>['network','ai','security'].includes(item.track));
  assert.ok(supported.length>20);
  for(const scenario of supported) {
    assert.equal(practiceScenarioFor(scenario.id).id,scenario.id);
    const html=renderPracticeWorkbench(scenario);
    assert.match(html,/data-practice-workspace/);assert.match(html,/Task &amp; clues/);
    assert.ok(!html.includes('<details class="practice-clues" open'));
    assert.ok(!html.includes('name="symptoms"'));assert.ok(!html.includes('name="plan"'));
    assert.equal(practiceHasWork(scenario.id,null),false);
  }
  for(const id of ['INC-101','CODE-501','NET-999','__proto__',null]) {
    assert.equal(practiceScenarioFor(id),null);assert.equal(practiceHasWork(id,{}),false);
    assert.match(renderPracticeWorkbench({id}),/unavailable/);
    assert.equal(applyPracticeAction(id,{},'run-check').state,null);
  }
});

test('render uses canonical scenario wording instead of caller-supplied HTML or goals',()=>{
  const scenario=practiceScenarioFor('AI-301'),html=renderPracticeWorkbench({...scenario,title:'<script>bad</script>',goal:'forged'});
  assert.ok(!html.includes('<script>bad'));assert.ok(!html.includes('Goal:</b> forged'));
  assert.ok(html.includes(scenario.title.replaceAll('&','&amp;')));assert.match(html,/Practice does not submit classroom work/);
});

test('AI practice applies changes and runs actual current checks with no written-work gates',()=>{
  const initial=initialWorkspaceState('AI-301'),before=JSON.stringify(initial);
  const changed=applyPracticeAction('AI-301',initial,'save-prompt',{prompt:'For a fictional learner, explain computer networks in a short explanation. Include one practice question and verify against class notes.'});
  assert.equal(JSON.stringify(initial),before);assert.equal(changed.state.tested,false);assert.equal(changed.state.workspaceEdits,1);
  assert.equal(verifyWorkspace('AI-301',changed.state).ok,false);
  const checked=applyPracticeAction('AI-301',changed.state,'run-check');
  assert.equal(verifyWorkspace('AI-301',checked.state).ok,true);assert.equal(checked.state.checkRuns,1);
  assert.match(checked.message,/5 of 5 checks pass/);assert.ok(!checked.message.includes('Check & explain'));
  assert.equal(Object.hasOwn(checked.state,'questions'),false);assert.equal(Object.hasOwn(checked.state,'verified'),false);
});

test('security scope rules still apply in ungated practice and only fictional records are accepted',()=>{
  let state=initialWorkspaceState('SEC-403');
  assert.equal(applyPracticeAction('SEC-403',state,'fetch-record','102').kind,'warning');
  state=applyPracticeAction('SEC-403',state,'acknowledge-scope',true).state;
  assert.equal(applyPracticeAction('SEC-403',state,'fetch-record','999').kind,'warning');
  state=applyPracticeAction('SEC-403',state,'fetch-record','102').state;assert.equal(state.response.status,200);
  state=applyPracticeAction('SEC-403',state,'set-authorization','owner').state;
  state=applyPracticeAction('SEC-403',state,'fetch-record','102').state;assert.equal(state.response.status,403);
  assert.equal(state.tested,false);state=applyPracticeAction('SEC-403',state,'run-check').state;
  assert.equal(verifyWorkspace('SEC-403',state).ok,true);
});

test('layout-only changes count as practice work while cable gestures change the actual model',()=>{
  const id='NET-208',initial=initialWorkspaceState(id),node=getNetworkBenchSpec(id).nodes[0];
  const moved=applyPracticeAction(id,initial,'bench-move',{nodeId:node.id,x:12,y:18}).state;
  assert.equal(moved.workspaceEdits,0);assert.equal(moved.checkRuns,0);assert.equal(practiceHasWork(id,moved),true);
  const cable=getNetworkBenchSpec(id).cables.find(item=>item.id==='pc04-cabinet');
  const connected=applyPracticeAction(id,moved,'bench-connect',{fromPort:cable.fromPort,toPort:cable.toPort}).state;
  assert.equal(connected.topology,'star');assert.equal(connected.tested,false);assert.ok(connected.workspaceEdits>0);
  assert.equal(initial.topology,'chain');
});
function fakeRoot() {
  const nodes=new Map();
  const makeNode=()=>({value:'',textContent:'',innerHTML:'',dataset:{},listeners:{},addEventListener(name,handler){this.listeners[name]=handler;},removeEventListener(name,handler){if(this.listeners[name]===handler)delete this.listeners[name];},replaceChildren(...items){this.children=items;}});
  const run=makeNode();run.dataset.action='run-check';
  const workspace=makeNode(),workspaceNodes=new Map();
  workspace.querySelector=selector=>{
    if(selector==='[data-network-visual]'||selector==='[data-interactive-tools]')return null;
    if(!workspaceNodes.has(selector))workspaceNodes.set(selector,makeNode());return workspaceNodes.get(selector);
  };
  workspace.querySelectorAll=selector=>selector==='[data-action]'?[run]:[];
  nodes.set('[data-practice-workspace]',workspace);
  const root={querySelector(selector){if(!nodes.has(selector))nodes.set(selector,makeNode());return nodes.get(selector);},nodes,run,workspace};
  return root;
}

test('mount runs the actual workbench, keeps practice separate, restricts picker and cleans listeners',()=>{
  const scenario=practiceScenarioFor('NET-201'),root=fakeRoot(),changes=[],navigations=[];
  const cleanup=mountPracticeWorkbench(root,{scenario,getState:()=>null,onChange:state=>changes.push(state),onNavigate:id=>navigations.push(id)});
  assert.equal(changes.length,0);assert.match(root.workspace.innerHTML,/LAB-PC-12/);
  root.run.listeners.click();assert.equal(changes.length,1);assert.equal(changes[0].checkRuns,1);
  assert.equal(changes[0].tested,true);assert.ok(changes[0].results.some(item=>!item.ok));
  assert.match(root.querySelector('[data-practice-status]').textContent,/checks pass/);
  const picker=root.querySelector('[data-practice-case]');
  picker.listeners.change({target:{value:'AI-301'}});assert.deepEqual(navigations,[]);
  picker.listeners.change({target:{value:'NET-208'}});assert.deepEqual(navigations,['NET-208']);
  picker.listeners.change({target:{value:'NET-999'}});assert.deepEqual(navigations,['NET-208']);
  cleanup();assert.equal(Object.keys(picker.listeners).length,0);
  assert.deepEqual(root.workspace.children,[]);
});