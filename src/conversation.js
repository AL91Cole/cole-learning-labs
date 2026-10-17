/** Small, on-device language resolver. It selects an authored case question; it never invents a fact. */
const IDS = new Set(['INC-101','INC-102','INC-103','INC-104','INC-105','INC-106','NET-201','NET-202','NET-203','NET-204','NET-205','NET-206','AI-301','AI-302','AI-303','AI-304','AI-305','AI-306','SEC-401','SEC-402','SEC-403','SEC-404','SEC-405','SEC-406','CODE-501','CODE-502','CODE-503']);
const compact = value => value.replace(/\s+/gu,' ').trim();
const valid = value => typeof value === 'string' && value.length <= 240 && compact(value).length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
// Correct only a few unambiguous classroom words, rather than guessing arbitrary names or text.
const SPELLING = Object.freeze({moniter:'monitor',monitering:'monitoring',scren:'screen',conection:'connection',connetion:'connection',conections:'connections',conected:'connected',conect:'connect',disconected:'disconnected',wirless:'wireless',pritner:'printer',priner:'printer',printng:'printing',memmory:'memory',temperture:'temperature',tempature:'temperature',boundry:'boundary',authentcation:'authentication',permision:'permission',previos:'previous',whem:'when'});
function normalize(question) {
  let text = compact(question).toLowerCase().replace(/[’‘]/gu,"'");
  text = text.replace(/\b(?:moniter|monitering|scren|conection|connetion|conections|conected|conect|disconected|wirless|pritner|priner|printng|memmory|temperture|tempature|boundry|authentcation|permision|previos|whem)\b/gu, word => SPELLING[word]);
  return text.replace(/\b(?:isn't|isnt)\b/gu,'is not').replace(/\b(?:doesn't|doesnt)\b/gu,'does not').replace(/\b(?:didn't|didnt)\b/gu,'did not').replace(/\b(?:can't|cant)\b/gu,'cannot').replace(/\b(?:won't|wont)\b/gu,'will not').replace(/\bwhat's\b/gu,'what is').replace(/\bthere's\b/gu,'there is').replace(/[^\p{L}\p{N}\s'.@=:-]/gu,' ').replace(/\s+/gu,' ').trim();
}
const rule = (intent, test, question) => ({intent,test,question});
const rules = {
  'INC-101':[
    rule('hardware.video',/\b(?:hdmi|video|graphics|socket|cable|port|connection|plugged|wire)\b/u,'Which display cable port is connected?'),
    rule('hardware.display',/\b(?:blank|black|dark|no picture|no signal|nothing (?:on|show)|see anything|what (?:do|can) you see|what (?:is|are) (?:it|you) showing|walk me through what you see|monitor|screen|display|picture)\b/u,'What does the monitor display?'),
    rule('hardware.power',/\b(?:light|lights|fan|fans|noise|humming|running|power|turn on|switch on)\b/u,'Are the tower power light and fans running?')
  ],
  'INC-102':[
    rule('hardware.power',/\b(?:light|lights|fan|fans|noise|humming|button|outlet|socket|wall|cord|cable|power|turn on|switch on|dead|nothing happens|start up)\b/u,'What happens to the power light and fans?'),
    rule('hardware.parts',/\b(?:inside|pieces|parts|components|missing|installed)\b/u,'Which components are installed?')
  ],
  'INC-103':[
    rule('hardware.memory-spec',/\b(?:fit|compatible|compatibility|right type|wrong type|ddr|specification)\b/u,'Which memory type is compatible?'),
    rule('hardware.memory',/\b(?:memory|ram|clip|clips|beep|beeping|start|startup|stuck|stop|stops|desktop|load|loading|boot)\b/u,'What does the startup memory check show?')
  ],
  'INC-104':[
    rule('hardware.files',/\b(?:keep|lose|lost|save|safe|files|documents|work|replace|replacement|recover)\b/u,'Which files are on the original drive?'),
    rule('hardware.storage',/\b(?:drive|disk|storage|cable|wire|connection|sata|boot|start|desktop|load)\b/u,'Are the SATA data connections in place?')
  ],
  'INC-105':[
    rule('hardware.storage-spec',/\b(?:fit|spare|new one|different one|replacement|compatible|nvme|connector)\b/u,'Is the NVMe spare compatible with this board?'),
    rule('hardware.original-drive',/\b(?:old one|original|drive|disk|files|storage|tray|put back)\b/u,'Where is the original classroom drive?')
  ],
  'INC-106':[
    rule('hardware.acceptance',/\b(?:finished|done|ready|deliver|prove|pass|working|result|open|document)\b/u,'What is the acceptance task?'),
    rule('hardware.build',/\b(?:fit|compatible|right|wrong|choose|pick|piece|pieces|parts|specification|assemble|build)\b/u,'Which component types does the build specification require?')
  ],
  'NET-201':[
    rule('network.affected',/\b(?:whole room|whole class|just (?:me|mine|you|yours|this one)|other ones|anyone else|everybody|everyone|all of them|only one|other (?:people|computers|devices|machines|laptops))\b/u,'Which other devices have the issue?'),
    rule('network.link',/\b(?:wire|plug|cable|light|lights|physical|switch|link)\b/u,'Is the workstation switch link up?'),
    rule('network.settings',/\b(?:numbers|settings|address|dns|gateway|mask|subnet|ip|configuration|configured|set up)\b/u,'What network settings are on the configuration sheet?'),
    rule('network.services',/\b(?:website|page|portal|printing|printer|online|internet|reach|open)\b/u,'Which portal and printer services are affected?')
  ],
  'NET-202':[
    rule('network.permission',/\b(?:edit|change|read|handout|folder|document|full control|all folders|rights|permission)\b/u,'Which folder access does the teacher need?'),
    rule('network.wifi',/\b(?:wireless|wi-fi|wifi|guest|staff|network|internet|connect|connection|join)\b/u,'Which Wi-Fi network is approved for the teacher?'),
    rule('network.identity',/\b(?:account|sign in|login|log in|identity|verified)\b/u,'Is the fictional teacher account verified?')
  ],
  'NET-203':[
    rule('network.recovery',/\b(?:lose|keep|save|erase|wipe|delete|undo|go back|previous|restore|recover|rollback|roll back|snapshot)\b/u,'Can recovery keep the classroom files?'),
    rule('network.update-service',/\b(?:future|updates|updating|service|disabled|stopped|running|automatic)\b/u,'What is the update service status?'),
    rule('network.boot-event',/\b(?:crash|startup|boot|recovery|start|update|kb-lab-17)\b/u,'Which update is in the boot event?')
  ],
  'NET-204':[
    rule('wireless.channel',/\b(?:crowded|busy|interference|overlap|neighbor|neighbour|channel|width|mhz|survey)\b/u,'What does the channel survey show?'),
    rule('wireless.coverage',/\b(?:where|location|put|place|placement|drop|drops|weak|signal|coverage|cupboard|desk|metal|hallway|reach)\b/u,'Where is the signal coverage weak?'),
    rule('wireless.clients',/\b(?:tablets|devices|band|5 ghz|support)\b/u,'Which devices need coverage?')
  ],
  'NET-205':[
    rule('print.history',/\b(?:ever come out|come out (?:before|earlier)|last (?:printed|printing)|worked before|after maintenance|what happened|maintenance)\b/u,'When did it last print?'),
    rule('print.service',/\b(?:spooler|service|stopped|running)\b/u,'What is the print spooler service status?'),
    rule('print.job',/\b(?:print|paper|queue|job|handout|delete|cancel|clear|destination|port|offline|online|stuck|nothing comes out)\b/u,'What happened to the print job in the queue?')
  ],
  'NET-206':[
    rule('backup.destination',/\b(?:overwrite|replace|damaged|where|folder|keep|evidence)\b/u,'Can I overwrite the damaged file?'),
    rule('backup.catalog',/\b(?:newest|latest|version|copy|copies|backup|snapshot|catalog|which one|empty)\b/u,'Which backup snapshot contains the original?'),
    rule('backup.integrity',/\b(?:check|prove|verify|right|correct|complete|integrity|manifest|compare|contents)\b/u,'How do I verify the restored file with the manifest?')
  ],
  'AI-301':[
    rule('ai.privacy',/\b(?:real|personal|identify|identifiers|private|details|account|send|sent|sending|leave (?:the|my) (?:device|computer|browser)|online|upload)\b/u,'Will this send my prompt to AI?'),
    rule('ai.limits',/\b(?:trust|believe|guarantee|always right|accurate|accuracy|correct|check|verify|certain)\b/u,'How do I check whether the prompt explanation is correct?'),
    rule('ai.learning-task',/\b(?:write|include|ask|learn|learning|explanation|practice|prompt|task|question)\b/u,'What learning task should the prompt describe?')
  ],
  'AI-302':[
    rule('ai.source',/\b(?:backed up|back it up|made up|making it up|believe|trust|prove|evidence|everything|supported|support|true|truth|draft|source|claim|confident|guide|policy)\b/u,'Which claims are supported by the source card?'),
    rule('ai.equal-treatment',/\b(?:same|different|name|names|equal|fair|fairly|category|categorize|classify|ticket|bias|treat)\b/u,'Should matching tickets receive the same category?')
  ],
  'AI-303':[
    rule('ai.secret-pattern',/\b(?:key|keys|secret|environment|hardcoded|hard coded|credential)\b/u,'Where should the example secret be stored?'),
    rule('ai.query-pattern',/\b(?:sql|database|query|queries|input|concatenate|concatenation|parameter|injection)\b/u,'How should the SQL query use parameters?'),
    rule('ai.authorization',/\b(?:hide|hiding|link|owner|ownership|record|records|signed in|logged in|anyone|anybody|allowed|access)\b/u,'Does hiding a record replace checking ownership?'),
    rule('ai.execution',/\b(?:run|execute|execution|python|program|code)\b/u,'Can I run arbitrary Python here?')
  ],
  'AI-304':[
    rule('ai.participation',/\b(?:say no|says no|does not want|do not want|refuse|decline|choice|optional|opt out|permission|consent|agree|alternative)\b/u,'What if a learner declines?'),
    rule('ai.minimum-data',/\b(?:need|collect|ask for|identifier|details|data|information|real|invented|fictional|paragraph|reading)\b/u,'Does the helper need learner identifiers?')
  ],
  'AI-305':[
    rule('ai.source-boundary',/\b(?:follow|obey|listen|instruction|override|ignore|injection|roster|source|boss|tells me to)\b/u,'Does text in the source become a new instruction?'),
    rule('ai.summary',/\b(?:write|summary|summarize|summarise|cite|citation|fact|switch|include|leave out|omit)\b/u,'Which fact belongs in the summary and citation?')
  ],
  'AI-306':[
    rule('ai.threshold',/\b(?:score|cutoff|cut off|threshold|urgent|miss|missed|escalate|route|routing|point five|point eight)\b/u,'How does the threshold affect urgent cases?'),
    rule('ai.group-audit',/\b(?:fair|bias|groups|group|overall|accuracy|right|wrong|human|reviewer|automatic|itself|close)\b/u,'How should a human review accuracy and groups?')
  ],
  'SEC-401':[
    rule('security.sender',/\b(?:who|from|sender|email|message|suspicious|fake|legit|legitimate|genuine|trust|believe|urgent)\b/u,'What does the message sender show?'),
    rule('security.link',/\b(?:click|button|link|url|destination|website|goes|take me|takes me)\b/u,'Where does the link destination point?'),
    rule('security.minimum-access',/\b(?:permission|access|rights|administrator|admin|helper|read|edit|checklist)\b/u,'Which access rights does the helper need?')
  ],
  'SEC-402':[
    rule('security.ports',/\b(?:telnet|port|ports|23|443|https|legacy|shut|close|keep open|all access)\b/u,'Which ports should be closed or kept available?'),
    rule('security.log-evidence',/\b(?:happen|happened|order|sequence|failure|failed|success|successful|logged in|log|events|suspicious)\b/u,'What is the log event sequence?'),
    rule('security.identity-limit',/\b(?:who|identify|identity|prove|proof|person|attacker|certain)\b/u,'Do the logs prove the attacker identity?')
  ],
  'SEC-403':[
    rule('security.retest',/\b(?:after|retest|expected|expect|200|403|prove|working|fixed|both)\b/u,'What should the retest show?'),
    rule('security.ownership',/\b(?:hide|hidden|link|owner|ownership|patch|access|allowed|authorize|authorization|server)\b/u,'Which server ownership check is required?'),
    rule('security.session',/\b(?:who|signed in|logged in|session|record|101|102|user)\b/u,'Which record belongs to the active user?')
  ],
  'SEC-404':[
    rule('security.identity-check',/\b(?:trust|believe|urgent|rush|rushing|says|claims|person|identity|verify|really them|really who|check who|prove who|requester)\b/u,'How should I verify the requester identity?'),
    rule('security.mfa-recovery',/\b(?:lost|phone|device|factor|mfa|reset|recover|recovery|turn off|disable|code|password)\b/u,'How does approved MFA recovery keep factors protected?')
  ],
  'SEC-405':[
    rule('security.recovery',/\b(?:backup|restore|recovery|wipe|erase|delete|media|clean|evidence)\b/u,'How do recovery and evidence preservation work?'),
    rule('security.containment',/\b(?:disconnect|isolate|contain|network|affected|spread|spreading|everyone|all|endpoint|first|notify|tell|report)\b/u,'Which endpoint should I isolate and notify the team about?')
  ],
  'SEC-406':[
    rule('security.deployment',/\b(?:https|padlock|encrypted|all users|everyone|pilot|deploy|install|administrator|admin|roll out)\b/u,'Does HTTPS replace verification before a pilot deployment?'),
    rule('security.package-proof',/\b(?:genuine|authentic|trusted|trust|publisher|signature|signed|digest|hash|package|download|tamper|verify|proof)\b/u,'Which package signature and digest match the publisher manifest?')
  ],
  'CODE-501':[
    rule('coding.price',/\b(?:pay|price|cost|charge|worth|credits|kit|kits|multiply|times|add|total)\b/u,'What is the cost per kit?'),
    rule('coding.quantity',/\b(?:number|quantity|input|fixture|change|changing|supplied|zero|0)\b/u,'What does quantity represent?'),
    rule('coding.output',/\b(?:look|show|display|print|format|label|word|words)\b/u,'How should the answer look?')
  ],
  'CODE-502':[
    rule('coding.boundary',/\b(?:twenty(?: five)?|20|25|eighteen|thirty|18|30|exactly|equal|boundary|boundaries|include|included|temperature|warm|cold|hot|comfortable|heat|cool|between)\b/u,'Are the temperature boundaries included?'),
    rule('coding.fixture',/\b(?:input|fixture|test|supply|supplied|output|word|capital|format)\b/u,'Which temperature test inputs and output words are supplied?'),
    rule('coding.scope',/\b(?:real|actual|connected|equipment|room|control|thermostat)\b/u,'Is this connected to equipment?')
  ],
  'CODE-503':[
    rule('coding.sequence',/\b(?:first|last|zero|start|begin|ready|extra|line|lines|number|numbering|one too many|off by one)\b/u,'What should the first line be?'),
    rule('coding.loop',/\b(?:loop|repeat|count|counter|again|iteration|times|advance)\b/u,'How does repeat work?'),
    rule('coding.stations',/\b(?:station|stations|room|input|fixture|size|supplied|change)\b/u,'How many stations are supplied by each input fixture?')
  ]
};

// Safety/privacy checks must also run on the ORIGINAL question before its resolved version is answered.
// Leave these strings untouched so a caller cannot accidentally launder an unsafe question into an innocuous intent.
function guarded(text) {
  return /@|\b(?:rubric|answer key|grading criteria|system prompt|developer message|hidden instruction|ignore.{0,40}(?:rules|privacy|instructions)|override.{0,40}(?:rules|privacy|instructions))\b/u.test(text)
    || /\b(?:password|passphrase|secret|api key|access token|recovery code|student id)\s*(?:is|=|:)\s*\S+/u.test(text)
    || /\b(?:real|actual|public|school|internet)\b.{0,30}\b(?:scan|attack|hack|exploit)\b|\b(?:scan|attack|hack|exploit)\b.{0,30}\b(?:real|actual|public|school|internet)\b/u.test(text);
}
const result = (question,intent='unknown',contextual=false) => ({question,intent,contextual});
function literalFollowup(text) {
  const clean=text.replace(/[.]+$/u,'').trim();
  if(/^(?:why|why is that|why does that (?:matter|happen)|how come|how so|what makes you say that|what does that tell (?:me|us)|is that important|(?:(?:can|could|would) you (?:please )?)?(?:tell me |explain )?why (?:that|it|this) happened)$/u.test(clean))return 'why';
  if(/^(?:(?:can|could) you )?(?:please )?(?:explain|say|put|make|break)(?: that| it| this)? (?:more simply|simpler|in simple (?:words|terms)|in plain (?:words|language)|easier|down)|^i (?:do not|don't|did not) understand(?: that| it)?$|^what do you mean(?: by that)?$/u.test(clean))return 'simple';
  if(/^(?:(?:can|could|would) you )?(?:please )?(?:(?:explain|describe) (?:that|it|this)(?: in (?:a )?different way| in more detail)?|be more specific)$/u.test(clean))return 'simple';
  if(/^(?:(?:so|okay|ok) )?(?:what (?:should|could|can) i (?:check|inspect|test|look at|try) next|what next|where (?:should|do) i (?:look|check) next|what (?:should|do) i do (?:with that|next))$/u.test(clean))return 'next';
  if(/^(?:(?:can|could) you )?(?:repeat (?:that|it)|say that again|remind me|tell me again)$/u.test(clean))return 'repeat';
  if(/^(?:(?:and|so|then) )?what happened (?:next|after that|afterward|afterwards)$/u.test(clean))return 'timeline';
  return null;
}
function generic(scenario,text) {
  if (/\b(?:what (?:have|has|had|did) (?:you|anyone|someone|they|we) (?:already )?(?:try|tried|attempt|attempted)|what.{0,20}(?:done|did).{0,20}(?:so far|to fix|to repair|already)|anything (?:been )?tried|tried (?:anything|so far|already)|already (?:try|tried|check|checked)|steps (?:have|did).{0,20}(?:take|taken)|attempts so far)\b/u.test(text)) return result('What have you already tried?','history.tried');
  if (/\b(?:has (?:it|this|that) always|always been like|ever (?:work|worked|working)|used to work|work (?:before|earlier|yesterday)|working (?:before|earlier|yesterday)|last (?:work|worked|working)|last (?:time|occasion).{0,20}(?:work|worked)|when.{0,30}(?:last|still) working|how long.{0,25}(?:doing|happening|broken))\b/u.test(text)) return result(scenario.id==='NET-205'?'When did it last print?':'When did it last work?','history.last-good');
  if (/\b(?:when did (?:it|this|that|the problem|the issue) (?:start|begin)|when did you (?:first )?notice|what (?:were|was).{0,22}doing (?:before|when)|before (?:that|this|it) happened|what.{0,35}(?:happened|changed).{0,20}(?:before|recently)|anything.{0,20}(?:change|changed)|did.{0,15}anything.{0,15}happen|anything.{0,15}happen(?:ed)?.{0,20}(?:before|recently)|recent (?:work|changes|maintenance)|what changed|what led up to|how did (?:it|this|that) start)\b/u.test(text)) return result('What happened before the problem?','history.change');
  if (scenario.id==='INC-101' && /\b(?:moving|moved|move).{0,25}(?:difference|change|problem|work|working)|\b(?:after|before).{0,20}(?:moving|move)\b/u.test(text)) return result('What changed before the problem?','history.change');
  if (/\b(?:what (?:do|would|will) you (?:need|want)|what (?:are|were) you (?:trying|hoping)|what should.{0,22}(?:able|working)|what (?:is|would be) (?:the )?(?:goal|result|success)|what needs to (?:work|happen)|what are we trying to|what (?:do|should) (?:i|we) (?:achieve|accomplish))\b/u.test(text)) return result('What result do you need?','request.goal');
  if (/\b(?:walk me through what you see|what (?:do|can) you see|what symptom are you observing|what is (?:the problem|your issue)|what (?:is|seems to be) (?:wrong|happening)|what is (?:it|this|that) doing|what does (?:it|this|that) (?:do|show|say|look like)|describe (?:it|the problem|what happened)|tell me (?:what happened|the problem|what is happening)|what happens when you (?:use|try) it)\b/u.test(text)) return result('What symptom are you observing?','request.symptom');
  return null;
}
const shortFollowup = text => /^(?:(?:and|so|okay|ok|then|but)\s+)*(?:what about (?:it|that|this|those|them|that one|this one)|how about (?:it|that|this|those|them)|where (?:exactly )?(?:is|are) (?:it|that|this|those|they)|which (?:one|ones)|is (?:it|that) (?:okay|ok|important|right)|does (?:it|that) (?:matter|help)|will (?:it|that) help|how (?:can|do) i tell|how would i know|what should i check instead|has (?:it|that|this) changed now|what about now|and now|before that|and before that)(?:\s+exactly)?[.?!]*$/u.test(text);
function base(scenario,question) {
  if (!scenario || !IDS.has(scenario.id) || !valid(question)) return result(typeof question==='string'?question:'');
  const text=normalize(question);
  if (guarded(text)) return result(question);
  const followup=literalFollowup(text);
  if(followup)return result(question,followup);
  // Equipment keywords cannot turn an unrecorded attribute into a supported answer.
  // "Model" alone remains available for AI, and compatibility/type questions still reach the case catalog.
  if(/\b(?:brand|manufacturer|serial (?:number|no)|model number|colou?r)\b|\bwho (?:last )?(?:repaired|installed|built|bought|purchased|moved|unplugged|owned)\b|\b(?:real|full) name\b|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(?:what|which) (?:is |was )?(?:the )?(?:exact )?(?:date|day|time)\b/u.test(text)) {
    const response=clarification(scenario,question);
    return {...response,intent:'case.unknown-detail',clarification:{...response.clarification,message:'That detail is not recorded in this fictional case. I can describe the recorded observations, recent changes, or the result needed.'}};
  }
  const common=generic(scenario,text);
  if(common)return common;
  const match=(rules[scenario.id]??[]).find(entry=>entry.test.test(text));
  return match ? result(match.question,match.intent) : result(question);
}
function previousContext(scenario,history) {
  if(!Array.isArray(history))return null;
  for(let index=history.length-1;index>=Math.max(0,history.length-8);index--) {
    const question=history[index]?.question;
    if(!valid(question) || guarded(normalize(question)) || shortFollowup(normalize(question)) || literalFollowup(normalize(question)))continue;
    const candidate=base(scenario,question);
    if(candidate.intent!=='unknown')return {...candidate,contextQuestion:question};
  }
  return null;
}
function clarification(scenario,question) {
  const suggestions=(Array.isArray(scenario?.questions)?scenario.questions:[]).filter(item=>valid(item?.label)).slice(0,2).map(item=>item.label);
  return {...result(question,'conversation.clarification'),clarification:{message:'Which part do you mean? You can describe what you noticed or choose a question below.',suggestions}};
}

/** Resolve only supplied, supported intents. History contributes student questions, never stored answer text. */
export function resolveQuestion(scenario,question,history=[]) {
  const resolved=base(scenario,question);
  if(!valid(question) || !scenario || !IDS.has(scenario.id) || guarded(normalize(question)))return resolved;
  const text=normalize(question);
  if(!shortFollowup(text))return resolved;
  const context=previousContext(scenario,history);
  if(!context)return clarification(scenario,question);
  // "Before that?" asks about recorded history, not an invented event earlier than the case.
  if(/\bbefore that\b/u.test(text))return {...result(scenario.id==='NET-205'?'When did it last print?':'What happened before the problem?','history.change',true),contextQuestion:context.contextQuestion};
  if(/\b(?:has (?:it|that|this) changed now|what about now|and now)\b/u.test(text))return {...context,question:context.question.replace(/[?!.]+$/u,'')+' now?',contextual:true};
  if(/\b(?:how (?:can|do) i tell|how would i know|what should i check instead)\b/u.test(text))return {...result('What should I check next?','next',true),contextQuestion:context.contextQuestion};
  if(/\b(?:is (?:it|that) important|does (?:it|that) (?:matter|help)|will (?:it|that) help)\b/u.test(text))return {...result('Why is that?','why',true),contextQuestion:context.contextQuestion};
  return {...context,contextual:true};
}
