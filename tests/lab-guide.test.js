import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {labFormat, GUIDE_TRACKS} from '../src/lab-format.js';
import {labGuide, labGuideFacts, labGuideReport, renderLabGuidePage, guideOverview, codingDemonstration, GUIDE_SECTIONS} from '../src/lab-guide.js';
import {SCENARIOS} from '../src/scenarios.js';
import {CODING_SCENARIOS, initialCodingState, applyCodingAction, codingStarter, codingChallengeComplete, normalizeCodingState} from '../src/coding-lab.js';
import {normalizeLabRecord} from '../src/records.js';
import {applyWorkspaceAction} from '../src/workspaces.js';

const byId = id => SCENARIOS.find(item => item.id === id);
const guided = SCENARIOS.filter(scenario => labFormat(scenario).guide);
const facts = (overrides = {}) => ({language:'javascript', acknowledged:[], mission:null, transfer:null, transferHref:'', resources:false, edited:false, tested:false, works:false, planned:false, recorded:false, ready:false, verified:false, notes:false, reflection:false, closed:false, challenge:false, ...overrides});

test('hardware stays ticket-style; networking, AI, cybersecurity and coding labs open as guided labs', () => {
  assert.deepEqual(GUIDE_TRACKS, ['network', 'ai', 'security', 'coding']);
  for (const scenario of SCENARIOS) {
    const format = labFormat(scenario);
    assert.equal(format.guide, scenario.track !== 'hardware', scenario.id);
    assert.equal(format.ticket, !format.guide);
  }
  assert.equal(guided.length, 34);
});

test('every guided lab has an introduction, three sections, resource cards and an optional unguided challenge', () => {
  assert.deepEqual(GUIDE_SECTIONS.map(section => section.title), ['Introduction', 'Section 1: Hands-On Demonstration', 'Section 2: Applied Learning', 'Section 3: Challenge and Analysis']);
  for (const scenario of guided) {
    const overview = guideOverview(scenario), guide = labGuide(scenario, facts());
    assert.equal(overview.introduction, scenario.brief);
    assert.equal(overview.objectives[0], scenario.goal);
    assert.equal(overview.resources.length, scenario.clues.length, scenario.id + ' turns every clue into a resource card');
    assert.equal(guide.sections.length, 4);
    for (const section of guide.sections) {
      assert.ok(section.steps.length >= 2, scenario.id + ' ' + section.id);
      for (const step of section.steps) assert.ok(step.id && step.instruction && step.check, scenario.id + ' step shape');
      assert.ok(!section.steps.some(step => step.id !== 'read-resources' && /\bask\b|requester|ticket/i.test(step.instruction)), scenario.id + ' has nothing to ask and no ticket');
    }
    const challenge = guide.sections[3].steps.find(step => step.challenge);
    assert.ok(challenge?.optional && challenge.detail === '', scenario.id + ' ends with an unguided optional challenge');
    assert.equal(guide.sections[3].steps.at(-1).id, 'finish');
    assert.equal(guide.percent, 0);
  }
});

test('coding demonstrations quote a real starter line in each language and the demonstrated fix passes every fixture', () => {
  for (const scenario of CODING_SCENARIOS) for (const language of ['javascript', 'python']) {
    const fix = codingDemonstration(scenario.id, language), starter = codingStarter(scenario.id, language);
    assert.ok(starter.includes(fix.from), scenario.id + ' ' + language + ' quotes the starter');
    const fixed = starter.replace(fix.from, fix.to), state = applyCodingAction(scenario.id, {...initialCodingState(scenario.id), language, code:fixed}, 'run-check', {code:fixed}).state;
    assert.ok(state.results.length > 0 && state.results.every(result => result.ok), scenario.id + ' ' + language + ' fix passes');
    const step = labGuide(scenario, facts({language})).sections[1].steps.find(step => step.id === 'edit');
    assert.ok(step.code && step.detail.includes(fix.from) && step.detail.includes(fix.to) && step.detail.includes(fix.why));
  }
});

test('non-coding demonstrations use the live workspace mission hint and fall back to a bench instruction', () => {
  const change = labGuide(byId('NET-201'), facts({mission:{next:'Investigate: the saved address.', hints:['Read the sheet.', 'Compare it.', 'Test it.']}})).sections[1].steps.find(step => step.id === 'change');
  assert.equal(change.instruction, 'Investigate: the saved address.');
  assert.equal(change.detail, 'Read the sheet. Compare it. Test it.');
  assert.match(labGuide(byId('SEC-401'), facts()).sections[1].steps.find(step => step.id === 'change').instruction, /security console/);
});

test('steps complete from facts, acknowledgements count only for read steps, and the percent tracks required steps', () => {
  const scenario = byId('NET-201');
  const partial = labGuide(scenario, facts({acknowledged:['read-introduction', 'verify', 'inspect'], resources:true}));
  assert.equal(partial.sections[0].complete, true);
  assert.equal(partial.sections[1].steps.find(step => step.id === 'inspect').done, true);
  assert.equal(partial.sections[3].steps.find(step => step.id === 'verify').done, false, 'an acknowledgement cannot verify the task');
  assert.equal(partial.current, 'demonstration');
  const total = partial.sections.reduce((sum, section) => sum + section.total, 0), done = partial.sections.reduce((sum, section) => sum + section.done, 0);
  assert.equal(partial.percent, Math.round(100 * done / total));
  const finished = labGuide(scenario, facts({acknowledged:['read-introduction', 'inspect'], resources:true, works:true, tested:true, planned:true, recorded:true, ready:true, verified:true, notes:true, reflection:true, closed:true}));
  assert.equal(finished.percent, 100);
  assert.ok(finished.sections.every(section => section.complete));
  assert.equal(finished.sections[3].steps.find(step => step.challenge).done, false, 'the optional challenge never blocks completion');
});

test('facts come from the record and the workspace: resources, edits, tests, the notebook and the coding challenge', () => {
  const scenario = byId('CODE-501'), record = normalizeLabRecord(scenario, {});
  let current = labGuideFacts(scenario, record);
  assert.equal(current.resources, false); assert.equal(current.edited, false); assert.equal(current.tested, false); assert.equal(current.works, false); assert.equal(current.challenge, false);
  const js = 'let total = quantity * 3;\nprint(total);';
  record.state = applyCodingAction(scenario.id, record.state, 'run-check', {code:js}).state;
  record.evidence = scenario.clues.map(clue => clue.id);
  current = labGuideFacts(scenario, record);
  assert.equal(current.resources, true); assert.equal(current.edited, true); assert.equal(current.tested, true); assert.equal(current.works, true);
  assert.equal(current.ready, false, 'a passing run is not a saved experiment');
  const py = 'total = quantity * 3\nprint(total)';
  record.state = applyCodingAction(scenario.id, applyCodingAction(scenario.id, record.state, 'set-language', {language:'python', code:py}).state, 'run-check', {code:py}).state;
  assert.equal(labGuideFacts(scenario, record).challenge, true, 'passing in both languages completes the challenge');
  const forged = normalizeCodingState(scenario.id, {...record.state, solutions:{javascript:'print(6);', python:py}});
  assert.equal(codingChallengeComplete(forged), false, 'a remembered solution must still pass today');
  const network = byId('NET-201'), networkRecord = normalizeLabRecord(network, {});
  assert.equal(labGuideFacts(network, networkRecord).edited, false);
  networkRecord.state = applyWorkspaceAction(network.id, networkRecord.state, 'inspect-command', {command:'help'}).state;
  assert.equal(labGuideFacts(network, networkRecord).edited, false, 'inspecting is not a change');
});

test('the rendered page puts the lab guide beside the environment with no requester conversation, and escapes authored text', () => {
  for (const scenario of guided) {
    const record = normalizeLabRecord(scenario, {});
    const html = renderLabGuidePage(scenario, record, {trackName:'Track'});
    assert.ok(html.indexOf('id="lab-guide"') < html.indexOf('id="lab-environment"'), scenario.id + ' guide precedes the environment');
    assert.ok(html.includes('LAB GUIDE') && html.includes('LAB ENVIRONMENT') && html.includes('id="workspace"'), scenario.id);
    for (const section of GUIDE_SECTIONS) assert.ok(html.includes('data-guide-section="' + section.id + '"') && html.includes(section.title.replace('&', '&amp;')), scenario.id + ' ' + section.id);
    for (const clue of scenario.clues) assert.ok(html.includes('data-resource="' + clue.id + '"'), scenario.id + ' resource ' + clue.id);
    for (const forbidden of ['question-form', 'student-question', 'interview-history', 'READ THE TICKET', 'idea-form', 'Ask at least one question']) assert.ok(!html.includes(forbidden), scenario.id + ' has no ' + forbidden);
    for (const id of ['experiment-tools', 'verify-task', 'notes', 'reflection', 'finish-lab', 'reset-ticket', 'lab-dialog', 'work-privacy', 'coding-editor'.replace('coding-editor', 'action-feedback')]) assert.ok(html.includes('id="' + id + '"'), scenario.id + ' needs #' + id);
  }
  const hostile = {...byId('CODE-501'), brief:'<script>alert(1)</script> brief', clues:[{id:'input', label:'<b>x</b>', text:'<img src=x onerror=1>'}]};
  const html = renderLabGuidePage(hostile, normalizeLabRecord(hostile, {}));
  assert.ok(!html.includes('<script>') && !html.includes('<img') && html.includes('&lt;script&gt;'));
});

test('the report block lists section progress and the challenge; records keep analysis answers as the finish rule', () => {
  const scenario = byId('CODE-502'), record = normalizeLabRecord(scenario, {});
  assert.equal(labGuideReport(scenario, record), 'Introduction: 0 of 2 steps\nSection 1: Hands-On Demonstration: 0 of 4 steps\nSection 2: Applied Learning: 0 of 3 steps\nSection 3: Challenge and Analysis: 0 of 4 steps\nChallenge: not attempted');
  const written = {closed:true, verified:true, notes:'I changed the comparison and the test showed every card matching.', reflection:'The reference card explains the three ranges and the test proves them.'};
  assert.equal(normalizeLabRecord(byId('NET-202'), written).closed, true, 'a guided lab stays finished with its analysis answers');
  assert.equal(normalizeLabRecord(byId('NET-202'), {...written, reflection:'too short'}).closed, false);
  assert.equal(normalizeLabRecord(byId('INC-101'), written).closed, false, 'a ticket lab still needs its saved first idea');
  assert.deepEqual(normalizeLabRecord(scenario, {manual:['read-introduction', 'read-introduction', '<img>', 'x'.repeat(41), 7]}).manual, ['read-introduction']);
});

test('the application routes guided labs to the lab guide and keeps labPage for hardware tickets', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /labFormat\(s\)\.guide&&typeof renderLabGuidePage==='function'\?labGuidePage\(s\):labPage\(s\)/);
  assert.match(source, /if\(currentLab&&typeof labFormat==='function'&&labFormat\(currentLab\)\.guide&&typeof mountLabGuide==='function'\)\{/);
  assert.match(source, /else if\(currentLab\)\{const labController=bindLab\(/);
  assert.match(source, /guide\?'LAB REPORT':'INVESTIGATION REPORT'/);
  assert.match(source, /guide\?'TASK VERIFIED — LAB OPEN':'TECHNICALLY VERIFIED — TICKET OPEN'/);
  const lazy = readFileSync(new URL('../src/lazy-investigation.js', import.meta.url), 'utf8');
  assert.match(lazy, /export \{renderLabGuidePage,mountLabGuide,labGuideReport\} from '\.\/lab-guide\.js\?release=/);
});
