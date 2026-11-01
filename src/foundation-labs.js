import {getFoundation,createFoundationRecord,applyFoundationAction,foundationSummary} from './foundation-model.js?release=20261025-learning-plans';
import {OWNER_PREVIEW} from './owner-preview.js?release=20261025-learning-plans';
import {renderFoundationVisual,mountFoundationScene} from './foundation-scene.js?release=20261025-learning-plans';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=['explore','practice','check'];
const sectionLabels=['Explore & learn','Practice & test','Check & explain'];
const resolve=lab=>getFoundation(typeof lab==='string'?lab:lab?.id);
const correct=(record,check)=>record.answers?.[check.id]===check.answer;

function practiceBoard(lab,current) {
  const state=current.simulation||{},job=lab.jobs.find(job=>!current.practice.includes(job.id)),index=current.practice.length;
  const choice=lab.choices?.[index];
  const controls=job?'<div class="foundation-board-controls"><button type="button" class="foundation-primary" data-foundation-job>'+esc(job.label)+'</button>'+(choice?'<button type="button" data-foundation-choice="'+esc(choice.action)+'">'+esc(choice.label)+'</button>':'')+'</div>':'';
  if(lab.track==='network')return '<div class="foundation-live-board"><svg class="foundation-network-path" viewBox="0 0 760 160" role="img" aria-label="Practice network: PC '+(state.wired?'connected':'disconnected')+'; '+(state.ipAssigned?'address ready':'no address')+'; page '+(state.serviceReachable?'open':'waiting')+'"><path class="foundation-path '+(state.wired?'is-ready':'')+'" d="M150 65H330"/><path class="foundation-path '+(state.serviceReachable?'is-ready':'')+'" d="M430 65H610"/>'+(state.serviceReachable?'<circle class="foundation-packet" cx="180" cy="65" r="8"/>':'')+'<rect x="25" y="22" width="125" height="85" rx="9"/><path d="M58 119h60m-30-12v12"/><rect x="330" y="42" width="100" height="48" rx="8"/><path d="M347 62h12m10 0h12m10 0h12"/><rect x="610" y="22" width="125" height="85" rx="9"/><text x="88" y="71">PC</text><text x="380" y="119">Switch</text><text x="673" y="71">'+(state.serviceReachable?'Page open':'Practice page')+'</text><text x="240" y="98">'+(state.wired?'Cable connected':'Cable missing')+'</text></svg><div class="foundation-board-facts"><p><b>IP address</b><span>'+(state.ipAssigned?'192.0.2.20':'Not assigned')+'</span></p><p><b>Name lookup</b><span>'+(state.dnsReady?'practice.example → 192.0.2.80':'Not tested')+'</span></p><p><b>Page test</b><span>'+(state.serviceReachable?'✓ Opened':'○ Waiting')+'</span></p></div>'+controls+'</div>';
  if(lab.track==='ai')return '<div class="foundation-live-board"><div class="foundation-board-facts"><p><b>Prompt</b><span>'+(state.fictionalPrompt?'Help a made-up classroom keep its computers ready.':'Choose the fictional classroom example.')+'</span></p><p class="'+(state.evidenceChecked?'foundation-board-good':state.fictionalPrompt?'foundation-board-caution':'')+'"><b>AI reply '+(state.evidenceChecked?'· corrected':state.fictionalPrompt?'· unverified':'· waiting')+'</b><span>'+(state.evidenceChecked?'Save work. Restart only when instructed.':state.fictionalPrompt?'Restart every 30 minutes.':'Choose a prompt to see the reply.')+'</span></p><p><b>Source card</b><span>Save work. Restart only when instructed.</span></p></div><p class="foundation-review-badge">'+(state.humanReviewed?'✓ A person checked accuracy and fairness':'○ Human review still needed')+'</p>'+controls+'</div>';
  if(lab.track==='security')return '<div class="foundation-live-board"><div class="foundation-account"><span aria-hidden="true">'+(state.mfaEnabled?'▣':'□')+'</span><div><b>Practice learner account</b><p>'+(state.scopeConfirmed?'✓ This training account is allowed':'○ Permission not yet checked')+'</p></div></div><div class="foundation-board-facts"><p><b>Sign-in proof</b><span>'+(state.mfaEnabled?'Password + practice authenticator':'Password only')+'</span></p><p class="'+(state.leastPrivilege?'foundation-board-good':'foundation-board-caution')+'"><b>Access</b><span>'+(state.leastPrivilege?'Learner · open the lesson':'Administrator · more than this task needs')+'</span></p><p><b>Allowed task</b><span>Open the fictional lesson. Use no real credentials.</span></p></div>'+controls+'</div>';
  return '';
}

function codingResults(current) {
  if(!current.results.length)return '<p>Run the code to see the results.</p>';
  const number=result=>{const value=result.output?.length===1?result.output[0]:null;return typeof value==='string'&&/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)&&Number.isFinite(Number(value))?Number(value):null;};
  const scale=Math.max(15,...current.results.map(number).filter(value=>value!==null&&value<=1000000));
  return '<p class="foundation-small">Compare your bars with the targets. Scale: 0–'+scale+'.</p><ul>'+current.results.map(result=>{const actual=number(result),bar=actual!==null&&actual>=0&&actual<=1000000;return '<li data-foundation-result="'+(result.passed?'pass':'retry')+'"><strong>'+(result.passed?'✓ Works':'↻ Try again')+' · quantity '+esc(result.quantity)+'</strong><span>Target '+esc(result.expected)+' · Your result '+esc(result.output?.join(' / ')||result.error?.message||'no output')+'</span><div class="foundation-result-bars"><label>Target<meter min="0" max="'+scale+'" value="'+Number(result.expected)+'">'+esc(result.expected)+'</meter></label>'+(bar?'<label>Your output<meter min="0" max="'+scale+'" value="'+actual+'">'+esc(actual)+'</meter></label>':'<p>No nonnegative number to plot.</p>')+'</div></li>';}).join('')+'</ul>';
}

/** Introductory practice has its own record, separate from ticket investigations. */
export function renderFoundationLab(candidate,record) {
  const lab=resolve(candidate);
  if(!lab)return '<section class="foundation-lab"><h1>Choose a beginner lab</h1><a href="#labs">Return to the lab catalog</a></section>';
  const current=record||createFoundationRecord(lab.id);
  return `<section class="foundation-lab" aria-labelledby="foundation-title">
    <header class="foundation-heading"><a href="#labs">← All labs</a><p class="foundation-eyebrow">Start here · ${esc(lab.code||lab.id)} · Grades ${esc(lab.grade)}</p><h1 id="foundation-title">${esc(lab.title)}</h1><p>${esc(lab.goal)}</p></header>
    <div class="foundation-tabs" role="tablist" aria-label="Beginner lab steps">${sections.map((id,i)=>`<button type="button" id="foundation-tab-${id}" data-foundation-section="${id}" role="tab" aria-controls="foundation-panel-${id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}"${i>0&&!OWNER_PREVIEW?' disabled aria-disabled="true"':''}><span>${i+1}</span> ${esc(sectionLabels[i])}</button>`).join('')}</div>
    <div class="foundation-body foundation-flow">
      <p class="foundation-step-status" data-foundation-step-status role="status">Explore the items, then try the practice.</p>
      <section id="foundation-panel-explore" data-foundation-panel="explore" role="tabpanel" aria-labelledby="foundation-tab-explore" tabindex="0"><div class="foundation-prompt" data-foundation-explore></div></section>
      <section id="foundation-panel-practice" data-foundation-panel="practice" role="tabpanel" aria-labelledby="foundation-tab-practice" tabindex="-1" hidden><div class="foundation-prompt" data-foundation-practice></div>
      </section>
      <section id="foundation-panel-check" data-foundation-panel="check" role="tabpanel" aria-labelledby="foundation-tab-check" tabindex="-1" hidden><div class="foundation-prompt" data-foundation-check></div><div class="foundation-explanation"><h2>Explain what you learned</h2><label for="foundation-notes">What did you try?<textarea id="foundation-notes" data-foundation-notes maxlength="2000" rows="3" aria-describedby="foundation-explanation-help" placeholder="I tried…">${esc(current.notes||'')}</textarea></label><label for="foundation-reflection">What did you learn from the result?<textarea id="foundation-reflection" data-foundation-reflection maxlength="2000" rows="3" aria-describedby="foundation-explanation-help" placeholder="The result showed…">${esc(current.reflection||'')}</textarea></label><p id="foundation-explanation-help" class="foundation-small">Write a sentence for each answer. Then finish your practice.</p><p data-foundation-explanation-status class="foundation-small" role="status"></p><div class="foundation-handoff"><button type="button" class="foundation-primary" data-foundation-report>Finish practice &amp; open report</button><a data-foundation-ticket aria-disabled="true" tabindex="-1">Next: try ticket ${esc(lab.nextLab)} →</a></div></div></section>
      <p class="foundation-feedback" data-foundation-feedback role="status" aria-live="polite">Choose a picture to reveal its job.</p>
      <section class="foundation-stage" data-foundation-stage aria-label="Equipment and learning items"><h2 class="foundation-pane-heading">Workbench</h2><div class="foundation-visual" data-foundation-visual>${renderFoundationVisual(lab,current)}</div>
        <div class="foundation-item-buttons" role="group" aria-label="Choose an item to explore"${lab.track==='hardware'?'':' hidden'}>${lab.items.map(item=>`<button type="button" data-foundation-inspect="${esc(item.id)}" aria-pressed="false">${esc(item.label)}<span data-foundation-visited="${esc(item.id)}"></span></button>`).join('')}</div>
        <div class="foundation-code-workspace" data-foundation-code-workspace hidden><label for="foundation-code">Your practice code</label><textarea id="foundation-code" data-foundation-code maxlength="4000" rows="6" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="foundation-code-help">${esc(current.code)}</textarea><p id="foundation-code-help">Change the calculation, then run it.</p><div class="foundation-code-chips" role="group" aria-label="Try an operator"><button type="button" data-foundation-operator="+">Add (+)</button><button type="button" data-foundation-operator="*">Multiply (*)</button></div><button type="button" class="foundation-primary" data-foundation-run>Run all practice inputs</button><div data-foundation-code-results role="status" aria-live="polite"></div></div>
        <div class="foundation-caption" hidden><h2 data-foundation-item-title>Choose an item in the picture or the buttons.</h2><p data-foundation-looks></p><p data-foundation-role></p></div>
      </section>
      <div class="foundation-step-actions"><button type="button" data-foundation-back hidden>← Explore &amp; learn</button><button type="button" class="foundation-primary" data-foundation-next${OWNER_PREVIEW?'':' disabled'}>Next: Practice &amp; test →</button></div>
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
    $('[data-foundation-explore]').innerHTML=nextItem?`<p class="foundation-eyebrow">1. Explore &amp; learn</p><h2>Find ${esc(nextItem.label)}</h2><p>Choose its picture to reveal its job.</p><progress max="${progress.exploreTotal}" value="${progress.explored}" aria-label="Items explored"></progress><p class="foundation-small">${progress.explored} of ${progress.exploreTotal} items explored</p>`:'<p class="foundation-eyebrow">1. Explore &amp; learn</p><h2>You found every item.</h2><p>Select Next below to try the practice.</p>';
    const prompt=$('[data-foundation-practice]');
    const readyToPractice=OWNER_PREVIEW||progress.explored===progress.exploreTotal;
    const firstWrong=lab.checks.findIndex(check=>!correct(current,check));
    if(!OWNER_PREVIEW&&firstWrong>=0&&checkIndex>firstWrong)checkIndex=firstWrong;
    const check=lab.checks[checkIndex];
    if(!readyToPractice)prompt.innerHTML='<h2>Explore each item first.</h2><p>Then try one question at a time.</p>';
    else if(check){
      const done=correct(current,check);
      prompt.innerHTML=`<p class="foundation-eyebrow">2. Practice &amp; test · Question ${checkIndex+1} OF ${lab.checks.length}</p><h2>${esc(check.prompt)}</h2>${done?`<p class="foundation-correct">${esc(check.explanation)}</p><button type="button" class="foundation-primary" data-foundation-next-question>${checkIndex===lab.checks.length-1?'Start the practice task':'Next question'} →</button>`:`<div class="foundation-answer-options" role="group" aria-label="Choose an answer">${check.options.map(option=>`<button type="button" data-foundation-answer="${esc(option.id)}" aria-pressed="${current.answers?.[check.id]===option.id}">${esc(option.label)}</button>`).join('')}</div>`}`;
    }else{
      const job=lab.jobs.find(job=>!current.practice.includes(job.id));
      prompt.innerHTML=job?`<p class="foundation-eyebrow">2. Practice &amp; test · Step ${current.practice.length+1} OF ${lab.jobs.length}</p><h2>${esc(job.prompt)}</h2>${lab.track==='coding'?'<p>Change the calculation below. Run all three inputs.</p>':lab.track==='hardware'?`<button type="button" class="foundation-primary" data-foundation-job>${esc(job.label)}</button>`:practiceBoard(lab,current)}`:'<p class="foundation-eyebrow">2. Practice &amp; test</p><h2>Your practice task works.</h2><p>Select Next below to explain what you learned.</p>'+practiceBoard(lab,current);
    }
    if(OWNER_PREVIEW&&check){if(!correct(current,check))prompt.innerHTML+='<button type="button" class="foundation-primary" data-foundation-next-question>'+(checkIndex===lab.checks.length-1?'Open practice tools':'Next question')+' (preview) →</button>';prompt.innerHTML+='<button type="button" data-foundation-open-tools>Open practice tools</button>';}
    if(OWNER_PREVIEW&&!check)prompt.innerHTML+='<button type="button" data-foundation-review-questions>Review questions</button>';
    if(lab.track==='coding')$('[data-foundation-code-results]').innerHTML=codingResults(current);
    const outcomes=[['Explore every item',progress.explored===progress.exploreTotal],['Answer each question',progress.checked===progress.checkTotal],['Finish and check the practice task',progress.practiceComplete]];
    $('[data-foundation-check]').innerHTML=`<p class="foundation-eyebrow">3. Check &amp; explain</p><h2>${progress.complete?'Practice finished.':progress.practiceComplete?'Your task works. What did you learn?':'Check your progress. What did you learn?'}</h2><p>${esc(lab.goal)}</p><ul class="foundation-outcomes">${outcomes.map(([label,done])=>`<li><span aria-hidden="true">${done?'✓':'○'}</span> ${label} <b>${done?'Done':'To do'}</b></li>`).join('')}</ul>`;
    for(const field of ['notes','reflection'])if($('[data-foundation-'+field+']').value!==(current[field]||''))$('[data-foundation-'+field+']').value=current[field]||'';
    $('[data-foundation-explanation-status]').textContent=progress.complete?'Both answers saved. Review and save your report.':'Write both answers, then select Finish practice & open report.';
  }
  function navigation(){
    const progress=summary(),explored=progress.explored===progress.exploreTotal;
    if(!OWNER_PREVIEW&&section==='check'&&!progress.practiceComplete)section=explored?'practice':'explore';
    if(!OWNER_PREVIEW&&section==='practice'&&!explored)section='explore';
    shell.dataset.section=section;
    all('[data-foundation-panel]').forEach(panel=>{const active=panel.dataset.foundationPanel===section;panel.hidden=!active;panel.tabIndex=active?0:-1;});
    all('[data-foundation-section]').forEach(tab=>{
      const active=tab.dataset.foundationSection===section,unlocked=OWNER_PREVIEW||tab.dataset.foundationSection==='explore'||(tab.dataset.foundationSection==='practice'?explored:progress.practiceComplete);
      tab.disabled=!unlocked;tab.setAttribute('aria-disabled',String(!unlocked));tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    });
    const taskReady=section==='practice'&&checkIndex>=lab.checks.length;
    const stageVisible=section!=='check'&&(!taskReady||lab.track==='hardware'||lab.track==='coding');$('[data-foundation-stage]').hidden=!stageVisible;scene?.setMode?.(section);scene?.setVisible?.(stageVisible);
    $('[data-foundation-code-workspace]').hidden=section!=='practice'||lab.track!=='coding'||(!OWNER_PREVIEW&&!explored)||checkIndex<lab.checks.length;
    const next=$('[data-foundation-next]'),back=$('[data-foundation-back]');
    next.hidden=section==='check';next.disabled=!OWNER_PREVIEW&&(section==='explore'?!explored:!progress.practiceComplete);next.textContent=section==='explore'?'Next: Practice & test →':'Next: Check & explain →';
    back.hidden=section==='explore';back.textContent=section==='practice'?'← Explore & learn':'← Practice & test';
    $('[data-foundation-step-status]').textContent=OWNER_PREVIEW?'Preview: choose any step or open the practice tools. Skipped work stays unfinished.':section==='explore'?(explored?'All items explored. Select Next to practice.':`${progress.explored} of ${progress.exploreTotal} items explored. Choose ${progress.exploreTotal-progress.explored} more item${progress.exploreTotal-progress.explored===1?'':'s'} to reach practice.`):section==='practice'?(progress.practiceComplete?'Step 2 complete. Continue below.':'Answer the questions. Then follow and check each practice step.'):'Write what you tried and what you learned.';
    const ticket=$('[data-foundation-ticket]'),canVisit=OWNER_PREVIEW||progress.complete;ticket.setAttribute('aria-disabled',String(!canVisit));ticket.tabIndex=canVisit?0:-1;if(canVisit)ticket.setAttribute('href','#lab/'+lab.nextLab);else ticket.removeAttribute('href');
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
    if(!OWNER_PREVIEW&&next!=='explore'&&progress.explored<progress.exploreTotal){say('Explore each item before continuing to practice.');return;}
    if(!OWNER_PREVIEW&&next==='check'&&!progress.practiceComplete){say('Finish and check the practice task before you continue.');return;}
    scene?.cancelInteraction?.();section=next;
    navigation();
    if(focusTab)$(`[data-foundation-section="${section}"]`)?.focus({preventScroll:true});
    else $(`[data-foundation-panel="${section}"]`)?.focus({preventScroll:true});
    shell.scrollIntoView?.({block:'start',behavior:'auto'});
  }
  function click(event) {
    const target=event.target.closest?.('button,[data-foundation-ticket]');if(!target||!shell.contains(target)||disposed)return;
    if(Object.hasOwn(target.dataset,'foundationTicket')){if(!OWNER_PREVIEW&&!summary().complete){event.preventDefault?.();say('Finish your practice and save both answers first.');}return;}
    if(target.dataset.foundationSection){activate(target.dataset.foundationSection,{focusTab:true});return;}
    if(target.dataset.foundationGo){activate(target.dataset.foundationGo,{focusTab:true});return;}
    if(Object.hasOwn(target.dataset,'foundationNext')){activate(section==='explore'?'practice':'check');return;}
    if(Object.hasOwn(target.dataset,'foundationBack')){activate(section==='check'?'practice':'explore');return;}
    if(target.dataset.foundationInspect){inspect(target.dataset.foundationInspect);return;}
    if(OWNER_PREVIEW&&Object.hasOwn(target.dataset,'foundationOpenTools')){checkIndex=lab.checks.length;prompts();navigation();say('Preview tools are open. No questions were answered for you.');(lab.track==='coding'?$('[data-foundation-code]'):$('[data-foundation-job]'))?.focus({preventScroll:true});return;}
    if(OWNER_PREVIEW&&Object.hasOwn(target.dataset,'foundationReviewQuestions')){checkIndex=0;prompts();navigation();return;}
    if(target.dataset.foundationAnswer){const check=lab.checks[checkIndex];if(!check)return;const value=target.dataset.foundationAnswer;if(!check.options.some(option=>option.id===value))return;const result=commit({type:'answer',check:check.id,value});const focus=correct(result.state,check)?'[data-foundation-next-question]':`[data-foundation-answer="${value}"]`;$(focus)?.focus({preventScroll:true});return;}
    if(Object.hasOwn(target.dataset,'foundationNextQuestion')){if(!lab.checks[checkIndex]||(!OWNER_PREVIEW&&!correct(current,lab.checks[checkIndex])))return;do{checkIndex++;}while(checkIndex<lab.checks.length&&correct(current,lab.checks[checkIndex]));prompts();navigation();say(checkIndex<lab.checks.length?'Choose an answer to this question.':'Follow the practice steps in order.');all('[data-foundation-answer]')[0]?.focus({preventScroll:true});$('[data-foundation-job]')?.focus({preventScroll:true});if(lab.track==='coding'&&checkIndex===lab.checks.length)$('[data-foundation-code]')?.focus({preventScroll:true});return;}
    if(target.dataset.foundationChoice){commit({type:'practice',action:target.dataset.foundationChoice},{focus:`[data-foundation-choice="${target.dataset.foundationChoice}"]`});return;}
    if(Object.hasOwn(target.dataset,'foundationJob')){const job=lab.jobs.find(job=>!current.practice.includes(job.id));if(job)commit({type:'practice',action:job.action},{focus:'[data-foundation-job]'});return;}
    if(target.dataset.foundationOperator){if(lab.track!=='coding'||!['+','*'].includes(target.dataset.foundationOperator))return;const editor=$('[data-foundation-code]'),source=editor.value.replace(/quantity\s*[+*]\s*price/g,'quantity '+target.dataset.foundationOperator+' price');editor.value=source;commit({type:'code',source});editor.focus({preventScroll:true});return;}
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
