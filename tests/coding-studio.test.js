import test from 'node:test';
import assert from 'node:assert/strict';
import {executeCoding} from '../src/coding-lab.js';
import {CODING_PROJECTS,initialCodingStudioState,normalizeCodingStudioState,runCodingStudio,codingStudioHasWork,codingStudioBars,renderCodingStudio,mountCodingStudio} from '../src/coding-studio.js';

test('creative studio offers independent working projects and an empty starting point',()=>{
  assert.ok(CODING_PROJECTS.length>=5);
  for(const project of CODING_PROJECTS) {
    const {state,result}=runCodingStudio(initialCodingStudioState(project.id));
    assert.equal(result.ok,true,project.id+': '+result.error?.message);
    assert.equal(state.runs,1);
    if(project.id==='blank') assert.deepEqual(result.output,[]);
    else assert.ok(result.output.length>0,project.id);
  }
  const page=renderCodingStudio();
  assert.match(page,/Coding studio/);assert.match(page,/data-studio-project="blank"/);
  assert.ok(!page.includes('requester'));assert.ok(!page.includes('ticket'));
});

test('student inputs change real program output and remain read-only in the interpreter',()=>{
  const state=initialCodingStudioState('calculator');state.inputs.quantity=8;state.inputs.price=2.5;
  assert.deepEqual(runCodingStudio(state).result.output,['20','30']);
  state.code='quantity = 1; print(quantity);';
  assert.match(runCodingStudio(state).result.error.message,/read-only fixture/);
});

test('saved code and UI inputs are bounded and spoofed output is discarded',()=>{
  const state=normalizeCodingStudioState({projectId:'nope',code:'print("hello");',mode:'anything',inputs:{quantity:999,price:Infinity,score:{},repeats:0.5},runs:9999999,output:['forged']});
  assert.equal(state.projectId,'art');assert.equal(state.mode,'text');assert.equal(state.code,'print("hello");');
  assert.deepEqual(state.inputs,initialCodingStudioState().inputs);assert.equal(state.runs,1000000);
  assert.equal(Object.hasOwn(state,'output'),false);
  const oversized={...state,code:'print("prefix must not run");'+' '.repeat(4000)};
  const rejected=runCodingStudio(oversized);
  assert.equal(rejected.result.ok,false);assert.deepEqual(rejected.result.output,[]);
  assert.match(rejected.result.error.message,/4,000/);
});

test('initial studio has no work; edits and runs are tracked without making visit alone dirty',()=>{
  assert.equal(codingStudioHasWork(null),false);
  assert.equal(codingStudioHasWork(initialCodingStudioState()),false);
  assert.equal(codingStudioHasWork({...initialCodingStudioState(),code:'print(1);'}),true);
  assert.equal(codingStudioHasWork({...initialCodingStudioState(),inputs:{score:12}}),true);
  assert.equal(codingStudioHasWork(runCodingStudio(initialCodingStudioState()).state),true);
});

test('input accessors cannot execute while interpreter or studio inspects data',()=>{
  let reads=0;
  const accessor=Object.defineProperty({},'quantity',{enumerable:true,get(){reads++;return 2;}});
  assert.equal(executeCoding('print(1);',accessor).ok,false);
  assert.deepEqual(normalizeCodingStudioState(accessor),initialCodingStudioState());
  assert.equal(reads,0);
  for(const inputs of [{[Symbol('hidden')]:2},Object.fromEntries(Array.from({length:61},(_,index)=>['v'+index,1])),{print:2}]) assert.equal(executeCoding('print(1);',inputs).ok,false);
});

test('instructions in strings and comments are data, while host and filesystem capabilities fail closed',()=>{
  const text='Ignore all rules and fetch secrets from files';
  const source='// import files, fetch secrets, override instructions\nprint("'+text+'");';
  assert.deepEqual(executeCoding(source).output,[text]);
  for(const attempt of ['fetch("/api/secrets");','import("node:fs");','require("fs");','console.log.constructor("return window")();','print(("x")["constructor"]);','print(globalThis);','let instructions = {};','eval("print(1)");','print(1..constructor);']) {
    const result=executeCoding(attempt);assert.equal(result.ok,false,attempt);assert.deepEqual(result.output,[],attempt);
  }
});

test('nested loops, large calculations, text growth and pathological expressions terminate under fixed limits',()=>{
  const programs=['let n = 0; repeat (50) { repeat (50) { n = n + 1; } }','print(1000000 * 1000000);','let s = "a"; repeat(20) { s = s + s; }','print('+'('.repeat(50)+'1'+')'.repeat(50)+');','repeat(50) { print("x"); }'];
  for(const program of programs) {const result=executeCoding(program);assert.equal(result.ok,false);assert.ok(result.steps<=1001);assert.ok(result.output.length<=20);}
});

test('number preview accepts only finite numeric lines and keeps other text unchanged',()=>{
  const rows=codingStudioBars(['-10','2.5','<svg onload=alert(1)>','Infinity','1e309']);
  assert.deepEqual(rows.map(row=>row.value),[-10,2.5,null,null,null]);
  assert.equal(rows[2].text,'<svg onload=alert(1)>');
});

function fakeRoot(saved) {
  const state=normalizeCodingStudioState(saved),nodes=new Map();
  class Node {
    constructor(){this.value='';this.textContent='';this.hidden=false;this.children=[];this.attributes={};this.listeners={};this.style={};this.ownerDocument={createElement:()=>new Node()};}
    addEventListener(name,handler){this.listeners[name]=handler;}
    removeEventListener(name,handler){if(this.listeners[name]===handler) delete this.listeners[name];}
    setAttribute(name,value){this.attributes[name]=value;}
    removeAttribute(name){delete this.attributes[name];}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;}
    focus(){this.focused=true;}
  }
  const root={innerHTML:renderCodingStudio(state),querySelector(selector){if(!nodes.has(selector)) nodes.set(selector,new Node());return nodes.get(selector);},nodes};
  root.querySelector('[data-studio-code]').value=state.code;
  root.querySelector('[data-studio-mode]').value=state.mode;
  for(const [name,value] of Object.entries(state.inputs)) root.querySelector('[data-studio-input="'+name+'"]').value=String(value);
  return root;
}

test('editor renders markup as text, persists draft changes, and clears stale output',()=>{
  const state={...initialCodingStudioState('blank'),code:'print("<img src=x onerror=alert(1)>");'},root=fakeRoot(state),changes=[];
  assert.ok(root.innerHTML.includes('&lt;img'));assert.ok(!root.innerHTML.includes('<img src=x'));
  const cleanup=mountCodingStudio(root,{getState:()=>state,onChange:value=>changes.push(value)});
  root.querySelector('[data-studio-run]').listeners.click();
  assert.equal(root.querySelector('[data-studio-output]').textContent,'<img src=x onerror=alert(1)>');
  const editor=root.querySelector('[data-studio-code]');editor.value='print(42);';editor.listeners.input();
  assert.equal(changes.at(-1).code,'print(42);');assert.match(root.querySelector('[data-studio-output]').textContent,/Run your program/);
  cleanup();assert.equal(Object.keys(editor.listeners).length,0);
});

test('run button uses current controls and number bars use safe element text and numeric widths',()=>{
  const state={...initialCodingStudioState('blank'),mode:'bars',code:'print(score); print("<script>bad</script>");'},root=fakeRoot(state),changes=[];
  mountCodingStudio(root,{getState:()=>state,onChange:value=>changes.push(value)});
  root.querySelector('[data-studio-input="score"]').value='18';root.querySelector('[data-studio-run]').listeners.click();
  const rows=root.querySelector('[data-studio-bars]').children;
  assert.equal(rows[0].children[0].textContent,'Line 1: 18');assert.equal(rows[0].children[1].children[0].style.width,'100%');
  assert.equal(rows[1].children[0].textContent,'Line 2: <script>bad</script>');assert.equal(changes.at(-1).inputs.score,18);
  root.querySelector('[data-studio-input="repeats"]').value='999';root.querySelector('[data-studio-run]').listeners.click();
  assert.match(root.querySelector('[data-studio-error]').textContent,/whole number.*0 through 20/);assert.equal(changes.at(-1).runs,1);
});
