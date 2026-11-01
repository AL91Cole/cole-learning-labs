import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateBlockProgram,runBlockProgram,renderBlockWorkshop,mountBlockWorkshop,BLOCK_WORKSHOP_LIMITS} from '../src/block-workshop.js';

const band='4–6';
test('the pure model executes repeats, both decisions and show without changing caller nodes',()=>{
  const program=[{op:'set',value:1},{op:'repeat-add',count:2,value:2},{op:'if-add',atLeast:5,yes:10,no:1},{op:'show'}],before=structuredClone(program);
  const result=runBlockProgram(program,{band});assert.equal(result.ok,true);assert.equal(result.value,15);assert.deepEqual(result.outputs,[15]);
  assert.deepEqual(result.trace.map(step=>step.value),[1,3,5,15,15]);assert.deepEqual(program,before);
  assert.match(result.source,/IF counter >= 5: ADD 10\nOTHERWISE: ADD 1/u);
  assert.equal(runBlockProgram([{op:'set',value:2},{op:'if-add',atLeast:5,yes:10,no:1}],{band}).value,3);
});
test('the node schema rejects code, unknown fields, getters, wrong bands, fractions and oversized programs',()=>{
  let getters=0;const getter={op:'add',get value(){getters++;return 1;}};
  const accessor=[];Object.defineProperty(accessor,0,{get(){getters++;return {op:'show'};},configurable:true});
  for(const program of ['print(1)',null,[{op:'eval',value:1}],[{op:'show',text:'private injected label'}],[{op:'add',value:1.5}],[{op:'add',value:11}],[{op:'repeat-add',value:1,count:9}],[{op:'show',[Symbol('unknown')]:1}],[getter],accessor,Array.from({length:13},()=>({op:'show'}))]){
    assert.throws(()=>validateBlockProgram(program,{band}));const result=runBlockProgram(program,{band});assert.equal(result.ok,false);assert.equal(result.source,'');assert.deepEqual(result.trace,[]);
  }
  assert.equal(getters,0);assert.throws(()=>validateBlockProgram([{op:'set',value:1}],{band:'K–1'}));
  assert.throws(()=>validateBlockProgram([{op:'if-add',atLeast:1,yes:1,no:0}],{band:'2–3'}));
  assert.throws(()=>validateBlockProgram([{op:'move',value:0}],{band:'K–1'}));
  assert.equal(runBlockProgram([{op:'show'}],{band:'unknown'}).ok,false);
});
test('fixed path, value and step limits stop before leaving the bounded model',()=>{
  assert.deepEqual(BLOCK_WORKSHOP_LIMITS,{blocks:12,steps:80,minValue:-100,maxValue:100});
  const edge=runBlockProgram([{op:'move',value:-1}],{band:'K–1'});assert.equal(edge.error,'path-edge');assert.equal(edge.value,1);assert.equal(edge.trace.length,0);
  const cap=runBlockProgram([{op:'set',value:20},{op:'repeat-add',count:8,value:10},{op:'add',value:1}],{band});assert.equal(cap.error,'value-limit');assert.equal(cap.value,100);
  const budget=runBlockProgram(Array.from({length:12},()=>({op:'repeat-add',count:8,value:0})),{band});assert.equal(budget.error,'step-limit');assert.equal(budget.trace.length,80);
});

// This fixture recognizes authored attributes and controls. It does not strip
// tags, sanitize HTML, implement a browser layout engine or trust DOM labels.
function fixture(selectedBand='2–3'){
  const classes=()=>{const data=new Set();return {add:name=>data.add(name),remove:name=>data.delete(name),contains:name=>data.has(name),toggle(name,on){if(on)data.add(name);else data.delete(name);}};};
  const eventTarget=()=>({listeners:new Map(),addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);},removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);},fire(type,options={}){const event={type,prevented:false,preventDefault(){this.prevented=true;},...options};for(const fn of [...(this.listeners.get(type)||[])])fn(event);return event;},get listenerCount(){return [...this.listeners.values()].reduce((sum,set)=>sum+set.size,0);}});
  const view=eventTarget(),doc={...eventTarget(),defaultView:view,activeElement:null,hit:null,elementFromPoint(){return this.hit;}};
  const dataKey=name=>name.replace(/^data-/u,'').replace(/-([a-z])/gu,(_,letter)=>letter.toUpperCase());
  const element=(dataset={},parent=null)=>({dataset,parent,ownerDocument:doc,classList:classes(),disabled:false,textContent:'',innerHTML:'',captured:new Set(),focus(){doc.activeElement=this;},setPointerCapture(id){this.captured.add(id);},releasePointerCapture(id){this.captured.delete(id);},closest(selector){for(let node=this;node;node=node.parent)for(const part of selector.split(',')){const match=part.match(/^\[(data-[a-z-]+)\]$/u);if(match&&Object.hasOwn(node.dataset,dataKey(match[1])))return node;}return null;}});
  const shell={...element({blockWorkshop:'',blockBand:selectedBand}),...eventTarget()};
  shell.contains=target=>{for(let node=target;node;node=node.parent)if(node===shell)return true;return false;};
  const status=element({},shell),nodes=new Map();
  for(const selector of ['[data-block-status]','[data-block-count]','[data-block-board]','[data-block-step-count]','[data-block-output]','[data-block-trace]','[data-block-source]'])nodes.set(selector,selector==='[data-block-status]'?status:element({},shell));
  const actionButton=(action,index)=>element({blockAction:action,...(index===undefined?{}:{blockIndex:String(index)})},shell);
  for(const action of ['run','step','clear','example'])nodes.set(`[data-block-action="${action}"]`,actionButton(action));
  const list=element({blockList:''},shell);list.items=[];
  Object.defineProperty(list,'innerHTML',{set(markup){
    this.markup=markup;this.items=[...markup.matchAll(/<li class="block-program-item[^>]*data-block-index="(\d+)"[^>]*>([\s\S]*?)<\/li>/gu)].map(match=>{
      const item=element({blockItem:'',blockIndex:match[1]},list),index=Number(match[1]);item.getBoundingClientRect=()=>({top:index*120,height:110});
      item.handle=element({blockProgramHandle:'',blockIndex:match[1]},item);item.fields=new Map();
      for(const select of match[2].matchAll(/<select data-block-field="([a-z]+)"[^>]*>([\s\S]*?)<\/select>/gu)){
        const field=element({blockField:select[1]},item);field.value=select[2].match(/<option value="(-?\d+)" selected>/u)?.[1];assert.notEqual(field.value,undefined);item.fields.set(select[1],field);
      }
      item.controls=new Map();for(const action of ['up','down','remove']){const button=element({blockAction:action,blockIndex:match[1]},item);button.disabled=new RegExp(`data-block-action="${action}" data-block-index="${index}" disabled`,'u').test(match[2]);item.controls.set(action,button);}
      item.querySelector=selector=>selector==='[data-block-program-handle]'?item.handle:item.fields.get(selector.match(/^\[data-block-field="([a-z]+)"\]$/u)?.[1])||null;return item;
    });
  }});
  list.querySelectorAll=selector=>{assert.equal(selector,'[data-block-item]');return list.items;};nodes.set('[data-block-list]',list);
  shell.querySelector=selector=>{assert.ok(nodes.has(selector),selector);return nodes.get(selector);};
  const html=renderBlockWorkshop({band:selectedBand}),palette=new Map(),handles=new Map();
  for(const match of html.matchAll(/data-block-action="add" data-block-palette="([a-z]+)"/gu))palette.set(match[1],element({blockAction:'add',blockPalette:match[1]},shell));
  for(const match of html.matchAll(/data-block-palette-handle="([a-z]+)"/gu))handles.set(match[1],element({blockPaletteHandle:match[1]},shell));
  const root={querySelector(selector){assert.equal(selector,'[data-block-workshop]');return shell;}};
  const controller=mountBlockWorkshop(root,{band:selectedBand});
  return {band:selectedBand,doc,view,shell,list,status,nodes,root,controller,palette,handles,
    click(action,index){const target=index===undefined?nodes.get(`[data-block-action="${action}"]`):list.items[index]?.controls.get(action);assert.ok(target,`${action} ${index}`);if(!target.disabled)shell.fire('click',{target});},
    add(id){const target=palette.get(id);assert.ok(target,id);shell.fire('click',{target});},
    change(index,field,value){const target=list.items[index]?.fields.get(field);assert.ok(target,`${index} ${field}`);target.value=String(value);shell.fire('change',{target});},
    down(handle,options={}){return shell.fire('pointerdown',{target:handle,button:0,isPrimary:true,pointerId:7,clientX:10,clientY:10,...options});},
    move(hit,y){doc.hit=hit;return doc.fire('pointermove',{pointerId:7,clientX:45,clientY:y});},
    up(hit,y){doc.hit=hit;return doc.fire('pointerup',{pointerId:7,clientX:45,clientY:y});},
    get source(){return nodes.get('[data-block-source]').textContent;},
    get output(){return nodes.get('[data-block-output]').textContent;},
    get value(){return Number(nodes.get('[data-block-board]').innerHTML.match(/<output data-block-value>(-?\d+)<\/output>/u)?.[1]);}
  };
}

test('native controls step the model, run to completion and invalidate output after edits',()=>{
  const h=fixture();assert.equal(h.value,0);h.click('step');assert.equal(h.value,2);assert.equal(h.output,'Nothing shown yet.');
  h.click('step');assert.equal(h.value,3);h.click('run');assert.equal(h.value,5);assert.equal(h.output,'5');
  h.change(1,'count',4);assert.equal(h.value,0);assert.equal(h.output,'Nothing shown yet.');h.click('run');assert.equal(h.value,6);assert.equal(h.output,'6');
  h.change(1,'value','<script>');assert.equal(h.source.includes('<script>'),false);h.click('run');assert.equal(h.value,6);h.controller.dispose();
});
test('keyboard-accessible move/remove/add controls change order and enforce the twelve-block cap',()=>{
  const h=fixture();h.click('down',0);h.click('run');assert.equal(h.value,2);assert.equal(h.output,'2');
  h.click('up',1);h.click('run');assert.equal(h.value,5);h.click('remove',1);h.click('run');assert.equal(h.value,2);
  h.click('clear');assert.equal(h.list.items.length,0);assert.equal(h.nodes.get('[data-block-action="run"]').disabled,true);
  h.add('add');h.click('remove',0);assert.equal(h.doc.activeElement,h.nodes.get('[data-block-action="example"]'),'Removing the last block retains a useful keyboard focus target.');
  for(let index=0;index<12;index++)h.add('add');assert.equal(h.list.items.length,12);const before=h.source;h.add('show');assert.equal(h.source,before);assert.match(h.status.textContent,/12 blocks/u);
  h.click('example');assert.equal(h.list.items.length,3);h.click('run');assert.equal(h.value,5);h.controller.dispose();
});
test('pointer handles really insert palette blocks and reorder the existing program',()=>{
  const h=fixture(),handle=h.handles.get('show');assert.equal(h.down(handle).prevented,true);assert.equal(handle.captured.has(7),true);
  h.move(h.list.items[0],5);h.up(h.list.items[0],5);assert.equal(h.list.items.length,4);assert.ok(h.source.startsWith('SHOW\nSET 2'));
  assert.equal(handle.captured.size,0);assert.equal(h.shell.classList.contains('is-block-dragging'),false);
  const first=h.list.items[0].handle;h.down(first);h.move(h.list.items[3],470);h.up(h.list.items[3],470);
  assert.equal(h.source,'SET 2\nREPEAT 3 TIMES: ADD 1\nSHOW\nSHOW');h.click('run');assert.equal(h.output,'5, 5');h.controller.dispose();
});
test('touch, outside release, Escape, scroll, blur and capture loss cancel without changing the draft',()=>{
  const h=fixture('K–1'),original=h.source;
  const ordinary=h.down(h.palette.get('right'),{pointerType:'touch'});assert.equal(ordinary.prevented,false,'Touch scrolling outside handles is not intercepted.');
  for(const cancel of [()=>h.up(null,500),()=>h.shell.fire('keydown',{key:'Escape'}),()=>h.doc.fire('scroll'),()=>h.view.fire('blur'),()=>h.doc.fire('pointercancel',{pointerId:7}),()=>h.shell.fire('lostpointercapture',{pointerId:7})]){
    const handle=h.handles.get('left');h.down(handle,{pointerType:'touch'});h.move(h.list.items[0],5);cancel();
    assert.equal(h.source,original);assert.equal(handle.captured.size,0);assert.equal(h.shell.classList.contains('is-block-dragging'),false);
    h.doc.fire('pointerup',{pointerId:7,clientX:20,clientY:5});assert.equal(h.source,original);
  }
  h.controller.dispose();
});
test('native/external drag data and unrelated pointers cannot insert content',()=>{
  const h=fixture(),before=h.source,payload=new Proxy({}, {get(){assert.fail('Native drag payload was read.');}});
  for(const type of ['dragstart','dragover','drop'])assert.equal(h.shell.fire(type,{dataTransfer:payload}).prevented,true);
  assert.equal(h.source,before);h.down(h.handles.get('add'));h.doc.hit=h.list;
  h.doc.fire('pointermove',{pointerId:55,clientX:100,clientY:100});h.doc.fire('pointerup',{pointerId:55,clientX:100,clientY:100});assert.equal(h.source,before);
  h.doc.fire('pointercancel',{pointerId:7});h.controller.dispose();
});
test('dispose releases capture and every listener; remount starts a fresh example',()=>{
  const h=fixture();h.click('clear');h.add('show');h.down(h.handles.get('add'));const handle=h.handles.get('add');
  const oldMove=[...h.doc.listeners.get('pointermove')][0];h.controller.dispose();assert.equal(handle.captured.size,0);
  assert.equal(h.shell.listenerCount+h.doc.listenerCount+h.view.listenerCount,0);assert.doesNotThrow(()=>h.controller.dispose());
  const before=h.source;oldMove({pointerId:7,clientX:40,clientY:50,preventDefault(){}});assert.equal(h.source,before);
  const replacement=mountBlockWorkshop(h.root,{band:h.band});assert.equal(h.source,'SET 2\nREPEAT 3 TIMES: ADD 1\nSHOW');replacement.dispose();
});
test('the three age presets provide picture/maths controls without typed source, imports or I/O',async()=>{
  const names=['fetch','XMLHttpRequest','WebSocket','EventSource','localStorage','sessionStorage','indexedDB','Worker','Function','eval','navigator'],descriptors=new Map();
  for(const name of names){descriptors.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,get(){assert.fail(`Unexpected ${name} use.`);}});}
  try{
    for(const selectedBand of ['K–1','2–3','4–6']){const html=renderBlockWorkshop({band:selectedBand});assert.doesNotMatch(html,/<(?:input|textarea|form|iframe|script)\b/iu);const h=fixture(selectedBand);h.click('run');assert.equal(h.value,selectedBand==='K–1'?2:selectedBand==='2–3'?5:15);h.click('clear');h.controller.dispose();}
  }finally{for(const [name,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
  const source=await readFile(new URL('../src/block-workshop.js',import.meta.url),'utf8');assert.doesNotMatch(source,/^import\b/mu);
  assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|Worker|Function|eval)\s*(?:\.|\()/u);
  const poison=new Proxy({}, {get(){assert.fail('Unknown band inspected DOM.');}});assert.doesNotThrow(()=>mountBlockWorkshop(poison,{band:'unknown'}).dispose());
});
