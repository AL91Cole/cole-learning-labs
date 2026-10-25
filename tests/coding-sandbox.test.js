import test from 'node:test';
import assert from 'node:assert/strict';
import {setMaxListeners} from 'node:events';
import {SANDBOX_STARTERS,runCodingSandbox,renderCodingSandbox,mountCodingSandbox,hasCodingSandboxWork,clearCodingSandboxWork} from '../src/coding-sandbox.js';

test('free coding accepts learner programs and all examples in both languages with changing input',()=>{
  assert.deepEqual(runCodingSandbox('let score = input * 7; console.log("My score: " + score);','3').output,['My score: 21']);
  assert.deepEqual(runCodingSandbox('score = input * 7\nprint("My score:", score)','3','python').output,['My score: 21']);
  assert.deepEqual(runCodingSandbox('print(input)','-2.5','python').output,['-2.5']);
  assert.equal(runCodingSandbox('', '0').ok,true);
  for(const starter of SANDBOX_STARTERS)for(const language of ['javascript','python'])assert.equal(runCodingSandbox(starter[language],String(starter.input),language).ok,true,starter.id+' '+language);
});

test('sandbox inputs remain finite bounded primitives and code cannot overwrite the supplied number',()=>{
  for(const input of ['', ' ', 'NaN', 'Infinity', '1e1000', '-1000001', '1000001', '0x20', '{}', '1; fetch("x")', '0'.repeat(33), null, {}, 2]){
    const result=runCodingSandbox('print(input);',input);assert.equal(result.ok,false,JSON.stringify(input));assert.equal(result.error.field,'input');assert.deepEqual(result.output,[]);
  }
  for(const [code,language] of [['let input = 4;','javascript'],['input = 4','python']])assert.match(runCodingSandbox(code,'4',language).error.message,/read-only fixture/);
});

test('free code cannot call ambient capabilities or escape the supported language',()=>{
  const js=['fetch("https://example.test");','eval("1");','Function("return 1");','print.constructor("return process")();','import("x");','window.location = "x";','document.body.innerHTML = "x";','globalThis.probe = 1;','new Worker("x");','process.exit();','console["log"](1);','let x = {a:1};','let x = [1];','while (true) {}'];
  const py=['import os','from os import system','__import__("os")','open("private.txt")','exec("print(1)")','eval("1")','print(globals())','print((1).__class__)','def go():\n    print(1)','while True:\n    print(1)'];
  for(const [language,sources] of [['javascript',js],['python',py]])for(const source of sources){const result=runCodingSandbox(source,'3',language);assert.equal(result.ok,false,source);assert.deepEqual(result.output,[],source);}
  assert.equal(runCodingSandbox('print(input);','3','javascript:eval').ok,false);
});

test('free code retains source token nesting output loop and execution budgets',()=>{
  const attempts=[[' '.repeat(4001),/4,000/],[';'.repeat(1001),/tokens/],['print('+'('.repeat(30)+'1'+')'.repeat(30)+');',/nested too deeply/],['for (let n = 0; n < 51; n++) {}',/50 times/],['let n = 0; repeat(50) { repeat(50) { n = n + 1; } }',/1,000-step/],['print("'+'x'.repeat(301)+'");',/300/],['print(1000000 * 2);',/1,000,000/]];
  for(const [source,message] of attempts){const result=runCodingSandbox(source,'3');assert.equal(result.ok,false);assert.match(result.error.message,message);assert.ok(result.steps<=1001);}
  const output=runCodingSandbox('repeat(21) { print(1); }','3');assert.equal(output.output.length,20);assert.match(output.error.message,/20 lines/);
  assert.equal(runCodingSandbox('for n in range(1000000):\n    print(n)','3','python').ok,false);
});

const decode=value=>value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
function rootFixture(html){
  const nodes=new Map();
  const root={html,nodes,get innerHTML(){return this.html;},set innerHTML(value){this.html=value;nodes.clear();},querySelector(selector){
    if(!nodes.has(selector)){
      const value=selector==='[data-sandbox-editor]'?decode(/<textarea[^>]*>([\s\S]*?)<\/textarea>/.exec(root.html)?.[1]||''):selector==='[data-sandbox-input]'?decode(/data-sandbox-input[^>]*value="([^"]*)"/.exec(root.html)?.[1]||''):'';
      const listeners=new Map();
      nodes.set(selector,{value,textContent:'',attributes:new Map(),listeners,addEventListener(event,handler,{signal}={}){listeners.set(event,handler);if(signal)setMaxListeners(0,signal);signal?.addEventListener('abort',()=>listeners.delete(event),{once:true});},setAttribute(name,value){this.attributes.set(name,value);},removeAttribute(name){this.attributes.delete(name);},focus(){},select(){},emit(event,detail={}){return listeners.get(event)?.({preventDefault(){},...detail});}});
    }
    return nodes.get(selector);
  }};return root;
}
function mount(starterId){const root=rootFixture(renderCodingSandbox({starterId}));return {root,dispose:mountCodingSandbox(root,{starterId}),node:selector=>root.querySelector(selector)};}

test('sandbox source and hostile output remain text and errors identify the relevant field',()=>{
  clearCodingSandboxWork();const {root,node,dispose}=mount('blank');
  node('[data-sandbox-editor]').value='console.log("</textarea><img src=x onerror=alert(1)>");';
  node('[data-sandbox-editor]').emit('input');node('[data-sandbox-form]').emit('submit');
  assert.equal(node('[data-sandbox-output]').textContent,'</textarea><img src=x onerror=alert(1)>');
  assert.match(renderCodingSandbox(),/&lt;\/textarea&gt;&lt;img/);assert.doesNotMatch(renderCodingSandbox(),/<img src=x/);
  node('[data-sandbox-editor]').value='fetch("x");';node('[data-sandbox-form]').emit('submit');
  assert.match(node('[data-sandbox-code-error]').textContent,/Line 1:/);assert.equal(node('[data-sandbox-editor]').attributes.get('aria-invalid'),'true');
  node('[data-sandbox-input]').value='';node('[data-sandbox-form]').emit('submit');
  assert.match(node('[data-sandbox-input-error]').textContent,/Enter a number/);assert.equal(node('[data-sandbox-code-error]').textContent,'');
  assert.match(root.innerHTML,/maxlength="4000"/);dispose();clearCodingSandboxWork();
});

test('language drafts survive navigation and repeated switching has one current disposer',()=>{
  clearCodingSandboxWork();assert.equal(hasCodingSandboxWork(),false);const {node,dispose}=mount('pixel-pet');
  node('[data-sandbox-editor]').value='console.log("My pet");';node('[data-sandbox-editor]').emit('input');assert.equal(hasCodingSandboxWork(),true);
  for(let i=0;i<100;i++)node('[data-sandbox-language]').emit('change',{target:{value:i%2?'javascript':'python'}});
  assert.equal(node('[data-sandbox-editor]').value,'console.log("My pet");');
  const active=node('[data-sandbox-form]');dispose();assert.equal(active.listeners.size,0);
  const next=mount('pixel-pet');assert.equal(next.node('[data-sandbox-editor]').value,'console.log("My pet");');
  clearCodingSandboxWork();next.dispose();assert.equal(hasCodingSandboxWork(),false);assert.doesNotMatch(renderCodingSandbox({starterId:'pixel-pet'}),/My pet/);clearCodingSandboxWork();
});

test('edits mark previous output stale and the next run uses current code and input',()=>{
  clearCodingSandboxWork();const {node,dispose}=mount('blank');
  node('[data-sandbox-editor]').value='print(input);';node('[data-sandbox-input]').value='2';node('[data-sandbox-form]').emit('submit');
  assert.equal(node('[data-sandbox-output]').textContent,'2');node('[data-sandbox-input]').value='3';node('[data-sandbox-input]').emit('input');
  assert.match(node('[data-sandbox-status]').textContent,/changed.*again/);node('[data-sandbox-form]').emit('submit');assert.equal(node('[data-sandbox-output]').textContent,'3');
  node('[data-sandbox-blank]').emit('click');assert.equal(node('[data-sandbox-editor]').value,'');dispose();clearCodingSandboxWork();
});

test('copy and download export only current source as a static named text artifact',async t=>{
  clearCodingSandboxWork();const {root,node,dispose}=mount('blank'),source='console.log("<script> & café");';node('[data-sandbox-editor]').value=source;
  let copied='',blob;const original=Object.getOwnPropertyDescriptor(globalThis.navigator,'clipboard');
  Object.defineProperty(globalThis.navigator,'clipboard',{configurable:true,value:{writeText:async value=>{copied=value;}}});
  t.after(()=>{if(original)Object.defineProperty(globalThis.navigator,'clipboard',original);else delete globalThis.navigator.clipboard;});
  t.mock.method(URL,'createObjectURL',value=>{blob=value;return 'blob:local-sandbox';});
  let link;root.ownerDocument={createElement(){return link={click(){this.clicked=true;},remove(){this.removed=true;}};}};root.append=()=>{};
  await node('[data-sandbox-copy]').emit('click');assert.equal(copied,source);assert.equal(node('[data-sandbox-transfer-status]').textContent,'Code copied.');
  node('[data-sandbox-download]').emit('click');assert.equal(await blob.text(),source);assert.equal(blob.type,'text/plain;charset=utf-8');
  assert.equal(link.download,'cole-learning-labs-sandbox-javascript.txt');assert.equal(link.clicked,true);assert.equal(link.removed,true);
  assert.match(node('[data-sandbox-transfer-status]').textContent,/Download requested/);dispose();clearCodingSandboxWork();
});
