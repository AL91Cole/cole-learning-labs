import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountLabLearning, learningRoute, labPageHash} from '../src/learning-tools.js';
import {SCENARIOS, TRANSFER_CASES, transferCaseFor} from '../src/scenarios.js';
import {normalizeLabRecord, workbenchProgress} from '../src/records.js';
import {applyHardwareAction, initialHardwareState, verifyHardware} from '../src/hardware.js';
import {readExperiments, renderExperiments, learningBehaviors, resumeExperiment} from '../src/experiments.js';
import {normalizeWorkCollection} from '../src/local-work.js';
import {routeAccess} from '../src/access-policy.js';
import {CAPSTONE_STAGES, renderCapstone, capstoneReport, capstoneHandoff, writeCapstoneHandoff} from '../src/capstone.js';

const blank = SCENARIOS.find(item => item.id === 'INC-101'), alternate = SCENARIOS.find(item => item.id === 'INC-107');
const FIX = {'INC-101': ['video-gpu', 'open-document'], 'INC-107': ['input-hdmi', 'open-document']};

// The notebook host and the document events are the only page surface this controller touches.
function view(t, scenario) {
  const nodes = new Map(), listeners = new Map();
  const node = key => { if (!nodes.has(key)) nodes.set(key, {value: '', innerHTML: '', textContent: '', dataset: {}, hidden: false, disabled: false, children: [], handlers: new Map(),
    addEventListener(event, handler) { this.handlers.set(event, handler); }, removeEventListener(event) { this.handlers.delete(event); }, replaceChildren(...children) { this.children = children; }, append(...children) { this.children.push(...children); }, focus() {}}); return nodes.get(key); };
  const inputs = ['predict', 'evidence', 'changed', 'observed', 'explain'].map(part => { const input = node('field-' + part); input.dataset.experimentField = part; return input; });
  const host = node('#experiment-tools');
  host.querySelector = selector => { const field = /^\[data-experiment-field="([^"]+)"\]$/u.exec(selector); return field ? inputs.find(input => input.dataset.experimentField === field[1]) : node('host:' + selector); };
  host.querySelectorAll = selector => selector === '[data-experiment-field]' ? inputs : [];
  node('.lab-shell').dataset.section = '2'; node('.lab-shell').classList = {toggle() {}};
  const emit = (type, detail) => { for (const handler of [...(listeners.get(type) || [])]) handler({type, detail}); };
  const globals = {location: {hash: '#lab/' + scenario.id + '/workbench?mode=guided'}, history: {replaceState() {}},
    document: {createElement: tag => node('created-' + tag + '-' + nodes.size), addEventListener(type, handler) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(handler); }, removeEventListener(type, handler) { listeners.get(type)?.delete(handler); }}};
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; });
  }
  return {root: {querySelector: node}, node, emit,
    type(part, value) { const input = inputs.find(item => item.dataset.experimentField === part); assert.equal(input.disabled, false, part + ' is available'); input.value = value; input.handlers.get('input')(); },
    value: part => inputs.find(item => item.dataset.experimentField === part).value,
    click(selector) { node('host:' + selector).handlers.get('click')(); },
    status: () => node('host:[data-experiment-status]').textContent,
    transfer: () => node('#learning-transfer')};
}

function start(t, scenario, prepare = () => {}) {
  const record = normalizeLabRecord(scenario, {symptoms: 'The monitor shows no picture although the tower is running.', plan: 'I think the picture is not reaching the monitor from the tower.', ideaSaved: true, evidence: scenario.clues.slice(0, 2).map(clue => clue.id)});
  record.state = applyHardwareAction(scenario.id, record.state, 'enable-assembly').state; prepare(record);
  const page = view(t, scenario), result = () => verifyHardware(scenario.id, record.state);
  let saves = 0;
  const dispose = mountLabLearning(page.root, {scenario, record, getResult: result, onSave: () => { saves++; }, onTest: () => { record.verified = result().ok; return true; }});
  const act = (...actions) => { for (const action of actions) { const applied = applyHardwareAction(scenario.id, record.state, action); record.state = applied.state; } record.verified = false; page.emit('cole:lab-state-change', {id: scenario.id, changed: true}); };
  // What the workbench button does in the app: verify the task, then announce the result.
  const pressTest = () => { record.verified = result().ok; page.emit('cole:lab-test-result', {id: scenario.id, firstIdea: true}); };
  const progress = () => workbenchProgress(scenario, record, result());
  const explain = () => { page.type('changed', 'I moved one connection that the clue pointed to.'); page.type('observed', 'The picture returned and the lesson file opened.'); page.type('explain', 'The result supports my idea because the original task now works.'); };
  return {record, page, act, pressTest, progress, explain, dispose, get saves() { return saves; }, attempts: () => readExperiments(record).attempts, draft: () => readExperiments(record).draft};
}
const labels = progress => progress.remaining.filter(item => !item.done).map(item => item.label);

test('The Blank Monitor: one Test my idea press records the result, and page three opens after the answers and Save', t => {
  const lab = start(t, blank);
  assert.ok(lab.draft().before, 'Arriving at the workbench records the starting setup with the first idea.');
  assert.deepEqual(labels(lab.progress()), ['Make one change, then select Test my idea', 'Write what you changed, what happened and what you learned', 'Select Save this attempt']);
  lab.act('video-gpu');
  assert.ok(labels(lab.progress()).includes('Click the lesson file on the monitor'));
  lab.act('open-document'); lab.pressTest();
  assert.equal(lab.draft().check.ok, true, 'The workbench test is recorded in the notebook without a second test button.');
  assert.match(lab.page.status(), /Result recorded\. Describe what you changed, what happened and what you learned\. Then save this attempt\./u);
  assert.equal(lab.progress().ready, false, 'A passing test alone does not open page three.');
  assert.deepEqual(labels(lab.progress()), ['Write what you changed, what happened and what you learned', 'Select Save this attempt']);
  lab.explain();
  assert.deepEqual(labels(lab.progress()), ['Select Save this attempt']);
  lab.page.click('[data-experiment-save]');
  assert.equal(lab.progress().ready, true); assert.deepEqual(lab.progress().remaining, []); assert.equal(lab.attempts().length, 1);
  assert.match(lab.page.status(), /Attempt saved\. Your test shows the task works\./u);
  lab.dispose();
});

test('repeated Test my idea presses keep one record and never erase what the learner already typed', t => {
  const lab = start(t, blank);
  lab.act(...FIX['INC-101']); lab.pressTest();
  lab.page.type('changed', 'I moved the display cable.'); lab.page.type('observed', 'The desktop appeared.');
  const before = JSON.stringify(lab.record.events), saves = lab.saves;
  lab.pressTest(); lab.pressTest(); lab.pressTest();
  assert.equal(JSON.stringify(lab.record.events), before, 'An unchanged repeat changes nothing in the record.');
  assert.equal(lab.saves, saves); assert.equal(lab.draft().observed, 'The desktop appeared.'); assert.equal(lab.page.value('changed'), 'I moved the display cable.');
  assert.match(lab.page.status(), /already recorded/u);
  lab.page.type('explain', 'The cable position was the cause.'); lab.page.click('[data-experiment-save]');
  assert.equal(lab.attempts().length, 1);
  lab.page.click('[data-experiment-save]'); lab.page.click('[data-experiment-save]');
  assert.equal(lab.attempts().length, 1, 'Saving again cannot duplicate the attempt.');
  const saved = JSON.stringify(lab.record.events);
  lab.pressTest();
  assert.equal(JSON.stringify(lab.record.events), saved, 'Retesting saved, unchanged, working equipment only confirms it.');
  assert.equal(lab.progress().ready, true);
  lab.dispose();
});

test('an unsuccessful test is saved as evidence, and the retry is recorded even when Start this test was skipped', t => {
  const lab = start(t, blank);
  lab.act('input-hdmi'); lab.pressTest();
  assert.equal(lab.draft().check.ok, false);
  lab.page.type('changed', 'I pressed the monitor input button.'); lab.page.type('observed', 'The screen still showed no picture.'); lab.page.type('explain', 'The monitor input was not the cause.');
  lab.page.click('[data-experiment-save]');
  assert.equal(lab.attempts().length, 1); assert.equal(lab.attempts()[0].check.ok, false);
  assert.match(lab.page.status(), /It did not work yet\. Use the result to plan your next idea\./u);
  assert.equal(lab.progress().ready, false);
  assert.equal(lab.progress().note, 'Your last saved test did not make the task work. Use that result as evidence for your next idea.');
  assert.equal(labels(lab.progress())[0], 'Write your test idea and the evidence for it');

  // Fixing the equipment and testing without a new idea runs the test but says exactly why nothing was recorded.
  lab.act(...FIX['INC-101']); lab.pressTest();
  assert.equal(lab.record.verified, true); assert.equal(lab.draft().after, undefined);
  assert.match(lab.page.status(), /To record it, write your next idea and the evidence for it in step 1\. Then select Test my idea again\./u);
  assert.equal(lab.progress().ready, false, 'A working task with no saved explanation of the new idea stays on the workbench.');

  // Writing the next idea is enough: the setup at the last saved test becomes the honest starting point.
  lab.page.type('predict', 'I think the display cable is in the wrong video socket on the tower.');
  lab.page.type('evidence', 'The input test failed and the cable clue shows which socket is used.');
  lab.pressTest();
  assert.deepEqual(lab.draft().before, lab.attempts()[0].after, 'The comparison starts from the setup recorded at the last saved test.');
  assert.equal(lab.draft().check.ok, true); assert.notDeepEqual(lab.draft().after, lab.draft().before);
  lab.explain(); lab.page.click('[data-experiment-save]');
  assert.deepEqual(lab.attempts().map(attempt => attempt.check.ok), [false, true]);
  assert.equal(lab.progress().ready, true);
  const noticed = learningBehaviors(lab.record);
  assert.ok(noticed.some(item => /wrote a new idea/u.test(item)), 'Revising an idea after a failed test is recognised.');
  assert.ok(noticed.some(item => /original task/u.test(item)));
  assert.match(renderExperiments(blank, lab.record), /Noticed in your tests/u);
  assert.match(renderExperiments(blank, lab.record), /not a score and it is not shared/u);
  lab.dispose();
});

test('rewording an idea before touching the workbench keeps the starting setup; changing the bench first does not', t => {
  const lab = start(t, blank), baseline = lab.draft().before;
  lab.page.type('predict', 'I think the monitor is not receiving the picture from the tower output.');
  assert.deepEqual(lab.draft().before, baseline, 'An edit before any change keeps the recorded starting setup.');
  lab.act('video-gpu');
  lab.page.type('evidence', 'The cable clue and the running tower both point at the picture path.');
  assert.equal(lab.draft().before, undefined, 'After a change, a new idea needs a new starting setup.');
  assert.match(lab.page.status(), /Start this test again before making a change/u);
  lab.pressTest();
  assert.match(lab.page.status(), /select Start this test\. Then select Test my idea again\./u, 'With no saved attempt there is no honest earlier setup to compare with.');
  assert.equal(resumeExperiment(blank, lab.record).ok, false);
  lab.dispose();
});

test('feedback about learning behaviours is derived on the page and never stored, scored or sent', t => {
  const lab = start(t, blank);
  assert.deepEqual(learningBehaviors(lab.record), []);
  lab.act(...FIX['INC-101']); lab.pressTest(); lab.explain(); lab.page.click('[data-experiment-save]');
  const noticed = learningBehaviors(lab.record);
  assert.ok(noticed.some(item => /one part of the setup/u.test(item)), 'One changed setup row is recognised as one change.');
  assert.equal(JSON.stringify(lab.record).includes('one part of the setup'), false, 'Recognition text is not written into the record.');
  const source = readFileSync(new URL('../src/experiments.js', import.meta.url), 'utf8'), behaviours = source.slice(source.indexOf('export function learningBehaviors('), source.indexOf('function savedAttempts('));
  assert.doesNotMatch(behaviours, /fetch|localStorage|sessionStorage|score|points|badge|rank|streak|leaderboard|Date\b/iu);
  lab.dispose();
});

test('the alternate ticket shares the symptom but not the cause, the evidence, the fix or the saved work', t => {
  assert.equal(transferCaseFor('INC-101'), 'INC-107'); assert.deepEqual([...TRANSFER_CASES].slice(0, 2), ['INC-101', 'INC-107']);
  assert.equal(alternate.track, 'hardware'); assert.equal(alternate.grade, blank.grade);
  assert.match(alternate.brief, /No signal/u, 'The same broad symptom.');
  for (const text of [alternate.brief, alternate.summary, alternate.title]) assert.doesNotMatch(text, /source|input|DisplayPort|HDMI|setting/iu, 'The request does not hand over the cause: ' + text);
  assert.ok(alternate.clues.some(clue => /source/iu.test(clue.text)), 'The cause is still discoverable from the clues.');
  assert.equal(alternate.clues.some(clue => blank.clues.some(other => other.text === clue.text)), false, 'The evidence is distinct.');
  const fixed = (scenario, actions) => { let state = applyHardwareAction(scenario.id, initialHardwareState(scenario.id), 'enable-assembly').state; for (const action of actions) state = applyHardwareAction(scenario.id, state, action).state; return verifyHardware(scenario.id, state).ok; };
  assert.equal(fixed(blank, FIX['INC-101']), true); assert.equal(fixed(alternate, FIX['INC-107']), true, 'The alternate ticket has a valid solution.');
  assert.equal(fixed(alternate, FIX['INC-101']), false, 'The original fix does not solve the alternate ticket.');
  assert.equal(fixed(blank, FIX['INC-107']), false);

  // Saved work is keyed by ticket: finishing or clearing one never touches the other.
  const first = start(t, blank);
  first.act(...FIX['INC-101']); first.pressTest(); first.explain(); first.page.click('[data-experiment-save]');
  const labs = {'INC-101': first.record, 'INC-107': normalizeLabRecord(alternate)};
  const stored = normalizeWorkCollection(SCENARIOS, JSON.parse(JSON.stringify({version: 2, labs})));
  assert.deepEqual(Object.keys(stored.labs).sort(), ['INC-101', 'INC-107']);
  assert.equal(readExperiments(stored.labs['INC-101']).attempts.length, 1); assert.equal(readExperiments(stored.labs['INC-107']).attempts.length, 0);
  assert.equal(stored.labs['INC-107'].verified, false); assert.equal(verifyHardware('INC-107', stored.labs['INC-107'].state).ok, false);
  assert.equal(workbenchProgress(alternate, stored.labs['INC-107'], verifyHardware('INC-107', stored.labs['INC-107'].state)).ready, false, 'Finishing the original does not unlock the alternate.');
  delete stored.labs['INC-107'];
  assert.equal(workbenchProgress(blank, stored.labs['INC-101'], verifyHardware('INC-101', stored.labs['INC-101'].state)).ready, true, 'Starting the alternate again leaves the original finished.');

  // The replay link appears on the original ticket and opens the alternate as a challenge.
  const link = first.page.transfer();
  assert.equal(link.hidden, false); assert.equal(link.children[1].href, labPageHash('INC-107', 1, {mode: 'challenge'}));
  assert.equal(link.children[0].textContent, 'Ready for a replay? Same symptom, different cause: '); assert.equal(link.children[1].textContent, 'Open alternate ticket INC-107 →');
  assert.equal(learningRoute(link.children[1].href).id, 'INC-107'); assert.notEqual(routeAccess(learningRoute(link.children[1].href)), 'unknown');
  first.dispose();
});

test('Classroom Opening Day gives each stage a reason, a recommended order, rotating pair roles and an evidence-based handoff', () => {
  assert.deepEqual(CAPSTONE_STAGES.map(stage => stage.id), ['INC-106', 'NET-201', 'SEC-401', 'AI-302', 'CODE-503']);
  for (const stage of CAPSTONE_STAGES) assert.ok(typeof stage.reason === 'string' && stage.reason.length > 30, stage.id + ' says why the classroom needs it');
  const html = renderCapstone({}, () => ({ok: false}));
  assert.equal((html.match(/<strong>Why the classroom needs it:<\/strong>/gu) || []).length, 5);
  assert.match(html, /Follow the recommended order, 1 to 5/u); assert.match(html, /Your teacher may choose another order\./u); assert.ok(html.includes('There is no time limit.'));
  assert.ok(html.includes('the <strong>Operator</strong> works the equipment and says the prediction aloud. The <strong>Evidence lead</strong> records the clue, the one change and the test result.'));
  assert.match(html, /On your own, you do both jobs\./u);
  const roles = [...html.matchAll(/<p class="capstone-roles">Pairs: Partner A is the ([^·]+) · Partner B is the ([^<]+)<\/p>/gu)].map(match => [match[1].trim(), match[2].trim()]);
  assert.deepEqual(roles, [['Operator', 'Evidence lead'], ['Evidence lead', 'Operator'], ['Operator', 'Evidence lead'], ['Evidence lead', 'Operator'], ['Operator', 'Evidence lead']], 'Roles swap at every work order.');
  const debrief = html.slice(html.indexOf('class="case-panel capstone-debrief"'), html.indexOf('<aside>'));
  for (const job of ['help-desk or field technician', 'quality or incident analyst', 'hardware technician', 'network technician', 'security analyst', 'ai reviewer', 'developer']) assert.ok(debrief.includes(job), job);
  assert.match(debrief, /Nothing in this section is saved or graded\./u); assert.match(debrief, /<strong>Discuss:<\/strong>/u);
  assert.doesNotMatch(html, /leaderboard|countdown|score|points/iu);
  for (const label of ['What works and is ready for opening day?', 'What still needs attention or another check?', 'What evidence supports those judgments?']) assert.ok(html.includes(label), label);
  const record = {events: []};
  for (const key of ['works', 'evidence', 'connection', 'uncertain']) assert.equal(writeCapstoneHandoff(record, key, 'A fictional handoff note for ' + key + '.'), true);
  assert.deepEqual(Object.keys(capstoneHandoff(record)), ['works', 'evidence', 'connection', 'uncertain'], 'The saved handoff keeps its four existing fields.');
  const report = capstoneReport({'CODE-503': record}, () => ({ok: false}));
  assert.match(report, /TECHNICIAN HANDOFF\nWhat works and is ready for opening day\?\nA fictional handoff note for works\./u);
  assert.match(report, /What still needs attention or another check\?\nA fictional handoff note for uncertain\./u);
  assert.match(report, /not a grade/u);
});

test('the notebook Test my idea button behaves like the workbench one: a repeat keeps typed answers and a retry needs no Start', t => {
  const lab = start(t, blank);
  lab.act('input-hdmi'); lab.page.click('[data-experiment-capture]');
  assert.equal(lab.draft().check.ok, false);
  lab.page.type('changed', 'I pressed the monitor input button.'); lab.page.type('observed', 'The screen still showed no picture.');
  const before = JSON.stringify(lab.record.events);
  lab.page.click('[data-experiment-capture]'); lab.page.click('[data-experiment-capture]');
  assert.equal(JSON.stringify(lab.record.events), before, 'A repeat from the notebook button keeps the recorded result and the typed answers.');
  assert.match(lab.page.status(), /already recorded/u);
  lab.page.type('explain', 'The monitor input was not the cause.'); lab.page.click('[data-experiment-save]');
  lab.page.type('predict', 'I think the display cable is in the wrong video socket on the tower.');
  lab.page.type('evidence', 'The input test failed and the cable clue shows which socket is used.');
  lab.act(...FIX['INC-101']); lab.page.click('[data-experiment-capture]');
  assert.deepEqual(lab.draft().before, lab.attempts()[0].after, 'The notebook button also starts from the last saved test.');
  assert.equal(lab.draft().check.ok, true);
  lab.dispose();
});

test('a test that cannot be recorded always says why, and older saved attempts get an accurate note', t => {
  const lab = start(t, blank);
  lab.page.type('predict', 'too short');
  assert.ok(lab.draft().before, 'Shortening the idea before touching the bench keeps the starting setup.');
  lab.act(...FIX['INC-101']); lab.pressTest();
  assert.equal(lab.draft().after, undefined);
  assert.equal(lab.page.status(), 'The test ran. To record it: Write your test idea in a sentence.');
  lab.dispose();

  // An attempt saved before the notebook asked for evidence: it passed, but one answer is missing.
  const old = start(t, blank);
  old.act(...FIX['INC-101']); old.pressTest(); old.explain(); old.page.click('[data-experiment-save]');
  old.record.events = old.record.events.filter(event => !(event.message.startsWith('CLL-EXPERIMENT/1 ') && JSON.parse(event.message.slice('CLL-EXPERIMENT/1 '.length)).p === 'evidence'));
  assert.equal(old.attempts().length, 1); assert.equal(old.attempts()[0].evidence, undefined);
  old.record.verified = true;
  const progress = old.progress();
  assert.equal(progress.ready, false);
  assert.equal(progress.note, 'Your saved test is missing some notebook answers. Record one fresh test with all five.');
  old.pressTest();
  assert.match(old.page.status(), /To record it, write your next idea and the evidence for it in step 1/u, 'The page never stays silent after a test.');
  old.page.type('predict', 'I think the display cable position is why the monitor has no picture.');
  old.page.type('evidence', 'The cable clue and my earlier passing test both point to the cable position.');
  old.pressTest(); old.explain(); old.page.click('[data-experiment-save]');
  assert.equal(old.progress().ready, true, 'One fresh, fully answered test reopens page three.');
  old.dispose();
});

test('recognition wording stays true for labs that have no file to open', () => {
  const source = readFileSync(new URL('../src/experiments.js', import.meta.url), 'utf8');
  assert.ok(source.includes('Your passing test checked the requester’s original task, not only the part you changed.'));
  assert.equal(source.includes('original file in place'), false);
});
