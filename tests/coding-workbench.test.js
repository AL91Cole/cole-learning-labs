import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {codingBlockContract,initialCodingState,applyCodingAction,verifyCoding,executeCoding} from '../src/coding-lab.js';
import {initialCodingBlocks,validateCodingBlocks,codingBlocksSource,renderCodingWorkbench,mountCodingWorkbench,disposeCodingWorkbench,cancelCodingWorkbench} from '../src/coding-workbench.js';

const ids=['CODE-501','CODE-502','CODE-503','CODE-504','CODE-505','CODE-506'];
function repair(id,program){
  if(['CODE-501','CODE-504'].includes(id))program[0].values.operator='*';
  if(id==='CODE-502'){program[0].values.lowOp='<';program[0].values.highOp='<=';}
  if(id==='CODE-505')program[0].values.highOp='<';
  if(['CODE-503','CODE-506'].includes(id)){const node=program[id==='CODE-503'?0:1];node.values.start=1;node.values.endOffset=0;}
  return program;
}
function official(id,source,language){
  let state=applyCodingAction(id,initialCodingState(id),'set-language',{language,code:''}).state;
  return applyCodingAction(id,state,'run-check',{code:source}).state;
}
test('all six guided starters need repair, while corrected blocks pass the original fixtures in both languages',()=>{
  for(const id of ids)for(const language of ['javascript','python']){
    const config=codingBlockContract(id),starter=initialCodingBlocks(config),before=structuredClone(starter);
    const source=codingBlocksSource(config,starter,language),failed=official(id,source,language);
    assert.equal(verifyCoding(id,failed).ok,false,id+' '+language+' starter');assert.deepEqual(starter,before);
    const fixed=codingBlocksSource(config,repair(id,starter),language),passed=official(id,fixed,language);
    assert.equal(verifyCoding(id,passed).ok,true,id+' '+language);assert.ok(passed.results.every(row=>row.ok));assert.ok(fixed.length<=4000);
  }
});
test('node validation rejects unknown blocks, settings, getters and oversized programs without accepting source text',()=>{
  const config=codingBlockContract('CODE-501');let getters=0;
  const invalid=[null,'print(1)',[{id:'unknown',values:{}}],[{id:'bcalculate',values:{operator:'*;fetch(1)',factor:3}}],[{id:'bcalculate',values:{operator:'*',factor:999}}],[{id:'bshow',values:{secret:'typed text'}}],[{id:'bshow',values:{},label:'private'}],[{get id(){getters++;return 'bshow';},values:{}}],Array.from({length:9},()=>({id:'bshow',values:{}}))];
  for(const program of invalid)assert.throws(()=>codingBlocksSource(config,program));assert.equal(getters,0);
  assert.throws(()=>codingBlocksSource(config,initialCodingBlocks(config),'html'));
  assert.throws(()=>initialCodingBlocks({...config,input:'constructor'}));assert.equal(codingBlockContract('CODE-599'),null);
  assert.equal(renderCodingWorkbench({config:null}),'');
});
test('reordering and extra output change real fixture evidence rather than bypassing the interpreter',()=>{
  const config=codingBlockContract('CODE-506'),nodes=repair('CODE-506',initialCodingBlocks(config));
  assert.equal(verifyCoding('CODE-506',official('CODE-506',codingBlocksSource(config,[nodes[2],nodes[0],nodes[1]]),'javascript')).ok,false);
  const extra=[...nodes,{id:'bshow-input',values:{}}];assert.equal(verifyCoding('CODE-506',official('CODE-506',codingBlocksSource(config,extra),'javascript')).ok,false);
  const repeated=Array.from({length:8},()=>({id:'bchecklist',values:{start:1,endOffset:0}}));
  const run=executeCoding(codingBlocksSource(codingBlockContract('CODE-503'),repeated),{stations:50});assert.equal(run.ok,false);assert.ok(run.output.length<=20);
});

function fixture(id='CODE-501'){
  const config=codingBlockContract(id),active={element:null};
  const target=()=>({listeners:new Map(),addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);},removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);},fire(type,options={}){const event={type,preventDefault(){this.prevented=true;},...options};for(const fn of [...(this.listeners.get(type)||[])])fn(event);return event;},get listenerCount(){return [...this.listeners.values()].reduce((sum,set)=>sum+set.size,0);}});
  const classes=()=>({values:new Set(),add(name){this.values.add(name);},remove(name){this.values.delete(name);}});
  const node=(dataset={},parent=null)=>({dataset,parent,classList:classes(),disabled:false,textContent:'',innerHTML:'',captures:new Set(),focus(){active.element=this;},setPointerCapture(id){this.captures.add(id);},releasePointerCapture(id){this.captures.delete(id);},setAttribute(name,value){this[name]=value;},removeAttribute(name){delete this[name];},replaceChildren(){this.innerHTML='';},closest(selector){for(let item=this;item;item=item.parent)for(const part of selector.split(',')){const name=part.match(/^\[data-([a-z-]+)\]$/u)?.[1]?.replace(/-([a-z])/gu,(_,c)=>c.toUpperCase());if(name&&Object.hasOwn(item.dataset,name))return item;}return null;}});
  const view=target(),doc={...target(),defaultView:view,hit:null,elementFromPoint(){return this.hit;}},host={...node(),...target()};
  host.contains=child=>{for(let item=child;item;item=item.parent)if(item===host)return true;return false;};
  const list=node({cbList:''},host),status=node({},host),source=node({},host),results=node({},host),starter=node({cbAction:'starter'},host);
  const decode=text=>text.replace(/&lt;/gu,'<').replace(/&gt;/gu,'>').replace(/&amp;/gu,'&');
  Object.defineProperty(list,'innerHTML',{set(html){this.rows=[...html.matchAll(/<li data-cb-row="(\d+)"[^>]*>([\s\S]*?)<\/li>/gu)].map(match=>{
    const row=node({cbRow:match[1]},list);row.getBoundingClientRect=()=>({top:Number(match[1])*100,height:90});row.handle=node({cbHandle:match[1]},row);row.fields=new Map();
    for(const field of match[2].matchAll(/<select data-cb-field="([A-Za-z]+)"[^>]*>([\s\S]*?)<\/select>/gu)){const control=node({cbField:field[1]},row);control.value=decode(field[2].match(/<option value="([^"]*)" selected>/u)?.[1]||'');row.fields.set(field[1],control);}
    row.querySelector=selector=>selector==='[data-cb-handle]'?row.handle:row.fields.get(selector.match(/^\[data-cb-field="([A-Za-z]+)"\]$/u)?.[1]);return row;
  });}});
  list.querySelectorAll=selector=>{assert.equal(selector,'[data-cb-row]');return list.rows;};
  const nodes=new Map([['[data-cb-list]',list],['[data-cb-status]',status],['[data-cb-source]',source],['[data-cb-results]',results],['[data-cb-action="starter"]',starter]]);
  host.querySelector=selector=>{assert.ok(nodes.has(selector),selector);return nodes.get(selector);};
  const root={ownerDocument:doc,querySelectorAll:()=>[],querySelector:selector=>{assert.equal(selector,'[data-coding-blocks]');return host;}};
  const calls={preview:0,use:[]},options={id,config,preview:code=>{calls.preview++;const run=executeCoding(code,{quantity:2});return [{input:'quantity',value:2,expected:['6'],...run,passed:run.ok&&run.output.length===1&&run.output[0]==='6'}];},onUse:code=>calls.use.push(code)};
  const controller=mountCodingWorkbench(root,options);
  return {id,config,root,host,doc,view,list,status,source,results,calls,controller,options,active,
    click(action,index,id){const button=node({cbAction:action,...(index===undefined?{}:{cbIndex:String(index)}),...(id?{cbId:id}:{})},host);host.fire('click',{target:button});},
    change(index,field,value){const control=list.rows[index].fields.get(field);assert.ok(control,field);control.value=String(value);host.fire('change',{target:control});},
    start(handle){host.fire('pointerdown',{target:handle,button:0,isPrimary:true,pointerId:4,clientX:10,clientY:10});},
    move(hit,y=5){doc.hit=hit;doc.fire('pointermove',{pointerId:4,clientX:50,clientY:y});},
    release(hit,y=5){doc.hit=hit;doc.fire('pointerup',{pointerId:4,clientX:50,clientY:y});},
    palette(id){return node({cbPalette:id},host);}
  };
}
test('preview is local and separate from explicit editor transfer; editing clears stale preview evidence',()=>{
  const h=fixture(),state=initialCodingState(h.id);h.click('preview');assert.equal(h.calls.preview,1);assert.equal(h.calls.use.length,0);assert.equal(verifyCoding(h.id,state).ok,false);
  assert.match(h.results.innerHTML,/Actual: 5/u);h.change(0,'operator','*');assert.equal(h.results.innerHTML,'');assert.equal(h.calls.use.length,0);
  h.click('preview');assert.match(h.status.textContent,/1 of 1 inputs match/u);assert.equal(verifyCoding(h.id,state).ok,false);
  h.click('use');assert.equal(h.calls.use.length,1);assert.equal(h.calls.use[0],h.source.textContent);assert.equal(h.calls.preview,2);
  h.change(0,'factor','private typed string');assert.equal(h.source.textContent.includes('private typed string'),false);disposeCodingWorkbench(h.root);
});
test('native Add, Move and Remove controls preserve a bounded program and generated source',()=>{
  const h=fixture();h.click('down',0);assert.ok(h.source.textContent.startsWith('print(total)'));h.click('up',1);assert.ok(h.source.textContent.startsWith('let total'));
  h.click('clear');h.click('add',undefined,'bshow-input');assert.equal(h.source.textContent,'print(quantity);');h.click('remove',0);assert.equal(h.source.textContent,'');assert.equal(h.active.element,h.host.querySelector('[data-cb-action="starter"]'));
  for(let index=0;index<8;index++)h.click('add',undefined,'bshow-input');const before=h.source.textContent;h.click('add',undefined,'bshow-input');assert.equal(h.list.rows.length,8);assert.equal(h.source.textContent,before);h.click('starter');assert.equal(h.list.rows.length,2);disposeCodingWorkbench(h.root);
});
test('real pointer insert/reorder and every cancel path preserve program integrity and reject native drag data',()=>{
  const h=fixture(),handle=h.palette('bshow-input');h.start(handle);h.move(h.list.rows[0]);h.release(h.list.rows[0]);assert.ok(h.source.textContent.startsWith('print(quantity);'));assert.equal(handle.captures.size,0);
  const first=h.list.rows[0].handle;h.start(first);h.move(h.list.rows[2],290);h.release(h.list.rows[2],290);assert.ok(h.source.textContent.endsWith('print(quantity);'));
  const before=h.source.textContent;h.active.element={outsideHost:true};
  for(const cancel of [()=>h.doc.fire('keydown',{key:'Escape',target:h.active.element}),()=>h.doc.fire('pointercancel',{pointerId:4}),()=>h.host.fire('lostpointercapture',{pointerId:4}),()=>h.doc.fire('scroll'),()=>h.view.fire('blur'),()=>h.release(null)]){
    h.start(handle);h.move(h.list.rows[0]);cancel();assert.equal(handle.captures.size,0);h.release(h.list.rows[0]);assert.equal(h.source.textContent,before);
  }
  const payload=new Proxy({}, {get(){assert.fail('External drag data was read.');}});for(const type of ['dragstart','dragover','drop'])h.host.fire(type,{dataTransfer:payload});assert.equal(h.source.textContent,before);disposeCodingWorkbench(h.root);
});
test('same-case rerenders keep only validated blocks; route disposal and a different case clear the draft and listeners',()=>{
  const h=fixture();h.change(0,'operator','*');const source=h.source.textContent,count=h.doc.listenerCount+h.host.listenerCount+h.view.listenerCount;
  let next=mountCodingWorkbench(h.root,h.options);assert.equal(h.source.textContent,source);assert.equal(h.doc.listenerCount+h.host.listenerCount+h.view.listenerCount,count);
  next=mountCodingWorkbench(h.root,{...h.options,language:'python'});assert.ok(h.source.textContent.startsWith('total = quantity * 3'));
  const handle=h.palette('bshow-input');h.start(handle);disposeCodingWorkbench(h.root);assert.equal(handle.captures.size,0);assert.equal(h.doc.listenerCount+h.host.listenerCount+h.view.listenerCount,0);
  next=mountCodingWorkbench(h.root,h.options);assert.ok(h.source.textContent.startsWith('let total = quantity + 3'));next.dispose();
  next=mountCodingWorkbench(h.root,{...h.options,id:'CODE-502',config:codingBlockContract('CODE-502')});assert.ok(h.source.textContent.startsWith('if (temperature > 20)'));disposeCodingWorkbench(h.root);
});
test('section/report gesture cancellation and backgrounding retain the program while releasing a held block',()=>{
  const h=fixture();h.change(0,'operator','*');const before=h.source.textContent,program=h.controller.snapshot(),handle=h.palette('bshow-input');
  for(const cancel of [()=>cancelCodingWorkbench(h.root),()=>{h.doc.hidden=true;h.doc.fire('visibilitychange');h.doc.hidden=false;}]){
    h.start(handle);h.move(h.list.rows[0]);assert.equal(handle.captures.has(4),true);cancel();
    assert.equal(handle.captures.size,0);assert.equal(h.list['data-drop-position'],undefined);h.release(h.list.rows[0]);
    assert.equal(h.source.textContent,before);assert.deepEqual(h.controller.snapshot(),program);
  }
  disposeCodingWorkbench(h.root);
});
test('source generation and the workshop use no network, persistence, host execution or case-content import',async()=>{
  const descriptors=new Map();for(const name of ['fetch','XMLHttpRequest','WebSocket','Worker','Function','eval','localStorage','sessionStorage','indexedDB','navigator']){descriptors.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,get(){assert.fail(name+' used');}});}
  try{const h=fixture();h.change(0,'operator','*');h.click('preview');h.click('use');disposeCodingWorkbench(h.root);}finally{for(const [name,value] of descriptors){if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}}
  const source=await readFile(new URL('../src/coding-workbench.js',import.meta.url),'utf8');assert.doesNotMatch(source,/^import\b/mu);assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|Worker|Function|eval|localStorage|sessionStorage|indexedDB)\s*(?:\.|\()/u);
  for(const id of ids)assert.equal(source.includes(id),false,'Generic UI must not embed case identifiers or authored member programs.');
});
