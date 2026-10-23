/** Authored offline character lines. These are fictional personality details,
 * never evidence about a lab, a real person, or the learner's equipment. */
import {requesterLibraryReply,requesterLibraryFollowUp} from './requester-library.js?release=20261023-monitor';
const clean = value => typeof value==='string'?value.replace(/[’‘]/gu,"'").replace(/\s+/gu,' ').trim().toLowerCase().replace(/[?!.]+$/gu,''):'';
const hash = value => [...value].reduce((total,letter) => (total * 31 + letter.charCodeAt(0)) >>> 0,0);
const pick = (items,seed) => items[seed % items.length];
const result = (answer,topic='casual-persona') => ({answer,topic});
// Each lab gets its own authored character card. Preferences are story flavor,
// not hidden troubleshooting history. Existing named requesters keep their names.
const CHARACTER_CARDS = [
  ['INC-101','Ms. Rivera','Classroom teacher','Warm and observant; likes clear pictures.','drawing neighborhood maps','oatmeal and berries','teal','vegetable pizza','gentle piano music','adventure stories','a classroom display request'],
  ['INC-102','Mr. Garren','Computer lab teacher','Calm and practical; takes one step at a time.','building cardboard models','toast and a banana','blue','noodle soup','upbeat drum rhythms','books about inventions','a classroom startup request'],
  ['INC-103','Mr. Garren','Computer lab teacher','Patient and curious; listens closely to evidence.','building cardboard models','toast and a banana','blue','noodle soup','upbeat drum rhythms','books about inventions','an interrupted-startup investigation'],
  ['INC-104','Ms. Chen','Media center helper','Thoughtful and organized; values careful notes.','making paper bookmarks','yogurt and granola','purple','rice with vegetables','acoustic guitar music','mystery stories','a classroom storage request'],
  ['INC-105','Mr. Miller','Social studies teacher','Friendly and methodical; likes comparing possibilities.','collecting fictional map designs','scrambled eggs and toast','forest green','bean tacos','folk instrumentals','historical adventures','a storage compatibility investigation'],
  ['INC-106','Sam','Technology team build coordinator','Encouraging and hands-on; enjoys making plans.','building model bridges','porridge and apple slices','orange','baked potatoes','energetic percussion','illustrated science books','a compatible virtual PC build'],
  ['INC-107','Ms. Patel','Presentation room teacher','Expressive and patient; likes tidy explanations.','painting tiny landscapes','fruit and cereal','magenta','vegetable curry','soft string music','short story collections','a presentation display request'],
  ['INC-108','Mr. Brooks','Flexible classroom teacher','Relaxed and curious; asks students to describe observations.','making origami animals','bagel and fruit','navy blue','tomato pasta','light jazz instrumentals','nature adventures','a display-path investigation'],
  ['NET-201','Alex','Library help desk teammate','Quietly curious; separates observations from guesses.','solving word puzzles','apple cinnamon oats','turquoise','lentil soup','lo-fi instrumentals','library mysteries','a network reachability request'],
  ['NET-202','Ms. Bell','Project studio teacher','Collaborative and clear; appreciates a simple explanation.','designing board games','toast with jam','violet','vegetable wraps','bright guitar music','creative project books','a shared-folder access request'],
  ['NET-203','Taylor','IT operations teammate','Steady and careful; prefers written checkpoints.','assembling jigsaw puzzles','cereal and pear slices','slate blue','roasted vegetable bowls','ambient soundtracks','space exploration stories','a recovery and update-service request'],
  ['NET-204','Morgan','Library studio helper','Inquisitive and visual; enjoys comparing diagrams.','sketching imaginary buildings','yogurt and melon','lime green','rice and beans','marimba instrumentals','architecture picture books','a wireless coverage investigation'],
  ['NET-205','Jules','Design classroom helper','Friendly and persistent; notices small details.','making comic strips','wholegrain toast and berries','coral','cheese and tomato sandwiches','playful ukulele music','graphic adventures','a missing print-job investigation'],
  ['NET-206','Riley','Media studio teammate','Reassuring and orderly; likes a careful record.','taking fictional landscape photos','banana pancakes','deep purple','vegetable noodles','calm orchestral music','photography guides','a file-recovery request'],
  ['AI-301','Avery','Student technology team representative','Curious and plain-spoken; likes learning by examples.','writing tiny adventure games','cereal and a banana','bright yellow','bean burritos','chiptune instrumentals','choose-your-path stories','a learning-prompt activity'],
  ['AI-302','Casey','Help desk training reviewer','Thoughtful and skeptical; asks what supports a claim.','solving logic puzzles','oats with sliced pear','indigo','vegetable dumplings','quiet electronic music','detective stories','a source and fairness review'],
  ['AI-303','Jordan','Application review teammate','Direct and patient; explains technical words simply.','designing paper mazes','toast and yogurt','steel blue','tomato soup','minimal piano music','beginner coding books','a safer-code review'],
  ['AI-304','Robin','Learning design teammate','Considerate and collaborative; makes room for choices.','creating cooperative card games','fruit and granola','lavender','vegetable risotto','gentle acoustic music','stories about teamwork','a reading-helper privacy review'],
  ['AI-305','Quinn','Research classroom helper','Inquiring and careful; distinguishes quotes from instructions.','making science scrapbooks','porridge and peaches','emerald','spinach pasta','instrumental movie music','science mysteries','a source-instruction boundary review'],
  ['AI-306','Drew','Help desk analytics teammate','Reflective and precise; likes comparing small examples.','drawing puzzle grids','toast with apple slices','cobalt','lentil curry','rhythmic instrumental music','number puzzle books','a classifier decision review'],
  ['SEC-401','Jamie','Digital safety team helper','Kind and unhurried; welcomes a second look.','making stop-motion paper scenes','cereal and berries','mint green','baked vegetable pockets','cheerful piano music','friendly mystery stories','a suspicious-message investigation'],
  ['SEC-402','Lee','Defensive training teammate','Calm and evidence-minded; avoids jumping to conclusions.','playing strategy board games','oatmeal and raisins','dark teal','vegetable stir-fry','steady drum music','space mysteries','a fictional security-log investigation'],
  ['SEC-403','Emery','Application security teammate','Fair and clear; likes checking both allowed and denied results.','writing puzzle riddles','yogurt and apples','royal purple','bean chili','soft synthesizer music','logic puzzle collections','a record-access investigation'],
  ['SEC-404','Charlie','Account recovery practice requester','Polite and reflective; appreciates a calm explanation.','learning card tricks without wagering','toast and orange slices','warm red','vegetable lasagna','light orchestral music','magical adventure stories','an identity and recovery exercise'],
  ['SEC-405','Skyler','Incident response training teammate','Composed and collaborative; values careful handoffs.','building miniature paper towns','granola and a banana','ocean blue','rice with roasted vegetables','quiet drum-and-piano music','team adventure stories','an incident-containment exercise'],
  ['SEC-406','Reese','IT deployment review teammate','Measured and curious; likes a clear checklist.','making mechanical paper toys','porridge and berries','silver gray','vegetable flatbread','acoustic instrumentals','books about engineering','a software deployment review'],
  ['CODE-501','Finley','Virtual supply-desk coordinator','Upbeat and practical; likes checking an example aloud.','making pretend shop signs','toast and a pear','sunny orange','pasta with vegetables','bouncy percussion','inventor adventures','a classroom kit-cost program'],
  ['CODE-502','Sage','Virtual facilities technician','Patient and exact; pays attention to boundary words.','drawing imaginary garden plans','cereal and yogurt','leaf green','vegetable stew','gentle flute music','nature guides','a classroom temperature-message program'],
  ['CODE-503','Arden','Virtual deployment lead','Friendly and systematic; enjoys spotting a pattern.','creating numbered treasure maps','oats and a banana','violet blue','vegetable tacos','instrumental adventure music','puzzle adventures','a station-numbering program'],
  ['CODE-504','Noel','Pixel-pet caretaker','Warm and playful; makes room for a small experiment.','designing paper creatures','apple slices and toast','apricot orange','vegetable noodles','playful marimba music','creature adventures','a pixel-pet energy program'],
  ['CODE-505','Kit','Arcade prize-desk volunteer','Upbeat and fair; enjoys checking a boundary carefully.','making tile mosaics','yogurt and peaches','raspberry pink','bean quesadillas','bright keyboard music','arcade mysteries','an arcade prize-message program'],
  ['CODE-506','Sol','Rover mission planner','Calm and exact; compares a prediction with each result.','drawing constellation maps','porridge and cherries','midnight blue','roasted vegetable pasta','quiet space soundtracks','exploration journals','a rover energy-planning program']
];
const CHARACTERS = new Map(CHARACTER_CARDS.map(([id,name,role,voice,interests,breakfast,color,food,music,book,focus])=>[id,Object.freeze({name,role,intro:`Hi, I’m ${name}, the ${role.toLowerCase()}. Thanks for helping with ${focus}.`,voice,interests,breakfast,color,food,music,book,focus})]));

/** Trusted character data for the UI or an optional responder. It contains no
 * real identity, learner work, hidden repair facts, or model instructions. */
export function requesterPersona(scenarioOrId) {
  const id=typeof scenarioOrId==='string'?scenarioOrId:scenarioOrId?.id;
  return typeof id==='string'?CHARACTERS.get(id)||null:null;
}

const definition = (aliases,answer) => Object.freeze({aliases:Object.freeze(aliases.split('|')),answer});
const DEFINITIONS = Object.freeze([
  definition('cpu|processor|central processing unit','The CPU is the computer’s main instruction worker. It follows a program’s steps and carries out calculations.'),
  definition('ram|memory|random access memory','RAM is the computer’s short-term workspace. It holds information while programs run; storage keeps files after power is off.'),
  definition('storage','Storage keeps programs and files for later, even when the computer is off. An SSD or a hard drive is a storage device.'),
  definition('ssd|solid state drive|solid-state drive','An SSD stores files on electronic chips. It has no spinning disk. A computer needs a working connection to read its files.'),
  definition('hard drive|hdd|hard disk','A hard drive stores files on spinning magnetic disks. Unlike RAM, it keeps its contents when power is off.'),
  definition('motherboard','The motherboard is the main circuit board. It connects parts such as the CPU, memory, storage, and power supply.'),
  definition('gpu|graphics card|graphics processing unit','A GPU handles graphics work, including drawing images for a screen. Some computers have a separate graphics card.'),
  definition('psu|power supply','The power supply changes wall power into the forms the computer’s parts need. In this lab, use only the virtual power controls.'),
  definition('os|operating system','An operating system manages a computer’s hardware, files, and apps. It helps programs share the computer’s resources.'),
  definition('app|application','An app is a program for a task, such as writing a document, drawing, or browsing a website.'),
  definition('browser|web browser','A browser is an app for opening websites. The browser displays this lab; the lab does not control your real computer.'),
  definition('internet','The internet connects many networks around the world. A local network can still work even if its internet connection fails.'),
  definition('network','A network lets connected devices exchange information. It might connect computers in one room or link many places.'),
  definition('router','A router sends network traffic between different networks, such as a classroom network and its internet connection.'),
  definition('switch|network switch','A network switch connects devices within a local network and sends their traffic toward the intended device.'),
  definition('modem','A modem connects a network to certain internet-provider services. Some home devices combine a modem, router, and Wi-Fi access point.'),
  definition('wi-fi|wifi|wireless network','Wi-Fi connects devices to a nearby network using radio signals. Being connected to Wi-Fi does not always mean the internet works.'),
  definition('dns|domain name system','DNS helps find a network address for a name, rather like looking up a contact. A DNS problem can stop names working while addresses still work.'),
  definition('ip|ip address','An IP address is an address devices use to send information across a network. The lab’s addresses are fictional training settings.'),
  definition('gateway|default gateway','A default gateway is the usual next stop for traffic going outside a device’s local network. It is often a router.'),
  definition('firewall','A firewall allows or blocks network traffic using rules. A useful rule protects access while keeping approved services available.'),
  definition('malware','Malware is software made to harm, spy on, or misuse a system. This lab uses fictional evidence and does not run malware.'),
  definition('phishing','Phishing is an attempt to trick someone into giving information or taking an unsafe action, often through a misleading message.'),
  definition('mfa|multi-factor authentication|multifactor authentication','MFA checks identity using more than one kind of proof, such as a password and an approved security key. Never share real sign-in codes here.'),
  definition('backup','A backup is a separate copy kept so information can be recovered. A recovery test checks whether the right files can actually be restored.'),
  definition('encryption','Encryption turns readable information into a form that needs the right key to read. It does not protect a device that is already compromised.'),
  definition('hdmi','HDMI is a connection for digital picture and sound. A display needs a suitable output, connected cable ends, and the correct input source.'),
  definition('usb','USB is a family of connections for devices, data, and sometimes power. A matching plug shape alone does not prove every feature is supported.'),
  definition('ethernet','Ethernet is a common wired network connection. A connected cable is one clue, but it does not prove every network service is working.'),
  definition('firmware|bios|uefi','Firmware is built-in software that helps hardware start and work. UEFI is a common kind of startup firmware; BIOS is an older kind.'),
  definition('post|power-on self-test','POST means power-on self-test: startup checks before the operating system loads. Moving fans alone do not prove these checks passed.'),
  definition('bug|software bug','A bug is a mistake in a program that causes an unwanted result. Reproducing it and testing a change help check whether it is fixed.'),
  definition('algorithm','An algorithm is a clear set of steps for solving a task. You can describe one in ordinary words before writing code.'),
  definition('variable','A variable is a named place a program uses for a value. For example, a quantity variable can hold the number of items.'),
  definition('loop','A loop repeats steps in a program. A useful test checks how often it repeats, including the first and last repetition.'),
  definition('function','A function is a named group of program steps you can use again. It can take inputs and may return an output.')
]);

export const REQUESTER_DEFINITIONS = DEFINITIONS;

function termReply(text) {
  const match = /^(?:what (?:is|are)(?: a| an| the)?|define|explain(?: a| an| the)?|tell me about(?: a| an| the)?) (.+?)(?: in simple (?:words|terms)| simply| for beginners)?$/u.exec(text)
    || /^what does (.+?) (?:mean|stand for|do)$/u.exec(text);
  const term = match?.[1];
  const entry = term && DEFINITIONS.find(item => item.aliases.includes(term));
  return entry ? result(entry.answer,'casual-definition') : null;
}

function arithmeticReply(text) {
  const expression = text.replace(/^(?:what is|what's|calculate|work out) /u,'').replace(/ divided by /gu,' / ').replace(/ (?:times|multiplied by) /gu,' * ').replace(/ plus /gu,' + ').replace(/ minus /gu,' - ').replace(/×/gu,'*').replace(/÷/gu,'/');
  const match = /^(-?\d{1,5}(?:\.\d{1,2})?)\s*([+*/-])\s*(-?\d{1,5}(?:\.\d{1,2})?)$/u.exec(expression);
  if (!match) return null;
  const first=Number(match[1]),second=Number(match[3]),operator=match[2];
  if (Math.abs(first)>10000 || Math.abs(second)>10000) return null;
  if (operator==='/' && second===0) return result('Division by zero has no defined result in ordinary arithmetic. That is a general math explanation, not a lab test result.','casual-math');
  const value=operator==='+'?first+second:operator==='-'?first-second:operator==='*'?first*second:first/second;
  const rounded=Math.round(value*1000000)/1000000;
  return result(`${match[1]} ${operator} ${match[3]} = ${rounded}${rounded!==value?' (rounded to six decimal places)':''}. This is a math answer, not a check of your lab repair.`,'casual-math');
}

/** Recognize only explicit small talk or simple general questions. No case state,
 * saved answer, learner identity, clock, network, or random source is consulted. */
function personaReplyBase(scenario,question) {
  if (typeof question!=='string' || !question.trim() || question.length>240) return null;
  const text=clean(question).replace(/^(?:hi|hello|hey|good morning)[,! ]+(?=(?:how|what|who|can|tell|do|are)\b)/u,'').replace(/^(?:please |(?:can|could|would) you (?:please )?)/u,'');
  const character=requesterPersona(scenario);
  const label=typeof scenario?.requester==='string' && scenario.requester.length<=100 ? scenario.requester.split('·')[0].trim() : 'the practice requester';
  const seed=hash(label);
  const general=termReply(text) || arithmeticReply(text);
  if (general) return general;
  if (/^(?:hi|hello|hey|good morning|good afternoon|good evening)(?: there| requester)?$/u.test(text)) return result(`Hi! I am ${character?.name||label}. I am here for ${character?.focus||'this case'}. Away from the task, I enjoy ${character?.interests||'puzzles'}. We can chat or look at the request together.`);
  if (/^(?:thanks|thank you|thanks a lot|thank you so much|okay thanks|ok thanks|cheers)$/u.test(text)) return result(`You are welcome! I am glad we could talk. ${character?.voice||'I like taking things one step at a time.'} Whenever you are ready, we can keep chatting or return to the request.`);
  if (/^(?:bye|goodbye|see you|see you later|good night)$/u.test(text)) return result('See you next time! You can return to the request and workbench whenever you are ready.');
  if (/\b(?:your name|who are you|introduce yourself|tell me about yourself)\b/u.test(text)) return result(`I’m ${character?.name||label}, the ${character?.role.toLowerCase()||'requester'}. I’m here about ${character?.focus||'this request'}. What would you like to know?`);
  if (/^(?:what(?:'s| is) your (?:job|role)|what do you do(?: for work)?|are you (?:a )?teacher)$/u.test(text)) return result(`I’m the ${character?.role.toLowerCase()||'requester'}, working on ${character?.focus||'this request'}. I enjoy ${character?.interests||'puzzles'} when I have time for a break.`);
  if (/^(?:how are you(?: doing| today)?|how do you feel(?: today)?|how's it going|are you (?:happy|sad|okay|ok))$/u.test(text)) return result(`I feel hopeful about ${character?.focus||'the request'}. ${character?.voice||'I like taking one step at a time.'} I would enjoy a little creative break with ${character?.interests||'a puzzle'}, too.`);
  if (/\b(?:are you real|are you (?:an? )?(?:ai|robot|person|human)|how do you answer)\b/u.test(text)) return result('I’m a character in this technology lab, rather than a person on the other end. My case answers use the supplied facts. Everyday conversation can use authored replies or an enabled cloud reply; it cannot inspect your real device.');
  if (/^(?:can you )?(?:see|hear) me$/u.test(text)) return result('I can’t see or hear you, or inspect your real device. You can describe an observation from the request or workbench, and we can talk about it.');
  if (/\b(?:do you know everything|can you chat|can we chat|can we talk|what can you talk about)\b/u.test(text)) return result(`We can talk about everyday ideas, computer words, or an imaginary adventure. I enjoy ${character?.interests||'puzzles'}. I don’t know every answer, but we can try a question and see where it leads.`);
  if (/\b(?:breakfast|what did you eat|what have you eaten)\b/u.test(text)) return result(`I had ${character?.breakfast||pick(['oatmeal and berries','toast and a banana','yogurt and granola'],seed)} for breakfast. Simple and easy suits me. If I were planning a slow morning, I would add time for ${character?.interests||'a puzzle'}.`);
  if (/\b(?:your hobbies|your hobby|do for fun|do you (?:like to )?(?:play|enjoy) (?:video )?games|favorite game|favourite game|free time|your weekend)\b/u.test(text) || /^what (?:do|would) you like to (?:build|make|create)$/u.test(text)) return result(`I enjoy ${character?.interests||pick(['puzzle games and drawing maps','building little cardboard models and playing board games','reading adventures and solving word puzzles'],seed)}. I like having something small to explore, then giving it my own twist. A quiet creative afternoon sounds good to me.`);
  if (/\b(?:tell me (?:a |another )?joke|say something funny|make me laugh|know any jokes)\b/u.test(text)) return result(pick(['A little computer joke: why did the computer bring a blanket? It left its Windows open!','A little computer joke: why was the keyboard good at music? It had plenty of keys!','A little computer joke: what is a computer’s favorite snack? Microchips!'],seed));
  if (/\b(?:favorite|favourite)\b/u.test(text)) {
    const preferences=[[/colou?r/u,[character?.color||'teal']],[/food|meal|snack|pizza/u,[character?.food||'vegetable pizza']],[/animal|pet/u,['an owl','a fox','a turtle']],[/book|read/u,[character?.book||'adventure stories']],[/music|song/u,[character?.music||'calm instrumental music']],[/sport/u,['badminton','swimming','cycling']],[/season|weather/u,['spring','autumn','summer']],[/drink/u,['water with lemon','warm cocoa','mint tea']],[/subject|class/u,['art','science','technology']]];
    const preference=preferences.find(([pattern])=>pattern.test(text));
    if (preference) return result(`My favorite is ${pick(preference[1],seed)}. I would work it into a little project about ${character?.interests||'puzzles'}; choosing a familiar favorite can be a nice starting point for a new idea.`);
    return result('I like learning new things and solving puzzles. I don’t have a favorite for every topic, so I would rather say I don’t know. What do you enjoy about it?');
  }
  if (/\b(?:where do you live|where are you from|how old are you|your (?:address|phone number|birthday|age|family))\b/u.test(text)) return result(`That detail isn’t provided. I can tell you about ${character?.interests||'my interests'}, or we can look at the request together.`);
  if (/^(?:i am|i'm|i feel) (?:sad|upset|frustrated|confused|tired|stressed)$/u.test(text)) return result('You can take a pause. A trusted teacher or adult can help if you need support. For the request, we can take one small step at a time.');
  if (/\b(?:how can i help you|why (?:are you asking|do you need) for help|tell me about your (?:day|classroom|work)|what (?:worries|concerns) you|are you worried)\b/u.test(text)) return result(`I’m the ${character?.role.toLowerCase()||'requester'}, and I’m focused on ${character?.focus||'the request'}. Let’s start with an observation from the request card or workbench. What would you like to ask?`,'casual-case-context');
  if (/\b(?:how (?:should|would you like) (?:me|us|i) to explain|how should i explain|what makes a good (?:technician|helper)|any (?:general )?tips|are you (?:angry|mad) (?:at|with) me|is this my fault)\b/u.test(text)) return result('Let’s take one step at a time. A helpful technician listens, explains what the evidence shows, and says when something is uncertain. A clear question is a good way to start.','casual-case-context');
  if (/\b(?:do you like (?:school|learning)|what inspires you|tell me something about yourself)\b/u.test(text)) return result(`I enjoy ${character?.interests||'solving puzzles'}. I like explanations that help someone understand, rather than guesses that only sound confident. A tiny new idea is often enough to make me want to learn more.`);
  if (/\b(?:how (?:was|is) your day|what is your day like|how was your weekend|what are you looking forward to)\b/u.test(text)) return result(`I am thinking about ${character?.focus||'the classroom request'}. For a pleasant break, I would choose ${character?.interests||'puzzles'} and a little ${character?.music||'music'}. That sounds like a good balance to me.`);
  if (/\b(?:what (?:do|would) you (?:eat|like) for lunch|do you like (?:cooking|baking)|what is for lunch)\b/u.test(text)) return result(`I would choose ${character?.food||'vegetable pizza'} for lunch. For an imaginary cafe, I would put that on the menu and decorate it in ${character?.color||'teal'}. A small, friendly place would suit me.`);
  if (/\b(?:tell me (?:a |another )?(?:short )?story|make up a story)\b/u.test(text)) return result(`Here is a made-up mini-story: ${character?.name||'a classroom helper'} made a puzzle for a friend. The first plan was confusing, so they listened and tried a clearer version. Working together mattered more than getting it right immediately.`);
  if (/^(?:do you like|what do you think (?:of|about)|have you ever) /u.test(text) && !/\b(?:pc|computer|monitor|screen|cable|ram|memory|network|request|problem|case|repair|test|code|program|printer|file|prompt|security|message|account|record|backup|router|drive|storage|wi-fi|wifi)\b/u.test(text)) return result(`I don’t have an answer for every topic. I enjoy ${character?.interests||'puzzles'}, though. What interests you about it?`,'casual-unknown');
  // A generic legacy keyword such as "who", "where", or "cost" must not
  // turn an unrelated subject into a sender, coverage, or kit-price case clue.
  if (/\b(?:weather|forecast|who won|world cup|super bowl|president|prime minister|capital of|quantum dragons|flibberflam|newest .*prices|today'?s? news|on (?:mars|the moon)|(?:film|movie|cinema).{0,15}(?:playing|showing))\b/u.test(text)
    || /^who (?:is|was|are) /u.test(text) && !/\b(?:requester|sender|signed in|logged in|user|teacher|record|owner|attacker|account|administrator|admin|team|technician|affected|case)\b/u.test(text)) return requesterUnknownReply(scenario,question);
  return null;
}

const PERSONAL_ANCHOR = /\b(?:your name|who are you|your role|your job|breakfast|your hobbies|your hobby|your interests|do for fun|your weekend|your day|your favorite (?:color|colour|food|meal|snack|pizza|animal|pet|book|music|song|sport|season|weather|drink|subject|class)|your favourite (?:color|colour|food|meal|snack|pizza|animal|pet|book|music|song|sport|season|weather|drink|subject|class)|your family|your age|your address|your phone|how old are you|where do you live|where are you from)\b/u;
const CASUAL_FOLLOW_UP = /^(?:(?:can|could|would) you )?(?:please )?(?:why|how come|why is that|how so|tell me more|more please|go on|keep going|what about you|how about you|and you|tell me another story|another story|what happened next|what happens next|and then|say that again|repeat that|explain that|explain it|in simple words|say it simply|what do you mean(?: by that)?)$/u;
const CHITCHAT_ONLY = /^(?:hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|thanks a lot|thank you so much|bye|goodbye|see you later)(?: there)?$/u;

/** History only selects an authored variation. It cannot add observations or
 * instructions, and its answer strings are never read. */
export function requesterPersonaReply(scenario,question,history=[]) {
  if (typeof question!=='string' || !question.trim() || question.length>240) return null;
  const text=clean(question), profile=requesterPersona(scenario);
  const base=personaReplyBase(scenario,question);
  const general=termReply(text) || arithmeticReply(text);
  if (general) return general;
  const library=!PERSONAL_ANCHOR.test(text)?requesterLibraryReply(scenario,profile,question,history):null;
  if (library) return library;
  if (!base || base.topic!=='casual-persona' || CHITCHAT_ONLY.test(text)) return base;
  const repeats=(Array.isArray(history)?history.slice(-8):[]).filter(pair=>clean(pair?.question)===text).length;
  if (!repeats || !profile) return base;
  if (repeats%3===1 && /\b(?:favorite|favourite|hobb|breakfast|lunch|fun)\b/u.test(text)) return result(`I still like that choice. ${base.answer.split(/(?<=[.!?])\s/u)[0]} For a different angle, I could make a ${profile.color} sketch inspired by ${profile.interests}.`);
  if (repeats%3===2 && /\b(?:favorite|favourite|hobb|breakfast|lunch|fun)\b/u.test(text)) return result(`${base.answer.split(/(?<=[.!?])\s/u)[0]} If we made a little story from it, I would give ${profile.name} a creative afternoon, some ${profile.music}, and time to try one new idea.`);
  return base;
}

/** A short-lived conversational anchor. Recompute from questions, never AI or
 * saved answer text. A newer case question takes priority over an older chat. */
export function requesterCasualFollowUp(scenario,question,history=[]) {
  if (!CASUAL_FOLLOW_UP.test(clean(question)) || !Array.isArray(history)) return null;
  const profile=requesterPersona(scenario);
  if (!profile) return null;
  let turn=0;
  for (const pair of history.slice(-8).reverse()) {
    if (!pair || typeof pair.question!=='string' || pair.question.length>240) return null;
    const prior=clean(pair.question);
    if (CASUAL_FOLLOW_UP.test(prior)) {turn++;continue;}
    if (CHITCHAT_ONLY.test(prior)) continue;
    const library=requesterLibraryFollowUp(scenario,profile,question,pair.question,turn);
    if (library) return library;
    const base=personaReplyBase(scenario,pair.question);
    if (!base || base.topic==='casual-unknown' || base.topic==='casual-case-context') return null;
    const text=clean(question);
    if (base.topic==='casual-definition' || base.topic==='casual-math') return result(`Here is the general idea again: ${base.answer}`,'casual-followup');
    if (!PERSONAL_ANCHOR.test(prior) && !/\b(?:lunch|hobbies|fun|mood|how are you)\b/u.test(prior)) return null;
    if (/^(?:why|how come|why is that|how so)$/u.test(text)) return result(`It suits the way I like to spend a creative break. ${base.answer.split(/(?<=[.!?])\s/u)[0]} My interest in ${profile.interests} gives me a way to turn that preference into a little project.`,'casual-followup');
    if (/\b(?:story|next|then)\b/u.test(text)) return result(`If we imagined a little scene, ${profile.name} would start with ${profile.interests}, add a splash of ${profile.color}, and invite a friend to suggest a twist. They would finish with a tiny project to share.`,'casual-followup');
    return result(`${base.answer.split(/(?<=[.!?])\s/u)[0]} To add a little more: I would pair it with ${profile.music} and a quiet chance to explore ${profile.interests}. That is my kind of creative break.`,'casual-followup');
  }
  return null;
}

/** Unknown subjects receive an honest, varied reply instead of invented knowledge. */
export function requesterUnknownReply(scenario,question) {
  const seed=hash((typeof scenario?.id==='string'?scenario.id:'')+' '+clean(question));
  const focus=requesterPersona(scenario)?.focus;
  return result(pick([
    'I don’t know that answer. I can talk about many everyday ideas and imaginary adventures, but my offline library has limits. We could try a related idea or check a trusted source.',
    'That is outside what I know. I would rather say so than invent a confident answer. I enjoy creative questions, though: we could imagine a story or try a topic like nature, art, or teamwork.',
    'I don’t have a written answer for that topic. I cannot look things up. We could choose a different subject, make up a clearly imaginary adventure, or return to the visible request.',
    'I’m not sure about that. Some questions need a trusted source or a person who knows the subject. I can still join in a creative chat, as long as we keep guesses separate from facts.'
  ],seed)+(focus?` Here, I can discuss ${focus}.`:''),'casual-unknown');
}
