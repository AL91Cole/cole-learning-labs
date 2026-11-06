import {renderLearningBrief} from './activity-guidance.js?release=20261107-tech-team';
import {executeCoding} from './coding-lab.js?release=20261107-tech-team';
import {CODING_PROJECTS,INPUTS,SOURCE_LIMIT,projectFor,dataRecord,initialCodingStudioState,normalizeCodingStudioState,codingStudioHasWork} from './coding-studio-model.js?release=20261107-tech-team';
export {CODING_PROJECTS,initialCodingStudioState,normalizeCodingStudioState,codingStudioHasWork};

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function runCodingStudio(saved) {
  const state=normalizeCodingStudioState(saved);
  // Reject an oversized draft as a whole; never execute a silently truncated one.
  const values=dataRecord(saved);
  if(typeof values?.code==='string'&&values.code.length>SOURCE_LIMIT) return {state,result:executeCoding(values.code,state.inputs)};
  state.runs=Math.min(state.runs+1,1000000);
  return {state,result:executeCoding(state.code,state.inputs)};
}
export function codingStudioBars(output) {
  return output.slice(0,20).map((line,index)=>{
    const numeric=/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(line)?Number(line):null;
    return {label:'Line '+(index+1),text:String(line).slice(0,300),value:numeric!==null&&Number.isFinite(numeric)?numeric:null};
  });
}

export function renderCodingStudio(saved) {
  const state=normalizeCodingStudioState(saved);
  return `<section class="coding-studio" data-coding-studio><header class="studio-heading"><div><p class="studio-eyebrow">BUILD · CHANGE · RUN</p><h1>Coding studio</h1><p>Make text art, compare numbers, or build your own small program.</p></div><a href="#labs/coding">Coding challenges →</a></header>${renderLearningBrief({first:'Run a starter project once. Then change its code or one input and compare the output.',target:'studio-code',action:'Show me the code',steps:['Try the starter once and look at the result.','Change one thing, run or test it again, and compare what changed.','Make it your own. Your experiment does not complete an investigation.']})}<section class="studio-projects" aria-labelledby="studio-projects-title"><h2 id="studio-projects-title">Choose a starting point</h2><div>${CODING_PROJECTS.map(project=>`<button type="button" data-studio-project="${project.id}" aria-pressed="${state.projectId===project.id}"><b>${project.name}</b><span>${project.description}</span></button>`).join('')}</div></section><div class="studio-workspace"><section class="studio-editor-panel"><h2><label for="studio-code">Your program</label></h2><textarea id="studio-code" data-studio-code maxlength="4000" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="studio-code-help">${esc(state.code)}</textarea><p id="studio-code-help">Use <code>print</code>, variables, <code>if/else</code>, and <code>repeat</code>. <span data-studio-count>${state.code.length}</span>/4,000 characters.</p><div class="studio-actions"><button type="button" data-studio-run>▶ Run program</button><button type="button" data-studio-clear>Clear output</button></div><p class="studio-status" data-studio-status role="status">Ready. Change your code or inputs, then run.</p></section><section class="studio-preview-panel" aria-labelledby="studio-preview-title"><div class="studio-preview-heading"><h2 id="studio-preview-title">Your creation</h2><label>View <select data-studio-mode><option value="text"${state.mode==='text'?' selected':''}>Text / art</option><option value="bars"${state.mode==='bars'?' selected':''}>Number bars</option></select></label></div><pre class="studio-output" data-studio-output tabindex="0" aria-label="Program output">Run your program to see what you make.</pre><div class="studio-bars" data-studio-bars hidden aria-label="Number bars"></div><p class="studio-error" data-studio-error role="alert"></p><fieldset class="studio-inputs"><legend>Try different inputs</legend>${INPUTS.map(input=>`<label for="studio-input-${input.name}">${input.label} <code>${input.name}</code><input id="studio-input-${input.name}" data-studio-input="${input.name}" type="number" min="${input.min}" max="${input.max}" step="${input.step}" value="${state.inputs[input.name]}"></label>`).join('')}</fieldset><p class="studio-input-help">These four inputs are read-only in your program. Store results in a new variable.</p></section></div><details class="studio-reference"><summary>Quick language guide</summary><div><pre>let total = quantity * price;\nprint("Total: " + total);\nif (total &gt; 10) { print("Over ten"); }\nrepeat (3) { print("*"); }</pre><p>End simple statements with a semicolon. Use braces for blocks. You can use numbers, quoted text, booleans, arithmetic, comparisons, and <code>// comments</code>. Variables share one program scope.</p><p>This practice language runs in a bounded interpreter. It has no AI assistant, system commands, browser access, files, or network calls. Programs stop at 1,000 steps or 20 output lines. Text is displayed as text.</p></div></details></section>`;
}

export function mountCodingStudio(root,{getState=()=>null,onChange=()=>{}}={}) {
  let state=normalizeCodingStudioState(getState()),result=null;
  const listeners=[],find=selector=>root.querySelector(selector);
  const editor=find('[data-studio-code]'),output=find('[data-studio-output]'),bars=find('[data-studio-bars]');
  const status=find('[data-studio-status]'),error=find('[data-studio-error]');
  const listen=(node,name,handler)=>{node.addEventListener(name,handler);listeners.push(()=>node.removeEventListener(name,handler));};
  const persist=()=>onChange(normalizeCodingStudioState(state));
  const message=text=>{status.textContent=text;};
  function showOutput() {
    output.hidden=state.mode!=='text';bars.hidden=state.mode!=='bars';
    output.textContent=result?(result.output.join('\n')||'(No output)'):'Run your program to see what you make.';
    bars.replaceChildren();
    if(state.mode==='bars') {
      const rows=codingStudioBars(result?.output||[]),scale=Math.max(1,...rows.map(row=>Math.abs(row.value??0)));
      if(!rows.length) {const empty=bars.ownerDocument.createElement('p');empty.textContent=result?'No number lines to draw.':'Print a number, then run your program.';bars.append(empty);}
      for(const row of rows) {
        const item=bars.ownerDocument.createElement('div'),label=bars.ownerDocument.createElement('span');
        item.className='studio-bar-row';label.textContent=row.label+': '+row.text;item.append(label);
        if(row.value!==null) {
          const track=bars.ownerDocument.createElement('div'),fill=bars.ownerDocument.createElement('div');
          track.className='studio-bar-track';fill.className='studio-bar-fill'+(row.value<0?' studio-bar-negative':'');
          fill.style.width=Math.round(Math.abs(row.value)/scale*100)+'%';track.setAttribute('aria-hidden','true');track.append(fill);item.append(track);
        } else {const hint=bars.ownerDocument.createElement('small');hint.textContent='Print a number to draw a bar for this line.';item.append(hint);}
        bars.append(item);
      }
    }
    error.textContent=result?.error?'Line '+result.error.line+': '+result.error.message:'';
  }
  function invalidate(text) {result=null;showOutput();message(text);}
  function collectInputs() {
    for(const input of INPUTS) {
      const field=find('[data-studio-input="'+input.name+'"]'),value=Number(field.value);
      if(field.value.trim()===''||!Number.isFinite(value)||value<input.min||value>input.max||input.step===1&&!Number.isInteger(value)) {
        field.setAttribute('aria-invalid','true');error.textContent=input.label+' needs '+(input.step===1?'a whole number':'a number')+' from '+input.min+' through '+input.max+'.';field.focus();return false;
      }
      field.removeAttribute('aria-invalid');state.inputs[input.name]=value;
    }
    return true;
  }
  const run=()=>{
    if(!collectInputs()) return;
    const execution=runCodingStudio({...state,code:editor.value});
    if(editor.value.length<=SOURCE_LIMIT) state=execution.state;
    result=execution.result;persist();showOutput();
    message(result.ok?'Program complete. '+result.output.length+' output line'+(result.output.length===1?'':'s')+' · '+result.steps+' steps.':'Run stopped. Check the message below your preview.');
  };
  listen(editor,'input',()=>{
    find('[data-studio-count]').textContent=String(editor.value.length);
    if(editor.value.length<=SOURCE_LIMIT) {state.code=editor.value;persist();}
    invalidate('Code changed. Run your program to update the preview.');
  });
  for(const input of INPUTS) listen(find('[data-studio-input="'+input.name+'"]'),'input',()=>{
    const field=find('[data-studio-input="'+input.name+'"]'),value=Number(field.value);
    if(field.value.trim()!==''&&Number.isFinite(value)&&value>=input.min&&value<=input.max&&(input.step!==1||Number.isInteger(value))) {field.removeAttribute('aria-invalid');state.inputs[input.name]=value;persist();}
    invalidate('Input changed. Run your program to update the preview.');
  });
  listen(find('[data-studio-mode]'),'change',event=>{
    if(!['text','bars'].includes(event.target.value)) return;
    state.mode=event.target.value;persist();showOutput();
  });
  for(const project of CODING_PROJECTS) listen(find('[data-studio-project="'+project.id+'"]'),'click',()=>{
    const inputs=state.inputs,runs=state.runs;state={...initialCodingStudioState(project.id),inputs,runs};
    editor.value=state.code;find('[data-studio-count]').textContent=String(state.code.length);find('[data-studio-mode]').value=state.mode;
    for(const option of CODING_PROJECTS) find('[data-studio-project="'+option.id+'"]').setAttribute('aria-pressed',String(option.id===state.projectId));
    persist();invalidate(project.id==='blank'?'Start with print("Hello"); then make it your own.':'Starter loaded. Change it or run it.');editor.focus();
  });
  listen(find('[data-studio-run]'),'click',run);
  listen(find('[data-studio-clear]'),'click',()=>invalidate('Output cleared. Your program and inputs are still here.'));
  showOutput();
  return ()=>{for(const remove of listeners) remove();};
}
