/** Offline practice interview. Replies describe supplied fictional case facts, never a live person or AI service. */
const EVENT_PREFIX = 'Interview v1: ';
const QUESTION_MAX = 240;
const ANSWER_MAX = 300;
const CASE_IDS = new Set(['INC-101','INC-102','INC-103','INC-104','INC-105','INC-106','NET-201','NET-202','NET-203','AI-301','AI-302','AI-303','SEC-401','SEC-402','SEC-403']);
const compact = text => text.replace(/\s+/gu, ' ').trim();
const bounded = text => text.length <= ANSWER_MAX ? text : text.slice(0, ANSWER_MAX - 1).trimEnd() + '…';
const response = (answer, topic, kind = 'answer', accepted = true) => ({ accepted, answer:bounded(answer), kind, topic });
const validQuestion = value => typeof value === 'string' && compact(value).length > 0 && value.length <= QUESTION_MAX && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);

// A small precaution, not automatic de-identification. Free text can identify someone in ways these patterns cannot detect.
function containsPrivateDetails(text) {
  return /[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/iu.test(text)
    || /(?:^|[^\w.])(?:\+?\d[\d ()-]{6,}\d)(?=$|[^\w.])/u.test(text)
    || /\b(?:student|school|social security|ssn)\s*(?:id|identifier|number)\s*(?:is|:|=|#)?\s*[a-z0-9-]{3,}/iu.test(text)
    || /\b(?:my|his|her|their|the student'?s?|a student'?s?)\s+(?:full |real )?(?:name|email|address|diagnosis|medical condition|phone number|date of birth)\b/iu.test(text)
    || /\b(?:show|give|reveal|find|tell me|what is|what's)\b.{0,55}\b(?:student'?s? (?:name|email|id|diagnosis)|password|passphrase|private key|access token)\b/iu.test(text)
    || /\b(?:password|passphrase|secret|api[- ]?key|access[- ]?token)\s*(?:is|:|=)\s*\S+/iu.test(text)
    || /\b(?:sk-(?:proj-)?[a-z0-9_-]{8,}|gh[pousr]_[a-z0-9]{12,})\b/iu.test(text);
}

const outOfScopeInstructions = text => /\b(?:rubric|answer[ -]?key|mark(?:ing)? scheme|grading criteria|system prompt|developer message|hidden instructions)\b|\b(?:show|reveal|dump|print|download)\b.{0,35}\bsource code\b|\b(?:ignore|override|forget)\b.{0,45}\b(?:instructions|rules|previous|privacy)\b/iu.test(text);
const read = (state, field, allowed) => state && typeof state === 'object' && Object.hasOwn(state, field) && allowed.includes(state[field]) ? state[field] : undefined;
const flag = (state, field) => read(state, field, [true, false]);
const clueText = (scenario, id) => {
  const found = Array.isArray(scenario.clues) ? scenario.clues.find(clue => clue && clue.id === id && typeof clue.text === 'string') : undefined;
  return found ? found.text : 'That detail is not recorded in this case. Inspect the supplied case cards and explain what you can observe.';
};
const fact = (scenario, id, topic = id) => response(clueText(scenario, id), topic);
const currentOr = (scenario, state, field, yes, no, fallback) => flag(state, field) === undefined ? response(clueText(scenario, fallback), fallback) : response(flag(state, field) ? yes : no, 'current-state');
const ipv4 = value => typeof value === 'string' && /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(value) && value.split('.').every(part => Number(part) <= 255) ? value : 'not set';

function caseReply(scenario, question, state) {
  const id = scenario.id;
  if (id.startsWith('INC-') && /safe|safety|disconnect|unplug|internal|touch|power off/iu.test(question)) {
    const off = flag(state, 'pcOn') === false; const unplugged = flag(state, 'acConnected') === false;
    return response('For internal work, power off and unplug AC using the virtual bench controls first. ' + (off && unplugged ? 'The virtual bench currently shows both safety steps complete.' : 'Confirm both indicators before touching internal parts.') + ' All actions are on-screen; leave your real Chromebook or tablet closed.', 'safety');
  }
  if (id === 'INC-101') {
    if (/monitor|screen|display|picture|video|signal|hdmi|cable|port|socket/iu.test(question)) {
      const on = flag(state, 'pcOn'); const port = read(state, 'videoPort', ['board','gpu']); const boot = flag(state, 'booted');
      if (on !== undefined && port && boot !== undefined) return response('Current bench: the desktop is ' + (on ? 'on' : 'off') + '; the display cable uses the ' + (port === 'gpu' ? 'dedicated graphics-card output' : 'motherboard output') + '. ' + (on && boot && port === 'gpu' ? 'The virtual display can show the desktop.' : 'The display is not ready to show the classroom desktop.'), 'current-state');
      return fact(scenario, /cable|port|socket|hdmi/iu.test(question) ? 'video' : 'screen');
    }
    if (/power|lights?|fans?|running|turn.*on/iu.test(question)) return currentOr(scenario, state, 'pcOn', 'The virtual tower is on. Its power light and fans are running.', 'The virtual tower is currently off. No running fans or power light are shown.', 'power');
  }
  if (id === 'INC-102') {
    if (/power|outlet|plug|cable|ac|lights?|fans?|button|start/iu.test(question)) {
      const on = flag(state, 'pcOn'); const ac = flag(state, 'acConnected');
      if (on !== undefined && ac !== undefined) return response('Current bench: AC power is ' + (ac ? 'connected' : 'disconnected') + ' and the desktop is ' + (on ? 'on, with its power light and fans running.' : 'off. Check the virtual power path before trying the power button.'), 'current-state');
      return fact(scenario, /switch/iu.test(question) ? 'switch' : 'power');
    }
    if (/parts|inside|installed|missing/iu.test(question)) return fact(scenario, 'components');
  }
  if (id === 'INC-103') {
    if (/ram|memory|clip|seat|beep|boot|startup|operating system/iu.test(question)) {
      if (/compatib|type|ddr|spec/iu.test(question)) return fact(scenario, 'spec');
      return currentOr(scenario, state, 'ramSeated', 'The DDR4 module is currently seated in the virtual slot. Run a startup test to see whether the complete computer passes.', 'The virtual DDR4 module is not fully seated. One retaining clip is open; record the startup evidence before testing a change.', 'ram');
    }
  }
  if (id === 'INC-104') {
    if (/drive|storage|sata|cable|data|boot|operating system/iu.test(question)) {
      if (/files|documents|label|replac|recover/iu.test(question)) return fact(scenario, 'drive');
      return currentOr(scenario, state, 'sataDataConnected', 'The SATA data lead is currently connected in the virtual bench. Check drive power and run a startup test; a cable connection alone does not prove the task is complete.', 'The original drive has no connected SATA data lead in the virtual bench. Inspect both data and power connections without discarding the classroom drive.', 'sata');
    }
  }
  if (id === 'INC-105') {
    if (/nvme|compatib|connector|interface|spec|spare/iu.test(question)) return fact(scenario, 'spec');
    if (/original|drive|storage|files|tray|sata/iu.test(question)) return currentOr(scenario, state, 'originalDriveInstalled', 'The original classroom SATA drive is currently installed. Verify its data and power leads, then test startup and the requested document.', 'The original classroom SATA drive is currently outside the computer in the virtual parts tray. Its classroom system and files are intact.', 'drive');
  }
  if (id === 'INC-106') {
    if (/compatib|type|ddr|parts|spec|component|cpu|gpu|processor|ram|motherboard|build|assemble/iu.test(question)) return fact(scenario, /tray|distractor/iu.test(question) ? 'parts' : 'spec');
    if (/ready|finish|deliver|document|acceptance/iu.test(question)) return fact(scenario, 'acceptance');
  }
  if (id === 'NET-201') {
    if (/current|now|set to|configured|settings|address|dns|gateway|subnet|mask|ip\b/iu.test(question)) {
      if (/current|now|set to|configured|settings/iu.test(question) && state && ['ip','dns','gateway'].some(key => Object.hasOwn(state,key))) return response('Current virtual settings: IP ' + ipv4(state.ip) + ', mask ' + ipv4(state.mask) + ', gateway ' + ipv4(state.gateway) + ', DNS ' + ipv4(state.dns) + '. Compare these with the configuration sheet, then test one layer at a time.', 'current-state');
      return fact(scenario, 'sheet');
    }
    if (/link|switch|cable|down|every|all|other|printer|portal|website|resolve|reach/iu.test(question)) return fact(scenario, /link|switch|cable/iu.test(question) ? 'switch' : 'ticket');
  }
  if (id === 'NET-202') {
    if (/wi.?fi|network|guest|staff|connect|share|folder|access|permission|rights|read|edit/iu.test(question)) {
      if (/current|now|selected/iu.test(question)) {
        const network = read(state,'network',['School-Guest','Staff-Lab']); const permission = read(state,'permission',['Full control','Modify','Read','None']); const folder = read(state,'folder',['All folders','Project Materials','No folders']);
        if (network && permission && folder) return response('Current virtual choices: ' + network + '; ' + folder + '; ' + permission + '. The requester needs only the approved staff network and access to read the project handout.', 'current-state');
      }
      return fact(scenario, /guest|network|wi.?fi|staff|connect/iu.test(question) ? 'policy' : 'request');
    }
    if (/account|identity|sign.?in|password/iu.test(question)) return fact(scenario, 'identity');
  }
  if (id === 'NET-203') {
    if (/service|update.*(?:running|start)|disabled|automatic/iu.test(question)) {
      const status = read(state,'status',['Stopped','Running']); const startup = read(state,'startup',['Disabled','Manual','Automatic']);
      return status && startup ? response('The virtual update service is currently ' + status + ', with startup type ' + startup + '. Normal boot and a working update service are separate parts of the request.', 'current-state') : fact(scenario,'service');
    }
    if (/rollback|roll back|snapshot|recover|erase|files|update|crash|boot/iu.test(question)) return fact(scenario, /snapshot|rollback|roll back|erase|files|recover/iu.test(question) ? 'history' : 'event');
  }
  if (id === 'AI-301') {
    if (/send|sent|service|account|live ai/iu.test(question)) return response('This activity uses fixed checks in your browser. Neither this interview nor the prompt audit sends questions to an AI service. Use fictional information and compare explanations with class notes.', 'privacy');
    if (/prompt|task|network|explain|practice|question|learn|write/iu.test(question)) return fact(scenario, /check|correct|accur|guarantee|verify/iu.test(question) ? 'limits' : 'task');
    if (/ai|send|model|service|account/iu.test(question)) return response('This activity uses fixed checks in your browser. Neither this interview nor the prompt audit sends questions to an AI service. Use fictional information and compare explanations with class notes.', 'privacy');
  }
  if (id === 'AI-302') {
    if (/source|claim|guide|confiden|true|policy|password|evidence|supported/iu.test(question)) return fact(scenario,'source');
    if (/bias|same|equal|categor|ticket|name|different|classif/iu.test(question)) return fact(scenario, /trait|guess|judg/iu.test(question) ? 'human' : 'pair');
  }
  if (id === 'AI-303') {
    if (/secret|environment|key|credential/iu.test(question)) return fact(scenario,'secret');
    if (/sql|query|parameter|concaten|inject/iu.test(question)) return fact(scenario,'query');
    if (/owner|authoriz|record|signed|login|log in|hidden|access/iu.test(question)) return fact(scenario,'owner');
    if (/run|execut|python|test/iu.test(question)) return response('This is a code-review simulation. The test controls run a fixed matrix of review choices; they do not execute Python or arbitrary code.', 'scope');
  }
  if (id === 'SEC-401') {
    if (/sender|from|address|domain|message|phish|suspici|inbox/iu.test(question)) return fact(scenario,'sender');
    if (/link|url|click|destination|button/iu.test(question)) return fact(scenario,'link');
    if (/permission|access|rights|admin|read|helper|checklist/iu.test(question)) return fact(scenario,'scope');
    if (/password|reply|credential|urgent/iu.test(question)) return response('Do not reply with credentials or open a real link. Inspect the text-only sender and destination, then use the school-approved reporting process. Urgency is a warning sign, not proof by itself.', 'message-safety');
  }
  if (id === 'SEC-402') {
    if (/real|scan|packet|ping/iu.test(question)) return response('These are fixed synthetic logs and documentation addresses. No packets leave this lab. Do not scan or test a real school system; permission for this simulation covers only its built-in controls.', 'scope');
    if (/log|event|failure|success|sequence|source|address|proof|who|attacker/iu.test(question)) return fact(scenario, /identity|proof|who|attacker/iu.test(question) ? 'policy' : 'logs');
    if (/port|telnet|https|443|23|service|close|shut|block.*all/iu.test(question)) return fact(scenario,'ports');
    if (/real|scan|packet|ping|connect|test/iu.test(question)) return response('These are fixed synthetic logs and documentation addresses. No packets leave this lab. Do not scan or test a real school system; permission for this simulation covers only its built-in controls.', 'scope');
  }
  if (id === 'SEC-403') {
    if (/retest|expected.*(?:response|code)|200|403/iu.test(question)) return response('After a server-side ownership check, the same fictional user should receive 200 for their own record 101 and 403 for record 102. Run both requests and record what actually happens; do not assume a selected patch has been tested.', 'retest');
    if (/current|now|response|status|result/iu.test(question) && state) {
      const patch = read(state,'patch',['none','hidden','owner']); const scope = flag(state,'scope');
      if (patch && scope !== undefined) return response('Current virtual scope acknowledgement: ' + (scope ? 'confirmed' : 'not yet confirmed') + '. Patch choice: ' + (patch === 'owner' ? 'server-side ownership check' : patch === 'hidden' ? 'hide the record link' : 'no patch') + '. Test both supplied records and observe the response codes; a hidden link is not authorization.', 'current-state');
    }
    if (/owner|patch|hidden|server|authoriz|check|access/iu.test(question)) return fact(scenario,'patch');
    if (/record|session|user|101|102|who/iu.test(question)) return fact(scenario,'identity');
    if (/test|real|school|scope|scan|permission|allow/iu.test(question)) return fact(scenario,'scope');
  }
  return null;
}

export function answerQuestion(scenario, question, state = {}) {
  if (!validQuestion(question)) return response('Write one short question about the fictional case, up to 240 characters. Leave out private information.', 'question-format', 'clarify', false);
  const text = compact(question);
  if (containsPrivateDetails(text)) return response('Please leave out personal details, identifiers, passwords, and private records. Rephrase your question using fictional equipment or the case labels. This question was not added to the interview log.', 'privacy', 'privacy', false);
  if (outOfScopeInstructions(text)) return response('This practice interview answers only the visible fictional case. It cannot provide teacher rubrics, hidden instructions, grading criteria, or an answer key. Ask about an observation or the requester’s needs.', 'case-boundary', 'clarify', false);
  if (!scenario || !CASE_IDS.has(scenario.id)) return response('Choose one of the supplied lab cases before starting the interview.', 'case-boundary', 'clarify', false);
  if (/\b(?:may|can|should|allowed|permission|authorized)\b.{0,70}\b(?:real|school portal|school network|other websites|actual accounts)\b|\b(?:scan|attack|hack|exploit)\b.{0,50}\b(?:real|school|public|internet)\b/iu.test(text)) return response('Only the built-in fictional case is authorized. Do not test a real school website, account, device, or network. Ask your teacher about any activity beyond the simulation.', 'scope');
  if (/\b(?:goal|requested result|need to (?:do|finish)|trying to|want to|what.*(?:need|want)|success look|complete the task)\b/iu.test(text)) return response(typeof scenario.goal === 'string' ? scenario.goal : 'Read the request card for the result this fictional requester needs.', 'request');
  if (/\b(?:last (?:work|worked|working)|ever work|when.*(?:work|working)|last known good)\b/iu.test(text) && scenario.id !== 'NET-203') {
    const known = scenario.questions?.find(item => /last work/iu.test(item.label));
    return response(known?.answer ?? 'The case does not record the last successful use. Ask about a specific symptom or recent change, and distinguish recorded facts from assumptions.', 'history');
  }
  if (/\b(?:what(?: has| have| had)? changed|anything changed|changes? (?:before|since)|recent(?:ly)?|before the problem|before this|moved|happened before)\b/iu.test(text)) {
    const known = scenario.questions?.find(item => /changed|before the problem|happened to the original/iu.test(item.label));
    if (known) return response(known.answer,'history');
    return response('The case records: ' + scenario.brief + ' No other recent changes are documented.', 'history');
  }
  if (/\b(?:already(?: been)? tried|what.*tried|tried so far|attempted|already checked)\b/iu.test(text)) {
    const known = scenario.questions?.find(item => /try|tried/iu.test(item.label));
    return response(known?.answer ?? 'No earlier troubleshooting attempts are recorded in this case. Use your workbench log to describe the tests you perform and what each test shows.', 'history');
  }
  const words = value => compact(value).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,'');
  const prerecorded = Array.isArray(scenario.questions) ? scenario.questions.find(item => typeof item?.label === 'string' && typeof item.answer === 'string' && words(item.label) === words(text)) : undefined;
  // Initial ticket observations must not overwrite the current workbench state after a student's repair.
  if (prerecorded && !/lights on|operating system load/iu.test(prerecorded.label)) return response(prerecorded.answer,'requester');
  const specific = caseReply(scenario,text,state);
  if (specific) return specific;
  if (/\b(?:privacy|private|personal data|real information|internet|ai service|chatbot|live ai|send|stored)\b/iu.test(text)) return response('This interview uses built-in facts in your browser, without an AI service. Keep personal information out of questions and notes. Saving or submitting work uses the separate privacy controls shown in the lab.', 'privacy');
  if (/\b(?:symptom|problem|wrong|broken|issue|happening|not work|equipment|device|machine)\b/iu.test(text)) return response(scenario.brief,'symptom');
  if (/\b(?:how.*(?:start|use)|what.*(?:first|next)|help|confused|where.*(?:begin|start))\b/iu.test(text)) return response('Start with the request and one clue. Write what you think is happening, test one change in the workbench, then compare the result with the request. Ask about a specific part or symptom if you need another case fact.', 'how-to');
  return response('That detail is not recorded in this fictional case. Try a specific question about the symptom, a recent change, the equipment, or the requester’s goal. This interview uses scripted case facts and may not understand every wording.', 'clarification', 'clarify');
}

/** Encode only accepted questions as bounded, structured text; blocked questions are never recorded. */
export function questionEvent(question, reply) {
  if (!validQuestion(question) || containsPrivateDetails(question) || outOfScopeInstructions(question) || reply?.accepted !== true || !['answer','clarify'].includes(reply.kind) || typeof reply.answer !== 'string') return null;
  let q = compact(question); let a = bounded(compact(reply.answer));
  if (!a) return null;
  let message = EVENT_PREFIX + JSON.stringify({q,a});
  while (message.length > 600) {
    if (a.length > 80) a = a.slice(0,-1); else q = q.slice(0,-1);
    message = EVENT_PREFIX + JSON.stringify({q,a});
  }
  return {kind:'info',message};
}

/** Decode interview-only events; callers must display both strings as text, never HTML. */
export function readQuestionEvents(events) {
  if (!Array.isArray(events)) return [];
  const transcript = [];
  for (const event of events.slice(-100)) {
    if (!event || event.kind !== 'info' || typeof event.message !== 'string' || event.message.length > 600 || !event.message.startsWith(EVENT_PREFIX)) continue;
    try {
      const item = JSON.parse(event.message.slice(EVENT_PREFIX.length));
      if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).length !== 2 || !Object.hasOwn(item,'q') || !Object.hasOwn(item,'a') || !validQuestion(item.q) || containsPrivateDetails(item.q) || outOfScopeInstructions(item.q) || typeof item.a !== 'string' || !item.a.trim() || item.a.length > ANSWER_MAX) continue;
      transcript.push({question:item.q,answer:item.a});
    } catch { /* Damaged or unrelated saved events do not become interview text. */ }
  }
  return transcript;
}
