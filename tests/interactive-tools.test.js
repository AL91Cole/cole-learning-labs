import test from 'node:test';
import assert from 'node:assert/strict';
import {interactiveToolAction,interactiveToolFields,renderInteractiveTools,mountInteractiveTools} from '../src/interactive-tools.js';
import {initialWorkspaceState,applyWorkspaceAction,verifyWorkspace} from '../src/workspaces.js';

const ids=['NET-201','NET-202','NET-203','NET-204','NET-205','NET-206','AI-301','AI-302','AI-303','AI-304','AI-305','AI-306','SEC-401','SEC-402','SEC-403','SEC-404','SEC-405','SEC-406'];
const apply=(id,state,action,value)=>applyWorkspaceAction(id,state,action,value).state;
const read=(state,key)=>/^claim[012]$/.test(key)?state.claims[Number(key.at(-1))]:state[key];

for(const id of ids){
  test(`${id}: direct controls alter the existing model without awarding a test`,()=>{
    let state=initialWorkspaceState(id);
    if(id==='SEC-403')state=apply(id,state,'acknowledge-scope',true);
    const html=renderInteractiveTools({id},state);
    assert.match(html,/data-it-tools/);assert.match(html,/data-it-test/);
    assert.doesNotMatch(html,/<form|on(?:click|error)=|<script/i);
    if(id==='AI-301'){
      assert.match(html,/data-it-chip="fiction"/);
      const action=interactiveToolAction(id,state,'prompt','For a fictional learner, explain computer networks.');
      state=apply(id,state,action.action,action.value);
      assert.equal(state.prompt,'For a fictional learner, explain computer networks.');
    }else{
      for(const field of interactiveToolFields(id)){
        for(const [value] of field.options){
          const before=structuredClone(state),action=interactiveToolAction(id,state,field.name,value);
          assert.ok(action,`${field.name}=${value} is an offered action`);
          state=apply(id,state,action.action,action.value);
          if(['flags','events'].includes(field.name))assert.equal(state[field.name].includes(value),!before[field.name].includes(value));
          else assert.equal(String(read(state,field.name)),value);
          for(const other of interactiveToolFields(id).filter(other=>other.name!==field.name))assert.deepEqual(read(state,other.name),read(before,other.name),'Changing one card preserves other saved choices');
          assert.equal(state.tested,false);
          assert.equal(verifyWorkspace(id,state).ok,false,'Only the explicit test action can verify a plan');
        }
      }
    }
  });
}

test('forged field values cannot create network targets, commands, record IDs or authorization',()=>{
  for(const id of ids){
    const state=initialWorkspaceState(id),before=structuredClone(state);
    for(const name of ['__proto__','constructor','scope','requested','events','source','threshold','prompt']){
      assert.equal(interactiveToolAction(id,state,name,{toString(){throw Error('Do not coerce arbitrary objects');}}),null);
      if(name!=='prompt')assert.equal(interactiveToolAction(id,state,name,'<script>fetch("https://example.com")</script>'),null);
    }
    assert.deepEqual(state,before);
    assert.equal(interactiveToolAction('unknown',state,'source','198.51.100.24'),null);
  }
  assert.equal(interactiveToolAction('AI-301',initialWorkspaceState('AI-301'),'prompt','x'.repeat(3001)),null);
  assert.equal(interactiveToolAction('SEC-403',initialWorkspaceState('SEC-403'),'patch','owner'),null,'A card cannot acknowledge scope');
});

test('evidence and event cards toggle one allowed item and preserve the rest',()=>{
  for(const [id,key,first,second] of [['SEC-401','flags','sender','destination'],['SEC-402','events','EVT-102','EVT-103']]){
    let state=initialWorkspaceState(id);
    for(const item of [first,second,first]){const action=interactiveToolAction(id,state,key,item);state=apply(id,state,action.action,action.value);}
    assert.deepEqual(state[key],[second]);
    assert.equal(state.workspaceEdits,3);assert.equal(state.checkRuns,0);
  }
});

test('an applied card invalidates prior full-test evidence',()=>{
  let state=initialWorkspaceState('AI-305');
  state=apply('AI-305',state,'save-expanded',{boundary:'data',injected:'reject',citation:'S-12',review:'human'});
  state=apply('AI-305',state,'run-check');assert.equal(verifyWorkspace('AI-305',state).ok,true);
  const action=interactiveToolAction('AI-305',state,'injected','execute');
  state=apply('AI-305',state,action.action,action.value);
  assert.equal(state.tested,false);assert.equal(verifyWorkspace('AI-305',state).ok,false);
});

test('visual flows escape saved values and classifier matrix follows the saved threshold',()=>{
  const html=renderInteractiveTools({id:'NET-202'},{network:'<img src=x onerror=alert(1)>',folder:'<script>',permission:'&"'});
  assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/&lt;img/);
  const high=renderInteractiveTools({id:'AI-306'},initialWorkspaceState('AI-306'));
  const low=renderInteractiveTools({id:'AI-306'},{...initialWorkspaceState('AI-306'),threshold:'0.50'});
  assert.match(high,/<b>1<\/b><span>Urgent → missed/);assert.match(low,/<b>0<\/b><span>Urgent → missed/);
  assert.equal(renderInteractiveTools({id:'NET-999'},{}),'');
});
function fakeToolsRoot(buttons=[],extra={}){
  const selectors={'[data-it-field]':buttons,'[data-it-test]':[], '[data-it-threshold]':[], '[data-it-chip]':[], 'form[data-form], form.exp-controls':[],...extra};
  return {querySelectorAll:selector=>selectors[selector]??[],querySelector:selector=>selectors[selector]?.[0]??null};
}
const control=(dataset={})=>({dataset,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},focus(){this.focused=true;}});

test('mounted action cards use fresh saved state and execute the model reducer',()=>{
  let state=initialWorkspaceState('AI-303');state=apply('AI-303',state,'run-check');
  const owner=control({itField:'authorization',itValue:'owner'}),source=control({itField:'secret',itValue:'hardcoded'});
  const root=fakeToolsRoot([owner,source]),actions=[];
  mountInteractiveTools(root,{id:'AI-303'},()=>state,(action,value)=>{actions.push(action);state=apply('AI-303',state,action,value);});
  owner.listeners.click();assert.equal(state.authorization,'owner');assert.equal(state.tested,false);assert.equal(owner.focused,true);
  source.listeners.click();assert.equal(state.secret,'hardcoded');assert.equal(state.authorization,'owner','Second click reads the latest model');
  owner.dataset.itValue='fetch secrets';owner.listeners.click();assert.equal(actions.length,2,'A tampered card cannot introduce a new action value');
});

test('threshold slider applies the chosen model value and test remains a separate action',()=>{
  let state=initialWorkspaceState('AI-306');const slider=control(),run=control();slider.value='0';
  const root=fakeToolsRoot([],{'[data-it-threshold]':[slider],'[data-it-test]':[run]});
  mountInteractiveTools(root,{id:'AI-306'},()=>state,(action,value)=>{state=apply('AI-306',state,action,value);});
  slider.listeners.change();assert.equal(state.threshold,'0.50');assert.equal(state.checkRuns,0);assert.equal(state.tested,false);
  run.listeners.click();assert.equal(state.checkRuns,1);assert.equal(state.tested,true);assert.equal(verifyWorkspace('AI-306',state).ok,false,'A threshold alone does not repair the entire evaluation');
});

test('prompt chips edit a bounded draft, preserve review, and never silently save or check',()=>{
  const state=initialWorkspaceState('AI-301'),chip=control({itChip:'task'}),clear=control({itChip:'clear'}),area=control(),live=control(),actions=[];
  area.value=state.prompt;
  const root=fakeToolsRoot([],{'[data-it-chip]':[chip,clear],'textarea[name="prompt"]':[area],'[data-it-live]':[live]});
  mountInteractiveTools(root,{id:'AI-301'},()=>state,(...args)=>actions.push(args));
  chip.listeners.click();assert.match(area.value,/short explanation of computer networks/);assert.match(live.textContent,/choose Save prompt/);
  assert.deepEqual(actions,[]);assert.equal(state.prompt,initialWorkspaceState('AI-301').prompt);
  area.value='x'.repeat(2990);chip.listeners.click();assert.ok(area.value.length<=3000);
  clear.listeners.click();assert.equal(area.value,'');assert.equal(area.focused,true);assert.deepEqual(actions,[]);
});
