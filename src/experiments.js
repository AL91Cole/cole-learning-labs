import {normalizeHardwareState, verifyHardware} from './hardware.js?release=20261017-realism16';
import {normalizeWorkspaceState, verifyWorkspace, getWorkspaceMission} from './workspaces.js?release=20261017-realism16';
import {inquiryProtectedEvents} from './interview.js?release=20261017-realism16';

// Experiment writing shares the existing local-work, clear, and manual-export
// lifecycle. It is not a grade, an identity record, or proof of authorship.
const PREFIX = 'CLL-EXPERIMENT/1 ';
const PARTS = ['predict','changed','observed','explain','before','after','check'];
const LABELS = {predict:'I predict',changed:'I changed',observed:'I observed',explain:'This supports or changes my idea because'};
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, letter => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[letter]));
const text = (value,max=240) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').slice(0,max) : '';
const now = () => new Date().toISOString();

function cleanRows(value) {
  if (!Array.isArray(value) || value.length > 6) return null;
  const rows = value.filter(row => Array.isArray(row) && row.length === 2 && row.every(item => typeof item === 'string')).map(([label,value]) => [text(label,32),text(value,40)]);
  return rows.length === value.length && rows.length > 0 ? rows : null;
}
function cleanPart(part,value) {
  if (Object.hasOwn(LABELS,part)) return typeof value === 'string' ? text(value) : null;
  if (part === 'before' || part === 'after') return cleanRows(value);
  if (part === 'check' && plain(value) && Object.keys(value).length === 2 && typeof value.ok === 'boolean' && typeof value.message === 'string') return {ok:value.ok,message:text(value.message,240)};
  return null;
}
function decode(event) {
  if (!plain(event) || typeof event.message !== 'string' || event.message.length > 600 || !event.message.startsWith(PREFIX)) return null;
  try {
    const data = JSON.parse(event.message.slice(PREFIX.length));
    if (!plain(data) || Object.keys(data).length !== 3 || !Object.hasOwn(data,'i') || !Object.hasOwn(data,'p') || !Object.hasOwn(data,'v') || !/^(?:draft|a[1-9])$/.test(data.i) || !PARTS.includes(data.p)) return null;
    const value = cleanPart(data.p,data.v);
    return value === null ? null : {id:data.i,part:data.p,value,event};
  } catch { return null; }
}
function pack(id,part,value,time=now()) {
  let clean = cleanPart(part,value);
  if (clean === null) return null;
  let message = PREFIX+JSON.stringify({i:id,p:part,v:clean});
  // Quotes, newlines, and isolated UTF-16 surrogate input can expand in JSON.
  // Bound the serialized event too; never truncate a JSON fragment mid-value.
  while (message.length > 600) {
    if (typeof clean === 'string') clean=clean.slice(0,-1);
    else if (part === 'check') clean={...clean,message:clean.message.slice(0,-1)};
    else clean=clean.map(([label,value]) => [label.slice(0,-1),value.slice(0,-1)]);
    message=PREFIX+JSON.stringify({i:id,p:part,v:clean});
  }
  return {time:text(time,40),kind:part==='check' ? (clean.ok ? 'success':'warning'):'info',message};
}
function groupsFrom(events) {
  const groups = new Map();
  for (const event of Array.isArray(events) ? events.slice(-2000) : []) {
    const item=decode(event);if (!item) continue;
    if (!groups.has(item.id)) groups.set(item.id,{id:item.id,parts:{},events:{}});
    const group=groups.get(item.id);group.parts[item.part]=item.value;group.events[item.part]=event;
    // Updating a group keeps the latest attempt order even when IDs are reused.
    groups.delete(item.id);groups.set(item.id,group);
  }
  return groups;
}
function complete(group) { return PARTS.every(part => Object.hasOwn(group.parts,part)) && Object.keys(LABELS).every(part => group.parts[part].trim().length > 0); }

export function readExperiments(record) {
  const groups=groupsFrom(record?.events);
  const attempts=[...groups.values()].filter(group => group.id!=='draft' && complete(group)).slice(-8).map(group => ({id:group.id,...group.parts}));
  const draft={predict:'',changed:'',observed:'',explain:'',...(groups.get('draft')?.parts || {})};
  return {attempts,draft};
}

/** Pin the latest eight whole attempts, the current draft, and earned inquiry
 * answers inside the existing 100-event contract. Old fragments never displace
 * the question/context pair that earned an investigation's inquiry step. */
export function retainExperimentEvents(scenario,events) {
  const source=(Array.isArray(events) ? events.slice(-2000) : []).filter(event => plain(event) && typeof event.message === 'string');
  const groups=groupsFrom(source), protectedEvents=new Set(inquiryProtectedEvents(scenario,source));
  // The final five-pathway handoff shares this event-only storage contract.
  for (const prefix of ['Capstone handoff / works: ','Capstone handoff / evidence: ','Capstone handoff / connection: ','Capstone handoff / uncertain: ']) {
    const latest=source.findLast(event=>event.message.startsWith(prefix));if(latest)protectedEvents.add(latest);
  }
  const attempts=[...groups.values()].filter(group => group.id!=='draft' && complete(group)).slice(-8);
  for (const group of [...attempts,...(groups.has('draft') ? [groups.get('draft')] : [])]) for (const event of Object.values(group.events)) protectedEvents.add(event);
  for (let index=source.length-1;index>=0 && protectedEvents.size<100;index--) {
    const event=source[index];
    if (!event.message.startsWith(PREFIX)) protectedEvents.add(event);
  }
  return source.filter(event => protectedEvents.has(event)).slice(-100);
}

function replaceDraft(scenario,record,values) {
  const retained=(Array.isArray(record.events) ? record.events : []).filter(event => decode(event)?.id!=='draft');
  for (const part of PARTS) if (Object.hasOwn(values,part) && (typeof values[part]!=='string' || values[part].length > 0)) retained.push(pack('draft',part,values[part]));
  record.events=retainExperimentEvents(scenario,retained.filter(Boolean));record.closed=false;
  return readExperiments(record).draft;
}
export function setExperimentDraft(scenario,record,patch) {
  const draft=readExperiments(record).draft;
  for (const key of Object.keys(LABELS)) if (plain(patch) && Object.hasOwn(patch,key)) draft[key]=text(patch[key]);
  return replaceDraft(scenario,record,draft);
}

const FIELD_ROWS = {
  'NET-201':[['ip','Workstation IP'],['mask','Subnet mask'],['gateway','Gateway'],['dns','DNS server']],
  'NET-202':[['network','Connected network'],['folder','Shared folder'],['permission','Permission']],
  'NET-203':[['recovery','Recovery choice'],['status','Update service'],['startup','Service startup']],
  'NET-204':[['placement','Access point position'],['band','Radio band'],['channel','Radio channel'],['width','Channel width']],
  'NET-205':[['spooler','Print service'],['queue','Queue state'],['port','Printer destination'],['job','Original print job']],
  'NET-206':[['snapshot','Backup snapshot'],['destination','Restore destination'],['preserve','Original file'],['integrity','Integrity review']],
  'AI-302':[['ticketA','Ticket A category'],['ticketB','Ticket B category']],
  'AI-303':[['secret','Secret handling'],['query','Query handling'],['authorization','Access rule']],
  'AI-304':[['input','Activity input'],['identifiers','Learner identifiers'],['route','Processing route'],['participation','Participation choice']],
  'AI-305':[['boundary','Source boundary'],['injected','Injected instruction'],['citation','Source citation'],['review','Human review']],
  'AI-306':[['threshold','Review threshold'],['decision','Decision policy'],['audit','Group audit'],['limitation','Evidence limit']],
  'SEC-401':[['message','Selected message'],['verdict','Triage decision'],['permission','Checklist permission']],
  'SEC-402':[['port','Closed service port'],['keepHttps','Classroom HTTPS']],
  'SEC-403':[['scope','Scope acknowledged'],['patch','Access-control rule'],['requested','Requested record']],
  'SEC-404':[['identity','Identity-check route'],['factor','Lost authenticator'],['reset','Recovery method'],['audit','Recovery audit']],
  'SEC-405':[['containment','Endpoint connection'],['evidence','Incident evidence'],['notify','Response escalation'],['recovery','Recovery route']],
  'SEC-406':[['package','Selected package'],['signature','Publisher signature'],['digest','Package integrity'],['deployment','Deployment scope']]
};
const displayValue = value => typeof value==='boolean' ? (value?'Yes':'No') : typeof value==='string' ? value || 'Not selected' : 'Not selected';
/** Read only explicit, normalized teaching observations. Never copy raw code,
 * prompts, logs, response bodies, secrets, or arbitrary saved-state fields. */
export function observationSnapshot(scenario,savedState) {
  const id=scenario.id,state=scenario.track==='hardware' ? normalizeHardwareState(id,savedState) : normalizeWorkspaceState(id,savedState);
  if(scenario.track==='hardware' && state.assemblyEnabled) {
    const a=state.assembly;
    const fitted=[['PSU',a.psuInstalled],['board',state.boardInstalled],['CPU',state.cpuInstalled],['cooler',state.coolerInstalled],['RAM',state.ramSeated],['GPU',state.gpuInstalled],['SSD',state.originalDriveInstalled]].filter(([,ready])=>ready).map(([label])=>label).join(' ')||'None';
    // Keep six bounded rows so the existing 600-character experiment event
    // preserves each individual fastener bit, rather than truncating evidence.
    return [
      ['PC / AC / POST / lesson',`${state.pcOn?'On':'Off'} / ${state.acConnected?'yes':'no'} / ${state.booted?'pass':'no'} / ${state.documentOpened?'open':'closed'}`],
      ['Fitted parts',fitted],
      ['P/PSU/B/C/G/S screws (1=secured)',['panel','psu','board','cooler','gpu','ssd'].map(group=>a[group+'Screws'].map(value=>value?'1':'0').join('')).join('/')+' '+state.selectedDrive.toUpperCase()],
      ['CPU/RAM/PCIe clips; panel',[a.retentionOpen,a.ramClipsOpen,a.pcieLatchOpen].map(open=>open?'open':'closed').join('/')+'; panel '+(a.panelInstalled?'on':'off')],
      ['Paste / CPU fan',a.paste+' / '+(a.cpuFanConnected?'connected':'disconnected')],
      ['ATX/EPS/GPU/F/data/SATA (1=yes)',[state.atxConnected,state.cpuPowerConnected,state.gpuPowerConnected,state.frontPanelConnected,state.sataDataConnected,state.sataPowerConnected].map(value=>value?'1':'0').join('')+' / '+(state.videoPort==='gpu'?'GPU':'board')+' '+(state.monitorInput==='hdmi'?'HDMI':'DP')+' '+(state.pcVideoConnected!==false?'PCin':'PCout')+' '+(state.signalConnected?'MONin':'MONout')]
    ].map(([label,value])=>[text(label,32),text(value,40)]);
  }
  if (scenario.track==='hardware') return [
    ['PC and AC power',(state.pcOn?'On':'Off')+' / AC '+(state.acConnected?'connected':'disconnected')],
    ['Installed components',[['Board',state.boardInstalled],['CPU',state.cpuInstalled],['Cooler',state.coolerInstalled],['RAM',state.ramSeated],['GPU',state.gpuInstalled]].filter(([,ready])=>ready).map(([label])=>label).join(', ') || 'None'],
    ['Connected power leads',[['ATX',state.atxConnected],['CPU',state.cpuPowerConnected],['GPU',state.gpuPowerConnected],['Front panel',state.frontPanelConnected]].filter(([,ready])=>ready).map(([label])=>label).join(', ') || 'None'],
    ['Storage','SSD '+(state.originalDriveInstalled?'fitted':'absent')+'; data '+(state.sataDataConnected?'yes':'no')+'; power '+(state.sataPowerConnected?'yes':'no')+'; '+(state.selectedDrive==='sata'?'SATA':'NVMe')],
    ['Display signal path',(state.videoPort==='gpu'?'GPU':'Board')+' / PC '+(state.pcVideoConnected===false?'out':'in')+' / MON '+(state.signalConnected===false?'out':'in')+' / '+(state.monitorInput==='displayport'?'DP':'HDMI')],
    ['Startup and document',(state.booted?'Booted':'Not booted')+' / document '+(state.documentOpened && state.pcOn && state.booted && state.videoPort==='gpu' && state.pcVideoConnected!==false && state.signalConnected!==false && state.monitorInput!=='displayport'?'open':'closed')]
  ].map(([label,value])=>[label,text(value,40)]);
  const rows=(FIELD_ROWS[id] || []).map(([key,label]) => {
    const value=state[key];
    // Configuration fields accept text; display only the simulated address form.
    if (id==='NET-201' && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return [label,'No valid simulated IPv4 address'];
    return [label,displayValue(value)];
  });
  if (scenario.track==='coding') rows.push(['Program draft',typeof state.code==='string' && state.code.trim() ? 'Present; source stays in the editor':'Empty']);
  if (id==='AI-301') rows.push(['Practice prompt',typeof state.prompt==='string' && state.prompt.trim() ? 'Present; text stays in the editor':'Empty']);
  if (id==='AI-302') rows.push(['Claim review',state.claims.filter(value => value!=='unreviewed').length+' of 3 reviewed']);
  if (id==='SEC-401') rows.push(['Warning signs',state.flags.length+' selected']);
  if (id==='SEC-402') rows.push(['Correlated events',state.events.length+' selected'],['Blocked source',/^\d{1,3}(?:\.\d{1,3}){3}$/.test(state.source)?state.source:'No simulated IPv4 address']);
  const mission=getWorkspaceMission(id,state);
  rows.push(['Latest workspace test',mission.tested ? `${mission.passed} of ${mission.total} checks passed`:'Not run for this setup']);
  return rows.slice(0,6).map(([label,value]) => [text(label,32),text(value,40)]);
}
function taskCheck(scenario,state,result) {
  const actual=scenario.track==='hardware' ? verifyHardware(scenario.id,state) : verifyWorkspace(scenario.id,state);
  // A caller may report an untested editor draft. It may never upgrade a failing
  // model check to success. Saved event text never changes record.verified.
  const checked=result?.ok===false ? result : actual;
  return {ok:checked.ok===true,message:text(checked.message,240)};
}
export function startExperiment(scenario,record,state) {
  const draft=readExperiments(record).draft;
  if (!draft.predict.trim()) return {ok:false,message:'Write what you predict before starting this experiment.'};
  replaceDraft(scenario,record,{predict:draft.predict,changed:'',observed:'',explain:'',before:observationSnapshot(scenario,state)});
  return {ok:true,message:'Before recorded. Make one change above, then capture a test result.'};
}
export function captureExperimentResult(scenario,record,state,result) {
  const draft=readExperiments(record).draft;
  if (!draft.before) return {ok:false,message:'Start your experiment before changing the setup so you have a Before to compare.'};
  replaceDraft(scenario,record,{...draft,after:observationSnapshot(scenario,state),check:taskCheck(scenario,state,result)});
  return {ok:true,message:'After and the simulation check are recorded. Add your own observation and explanation, then save this attempt.'};
}
export function saveExperiment(scenario,record) {
  const {attempts,draft}=readExperiments(record);
  if (!Object.keys(LABELS).every(key => draft[key].trim())) return {ok:false,message:'Complete the four short statements in your own words before saving this attempt.'};
  if (!draft.before || !draft.after || !draft.check) return {ok:false,message:'Start the experiment and capture a test result before saving this attempt.'};
  const id=Array.from({length:9},(_,index)=>'a'+(index+1)).find(id => !attempts.some(attempt=>attempt.id===id));
  const events=(Array.isArray(record.events) ? record.events : []).filter(event => decode(event)?.id!=='draft');
  for (const part of PARTS) events.push(pack(id,part,draft[part]));
  record.events=retainExperimentEvents(scenario,events.filter(Boolean));record.closed=false;
  return {ok:true,message:attempts.length>=8 ? 'Attempt saved. Your eight most recent attempts are kept; export your report before starting further work if you need an earlier copy.' : 'Attempt saved, including its simulation result. A failed test is useful evidence too.'};
}

/** Friendly rendering for the existing action log and plain/manual reports. */
export function experimentEventText(event) {
  const item=decode(event);if (!item) return null;
  const prefix=item.id==='draft'?'Experiment draft':'Saved experiment '+item.id.slice(1);
  if (Object.hasOwn(LABELS,item.part)) return prefix+' · '+LABELS[item.part]+': '+item.value;
  if (item.part==='check') return prefix+' · Recorded simulation check: '+(item.value.ok?'Task works. ':'Task not ready. ')+item.value.message+' This is technical feedback, not a teacher grade.';
  return prefix+' · '+(item.part==='before'?'Before':'After')+': '+item.value.map(([label,value])=>label+' = '+value).join('; ');
}
export function experimentReport(record) {
  const {attempts,draft}=readExperiments(record);
  const lines=attempts.flatMap((attempt,index)=>['Attempt '+(index+1),...Object.keys(LABELS).map(part=>LABELS[part]+': '+attempt[part]),'Before: '+attempt.before.map(row=>row.join(' = ')).join('; '),'After: '+attempt.after.map(row=>row.join(' = ')).join('; '),'Recorded simulation check: '+(attempt.check.ok?'Task works. ':'Task not ready. ')+attempt.check.message,'Technical feedback is not a teacher grade.']);
  if (PARTS.some(part => draft[part])) lines.push('Current experiment draft (unfinished)',...Object.keys(LABELS).filter(part=>draft[part]).map(part=>LABELS[part]+': '+draft[part]));
  return lines.join('\n');
}
function comparison(before,after) {
  if (!before) return '<p class="panel-help">Your Before will appear after you start an experiment.</p>';
  return '<div class="experiment-table-scroll" tabindex="0" role="region" aria-label="Before and after observations"><table class="experiment-comparison"><caption>Recorded equipment and workspace observations</caption><thead><tr><th scope="col">Observation</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>'+before.map(([label,value])=>{const next=after?.find(row=>row[0]===label)?.[1];return '<tr'+(next!==undefined && next!==value?' class="experiment-changed"':'')+'><th scope="row">'+esc(label)+'</th><td>'+esc(value)+'</td><td>'+esc(next ?? 'Capture a result')+'</td></tr>';}).join('')+'</tbody></table></div>';
}
function savedAttempts(record) {
  const {attempts}=readExperiments(record);
  return attempts.length ? attempts.map((attempt,index)=>'<details class="experiment-attempt"'+(index===attempts.length-1?' open':'')+'><summary>Saved attempt '+(index+1)+' · '+(attempt.check.ok?'Task works':'Keep investigating')+'</summary><dl>'+Object.keys(LABELS).map(part=>'<dt>'+esc(LABELS[part])+'</dt><dd>'+esc(attempt[part])+'</dd>').join('')+'</dl>'+comparison(attempt.before,attempt.after)+'<p><strong>Recorded simulation check:</strong> '+esc(attempt.check.message)+'</p></details>').join('') : '<p class="panel-help">No saved attempts yet. Keep a test that did not work: it can help explain your next idea.</p>';
}
export function renderExperiments(scenario,record) {
  const {draft}=readExperiments(record);
  const field=(part,placeholder)=>'<label class="lab-field" for="experiment-'+part+'">'+esc(LABELS[part])+'<textarea id="experiment-'+part+'" data-experiment-field="'+part+'" maxlength="240" rows="2" placeholder="'+esc(placeholder)+'">'+esc(draft[part])+'</textarea></label>';
  return '<section class="case-panel experiment-workspace" id="experiment-workspace" aria-labelledby="experiment-title"><p class="eyebrow">YOUR EXPERIMENT RECORD</p><h2 id="experiment-title">Predict. Try. Observe. Explain.</h2><p class="panel-help">Keep all details fictional. Start before changing the setup. Your writing stays with your lab work under the same saving and clearing controls. Each statement holds up to 240 characters.</p>'+field('predict','I predict… because…')+'<button class="button button-outline" type="button" data-experiment-start>Start experiment · record Before</button><p class="panel-help">Then make one change using the workbench above.</p>'+field('changed','I changed…')+'<button class="button" type="button" data-experiment-capture>Run test & capture After</button><div data-experiment-comparison>'+comparison(draft.before,draft.after)+'</div><p class="experiment-technical" data-experiment-check>'+esc(draft.check ? 'Recorded simulation check: '+draft.check.message : 'No simulation result captured for this attempt.')+'</p>'+field('observed','I observed…')+field('explain','This supports / changes my idea because…')+'<button class="button" type="button" data-experiment-save>Save this attempt</button><p class="experiment-status" data-experiment-status role="status" aria-live="polite"></p><p class="panel-help">A passing check shows that the simulated task works. Your explanation is for teacher review; this record does not assign a grade. Your eight most recent attempts are kept, including unsuccessful tests.</p><h3>My saved attempts</h3><div data-experiment-attempts>'+savedAttempts(record)+'</div></section>';
}

/** No listeners outside this host, network, storage, or background work. The app
 * supplies its existing save function and actual test action. */
export function mountExperiments(host,{scenario,record,getState,getResult,onSave=()=>{},onTest=()=>{}}) {
  if (!host) return {refresh(){},dispose(){}};
  const removers=[];
  const listen=(node,event,handler)=>{if(!node)return;node.addEventListener(event,handler);removers.push(()=>node.removeEventListener(event,handler));};
  const status=message=>{host.querySelector('[data-experiment-status]').textContent=message;};
  const persist=()=>onSave();
  function refresh({changed=false}={}) {
    let {draft}=readExperiments(record);
    if (draft.after && (changed || JSON.stringify(draft.after)!==JSON.stringify(observationSnapshot(scenario,getState())) || JSON.stringify(draft.check)!==JSON.stringify(taskCheck(scenario,getState(),getResult?.())))) {
      delete draft.after;delete draft.check;replaceDraft(scenario,record,draft);persist();
      status('The setup changed. Capture a fresh result before saving this attempt.');
    }
    host.querySelector('[data-experiment-comparison]').innerHTML=comparison(draft.before,draft.after);
    host.querySelector('[data-experiment-check]').textContent=draft.check ? 'Recorded simulation check: '+draft.check.message : 'No simulation result captured for this attempt.';
    host.querySelector('[data-experiment-attempts]').innerHTML=savedAttempts(record);
    host.querySelector('[data-experiment-start]').textContent=draft.before?'Restart experiment · replace current draft':'Start experiment · record Before';
  }
  for (const input of host.querySelectorAll('[data-experiment-field]')) listen(input,'input',()=>{setExperimentDraft(scenario,record,{[input.dataset.experimentField]:input.value});persist();});
  listen(host.querySelector('[data-experiment-start]'),'click',()=>{
    const result=startExperiment(scenario,record,getState());status(result.message);
    if(result.ok){for(const input of host.querySelectorAll('[data-experiment-field]'))input.value=readExperiments(record).draft[input.dataset.experimentField];persist();refresh();}
  });
  listen(host.querySelector('[data-experiment-capture]'),'click',()=>{
    if(!readExperiments(record).draft.before){status('Write your prediction and start the experiment before capturing its result.');host.querySelector('[data-experiment-start]').focus();return;}
    const performed=onTest(readExperiments(record).draft.predict);
    if(performed===false){status('The test did not run. Review the workbench message, then run this test again before recording an After.');return;}
    const result=captureExperimentResult(scenario,record,getState(),getResult?.());status(result.message);persist();refresh();
  });
  listen(host.querySelector('[data-experiment-save]'),'click',()=>{
    refresh();const result=saveExperiment(scenario,record);status(result.message);
    if(result.ok){for(const input of host.querySelectorAll('[data-experiment-field]'))input.value='';persist();refresh();}
  });
  refresh();
  return {refresh,dispose(){for(const remove of removers)remove();}};
}
