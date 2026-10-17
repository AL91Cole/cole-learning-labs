import {getFoundation,createFoundationRecord,applyFoundationAction,foundationSummary} from './foundation-model.js?release=20261017-classic20';
import {renderFoundationVisual,mountFoundationScene} from './foundation-scene.js?release=20261017-classic20';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=['explore','practice','check'];
const resolve=lab=>getFoundation(typeof lab==='string'?lab:lab?.id);
const correct=(record,check)=>record.answers?.[check.id]===check.answer;

/** Introductory practice has its own record, separate from ticket investigations. */
export function renderFoundationLab(candidate,record) {
  const lab=resolve(candidate);
  if(!lab)return '<section class="foundation-lab"><h1>Choose a beginner lab</h1><a href="#labs">Return to the lab catalog</a></section>';
  const current=record||createFoundationRecord(lab.id);
  return `<section class="foundation-lab" aria-labelledby="foundation-title">
    <header class="foundation-heading"><a href="#labs">← All labs</a><p class="foundation-eyebrow">START HERE · ${esc(lab.code||lab.id)} · GRADES ${esc(lab.grade)}</p><h1 id="foundation-title">${esc(lab.title)}</h1><p>${esc(lab.goal)}</p></header>
    <div class="foundation-tabs" role="tablist" aria-label="Beginner lab sections">${sections.map((id,i)=>`<button type="button" id="foundation-tab-${id}" data-foundation-section="${id}" role="tab" aria-controls="foundation-panel-${id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}"><span>${i+1}</span> ${['Explore','Practice','Check'][i]}</button>`).join('')}</div>
    <div class="foundation-body">
      <section id="foundation-panel-explore" data-foundation-panel="explore" role="tabpanel" aria-labelledby="foundation-tab-explore" tabindex="-1"><div class="foundation-prompt" data-foundation-explore></div></section>
      <section id="foundation-panel-practice" data-foundation-panel="practice" role="tabpanel" aria-labelledby="foundation-tab-practice" tabindex="-1" hidden><div class="foundation-prompt" data-foundation-practice></div>
        <div class="foundation-code-workspace" data-foundation-code-workspace hidden><label for="foundation-code">Your practice code</label><textarea id="foundation-code" data-foundation-code maxlength="4000" rows="6" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="foundation-code-help">${esc(current.code)}</textarea><p id="foundation-code-help">Change the operator, then run the same code with every practice input. Use fictional practice code only.</p><button type="button" class="foundation-primary" data-foundation-run>Run all practice inputs</button><div data-foundation-code-results role="status" aria-live="polite"></div></div>
      </section>
      <section id="foundation-panel-check" data-foundation-panel="check" role="tabpanel" aria-labelledby="foundation-tab-check" tabindex="-1" hidden><div class="foundation-prompt" data-foundation-check></div><div class="foundation-handoff"><button type="button" class="foundation-primary" data-foundation-report>Review my practice report</button><a href="#lab/${esc(lab.nextLab)}">Next: try ticket ${esc(lab.nextLab)} →</a></div><p class="foundation-small">A report can include unfinished practice. Review and save it before leaving; saving does not submit it to a teacher.</p></section>
      <section class="foundation-stage" data-foundation-stage aria-label="Equipment and learning items"><div class="foundation-visual" data-foundation-visual>${renderFoundationVisual(lab,current)}</div>
        <div class="foundation-item-buttons" role="group" aria-label="Choose an item to explore"${lab.track==='hardware'?'':' hidden'}>${lab.items.map(item=>`<button type="button" data-foundation-inspect="${esc(item.id)}" aria-pressed="false">${esc(item.label)}<span data-foundation-visited="${esc(item.id)}"></span></button>`).join('')}</div>
        <div class="foundation-caption" aria-live="polite"><h2 data-foundation-item-title>Choose an item in the picture or the buttons.</h2><p data-foundation-looks></p><p data-foundation-role></p></div>
      </section>
      <p class="foundation-feedback" data-foundation-feedback role="status" aria-live="polite">Everything here is virtual. Explore the picture or use the large item buttons.</p>
      <details class="foundation-help"><summary>Help with this beginner lab</summary><ol><li>Explore each item. Read what it looks like and the job it does.</li><li>In Practice, choose an answer, read the feedback, and continue. Then follow one mini-job step at a time.</li><li>In Check, review what you tried and open your report. A full ticket is available when you are ready.</li></ol><p>Use Tab to move between controls and Enter or Space to choose. The tab row also supports Left/Right Arrow, Home and End. Choose a labeled part to inspect it, then use the current practice button to make a change.</p></details>
      <p class="foundation-small">Practice stays on this page. No sign-in is needed. Keep real names, emails, IDs and passwords out of your work.</p>
    </div></section><dialog id="lab-dialog"><div id="dialog-content"></div><button type="button" id="dialog-close" class="button button-outline">Close</button></dialog>`;
}

export function mountFoundationLab(root,{lab:candidate,record,onChange=()=>{},onReport=()=>{}}) {
  const lab=resolve(candidate),shell=root.querySelector('.foundation-lab');
  if(!lab||!shell)return {dispose(){},cancelInteraction(){}};
  let current=record||createFoundationRecord(lab.id),section='explore',selected=null,disposed=false,scene=null;
  let checkIndex=lab.checks.findIndex(check=>!correct(current,check));if(checkIndex<0)checkIndex=lab.checks.length;
  const $=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
  const visual=$('[data-foundation-visual]');
  function say(message){if(typeof message==='string')$('[data-foundation-feedback]').textContent=message;}
  function summary(){return foundationSummary(lab.id,current);}
  function caption() {
    const item=lab.items.find(item=>item.id===selected);
    $('[data-foundation-item-title]').textContent=item?item.label:'Choose an item in the picture or the buttons.';
    $('[data-foundation-looks]').textContent=item?'Look for: '+item.looks:'';
    $('[data-foundation-role]').textContent=item?'Its job: '+item.role:'';
    all('[data-foundation-inspect]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.foundationInspect===selected)));
    all('[data-foundation-visited]').forEach(marker=>{marker.textContent=current.explored.includes(marker.dataset.foundationVisited)?' · explored':'';});
  }
  function prompts() {
    const progress=summary(),nextItem=lab.items.find(item=>!current.explored.includes(item.id));
    $('[data-foundation-explore]').innerHTML=nextItem?`<p class="foundation-eyebrow">MEET THE EQUIPMENT</p><h2>Find ${esc(nextItem.label)}</h2><p>Choose it in the picture or the item buttons. Read what it looks like and what it does.</p><p class="foundation-small">${progress.explored} of ${progress.exploreTotal} items explored</p>`:'<h2>You have met every item.</h2><p>Now match the parts to their jobs and try a short practice task.</p><button type="button" class="foundation-primary" data-foundation-go="practice">Start practice →</button>';
    const prompt=$('[data-foundation-practice]');
    const readyToPractice=progress.explored===progress.exploreTotal;
    const check=lab.checks[checkIndex];
    if(!readyToPractice)prompt.innerHTML='<h2>Meet the equipment first.</h2><p>Explore the remaining items, then return here for one question at a time.</p><button type="button" class="foundation-primary" data-foundation-go="explore">Back to Explore</button>';
    else if(check){
      const done=correct(current,check);
      prompt.innerHTML=`<p class="foundation-eyebrow">MATCH THE JOB</p><h2>${esc(check.prompt)}</h2>${done?`<p class="foundation-correct">${esc(check.explanation)}</p><button type="button" class="foundation-primary" data-foundation-next-question>${checkIndex===lab.checks.length-1?'Start the mini-job':'Next question'} →</button>`:`<div class="foundation-answer-options" role="group" aria-label="Choose an answer">${check.options.map(option=>`<button type="button" data-foundation-answer="${esc(option.id)}" aria-pressed="${current.answers?.[check.id]===option.id}">${esc(option.label)}</button>`).join('')}</div>`}`;
    }else{
      const job=lab.jobs.find(job=>!current.practice.includes(job.id));
      prompt.innerHTML=job?`<p class="foundation-eyebrow">YOUR MINI-JOB</p><h2>${esc(job.prompt)}</h2>${lab.track==='coding'?'<p>Change the program below and run it. One program must work for all three quantities.</p>':`<button type="button" class="foundation-primary" data-foundation-job>${esc(job.label)}</button><p class="foundation-small">Use this button for the current step. The picture updates after each change.</p>`}`:'<h2>Your mini-job works.</h2><p>Review the task and what you learned.</p><button type="button" class="foundation-primary" data-foundation-go="check">Check my practice →</button>';
    }
    const codeWorkspace=$('[data-foundation-code-workspace]');
    codeWorkspace.hidden=lab.track!=='coding'||!readyToPractice||checkIndex<lab.checks.length;
    if(lab.track==='coding')$('[data-foundation-code-results]').innerHTML=current.results.length?'<ul>'+current.results.map(result=>`<li><strong>${result.passed?'Works':'Try again'} · quantity ${esc(result.quantity)}</strong><span>Expected ${esc(result.expected)} · observed ${esc(result.output?.join(' / ')||result.error?.message||'no output')}</span></li>`).join('')+'</ul>':'<p>Run the current program to compare its output with the expected results.</p>';
    const outcomes=[['Explore every item',progress.explored===progress.exploreTotal],['Match each role',progress.checked===progress.checkTotal],['Complete the mini-job',progress.practice===progress.practiceTotal]];
    $('[data-foundation-check]').innerHTML=`<p class="foundation-eyebrow">CHECK WHAT YOU LEARNED</p><h2>${progress.complete?'Your beginner lab is complete.':'Keep exploring and practising.'}</h2><p>${esc(lab.goal)}</p><ul class="foundation-outcomes">${outcomes.map(([label,done])=>`<li><span aria-hidden="true">${done?'✓':'○'}</span> ${label} <b>${done?'Done':'Still practising'}</b></li>`).join('')}</ul>${progress.complete?'':`<button type="button" data-foundation-go="${readyToPractice?'practice':'explore'}">${readyToPractice?'Return to Practice':'Return to Explore'}</button>`}`;
  }
  function render(){caption();prompts();scene?.update(current);}
  function commit(action,{focus}={}) {
    if(disposed)return {state:current,kind:'warning',message:'This practice view is closed.'};
    scene?.cancelInteraction?.();
    const result=applyFoundationAction(lab.id,current,action);
    current=result.state;onChange(current);render();say(result.message);
    if(focus)($(focus)||$('[data-foundation-go="check"]'))?.focus({preventScroll:true});
    return result;
  }
  function inspect(id,fromScene=false) {
    if(!lab.items.some(item=>item.id===id))return;
    selected=id;commit({type:'inspect',item:id});if(!fromScene)scene?.focus?.(id);
  }
  function activate(next,{focusTab=false}={}) {
    if(!sections.includes(next))return;
    scene?.cancelInteraction?.();section=next;
    all('[data-foundation-panel]').forEach(panel=>{panel.hidden=panel.dataset.foundationPanel!==section;});
    all('[data-foundation-section]').forEach(tab=>{const active=tab.dataset.foundationSection===section;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    $('[data-foundation-stage]').hidden=section==='check';scene?.setMode?.(section);scene?.setVisible?.(section!=='check');
    if(focusTab)$(`[data-foundation-section="${section}"]`)?.focus({preventScroll:true});
  }
  function click(event) {
    const target=event.target.closest?.('button');if(!target||!shell.contains(target))return;
    if(target.dataset.foundationSection){activate(target.dataset.foundationSection,{focusTab:true});return;}
    if(target.dataset.foundationGo){activate(target.dataset.foundationGo,{focusTab:true});return;}
    if(target.dataset.foundationInspect){inspect(target.dataset.foundationInspect);return;}
    if(target.dataset.foundationAnswer){const check=lab.checks[checkIndex];if(!check)return;const value=target.dataset.foundationAnswer;if(!check.options.some(option=>option.id===value))return;const result=commit({type:'answer',check:check.id,value});const focus=correct(result.state,check)?'[data-foundation-next-question]':`[data-foundation-answer="${value}"]`;$(focus)?.focus({preventScroll:true});return;}
    if(Object.hasOwn(target.dataset,'foundationNextQuestion')){if(!lab.checks[checkIndex]||!correct(current,lab.checks[checkIndex]))return;do{checkIndex++;}while(checkIndex<lab.checks.length&&correct(current,lab.checks[checkIndex]));prompts();all('[data-foundation-answer]')[0]?.focus({preventScroll:true});$('[data-foundation-job]')?.focus({preventScroll:true});if(lab.track==='coding'&&checkIndex===lab.checks.length)$('[data-foundation-code]')?.focus({preventScroll:true});return;}
    if(Object.hasOwn(target.dataset,'foundationJob')){const job=lab.jobs.find(job=>!current.practice.includes(job.id));if(job)commit({type:'practice',action:job.action},{focus:'[data-foundation-job]'});return;}
    if(Object.hasOwn(target.dataset,'foundationRun')){commit({type:'run-code'});return;}
    if(Object.hasOwn(target.dataset,'foundationReport')){scene?.cancelInteraction?.();onReport(current);return;}
  }
  function key(event) {
    const tab=event.target.closest?.('[data-foundation-section]');if(!tab)return;
    const index=sections.indexOf(tab.dataset.foundationSection),next={ArrowRight:(index+1)%3,ArrowLeft:(index+2)%3,Home:0,End:2}[event.key];
    if(next===undefined)return;event.preventDefault();activate(sections[next],{focusTab:true});
  }
  function input(event){if(event.target.matches?.('[data-foundation-code]'))commit({type:'code',source:event.target.value});}
  function close(){root.querySelector('#lab-dialog')?.close();}
  root.addEventListener('click',click);root.addEventListener('keydown',key);root.addEventListener('input',input);
  root.querySelector('#dialog-close')?.addEventListener('click',close);
  render();
  scene=mountFoundationScene(visual,{lab,record:current,onInspect:id=>inspect(id,true),onAction:action=>commit({type:'practice',action}),onStatus:status=>{if(!disposed)say(status?.message);}});
  scene?.setMode?.(section);scene?.setVisible?.(true);
  return {cancelInteraction(){scene?.cancelInteraction?.();},dispose(){if(disposed)return;disposed=true;scene?.cancelInteraction?.();scene?.dispose();scene=null;root.removeEventListener('click',click);root.removeEventListener('keydown',key);root.removeEventListener('input',input);root.querySelector('#dialog-close')?.removeEventListener('click',close);}};
}
