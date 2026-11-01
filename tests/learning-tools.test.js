import test from 'node:test';
import assert from 'node:assert/strict';
import {learningRoute,labPageHash,mountLabLearning} from '../src/learning-tools.js';
import {SCENARIOS} from '../src/scenarios.js';
import {normalizeLabRecord,workbenchProgress} from '../src/records.js';
import {applyHardwareAction,verifyHardware} from '../src/hardware.js';
import {readExperiments,observationSnapshot} from '../src/experiments.js';
import {learningModes} from '../src/teaching.js';

test('routes accept reviewed mode and sequence values while ignoring unrelated query information',()=>{
  assert.deepEqual(learningRoute(''),{page:'home',id:undefined,mode:'guided',sequence:null});
  assert.deepEqual(learningRoute('#labs'),{page:'labs',id:undefined,mode:'guided',sequence:null});
  for(const mode of ['guided','independent','challenge']) {
    const route=learningRoute(`#lab/INC-101?mode=${mode}&sequence=opening-day&email=fictional%40example.test&studentId=private-marker`);
    assert.deepEqual(route,{page:'lab',id:'INC-101',section:1,mode,sequence:'opening-day'});
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

test('elementary routes retain only fixed grade-band choices and reject extra path components',()=>{
  for(const [code,band]of [['k1','K–1'],['2-3','2–3'],['4-6','4–6']]){
    assert.deepEqual(learningRoute('#explore?band='+code+'&student=PRIVATE_MARKER'),{page:'explore',id:undefined,mode:'guided',sequence:null,band});
  }
  assert.deepEqual(learningRoute('#explore/EX-HW-1'),{page:'explore',id:'EX-HW-1',mode:'guided',sequence:null});
  for(const value of ['unknown','K–1','__proto__','PRIVATE_MARKER'])assert.equal(learningRoute('#explore?band='+encodeURIComponent(value)).band,undefined);
  for(const hash of ['#explore/EX-HW-1/extra','#explore/EX-HW-1/','#explore//EX-HW-1','#explore/EX-HW-1/extra/more'])assert.equal(learningRoute(hash).page,'unknown');
});


test('all investigation pages deep-link with reviewed support and sequence settings',()=>{
  for(const scenario of SCENARIOS)for(const [index,step] of ['request','workbench','explain'].entries()) {
    const hash=`#lab/${scenario.id}/${step}?mode=independent&sequence=opening-day&student=private-marker`;
    assert.deepEqual(learningRoute(hash),{page:'lab',id:scenario.id,section:index+1,mode:'independent',sequence:'opening-day'});
    assert.equal(labPageHash(scenario.id,index+1,{mode:'independent',sequence:'opening-day'}),hash.replace('&student=private-marker',''));
  }
  for(const step of ['', '/unknown','/0','/4','/1.5','/WORKBENCH','/%3Cscript%3E','/__proto__','/constructor','/toString']) {
    assert.equal(learningRoute('#lab/INC-101'+step+'?mode=challenge').section,1,'Legacy and invalid step routes open Request & clues: '+step);
  }
  assert.equal(learningRoute('#learn/hardware').section,undefined,'Beginner pathways retain their own Explore/Practice/Check navigation.');
});

test('lab page links normalize invalid steps and discard unreviewed assignment settings',()=>{
  for(const section of [undefined,0,4,1.5,NaN,'workbench']) {
    assert.equal(labPageHash('INC-101',section,{mode:'unknown',sequence:'private-marker'}),'#lab/INC-101/request?mode=guided');
  }
  assert.equal(labPageHash('INC-101',2,{mode:'challenge',sequence:'opening-day'}),'#lab/INC-101/workbench?mode=challenge&sequence=opening-day');
});

// A small view boundary: only the controls this controller owns are remountable.
// Separate student editor/question/note elements must survive mode changes.
function viewFixture(t,hash='#lab/CODE-503/workbench?mode=guided&sequence=opening-day') {
  const nodes=new Map(),classes=new Set(),documentListeners=new Map(),urls=[];
  function node(key) {
    if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',dataset:{},hidden:false,children:[],listeners:new Map(),
      addEventListener(event,handler){this.listeners.set(event,handler);},removeEventListener(event,handler){if(this.listeners.get(event)===handler)this.listeners.delete(event);},
      replaceChildren(...children){this.children=[...children];},append(...children){this.children.push(...children);},focus(){}});
    return nodes.get(key);
  }
  const inputs=['predict','evidence','changed','observed','explain'].map(part=>{const input=node('experiment-'+part);input.dataset.experimentField=part;return input;});
  const host=node('#experiment-tools');
  let notebookMarkup='',notebookMounts=0;
  Object.defineProperty(host,'innerHTML',{get:()=>notebookMarkup,set(value){notebookMarkup=value;notebookMounts++;}});
  host.querySelector=selector=>{const field=/^\[data-experiment-field="([^"]+)"\]$/.exec(selector);return field?inputs.find(input=>input.dataset.experimentField===field[1]):node('host:'+selector);};
  host.querySelectorAll=selector=>selector==='[data-experiment-field]'?inputs:[];
  node('.lab-shell').dataset.section=String(learningRoute(hash).section||1);
  node('.lab-shell').classList={toggle(name,enabled){if(enabled)classes.add(name);else classes.delete(name);}};
  const root={querySelector:node};
  Object.defineProperty(root,'innerHTML',{set(){assert.fail('Switching support must not remount the student workspace.');}});
  const location={hash};

  const emit=(type,detail)=>{for(const handler of [...(documentListeners.get(type)||[])])handler({type,detail});};
  const globals={location,document:{createElement:tag=>node('created-'+tag+'-'+nodes.size),addEventListener(event,handler){if(!documentListeners.has(event))documentListeners.set(event,new Set());documentListeners.get(event).add(handler);},removeEventListener(event,handler){const handlers=documentListeners.get(event);handlers?.delete(handler);if(handlers?.size===0)documentListeners.delete(event);},dispatchEvent(event){emit(event.type,event.detail);}},history:{replaceState(_state,_title,url){urls.push(url);location.hash=url;}}};
  for(const [key,value] of Object.entries(globals)) {
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
    t.after(()=>{if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  }
  return {root,node,classes,inputs,documentListeners,urls,emit,location,get notebookMounts(){return notebookMounts;},
    input(part,value){const target=inputs.find(input=>input.dataset.experimentField===part);assert.equal(target.disabled,false,part+' must be available before typing');target.value=value;target.listeners.get('input')();},
    click(selector){node('host:'+selector).listeners.get('click')();}
  };
}

function firstIdeaRecord(scenario){
  const record=normalizeLabRecord(scenario,{plan:'I think the wall power cord and motherboard power lead are disconnected.',symptoms:'The PC has no lights or fan noise.',ideaSaved:true,evidence:scenario.clues.filter(clue=>clue.id==='power'||/24.pin|motherboard power/i.test(clue.text)).slice(0,2).map(clue=>clue.id)});
  record.state=applyHardwareAction(scenario.id,record.state,'enable-assembly').state;return record;
}

function repairPowerConnections(scenario,record){
  for(const action of ['power-off','unplug','asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel','asm-connect-atx','asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1','plug-in','boot','open-document']){
    const result=applyHardwareAction(scenario.id,record.state,action);assert.notEqual(result.kind,'warning',action+': '+result.message);record.state=result.state;
  }
}

function explainAttempt(view){
  view.input('changed','I connected the motherboard power lead safely, secured the case, connected AC and started the PC.');
  view.input('observed','The original lesson file opened in the classroom desktop.');
  view.input('explain','Restoring the power path supports my idea because the requested task now works.');
}

test('entering page two seeds the saved first idea, selected clues and original baseline once',t=>{
  const view=viewFixture(t,'#lab/INC-102/request?mode=guided'),scenario=SCENARIOS.find(item=>item.id==='INC-102'),record=firstIdeaRecord(scenario),initial=observationSnapshot(scenario,record.state);
  let saves=0;
  const dispose=mountLabLearning(view.root,{scenario,record,onSave:()=>saves++,getResult:()=>verifyHardware(scenario.id,record.state)});
  view.emit('cole:lab-section-change',{id:'INC-101',section:2});assert.equal(readExperiments(record).draft.before,undefined);
  view.emit('cole:lab-section-change',{id:scenario.id,section:2});
  const draft=readExperiments(record).draft;
  assert.equal(draft.predict,record.plan);assert.ok(draft.evidence.includes(scenario.clues[0].text));assert.deepEqual(draft.before,initial);
  assert.equal(view.inputs.find(input=>input.dataset.experimentField==='predict').value,record.plan);assert.equal(record.verified,false);
  const before=structuredClone(record),saved=saves;view.emit('cole:lab-section-change',{id:scenario.id,section:2});
  assert.deepEqual(record,before);assert.equal(saves,saved,'Returning to the workbench cannot restart an existing test.');
  view.input('predict','I want to compare another cause with the result from this test.');const revised=readExperiments(record).draft.predict;
  view.emit('cole:lab-section-change',{id:scenario.id,section:2});assert.equal(readExperiments(record).draft.predict,revised,'An unfinished new idea is never overwritten by the original one.');
  dispose();assert.equal(view.documentListeners.size,0);
});

test('a correct first idea can pass immediately, but page three waits for the three remaining notebook answers and Save',t=>{
  const view=viewFixture(t),scenario=SCENARIOS.find(item=>item.id==='INC-102'),record=firstIdeaRecord(scenario);let ready=false;
  const result=()=>verifyHardware(scenario.id,record.state);
  const dispose=mountLabLearning(view.root,{scenario,record,getResult:result,onSave:()=>{ready=workbenchProgress(scenario,record,result()).ready;}});
  view.emit('cole:lab-section-change',{id:scenario.id,section:2});const originalBefore=readExperiments(record).draft.before;
  repairPowerConnections(scenario,record);
  record.verified=result().ok;view.emit('cole:lab-test-result',{id:scenario.id,firstIdea:true});
  const captured=readExperiments(record).draft;
  assert.equal(captured.predict,record.plan);assert.deepEqual(captured.before,originalBefore);assert.notDeepEqual(captured.after,originalBefore);assert.equal(captured.check.ok,true);
  assert.equal(ready,false);assert.equal(readExperiments(record).attempts.length,0);
  explainAttempt(view);assert.equal(ready,false,'Typing does not replace selecting Save this attempt.');
  view.click('[data-experiment-save]');assert.equal(ready,true);assert.equal(readExperiments(record).attempts.length,1);assert.equal(readExperiments(record).attempts[0].predict,record.plan);
  dispose();assert.equal(view.documentListeners.size,0);
});

test('an unsuccessful first idea remains evidence while a later saved passing test unlocks page three',t=>{
  const view=viewFixture(t),scenario=SCENARIOS.find(item=>item.id==='INC-102'),record=firstIdeaRecord(scenario);let tests=0,ready=false;
  record.plan='I think reconnecting the wall power cord will let the PC start.';
  const result=()=>verifyHardware(scenario.id,record.state);
  const dispose=mountLabLearning(view.root,{scenario,record,getResult:result,onSave:()=>{ready=workbenchProgress(scenario,record,result()).ready;},onTest:()=>{tests++;record.verified=result().ok;return true;}});
  view.emit('cole:lab-section-change',{id:scenario.id,section:2});
  for(const action of ['plug-in','boot'])record.state=applyHardwareAction(scenario.id,record.state,action).state;
  view.emit('cole:lab-test-result',{id:scenario.id,firstIdea:true});
  assert.equal(readExperiments(record).draft.check.ok,false);
  view.input('changed','I connected the wall power cord and pressed the power button.');
  view.input('observed','The PC still did not start.');
  view.input('explain','AC alone did not complete the power path. Another power connection needs checking.');
  view.click('[data-experiment-save]');
  assert.equal(ready,false);assert.equal(readExperiments(record).attempts[0].check.ok,false);
  view.input('predict','I think the disconnected motherboard power lead is stopping startup.');view.input('evidence','The AC-only test failed and the internal power clue shows the 24-pin lead is disconnected.');
  view.click('[data-experiment-start]');
  repairPowerConnections(scenario,record);
  view.emit('cole:lab-state-change',{id:scenario.id,changed:true});view.click('[data-experiment-capture]');explainAttempt(view);view.click('[data-experiment-save]');
  assert.equal(tests,1);assert.equal(ready,true);assert.deepEqual(readExperiments(record).attempts.map(attempt=>attempt.check.ok),[false,true]);
  const other=()=>{};document.addEventListener('cole:lab-state-change',other);dispose();
  assert.equal(view.documentListeners.get('cole:lab-state-change').has(other),true,'Disposing this controller keeps other listeners intact.');
  document.removeEventListener('cole:lab-state-change',other);assert.equal(view.documentListeners.size,0);
});

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
    assert.equal(view.urls.at(-1),`#lab/CODE-503/workbench?mode=${mode}&sequence=opening-day`);
  }
  assert.equal(saves,saved,'A mode selection must not save or submit an unsubmitted editor draft.');
  assert.equal(tests,0);
  assert.equal(view.node('#learning-transfer').hidden,true);
  dispose();
  assert.equal(view.node('#learning-mode').listeners.size,0);
  assert.equal(view.documentListeners.size,0);
  assert.ok(view.inputs.every(input=>input.listeners.size===0));
});

test('history can restore support presentation without rewriting its URL or remounting the notebook',t=>{
  const view=viewFixture(t),scenario=SCENARIOS.find(item=>item.id==='CODE-503'),record=normalizeLabRecord(scenario);
  let saves=0,tests=0;
  const dispose=mountLabLearning(view.root,{scenario,record,mode:'guided',sequence:'opening-day',onSave:()=>saves++,onTest:()=>{tests++;return true;}});
  const question=view.node('#student-question'),editor=view.node('#coding-editor'),prediction=view.inputs[0];
  question.value='Could the first counter explain';editor.value='print("Unexecuted draft");';
  prediction.value='I predict the counter changes the first line.';prediction.listeners.get('input')();
  const before=structuredClone(record),saved=saves,notebookMounts=view.notebookMounts;
  const listeners=view.inputs.map(input=>input.listeners.get('input'));
  for(const mode of ['independent','guided','challenge','independent']) {
    const hash=`#lab/${scenario.id}/workbench?mode=${mode}&sequence=opening-day`;
    view.location.hash=hash;dispose.setMode(mode);
    assert.equal(view.node('#learning-mode').value,mode);
    assert.deepEqual([...view.classes],['mode-'+mode]);
    assert.equal(view.node('#learning-mode-description').textContent,learningModes.find(item=>item.id===mode).description);
    assert.ok(view.node('#lab-learning').innerHTML.includes('teaching-mode-'+mode),'The support content must match the historical mode.');
    assert.equal(view.location.hash,hash);assert.equal(view.urls.length,0,'Restoring history may not replace or add a URL.');
    assert.equal(view.notebookMounts,notebookMounts,'The notebook must stay mounted when support changes.');
    assert.equal(view.node('#student-question'),question);assert.equal(question.value,'Could the first counter explain');
    assert.equal(view.node('#coding-editor'),editor);assert.equal(editor.value,'print("Unexecuted draft");');
    assert.equal(prediction.value,'I predict the counter changes the first line.');
    view.inputs.forEach((input,index)=>assert.equal(input.listeners.get('input'),listeners[index]));
    assert.deepEqual(record,before);assert.equal(saves,saved);assert.equal(tests,0);
  }
  dispose.setMode('unreviewed');assert.equal(view.node('#learning-mode').value,'guided');
  dispose();
});

test('invalid support values fall back to guided and transfer links contain only public assignment settings',t=>{
  const view=viewFixture(t,'#lab/INC-101/explain?mode=guided'),scenario=SCENARIOS.find(item=>item.id==='INC-101'),record=normalizeLabRecord(scenario);
  const dispose=mountLabLearning(view.root,{scenario,record,mode:'unknown',onSave(){},onTest:()=>false});
  assert.equal(view.node('#learning-mode').value,'guided');
  const transfer=view.node('#learning-transfer');
  assert.equal(transfer.hidden,false);
  assert.equal(transfer.children.find(child=>child.href)?.href,'#lab/INC-107/request?mode=challenge');
  const select=view.node('#learning-mode');select.value='challenge&email=fictional@example.test';select.listeners.get('change')();
  assert.equal(select.value,'guided');
  assert.equal(view.urls.at(-1),'#lab/INC-101/explain?mode=guided');
  assert.doesNotMatch(view.urls.join(' '),/email|example|student|token/);
  dispose();
});


test('support changes retain whichever investigation page is currently visible',t=>{
  const view=viewFixture(t),scenario=SCENARIOS.find(item=>item.id==='CODE-503'),record=normalizeLabRecord(scenario);
  const dispose=mountLabLearning(view.root,{scenario,record,mode:'guided',sequence:'opening-day',onSave(){},onTest:()=>false});
  for(const [index,step] of ['request','workbench','explain'].entries()) {
    view.node('.lab-shell').dataset.section=String(index+1);
    view.location.hash=`#lab/${scenario.id}/${step}?mode=guided&sequence=opening-day`;
    const select=view.node('#learning-mode');select.value='challenge';select.listeners.get('change')();
    assert.equal(view.urls.at(-1),`#lab/${scenario.id}/${step}?mode=challenge&sequence=opening-day`);
  }
  dispose();
});
