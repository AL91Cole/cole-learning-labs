import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/scenarios.js';
import { initialHardwareState, applyHardwareAction, verifyHardware } from '../src/hardware.js';
import { initialWorkspaceState, applyWorkspaceAction, verifyWorkspace } from '../src/workspaces.js';

// Follow learner-visible actions through the public model API. Checking each input
// snapshot also catches accidental edits to another view's saved state.
function hardwareStep(id, state, action) {
  const before = structuredClone(state);
  const result = applyHardwareAction(id, state, action);
  assert.deepEqual(state, before, `${id}: ${action} mutated its input`);
  assert.equal(typeof result.message, 'string');
  return result;
}

function workspaceStep(id, state, action, value) {
  const before = structuredClone(state);
  const result = applyWorkspaceAction(id, state, action, value);
  assert.deepEqual(state, before, `${id}: ${action} mutated its input`);
  assert.equal(typeof result.message, 'string');
  return result;
}

function hardwareFlow(id, actions) {
  return actions.reduce((state, action) => hardwareStep(id, state, action).state, initialHardwareState(id));
}

function workspaceFlow(id, actions) {
  return actions.reduce((state, [action, value]) => workspaceStep(id, state, action, value).state, initialWorkspaceState(id));
}

const hardwareRepairs = {
  'INC-101': ['video-gpu'],
  'INC-107': ['input-hdmi'],
  'INC-108': ['connect-signal', 'input-hdmi'],
  'INC-102': ['connect-atx', 'plug-in', 'boot'],
  'INC-103': ['power-off', 'unplug', 'seat-ram', 'plug-in', 'boot'],
  'INC-104': ['power-off', 'unplug', 'connect-sata', 'connect-sata-power', 'plug-in', 'boot'],
  'INC-105': ['power-off', 'unplug', 'install-original', 'connect-sata', 'connect-sata-power', 'plug-in', 'boot'],
  'INC-106': [
    'install-board', 'install-cpu', 'install-cooler', 'install-ram',
    'install-gpu', 'install-drive', 'connect-atx', 'connect-cpu-power',
    'connect-gpu-power', 'connect-sata', 'connect-sata-power',
    'connect-front-panel', 'video-gpu', 'plug-in', 'boot'
  ]
};

const networkSettings = { ip:'10.24.8.25', mask:'255.255.255.0', gateway:'10.24.8.1', dns:'10.24.8.53' };
const accessSettings = { network:'Staff-Lab', folder:'Project Materials', permission:'Read' };
const recoverySettings = { recovery:'Roll back KB-LAB-17', status:'Running', startup:'Automatic' };
const promptSettings = { prompt:'For a fictional learner, explain computer networks in a short explanation. Include one practice question and ask them to check the explanation against class notes.' };
const claimSettings = { claim0:'supported', claim1:'unsupported', claim2:'biased', ticketA:'Display / cable', ticketB:'Display / cable' };
const codeSettings = { secret:'environment', query:'parameterized', authorization:'owner' };
const triageSettings = { verdict:'phishing', flags:['sender','destination','urgency'], permission:'Read only' };
const responseSettings = { events:['EVT-102','EVT-103'], source:'198.51.100.24', port:'23', keepHttps:true };

const workspaceRepairs = {
  'NET-204': [['save-expanded',{placement:'ceiling-center',band:'5',channel:'40',width:'20'}]],
  'NET-205': [['save-expanded',{spooler:'running',queue:'resume',port:'approved',job:'release'}]],
  'NET-206': [['save-expanded',{snapshot:'B-17',destination:'recovery',preserve:'keep',integrity:'compare'}]],
  'AI-304': [['save-expanded',{input:'fiction',identifiers:'none',route:'local',participation:'alternative'}]],
  'AI-305': [['save-expanded',{boundary:'data',injected:'reject',citation:'S-12',review:'human'}]],
  'AI-306': [['save-expanded',{threshold:'0.50',decision:'human',audit:'both',limitation:'small'}]],
  'SEC-404': [['save-expanded',{identity:'approved',factor:'revoke',reset:'supervised',audit:'record'}]],
  'SEC-405': [['save-expanded',{containment:'isolate',evidence:'preserve',notify:'team',recovery:'clean'}]],
  'SEC-406': [['save-expanded',{package:'A',signature:'verify',digest:'verify',deployment:'pilot'}]],
  'CODE-501': [['save-code',{code:'print(quantity * 3);'}]],
  'CODE-502': [['save-code',{code:'if (temperature < 20) { print("Heating"); } else { if (temperature > 25) { print("Cooling"); } else { print("Comfortable"); } }'}]],
  'CODE-503': [['save-code',{code:'let station = 1; repeat(stations) { print("Ready " + station); station = station + 1; }'}]],
  'CODE-504': [['save-code',{code:'console.log("Energy " + snacks * 4);'}]],
  'CODE-505': [['save-code',{code:'if (points >= 100) { console.log("Badge"); } else if (points >= 50) { console.log("Sticker"); } else { console.log("Try again"); }'}]],
  'CODE-506': [['save-code',{code:'let total = 0; for (let step = 1; step <= steps; step++) { total = total + step; } console.log(total);'}]],
  'NET-201': [['save-network', networkSettings]],
  'NET-202': [['save-access', accessSettings]],
  'NET-203': [['save-recovery', recoverySettings]],
  'AI-301': [['save-prompt', promptSettings]],
  'AI-302': [['save-claims', claimSettings]],
  'AI-303': [['save-code', codeSettings]],
  'SEC-401': [['save-triage', triageSettings]],
  'SEC-402': [['save-response', responseSettings]],
  'SEC-403': [
    ['acknowledge-scope', true], ['fetch-record', '101'],
    ['fetch-record', '102'], ['set-authorization', 'owner']
  ]
};

test('the assignment catalogue has 42 distinct, implemented cases across five pathways', () => {
  assert.equal(SCENARIOS.length, 42);
  assert.equal(new Set(SCENARIOS.map(scenario => scenario.id)).size, 42);
  const expected = [...Object.keys(hardwareRepairs), ...Object.keys(workspaceRepairs), ...Array.from({length:10},(_,index)=>`NET-${207+index}`)].sort();
  assert.deepEqual(SCENARIOS.map(scenario => scenario.id).sort(), expected);
  assert.deepEqual(Object.fromEntries(['hardware','network','ai','security','coding'].map(track => [track, SCENARIOS.filter(scenario => scenario.track === track).length])), {
    hardware:8, network:16, ai:6, security:6, coding:6
  });
});

for (const scenario of SCENARIOS) {
  test(`${scenario.id}: its initial fault cannot be verified as resolved`, () => {
    if (scenario.track === 'hardware') {
      assert.equal(verifyHardware(scenario.id, initialHardwareState(scenario.id)).ok, false);
    } else {
      const initial = initialWorkspaceState(scenario.id);
      assert.equal(verifyWorkspace(scenario.id, initial).ok, false);
      const checked = workspaceStep(scenario.id, initial, 'run-check').state;
      assert.equal(verifyWorkspace(scenario.id, checked).ok, false, 'running diagnostics alone must not fix a fault');
    }
  });
}

for (const [id, repair] of Object.entries(hardwareRepairs)) {
  test(`${id}: a restored desktop is fixed but not delivered until the original file opens`, () => {
    const fixed = hardwareFlow(id, repair);
    assert.equal(fixed.booted, true, 'the modeled repair should restore startup');
    assert.equal(fixed.videoPort, 'gpu', 'the display should use the active output');
    assert.equal(fixed.documentOpened, false);
    const notDelivered = verifyHardware(id, fixed);
    assert.equal(notDelivered.ok, false);
    assert.equal(notDelivered.needsDocument, true);
    assert.match(notDelivered.message, /Click Lesson_Practice_File\.docx on the monitor/i);

    const delivered = hardwareStep(id, fixed, 'open-document').state;
    assert.equal(delivered.documentOpened, true);
    assert.equal(verifyHardware(id, delivered).ok, true);

    const closedFile = hardwareStep(id, delivered, 'close-document').state;
    assert.equal(verifyHardware(id, closedFile).ok, false, 'closing the requested file removes the acceptance evidence');
  });
}

test('INC-102 needs both AC and a safely reconnected motherboard power lead before startup and file delivery',()=>{
  let state=initialHardwareState('INC-102');
  assert.equal(state.acConnected,false);assert.equal(state.atxConnected,false);
  state=hardwareStep('INC-102',state,'enable-assembly').state;
  for(const action of ['plug-in','boot'])state=hardwareStep('INC-102',state,action).state;
  assert.equal(state.booted,false,'Restoring AC alone cannot bypass the disconnected 24-pin lead.');
  assert.equal(verifyHardware('INC-102',state).ok,false);
  assert.match(verifyHardware('INC-102',state).message,/24.pin|motherboard.*power/i);
  for(const step of [null,'power-off','unplug']){
    if(step)state=hardwareStep('INC-102',state,step).state;
    const before=structuredClone(state),blocked=hardwareStep('INC-102',state,'asm-connect-atx');
    assert.equal(blocked.kind,'warning');assert.deepEqual(blocked.state,before,'Internal wiring needs PC off, AC disconnected and an open panel.');
  }
  for(const action of ['asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel','asm-connect-atx','asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1','plug-in','boot']){
    const result=hardwareStep('INC-102',state,action);assert.notEqual(result.kind,'warning',action+': '+result.message);state=result.state;
  }
  assert.equal(state.atxConnected,true);assert.equal(state.booted,true);assert.equal(state.documentOpened,false);
  assert.equal(verifyHardware('INC-102',state).needsDocument,true);
  state=hardwareStep('INC-102',state,'open-document').state;
  assert.equal(verifyHardware('INC-102',state).ok,true);assert.equal(state.originalDriveInstalled,true);
});

for (const [id, repair] of Object.entries(workspaceRepairs)) {
  test(`${id}: the intended solution requires a fresh diagnostic run`, () => {
    const repaired = workspaceFlow(id, repair);
    assert.equal(verifyWorkspace(id, repaired).ok, false, 'saving a correct configuration is not a test');

    const checked = workspaceStep(id, repaired, 'run-check').state;
    assert.equal(checked.tested, true);
    assert.equal(verifyWorkspace(id, checked).ok, true);

    // New configuration actions invalidate checks. Coding saves the actual source:
    // changing even a comment requires a fresh run of that program version.
    const [action, original] = repair.at(-1);
    const value=id.startsWith('CODE-')?{code:original.code+'\n// Review this version.'}:original;
    const changed = workspaceStep(id, checked, action, value).state;
    assert.equal(changed.tested, false);
    assert.deepEqual(changed.results, []);
    assert.equal(verifyWorkspace(id, changed).ok, false);
    assert.equal(verifyWorkspace(id, workspaceStep(id, changed, 'run-check').state).ok, true);
  });
}

test('internal hardware changes are blocked while the PC is running or AC remains connected', () => {
  const running = initialHardwareState('INC-103');
  const shutDown = hardwareStep('INC-103', running, 'power-off').state;
  const internalActions = [
    'seat-ram','unseat-ram','connect-sata','disconnect-sata','install-original','choose-nvme',
    'install-board','install-cpu','install-cooler','install-ram','install-gpu','install-drive',
    'connect-atx','connect-cpu-power','connect-gpu-power','connect-sata-power','connect-front-panel'
  ];
  for (const state of [running, shutDown]) {
    for (const action of internalActions) {
      const blocked = hardwareStep('INC-103', state, action);
      assert.equal(blocked.kind, 'warning', action);
      assert.deepEqual(blocked.state, state, `${action} changed hardware despite unsafe power conditions`);
    }
  }
  const disconnected = hardwareStep('INC-103', shutDown, 'unplug').state;
  assert.equal(hardwareStep('INC-103', disconnected, 'seat-ram').state.ramSeated, true);
});

test('AC cannot be unplugged from a running simulated PC', () => {
  const state = initialHardwareState('INC-103');
  const blocked = hardwareStep('INC-103', state, 'unplug');
  assert.equal(blocked.kind, 'warning');
  assert.equal(blocked.state.pcOn, true);
  assert.equal(blocked.state.acConnected, true);
});

test('an incompatible NVMe choice does not provide a bootable drive on the SATA board', () => {
  let state = hardwareFlow('INC-105', ['power-off','unplug']);
  const rejected = hardwareStep('INC-105', state, 'choose-nvme');
  assert.equal(rejected.kind, 'warning');
  assert.match(rejected.message, /compatibility|incompatible|no M\.2/i);
  assert.equal(rejected.state.originalDriveInstalled, false);
  state = hardwareStep('INC-105', rejected.state, 'plug-in').state;
  state = hardwareStep('INC-105', state, 'boot').state;
  assert.equal(state.booted, false);
  assert.equal(verifyHardware('INC-105', state).ok, false);

  state = hardwareFlow('INC-105', hardwareRepairs['INC-105']);
  state = hardwareStep('INC-105', state, 'open-document').state;
  assert.equal(state.selectedDrive, 'sata');
  assert.equal(verifyHardware('INC-105', state).ok, true);
});

test('assembly enforces component dependencies before power-on', () => {
  const empty = initialHardwareState('INC-106');
  assert.equal(hardwareStep('INC-106', empty, 'install-cpu').state.cpuInstalled, false);
  const board = hardwareStep('INC-106', empty, 'install-board').state;
  assert.equal(hardwareStep('INC-106', board, 'install-cooler').state.coolerInstalled, false);
  assert.equal(hardwareStep('INC-106', board, 'connect-gpu-power').state.gpuPowerConnected, false);
  assert.equal(hardwareStep('INC-106', board, 'connect-sata').state.sataDataConnected, false);
});

test('network diagnosis separates a working gateway from incorrect DNS', () => {
  let state = workspaceFlow('NET-201', [['save-network', {...networkSettings, dns:'192.168.1.53'}]]);
  state = workspaceStep('NET-201', state, 'run-check').state;
  assert.equal(state.results[1].ok, true, 'local routing should work');
  assert.equal(state.results[2].ok, false, 'the portal must still fail its name-resolution check');
  assert.equal(verifyWorkspace('NET-201', state).ok, false);
});

test('restoring network access with excessive permission is not an acceptable solution', () => {
  let state = workspaceFlow('NET-202', [['save-access', {...accessSettings, permission:'Full control'}]]);
  state = workspaceStep('NET-202', state, 'run-check').state;
  assert.equal(verifyWorkspace('NET-202', state).ok, false);
  assert.equal(state.results[0].ok, true, 'the connection can work while the policy is wrong');
});

test('erasing files is not accepted as recovery even with the update service restored', () => {
  let state = workspaceFlow('NET-203', [['save-recovery', {...recoverySettings, recovery:'Reset and erase files'}]]);
  state = workspaceStep('NET-203', state, 'run-check').state;
  assert.equal(verifyWorkspace('NET-203', state).ok, false);
  assert.equal(state.results[1].ok, false, 'classroom documents must be preserved');
});

test('a clear AI prompt still fails the privacy check when it includes an email address', () => {
  let state = workspaceFlow('AI-301', [['save-prompt', {prompt:promptSettings.prompt + ' Contact learner@example.test.'}]]);
  state = workspaceStep('AI-301', state, 'run-check').state;
  assert.equal(verifyWorkspace('AI-301', state).ok, false);
  assert.equal(state.results[1].ok, false);
});

test('matched technical tickets cannot pass the fairness audit with different classifications', () => {
  let state = workspaceFlow('AI-302', [['save-claims', {...claimSettings, ticketB:'User effort'}]]);
  state = workspaceStep('AI-302', state, 'run-check').state;
  assert.equal(verifyWorkspace('AI-302', state).ok, false);
});

test('a UI-only authorization patch fails the AI code security review', () => {
  let state = workspaceFlow('AI-303', [['save-code', {...codeSettings, authorization:'hidden'}]]);
  state = workspaceStep('AI-303', state, 'run-check').state;
  assert.equal(state.results[0].ok, true);
  assert.equal(state.results[1].ok, true);
  assert.equal(state.results[2].ok, false);
  assert.equal(verifyWorkspace('AI-303', state).ok, false);
});

test('security triage requires destination evidence and read-only access', () => {
  for (const settings of [
    {...triageSettings, flags:['sender','urgency']},
    {...triageSettings, permission:'Administrator'}
  ]) {
    let state = workspaceFlow('SEC-401', [['save-triage', settings]]);
    state = workspaceStep('SEC-401', state, 'run-check').state;
    assert.equal(verifyWorkspace('SEC-401', state).ok, false);
  }
});

test('containment must preserve the HTTPS portal and avoid unrelated source events', () => {
  for (const settings of [
    {...responseSettings, keepHttps:false},
    {...responseSettings, events:['EVT-101','EVT-102','EVT-103']},
    {...responseSettings, source:'10.24.8.25'},
    {...responseSettings, port:'443'}
  ]) {
    let state = workspaceFlow('SEC-402', [['save-response', settings]]);
    state = workspaceStep('SEC-402', state, 'run-check').state;
    assert.equal(verifyWorkspace('SEC-402', state).ok, false);
  }
});

test('record requests and patches stay locked until the simulated scope is acknowledged', () => {
  const initial = initialWorkspaceState('SEC-403');
  for (const [action, value] of [['fetch-record','102'],['set-authorization','owner'],['run-check']]) {
    const blocked = workspaceStep('SEC-403', initial, action, value);
    assert.equal(blocked.kind, 'warning');
    assert.deepEqual(blocked.state, initial);
  }
  const scoped = workspaceStep('SEC-403', initial, 'acknowledge-scope', true).state;
  const outside = workspaceStep('SEC-403', scoped, 'fetch-record', '103');
  assert.equal(outside.kind, 'warning');
  assert.deepEqual(outside.state, scoped, 'a third record is outside the fixed lab scope');
});

test('hiding a record link leaves the simulated server authorization flaw exploitable', () => {
  let state = workspaceFlow('SEC-403', [
    ['acknowledge-scope',true], ['fetch-record','102'], ['set-authorization','hidden']
  ]);
  state = workspaceStep('SEC-403', state, 'fetch-record', '102').state;
  assert.equal(state.response.status, 200, 'hiding an interface link must not act like server-side protection');
  state = workspaceStep('SEC-403', state, 'run-check').state;
  assert.equal(verifyWorkspace('SEC-403', state).ok, false);
});

test('server ownership checks preserve own-record access and deny the other supplied record', () => {
  let state = workspaceFlow('SEC-403', workspaceRepairs['SEC-403']);
  assert.equal(state.observed, true, 'the original defect was reproduced');
  state = workspaceStep('SEC-403', state, 'fetch-record', '101').state;
  assert.equal(state.response.status, 200);
  state = workspaceStep('SEC-403', state, 'fetch-record', '102').state;
  assert.equal(state.response.status, 403);
  state = workspaceStep('SEC-403', state, 'run-check').state;
  assert.equal(verifyWorkspace('SEC-403', state).ok, true);
});

test('patching before reproducing the defect does not satisfy the investigation', () => {
  let state = workspaceFlow('SEC-403', [['acknowledge-scope',true], ['set-authorization','owner']]);
  state = workspaceStep('SEC-403', state, 'run-check').state;
  assert.equal(verifyWorkspace('SEC-403', state).ok, false);
  assert.equal(state.results[1].ok, false);
});

test('repairing one case preserves unrelated saved case states and nested evidence', () => {
  const saved = Object.fromEntries(SCENARIOS.map(scenario => [scenario.id,
    scenario.track === 'hardware' ? initialHardwareState(scenario.id) : initialWorkspaceState(scenario.id)
  ]));
  const before = structuredClone(saved);
  const repaired = hardwareStep('INC-103', saved['INC-103'], 'inspect-ram').state;
  assert.ok(repaired.evidence.includes('ram'));
  assert.deepEqual(saved, before);

  const audited = workspaceStep('AI-302', saved['AI-302'], 'save-claims', claimSettings).state;
  assert.deepEqual(audited.claims, ['supported','unsupported','biased']);
  assert.deepEqual(saved, before);
  const independent = initialWorkspaceState('AI-302');
  assert.deepEqual(independent.claims, ['unreviewed','unreviewed','unreviewed']);
});


test('selected comparison cases offer two evidence-focused second-look prompts without requiring a partner',()=>{
  const cases=SCENARIOS.filter(scenario=>scenario.secondLook);
  assert.deepEqual(cases.map(scenario=>scenario.id).sort(),['AI-302','CODE-503','NET-205','SEC-405']);
  for(const scenario of cases){
    const {prompt,checks}=scenario.secondLook;
    assert.ok(prompt.trim().length>12,scenario.id);
    assert.equal(checks.length,2,scenario.id);
    for(const check of checks)assert.ok(check.trim().endsWith('?'),scenario.id);
    assert.deepEqual(Object.keys(scenario.secondLook).sort(),['checks','prompt'],'The optional comparison has no partner or failed-test completion requirement.');
  }
});

test('INC104 needs both drive leads and keeps its original drive throughout a safe panel repair',()=>{
  const id='INC-104';let state=hardwareStep(id,initialHardwareState(id),'enable-assembly').state;
  assert.equal(state.sataDataConnected,false);assert.equal(state.sataPowerConnected,false);
  for(const action of ['power-off','unplug','asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel','asm-connect-sata-data','asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1','plug-in']){
    const result=hardwareStep(id,state,action);assert.notEqual(result.kind,'warning',action+': '+result.message);state=result.state;
  }
  state=hardwareStep(id,state,'boot').state;
  assert.equal(state.booted,false);assert.equal(verifyHardware(id,state).ok,false,'A data lead cannot supply drive power.');
  for(const action of ['power-off','unplug','asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel','asm-connect-sata-power','asm-fit-panel','asm-tighten-panel-0','asm-tighten-panel-1','plug-in','boot','open-document']){
    const result=hardwareStep(id,state,action);assert.notEqual(result.kind,'warning',action+': '+result.message);state=result.state;
    assert.equal(state.originalDriveInstalled,true);
  }
  assert.equal(verifyHardware(id,state).ok,true);
});
