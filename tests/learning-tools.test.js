import test from 'node:test';
import assert from 'node:assert/strict';
import {learningRoute,mountLabLearning} from '../src/learning-tools.js';
import {SCENARIOS} from '../src/scenarios.js';
import {normalizeLabRecord} from '../src/records.js';

test('routes accept reviewed mode and sequence values while ignoring unrelated query information',()=>{
  assert.deepEqual(learningRoute(''),{page:'home',id:undefined,mode:'guided',sequence:null});
  assert.deepEqual(learningRoute('#labs'),{page:'labs',id:undefined,mode:'guided',sequence:null});
  for(const mode of ['guided','independent','challenge']) {
    const route=learningRoute(`#lab/INC-101?mode=${mode}&sequence=opening-day&email=fictional%40example.test&studentId=private-marker`);
    assert.deepEqual(route,{page:'lab',id:'INC-101',mode,sequence:'opening-day'});
    assert.doesNotMatch(JSON.stringify(route),/email|studentId|private-marker|example/);
  }
  for(const value of ['unknown','javascript:alert(1)','challenge&student=marker','<script>','CHALLENGE']) {
    const route=learningRoute('#lab/INC-101?mode='+encodeURIComponent(value)+'&sequence='+encodeURIComponent(value));
    assert.equal(route.mode,'guided');
    assert.equal(route.sequence,null);
  }
  assert.equal(learningRoute('#lab/INC-107?mode=challenge&sequence=elsewhere').id,'INC-107');
  assert.equal(learningRoute('#lab/INC-101?mode=challenge&mode=unknown').mode,'challenge');
});

// A small view boundary: only the controls this controller owns are remountable.
// Separate student editor/question/note elements must survive mode changes.
function viewFixture(t) {
  const nodes=new Map(),classes=new Set(),documentListeners=new Map(),urls=[];
  function node(key) {
    if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',dataset:{},hidden:false,children:[],listeners:new Map(),
      addEventListener(event,handler){this.listeners.set(event,handler);},removeEventListener(event,handler){if(this.listeners.get(event)===handler)this.listeners.delete(event);},
      replaceChildren(...children){this.children=[...children];},append(...children){this.children.push(...children);},focus(){}});
    return nodes.get(key);
  }
  const inputs=['predict','changed','observed','explain'].map(part=>{const input=node('experiment-'+part);input.dataset.experimentField=part;return input;});
  const host=node('#experiment-tools');
  host.querySelector=selector=>node('host:'+selector);
  host.querySelectorAll=selector=>selector==='[data-experiment-field]'?inputs:[];
  node('.lab-shell').classList={toggle(name,enabled){if(enabled)classes.add(name);else classes.delete(name);}};
  const root={querySelector:node};
  Object.defineProperty(root,'innerHTML',{set(){assert.fail('Switching support must not remount the student workspace.');}});
  const globals={document:{createElement:tag=>node('created-'+tag+'-'+nodes.size),addEventListener:(event,handler)=>documentListeners.set(event,handler),removeEventListener:(event,handler)=>{if(documentListeners.get(event)===handler)documentListeners.delete(event);}},history:{replaceState:(_state,_title,url)=>urls.push(url)}};
  for(const [key,value] of Object.entries(globals)) {
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
    t.after(()=>{if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  }
  return {root,node,classes,inputs,documentListeners,urls};
}

test('support mode changes preserve unsaved questions, code, notes, and the experiment draft',t=>{
  const view=viewFixture(t),scenario=SCENARIOS.find(item=>item.id==='CODE-503'),record=normalizeLabRecord(scenario);
  let saves=0,tests=0;
  const dispose=mountLabLearning(view.root,{scenario,record,mode:'guided',sequence:'opening-day',onSave:()=>saves++,onTest:()=>{tests++;return true;}});
  const drafts={'#student-question':'How can I check that boundary?','#coding-editor':'let station = 2; print(station);','#notes':'Unsubmitted observation stays here.'};
  for(const [selector,value] of Object.entries(drafts))view.node(selector).value=value;
  const prediction=view.inputs.find(input=>input.dataset.experimentField==='predict');
  prediction.value='I predict a different first counter will change the first line.';
  prediction.listeners.get('input')();
  const before=structuredClone(record),saved=saves;
  for(const mode of ['independent','challenge','guided']) {
    const select=view.node('#learning-mode');select.value=mode;select.listeners.get('change')();
    assert.deepEqual(record,before,'Choosing support changes presentation, not current lab work.');
    for(const [selector,value] of Object.entries(drafts))assert.equal(view.node(selector).value,value);
    assert.equal(prediction.value,'I predict a different first counter will change the first line.');
    assert.deepEqual([...view.classes],['mode-'+mode]);
    assert.notEqual(view.node('.intake-questions').open,true,'Choosing a support level must not force optional starters open.');
    assert.equal(view.urls.at(-1),`#lab/CODE-503?mode=${mode}&sequence=opening-day`);
  }
  assert.equal(saves,saved,'A mode selection must not save or submit an unsubmitted editor draft.');
  assert.equal(tests,0);
  assert.equal(view.node('#learning-transfer').hidden,true);
  dispose();
  assert.equal(view.node('#learning-mode').listeners.size,0);
  assert.equal(view.documentListeners.size,0);
  assert.ok(view.inputs.every(input=>input.listeners.size===0));
});

test('invalid support values fall back to guided and transfer links contain only public assignment settings',t=>{
  const view=viewFixture(t),scenario=SCENARIOS.find(item=>item.id==='INC-101'),record=normalizeLabRecord(scenario);
  const dispose=mountLabLearning(view.root,{scenario,record,mode:'unknown',onSave(){},onTest:()=>false});
  assert.equal(view.node('#learning-mode').value,'guided');
  const transfer=view.node('#learning-transfer');
  assert.equal(transfer.hidden,false);
  assert.equal(transfer.children.find(child=>child.href)?.href,'#lab/INC-107?mode=challenge');
  const select=view.node('#learning-mode');select.value='challenge&email=fictional@example.test';select.listeners.get('change')();
  assert.equal(select.value,'guided');
  assert.equal(view.urls.at(-1),'#lab/INC-101?mode=guided');
  assert.doesNotMatch(view.urls.join(' '),/email|example|student|token/);
  dispose();
});
