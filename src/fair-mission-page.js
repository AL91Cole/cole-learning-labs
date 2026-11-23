// Tech fair mission page and capstone page.
// Same layout as every guided lab: the lab guide on the left (Introduction, Section 1:
// Hands-On Demonstration, Section 2: Applied Learning, Section 3: Challenge and Analysis)
// and the environment on the right. Here the environment is a fair workbench: a small map,
// labeled controls, test buttons, and a readings table that is also the text view.
// The three playable steps sit on those sections: Get the brief → Introduction;
// Try it → Sections 1 and 2; Prove it → Section 3.
// Every control is a native radio button, checkbox, button or text field, so the page works
// with a keyboard, touch and a screen reader. Nothing is dragged and nothing depends on colour.
import {GUIDE_SECTIONS} from './lab-guide.js?release=20261107-tech-team';
import {labPageHash, learningModes} from './learning-routes.js?release=20261107-tech-team';
import {FAIR_BANDS, FAIR_CAPSTONE, FAIR_FOLLOW_UPS, FAIR_SIM_STARTERS, fairBandMissions} from './fair-catalog.js?release=20261107-tech-team';
import {DECISIONS, HANDOFF_MINIMUM, applyFairAction, fairCompletion, fairMission, fairReport, fairView} from './fair-missions.js?release=20261107-tech-team';
import {ROLLBACK_OPTIONS, applyCapstoneAction, capstoneCompletion, capstoneReport, capstoneStatusText, capstoneView} from './fair-capstone.js?release=20261107-tech-team';
import {fairMapHTML, fairMapText} from './fair-map.js?release=20261107-tech-team';
export {fairReport, capstoneReport, fairMapHTML, fairMapText};

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export const FAIR_STEPS = Object.freeze({introduction:'Get the brief', demonstration:'Try it · worked example', applied:'Try it · your test', challenge:'Prove it'});
const STATION_TEXT = Object.freeze({offline:['○', 'Station offline', 'No test yet.'], testing:['◔', 'Station testing', 'The target is not met yet.'], ready:['◑', 'Target met', 'The current evidence meets the target.'], hold:['■', 'Station on hold', 'The current evidence misses the target.'], online:['●', 'Station online', 'The current evidence meets the target and your crew chose open.']});
const statusWord = ok => ok === null ? 'For comparison' : ok ? 'Meets target' : 'Misses target';
const svg = path => '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">' + path + '</svg>';
const ICONS = Object.freeze({gear:svg('<circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18M4.3 4.3l1.8 1.8M13.9 13.9l1.8 1.8M4.3 15.7l1.8-1.8M13.9 6.1l1.8-1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'), doc:svg('<path d="M5 2h7l4 4v12H5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 2v4h4M8 10h5M8 13h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'), exit:svg('<path d="M8 3H4v14h4M12 6l4 4-4 4M16 10H8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'), print:svg('<path d="M6 7V3h8v4M6 14H3V8h14v6h-3M6 12h8v5H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>')});

function readingTable(item, view) {
  const reading = item.reading, baseline = view.baseline && view.mission.baseline.test === item.id ? view.baseline : null, prior = item.prior;
  const cell = (source, id) => esc(source?.rows.find(entry => entry.id === id)?.value ?? '—');
  const rows = (reading || baseline).rows;
  return '<table class="fair-readings"><caption>' + esc(item.label) + (reading ? ' · test ' + reading.run.n + (item.stale ? ' · out of date' : ' · current') : ' · not run yet') + '</caption><thead><tr><th scope="col">What was measured</th>' + (baseline ? '<th scope="col">Baseline: ' + esc(baseline.label.toLowerCase()) + '</th>' : '') + (prior ? '<th scope="col">Your reading before</th>' : '') + '<th scope="col">' + (item.stale ? 'Last reading (old setup)' : 'Your reading now') + '</th><th scope="col">Target</th><th scope="col">Result</th></tr></thead><tbody>' +
    rows.map(entry => {const now = reading?.rows.find(other => other.id === entry.id); return '<tr><th scope="row">' + esc(entry.label) + '</th>' + (baseline ? '<td>' + cell(baseline, entry.id) + '</td>' : '') + (prior ? '<td>' + cell(prior, entry.id) + '</td>' : '') + '<td class="fair-now">' + (now ? esc(now.value) : '—') + '</td><td>' + esc(entry.target || '—') + '</td><td>' + (now ? '<span class="fair-result ' + (item.stale ? 'is-stale' : now.ok === null ? 'is-info' : now.ok ? 'is-met' : 'is-missed') + '">' + (item.stale ? 'Out of date' : (now.ok === null ? '' : now.ok ? '✓ ' : '✗ ') + statusWord(now.ok)) + '</span>' : 'Not run') + '</td></tr>';}).join('') + '</tbody></table>';
}

function benchHTML(view) {
  const mission = view.mission, state = view.state, station = STATION_TEXT[view.station];
  const controls = mission.controls.map(item => '<fieldset class="fair-control"><legend>' + esc(item.label) + '</legend>' + item.options.map(([value, label, only]) => {const locked = only && only !== state.condition; return '<label class="fair-choice' + (state.config[item.name] === value ? ' is-selected' : '') + '"><input type="radio" name="fair-' + esc(item.name) + '" value="' + esc(value) + '" data-fair-set="' + esc(item.name) + '" data-key="set-' + esc(item.name) + '-' + esc(value) + '"' + (state.config[item.name] === value ? ' checked' : '') + (locked ? ' disabled' : '') + '><span>' + esc(label) + (locked ? ' <em>(not available yet)</em>' : '') + '</span></label>';}).join('') + (item.help ? '<p class="fair-control-help">' + esc(item.help) + '</p>' : '') + '</fieldset>').join('');
  const tests = mission.tests.map(item => '<button type="button" class="button" data-fair-run="' + esc(item.id) + '" data-key="run-' + esc(item.id) + '">' + esc(item.label) + ' <span aria-hidden="true">▸</span></button>').join('');
  const supplied = view.supplied.map(table => '<table class="fair-readings fair-supplied"><caption>' + esc(table.caption) + '</caption><thead><tr>' + table.headers.map(head => '<th scope="col">' + esc(head) + '</th>').join('') + '</tr></thead><tbody>' + table.rows.map(cells => '<tr>' + cells.map((cell, index) => index ? '<td>' + esc(cell) + '</td>' : '<th scope="row">' + esc(cell) + '</th>').join('') + '</tr>').join('') + '</tbody></table>').join('');
  const shown = view.tests.filter(item => item.reading || (view.baseline && mission.baseline.test === item.id));
  const predicted = mission.predict.options.find(([value]) => value === state.predict)?.[1];
  return '<div class="fair-bench" data-station="' + view.station + '">' +
    '<p class="fair-station" data-fair-station><span class="fair-station-mark" aria-hidden="true">' + station[0] + '</span><strong>' + station[1] + '</strong><span>' + esc(station[2]) + '</span></p>' +
    '<section class="fair-panel" aria-labelledby="fair-map-title"><h2 id="fair-map-title">Fair map</h2>' + fairMapHTML(view.scene, mission.title + ' map') + (view.replay ? '<p class="fair-condition"><strong>Changed condition:</strong> ' + esc(mission.replay.text) + '</p>' : '') + '<details class="fair-text-view" open><summary>Text view of the map</summary>' + fairMapText(view.scene) + '</details></section>' +
    (supplied ? '<section class="fair-panel" aria-label="Supplied evidence"><h2>Supplied evidence</h2><div class="fair-scroll" role="region" aria-label="Table, scrolls sideways on a narrow screen" tabindex="0">' + supplied + '</div></section>' : '') +
    '<section class="fair-panel" aria-labelledby="fair-setup-title"><h2 id="fair-setup-title">Your setup</h2><p class="fair-target"><strong>Target:</strong> ' + esc(mission.success) + '</p><div class="fair-controls">' + controls + '</div><h3>Choose a test</h3><div class="fair-tests">' + tests + '</div>' + (view.stale ? '<p class="fair-stale" role="note"><strong>Out of date.</strong> You changed the setup after testing. The reading below belongs to the old setup. Run the test again.</p>' : '') + '</section>' +
    '<section class="fair-panel" aria-labelledby="fair-readings-title"><h2 id="fair-readings-title">Readings</h2><p class="fair-prediction"><strong>Your prediction:</strong> ' + esc(predicted || 'not chosen yet') + '</p>' + (shown.length ? '<div class="fair-scroll" role="region" aria-label="Table, scrolls sideways on a narrow screen" tabindex="0">' + shown.map(item => readingTable(item, view)).join('') + '</div>' : '<p class="panel-help">No readings yet. Choose a test above.</p>') +
    (view.demos.length ? '<h3>Show each of these</h3><ul class="fair-demos">' + view.demos.map(item => '<li class="' + (item.done ? 'is-done' : '') + '"><span aria-hidden="true">' + (item.done ? '✓' : '○') + '</span> ' + esc(item.label) + '<span class="sr-only">' + (item.done ? ' (shown)' : ' (not shown yet)') + '</span></li>').join('') + '</ul>' : '') +
    '<div class="fair-clue"><button type="button" class="lab-tool" data-fair-clue data-key="clue">Give me a clue</button><p data-fair-clue-text aria-live="polite"></p><p class="panel-help">Clues and retries carry no penalty.</p></div>' +
    (state.runs.length ? '<details class="fair-log"><summary>Every test so far (' + state.runs.length + ')</summary><ol>' + state.runs.map(run => '<li>Test ' + run.n + ': ' + esc(mission.tests.find(item => item.id === run.test).label) + ' · ' + (run.condition === 'replay' ? 'after the change' : 'before the change') + ' · ' + esc(mission.controls.map(item => item.options.find(([value]) => value === run.config[item.name])?.[1]).join('; ')) + '</li>').join('') + '</ol></details>' : '') + '</section></div>';
}

function stepList(steps) {
  const current = steps.find(step => !step.done && !step.optional);
  return steps.map((step, index) => '<li class="guide-step' + (step.done ? ' is-done' : '') + (step === current ? ' is-current' : '') + (step.optional ? ' is-optional is-challenge' : '') + '"' + (step === current ? ' aria-current="step"' : '') + '><span class="guide-step-mark" aria-hidden="true">' + (step.done ? '✓' : step.optional ? '★' : index + 1) + '</span><div class="guide-step-body"><p class="guide-step-instruction">' + esc(step.text) + '<span class="sr-only">' + (step.done ? ' (done)' : step.optional ? ' (optional)' : ' (to do)') + '</span></p>' + (step.detail ? '<p class="guide-step-detail">' + esc(step.detail) + '</p>' : '') + '</div></li>').join('');
}
/** Guide progress for a mission, by section. Derived from the same view as the workbench. */
export function fairGuide(view, record, mode = 'guided') {
  const state = view.state, handoff = typeof record?.notes === 'string' && record.notes.trim().length >= HANDOFF_MINIMUM && !/_{3}/.test(record.notes), compared = state.runs.filter(run => run.condition === 'base').length > 1 || view.baseMet;
  const sections = {
    introduction:[{text:'Read who needs help, what you can observe and the target.', done:view.predicted || state.runs.length > 0}, {text:'Predict what will happen.', detail:'There is no wrong prediction. It stays beside your readings so you can compare.', done:view.predicted}],
    demonstration:[{text:'Read the worked example.', done:state.worked || state.runs.length > 0}, {text:'In the workbench, choose a test and run it without changing anything.', detail:'This is your first reading. Put it next to the baseline.', done:view.tried}],
    applied:[{text:'Change one thing in Your setup, then run the test again.', detail:'A changed setup makes the old reading out of date.', done:compared}, {text:'Keep trying until every reading meets the target.', detail:'A miss is evidence too. Ask for a clue if you are stuck.', done:view.baseMet}],
    challenge:[{text:view.mission.replay.action + ', then run a fresh test.', done:view.replay && view.tested}, ...(view.demos.length ? [{text:'Show each case listed under Readings.', done:view.replay && view.demonstrated}] : []), {text:'Select the evidence your decision rests on.', done:view.replay && view.tested && view.chosen.length > 0}, {text:'Tell the next crew: open, hold or revise.', done:view.consistent}, {text:'Write your handoff sentence and hand off.', done:record?.closed === true || (view.consistent && handoff)}, ...(mode === 'challenge' ? [{text:'Challenge: name another possible cause, and the reading that would tell the two apart.', done:typeof record?.reflection === 'string' && record.reflection.trim().length >= HANDOFF_MINIMUM, optional:true}] : [])]
  };
  const list = GUIDE_SECTIONS.map(meta => {const steps = sections[meta.id], required = steps.filter(step => !step.optional); return {...meta, step:FAIR_STEPS[meta.id], steps, done:required.filter(step => step.done).length, total:required.length, complete:required.every(step => step.done)};});
  const totals = list.reduce((sum, section) => ({done:sum.done + section.done, total:sum.total + section.total}), {done:0, total:0});
  return {sections:list, percent:Math.round(100 * totals.done / totals.total), current:list.find(section => !section.complete)?.id || 'challenge'};
}

function sectionBodies(view, record, mode, guide) {
  const mission = view.mission, state = view.state, steps = id => '<ol class="guide-steps" aria-label="' + esc(FAIR_STEPS[id]) + ' steps">' + stepList(guide.sections.find(section => section.id === id).steps) + '</ol>';
  const terms = view.terms.length ? '<h3>Networking words you need now</h3><dl class="fair-terms">' + view.terms.map(item => '<div><dt>' + esc(item.term) + '</dt><dd>' + esc(item.plain) + '</dd></div>').join('') + '</dl>' : '';
  const locked = state.runs.length > 0 && view.predicted;
  const introduction = '<p class="guide-lead">' + esc(mission.brief) + '</p><p class="guide-requester"><b>Who needs help</b> ' + esc(mission.person) + '</p><h3>What you can observe</h3><p>' + esc(mission.observe) + '</p><h3>Target</h3><p>' + esc(mission.success) + '</p>' + terms +
    '<fieldset class="fair-predict"><legend>' + esc(mission.predict.prompt) + '</legend>' + mission.predict.options.map(([value, label]) => '<label class="fair-choice' + (state.predict === value ? ' is-selected' : '') + '"><input type="radio" name="fair-predict" value="' + esc(value) + '" data-fair-predict data-key="predict-' + esc(value) + '"' + (state.predict === value ? ' checked' : '') + (locked ? ' disabled' : '') + '><span>' + esc(label) + '</span></label>').join('') + (locked ? '<p class="panel-help">Your prediction is kept as you made it, so you can compare it with what happened.</p>' : '') + '</fieldset>' +
    '<label class="lab-field" for="fair-why">Why do you think so? <span class="panel-help">(optional short answer)</span><input id="fair-why" type="text" maxlength="600" value="' + esc(record.plan) + '" placeholder="I think… because…" data-fair-text="plan"></label>' + steps('introduction') +
    '<p class="guide-scope">Every person, device and reading in this mission is made up. Nothing here touches a real network.</p>';
  const demonstration = '<details class="fair-worked" data-fair-worked' + (mode === 'guided' || state.worked ? ' open' : '') + '><summary>Worked example</summary><p>' + esc(mission.worked) + '</p></details>' + steps('demonstration');
  const applied = '<p class="panel-help">Now it is your crew’s turn. Change a cable, a place, a setting, a rule or a plan in the workbench and run the test. Compare each reading with the baseline.</p>' + steps('applied') + '<p class="step-progress" role="status">' + (view.baseMet ? 'You found a setup that meets the target. Open Prove it.' : view.tried ? 'Not there yet. Read the result, change one thing and test again.' : 'Run your first test in the workbench.') + '</p>';
  const evidence = view.evidence.length ? '<fieldset class="fair-evidence"><legend>Select the evidence your decision rests on</legend>' + view.evidence.map(item => '<label class="fair-choice' + (item.selected ? ' is-selected' : '') + '"><input type="checkbox" value="' + esc(item.id) + '" data-fair-evidence data-key="evidence-' + esc(item.id) + '"' + (item.selected ? ' checked' : '') + '><span>' + esc(item.label + ': ' + item.value) + ' <em>(' + statusWord(item.ok).toLowerCase() + ')</em></span></label>').join('') + '<p class="panel-help">Only current readings are listed. An out-of-date reading cannot be evidence.</p></fieldset>' : '<p class="panel-help">Evidence appears here after a fresh test.</p>';
  const decision = '<fieldset class="fair-decision"><legend>Tell the next crew</legend>' + DECISIONS.map(item => '<label class="fair-choice' + (state.decision === item.id ? ' is-selected' : '') + '"><input type="radio" name="fair-decision" value="' + item.id + '" data-fair-decide data-key="decide-' + item.id + '"' + (state.decision === item.id ? ' checked' : '') + '><span><strong>' + item.label + '.</strong> ' + esc(item.help) + '</span></label>').join('') + '</fieldset>';
  const completion = fairCompletion(mission.id, state, record.notes);
  const challenge = '<section class="case-panel fair-change"><p class="eyebrow">CHANGE ONE CONDITION</p><p>' + esc(view.replay ? mission.replay.text : 'When your first tests are done, one thing about the fair changes. Your old readings stay for comparison, but they stop being current.') + '</p><button type="button" class="button" data-fair-replay data-key="replay"' + (view.replay ? ' disabled' : '') + '>' + esc(view.replay ? 'Condition changed' : mission.replay.action) + '</button></section>' + steps('challenge') + evidence + decision +
    '<label class="lab-field" for="fair-handoff">Handoff to the next crew<textarea id="fair-handoff" rows="3" maxlength="2000" placeholder="' + esc(mission.starter) + '" data-fair-text="notes" aria-describedby="fair-handoff-help">' + esc(record.notes) + '</textarea></label><p id="fair-handoff-help" class="panel-help">Write it your way, or <button type="button" class="text-button" data-fair-starter data-key="starter">use the sentence starter</button> and fill in each blank.</p>' +
    (mode === 'challenge' ? '<label class="lab-field" for="fair-challenge">Challenge: name another possible cause, and the reading that would tell the two apart.<textarea id="fair-challenge" rows="3" maxlength="2000" data-fair-text="reflection">' + esc(record.reflection) + '</textarea></label>' : '') +
    '<section class="case-panel guide-finish"><p id="finish-status" class="step-progress" role="status" data-fair-finish-status></p><button class="button" id="finish-lab" type="button" data-key="finish">Hand off &amp; open report</button><p class="save-status"></p></section>' +
    (record.closed && completion.ready ? '<nav class="fair-next" aria-label="What next"><h3>What next</h3><ul>' + nextLinks(mission).map(([href, label]) => '<li><a class="text-link" href="' + esc(href) + '">' + esc(label) + ' →</a></li>').join('') + '</ul></nav>' : '');
  // A matching Packet Simulator starter, with the way back to this same step. Practice there is not mission evidence.
  const starter = FAIR_SIM_STARTERS[mission.id], practice = step => starter ? '<p class="fair-practice"><a class="text-link" data-fair-sim href="#networking/simulator?start=build&amp;starter=' + starter + '&amp;from=' + mission.id + '.' + step + '.' + mode + '">Practise this in Packet Simulator →</a> <span class="panel-help">Free practice. It does not count toward this mission.</span></p>' : '';
  return {introduction:introduction + practice('request'), demonstration:demonstration + practice('request'), applied:applied + practice('workbench'), challenge:challenge + practice('explain')};
}
function nextLinks(mission) {
  const band = fairBandMissions(mission.band), next = band[band.findIndex(item => item.id === mission.id) + 1];
  return [next ? ['#lab/' + next.id + '/request', 'Next mission: ' + next.title] : ['#networking/opening-day?band=' + mission.band, 'Capstone: ' + FAIR_CAPSTONE.title], ...(FAIR_FOLLOW_UPS[mission.id] || []).map(([href, label, kind]) => [href, {game:'Practice game', investigation:'Go deeper', practice:'Extra practice', studio:'Build your own'}[kind] + ': ' + label]), ['#networking?band=' + mission.band, 'Back to the fair map']];
}

function shellHTML({id, title, subtitle, exit, guide, bench, feedback, print = true}) {
  return '<section class="lab-shell lab-guide-shell fair-shell" data-track="network" data-fair="' + esc(id) + '"><div class="lab-topbar vm-topbar"><div class="vm-title"><h1>' + esc(title) + '</h1><span class="vm-subtitle">' + esc(subtitle) + '</span></div><div class="lab-tools vm-tools"><button id="reading-toggle" class="lab-tool vm-tool" aria-pressed="false"><span class="vm-aa" aria-hidden="true">Aa</span>Larger text</button><button id="saving-options" class="lab-tool vm-tool">' + ICONS.gear + 'Saving &amp; privacy</button><button id="report-button" class="lab-tool vm-tool">' + ICONS.doc + 'My report</button>' + (print ? '<button id="print-mission" class="lab-tool vm-tool">' + ICONS.print + 'Print</button>' : '') + '<a href="' + esc(exit) + '" class="lab-tool vm-tool vm-exit">' + ICONS.exit + 'Exit</a></div></div>' +
    '<div class="lab-guide-layout">' + guide + '<div class="lab-environment" id="lab-environment" role="region" aria-label="Fair workbench"><div class="environment-bar"><span class="eyebrow">LAB ENVIRONMENT</span><span class="environment-provider">Fair workbench · local model, fictional equipment</span><span data-environment-status role="status"></span></div><div class="environment-screen fair-screen" tabindex="0" aria-label="Fair workbench, scrollable">' + bench + '</div><div id="action-feedback" class="action-feedback environment-feedback fair-feedback" role="status">' + esc(feedback) + '</div><div id="work-privacy" hidden></div></div></div></section>' +
    '<dialog id="lab-dialog"><div id="dialog-content"></div><button id="dialog-close" class="button button-outline">Close</button></dialog>';
}
const guideFrame = (sections, reset) => '<aside class="lab-guide" id="lab-guide" aria-label="Lab guide" tabindex="0"><header class="lab-guide-head"><p class="eyebrow">LAB GUIDE</p><div class="guide-head-tools"><button type="button" class="guide-tool" data-guide-text aria-pressed="false" title="Larger guide text" aria-label="Larger guide text"><span aria-hidden="true">Aa</span></button><button type="button" class="guide-tool" data-guide-report title="Open my report" aria-label="Open my report">' + ICONS.doc + '</button></div></header><div class="guide-progress"><progress data-guide-progress value="0" max="100" aria-label="Mission progress">0%</progress><span data-guide-percent aria-live="polite">0%</span></div>' + sections + '<div class="lab-reset"><button class="text-button" id="reset-ticket" aria-expanded="false" aria-controls="reset-confirm">' + esc(reset) + '</button><div id="reset-confirm" role="group" aria-labelledby="reset-question" hidden><p id="reset-question">This clears this activity’s current work and any saved copy when device saving is on. Export first.</p><button id="confirm-reset" class="lab-tool">Start over</button> <button id="cancel-reset" class="lab-tool">Keep my work</button></div></div></aside>';

/** The mission page. `record` is the mission’s own record; the original investigation has a different one. */
export function renderFairMissionPage(scenario, record, {mode = 'guided', saveStatus = ''} = {}) {
  const mission = fairMission(scenario.id);
  if (!mission) return '<section class="wrap page-intro"><h1>That mission is not at the fair.</h1><a class="button" href="#networking">Open the Networking pathway →</a></section>';
  const view = fairView(mission.id, record.state);
  const modes = '<nav class="fair-modes" aria-label="Support level">' + learningModes.map(item => '<a href="' + esc(labPageHash(mission.id, 1, {mode:item.id})) + '" data-fair-mode="' + item.id + '"' + (item.id === mode ? ' aria-current="true"' : '') + ' title="' + esc(item.description) + '">' + item.label + '</a>').join('') + '</nav>';
  const sections = '<div class="lab-guide-sections">' + modes + GUIDE_SECTIONS.map(meta => '<details class="guide-section" data-guide-section="' + meta.id + '"' + (meta.id === 'introduction' ? ' open' : '') + '><summary><span class="guide-section-title"><span class="fair-step-name">' + FAIR_STEPS[meta.id] + '</span><span class="fair-section-name">' + esc(meta.title) + '</span></span><span class="guide-section-state" data-guide-section-state="' + meta.id + '"></span></summary><div class="guide-section-body" data-fair-body="' + meta.id + '"></div></details>').join('') + '</div>';
  return shellHTML({id:mission.id, title:mission.title, subtitle:mission.id + ' · Networking pathway · Grades ' + mission.grade + ' · about ' + mission.minutes + ' minutes', exit:'#networking?band=' + mission.band, guide:guideFrame(sections, 'Start this mission again'), bench:'<div data-fair-bench>' + benchHTML(view) + '</div>', feedback:record.events.at(-1)?.message || 'Start with Get the brief in the lab guide. Your choices change the workbench on this side.'}) + '<span hidden data-fair-save>' + esc(saveStatus) + '</span>';
}

function bindShell(root, {listen, openReport, onReset, bindWorkPrivacy, scenario}) {
  const $ = selector => root.querySelector(selector), shell = $('.fair-shell');
  bindWorkPrivacy(scenario);
  listen($('#reading-toggle'), 'click', event => {const on = shell.classList.toggle('larger-reading'); event.currentTarget.setAttribute('aria-pressed', String(on));});
  listen($('[data-guide-text]'), 'click', event => {const on = $('.lab-guide').classList.toggle('guide-large'); event.currentTarget.setAttribute('aria-pressed', String(on));});
  listen($('[data-guide-report]'), 'click', openReport);
  listen($('#report-button'), 'click', openReport);
  listen($('#saving-options'), 'click', () => {const privacy = $('#work-privacy'); privacy.hidden = !privacy.hidden; if (!privacy.hidden) {const options = privacy.querySelector('details'); if (options) {options.open = true; options.querySelector('summary')?.focus({preventScroll:true});}}});
  listen($('#dialog-close'), 'click', () => $('#lab-dialog').close());
  // Printing lays the guide and the workbench out as one document with every section open.
  // While printing, the guide stops behaving as a one-at-a-time accordion; it closes again afterwards.
  listen($('#print-mission'), 'click', () => {
    const closed = [...root.querySelectorAll('.fair-shell details:not([open])')], view = root.ownerDocument.defaultView;
    shell.classList.add('fair-printing'); for (const node of closed) node.open = true;
    const restore = () => {for (const node of closed) node.open = false; view?.setTimeout(() => shell.classList.remove('fair-printing'), 0);};
    view?.addEventListener('afterprint', restore, {once:true});
    view?.setTimeout(() => {if (typeof view.print === 'function') view.print(); else restore();}, 50);
  });
  const cancelReset = () => {$('#reset-confirm').hidden = true; $('#reset-ticket').setAttribute('aria-expanded', 'false'); $('#reset-ticket').focus({preventScroll:true});};
  listen($('#reset-ticket'), 'click', () => {$('#reset-confirm').hidden = false; $('#reset-ticket').setAttribute('aria-expanded', 'true'); $('#cancel-reset').focus({preventScroll:true});});
  listen($('#cancel-reset'), 'click', cancelReset);
  listen($('#reset-confirm'), 'keydown', event => {if (event.key === 'Escape') {event.preventDefault(); cancelReset();}});
  listen($('#confirm-reset'), 'click', () => onReset());
}
const logEvent = (record, message, kind) => {record.events.push({time:new Date().toISOString(), kind:kind || 'info', message:String(message).slice(0, 600)}); if (record.events.length > 200) record.events.splice(0, record.events.length - 200);};
const keepFocus = (root, change) => {const key = root.ownerDocument?.activeElement?.dataset?.key; change(); if (key) root.querySelector('[data-key="' + key.replace(/["\\]/g, '') + '"]')?.focus({preventScroll:true});};

export function mountFairMission(root, {scenario, record:r, route = null, save = () => {}, openReport = () => {}, showNotice = () => {}, onComplete = () => {}, onReset = () => {}, saveStatus = () => '', onSection = () => {}, bindWorkPrivacy = () => {}}) {
  const mission = fairMission(scenario.id);
  if (!mission) return {syncRoute:() => false, dispose() {}};
  const $ = selector => root.querySelector(selector), $$ = selector => [...root.querySelectorAll(selector)];
  const controller = new AbortController(), signal = controller.signal, listen = (node, event, handler, capture = false) => node?.addEventListener(event, handler, {signal, capture});
  const mode = route?.mode || 'guided', report = () => openReport({id:mission.id, title:mission.title, grade:mission.grade}, r, fairReport(mission.id, r));
  const feedback = $('#action-feedback');
  function status(view, guide) {
    const bar = $('[data-guide-progress]'); bar.value = guide.percent; bar.textContent = guide.percent + '%'; $('[data-guide-percent]').textContent = guide.percent + '%';
    for (const section of guide.sections) {const node = $('[data-guide-section-state="' + section.id + '"]'); node.textContent = section.complete ? '✓ Complete' : section.done + ' / ' + section.total; node.classList.toggle('is-complete', section.complete); $('[data-guide-section="' + section.id + '"]').classList.toggle('is-current', section.id === guide.current);}
    const completion = fairCompletion(mission.id, r.state, r.notes), finish = $('[data-fair-finish-status]');
    if (finish) finish.textContent = r.closed ? 'Handed off. Review your report, or keep improving your evidence.' : completion.ready ? 'Everything is ready. Hand off to open your report.' : 'Before you hand off: ' + completion.blockers.join('; ') + '.';
    $('[data-environment-status]').textContent = STATION_TEXT[view.station][1];
    for (const node of $$('.save-status')) node.textContent = saveStatus(r);
  }
  function refresh() {
    const view = fairView(mission.id, r.state), guide = fairGuide(view, r, mode), bodies = sectionBodies(view, r, mode, guide);
    keepFocus(root, () => {for (const [id, html] of Object.entries(bodies)) {const node = $('[data-fair-body="' + id + '"]'); if (node.dataset.html !== html) {node.innerHTML = html; node.dataset.html = html;}} $('[data-fair-bench]').innerHTML = benchHTML(view);});
    status(view, guide);
  }
  function act(action, value) {
    const result = applyFairAction(mission.id, r.state, action, value);
    r.state = result.state;
    // Any change to the work reopens a handed-off mission; looking at a clue does not.
    if (!result.viewOnly) {r.closed = false; logEvent(r, result.message, result.kind);}
    r.verified = fairView(mission.id, r.state).met;
    save(); refresh();
    feedback.textContent = result.message; feedback.dataset.kind = result.kind;
    return result;
  }
  function openSection(id, {focus = false, writeHistory = true} = {}) {
    const target = GUIDE_SECTIONS.find(section => section.id === id) || GUIDE_SECTIONS[0];
    for (const node of $$('[data-guide-section]')) node.open = node.dataset.guideSection === target.id;
    onSection(target.route);
    if (writeHistory) {const hash = labPageHash(mission.id, target.route, {mode}); if (location.hash !== hash) history.replaceState(null, '', hash);}
    if (focus) $('[data-guide-section="' + target.id + '"] summary')?.focus({preventScroll:true});
  }
  const openNow = () => GUIDE_SECTIONS.find(section => section.id === $$('[data-guide-section]').find(node => node.open)?.dataset.guideSection) || GUIDE_SECTIONS[0];
  function syncRoute(next) {
    if (next.page !== 'lab' || next.id !== mission.id || (next.mode || 'guided') !== mode) return false;
    openSection(next.section === 3 ? 'challenge' : next.section === 2 ? 'applied' : openNow().route === 1 ? openNow().id : 'introduction', {writeHistory:false});
    return true;
  }
  bindShell(root, {listen, openReport:report, onReset, bindWorkPrivacy, scenario});
  listen($('.lab-guide-sections'), 'toggle', event => {
    const node = event.target.closest?.('[data-guide-section]');
    if (node?.open && event.target === node && !$('.fair-shell').classList.contains('fair-printing')) {for (const other of $$('[data-guide-section]')) if (other !== node) other.open = false; const meta = GUIDE_SECTIONS.find(section => section.id === node.dataset.guideSection); onSection(meta.route); const hash = labPageHash(mission.id, meta.route, {mode}); if (location.hash !== hash) history.replaceState(null, '', hash);}
    if (event.target.matches?.('[data-fair-worked]') && event.target.open && !r.state.worked) {r.state = applyFairAction(mission.id, r.state, 'worked').state; save(); status(fairView(mission.id, r.state), fairGuide(fairView(mission.id, r.state), r, mode));}
  }, true);
  listen(root, 'change', event => {
    const target = event.target;
    if (target.matches?.('[data-fair-set]')) act('set', {name:target.dataset.fairSet, value:target.value});
    else if (target.matches?.('[data-fair-predict]')) act('predict', target.value);
    else if (target.matches?.('[data-fair-evidence]')) act('evidence', target.value);
    else if (target.matches?.('[data-fair-decide]')) act('decide', target.value);
  });
  listen(root, 'input', event => {
    const field = event.target.dataset?.fairText;
    if (!['plan', 'notes', 'reflection'].includes(field)) return;
    r[field] = event.target.value; if (field === 'notes') r.closed = false;
    save(); const view = fairView(mission.id, r.state); status(view, fairGuide(view, r, mode));
  });
  listen(root, 'click', event => {
    const target = event.target.closest?.('button'); if (!target) return;
    if (target.dataset.fairRun) act('run', target.dataset.fairRun);
    else if ('fairReplay' in target.dataset) act('replay');
    else if ('fairClue' in target.dataset) {const result = act('clue'); const text = $('[data-fair-clue-text]'); if (text) text.textContent = result.message;}
    else if ('fairStarter' in target.dataset) {const field = $('#fair-handoff'); if (!field.value.trim()) {field.value = mission.starter; r.notes = field.value; save();} field.focus(); const blank = field.value.indexOf('___'); if (blank >= 0) field.setSelectionRange(blank, blank + 3);}
    else if (target.id === 'finish-lab') {
      const completion = fairCompletion(mission.id, r.state, r.notes);
      if (!completion.ready) {showNotice('Before you hand off: ' + completion.blockers[0] + '.'); feedback.textContent = 'Before you hand off: ' + completion.blockers.join('; ') + '.'; feedback.dataset.kind = 'warning'; return;}
      r.closed = true; r.verified = fairView(mission.id, r.state).met; logEvent(r, 'Handed off to the next crew: ' + completion.decision + '.', 'success'); onComplete(); save(); refresh();
      feedback.textContent = 'Handed off to the next crew: ' + completion.decision + '. Your report is open.'; feedback.dataset.kind = 'success';
      showNotice('Handed off. Review your report before exporting.'); report();
    }
  });
  refresh();
  openSection(route?.section === 3 ? 'challenge' : route?.section === 2 ? (fairGuide(fairView(mission.id, r.state), r, mode).sections[1].complete ? 'applied' : 'demonstration') : 'introduction', {writeHistory:false});
  return {syncRoute, refreshStatus:refresh, dispose() {controller.abort();}};
}

function capstoneStationHTML(item, view) {
  const owned = view.owned.includes(item.id), name = item.control.name, status = capstoneStatusText(item.status);
  const rows = (item.reading || item.baseline).rows;
  return '<section class="fair-panel fair-station-card' + (owned ? ' is-owned' : '') + '" data-station="' + item.id + '" data-status="' + item.status + '" aria-labelledby="station-' + item.id + '"><h2 id="station-' + item.id + '">' + esc(item.title) + (owned ? ' <span class="fair-owned">Your crew</span>' : '') + '</h2><p class="fair-station"><span class="fair-station-mark" aria-hidden="true">' + ({open:'●', hold:'■', revise:'◆'}[item.status] || '○') + '</span><strong>' + esc(status) + '</strong></p><p><strong>Rehearsal:</strong> ' + esc(item.rehearsal) + '</p><p class="fair-target"><strong>Evidence for opening:</strong> ' + esc(item.target) + '</p>' +
    '<fieldset class="fair-control"><legend>' + esc(item.control.label) + '</legend>' + item.control.options.map(([value, label]) => '<label class="fair-choice' + (item.config[name] === value ? ' is-selected' : '') + '"><input type="radio" name="cap-' + item.id + '" value="' + esc(value) + '" data-cap-set="' + item.id + '" data-key="cap-set-' + item.id + '-' + esc(value) + '"' + (item.config[name] === value ? ' checked' : '') + '><span>' + esc(label) + '</span></label>').join('') + '</fieldset>' +
    '<div class="fair-tests"><button type="button" class="button" data-cap-run="' + item.id + '" data-key="cap-run-' + item.id + '">' + esc(item.test) + ' <span aria-hidden="true">▸</span></button></div>' + (item.stale ? '<p class="fair-stale" role="note"><strong>Out of date.</strong> The setup changed after the last test. Run it again.</p>' : '') +
    '<div class="fair-scroll" role="region" aria-label="Table, scrolls sideways on a narrow screen" tabindex="0"><table class="fair-readings"><caption>' + esc(item.title) + ' readings' + (item.reading ? (item.stale ? ' · out of date' : ' · current') : ' · no new test yet') + '</caption><thead><tr><th scope="col">What was measured</th><th scope="col">Rehearsal</th>' + (item.prior ? '<th scope="col">Your reading before</th>' : '') + '<th scope="col">' + (item.stale ? 'Last reading (old setup)' : 'Your reading now') + '</th><th scope="col">Target</th><th scope="col">Result</th></tr></thead><tbody>' + rows.map(entry => {const now = item.reading?.rows.find(other => other.id === entry.id); return '<tr><th scope="row">' + esc(entry.label) + '</th><td>' + esc(item.baseline.rows.find(other => other.id === entry.id).value) + '</td>' + (item.prior ? '<td>' + esc(item.prior.rows.find(other => other.id === entry.id).value) + '</td>' : '') + '<td class="fair-now">' + (now ? esc(now.value) : '—') + '</td><td>' + esc(entry.target) + '</td><td>' + (now ? '<span class="fair-result ' + (item.stale ? 'is-stale' : now.ok ? 'is-met' : 'is-missed') + '">' + (item.stale ? 'Out of date' : (now.ok ? '✓ ' : '✗ ') + statusWord(now.ok)) + '</span>' : 'Not run') + '</td></tr>';}).join('') + '</tbody></table></div>' +
    '<fieldset class="fair-decision"><legend>' + esc(item.title) + ': tell the next crew</legend>' + DECISIONS.map(decision => '<label class="fair-choice' + (item.decision === decision.id ? ' is-selected' : '') + '"><input type="radio" name="cap-decide-' + item.id + '" value="' + decision.id + '" data-cap-decide="' + item.id + '" data-key="cap-decide-' + item.id + '-' + decision.id + '"' + (item.decision === decision.id ? ' checked' : '') + '><span><strong>' + decision.label + '.</strong> ' + esc(decision.help) + '</span></label>').join('') + '</fieldset></section>';
}
function capstoneBench(view) {
  return '<div class="fair-bench fair-capstone-bench"><section class="fair-panel" aria-labelledby="fair-board-title"><h2 id="fair-board-title">Opening-day board</h2><div class="fair-scroll" role="region" aria-label="Table, scrolls sideways on a narrow screen" tabindex="0"><table class="fair-readings"><caption>Station status. Each station opens on its own evidence.</caption><thead><tr><th scope="col">Station</th><th scope="col">Crew</th><th scope="col">Status</th></tr></thead><tbody>' + view.stations.map(item => '<tr><th scope="row">' + esc(item.title) + '</th><td>Grades ' + esc(FAIR_BANDS.find(band => band.id === item.owner).grade) + (item.owner === '11-12' ? '' : ' and 11–12') + '</td><td>' + esc(capstoneStatusText(item.status)) + '</td></tr>').join('') + '</tbody></table></div><p>' + view.open + ' of 4 stations open. A station on hold does not stop the others.</p></section>' + view.stations.map(item => capstoneStationHTML(item, view)).join('') + '</div>';
}
function capstoneGuide(view, record) {
  const state = view.state, completion = capstoneCompletion(state, record.notes), owned = view.stations.filter(item => view.owned.includes(item.id));
  return '<div class="lab-guide-sections"><div class="guide-section-body fair-capstone-guide"><p class="guide-lead">The fair opens in forty minutes. Four stations rehearsed last night, and not all of them passed. Repair, retest and decide for each one: open, hold or revise.</p><fieldset class="fair-predict"><legend>Which crew are you?</legend>' + FAIR_BANDS.map(band => '<label class="fair-choice' + (state.band === band.id ? ' is-selected' : '') + '"><input type="radio" name="cap-band" value="' + band.id + '" data-cap-band data-key="cap-band-' + band.id + '"' + (state.band === band.id ? ' checked' : '') + '><span><strong>Grades ' + band.grade + '.</strong> Owns: ' + esc(band.owns.toLowerCase()) + '</span></label>').join('') + '</fieldset>' +
    '<h3>Your crew’s job</h3>' + (owned.length ? '<ol class="guide-steps">' + stepList(owned.map(item => ({text:item.title + ': repair, run a new test and decide.', detail:item.target, done:item.consistent}))) + '</ol>' : '<p class="panel-help">Choose your crew to see which stations you own. You can still try the others.</p>') +
    (view.coordinator ? '<fieldset class="fair-decision"><legend>Rollback decision: if a station fails after the doors open, what does the crew do?</legend>' + ROLLBACK_OPTIONS.map(([value, label, why]) => '<label class="fair-choice' + (state.rollback === value ? ' is-selected' : '') + '"><input type="radio" name="cap-rollback" value="' + value + '" data-cap-rollback data-key="cap-rollback-' + value + '"' + (state.rollback === value ? ' checked' : '') + '><span>' + esc(label) + (state.rollback === value ? ' <em>' + esc(why) + '</em>' : '') + '</span></label>').join('') + '</fieldset>' : '') +
    '<label class="lab-field" for="fair-handoff">Opening-day handoff<textarea id="fair-handoff" rows="4" maxlength="2000" placeholder="Our station is ___ because the new test showed ___. Next, the crew should ___." data-fair-text="notes">' + esc(record.notes) + '</textarea></label>' +
    '<section class="case-panel guide-finish"><p id="finish-status" class="step-progress" role="status">' + esc(record.closed ? 'Handed off. Review your report, or keep improving your evidence.' : completion.ready ? 'Everything is ready. Hand off to open your report.' : 'Before you hand off: ' + completion.blockers.join('; ') + '.') + '</p><button class="button" id="finish-lab" type="button" data-key="finish">Hand off &amp; open report</button><p class="save-status"></p></section><p class="guide-scope">Every station, person and reading here is made up. Nothing touches a real network.</p></div></div>';
}
export function renderFairCapstonePage(record) {
  const view = capstoneView(record.state);
  return shellHTML({id:FAIR_CAPSTONE.id, title:FAIR_CAPSTONE.title, subtitle:FAIR_CAPSTONE.id + ' · Networking pathway capstone · Grades 7–12 · about ' + FAIR_CAPSTONE.minutes + ' minutes', exit:'#networking', guide:guideFrame('<div data-cap-guide>' + capstoneGuide(view, record) + '</div>', 'Start the capstone again'), bench:'<div data-fair-bench>' + capstoneBench(view) + '</div>', feedback:record.events.at(-1)?.message || 'Choose your crew in the lab guide, then repair and retest a station on this side.'});
}
export function mountFairCapstone(root, {scenario, record:r, band = '', save = () => {}, openReport = () => {}, showNotice = () => {}, onComplete = () => {}, onReset = () => {}, saveStatus = () => '', bindWorkPrivacy = () => {}}) {
  const $ = selector => root.querySelector(selector), controller = new AbortController(), signal = controller.signal, listen = (node, event, handler) => node?.addEventListener(event, handler, {signal});
  const report = () => openReport({id:FAIR_CAPSTONE.id, title:FAIR_CAPSTONE.title, grade:'7–12'}, r, capstoneReport(r)), feedback = $('#action-feedback');
  function refresh({guide = true} = {}) {
    const view = capstoneView(r.state);
    keepFocus(root, () => {if (guide) $('[data-cap-guide]').innerHTML = capstoneGuide(view, r); $('[data-fair-bench]').innerHTML = capstoneBench(view);});
    $('[data-guide-progress]').value = Math.round(100 * (view.owned.length ? view.stations.filter(item => view.owned.includes(item.id) && item.consistent).length / view.owned.length : 0)); $('[data-guide-percent]').textContent = $('[data-guide-progress]').value + '%';
    $('[data-environment-status]').textContent = view.open + ' of 4 open';
    for (const node of root.querySelectorAll('.save-status')) node.textContent = saveStatus(r);
  }
  function act(action, value) {const result = applyCapstoneAction(r.state, action, value); r.state = result.state; if (!result.viewOnly) {r.closed = false; logEvent(r, result.message, result.kind);} save(); refresh(); feedback.textContent = result.message; feedback.dataset.kind = result.kind;}
  bindShell(root, {listen, openReport:report, onReset, bindWorkPrivacy, scenario});
  // A link from a band's mission list arrives with the band chosen; the crew can still change it.
  if (!r.state.band && FAIR_BANDS.some(item => item.id === band)) r.state = applyCapstoneAction(r.state, 'band', band).state;
  listen(root, 'change', event => {
    const target = event.target;
    if (target.matches?.('[data-cap-band]')) act('band', target.value);
    else if (target.matches?.('[data-cap-rollback]')) act('rollback', target.value);
    else if (target.matches?.('[data-cap-set]')) act('set', {station:target.dataset.capSet, value:target.value});
    else if (target.matches?.('[data-cap-decide]')) act('decide', {station:target.dataset.capDecide, decision:target.value});
  });
  listen(root, 'input', event => {if (event.target.dataset?.fairText !== 'notes') return; r.notes = event.target.value; r.closed = false; save(); const completion = capstoneCompletion(r.state, r.notes); $('#finish-status').textContent = completion.ready ? 'Everything is ready. Hand off to open your report.' : 'Before you hand off: ' + completion.blockers.join('; ') + '.';});
  listen(root, 'click', event => {
    const target = event.target.closest?.('button'); if (!target) return;
    if (target.dataset.capRun) act('run', {station:target.dataset.capRun});
    else if (target.id === 'finish-lab') {
      const completion = capstoneCompletion(r.state, r.notes);
      if (!completion.ready) {showNotice('Before you hand off: ' + completion.blockers[0] + '.'); feedback.textContent = 'Before you hand off: ' + completion.blockers.join('; ') + '.'; feedback.dataset.kind = 'warning'; return;}
      r.closed = true; r.verified = true; logEvent(r, 'Opening-day handoff recorded.', 'success'); onComplete(); save(); refresh(); feedback.textContent = 'Opening-day handoff recorded. Your report is open.'; feedback.dataset.kind = 'success'; showNotice('Handed off. Review your report before exporting.'); report();
    }
  });
  refresh();
  return {syncRoute:() => false, dispose() {controller.abort();}};
}
