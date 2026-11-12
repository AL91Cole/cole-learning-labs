// Linux basics: a short beginner course on using a Linux computer. Each lab
// runs on a real Linux desktop from the lab server (the same real-machine pane
// the guided labs use). The page shows one step at a time above the machine;
// the steps and their checks come from the server once the machine starts.
// When the lab server is not answering, the page says so and starts nothing.
import {LINUX_COURSE,linuxLab,nextLinuxLab} from './linux-catalog.js?release=20261107-tech-team';
import {renderLabRemote,mountLabRemote,probeRemoteService,remoteServiceHosts} from './lab-remote.js?release=20261107-tech-team';

const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
/** Step text marks commands with backticks; show them as code. */
export const linuxStepText=value=>String(value??'').split('`').map((part,index)=>index%2?'<code>'+esc(part)+'</code>':esc(part)).join('');
/** The step to show: the first unfinished one, or the last when all are done. */
export const currentLinuxStep=steps=>{const index=steps.findIndex(step=>!step.completed);return index<0?Math.max(0,steps.length-1):index;};

function renderIndex(){
  return '<section class="wrap page-intro linux-intro"><p class="eyebrow">Beginner course · Grades 7–12 · Free</p><h1>Linux basics</h1><p>Learn to use a Linux computer by using one. Each lab opens a real Linux desktop in your browser, with a Files window and a terminal. Nothing is installed on your computer.</p><p class="panel-help linux-availability" data-linux-availability role="status">Checking for a practice computer…</p></section>'
    +'<section class="wrap basics-section linux-labs" aria-label="Linux basics labs"><div class="basics-grid">'+LINUX_COURSE.map((lab,index)=>'<a class="basics-card linux-card" data-track="network" href="#linux/'+esc(lab.id)+'"><span class="basics-symbol" aria-hidden="true">'+(index+1)+'</span><span class="eyebrow">'+esc(lab.id)+' · Beginner</span><h3>'+esc(lab.title)+'</h3><p>'+esc(lab.summary)+'</p><p class="linux-skills" aria-label="You will use">'+lab.skills.map(skill=>'<code>'+esc(skill)+'</code>').join(' ')+'</p><span class="text-link">'+esc(lab.minutes)+' min · Start <span aria-hidden="true">→</span></span></a>').join('')+'</div>'
    +'<p class="panel-help">Each machine is private to you, has no internet access and is erased when you leave. Do the labs in order the first time.</p></section>';
}
function renderLab(lab){
  const next=nextLinuxLab(lab.id);
  return '<section class="linux-lab" data-linux-lab="'+esc(lab.id)+'"><header class="linux-bar"><a class="linux-back" href="#linux"><span aria-hidden="true">←</span> Linux basics</a><h1>'+esc(lab.id)+' · '+esc(lab.title)+'</h1><span class="linux-progress" data-linux-progress role="status"></span>'+(next?'<a class="linux-next" href="#linux/'+esc(next.id)+'">Next lab <span aria-hidden="true">→</span></a>':'<a class="linux-next" href="#labs">All labs <span aria-hidden="true">→</span></a>')+'</header>'
    +'<div class="linux-step" data-linux-step aria-live="polite"><p><b>'+esc(lab.summary)+'</b> Checking for a practice computer…</p></div>'
    +'<div class="linux-stage" data-linux-stage></div></section>';
}
export function renderLinuxCourse(id){
  const lab=linuxLab(id);
  return id===undefined||id===''?renderIndex():lab?renderLab(lab):renderIndex();
}

export function mountLinuxCourse(root,{id,showNotice=()=>{},onComplete=()=>{},probe=probeRemoteService,hosts=remoteServiceHosts,render=renderLabRemote,mount=mountLabRemote}={}){
  const lab=linuxLab(id),$=selector=>root.querySelector(selector);
  let disposed=false,handle=null;
  if(!lab){
    Promise.resolve(probe()).then(state=>{const note=$('[data-linux-availability]');if(disposed||!note)return;const ready=state==='enabled'&&LINUX_COURSE.some(item=>hosts(item.id));note.textContent=ready?'Practice computers are ready. Pick a lab to start.':'The practice computers are not available right now. You can look through the labs and come back later.';note.dataset.state=ready?'ready':'unavailable';}).catch(()=>{});
    return ()=>{disposed=true;};
  }
  const controller=new AbortController(),strip=$('[data-linux-step]'),stage=$('[data-linux-stage]'),progress=$('[data-linux-progress]'),nextLab=$('.linux-next');
  // Each new machine starts at its first unfinished step; after that only ‹ and › change the step shown.
  let steps=[],shown=-1,reported=false,phase='idle',drawn=null;
  // Refreshed every 2 s: replace the strip only when it changed, keeping hint and focus.
  const setStrip=html=>{
    if(html===drawn)return;
    const a=(root.ownerDocument||globalThis.document)?.activeElement,t=a&&strip.contains?.(a)?['data-linux-next','data-linux-prev'].find(n=>a.hasAttribute?.(n)):0;
    drawn=html;strip.innerHTML=html;
    if(t)(strip.querySelector('['+t+']:not([disabled])')||strip.querySelector('.linux-step-nav button:not([disabled])'))?.focus?.({preventScroll:true});
  };
  const drawStrip=()=>{
    if(shown<0){
      setStrip('<p><b>'+esc(lab.summary)+'</b> '+(phase==='ready'?'Getting the steps…':['connecting','authenticating','starting'].includes(phase)?'Your Linux computer is starting. This takes about half a minute.':'Press <b>Start machine</b> below to open your Linux computer.')+'</p>');
      progress.textContent='';return;
    }
    const finished=steps.filter(step=>step.completed).length,all=finished===steps.length,step=steps[shown],done=step.completed,more=done&&shown<steps.length-1;
    progress.textContent=(all?'✓ Lab complete · ':'')+finished+' of '+steps.length+' steps done';
    for(const node of [progress,nextLab])if(node)node.dataset.state=all?'done':'';
    // A step shows its green check only when the machine reports every part of it done.
    // The check takes the place of an open circle and "done" is for screen readers, so the strip keeps its width and never pushes the screen down.
    setStrip('<p><span class="linux-step-number'+(done?' is-done':'')+'"><span class="linux-step-check" aria-hidden="true">'+(done?'✓':'○')+'</span>Step '+(shown+1)+' of '+steps.length+(done?'<span class="sr-only"> done</span>':'')+'</span> <b>'+esc(step.title)+'.</b> '+linuxStepText(step.description)+'</p>'+(step.hint?'<details class="linux-hint"><summary>Hint</summary><p>'+linuxStepText(step.hint)+'</p></details>':'')
      +'<span class="linux-step-nav"><button type="button" class="lab-tool" data-linux-prev aria-label="Previous step"'+(shown<=0?' disabled':'')+'>‹</button><button type="button" class="lab-tool'+(more?' is-ready':'')+'" data-linux-next aria-label="Next step"'+(shown>=steps.length-1?' disabled':'')+'>›</button></span>');
  };
  const update=()=>{
    const state=handle?.remoteState?.();if(!state)return;
    phase=state.phase;
    const hintOpen=Boolean(strip.querySelector('details[open]')),before=steps[shown]?.id;
    steps=Array.isArray(state.milestones)?state.milestones:[];
    if(['connecting','authenticating','starting'].includes(phase))shown=-1;
    else if(shown<0&&steps.length&&phase==='ready')shown=currentLinuxStep(steps);
    shown=Math.min(shown,steps.length-1);
    drawStrip();
    if(hintOpen&&steps[shown]?.id===before)strip.querySelector('details')?.setAttribute('open','');
    if(state.complete&&!reported){reported=true;onComplete(lab.id);}
  };
  strip.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-linux-prev],[data-linux-next]');if(!button||shown<0)return;
    shown=Math.min(steps.length-1,Math.max(0,shown+(button.hasAttribute('data-linux-next')?1:-1)));drawStrip();
  },{signal:controller.signal});
  const unavailable=()=>{
    strip.innerHTML='<p><b>The practice computers are not available right now.</b> This lab needs a real Linux computer from the lab server. Try again in a few minutes, or ask your teacher.</p>';
    stage.innerHTML='<div class="linux-unavailable"><h2>'+esc(lab.title)+'</h2><p>'+esc(lab.summary)+'</p><p>You will use: '+lab.skills.map(skill=>'<code>'+esc(skill)+'</code>').join(' ')+'</p><p><button type="button" class="button" data-linux-retry>Try again</button> <a class="text-link" href="#linux">Back to Linux basics</a></p></div>';
    $('[data-linux-retry]')?.addEventListener('click',()=>{strip.innerHTML='<p>Checking for a practice computer…</p>';stage.innerHTML='';check(true);},{signal:controller.signal});
  };
  const check=force=>Promise.resolve(probe(force?{force:true}:undefined)).then(state=>{
    if(disposed)return;
    if(state!=='enabled'||!hosts(lab.id)){unavailable();return;}
    stage.innerHTML=render(lab);
    // The step strip above the machine replaces the side list, so the screen gets the whole width.
    handle=mount(stage,{scenario:lab,record:null,showNotice,checksOpen:false,verifyEveryMs:6000,onActivity:()=>update()});
    drawStrip();
    // The pane reports most changes; a slow tick keeps the strip in step with the machine's status line.
    const timer=setInterval(update,2000);controller.signal.addEventListener('abort',()=>clearInterval(timer));
  }).catch(()=>{if(!disposed)unavailable();});
  check(false);
  return ()=>{disposed=true;controller.abort();try{handle?.dispose?.();}catch{}handle=null;};
}
