import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/scenarios.js';
import { initialWorkspaceState, applyWorkspaceAction, renderWorkspace } from '../src/workspaces.js';
import { initialHardwareState, applyHardwareAction, renderHardware } from '../src/hardware.js';
import { supportsExpandedLab, expandedStateFields } from '../src/expanded-labs.js';
import { supportsCodingLab } from '../src/coding-lab.js';

const settingsScenarios=SCENARIOS.filter(item=>item.track!=='hardware');
const legacyScenarios=settingsScenarios.filter(item=>!supportsExpandedLab(item.id) && !supportsCodingLab(item.id));
const expandedScenarios=settingsScenarios.filter(item=>supportsExpandedLab(item.id));
const codingScenarios=settingsScenarios.filter(item=>supportsCodingLab(item.id));

function fakeRoot() {
  const elements=new Map();
  return {innerHTML:'',querySelectorAll:()=>[],querySelector(selector){
    if(!elements.has(selector)) elements.set(selector,{value:'',textContent:'',addEventListener(){},setAttribute(){}});
    return elements.get(selector);
  }};
}

function view(scenario,state) {
  let actions=0;
  const root=fakeRoot();
  const before=structuredClone(state);
  renderWorkspace(root,scenario,state,()=>{actions+=1;});
  assert.deepEqual(state,before,'Reading instructions must not change learner work');
  assert.equal(actions,0,'Rendering instructions must not save, test, or submit work');
  return root.innerHTML;
}

function availableWorkspaceGuide(scenario,state) {
    const html=view(scenario,state);
    const coding=supportsCodingLab(scenario.id),expanded=supportsExpandedLab(scenario.id);
    const pattern=coding?/<section class="ws-start code-start" aria-label="How to use this coding lab">(.*?)<\/section>/s:expanded?/<section class="exp-start" aria-label="How to use this lab">(.*?)<\/section>/s:/<section class="ws-start" aria-label="How to use this lab">(.*?)<\/section>/s;
    const matched=html.match(pattern),guide=matched?.[1];
    assert.ok(guide,`${scenario.id}: instructions must remain available beside the workspace`);
    const before=html.slice(0,matched.index),disclosure=before.slice(before.lastIndexOf('<details'));
    assert.ok(before.lastIndexOf('<details')>before.lastIndexOf('</details>'),`${scenario.id}: extended instructions belong to a native disclosure`);
    assert.doesNotMatch(disclosure.match(/^<details\b([^>]*)>/)?.[1]||'',/\bopen\b/,`${scenario.id}: extended instructions start closed`);
    assert.match(disclosure,/<summary\b[^>]*>[^<]+<\/summary>/,`${scenario.id}: help needs a named keyboard-accessible summary`);
    assert.doesNotMatch(guide,/<details\b|<summary\b|\bhidden\b|aria-hidden="true"/,scenario.id);
    assert.equal((guide.match(/<li>/g)||[]).length,3,scenario.id);
    assert.match(guide,coding?/Save and run do not submit work to a teacher/:expanded?/Apply and test do not submit work to a teacher/:/Neither button submits work to a teacher/,scenario.id);
    // Guide labels name plain-text buttons. Compare their markup directly rather
    // than treating tag stripping as a safe way to process arbitrary HTML.
    const buttons=[...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gs)].map(match=>match[1].replaceAll('&amp;','&'));
    for(const [,label] of guide.matchAll(/“([^”]+)”/g)) assert.ok(buttons.includes(label),`${scenario.id}: instructions name a missing button: ${label}`);
    if(expanded) {
      assert.ok(buttons.includes('Apply my choices'),scenario.id);
      assert.ok(buttons.includes('Run workspace test'),scenario.id);
      assert.match(html,/aria-label="Fictional equipment and case artifacts"/,scenario.id);
      assert.match(html,/aria-label="Local practice inspection tools"/,scenario.id);
    }
    if(coding) {
      assert.match(guide,/Read the input and edit/,scenario.id);
      assert.match(guide,/actual and expected output/,scenario.id);
      assert.match(html,/<label for="coding-editor"><b>Your code<\/b>/,scenario.id);
      assert.match(html,/bounded JavaScript and Python subsets run in our own interpreter on this device/,scenario.id);
      assert.match(html,/No full runtime, installation, network, packages, real files or browser APIs/,scenario.id);
    }
    return {html,guide};
}

test('every settings workspace offers three optional instructions that name its visible real controls',()=>{
  assert.equal(SCENARIOS.length,42);
  assert.equal(SCENARIOS.filter(item=>item.track==='hardware').length,8);
  assert.equal(legacyScenarios.length,9);assert.equal(expandedScenarios.length,19);assert.equal(codingScenarios.length,6);
  for(const scenario of settingsScenarios) {
    const {html,guide}=availableWorkspaceGuide(scenario,initialWorkspaceState(scenario.id));
    assert.match(html,supportsCodingLab(scenario.id)?/Run the program to see results for every fixture/:supportsExpandedLab(scenario.id)?/No current full test/:/No current test results/,scenario.id);
    assert.doesNotMatch(guide,/<button\b/,`${scenario.id}: closing help must not hide the repair or test controls`);
  }
});

test('optional instructions remain available after a real saved change and test in all nine settings labs',()=>{
  const saveActions={NET201:'save-network',NET202:'save-access',NET203:'save-recovery',AI301:'save-prompt',AI302:'save-claims',AI303:'save-code',SEC401:'save-triage',SEC402:'save-response',SEC403:'set-authorization'};
  for(const scenario of legacyScenarios) {
    const code=scenario.id.replaceAll('-','');
    let state=initialWorkspaceState(scenario.id);
    const initial=availableWorkspaceGuide(scenario,state).guide;
    if(code==='SEC403') state=applyWorkspaceAction(scenario.id,state,'acknowledge-scope',true).state;
    state=applyWorkspaceAction(scenario.id,state,saveActions[code],code==='SEC403'?'owner':state).state;
    assert.equal(state.workspaceEdits,1,scenario.id);
    assert.equal(availableWorkspaceGuide(scenario,state).guide,initial,scenario.id);
    state=applyWorkspaceAction(scenario.id,state,'run-check').state;
    assert.equal(state.tested,true,scenario.id);
    const {html,guide}=availableWorkspaceGuide(scenario,state);
    assert.equal(guide,initial,scenario.id);
    assert.match(html,/Your latest test results/,scenario.id);
  }
});

test('all decision labs retain optional guidance after real saved changes and tests',()=>{
  for(const scenario of expandedScenarios) {
    let state=initialWorkspaceState(scenario.id);
    const guideBefore=availableWorkspaceGuide(scenario,state).guide;
    const fields=expandedStateFields(scenario.id);
    const first=Object.keys(fields)[0],changed=fields[first].find(value=>value!==state[first]);
    assert.notEqual(changed,undefined,scenario.id);
    state=applyWorkspaceAction(scenario.id,state,'save-expanded',{[first]:changed}).state;
    assert.equal(state[first],changed,scenario.id);assert.equal(state.workspaceEdits,1,scenario.id);
    assert.equal(state.tested,false,scenario.id);
    assert.equal(availableWorkspaceGuide(scenario,state).guide,guideBefore,scenario.id);
    state=applyWorkspaceAction(scenario.id,state,'run-check').state;
    assert.equal(state.tested,true,scenario.id);assert.equal(state.checkRuns,1,scenario.id);
    const {html,guide}=availableWorkspaceGuide(scenario,state);
    assert.equal(guide,guideBefore,scenario.id);
    assert.match(html,/<h3>Latest full test<\/h3><ul>/,scenario.id);
    assert.equal((html.match(/class="exp-(?:pass|revisit)"/g)||[]).length,state.results.length,scenario.id);
  }
});

test('all coding labs retain optional guidance from draft changes through executed fixture results',()=>{
  const programs={
    'CODE-501':'print(quantity * 3);',
    'CODE-502':'if (temperature < 20) { print("Heating"); } else { if (temperature <= 25) { print("Comfortable"); } else { print("Cooling"); } }',
    'CODE-503':'let station = 1; repeat(stations) { print("Ready " + station); station = station + 1; }',
    'CODE-504':'console.log("Energy " + snacks * 4);',
    'CODE-505':'if (points >= 100) { console.log("Badge"); } else if (points >= 50) { console.log("Sticker"); } else { console.log("Try again"); }',
    'CODE-506':'let total = 0; for (let step = 1; step <= steps; step++) { total = total + step; } console.log(total);'
  };
  for(const scenario of codingScenarios) {
    let state=initialWorkspaceState(scenario.id);
    const guideBefore=availableWorkspaceGuide(scenario,state).guide;
    state=applyWorkspaceAction(scenario.id,state,'save-code',{code:programs[scenario.id]}).state;
    assert.equal(state.code,programs[scenario.id],scenario.id);assert.equal(state.workspaceEdits,1,scenario.id);
    assert.equal(state.tested,false,scenario.id);assert.deepEqual(state.output,[],scenario.id);
    assert.equal(availableWorkspaceGuide(scenario,state).guide,guideBefore,scenario.id);
    state=applyWorkspaceAction(scenario.id,state,'run-check').state;
    assert.equal(state.tested,true,scenario.id);assert.equal(state.checkRuns,1,scenario.id);
    assert.ok(state.results.every(result=>result.ok),scenario.id);
    assert.equal(availableWorkspaceGuide(scenario,state).guide,guideBefore,scenario.id);
    assert.ok(state.output.length>0,scenario.id);
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
  assert.equal((html.match(/class="ws-fail"/g)||[]).length,1,'Only the ownership check starts faulty.');
  assert.equal((html.match(/class="ws-pass"/g)||[]).length,2,'Correct key and query protections remain working.');
  assert.doesNotMatch(html,/All checks passed/);
});
