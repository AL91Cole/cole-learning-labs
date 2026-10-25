import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPANDED_SCENARIOS, supportsExpandedLab, expandedStateFields, initialExpandedState, normalizeExpandedState, applyExpandedAction, verifyExpanded, getExpandedMission, expandedDiagnostic, renderExpanded} from '../src/expanded-labs.js';

const SOLUTIONS={
  'NET-204':{placement:'ceiling-center',band:'5',channel:'40',width:'20'},
  'NET-205':{spooler:'running',queue:'resume',port:'approved',job:'release'},
  'NET-206':{snapshot:'B-17',destination:'recovery',preserve:'keep',integrity:'compare'},
  'AI-304':{input:'fiction',identifiers:'none',route:'local',participation:'alternative'},
  'AI-305':{boundary:'data',injected:'reject',citation:'S-12',review:'human'},
  'AI-306':{threshold:'0.50',decision:'human',audit:'both',limitation:'small'},
  'SEC-404':{identity:'approved',factor:'revoke',reset:'supervised',audit:'record'},
  'SEC-405':{containment:'isolate',evidence:'preserve',notify:'team',recovery:'clean'},
  'SEC-406':{package:'A',signature:'verify',digest:'verify',deployment:'pilot'}
};
const TOOLS={
  'NET-204':['survey channels','measure desk','show radio'],
  'NET-205':['show queue','service spooler','show printer'],
  'NET-206':['list snapshots','inspect restored','compare manifest'],
  'AI-304':['trace data','preview activity','inspect participation'],
  'AI-305':['open source','preview summary','inspect boundary'],
  'AI-306':['show tickets','confusion matrix','group audit'],
  'SEC-404':['show recovery policy','inspect factor','preview recovery'],
  'SEC-405':['endpoint status','evidence register','recovery status'],
  'SEC-406':['inspect packages','verify manifest','preview pilot']
};
const apply=(id,state,action,value)=>applyExpandedAction(id,state,action,value).state;
const solved=id=>apply(id,apply(id,initialExpandedState(id),'save-expanded',SOLUTIONS[id]),'run-check');

test('nine distinct new cases cover each pathway and grade band without a public rubric',()=>{
  assert.equal(EXPANDED_SCENARIOS.length,9);
  assert.equal(new Set(EXPANDED_SCENARIOS.map(item=>item.id)).size,9);
  assert.equal(new Set(EXPANDED_SCENARIOS.map(item=>item.title)).size,9);
  for(const track of ['network','ai','security']){
    const cases=EXPANDED_SCENARIOS.filter(item=>item.track===track);
    assert.equal(cases.length,3);
    assert.deepEqual(cases.map(item=>item.grade),['7–8','9–10','11–12']);
  }
  for(const scenario of EXPANDED_SCENARIOS){
    assert.equal(supportsExpandedLab(scenario.id),true);
    assert.equal(scenario.clues.length,scenario.id==='NET-205'?4:3);assert.equal(scenario.questions.length,scenario.id==='NET-205'?3:2);
    assert.equal(Object.hasOwn(scenario,'rubric'),false);
    assert.ok(scenario.interviewFacts.every(item=>item.keywords.length>0 && typeof item.answer==='string'));
  }
});

for(const scenario of EXPANDED_SCENARIOS){
  const id=scenario.id;
  test(`${id}: intended repair needs applied choices and a current full test`,()=>{
    const initial=initialExpandedState(id), before=structuredClone(initial);
    assert.equal(verifyExpanded(id,initial).ok,false);
    assert.equal(verifyExpanded(id,apply(id,initial,'run-check')).ok,false);
    assert.deepEqual(initial,before,'Reducer must not mutate its input');
    const selected=apply(id,initial,'save-expanded',SOLUTIONS[id]);
    assert.equal(verifyExpanded(id,selected).ok,false,'A saved plan is not tested');
    const checked=apply(id,selected,'run-check');
    assert.equal(verifyExpanded(id,checked).ok,true);
    assert.equal(checked.results.length,4);assert.ok(checked.results.every(result=>result.ok));
    assert.equal(getExpandedMission(id,checked).complete,true);
    assert.deepEqual(normalizeExpandedState(id,JSON.parse(JSON.stringify(checked))),checked,'Valid work survives a saved-state roundtrip');
    assert.equal(verifyExpanded(id,apply(id,checked,'save-expanded',SOLUTIONS[id])).ok,false,'Applying a plan invalidates the previous test even when values repeat');
  });
  test(`${id}: each unsafe choice prevents delivery and stale tests cannot pass`,()=>{
    const fields=expandedStateFields(id);
    for(const [key,options] of Object.entries(fields)){
      for(const bad of options.filter(value=>value!==SOLUTIONS[id][key])){
        const tampered={...solved(id),[key]:bad,results:[{label:'Forged complete',ok:true}]};
        assert.equal(verifyExpanded(id,tampered).ok,false,`${key}=${bad} invalidates the saved signature`);
        const updated=apply(id,solved(id),'save-expanded',{...SOLUTIONS[id],[key]:bad});
        const checked=apply(id,updated,'run-check');
        assert.equal(verifyExpanded(id,checked).ok,false,`${key}=${bad} must fail its current predicates`);
        assert.ok(checked.results.some(result=>!result.ok));
      }
    }
    assert.equal(verifyExpanded(id,{...SOLUTIONS[id],tested:true,results:[{ok:true}],checkRuns:1}).ok,false,'A forged cached result cannot establish a test');
  });
  test(`${id}: tools show bounded fixed observations without changing edits, tests, or completion`,()=>{
    for(const state of [initialExpandedState(id),solved(id)]){
      for(const command of ['help',...TOOLS[id]]){
        const before=structuredClone(state), output=expandedDiagnostic(id,state,command);
        assert.ok(output.length>0 && output.length<=600);
        const result=applyExpandedAction(id,state,'inspect-command',{command});
        assert.equal(result.message,output);
        assert.deepEqual(result.state,before);assert.deepEqual(state,before);
      }
      for(const command of ['fetch https://real.example','ping 8.8.8.8','show queue\nrm -rf','x'.repeat(100),null]){
        const output=expandedDiagnostic(id,state,command);
        assert.match(output,/displayed practice tool/);
        assert.doesNotMatch(output,/real\.example|8\.8\.8\.8|rm -rf/,'Unsupported input is not echoed');
      }
    }
  });
  test(`${id}: strict normalization excludes unknown, prototype, oversized and invalid fields`,()=>{
    const initial=initialExpandedState(id), fields=expandedStateFields(id);
    const malformed={...initial,workspaceEdits:Infinity,checkRuns:-1,tested:'true',results:new Array(100).fill({label:'x',ok:true}),unexpected:'private@example.test',testSignature:'x'.repeat(10000)};
    for(const key of Object.keys(fields))malformed[key]='<img src=x onerror=alert(1)>';
    assert.deepEqual(normalizeExpandedState(id,malformed),initial);
    assert.deepEqual(normalizeExpandedState(id,Object.create(solved(id))),initial);
    assert.deepEqual(normalizeExpandedState(id,[]),initial);
    const saturated=normalizeExpandedState(id,{...initial,workspaceEdits:Number.MAX_SAFE_INTEGER,checkRuns:Number.MAX_SAFE_INTEGER});
    assert.equal(saturated.workspaceEdits,1000000);assert.equal(saturated.checkRuns,1000000);
    assert.deepEqual(applyExpandedAction(id,initial,'unsupported',{anything:'bad'}).state,initial);
    assert.equal(JSON.stringify(normalizeExpandedState(id,malformed)).includes('private@example.test'),false);
  });
}

test('wireless readouts distinguish coverage from channel overlap and compatible band',()=>{
  let state=apply('NET-204',initialExpandedState('NET-204'),'save-expanded',{...SOLUTIONS['NET-204'],channel:'36',width:'80'});
  assert.match(expandedDiagnostic('NET-204',state,'measure desk'),/−58 dBm/);
  assert.match(expandedDiagnostic('NET-204',state,'show radio'),/Compare the channel survey/);
  assert.equal(verifyExpanded('NET-204',apply('NET-204',state,'run-check')).ok,false);
  assert.match(expandedDiagnostic('NET-204',solved('NET-204'),'show radio'),/No modeled neighboring overlap/);
});

test('printing distinguishes service status, original-job preservation, and actual delivery',()=>{
  const state=apply('NET-205',initialExpandedState('NET-205'),'save-expanded',{spooler:'running'});
  assert.match(expandedDiagnostic('NET-205',state,'service spooler'),/running/);
  assert.match(expandedDiagnostic('NET-205',state,'show queue'),/Delivery is not complete/);
  assert.match(expandedDiagnostic('NET-205',solved('NET-205'),'show queue'),/original two-page handout printed/);
  assert.match(expandedDiagnostic('NET-205',apply('NET-205',state,'save-expanded',{job:'delete'}),'show queue'),/deleted/);
});

test('backup inspection rejects the newest empty export and separates copying from verification',()=>{
  const state=apply('NET-206',initialExpandedState('NET-206'),'save-expanded',{...SOLUTIONS['NET-206'],snapshot:'B-18'});
  assert.match(expandedDiagnostic('NET-206',state,'inspect restored'),/empty export/);
  assert.match(expandedDiagnostic('NET-206',state,'compare manifest'),/does not match/);
  assert.match(expandedDiagnostic('NET-206',solved('NET-206'),'compare manifest'),/content and integrity label match/);
});

test('AI activity previews fail closed locally and source injection never accesses a roster',()=>{
  assert.match(expandedDiagnostic('AI-304',initialExpandedState('AI-304'),'preview activity'),/No data was sent/);
  assert.match(expandedDiagnostic('AI-304',solved('AI-304'),'preview activity'),/No live AI service/);
  assert.match(expandedDiagnostic('AI-305',initialExpandedState('AI-305'),'preview summary'),/No roster is accessed/);
  assert.match(expandedDiagnostic('AI-305',solved('AI-305'),'preview summary'),/\[S-12\]/);
});

test('classifier matrix counts all four examples and exposes threshold tradeoffs',()=>{
  const high=expandedDiagnostic('AI-306',initialExpandedState('AI-306'),'confusion matrix');
  assert.match(high,/Urgent escalated: 1/);assert.match(high,/Urgent missed: 1/);assert.match(high,/Routine escalated: 0/);assert.match(high,/Routine not escalated: 2/);
  const low=expandedDiagnostic('AI-306',solved('AI-306'),'confusion matrix');
  assert.match(low,/Urgent escalated: 2/);assert.match(low,/Urgent missed: 0/);assert.match(low,/Routine escalated: 1/);assert.match(low,/Routine not escalated: 1/);
  assert.match(expandedDiagnostic('AI-306',initialExpandedState('AI-306'),'group audit'),/T3 missed/);
});

test('MFA, containment and package previews preserve the stated security boundaries',()=>{
  assert.match(expandedDiagnostic('SEC-404',solved('SEC-404'),'preview recovery'),/MFA required/);
  assert.match(expandedDiagnostic('SEC-404',initialExpandedState('SEC-404'),'inspect factor'),/still active/);
  assert.match(expandedDiagnostic('SEC-405',initialExpandedState('SEC-405'),'recovery status'),/unsafe route/);
  assert.match(expandedDiagnostic('SEC-405',solved('SEC-405'),'recovery status'),/prerequisites modeled as ready/);
  assert.match(expandedDiagnostic('SEC-406',initialExpandedState('SEC-406'),'verify manifest'),/not performed/);
  const mismatch=apply('SEC-406',solved('SEC-406'),'save-expanded',{package:'C'});
  assert.match(expandedDiagnostic('SEC-406',mismatch,'verify manifest'),/does not match/);
  assert.match(expandedDiagnostic('SEC-406',solved('SEC-406'),'preview pilot'),/limited pilot/);
});

function mockRoot(){
  const elements=new Map();
  const node=key=>{
    if(!elements.has(key))elements.set(key,{value:'',textContent:'',dataset:{},listeners:{},attributes:{},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(name,value){this.attributes[name]=value;}});
    return elements.get(key);
  };
  return {innerHTML:'',elements,querySelector:node,querySelectorAll(){return []}};
}
test('renderers use native controls, keep all data local, and reject injected saved markup',()=>{
  const markup=[];
  for(const scenario of EXPANDED_SCENARIOS){
    const root=mockRoot();
    const poison={...solved(scenario.id)};
    for(const key of Object.keys(SOLUTIONS[scenario.id]))poison[key]='<script>window.bad=true</script>';
    renderExpanded(root,scenario,poison,()=>{});
    const activity=['ai','security'].includes(scenario.track);
    if(activity) {
      assert.match(root.innerHTML,/data-learning-activity/);
      assert.match(root.innerHTML,/data-la-test>Test this setup<\/button>/);
      assert.match(root.innerHTML,/<button[^>]*data-la-choice=/);
      assert.match(root.innerHTML,/<details class="activity-reference">/);
      assert.doesNotMatch(root.innerHTML,/<form|<select\b/);
    } else {
      assert.match(root.innerHTML,/Use this workbench/);
      assert.match(root.innerHTML,/Apply my choices/);assert.match(root.innerHTML,/Run workspace test/);
    }
    assert.match(root.innerHTML,/role="status"/);
    assert.doesNotMatch(root.innerHTML,/<script|<iframe|javascript:|window\.bad|rubric/i);
    if(!activity)assert.equal((root.innerHTML.match(/<select /g)||[]).length,4);
    markup.push(root.innerHTML);
  }
  assert.equal(new Set(markup).size,9,'All nine cases have distinct equipment and artifacts');
});

test('renderer applies chosen field values atomically and test button runs actual model action',()=>{
  const root=mockRoot(), actions=[], scenario=EXPANDED_SCENARIOS[0];
  renderExpanded(root,scenario,initialExpandedState(scenario.id),(action,value)=>actions.push({action,value}));
  for(const [key,value] of Object.entries(SOLUTIONS[scenario.id]))root.querySelector(`select[name="${key}"]`).value=value;
  let prevented=false;root.querySelector('form').listeners.submit({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.deepEqual(actions[0],{action:'save-expanded',value:SOLUTIONS[scenario.id]});
  root.querySelector('[data-exp-test]').listeners.click();assert.deepEqual(actions[1],{action:'run-check',value:undefined});
});

test('unknown cases cannot produce a passing zero-check workspace',()=>{
  assert.equal(supportsExpandedLab('UNKNOWN'),false);
  assert.deepEqual(expandedStateFields('UNKNOWN'),{});
  assert.equal(verifyExpanded('UNKNOWN',{}).ok,false);
  assert.equal(getExpandedMission('UNKNOWN',{}).complete,false);
});
