import {getFoundation,createFoundationRecord,applyFoundationAction,foundationSummary} from './foundation-model.js?release=20261025-hands-on';
import {renderFoundationVisual,mountFoundationScene} from './foundation-scene.js?release=20261025-hands-on';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=['explore','practice','check'];
const sectionLabels=['Explore & learn','Practice & test','Check & explain'];
const resolve=lab=>getFoundation(typeof lab==='string'?lab:lab?.id);
const correct=(record,check)=>record.answers?.[check.id]===check.answer;

/** Introductory practice has its own record, separate from ticket investigations. */
export function renderFoundationLab(candidate,record) {
  const lab=resolve(candidate);
  if(!lab)return '<section class="foundation-lab"><h1>Choose a beginner lab</h1><a href="#labs">Return to the lab catalog</a></section>';
  const current=record||createFoundationRecord(lab.id);
  return `<section class="foundation-lab" aria-labelledby="foundation-title">
    <header class="foundation-heading"><a href="#labs">← All labs</a><p class="foundation-eyebrow">Start here · ${esc(lab.code||lab.id)} · Grades ${esc(lab.grade)}</p><h1 id="foundation-title">${esc(lab.title)}</h1><p>${esc(lab.goal)}</p></header>
    <div class="foundation-tabs" role="tablist" aria-label="Beginner lab steps">${sections.map((id,i)=>`<button type="button" id="foundation-tab-${id}" data-foundation-section="${id}" role="tab" aria-controls="foundation-panel-${id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}"${i>0?' disabled aria-disabled="true"':''}><span>${i+1}</span> ${esc(sectionLabels[i])}</button>`).join('')}</div>
    <div class="foundation-body foundation-flow">
      <p class="foundation-step-status" data-foundation-step-status role="status">Explore each item to unlock practice.</p>
      <section id="foundation-panel-explore" data-foundation-panel="explore" role="tabpanel" aria-labelledby="foundation-tab-explore" tabindex="0"><div class="foundation-prompt" data-foundation-explore></div></section>
      <section id="foundation-panel-practice" data-foundation-panel="practice" role="tabpanel" aria-labelledby="foundation-tab-practice" tabindex="-1" hidden><div class="foundation-prompt" data-foundation-practice></div>
      </section>
      <section id="foundation-panel-check" data-foundation-panel="check" role="tabpanel" aria-labelledby="foundation-tab-check" tabindex="-1" hidden><div class="foundation-prompt" data-foundation-check></div><div class="foundation-explanation"><h2>Explain what you learned</h2><label for="foundation-notes">What did you try?<textarea id="foundation-notes" data-foundation-notes maxlength="2000" rows="3" aria-describedby="foundation-explanation-help" placeholder="I tried…">${esc(current.notes||'')}</textarea></label><label for="foundation-reflection">What did you learn from the result?<textarea id="foundation-reflection" data-foundation-reflection maxlength="2000" rows="3" aria-describedby="foundation-explanation-help" placeholder="The result showed…">${esc(current.reflection||'')}</textarea></label><p id="foundation-explanation-help" class="foundation-small">Write a sentence for each answer. Then finish your practice.</p><p data-foundation-explanation-status class="foundation-small" role="status"></p><div class="foundation-handoff"><button type="button" class="foundation-primary" data-foundation-report>Finish practice &amp; open report</button><a data-foundation-ticket aria-disabled="true" tabindex="-1">Next: try ticket ${esc(lab.nextLab)} →</a></div></div></section>
      <p class="foundation-feedback" data-foundation-feedback role="status" aria-live="polite">Choose an item. Read what it looks like and what it does.</p>
      <section class="foundation-stage" data-foundation-stage aria-label="Equipment and learning items"><h2 class="foundation-pane-heading">Workbench</h2><div class="foundation-visual" data-foundation-visual>${renderFoundationVisual(lab,current)}</div>
        <div class="foundation-item-buttons" role="group" aria-label="Choose an item to explore"${lab.track==='hardware'?'':' hidden'}>${lab.items.map(item=>`<button type="button" data-foundation-inspect="${esc(item.id)}" aria-pressed="false">${esc(item.label)}<span data-foundation-visited="${esc(item.id)}"></span></button>`).join('')}</div>
        <div class="foundation-code-workspace" data-foundation-code-workspace hidden><label for="foundation-code">Your practice code</label><textarea id="foundation-code" data-foundation-code maxlength="4000" rows="6" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="foundation-code-help">${esc(current.code)}</textarea><p id="foundation-code-help">Change one thing. Run the code and compare all three results.</p><button type="button" class="foundation-primary" data-foundation-run>Run all practice inputs</button><div data-foundation-code-results role="status" aria-live="polite"></div></div>
        <div class="foundation-caption" hidden><h2 data-foundation-item-title>Choose an item in the picture or the buttons.</h2><p data-foundation-looks></p><p data-foundation-role></p></div>
      </section>
      <div class="foundation-step-actions"><button type="button" data-foundation-back hidden>← Explore &amp; learn</button><button type="button" class="foundation-primary" data-foundation-next disabled>Next: Practice &amp; test →</button></div>
      <p class="foundation-small">Your work stays on this page. Save your report before leaving. Use made-up details.</p>
    </div></section><dialog id="lab-dialog"><div id="dialog-content"></div><button type="button" id="dialog-close" class="button button-outline">Close</button></dialog>`;
}

export function mountFoundationLab(root,{lab:candidate,record,onChange=()=>{},onReport=()=>{}}) {
  const lab=resolve(candidate),shell=root.querySelector('.foundation-lab');
  if(!lab||!shell)return {dispose(){},cancelInteraction(){}};
  let current=record||createFoundationRecord(lab.id),section='explore',selected=null,disposed=false,scene=null;
  let checkIndex=lab.checks.findIndex(check=>!correct(current,check));if(checkIndex<0)checkIndex=lab.checks.length;
  const $=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
  const visual=$('[data-foundation-visual]');
  function say(message,kind='info'){if(typeof message==='string'){const field=$('[data-foundation-feedback]');field.textContent=(kind==='warning'?'Try again. ':'')+message;field.dataset.kind=kind;}}
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
    $('[data-foundation-explore]').innerHTML=nextItem?`<p class="foundation-eyebrow">1. Explore &amp; learn</p><h2>Find ${esc(nextItem.label)}</h2><ol><li>Choose the item in the picture or buttons.</li><li>Read what it looks like and what it does.</li><li>Find the next item.</li></ol><p class="foundation-small">${progress.explored} of ${progress.exploreTotal} items read</p>`:'<p class="foundation-eyebrow">1. Explore &amp; learn</p><h2>You have read every item.</h2><p>Select Next below to try the practice.</p>';
    const prompt=$('[data-foundation-practice]');
    const readyToPractice=progress.explored===progress.exploreTotal;
    const firstWrong=lab.checks.findIndex(check=>!correct(current,check));
    if(firstWrong>=0&&checkIndex>firstWrong)checkIndex=firstWrong;
    const check=lab.checks[checkIndex];
    if(!readyToPractice)prompt.innerHTML='<h2>Read every item first.</h2><p>Then try one question at a time.</p>';
    else if(check){
      const done=correct(current,check);
      prompt.innerHTML=`<p class="foundation-eyebrow">2. Practice &amp; test · Question ${checkIndex+1} OF ${lab.checks.length}</p><h2>${esc(check.prompt)}</h2>${done?`<p class="foundation-correct">${esc(check.explanation)}</p><button type="button" class="foundation-primary" data-foundation-next-question>${checkIndex===lab.checks.length-1?'Start the practice task':'Next question'} →</button>`:`<p>Choose an answer. Read the feedback before you continue.</p><div class="foundation-answer-options" role="group" aria-label="Choose an answer">${check.options.map(option=>`<button type="button" data-foundation-answer="${esc(option.id)}" aria-pressed="${current.answers?.[check.id]===option.id}">${esc(option.label)}</button>`).join('')}</div>`}`;
    }else{
      const job=lab.jobs.find(job=>!current.practice.includes(job.id));
      prompt.innerHTML=job?`<p class="foundation-eyebrow">2. Practice &amp; test · Step ${current.practice.length+1} OF ${lab.jobs.length}</p><h2>${esc(job.prompt)}</h2>${lab.track==='coding'?'<p>Edit the code below. Run it and compare all three results. A test that fails helps you choose what to change.</p>':`<button type="button" class="foundation-primary" data-foundation-job>${esc(job.label)}</button><p class="foundation-small">Try this step. Check what changed in the picture.</p>`}`:'<p class="foundation-eyebrow">2. Practice &amp; test</p><h2>Your practice task works.</h2><p>Select Next below to explain what you learned.</p>';
    }
    if(lab.track==='coding')$('[data-foundation-code-results]').innerHTML=current.results.length?'<ul>'+current.results.map(result=>`<li><strong>${result.passed?'Works':'Try again'} · quantity ${esc(result.quantity)}</strong><span>Expected ${esc(result.expected)} · Your result ${esc(result.output?.join(' / ')||result.error?.message||'no output')}</span></li>`).join('')+'</ul>':'<p>Run the code to see what works and what needs another try.</p>';
    const outcomes=[['Read every item',progress.explored===progress.exploreTotal],['Answer each question',progress.checked===progress.checkTotal],['Finish and check the practice task',progress.practiceComplete]];
    $('[data-foundation-check]').innerHTML=`<p class="foundation-eyebrow">3. Check &amp; explain</p><h2>${progress.complete?'Practice finished.':'Your task works. What did you learn?'}</h2><p>${esc(lab.goal)}</p><ul class="foundation-outcomes">${outcomes.map(([label,done])=>`<li><span aria-hidden="true">${done?'✓':'○'}</span> ${label} <b>${done?'Done':'To do'}</b></li>`).join('')}</ul>`;
    for(const field of ['notes','reflection'])if($('[data-foundation-'+field+']').value!==(current[field]||''))$('[data-foundation-'+field+']').value=current[field]||'';
    $('[data-foundation-explanation-status]').textContent=progress.complete?'Both answers saved. Review and save your report.':'Write both answers, then select Finish practice & open report.';
  }
  function navigation(){
    const progress=summary(),explored=progress.explored===progress.exploreTotal;
    if(section==='check'&&!progress.practiceComplete)section=explored?'practice':'explore';
    if(section==='practice'&&!explored)section='explore';
    shell.dataset.section=section;
    all('[data-foundation-panel]').forEach(panel=>{const active=panel.dataset.foundationPanel===section;panel.hidden=!active;panel.tabIndex=active?0:-1;});
    all('[data-foundation-section]').forEach(tab=>{
      const active=tab.dataset.foundationSection===section,unlocked=tab.dataset.foundationSection==='explore'||(tab.dataset.foundationSection==='practice'?explored:progress.practiceComplete);
      tab.disabled=!unlocked;tab.setAttribute('aria-disabled',String(!unlocked));tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    });
    const stageVisible=section!=='check';$('[data-foundation-stage]').hidden=!stageVisible;scene?.setMode?.(section);scene?.setVisible?.(stageVisible);
    $('[data-foundation-code-workspace]').hidden=section!=='practice'||lab.track!=='coding'||!explored||checkIndex<lab.checks.length;
    const next=$('[data-foundation-next]'),back=$('[data-foundation-back]');
    next.hidden=section==='check';next.disabled=section==='explore'?!explored:!progress.practiceComplete;next.textContent=section==='explore'?'Next: Practice & test →':'Next: Check & explain →';
    back.hidden=section==='explore';back.textContent=section==='practice'?'← Explore & learn':'← Practice & test';
    $('[data-foundation-step-status]').textContent=section==='explore'?(explored?'Step 1 complete. Continue below.':`Read ${progress.exploreTotal-progress.explored} more item${progress.exploreTotal-progress.explored===1?'':'s'} to unlock practice.`):section==='practice'?(progress.practiceComplete?'Step 2 complete. Continue below.':'Answer the questions. Then follow and check each practice step.'):'Write what you tried and what you learned.';
    const ticket=$('[data-foundation-ticket]');ticket.setAttribute('aria-disabled',String(!progress.complete));ticket.tabIndex=progress.complete?0:-1;if(progress.complete)ticket.setAttribute('href','#lab/'+lab.nextLab);else ticket.removeAttribute('href');
  }
  function render(){caption();prompts();navigation();scene?.update(current);}
  function commit(action,{focus}={}) {
    if(disposed)return {state:current,kind:'warning',message:'This practice view is closed.'};
    scene?.cancelInteraction?.();
    const result=applyFoundationAction(lab.id,current,action);
    current=result.state;onChange(current);render();say(result.message,result.kind);
    if(focus){const target=$(focus)||$('[data-foundation-next]');if(target&&!target.hidden&&!target.disabled)target.focus({preventScroll:true});}
    return result;
  }
  function inspect(id,fromScene=false) {
    if(!lab.items.some(item=>item.id===id))return;
    selected=id;commit({type:'inspect',item:id});if(!fromScene)scene?.focus?.(id);
  }
  function activate(next,{focusTab=false}={}) {
    if(!sections.includes(next))return;
    const progress=summary();
    if(next!=='explore'&&progress.explored<progress.exploreTotal){say('Read every item in Explore & learn before you continue.');return;}
    if(next==='check'&&!progress.practiceComplete){say('Finish and check the practice task before you continue.');return;}
    scene?.cancelInteraction?.();section=next;
    navigation();
    if(focusTab)$(`[data-foundation-section="${section}"]`)?.focus({preventScroll:true});
    else $(`[data-foundation-panel="${section}"]`)?.focus({preventScroll:true});
    shell.scrollIntoView?.({block:'start',behavior:'auto'});
  }
  function click(event) {
    const target=event.target.closest?.('button,[data-foundation-ticket]');if(!target||!shell.contains(target)||disposed)return;
    if(Object.hasOwn(target.dataset,'foundationTicket')){if(!summary().complete){event.preventDefault?.();say('Finish your practice and save both answers first.');}return;}
    if(target.dataset.foundationSection){activate(target.dataset.foundationSection,{focusTab:true});return;}
    if(target.dataset.foundationGo){activate(target.dataset.foundationGo,{focusTab:true});return;}
    if(Object.hasOwn(target.dataset,'foundationNext')){activate(section==='explore'?'practice':'check');return;}
    if(Object.hasOwn(target.dataset,'foundationBack')){activate(section==='check'?'practice':'explore');return;}
    if(target.dataset.foundationInspect){inspect(target.dataset.foundationInspect);return;}
    if(target.dataset.foundationAnswer){const check=lab.checks[checkIndex];if(!check)return;const value=target.dataset.foundationAnswer;if(!check.options.some(option=>option.id===value))return;const result=commit({type:'answer',check:check.id,value});const focus=correct(result.state,check)?'[data-foundation-next-question]':`[data-foundation-answer="${value}"]`;$(focus)?.focus({preventScroll:true});return;}
    if(Object.hasOwn(target.dataset,'foundationNextQuestion')){if(!lab.checks[checkIndex]||!correct(current,lab.checks[checkIndex]))return;do{checkIndex++;}while(checkIndex<lab.checks.length&&correct(current,lab.checks[checkIndex]));prompts();navigation();say(checkIndex<lab.checks.length?'Choose an answer to this question.':'Follow the practice steps in order.');all('[data-foundation-answer]')[0]?.focus({preventScroll:true});$('[data-foundation-job]')?.focus({preventScroll:true});if(lab.track==='coding'&&checkIndex===lab.checks.length)$('[data-foundation-code]')?.focus({preventScroll:true});return;}
    if(Object.hasOwn(target.dataset,'foundationJob')){const job=lab.jobs.find(job=>!current.practice.includes(job.id));if(job)commit({type:'practice',action:job.action},{focus:'[data-foundation-job]'});return;}
    if(Object.hasOwn(target.dataset,'foundationRun')){commit({type:'run-code'});return;}
    if(Object.hasOwn(target.dataset,'foundationReport')){
      if(section!=='check'||!summary().practiceComplete){activate('check');say('Finish and check the practice task before opening the report.');return;}
      const result=commit({type:'save-explanation'});
      if(!summary().complete){$(`[data-foundation-${current.notes?.trim().length>=12?'reflection':'notes'}]`)?.focus({preventScroll:true});return;}
      scene?.cancelInteraction?.();onReport(result.state);return;
    }
  }
  function key(event) {
    const tab=event.target.closest?.('[data-foundation-section]');if(!tab)return;
    const index=sections.indexOf(tab.dataset.foundationSection),next={ArrowRight:(index+1)%3,ArrowLeft:(index+2)%3,Home:0,End:2}[event.key];
    if(next===undefined)return;event.preventDefault();activate(sections[next],{focusTab:true});
  }
  function input(event){
    if(event.target.matches?.('[data-foundation-code]'))commit({type:'code',source:event.target.value});
    else if(event.target.matches?.('[data-foundation-notes]'))commit({type:'explain',notes:event.target.value});
    else if(event.target.matches?.('[data-foundation-reflection]'))commit({type:'explain',reflection:event.target.value});
  }
  function close(){root.querySelector('#lab-dialog')?.close();}
  root.addEventListener('click',click);root.addEventListener('keydown',key);root.addEventListener('input',input);
  root.querySelector('#dialog-close')?.addEventListener('click',close);
  render();
  scene=mountFoundationScene(visual,{lab,record:current,onInspect:id=>inspect(id,true),onAction:action=>commit({type:'practice',action}),onStatus:status=>{if(!disposed)say(status?.message);}});
  navigation();
  return {cancelInteraction(){scene?.cancelInteraction?.();},dispose(){if(disposed)return;disposed=true;scene?.cancelInteraction?.();scene?.dispose();scene=null;root.removeEventListener('click',click);root.removeEventListener('keydown',key);root.removeEventListener('input',input);root.querySelector('#dialog-close')?.removeEventListener('click',close);}};
}
