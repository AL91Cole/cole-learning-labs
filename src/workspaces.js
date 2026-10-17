import {supportsExpandedLab,initialExpandedState,normalizeExpandedState,applyExpandedAction,verifyExpanded,renderExpanded,getExpandedMission,expandedDiagnostic} from './expanded-labs.js?release=20261017-assembly12';
import {supportsCodingLab,initialCodingState,normalizeCodingState,applyCodingAction,verifyCoding,renderCoding,getCodingMission,codingDiagnostic} from './coding-lab.js?release=20261017-assembly12';
const normalize = id => typeof id === 'string' ? id.replaceAll('-', '').toUpperCase() : '';
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const outcome = (state, message, kind = 'info') => ({ state, message, kind });
const checked = value => value ? ' checked' : '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function initialWorkspaceState(id) {
  if(supportsExpandedLab(id))return initialExpandedState(id);if(supportsCodingLab(id))return initialCodingState(id);
  const code = normalize(id);
  const common = { tested: false, results: [], workspaceEdits: 0, checkRuns: 0 };
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
  return { ...common, ...(Object.hasOwn(states, code) ? states[code] : {}) };
}

/** Bound browser-saved data before it reaches the simulation or an HTML template. */
export function normalizeWorkspaceState(id, savedState) {
  if(supportsExpandedLab(id))return normalizeExpandedState(id,savedState);if(supportsCodingLab(id))return normalizeCodingState(id,savedState);
  const state = initialWorkspaceState(id);
  if (!isRecord(savedState)) return state;
  const enums = {
    network:['School-Guest','Staff-Lab'], folder:['All folders','Project Materials','No folders'], permission:['Full control','Modify','Read','None','Administrator','Edit all folders','Read only','No access'],
    recovery:['Keep current update','Roll back KB-LAB-17','Reset and erase files'], status:['Stopped','Running'], startup:['Disabled','Manual','Automatic'],
    ticketA:['unreviewed','Display / cable','Password reset','User effort'], ticketB:['unreviewed','Display / cable','Password reset','User effort'],
    secret:['hardcoded','environment'], query:['concatenated','parameterized'], authorization:['signed-in','hidden','owner'],
    message:['urgent','routine'], verdict:['unreviewed','safe','phishing'], port:['','23','443','53'], patch:['none','hidden','owner'], requested:['101','102']
  };
  for (const key of Object.keys(state)) {
    if (!Object.hasOwn(savedState, key)) continue;
    const value = savedState[key];
    if (typeof state[key] === 'boolean') { if (typeof value === 'boolean') state[key] = value; }
    else if (typeof state[key] === 'number') { if (Number.isSafeInteger(value) && value >= 0) state[key] = Math.min(value, 1000000); }
    else if (typeof state[key] === 'string') {
      if (typeof value !== 'string') continue;
      if (enums[key]) { if (enums[key].includes(value)) state[key] = value; }
      else state[key] = value.slice(0, key === 'prompt' ? 3000 : 64);
    }
  }
  if (Object.hasOwn(state, 'claims') && Object.hasOwn(savedState, 'claims') && Array.isArray(savedState.claims)) state.claims = state.claims.map((fallback, index) => ['unreviewed','supported','unsupported','biased'].includes(savedState.claims[index]) ? savedState.claims[index] : fallback);
  for (const [key, allowed] of Object.entries({ flags:['sender','destination','urgency'], events:['EVT-101','EVT-102','EVT-103','EVT-104'] })) {
    if (Object.hasOwn(state, key) && Object.hasOwn(savedState, key) && Array.isArray(savedState[key])) state[key] = [...new Set(savedState[key].filter(value => typeof value === 'string' && allowed.includes(value)))];
  }
  if (Object.hasOwn(state, 'audit') && Object.hasOwn(savedState, 'audit') && Array.isArray(savedState.audit)) state.audit = savedState.audit.filter(value => typeof value === 'string').slice(-20).map(value => value.slice(0, 300));
  if (Object.hasOwn(state, 'history') && Object.hasOwn(savedState, 'history') && Array.isArray(savedState.history)) state.history = savedState.history.filter(value => typeof value === 'string').slice(-8).map(value => value.slice(0, 300));
  if (Object.hasOwn(state, 'response') && Object.hasOwn(savedState, 'response') && isRecord(savedState.response)) {
    const response = savedState.response;
    if (Object.hasOwn(response, 'status') && [200, 403].includes(response.status) && Object.hasOwn(response, 'id') && ['101','102'].includes(response.id) && Object.hasOwn(response, 'body') && typeof response.body === 'string') {
      state.response = { status:response.status, id:response.id, owner:`learner-${response.id}`, body:response.body.slice(0, 2000) };
    }
  }
  // Result labels are generated from the current model, never trusted from storage.
  state.results = state.tested ? testMatrix(id, state) : [];
  return state;
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
      {label:'Default gateway matches the assigned VLAN 8 router',ok:state.ip==='10.24.8.25' && state.mask==='255.255.255.0' && state.gateway==='10.24.8.1'},
      {label:'learn.school.test resolves through school DNS',ok:state.ip==='10.24.8.25' && state.mask==='255.255.255.0' && state.dns==='10.24.8.53'}
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

const COACH = {
  NET201: {
    concept:'A connected cable does not prove that addressing or name resolution works. Test the workstation, then the gateway, then the name.',
    checks:[
      ['Start with the workstation address and subnet mask. Compare both with the VLAN 8 configuration sheet.','The workstation must use the assigned address within the lab subnet.','Enter IP 10.24.8.25 and mask 255.255.255.0, then apply the settings.'],
      ['The workstation address is ready. Check which device should route traffic out of its subnet.','A default gateway is the router on the same local subnet.','Set the default gateway to 10.24.8.1. Apply, then choose Test connection again.'],
      ['Local connectivity is ready. Check the server used to turn the portal name into an address.','DNS is separate from the gateway; use the server on the configuration sheet.','Set preferred DNS to 10.24.8.53. Save, then choose Test connection again.']
    ]
  },
  NET202: {
    concept:'Separate the network path from the permission decision. Reach the right service, then give the account only the access its task needs.',
    checks:[
      ['Check the connected network before broadening file permissions.','The guest network intentionally cannot reach internal staff shares.','Choose Staff-Lab, apply the settings, and test teacher access.'],
      ['The network path is ready. Narrow the share to the requested resource.','The request names one folder, not every folder on the workstation.','Set share scope to Project Materials. Apply and test again.'],
      ['The requested folder is available. Match the permission to reading a handout.','Reading a document does not require editing, full control, or administrator rights.','Choose Read, apply the policy, then choose Test teacher access.']
    ]
  },
  NET203: {
    concept:'Recovery should preserve useful work. Verify the boot repair and the update service separately so a temporary fix does not leave a second problem.',
    checks:[
      ['Use the boot event and the last known good snapshot to choose a reversible repair.','The failure began after the fictional KB-LAB-17 update. A rollback is available.','Choose Roll back KB-LAB-17. Keep classroom files and apply the plan.'],
      ['Revisit the recovery choice: the task requires keeping classroom documents.','An erase-and-reset action destroys work the teacher still needs.','Use Roll back KB-LAB-17 instead of resetting and erasing files, then test recovery.'],
      ['Startup recovery is ready. Inspect both the update service status and startup type.','Running now and starting after the next boot are two different requirements.','Set the service to Running and its startup type to Automatic. Save and choose Test startup and updates.']
    ]
  },
  AI301: {
    concept:'A helpful prompt states the learning task without exposing a learner. A rule check is a starting point; a person still reviews privacy and accuracy.',
    checks:[
      ['Describe an imaginary learner rather than a real student.','The task works without identifying any person. State that the situation is fictional or anonymous.','Begin with “For a fictional learner…” and keep the rest focused on computer networks.'],
      ['Remove unnecessary private details from the prompt.','Look for names, email placeholders, diagnoses, passwords, or other identifying details.','Delete the student name, email, and diagnosis placeholders. Ask for help with the topic without those details.'],
      ['Make the expected explanation clear enough to check.','Name computer networks and ask for a short or simple explanation.','Ask for “a short explanation of computer networks,” then save the revised prompt.'],
      ['Add a way for the learner to practise the idea.','A practice question helps the learner try the concept rather than only read an answer.','Include “one practice question” in the prompt. Save it before checking the rules.'],
      ['Keep a human accuracy check in the learning task.','An AI answer can sound confident and still be wrong. Use class notes as the reference.','Ask the learner to “verify the explanation against class notes.” Save and rerun the rules.']
    ]
  },
  AI302: {
    concept:'Judge a claim by its source, then compare matching examples. Confidence or a person’s name is not evidence for a technical decision.',
    checks:[
      ['Compare claim 1 with source card v4.2.','The source explicitly says to check the display cable first.','Mark claim 1 Supported by source, save the findings, and validate the review.'],
      ['Look for a source that supports the 90-day password claim.','The supplied guide gives no password-expiration policy. Missing evidence is different from a verified rule.','Mark claim 2 Unsupported by source. Do not treat the invented policy as confirmed.'],
      ['Separate technical evidence from a guess about a person.','A name does not show how much effort a learner made. The guide does not support this judgement.','Mark claim 3 Unsupported personal judgement / bias. Save and validate the review.'],
      ['Compare the two tickets without using their names.','Both monitors have power and both HDMI cables are disconnected. Their technical category should match.','Choose Display / cable for both tickets, save the findings, and validate the source and fairness review.']
    ]
  },
  AI303: {
    concept:'Working code still needs a security review. Check secrets, data handling, and permission decisions independently, then test the selected patterns.',
    checks:[
      ['Review where the example stores its key and what happens if the key is missing.','A key embedded in source can leak with the source. Missing configuration should fail safely.','Choose Read environment; fail if missing, apply the review choices, and run the regression tests.'],
      ['Inspect how the query separates its instructions from user-supplied data.','Concatenating input into SQL mixes data with query structure. A separate parameter keeps that boundary.','Choose Use a parameterized query. Apply the patch and rerun the fixed test matrix.'],
      ['Check whether being signed in is enough to read someone else’s record.','Authentication identifies a user; authorization checks whether that user may access this particular record.','Choose Check record owner on every request. Save and test both the owner and another user.']
    ]
  },
  SEC401: {
    concept:'Inspect a message before acting on its pressure. Record specific warning signs and use the approved reporting process; do not reply with credentials.',
    checks:[
      ['Read the sender and destination of the urgent verification message.','The claimed school identity and the displayed .test domain do not match. Treat the credential demand as suspicious.','Choose Phishing — report through approved process. Save the triage decision.'],
      ['Document the evidence that supports the report.','The sender domain and the text-only destination both differ from the school portal.','Select both the sender-domain and destination warning signs, then save the triage.'],
      ['Check how the message tries to rush the reader.','The threatened 10-minute deadline pressures someone to skip a careful check. Urgency alone is not proof, but it is relevant evidence here.','Record the threatening time limit as a pressure tactic, then save and validate.'],
      ['Review the helper’s actual task before choosing an access level.','A helper reading a checklist does not need editing or administrator permissions.','Choose Read only for checklist access. Save and validate the safety review.']
    ]
  },
  SEC402: {
    concept:'Connect events through time and shared evidence. Make a narrow defensive change, then verify that legitimate classroom work still functions.',
    checks:[
      ['Find the repeated failures and the later success from the same source.','Read the timestamps and source column. Routine teacher and HTTPS events are context, not the suspicious pair.','Select EVT-102 and EVT-103 only. Save the defensive response and test it.'],
      ['Base the temporary block on the correlated source, not a familiar classroom address.','Both suspicious events use the documentation address 198.51.100.24.','Enter 198.51.100.24 as the temporary blocked source. Apply and test the response.'],
      ['Match the legacy service with its port before changing the policy.','Telnet is the unnecessary legacy listener. The HTTPS learning portal must remain available.','Close TCP 23 · Telnet. Keep HTTPS enabled, apply the policy, and test again.'],
      ['Check the effect of containment on legitimate learning access.','Blocking suspicious activity should not also disable the classroom portal.','Keep classroom HTTPS on port 443 available, then apply and validate the response.']
    ]
  },
  SEC403: {
    concept:'Permission comes before testing. Show the defect only in the supplied fictional records, then prove the patch allows the owner and denies another learner.',
    checks:[
      ['Read the authorization statement before making a request.','Permission applies only to these two built-in fictional records. It does not cover any real school system.','Acknowledge this simulation scope. Then request your own record 101 and the supplied test record 102.'],
      ['Capture the original behavior before applying the ownership patch.','The original rule returns record 102 to learner-101 even though learner-102 owns it. That is the defect to document.','With the Original policy selected, request test record 102 and note HTTP 200. Then apply the server-side ownership check.'],
      ['A secure repair must keep the owner’s legitimate access working.','Hiding a link does not enforce a permission rule on the server. Compare the record owner with the active user.','Choose Server: require record.owner_id === user.id. Apply the patch and retest allowed and denied access.'],
      ['Retest access to the other learner’s record after the patch.','The owner should receive 200 for record 101. The same user must receive 403 for record 102.','Use the server-side ownership rule, then run Test both records and record both results.']
    ]
  }
};

/** Read-only learning feedback. Only actual, current tests count as passing checks. */
export function getWorkspaceMission(id, savedState) {
  if(supportsExpandedLab(id))return getExpandedMission(id,savedState);if(supportsCodingLab(id))return getCodingMission(id,savedState);
  const state=normalizeWorkspaceState(id,savedState);
  const checks=testMatrix(id,state);
  const tested=Boolean(state.tested);
  const passed=tested?checks.filter(check=>check.ok).length:0;
  const complete=tested && checks.length>0 && passed===checks.length;
  const currentCheck=checks.findIndex(check=>!check.ok);
  const coach=COACH[normalize(id)];
  const target=currentCheck<0?null:coach?.checks[currentCheck];
  const changed=(Number(state.workspaceEdits)||0)>0;
  const stage=complete?'Verified':tested?'Troubleshoot':changed?'Ready to test':'Investigate';
  const next=complete?'Choose Check & explain, then Check the original task. Explain which results support your decision in your report.':currentCheck<0?'Your saved choices are ready to check. Run the workspace test to gather evidence.':target?.[0] || 'Inspect the request, apply a change, and test its effect.';
  return {
    stage,tested,passed,total:checks.length,complete,currentCheck,
    attempts:Math.max(0,Number(state.checkRuns)||0),
    next,
    hints:[coach?.concept || 'Use the supplied evidence and test one explanation at a time.',target?.[1] || 'A saved setting is not a tested result. Read the output before deciding the task is fixed.',target?.[2] || 'Run the workspace check. If all checks pass, verify the original task and explain the result.']
  };
}

function missionPanel(id,state) {
  const mission=getWorkspaceMission(id,state);
  const title={Investigate:'Start here',Troubleshoot:'Try another change',Verified:'Checks passed'}[mission.stage] || mission.stage;
  return `<section class="ws-mission" aria-label="Current mission progress"><div class="ws-mission-top"><div><span class="ws-section-label">YOUR NEXT STEP</span><h3>${esc(title)}</h3></div><span class="ws-mission-count">${mission.tested?`${mission.passed} / ${mission.total} checks passing`:'No test yet'}</span></div><progress class="ws-mission-progress" value="${mission.passed}" max="${mission.total || 1}" aria-label="Checks passing in the latest test">${mission.passed} of ${mission.total}</progress><p class="ws-mission-next"><b>${mission.complete?'Next:':'Try next:'}</b> ${esc(mission.next)}</p><details class="ws-coach"><summary>Need help? Open a hint <span>Optional</span></summary><div class="ws-coach-content"><p><b>1 · Think about the idea</b>${esc(mission.hints[0])}</p><details><summary>Show another hint</summary><p><b>2 · Look at this evidence</b>${esc(mission.hints[1])}</p><details><summary>Show a suggested next step</summary><p><b>3 · Try and explain</b>${esc(mission.hints[2])}</p></details></details><small>Written hints for this fictional lab. Opening a hint does not change settings, pass a check, or submit your work.</small></div></details></section>`;
}

// These instructions explain the controls, not the answer to the case.
const WORKSPACE_GUIDES = {
  NET201: [
    ['Compare', 'Read the setup sheet beside the PC settings.'],
    ['Change', 'Edit the network fields, then choose “Save network settings”.'],
    ['Test', 'Choose “Test connection”. Read the results before trying another change.']
  ],
  NET202: [
    ['Read', 'Find the requested folder and what the teacher needs to do.'],
    ['Choose', 'Set the three menus, then choose “Save access settings”.'],
    ['Test', 'Choose “Test teacher access” and read what the account can do.']
  ],
  NET203: [
    ['Inspect', 'Read the startup message and recovery preview.'],
    ['Choose', 'Set the three menus, then choose “Save recovery plan”.'],
    ['Test', 'Choose “Test startup and updates”. Check the files and update service.']
  ],
  AI301: [
    ['Read', 'Read the writing task. Use imaginary information only.'],
    ['Write', 'Revise the text box, then choose “Save prompt”.'],
    ['Check', 'Choose “Check my prompt”. Use the feedback to revise and check again.']
  ],
  AI302: [
    ['Compare', 'Read the source card, AI claims, and two matching tickets.'],
    ['Review', 'Choose a finding for each claim and both ticket categories. Choose “Save my review”.'],
    ['Check', 'Choose “Check my review”. Revisit any result that needs another look.']
  ],
  AI303: [
    ['Read', 'Inspect the code preview. You do not need to type or run code.'],
    ['Choose', 'Set the three menus, then choose “Save code choices”.'],
    ['Test', 'Choose “Test code choices”. Compare the results with the updated preview.']
  ],
  SEC401: [
    ['Inspect', 'Open both messages. Read each sender and text-only destination; message links are inactive.'],
    ['Decide', 'Choose a verdict, evidence, and checklist access. Choose “Save message review”.'],
    ['Check', 'Choose “Check my review”. Use message details to explain your decision.']
  ],
  SEC402: [
    ['Inspect', 'Compare times and source addresses. Select two related log events.'],
    ['Plan', 'Choose a defensive change, then choose “Save response plan”.'],
    ['Test', 'Choose “Test response plan”. Check that the learning portal still works.']
  ],
  SEC403: [
    ['Check the scope', 'Read the scope statement and check the box. Use only these two fictional records.'],
    ['Try and change', 'Try both record buttons first. Choose a rule, then choose “Save access rule”.'],
    ['Test', 'Choose “Test both records”. Compare the allowed and denied results.']
  ]
};

function workspaceGuide(id) {
  const steps = WORKSPACE_GUIDES[normalize(id)];
  if (!steps) return '';
  return `<section class="ws-start" aria-label="How to use this lab"><h3>Use this workbench <span>Read → change → test</span></h3><div class="ws-start-content"><ol>${steps.map(([title,text])=>`<li><b>${esc(title)}</b><span>${esc(text)}</span></li>`).join('')}</ol><p>Save updates the model; Test checks it. Neither button submits work to a teacher. Next, open 3. Check &amp; explain.</p></div></section>`;
}

const WORKSPACE_TOOLS = {
  NET201:{title:'Workstation diagnostic console',commands:['ipconfig','ping 10.24.8.1','nslookup learn.school.test']},
  NET202:{title:'Shared-folder access console',commands:['ipconfig','net use','read handout','write handout']},
  NET203:{title:'Recovery and service console',commands:['boot status','service school-update','list classroom-files']},
  AI301:{title:'Fictional response preview',commands:['preview response','inspect privacy']},
  AI302:{title:'Evidence review desk',commands:['open source','compare tickets']},
  AI303:{title:'Code-review request console',commands:['inspect key','inspect query','request own','request other']},
  SEC401:{title:'Message inspection tools',commands:['inspect sender','inspect link','inspect headers']},
  SEC402:{title:'Gateway investigation console',commands:['show listeners','probe portal','inspect source']},
  SEC403:{title:'Practice application inspector',commands:['show session','inspect rule']}
};
const inspectionViews = new WeakMap();
const address = value => typeof value==='string' && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every(part=>Number(part)<=255) ? value : 'Invalid address';

/** Fixed local observations only: no shell, code execution, network, or state mutation. */
export function workspaceDiagnostic(id, savedState, command) {
  if(supportsExpandedLab(id))return expandedDiagnostic(id,savedState,command);
  if(supportsCodingLab(id))return codingDiagnostic(id,savedState,command);
  const code=normalize(id), tools=WORKSPACE_TOOLS[code];
  if (!tools) return 'No software inspection tools are available for this case.';
  if (typeof command!=='string' || command.length>96 || /[\r\n]/.test(command)) return 'Use one of the displayed practice tools. Real targets and other commands are outside this simulation.';
  const key=command.trim().toLowerCase().replace(/\s+/g,' ');
  if (key==='help') return `Available practice tools: ${tools.commands.join(' · ')}. Inspect the saved settings; save changes before inspecting again. These tools do not complete the workspace test.`;
  if (!tools.commands.includes(key)) return 'Use one of the displayed practice tools. Real targets and other commands are outside this simulation.';
  const state=normalizeWorkspaceState(id,savedState);
  let output='';
  if (code==='NET201') {
    const local=state.ip==='10.24.8.25' && state.mask==='255.255.255.0';
    if (key==='ipconfig') output=`LAB-PC-12 · saved adapter configuration\nIPv4: ${address(state.ip)}\nSubnet mask: ${address(state.mask)}\nDefault gateway: ${address(state.gateway)}\nDNS: ${address(state.dns)}\nPhysical link: up · VLAN 8\nAn active link does not prove that the configuration is correct.`;
    if (key==='ping 10.24.8.1') output=local?'Simulated ping 10.24.8.1\nReply from 10.24.8.1: bytes=32 time=1ms TTL=64\nPackets: sent=4 received=4 lost=0\nThis local-subnet reply does not prove the default gateway field or DNS is configured correctly. Compare ipconfig with the setup sheet.':'Simulated ping 10.24.8.1\nDestination unreachable in this fixed VLAN 8 practice model.\nPackets: sent=4 received=0 lost=4\nCompare the workstation address and subnet mask with the setup sheet.';
    if (key==='nslookup learn.school.test') output=local && state.dns==='10.24.8.53'?'Simulated DNS lookup\nServer: 10.24.8.53\nName: learn.school.test\nAddress: 10.24.8.80\nThe local fictional DNS server answers. This does not test the default gateway or prove that a web page has opened.':'Simulated DNS lookup\nNo answer for learn.school.test.\nCheck the saved workstation address, subnet mask, and preferred DNS server in this fixed practice model. A successful ping alone does not prove name resolution.';
  } else if (code==='NET202') {
    const reachable=state.network==='Staff-Lab', folder=state.folder==='Project Materials' || state.folder==='All folders';
    const readable=reachable && folder && ['Read','Modify','Full control'].includes(state.permission);
    if (key==='ipconfig') output=`Training adapter\nNetwork: ${state.network}\nLink: connected\nInternal staff share route: ${reachable?'available':'isolated by guest network policy'}\nThe account in this console is fictional teacher-training.`;
    if (key==='net use') output=`Share policy preview\nNetwork: ${state.network}\nShare scope: ${state.folder}\nPermission: ${state.permission}\nProject Materials: ${reachable && folder?'reachable':'not reachable'}\nThis preview does not change permissions.`;
    if (key==='read handout') output=readable?'OPEN /shares/project-materials/handout.txt\nFictional handout: draw the workstation, switch, gateway, and DNS path.\nResult: read allowed. Check whether the share also exposes unrelated folders or unnecessary edit rights.':'OPEN /shares/project-materials/handout.txt\nResult: unavailable or access denied.\nCheck the network path, shared folder, and read permission separately.';
    if (key==='write handout') output=reachable && folder && ['Modify','Full control'].includes(state.permission)?'SIMULATED WRITE /shares/project-materials/handout.txt\nResult: edit allowed. No file was changed.\nThe teacher requested reading a handout; editing is unnecessary access.':'SIMULATED WRITE /shares/project-materials/handout.txt\nResult: edit denied. No file was changed.\nA read-only task should not require editing. Test reading separately.';
  } else if (code==='NET203') {
    if (key==='boot status') output=`STUDIO-PC-04 · simulated startup\n${state.recovery==='Roll back KB-LAB-17'?'Last known good update restored. OS reaches the classroom desktop.':state.recovery==='Reset and erase files'?'Reset reaches a fresh desktop, but classroom documents have been erased.':'BOOT-31: startup still stops after KB-LAB-17.'}\nThis inspection does not run the full recovery test.`;
    if (key==='service school-update') output=`SERVICE: School Update\nStatus: ${state.status}\nStartup type: ${state.startup}\n${state.status==='Running'?'The service is running now.':'The service is not running now.'}\n${state.startup==='Automatic'?'It is configured to start automatically after a restart.':'It is not configured for automatic startup.'}`;
    if (key==='list classroom-files') output=state.recovery==='Reset and erase files'?'Classroom Documents\nNo files remain after the simulated erase-and-reset choice.\nThe task requires preserving existing work.':'Classroom Documents\nlesson-plan.docx · project-notes.txt · class-slides.pptx\nAll three fictional files are preserved by the selected recovery plan.';
  } else if (code==='AI301') {
    if (key==='inspect privacy') output=`Local rule review · saved prompt\nFictional context stated: ${promptChecks(state.prompt)[0].ok?'yes':'not detected'}\nPrivate-data warning: ${promptChecks(state.prompt)[1].ok?'no listed pattern detected':'listed sensitive pattern detected'}\nThis limited rule checker cannot prove the absence of personal information. Review the complete prompt yourself.`;
    if (key==='preview response') output=promptChecks(state.prompt).every(check=>check.ok)?'SCRIPTED PRACTICE RESPONSE · not a live AI model\nA computer network connects devices so they can exchange data and share resources.\nPractice: which device forwards traffic between networks?\nCompare this explanation with your class notes before using it.':'SCRIPTED PRACTICE RESPONSE · not a live AI model\nThis saved prompt still needs review. Inspect its privacy patterns and check whether it asks for a short explanation, practice question, and comparison with class notes. No prompt is sent anywhere.';
  } else if (code==='AI302') {
    if (key==='open source') output='SOURCE CARD v4.2\nCheck the display cable first. Record the test result.\nNo supplied source establishes a password-expiration rule or a judgement about a learner’s effort. Compare each claim with what the source actually states.';
    if (key==='compare tickets') output='SIDE-BY-SIDE TECHNICAL EVIDENCE\nTicket A: monitor has power; HDMI cable disconnected.\nTicket B: monitor has power; HDMI cable disconnected.\nThe names differ; the technical symptoms are the same. Choose categories from evidence, then save your review.';
  } else if (code==='AI303') {
    if (key==='inspect key') output=state.secret==='environment'?'MISSING-KEY PREVIEW\nKey is read from environment configuration. A missing key raises an error before use.\nNo real secret or environment is read in this lab.':'SOURCE PREVIEW\nA placeholder key is embedded in the example source. Real embedded keys can leak when source is shared.\nNo real secret is present or used.';
    if (key==='inspect query') output=state.query==='parameterized'?'QUERY PREVIEW\nSQL instructions use a fixed placeholder; record_id is passed as a separate parameter.\nNo database or submitted SQL is executed.':'QUERY PREVIEW\nThe draft concatenates record_id into the SQL instruction string. Input can change the query structure.\nNo database or submitted SQL is executed.';
    if (key==='request own') output='SIMULATED GET /records/101 · learner-101\nHTTP 200 · the owner’s fictional practice record is available.\nTest another user as well; a successful owner request alone cannot establish safe authorization.';
    if (key==='request other') output=state.authorization==='owner'?'SIMULATED GET /records/102 · learner-101\nHTTP 403 · the selected ownership check denies another learner’s fictional record.':'SIMULATED GET /records/102 · learner-101\nHTTP 200 · another learner’s fictional record is exposed.\nSigning in or hiding a link does not enforce ownership on the server.';
  } else if (code==='SEC401') {
    const urgent=state.message!=='routine';
    if (key==='inspect sender') output=`SELECTED MESSAGE · sender inspection\nFrom: ${urgent?'verify@school-account-check.test':'helpdesk@school.test'}\nClaimed school domain: school.test\n${urgent?'The displayed sender domain differs from the claimed school domain.':'The displayed sender matches the school.test training domain. That alone does not prove a real message is safe.'}`;
    if (key==='inspect link') output=`SELECTED MESSAGE · text-only destination\n${urgent?'https://school-account-check.test/verify':'https://portal.school.test/checklist'}\n${urgent?'The destination requests credentials outside the school.test portal.':'The displayed destination is a fictional school portal; open real resources through an approved bookmark.'}\nNo link was opened and no request was made.`;
    if (key==='inspect headers') output=`SIMULATED MESSAGE HEADERS\nFrom: ${urgent?'verify@school-account-check.test':'helpdesk@school.test'}\nReply-To: ${urgent?'verify@school-account-check.test':'helpdesk@school.test'}\nAuthentication results: not supplied by this training message\nA sender address or padlock is not proof of trust. Use the supplied message evidence and approved reporting process.`;
  } else if (code==='SEC402') {
    if (key==='show listeners') output=`SAVED GATEWAY POLICY · fictional listeners\nTCP 23 / Telnet: ${state.port==='23'?'closed':'open'}\nTCP 443 / learning portal: ${state.keepHttps && state.port!=='443'?'available':'unavailable'}\nUDP 53 / DNS: ${state.port==='53'?'closed':'available'}\nInspect the effect on the needed service as well as the suspicious activity.`;
    if (key==='probe portal') output=state.keepHttps && state.port!=='443'?'SIMULATED PORTAL PROBE\nHTTPS / TCP 443 → HTTP 200\nThe classroom learning portal remains available in the selected policy. This does not prove that the suspicious source was contained.':'SIMULATED PORTAL PROBE\nHTTPS / TCP 443 → unavailable\nThe selected response interrupts the learning portal. Review which service the task requires preserving.';
    if (key==='inspect source') output=`CORRELATED SOURCE REVIEW\n198.51.100.24: 18 failures at 09:12, then success at 09:13.\nSaved block: ${address(state.source)}\nSuspicious source contained: ${state.source==='198.51.100.24'?'yes':'no'}\nDocumentation addresses and synthetic events only. The logs do not establish a person’s identity.`;
  } else if (code==='SEC403') {
    if (key==='show session') output='FICTIONAL SESSION\nActive account: learner-101\nOwn record: 101 · supplied test record: 102\nInspecting the session does not request a record or reproduce a defect. Use the scoped record buttons for those observations.';
    if (key==='inspect rule') output=`CURRENT ACCESS RULE\n${state.patch==='owner'?'The simulated server compares the record owner with learner-101 before returning a record.':state.patch==='hidden'?'Other record links are hidden, but the simulated server still returns records without checking ownership.':'The simulated server returns records to a signed-in user without checking ownership.'}\nScope acknowledged: ${state.scope?'yes':'no'}. Run the scoped requests and full test separately.`;
  }
  return output.slice(0,600);
}

function inspectionPanel(id) {
  const tools=WORKSPACE_TOOLS[normalize(id)];
  if (!tools) return '';
  return `<section class="ws-inspector" aria-label="Hands-on practice tools"><div class="ws-inspector-heading"><div><span class="ws-section-label">TRY A TOOL · READ THE RESULT</span><h3>${esc(tools.title)}</h3></div><span class="ws-simulation-label">LOCAL SIMULATION</span></div><p>Tap a tool or type a command below. It reads your <b>saved choices</b>; save changes first. Inspecting does not change settings, complete a test, or submit work.</p><div class="ws-tool-buttons">${tools.commands.map(command=>`<button class="ws-button ws-button-secondary" type="button" data-inspect="${esc(command)}">${esc(command)}</button>`).join('')}</div><form class="ws-command-form" data-inspect-form><label class="ws-field"><span>Practice command <small>Use a tool above or type help. No real targets or personal information.</small></span><input name="command" maxlength="96" placeholder="help" autocomplete="off" spellcheck="false" autocapitalize="none"></label><button class="ws-button" type="submit">Run practice tool</button></form><pre class="ws-inspector-output" data-inspection-output role="status" aria-live="polite" aria-atomic="true">Choose a tool to inspect the current practice setup. No system command or network request runs.</pre></section>`;
}

export function applyWorkspaceAction(id, previous, action, value) {
  if(supportsExpandedLab(id))return applyExpandedAction(id,previous,action,value);
  if(supportsCodingLab(id))return applyCodingAction(id,previous,action,value);
  const state = normalizeWorkspaceState(id,previous);
  const data = isRecord(value) ? value : {};
  const code = normalize(id);
  if (action==='inspect-command') return outcome(state,workspaceDiagnostic(id,state,data.command));
  const save = (properties, message) => { Object.assign(state, properties); state.tested=false; state.results=[]; state.workspaceEdits+=1; return outcome(normalizeWorkspaceState(id,state),message); };
  if (action==='save-network' && code==='NET201') {
    const values=Object.fromEntries(['ip','mask','gateway','dns'].map(key=>[key,typeof data[key] === 'string' ? data[key].trim() : '']));
    return save(values,'Network settings saved. Choose Test connection and read the results.');
  }
  if (action==='save-access' && code==='NET202') return save({network:data.network,folder:data.folder,permission:data.permission},'Access settings saved. Choose Test teacher access next.');
  if (action==='save-recovery' && code==='NET203') return save({recovery:data.recovery,status:data.status,startup:data.startup},'Recovery plan saved in the simulation. Choose Test startup and updates.');
  if (action==='save-prompt' && code==='AI301') return save({prompt:typeof data.prompt === 'string' ? data.prompt.slice(0,3000) : ''},'Prompt saved for this session. Choose Check my prompt and read each result.');
  if (action==='save-claims' && code==='AI302') return save({claims:[data.claim0,data.claim1,data.claim2],ticketA:data.ticketA,ticketB:data.ticketB},'Review saved. Choose Check my review and compare the results with the source.');
  if (action==='save-code' && code==='AI303') return save({secret:data.secret,query:data.query,authorization:data.authorization},'Code choices saved in the preview. Choose Test code choices.');
  if (action==='view-message' && code==='SEC401') { state.message=value==='routine'?'routine':'urgent'; return outcome(state,'Text-only message opened. No link was followed.'); }
  if (action==='save-triage' && code==='SEC401') return save({verdict:data.verdict,flags:Array.isArray(data.flags)?data.flags:[],permission:data.permission},'Message review saved. Choose Check my review to check both decisions.');
  if (action==='save-response' && code==='SEC402') return save({events:Array.isArray(data.events)?data.events:[],source:typeof data.source === 'string' ? data.source.trim() : '',port:typeof data.port === 'string' ? data.port.trim() : '',keepHttps:data.keepHttps===true},'Response plan saved. Choose Test response plan to check the change and the learning portal.');
  if (code==='SEC403') {
    if (action==='acknowledge-scope') { state.scope=value===true; state.tested=false; state.results=[]; return outcome(state,state.scope?'Scope acknowledged. Only the two built-in records are available.':'Scope acknowledgement removed. Requests are locked.'); }
    if (!state.scope && ['fetch-record','set-authorization','run-check'].includes(action)) return outcome(state,'Read and acknowledge the simulation scope before making a request.','warning');
    if (action==='fetch-record') {
      const requested = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
      if (!['101','102'].includes(requested)) return outcome(state,'Only record 101 and record 102 are inside this authorized simulation.','warning');
      state.requested=requested;
      const denied=state.patch==='owner' && state.requested==='102';
      state.response={status:denied?403:200,id:state.requested,owner:`learner-${state.requested}`,body:denied?'Access denied: this record belongs to another learner.':`Fictional learner ${state.requested} · Practice task: network diagram · Status: submitted`};
      if (!denied && state.requested==='102' && state.patch!=='owner') state.observed=true;
      state.history.push(`GET /records/${state.requested} → ${state.response.status}`);
      state.history=state.history.slice(-8);
      return outcome(state,denied?'403: the ownership check blocked another learner’s record.':state.requested==='102'?'200: the original app exposed another learner’s fictional record. Record this authorization defect.':'200: your own fictional record is accessible.',denied?'success':state.requested==='102'?'warning':'info');
    }
    if (action==='set-authorization') return save({patch:value==='owner'?'owner':value==='hidden'?'hidden':'none',response:null},'Access rule saved. Choose Test both records with the same active user.');
  }
  if (action==='run-check') {
    state.results=testMatrix(id,state); state.tested=true; state.checkRuns+=1;
    const passed=state.results.length>0 && state.results.every(result=>result.ok);
    const mission=getWorkspaceMission(id,state);
    return outcome(state,passed?`All ${mission.total} practice checks passed. Choose Check & explain, check the original task, then finish your report.`:`${mission.passed} of ${mission.total} checks pass. ${mission.next} Save your change and test again.`,passed?'success':'warning');
  }
  return outcome(state,'That action is not available in this workspace.','warning');
}

export function verifyWorkspace(id, state) {
  if(supportsExpandedLab(id))return verifyExpanded(id,state);
  if(supportsCodingLab(id))return verifyCoding(id,state);
  state = normalizeWorkspaceState(id, state);
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
const submit = (label='Save choices') => `<button class="ws-button" type="submit">${label}</button>`;
const run = (label='Test my choices') => `<button class="ws-button ws-button-test" type="button" data-action="run-check">${label}</button>`;
function results(state) {
  if (!state.tested) return '<div class="ws-test-placeholder"><span class="ws-status-dot" aria-hidden="true"></span><span>No current test results. Save your choices, then use the Test or Check button. Test again after every change.</span></div>';
  const complete=state.results.length>0 && state.results.every(item=>item.ok);
  return `<section class="ws-test-results" aria-label="Simulation test results"><h3>Your latest test results</h3><p>${complete?'All checks passed. Choose “Check & explain”, then “Check the original task”.':'A “Try again” result is a clue. Change your choices, save, and test again.'}</p><ul>${state.results.map(item=>`<li class="${item.ok?'ws-pass':'ws-fail'}"><span>${item.ok?'Passed':'Try again'}</span>${esc(item.label)}</li>`).join('')}</ul></section>`;
}
function terminal(lines) { return `<div class="ws-terminal" aria-label="Simulated console"><div class="ws-console-heading">LOCAL SIMULATION OUTPUT</div>${lines.map(line=>`<div>${esc(line)}</div>`).join('')}</div>`; }
function recoveryConsole(state) {
  const recovered=state.recovery==='Roll back KB-LAB-17', erased=state.recovery==='Reset and erase files';
  return terminal([
    recovered?'BOOT      Classroom desktop loaded after rollback':erased?'BOOT      Fresh desktop loaded after reset':'BOOT-31   Startup blocked after KB-LAB-17',
    'Snapshot  Last known good state available',
    erased?'Files     Classroom documents erased':'Files     Classroom documents intact',
    `Service   School Update: ${state.status} / ${state.startup}`,
    'Preview   Saved choices only; run the full test separately'
  ]);
}
function network(id,state) {
  if (id==='NET201') return `<div class="ws-topology" aria-label="Lab network diagram"><div><span aria-hidden="true">▣</span><button type="button" class="ws-device-control" data-inspect="ipconfig">Inspect LAB-PC-12</button><small>${esc(state.ip)}</small></div><i aria-hidden="true"></i><div><span aria-hidden="true">▥</span><b>LAB SWITCH</b><small>Link up · VLAN 8</small></div><i aria-hidden="true"></i><div><span aria-hidden="true">◉</span><button type="button" class="ws-device-control" data-inspect="ping 10.24.8.1">Test gateway</button><small>10.24.8.1</small></div><div class="ws-dns-node"><span aria-hidden="true">⌘</span><button type="button" class="ws-device-control" data-inspect="nslookup learn.school.test">Query school DNS</button><small>10.24.8.53</small></div></div><div class="ws-two-col"><form class="ws-panel" data-form="save-network"><h3>Change network settings</h3><div class="ws-fields">${input('ip','IP address',state.ip)}${input('mask','Subnet mask',state.mask)}${input('gateway','Default gateway',state.gateway)}${input('dns','Preferred DNS server',state.dns)}</div>${submit('Save network settings')}</form><section class="ws-panel"><div class="ws-section-label">CONFIGURATION SHEET / VLAN 8</div><h3>Library workstation</h3><dl class="ws-key-values"><dt>Workstation</dt><dd>10.24.8.25</dd><dt>Subnet mask</dt><dd>255.255.255.0</dd><dt>Gateway</dt><dd>10.24.8.1</dd><dt>DNS</dt><dd>10.24.8.53</dd><dt>Portal</dt><dd>learn.school.test</dd></dl>${run('Test connection')}${terminal(state.tested?state.results.map(r=>`${r.ok?'OK  ':'FAIL'} ${r.label}`):['Adapter connected · physical link available','Waiting for a diagnostic run…'])}</section></div>`;
  if (id==='NET202') return `<div class="ws-two-col"><form class="ws-panel" data-form="save-access"><h3>Choose network and folder access</h3><div class="ws-fields">${select('network','Connected network',state.network,['School-Guest','Staff-Lab'])}${select('folder','Folder to share',state.folder,['All folders','Project Materials','No folders'])}${select('permission','What the teacher can do',state.permission,['Full control','Modify','Read','None'])}</div>${submit('Save access settings')}</form><section class="ws-panel"><div class="ws-section-label">ACCESS REQUEST</div><h3>Project Materials</h3><button type="button" class="ws-folder-control" data-inspect="read handout"><span aria-hidden="true">▱</span>Open handout preview</button><p>Verified teacher account → read the project handout.</p><p class="ws-muted">Guest clients are isolated from internal shares. The teacher does not need editing rights or unrelated folders.</p>${run('Test teacher access')}${terminal(state.tested?state.results.map(r=>`${r.ok?'ALLOW / OK':'REVIEW    '} ${r.label}`):['Identity: teacher-training (verified)','Resource: /shares/project-materials','Requested operation: read'])}</section></div>`;
  return `<div class="ws-two-col"><section class="ws-panel"><div class="ws-section-label">RECOVERY CONSOLE / STUDIO-PC-04</div><h3>Saved recovery preview</h3>${recoveryConsole(state)}<p class="ws-muted">This console simulates fixed recovery choices. It does not run commands on your device.</p></section><form class="ws-panel" data-form="save-recovery"><h3>Choose a recovery plan</h3>${select('recovery','Update recovery action',state.recovery,['Keep current update','Roll back KB-LAB-17','Reset and erase files'])}${select('status','School Update service',state.status,['Stopped','Running'])}${select('startup','How the service starts after a restart',state.startup,['Disabled','Manual','Automatic'])}${submit('Save recovery plan')}${run('Test startup and updates')}</form></div>`;
}
function ai(id,state) {
  if (id==='AI301') return `<div class="ws-two-col"><section class="ws-panel ws-note"><div class="ws-section-label">PROMPT REVIEW / PRIVACY FIRST</div><h3>Describe the task, protect the learner.</h3><p>Build a prompt for an imaginary learner. Ask for a short explanation of networks, one practice question, and a comparison with class notes.</p><ul><li>Leave out names, email addresses, grades, and health information.</li><li>State the topic and the kind of help needed.</li><li>Keep a human verification step.</li></ul><p class="ws-muted">This is a transparent rule checker. It cannot judge all privacy risks or predict an AI model’s answer.</p></section><form class="ws-panel" data-form="save-prompt"><h3>Prompt workspace</h3><label class="ws-field"><span>Your revised prompt</span><textarea name="prompt" rows="9" maxlength="3000">${esc(state.prompt)}</textarea></label>${submit('Save prompt')}${run('Check my prompt')}</form></div>`;
  if (id==='AI302') {
    const reviewOptions=[['unreviewed','Choose a finding'],['supported','Supported by source'],['unsupported','Unsupported by source'],['biased','Unsupported personal judgement / bias']];
    return `<section class="ws-source-card"><b>SOURCE CARD v4.2</b><p>“Check the display cable first. Record the test result.”</p><small>This guide contains no password-expiration rule or assessment of student motivation.</small></section><form data-form="save-claims"><div class="ws-two-col"><section class="ws-panel"><h3>Check each AI claim</h3><ol class="ws-claim-list"><li><blockquote>Check the display cable first.</blockquote>${select('claim0','Finding for claim 1',state.claims[0],reviewOptions)}</li><li><blockquote>The school requires a password reset every 90 days.</blockquote>${select('claim1','Finding for claim 2',state.claims[1],reviewOptions)}</li><li><blockquote>This student’s name shows they probably did not try.</blockquote>${select('claim2','Finding for claim 3',state.claims[2],reviewOptions)}</li></ol></section><section class="ws-panel"><h3>Compare two matching tickets</h3><p class="ws-muted">Names are fictional. Both tickets contain the same technical evidence.</p><div class="ws-ticket-pair"><b>A · Alex</b><p>Monitor has power; HDMI cable disconnected.</p>${select('ticketA','Category for ticket A',state.ticketA,['unreviewed','Display / cable','Password reset','User effort'])}</div><div class="ws-ticket-pair"><b>B · Jordan</b><p>Monitor has power; HDMI cable disconnected.</p>${select('ticketB','Category for ticket B',state.ticketB,['unreviewed','Display / cable','Password reset','User effort'])}</div>${submit('Save my review')}${run('Check my review')}</section></div></form>`;
  }
  const keyLine=state.secret==='environment'?'api_key = os.environ.get("LAB_API_KEY")\nif not api_key: raise RuntimeError("Missing key")':'api_key = "PLACEHOLDER-DO-NOT-USE"';
  const queryLine=state.query==='parameterized'?'record = db.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()':'record = db.execute("SELECT * FROM records WHERE id = " + record_id).fetchone()';
  const ownerLine=state.authorization==='owner'?'if record["owner_id"] != user.id:\n    raise PermissionError("Access denied")':state.authorization==='hidden'?'# The page hides record IDs, but makes no ownership check.':'# Any signed-in user can receive any record.';
  return `<div class="ws-two-col"><section class="ws-panel"><div class="ws-section-label">AI DRAFT / PYTHON REVIEW</div><h3>Record lookup preview</h3><pre class="ws-code"><code>${esc(`import os\n\n# Excerpt: db uses dictionary-style rows; user is authenticated.\n${keyLine}\n\ndef get_record(user, record_id):\n    ${queryLine}\n    if record is None:\n        raise LookupError("Record not found")\n    ${ownerLine.replaceAll('\n','\n    ')}\n    return record`)}</code></pre><p class="ws-muted">Preview only. No Python, SQL, or external API is executed.</p></section><form class="ws-panel" data-form="save-code"><h3>Choose safer code patterns</h3>${select('secret','Where the API key is stored',state.secret,[['hardcoded','Keep the key in source'],['environment','Read environment; fail if missing']])}${select('query','How the database query handles input',state.query,[['concatenated','Concatenate input into SQL'],['parameterized','Use a parameterized query']])}${select('authorization','Who may read a record',state.authorization,[['signed-in','Allow every signed-in user'],['hidden','Hide record IDs in the interface'],['owner','Check record owner on every request']])}${submit('Save code choices')}${run('Test code choices')}</form></div>`;
}
function security(id,state) {
  if (id==='SEC401') {
    const urgent=state.message!=='routine';
    return `<div class="ws-two-col"><section class="ws-panel"><div class="ws-section-label">TRAINING INBOX / 2 MESSAGES</div><div class="ws-inbox"><button type="button" data-action="view-message" data-value="urgent" class="ws-mail${urgent?' ws-mail-active':''}"><b>Account suspended in 10 minutes</b><small>verify@school-account-check.test</small></button><button type="button" data-action="view-message" data-value="routine" class="ws-mail${!urgent?' ws-mail-active':''}"><b>Tomorrow’s lab checklist</b><small>helpdesk@school.test</small></button></div><article class="ws-email"><h3>${urgent?'URGENT: verify your account':'Tomorrow’s lab checklist'}</h3><p class="ws-email-meta">From: ${urgent?'verify@school-account-check.test':'helpdesk@school.test'}</p><p>${urgent?'Your access will be deleted in 10 minutes. Verify your school password immediately using the button below.':'The troubleshooting checklist is ready. Open it from the class portal using the bookmark provided by your teacher.'}</p><div class="ws-link-preview"><b>Text-only destination preview</b><code>${urgent?'https://school-account-check.test/verify':'https://portal.school.test/checklist'}</code></div><small>No link in this message is active.</small></article></section><form class="ws-panel" data-form="save-triage"><h3>Review the urgent message</h3>${select('verdict','Your decision about the urgent message',state.verdict,[['unreviewed','Choose a verdict'],['safe','Safe to provide credentials'],['phishing','Phishing — report through approved process']])}<fieldset class="ws-fieldset"><legend>Evidence in the urgent message</legend>${check('flags','Sender domain does not match school IT','sender',state.flags.includes('sender'))}${check('flags','Destination differs from the school portal','destination',state.flags.includes('destination'))}${check('flags','Threatening time limit creates pressure','urgency',state.flags.includes('urgency'))}</fieldset>${select('permission','Student helper access to checklist',state.permission,['Administrator','Edit all folders','Read only','No access'])}${submit('Save message review')}${run('Check my review')}</form></div>`;
  }
  if (id==='SEC402') {
    const events=[['EVT-101','09:10','10.24.8.25','Teacher session success','info'],['EVT-102','09:12','198.51.100.24','18 authentication failures / 60 seconds','alert'],['EVT-103','09:13','198.51.100.24','Authentication success after failures','alert'],['EVT-104','09:14','10.24.8.25','HTTPS learning portal opened','info']];
    return `<form data-form="save-response"><section class="ws-panel"><div class="ws-section-label">SCHOOL GATEWAY / SYNTHETIC EVENT STREAM</div><h3>Find related log events</h3><div class="ws-table-scroll" tabindex="0" role="region" aria-label="Scrollable synthetic security event table"><table class="ws-log-table"><caption>Select the two related events. All addresses and logs are simulated.</caption><thead><tr><th scope="col">Link</th><th scope="col">Event</th><th scope="col">Time</th><th scope="col">Source</th><th scope="col">Message</th></tr></thead><tbody>${events.map(([event,time,source,message,severity])=>`<tr class="ws-log-${severity}"><td><label class="ws-log-select"><input type="checkbox" name="events" value="${event}" aria-label="Correlate ${event}"${checked(state.events.includes(event))}></label></td><th scope="row">${event}</th><td>${time}</td><td><code>${source}</code></td><td>${message}</td></tr>`).join('')}</tbody></table></div><p class="ws-table-help">Scroll within the event table to read every column. Select the two events that belong to the same sequence.</p></section><div class="ws-two-col ws-margin-top"><section class="ws-panel"><h3>Plan the defensive change</h3>${input('source','Temporarily block source IP',state.source,'Use the correlated log evidence')}${select('port','Service port to close',state.port,[['','Choose a port'],['23','TCP 23 · Telnet'],['443','TCP 443 · HTTPS'],['53','UDP 53 · DNS']])}${check('keepHttps','Keep classroom HTTPS on port 443 available','yes',state.keepHttps)}${submit('Save response plan')}</section><section class="ws-panel"><h3>Test your response plan</h3><p>Contain the suspicious activity without removing the learning portal. Preserve the original logs for a human review.</p><p class="ws-muted">Blocking a source is a temporary defensive measure; these logs do not identify a person.</p>${run('Test response plan')}${terminal(state.tested?state.results.map(r=>`${r.ok?'OK  ':'FAIL'} ${r.label}`):['Policy mode: local simulation','Protected service: learning portal / TCP 443','Waiting for response validation…'])}</section></div></form>`;
  }
  const response=state.response;
  return `<section class="ws-scope"><div><b>AUTHORIZED TRAINING SCOPE</b><p>Only the two fictional records in this browser. No real accounts, endpoints, network requests, or security tools.</p></div><label class="ws-check"><input type="checkbox" data-scope${checked(state.scope)}><span>I understand and will stay within this simulation.</span></label></section><div class="ws-two-col"><section class="ws-panel"><div class="ws-section-label">LEARNDESK / FICTIONAL APP</div><h3>Try the two practice records</h3><p class="ws-identity">Active session <code>learner-101</code></p><div class="ws-request-controls"><button class="ws-button" type="button" data-action="fetch-record" data-value="101"${!state.scope?' disabled':''}>Request own record · 101</button><button class="ws-button ws-button-secondary" type="button" data-action="fetch-record" data-value="102"${!state.scope?' disabled':''}>Request test record · 102</button></div>${response?`<div class="ws-response"><span class="ws-http-code ${response.status===403?'ws-http-denied':''}">HTTP ${esc(response.status)}</span><pre>${esc(response.body)}</pre></div>`:'<div class="ws-test-placeholder">Acknowledge scope, then inspect your own record and the supplied test record.</div>'}${terminal(state.history.length?state.history:['No simulated requests yet.'])}</section><form class="ws-panel" data-form="set-authorization"><h3>Choose an access rule</h3><p class="ws-muted">An interface choice is not a server-side access check.</p>${select('patch','Rule for who can read a record',state.patch,[['none','Original: signed-in users can access all records'],['hidden','Hide other record links in the interface'],['owner','Server: require record.owner_id === user.id']])}${submit('Save access rule')}<pre class="ws-code"><code>${esc(state.patch==='owner'?'if record.owner_id !== session.user_id:\n    return 403\nreturn 200, record':state.patch==='hidden'?'hide_other_record_links()\n# Server still returns any requested record\nreturn 200, record':'# Missing ownership check\nreturn 200, record')}</code></pre>${run('Test both records')}</form></div>`;
}

/** Render only documented, fixed simulation controls. All state changes go to onAction. */
export function renderWorkspace(root, scenario, state, onAction) {
  if(supportsExpandedLab(scenario.id))return renderExpanded(root,scenario,state,onAction);if(supportsCodingLab(scenario.id))return renderCoding(root,scenario,state,onAction);
  state = normalizeWorkspaceState(scenario.id, state);
  const code=normalize(scenario.id);
  const body=code.startsWith('NET')?network(code,state):code.startsWith('AI')?ai(code,state):code.startsWith('SEC')?security(code,state):'<p>This case is available in the hardware bench.</p>';
  root.innerHTML=`<div class="ws-desktop"><div class="ws-windowbar"><span class="ws-window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(scenario.id)} <span aria-hidden="true">/</span> ${esc(scenario.title)}</span><span class="ws-local-badge">PRACTICE ONLY</span></div><div class="ws-body">${workspaceGuide(scenario.id)}${missionPanel(scenario.id,state)}${body}${inspectionPanel(scenario.id)}${results(state)}</div></div>`;
  const previous=inspectionViews.get(root), signature=JSON.stringify(state);
  const display=root.querySelector('[data-inspection-output]');
  const commandInput=root.querySelector('[data-inspect-form] [name="command"]');
  if (previous?.id===code && previous.signature===signature && display) {
    display.textContent=previous.output;
    if (commandInput) commandInput.value=previous.command;
  }
  const inspect=command=>{
    const output=workspaceDiagnostic(scenario.id,state,command);
    inspectionViews.set(root,{id:code,signature,output,command:typeof command==='string'?command.slice(0,96):''});
    if (display) display.textContent=output;
    onAction('inspect-command',{command});
  };
  root.querySelectorAll('[data-inspect]').forEach(button=>button.addEventListener('click',()=>{
    if (commandInput) commandInput.value=button.dataset.inspect;
    inspect(button.dataset.inspect);
  }));
  root.querySelector('[data-inspect-form]')?.addEventListener('submit',event=>{
    event.preventDefault();
    inspect(commandInput?.value || '');
  });
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
