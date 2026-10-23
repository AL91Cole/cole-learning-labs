import {normalizeHardwareState, verifyHardware} from './hardware.js?release=20261022-controls';
import {normalizeWorkspaceState, verifyWorkspace, getWorkspaceMission} from './workspaces.js?release=20261022-controls';
import {inquiryProtectedEvents} from './interview.js?release=20261022-controls';

// Experiment writing shares the existing local-work, clear, and manual-export
// lifecycle. It is not a grade, an identity record, or proof of authorship.
const PREFIX = 'CLL-EXPERIMENT/1 ';
const PARTS = ['predict','evidence','changed','observed','explain','before','after','check'];
const LEGACY_PARTS = PARTS.filter(part => part!=='evidence');
const LABELS = {predict:'My test idea',evidence:'Evidence that supports my idea',changed:'What I changed',observed:'What happened',explain:'What I learned'};
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
// Earlier saved attempts had no separate evidence field. Keep those complete
// records readable; only new saves require the additional evidence statement.
function complete(group) { return LEGACY_PARTS.every(part => Object.hasOwn(group.parts,part)) && Object.keys(LABELS).filter(part => part!=='evidence' || Object.hasOwn(group.parts,part)).every(part => group.parts[part].trim().length > 0); }

export function readExperiments(record) {
  const groups=groupsFrom(record?.events);
  const attempts=[...groups.values()].filter(group => group.id!=='draft' && complete(group)).slice(-8).map(group => ({id:group.id,...group.parts}));
  const draft={predict:'',evidence:'',changed:'',observed:'',explain:'',...(groups.get('draft')?.parts || {})};
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
  const ideaChanged=['predict','evidence'].some(key => plain(patch) && Object.hasOwn(patch,key) && text(patch[key])!==draft[key]);
  if (ideaChanged && draft.before) {
    delete draft.before;delete draft.after;delete draft.check;
    draft.changed='';draft.observed='';draft.explain='';
  }
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
      // The absent suffix keeps older snapshots equal to the default On state.
      ['ATX/EPS/GPU/F/data/SATA (1=yes)',[state.atxConnected,state.cpuPowerConnected,state.gpuPowerConnected,state.frontPanelConnected,state.sataDataConnected,state.sataPowerConnected].map(value=>value?'1':'0').join('')+' / '+(state.videoPort==='gpu'?'GPU':'board')+' '+(state.monitorInput==='hdmi'?'HDMI':'DP')+' '+(state.pcVideoConnected!==false?'PCin':'PCout')+' '+(state.signalConnected?'MONin':'MONout')+(state.monitorOn?'':' MOff')]
    ].map(([label,value])=>[text(label,32),text(value,40)]);
  }
  if (scenario.track==='hardware') return [
    ['PC and AC power',(state.pcOn?'On':'Off')+' / AC '+(state.acConnected?'connected':'disconnected')],
    ['Installed components',[['Board',state.boardInstalled],['CPU',state.cpuInstalled],['Cooler',state.coolerInstalled],['RAM',state.ramSeated],['GPU',state.gpuInstalled]].filter(([,ready])=>ready).map(([label])=>label).join(', ') || 'None'],
    ['Connected power leads',[['ATX',state.atxConnected],['CPU',state.cpuPowerConnected],['GPU',state.gpuPowerConnected],['Front panel',state.frontPanelConnected]].filter(([,ready])=>ready).map(([label])=>label).join(', ') || 'None'],
    ['Storage','SSD '+(state.originalDriveInstalled?'fitted':'absent')+'; data '+(state.sataDataConnected?'yes':'no')+'; power '+(state.sataPowerConnected?'yes':'no')+'; '+(state.selectedDrive==='sata'?'SATA':'NVMe')],
    ['Display signal path',(state.videoPort==='gpu'?'GPU':'Board')+' / PC '+(state.pcVideoConnected===false?'out':'in')+' / MON '+(state.signalConnected===false?'out':'in')+' / '+(state.monitorInput==='displayport'?'DP':'HDMI')+(state.monitorOn?'':' MOff')],
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
  // Keep the version and test counter even when the visible observations fill
  // four rows. A different saved source can have the same brief description.
  return [...rows.slice(0,4),['Workspace edit / test',state.workspaceEdits+' / '+state.checkRuns],['Latest workspace test',mission.tested ? `${mission.passed} of ${mission.total} checks passed`:'Not run for this setup']].map(([label,value]) => [text(label,32),text(value,40)]);
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
  const missing=ideaRequirement(draft);if(missing)return {ok:false,message:missing};
  replaceDraft(scenario,record,{predict:draft.predict,evidence:draft.evidence,changed:'',observed:'',explain:'',before:observationSnapshot(scenario,state)});
  return {ok:true,message:'Starting setup saved. Make one change in the workbench, then select Test my idea.'};
}
function ideaRequirement(draft) {
  return draft.predict.trim().length<12?'Write your test idea in a sentence.':draft.evidence.trim().length<12?'Add a clue or earlier result that supports your idea.':'';
}
export function captureExperimentResult(scenario,record,state,result) {
  const draft=readExperiments(record).draft;
  const missing=ideaRequirement(draft);if(missing)return {ok:false,message:missing};
  if (!draft.before) return {ok:false,message:'Select Start this test before changing the setup.'};
  replaceDraft(scenario,record,{...draft,observed:'',explain:'',after:observationSnapshot(scenario,state),check:taskCheck(scenario,state,result)});
  return {ok:true,message:'Result recorded. Describe what happened and what you learned. Then save this attempt.'};
}
export function saveExperiment(scenario,record) {
  const {attempts,draft}=readExperiments(record);
  const missing=ideaRequirement(draft);if(missing)return {ok:false,message:missing};
  if (!draft.before || !draft.after || !draft.check) return {ok:false,message:'Start this test and select Test my idea before saving.'};
  if (!Object.keys(LABELS).every(key => draft[key].trim())) return {ok:false,message:'Complete all five answers before saving this attempt.'};
  const id=Array.from({length:9},(_,index)=>'a'+(index+1)).find(id => !attempts.some(attempt=>attempt.id===id));
  const events=(Array.isArray(record.events) ? record.events : []).filter(event => decode(event)?.id!=='draft');
  for (const part of PARTS) events.push(pack(id,part,draft[part]));
  record.events=retainExperimentEvents(scenario,events.filter(Boolean));record.closed=false;
  return {ok:true,message:attempts.length>=8 ? 'Attempt saved. Your latest eight attempts are kept. Export your report to keep older tests.' : 'Attempt saved. If it did not work, use the result to plan your next idea.'};
}

/** Friendly rendering for the existing action log and plain/manual reports. */
export function experimentEventText(event,{compact=false}={}) {
  const item=decode(event);if (!item) return null;
  const prefix=item.id==='draft'?'Experiment draft':'Saved experiment '+item.id.slice(1);
  if (Object.hasOwn(LABELS,item.part)) return prefix+' · '+LABELS[item.part]+': '+item.value;
  if (item.part==='check') return prefix+(compact?' · Test result: ':' · Recorded simulation check: ')+(item.value.ok?'Task works. ':'Task not ready. ')+item.value.message+(compact?'':' This is technical feedback, not a teacher grade.');
  if(compact)return prefix+(item.part==='before'?' · Starting setup recorded.':' · Setup after the test recorded.');
  return prefix+' · '+(item.part==='before'?'Before':'After')+': '+item.value.map(([label,value])=>label+' = '+value).join('; ');
}
export function experimentReport(record) {
  const {attempts,draft}=readExperiments(record);
  const lines=attempts.flatMap((attempt,index)=>['Attempt '+(index+1),...Object.keys(LABELS).map(part=>LABELS[part]+': '+(attempt[part]??'Not recorded in this earlier attempt.')),'Before: '+attempt.before.map(row=>row.join(' = ')).join('; '),'After: '+attempt.after.map(row=>row.join(' = ')).join('; '),'Recorded simulation check: '+(attempt.check.ok?'Task works. ':'Task not ready. ')+attempt.check.message,'Technical feedback is not a teacher grade.']);
  if (PARTS.some(part => draft[part])) lines.push('Current experiment draft (unfinished)',...Object.keys(LABELS).filter(part=>draft[part]).map(part=>LABELS[part]+': '+draft[part]));
  return lines.join('\n');
}
/** Display compact saved hardware observations in student language. Stored
 * snapshots keep their exact bounded form for validation and older records. */
export function formatExperimentObservations(rows) {
  const source=cleanRows(rows);
  if(!source)return [['Setup details','Not recorded in a readable format']];
  const formatted=[],add=(label,value)=>formatted.push([label,value]);
  const connected=value=>value==='yes'||value==='connected'||value==='in'?'Connected':value==='no'||value==='disconnected'||value==='out'?'Disconnected':'Not recorded';
  for(const [label,value] of source) {
    if(label==='Workspace edit / test')continue;
    if(label==='PC / AC / POST / lesson') {
      const match=/^(On|Off) \/ (yes|no) \/ (pass|no) \/ (open|closed)$/.exec(value);
      add('Computer power',match?.[1]||'Not recorded');add('Power cable',connected(match?.[2]));
      add('Startup',match?(match[3]==='pass'?'Started':'Not started'):'Not recorded');
      add('Lesson file',match?(match[4]==='open'?'Opened':'Not opened'):'Not recorded');
    } else if(label==='PC and AC power') {
      const match=/^(On|Off) \/ AC (connected|disconnected)$/.exec(value);
      add('Computer power',match?.[1]||'Not recorded');add('Power cable',connected(match?.[2]));
    } else if(label==='Startup and document') {
      const match=/^(Booted|Not booted) \/ document (open|closed)$/.exec(value);
      add('Startup',match?(match[1]==='Booted'?'Started':'Not started'):'Not recorded');
      add('Lesson file',match?(match[2]==='open'?'Opened':'Not opened'):'Not recorded');
    } else if(label==='Fitted parts'||label==='Installed components') {
      const parts=value==='None'?[]:value.split(label==='Fitted parts'?' ':', '),known=['PSU','board','Board','CPU','cooler','Cooler','RAM','GPU','SSD'];
      add('Installed parts',parts.every(part=>known.includes(part))?parts.length+' parts fitted':'Not recorded');
    } else if(label==='P/PSU/B/C/G/S screws (1=secured)') {
      const match=/^([01]{2}\/([01]{4}\/){3}[01]{2}\/[01]{2}) (?:SATA|NVME)$/.exec(value),bits=match?.[1].replaceAll('/','');
      add('Part screws',bits?[...bits].filter(bit=>bit==='1').length+' of '+bits.length+' tightened':'Not recorded');
    } else if(label==='CPU/RAM/PCIe clips; panel') {
      const match=/^(?:open|closed)\/(?:open|closed)\/(?:open|closed); panel (on|off)$/.exec(value);
      add('Side panel',match?(match[1]==='on'?'Fitted':'Set aside'):'Not recorded');
    } else if(label==='Paste / CPU fan') {
      const match=/^(?:pea|clean|excess|dry) \/ (connected|disconnected)$/.exec(value);
      add('Cooling fan cable',connected(match?.[1]));
    } else if(label==='ATX/EPS/GPU/F/data/SATA (1=yes)') {
      const match=/^([01]{6}) \/ (GPU|board) (HDMI|DP) PC(in|out) MON(in|out)(?: M(On|Off))?$/.exec(value);
      add('Internal cables',match?[...match[1]].filter(bit=>bit==='1').length+' of 6 connected':'Not recorded');
      add('Picture cable output',match?(match[2]==='GPU'?'Graphics card':'Main board'):'Not recorded');
      add('Picture cable at computer',connected(match?.[4]));add('Picture cable at monitor',connected(match?.[5]));
      add('Monitor power',match?(match[6]==='Off'?'Off':'On'):'Not recorded');
    } else if(label==='Connected power leads') {
      const parts=value==='None'?[]:value.split(', ');
      add('Internal power cables',parts.every(part=>['ATX','CPU','GPU','Front panel'].includes(part))?parts.length+' cables connected':'Not recorded');
    } else if(label==='Storage') {
      const match=/^SSD (fitted|absent); data (yes|no); power (yes|no); (?:SATA|NVMe)$/.exec(value);
      add('Original storage drive',match?(match[1]==='fitted'?'Fitted':'Not fitted'):'Not recorded');
      add('Drive data cable',connected(match?.[2]));add('Drive power cable',connected(match?.[3]));
    } else if(label==='Display signal path') {
      const match=/^(GPU|Board) \/ PC (in|out) \/ MON (in|out) \/ (?:DP|HDMI)(?: M(On|Off))?$/.exec(value);
      add('Picture cable output',match?(match[1]==='GPU'?'Graphics card':'Main board'):'Not recorded');
      add('Picture cable at computer',connected(match?.[2]));add('Picture cable at monitor',connected(match?.[3]));
      add('Monitor power',match?(match[4]==='Off'?'Off':'On'):'Not recorded');
    } else if(/\b(?:ATX|EPS|GPU|PSU|POST|PCIe)\b|[01]{4,}|(?:\w+\/){2,}\w+/.test(label+' '+value)) {
      add('Other setup details','Not recorded in a readable format');
    } else add(label,value||'Not recorded');
  }
  return formatted.length?[...new Map(formatted).entries()]:[['Setup details','Not recorded in a readable format']];
}
function comparison(before,after) {
  if (!before) return '<p class="panel-help">Start this test to record the setup before your change.</p>';
  const start=new Map(formatExperimentObservations(before)),finish=after?new Map(formatExperimentObservations(after)):null;
  const labels=[...new Set([...start.keys(),...(finish?.keys()||[])])];
  return '<details class="experiment-setup-comparison"><summary>Compare setup before &amp; after</summary><div class="experiment-table-scroll" tabindex="0" role="region" aria-label="Before and after observations"><table class="experiment-comparison"><caption>Before and after my test</caption><thead><tr><th scope="col">Observation</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>'+labels.map(label=>{const value=start.get(label)||'Not recorded',next=finish?.get(label);return '<tr'+(next!==undefined && next!==value?' class="experiment-changed"':'')+'><th scope="row">'+esc(label)+'</th><td>'+esc(value)+'</td><td>'+esc(next ?? (finish?'Not recorded':'Not tested yet'))+'</td></tr>';}).join('')+'</tbody></table></div></details>';
}
function savedAttempts(record) {
  const {attempts}=readExperiments(record);
  return attempts.length ? attempts.map((attempt,index)=>'<details class="experiment-attempt"'+(index===attempts.length-1?' open':'')+'><summary>Saved attempt '+(index+1)+' · '+(attempt.check.ok?'Task works':'Keep investigating')+'</summary><dl>'+Object.keys(LABELS).map(part=>'<dt>'+esc(LABELS[part])+'</dt><dd>'+esc(attempt[part]??'Not recorded in this earlier attempt.')+'</dd>').join('')+'</dl>'+comparison(attempt.before,attempt.after)+'<p><strong>Test result:</strong> '+esc(attempt.check.message)+'</p></details>').join('') : '<p class="panel-help">No saved attempts yet. A test that did not work can help you choose your next idea.</p>';
}
export function renderExperiments(scenario,record) {
  const {draft}=readExperiments(record);
  const field=(part,placeholder)=>'<label class="lab-field" for="experiment-'+part+'">'+esc(LABELS[part])+'<textarea id="experiment-'+part+'" data-experiment-field="'+part+'" maxlength="240" rows="2" placeholder="'+esc(placeholder)+'"'+((part==='changed'&&!draft.before)||(['observed','explain'].includes(part)&&!draft.after)?' disabled':'')+'>'+esc(draft[part])+'</textarea></label>';
  return '<section class="case-panel experiment-workspace" id="experiment-workspace" aria-labelledby="experiment-title"><h2 id="experiment-title">Experiment notebook</h2><p class="panel-help">Record the idea you tested. If it did not work, use the result to plan another.</p><h3>1. Plan your test</h3><p class="panel-help">Use your first idea, or write another. Include a clue or result that supports it.</p>'+field('predict','I think… If I change…, I expect…')+field('evidence','The ticket, clue, or last test shows…')+'<button class="button button-outline" type="button" data-experiment-start>Start this test</button><h3>2. Make one change</h3><p class="panel-help">Use the workbench above, then describe your change here.</p>'+field('changed','I changed…')+'<h3>3. Test your idea</h3><button class="button" type="button" data-experiment-capture>Test my idea</button><div data-experiment-comparison>'+comparison(draft.before,draft.after)+'</div><p class="experiment-technical" data-experiment-check>'+esc(draft.check ? 'Test result: '+draft.check.message : 'No result yet.')+'</p><h3>4. Explain and save</h3><p class="panel-help">Did the result support your idea? Explain what it tells you.</p>'+field('observed','After the test, I noticed…')+field('explain','This supports or changes my idea because…')+'<button class="button" type="button" data-experiment-save>Save this attempt</button><p class="experiment-status" data-experiment-status role="status" aria-live="polite"></p><p class="panel-help">Need another test? Use the result as evidence for your next idea. Your latest eight attempts stay in this lab.</p><h3>My saved attempts</h3><div data-experiment-attempts>'+savedAttempts(record)+'</div></section>';
}

/** No listeners outside this host, network, storage, or background work. The app
 * supplies its existing save function and actual test action. */
export function mountExperiments(host,{scenario,record,getState,getResult,onSave=()=>{},onTest=()=>{}}) {
  if (!host) return {refresh(){},dispose(){}};
  const removers=[];
  const listen=(node,event,handler)=>{if(!node)return;node.addEventListener(event,handler);removers.push(()=>node.removeEventListener(event,handler));};
  const status=message=>{host.querySelector('[data-experiment-status]').textContent=message;};
  const persist=()=>onSave();
  const syncFields=draft=>{for(const input of host.querySelectorAll('[data-experiment-field]')){const part=input.dataset.experimentField;if(input.value!==draft[part])input.value=draft[part];input.disabled=(part==='changed'&&!draft.before)||(['observed','explain'].includes(part)&&!draft.after);}};
  function refresh({changed=false}={}) {
    let {draft}=readExperiments(record);
    if (draft.after && (changed || JSON.stringify(draft.after)!==JSON.stringify(observationSnapshot(scenario,getState())) || JSON.stringify(draft.check)!==JSON.stringify(taskCheck(scenario,getState(),getResult?.())))) {
      delete draft.after;delete draft.check;draft.observed='';draft.explain='';replaceDraft(scenario,record,draft);persist();
      status('The setup changed. Test my idea again for a fresh result, then describe it.');
    }
    syncFields(draft);
    host.querySelector('[data-experiment-comparison]').innerHTML=comparison(draft.before,draft.after);
    host.querySelector('[data-experiment-check]').textContent=draft.check ? 'Test result: '+draft.check.message : 'No result yet.';
    host.querySelector('[data-experiment-attempts]').innerHTML=savedAttempts(record);
    host.querySelector('[data-experiment-start]').textContent=draft.before?'Start this test again':'Start this test';
  }
  for (const input of host.querySelectorAll('[data-experiment-field]')) listen(input,'input',()=>{
    const before=readExperiments(record).draft,draft=setExperimentDraft(scenario,record,{[input.dataset.experimentField]:input.value});
    if(before.before&&!draft.before)status('Your idea or evidence changed. Start this test again before making a change.');
    persist();refresh();
  });
  listen(host.querySelector('[data-experiment-start]'),'click',()=>{
    const result=startExperiment(scenario,record,getState());status(result.message);
    if(result.ok){for(const input of host.querySelectorAll('[data-experiment-field]'))input.value=readExperiments(record).draft[input.dataset.experimentField];persist();refresh();}
  });
  listen(host.querySelector('[data-experiment-capture]'),'click',()=>{
    const {draft}=readExperiments(record),missing=ideaRequirement(draft);
    if(missing){status(missing);host.querySelector('[data-experiment-field="'+(draft.predict.trim().length<12?'predict':'evidence')+'"]').focus();return;}
    if(!draft.before){status('Select Start this test before changing the setup.');host.querySelector('[data-experiment-start]').focus();return;}
    const performed=onTest(draft.predict);
    if(performed===false){status('The test did not run. Read the workbench message, then try again.');return;}
    const result=captureExperimentResult(scenario,record,getState(),getResult?.());status(result.message);persist();refresh();
  });
  listen(host.querySelector('[data-experiment-save]'),'click',()=>{
    refresh();const result=saveExperiment(scenario,record);status(result.message);
    if(result.ok){for(const input of host.querySelectorAll('[data-experiment-field]'))input.value='';persist();refresh();}
  });
  refresh();
  return {refresh,dispose(){for(const remove of removers)remove();}};
}
