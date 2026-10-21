import {learningModes,renderLabLearning} from './teaching.js?release=20261021-chat27c';
import {renderExperiments,mountExperiments} from './experiments.js?release=20261021-chat27c';
import {transferCaseFor} from './scenarios.js?release=20261021-chat27c';

export function learningRoute(hash) {
  const [path,query='']=String(hash||'').replace(/^#/,'').split('?'),params=new URLSearchParams(query);
  const [page='home',id,step]=path.split('/');
  const mode=learningModes.some(item=>item.id===params.get('mode'))?params.get('mode'):'guided';
  const route={page:page||'home',id,mode,sequence:params.get('sequence')==='opening-day'?'opening-day':null};
  if(page==='lab')route.section=Math.max(1,['request','workbench','explain'].indexOf(step)+1);
  return route;
}
export function labPageHash(id,section,{mode='guided',sequence=null}={}) {
  const step=['request','workbench','explain'][Number(section)-1]||'request';
  const params=new URLSearchParams({mode:learningModes.some(item=>item.id===mode)?mode:'guided'});
  if(sequence==='opening-day')params.set('sequence',sequence);
  return '#lab/'+encodeURIComponent(id)+'/'+step+'?'+params;
}
export function mountLabLearning(root,{scenario,record,mode='guided',sequence,onSave,onTest,getResult}) {
  const shell=root.querySelector('.lab-shell'),select=root.querySelector('#learning-mode'),learning=root.querySelector('#lab-learning');
  function applyMode(value) {
    mode=learningModes.some(item=>item.id===value)?value:'guided';
    for(const item of learningModes)shell.classList.toggle('mode-'+item.id,item.id===mode);
    select.value=mode;learning.innerHTML='<details class="learning-support"><summary>Learning support</summary>'+renderLabLearning(scenario,mode)+'</details>';
    root.querySelector('#learning-mode-description').textContent=learningModes.find(item=>item.id===mode).description;
    const transfer=root.querySelector('#learning-transfer');
    const next=transferCaseFor(scenario.id);
    transfer.replaceChildren();transfer.hidden=!next;
    if(next){const text=document.createElement('span');text.textContent='Try the same symptom with a different cause: ';const link=document.createElement('a');link.href=labPageHash(next,1,{mode:'challenge'});link.textContent='Open transfer case '+next+' →';transfer.append(text,link);}
  }
  applyMode(mode);
  const change=()=>{applyMode(select.value);history.replaceState(null,'',labPageHash(scenario.id,shell.dataset.section||learningRoute(location.hash).section,{mode,sequence}));};
  select.addEventListener('change',change);
  const host=root.querySelector('#experiment-tools');host.innerHTML='<details class="experiment-notebook"><summary>Experiment notebook (optional)</summary>'+renderExperiments(scenario,record)+'</details>';
  const experiments=mountExperiments(host,{scenario,record,getState:()=>record.state,getResult,onSave,onTest});
  const refresh=event=>{if(event.detail?.id===scenario.id)experiments?.refresh({changed:event.detail.changed===true});};
  document.addEventListener('cole:lab-state-change',refresh);
  const dispose=()=>{select.removeEventListener('change',change);document.removeEventListener('cole:lab-state-change',refresh);experiments?.dispose();};
  // History restores support presentation without recreating learner controls
  // or writing another URL entry during Back/Forward traversal.
  dispose.setMode=applyMode;
  return dispose;
}
