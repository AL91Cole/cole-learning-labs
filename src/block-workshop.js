// A small authored node language, not JavaScript or a general code runtime.
const esc=value=>String(value??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const BLOCK_WORKSHOP_LIMITS=Object.freeze({blocks:12,steps:80,minValue:-100,maxValue:100});
const bands=['K–1','2–3','4–6'];
const fields={set:{value:[-20,20]},add:{value:[-10,10]},'repeat-add':{count:[1,8],value:[-10,10]},'if-add':{atLeast:[-20,20],yes:[-10,10],no:[-10,10]},move:{value:[-1,1]},show:{}};
const values={value:[-2,-1,0,1,2,3,5,10],count:[1,2,3,4,5,8],atLeast:[0,2,5,10],yes:[0,1,2,5,10],no:[0,1,2,5]};
const palettes={
  'K–1':[{id:'right',label:'Move right →',node:{op:'move',value:1}},{id:'left',label:'← Move left',node:{op:'move',value:-1}},{id:'show',label:'Show the space',node:{op:'show'}}],
  '2–3':[{id:'set',label:'Set the counter',node:{op:'set',value:2}},{id:'add',label:'Add to the counter',node:{op:'add',value:1}},{id:'repeat',label:'Repeat an add',node:{op:'repeat-add',count:3,value:1}},{id:'show',label:'Show the counter',node:{op:'show'}}],
  '4–6':[{id:'set',label:'Set the counter',node:{op:'set',value:1}},{id:'add',label:'Add to the counter',node:{op:'add',value:2}},{id:'repeat',label:'Repeat an add',node:{op:'repeat-add',count:2,value:2}},{id:'decision',label:'If / otherwise add',node:{op:'if-add',atLeast:5,yes:10,no:1}},{id:'show',label:'Show the counter',node:{op:'show'}}]
};
const allowed=(op,band)=>band==='K–1'?['move','show'].includes(op):['set','add','repeat-add','show',...(band==='4–6'?['if-add']:[])].includes(op);
const initial=band=>band==='K–1'?[{op:'move',value:1},{op:'show'}]:band==='2–3'?[{op:'set',value:2},{op:'repeat-add',count:3,value:1},{op:'show'}]:[{op:'set',value:1},{op:'repeat-add',count:2,value:2},{op:'if-add',atLeast:5,yes:10,no:1},{op:'show'}];

export function validateBlockProgram(program,{band}={}){
  if(!bands.includes(band)||!Array.isArray(program)||program.length>12)throw Error('Invalid block program');
  const normalized=[];
  for(let index=0;index<program.length;index++){
    const item=Object.getOwnPropertyDescriptor(program,String(index));
    if(!item||!Object.hasOwn(item,'value'))throw Error('Invalid block program');
    const node=item.value;
    if(!node||typeof node!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(node)))throw Error('Invalid block program');
    const descriptors=Object.getOwnPropertyDescriptors(node),op=descriptors.op?.value;
    if(typeof op!=='string'||!Object.hasOwn(fields,op)||!allowed(op,band))throw Error('Invalid block program');
    const spec=fields[op],keys=Reflect.ownKeys(descriptors);
    if(keys.length!==Object.keys(spec).length+1||keys.some(key=>key!=='op'&&!Object.hasOwn(spec,key)))throw Error('Invalid block program');
    const copy={op};
    for(const [key,[min,max]] of Object.entries(spec)){
      const value=descriptors[key]?.value;
      if(!Number.isSafeInteger(value)||value<min||value>max||(op==='move'&&value===0))throw Error('Invalid block program');
      copy[key]=value;
    }
    normalized.push(copy);
  }
  return normalized;
}
const sourceFor=node=>node.op==='move'?(node.value===1?'MOVE RIGHT':'MOVE LEFT'):node.op==='set'?`SET ${node.value}`:node.op==='add'?`ADD ${node.value}`:node.op==='repeat-add'?`REPEAT ${node.count} TIMES: ADD ${node.value}`:node.op==='if-add'?`IF counter >= ${node.atLeast}: ADD ${node.yes}\nOTHERWISE: ADD ${node.no}`:'SHOW';
export function runBlockProgram(program,{band}={}){
  let nodes;
  try{nodes=validateBlockProgram(program,{band});}catch{return {ok:false,error:'invalid-program',value:null,trace:[],outputs:[],source:''};}
  let value=band==='K–1'?1:0,error='';const trace=[],outputs=[];
  function step(node,index,amount,iteration){
    if(trace.length>=80){error='step-limit';return false;}
    const before=value,next=node.op==='set'?amount:node.op==='show'?value:value+amount;
    if(next<-100||next>100){error='value-limit';return false;}
    if(band==='K–1'&&(next<1||next>5)){error='path-edge';return false;}
    value=next;if(node.op==='show')outputs.push(value);
    const message=node.op==='show'?`Show ${value}`:node.op==='set'?`Set ${value}`:node.op==='move'?`Move ${node.value===1?'right':'left'} to space ${value}`:node.op==='if-add'?`Before: ${before}. ${before>=node.atLeast?'If':'Otherwise'} adds ${amount}; counter ${value}`:`${iteration?`Repeat ${iteration} of ${node.count}: `:''}add ${amount}; counter ${value}`;
    trace.push({block:index,op:node.op,before,value,message});return true;
  }
  outer:for(const [index,node] of nodes.entries()){
    if(node.op==='repeat-add'){for(let count=1;count<=node.count;count++)if(!step(node,index,node.value,count))break outer;}
    else if(!step(node,index,node.op==='if-add'?(value>=node.atLeast?node.yes:node.no):node.value))break;
  }
  return {ok:!error,error,value,trace,outputs,source:nodes.map(sourceFor).join('\n')};
}

const fieldName={value:'Amount',count:'Repeat times',atLeast:'At least',yes:'Then add',no:'Otherwise add'};
function programHTML(program,band){
  if(!program.length)return '<li class="block-empty">Add a block, or drag a block handle here.</li>';
  return program.map((node,index)=>`<li class="block-program-item block-kind-${node.op}" data-block-item data-block-index="${index}"><div class="block-item-heading"><button type="button" class="block-grip" data-block-program-handle data-block-index="${index}" draggable="false" aria-label="Drag block ${index+1}">↕</button><strong>${index+1}. ${esc(sourceFor(node))}</strong></div>${node.op==='move'||node.op==='show'?'':`<div class="block-fields">${Object.keys(fields[node.op]).map(field=>`<label>${fieldName[field]}<select data-block-field="${field}" aria-label="Block ${index+1}: ${fieldName[field]}">${values[field].filter(value=>value>=fields[node.op][field][0]&&value<=fields[node.op][field][1]).map(value=>`<option value="${value}"${node[field]===value?' selected':''}>${value}</option>`).join('')}</select></label>`).join('')}</div>`}<div class="block-item-controls"><button type="button" data-block-action="up" data-block-index="${index}"${index===0?' disabled':''} aria-label="Move block ${index+1} up">Move up</button><button type="button" data-block-action="down" data-block-index="${index}"${index===program.length-1?' disabled':''} aria-label="Move block ${index+1} down">Move down</button><button type="button" data-block-action="remove" data-block-index="${index}" aria-label="Remove block ${index+1}">Remove</button></div></li>`).join('');
}
function boardHTML(value,band){
  if(band!=='K–1')return `<div class="block-counter"><span>Counter</span><output data-block-value>${value}</output></div>`;
  return `<svg class="block-path-board" viewBox="0 0 500 110" role="img" aria-label="Picture robot on space ${value} of five"><title>Picture robot on space ${value} of five</title>${Array.from({length:5},(_,index)=>`<rect class="block-space${value===index+1?' is-occupied':''}" x="${index*98+5}" y="10" width="88" height="70" rx="10"/><text x="${index*98+49}" y="101">${index+1}</text>${value===index+1?`<rect class="block-robot" x="${index*98+29}" y="27" width="40" height="35" rx="7"/><path d="M${index*98+38} 38h3m14 0h3M${index*98+39} 51h19"/>`:''}`).join('')}</svg><p>Robot space: <output data-block-value>${value}</output></p>`;
}
export function renderBlockWorkshop({band}={}){
  if(!bands.includes(band))return '<p>Choose an available block workshop.</p>';
  const program=initial(band);
  return `<section class="block-workshop" data-block-workshop data-block-band="${band}" aria-label="Local visual block workshop"><header><p class="eyebrow">Build · Predict · Try</p><h3>Build a tiny program.</h3><p>${band==='K–1'?'Move a picture robot along five spaces.':band==='2–3'?'Set a counter, add and repeat a small change.':'Combine a repeat with an if / otherwise decision.'} Change the blocks, then Run or Step to see what happens.</p><p>Drag a ↕ handle into the program, or choose Add. Move up, Move down and Remove also work with a keyboard. Scroll the page outside the small drag handles.</p></header><div class="block-workshop-grid"><section class="block-palette" aria-label="Blocks to add"><h4>1. Choose blocks</h4>${palettes[band].map(item=>`<div class="block-palette-card"><button type="button" data-block-action="add" data-block-palette="${item.id}">+ Add ${esc(item.label)}</button><button type="button" class="block-grip" data-block-palette-handle="${item.id}" draggable="false" aria-label="Drag ${esc(item.label)}">↕</button></div>`).join('')}</section><section class="block-editor" aria-label="Your block program"><h4>2. Arrange your program</h4><p data-block-count>${program.length} of 12 blocks</p><ol class="block-program" data-block-list aria-label="Program blocks">${programHTML(program,band)}</ol></section><section class="block-preview" aria-label="Picture model result"><h4>3. Run and compare</h4><div data-block-board>${boardHTML(band==='K–1'?1:0,band)}</div><div class="block-run-controls"><button type="button" class="button" data-block-action="run">Run</button><button type="button" class="button button-outline" data-block-action="step">Step</button></div><p data-block-step-count>Not run yet.</p><p>Show blocks write here: <output data-block-output>Nothing shown yet.</output></p><ol class="block-trace" data-block-trace aria-label="Recent model steps"></ol></section></div><p class="block-status" data-block-status role="status" aria-live="polite" aria-atomic="true">Ready. Try the example, then change a block.</p><details class="block-source"><summary>See the picture-model instructions</summary><pre data-block-source>${esc(program.map(sourceFor).join('\n'))}</pre></details><div class="block-run-controls"><button type="button" data-block-action="clear">Clear program</button><button type="button" data-block-action="example">Restore example</button></div><p class="block-local-note">Fictional local practice, not a grade. No typed code, names, accounts, uploads or real devices. Up to 12 blocks and 80 model steps. The draft stays only in this activity and clears when you leave.</p></section>`;
}

export function mountBlockWorkshop(root,{band}={}){
  if(!bands.includes(band))return {dispose(){}};
  const shell=root?.querySelector?.('[data-block-workshop]');
  if(!shell||shell.dataset.blockBand!==band)return {dispose(){}};
  const find=selector=>shell.querySelector(selector),list=find('[data-block-list]'),status=find('[data-block-status]');
  if(!list||!status)return {dispose(){}};
  const doc=shell.ownerDocument,view=doc?.defaultView;
  let program=initial(band),execution=null,cursor=0,disposed=false,drag=null;
  const say=message=>{if(!disposed)status.textContent=message;};
  const itemIndex=element=>{const text=element?.dataset?.blockIndex;return typeof text==='string'&&/^(?:0|[1-9]\d?)$/u.test(text)?Number(text):-1;};
  function marks(position=null){
    list.classList.toggle('is-drop-target',position!==null);
    for(const item of list.querySelectorAll('[data-block-item]')){
      const index=itemIndex(item);item.classList.toggle('block-drop-before',position===index);item.classList.toggle('block-drop-after',position===program.length&&index===program.length-1);
    }
  }
  function cancelDrag(){
    if(!drag)return;
    const pending=drag;drag=null;
    try{pending.handle.releasePointerCapture?.(pending.pointerId);}catch{/* Capture may already have ended. */}
    shell.classList.remove('is-block-dragging');marks();
  }
  function result(){
    const recent=execution?.trace.slice(0,cursor)||[],value=recent.length?recent.at(-1).value:band==='K–1'?1:0;
    find('[data-block-board]').innerHTML=boardHTML(value,band);
    find('[data-block-step-count]').textContent=execution?`${cursor} of ${execution.trace.length} model steps shown${execution.error?' · stopped safely':''}.`:'Not run yet.';
    const output=recent.filter(step=>step.op==='show').map(step=>step.value);
    find('[data-block-output]').textContent=output.length?output.join(', '):'Nothing shown yet.';
    find('[data-block-trace]').innerHTML=recent.slice(-8).map(step=>`<li>${esc(step.message)}</li>`).join('');
    find('[data-block-source]').textContent=program.map(sourceFor).join('\n');
    for(const item of list.querySelectorAll('[data-block-item]'))item.classList.toggle('is-current-block',recent.length>0&&itemIndex(item)===recent.at(-1).block);
    find('[data-block-action="step"]').disabled=!program.length||!!execution&&cursor>=execution.trace.length;
    find('[data-block-action="run"]').disabled=!program.length;
  }
  function edit(next,message,focusIndex){
    cancelDrag();program=validateBlockProgram(next,{band});execution=null;cursor=0;
    list.innerHTML=programHTML(program,band);find('[data-block-count]').textContent=`${program.length} of 12 blocks`;result();say(message);
    if(Number.isInteger(focusIndex)){
      const item=[...list.querySelectorAll('[data-block-item]')].find(row=>itemIndex(row)===focusIndex);
      (item?.querySelector('[data-block-program-handle]')||find('[data-block-action="example"]')).focus();
    }
  }
  function click(event){
    const button=event.target?.closest?.('[data-block-action]');
    if(disposed||!button||!shell.contains(button)||button.disabled)return;
    const action=button.dataset.blockAction,index=itemIndex(button);
    if(action==='add'){
      const choice=palettes[band].find(item=>item.id===button.dataset.blockPalette);if(!choice)return;
      if(program.length>=12){say('The program has 12 blocks. Remove one before adding another.');return;}
      edit([...program,{...choice.node}],'Block added. Run or Step to test the new program.',program.length);return;
    }
    if(action==='clear'){edit([],'Program cleared. Add a block to begin.');return;}
    if(action==='example'){edit(initial(band),'Example restored. Run or Step to explore it.');return;}
    if(['up','down','remove'].includes(action)){
      if(index<0||index>=program.length)return;
      const next=program.slice();
      if(action==='remove'){next.splice(index,1);edit(next,'Block removed. Earlier results were cleared.',Math.min(index,next.length-1));return;}
      const target=index+(action==='up'?-1:1);if(target<0||target>=program.length)return;
      [next[index],next[target]]=[next[target],next[index]];edit(next,'Block moved. Run or Step to test the new order.',target);return;
    }
    if(action!=='run'&&action!=='step')return;
    cancelDrag();if(!program.length){say('Add a block before running.');return;}
    if(action==='run'||!execution){execution=runBlockProgram(program,{band});cursor=0;}
    cursor=action==='run'?execution.trace.length:Math.min(execution.trace.length,cursor+1);result();
    const reasons={'path-edge':'The robot reached the path edge. Change a move and try again.','step-limit':'Stopped at 80 steps. Use fewer repeats.','value-limit':'Stopped at the counter limit. Use smaller changes.','invalid-program':'That program is unavailable. Restore the example.'};
    say(execution.error&&cursor===execution.trace.length?reasons[execution.error]:cursor===execution.trace.length?'Program finished. Compare the result with your prediction; this is not a grade.':'One model step shown. Choose Step again to continue.');
  }
  function change(event){
    const select=event.target?.closest?.('[data-block-field]');if(disposed||!select||!shell.contains(select))return;
    const index=itemIndex(select.closest('[data-block-item]')),node=program[index],field=select.dataset.blockField;
    if(!node||!Object.hasOwn(fields[node.op],field))return;
    const value=values[field].find(candidate=>String(candidate)===select.value);
    if(value===undefined){edit(program,'Choose an available number.');return;}
    const next=program.map((item,position)=>position===index?{...item,[field]:value}:item);
    edit(next,'Number changed. Earlier results were cleared.');
    [...list.querySelectorAll('[data-block-item]')].find(item=>itemIndex(item)===index)?.querySelector(`[data-block-field="${field}"]`)?.focus();
  }
  function targetAt(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    const hit=doc?.elementFromPoint?.(x,y);if(!hit||!shell.contains(hit)||hit.closest?.('[data-block-list]')!==list)return null;
    const item=hit.closest?.('[data-block-item]');if(!item)return program.length;
    const index=itemIndex(item);if(index<0||index>=program.length)return null;
    const rect=item.getBoundingClientRect();return y<rect.top+rect.height/2?index:index+1;
  }
  function down(event){
    if(disposed||drag||event.isPrimary===false||event.button!==0||!Number.isFinite(event.pointerId)||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
    const handle=event.target?.closest?.('[data-block-palette-handle],[data-block-program-handle]');if(!handle||!shell.contains(handle))return;
    const palette=palettes[band].find(item=>item.id===handle.dataset.blockPaletteHandle),index=itemIndex(handle);
    if(!palette&&(index<0||index>=program.length))return;
    event.preventDefault();drag={handle,pointerId:event.pointerId,x:event.clientX,y:event.clientY,palette,index,moved:false,target:null};
    try{handle.setPointerCapture?.(event.pointerId);}catch{/* Document listeners still handle cancel and release. */}
    say('Move the handle to a program position, then release. Escape cancels.');
  }
  function move(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;
    drag.moved=true;shell.classList.add('is-block-dragging');event.preventDefault();
    drag.target=targetAt(event.clientX,event.clientY);marks(drag.target);
    say(drag.target===null?'Release outside the program to cancel.':`Release at program position ${drag.target+1}.`);
  }
  function up(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    const pending=drag;const position=pending.moved?targetAt(event.clientX,event.clientY):null;cancelDrag();
    if(position===null){say('Move canceled. The program is unchanged.');return;}
    const next=program.slice();
    if(pending.palette){
      if(next.length>=12){say('The program has 12 blocks. Remove one before adding another.');return;}
      next.splice(position,0,{...pending.palette.node});edit(next,'Block added at the chosen position.',position);
    }else{
      const [node]=next.splice(pending.index,1),target=position>pending.index?position-1:position;next.splice(target,0,node);
      edit(next,'Block moved. Run or Step to compare the new order.',target);
    }
  }
  function interrupt(event){if(drag&&(!['pointercancel','lostpointercapture'].includes(event.type)||event.pointerId===drag.pointerId)){cancelDrag();say('Move canceled. The program is unchanged.');}}
  function key(event){if(event.key==='Escape'&&drag){event.preventDefault();interrupt(event);}}
  function rejectNative(event){event.preventDefault();if(event.type==='drop'){cancelDrag();say('Outside drag data is ignored. Use a block handle or Add.');}}
  const listeners=[[shell,'click',click],[shell,'change',change],[shell,'pointerdown',down],[shell,'lostpointercapture',interrupt],[shell,'keydown',key],[shell,'dragstart',rejectNative],[shell,'dragover',rejectNative],[shell,'drop',rejectNative],
    [doc,'pointermove',move],[doc,'pointerup',up],[doc,'pointercancel',interrupt],[doc,'scroll',interrupt],[view,'blur',interrupt]];
  for(const [target,type,handler] of listeners)target?.addEventListener?.(type,handler);
  list.innerHTML=programHTML(program,band);find('[data-block-count]').textContent=`${program.length} of 12 blocks`;result();
  return {dispose(){if(disposed)return;cancelDrag();disposed=true;for(const [target,type,handler] of listeners)target?.removeEventListener?.(type,handler);program=[];execution=null;cursor=0;}};
}
