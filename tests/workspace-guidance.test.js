import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/scenarios.js';
import { initialWorkspaceState, applyWorkspaceAction, renderWorkspace } from '../src/workspaces.js';
import { initialHardwareState, applyHardwareAction, renderHardware } from '../src/hardware.js';

function view(scenario,state) {
  let actions=0;
  const root={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
  const before=structuredClone(state);
  renderWorkspace(root,scenario,state,()=>{actions+=1;});
  assert.deepEqual(state,before,'Reading instructions must not change learner work');
  assert.equal(actions,0,'Rendering instructions must not save, test, or submit work');
  return root.innerHTML;
}

function visibleWorkspaceGuide(scenario,state) {
    const html=view(scenario,state);
    const guide=html.match(/<section class="ws-start" aria-label="How to use this lab">(.*?)<\/section>/s)?.[1];
    assert.ok(guide,`${scenario.id}: instructions must remain on the page`);
    assert.doesNotMatch(guide,/<details\b|<summary\b|\bhidden\b|aria-hidden="true"/,scenario.id);
    assert.equal((guide.match(/<li>/g)||[]).length,3,scenario.id);
    assert.match(guide,/Neither button submits work to a teacher/,scenario.id);
    // Guide labels name plain-text buttons. Compare their markup directly rather
    // than treating tag stripping as a safe way to process arbitrary HTML.
    const buttons=[...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gs)].map(match=>match[1].replaceAll('&amp;','&'));
    for(const [,label] of guide.matchAll(/“([^”]+)”/g)) assert.ok(buttons.includes(label),`${scenario.id}: instructions name a missing button: ${label}`);
    return {html,guide};
}

test('every settings workspace shows three instructions that name its real buttons',()=>{
  for(const scenario of SCENARIOS.filter(item=>item.track!=='hardware')) {
    const {html}=visibleWorkspaceGuide(scenario,initialWorkspaceState(scenario.id));
    assert.match(html,/No current test results/,scenario.id);
  }
});

test('instructions stay visible after a real saved change and test in all nine settings labs',()=>{
  const saveActions={NET201:'save-network',NET202:'save-access',NET203:'save-recovery',AI301:'save-prompt',AI302:'save-claims',AI303:'save-code',SEC401:'save-triage',SEC402:'save-response',SEC403:'set-authorization'};
  for(const scenario of SCENARIOS.filter(item=>item.track!=='hardware')) {
    const code=scenario.id.replaceAll('-','');
    let state=initialWorkspaceState(scenario.id);
    const initial=visibleWorkspaceGuide(scenario,state).guide;
    if(code==='SEC403') state=applyWorkspaceAction(scenario.id,state,'acknowledge-scope',true).state;
    state=applyWorkspaceAction(scenario.id,state,saveActions[code],code==='SEC403'?'owner':state).state;
    assert.equal(state.workspaceEdits,1,scenario.id);
    assert.equal(visibleWorkspaceGuide(scenario,state).guide,initial,scenario.id);
    state=applyWorkspaceAction(scenario.id,state,'run-check').state;
    assert.equal(state.tested,true,scenario.id);
    const {html,guide}=visibleWorkspaceGuide(scenario,state);
    assert.equal(guide,initial,scenario.id);
    assert.match(html,/Your latest test results/,scenario.id);
  }
});

test('hardware instructions are visible before and after interacting in every hardware lab',()=>{
  for(const scenario of SCENARIOS.filter(item=>item.track==='hardware')) {
    let state=initialHardwareState(scenario.id);
    let initialGuide;
    for(const action of [null,'inspect-power','power-off']) {
      if(action) state=applyHardwareAction(scenario.id,state,action).state;
      let actions=0;
      const before=structuredClone(state);
      const root={innerHTML:'',contains:()=>false,ownerDocument:{activeElement:null},querySelector:()=>null,querySelectorAll:()=>[]};
      renderHardware(root,scenario.id,state,()=>{actions+=1;});
      assert.deepEqual(state,before,'Reading workbench instructions must not change the equipment');
      assert.equal(actions,0,'Reading workbench instructions must not trigger a repair');
      const guide=root.innerHTML.match(/<section class="hw-help" aria-label="How to use this workbench">(.*?)<\/section>/s)?.[1];
      assert.ok(guide,`${scenario.id}: workbench instructions must remain in view`);
      assert.doesNotMatch(guide,/<details\b|<summary\b|\bhidden\b|aria-hidden="true"/,scenario.id);
      assert.equal((guide.match(/<li>/g)||[]).length,3,scenario.id);
      for(const [command,label] of [['power-off','Power off'],['unplug','Unplug AC'],['plug-in','Connect AC'],['boot','Power on / test']]) {
        assert.ok(guide.includes(label),`${scenario.id}: power instructions name ${label}`);
        assert.match(root.innerHTML,new RegExp(`data-hw-action="${command}"[^>]*>[^<]*${label}`),scenario.id);
      }
      if(initialGuide) assert.equal(guide,initialGuide,scenario.id);
      initialGuide=guide;
      assert.match(root.innerHTML,/<details class="hw-coach"/,'Optional case hints can still be opened separately');
    }
  }
});

test('test feedback explains a retry without changing the assessment result',()=>{
  const scenario=SCENARIOS.find(item=>item.id==='AI-303');
  const html=view(scenario,{...initialWorkspaceState(scenario.id),tested:true,checkRuns:1});
  assert.match(html,/Your latest test results/);
  assert.match(html,/A “Try again” result is a clue/);
  assert.equal((html.match(/class="ws-fail"/g)||[]).length,3);
  assert.doesNotMatch(html,/All checks passed/);
});
