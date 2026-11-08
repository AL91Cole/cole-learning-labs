// Guided lab: a lab guide beside the simulated environment, in the style of
// published virtual labs. The guide has an Introduction, Section 1: Hands-On
// Demonstration (every step spelled out), Section 2: Applied Learning (the
// experiment notebook, with less direction) and Section 3: Challenge and
// Analysis (verify the task, answer the analysis questions, try the unguided
// challenge, finish). There is no requester conversation and nothing to ask:
// the introduction and its resource cards give the learner what they need.
// Progress is read from the saved record and the live workspace; the guide
// stores only the ids of steps the learner marked as read.
import {applyWorkspaceAction, verifyWorkspace, renderWorkspace, disposeWorkspace, getWorkspaceMission} from './workspaces.js?release=20261107-tech-team';
import {codingChallengeComplete, codingStarter, CODING_LANGUAGES} from './coding-lab.js?release=20261107-tech-team';
import {renderExperiments, mountExperiments, readExperiments, experimentEventText, retainExperimentEvents} from './experiments.js?release=20261107-tech-team';
import {workbenchProgress} from './records.js?release=20261107-tech-team';
import {transferCaseFor} from './scenarios.js?release=20261107-tech-team';
import {labTools} from './lab-shell.js?release=20261107-tech-team';
import {codingDefinition} from './coding-lab.js?release=20261107-tech-team';
import {labPageHash} from './learning-routes.js?release=20261107-tech-team';
import {preferredLabEnvironment} from './lab-environment.js?release=20261107-tech-team';
import './lab-desktop.js?release=20261107-tech-team';
export {labFormat} from './lab-format.js?release=20261107-tech-team';

export const SHELL_PROMPT = 'student@lab-pc:~/lab$';
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const key = id => typeof id === 'string' ? id.replaceAll('-', '').toUpperCase() : '';

export const GUIDE_SECTIONS = Object.freeze([
  Object.freeze({id:'introduction', title:'Introduction', route:1}),
  Object.freeze({id:'demonstration', title:'Section 1: Hands-On Demonstration', route:1}),
  Object.freeze({id:'applied', title:'Section 2: Applied Learning', route:2}),
  Object.freeze({id:'challenge', title:'Section 3: Challenge and Analysis', route:3})
]);

const TRACKS = Object.freeze({
  network:{name:'Networking & operating systems', bench:'the network workbench', tools:['Simulated devices, settings and read-only diagnostics', 'Workspace test that checks every requirement at once', 'Experiment notebook and lab report'], objectives:['Compare the case requirements with each saved setting.', 'Change one setting, run the workspace test and read the result as evidence.', 'Explain which observation shows the original task working.'], challenge:'Analysis: in your reflection, predict what the workspace test would show if your change were undone, and why.'},
  ai:{name:'AI & responsible use', bench:'the AI practice board', tools:['Simulated prompts, sources and classifier settings', 'Workspace test that checks every requirement at once', 'Experiment notebook and lab report'], objectives:['Read the source material before judging a model result.', 'Change one choice, test it and compare the output with the request.', 'Explain the privacy or review decision your evidence supports.'], challenge:'Analysis: in your reflection, describe one input that would still fool the current setup and how a person would catch it.'},
  security:{name:'Cybersecurity', bench:'the security console', tools:['Simulated logs, accounts and policy settings', 'Workspace test that checks every requirement at once', 'Experiment notebook and lab report'], objectives:['Treat log lines and messages as evidence, not instructions.', 'Apply the least change that removes the risk, then retest.', 'Explain how the retest proves the exposure is closed.'], challenge:'Analysis: in your reflection, explain which evidence you would keep for a handover and why it is enough.'},
  coding:{name:'Coding', bench:'the code editor', tools:['Code editor with a bounded JavaScript or Python practice subset', 'Input cards that run the same program with changing inputs', 'Expected-output reference, playground input and lab report'], objectives:['Read an input contract and expected output before editing.', 'Change one part of a program and rerun every input card.', 'Explain why the program now handles every changing input.'], challenge:'Challenge: solve the same task again in the other practice language, without the demonstration.'}
});

// Hands-on demonstrations for the coding labs: the exact starter line to change in each language.
const CODING_STEPS = Object.freeze({
  CODE501:{read:'Each kit costs 3 credits, so the total is quantity multiplied by 3. The starter adds instead of multiplying.', javascript:{from:'let total = quantity + 3;', to:'let total = quantity * 3;'}, python:{from:'total = quantity + 3', to:'total = quantity * 3'}, why:'Multiplying by the price works for 2, 5 and 0 kits. Adding 3 gives 5 for two kits, but two kits cost 6.'},
  CODE502:{read:'Below 20 is Heating, 20 through 25 is Comfortable, above 25 is Cooling. The starter has only two messages and the wrong comparison.', javascript:{from:'if (temperature > 20) {\n  print("Heating");\n} else {\n  print("Cooling");\n}', to:'if (temperature < 20) {\n  print("Heating");\n} else if (temperature <= 25) {\n  print("Comfortable");\n} else {\n  print("Cooling");\n}'}, python:{from:'if temperature > 20:\n    print("Heating")\nelse:\n    print("Cooling")', to:'if temperature < 20:\n    print("Heating")\nelif temperature <= 25:\n    print("Comfortable")\nelse:\n    print("Cooling")'}, why:'Three ranges need three branches. The boundary words “below”, “through” and “above” decide whether to use < or <=.'},
  CODE503:{read:'Stations are numbered from 1, and the checklist needs one Ready line per station. The starter counts from 0.', javascript:{from:'console.log("Ready " + station);', to:'console.log("Ready " + (station + 1));'}, python:{from:'for station in range(stations):', to:'for station in range(1, stations + 1):'}, why:'A loop counter starts at 0 unless you shift it. Printing station + 1, or counting from 1, gives Ready 1 through Ready n.'},
  CODE504:{read:'Each snack token is worth 4 energy, so the readout is snacks multiplied by 4 with the label Energy.', javascript:{from:'let energy = snacks + 4;', to:'let energy = snacks * 4;'}, python:{from:'energy = snacks + 4', to:'energy = snacks * 4'}, why:'Zero snacks must give Energy 0. Adding 4 gives Energy 4 for an empty tray, so the operator has to be multiplication.'},
  CODE505:{read:'Fewer than 50 points is Try again, 50 through 99 is Sticker, and 100 or more is Badge. The starter misses both boundaries.', javascript:{from:'if (points > 100) {\n  console.log("Badge");\n} else if (points > 50) {', to:'if (points >= 100) {\n  console.log("Badge");\n} else if (points >= 50) {'}, python:{from:'if points > 100:\n    print("Badge")\nelif points > 50:', to:'if points >= 100:\n    print("Badge")\nelif points >= 50:'}, why:'“100 or more” includes exactly 100, and “50 through 99” starts at exactly 50. Test one point below, at and above each threshold.'},
  CODE506:{read:'Leg 1 uses 1 energy, leg 2 uses 2, and so on. The total for a trip is 1 + 2 + … + steps, and an empty trip is 0.', javascript:{from:'for (let leg = 0; leg < steps; leg++) {', to:'for (let leg = 1; leg <= steps; leg++) {'}, python:{from:'for leg in range(steps):', to:'for leg in range(1, steps + 1):'}, why:'The starter adds 0 through steps − 1, so every total is short by steps. Counting from 1 through steps adds each leg once.'}
});
export const codingDemonstration = (id, language) => {const guide = CODING_STEPS[key(id)]; return guide ? {...guide[language === 'python' ? 'python' : 'javascript'], read:guide.read, why:guide.why} : null;};

export function guideOverview(scenario) {
  const track = TRACKS[scenario.track] || TRACKS.network;
  return {
    introduction: scenario.brief,
    requester: scenario.requester,
    goal: scenario.goal,
    objectives: [scenario.goal, ...track.objectives],
    tools: track.tools,
    deliverables: ['Every lab resource card opened', 'A saved experiment in Section 2 that shows the task working', 'Answers to both analysis questions in Section 3', scenario.track === 'coding' ? 'Optional challenge: the same task passing in the other practice language' : 'Optional challenge: the analysis prompt at the end of Section 3'],
    resources: scenario.clues.map(clue => ({id:clue.id, label:clue.label, text:clue.text}))
  };
}

function demonstrationSteps(scenario, facts) {
  if (scenario.track === 'coding') {
    const language = facts.language === 'python' ? 'python' : 'javascript', fix = codingDemonstration(scenario.id, language), other = language === 'python' ? 'JavaScript' : 'Python';
    const file = language === 'python' ? 'program.py' : 'program.js', runner = language === 'python' ? 'python3 program.py' : 'node program.js', first = facts.firstInput ?? 2;
    return [
      {id:'terminal', instruction:'On the desktop, open Terminal. Run ls, then cat README.txt and cat fixtures.txt to read the task and the test inputs.', detail:'The prompt is ' + SHELL_PROMPT + '. Type a command and press Enter. help lists everything this terminal understands. Switching the practice language in the Lab Console changes the program file to ' + (language === 'python' ? 'program.js' : 'program.py') + ' (' + other + ').', check:'terminal'},
      {id:'edit', instruction:'Open ' + file + ' in the Text Editor (type nano ' + file + ', or open it from Files), change the starter line, then choose Save.', detail:fix ? 'Change this line:\n' + fix.from + '\nto:\n' + fix.to + '\n' + fix.why : 'Change one line at a time and keep the input variable; the fixture supplies its value.', check:'edited', code:true},
      {id:'run', instruction:'Back in Terminal, run ' + runner + ' ' + first + ' to see your program’s output for one input.', detail:'The last line says whether that output matches the expected output for ' + first + '. Try the other inputs from fixtures.txt the same way.', check:'ran'},
      {id:'check', instruction:'Run ./check to test the saved program with every input at once.', detail:'Each line reads PASS or FAIL with the input it used. Run all fixtures in the Text Editor or Lab Console does the same thing.', check:'tested'},
      {id:'match', instruction:'Keep editing, saving and running ./check until every line reads PASS.', detail:fix ? 'If a line still reads FAIL, compare your line with:\n' + fix.to : 'Read the first failing input, change one part of your program, save and run ./check again.', check:'works', code:!!fix}
    ];
  }
  const mission = facts.mission || {}, track = TRACKS[scenario.track] || TRACKS.network;
  const instruction = typeof mission.next === 'string' && mission.next.trim() ? mission.next : 'Make the change at ' + track.bench + ' that the resource cards call for.';
  const detail = Array.isArray(mission.hints) ? mission.hints.filter(Boolean).join(' ') : '';
  const tools = Array.isArray(facts.tools) && facts.tools.length ? facts.tools : [];
  return [
    {id:'terminal', instruction:'On the desktop, open Terminal and run the lab tools before changing anything' + (tools.length ? ': ' + tools.join(', ') : '') + '.', detail:'The prompt is ' + SHELL_PROMPT + '. Type a tool name exactly and press Enter; cat settings.txt shows the saved settings and help lists everything. A readout is evidence, but it does not replace the test.', check:'tool'},
    {id:'change', instruction:'Open the Lab Console (desktop icon, or type console in Terminal). ' + instruction, detail:detail, check:'works'},
    {id:'test', instruction:'In the Lab Console, run the test and read each check until all of them pass.', detail:'A saved setting is not a tested result. The test runs every check against the current setup; a failing check names what to revisit. Run the lab tools again in Terminal to see what changed.', check:'tested'}
  ];
}

function appliedSteps(scenario) {
  const coding = scenario.track === 'coding';
  return [
    {id:'plan', instruction:'In the Experiment notebook below, write what you expect the current setup to do and which resource card supports it, then choose Start this test.', detail:'Write a full sentence for each. The notebook records the setup before the test so the result can be compared.', check:'planned'},
    {id:'record', instruction:'Choose Test my idea to run the real test and record the result in the notebook.', detail:coding ? 'The test runs every input card against your saved program. If a card fails, revise in the editor and test again.' : 'The test runs every check against the current setup. If one fails, change the setting it names and test again.', check:'recorded'},
    {id:'save', instruction:'Describe what you changed, what happened and what you learned, then choose Save this attempt.', detail:'A saved attempt that shows the task working completes this section.', check:'ready'}
  ];
}

function challengeSteps(scenario, facts) {
  const track = TRACKS[scenario.track] || TRACKS.network;
  const steps = [
    {id:'verify', instruction:'Choose Check the original task to confirm the goal with the current setup.', detail:'A changed setup needs a fresh check. The result appears beside the button.', check:'verified'},
    {id:'notes', instruction:'Analysis 1: what did you change, and what did the test show?', detail:'Name the setting or line you changed and quote the test result that proves it.', check:'notes'},
    {id:'reflection', instruction:'Analysis 2: why does the evidence show the original task works, and what would you check next time?', detail:'Point to the resource card and the test result that convinced you.', check:'reflection'}
  ];
  if (scenario.track === 'coding') steps.push({id:'challenge', instruction:'Challenge: switch to the ' + (facts.language === 'python' ? 'JavaScript' : 'Python') + ' subset, choose Reset starter, and make every input card match again without the demonstration.', detail:'', check:'challenge', optional:true, challenge:true});
  else if (facts.transfer) steps.push({id:'challenge', instruction:'Challenge: open the alternate case ' + facts.transfer + '. Same symptom, different cause, no demonstration.', detail:'', check:'ack', optional:true, challenge:true, href:facts.transferHref || ''});
  else steps.push({id:'challenge', instruction:track.challenge, detail:'', check:'ack', optional:true, challenge:true});
  steps.push({id:'finish', instruction:'Choose Finish lab to close the guide and open your lab report.', detail:'The report keeps your resources, tests and analysis together for your teacher’s approved hand-in route.', check:'closed'});
  return steps;
}

/** The whole guide for one lab, with each step’s completion read from the facts. */
export function labGuide(scenario, facts = {}) {
  const acknowledged = new Set(Array.isArray(facts.acknowledged) ? facts.acknowledged : []);
  const builders = {
    introduction:() => [{id:'read-introduction', instruction:'Read the introduction, the goal and the learning objectives.', detail:'', check:'ack'}, {id:'read-resources', instruction:'Open every lab resource card: ' + scenario.clues.map(clue => clue.label.toLowerCase()).join(', ') + '.', detail:'Each card is part of the lab. Open it to read it; opened cards are listed in your report.', check:'resources'}],
    demonstration:() => demonstrationSteps(scenario, facts),
    applied:() => appliedSteps(scenario),
    challenge:() => challengeSteps(scenario, facts)
  };
  const sections = GUIDE_SECTIONS.map(meta => {
    const steps = builders[meta.id]().map(step => ({...step, done: step.check === 'ack' ? acknowledged.has(step.id) : facts[step.check] === true}));
    const required = steps.filter(step => !step.optional);
    return {...meta, steps, done:required.filter(step => step.done).length, total:required.length, complete:required.every(step => step.done)};
  });
  const totals = sections.reduce((sum, section) => ({done:sum.done + section.done, total:sum.total + section.total}), {done:0, total:0});
  const current = sections.find(section => !section.complete)?.id || 'challenge';
  return {...guideOverview(scenario), sections, percent:totals.total ? Math.round(100 * totals.done / totals.total) : 0, current};
}

/** Facts the guide reads, derived from the record and the live workspace. Nothing is stored. */
export function labGuideFacts(scenario, record, {taskResult = null} = {}) {
  const state = record.state || {}, experiments = readExperiments(record), draft = experiments.draft || {}, latest = experiments.attempts.at(-1);
  const result = taskResult || verifyWorkspace(scenario.id, state), testing = workbenchProgress(scenario, record, taskResult || result), coding = scenario.track === 'coding';
  const mission = coding ? null : getWorkspaceMission(scenario.id, state);
  const transfer = transferCaseFor(scenario.id);
  const text = (value, minimum) => typeof value === 'string' && value.trim().length >= minimum;
  const acknowledged = Array.isArray(record.manual) ? record.manual : [];
  return {
    language:state.language, acknowledged, mission:mission ? {next:mission.next, hints:mission.hints} : null, tools:labTools(scenario.id), firstInput:coding ? codingDefinition(scenario.id)?.values[0] : undefined,
    terminal:acknowledged.includes('used-terminal'), tool:acknowledged.includes('used-tool'), ran:acknowledged.includes('ran-program'),
    transfer, transferHref:transfer ? labPageHash(transfer, 1, {mode:'challenge'}) : '',
    resources:scenario.clues.length > 0 && scenario.clues.every(clue => record.evidence.includes(clue.id)),
    edited:coding ? typeof state.code === 'string' && state.code.trim() !== codingStarter(scenario.id, state.language).trim() : (Number(state.workspaceEdits) || 0) > 0,
    tested:state.tested === true, works:result.ok === true,
    planned:text(draft.predict, 12) && text(draft.evidence, 12) && !!draft.before || (!!latest && text(latest.predict, 12)),
    recorded:!!draft.check || !!latest?.check, ready:testing.ready === true, testing,
    verified:record.verified === true, notes:text(record.notes, 15), reflection:text(record.reflection, 15), closed:record.closed === true,
    challenge:coding ? codingChallengeComplete(state) === true : false
  };
}

export function labGuideReport(scenario, record) {
  const guide = labGuide(scenario, labGuideFacts(scenario, record));
  const lines = guide.sections.map(section => section.title + ': ' + (section.complete ? 'complete' : section.done + ' of ' + section.total + ' steps'));
  const challenge = guide.sections.at(-1).steps.find(step => step.challenge);
  lines.push('Challenge: ' + (challenge?.done ? 'complete' : 'not attempted'));
  return lines.join('\n');
}

const stepsHTML = (section, facts) => section.steps.map((step, index) => {
  const current = step.id === section.steps.find(item => !item.done && !item.optional)?.id;
  const classes = ['guide-step', step.done ? 'is-done' : '', current ? 'is-current' : '', step.optional ? 'is-optional' : '', step.challenge ? 'is-challenge' : ''].filter(Boolean).join(' ');
  const detail = step.detail ? (section.id === 'demonstration' ? (step.code ? '<pre class="guide-code" tabindex="0">' + esc(step.detail) + '</pre>' : '<p class="guide-step-detail">' + esc(step.detail) + '</p>') : '<details class="guide-hint"><summary>Hint</summary><p>' + esc(step.detail) + '</p></details>') : (step.challenge ? '<p class="guide-no-hint">No demonstration for the challenge. Use what you learned in Sections 1 and 2.</p>' : '');
  const control = step.check === 'ack' && !step.done ? (step.href ? '<a class="lab-tool guide-link" href="' + esc(step.href) + '">Open the alternate case</a> ' : '') + '<button type="button" class="lab-tool" data-guide-ack="' + esc(step.id) + '">Mark step done</button>' : '';
  return '<li class="' + classes + '" data-guide-step="' + esc(step.id) + '"' + (current ? ' aria-current="step"' : '') + '><span class="guide-step-mark" aria-hidden="true">' + (step.done ? '✓' : step.optional ? '★' : String(index + 1)) + '</span><div class="guide-step-body"><p class="guide-step-instruction">' + esc(step.instruction) + '<span class="sr-only">' + (step.done ? ' (done)' : step.optional ? ' (optional)' : ' (to do)') + '</span></p>' + detail + control + '</div></li>';
}).join('');

/** The lab page: the guide on the left and the simulated environment on the right. */
export function renderLabGuidePage(scenario, record, {trackName = '', sceneArt = '', saveStatus = '', environment = null} = {}) {
  const overview = guideOverview(scenario), coding = scenario.track === 'coding', provider = environment || preferredLabEnvironment();
  const resources = overview.resources.map(resource => '<details class="guide-resource" data-resource="' + esc(resource.id) + '"' + (record.evidence.includes(resource.id) ? ' open' : '') + '><summary>' + esc(resource.label) + '<span data-resource-state>' + (record.evidence.includes(resource.id) ? 'Opened' : 'Open') + '</span></summary><p>' + esc(resource.text) + '</p></details>').join('');
  const section = (meta, body) => '<details class="guide-section" data-guide-section="' + meta.id + '"' + (meta.id === 'introduction' ? ' open' : '') + '><summary><span class="guide-section-title">' + esc(meta.title) + '</span><span class="guide-section-state" data-guide-section-state="' + meta.id + '"></span></summary><div class="guide-section-body">' + body + '</div></details>';
  const introduction = '<p class="guide-lead">' + esc(overview.introduction) + '</p><p class="guide-requester"><b>Requested by</b> ' + esc(overview.requester) + '</p><h3>Goal</h3><p>' + esc(overview.goal) + '</p><h3>Learning objectives</h3><ul>' + overview.objectives.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul><h3>Tools in this simulation</h3><ul>' + overview.tools.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul><h3>Deliverables</h3><ul>' + overview.deliverables.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul><h3>Lab resources</h3><p class="panel-help">' + (coding ? 'The input contract, the rule and the test inputs for this program.' : 'The case details you would otherwise gather from the requester and the equipment.') + '</p><div class="guide-resources">' + resources + '</div><p class="guide-scope">Every device, person and record in this lab is simulated. Nothing here connects to a real system.</p><ol class="guide-steps" data-guide-steps="introduction" aria-label="Introduction steps"></ol>';
  const demonstration = '<p class="panel-help">Follow each step in the environment on the right. Every step shows exactly what to do.</p><ol class="guide-steps" data-guide-steps="demonstration" aria-label="Section 1 steps"></ol>';
  const applied = '<p class="panel-help">Apply what you just did with less direction: record it as an experiment with your own prediction, evidence and explanation.</p><ol class="guide-steps" data-guide-steps="applied" aria-label="Section 2 steps"></ol><div id="experiment-tools"></div><p id="workbench-test-status" class="step-progress" role="status"></p><div class="workbench-remaining" data-workbench-remaining></div>';
  const challenge = '<ol class="guide-steps" data-guide-steps="challenge" aria-label="Section 3 steps"></ol><section class="case-panel verification-panel"><p class="eyebrow">CHECK THE GOAL</p><p>' + esc(scenario.goal) + '</p><button class="button" id="verify-task" type="button">Check the original task</button><div class="verify-result" id="verify-result" role="status">' + (record.verified ? '✓ The original task works.' : '') + '</div></section><section class="case-panel guide-analysis"><h3>Analysis questions</h3><label class="lab-field" for="notes">1. What did you change, and what did the test show?<textarea id="notes" aria-describedby="notes-error" maxlength="4000" rows="4" placeholder="I changed… The test showed…">' + esc(record.notes) + '</textarea></label><p id="notes-error" class="field-error" role="alert" hidden></p><label class="lab-field" for="reflection">2. Why does the evidence show the original task works, and what would you check next time?<textarea id="reflection" aria-describedby="reflection-error" maxlength="2000" rows="3" placeholder="The resource card… and the test result… show…">' + esc(record.reflection) + '</textarea></label><p id="reflection-error" class="field-error" role="alert" hidden></p><p class="panel-help">Use your own words. Write a sentence for each answer.</p></section><section class="case-panel guide-finish"><p id="finish-status" class="step-progress" role="status"></p><button class="button" id="finish-lab" type="button">Finish lab &amp; open report</button><p class="save-status">' + esc(saveStatus) + '</p></section>';
  return '<section class="lab-shell lab-guide-shell" data-track="' + esc(scenario.track) + '"><div class="lab-topbar">' + sceneArt + '<a href="#labs" class="back-link">← All labs</a><div><span class="eyebrow">' + esc(scenario.id) + ' / ' + esc(trackName || (TRACKS[scenario.track]?.name ?? scenario.track)) + '</span><h1>' + esc(scenario.title) + '</h1></div><span class="tag">GRADES ' + esc(scenario.grade) + '</span><div class="lab-tools"><button id="reading-toggle" class="lab-tool" aria-pressed="false">Larger text</button><button id="saving-options" class="lab-tool">Saving &amp; privacy</button><button id="report-button" class="lab-tool">My report</button></div></div>' +
    '<div class="lab-guide-layout"><aside class="lab-guide" id="lab-guide" aria-label="Lab guide" tabindex="0"><header class="lab-guide-head"><p class="eyebrow">LAB GUIDE</p><div class="guide-progress"><progress data-guide-progress value="0" max="100" aria-label="Lab guide progress">0%</progress><span data-guide-percent aria-live="polite">0%</span></div></header><div class="lab-guide-sections">' + section(GUIDE_SECTIONS[0], introduction) + section(GUIDE_SECTIONS[1], demonstration) + section(GUIDE_SECTIONS[2], applied) + section(GUIDE_SECTIONS[3], challenge) + '</div>' +
    '<div class="lab-reset"><button class="text-button" id="reset-ticket" aria-expanded="false" aria-controls="reset-confirm">Start this lab again</button><div id="reset-confirm" role="group" aria-labelledby="reset-question" hidden><p id="reset-question">This clears this lab’s current work and any saved copy when device saving is on. Export first.</p><button id="confirm-reset" class="lab-tool">Start over</button> <button id="cancel-reset" class="lab-tool">Keep my work</button></div></div></aside>' +
    '<div class="lab-environment" id="lab-environment" role="region" aria-label="Lab environment"><div class="environment-bar"><span class="eyebrow">LAB ENVIRONMENT</span><span class="environment-provider">' + esc(provider?.label || 'Lab environment') + '</span><span data-environment-status role="status"></span></div><div id="classroom-status"></div><div data-lab-environment data-environment-id="' + esc(provider?.id || '') + '">' + (provider ? provider.render(scenario, record) : '<p class="panel-help">No lab environment is available.</p>') + '</div><div id="action-feedback" class="action-feedback" role="status">' + esc(record.events.length ? (experimentEventText(record.events.at(-1), {compact:true}) || record.events.at(-1).message) : 'Follow Section 1 of the lab guide. Open Terminal on the desktop to begin; your actions are recorded here.') + '</div><details class="case-panel bench-log guide-log"><summary>Action log <span id="action-count">' + record.events.length + ' actions</span></summary><ol id="bench-log" tabindex="0" aria-label="Saved lab steps">' + eventList(record) + '</ol></details><div id="work-privacy" hidden></div></div></div></section>' +
    '<dialog id="lab-dialog"><div id="dialog-content"></div><button id="dialog-close" class="button button-outline">Close</button></dialog>';
}

const eventText = event => experimentEventText(event, {compact:true}) || event.message;
function eventList(record) {
  return record.events.length ? record.events.map(event => '<li><time>' + new Date(event.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + '</time><span>' + esc(eventText(event)) + '</span></li>').join('') : '<li class="empty-log">Your steps will appear here.</li>';
}

/** Mount the guided lab. The app supplies saving, the report dialog, notices and reset. */
export function mountLabGuide(root, {scenario:s, record:r, route = null, ownerPreview = false, save = () => {}, openReport = () => {}, showNotice = () => {}, onComplete = () => {}, onReset = () => {}, saveStatus = () => '', onSection = () => {}, bindWorkPrivacy = () => {}, environment = null}) {
  const $ = selector => root.querySelector(selector), $$ = selector => [...root.querySelectorAll(selector)];
  const controller = new AbortController(), signal = controller.signal, listen = (node, event, handler, capture = false) => node?.addEventListener(event, handler, {signal, capture});
  bindWorkPrivacy(s);
  const shell = $('.lab-guide-shell'), environmentHost = $('[data-lab-environment]'), feedback = $('#action-feedback');
  const provider = environment || preferredLabEnvironment();
  const mode = route?.mode || 'guided';
  let refreshing = false, experiments = {refresh(){}, dispose(){}}, desktop = {refresh(){}, dispose(){}, hasUnsavedDraft:() => false}, doneSteps = null;
  const acknowledge = id => {if (!Array.isArray(r.manual)) r.manual = []; if (r.manual.includes(id)) return false; r.manual.push(id); return true;};
  const view = () => {const open = $$('[data-guide-section]').find(node => node.open); return GUIDE_SECTIONS.find(section => section.id === open?.dataset.guideSection) || GUIDE_SECTIONS[0];};
  function logEvent(event) {
    const entry = {time:new Date().toISOString(), kind:event.kind || 'info', message:String(event.message || '').slice(0, 600)};
    const earlier = r.events.findLastIndex(item => item.message === entry.message);
    if (earlier >= 0 && r.events.slice(earlier + 1).every(item => experimentEventText(item) !== null)) return;
    r.events.push(entry); r.events = retainExperimentEvents(s, r.events);
    $('#bench-log').innerHTML = eventList(r); $('#action-count').textContent = r.events.length + ' actions';
  }
  const renderBench = () => desktop.refresh();
  function currentTaskResult() {
    const editor = $('#coding-editor');
    if (s.track === 'coding' && editor && editor.value !== r.state.code) return {ok:false, message:'The Lab Console editor contains untested changes. Run all fixtures for this version before checking.'};
    if (s.track === 'coding' && desktop.hasUnsavedDraft()) return {ok:false, message:'The Text Editor has unsaved changes. Save them, then run ./check or Run all fixtures before checking.'};
    return verifyWorkspace(s.id, r.state);
  }
  function action(id, value) {
    const result = applyWorkspaceAction(s.id, r.state, id, value);
    r.state = result.state;
    const inspectOnly = id.startsWith('inspect-');
    if (!inspectOnly) {r.verified = false; r.closed = false; $('#verify-result').textContent = '';}
    logEvent(result); save();
    if (id !== 'inspect-command') renderBench();
    feedback.textContent = result.message; feedback.dataset.kind = result.kind;
    refresh();
    document.dispatchEvent?.(new CustomEvent('cole:lab-state-change', {detail:{id:s.id, changed:!inspectOnly && id !== 'run-check'}}));
    return result;
  }
  function runHypothesisTest(prediction) {
    if (typeof prediction !== 'string' || prediction.trim().length < 12) {$('#workbench-test-status').textContent = 'Write a full sentence for your prediction before testing.'; return false;}
    const input = s.track === 'coding' ? {code:$('#coding-editor')?.value ?? r.state.code} : undefined;
    const again = r.state.tested === true ? applyWorkspaceAction(s.id, r.state, 'run-check', input).state : null, settled = value => JSON.stringify({...value, checkRuns:0});
    if (!again || settled(again) !== settled(r.state)) action('run-check', input);
    const result = verifyWorkspace(s.id, r.state);
    r.verified = result.ok; r.closed = false;
    logEvent({kind:result.ok ? 'success' : 'warning', message:'Applied test — ' + prediction.trim().slice(0, 140) + ' / Observed: ' + (result.ok ? 'The task works. ' : 'Not fixed yet. ') + result.message});
    $('#verify-result').textContent = (result.ok ? '✓ ' : 'Try again: ') + result.message;
    save(); refresh(); return true;
  }
  function refresh() {
    if (refreshing) return; refreshing = true;
    try {
      const facts = labGuideFacts(s, r, {taskResult:currentTaskResult()}), guide = labGuide(s, facts), testing = facts.testing;
      // A desktop notification marks each newly completed step, like a real desktop would.
      const nowDone = new Map(guide.sections.flatMap(section => section.steps.filter(step => step.done).map(step => [section.id + '/' + step.id, {section, step}])));
      if (doneSteps && typeof desktop.notify === 'function') for (const [id, {section, step}] of nowDone) if (!doneSteps.has(id)) desktop.notify((section.complete && section.steps.at(-1) === step ? section.title + ' complete' : 'Step done: ' + step.instruction.split(/[.:(]/)[0].trim().slice(0, 72)), {kind:'success'});
      doneSteps = new Set(nowDone.keys());
      const bar = $('[data-guide-progress]'); bar.value = guide.percent; bar.textContent = guide.percent + '%'; $('[data-guide-percent]').textContent = guide.percent + '%';
      for (const section of guide.sections) {
        const list = $('[data-guide-steps="' + section.id + '"]'), html = stepsHTML(section, facts);
        if (list && list.dataset.html !== html) {list.innerHTML = html; list.dataset.html = html;}
        const state = $('[data-guide-section-state="' + section.id + '"]');
        if (state) {state.textContent = section.complete ? '✓ Complete' : section.done + ' / ' + section.total; state.classList.toggle('is-complete', section.complete);}
        $('[data-guide-section="' + section.id + '"]')?.classList.toggle('is-current', section.id === guide.current);
      }
      $$('[data-resource]').forEach(node => {const state = node.querySelector('[data-resource-state]'); if (state) state.textContent = r.evidence.includes(node.dataset.resource) ? 'Opened' : 'Open';});
      $('#workbench-test-status').textContent = testing.ready ? 'Section 2 complete. Open Section 3: Challenge and Analysis.' : testing.message;
      const remaining = $('[data-workbench-remaining]');
      if (remaining) {const html = testing.ready || !Array.isArray(testing.remaining) ? '' : '<h3>Still to do in this section</h3>' + (testing.note ? '<p>' + esc(testing.note) + '</p>' : '') + '<ol role="list">' + testing.remaining.map(item => '<li' + (item.done ? ' class="done"' : '') + '><span aria-hidden="true">' + (item.done ? '✓' : '○') + '</span> ' + esc(item.label) + '<span class="sr-only">' + (item.done ? ' (done)' : ' (to do)') + '</span></li>').join('') + '</ol>'; if (remaining.dataset.list !== html) {remaining.innerHTML = html; remaining.dataset.list = html;}}
      const missing = finishBlockers(facts);
      $('#finish-status').textContent = r.closed ? 'Lab finished. Review your report, or keep improving your answers.' : missing.length ? 'Before you finish: ' + missing.join('; ') + '.' : 'Everything is ready. Finish the lab to open your report.';
      $('#finish-lab').disabled = !ownerPreview && !r.closed && missing.length > 0;
      const mission = s.track === 'coding' ? null : getWorkspaceMission(s.id, r.state);
      $('[data-environment-status]').textContent = mission ? mission.stage + ' · ' + mission.passed + ' / ' + mission.total + ' checks' : (facts.works ? 'All input cards match' : facts.tested ? 'Some input cards differ' : 'Not tested yet');
      $('.save-status').textContent = saveStatus(r);
      experiments.refresh();
    } finally {refreshing = false;}
  }
  function finishBlockers(facts) {
    const missing = [];
    if (!facts.resources) missing.push('open every lab resource card in the Introduction');
    if (!facts.works) missing.push('make the original task work in the environment');
    if (!facts.ready) missing.push('save a passing experiment in Section 2');
    if (!facts.verified) missing.push('check the original task');
    if (!facts.notes) missing.push('answer analysis question 1');
    if (!facts.reflection) missing.push('answer analysis question 2');
    return missing;
  }
  function openSection(id, {focus = false, writeHistory = true} = {}) {
    const target = GUIDE_SECTIONS.find(section => section.id === id) || GUIDE_SECTIONS[0];
    for (const node of $$('[data-guide-section]')) node.open = node.dataset.guideSection === target.id;
    onSection(target.route);
    if (writeHistory) {const hash = labPageHash(s.id, target.route, {mode}); if (location.hash !== hash) history.replaceState(null, '', hash);}
    if (focus) $('[data-guide-section="' + target.id + '"] summary')?.focus({preventScroll:true});
  }
  function syncRoute(next) {
    if (next.page !== 'lab' || next.id !== s.id) return false;
    const id = next.section === 3 ? 'challenge' : next.section === 2 ? 'applied' : view().route === 1 ? view().id : 'introduction';
    openSection(id, {writeHistory:false});
    return true;
  }
  // Environment first: the desktop mounts once and stays visible beside the guide. The lab's own
  // settings and test render inside its Lab Console window whenever that window is open.
  desktop = provider ? provider.mount(environmentHost, {scenario:s, record:r, getState:() => r.state, action, showNotice,
    renderConsole:node => renderWorkspace(node, s, r.state, action),
    onActivity:activity => {
      let changed = false;
      if (activity?.type === 'terminal') {changed = acknowledge('used-terminal') || changed; if (activity.tool) changed = acknowledge('used-tool') || changed; if (/^(?:sudo\s+)?(?:python3?|node)\b/.test(String(activity.command || '').trim())) changed = acknowledge('ran-program') || changed;}
      if (changed) save();
      refresh();
    }}) : desktop;
  const host = $('#experiment-tools'); host.innerHTML = renderExperiments(s, r);
  experiments = mountExperiments(host, {scenario:s, record:r, getState:() => r.state, getResult:() => currentTaskResult(), onSave:() => {save(); refresh();}, onTest:prediction => runHypothesisTest(prediction)});
  const initial = route?.section === 3 ? 'challenge' : route?.section === 2 ? 'applied' : (labGuide(s, labGuideFacts(s, r)).sections[0].complete ? 'demonstration' : 'introduction');
  openSection(initial, {writeHistory:false});
  listen($('.lab-guide-sections'), 'toggle', event => {
    const node = event.target.closest?.('[data-guide-section]');
    if (node?.open) {for (const other of $$('[data-guide-section]')) if (other !== node) other.open = false; onSection(GUIDE_SECTIONS.find(section => section.id === node.dataset.guideSection)?.route || 1); const hash = labPageHash(s.id, GUIDE_SECTIONS.find(section => section.id === node.dataset.guideSection)?.route || 1, {mode}); if (location.hash !== hash) history.replaceState(null, '', hash);}
    const resource = event.target.closest?.('[data-resource]');
    if (resource?.open && !r.evidence.includes(resource.dataset.resource) && s.clues.some(clue => clue.id === resource.dataset.resource)) {r.evidence.push(resource.dataset.resource); r.closed = false; save(); refresh();}
  }, true); // toggle does not bubble; capture it from the sections container
  listen($('.lab-guide'), 'click', event => {
    const ack = event.target.closest?.('[data-guide-ack]');
    if (!ack) return;
    if (!Array.isArray(r.manual)) r.manual = [];
    if (!r.manual.includes(ack.dataset.guideAck)) r.manual.push(ack.dataset.guideAck);
    save(); refresh();
    $('.lab-guide [aria-current="step"] button, .lab-guide [aria-current="step"]')?.focus?.({preventScroll:true});
  });
  if (s.track === 'coding') listen(environmentHost, 'input', () => refresh());
  listen($('#verify-task'), 'click', () => {const result = currentTaskResult(); r.verified = result.ok; r.closed = r.closed && result.ok; logEvent({message:'Verification: ' + result.message, kind:result.ok ? 'success' : 'warning'}); $('#verify-result').textContent = (result.ok ? '✓ ' : 'Try again: ') + result.message; save(); refresh();});
  for (const field of ['notes', 'reflection']) listen($('#' + field), 'input', event => {r[field] = event.target.value; r.closed = false; const error = $('#' + field + '-error'); if (r[field].trim().length >= 15) {error.textContent = ''; error.hidden = true; event.target.removeAttribute('aria-invalid');} save(); refresh();});
  listen($('#finish-lab'), 'click', () => {
    const facts = labGuideFacts(s, r, {taskResult:currentTaskResult()}), missing = finishBlockers(facts);
    if (!ownerPreview && missing.length) {
      for (const field of ['notes', 'reflection']) {const short = r[field].trim().length < 15, error = $('#' + field + '-error'); error.textContent = short ? 'Write a sentence for this answer.' : ''; error.hidden = !short; if (short) $('#' + field).setAttribute('aria-invalid', 'true');}
      showNotice('Before you finish: ' + missing[0] + '.');
      openSection(!facts.resources ? 'introduction' : !facts.works ? 'demonstration' : !facts.ready ? 'applied' : 'challenge', {focus:true});
      return;
    }
    r.verified = ownerPreview ? r.verified : true; r.closed = true; onComplete(); save(); refresh();
    showNotice('Lab finished. Review your report before exporting.'); openReport(s, r);
  });
  listen($('#reading-toggle'), 'click', event => {const on = shell.classList.toggle('larger-reading'); event.target.setAttribute('aria-pressed', String(on));});
  listen($('#saving-options'), 'click', () => {const privacy = $('#work-privacy'); privacy.hidden = !privacy.hidden; if (!privacy.hidden) {const options = privacy.querySelector('details'); if (options) {options.open = true; options.querySelector('summary')?.focus({preventScroll:true});}}});
  listen($('#report-button'), 'click', () => openReport(s, r));
  listen($('#dialog-close'), 'click', () => $('#lab-dialog').close());
  const cancelReset = () => {$('#reset-confirm').hidden = true; $('#reset-ticket').setAttribute('aria-expanded', 'false'); $('#reset-ticket').focus({preventScroll:true});};
  listen($('#reset-ticket'), 'click', () => {$('#reset-confirm').hidden = false; $('#reset-ticket').setAttribute('aria-expanded', 'true'); $('#cancel-reset').focus({preventScroll:true});});
  listen($('#cancel-reset'), 'click', cancelReset);
  listen($('#reset-confirm'), 'keydown', event => {if (event.key === 'Escape') {event.preventDefault(); cancelReset();}});
  listen($('#confirm-reset'), 'click', () => onReset());
  refresh();
  return {runHypothesisTest, currentTaskResult, refreshStatus:refresh, syncRoute, dispose() {controller.abort(); experiments.dispose(); const console = environmentHost?.querySelector('#workspace'); if (console) disposeWorkspace(console); desktop.dispose();}};
}
