import { resolveQuestion } from './conversation.js?release=20261025-learning-plans';
import { pcActivity } from './pc-activity.js?release=20261025-learning-plans';
import { requesterPersonaReply, requesterUnknownReply, requesterCasualFollowUp } from './requester-persona.js?release=20261025-learning-plans';
import { requesterGeneralReply, requesterGeneralBoundary, withRequesterTaskNudge } from './requester-general.js?release=20261025-learning-plans';
/** Offline practice interview. Replies describe supplied fictional case facts, never a live person or AI service. */
const EVENT_PREFIX = 'Interview v1: ';
const QUESTION_MAX = 240;
const ANSWER_MAX = 300;
const PRIVACY_NOTICE = 'Case replies use local facts. When available, extra cloud replies use a fixed topic code and lab ID. Cloudflare does not receive your typed words or work in that request. Extra chat stays out of saved reports. Built-in replies stay available if the service cannot reply.';
const CASE_IDS = new Set(['INC-101','INC-102','INC-103','INC-104','INC-105','INC-106','INC-107','INC-108','NET-201','NET-202','NET-203','NET-204','NET-205','NET-206','NET-207','NET-208','NET-209','NET-210','NET-211','NET-212','NET-213','NET-214','NET-215','NET-216','AI-301','AI-302','AI-303','AI-304','AI-305','AI-306','SEC-401','SEC-402','SEC-403','SEC-404','SEC-405','SEC-406','CODE-501','CODE-502','CODE-503','CODE-504','CODE-505','CODE-506']);
const EXPANDED_CASE_IDS = new Set(['NET-204','NET-205','NET-206','NET-207','NET-208','NET-209','NET-210','NET-211','NET-212','NET-213','NET-214','NET-215','NET-216','AI-304','AI-305','AI-306','SEC-404','SEC-405','SEC-406','CODE-501','CODE-502','CODE-503','CODE-504','CODE-505','CODE-506']);
const compact = text => text.replace(/\s+/gu, ' ').trim();
const bounded = text => text.length <= ANSWER_MAX ? text : text.slice(0, ANSWER_MAX - 1).trimEnd() + '…';
const response = (answer, topic, kind = 'answer', accepted = true) => ({ accepted, answer:bounded(answer), kind, topic });
const requesterStatement = text => typeof text === 'string' ? text.match(/^[“"]([^”"]+)[”"]/u)?.[1] || text : 'The request card has the available observations.';
const validQuestion = value => typeof value === 'string' && compact(value).length > 0 && value.length <= QUESTION_MAX && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);

// A small precaution, not automatic de-identification. Free text can identify someone in ways these patterns cannot detect.
function containsPrivateDetails(text) {
  return /[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/iu.test(text)
    || /(?:^|[^\w.])(?:\+?\d[\d ()-]{6,}\d)(?=$|[^\w.])/u.test(text)
    || /\b(?:student|school|social security|ssn)\s*(?:id|identifier|number)\s*(?:is|:|=|#)?\s*[a-z0-9-]{3,}/iu.test(text)
    || /\b(?:my|his|her|their|the student'?s?|a student'?s?)\s+(?:full |real )?(?:name|email|address|diagnosis|medical condition|phone number|date of birth)\b/iu.test(text)
    || /\b(?:show|give|reveal|find|tell me|what is|what's)\b.{0,55}\bstudent'?s? (?:name|email|id|diagnosis)\b/iu.test(text)
    // Asking about a password policy is different from requesting a password value.
    // Check each requested secret term so a policy question cannot mask a second request for an actual secret.
    || /\b(?:show|give|reveal|find|tell me|what is|what's)\b.{0,55}\b(?:password|passphrase|private key|access token|session token|recovery code|backup code|mfa code|verification code|one[ -]time (?:password|code))\b(?![\s-]+(?:polic(?:y|ies)|expir(?:ation|y)|handling|requirements?|security|safety|rules?|strength|hygiene|resets?|storage|management|protection|rotation|hashing|encryption|reuse|recovery|complexity|length|best practices?|advice|guidance)\b)/iu.test(text)
    || /\b(?:password|passphrase|secret|api[- ]?key|access[- ]?token|session token|recovery code|backup code|mfa code|verification code|one[ -]time (?:password|code))\s*(?:is|:|=)\s*\S+/iu.test(text)
    || /\b(?:sk-(?:proj-)?[a-z0-9_-]{8,}|gh[pousr]_[a-z0-9]{12,})\b/iu.test(text);
}

/** Shared conservative text check for optional on-device helpers. Invalid,
 * oversized, or private text is blocked rather than sent to another responder. */
export function requesterTextIsPrivate(value) {
  return typeof value!=='string' || value.length>2000 || !compact(value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) || containsPrivateDetails(compact(value));
}

const outOfScopeInstructions = text => /\b(?:rubric|answer[ -]?key|mark(?:ing)? scheme|grading criteria|system prompt|developer message|hidden instructions)\b|\b(?:show|reveal|dump|print|download)\b.{0,35}\bsource code\b|\b(?:ignore|override|forget)\b.{0,45}\b(?:instructions|rules|previous|privacy)\b/iu.test(text);
const read = (state, field, allowed) => state && typeof state === 'object' && Object.hasOwn(state, field) && allowed.includes(state[field]) ? state[field] : undefined;
const flag = (state, field) => read(state, field, [true, false]);
const externalDisplayQuestion = question => /monitor|display|hdmi|signal|video cable/iu.test(question) && !/internal|inside|mains|\bac\b|power cord/iu.test(question);
const unknownEquipmentHistory = question => /\bwho (?:last )?(?:unplugged|disconnected|repaired|installed|moved)\b/iu.test(question);
const clueText = (scenario, id) => {
  const found = Array.isArray(scenario.clues) ? scenario.clues.find(clue => clue && clue.id === id && typeof clue.text === 'string') : undefined;
  return found ? found.text : 'That detail is not recorded in this case. Inspect the supplied case cards and explain what you can observe.';
};
const fact = (scenario, id, topic = id) => response(clueText(scenario, id), topic);
const currentOr = (scenario, state, field, yes, no, fallback) => flag(state, field) === undefined ? response(clueText(scenario, fallback), fallback) : response(flag(state, field) ? yes : no, 'current-state');
const ipv4 = value => typeof value === 'string' && /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(value) && value.split('.').every(part => Number(part) <= 255) ? value : 'not set';
const words = value => compact(value).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,'');
const keywordWords = value => words(value).split(' ').map(word => word.length > 4 && word.endsWith('ies') ? word.slice(0,-3) + 'y' : word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0,-1) : word).join(' ');

function asksForInquiryFact(id, question) {
  const text = words(question);
  const earlierEvent = /\bwhat (?:happened|was done|were you doing|did you do|did someone do)\b.{0,55}\b(?:before|earlier|recently)\b|\b(?:did|has|have|was)\b.{0,25}\b(?:anything|anyone|someone|any work)\b.{0,35}\b(?:change|changed|happen|happened|done|moved|replaced|installed)\b|\b(?:recent|earlier|previous) (?:work|changes?|events?|maintenance)\b/u.test(text);
  const lastSuccess = /\bwhen\b.{0,45}\b(?:last |previously )?(?:work|worked|working|print|printed|printing)\b|\b(?:has|had|did)\b.{0,25}\b(?:ever|previously|earlier)\b.{0,25}\b(?:work|worked|print|printed)\b|\b(?:work|worked|print|printed)\b.{0,25}\b(?:before|earlier|last time)\b/u.test(text);
  if (id === 'last-change') return earlierEvent || lastSuccess;
  if (id === 'job-history') return earlierEvent || lastSuccess || /\b(?:already(?: been)? (?:tried|checked|attempted)|tried so far|previous attempts?|maintenance)\b/u.test(text);
  if (id === 'affected-devices') return /\b(?:other|nearby|all|every|multiple|several)\s+(?:\w+\s+){0,2}(?:devices?|computers?|laptops?|tablets?|workstations?|machines?|people|users?|classrooms?)\b|\b(?:anyone|someone|who|anybody|somebody) else\b|\b(?:only (?:one|device|computer|laptop|tablet|workstation)|else (?:affected|failing|broken))\b/u.test(text);
  return false;
}

function matchedCaseFact(scenario, question) {
  if (!scenario || !CASE_IDS.has(scenario.id)) return null;
  const normalized = ' ' + keywordWords(question) + ' ';
  const facts = Array.isArray(scenario.interviewFacts) ? scenario.interviewFacts.slice(0,12) : [];
  let best = null; let bestScore = 0;
  for (const entry of facts) {
    if (!entry || !Array.isArray(entry.keywords) || typeof entry.answer !== 'string' || !entry.answer.trim() || entry.answer.length > ANSWER_MAX) continue;
    const score = entry.keywords.slice(0,12).reduce((total,keyword) => {
      if (typeof keyword !== 'string' || !keyword.trim() || keyword.length > 45) return total;
      const phrase = keywordWords(keyword);
      return phrase && normalized.includes(' ' + phrase + ' ') ? total + phrase.length : total;
    },requiredInquiryFacts(scenario).includes(entry.id) && asksForInquiryFact(entry.id,question) ? 1000 : 0);
    if (score > bestScore) { best = entry; bestScore = score; }
  }
  return best;
}

function requiredInquiryFacts(scenario) {
  if (!scenario || !CASE_IDS.has(scenario.id) || scenario.intake?.kind !== 'follow-up' || !Array.isArray(scenario.intake.factIds)) return [];
  return [...new Set(scenario.intake.factIds.filter(id => typeof id === 'string' && /^[a-z][a-z0-9-]{0,44}$/u.test(id)))].slice(0,12);
}

// New scenarios supply visible case facts, not instructions or free-form generated text.
// Only the shipped case IDs can use them. A question never becomes executable code or a prompt.
function expandedCaseReply(scenario, question, state) {
  if (!EXPANDED_CASE_IDS.has(scenario.id)) return null;
  if (scenario.track === 'network' && /\b(?:wireshark|gns3)\b/iu.test(question)) {
    return response('This lab uses supplied fictional packet records and network diagrams. It does not launch Wireshark or GNS3, capture device traffic, or connect to a real network. Use the built-in tools to inspect the supplied evidence.', 'scope');
  }
  if (/\b(?:code|python|javascript|program|script)\b.*\b(?:run|execut)|\b(?:run|execut)\w*\b.*\b(?:code|python|javascript|program|script)\b/iu.test(question) && scenario.track === 'coding' && /\b(?:real|arbitrary|external|internet|shell|system)\b/iu.test(question)) {
    return response('Only the small, built-in teaching language is supported in this browser sandbox. It cannot run arbitrary Python, use your device, open files, or make network requests. Use the sample program and supplied test inputs.', 'scope');
  }
  if (/\b(?:current|now|already|last)\b.*\b(?:tests?|checks?)\b|\b(?:tests?|checks?)\b.*\b(?:pass|ran|run|result|status)\b/iu.test(question) && flag(state,'tested') !== undefined) {
    return response(flag(state,'tested') ? 'A test has been run for the current workbench state. Read the visible test results to see what passed and what still needs attention. I cannot grade your explanation or assume that a test proves every requirement.' : 'The current workbench state has no fresh test yet. Make one change, run the built-in test, and read the result before deciding whether your hypothesis is supported.', 'current-state');
  }
  const best = matchedCaseFact(scenario,question);
  return best ? response(best.answer,'case-fact') : null;
}

function caseReply(scenario, question, state) {
  const id = scenario.id;
  if (id.startsWith('INC-') && /safe|safety|disconnect|unplug|internal|touch|power off/iu.test(question) && !externalDisplayQuestion(question) && !unknownEquipmentHistory(question)) {
    const off = flag(state, 'pcOn') === false; const unplugged = flag(state, 'acConnected') === false;
    return response('For internal work, power off and unplug AC using the virtual bench controls first. ' + (off && unplugged ? 'The virtual bench currently shows both safety steps complete.' : 'Confirm both indicators before touching internal parts.') + ' All actions are on-screen; leave your real Chromebook or tablet closed.', 'safety');
  }
  if (id === 'INC-101') {
    if (/monitor|screen|display|picture|video|signal|hdmi|cable|port|socket/iu.test(question)) {
      const on = flag(state, 'pcOn'); const port = read(state, 'videoPort', ['board','gpu']); const boot = flag(state, 'booted');
      const source = read(state,'monitorInput',['hdmi','displayport']); const signal = flag(state,'signalConnected');
      const pcCable = flag(state,'pcVideoConnected') !== false;
      if (on !== undefined && port && boot !== undefined) return response('Current bench: PC ' + (on ? 'on' : 'off') + '; PC HDMI ' + (pcCable ? 'fitted at ' : 'disconnected from ') + (port === 'gpu' ? 'dedicated graphics-card output' : 'motherboard output') + '; monitor end ' + (signal === false ? 'disconnected' : 'fitted') + '; source ' + (source === 'displayport' ? 'DisplayPort' : 'HDMI') + '. ' + (on && boot && port === 'gpu' && source !== 'displayport' && signal !== false && pcCable && flag(state,'gpuInstalled') !== false && flag(state,'gpuPowerConnected') !== false ? 'The virtual display can show the desktop.' : 'The display is not ready to show the classroom desktop.'), 'current-state');
      return fact(scenario, /cable|port|socket|hdmi/iu.test(question) ? 'video' : 'screen');
    }
    if (/power|lights?|fans?|running|turn.*on/iu.test(question)) return currentOr(scenario, state, 'pcOn', 'The virtual tower is on. Its power light and fans are running.', 'The virtual tower is currently off. No running fans or power light are shown.', 'power');
  }
  if (id === 'INC-102') {
    if (/power|outlet|plug|cable|ac|lights?|fans?|button|start/iu.test(question)) {
      const on = flag(state, 'pcOn'); const ac = flag(state, 'acConnected');
      if (on !== undefined && ac !== undefined) {
        const powered=pcActivity(state).powered;
        return response('Current bench: AC power is ' + (ac ? 'connected' : 'disconnected') + ' and the desktop is ' + (powered ? 'on, with its power light and fans running.' : on ? 'not starting. Its power light and fans are off. Check the cable from the power supply to the motherboard.' : 'off. Check the virtual power path before trying the power button.'), 'current-state');
      }
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
  if (['INC-107','INC-108'].includes(id)) {
    if (/safe|safety|while.*(?:on|running)|power off/iu.test(question) && externalDisplayQuestion(question)) return response('The virtual monitor source and external HDMI connectors can be changed while the PC runs. Internal components still require PC off and AC disconnected. Use only the on-screen equipment; do not disconnect your real device.', 'safety');
    if (/monitor|screen|display|picture|video|signal|hdmi|displayport|cable|port|socket|input|source/iu.test(question)) {
      const on = flag(state,'pcOn'); const boot = flag(state,'booted'); const signal = flag(state,'signalConnected');
      const port = read(state,'videoPort',['board','gpu']); const source = read(state,'monitorInput',['hdmi','displayport']);
      const pcCable = flag(state,'pcVideoConnected') !== false;
      if (source && signal !== undefined && port && on !== undefined && boot !== undefined) {
        const ready = on && boot && signal && pcCable && source === 'hdmi' && port === 'gpu' && flag(state,'gpuInstalled') !== false && flag(state,'gpuPowerConnected') !== false;
        return response('Current bench: monitor source ' + (source === 'hdmi'?'HDMI':'DisplayPort') + '; HDMI at monitor ' + (signal?'fitted':'disconnected') + '; PC HDMI ' + (pcCable?'fitted at ':'disconnected from ') + (port==='gpu'?'graphics card':'inactive motherboard output') + '. ' + (ready?'The desktop is visible. Open the lesson file to check the original task.':!on?'The PC is off, so no picture is sent.':!boot?'Startup has not completed; inspect the POST result.':'The monitor has no usable signal on its selected source.'),'current-state');
      }
      return fact(scenario,/cable|port|socket|hdmi/iu.test(question)?'video':'screen');
    }
    if (/power|lights?|fans?|running|turn.*on|boot|startup|operating system/iu.test(question)) return currentOr(scenario,state,'pcOn','The virtual tower is on, with power light and fans running. Compare its startup readout with the monitor signal; a running PC does not prove a working picture.','The virtual tower is off. Start it before testing the picture.','power');
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
    if (/send|sent|service|account|live ai/iu.test(question)) return response(PRIVACY_NOTICE, 'privacy');
    if (/prompt|task|network|explain|practice|question|learn|write/iu.test(question)) return fact(scenario, /check|correct|accur|guarantee|verify/iu.test(question) ? 'limits' : 'task');
    if (/ai|send|model|service|account/iu.test(question)) return response(PRIVACY_NOTICE, 'privacy');
  }
  if (id === 'AI-302') {
    if (/password[\s-]*(?:polic|expir|handl|rotat)|90[\s-]*day/iu.test(question)) return response('The fictional AI draft’s 90-day password-expiration claim is unsupported: source card v4.2 contains no password-expiration policy. Compare the claim with the source instead of treating a confident draft as evidence.', 'source');
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
    if (/password[\s-]*(?:polic|expir|handl|rotat)/iu.test(question)) return response('This phishing case does not define a school password-expiration policy. Do not provide credentials in reply to an urgent message. Verify account requests through the school’s approved process.', 'message-safety');
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

function caseAnswer(scenario, question, state = {}, history = []) {
  if (!validQuestion(question)) return response('Write one short question about the fictional case, up to 240 characters. Leave out private information.', 'question-format', 'clarify', false);
  const text = compact(question);
  if (containsPrivateDetails(text)) return response('Please leave out personal details, identifiers, passwords, and private records. Rephrase your question using fictional equipment or the case labels. This question was not added to the interview log.', 'privacy', 'privacy', false);
  if (outOfScopeInstructions(text)) return response('This practice interview answers only the visible fictional case. It cannot provide teacher rubrics, hidden instructions, grading criteria, or an answer key. Ask about an observation or the requester’s needs.', 'case-boundary', 'clarify', false);
  if (!scenario || !CASE_IDS.has(scenario.id)) return response('Choose one of the supplied lab cases before starting the interview.', 'case-boundary', 'clarify', false);
  if (/\b(?:may|can|should|allowed|permission|authorized)\b.{0,70}\b(?:real|school portal|school network|other websites|actual accounts)\b|\b(?:scan|attack|hack|exploit)\b.{0,50}\b(?:real|school|public|internet)\b/iu.test(text)) return response('Only the built-in fictional case is authorized. Do not test a real school website, account, device, or network. Ask your teacher about any activity beyond the simulation.', 'scope');
  const boundary=requesterGeneralBoundary(text);
  if(boundary)return response(boundary.answer,boundary.topic,'clarify',false);
  // Asking for missing history reveals a requester fact; it never replaces a safety instruction or a live bench observation.
  if (scenario.id.startsWith('INC-') && /safe|safety|disconnect|unplug|internal|touch|power off/iu.test(text) && !externalDisplayQuestion(text) && !unknownEquipmentHistory(text)) return caseReply(scenario,text,state);
  const casual=unknownEquipmentHistory(text)?null:requesterGeneralReply(text)??requesterPersonaReply(scenario,text,history);
  if (casual) return {...response(casual.answer,casual.topic,'casual'),inquiryFactIds:[]};
  const inquiryFact = matchedCaseFact(scenario,text);
  if (inquiryFact && requiredInquiryFacts(scenario).includes(inquiryFact.id) && !followUpKind(text)) return response(inquiryFact.answer,'case-fact');
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
  const prerecorded = Array.isArray(scenario.questions) ? scenario.questions.find(item => typeof item?.label === 'string' && typeof item.answer === 'string' && words(item.label) === words(text)) : undefined;
  // Initial ticket observations must not overwrite the current workbench state after a student's repair.
  if (prerecorded && !/lights on|operating system load/iu.test(prerecorded.label)) return response(prerecorded.answer,'requester');
  const specific = caseReply(scenario,text,state) ?? expandedCaseReply(scenario,text,state);
  if (specific) {
    // A technical question can also uncover a contextual clue. Record the same requester fact rather than reveal it without discovery credit.
    const required = requiredInquiryFacts(scenario);
    const disclosed = Array.isArray(scenario.clues) ? scenario.clues.find(clue => required.includes(clue?.requiresFact) && typeof clue.text === 'string' && bounded(clue.text) === specific.answer) : undefined;
    const requesterFact = disclosed && Array.isArray(scenario.interviewFacts) ? scenario.interviewFacts.find(entry => entry?.id === disclosed.requiresFact && typeof entry.answer === 'string' && entry.answer.length <= ANSWER_MAX) : undefined;
    return requesterFact ? response(requesterFact.answer,'case-fact') : specific;
  }
  if (/\b(?:privacy|private|personal data|real information|internet|ai service|chatbot|live ai|send|stored)\b/iu.test(text)) return response(PRIVACY_NOTICE, 'privacy');
  if (/\b(?:symptom|problem|wrong|broken|issue|happening|not work|equipment|device|machine)\b/iu.test(text)) return response(requesterStatement(scenario.brief),'symptom');
  if (/\b(?:how.*(?:start|use)|what.*(?:first|next)|help|confused|where.*(?:begin|start))\b/iu.test(text)) return response('Let us take it one step at a time. Read the request and one clue, write your hypothesis, and test one change in the workbench. Then compare what happened with the request. Ask me about a specific part or symptom when you need another case fact.', 'how-to');
  return response('That detail is not recorded in this fictional case. Try a specific question about the symptom, a recent change, the equipment, or the requester’s goal. This interview uses scripted case facts and may not understand every wording.', 'clarification', 'clarify');
}

function cleanHistory(history,scenario) {
  return (Array.isArray(history) ? history.slice(-8) : []).filter(pair => pair && pair.kind!=='casual' && validQuestion(pair.question) && !containsPrivateDetails(pair.question) && !outOfScopeInstructions(pair.question) && caseAnswer(scenario,pair.question).kind!=='casual' && typeof pair.answer === 'string' && pair.answer.length <= ANSWER_MAX);
}

// Casual context lasts only in this chat. Validate questions again and ignore
// every saved/model answer and caller topic label when selecting an anchor.
function casualHistory(history) {
  const recent=Array.isArray(history)?history.slice(-8):[];
  return recent.every(pair=>pair && validQuestion(pair.question) && !containsPrivateDetails(pair.question) && !outOfScopeInstructions(pair.question))?recent:[];
}

function withSuggestions(reply, scenario, supplied) {
  const candidates = Array.isArray(supplied) ? supplied : Array.isArray(scenario?.questions) ? scenario.questions.slice(0,3).map(item => item.label) : [];
  return {...reply,suggestions:[...new Set(candidates.filter(item => validQuestion(item) && !containsPrivateDetails(item) && !outOfScopeInstructions(item)).map(compact))].slice(0,3)};
}

// Validate the original input before interpreting polite wording, typos, or references.
// The resolver selects an authored topic; it never provides a new case fact.
function directAnswer(scenario, question, state = {}, history = []) {
  const original = caseAnswer(scenario,question,state,casualHistory(history));
  if (!original.accepted || original.topic === 'scope' || original.topic === 'safety') return original;
  if (original.kind==='casual') return original;
  const resolved = resolveQuestion(scenario,question,cleanHistory(history,scenario));
  if (resolved.clarification) return withSuggestions(response(resolved.clarification.message,'clarification','clarify'),scenario,resolved.clarification.suggestions);
  const alreadySpecific = original.kind === 'answer' && !['history','symptom','how-to','conversation'].includes(original.topic) && !resolved.contextual && !followUpKind(question);
  const canonical = alreadySpecific ? question : typeof resolved.question === 'string' && validQuestion(resolved.question) ? resolved.question : question;
  const mapped = canonical === question ? original : caseAnswer(scenario,canonical,state);
  const result = mapped.kind === 'clarify' && original.kind === 'answer' && resolved.intent === 'unknown' ? original : mapped;
  const ids = requiredInquiryFacts(scenario);
  const match = result.topic === 'case-fact' ? matchedCaseFact(scenario,canonical) ?? scenario.interviewFacts?.find(entry => ids.includes(entry.id) && entry.answer === result.answer) : null;
  const reply = {...result,canonicalQuestion:canonical,contextQuestion:resolved.contextQuestion,inquiryFactIds:match && ids.includes(match.id) ? [match.id] : []};
  if (result.kind==='clarify' && resolved.intent==='unknown' && !followUpKind(question)) {
    const unknown=requesterUnknownReply(scenario,question);
    return {...response(unknown.answer,unknown.topic,'casual'),inquiryFactIds:[]};
  }
  return result.kind === 'clarify' ? withSuggestions(reply,scenario) : reply;
}

function followUpKind(question) {
  const text = compact(question).replace(/[?.!]+$/u,'');
  if (/^(?:(?:can|could|would) you )?(?:please )?(?:explain (?:that|it|this)(?: in (?:a )?different way)?|be more specific)$/iu.test(text)) return 'simple';
  if (/^(?:(?:can|could|would) you )?(?:please )?(?:tell me why (?:that|it|this)(?: happened| matters)?|how so)$/iu.test(text)) return 'why';
  if (/^(?:(?:and|so) )?what happened (?:next|after that)$/iu.test(text)) return 'timeline';
  if (/^(?:why|why is that|why does that (?:matter|happen)|how come|what makes you say that|what does that tell (?:me|us)|is that important)$/iu.test(text)) return 'why';
  if (/^(?:(?:can|could) you )?(?:please )?(?:explain|say|put|make|break)(?: that| it| this)? (?:more simply|simpler|in simple (?:words|terms)|in plain (?:words|language)|easier|down)|^(?:I do not|I don't|I didnt|I didn’t) understand(?: that| it)?$|^what do you mean(?: by that)?$/iu.test(text)) return 'simple';
  if (/^(?:(?:so|okay|ok)[, ]+)?(?:what (?:should|could|can) I (?:check|inspect|test|look at|try) next|what next|where (?:should|do) I (?:look|check) next|what (?:should|do) I do (?:with that|next))$/iu.test(text)) return 'next';
  if (/^(?:(?:can|could) you )?(?:repeat (?:that|it)|say that again|remind me|tell me again)$/iu.test(text)) return 'repeat';
  return null;
}

function recentCaseContext(scenario, state, history) {
  if (!Array.isArray(history)) return null;
  for (let index = history.length - 1; index >= Math.max(0,history.length - 8); index--) {
    const pair = history[index];
    if (!pair || !validQuestion(pair.question) || containsPrivateDetails(pair.question) || outOfScopeInstructions(pair.question) || typeof pair.answer !== 'string' || pair.answer.length > ANSWER_MAX || followUpKind(pair.question)) continue;
    const reply = directAnswer(scenario,pair.question,state);
    if (reply.accepted && reply.kind === 'answer' && !['conversation','how-to','privacy','scope'].includes(reply.topic)) return {question:pair.question,reply};
  }
  return null;
}

function nextClue(scenario, context) {
  const clues = Array.isArray(scenario.clues) ? scenario.clues.filter(clue => clue && typeof clue.id === 'string' && typeof clue.label === 'string' && clue.label.length <= 90 && (!clue.requiresFact || context.reply.inquiryFactIds?.includes(clue.requiresFact))) : [];
  const relevant = words(context.question + ' ' + context.reply.topic).split(' ').filter(word => word.length > 3);
  let next = clues[0]; let bestScore = 0;
  for (const clue of clues) {
    const content = words(clue.id + ' ' + clue.label + ' ' + (typeof clue.text === 'string' ? clue.text : '')).split(' ');
    const score = relevant.filter(word => content.includes(word)).length;
    if (score > bestScore) { next = clue; bestScore = score; }
  }
  return next;
}

/** Conversational case replies are computed locally from current case facts, never from a remote model.
 * History helps resolve short follow-ups; saved answer text is never treated as a source of facts. */
function answerOne(scenario, question, state, history) {
  const direct = directAnswer(scenario,question,state,history);
  if (!direct.accepted || direct.topic === 'scope' || direct.topic === 'safety') return direct;
  const casual=requesterCasualFollowUp(scenario,question,casualHistory(history));
  if (casual) return {...response(casual.answer,casual.topic,'casual'),inquiryFactIds:[]};
  const kind = followUpKind(direct.canonicalQuestion || question);
  if (!kind) return direct;
  const context = recentCaseContext(scenario,state,cleanHistory(history,scenario));
  if (!context) return withSuggestions(response('I need a little more context. Which part do you mean? Ask about a specific symptom, clue, or part first; I do not have a recorded fact to refer back to yet.','conversation-context','clarify'),scenario);
  if (kind === 'timeline') {
    const attempt = scenario.questions?.find(item => /try|tried/iu.test(item.label));
    return attempt ? response('After I noticed the issue, this is what I tried: ' + attempt.answer,'conversation-timeline') : withSuggestions(response('A later event is not recorded in this case. Do you mean what was tried, what changed earlier, or the current result? I can describe the recorded observations, but I cannot fill in an unknown timeline.','conversation-timeline','clarify'),scenario);
  }
  if (kind === 'next') {
    const clue = nextClue(scenario,context);
    return withSuggestions(response('I would check ' + (clue ? '“' + clue.label + '”' : 'the visible request and clues') + ' next. Compare this evidence with your hypothesis before one change in the workbench. ' + (clue?.text || ''),'conversation-next'),scenario,[context.question]);
  }
  if (kind === 'why') return response('Here is the evidence I can point to: ' + context.reply.answer + ' Use that observation to decide what to test; it does not prove a cause on its own.','conversation-evidence');
  if (kind === 'simple') {
    const sentence = context.reply.answer.match(/^.*?[.!?](?:\s|$)/u)?.[0].trim() ?? context.reply.answer;
    return response('In simpler terms: ' + sentence + ' Check that observation on the workbench before deciding whether your idea fits.','conversation-simple');
  }
  return response('Of course. The current case fact is: ' + context.reply.answer,'conversation-repeat');
}

/** Answers stay local. A two-part question receives both known answers; unknown details remain unknown. */
export function answerQuestion(scenario, question, state = {}, history = []) {
  const guard = caseAnswer(scenario,question,state);
  if (!guard.accepted || guard.topic === 'scope' || guard.topic === 'safety') return guard;
  const parts = compact(question).split(/\?\s+(?=(?:what|when|where|which|why|how|did|does|do|can|is|are|has|have)\b)|\s+and\s+(?=(?:what|when|where|which|why|how|did|does|do|can|is|are|has|have)\b)/iu);
  if (parts.length === 1) return finishCasualAnswer(answerOne(scenario,question,state,history));
  const replies = parts.slice(0,2).map(part => answerOne(scenario,part,state,history));
  if (replies.some(reply => !reply.accepted)) return replies.find(reply => !reply.accepted);
  const shorten = text => text.length <= 142 ? text : text.slice(0,139).trimEnd() + '…';
  const answer = replies.map(reply => shorten(reply.answer)).join(' ');
  const casual=replies.some(reply=>reply.kind==='casual');
  const combined = {...response(answer,casual?'casual-mixed':'conversation-parts',casual?'casual':replies.some(reply => reply.kind === 'answer') ? 'answer' : 'clarify'),inquiryFactIds:casual?[]:[...new Set(replies.flatMap(reply => reply.inquiryFactIds || []))],contextQuestion:replies.find(reply => reply.contextQuestion)?.contextQuestion};
  return finishCasualAnswer(withSuggestions(combined,scenario,replies.flatMap(reply => reply.suggestions || [])));
}

function finishCasualAnswer(reply){
  if(reply.kind!=='casual'||!reply.accepted)return reply;
  // Unsupported topics get a short honest answer instead of an invitation to
  // keep wandering. No question text, case state or model output is trusted.
  const answer=reply.topic==='casual-unknown'?
    (reply.answer.match(/^.*?[.!?](?:\s|$)/u)?.[0].trim()||'I’m not sure about that.')+' My little knowledge toolbox has limits.':reply.answer;
  return {...reply,answer:withRequesterTaskNudge(answer),inquiryFactIds:[]};
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

function earnedInquiryFacts(scenario, event, required, history) {
  const pair = readQuestionEvents([event])[0];
  if (!pair || followUpKind(pair.question)) return null;
  const reply = answerQuestion(scenario,pair.question,{},history);
  if (!reply.accepted || reply.kind !== 'answer') return null;
  const candidates = (reply.inquiryFactIds || []).filter(id => required.includes(id));
  if (!candidates.length) return null;
  const canonical = readQuestionEvents([questionEvent(pair.question,reply)])[0];
  let ids = canonical && canonical.question === pair.question && canonical.answer === pair.answer ? candidates : [];
  // For a two-part question, the unrelated current-state answer can change later.
  // The relevant part must still contain its exact authored (possibly shortened) fact.
  if (!ids.length && reply.topic === 'conversation-parts') {
    ids = candidates.filter(id => scenario.interviewFacts?.some(entry => entry.id === id && pair.answer.includes(entry.answer.length <= 142 ? entry.answer : entry.answer.slice(0,139).trimEnd() + '…')));
  }
  if (!ids.length) ids = candidates.filter(id => scenario.interviewFacts?.some(entry => entry.id === id && Array.isArray(entry.legacyAnswers) && entry.legacyAnswers.slice(0,4).some(answer => {
    if (typeof answer !== 'string' || !answer.trim() || answer.length > ANSWER_MAX) return false;
    const earlier = readQuestionEvents([questionEvent(pair.question,response(answer,'case-fact'))])[0];
    return earlier && earlier.question === pair.question && earlier.answer === pair.answer;
  })));
  // Earlier supported starter answers keep their learning credit after wording improvements.
  if (!ids.length) for (const starter of Array.isArray(scenario.questions) ? scenario.questions.slice(0,12) : []) {
    if (typeof starter?.label !== 'string' || typeof starter.answer !== 'string' || starter.answer.length > ANSWER_MAX) continue;
    const starterReply = directAnswer(scenario,starter.label);
    const legacy = readQuestionEvents([questionEvent(pair.question,response(starter.answer,'case-fact'))])[0];
    if (legacy && legacy.question === pair.question && legacy.answer === pair.answer) ids = candidates.filter(id => starterReply.inquiryFactIds?.includes(id));
    if (ids.length) break;
  }
  return ids.length ? {ids,contextQuestion:reply.contextQuestion} : null;
}

function inquiryRecords(scenario, events) {
  const required = requiredInquiryFacts(scenario);
  if (!required.length || !Array.isArray(events)) return [];
  const history = [], records = [];
  for (const [index,event] of events.entries()) {
    const pair = readQuestionEvents([event])[0];
    if (!pair) continue;
    const recent = history.slice(-8);
    const earned = earnedInquiryFacts(scenario,event,required,recent.map(item => item.pair));
    if (earned) {
      const anchor = earned.contextQuestion ? recent.toReversed().find(item => compact(item.pair.question) === compact(earned.contextQuestion)) : undefined;
      records.push({ids:earned.ids,indices:anchor ? [anchor.index,index] : [index]});
    }
    history.push({index,pair});
  }
  return records;
}

// Keep one answered case question even when the ticket needs no missing fact.
// Replay questions against authored facts: greetings and clarification prompts
// do not complete the conversation step, and saved reply text adds no authority.
function answeredCaseIndices(scenario, events) {
  if (!Array.isArray(events)) return [];
  const history=[], dependencies=new Map();let latest=[];
  for (const [index,event] of events.entries()) {
    const pair=readQuestionEvents([event])[0];if(!pair)continue;
    const recent=history.slice(-8),pairs=recent.map(item=>item.pair);
    const reply=answerQuestion(scenario,pair.question,{},pairs);
    if(reply.accepted&&reply.kind==='answer'&&!['conversation','how-to','privacy','scope','safety'].includes(reply.topic)) {
      const contextQuestion=reply.contextQuestion||(followUpKind(pair.question)?recentCaseContext(scenario,{},pairs)?.question:undefined);
      const anchor=contextQuestion?recent.toReversed().find(item=>compact(item.pair.question)===compact(contextQuestion)):undefined;
      latest=anchor?[...new Set([...(dependencies.get(anchor.index)||[anchor.index]),index])]:[index];
      dependencies.set(index,latest);
    }
    history.push({index,pair});
  }
  return latest;
}

/** Protect earned answers and the latest answered case question with their
 * conversational anchors, never saved answer text as authority. */
function inquiryProtectedIndices(scenario, events) {
  const earned = new Set(), indices = new Set(answeredCaseIndices(scenario,events));
  for (const record of inquiryRecords(scenario,events)) for (const id of record.ids) {
    if (earned.has(id)) continue;
    earned.add(id);record.indices.forEach(index => indices.add(index));
  }
  return [...indices].sort((a,b) => a-b);
}

export function inquiryProtectedEvents(scenario, events) {return inquiryProtectedIndices(scenario,events).map(index => events[index]);}

/** Inquiry is a learning step, not an authorization boundary. Only relevant, recorded case answers count. */
export function inquiryProgress(scenario, events) {
  const required = requiredInquiryFacts(scenario);
  const earned = new Set(inquiryRecords(scenario,Array.isArray(events) ? events.slice(-100) : []).flatMap(record => record.ids));
  const found = required.filter(id => earned.has(id));
  const complete = found.length === required.length;
  const missing = typeof scenario?.intake?.missing === 'string' ? compact(scenario.intake.missing).slice(0,240) : '';
  return {
    required:required.length > 0,complete,found,total:required.length,
    message:required.length === 0 ? 'The request includes enough detail to begin. You can still ask questions.' : complete ? 'You found the missing request detail. Use it with your observations to test a cause.' : missing || 'Ask the requester about the missing detail before finishing this case.'
  };
}

/** Keep earned facts and any direct context needed to replay them inside the existing 100-event record. */
export function retainInquiryEvents(scenario, events) {
  if (!Array.isArray(events)) return [];
  const kept = new Set(inquiryProtectedIndices(scenario,events));
  for (let index=events.length-1;index>=0 && kept.size<100;index--)kept.add(index);
  return [...kept].sort((a,b)=>a-b).map(index=>events[index]);
}
