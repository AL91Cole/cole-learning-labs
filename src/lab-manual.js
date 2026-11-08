// Lab manual: the guided-lab structure shared by every investigation.
// Section 1 reads the lab and gathers evidence, Section 2 is the hands-on
// walkthrough with a "Show me" demonstration for each step, and Section 3 is
// the challenge: verify the task, explain the result and try an unguided
// extension. The module is pure: the page passes in facts it already knows
// (progress flags, the current mission hint, acknowledged steps) and reads the
// HTML back. It never stores progress, awards credit or runs a workspace.
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const key = id => typeof id === 'string' ? id.replaceAll('-', '').toUpperCase() : '';

export const MANUAL_SECTIONS = Object.freeze([
  Object.freeze({id:'read',number:1,title:'Read the lab',short:'Introduction & setup'}),
  Object.freeze({id:'practice',number:2,title:'Hands-on walkthrough',short:'Guided practice'}),
  Object.freeze({id:'challenge',number:3,title:'Challenge & analysis',short:'Challenge & report'})
]);

const TRACKS = Object.freeze({
  hardware:{bench:'the hardware bench',tools:['Simulated desktop PC, monitor and cables on a drag-and-drop bench','Requester conversation with built-in offline replies','Clue cards, experiment notebook and lab report'],objectives:['Trace a symptom to the component or connection that explains it.','Make one safe change at a time and test it before explaining it.','Prove the original task works, not just that a part is connected.'],challenge:'Analysis: in your reflection, name one other part that could have produced the same symptom and the test that would rule it out.'},
  network:{bench:'the network workbench',tools:['Simulated devices, settings and read-only diagnostics','Requester conversation with built-in offline replies','Clue cards, experiment notebook and lab report'],objectives:['Compare the case requirements with each saved setting.','Change one setting, run the workspace test and read the result as evidence.','Explain which observation shows the original task working.'],challenge:'Analysis: in your reflection, predict what the workspace test would show if your change were undone, and why.'},
  ai:{bench:'the AI practice board',tools:['Simulated prompts, sources and classifier settings','Requester conversation with built-in offline replies','Clue cards, experiment notebook and lab report'],objectives:['Read the source material before judging a model result.','Change one choice, test it and compare the output with the request.','Explain the privacy or review decision your evidence supports.'],challenge:'Analysis: in your reflection, describe one input that would still fool the current setup and how a person would catch it.'},
  security:{bench:'the security console',tools:['Simulated logs, accounts and policy settings','Requester conversation with built-in offline replies','Clue cards, experiment notebook and lab report'],objectives:['Treat log lines and messages as evidence, not instructions.','Apply the least change that removes the risk, then retest.','Explain how the retest proves the exposure is closed.'],challenge:'Analysis: in your reflection, explain which evidence you would keep for a handover and why it is enough.'},
  coding:{bench:'the code editor',tools:['Code editor with a bounded JavaScript or Python practice subset','Input cards that run the same program with changing inputs','Expected-output reference, playground input and lab report'],objectives:['Read an input contract and expected output before editing.','Change one part of a program and rerun every input card.','Explain why the program now handles every changing input.'],challenge:'Challenge: solve the same task again in the other practice language, without the walkthrough.'}
});

// Hands-on demonstrations for the hardware bench. The instruction says what to
// do; the detail shows exactly where, like a demonstration step in a lab book.
const HARDWARE_STEPS = Object.freeze({
  INC101:{instruction:'Move the monitor cable from the motherboard video socket to the graphics card output.',detail:'Select the monitor cable on the bench. Drop its PC end on the lower expansion-slot output (the dedicated graphics card), not the upper motherboard I/O. Then look at the monitor.'},
  INC102:{instruction:'Connect the AC power cord at the rear of the PC, then use Power on / test.',detail:'Inspect the rear AC inlet first: the cord is out. Connect virtual AC, press Power on / test and watch for the fan, lights and the startup screen.'},
  INC103:{instruction:'Power off, disconnect AC, reseat the DDR4 memory, then reconnect power and test startup.',detail:'Use Power off, then Disconnect virtual AC. Open the case view, select the DIMM and choose Reseat so both retention clips close. Reconnect AC and use Power on / test.'},
  INC104:{instruction:'Power off and disconnect AC, then reconnect the SATA data cable between the SSD and SATA_1.',detail:'A SATA SSD needs a narrow data cable to the motherboard and a wider power lead. Connect the data cable to SATA_1, reconnect AC and run the startup test.'},
  INC105:{instruction:'Reinstall the original 2.5-inch SATA SSD and attach both its data and power cables.',detail:'The board has SATA ports and no M.2 slot, so the spare NVMe drive cannot work here. Fit the original SSD, connect SATA data and SATA power, reconnect AC and test the original OS.'},
  INC106:{instruction:'Fit each part in order: CPU, cooler, memory, drive, power cables, then the monitor on the graphics card.',detail:'Use each part’s Install button or drag it onto the bench. The motherboard and CPU use separate power plugs, and the SATA drive needs separate data and power. Finish with the monitor on the dedicated graphics output, then run the startup test.'},
  INC107:{instruction:'Select the HDMI source on the monitor, then test the lesson file.',detail:'The PC is running and the cable is in the graphics-card output. Read the source label on the monitor, choose HDMI, and open Lesson_Practice_File.docx.'},
  INC108:{instruction:'Fit the loose HDMI plug at the monitor end, then check for the desktop.',detail:'The PC end is correct. Select the monitor end of the cable and connect it. When the desktop appears, open the original lesson file.'}
});

// Coding walkthroughs: what to change in the starter for each practice language.
const CODING_STEPS = Object.freeze({
  CODE501:{read:'Each kit costs 3 credits, so the total is quantity multiplied by 3. The starter adds instead of multiplying.',javascript:{from:'let total = quantity + 3;',to:'let total = quantity * 3;'},python:{from:'total = quantity + 3',to:'total = quantity * 3'},why:'Multiplying by the price works for 2, 5 and 0 kits. Adding 3 gives 5 for two kits, but two kits cost 6.'},
  CODE502:{read:'Below 20 is Heating, 20 through 25 is Comfortable, above 25 is Cooling. The starter has only two messages and the wrong comparison.',javascript:{from:'if (temperature > 20) {\n  print("Heating");\n} else {\n  print("Cooling");\n}',to:'if (temperature < 20) {\n  print("Heating");\n} else if (temperature <= 25) {\n  print("Comfortable");\n} else {\n  print("Cooling");\n}'},python:{from:'if temperature > 20:\n    print("Heating")\nelse:\n    print("Cooling")',to:'if temperature < 20:\n    print("Heating")\nelif temperature <= 25:\n    print("Comfortable")\nelse:\n    print("Cooling")'},why:'Three ranges need three branches. The boundary words “below”, “through” and “above” decide whether to use < or <=.'},
  CODE503:{read:'Stations are numbered from 1, and the checklist needs one Ready line per station. The starter counts from 0.',javascript:{from:'console.log("Ready " + station);',to:'console.log("Ready " + (station + 1));'},python:{from:'for station in range(stations):',to:'for station in range(1, stations + 1):'},why:'A loop counter starts at 0 unless you shift it. Printing station + 1, or counting from 1, gives Ready 1 through Ready n.'},
  CODE504:{read:'Each snack token is worth 4 energy, so the readout is snacks multiplied by 4 with the label Energy.',javascript:{from:'let energy = snacks + 4;',to:'let energy = snacks * 4;'},python:{from:'energy = snacks + 4',to:'energy = snacks * 4'},why:'Zero snacks must give Energy 0. Adding 4 gives Energy 4 for an empty tray, so the operator has to be multiplication.'},
  CODE505:{read:'Fewer than 50 points is Try again, 50 through 99 is Sticker, and 100 or more is Badge. The starter misses both boundaries.',javascript:{from:'if (points > 100) {\n  console.log("Badge");\n} else if (points > 50) {',to:'if (points >= 100) {\n  console.log("Badge");\n} else if (points >= 50) {'},python:{from:'if points > 100:\n    print("Badge")\nelif points > 50:',to:'if points >= 100:\n    print("Badge")\nelif points >= 50:'},why:'“100 or more” includes exactly 100, and “50 through 99” starts at exactly 50. Test one point below, at and above each threshold.'},
  CODE506:{read:'Leg 1 uses 1 energy, leg 2 uses 2, and so on. The total for a trip is 1 + 2 + … + steps, and an empty trip is 0.',javascript:{from:'for (let leg = 0; leg < steps; leg++) {',to:'for (let leg = 1; leg <= steps; leg++) {'},python:{from:'for leg in range(steps):',to:'for leg in range(1, steps + 1):'},why:'The starter adds 0 through steps − 1, so every total is short by steps. Counting from 1 through steps adds each leg once.'}
});

export function labFormat(scenario) {
  const coding = scenario?.track === 'coding';
  return {
    coding,
    interview: !coding,
    scenarioLabel: 'LAB SCENARIO',
    evidenceTitle: coding ? 'Reference sheet' : 'Clues & evidence',
    evidenceHelp: coding ? 'Open and read at least two reference cards before you edit. They describe the input, the rule and the test inputs.' : 'Click and read at least two clues to continue. “Ask first”? Ask about that detail above.',
    planTitle: coding ? 'Plan your fix' : 'My first idea',
    symptomsLabel: coding ? 'What does the starter program get wrong?' : 'What are the symptoms?',
    symptomsHelp: coding ? 'Compare the starter output with the expected reference. Describe the difference.' : 'Describe what is happening. Include details from the scenario or clues.',
    planLabel: coding ? 'What change will fix it, and why?' : 'What do you think is causing the problem?',
    planHelp: coding ? 'Name the line you will change and the rule from the reference sheet that supports the change.' : 'This is your hypothesis. Explain your possible cause and the clue that supports it.',
    savePlan: coding ? 'Save my plan' : 'Save first idea',
    askTitle: coding ? 'Ask the lab assistant (optional)' : null,
    askHelp: coding ? 'Questions are optional in a coding lab. Ask about the input, the price rule or the test inputs whenever a card is unclear.' : 'This person made the request. Ask at least one question about the problem.',
    pageNames: MANUAL_SECTIONS.map(section => section.short)
  };
}

function introduction(scenario) {
  const track = TRACKS[scenario.track] || TRACKS.network;
  return {
    introduction: scenario.brief,
    objectives: [scenario.goal, ...track.objectives],
    tools: track.tools,
    deliverables: [scenario.track === 'coding' ? 'Two reference cards read and a saved plan for the fix' : 'Two recorded clues and a saved first idea', 'A saved experiment with a passing test', 'A written explanation and reflection in your lab report', scenario.track === 'coding' ? 'Optional challenge: the same task passing in the other practice language' : 'Optional challenge: the analysis question in Section 3']
  };
}

function readSteps(scenario, format, facts) {
  const persona = facts.persona || 'the requester';
  const steps = [{id:'read-scenario',instruction:'Read the scenario and the goal at the top of the page.',detail:scenario.brief,check:'ack'}];
  if (format.coding) {
    const guide = CODING_STEPS[key(scenario.id)];
    steps.push({id:'read-cards',instruction:'Open each card in the Reference sheet: '+scenario.clues.map(clue=>clue.label.toLowerCase()).join(', ')+'.',detail:guide?.read||scenario.clues.map(clue=>clue.text).join(' '),check:'clues'});
    steps.push({id:'ask',instruction:'Optional: ask '+persona+' about anything on the reference sheet that is unclear.',detail:scenario.questions.map(question=>'“'+question.label+'”').join(' or '),check:'asked',optional:true});
    steps.push({id:'plan',instruction:'Plan your fix: write what the starter gets wrong and the change you will make, then save the plan.',detail:guide?'Example: “The starter output does not match the expected reference.” and “I will change '+guide[facts.language||'javascript'].from.split('\n')[0]+' because '+guide.why.split('.')[0].toLowerCase()+'.”':'Describe the difference between actual and expected output, then the line you will change.',check:'saved'});
    return steps;
  }
  steps.push({id:'ask',instruction:'Ask '+persona+' about the problem'+(scenario.intake?.missing?': '+scenario.intake.missing.replace(/\.$/,'').replace(/^Find out /i,'find out ')+'.':'.'),detail:'Try a question starter: '+scenario.questions.map(question=>'“'+question.label+'”').join(' or ')+'. Compare the reply with what you can observe.',check:'asked'});
  steps.push({id:'clues',instruction:'Inspect at least two clues: '+scenario.clues.map(clue=>clue.label.toLowerCase()).join(', ')+'.',detail:'Open each clue card and read it fully. A clue marked “Ask first” unlocks after the matching question.',check:'clues'});
  steps.push({id:'plan',instruction:'Describe the symptoms, write your first idea about the cause, and save it.',detail:'Example: “I notice ' + (scenario.summary||'the reported symptom').replace(/\.$/,'').toLowerCase() + '.” and “I think … because the clue … shows ….”',check:'saved'});
  return steps;
}

function practiceSteps(scenario, format, facts) {
  if (format.coding) {
    const guide = CODING_STEPS[key(scenario.id)], language = facts.language === 'python' ? 'python' : 'javascript', fix = guide?.[language];
    const other = language === 'python' ? 'JavaScript' : 'Python';
    return [
      {id:'editor',instruction:'Choose your practice language ('+(language==='python'?'Python':'JavaScript')+' subset is selected). Select the first input card and compare the starter’s expected reference.',detail:'The reference pane shows the exact output every input card expects. Switching to '+other+' keeps your draft and clears results.',check:'ack'},
      {id:'edit',instruction:'Edit the starter in Your code so it follows the rule from the reference sheet.',detail:fix?'Change this line:\n'+fix.from+'\nto:\n'+fix.to+'\n'+guide.why:'Change one line at a time and keep the input variable; the fixture supplies its value.',check:'edited',code:true},
      {id:'run',instruction:'Choose Run all fixtures to test the saved program with every input card.',detail:'Each card turns to MATCH or CHECK. Select a CHECK card to read its actual and expected output side by side.',check:'tested'},
      {id:'match',instruction:'Keep revising until every input card shows MATCH.',detail:fix?'If a card still says CHECK, compare your line with:\n'+fix.to:'Read the first failing card, change one part of your program and rerun.',check:'works'},
      {id:'notebook',instruction:'Record the test in your Experiment notebook: what you changed, what you observed and what you learned. Then save the attempt.',detail:'Select Test my idea once your cards match. The notebook captures the result; finish the five answers and choose Save this attempt.',check:'ready'}
    ];
  }
  const hardware = HARDWARE_STEPS[key(scenario.id)];
  const mission = facts.mission || {};
  const instruction = hardware?.instruction || (typeof mission.next === 'string' && mission.next.trim() ? mission.next : 'Make one change at ' + (TRACKS[scenario.track]||TRACKS.network).bench + ' that your first idea predicts.');
  const detail = hardware?.detail || (Array.isArray(mission.hints) ? mission.hints.filter(Boolean).join(' ') : '');
  return [
    {id:'start',instruction:'Open the workbench. Your first idea and starting setup are recorded in the Experiment notebook below it.',detail:'The notebook begins the first test automatically once a first idea is saved. It records the setup before your change so the result can be compared.',check:'started'},
    {id:'change',instruction:instruction,detail:detail,check:'works'},
    {id:'test',instruction:'Choose Test my idea to run the check and record the result.',detail:scenario.track==='hardware'?'After the startup test, click Lesson_Practice_File.docx on the monitor. Only the open lesson file proves the customer’s task works.':'A saved setting is not a tested result. The test reads the actual output and writes it to the notebook.',check:'tested'},
    {id:'notebook',instruction:'Complete the notebook answers and choose Save this attempt.',detail:'Write what you changed, what happened and what you learned. A passing saved attempt unlocks Section 3.',check:'ready'}
  ];
}

function challengeSteps(scenario, format, facts) {
  const track = TRACKS[scenario.track] || TRACKS.network;
  const steps = [
    {id:'verify',instruction:'Choose Check the original task to confirm the goal with the current setup.',detail:'A changed setup needs a fresh check. The result appears beside the button.',check:'verified'},
    {id:'notes',instruction:'Write what you changed and what the test showed.',detail:'Use the sentence builder if you like, then finish it in your own words.',check:'notes'},
    {id:'reflection',instruction:'Explain whether the evidence supports your idea and what you learned.',detail:'Name the clue or test result that convinced you, or the one that changed your mind.',check:'reflection'},
    {id:'finish',instruction:'Finish the lab and review your report.',detail:'The report keeps your evidence, questions, tests and explanation together for your teacher’s approved hand-in route.',check:'closed'}
  ];
  if (format.coding) {
    const other = facts.language === 'python' ? 'JavaScript' : 'Python';
    steps.push({id:'challenge',instruction:'Challenge: switch to the '+other+' subset, choose Reset starter, and make every input card match again without the walkthrough.',detail:'',check:'challenge',optional:true,challenge:true});
  } else if (facts.transfer) {
    steps.push({id:'challenge',instruction:'Challenge: open the alternate case '+facts.transfer+'. Same symptom, different cause, no walkthrough.',detail:'',check:'ack',optional:true,challenge:true,href:facts.transferHref||''});
  } else {
    steps.push({id:'challenge',instruction:track.challenge,detail:'',check:'ack',optional:true,challenge:true});
  }
  return steps;
}

/** The whole manual for one lab, with each step’s completion read from the facts. */
export function labManual(scenario, facts = {}) {
  const format = labFormat(scenario);
  const acknowledged = new Set(Array.isArray(facts.acknowledged) ? facts.acknowledged : []);
  const sections = [readSteps, practiceSteps, challengeSteps].map((build, index) => {
    const meta = MANUAL_SECTIONS[index];
    const steps = build(scenario, format, facts).map(step => ({...step, done: step.check === 'ack' ? acknowledged.has(step.id) : facts[step.check] === true}));
    const required = steps.filter(step => !step.optional);
    return {...meta, steps, done: required.filter(step => step.done).length, total: required.length, complete: required.every(step => step.done)};
  });
  // Section 1 completion is the page gate; later sections cannot be complete before it.
  const unlocked = sections.map((section, index) => index === 0 || sections.slice(0, index).every(item => item.complete));
  return {...introduction(scenario), format, sections, unlocked};
}

const stepMark = (step, index, current) => step.done ? '✓' : step.optional ? '★' : String(index + 1);

/** The manual panel for the open page: a section stepper, the overview and the current section’s steps. */
export function renderLabManual(scenario, facts = {}) {
  const manual = labManual(scenario, facts);
  const index = Math.min(2, Math.max(0, (Number(facts.section) || 1) - 1));
  const section = manual.sections[index];
  const currentStep = section.steps.find(step => !step.done && !step.optional)?.id || null;
  const stepper = manual.sections.map((item, i) => '<li class="manual-section' + (i === index ? ' is-current' : '') + (item.complete ? ' is-complete' : '') + (!manual.unlocked[i] ? ' is-locked' : '') + '"' + (i === index ? ' aria-current="step"' : '') + '><span class="manual-section-number" aria-hidden="true">' + (item.complete ? '✓' : item.number) + '</span><span>Section ' + item.number + '<b>' + esc(item.title) + '</b></span><span class="sr-only">' + (item.complete ? ' complete' : manual.unlocked[i] ? ' ' + item.done + ' of ' + item.total + ' steps done' : ' locked until the previous section is complete') + '</span></li>').join('');
  const overview = '<details class="manual-overview"' + (index === 0 && !facts.closed ? ' open' : '') + '><summary>Introduction, objectives &amp; tools</summary><div class="manual-overview-grid"><section><h3>Introduction</h3><p>' + esc(manual.introduction) + '</p></section><section><h3>Learning objectives</h3><ul>' + manual.objectives.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul></section><section><h3>Tools in this simulation</h3><ul>' + manual.tools.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul></section><section><h3>Deliverables</h3><ul>' + manual.deliverables.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul></section></div><p class="manual-scope">Every device, person and record in this lab is simulated. Nothing here connects to a real system.</p></details>';
  const steps = section.steps.map((step, i) => {
    const classes = ['manual-step', step.done ? 'is-done' : '', step.id === currentStep ? 'is-current' : '', step.optional ? 'is-optional' : '', step.challenge ? 'is-challenge' : ''].filter(Boolean).join(' ');
    const detail = step.detail ? '<details class="manual-show-me"><summary>' + (step.challenge ? 'Hint' : 'Show me') + '</summary>' + (step.code ? '<pre class="manual-code" tabindex="0">' + esc(step.detail) + '</pre>' : '<p>' + esc(step.detail) + '</p>') + '</details>' : (step.challenge ? '<p class="manual-no-hint">No walkthrough for the challenge. Use what you learned in Sections 1 and 2.</p>' : '');
    const control = step.check === 'ack' && !step.done ? (step.href ? '<a class="lab-tool manual-ack-link" href="' + esc(step.href) + '">Open the alternate case</a> ' : '') + '<button type="button" class="lab-tool" data-manual-ack="' + esc(step.id) + '">Mark step done</button>' : '';
    return '<li class="' + classes + '" data-manual-step="' + esc(step.id) + '"' + (step.id === currentStep ? ' aria-current="step"' : '') + '><span class="manual-step-mark" aria-hidden="true">' + stepMark(step, i, currentStep) + '</span><div class="manual-step-body"><p class="manual-step-instruction">' + (step.optional && !step.challenge ? '<span class="manual-optional">Optional</span> ' : '') + esc(step.instruction) + '<span class="sr-only">' + (step.done ? ' (done)' : step.optional ? ' (optional)' : ' (to do)') + '</span></p>' + detail + control + '</div></li>';
  }).join('');
  const summary = section.complete ? 'Section ' + section.number + ' complete.' : section.done + ' of ' + section.total + ' required steps done.';
  return '<section class="lab-manual" aria-labelledby="lab-manual-title"><ol class="manual-sections" aria-label="Lab manual sections">' + stepper + '</ol>' + overview + '<div class="manual-current"><p class="eyebrow">LAB MANUAL · SECTION ' + section.number + ' OF 3</p><h2 id="lab-manual-title">' + esc(section.title) + '</h2><p class="manual-summary" role="status">' + esc(summary) + (section.id === 'challenge' && facts.challenge === true ? ' Challenge complete.' : '') + '</p></div><ol class="manual-steps" aria-label="Section ' + section.number + ' steps">' + steps + '</ol><div data-lab-next></div></section>';
}

/** Plain-text manual progress for the lab report. Nothing new is stored. */
export function labManualReport(scenario, facts = {}) {
  const manual = labManual(scenario, facts);
  const lines = manual.sections.map(section => 'Section ' + section.number + ' · ' + section.title + ': ' + (section.complete ? 'complete' : section.done + ' of ' + section.total + ' steps'));
  const challenge = manual.sections[2].steps.find(step => step.challenge);
  lines.push('Challenge: ' + (challenge?.done ? 'complete' : 'not attempted'));
  return lines.join('\n');
}
