import {SCENARIOS} from './scenarios.js?release=20261025-hands-on';
import {initialWorkspaceState,normalizeWorkspaceState,applyWorkspaceAction,renderWorkspace,disposeWorkspace,getWorkspaceMission} from './workspaces.js?release=20261025-hands-on';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const TRACKS=Object.freeze({network:'Networking',ai:'AI literacy',security:'Cybersecurity'});
export const practiceScenarioFor=id=>typeof id==='string'?SCENARIOS.find(scenario=>scenario.id===id&&Object.hasOwn(TRACKS,scenario.track))||null:null;
export function practiceHasWork(id,saved) {
  if(!practiceScenarioFor(id)) return false;
  const state=normalizeWorkspaceState(id,saved);
  return state.workspaceEdits>0||state.checkRuns>0||JSON.stringify(state.networkBench)!==JSON.stringify(initialWorkspaceState(id).networkBench);
}
export function applyPracticeAction(id,saved,action,value) {
  if(!practiceScenarioFor(id)) return {state:null,message:'This practice workbench is unavailable.',kind:'warning'};
  const outcome=applyWorkspaceAction(id,saved,action,value);
  if(action==='run-check'&&outcome.state.tested) {
    const mission=getWorkspaceMission(id,outcome.state);
    return {...outcome,message:`${mission.passed} of ${mission.total} checks pass. `+(mission.complete?'Try another change or choose a different lab.':'Read the results, change your setup, and test again.')};
  }
  return outcome;
}
export function renderPracticeWorkbench(scenario,saved) {
  const current=practiceScenarioFor(scenario?.id);
  if(!current) return '<section class="wrap practice-workbench"><h1>Practice workbench unavailable</h1><a href="#labs">Browse labs</a></section>';
  const state=normalizeWorkspaceState(current.id,saved),mission=getWorkspaceMission(current.id,state);
  const options=SCENARIOS.filter(item=>item.track===current.track);
  return `<section class="wrap practice-workbench"><header class="practice-header"><div><p class="practice-eyebrow">${esc(TRACKS[current.track])} · TRY IT YOURSELF</p><h1>Practice workbench</h1><p>Change the setup. See what happens. Test your ideas.</p></div><div class="practice-links">${current.track==='network'?'<a class="button" href="#studio/network">Build your own network</a>':''}<a class="button" href="#lab/${current.id}">Guided investigation</a></div></header><section class="practice-task" aria-label="Practice task"><label for="practice-case">Choose a lab<select id="practice-case" data-practice-case>${options.map(item=>`<option value="${item.id}"${item.id===current.id?' selected':''}>${item.id} · ${esc(item.title)}</option>`).join('')}</select></label><div><h2>${esc(current.title)}</h2><p><b>Goal:</b> ${esc(current.goal)}</p></div></section><details class="practice-clues"><summary>Task &amp; clues</summary><div><p>${esc(current.brief)}</p><ul>${(current.clues||[]).map(clue=>`<li><b>${esc(clue.label)}</b><p>${esc(clue.text)}</p></li>`).join('')}</ul></div></details><p class="practice-status" data-practice-status role="status">${mission.tested?`${mission.passed} of ${mission.total} checks pass.`:'No test yet. Use the workbench controls to make a change.'}</p><div data-practice-workspace></div><p class="practice-footer">Practice stays on this page. Open the guided investigation when you want to keep a lab report. Practice does not submit classroom work.</p></section>`;
}
export function mountPracticeWorkbench(root,{scenario,getState=()=>null,onChange=()=>{},onNavigate=id=>{globalThis.location.hash='#practice/'+id;}}={}) {
  const current=practiceScenarioFor(scenario?.id);
  if(!current) return ()=>{};
  const workspace=root.querySelector('[data-practice-workspace]'),status=root.querySelector('[data-practice-status]'),picker=root.querySelector('[data-practice-case]');
  if(!workspace||!status||!picker) return ()=>{};
  let state=normalizeWorkspaceState(current.id,getState()),disposed=false;
  function fieldDrafts() {
    return [...workspace.querySelectorAll('input[name],select[name],textarea[name]')].map(node=>({name:node.name,type:node.type,value:node.value,checked:node.checked}));
  }
  function restoreFields(drafts) {
    const fields=[...workspace.querySelectorAll('input[name],select[name],textarea[name]')];
    for(const draft of drafts) {
      const field=fields.find(node=>node.name===draft.name&&node.type===draft.type&&(node.type!=='checkbox'||node.value===draft.value));
      if(field) {field.value=draft.value;if(field.type==='checkbox'||field.type==='radio') field.checked=draft.checked;}
    }
  }
  function draw(drafts=[]) {
    renderWorkspace(workspace,current,state,onAction);
    workspace.querySelector('.ws-test-results>p')?.replaceChildren('Read the checks, try another change, and test again.');
    restoreFields(drafts);
  }
  function onAction(action,value) {
    if(disposed) return {state,message:'This workbench is closed.',kind:'warning'};
    const beforeState=state,drafts=typeof action==='string'&&action.startsWith('bench-')?fieldDrafts():[];
    const outcome=applyPracticeAction(current.id,state,action,value);
    state=outcome.state;
    if(action!=='inspect-command') {onChange(state);draw(drafts.filter(draft=>Object.is(beforeState[draft.name],state[draft.name])));}
    status.textContent=action==='inspect-command'?'Inspection updated. Read the tool output.':outcome.message;status.dataset.kind=outcome.kind;
    return {...outcome,rendered:action!=='inspect-command'};
  }
  const navigate=event=>{
    const next=practiceScenarioFor(event.target.value);
    if(next?.track===current.track) onNavigate(next.id);
  };
  picker.addEventListener('change',navigate);draw();
  return ()=>{disposed=true;picker.removeEventListener('change',navigate);disposeWorkspace(workspace);workspace.replaceChildren();};
}