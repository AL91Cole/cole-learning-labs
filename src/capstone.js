/** A local learning sequence over the existing simulations. No new record service. */
import {retainExperimentEvents} from './experiments.js?release=20261025-coding-visuals';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const CAPSTONE_STAGES = Object.freeze([
  {id:'INC-106',title:'Build the workstation',role:'Hardware technician',task:'Assemble the fictional classroom PC, start it, and open the lesson file.',handoff:'Which connections are needed for a working system, and which test shows it is ready?'},
  {id:'NET-201',title:'Restore the connection',role:'Network technician',task:'Investigate the library workstation and restore its approved classroom connection.',handoff:'What can a reachable address tell you? What still needs a name-resolution check?'},
  {id:'SEC-401',title:'Triage the suspicious message',role:'Security analyst',task:'Examine the fictional email and choose a safe, evidence-based response.',handoff:'Which message clues justify your decision, and how would you report the concern?'},
  {id:'AI-302',title:'Audit an AI recommendation',role:'AI reviewer',task:'Compare the supplied claims and ticket decisions with the source evidence.',handoff:'Which claim can you support, and where should a person review uncertainty?'},
  {id:'CODE-503',title:'Prepare the station checklist',role:'Developer',task:'Repair the small loop and test its output with every supplied fixture.',handoff:'How do boundary inputs help you know that every station is counted exactly once?'}
]);
const PREFIX = 'Capstone handoff / ';
const FIELDS = Object.freeze([
  ['works','What is ready for opening day?'],['evidence','Which tests support your handoff?'],
  ['connection','How did two of the pathways connect?'],['uncertain','What remains uncertain or needs another check?']
]);
export function capstoneHandoff(record) {
  const result=Object.fromEntries(FIELDS.map(([key])=>[key,'']));
  for(const event of Array.isArray(record?.events)?record.events:[]) {
    if(typeof event?.message!=='string'||!event.message.startsWith(PREFIX))continue;
    const split=event.message.indexOf(': ',PREFIX.length),key=event.message.slice(PREFIX.length,split);
    if(split>=0&&Object.hasOwn(result,key))result[key]=event.message.slice(split+2).slice(0,480);
  }
  return result;
}
export function writeCapstoneHandoff(record,key,value) {
  if(!FIELDS.some(([field])=>field===key)||typeof value!=='string')return false;
  const marker=PREFIX+key+': ',events=Array.isArray(record.events)?record.events:[];
  record.events=events.filter(event=>typeof event?.message!=='string'||!event.message.startsWith(marker));
  if(value.trim())record.events.push({time:new Date().toISOString(),kind:'info',message:marker+value.slice(0,480)});
  record.events=retainExperimentEvents({id:'CODE-503'},record.events);return true;
}
export function capstoneProgress(records,check) {
  return CAPSTONE_STAGES.map(stage=>{
    const record=Object.hasOwn(records||{},stage.id)?records[stage.id]:null;
    const current=!!record&&record.verified===true&&check(stage.id,record.state)?.ok===true;
    return {...stage,started:!!record,verified:current,explained:current&&record.closed===true};
  });
}
export function capstoneReport(records,check) {
  const progress=capstoneProgress(records,check),handoff=capstoneHandoff(records?.['CODE-503']);
  return 'COLE LEARNING LABS — CLASSROOM OPENING DAY\nCAP-601 · Five-pathway capstone\n\n'+progress.map((stage,index)=>`${index+1}. ${stage.title} (${stage.id})\nStatus: ${stage.explained?'Investigation finished':stage.verified?'Current technical check passed — explanation still open':'Investigation or fresh check needed'}\nEvidence question: ${stage.handoff}\nLearner explanation: ${records?.[stage.id]?.reflection||'Not recorded.'}`).join('\n\n')+'\n\nTECHNICIAN HANDOFF\n'+FIELDS.map(([key,label])=>label+'\n'+(handoff[key]||'Not recorded.')).join('\n\n')+'\n\nThese are local, learner-reported simulations, not a grade or proof of independent authorship. Review for private details before export. The five separate investigation reports contain the detailed actions and experiments.\n';
}
export function renderCapstone(records,check) {
  const progress=capstoneProgress(records,check),handoff=capstoneHandoff(records?.['CODE-503']);
  return `<section class="wrap page-intro"><p class="eyebrow">FIVE-PATHWAY CAPSTONE · CAP-601</p><h1>Classroom opening day.<br><em>Bring it all together.</em></h1><p>Your fictional technology team needs a classroom ready for its first lesson. Complete five connected work orders, then explain the evidence in a technician handoff.</p><div class="button-row"><a class="button button-outline" href="#educators">Teacher lesson launcher</a><a class="text-link" href="#labs">All investigations →</a></div></section><section class="wrap capstone-layout"><div><section class="case-panel"><h2>Your team briefing</h2><p>Work independently or in pairs. One person operates the equipment; the other predicts and records the evidence. Swap roles at each work order.</p><p>Plan two or three lessons, about 120–150 minutes in total, with time for discussion. Complete the work orders in any order. Each opens its three-step investigation and has a link back here.</p><p><strong>${progress.filter(stage=>stage.explained).length} of 5 investigations finished in this session.</strong> Existing work can contribute; choose “Start this lab again” inside a work order if your teacher wants a fresh attempt. A technical check is separate from the teacher’s assessment.</p></section><ol class="capstone-stages">${progress.map((stage,index)=>`<li class="case-panel"><p class="eyebrow">WORK ORDER ${index+1} · ${esc(stage.role)}</p><h2>${esc(stage.title)}</h2><p>${esc(stage.task)}</p><p class="capstone-state">${stage.explained?'✓ Investigation finished':stage.verified?'✓ Technical check passed · explain your result':stage.started?'In progress · a fresh check may be needed':'Ready to begin'}</p><p><strong>Bring back:</strong> ${esc(stage.handoff)}</p><a class="button" href="#lab/${stage.id}?mode=independent&amp;sequence=opening-day">${stage.started?'Continue':'Open'} ${stage.id} →</a></li>`).join('')}</ol></div><aside><section class="case-panel capstone-handoff"><p class="eyebrow">CHECK & EXPLAIN</p><h2>Your technician handoff</h2><p>Use fictional details. These notes join the coding work order’s local action record and follow its saving and clearing choices.</p>${FIELDS.map(([key,label])=>`<label class="lab-field">${esc(label)}<textarea data-capstone-field="${key}" maxlength="480" rows="3">${esc(handoff[key])}</textarea></label>`).join('')}<button id="capstone-report" class="button">Review capstone report</button><p>Export all five detailed lab reports when requested by your teacher. This summary does not automatically submit or grade work.</p><p role="status" id="capstone-save-state">Private practice · export before leaving unless device saving is enabled.</p></section><div id="work-privacy"></div></aside></section><dialog id="lab-dialog"><div id="dialog-content"></div><button id="dialog-close" class="button button-outline">Close</button></dialog>`;
}
export function mountCapstone(root,{record,onSave,onReport}) {
  const listeners=[];
  for(const input of root.querySelectorAll('[data-capstone-field]')) {
    const handler=()=>{writeCapstoneHandoff(record,input.dataset.capstoneField,input.value);onSave();};
    input.addEventListener('input',handler);listeners.push([input,'input',handler]);
  }
  const button=root.querySelector('#capstone-report'),handler=()=>onReport();
  button?.addEventListener('click',handler);if(button)listeners.push([button,'click',handler]);
  return ()=>listeners.forEach(([element,event,listener])=>element.removeEventListener(event,listener));
}
