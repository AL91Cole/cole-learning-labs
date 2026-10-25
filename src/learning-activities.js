import {supportsAIActivity,renderAIActivity,aiActivityAction} from './ai-activities.js?release=20261025-hands-on';
import {supportsSecurityActivity,renderSecurityActivity,securityActivityAction} from './security-activities.js?release=20261025-hands-on';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mounts=new WeakMap();
export const supportsLearningActivity=id=>supportsAIActivity(id)||supportsSecurityActivity(id);
export function learningActivityAction(id,state,name,value) {
  return supportsAIActivity(id)?aiActivityAction(id,state,name,value):supportsSecurityActivity(id)?securityActivityAction(id,state,name,value):null;
}
export function renderLearningActivity(scenario,state) {
  const id=scenario?.id;if(!supportsLearningActivity(id))return '';
  const rows=state.tested&&Array.isArray(state.results)?state.results:[],passed=rows.filter(item=>item.ok===true).length,ready=rows.length>0&&passed===rows.length;
  const body=supportsAIActivity(id)?renderAIActivity(id,state):renderSecurityActivity(id,state);
  const locked=id==='SEC-403'&&state.scope!==true;
  const replay=body.includes('data-la-flow')?'<button type="button" data-la-replay>Replay the flow</button>':'';
  return '<section class="learning-activity '+(supportsAIActivity(id)?'la-ai':'la-security')+'" data-learning-activity aria-label="Hands-on learning activity"><header class="la-toolbar"><span>'+(supportsAIActivity(id)?'AI WORKSHOP':'CYBER LAB')+'</span><b class="la-test-badge '+(ready?'la-tested':'')+'" role="status">'+(state.tested?passed+' / '+rows.length+' checks passed':'Explore first · test when ready')+'</b></header>'+body+'<footer class="la-footer"><p>Change a choice. Watch the result. Test your setup.</p><div>'+replay+'<button type="button" data-la-test'+(locked?' disabled':'')+'>Test this setup</button></div></footer><p class="la-status" data-la-status role="status" aria-live="polite">'+(state.tested?(ready?'Checks passed. Use your evidence to explain why.':'A missed check is a clue. Try another change.'):'Preview only. No full test yet.')+'</p><details class="la-checks" '+(state.tested?'open':'')+'><summary>What the test checks</summary>'+(rows.length?'<ul>'+rows.map(row=>'<li class="'+(row.ok?'la-check-ok':'la-check-revisit')+'"><b>'+(row.ok?'Passed':'Revisit')+'</b> '+esc(row.label)+'</li>').join('')+'</ul>':'<p>Run the test to compare your choices with the task.</p>')+'</details></section>';
}
export function disposeLearningActivity(root) {const cleanup=mounts.get(root);mounts.delete(root);cleanup?.();}
export function mountLearningActivity(root,scenario,getState,onAction) {
  disposeLearningActivity(root);if(!supportsLearningActivity(scenario?.id)||typeof onAction!=='function')return ()=>{};
  const listeners=[];let disposed=false,dragged=null;
  const bind=(node,type,handler)=>{if(node?.addEventListener){node.addEventListener(type,handler);listeners.push(()=>node.removeEventListener?.(type,handler));}};
  const all=selector=>Array.from(root.querySelectorAll?.(selector)||[]);
  const saved=()=>typeof getState==='function'?getState():getState;
  const editor=()=>root.querySelector?.('[data-la-editor]');
  const current=()=>{const state=saved();return editor()?{...state,prompt:editor().value}:state;};
  const message=text=>{const node=root.querySelector?.('[data-la-status]');if(node)node.textContent=text;};
  const apply=(name,value)=>{if(disposed)return;const action=learningActivityAction(scenario.id,current(),name,value);if(!action){message('That choice is unavailable. Use a control in this activity.');return;}onAction(action.action,action.value);};
  bind(editor(),'input',()=>{
    if(editor()?.value===saved()?.prompt)return;
    const badge=root.querySelector?.('.la-test-badge');if(badge){badge.textContent='Prompt changed · test again';badge.classList?.remove('la-tested');}
    message('Unsaved prompt edits. Save or test the current text.');
  });
  all('[data-la-choice]').forEach(button=>bind(button,'click',()=>apply(button.dataset.laChoice,button.dataset.laValue)));
  all('[data-la-save-prompt]').forEach(button=>bind(button,'click',()=>apply('prompt',editor()?.value)));
  all('[data-la-threshold]').forEach(input=>bind(input,'change',()=>apply('threshold',input.value==='0'?'0.50':'0.80')));
  all('[data-la-scope]').forEach(input=>bind(input,'change',()=>apply('scope',input.checked===true)));
  all('[data-la-test]').forEach(button=>bind(button,'click',()=>{
    if(disposed)return;
    if(editor()&&editor().value!==saved()?.prompt){const action=learningActivityAction(scenario.id,current(),'prompt',editor().value);if(!action){message('Keep the prompt at or below 3,000 characters.');return;}onAction(action.action,action.value);}
    onAction('run-check');
    const checks=root.querySelector?.('.la-checks');if(checks)checks.open=true;
  }));

  all('[data-la-drag]').forEach(card=>{
    bind(card,'dragstart',event=>{dragged=card.dataset.laDrag;event.dataTransfer?.setData?.('text/plain','local-activity-card');if(event.dataTransfer)event.dataTransfer.effectAllowed='move';root.classList?.add('la-dragging');message('Drop the card on a finding, or use its buttons.');});
    bind(card,'dragend',()=>{dragged=null;root.classList?.remove('la-dragging');});
  });
  all('[data-la-drop]').forEach(zone=>{
    bind(zone,'dragover',event=>{if(dragged!==null)event.preventDefault();});
    bind(zone,'drop',event=>{event.preventDefault();const field=dragged;dragged=null;root.classList?.remove('la-dragging');if(field!==null)apply(field,zone.dataset.laDrop);});
  });
  all('[data-la-replay]').forEach(button=>bind(button,'click',()=>{
    const panel=root.querySelector?.('[data-learning-activity]');if(!panel)return;
    panel.classList?.remove('la-replaying');void panel.offsetWidth;panel.classList?.add('la-replaying');message('Showing the current preview again. Your choices and test stay the same.');
  }));
  const cleanup=()=>{if(disposed)return;disposed=true;dragged=null;listeners.splice(0).forEach(remove=>remove());root.classList?.remove('la-dragging');};mounts.set(root,cleanup);return cleanup;
}
