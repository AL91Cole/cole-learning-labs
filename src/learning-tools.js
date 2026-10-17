import {learningModes,renderLabLearning} from './teaching.js?release=20261016-teaching9';
import {renderExperiments,mountExperiments} from './experiments.js?release=20261016-teaching9';
import {transferCaseFor} from './scenarios.js?release=20261016-teaching9';

export function learningRoute(hash) {
  const [path,query='']=String(hash||'').replace(/^#/,'').split('?'),params=new URLSearchParams(query);
  const [page='home',id]=path.split('/');
  const mode=learningModes.some(item=>item.id===params.get('mode'))?params.get('mode'):'guided';
  return {page:page||'home',id,mode,sequence:params.get('sequence')==='opening-day'?'opening-day':null};
}
export function mountLabLearning(root,{scenario,record,mode='guided',sequence,onSave,onTest,getResult}) {
  const shell=root.querySelector('.lab-shell'),select=root.querySelector('#learning-mode'),learning=root.querySelector('#lab-learning');
  function applyMode(value) {
    mode=learningModes.some(item=>item.id===value)?value:'guided';
    for(const item of learningModes)shell.classList.toggle('mode-'+item.id,item.id===mode);
    select.value=mode;learning.innerHTML=renderLabLearning(scenario,mode);
    const starters=root.querySelector('.intake-questions');if(starters)starters.open=mode==='guided';
    root.querySelector('#learning-mode-description').textContent=learningModes.find(item=>item.id===mode).description;
    const transfer=root.querySelector('#learning-transfer');
    const next=transferCaseFor(scenario.id);
    transfer.replaceChildren();transfer.hidden=!next;
    if(next){const text=document.createElement('span');text.textContent='Try the same symptom with a different cause: ';const link=document.createElement('a');link.href='#lab/'+next+'?mode=challenge';link.textContent='Open transfer case '+next+' →';transfer.append(text,link);}
  }
  applyMode(mode);
  const change=()=>{applyMode(select.value);history.replaceState(null,'','#lab/'+scenario.id+'?mode='+mode+(sequence?'&sequence=opening-day':''));};
  select.addEventListener('change',change);
  const host=root.querySelector('#experiment-tools');host.innerHTML=renderExperiments(scenario,record);
  const experiments=mountExperiments(host,{scenario,record,getState:()=>record.state,getResult,onSave,onTest});
  const refresh=event=>{if(event.detail?.id===scenario.id)experiments?.refresh({changed:event.detail.changed===true});};
  document.addEventListener('cole:lab-state-change',refresh);
  return ()=>{select.removeEventListener('change',change);document.removeEventListener('cole:lab-state-change',refresh);experiments?.dispose();};
}
