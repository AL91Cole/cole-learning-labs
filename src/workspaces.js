const copy = value => JSON.parse(JSON.stringify(value));
const normalize = id => id.replaceAll('-', '').toUpperCase();
const outcome = (state, message, kind = 'info') => ({ state, message, kind });
const checked = value => value ? ' checked' : '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function initialWorkspaceState(id) {
  const code = normalize(id);
  const common = { tested: false, results: [] };
  const states = {
    NET201: { ip:'192.168.1.25', mask:'255.255.255.0', gateway:'192.168.1.1', dns:'192.168.1.53' },
    NET202: { network:'School-Guest', folder:'All folders', permission:'Full control' },
    NET203: { recovery:'Keep current update', status:'Stopped', startup:'Disabled' },
    AI301: { prompt:'Explain networks to [student name]. Use their [student email] and [diagnosis] to personalize it.', audit:[] },
    AI302: { claims:['unreviewed','unreviewed','unreviewed'], ticketA:'unreviewed', ticketB:'unreviewed' },
    AI303: { secret:'hardcoded', query:'concatenated', authorization:'signed-in' },
    SEC401: { message:'urgent', verdict:'unreviewed', flags:[], permission:'Administrator' },
    SEC402: { events:[], source:'', port:'', keepHttps:true },
    SEC403: { scope:false, patch:'none', requested:'101', response:null, observed:false, history:[] }
  };
  return { ...common, ...(states[code] || {}) };
}

function promptChecks(prompt) {
  return [
    { label:'Use fictional or anonymous information', ok:/fictional|anonymous|de-identified|imaginary/i.test(prompt) },
    { label:'Remove private identifiers and sensitive details', ok:!/@|\[student|diagnos|password|student.?s? (?:name|email)|real name|home address/i.test(prompt) },
    { label:'Ask for a short network explanation', ok:/network/i.test(prompt) && /short|brief|simple/i.test(prompt) && /explain|explanation/i.test(prompt) },
    { label:'Include a practice question', ok:/practice question|quiz question|check.?for.?understanding/i.test(prompt) },
    { label:'Ask to verify against class notes', ok:/class notes|classroom notes|course notes/i.test(prompt) && /check|verify|compare/i.test(prompt) }
  ];
}
function testMatrix(id, state) {
  switch (normalize(id)) {
    case 'NET201': return [
      {label:'Workstation address matches the configuration sheet',ok:state.ip==='10.24.8.25' && state.mask==='255.255.255.0'},
      {label:'Gateway reachable at 10.24.8.1',ok:state.ip==='10.24.8.25' && state.mask==='255.255.255.0' && state.gateway==='10.24.8.1'},
      {label:'learn.school.test resolves through school DNS',ok:state.ip==='10.24.8.25' && state.gateway==='10.24.8.1' && state.dns==='10.24.8.53'}
    ];
    case 'NET202': return [
      {label:'Internal share is reachable on Staff-Lab',ok:state.network==='Staff-Lab'},
      {label:'Only Project Materials is shared',ok:state.folder==='Project Materials'},
      {label:'Teacher can read without edit or administrator rights',ok:state.network==='Staff-Lab' && state.folder==='Project Materials' && state.permission==='Read'}
    ];
    case 'NET203': return [
      {label:'OS boots from the last known good update state',ok:state.recovery==='Roll back KB-LAB-17'},
      {label:'Classroom documents preserved',ok:state.recovery!=='Reset and erase files'},
      {label:'Update service is running and starts automatically',ok:state.status==='Running' && state.startup==='Automatic'}
    ];
    case 'AI301': return promptChecks(state.prompt);
    case 'AI302': return [
      {label:'Cable-check instruction is supported by source v4.2',ok:state.claims[0]==='supported'},
      {label:'90-day password policy is marked unsupported',ok:state.claims[1]==='unsupported'},
      {label:'Personal judgement is marked unsupported and biased',ok:state.claims[2]==='biased'},
      {label:'Matched tickets both receive Display / cable',ok:state.ticketA==='Display / cable' && state.ticketB==='Display / cable'}
    ];
    case 'AI303': return [
      {label:'Missing API key fails safely; no secret embedded in source',ok:state.secret==='environment'},
      {label:'Query input is passed as a separate SQL parameter',ok:state.query==='parameterized'},
      {label:'Owner receives a record; another user receives a denial',ok:state.authorization==='owner'}
    ];
    case 'SEC401': return [
      {label:'Urgent verification message is reported as phishing',ok:state.verdict==='phishing'},
      {label:'Sender and destination mismatch are both documented',ok:state.flags.includes('sender') && state.flags.includes('destination')},
      {label:'Urgency is recognized as pressure, not proof',ok:state.flags.includes('urgency')},
      {label:'Checklist access is read-only',ok:state.permission==='Read only'}
    ];
    case 'SEC402': return [
      {label:'Repeated failures and later success are correlated',ok:state.events.includes('EVT-102') && state.events.includes('EVT-103') && !state.events.includes('EVT-101') && !state.events.includes('EVT-104')},
      {label:'Only suspicious source 198.51.100.24 is contained',ok:state.source==='198.51.100.24'},
      {label:'Legacy Telnet port 23 is closed',ok:state.port==='23'},
      {label:'Classroom HTTPS on 443 remains available',ok:state.keepHttps===true}
    ];
    case 'SEC403': return [
      {label:'Testing stayed within the acknowledged simulation scope',ok:state.scope},
      {label:'Original access-control defect reproduced before patching',ok:state.observed},
      {label:'Record 101 → 200 (own record)',ok:state.patch==='owner'},
      {label:'Record 102 → 403 (other learner’s record)',ok:state.patch==='owner'}
    ];
    default: return [];
  }
}

export function applyWorkspaceAction(id, previous, action, value) {
  const state = copy(previous || initialWorkspaceState(id));
  const code = normalize(id);
  const save = (properties, message) => { Object.assign(state, properties); state.tested=false; state.results=[]; return outcome(state,message); };
  if (action==='save-network' && code==='NET201') {
    const values=Object.fromEntries(['ip','mask','gateway','dns'].map(key=>[key,String(value?.[key] || '').trim()]));
    return save(values,'Adapter settings saved. Run diagnostics to check the address, gateway, and name resolution.');
  }
  if (action==='save-access' && code==='NET202') return save({network:value.network,folder:value.folder,permission:value.permission},'Connection and share policy saved. Test the teacher’s access next.');
  if (action==='save-recovery' && code==='NET203') return save({recovery:value.recovery,status:value.status,startup:value.startup},'Recovery choices applied to the simulated machine. Run the recovery check.');
  if (action==='save-prompt' && code==='AI301') return save({prompt:String(value.prompt).slice(0,3000)},'Prompt saved locally. Run the rule check and read each result.');
  if (action==='save-claims' && code==='AI302') return save({claims:[value.claim0,value.claim1,value.claim2],ticketA:value.ticketA,ticketB:value.ticketB},'Review decisions saved. Compare them with the source and run the audit.');
  if (action==='save-code' && code==='AI303') return save({secret:value.secret,query:value.query,authorization:value.authorization},'Review choices applied to the code preview. Run the fixed test matrix.');
  if (action==='view-message' && code==='SEC401') { state.message=value==='routine'?'routine':'urgent'; return outcome(state,'Text-only message opened. No link was followed.'); }
  if (action==='save-triage' && code==='SEC401') return save({verdict:value.verdict,flags:Array.isArray(value.flags)?value.flags:[],permission:value.permission},'Triage recorded. Validate the report and the access decision.');
  if (action==='save-response' && code==='SEC402') return save({events:Array.isArray(value.events)?value.events:[],source:String(value.source||'').trim(),port:String(value.port||'').trim(),keepHttps:value.keepHttps===true},'Simulation policy saved. Run the response validation to check containment and availability.');
  if (code==='SEC403') {
    if (action==='acknowledge-scope') { state.scope=Boolean(value); state.tested=false; state.results=[]; return outcome(state,state.scope?'Scope acknowledged. Only the two built-in records are available.':'Scope acknowledgement removed. Requests are locked.'); }
    if (!state.scope && ['fetch-record','set-authorization','run-check'].includes(action)) return outcome(state,'Read and acknowledge the simulation scope before making a request.','warning');
    if (action==='fetch-record') {
      if (!['101','102'].includes(String(value))) return outcome(state,'Only record 101 and record 102 are inside this authorized simulation.','warning');
      state.requested=String(value);
      const denied=state.patch==='owner' && state.requested==='102';
      state.response={status:denied?403:200,id:state.requested,owner:`learner-${state.requested}`,body:denied?'Access denied: this record belongs to another learner.':`Fictional learner ${state.requested} · Practice task: network diagram · Status: submitted`};
      if (!denied && state.requested==='102' && state.patch!=='owner') state.observed=true;
      state.history.push(`GET /records/${state.requested} → ${state.response.status}`);
      state.history=state.history.slice(-8);
      return outcome(state,denied?'403: the ownership check blocked another learner’s record.':state.requested==='102'?'200: the original app exposed another learner’s fictional record. Record this authorization defect.':'200: your own fictional record is accessible.',denied?'success':state.requested==='102'?'warning':'info');
    }
    if (action==='set-authorization') return save({patch:value==='owner'?'owner':value==='hidden'?'hidden':'none',response:null},'Patch choice saved. Retest both records with the same active user.');
  }
  if (action==='run-check') {
    state.results=testMatrix(id,state); state.tested=true;
    const passed=state.results.length>0 && state.results.every(result=>result.ok);
    return outcome(state,passed?'All simulation checks pass. Record the evidence and complete your ticket report.':'Some checks need attention. Read the failed results, revise the configuration, and test again.',passed?'success':'warning');
  }
  return outcome(state,'That action is not available in this workspace.','warning');
}

export function verifyWorkspace(id, state) {
  const checks=testMatrix(id,state || initialWorkspaceState(id));
  if (!checks.length) return {ok:false,message:'This case uses the hardware bench verification.'};
  if (!state?.tested) return {ok:false,message:'Run the workspace checks after your most recent change before verifying the ticket.'};
  const failed=checks.filter(check=>!check.ok);
  return failed.length ? {ok:false,message:`Still unresolved: ${failed.map(check=>check.label).join('; ')}.`} : {ok:true,message:'The requested outcome is verified by the workspace tests.'};
}

function select(name,label,value,options) {
  return `<label class="ws-field"><span>${label}</span><select name="${name}">${options.map(option=>{const [key,text]=Array.isArray(option)?option:[option,option];return `<option value="${esc(key)}"${key===value?' selected':''}>${esc(text)}</option>`;}).join('')}</select></label>`;
}
function input(name,label,value,placeholder='') {
  return `<label class="ws-field"><span>${label}</span><input name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false"></label>`;
}
function check(name,label,value,isChecked) { return `<label class="ws-check"><input type="checkbox" name="${name}" value="${esc(value)}"${checked(isChecked)}><span>${label}</span></label>`; }
const submit = (label='Apply settings') => `<button class="ws-button" type="submit">${label}</button>`;
const run = (label='Run diagnostics') => `<button class="ws-button ws-button-test" type="button" data-action="run-check">${label}<span aria-hidden="true"> ↗</span></button>`;
function results(state) {
  if (!state.tested) return '<div class="ws-test-placeholder"><span class="ws-status-dot"></span> Ready for a check · Changes require a fresh test.</div>';
  return `<section class="ws-test-results" aria-label="Simulation test results"><h3>Verification results</h3><ul>${state.results.map(item=>`<li class="${item.ok?'ws-pass':'ws-fail'}"><span>${item.ok?'PASS':'REVIEW'}</span>${esc(item.label)}</li>`).join('')}</ul></section>`;
}
function terminal(lines) { return `<div class="ws-terminal" aria-label="Simulated console"><div class="ws-console-heading">LOCAL SIMULATION OUTPUT</div>${lines.map(line=>`<div>${esc(line)}</div>`).join('')}</div>`; }
function network(id,state) {
  if (id==='NET201') return `<div class="ws-topology" aria-label="Lab network diagram"><div><span aria-hidden="true">▣</span><b>LAB-PC-12</b><small>${esc(state.ip)}</small></div><i aria-hidden="true"></i><div><span aria-hidden="true">▥</span><b>LAB SWITCH</b><small>Link up · VLAN 8</small></div><i aria-hidden="true"></i><div><span aria-hidden="true">◉</span><b>GATEWAY</b><small>10.24.8.1</small></div><div class="ws-dns-node"><span aria-hidden="true">⌘</span><b>SCHOOL DNS</b><small>10.24.8.53</small></div></div><div class="ws-two-col"><form class="ws-panel" data-form="save-network"><h3>Ethernet adapter · IPv4</h3><div class="ws-fields">${input('ip','IP address',state.ip)}${input('mask','Subnet mask',state.mask)}${input('gateway','Default gateway',state.gateway)}${input('dns','Preferred DNS server',state.dns)}</div>${submit()}</form><section class="ws-panel"><div class="ws-section-label">CONFIGURATION SHEET / VLAN 8</div><h3>Library workstation</h3><dl class="ws-key-values"><dt>Workstation</dt><dd>10.24.8.25</dd><dt>Subnet mask</dt><dd>255.255.255.0</dd><dt>Gateway</dt><dd>10.24.8.1</dd><dt>DNS</dt><dd>10.24.8.53</dd><dt>Portal</dt><dd>learn.school.test</dd></dl>${run('Test connectivity')}${terminal(state.tested?state.results.map(r=>`${r.ok?'OK  ':'FAIL'} ${r.label}`):['Adapter connected · physical link available','Waiting for a diagnostic run…'])}</section></div>`;
  if (id==='NET202') return `<div class="ws-two-col"><form class="ws-panel" data-form="save-access"><h3>Wireless & sharing settings</h3><div class="ws-fields">${select('network','Connected network',state.network,['School-Guest','Staff-Lab'])}${select('folder','Share scope',state.folder,['All folders','Project Materials','No folders'])}${select('permission','Teacher permission',state.permission,['Full control','Modify','Read','None'])}</div>${submit('Apply connection & permissions')}</form><section class="ws-panel"><div class="ws-section-label">ACCESS REQUEST</div><h3>Project Materials</h3><div class="ws-folder" aria-hidden="true">▱</div><p>Verified teacher account → read the project handout.</p><p class="ws-muted">Guest clients are isolated from internal shares. The teacher does not need editing rights or unrelated folders.</p>${run('Test teacher access')}${terminal(state.tested?state.results.map(r=>`${r.ok?'ALLOW / OK':'REVIEW    '} ${r.label}`):['Identity: teacher-training (verified)','Resource: /shares/project-materials','Requested operation: read'])}</section></div>`;
  return `<div class="ws-two-col"><section class="ws-panel"><div class="ws-section-label">RECOVERY CONSOLE / STUDIO-PC-04</div><h3>Startup stopped</h3>${terminal(['BOOT-31  Failed after KB-LAB-17','Snapshot  Last known good state available','Files     Classroom documents intact','Service   School Update: Stopped / Disabled'])}<p class="ws-muted">This console simulates fixed recovery choices. It does not run commands on your device.</p></section><form class="ws-panel" data-form="save-recovery"><h3>Recovery & service manager</h3>${select('recovery','Update recovery action',state.recovery,['Keep current update','Roll back KB-LAB-17','Reset and erase files'])}${select('status','School Update service',state.status,['Stopped','Running'])}${select('startup','Service startup type',state.startup,['Disabled','Manual','Automatic'])}${submit('Apply recovery plan')}${run('Run boot & service check')}</form></div>`;
}
function ai(id,state) {
  if (id==='AI301') return `<div class="ws-two-col"><section class="ws-panel ws-note"><div class="ws-section-label">PROMPT REVIEW / PRIVACY FIRST</div><h3>Describe the task, protect the learner.</h3><p>Build a prompt for an imaginary learner. Ask for a short explanation of networks, one practice question, and a comparison with class notes.</p><ul><li>Leave out names, email addresses, grades, and health information.</li><li>State the topic and the kind of help needed.</li><li>Keep a human verification step.</li></ul><p class="ws-muted">This is a transparent rule checker. It cannot judge all privacy risks or predict an AI model’s answer.</p></section><form class="ws-panel" data-form="save-prompt"><h3>Prompt workspace</h3><label class="ws-field"><span>Your revised prompt</span><textarea name="prompt" rows="9" maxlength="3000">${esc(state.prompt)}</textarea></label>${submit('Save revised prompt')}${run('Check prompt rules')}</form></div>`;
  if (id==='AI302') {
    const reviewOptions=[['unreviewed','Choose a finding'],['supported','Supported by source'],['unsupported','Unsupported by source'],['biased','Unsupported personal judgement / bias']];
    return `<section class="ws-source-card"><b>SOURCE CARD v4.2</b><p>“Check the display cable first. Record the test result.”</p><small>This guide contains no password-expiration rule or assessment of student motivation.</small></section><form data-form="save-claims"><div class="ws-two-col"><section class="ws-panel"><h3>Audit the AI draft</h3><ol class="ws-claim-list"><li><blockquote>Check the display cable first.</blockquote>${select('claim0','Finding for claim 1',state.claims[0],reviewOptions)}</li><li><blockquote>The school requires a password reset every 90 days.</blockquote>${select('claim1','Finding for claim 2',state.claims[1],reviewOptions)}</li><li><blockquote>This student’s name shows they probably did not try.</blockquote>${select('claim2','Finding for claim 3',state.claims[2],reviewOptions)}</li></ol></section><section class="ws-panel"><h3>Matched ticket test</h3><p class="ws-muted">Names are fictional. Both tickets contain the same technical evidence.</p><div class="ws-ticket-pair"><b>A · Alex</b><p>Monitor has power; HDMI cable disconnected.</p>${select('ticketA','Category for ticket A',state.ticketA,['unreviewed','Display / cable','Password reset','User effort'])}</div><div class="ws-ticket-pair"><b>B · Jordan</b><p>Monitor has power; HDMI cable disconnected.</p>${select('ticketB','Category for ticket B',state.ticketB,['unreviewed','Display / cable','Password reset','User effort'])}</div>${submit('Save audit findings')}${run('Validate source & fairness review')}</section></div></form>`;
  }
  const keyLine=state.secret==='environment'?'api_key = os.environ.get("LAB_API_KEY")\nif not api_key: raise RuntimeError("Missing key")':'api_key = "PLACEHOLDER-DO-NOT-USE"';
  const queryLine=state.query==='parameterized'?'record = db.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()':'record = db.execute("SELECT * FROM records WHERE id = " + record_id).fetchone()';
  const ownerLine=state.authorization==='owner'?'if record["owner_id"] != user.id:\n    raise PermissionError("Access denied")':state.authorization==='hidden'?'# The page hides record IDs, but makes no ownership check.':'# Any signed-in user can receive any record.';
  return `<div class="ws-two-col"><section class="ws-panel"><div class="ws-section-label">AI DRAFT / PYTHON REVIEW</div><h3>Record lookup preview</h3><pre class="ws-code"><code>${esc(`import os\n\n# Excerpt: db uses dictionary-style rows; user is authenticated.\n${keyLine}\n\ndef get_record(user, record_id):\n    ${queryLine}\n    if record is None:\n        raise LookupError("Record not found")\n    ${ownerLine.replaceAll('\n','\n    ')}\n    return record`)}</code></pre><p class="ws-muted">Preview only. No Python, SQL, or external API is executed.</p></section><form class="ws-panel" data-form="save-code"><h3>Choose a review patch</h3>${select('secret','Secret handling',state.secret,[['hardcoded','Keep the key in source'],['environment','Read environment; fail if missing']])}${select('query','SQL query construction',state.query,[['concatenated','Concatenate input into SQL'],['parameterized','Use a parameterized query']])}${select('authorization','Record access policy',state.authorization,[['signed-in','Allow every signed-in user'],['hidden','Hide record IDs in the interface'],['owner','Check record owner on every request']])}${submit('Apply review choices')}${run('Run simulated regression tests')}</form></div>`;
}
function security(id,state) {
  if (id==='SEC401') {
    const urgent=state.message!=='routine';
    return `<div class="ws-two-col"><section class="ws-panel"><div class="ws-section-label">TRAINING INBOX / 2 MESSAGES</div><div class="ws-inbox"><button type="button" data-action="view-message" data-value="urgent" class="ws-mail${urgent?' ws-mail-active':''}"><b>Account suspended in 10 minutes</b><small>verify@school-account-check.test</small></button><button type="button" data-action="view-message" data-value="routine" class="ws-mail${!urgent?' ws-mail-active':''}"><b>Tomorrow’s lab checklist</b><small>helpdesk@school.test</small></button></div><article class="ws-email"><h3>${urgent?'URGENT: verify your account':'Tomorrow’s lab checklist'}</h3><p class="ws-email-meta">From: ${urgent?'verify@school-account-check.test':'helpdesk@school.test'}</p><p>${urgent?'Your access will be deleted in 10 minutes. Verify your school password immediately using the button below.':'The troubleshooting checklist is ready. Open it from the class portal using the bookmark provided by your teacher.'}</p><div class="ws-link-preview"><b>Text-only destination preview</b><code>${urgent?'https://school-account-check.test/verify':'https://portal.school.test/checklist'}</code></div><small>No link in this message is active.</small></article></section><form class="ws-panel" data-form="save-triage"><h3>Report the urgent message</h3>${select('verdict','Message verdict',state.verdict,[['unreviewed','Choose a verdict'],['safe','Safe to provide credentials'],['phishing','Phishing — report through approved process']])}<fieldset class="ws-fieldset"><legend>Evidence in the urgent message</legend>${check('flags','Sender domain does not match school IT','sender',state.flags.includes('sender'))}${check('flags','Destination differs from the school portal','destination',state.flags.includes('destination'))}${check('flags','Threatening time limit creates pressure','urgency',state.flags.includes('urgency'))}</fieldset>${select('permission','Student helper access to checklist',state.permission,['Administrator','Edit all folders','Read only','No access'])}${submit('Save triage & access decision')}${run('Validate the safety review')}</form></div>`;
  }
  if (id==='SEC402') {
    const events=[['EVT-101','09:10','10.24.8.25','Teacher session success','info'],['EVT-102','09:12','198.51.100.24','18 authentication failures / 60 seconds','alert'],['EVT-103','09:13','198.51.100.24','Authentication success after failures','alert'],['EVT-104','09:14','10.24.8.25','HTTPS learning portal opened','info']];
    return `<form data-form="save-response"><section class="ws-panel"><div class="ws-section-label">SCHOOL GATEWAY / SYNTHETIC EVENT STREAM</div><h3>Correlate the suspicious sequence</h3><div class="ws-table-scroll" tabindex="0" role="region" aria-label="Scrollable synthetic security event table"><table class="ws-log-table"><caption>Select the two related events. All addresses and logs are simulated.</caption><thead><tr><th scope="col">Link</th><th scope="col">Event</th><th scope="col">Time</th><th scope="col">Source</th><th scope="col">Message</th></tr></thead><tbody>${events.map(([event,time,source,message,severity])=>`<tr class="ws-log-${severity}"><td><label class="ws-log-select"><input type="checkbox" name="events" value="${event}" aria-label="Correlate ${event}"${checked(state.events.includes(event))}></label></td><th scope="row">${event}</th><td>${time}</td><td><code>${source}</code></td><td>${message}</td></tr>`).join('')}</tbody></table></div><p class="ws-table-help">Scroll within the event table to read every column. Select the two events that belong to the same sequence.</p></section><div class="ws-two-col ws-margin-top"><section class="ws-panel"><h3>Containment policy</h3>${input('source','Temporarily block source IP',state.source,'Use the correlated log evidence')}${select('port','Close legacy listener',state.port,[['','Choose a port'],['23','TCP 23 · Telnet'],['443','TCP 443 · HTTPS'],['53','UDP 53 · DNS']])}${check('keepHttps','Keep classroom HTTPS on port 443 available','yes',state.keepHttps)}${submit('Apply defensive response')}</section><section class="ws-panel"><h3>Validate the change</h3><p>Contain the suspicious activity without removing the learning portal. Preserve the original logs for a human review.</p><p class="ws-muted">Blocking a source is a temporary defensive measure; these logs do not identify a person.</p>${run('Test containment & availability')}${terminal(state.tested?state.results.map(r=>`${r.ok?'OK  ':'FAIL'} ${r.label}`):['Policy mode: local simulation','Protected service: learning portal / TCP 443','Waiting for response validation…'])}</section></div></form>`;
  }
  const response=state.response;
  return `<section class="ws-scope"><div><b>AUTHORIZED TRAINING SCOPE</b><p>Only the two fictional records in this browser. No real accounts, endpoints, network requests, or security tools.</p></div><label class="ws-check"><input type="checkbox" data-scope${checked(state.scope)}><span>I understand and will stay within this simulation.</span></label></section><div class="ws-two-col"><section class="ws-panel"><div class="ws-section-label">LEARNDESK / FICTIONAL APP</div><h3>Record request inspector</h3><p class="ws-identity">Active session <code>learner-101</code></p><div class="ws-request-controls"><button class="ws-button" type="button" data-action="fetch-record" data-value="101"${!state.scope?' disabled':''}>Request own record · 101</button><button class="ws-button ws-button-secondary" type="button" data-action="fetch-record" data-value="102"${!state.scope?' disabled':''}>Request test record · 102</button></div>${response?`<div class="ws-response"><span class="ws-http-code ${response.status===403?'ws-http-denied':''}">HTTP ${response.status}</span><pre>${esc(response.body)}</pre></div>`:'<div class="ws-test-placeholder">Acknowledge scope, then inspect your own record and the supplied test record.</div>'}${terminal(state.history.length?state.history:['No simulated requests yet.'])}</section><form class="ws-panel" data-form="set-authorization"><h3>Patch the access policy</h3><p class="ws-muted">An interface choice is not a server-side access check.</p>${select('patch','Authorization rule',state.patch,[['none','Original: signed-in users can access all records'],['hidden','Hide other record links in the interface'],['owner','Server: require record.owner_id === user.id']])}${submit('Apply authorization patch')}<pre class="ws-code"><code>${esc(state.patch==='owner'?'if record.owner_id !== session.user_id:\n    return 403\nreturn 200, record':state.patch==='hidden'?'hide_other_record_links()\n# Server still returns any requested record\nreturn 200, record':'# Missing ownership check\nreturn 200, record')}</code></pre>${run('Retest allowed & denied access')}</form></div>`;
}

/** Render only documented, fixed simulation controls. All state changes go to onAction. */
export function renderWorkspace(root, scenario, state, onAction) {
  const code=normalize(scenario.id);
  const body=code.startsWith('NET')?network(code,state):code.startsWith('AI')?ai(code,state):code.startsWith('SEC')?security(code,state):'<p>This case is available in the hardware bench.</p>';
  root.innerHTML=`<div class="ws-desktop"><div class="ws-windowbar"><span class="ws-window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(scenario.id)} <span aria-hidden="true">/</span> ${esc(scenario.title)}</span><span class="ws-local-badge">LOCAL SIMULATION</span></div><div class="ws-body">${body}${results(state)}</div></div>`;
  root.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>onAction(button.dataset.action,button.dataset.value)));
  root.querySelector('[data-scope]')?.addEventListener('change',event=>onAction('acknowledge-scope',event.target.checked));
  root.querySelectorAll('[data-form]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(form);
    const value=Object.fromEntries(data.entries());
    for (const name of ['flags','events']) if (form.querySelector(`[name="${name}"]`)) value[name]=data.getAll(name);
    if (form.querySelector('[name="keepHttps"]')) value.keepHttps=data.has('keepHttps');
    if (form.dataset.form==='set-authorization') onAction('set-authorization',value.patch);
    else onAction(form.dataset.form,value);
  }));
}
