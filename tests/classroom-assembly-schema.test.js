import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { onRequest } from '../functions/api/[[path]].js';
import { SCENARIOS } from '../src/scenarios.js';
import { EXPANDED_SCENARIOS, expandedStateFields } from '../src/expanded-labs.js';
import { CODING_SCENARIOS, codingFixtureCount } from '../src/coding-lab.js';
import { initialHardwareState, applyHardwareAction } from '../src/hardware.js';
import { assemblyActions } from '../src/assembly-model.js';
import { normalizeLabRecord } from '../src/records.js';

// Exercise the actual server-side schema without activating classroom hosting,
// authenticating a teacher, or storing student work. Full route/SQL coverage is
// in classroom-api.test.js; this isolates the newly versioned mechanical data.
const source = readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const start = source.indexOf('const invalidWork =');
const end = source.indexOf('\nasync function readBody', start);
assert.ok(start >= 0 && end > start, 'the server work-validation boundary must exist');
const validate = vm.runInNewContext(`${source.slice(start, end)}; workPayload`, {
  Object, Array, Number, SCENARIOS, EXPANDED_SCENARIOS, expandedStateFields, CODING_SCENARIOS, codingFixtureCount,
  encoder: new TextEncoder(), MAX_WORK: 65_536,
  plain: value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype,
  fail(status, code, message) { const error = new Error(message); error.status = status; error.code = code; throw error; }
});
function work(id = 'INC-106', enabled = true) {
  const scenario = SCENARIOS.find(item => item.id === id);
  let state = initialHardwareState(id);
  if (enabled) state = applyHardwareAction(id, state, 'enable-assembly').state;
  return normalizeLabRecord(scenario, { state });
}
const rejects = (value, code = 'invalid_work') => assert.throws(() => validate(value, value.state.caseId), error => error.code === code && error.status === 400);

test('server drafts accept normalized hardware records with and without detailed assembly', () => {
  for (const scenario of SCENARIOS.filter(item => item.track === 'hardware')) {
    for (const enabled of [false, true]) {
      const value = work(scenario.id, enabled);
      assert.deepEqual(JSON.parse(validate(value, scenario.id)), value);
      assert.equal(value.state.assemblyEnabled, enabled);
      if (enabled) {
        assert.equal(value.state.assembly.psuScrews.length, 4);
        assert.equal(value.state.assembly.version, 1);
      } else assert.equal(value.state.assembly, null);
    }
  }
});

test('prepared drafts retain the explicit PC HDMI connection as a boolean and only its authored disconnect action', () => {
  for(const connected of [false,true]) {
    const value=work('INC-101');value.state.pcVideoConnected=connected;
    value.state.actions.push('disconnect-video');
    const saved=JSON.parse(validate(value,'INC-101'));
    assert.equal(saved.state.pcVideoConnected,connected);
    assert.ok(saved.state.actions.includes('disconnect-video'));
  }
  for(const malformed of ['false',0,null,{email:'private@example.test'}]) {
    const value=work('INC-101');value.state.pcVideoConnected=malformed;rejects(value);
  }
  const unknown=work('INC-101');unknown.state.actions.push('disconnect-student');rejects(unknown);
});

test('enabled detailed mode cannot use a null or omitted mechanical record to forge a completed build', () => {
  for (const id of ['INC-101', 'INC-106']) {
    const forged = work(id);
    Object.assign(forged.state, {
      pcOn: true, acConnected: true, boardInstalled: true, cpuInstalled: true, coolerInstalled: true,
      ramSeated: true, gpuInstalled: true, atxConnected: true, cpuPowerConnected: true,
      gpuPowerConnected: true, frontPanelConnected: true, originalDriveInstalled: true,
      sataDataConnected: true, sataPowerConnected: true, booted: true, documentOpened: true,
      videoPort: 'gpu', monitorInput: 'hdmi', signalConnected: true, assemblyEnabled: true
    });
    forged.verified = true; forged.closed = true;
    for (const replacement of [null, undefined]) {
      const payload = structuredClone(forged);
      if (replacement === undefined) delete payload.state.assembly;
      else payload.state.assembly = replacement;
      rejects(payload);
    }
  }
  const independent = work('INC-101', false);
  assert.equal(independent.state.assembly, null);
  assert.deepEqual(JSON.parse(validate(independent, 'INC-101')), independent);
  const legacy = structuredClone(independent);
  delete legacy.state.assembly; delete legacy.state.assemblyEnabled;
  assert.deepEqual(JSON.parse(validate(legacy, 'INC-101')), legacy);
  const ambiguous = structuredClone(independent);
  delete ambiguous.state.assemblyEnabled;
  rejects(ambiguous);
});

test('server action history accepts every authored mechanical action and rejects lookalike commands', () => {
  const value = work();
  value.state.actions = ['enable-assembly', ...assemblyActions(value.state, value.state.assembly).map(item => item.id)];
  assert.deepEqual(JSON.parse(validate(value, 'INC-106')).state.actions, value.state.actions);
  for (const action of ['asm-tighten-psu-4', 'asm-loosen-board-99', 'asm-fit-student', 'asm-upload-report', 'asm-connect-email', 'asm-connect-constructor', 'asm-fetch-roster']) {
    const invalid = structuredClone(value);
    invalid.state.actions.push(action);
    rejects(invalid);
  }
});

test('mechanical fields reject unknown identity, provider, and scene metadata at every supported boundary', () => {
  for (const extra of [
    { email: 'private@example.test' }, { studentId: 'private' }, { roster: { name: 'private' } },
    { providerApiKey: 'not-a-real-key' }, { scene: { camera: [] } }, JSON.parse('{"__proto__":{"private":true}}')
  ]) {
    const value = work();
    Object.assign(value.state.assembly, extra);
    // Assigning __proto__ changes a regular object's prototype rather than
    // creating a JSON field; use a parsed JSON payload as the real API does.
    const transmitted = JSON.parse(JSON.stringify({ ...value, state: { ...value.state, assembly: { ...value.state.assembly, ...extra } } }));
    rejects(transmitted, 'privacy_violation');
  }
  const value = work();
  value.state.studentEmail = 'private@example.test';
  rejects(value, 'privacy_violation');
});

test('the complete versioned mechanical schema requires exact boolean fastener arrays and enums', () => {
  const substitutions = [
    ['version', 2], ['version', '1'], ['panelInstalled', 'true'], ['psuInstalled', 1],
    ['panelScrews', [true]], ['psuScrews', [true, true, true]], ['boardScrews', [true, true, true, true, true]],
    ['coolerScrews', [true, true, 'true', true]], ['gpuScrews', [1, 0]], ['ssdScrews', null],
    ['retentionOpen', 'false'], ['ramClipsOpen', 0], ['pcieLatchOpen', null], ['cpuFanConnected', 'true'],
    ['paste', 'student@example.test'], ['paste', '<script>'], ['paste', {}]
  ];
  for (const [field, replacement] of substitutions) {
    const value = work();
    value.state.assembly[field] = replacement;
    rejects(value);
  }
  for (const replacement of [{}, [], { version: 1 }, false, 'private']) {
    const value = work(); value.state.assembly = replacement; rejects(value);
  }
  const missing = work(); delete missing.state.assembly.psuScrews; rejects(missing);
  const badFlag = work(); badFlag.state.assemblyEnabled = 'true'; rejects(badFlag);
  const sparse = work(); sparse.state.assembly.psuScrews = Array(4); rejects(sparse);
  const fullHistory = work(); fullHistory.state.actions = Array(251).fill('asm-fit-psu'); rejects(fullHistory);
});

test('all four authored paste states and false fasteners survive validation without coercion', () => {
  for (const paste of ['clean', 'pea', 'excess', 'dry']) {
    const value = work(); value.state.assembly.paste = paste;
    const saved = JSON.parse(validate(value, 'INC-106'));
    assert.equal(saved.state.assembly.paste, paste);
    assert.deepEqual(saved.state.assembly.psuScrews, [false, false, false, false]);
    assert.equal(saved.state.assembly.psuInstalled, false);
  }
});

test('prepared coding drafts retain both language modes and every authored fixture without accepting unknown modes', () => {
  for (const scenario of CODING_SCENARIOS) {
    for (const language of ['javascript', 'python']) {
      const value = normalizeLabRecord(scenario, {});
      Object.assign(value.state, { language, languageAtRun: '', fixtureIndex: codingFixtureCount(scenario.id) - 1 });
      assert.deepEqual(JSON.parse(validate(value, scenario.id)), value);
      value.state.languageAtRun = language;
      assert.equal(JSON.parse(validate(value, scenario.id)).state.languageAtRun, language);
      for (const [field, invalid] of [['language','shell'], ['languageAtRun','Python'], ['fixtureIndex',codingFixtureCount(scenario.id)]]) {
        const forged = structuredClone(value); forged.state[field] = invalid;
        assert.throws(() => validate(forged, scenario.id), error => error.code === 'invalid_work');
      }
    }
  }
});

test('the production classroom gate remains closed before reading any configuration or student work', async () => {
  let touched = 0;
  const trap = new Proxy({}, { get() { touched++; throw Error('production must stay closed'); } });
  const response = await onRequest(trap, trap);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'classroom_privacy_review_required');
  assert.equal(touched, 0);
});
