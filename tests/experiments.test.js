import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {normalizeLabRecord} from '../src/records.js';
import {createWorkStorage,WORK_PREFIX,hasPrivateWork} from '../src/local-work.js';
import {initialHardwareState,applyHardwareAction} from '../src/hardware.js';
import {initialWorkspaceState,applyWorkspaceAction} from '../src/workspaces.js';
import {answerQuestion,questionEvent,inquiryProgress} from '../src/interview.js';
import {readExperiments,retainExperimentEvents,setExperimentDraft,observationSnapshot,formatExperimentObservations,startExperiment,captureExperimentResult,saveExperiment,experimentEventText,experimentReport,renderExperiments,mountExperiments} from '../src/experiments.js';

const hardware=SCENARIOS.find(s=>s.id==='INC-101');
const network=SCENARIOS.find(s=>s.id==='NET-201');
const fields={predict:'The video output may not match the active graphics card.',evidence:'The monitor has power but reports that there is no signal.',changed:'I inspected the rear connection but kept it where it was.',observed:'The monitor still reported no signal.',explain:'The picture did not change, so I need to test the connection.'};
function attempt(scenario,record,state,patch={}) {
  setExperimentDraft(scenario,record,{...fields,...patch});
  assert.equal(startExperiment(scenario,record,state).ok,true);
  assert.equal(captureExperimentResult(scenario,record,state).ok,true);
  setExperimentDraft(scenario,record,{...fields,...patch});
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
  setExperimentDraft(hardware,record,{predict:'I predict the display will work through the graphics card.',evidence:fields.evidence});
  startExperiment(hardware,record,before);
  let after=applyHardwareAction(hardware.id,before,'video-gpu').state;
  after=applyHardwareAction(hardware.id,after,'open-document').state;
  captureExperimentResult(hardware,record,after);
  setExperimentDraft(hardware,record,{changed:'I moved the signal cable to the graphics card and opened the file.',observed:'The desktop and original lesson file appeared.',explain:'The result supports a signal-path problem, while retaining the original files.'});
  saveExperiment(hardware,record);
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
  setExperimentDraft(hardware,record,{predict:'The repaired task should open the original file.',evidence:'The desktop is visible, but the original task also asks for a file.'});
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
  setExperimentDraft(hardware,record,{predict:'My next unfinished idea.',evidence:fields.evidence});startExperiment(hardware,record,record.state);
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
  setExperimentDraft(hardware,record,{predict:hostile,evidence:hostile,changed:hostile,observed:hostile,explain:hostile});
  assert.ok(record.events.every(event=>event.message.length<=600));
  const html=renderExperiments(hardware,record);
  assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
  assert.ok(readExperiments(record).draft.predict.length<=240);
  assert.ok(readExperiments(record).draft.evidence.length<=240);
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
  setExperimentDraft(hardware,record,{predict:'A fictional cable issue.',evidence:fields.evidence,changed:'I inspected both ends.'});startExperiment(hardware,record,record.state);
  setExperimentDraft(hardware,record,{changed:'My retained draft change.'});
  const store={version:2,labs:{[hardware.id]:record}};
  assert.equal(hasPrivateWork(record),true);manager.save(store);assert.equal(data.size,0,'Private mode must not write experiment drafts.');
  assert.equal(manager.enable(store),true);const restored=manager.resume();
  assert.equal(readExperiments(restored.labs[hardware.id]).draft.changed,'My retained draft change.');
  assert.equal(readExperiments(restored.labs[hardware.id]).draft.before.length,6);
  manager.clearAll();assert.equal(data.has(WORK_PREFIX),false);
  assert.deepEqual(Object.keys(record).sort(),['closed','events','evidence','ideaSaved','notes','plan','questions','reflection','state','symptoms','verified']);
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
  assert.match(report,/My test idea:/);assert.match(report,/Evidence that supports my idea:/);assert.match(report,/What I changed:/);assert.match(report,/What happened:/);assert.match(report,/What I learned:/);
  assert.match(report,/Before:/);assert.match(report,/After:/);assert.match(report,/Task not ready/);assert.match(report,/not a teacher grade/);
  assert.ok(record.events.every(event=>experimentEventText(event)!==null));
  assert.equal(experimentEventText({message:'Ordinary action'}),null);
  assert.equal(experimentEventText({message:'CLL-EXPERIMENT/1 malformed'}),null);
});

test('setup comparison stays available in a closed disclosure while reports retain its observations',()=>{
  const record=normalizeLabRecord(hardware);attempt(hardware,record,record.state);
  const html=renderExperiments(hardware,record),disclosures=[...html.matchAll(/<details\b[^>]*class="experiment-setup-comparison"[^>]*>/g)];
  assert.equal(disclosures.length,1);
  assert.ok(disclosures.every(([opening])=>! /\bopen(?:\s|=|>)/.test(opening)));
  assert.match(html,/Compare setup before &amp; after/);assert.match(html,/<table class="experiment-comparison"/);
  assert.match(experimentReport(record),/Before: PC and AC power =/);assert.match(experimentReport(record),/After: PC and AC power =/);
});

test('compact hardware observations display plain status and counts without changing stored rows',()=>{
  const rows=[['PC / AC / POST / lesson','Off / no / no / closed'],['Fitted parts','PSU board CPU cooler RAM GPU SSD'],['P/PSU/B/C/G/S screws (1=secured)','01/1111/1111/1111/11/11 SATA'],['CPU/RAM/PCIe clips; panel','closed/closed/closed; panel on'],['Paste / CPU fan','pea / connected'],['ATX/EPS/GPU/F/data/SATA (1=yes)','110011 / GPU HDMI PCin MONout']];
  const before=structuredClone(rows),formatted=formatExperimentObservations(rows),display=new Map(formatted);
  assert.deepEqual(formatted.slice(0,4),[['Computer power','Off'],['Power cable','Disconnected'],['Startup','Not started'],['Lesson file','Not opened']]);
  assert.equal(display.get('Installed parts'),'7 parts fitted');assert.equal(display.get('Part screws'),'17 of 18 tightened');
  assert.equal(display.get('Internal cables'),'4 of 6 connected');assert.equal(display.get('Cooling fan cable'),'Connected');
  assert.equal(display.get('Picture cable output'),'Graphics card');assert.equal(display.get('Picture cable at computer'),'Connected');assert.equal(display.get('Picture cable at monitor'),'Disconnected');
  assert.doesNotMatch(JSON.stringify(formatted),/PCin|MONout|POST|ATX|EPS|PSU|GPU|CPU|PCIe|[01]{4,}/);
  assert.deepEqual(rows,before);
  const record=normalizeLabRecord(hardware);attempt(hardware,record,record.state);
  const original=JSON.stringify(record.events),html=renderExperiments(hardware,record);
  assert.match(html,/My test idea/);assert.match(html,/Record the idea you tested/);assert.match(html,/>Computer power</);assert.match(html,/>Power cable</);
  assert.equal(JSON.stringify(record.events),original);assert.match(experimentReport(record),/PC and AC power =/);
});

test('legacy hardware and nonhardware observations keep meaningful values in the simpler display',()=>{
  const legacy=[['PC and AC power','On / AC connected'],['Installed components','Board, CPU, Cooler, RAM, GPU'],['Connected power leads','ATX, CPU, GPU, Front panel'],['Storage','SSD fitted; data yes; power yes; SATA'],['Display signal path','GPU / PC in / MON out / HDMI'],['Startup and document','Booted / document closed']];
  const display=new Map(formatExperimentObservations(legacy));
  assert.equal(display.get('Computer power'),'On');assert.equal(display.get('Power cable'),'Connected');assert.equal(display.get('Startup'),'Started');assert.equal(display.get('Lesson file'),'Not opened');
  assert.equal(display.get('Original storage drive'),'Fitted');assert.equal(display.get('Drive data cable'),'Connected');assert.equal(display.get('Picture cable at monitor'),'Disconnected');
  assert.doesNotMatch(JSON.stringify([...display]),/GPU|CPU|ATX|SSD|MON|HDMI/);
  const networkRows=observationSnapshot(network,initialWorkspaceState(network.id));
  assert.deepEqual(formatExperimentObservations(networkRows),networkRows.filter(([label])=>label!=='Workspace edit / test'));
});

test('workspace edit and test versions distinguish otherwise identical snapshots but stay out of the student table',()=>{
  for(const scenario of SCENARIOS.filter(item=>item.track!=='hardware')) {
    const state=initialWorkspaceState(scenario.id),before=observationSnapshot(scenario,state);
    const after=observationSnapshot(scenario,{...state,workspaceEdits:1,checkRuns:1});
    assert.ok(before.length<=6);assert.equal(before.find(([label])=>label==='Workspace edit / test')?.[1],'0 / 0',scenario.id);
    assert.equal(after.find(([label])=>label==='Workspace edit / test')?.[1],'1 / 1',scenario.id);
    assert.ok(after.some(([label])=>label==='Latest workspace test'),scenario.id+' retains actual result status');
    assert.notDeepEqual(before,after,scenario.id+' keeps source and test changes distinct');
    assert.doesNotMatch(JSON.stringify(formatExperimentObservations(after)),/Workspace edit \/ test/);
  }
});

test('unreadable or unknown technical saved observations never turn into a successful status',()=>{
  const unreadable=formatExperimentObservations([['PC / AC / POST / lesson','On / unknown / pass / open'],['Future compact setup','111101/000010']]);
  assert.ok(unreadable.every(([,value])=>value.startsWith('Not recorded')));
  assert.doesNotMatch(JSON.stringify(unreadable),/Started|Opened|111101|000010/);
  assert.deepEqual(formatExperimentObservations(null),[['Setup details','Not recorded in a readable format']]);
  const record=normalizeLabRecord(hardware);attempt(hardware,record,record.state);
  record.events=record.events.map(event=>{const payload=JSON.parse(event.message.slice('CLL-EXPERIMENT/1 '.length));if(payload.p==='before')payload.v=[['<img src=x>','A saved note']];return {...event,message:'CLL-EXPERIMENT/1 '+JSON.stringify(payload)};});
  const html=renderExperiments(hardware,record);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img src=x&gt;/);
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
  node('evidence').value=fields.evidence;listeners.get('evidence/input')();
  listeners.get('[data-experiment-start]/click')();
  node('changed').value=fields.changed;listeners.get('changed/input')();
  listeners.get('[data-experiment-capture]/click')();assert.equal(tests,1);assert.ok(readExperiments(record).draft.after);
  for(const part of ['observed','explain']){node(part).value=fields[part];listeners.get(part+'/input')();}
  controller.refresh({changed:true});assert.equal(readExperiments(record).draft.after,undefined);assert.equal(readExperiments(record).draft.observed,'');assert.equal(readExperiments(record).draft.explain,'');
  assert.equal(readExperiments(record).draft.changed,fields.changed);assert.equal(node('observed').value,'');assert.equal(node('explain').disabled,true);
  assert.ok(saves>0);assert.match(node('[data-experiment-status]').textContent,/fresh result/);
  controller.dispose();assert.equal(listeners.size,0);
});

test('a declined workspace test cannot create an After or recorded technical result',()=>{
  const record=normalizeLabRecord(hardware),nodes=new Map(),listeners=new Map();let suppliedPrediction='';
  setExperimentDraft(hardware,record,{predict:'I predict the cable path explains the missing picture.',evidence:fields.evidence});startExperiment(hardware,record,record.state);
  function node(name){if(!nodes.has(name))nodes.set(name,{textContent:'',innerHTML:'',value:'',dataset:{},addEventListener(event,handler){listeners.set(name+'/'+event,handler);},removeEventListener(){},focus(){}});return nodes.get(name);}
  const host={querySelector:node,querySelectorAll:()=>[]};
  const controller=mountExperiments(host,{scenario:hardware,record,getState:()=>record.state,onTest:prediction=>{suppliedPrediction=prediction;return false;}});
  listeners.get('[data-experiment-capture]/click')();
  assert.match(suppliedPrediction,/cable path/);assert.equal(readExperiments(record).draft.after,undefined);assert.equal(readExperiments(record).draft.check,undefined);
  assert.match(node('[data-experiment-status]').textContent,/test did not run/);controller.dispose();
});

test('new supporting evidence is required and tests do not run before the plan is ready',()=>{
  const record=normalizeLabRecord(hardware),nodes=new Map(),listeners=new Map();let tests=0;
  setExperimentDraft(hardware,record,{predict:fields.predict});
  assert.equal(startExperiment(hardware,record,record.state).ok,false);
  assert.equal(captureExperimentResult(hardware,record,record.state).ok,false);
  function node(name){if(!nodes.has(name))nodes.set(name,{textContent:'',innerHTML:'',value:'',dataset:{},addEventListener(event,handler){listeners.set(name+'/'+event,handler);},removeEventListener(){},focus(){}});return nodes.get(name);}
  const host={querySelector:node,querySelectorAll:()=>[]};
  const controller=mountExperiments(host,{scenario:hardware,record,getState:()=>record.state,onTest:()=>{tests++;return true;}});
  listeners.get('[data-experiment-capture]/click')();assert.equal(tests,0);
  setExperimentDraft(hardware,record,{evidence:'   short   '});
  assert.equal(startExperiment(hardware,record,record.state).ok,false);
  listeners.get('[data-experiment-capture]/click')();assert.equal(tests,0);
  setExperimentDraft(hardware,record,{evidence:fields.evidence});
  listeners.get('[data-experiment-capture]/click')();assert.equal(tests,0,'A ready idea still needs a starting setup.');
  listeners.get('[data-experiment-start]/click')();listeners.get('[data-experiment-capture]/click')();assert.equal(tests,1);
  setExperimentDraft(hardware,record,{changed:fields.changed,observed:fields.observed,explain:fields.explain});
  assert.equal(saveExperiment(hardware,record).ok,true);
  const saved=readExperiments(normalizeLabRecord(hardware,JSON.parse(JSON.stringify(record)))).attempts[0];
  assert.equal(saved.evidence,fields.evidence);assert.match(experimentReport(record),/Evidence that supports my idea: The monitor/);
  controller.dispose();
});

test('earlier saved attempts without a separate evidence event remain whole and readable',()=>{
  const record=normalizeLabRecord(hardware);attempt(hardware,record,record.state);
  record.events=record.events.filter(event=>!event.message.startsWith('CLL-EXPERIMENT/1 ')||JSON.parse(event.message.slice('CLL-EXPERIMENT/1 '.length)).p!=='evidence');
  const legacy=readExperiments(record).attempts[0];assert.ok(legacy);assert.equal(legacy.evidence,undefined);
  for(let index=0;index<150;index++)record.events.push({kind:'info',message:'Later inspection '+index});
  const restored=normalizeLabRecord(hardware,JSON.parse(JSON.stringify(record)));
  assert.equal(readExperiments(restored).attempts.length,1);
  assert.deepEqual(readExperiments(restored).attempts[0],legacy);
  assert.match(experimentReport(restored),/Evidence that supports my idea: Not recorded in this earlier attempt/);
  assert.doesNotMatch(renderExperiments(hardware,restored),/undefined/);
});

test('fresh results and revised plans clear stale observations and explanations',()=>{
  const record=normalizeLabRecord(hardware);
  setExperimentDraft(hardware,record,fields);startExperiment(hardware,record,record.state);
  captureExperimentResult(hardware,record,record.state);
  setExperimentDraft(hardware,record,{changed:fields.changed,observed:fields.observed,explain:fields.explain});
  captureExperimentResult(hardware,record,record.state);
  let draft=readExperiments(record).draft;
  assert.equal(draft.observed,'');assert.equal(draft.explain,'');assert.ok(draft.after);assert.equal(saveExperiment(hardware,record).ok,false);
  for(const part of ['predict','evidence']) {
    setExperimentDraft(hardware,record,{observed:fields.observed,explain:fields.explain});
    setExperimentDraft(hardware,record,{[part]:'A revised '+part+' based on the latest test result.'});
    draft=readExperiments(record).draft;
    assert.equal(draft.before,undefined);assert.equal(draft.after,undefined);assert.equal(draft.check,undefined);
    assert.equal(draft.observed,'');assert.equal(draft.explain,'');
    assert.equal(captureExperimentResult(hardware,record,record.state).ok,false);
    assert.equal(startExperiment(hardware,record,record.state).ok,true);
    assert.equal(captureExperimentResult(hardware,record,record.state).ok,true);
  }
});
