/** Public teaching supports. This module never reads student work or contacts a provider. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const validId = value => /^(?:INC|NET|AI|SEC|CODE)-\d{3}$/.test(String(value));

export const learningModes = Object.freeze([
  Object.freeze({id:'guided',label:'Guided',description:'Start with a model, visible question starters, and a step-by-step reasoning prompt.'}),
  Object.freeze({id:'independent',label:'Independent',description:'Choose your own first question and test. Open the model or vocabulary whenever useful.'}),
  Object.freeze({id:'challenge',label:'Challenge',description:'Compare another possible cause and explain a result that would distinguish it. Support remains available.'})
]);
const modeFor = value => learningModes.find(item => item.id === value) || learningModes[0];
const glossary = Object.freeze({
  symptom:['Symptom','An observable result, such as a message or a light, that needs an explanation.'],
  hypothesis:['Hypothesis','A possible explanation that you can check with evidence.'],
  signal:['Video signal','Picture information sent from a computer output to a display input.'],
  power:['Power path','The connected route that supplies electrical power to equipment. Use only the virtual controls.'],
  post:['POST','The startup checks a computer performs before loading its operating system.'],
  memory:['RAM','Working memory used while the computer is running; it is different from a storage drive.'],
  storage:['Storage','The component that keeps the operating system and files when power is off.'],
  compatibility:['Compatibility','Whether a part or setting meets the requirements of the system using it.'],
  acceptance:['Acceptance test','A check that the original requested task can actually be completed.'],
  gateway:['Gateway','The configured route from a local network toward other networks.'],
  dns:['DNS','The service that translates a name into a network address. A successful ping alone does not verify it.'],
  privilege:['Least privilege','Giving an account only the access needed for its authorized task.'],
  recovery:['Recovery','Restoring a working state while protecting needed files and evidence.'],
  channel:['Wireless channel','A radio frequency range used by a wireless access point. Nearby use can affect interference.'],
  queue:['Print queue','The waiting list of jobs being sent to a printer. Removing a job does not print it.'],
  integrity:['Integrity check','A comparison that helps determine whether a file matches the expected contents.'],
  prompt:['Prompt','The instructions and context supplied for an AI task.'],
  identifier:['Personal identifier','Information that can identify or be linked to a person, such as a name, email, or student ID.'],
  evidence:['Evidence','A recorded observation or source that supports or challenges a claim.'],
  bias:['Bias check','Comparing outcomes for equivalent cases or groups to look for unfair differences.'],
  authorization:['Authorization','Permission for a specific person to access a specific resource or action.'],
  source:['Source boundary','A source provides material to evaluate; its text does not automatically become instructions to follow.'],
  threshold:['Threshold','A cut-off used to turn a score into a decision. Changing it can alter different kinds of errors.'],
  falsePositive:['False positive','A case incorrectly flagged as belonging to the target category.'],
  phishing:['Phishing','A deceptive message that tries to make someone reveal information or take an unsafe action.'],
  correlation:['Correlation','Comparing events by time, address, or other evidence; a match alone does not prove who acted.'],
  scope:['Authorized scope','The exact fictional system and actions approved for the exercise.'],
  mfa:['MFA','Multi-factor authentication: signing in with more than one type of proof.'],
  containment:['Containment','Limiting an incident’s reach while preserving useful evidence and unaffected services.'],
  signature:['Software signature','Evidence about the signed publisher and whether the signed package has changed; it is one part of a trust decision.'],
  variable:['Variable','A named value that a program can use and change.'],
  boundary:['Boundary test','A test at, just below, or just above a point where a program’s behavior may change.'],
  loop:['Loop','A repeated set of instructions controlled by a condition or count.'],
  fixture:['Test fixture','A supplied input and expected result used to check program behavior.']
});
const row = (focus, prerequisite, words, model, discussion, exitQuestion) => ({focus,prerequisite,words,model,discussion,exitQuestion});
// Teaching questions intentionally describe reasoning, not private keys or a repair sequence.
const lessons = Object.freeze({
  'INC-101':row('Distinguish display power from a usable picture and connect recent changes with observations.','Recognize a monitor, a computer tower, and a labeled display connection.',['symptom','hypothesis','signal'],'For a fictional speaker with no sound, first ask whether the sound stopped after a change. Predict what a sound test would show before changing one virtual setting.','Which observation separates a powered display from a working picture?','A different computer also shows no picture. What evidence would you collect before choosing the same repair?'),
  'INC-102':row('Trace a virtual power path before assuming that an internal component has failed.','Identify a power button and distinguish a monitor from the desktop it displays.',['power','symptom','hypothesis'],'For a virtual desk lamp, compare its light with the switch and connection labels. A dark lamp is an observation; a broken bulb is only one possible explanation.','What can the absence of both lights and fans tell you, and what does it leave unknown?','What safe virtual observation could distinguish missing power from a startup failure?'),
  'INC-103':row('Use startup evidence and recent-work history to separate memory detection from an operating-system problem.','Recognize the difference between memory and storage; follow the virtual safe-power instructions.',['post','memory','compatibility'],'For a fictional keyboard startup warning, record the exact warning before considering an operating-system repair. Predict whether the warning should change after a relevant virtual adjustment.','Why does the stage at which startup stops matter?','What would you check if the startup warning changed but the classroom desktop still did not appear?'),
  'INC-104':row('Connect boot-device evidence with storage observations while preserving classroom files.','Distinguish RAM from storage and recognize that the operating system lives on storage.',['post','storage','recovery'],'For a virtual camera that cannot find a saved image, distinguish an unavailable storage connection from an empty image. Look for evidence before deciding either is true.','Does “device not found” prove that its files were erased?','What evidence would support a connection problem rather than missing files?'),
  'INC-105':row('Compare part requirements and preserve the original system when choosing a storage action.','Read component labels and distinguish a compatible connector from a similar-looking one.',['compatibility','storage','acceptance'],'For a fictional spare keyboard, compare its connector specification with the computer before deciding whether it is a suitable replacement. A newer part is not automatically compatible.','How can a computer appear repaired while still failing its owner’s original goal?','What would your handoff say if the PC started but the requested lesson file was absent?'),
  'INC-106':row('Plan a compatible virtual build and verify the complete classroom task after assembly.','Use the virtual safe-power sequence and identify memory, graphics, storage, and connectors.',['compatibility','post','acceptance'],'For a small virtual audio kit, list requirements before selecting components. Then plan a test of the complete task rather than counting installed parts.','Why are component fit, startup, display, and file access separate kinds of evidence?','Which final test would show that a different user could actually use the delivered build?'),
  'INC-107':row('Investigate a familiar no-picture symptom while comparing display settings with connection evidence.','Recognize the difference between a monitor input and a computer video output.',['symptom','signal','hypothesis'],'For a fictional classroom speaker, compare which source it is listening to with which source is playing. Predict an observation before changing a setting, even if a previous audio problem had a different cause.','How can the same display message arise from a different cause than in an earlier ticket?','Which observation would distinguish an input selection issue from a disconnected signal?'),
  'INC-108':row('Trace the signal path for a familiar blank display without assuming that a previous repair applies.','Identify a labeled display cable and read a monitor status message.',['signal','evidence','acceptance'],'For a fictional wired headset, trace the labeled path between the source and listener. A previous settings repair does not establish which explanation fits the new observations.','What evidence should you gather before repeating a repair that worked on another blank monitor?','What would you check after restoring a picture to demonstrate that the original classroom task is complete?'),
  'NET-201':row('Compare local addressing, gateway reachability, and name resolution with the scope of a reported outage.','Read a dotted IPv4 address and understand that devices use network configuration.',['gateway','dns','hypothesis'],'For a fictional delivery route, distinguish reaching the building from finding the named room. In a network, test reachability and name lookup separately before explaining the result.','Why does one successful network test not establish that every service works?','A gateway responds but a portal name does not. Which kind of evidence should your next test collect?'),
  'NET-202':row('Separate network access from file permission and justify the minimum authorized access.','Distinguish reading a file from editing it and identify a network name.',['privilege','authorization','acceptance'],'For a fictional library cabinet, distinguish being allowed into the room from being permitted to open a particular drawer. Predict what each permission allows.','What is lost when a repair grants more access than the requester needs?','How would you demonstrate useful access while also checking that unnecessary access stays denied?'),
  'NET-203':row('Separate operating-system startup recovery from service health while preserving files.','Recognize an operating system, a service, and the difference between restarting and restoring.',['recovery','evidence','acceptance'],'For a fictional kiosk, record whether it reaches its home screen and whether its ticket service starts. One working layer does not establish that the next layer is healthy.','Why should a recovered desktop still receive a separate service test?','The system starts normally but updates fail. What evidence belongs in the next investigation?'),
  'NET-204':row('Compare coverage, interference, and radio choices using a fictional wireless survey.','Recognize an access point and understand that distance and obstacles can affect radio signals.',['channel','evidence','hypothesis'],'For a fictional room with noisy conversation, compare loudness with clarity. A stronger sound does not necessarily make two overlapping conversations easier to understand.','Why can a strong signal coexist with an unsuitable wireless plan?','Which two observations would help you judge a new access-point location?'),
  'NET-205':row('Restore a printing workflow while preserving the original queued handout.','Understand that a print job waits in a queue before reaching a destination printer.',['queue','evidence','acceptance'],'For a fictional delivery list, distinguish removing an entry from delivering its parcel. Predict what evidence should appear when the intended delivery actually succeeds.','Why is an empty queue insufficient proof that the handout printed?','What evidence would distinguish a removed job from a completed job?'),
  'NET-206':row('Choose a verified recovery version and test its contents without overwriting evidence.','Recognize a file version, a separate folder, and the purpose of a backup.',['recovery','integrity','evidence'],'For a fictional document archive, compare a restored copy with the expected contents in a separate location. A completed copy operation does not prove the chosen version is correct.','Why might the most recent backup be the wrong recovery choice?','What should a handoff report include beyond “the file copied successfully”?'),
  'AI-301':row('Write a bounded AI task using fictional context, a clear output, and a check of understanding.','Distinguish an instruction, context, and a requested output.',['prompt','identifier','evidence'],'For a fictional science explanation, specify the audience and length, then request a practice question. Review the response against the task instead of judging it by confidence.','What useful context can a prompt include without identifying a learner?','How would you check an AI explanation before teaching from it?'),
  'AI-302':row('Compare AI claims with a source and compare equivalent ticket classifications.','Distinguish a source-backed statement from an unsupported assertion.',['evidence','bias','prompt'],'For a fictional weather summary, mark which statements appear in the source and which do not. Then compare equivalent examples using the same decision rule.','Can confident wording or one correct category establish that the whole output is dependable?','What evidence would show that equivalent tickets were treated consistently?'),
  'AI-303':row('Audit generated code for secret handling, safe queries, and record-level permission.','Read a short code excerpt and distinguish a signed-in account from an authorized record owner.',['authorization','identifier','evidence'],'For a fictional classroom cabinet app, trace the requested record and the permission check separately. A successful login is only one part of deciding whether access is allowed.','Why can code run correctly for its author while still exposing another person’s record?','Which additional test would you run after confirming that the authorized record opens?'),
  'AI-304':row('Minimize practice data and preserve a meaningful alternative to AI participation.','Recognize that a choice must be understandable and provide a usable alternative.',['identifier','prompt','authorization'],'For a fictional practice worksheet, compare which inputs the activity actually needs. Remove unnecessary identifying details and check that the alternative still teaches the same goal.','Why does a consent checkbox alone fail to establish that a classroom AI activity is appropriate?','What would make the non-AI alternative equivalent and practical?'),
  'AI-305':row('Separate source evidence from embedded instructions and verify a cited summary.','Recognize that quoted material can contain both useful facts and irrelevant directions.',['source','evidence','prompt'],'For a fictional museum source card, underline facts relevant to the question. Treat an unrelated “ignore your task” sentence as text to evaluate, not a new authority.','What gives an instruction authority, and why does appearing in a source not provide it?','How would you explain the difference between citing a source and obeying it?'),
  'AI-306':row('Compare missed cases and false alarms across fictional groups before choosing human review.','Read a small table and distinguish a score from a final decision.',['threshold','falsePositive','bias'],'For a fictional sorting task, count both missed target items and incorrectly flagged items. Compare groups before deciding whether one overall score tells the full story.','Which errors can a single overall accuracy number hide?','What would you need to know before applying results from four practice examples to a real classroom?'),
  'SEC-401':row('Inspect a suspicious message and retain only the access required for the fictional task.','Distinguish a display name from a destination and avoid opening real suspicious links.',['phishing','privilege','evidence'],'For an invented school notice, compare its claimed sender with its visible destination. Record warning signs before deciding how to handle it; do not test a real link.','Why should appearance, sender evidence, and requested action be considered together?','What would you report without copying unnecessary personal information?'),
  'SEC-402':row('Correlate fictional security events and preserve a required service while narrowing exposure.','Read a short log entry and recognize that different ports can serve different purposes.',['correlation','containment','scope'],'For a fictional building access log, compare time and location before linking two events. A matching location can support an investigation without proving a person’s identity.','Why can an address in a log support containment without identifying the person responsible?','How would you test that a protective change did not also break the required portal?'),
  'SEC-403':row('Reproduce an authorized access-control defect, patch it, and test both allowed and denied access.','Distinguish authentication from record-level authorization; stay within the supplied simulation.',['authorization','scope','evidence'],'For a fictional cabinet app, write one expected allowed result and one expected denied result before changing its access rule. Test both afterward.','Why does hiding a link fail to establish permission enforcement?','Which pair of tests would reveal a patch that blocks everyone?'),
  'SEC-404':row('Evaluate a fictional MFA recovery request using approved identity checks and an audit trail.','Recognize a password and a second authentication factor; never use real secrets.',['mfa','authorization','evidence'],'For an invented lost library badge, compare the requester’s claim with the approved verification process. Urgency changes the response time, not the need to verify authority.','How can a recovery process help an authorized user without handing a stranger control?','What safe evidence belongs in a recovery record, and what secrets should stay out?'),
  'SEC-405':row('Sequence containment, evidence preservation, notification, and isolated recovery in a fictional incident.','Distinguish an affected endpoint from the whole network and understand a verified backup.',['containment','recovery','integrity'],'For a fictional damaged archive, first limit further changes and preserve a record of what happened. Plan recovery in a separate place so the original evidence remains available.','What risks arise when recovery begins before the incident’s reach is understood?','What evidence would support returning a recovered system to normal use?'),
  'SEC-406':row('Compare source, publisher, and integrity evidence before a limited software pilot.','Recognize a download source and distinguish a secure connection from trustworthy software.',['signature','integrity','privilege'],'For a fictional packaged tool, compare the source and expected package information before deciding whether to test it. A sealed delivery route alone does not prove the package is appropriate.','What does HTTPS establish, and which software trust questions remain?','What would you verify before expanding a pilot to additional classroom devices?'),
  'CODE-501':row('Use variables and arithmetic to produce a changing quantity-based total.','Read a variable assignment and multiplication; use the bounded teaching-language editor.',['variable','fixture','evidence'],'For a fictional sticker order, predict how changing quantity should change the output. Test zero and another quantity to distinguish a general expression from a remembered total.','Why can a hardcoded answer pass one example and still fail the task?','Which new input would you choose to test whether a calculator uses its variable?'),
  'CODE-502':row('Explain conditional behavior at, below, and above each specified boundary.','Read comparisons and follow a short if/else decision.',['boundary','fixture','hypothesis'],'For a fictional height rule, write the expected result just below a boundary, exactly at it, and just above it. Compare the rule’s words with the program’s comparisons.','Why are values exactly at a boundary useful tests?','How would you detect a program that leaves one boundary in the wrong category?'),
  'CODE-503':row('Trace a counter and align loop output with the supplied station count.','Read a counter assignment, comparison, and increment.',['loop','variable','fixture'],'For a fictional numbered checklist, trace the first counter value, the repeated action, and the stopping condition on paper. Compare how many lines you predicted with the output.','How can a loop print the right first line but still produce the wrong number of lines?','What test would expose an extra iteration without depending on one specific station count?')
});

function lessonId(scenario) { return String(scenario?.teachingId || scenario?.baseId || scenario?.id || ''); }
export function lessonFor(scenario) {
  const id = lessonId(scenario);
  const data = Object.hasOwn(lessons,id)?lessons[id]:null;
  if (!data) throw new RangeError('No reviewed teaching plan is available for this case.');
  return {
    id:String(scenario.id), title:String(scenario.title || id), track:String(scenario.track || ''),
    goals:[data.focus,'Use a prediction, a recorded observation, and a retest to justify a conclusion.'],
    prerequisites:[data.prerequisite,'Use fictional information only and follow the on-screen safety and scope instructions.'],
    vocabulary:data.words.map(key => ({term:glossary[key][0],definition:glossary[key][1]})),
    model:data.model, discussion:data.discussion, exitQuestion:data.exitQuestion,
    transfer:'Choose a similar case with a different cause or rule. Predict which observation would distinguish it before acting.'
  };
}

export function lessonLink(scenario, mode='guided') {
  if (!validId(scenario?.id)) throw new RangeError('A reviewed lab ID is required.');
  lessonFor(scenario);
  return '#lab/'+encodeURIComponent(assignmentFor(scenario,mode).id)+'?mode='+modeFor(mode).id;
}
export function assignmentUrl(scenario,mode='guided') {
  return 'https://www.colelearninglabs.com/'+lessonLink(scenario,mode);
}
const transferAssignments=Object.freeze({
  'INC-101':Object.freeze({id:'INC-107',title:'No Picture After a Presentation'}),
  'INC-107':Object.freeze({id:'INC-108',title:'No Picture at the Moved Desk'}),
  'INC-108':Object.freeze({id:'INC-101',title:'The Blank Monitor'})
});
function assignmentFor(scenario,mode) {
  const transfer=modeFor(mode).id==='challenge'?transferAssignments[scenario?.id]:null;
  return transfer?{...scenario,...transfer}:scenario;
}
const durations = Object.freeze({20:[3,2,9,4,2],40:[5,5,20,6,4],60:[8,7,30,10,5]});
export function buildLessonPlan(scenario, {duration=40,mode='guided',grouping='pairs'}={}) {
  const assigned=assignmentFor(scenario,mode),lesson=lessonFor(assigned), minutes=Object.hasOwn(durations,duration)?Number(duration):40, selected=modeFor(mode);
  const steps=[
    ['Introduce the task','Read the original request, the learning goal, safety, and scope. Define the unfamiliar words.'],
    [selected.id==='challenge'?'Predict an alternative':'Model the process',selected.id==='guided'?lesson.model:selected.id==='independent'?'Predict the first observation you will collect. Open the example if it helps.':'Name two possible explanations. Predict evidence that would distinguish them.'],
    ['Investigate and test','Use the three tabs: ask and inspect; predict and make one change; compare the result. Keep useful unsuccessful tests.'],
    ['Check and explain','Retest the original goal. Explain which observations support your conclusion and what remains uncertain.'],
    ['Exit and handoff',lesson.exitQuestion+' Review and export through the teacher’s approved route.']
  ].map(([title,text],index)=>({title,text,minutes:durations[minutes][index]}));
  return {...lesson,duration:minutes,mode:selected.id,modeLabel:selected.label,grouping:grouping==='individual'?'individual':'pairs',link:lessonLink(scenario,selected.id),transferFrom:assigned.id!==scenario.id?scenario.id:null,steps};
}
const list = items => '<ul>'+items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul>';
function vocabularyMarkup(lesson,open=false) {
  return '<div class="teaching-vocabulary">'+lesson.vocabulary.map(item=>'<details'+(open?' open':'')+'><summary>'+esc(item.term)+'</summary><p>'+esc(item.definition)+'</p></details>').join('')+'</div>';
}
function processMarkup() {
  return '<ol class="teaching-process" aria-label="The investigation process"><li><b>1</b><span>Ask &amp; observe</span></li><li><b>2</b><span>Predict &amp; test</span></li><li><b>3</b><span>Compare &amp; explain</span></li></ol>';
}

export function renderLabLearning(scenario,mode='guided') {
  const lesson=lessonFor(scenario), selected=modeFor(mode);
  return `<section class="lab-learning teaching-mode-${selected.id}" aria-labelledby="learning-title">
    <div class="learning-heading"><div><p class="eyebrow">Your learning support</p><h2 id="learning-title">${esc(selected.label)} investigation</h2></div><a href="#educators">Teacher lesson plans</a></div>
    <p>${esc(selected.description)} Safety instructions, vocabulary, and help stay available in every mode.</p>
    ${processMarkup()}
    <p class="learning-goal"><strong>Practise:</strong> ${esc(lesson.goals[0])}</p>
    ${selected.id==='guided'?'<p class="learning-mode-task"><strong>Start here:</strong> Write one observation and one possible explanation. Before acting, predict what your test will show.</p>':selected.id==='independent'?'<p class="learning-mode-task"><strong>Your first decision:</strong> Choose a question or observation that will help you decide what to test. Explain your choice.</p>':'<p class="learning-mode-task"><strong>Challenge:</strong> Compare two possible explanations. Describe an observation that would favor one over the other, then test your prediction.</p>'}
    <details class="learning-model"><summary>See a worked example of the process</summary><p>${esc(lesson.model)}</p><p>The example models reasoning. Apply the process to your own case and check its evidence.</p></details>
    <details class="learning-words"><summary>Words you can tap to define</summary>${vocabularyMarkup(lesson)}</details>
  </section>`;
}

function renderPlan(plan) {
  const roles=plan.grouping==='pairs'?'<p><strong>Investigator:</strong> operates the virtual equipment and says the prediction aloud. <strong>Evidence partner:</strong> records observations and asks what they support. Swap after the first meaningful test. Both explain the final result.</p>':'<p><strong>Working individually:</strong> pause before each change to predict a result. After testing, compare your observation with that prediction before choosing the next action.</p>';
  return `<article class="teaching-plan" aria-labelledby="teaching-plan-title"><p class="eyebrow">${esc(plan.id)} · ${plan.duration} minutes · ${esc(plan.modeLabel)}</p><h2 id="teaching-plan-title">${esc(plan.title)}</h2>${plan.transferFrom?'<p class="teaching-transfer-note"><strong>Fresh transfer case:</strong> This assignment opens '+esc(plan.id)+' after '+esc(plan.transferFrom)+'. The familiar no-picture symptom has a different cause. Use this case’s evidence instead of repeating a previous repair.</p>':''}
    <div class="teaching-plan-actions"><a class="button" data-assignment-link href="${esc(plan.link)}">Open student assignment</a><button class="button button-outline" type="button" data-teaching-action="copy-link">Copy assignment link</button><button class="button button-outline" type="button" data-teaching-action="print">Print lesson plan</button></div>
    <p class="teaching-link-note">This link contains only a public lab ID and support mode. It contains no roster, student information, teacher key, or work.</p>
    <div class="teaching-two-column"><section><h3>Learning goals</h3>${list(plan.goals)}</section><section><h3>Before you begin</h3>${list(plan.prerequisites)}</section></div>
    <section><h3>${plan.grouping==='pairs'?'Partner roles':'Independent working routine'}</h3>${roles}</section>
    <section><h3>Lesson sequence</h3><ol class="teaching-sequence">${plan.steps.map(step=>'<li><span>'+step.minutes+' min</span><div><h4>'+esc(step.title)+'</h4><p>'+esc(step.text)+'</p></div></li>').join('')}</ol></section>
    <section><h3>Model a way to think</h3><p>${esc(plan.model)}</p>${processMarkup()}</section>
    <section><h3>Vocabulary</h3>${vocabularyMarkup(plan,true)}</section>
    <div class="teaching-two-column"><section><h3>Discuss the evidence</h3><p>${esc(plan.discussion)}</p></section><section><h3>Exit question</h3><p>${esc(plan.exitQuestion)}</p></section></div>
    <p class="teaching-boundary">A passed technical check is evidence about this simulation, not a grade or proof of understanding. These lesson materials are public. Keep private answer keys and grading materials in your school’s authenticated teacher resources.</p>
  </article>`;
}
const promptPurposes = Object.freeze({ticket:'Draft an alternative fictional requester conversation',hints:'Draft a three-level reasoning hint sequence',misconceptions:'Draft common misconceptions and discussion questions',questions:'Draft fictional questions for testing requester replies'});
const readingLevels = Object.freeze({plain:'Use short everyday sentences and define technical vocabulary.',standard:'Use clear middle and high school language with brief technical definitions.',extended:'Use precise technical language and ask learners to compare alternative explanations.'});
export function buildTeacherPrompt(scenario,{purpose='ticket',reading='standard',support='guided'}={}) {
  const id=lessonId(scenario), data=Object.hasOwn(lessons,id)?lessons[id]:null;
  if (!data) throw new RangeError('A reviewed fictional case is required.');
  const task=Object.hasOwn(promptPurposes,purpose)?purpose:'ticket';
  const level=Object.hasOwn(readingLevels,reading)?reading:'standard';
  const selected=modeFor(support);
  // Use only authored metadata and bounded choices, never a requester's editable text or learner record.
  return [
    'TEACHER DRAFTING TASK — FICTIONAL PRACTICE ONLY',
    'Prepare a draft for teacher review, not a live reply to a student and not a grading decision.',
    'Public simulation case: '+id+'.',
    'Teaching focus: '+data.focus,
    'Task: '+promptPurposes[task]+'.',
    'Language: '+readingLevels[level],
    'Learning support: '+selected.label+'. '+selected.description,
    'Vocabulary to explain: '+data.words.map(key=>glossary[key][0]).join(', ')+'.',
    'Use invented equipment and incidents only. Do not request or include real names, emails, student IDs, passwords, class rosters, student work, or private school details.',
    'Stay within the browser simulation. Do not request real scans, downloads, commands against real equipment, or changes to a learner’s actual device.',
    'Keep facts, observations, and unknown details separate. A requester may describe symptoms but should not know hidden technical facts without evidence.',
    'Do not invent controls, evidence, causes, successful tests, or outcomes that the current simulation does not support. Flag any proposed new capability as UNIMPLEMENTED DRAFT.',
    'Ask learners to predict and explain. Do not provide a final repair sequence, private answer key, or grading rubric.',
    'Return: (1) the fictional draft, (2) an explicit list of factual assumptions for teacher checking, (3) three synthetic follow-up questions including an ambiguous question and an unsupported-detail question, (4) a checklist to compare every claim with actual simulation observations.',
    'Teacher review before use: check case consistency; test every proposed question and outcome in the lab; reject invented facts; check safety, accessibility, reading level, and privacy; retain human grading and an equivalent non-AI learning route.'
  ].join('\n\n');
}

function options(values,selected) { return Object.entries(values).map(([value,label])=>'<option value="'+esc(value)+'"'+(value===selected?' selected':'')+'>'+esc(label)+'</option>').join(''); }
function renderPreparation(scenario) {
  return `<section class="teacher-preparation" aria-labelledby="teacher-preparation-title"><p class="eyebrow">Optional teacher preparation</p><h2 id="teacher-preparation-title">Prepare a fictional AI drafting prompt</h2><p>Build a prompt on this device from the selected lab and the choices below. This tool does not generate AI replies or contact an AI service. Copy it only into a service your school approves, review its output, and test it against the actual lab before teaching.</p>
    <div class="teaching-controls"><label>Preparation task<select data-teaching-field="purpose">${options(promptPurposes,'ticket')}</select></label><label>Reading support<select data-teaching-field="reading">${options({plain:'Short, plain language',standard:'Standard explanation',extended:'More technical discussion'},'standard')}</select></label><label>Learning mode<select data-teaching-field="prompt-mode">${options(Object.fromEntries(learningModes.map(item=>[item.id,item.label])),'guided')}</select></label></div>
    <pre class="teacher-prompt" data-teacher-prompt tabindex="0" aria-label="Prepared teacher prompt">${esc(buildTeacherPrompt(scenario))}</pre><button class="button button-outline" type="button" data-teaching-action="copy-prompt">Copy teacher prompt</button>
    <details class="teacher-review"><summary>Review and test before using a draft</summary><ul><li>Compare each statement with the lab’s actual clues, controls, and test results.</li><li>Try a direct question, a natural follow-up, an ambiguous reference, and a question about an unknown detail.</li><li>Check that the requester acknowledges uncertainty instead of inventing facts or giving away a final repair.</li><li>Review reading level, accessible alternatives, safety and scope. Use fictional test questions, not student conversations.</li><li>Keep human judgment for feedback and grading. A copied prompt does not enable live AI in student labs.</li></ul></details>
  </section>`;
}
export function renderTeachingPage(scenarios) {
  const available=(Array.isArray(scenarios)?scenarios:[]).filter(item=>validId(item?.id)&&lessons[lessonId(item)]);
  if (!available.length) return '<section class="wrap section teaching-page"><h1>Teaching toolkit</h1><p>No reviewed lesson plans are available.</p></section>';
  return `<div class="teaching-page"><header class="wrap page-intro"><p class="eyebrow">Ready to teach · Grades 7–12</p><h1>A lesson plan for every investigation.</h1><p>Choose a lab, time, and support level. Share a public assignment link, model the reasoning process, and use the evidence to guide discussion. Readiness and learning needs determine support; grade bands are starting suggestions.</p></header><section class="wrap teaching-launcher" aria-labelledby="teaching-launcher-title"><h2 id="teaching-launcher-title">Plan your lesson</h2><div class="teaching-controls"><label>Investigation<select data-teaching-field="lab">${available.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.id+' · '+item.title)+'</option>').join('')}</select></label><label>Lesson time<select data-teaching-field="duration">${options({20:'20 minutes',40:'40 minutes',60:'60 minutes'},'40')}</select></label><label>Learning support<select data-teaching-field="mode">${options(Object.fromEntries(learningModes.map(item=>[item.id,item.label])),'guided')}</select></label><label>Working arrangement<select data-teaching-field="grouping">${options({pairs:'Pairs with rotating roles',individual:'Individual investigation'},'pairs')}</select></label></div><p class="teaching-mode-help" data-teaching-mode-help>${esc(learningModes[0].description)} All safety and accessibility support stays available.</p><div data-teaching-plan>${renderPlan(buildLessonPlan(available[0]))}</div>${renderPreparation(available[0])}<p class="teaching-status" role="status" aria-live="polite" data-teaching-status></p></section></div>`;
}

export function mountTeachingPage(root,scenarios,{notify}={}) {
  if (!root?.querySelector || !root.addEventListener) return ()=>{};
  const available=(Array.isArray(scenarios)?scenarios:[]).filter(item=>validId(item?.id)&&lessons[lessonId(item)]);
  if (!available.length) return ()=>{};
  const field=name=>root.querySelector('[data-teaching-field="'+name+'"]');
  const selected=()=>available.find(item=>item.id===field('lab')?.value)||available[0];
  const status=message=>{const target=root.querySelector('[data-teaching-status]');if(target)target.textContent=message;if(typeof notify==='function')notify(message);};
  const prompt=()=>buildTeacherPrompt(assignmentFor(selected(),field('mode')?.value),{purpose:field('purpose')?.value,reading:field('reading')?.value,support:field('prompt-mode')?.value});
  function update(event) {
    const key=event.target?.getAttribute?.('data-teaching-field');
    if (!key) return;
    if (['lab','duration','mode','grouping'].includes(key)) {
      const host=root.querySelector('[data-teaching-plan]');
      if(host)host.innerHTML=renderPlan(buildLessonPlan(selected(),{duration:field('duration')?.value,mode:field('mode')?.value,grouping:field('grouping')?.value}));
      const help=root.querySelector('[data-teaching-mode-help]');
      if(help)help.textContent=modeFor(field('mode')?.value).description+' All safety and accessibility support stays available.';
      if(key==='mode'&&field('prompt-mode'))field('prompt-mode').value=modeFor(field('mode')?.value).id;
    }
    const output=root.querySelector('[data-teacher-prompt]');
    if(output)output.textContent=prompt();
    const outputStatus=root.querySelector('[data-teaching-status]');
    if(outputStatus)outputStatus.textContent='Lesson choices updated on this page.';
  }
  async function act(event) {
    const button=event.target?.closest?.('[data-teaching-action]');
    if(!button||!root.contains(button))return;
    const action=button.getAttribute('data-teaching-action');
    if(action==='print') {globalThis.print?.();return;}
    if(!['copy-link','copy-prompt'].includes(action))return;
    let text=prompt();
    if(action==='copy-link') {
      text=assignmentUrl(selected(),field('mode')?.value);
    }
    try {if(!globalThis.navigator?.clipboard?.writeText)throw new Error('Clipboard unavailable');await globalThis.navigator.clipboard.writeText(text);status(action==='copy-link'?'Public assignment link copied.':'Fictional teacher prompt copied. Review any generated draft before use.');}
    catch {status(action==='copy-link'?'Copy is unavailable. Open the student assignment and copy its address.':'Copy is unavailable. Select the prepared prompt and copy it manually.');}
  }
  root.addEventListener('change',update);root.addEventListener('click',act);
  return ()=>{root.removeEventListener('change',update);root.removeEventListener('click',act);};
}
