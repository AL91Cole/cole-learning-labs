import test from 'node:test';
import assert from 'node:assert/strict';
import {supportsAIActivity,renderAIActivity,aiActivityAction} from '../src/ai-activities.js';
import {interactiveToolFields} from '../src/interactive-tools.js';
import {initialWorkspaceState,applyWorkspaceAction,verifyWorkspace} from '../src/workspaces.js';
const ids=['AI-301','AI-302','AI-303','AI-304','AI-305','AI-306'];
const apply=(id,state,name,value)=>{const command=aiActivityAction(id,state,name,value);assert.ok(command,`${id}: offered ${name}=${value}`);return applyWorkspaceAction(id,state,command.action,command.value).state;};
const run=(id,state)=>applyWorkspaceAction(id,state,'run-check').state;
const read=(state,key)=>/^claim[012]$/.test(key)?state.claims[Number(key.at(-1))]:state[key];
for(const id of ids){
 test(`${id}: board renders actionable controls; editing leaves full test explicit`,()=>{
  let state=initialWorkspaceState(id),html=renderAIActivity(id,state);
  assert.equal(supportsAIActivity(id),true);assert.match(html,/class="ai-activity"/);assert.match(html,/data-la-choice=/);
  assert.doesNotMatch(html,/<script|on(?:click|error)=|<form/i);
  assert.doesNotMatch(html,/Latest full test|checks passing/);
  const fields=interactiveToolFields(id);
  for(const field of fields){
   for(const [value] of field.options){
    const before=structuredClone(state);state=apply(id,state,field.name,value);
    assert.equal(read(state,field.name),value);
    for(const other of fields.filter(other=>other.name!==field.name))assert.deepEqual(read(state,other.name),read(before,other.name));
    assert.equal(state.tested,false);assert.equal(state.checkRuns,0);
    assert.equal(verifyWorkspace(id,state).ok,false);
   }
  }
 });
}
test('prompt tiles and demo cleanup alter saved text through the actual reducer',()=>{
 let state=initialWorkspaceState('AI-301');
 const privateDraft=state.prompt;state=apply('AI-301',state,'prompt-clean','demo-private');
 assert.notEqual(state.prompt,privateDraft);assert.doesNotMatch(state.prompt,/\[student|\[diagnosis/);
 state=apply('AI-301',state,'prompt-clear','blank');assert.equal(state.prompt,'');
 for(const chip of ['fiction','task','practice','verify'])state=apply('AI-301',state,'prompt-chip',chip);
 assert.equal(state.tested,false);assert.equal(state.checkRuns,0);
 state=run('AI-301',state);assert.equal(verifyWorkspace('AI-301',state).ok,true);
 state=apply('AI-301',state,'prompt','A safe-looking short draft');assert.equal(state.tested,false);
});
test('demo cleanup does not claim to remove arbitrary personal details',()=>{
 let state=initialWorkspaceState('AI-301');state.prompt='Fictional text; real@example.test and [student name].';
 state=apply('AI-301',state,'prompt-clean','demo-private');assert.match(state.prompt,/real@example.test/);
 state=run('AI-301',state);assert.equal(verifyWorkspace('AI-301',state).ok,false);
 assert.match(renderAIActivity('AI-301',state),/three demo placeholders only/);
});
test('claim sorting and fair categories match the supplied evidence, not matching labels alone',()=>{
 let state=initialWorkspaceState('AI-302');
 for(const [field,value] of [['claim0','supported'],['claim1','unsupported'],['claim2','biased'],['ticketA','User effort'],['ticketB','User effort']])state=apply('AI-302',state,field,value);
 assert.equal(verifyWorkspace('AI-302',run('AI-302',state)).ok,false);
 for(const field of ['ticketA','ticketB'])state=apply('AI-302',state,field,'Display / cable');
 assert.equal(verifyWorkspace('AI-302',run('AI-302',state)).ok,true);
 const html=renderAIActivity('AI-302',state);assert.equal((html.match(/data-la-drag="claim[012]"/g)||[]).length,3);assert.equal((html.match(/data-la-drop=/g)||[]).length,9);
});
test('code tiles visibly preserve owner access and deny another learner only with ownership check',()=>{
 let state=initialWorkspaceState('AI-303');
 assert.match(renderAIActivity('AI-303',state),/200 · exposed/);
 state=apply('AI-303',state,'authorization','hidden');assert.match(renderAIActivity('AI-303',state),/200 · exposed/);
 state=apply('AI-303',state,'authorization','owner');
 const html=renderAIActivity('AI-303',state);assert.match(html,/200 · allowed/);assert.match(html,/403 · denied/);
 assert.equal(state.tested,false);assert.equal(verifyWorkspace('AI-303',run('AI-303',state)).ok,true);
 state=apply('AI-303',run('AI-303',state),'query','concatenated');assert.equal(state.tested,false);
 assert.equal(verifyWorkspace('AI-303',run('AI-303',state)).ok,false,'An ownership fix does not replace safe query input');
});
test('privacy route previews expose collection, external transfer, and participation separately',()=>{
 let state=initialWorkspaceState('AI-304');state=apply('AI-304',state,'route','external');
 assert.match(renderAIActivity('AI-304',state),/would expose private details/);
 state=apply('AI-304',state,'route','local');assert.match(renderAIActivity('AI-304',state),/Private details are still included/);
 state=apply('AI-304',state,'input','fiction');state=apply('AI-304',state,'participation','required');
 assert.match(renderAIActivity('AI-304',state),/No equivalent option/);
 assert.equal(verifyWorkspace('AI-304',run('AI-304',state)).ok,false);
 state=apply('AI-304',state,'participation','alternative');assert.equal(verifyWorkspace('AI-304',run('AI-304',state)).ok,true);
});
test('blocking disclosure does not silently mark source boundary, citation, or review complete',()=>{
 let state=initialWorkspaceState('AI-305');state=apply('AI-305',state,'injected','reject');
 const html=renderAIActivity('AI-305',state);assert.match(html,/Request BLOCKED/);assert.match(html,/Instructions accepted/);assert.match(html,/citation missing/);
 assert.equal(verifyWorkspace('AI-305',run('AI-305',state)).ok,false);
 for(const [name,value] of [['boundary','data'],['citation','S-12'],['review','human']])state=apply('AI-305',state,name,value);
 assert.equal(verifyWorkspace('AI-305',run('AI-305',state)).ok,true);
});
test('threshold movement routes all four actual examples and reveals group tradeoffs',()=>{
 let state=initialWorkspaceState('AI-306'),html=renderAIActivity('AI-306',state);
 assert.match(html,/Priority review · 1/);assert.match(html,/Standard queue · 3/);assert.match(html,/Urgent → missed by threshold/);
 state=apply('AI-306',state,'threshold','0.50');state=apply('AI-306',state,'audit','both');html=renderAIActivity('AI-306',state);
 assert.match(html,/Priority review · 3/);assert.match(html,/Standard queue · 1/);assert.doesNotMatch(html,/Urgent → missed by threshold/);
 assert.match(html,/Routine → extra review/);assert.match(html,/Group A<\/b> · 1\/1 urgent found · 1 extra review/);assert.match(html,/Group B<\/b> · 1\/1 urgent found · 0 extra review/);
 for(const id of ['T1','T2','T3','T4'])assert.equal((html.match(new RegExp(`${id} · Group`,'g'))||[]).length,1);
 assert.equal(state.tested,false);assert.equal(verifyWorkspace('AI-306',run('AI-306',state)).ok,false);
 state=apply('AI-306',state,'decision','human');state=apply('AI-306',state,'limitation','small');assert.equal(verifyWorkspace('AI-306',run('AI-306',state)).ok,true);
});
test('hostile action values cannot become fields, code, sources, thresholds, or automatic tests',()=>{
 for(const id of ids){
  const state=initialWorkspaceState(id),before=structuredClone(state);
  for(const name of ['__proto__','constructor','scope','run-check','threshold','boundary']){
   assert.equal(aiActivityAction(id,state,name,'<script>fetch("https://example.test")</script>'),null);
   assert.equal(aiActivityAction(id,state,name,{toString(){throw Error('No coercion');}}),null);
  }
  assert.deepEqual(state,before);assert.equal(aiActivityAction(id,null,'prompt','x'),null);
 }
 assert.equal(aiActivityAction('AI-301',initialWorkspaceState('AI-301'),'prompt','x'.repeat(3001)),null);
 assert.equal(aiActivityAction('AI-301',initialWorkspaceState('AI-301'),'prompt-chip','constructor'),null);
 assert.equal(aiActivityAction('SEC-401',{},'verdict','phishing'),null);
 let calls=0;const hostile={get prompt(){calls++;return 'private';}};
 assert.equal(aiActivityAction('AI-301',hostile,'prompt-chip','fiction'),null);assert.equal(calls,0);
 const claims=['supported','unsupported','biased'];Object.defineProperty(claims,'0',{get(){calls++;return 'supported';}});
 assert.equal(aiActivityAction('AI-302',{claims},'claim0','supported'),null);assert.equal(calls,0);
});
test('saved prompt values stay escaped and supported routes remain narrow',()=>{
 const html=renderAIActivity('AI-301',{prompt:'</textarea><img src=x onerror=alert(1)><script>bad</script>'});
 assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/&lt;\/textarea&gt;/);
 assert.equal(supportsAIActivity('AI-307'),false);assert.equal(renderAIActivity('AI-307',{}),'');
});
