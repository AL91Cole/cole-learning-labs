import test from 'node:test';
import assert from 'node:assert/strict';
import {setMaxListeners} from 'node:events';
import {SANDBOX_STARTERS,codingSandboxSnippet,runCodingSandbox,renderCodingSandbox,mountCodingSandbox,clearCodingSandboxWork} from '../src/coding-sandbox.js';

const decode=value=>value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
function mount(starterId='blank'){
  clearCodingSandboxWork();
  const nodes=new Map(),root={html:renderCodingSandbox({starterId}),querySelector(selector){
    if(!nodes.has(selector)){
      const listeners=new Map(),attributes=new Map();let markup='',text='';
      const value=selector==='[data-sandbox-editor]'?decode(/<textarea[^>]*>([\s\S]*?)<\/textarea>/.exec(root.html)?.[1]||''):selector==='[data-sandbox-input]'?/data-sandbox-input[^>]*value="([^"]*)"/.exec(root.html)?.[1]||'':'';
      nodes.set(selector,{value,attributes,listeners,get innerHTML(){return markup;},set innerHTML(value){markup=value;text='';},get textContent(){return text;},set textContent(value){text=value;markup='';},addEventListener(event,handler,{signal}={}){listeners.set(event,handler);if(signal)setMaxListeners(0,signal);signal?.addEventListener('abort',()=>listeners.delete(event),{once:true});},setAttribute(name,value){attributes.set(name,value);},removeAttribute(name){attributes.delete(name);},focus(){},emit(event,detail={}){return listeners.get(event)?.({preventDefault(){},...detail});}});
    }
    return nodes.get(selector);
  },get innerHTML(){return this.html;},set innerHTML(value){this.html=value;nodes.clear();}};
  const dispose=mountCodingSandbox(root,{starterId});return {root,node:selector=>root.querySelector(selector),dispose};
}

test('project starters produce real numeric results and bounded tile rows in both languages',()=>{
  assert.equal(SANDBOX_STARTERS.length,5);assert.equal(SANDBOX_STARTERS[0].id,'blank');
  for(const starter of SANDBOX_STARTERS.filter(starter=>starter.id!=='blank'))for(const language of ['javascript','python']){
    const result=runCodingSandbox(starter[language],String(starter.input),language);assert.equal(result.ok,true,starter.id+' '+language);
    if(starter.id==='tiles')assert.ok(result.output.every(line=>/^[0-9](?: [0-9]){4}$/.test(line)),JSON.stringify(result.output));
    else assert.ok(result.output.some(line=>/^\d+$/.test(line)),starter.id);
  }
  const html=renderCodingSandbox({starterId:'tiles'});assert.match(html,/data-sandbox-visual/);assert.match(html,/<details class="code-reference"><summary>Help &amp; limits<\/summary>|<details class="code-reference"><summary>Help & limits<\/summary>/);assert.doesNotMatch(html,/<details class="code-reference" open/);clearCodingSandboxWork();
});

test('language-aware code chips append supported instructions with independent loop names',()=>{
  for(const language of ['javascript','python'])for(const kind of ['print','decision','loop']){
    const snippet=codingSandboxSnippet(kind,language);assert.equal(runCodingSandbox(snippet,'75',language).ok,true,language+' '+kind);
  }
  for(const language of ['javascript','python']){
    const first=codingSandboxSnippet('loop',language),second=codingSandboxSnippet('loop',language,first);
    assert.notEqual(first,second);assert.equal(runCodingSandbox(first+'\n'+second,'1',language).ok,true);
  }
  assert.equal(codingSandboxSnippet('unknown','javascript'),'');assert.equal(codingSandboxSnippet('print','html'),'');assert.equal(codingSandboxSnippet('loop','python','x'.repeat(4001)),'');
});
test('a changed input clears visuals and only an explicit run creates a new result',()=>{
  const {node,dispose}=mount('pixel-pet');
  node('[data-sandbox-form]').emit('submit');assert.equal(node('[data-sandbox-output]').textContent,'8');assert.ok(node('[data-sandbox-preview]').innerHTML);
  node('[data-sandbox-range]').value='7';node('[data-sandbox-range]').emit('input');
  assert.equal(node('[data-sandbox-input]').value,'7');assert.equal(node('[data-sandbox-preview]').innerHTML,'');assert.match(node('[data-sandbox-preview]').textContent,/Run program again/);assert.doesNotMatch(node('[data-sandbox-output]').textContent,/^8$/);
  node('[data-sandbox-visual]').emit('change',{target:{value:'tiles'}});assert.equal(node('[data-sandbox-preview]').innerHTML,'');
  node('[data-sandbox-form]').emit('submit');assert.equal(node('[data-sandbox-output]').textContent,'28');assert.ok(node('[data-sandbox-preview]').innerHTML);
  node('[data-sandbox-input]').value='0';node('[data-sandbox-input]').emit('input');assert.equal(node('[data-sandbox-range]').value,'0');assert.equal(node('[data-sandbox-preview]').innerHTML,'');dispose();clearCodingSandboxWork();
});

test('project visual output stays escaped and a mode change cannot run code',()=>{
  const {node,dispose}=mount();
  node('[data-sandbox-editor]').value='console.log("<img src=x onerror=alert(1)>");';node('[data-sandbox-form]').emit('submit');
  assert.equal(node('[data-sandbox-output]').textContent,'<img src=x onerror=alert(1)>');assert.doesNotMatch(node('[data-sandbox-preview]').innerHTML,/<img\b/i);
  node('[data-sandbox-editor]').value='fetch("x");';node('[data-sandbox-editor]').emit('input');node('[data-sandbox-visual]').emit('change',{target:{value:'bars'}});
  assert.equal(node('[data-sandbox-preview]').innerHTML,'');assert.equal(node('[data-sandbox-code-error]').textContent,'');assert.match(node('[data-sandbox-status]').textContent,/changed/);
  node('[data-sandbox-form]').emit('submit');assert.match(node('[data-sandbox-code-error]').textContent,/Line 1:/);assert.doesNotMatch(node('[data-sandbox-preview]').innerHTML,/<img\b/i);dispose();clearCodingSandboxWork();
});

test('chips respect the source bound, mark edits stale, and release every new control',()=>{
  const {node,dispose}=mount();const chip=node('[data-sandbox-insert="print"]');
  chip.emit('click');assert.equal(node('[data-sandbox-editor]').value,'console.log(input);');
  node('[data-sandbox-form]').emit('submit');assert.equal(node('[data-sandbox-output]').textContent,'10');
  node('[data-sandbox-insert="loop"]').emit('click');assert.match(node('[data-sandbox-status]').textContent,/changed/);assert.equal(node('[data-sandbox-preview]').innerHTML,'');
  node('[data-sandbox-editor]').value='x'.repeat(4000);chip.emit('click');assert.equal(node('[data-sandbox-editor]').value.length,4000);assert.match(node('[data-sandbox-status]').textContent,/4,000 characters/);
  const range=node('[data-sandbox-range]'),mode=node('[data-sandbox-visual]');dispose();assert.equal(chip.listeners.size,0);assert.equal(range.listeners.size,0);assert.equal(mode.listeners.size,0);clearCodingSandboxWork();
});

test('pixel projects use the digit range while number projects retain a wider slider',()=>{
  clearCodingSandboxWork();
  assert.match(renderCodingSandbox({starterId:'tiles'}),/data-sandbox-range min="0" max="9"/);
  assert.match(renderCodingSandbox({starterId:'arcade'}),/data-sandbox-range min="0" max="100"/);
  assert.match(renderCodingSandbox({starterId:'tiles'}),/0 is empty; 9 is filled/);
});
