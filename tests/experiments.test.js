import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {normalizeLabRecord} from '../src/records.js';
import {createWorkStorage,WORK_PREFIX,hasPrivateWork} from '../src/local-work.js';
import {initialHardwareState,applyHardwareAction} from '../src/hardware.js';
import {initialWorkspaceState,applyWorkspaceAction} from '../src/workspaces.js';
import {answerQuestion,questionEvent,inquiryProgress} from '../src/interview.js';
import {readExperiments,retainExperimentEvents,setExperimentDraft,observationSnapshot,startExperiment,captureExperimentResult,saveExperiment,experimentEventText,experimentReport,renderExperiments,mountExperiments} from '../src/experiments.js';

const hardware=SCENARIOS.find(s=>s.id==='INC-101');
const network=SCENARIOS.find(s=>s.id==='NET-201');
const fields={predict:'The video output may not match the active graphics card.',changed:'I inspected the rear connection but kept it where it was.',observed:'The monitor still reported no signal.',explain:'The picture did not change, so I need to test the connection.'};
function attempt(scenario,record,state,patch={}) {
  setExperimentDraft(scenario,record,{...fields,...patch});
  assert.equal(startExperiment(scenario,record,state).ok,true);
  setExperimentDraft(scenario,record,{...fields,...patch});
  assert.equal(captureExperimentResult(scenario,record,state).ok,true);
  assert.equal(saveExperiment(scenario,record).ok,true);
}

test('every lab exposes bounded observations without copying arbitrary state, raw code, or prompts',()=>{
  for(const scenario of SCENARIOS){
    const state=scenario.track==='hardware'?initialHardwareState(scenario.id):initialWorkspaceState(scenario.id);
    state.studentEmail='private@example.invalid';state.internalToken='secret-marker';
    const rows=observationSnapshot(scenario,state),serialized=JSON.stringify(rows);
    assert.ok(rows.length>0 && rows.length<=6,scenario.id);
    assert.ok(rows.every(row=>row.length===2 && row[0].length<=32 && row[1].length<=40),scenario.id);
    assert.ok(!serialized.includes('private@example.invalid') && !serialized.includes('secret-marker'),scenario.id);
    if(scenario.track==='coding')assert.ok(!serialized.includes(state.code),scenario.id);
    if(scenario.id==='AI-301')assert.ok(!serialized.includes(state.prompt),scenario.id);
    const untouched=JSON.stringify(state);observationSnapshot(scenario,state);assert.equal(JSON.stringify(state),untouched);
  }
});

test('before and after follow actual equipment actions; unsuccessful attempts remain beside a successful repair',()=>{
  const record=normalizeLabRecord(hardware),before=structuredClone(record.state);
  attempt(hardware,record,before);
  assert.equal(readExperiments(record).attempts[0].check.ok,false);
  setExperimentDraft(hardware,record,{predict:'I predict the display will work through the graphics card.'});
  startExperiment(hardware,record,before);
  let after=applyHardwareAction(hardware.id,before,'video-gpu').state;
  after=applyHardwareAction(hardware.id,after,'open-document').state;
  setExperimentDraft(hardware,record,{changed:'I moved the signal cable to the graphics card and opened the file.',observed:'The desktop and original lesson file appeared.',explain:'The result supports a signal-path problem, while retaining the original files.'});
  captureExperimentResult(hardware,record,after);saveExperiment(hardware,record);
  const attempts=readExperiments(record).attempts;
  assert.equal(attempts.length,2);assert.equal(attempts[0].check.ok,false);assert.equal(attempts[1].check.ok,true);
  assert.notDeepEqual(attempts[1].before,attempts[1].after);
  assert.match(JSON.stringify(attempts[1].before),/Board/);assert.match(JSON.stringify(attempts[1].after),/GPU/);
  assert.equal(record.verified,false,'An experiment event must not set the separate task-verification flag.');
  assert.match(experimentReport(record),/Technical feedback is not a teacher grade/);
});

test('a passing model test cannot substitute for student observations and explanation',()=>{
  const record=normalizeLabRecord(hardware);
  let repaired=applyHardwareAction(hardware.id,record.state,'video-gpu').state;
  repaired=applyHardwareAction(hardware.id,repaired,'open-document').state;
  setExperimentDraft(hardware,record,{predict:'The repaired task should open the original file.'});
  startExperiment(hardware,record,repaired);captureExperimentResult(hardware,record,repaired);
  assert.equal(readExperiments(record).draft.check.ok,true);
  assert.equal(saveExperiment(hardware,record).ok,false);
  assert.equal(readExperiments(record).attempts.length,0);
  setExperimentDraft(hardware,record,{changed:'I opened the requested original file.',observed:'Its lesson contents are displayed.',explain:'Opening the requested file checks more than showing a desktop.'});
  assert.equal(saveExperiment(hardware,record).ok,true);
  assert.equal(record.closed,false);assert.equal(record.verified,false);
});

test('capture computes technical success from the model and never trusts a caller upgrade',()=>{
  const record=normalizeLabRecord(hardware);
  setExperimentDraft(hardware,record,fields);startExperiment(hardware,record,record.state);
  captureExperimentResult(hardware,record,record.state,{ok:true,message:'A forged all-clear.'});
  assert.equal(readExperiments(record).draft.check.ok,false);
  assert.ok(!readExperiments(record).draft.check.message.includes('forged'));
  assert.equal(saveExperiment(hardware,record).ok,false,'Restart clears the previous observation and explanation.');
  captureExperimentResult(hardware,record,record.state,{ok:false,message:'The editor contains untested changes.'});
  assert.match(readExperiments(record).draft.check.message,/untested changes/);
});

test('eight whole attempts, unfinished draft, and earned inquiry survive heavy later activity and normalization',()=>{
  const record=normalizeLabRecord(hardware);
  const question=hardware.questions[0].label;
  record.events.push(questionEvent(question,answerQuestion(hardware,question)));
  assert.equal(inquiryProgress(hardware,record.events).complete,true);
  for(let index=0;index<10;index++)attempt(hardware,record,record.state,{predict:'Prediction '+index+': inspect the actual signal path.'});
  setExperimentDraft(hardware,record,{predict:'My next unfinished idea.'});startExperiment(hardware,record,record.state);
  setExperimentDraft(hardware,record,{changed:'My next draft change.'});
  for(let index=0;index<180;index++)record.events=retainExperimentEvents(hardware,[...record.events,{time:'2026-10-16T12:00:00Z',kind:'info',message:'Later harmless inspection '+index}]);
  const normalized=normalizeLabRecord(hardware,record),data=readExperiments(normalized);
  assert.equal(normalized.events.length,100);assert.equal(data.attempts.length,8);
  assert.match(data.attempts[0].predict,/Prediction 2:/);assert.match(data.attempts.at(-1).predict,/Prediction 9:/);
  assert.equal(data.draft.predict,'My next unfinished idea.');assert.equal(data.draft.changed,'My next draft change.');
  assert.equal(data.draft.before.length,6);assert.equal(inquiryProgress(hardware,normalized.events).complete,true);
  assert.ok(data.attempts.every(item=>item.check.ok===false),'Failed attempts are retained as evidence.');
});

test('latest capstone handoff statements share retention without displacing experiments or inquiry',()=>{
  const record=normalizeLabRecord(hardware);
  attempt(hardware,record,record.state);
  for(const part of ['works','evidence','connection','uncertain'])record.events.push({time:'',kind:'info',message:'Capstone handoff / '+part+': The fictional '+part+' statement.'});
  for(let index=0;index<150;index++)record.events.push({time:'',kind:'info',message:'Inspection '+index});
  const kept=retainExperimentEvents(hardware,record.events);
  assert.equal(kept.length,100);assert.equal(kept.filter(event=>event.message.startsWith('Capstone handoff / ')).length,4);
  assert.equal(readExperiments({events:kept}).attempts.length,1);
});

test('serialized hostile text stays within event limits and renders only escaped text',()=>{
  const record=normalizeLabRecord(hardware),hostile='<img src=x onerror=alert(1)>\n"\\\ud800'.repeat(100);
  setExperimentDraft(hardware,record,{predict:hostile,changed:hostile,observed:hostile,explain:hostile});
  assert.ok(record.events.every(event=>event.message.length<=600));
  const html=renderExperiments(hardware,record);
  assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
  assert.ok(readExperiments(record).draft.predict.length<=240);
  assert.doesNotThrow(()=>normalizeLabRecord(hardware,JSON.parse(JSON.stringify(record))));
});

test('malformed, extra-field, partial, inherited, and oversized fragments cannot become saved attempts',()=>{
  const good=normalizeLabRecord(hardware);attempt(hardware,good,good.state);
  const malformed=[null,{},[],{message:'CLL-EXPERIMENT/1 {'},{message:'CLL-EXPERIMENT/1 '+JSON.stringify({i:'a1',p:'predict',v:'Forged',teacher:true})},{message:'CLL-EXPERIMENT/1 '+JSON.stringify({i:'a1',p:'before',v:[['label','value','extra']]})},{message:'CLL-EXPERIMENT/1 '+JSON.stringify({i:'a1',p:'check',v:{ok:'true',message:'fake'}})},{message:'CLL-EXPERIMENT/1 '+JSON.stringify({i:'a1',p:'predict',v:'x'.repeat(800)})},Object.assign(Object.create({prototype:true}),{message:good.events[0].message})];
  assert.deepEqual(readExperiments({events:malformed}).attempts,[]);
  assert.equal(readExperiments({events:good.events.slice(0,-1)}).attempts.length,0);
  assert.doesNotThrow(()=>retainExperimentEvents(hardware,malformed));
});

test('drafts use the existing opt-in save/resume and clear lifecycle, without new identity fields',()=>{
  const data=new Map(),disk={get length(){return data.size;},key(index){return [...data.keys()][index];},getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const manager=createWorkStorage({storage:disk,key:WORK_PREFIX,scenarios:SCENARIOS}),record=normalizeLabRecord(hardware);
  setExperimentDraft(hardware,record,{predict:'A fictional cable issue.',changed:'I inspected both ends.'});startExperiment(hardware,record,record.state);
  setExperimentDraft(hardware,record,{changed:'My retained draft change.'});
  const store={version:2,labs:{[hardware.id]:record}};
  assert.equal(hasPrivateWork(record),true);manager.save(store);assert.equal(data.size,0,'Private mode must not write experiment drafts.');
  assert.equal(manager.enable(store),true);const restored=manager.resume();
  assert.equal(readExperiments(restored.labs[hardware.id]).draft.changed,'My retained draft change.');
  assert.equal(readExperiments(restored.labs[hardware.id]).draft.before.length,6);
  manager.clearAll();assert.equal(data.has(WORK_PREFIX),false);
  assert.deepEqual(Object.keys(record).sort(),['closed','events','evidence','notes','plan','questions','reflection','state','verified']);
});

test('network comparisons distinguish applied settings from a freshly run check',()=>{
  const record=normalizeLabRecord(network);
  setExperimentDraft(network,record,fields);startExperiment(network,record,record.state);
  record.state=applyWorkspaceAction(network.id,record.state,'save-network',{ip:'10.24.8.25',mask:'255.255.255.0',gateway:'10.24.8.1',dns:'10.24.8.53'}).state;
  captureExperimentResult(network,record,record.state);
  assert.equal(readExperiments(record).draft.check.ok,false);
  record.state=applyWorkspaceAction(network.id,record.state,'run-check').state;
  captureExperimentResult(network,record,record.state);
  assert.equal(readExperiments(record).draft.check.ok,true);
  assert.notDeepEqual(readExperiments(record).draft.before,readExperiments(record).draft.after);
  assert.match(JSON.stringify(readExperiments(record).draft.after),/3 of 3 checks passed/);
});

test('manual reports expose readable student work and recorded observations without promoting them to a grade',()=>{
  const record=normalizeLabRecord(hardware);attempt(hardware,record,record.state);
  const report=experimentReport(record);
  assert.match(report,/I predict:/);assert.match(report,/I changed:/);assert.match(report,/I observed:/);assert.match(report,/supports or changes my idea because:/);
  assert.match(report,/Before:/);assert.match(report,/After:/);assert.match(report,/Task not ready/);assert.match(report,/not a teacher grade/);
  assert.ok(record.events.every(event=>experimentEventText(event)!==null));
  assert.equal(experimentEventText({message:'Ordinary action'}),null);
  assert.equal(experimentEventText({message:'CLL-EXPERIMENT/1 malformed'}),null);
});

test('controllers invalidate a captured result after an equipment change while keeping the student draft',()=>{
  // Small DOM adapter exercises listener behavior without duplicating the UI.
  const record=normalizeLabRecord(hardware);let state=record.state,saves=0,tests=0;
  const nodes=new Map(),listeners=new Map();
  function node(name){if(!nodes.has(name))nodes.set(name,{textContent:'',innerHTML:'',value:'',dataset:{},addEventListener(event,handler){listeners.set(name+'/'+event,handler);},removeEventListener(event){listeners.delete(name+'/'+event);},focus(){}});return nodes.get(name);}
  const inputs=Object.keys(fields).map(part=>{const input=node(part);input.dataset.experimentField=part;return input;});
  const host={querySelector:node,querySelectorAll:()=>inputs};
  const controller=mountExperiments(host,{scenario:hardware,record,getState:()=>state,onSave:()=>saves++,onTest:()=>tests++});
  node('predict').value='My first explanation.';listeners.get('predict/input')();
  listeners.get('[data-experiment-start]/click')();
  for(const part of ['changed','observed','explain']){node(part).value=fields[part];listeners.get(part+'/input')();}
  listeners.get('[data-experiment-capture]/click')();assert.equal(tests,1);assert.ok(readExperiments(record).draft.after);
  controller.refresh({changed:true});assert.equal(readExperiments(record).draft.after,undefined);assert.equal(readExperiments(record).draft.observed,fields.observed);
  assert.ok(saves>0);assert.match(node('[data-experiment-status]').textContent,/fresh result/);
  controller.dispose();assert.equal(listeners.size,0);
});

test('a declined workspace test cannot create an After or recorded technical result',()=>{
  const record=normalizeLabRecord(hardware),nodes=new Map(),listeners=new Map();let suppliedPrediction='';
  setExperimentDraft(hardware,record,{predict:'I predict the cable path explains the missing picture.'});startExperiment(hardware,record,record.state);
  function node(name){if(!nodes.has(name))nodes.set(name,{textContent:'',innerHTML:'',value:'',dataset:{},addEventListener(event,handler){listeners.set(name+'/'+event,handler);},removeEventListener(){},focus(){}});return nodes.get(name);}
  const host={querySelector:node,querySelectorAll:()=>[]};
  const controller=mountExperiments(host,{scenario:hardware,record,getState:()=>record.state,onTest:prediction=>{suppliedPrediction=prediction;return false;}});
  listeners.get('[data-experiment-capture]/click')();
  assert.match(suppliedPrediction,/cable path/);assert.equal(readExperiments(record).draft.after,undefined);assert.equal(readExperiments(record).draft.check,undefined);
  assert.match(node('[data-experiment-status]').textContent,/test did not run/);controller.dispose();
});
