// Guided source generation only. The existing coding interpreter owns execution
// and fixture checks. Authored per-case contracts remain in the tier-filtered map.
const sessions=new WeakMap();
const esc=value=>String(value??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const variable=value=>typeof value==='string'&&/^[a-z][A-Za-z0-9_]{0,19}$/u.test(value)&&!['constructor','prototype','eval','fetch','document','window','process','import','require','print','str','let','if','else','for'].includes(value);
const own=(object,key)=>Object.getOwnPropertyDescriptor(object,key)?.value;
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const operators=['<','<=','>','>='];
function fields(block){
  if(block.kind==='calculate')return {operator:['+','-','*'],factor:[0,1,2,3,4,5,10]};
  if(block.kind==='set')return {value:[0,1,2,3,5,10]};
  if(block.kind==='classify')return {lowOp:operators,low:block.lower,highOp:operators,high:block.upper};
  if(['list','sum'].includes(block.kind))return {start:[0,1,2],endOffset:[-1,0,1]};
  return {};
}
function contract(config){
  if(!plain(config)||!variable(config.input)||!Array.isArray(config.blocks)||!config.blocks.length||config.blocks.length>7)throw Error('Unavailable block contract');
  const seen=new Set();
  for(const block of config.blocks){
    if(!plain(block)||typeof block.id!=='string'||!/^b[a-z0-9-]{0,20}$/u.test(block.id)||block.id==='bshow-input'||seen.has(block.id)||!['calculate','show','set','classify','list','sum'].includes(block.kind)||typeof block.label!=='string'||block.label.length>80)throw Error('Unavailable block contract');
    seen.add(block.id);
    if(block.kind!=='classify'&&!variable(block.target))throw Error('Unavailable block variable');
    if(['list','sum'].includes(block.kind)&&!variable(block.iterator))throw Error('Unavailable loop variable');
    if(block.kind==='classify'&&(!Array.isArray(block.messages)||block.messages.length!==3||block.messages.some(text=>typeof text!=='string'||text.length>60||/[\r\n]/u.test(text))))throw Error('Unavailable branch labels');
    if(block.prefix!==undefined&&(typeof block.prefix!=='string'||block.prefix.length>30||/[\r\n]/u.test(block.prefix)))throw Error('Unavailable display label');
    if(block.kind==='classify'&&[block.lower,block.upper].some(options=>!Array.isArray(options)||!options.length||options.length>8||options.some(value=>!Number.isSafeInteger(value)||Math.abs(value)>200)))throw Error('Unavailable thresholds');
    const choices=fields(block);if(Object.keys(choices).length&&!plain(block.defaults))throw Error('Unavailable block defaults');
    for(const [field,options] of Object.entries(choices))if(!options.includes(block.defaults[field]))throw Error('Unavailable block default');
  }
  return [...config.blocks,{id:'bshow-input',kind:'show',label:'Show the supplied input',target:config.input,prefix:''}];
}
export function initialCodingBlocks(config){return contract(config).slice(0,-1).map(block=>({id:block.id,values:{...block.defaults}}));}
export function validateCodingBlocks(config,program){
  const blocks=contract(config);if(!Array.isArray(program)||program.length>8)throw Error('Use at most eight blocks');
  const result=[];
  for(let index=0;index<program.length;index++){
    const node=own(program,String(index));if(!plain(node)||Reflect.ownKeys(node).length!==2)throw Error('Invalid block');
    const id=own(node,'id'),values=own(node,'values'),block=blocks.find(item=>item.id===id);
    if(!block||!plain(values))throw Error('Invalid block');const spec=fields(block),keys=Reflect.ownKeys(values);
    if(keys.length!==Object.keys(spec).length||keys.some(field=>typeof field!=='string'||!Object.hasOwn(spec,field)))throw Error('Invalid block settings');
    const copy={};for(const [field,options] of Object.entries(spec)){const value=own(values,field);if(!options.includes(value))throw Error('Invalid block setting');copy[field]=value;}
    result.push({id,values:copy});
  }
  return result;
}
export function codingBlocksSource(config,program,language='javascript'){
  if(!['javascript','python'].includes(language))throw Error('Unavailable language');
  const blocks=contract(config),nodes=validateCodingBlocks(config,program),python=language==='python';
  const print=(target,prefix='')=>python?`print(${prefix?JSON.stringify(prefix)+' + str('+target+')':target})`:`print(${prefix?JSON.stringify(prefix)+' + '+target:target});`;
  const lines=nodes.map(node=>{
    const block=blocks.find(item=>item.id===node.id),v=node.values;
    if(block.kind==='calculate')return `${python?'':'let '}${block.target} = ${config.input} ${v.operator} ${v.factor}${python?'':';'}`;
    if(block.kind==='set')return `${python?'':'let '}${block.target} = ${v.value}${python?'':';'}`;
    if(block.kind==='show')return print(block.target,block.prefix);
    if(block.kind==='classify'){
      const [low,middle,high]=block.messages.map(text=>print(JSON.stringify(text)));
      return python?`if ${config.input} ${v.lowOp} ${v.low}:\n    ${low}\nelif ${config.input} ${v.highOp} ${v.high}:\n    ${middle}\nelse:\n    ${high}`:`if (${config.input} ${v.lowOp} ${v.low}) {\n  ${low}\n} else if (${config.input} ${v.highOp} ${v.high}) {\n  ${middle}\n} else {\n  ${high}\n}`;
    }
    const stop=config.input+(v.endOffset>0?' + '+v.endOffset:v.endOffset<0?' - '+Math.abs(v.endOffset):'');
    const body=block.kind==='sum'?`${block.target} = ${block.target} + ${block.iterator}${python?'':';'}`:print(block.iterator,block.prefix);
    return python?`for ${block.iterator} in range(${v.start}, ${stop} + 1):\n    ${body}`:`for (let ${block.iterator} = ${v.start}; ${block.iterator} <= ${stop}; ${block.iterator}++) {\n  ${body}\n}`;
  });
  const source=lines.join('\n');if(source.length>4000)throw Error('Generated source limit');return source;
}
const fieldLabel={operator:'Operation',factor:'Number',value:'Start value',lowOp:'First comparison',low:'First boundary',highOp:'Next comparison',high:'Next boundary',start:'First index',endOffset:'Last index offset'};
function rows(config,program){const blocks=contract(config);return program.length?program.map((node,index)=>{
  const block=blocks.find(item=>item.id===node.id);
  return `<li data-cb-row="${index}" class="coding-block"><div class="coding-block-title"><button type="button" class="coding-block-grip" data-cb-handle="${index}" draggable="false" aria-label="Drag block ${index+1}">↕</button><strong>${index+1}. ${esc(block.label)}</strong></div><div class="coding-block-fields">${Object.entries(fields(block)).map(([field,options])=>`<label>${fieldLabel[field]}<select data-cb-field="${field}" aria-label="Block ${index+1}: ${fieldLabel[field]}">${options.map(value=>`<option value="${esc(value)}"${node.values[field]===value?' selected':''}>${esc(value)}</option>`).join('')}</select></label>`).join('')}</div><div class="coding-block-actions">${['up','down','remove'].map(action=>`<button type="button" data-cb-action="${action}" data-cb-index="${index}"${action==='up'&&index===0||action==='down'&&index===program.length-1?' disabled':''}>${{up:'Move up',down:'Move down',remove:'Remove'}[action]}</button>`).join('')}</div></li>`;
}).join(''):'<li class="coding-block-empty">Add a block or drop a block handle here.</li>';}
export function renderCodingWorkbench({config}={}){
  if(!config)return '';const blocks=contract(config),program=initialCodingBlocks(config);
  return `<details class="coding-block-workbench" data-coding-blocks><summary>Build this program with guided blocks</summary><p>Arrange a program for this investigation. The starter blocks still need repair. Preview uses the same bounded interpreter and input fixtures; it does not save code, pass official checks or complete the investigation.</p><div class="coding-block-layout"><section><h3>Block palette</h3>${blocks.map(block=>`<div class="coding-block-palette"><button type="button" data-cb-action="add" data-cb-id="${block.id}">+ ${esc(block.label)}</button><button type="button" class="coding-block-grip" data-cb-palette="${block.id}" draggable="false" aria-label="Drag ${esc(block.label)}">↕</button></div>`).join('')}<p>Drag a handle, or use Add and Move buttons. There are at most eight blocks.</p></section><section><h3>Your program</h3><ol class="coding-block-list" data-cb-list>${rows(config,program)}</ol></section><section class="coding-block-preview"><h3>Preview and compare</h3><div class="coding-block-actions"><button type="button" data-cb-action="preview">Preview all inputs</button><button type="button" data-cb-action="use">Copy blocks into editor</button></div><p>Copying replaces the current editor draft. Review it, then choose the editor’s Run all fixtures. Existing saving and report choices still apply.</p><pre data-cb-source tabindex="0" aria-label="Generated program"></pre><div data-cb-results></div></section></div><p data-cb-status role="status" aria-live="polite" aria-atomic="true">Block choices are temporary. Your editor is unchanged.</p><div class="coding-block-actions"><button type="button" data-cb-action="clear">Clear blocks</button><button type="button" data-cb-action="starter">Restore starter blocks</button></div><p>Only fixed blocks and choices are available here. No typed labels, imports, external drag data, uploads or network calls. Leaving this investigation clears the block draft.</p></details>`;
}
export function disposeCodingWorkbench(root){sessions.get(root)?.dispose();sessions.delete(root);}
export function cancelCodingWorkbench(root){sessions.get(root)?.cancel();}
export function mountCodingWorkbench(root,{id,config,language='javascript',preview,onUse}={}){
  if(!config||!root?.ownerDocument||typeof root.querySelectorAll!=='function')return {dispose(){}};
  const host=root.querySelector('[data-coding-blocks]');if(!host)return {dispose(){}};
  const old=sessions.get(root),saved=old?.id===id?old.snapshot():null;old?.dispose();
  let program=saved?validateCodingBlocks(config,saved):initialCodingBlocks(config),disposed=false,drag=null;
  const list=host.querySelector('[data-cb-list]'),status=host.querySelector('[data-cb-status]'),doc=root.ownerDocument,view=doc.defaultView,blocks=contract(config);
  const say=message=>{if(!disposed)status.textContent=message;};
  const indexOf=node=>{const text=node?.dataset?.cbRow??node?.dataset?.cbIndex;return typeof text==='string'&&/^[0-7]$/u.test(text)?Number(text):-1;};
  function cancel(){if(!drag)return;const previous=drag;drag=null;try{previous.handle.releasePointerCapture?.(previous.id);}catch{/* Capture already ended. */}list.removeAttribute('data-drop-position');host.classList.remove('is-cb-dragging');}
  function paint(message){list.innerHTML=rows(config,program);host.querySelector('[data-cb-source]').textContent=codingBlocksSource(config,program,language);host.querySelector('[data-cb-results]').replaceChildren();say(message);}
  function edit(next,message){cancel();program=validateCodingBlocks(config,next);paint(message);}
  function click(event){
    const button=event.target?.closest?.('[data-cb-action]');if(disposed||!button||!host.contains(button)||button.disabled)return;
    const action=button.dataset.cbAction,index=indexOf(button);
    if(action==='add'){const block=blocks.find(item=>item.id===button.dataset.cbId);if(!block)return;if(program.length>=8){say('Remove a block before adding another; eight is the limit.');return;}edit([...program,{id:block.id,values:{...block.defaults}}],'Block added. Previous preview cleared.');return;}
    if(action==='clear'){edit([],'Blocks cleared. Editor unchanged.');return;}
    if(action==='starter'){edit(initialCodingBlocks(config),'Starter blocks restored; editor unchanged.');return;}
    if(['up','down','remove'].includes(action)){
      if(index<0||index>=program.length)return;const next=program.slice(),target=index+(action==='up'?-1:1);
      if(action==='remove')next.splice(index,1);else if(target>=0&&target<next.length)[next[index],next[target]]=[next[target],next[index]];else return;
      edit(next,'Program changed. Previous preview cleared.');const row=list.querySelectorAll('[data-cb-row]')[Math.max(0,Math.min(action==='remove'?index:target,next.length-1))];(row?.querySelector('[data-cb-handle]')||host.querySelector('[data-cb-action="starter"]')).focus();return;
    }
    const source=codingBlocksSource(config,program,language);cancel();
    if(action==='use'){onUse?.(source);say('Copied into the editor draft. Run all fixtures there; this action does not save or pass checks.');return;}
    if(action!=='preview'||typeof preview!=='function')return;
    const runs=preview(source);if(!Array.isArray(runs)||runs.length>8){say('Preview unavailable. Use the editor’s existing checks.');return;}
    const results=host.querySelector('[data-cb-results]');results.innerHTML=`<ul>${runs.map(run=>`<li><strong>${esc(run.input)} = ${esc(run.value)} · ${run.passed?'matches':'compare again'}</strong><p>Actual: ${esc(run.error?'Stopped: '+run.error.message:(run.output||[]).slice(0,20).map(line=>String(line).slice(0,300)).join(' | ')||'(no output)')}</p><p>Expected: ${esc((run.expected||[]).join(' | '))}</p></li>`).join('')}</ul>`;
    say(`Preview: ${runs.filter(run=>run.passed).length} of ${runs.length} inputs match. No official result was awarded.`);
  }
  function change(event){
    const field=event.target?.closest?.('[data-cb-field]');if(disposed||!field||!host.contains(field))return;
    const index=indexOf(field.closest('[data-cb-row]')),node=program[index],block=blocks.find(item=>item.id===node?.id),key=field.dataset.cbField;
    if(!block||!Object.hasOwn(fields(block),key))return;const value=fields(block)[key].find(item=>String(item)===field.value);
    if(value===undefined){paint('Choose an available setting.');return;}
    edit(program.map((item,position)=>position===index?{id:item.id,values:{...item.values,[key]:value}}:item),'Block setting changed. Editor unchanged; preview cleared.');
    list.querySelectorAll('[data-cb-row]')[index]?.querySelector(`[data-cb-field="${key}"]`)?.focus();
  }
  function dropAt(event){if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return null;const hit=doc.elementFromPoint?.(event.clientX,event.clientY);if(!hit||!host.contains(hit)||hit.closest('[data-cb-list]')!==list)return null;const row=hit.closest('[data-cb-row]');if(!row)return program.length;const index=indexOf(row),box=row.getBoundingClientRect();return index<0?null:index+(event.clientY>=box.top+box.height/2?1:0);}
  function down(event){
    if(disposed||drag||event.button!==0||event.isPrimary===false||!Number.isFinite(event.pointerId)||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
    const handle=event.target?.closest?.('[data-cb-handle],[data-cb-palette]');if(!handle||!host.contains(handle))return;
    const palette=blocks.find(block=>block.id===handle.dataset.cbPalette),row=handle.closest('[data-cb-row]'),index=indexOf(row);if(!palette&&(index<0||index>=program.length))return;
    event.preventDefault();drag={id:event.pointerId,handle,palette,index,x:event.clientX,y:event.clientY,moved:false};try{handle.setPointerCapture?.(event.pointerId);}catch{/* Document cancellation remains available. */}say('Move to a program position and release; Escape cancels.');
  }
  function move(event){if(!drag||drag.id!==event.pointerId)return;if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;drag.moved=true;event.preventDefault();host.classList.add('is-cb-dragging');const target=dropAt(event);if(target===null)list.removeAttribute('data-drop-position');else list.setAttribute('data-drop-position',String(target));say(target===null?'Release outside the program to cancel.':`Drop at position ${target+1}.`);}
  function up(event){
    if(!drag||drag.id!==event.pointerId)return;const previous=drag,target=drag.moved?dropAt(event):null;cancel();if(target===null){say('Drag canceled; blocks unchanged.');return;}const next=program.slice();
    if(previous.palette){if(next.length>=8){say('Eight blocks is the limit.');return;}next.splice(target,0,{id:previous.palette.id,values:{...previous.palette.defaults}});}
    else{const [node]=next.splice(previous.index,1);next.splice(target>previous.index?target-1:target,0,node);}edit(next,'Block placed. Editor unchanged; preview cleared.');
  }
  function interrupt(event){if(drag&&(!['pointercancel','lostpointercapture'].includes(event.type)||event.pointerId===drag.id)){cancel();say('Drag canceled; blocks unchanged.');}}
  function visibility(){if(doc.hidden)interrupt({type:'visibilitychange'});}
  function key(event){if(event.key==='Escape'&&drag){event.preventDefault();interrupt(event);}}
  function native(event){event.preventDefault();if(event.type==='drop'){cancel();say('Outside drag data is ignored. Use a handle or Add.');}}
  const listeners=[[host,'click',click],[host,'change',change],[host,'pointerdown',down],[host,'lostpointercapture',interrupt],[doc,'keydown',key],[host,'dragstart',native],[host,'dragover',native],[host,'drop',native],[doc,'pointermove',move],[doc,'pointerup',up],[doc,'pointercancel',interrupt],[doc,'scroll',interrupt],[doc,'visibilitychange',visibility],[view,'blur',interrupt]];
  for(const [target,event,handler] of listeners)target?.addEventListener?.(event,handler);paint('Block draft ready. Your editor is unchanged.');
  const controller={id,snapshot:()=>validateCodingBlocks(config,program),cancel(){if(drag){cancel();say('Drag canceled; blocks unchanged.');}},dispose(){if(disposed)return;cancel();disposed=true;for(const [target,event,handler] of listeners)target?.removeEventListener?.(event,handler);program=[];}};sessions.set(root,controller);return controller;
}
