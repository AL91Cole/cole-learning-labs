import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLearningActivity,mountLearningActivity,disposeLearningActivity} from '../src/learning-activities.js';
import {initialWorkspaceState,applyWorkspaceAction,verifyWorkspace,renderWorkspace} from '../src/workspaces.js';
import {SCENARIOS} from '../src/scenarios.js';
const cases=SCENARIOS.filter(s=>['ai','security'].includes(s.track));
const update=(id,state,a,v)=>applyWorkspaceAction(id,state,a,v).state;
class Node {
  constructor(dataset={}){this.dataset=dataset;this.listeners=new Map();this.value='';this.textContent='';this.checked=false;this.classList={add(){},remove(){}};}
  addEventListener(t,f){this.listeners.set(t,f);}removeEventListener(t,f){if(this.listeners.get(t)===f)this.listeners.delete(t);}
  fire(t,event={}){this.listeners.get(t)?.({preventDefault(){},...event});}
}
function fixture(items={}){
  const root=new Node(),status=new Node();root.querySelectorAll=s=>items[s]||[];root.querySelector=s=>s==='[data-la-status]'?status:items[s]?.[0]||null;return {root,status};
}
test('all twelve boards replace duplicate forms and keep full-test results explicit',()=>{
  assert.equal(cases.length,12);
  for(const scenario of cases){
    let state=initialWorkspaceState(scenario.id);const html=renderLearningActivity(scenario,state);
    assert.match(html,/data-la-test/);assert.match(html,/Preview only/);assert.doesNotMatch(html,/la-test-badge la-tested/);
    const visible=html.replace(/<details[^>]*>[\s\S]*?<\/details>/g,'').replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean);
    assert.ok(visible.length<600,scenario.id+' visible board stays focused ('+visible.length+' words)');
    const root={querySelector:()=>null,querySelectorAll:()=>[]};renderWorkspace(root,scenario,state,()=>{});
    assert.match(root.innerHTML,/data-learning-activity/);assert.doesNotMatch(root.innerHTML,/class="it-grid"|data-form=|class="exp-controls"/);
    assert.match(root.innerHTML,/<details class="activity-reference">/);
    if(scenario.id==='SEC-403')state=update(scenario.id,state,'acknowledge-scope',true);
    state=update(scenario.id,state,'run-check');assert.match(renderLearningActivity(scenario,state),/checks passed/);
  }
});
test('test button saves the current prompt draft before checking the actual model',()=>{
  const id='AI-301',editor=new Node(),run=new Node(),save=new Node(),checks=new Node();let state=initialWorkspaceState(id),actions=[];
  editor.value='For a fictional learner, explain computer networks in a short explanation. Include one practice question. Verify against class notes.';
  const {root}=fixture({'[data-la-editor]':[editor],'[data-la-test]':[run],'[data-la-save-prompt]':[save],'.la-checks':[checks]});
  mountLearningActivity(root,{id},()=>state,(a,v)=>{actions.push(a);state=update(id,state,a,v);});run.fire('click');
  assert.deepEqual(actions,['save-prompt','run-check']);assert.equal(verifyWorkspace(id,state).ok,true);assert.equal(checks.open,true,'A test reveals its feedback after focus restoration');
  editor.value='x'.repeat(3001);run.fire('click');assert.deepEqual(actions,['save-prompt','run-check'],'Invalid editor input never runs stale saved text');
});
test('local drag sorts a real claim but an external payload cannot change the model',()=>{
  const id='AI-302',card=new Node({laDrag:'claim0'}),drop=new Node({laDrop:'supported'});let state=initialWorkspaceState(id),actions=0;
  const {root}=fixture({'[data-la-drag]':[card],'[data-la-drop]':[drop]});mountLearningActivity(root,{id},()=>state,(a,v)=>{actions++;state=update(id,state,a,v);});
  drop.fire('drop',{dataTransfer:{getData(){return 'claim0';}}});assert.equal(actions,0);
  card.fire('dragstart',{dataTransfer:{setData(){}}});drop.fire('drop');assert.equal(actions,1);assert.equal(state.claims[0],'supported');assert.equal(state.tested,false);
  drop.fire('drop');assert.equal(actions,1,'A completed gesture cannot be replayed from external drop text');
});

test('scope and controls use the same reducer; disposal removes every listener',()=>{
  const id='SEC-403',scope=new Node(),record=new Node({laChoice:'record',laValue:'102'});let state=initialWorkspaceState(id),actions=0;
  const {root}=fixture({'[data-la-scope]':[scope],'[data-la-choice]':[record]});const mount=()=>mountLearningActivity(root,{id},()=>state,(a,v)=>{actions++;state=update(id,state,a,v);});
  mount();record.fire('click');assert.equal(actions,0);assert.equal(state.observed,false);
  scope.checked=true;scope.fire('change');record.fire('click');assert.equal(state.response.status,200);assert.equal(state.observed,true);
  const before=actions;mount();record.fire('click');assert.equal(actions,before+1,'Remount does not accumulate listeners');
  disposeLearningActivity(root);disposeLearningActivity(root);assert.equal(record.listeners.size,0);assert.equal(scope.listeners.size,0);record.fire('click');assert.equal(actions,before+1);
});
test('a control change removes the current pass badge until a fresh test',()=>{
  const id='AI-304',scenario=cases.find(s=>s.id===id);let state=initialWorkspaceState(id);
  state=update(id,state,'save-expanded',{input:'fiction',identifiers:'none',route:'local',participation:'alternative'});state=update(id,state,'run-check');
  assert.equal(verifyWorkspace(id,state).ok,true);assert.match(renderLearningActivity(scenario,state),/la-test-badge la-tested/);
  state=update(id,state,'save-expanded',{route:'external'});assert.equal(verifyWorkspace(id,state).ok,false);assert.doesNotMatch(renderLearningActivity(scenario,state),/la-test-badge la-tested/);
});

test('typing after a pass labels the unsaved prompt instead of showing a current success',()=>{
  const id='AI-301',editor=new Node(),badge=new Node();let state=initialWorkspaceState(id);
  editor.value=state.prompt;const {root,status}=fixture({'[data-la-editor]':[editor],'.la-test-badge':[badge]});
  mountLearningActivity(root,{id},()=>state,()=>assert.fail('Editing alone does not execute a test'));
  editor.value='My changed prompt';editor.fire('input');assert.match(badge.textContent,/changed.*test again/);assert.match(status.textContent,/Unsaved/);
});
