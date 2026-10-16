import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/scenarios.js';
import { initialWorkspaceState, renderWorkspace } from '../src/workspaces.js';

function view(scenario,state) {
  let actions=0;
  const root={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
  const before=structuredClone(state);
  renderWorkspace(root,scenario,state,()=>{actions+=1;});
  assert.deepEqual(state,before,'Reading instructions must not change learner work');
  assert.equal(actions,0,'Rendering instructions must not save, test, or submit work');
  return root.innerHTML;
}

test('every settings workspace starts with three visible steps that name its real buttons',()=>{
  for(const scenario of SCENARIOS.filter(item=>item.track!=='hardware')) {
    const html=view(scenario,initialWorkspaceState(scenario.id));
    const guide=html.match(/<details class="ws-start" open>(.*?)<\/details>/s)?.[1];
    assert.ok(guide,`${scenario.id}: first-use instructions should start open`);
    assert.equal((guide.match(/<li>/g)||[]).length,3,scenario.id);
    assert.match(guide,/Neither button submits work to a teacher/,scenario.id);
    // Guide labels name plain-text buttons. Compare their markup directly rather
    // than treating tag stripping as a safe way to process arbitrary HTML.
    const buttons=[...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gs)].map(match=>match[1].replaceAll('&amp;','&'));
    for(const [,label] of guide.matchAll(/“([^”]+)”/g)) assert.ok(buttons.includes(label),`${scenario.id}: instructions name a missing button: ${label}`);
    assert.match(html,/No current test results/,scenario.id);
  }
});

test('after the first saved change the walkthrough can be reopened and actions remain outside it',()=>{
  const scenario=SCENARIOS.find(item=>item.id==='NET-201');
  const html=view(scenario,{...initialWorkspaceState(scenario.id),workspaceEdits:1});
  assert.match(html,/<details class="ws-start"><summary>How to use this lab/);
  assert.doesNotMatch(html,/<details class="ws-start" open>/);
  const afterGuide=html.slice(html.indexOf('</details>')+'</details>'.length);
  assert.match(afterGuide,/<form class="ws-panel" data-form="save-network">/);
  assert.match(afterGuide,/data-action="run-check">Test connection<\/button>/);
});

test('test feedback explains a retry without changing the assessment result',()=>{
  const scenario=SCENARIOS.find(item=>item.id==='AI-303');
  const html=view(scenario,{...initialWorkspaceState(scenario.id),tested:true,checkRuns:1});
  assert.match(html,/Your latest test results/);
  assert.match(html,/A “Try again” result is a clue/);
  assert.equal((html.match(/class="ws-fail"/g)||[]).length,3);
  assert.doesNotMatch(html,/All checks passed/);
});
