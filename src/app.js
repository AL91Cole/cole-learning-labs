import {MEMBER_CONTENT,routeAccess} from './access-policy.js?release=20261025-learning-plans';
import {CATALOG} from './lab-catalog.js?release=20261025-learning-plans';
import {ELEMENTARY_LABS,renderElementaryCatalogue,renderElementaryLab,mountElementaryLab} from './elementary-labs.js?release=20261025-learning-plans';
import {mountLabImprovements,resetLabImprovements} from './lab-improvements.js?release=20261025-learning-plans';
import {initialNetworkStudioState,networkStudioHasWork} from './network-studio-model.js?release=20261025-learning-plans';
import {renderNetworkStudio,mountNetworkStudio} from './network-studio.js?release=20261025-learning-plans';
import {practiceScenarioFor,practiceHasWork,renderPracticeWorkbench,mountPracticeWorkbench} from './practice-workbench.js?release=20261025-learning-plans';
import {initialCodingStudioState,codingStudioHasWork,renderCodingStudio,mountCodingStudio} from './coding-studio.js?release=20261025-learning-plans';
import {renderLabTutorial,mountLabTutorial} from './lab-tutorial.js?release=20261025-learning-plans';
import {SANDBOX_STARTERS,renderCodingSandbox,mountCodingSandbox,hasCodingSandboxWork,clearCodingSandboxWork} from './coding-sandbox.js?release=20261025-learning-plans';
import {SCENARIOS} from './scenarios.js?release=20261025-learning-plans';
import {labLanguage} from './lab-language.js?release=20261025-learning-plans';
import {requesterPersona} from './requester-persona.js?release=20261025-learning-plans';
import {mountRequesterChat,resetRequesterPreference} from './requester-chat.js?release=20261025-learning-plans';
import {FOUNDATION_LABS,getFoundation,createFoundationRecord,foundationSummary,foundationReport} from './foundation-model.js?release=20261025-learning-plans';
import {renderFoundationLab,mountFoundationLab} from './foundation-labs.js?release=20261025-learning-plans';
import {applyHardwareAction,verifyHardware,renderHardware,disposeHardware,cancelHardwareInteraction,setHardwareVisible} from './hardware.js?release=20261025-learning-plans';
import {applyWorkspaceAction,verifyWorkspace,renderWorkspace,disposeWorkspace} from './workspaces.js?release=20261025-learning-plans';
import {cancelCodingWorkbench} from './coding-workbench.js?release=20261025-learning-plans';
import {classroomStorageKey,attachClassroomLab} from './classroom-client.js?release=20261025-learning-plans';
import {normalizeLabRecord,workbenchProgress} from './records.js?release=20261025-learning-plans';
import {privacyPage} from './privacy.js?release=20261025-learning-plans';
import {createWorkStorage,CLEAR_WORK_KEY,WORK_PREFIX,hasPrivateWork,PUBLIC_WORK_PREFIX} from './local-work.js?release=20261025-learning-plans';
import {mountWorkControls,workStatus} from './work-controls.js?release=20261025-learning-plans';
import {answerQuestion,questionEvent,readQuestionEvents,inquiryProgress,retainInquiryEvents} from './interview.js?release=20261025-learning-plans';

import {renderTeachingPage,mountTeachingPage} from './teaching.js?release=20261025-learning-plans';
import {hasLessonPlanWork,clearLessonPlanWork} from './lesson-plans.js?release=20261025-learning-plans';
import {standardsAlignmentHTML,mountStandardsAlignment} from './standards.js?release=20261025-learning-plans';
import {learningRoute,labPageHash,mountLabLearning} from './learning-tools.js?release=20261025-learning-plans';
import {retainExperimentEvents,experimentEventText,experimentReport,readExperiments} from './experiments.js?release=20261025-learning-plans';
import {renderCapstone,mountCapstone,capstoneReport} from './capstone.js?release=20261025-learning-plans';
import {reportFilename,createTextReport,canShareTextReport,shareTextReport,createReportURLs} from './report-downloads.js?release=20261025-learning-plans';

let routeCleanup=null;
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const esc = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storageKey=MEMBER_CONTENT?classroomStorageKey():PUBLIC_WORK_PREFIX;
const tracks={hardware:{name:'Hardware & ServiceDesk',short:'Hardware',symbol:'◈',color:'teal',description:'Work the bench. Trace symptoms, inspect components, and bring a computer back to life.'},network:{name:'Networking & operating systems',short:'Networks & OS',symbol:'⌘',color:'blue',description:'Follow the connection. Work with addresses, permissions, networks, and system services.'},ai:{name:'AI literacy & audit',short:'AI & ethics',symbol:'✳',color:'violet',description:'Question the output. Protect privacy, check evidence, and examine the code.'},security:{name:'Ethical cybersecurity',short:'Cybersecurity',symbol:'◇',color:'amber',description:'Investigate responsibly. Triage an incident, reduce access, and patch a simulated weakness.'},coding:{name:'Coding sandbox',short:'Coding sandbox',symbol:'⌨',color:'rose',description:'Write a small program. Run it with fictional inputs, inspect the output, and explain how it works.'}};
let store={version:2,labs:{}};
let foundationRecords=Object.create(null);
let codingStudioState=initialCodingStudioState();
let networkStudioState=initialNetworkStudioState();
let practiceStates=Object.create(null);
function foundationRecordFor(id){return foundationRecords[id]||=(createFoundationRecord(id));}
function hasFoundationWork(){return Object.entries(foundationRecords).some(([id,record])=>getFoundation(id)&&foundationSummary(id,record).hasWork===true);}
let storageAvailable=true;
let deviceStorage;try{deviceStorage=localStorage;}catch{storageAvailable=false;}
let workStorage=createWorkStorage({storage:deviceStorage,key:storageKey,scenarios:SCENARIOS});
let classroomSharingPaused=false;
let reportCleanup=null;
let labView=null;
let labNavigation=null;
let currentLab=null,libraryTrack='all',libraryGrade='all',libraryMinutes='all',libraryQuery='',noticeTimer,classroomConnection=null;
function save(){storageAvailable=workStorage.save(store);if(!storageAvailable)showNotice('Device saving is unavailable. Export your private work before leaving.');classroomConnection?.schedule();}
function resetLocalSession(){resetLabImprovements();resetRequesterPreference();practiceStates=Object.create(null);networkStudioState=initialNetworkStudioState();codingStudioState=initialCodingStudioState();clearCodingSandboxWork();clearLessonPlanWork();foundationRecords=Object.create(null);workStorage.pause();classroomConnection?.dispose();classroomConnection=null;classroomSharingPaused=true;labView=null;storageKey=MEMBER_CONTENT?WORK_PREFIX:PUBLIC_WORK_PREFIX;workStorage=createWorkStorage({storage:deviceStorage,key:storageKey,scenarios:SCENARIOS});store={version:2,labs:{}};renderRoute(false);}
function bindWorkPrivacy(s){mountWorkControls({host:$('#work-privacy'),manager:workStorage,getStore:()=>store,scenarioId:s.id,replaceStore:value=>{store=value;renderRoute(false);},onClear:cleared=>{resetLocalSession();showNotice(cleared?'Local lab data cleared. Downloads and previously submitted records are separate.':'This page’s work is cleared, but device deletion could not be confirmed. Clear this site’s data in browser settings before sharing the profile.');},onChange:()=>{bindWorkPrivacy(s);const status=$('.save-status');if(status)status.textContent=workStatus(store.labs[s.id]||{},workStorage);}});}
window.addEventListener('storage',event=>{if(event.key===CLEAR_WORK_KEY&&event.newValue){resetLocalSession();showNotice('Local lab data was cleared in another tab. This page has stopped saving and sharing.');}});
window.addEventListener('pagehide',()=>{resetLabImprovements();resetRequesterPreference();practiceStates=Object.create(null);networkStudioState=initialNetworkStudioState();codingStudioState=initialCodingStudioState();clearCodingSandboxWork();clearLessonPlanWork();foundationRecords=Object.create(null);labNavigation=null;disposeHardware($('#workspace'));routeCleanup?.();routeCleanup=null;reportCleanup?.();reportCleanup=null;classroomConnection?.dispose();$('#main')?.replaceChildren();if(!workStorage.persistent){labView=null;store={version:2,labs:{}};}});
window.addEventListener('pageshow',event=>{if(event.persisted)renderRoute();});
function hasCodeDraft(){const editor=$('#coding-editor');return !!editor&&currentLab?.track==='coding'&&editor.value!==store.labs[currentLab.id]?.state.code;}
function preserveCodeDraft(){
  if(!hasCodeDraft())return;
  const record=store.labs[currentLab.id];if(!record)return;
  const result=applyWorkspaceAction(currentLab.id,record.state,'save-code',{code:$('#coding-editor').value});
  record.state=result.state;record.verified=false;record.closed=false;
  record.events.push({time:new Date().toISOString(),kind:'info',message:'Draft program preserved when leaving the lab. Run all fixtures to test this version.'});record.events=retainExperimentEvents(currentLab,record.events);save();
}
window.addEventListener('beforeunload',event=>{if(networkStudioHasWork(networkStudioState)||Object.entries(practiceStates).some(([id,state])=>practiceHasWork(id,state))||codingStudioHasWork(codingStudioState)||hasFoundationWork()||hasCodingSandboxWork()||hasLessonPlanWork()||(!workStorage.persistent&&Object.values(store.labs).some(hasPrivateWork))||$('#student-question')?.value.trim()||hasCodeDraft()){event.preventDefault();event.returnValue='';}});
function showNotice(message){const n=$('#notice');n.textContent=message;n.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{n.hidden=true;},5000);}
function recordFor(scenario){const existing=Object.hasOwn(store.labs,scenario.id)?store.labs[scenario.id]:null;return store.labs[scenario.id]=normalizeLabRecord(scenario,existing);}
function countComplete(){return SCENARIOS.filter(s=>store.labs[s.id]?.closed===true).length;}
function routeLink(route,text,style='button'){return `<a class="${style}" href="#${route}">${text}</a>`;}
function tag(text,extra=''){return `<span class="tag ${extra}">${text}</span>`;}
function trackIcon(track){const paths={hardware:'<rect x="5" y="9" width="27" height="21" rx="3"/><path d="M18 30v7m-7 0h15"/><rect x="36" y="9" width="8" height="28" rx="2"/><path d="M39 15h2m-2 5h2m-2 12h2"/>',network:'<rect x="17" y="4" width="14" height="10" rx="2"/><rect x="3" y="33" width="14" height="10" rx="2"/><rect x="31" y="33" width="14" height="10" rx="2"/><path d="M24 14v9M10 33v-10h28v10M24 23v14"/>',ai:'<path d="m24 4 5 13 13 5-13 5-5 13-5-13-13-5 13-5Z"/><path d="m40 4 1.5 4.5L46 10l-4.5 1.5L40 16l-1.5-4.5L34 10l4.5-1.5Z"/>',security:'<path d="M24 4 40 10v12c0 10-9 17-16 22C17 39 8 32 8 22V10Z"/><path d="m16 24 5 5 11-12"/>',coding:'<path d="m15 12-11 12 11 12m18-24 11 12-11 12M28 6 20 42"/>'};return `<svg class="track-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[track]||paths.hardware}</svg>`;}
function elementaryEntryCards(){const bands=[{code:'k1',band:'K–1',title:'Kindergarten–grade 1',copy:'Match pictures, choose a safe step and move a pretend robot.'},{code:'2-3',band:'2–3',title:'Grades 2–3',copy:'Follow a message, spot a pattern and try a short set of steps.'},{code:'4-6',band:'4–6',title:'Grades 4–6',copy:'Compare evidence, protect private details and test a small plan.'}];return `<section class="wrap basics-section elementary-entry" aria-labelledby="elementary-entry-heading"><div class="basics-heading"><div><p class="eyebrow">Free activities · Grades K–6</p><h2 id="elementary-entry-heading">Little steps. Real discoveries.</h2></div><p>Try hardware, networks, AI, online safety and coding. Each activity starts fresh; no account, saving or report is needed.</p></div><div class="elementary-entry-grid">${bands.map(item=>`<a class="basics-card" href="#explore?band=${item.code}"><p class="eyebrow">${ELEMENTARY_LABS.filter(lab=>lab.band===item.band).length} free activities</p><h3>${item.title}</h3><p>${item.copy}</p><span class="text-link">Choose an activity <span aria-hidden="true">→</span></span></a>`).join('')}</div><p><a class="text-link" href="#explore">See all K–6 activities →</a></p></section>`;}
function foundationCards(){return `<section class="basics-section wrap" aria-labelledby="basics-heading"><div class="basics-heading"><div><p class="eyebrow">Beginner courses · Grades 7–12</p><h2 id="basics-heading">Learn the basics.</h2></div><p>Take a look around, try a short practice job and explain what you learned.</p></div><div class="basics-grid">${FOUNDATION_LABS.map(lab=>`<a class="basics-card" data-track="${esc(lab.track)}" href="#learn/${esc(lab.id)}"><span class="basics-symbol">${trackIcon(lab.track)}</span><span class="eyebrow">${esc(tracks[lab.track].short)} · Beginner</span><h3>${esc(lab.title)}</h3><p>${esc(lab.summary)}</p><span class="text-link">${esc(lab.minutes)} min · Start learning <span aria-hidden="true">→</span></span></a>`).join('')}</div></section>`;}
function sandboxCards(){if(!MEMBER_CONTENT)return '<section class="wrap sandbox-library membership-teaser" aria-labelledby="sandbox-library-title"><p class="eyebrow">Membership required</p><h2 id="sandbox-library-title">Open coding sandboxes</h2><p>Open sandboxes and Coding Studio are part of membership access. Beginner coding and two guided coding investigations are available free.</p><a class="button button-outline" href="#sandbox">View membership information →</a></section>';return `<section class="wrap sandbox-library" aria-labelledby="sandbox-library-title"><div class="investigation-heading"><div><p class="eyebrow">Make something of your own</p><h2 id="sandbox-library-title">Open coding sandboxes</h2></div><p>Write JavaScript or Python, try an input, and see text, number bars, or pixel tiles. Start with a blank page or change an example.</p></div><div class="sandbox-starter-grid">${SANDBOX_STARTERS.map(starter=>`<a class="sandbox-starter-card" href="#sandbox/${esc(starter.id)}"><span aria-hidden="true">⌨</span><h3>${esc(starter.title)}</h3><p>${esc(starter.description)}</p><span class="text-link">Open sandbox →</span></a>`).join('')}</div><p class="panel-help">Member coding tools · Small local language · No ticket or required repair</p></section>`;}
function sectionHead(eyebrow,title,description=''){return `<div class="section-heading"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2>${description?`<p>${description}</p>`:''}</div>`;}
function stationArt(){return `<div class="station-art" aria-hidden="true"><div class="station-floor"></div><div class="station-monitor"><div class="station-screen"><div class="screen-menu"><i></i><i></i><i></i><span>CLASSROOM DESKTOP · HDMI</span></div><div class="screen-signal"><span class="signal-icon">⌁</span><b>No signal</b><small>Check the video cable and input source.</small></div><div class="screen-bottom"><span>Power on</span><span>●</span></div></div><div class="monitor-logo">COLE / LAB 01</div></div><div class="station-stand"></div><div class="station-base"></div><div class="station-tower"><div class="tower-top"></div><div class="tower-front"><i class="power-led"></i><div class="tower-ports">▰<br>▰<br>●</div><div class="tower-vent"></div><span>WORKSTATION 01</span></div><div class="tower-side"><div class="board-traces"></div><div class="hero-fan"><i></i><i></i><i></i><i></i></div><div class="hero-ram"></div><div class="hero-gpu">GRAPHICS</div><div class="hero-ssd">SATA / SSD</div><div class="hero-wire"></div></div></div><div class="station-keyboard"></div><div class="station-cable"></div><span class="part-callout callout-one">01 / FOLLOW THE SIGNAL</span><span class="part-callout callout-two">02 / INSPECT THE HARDWARE</span></div>`;}

const PORTFOLIO_PROJECTS=Object.freeze([
{n:'01',name:'AI Guardian Web Shield',type:'BROWSER SECURITY · PUBLISHED EXTENSION',text:'People need understandable guidance when a page or link looks suspicious. Web Shield explores local analysis, plain-language explanations, privacy, and informed choices.',bullets:['Local page and link signals','Human-centered risk communication','Privacy-conscious product design'],url:'https://github.com/AL91Cole/ai-guardian-web-shield',link:'Source & documentation'},
{n:'02',name:'AI Guardian Assistant — Project Labyrinth',type:'DEFENSIVE ZERO TRUST · SIMULATION',text:'How should a system handle an access request with conflicting trust signals? Project Labyrinth models identity-aware decisions, audit trails, and decoy containment.',bullets:['Identity, roles, and least privilege','Access decisions and structured logs','Defensive containment through decoys'],url:'https://github.com/AL91Cole/ai-guardian-assistant-project-labyrinth',link:'Explore Project Labyrinth'},
{n:'03',name:'AI Ethics and Moral Philosophy',type:'ONGOING RESEARCH · RESPONSIBLE AI',text:'An evolving research collection examining how dignity, consent, privacy, accountability, and human responsibility can guide technology decisions. Original frameworks are proposals open to discussion and revision.',bullets:['Ethical reasoning and practical governance','Accessibility and meaningful user choice','Accountability, appeal, and repair'],url:'https://github.com/AL91Cole/ai-ethics-and-moral-philosophy',link:'Read the research'},
{n:'04',name:'Cole Learning Labs',type:'INTERACTIVE EDUCATION · GRADES K–12',text:'A virtual place to investigate technology problems when classroom hardware cannot be taken apart. Learners work with simulated equipment, settings, artifacts, and security events, then explain how they verified the result.',bullets:[SCENARIOS.length+' investigations across five pathways','Evidence, planning, and verification','Browser-local reports and progress'],url:'#labs',link:'Enter the virtual labs'}
].map(project=>Object.freeze({...project,bullets:Object.freeze(project.bullets)})));

function projectTechnicalDetails(project){
  const notes={
    '01':'Design focus: locally available page and link signals become plain-language risk guidance. The example on this page is an authored illustration; the extension source and documentation describe the project.',
    '02':'Simulation design: identity, roles, and least privilege inform access decisions. Structured logs and decoy containment make the decision process available for review.',
    '03':'Research format: proposed frameworks examine dignity, consent, privacy, accountability, and human responsibility. The ideas remain open to discussion and revision.',
    '04':'This site uses browser-based simulations and authored case evidence. Private practice starts in page memory. Optional device saving and report downloads are separate choices; cloud replies are off until you choose them and use authored topic codes.'
  };
  return `<details class="project-details"><summary>Technical details</summary><p>${esc(notes[project.n])}</p><ul>${project.bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul><a class="text-link" href="${esc(project.url)}" ${project.url.startsWith('https:')?'target="_blank" rel="noopener noreferrer"':''}>${esc(project.link)} <span aria-hidden="true">↗</span></a></details>`;
}
function heroMicroDemo(){return `<section class="hero-micro-demo" aria-labelledby="hero-demo-title"><h2 id="hero-demo-title">No signal. What would you check?</h2><p>The tower lights up, but Ms. Rivera’s monitor is blank. Try a quick idea.</p><div class="micro-demo-actions" role="group" aria-label="Try an idea for the blank monitor"><button type="button" data-hero-check="video" aria-pressed="false">Check video cable</button><button type="button" data-hero-check="power" aria-pressed="false">Test wall outlet</button><button type="button" data-hero-check="keyboard" aria-pressed="false">Swap keyboard</button></div><p id="hero-demo-feedback" class="micro-demo-feedback" role="status">Choose an idea to see one observation. This preview does not save lab work.</p><a class="text-link" href="#lab/INC-101">Investigate The Blank Monitor <span aria-hidden="true">→</span></a></section>`;}
function guardianDemo(){return `<section class="guardian-visual guardian-demo" aria-labelledby="guardian-demo-title"><div class="browser-chrome" aria-hidden="true"><i></i><i></i><i></i><span>AI Guardian / Web Shield</span></div><div class="guardian-demo-heading"><span class="guard-shield" aria-hidden="true">◇</span><h3 id="guardian-demo-title">Would you trust this message?</h3></div><p class="demo-caption">Local illustration of the project’s design. No links are opened or scanned.</p><div class="guardian-demo-tabs" role="group" aria-label="Compare the message before and after reviewing risk signals"><button type="button" data-guardian-view="before" aria-pressed="true" aria-controls="guardian-before">Before: first look</button><button type="button" data-guardian-view="after" aria-pressed="false" aria-controls="guardian-after">After: pause &amp; review</button></div><div id="guardian-before" class="guardian-example"><span class="demo-label">FICTIONAL MESSAGE</span><h4>Your account closes today!</h4><p>“Confirm your password now to keep your school account.”</p><p><strong>Button label:</strong> School account portal<br><strong>Destination:</strong> <code>login.school-check.invalid</code></p><p class="demo-caption">That destination is example text, with no clickable link.</p></div><div id="guardian-after" class="guardian-example" hidden><span class="demo-label">RISK SIGNALS TO REVIEW</span><ul><li><strong>Urgency:</strong> the message pressures you to act today.</li><li><strong>Password request:</strong> it asks you to give away a secret.</li><li><strong>Destination:</strong> the reassuring label does not prove who runs the site.</li></ul><p><strong>Safer next step:</strong> pause and ask school IT. Use your school’s approved bookmark to reach its portal.</p></div><p id="guardian-demo-feedback" class="demo-caption" role="status">Look at the message, then compare its risk signals.</p></section>`;}
function bindHome(){
  const observations={video:'Useful clue: the cable is in the motherboard video socket. This desktop uses the graphics card below it.',power:'The tower and monitor already have power. The “No signal” message points you toward the picture’s path.',keyboard:'A keyboard changes what you type. It does not carry the picture from the tower to the monitor.'};
  const demoButtons=$$('[data-hero-check]');
  demoButtons.forEach(button=>button.addEventListener('click',()=>{const answer=observations[button.dataset.heroCheck];if(!answer)return;demoButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));$('#hero-demo-feedback').textContent=answer;}));
  const guardianButtons=$$('[data-guardian-view]');
  guardianButtons.forEach(button=>button.addEventListener('click',()=>{const after=button.dataset.guardianView==='after';guardianButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));$('#guardian-before').hidden=after;$('#guardian-after').hidden=!after;$('#guardian-demo-feedback').textContent=after?'Three warning signs explain the concern. Pause and check through a trusted route.':'The message is shown again. Its wording can look convincing before you inspect the details.';}));
}

function home(){const labyrinth=PORTFOLIO_PROJECTS[1];return `<section class="home-hero"><div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span> Alan “Al” Cole · Mx. Cole</p><h1>Let’s work<br><em>it out.</em></h1><p class="hero-description">Explore technology, try a short practice job and work out what happened. Go at your own pace.</p><p class="hero-subtext">Choose a K–6 activity or a beginner course for grades 7–12. No account is needed for public labs.</p><div class="button-row">${routeLink('labs','Choose a lab <span aria-hidden="true">↗</span>')}${routeLink('projects','See my projects <span aria-hidden="true">→</span>','button button-outline')}</div><div class="hero-credentials"><span>School IT support</span><span>Cybersecurity at UAlbany</span><span>Working toward CTE teaching</span></div></div><div class="hero-lab-preview"><div class="preview-topline"><span><i class="status-dot"></i> Try a lab</span><span>Virtual equipment</span></div>${stationArt()}${heroMicroDemo()}<a class="preview-ticket" href="#lab/INC-101"><span class="ticket-letter">${trackIcon('hardware')}</span><span><small>Your first ticket · Hardware</small><strong>The Blank Monitor</strong></span><span aria-hidden="true">↗</span></a></div></section>
<section class="fact-strip" aria-label="Learning platform at a glance"><div><b>${ELEMENTARY_LABS.length+SCENARIOS.length+FOUNDATION_LABS.length}</b><span>${MEMBER_CONTENT?'learning activities':'free learning activities'}</span></div><div><b>${FOUNDATION_LABS.length}</b><span>beginner courses · Grades 7–12</span></div><div><b>${SCENARIOS.length}</b><span>investigations · Grades 7–12</span></div><p><strong>${Object.keys(tracks).length} pathways · Grades K–12</strong><br>Includes ${ELEMENTARY_LABS.length} free K–6 activities.</p></section>
${elementaryEntryCards()}${foundationCards()}<section class="pathway-section"><div class="wrap section">${sectionHead('Choose a topic','What would you like to try?','Start where you feel comfortable. Ask questions, try a test and use the result to work out your next step.')}<div class="pathway-grid">${Object.entries(tracks).map(([id,t])=>`<a class="pathway-card ${t.color}" data-track="${id}" href="#labs/${id}"><span class="pathway-symbol">${trackIcon(id)}</span><span class="eyebrow">${String(SCENARIOS.filter(s=>s.track===id).length).padStart(2,'0')} investigations</span><h3>${t.name}</h3><p>${t.description}</p><span class="text-link">See these labs <span aria-hidden="true">↗</span></span></a>`).join('')}</div></div></section>
<section class="section wrap">${sectionHead('What I’m working on','Projects I’m learning from.','I’m interested in useful technology, clear explanations and helping people make informed choices.')}<div class="project-feature">${guardianDemo()}<div class="project-copy"><p class="eyebrow">A browser security project</p><h3>AI Guardian Web Shield</h3><p>Web Shield looks at local page and link information to help explain possible risks.</p><p>The aim is to make warnings easier to understand so people can decide what to do next.</p>${projectTechnicalDetails(PORTFOLIO_PROJECTS[0])}<div class="button-row">${routeLink('projects','Explore my projects →','text-link')}<a class="text-link" href="https://chromewebstore.google.com/detail/ai-guardian-web-shield/ipledehmklfhhdpobeogfdhmhdhmnden" target="_blank" rel="noopener noreferrer">Chrome Web Store ↗</a></div></div></div><article class="secondary-project"><div class="secondary-project-icon" aria-hidden="true">${trackIcon('security')}</div><div><p class="eyebrow">Another project · Security simulation</p><h3>${esc(labyrinth.name)}</h3><p>${esc(labyrinth.text)}</p>${projectTechnicalDetails(labyrinth)}</div></article></section>
<section class="wrap section teaching-intro classroom-trust"><div><p class="eyebrow">For your classroom</p><h2>The thinking matters<br>as much as the fix.</h2><ul class="trust-pills" aria-label="Public practice at a glance"><li>No account required for public labs</li><li>Practice stays on this device</li><li><a href="school-it.html">School IT review available</a></li></ul></div><div><p>Ask students what they noticed, what they think is happening and how they could test that idea. The labs give them a place to try it.</p><p>Practice starts in this page’s memory. Cloud replies start off. If you turn them on, eligible replies send an authored topic code and lab ID to an external AI service. Your typed words stay here. Built-in replies remain available if the service cannot reply. Device saving is optional; downloaded reports and anything you submit leave this page.</p><p><strong>A simple classroom handoff:</strong> preview your report, download the <code>.txt</code> file, review it for personal information, then upload it through your teacher’s approved LMS or submission route.</p><p>Try a lab together, work in pairs or let students take it step by step. Leave time to discuss what worked and what they would try next. Test the lab on your school’s devices first.</p>${routeLink('educators','Find teaching resources →','button button-outline')}</div></section>`;}

function projectPage(){return `<section class="page-intro wrap"><p class="eyebrow">My projects</p><h1>Things I’m building<br><em>and exploring.</em></h1><p>These projects grew from my interests in school IT, cybersecurity, responsible AI and learning by doing.</p></section><section class="wrap project-list">${PORTFOLIO_PROJECTS.map(p=>`<article class="project-row"><span class="project-number">${p.n}</span><div><p class="eyebrow">${p.type}</p><h2>${p.name}</h2><p>${p.text}</p>${projectTechnicalDetails(p)}<a class="text-link" href="${p.url}" ${p.url.startsWith('https:')?'target="_blank" rel="noopener noreferrer"':''}>${p.link} ↗</a></div></article>`).join('')}</section>`;}
function about(){return `<section class="wrap page-intro about-intro"><div><p class="eyebrow">About Mx. Cole</p><h1>Hi, I’m Mx. Cole.<br><em>I’m learning, too.</em></h1><p>I work as a Computer Technical Assistant at Fonda-Fultonville Central School District while studying cybersecurity at the University at Albany.</p></div><aside class="quote-card"><span aria-hidden="true">“</span><blockquote>I want people to understand the technology they use and feel comfortable asking questions.</blockquote><p>Alan “Al” Cole</p></aside></section><section class="wrap section split-content"><div><p class="eyebrow">Why these labs are here</p><h2>There’s a lot to learn<br>from a problem.</h2></div><div><p>School IT brings me back to everyday questions: why will this computer not start, why has the connection stopped working, and how can I explain the next step clearly?</p><p>My projects let me explore those questions through cybersecurity, responsible AI and accessible learning activities.</p><p>Cole Learning Labs grew from a simple question: how can students learn about computer hardware when they cannot take apart a school device? The virtual bench gives them somewhere to explore, test an idea and learn from the result.</p></div></section><section class="muted-section"><div class="wrap section split-content"><div><p class="eyebrow">What I’m learning</p><h2>My studies<br>and next steps.</h2></div><div class="timeline"><article><span>In progress · Expected May 2027</span><h3>B.S. in Cybersecurity</h3><p>University at Albany (SUNY)<br>Self-designed concentration: AI-Driven Cybersecurity & Ethical Hacking<br>Minor: AI Ethics & Philosophy</p></article><article><span>Certificates and practice</span><h3>Courses, credentials and practice</h3><ul><li>Google Cybersecurity Professional Certificate</li><li>CompTIA Security+</li><li>Professional Certificate in Computer Systems and Networks — American Public University</li></ul></article><article><span>What I’m working toward</span><h3>Computer Technology through CTE</h3><p>I’m working toward Career and Technical Education certification and developing these learning resources along the way.</p></article></div></div></section><section class="wrap section"><p class="eyebrow">Things I work on</p><div class="focus-grid"><article><h3>IT support</h3><p>Windows and Linux, troubleshooting devices, network basics, helping users and writing clear instructions.</p></article><article><h3>Cybersecurity</h3><p>Checking identity and access, giving accounts only the permissions they need, reviewing security events and protecting privacy.</p></article><article><h3>Coding and ethics</h3><p>JavaScript, React, Next.js, Tailwind CSS and SQLite, while continuing to learn Python and PowerShell. I also study the choices and responsibilities that come with using technology.</p></article></div><p class="quiet-note">I also founded CTRL+J Juice Lounge & IT Hub™ LLC. Development is on hold while I focus on my education and career goals.</p></section>`;}

function networkSequence(){if(!MEMBER_CONTENT)return '';const labs=SCENARIOS.filter(s=>s.networkStep).sort((a,b)=>a.networkStep-b.networkStep);return `<details class="network-sequence"><summary>Try networking in order · ${labs.length} labs</summary><p>Start with the network basics, then work through these classroom problems. Read the clues, save your idea, try a change and explain the result.</p><ol>${labs.map(s=>`<li><a href="#lab/${esc(s.id)}">${esc(s.title)}</a><p>${esc(s.summary)}</p></li>`).join('')}</ol><a class="text-link" href="#learn/network">Start with the network basics →</a></details>`;}
function practiceEntries(){const entries=[['network','#studio/network','Network Studio · Members'],['network','#practice/NET-201','Network lab workbenches'],['ai','#practice/AI-301','Try AI activities'],['security','#practice/SEC-401','Try cybersecurity'],['coding','#studio/coding','Coding Studio · Members']].filter(([track])=>libraryTrack==='all'||libraryTrack===track);return entries.length?`<section class="wrap library-guidance"><div><p class="eyebrow">TRY IT HANDS-ON</p><h2>Choose a practice workbench</h2><p>Build a layout, change a setting and watch the result.</p><div class="button-row">${entries.map(([,path,label])=>`<a class="button button-outline" href="${path}">${label} →</a>`).join('')}</div></div></section>`:'';}
function library(){const completed=countComplete(),durations=[...new Set(CATALOG.map(s=>s.minutes))].filter(Number.isFinite).sort((a,b)=>a-b);return `<section class="lab-library-intro"><div class="wrap"><p class="eyebrow">Choose a lab</p><h1>Start with the basics.<br><em>Try a problem when you’re ready.</em></h1><p>All 15 K–6 activities are free. For grades 7–12, all five beginner courses, the practice workbench and two investigations per topic are free. The remaining investigations, studios, open coding sandboxes and teaching resources require membership.</p><p><a class="text-link" href="#guide">New here? Follow the step-by-step lab tutorial →</a></p><div class="library-meta">${tag('Grades K–12')}${tag(`${FOUNDATION_LABS.length} beginner courses · Grades 7–12`)}${tag('Practice in your browser')}<span class="tag" aria-describedby="lab-progress-help">${completed} of ${SCENARIOS.length} ${MEMBER_CONTENT?'':'free '}investigations finished</span></div><p id="lab-progress-help" class="panel-help">Finished means you checked the task and completed your explanation. This count covers grades 7–12 investigations and includes saved work you choose to resume. K–6 activities start fresh when opened. It is practice progress, not a grade.</p><div class="library-pathway-markers" aria-hidden="true">${Object.keys(tracks).map(id=>`<span data-track="${id}">${trackIcon(id)}</span>`).join('')}</div></div></section>${elementaryEntryCards()}${foundationCards()}<div id="practice-entries">${practiceEntries()}</div>${sandboxCards()}<section class="wrap library-section"><div class="investigation-heading"><div><p class="eyebrow">Choose a problem to investigate</p><h2 class="ticket-list-heading">Your next investigation</h2></div><p>Read the clues, try a change and explain what happened.</p></div><div class="library-toolbar"><div class="track-filters" role="group" aria-label="Filter by topic"><button data-track="all" class="${libraryTrack==='all'?'active':''}" aria-pressed="${libraryTrack==='all'}">All topics</button>${Object.entries(tracks).map(([id,t])=>`<button data-track="${id}" class="${libraryTrack===id?'active':''}" aria-pressed="${libraryTrack===id}">${t.short}</button>`).join('')}</div><div class="library-options"><label>Grade band<select id="grade-filter"><option value="all">All grades</option>${['7–8','9–10','11–12'].map(g=>`<option value="${g}" ${libraryGrade===g?'selected':''}>Grades ${g}</option>`).join('')}</select></label><label>Time estimate<select id="duration-filter"><option value="all">Any length</option>${durations.map(minutes=>`<option value="${minutes}" ${String(libraryMinutes)===String(minutes)?'selected':''}>${minutes} minutes</option>`).join('')}</select></label><label>Find a lab<input id="lab-search" type="search" value="${esc(libraryQuery)}" placeholder="Search title or ticket…"></label></div></div><div id="network-sequence">${libraryTrack==='all'||libraryTrack==='network'?networkSequence():''}</div><p id="lab-count" class="result-count" aria-live="polite"></p><div class="lab-card-grid" id="lab-results"></div><div class="library-guidance"><span class="pathway-symbol" aria-hidden="true">↗</span><div><h2>Try a whole classroom</h2><p>Work through five practice requests to get a classroom ready, then explain what the next technician should know.</p></div><a class="button button-outline" href="#capstone">Try classroom opening day →</a></div><div class="library-guidance"><span class="pathway-symbol" aria-hidden="true">?</span><div><h2>Need a hand getting started?</h2><p>The Student Guide explains the workflow. Private sessions keep work on this page. Device saving is an explicit choice; export a report when you finish.</p></div>${routeLink('guide','Read the student guide →','button button-outline')}</div></section>`;}
function syncLibraryControls(){
  $$('.track-filters [data-track]').forEach(button=>{const selected=button.dataset.track===libraryTrack;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
  $('#practice-entries').innerHTML=practiceEntries();$('#network-sequence').innerHTML=libraryTrack==='all'||libraryTrack==='network'?networkSequence():'';
  $('#grade-filter').value=libraryGrade;$('#duration-filter').value=libraryMinutes;$('#lab-search').value=libraryQuery;
}
function filterLibraryTrack(track){if(track!=='all'&&!Object.hasOwn(tracks,track))return;libraryTrack=track;history.replaceState(null,'','#labs');syncLibraryControls();labCards();}
function labCards(){const result=CATALOG.map(meta=>({...meta,...SCENARIOS.find(lab=>lab.id===meta.id)})).filter(s=>(libraryTrack==='all'||s.track===libraryTrack)&&(libraryGrade==='all'||s.grade===libraryGrade)&&(libraryMinutes==='all'||s.minutes===Number(libraryMinutes))&&`${s.id} ${s.title} ${s.summary||''}`.toLowerCase().includes(libraryQuery.toLowerCase()));$('#lab-count').textContent=`${result.length} investigation${result.length===1?'':'s'} · ${countComplete()} finished on this page`;
$('#lab-results').innerHTML=result.length?result.map(s=>`<a class="lab-card ${tracks[s.track].color}" data-track="${s.track}" href="#lab/${s.id}"><div class="lab-card-visual track-${s.track}"><span class="lab-card-code">${s.id}</span><span class="lab-visual-icon">${trackIcon(s.track)}</span><span class="lab-card-status">${s.access==='member'&&!MEMBER_CONTENT?'Membership required':store.labs[s.id]?.closed?'✓ Finished':store.labs[s.id]?'In progress':'Ready to investigate'}</span></div><div class="lab-card-copy"><p class="eyebrow">${tracks[s.track].short} · GRADES ${s.grade}</p><h2>${s.title}</h2>${s.intake?`<p class="request-kind">${s.intake.kind==='follow-up'?'Incomplete request · ask questions':'Detailed request'}</p>`:''}<p>${esc(s.summary||(s.access==='member'?'A member investigation. Its task and workspace are available after authorized access.':'A free sample investigation.'))}</p><div class="lab-card-foot"><span>${s.minutes} min suggested</span><span>${s.access==='member'&&!MEMBER_CONTENT?'View membership':'Open bench'} <span aria-hidden="true">↗</span></span></div></div></a>`).join(''):`<div class="empty-state"><h2>No labs match those filters.</h2><p>Choose another pathway, grade band, or time estimate, or clear your search.</p><button class="button button-outline" id="clear-filters">Clear filters</button></div>`;$('#clear-filters')?.addEventListener('click',()=>{libraryTrack='all';libraryGrade='all';libraryMinutes='all';libraryQuery='';history.replaceState(null,'','#labs');syncLibraryControls();labCards();$('#lab-search').focus({preventScroll:true});});}

function labPage(s){
  const r=recordFor(s),language=labLanguage(s),persona=requesterPersona(s);currentLab=s;if(labView?.id!==s.id)labView={id:s.id,section:1};
  return [
    '<section class="lab-shell single-page-lab paged-lab" data-track="'+esc(s.track)+'"><div class="lab-topbar"><a href="#labs" class="back-link">← All labs</a><div><span class="eyebrow">'+esc(s.id)+' / '+esc(tracks[s.track].name)+'</span><h1>'+esc(s.title)+'</h1></div><span class="tag">GRADES '+esc(s.grade)+'</span><div class="lab-tools"><button id="reading-toggle" class="lab-tool" aria-pressed="false">Larger text</button><button id="saving-options" class="lab-tool">Saving & privacy</button><button id="report-button" class="lab-tool">My report ↗</button></div></div>',
    '<div class="lab-objective"><strong>'+esc(language.goalLabel)+'</strong><p>'+esc(s.goal)+'</p></div>',
    '<div class="lab-page-heading"><p id="lab-page-progress" class="eyebrow">PAGE 1 OF 3</p><h2 id="lab-page-title">Request &amp; clues</h2></div>',

    "<nav class=\"lab-section-nav lab-section-jumps\" aria-label=\"Investigation sections\"><button type=\"button\" id=\"lab-tab-1\" data-lab-section=\"1\" aria-controls=\"lab-problem\" aria-current=\"step\"><span class=\"step-number\">1</span>Request & clues<span class=\"section-done\" aria-hidden=\"true\"></span></button><button type=\"button\" id=\"lab-tab-2\" data-lab-section=\"2\" aria-controls=\"lab-workbench\"><span class=\"step-number\">2</span>Workbench & test<span class=\"section-done\" aria-hidden=\"true\"></span></button><button type=\"button\" id=\"lab-tab-3\" data-lab-section=\"3\" aria-controls=\"lab-finish\" aria-expanded=\"false\" disabled aria-disabled=\"true\"><span class=\"step-number\">3</span>Check & explain<span class=\"section-done\" aria-hidden=\"true\"></span></button></nav>",

    '<div id="classroom-status"></div><div class="lab-grid">',
    '<aside id="lab-problem" class="case-sidebar" tabindex="0" role="region" aria-labelledby="lab-tab-1"><h2 class="lab-section-heading">1. Request &amp; clues</h2><section class="case-panel"><p class="eyebrow">READ THE TICKET</p><h2>'+esc(s.requester)+'</h2><blockquote>'+esc(s.brief)+'</blockquote><p class="intake-progress" id="intake-progress" role="status"></p></section><div id="lab-learning"></div>',
    '<section class="case-panel interview-panel"><div class="requester-profile"><span class="requester-avatar" aria-hidden="true">'+esc(persona.name.slice(0,1))+'</span><div><p class="eyebrow">REQUESTER</p><h3>'+esc(persona.name)+'</h3><p>'+esc(persona.role)+'</p></div></div><p class="requester-intro">'+esc(persona.intro)+'</p><h2>Ask '+esc(persona.name)+'</h2><p class="panel-help">This person sent the ticket. Ask at least one question about the problem.</p><section id="requester-options" aria-label="Optional cloud replies"><p id="requester-cloud-help" class="panel-help">Online replies start off. Keep personal details out. Turning them on contacts an external AI service, which receives connection information. Some replies also send a made-up lab ID and preset topic; your typed question stays here. <a href="#privacy">Reply privacy</a></p><button type="button" class="question-button" data-ai-toggle aria-pressed="false" aria-describedby="requester-cloud-help">AI replies off</button><p data-ai-status role="status"></p></section><form id="question-form" class="requester-composer"><label class="lab-field" for="student-question">Your question<textarea id="student-question" maxlength="240" rows="2" placeholder="What happened before the problem started?" aria-describedby="question-help"></textarea></label><button class="button" type="submit">Send question</button></form><p id="question-help" class="panel-help">Use fictional details only. Do not enter names, contact details, student IDs, passwords, health information, or private incidents. Replies may be wrong. <a href="ai-use-notice.html" target="_blank" rel="noopener noreferrer">AI use and limits</a></p><div class="requester-live-reply sr-only" role="status" aria-live="polite" aria-atomic="true"><p id="reply-source"></p><p id="question-response"></p></div><div id="question-suggestions" class="interview-suggestions" role="group" aria-label="Suggested follow-up questions" hidden></div><details class="intake-questions"><summary>Need a question starter?</summary>'+s.questions.map((q,i)=>'<button data-question="'+i+'" class="question-button" aria-pressed="'+String(r.questions.includes(i))+'">'+esc(q.label)+' <span>'+(r.questions.includes(i)?'Read':'+')+'</span></button>').join('')+'</details><section class="conversation-history" aria-labelledby="conversation-heading"><h3 id="conversation-heading">Conversation history</h3><p id="conversation-help" class="sr-only">The latest eight question and reply pairs appear here, newest at the bottom. Use the arrow keys to scroll this conversation. Extra chat stays in this page session; accepted case questions can go into your report.</p><div id="interview-history" class="interview-history" tabindex="0" role="log" aria-label="Conversation history" aria-describedby="conversation-help" aria-live="off">'+interviewList(r,s)+'</div></section></section>',
    '<section class="case-panel repair-notes"><h2>Clues &amp; evidence</h2><p class="panel-help">Click and read at least two clues to continue. “Ask first”? Ask about that detail above.</p><p id="clues-progress" class="step-progress" role="status"></p><div class="clue-buttons">'+s.clues.map(c=>'<button data-clue="'+esc(c.id)+'" class="question-button '+(r.evidence.includes(c.id)?'logged':'')+'" aria-pressed="'+String(r.evidence.includes(c.id))+'">'+esc(c.label)+' <span>'+(r.evidence.includes(c.id)?'Read':'+')+'</span></button>').join('')+'</div><div id="evidence-detail" class="question-response" aria-live="polite"></div></section>',
    '<section class="case-panel guide-plan"><h2>My first idea</h2><form id="idea-form" novalidate><label class="lab-field" for="symptoms">What are the symptoms?<textarea id="symptoms" maxlength="2000" rows="3" aria-describedby="symptoms-help symptoms-error" required placeholder="I notice…">'+esc(r.symptoms)+'</textarea></label><p id="symptoms-error" class="field-error" role="alert" hidden></p><p id="symptoms-help" class="panel-help">Describe what is happening. Include details from the ticket or clues.</p><label class="lab-field" for="plan">What do you think is causing the problem?<textarea id="plan" maxlength="2000" rows="3" aria-describedby="plan-help plan-error" required placeholder="I think… because…">'+esc(r.plan)+'</textarea></label><p id="plan-error" class="field-error" role="alert" hidden></p><p id="plan-help" class="panel-help">This is your hypothesis. Explain your possible cause and the clue that supports it.</p><button id="save-idea" class="button" type="submit">Save first idea</button><p id="idea-status" class="step-progress" role="status"></p></form></section><div class="page-one-actions"><p id="page-one-progress" class="step-progress" role="status" tabindex="-1"></p><button id="page-one-next" class="button" data-jump-section="2" aria-describedby="page-one-progress" disabled>Next: Workbench &amp; test →</button></div></aside>',
    '<div id="lab-workbench" class="bench-column" tabindex="0" role="region" aria-labelledby="lab-tab-2" hidden><h2 class="lab-section-heading">2. Workbench &amp; test</h2><ol class="workbench-steps" aria-label="Workbench steps"><li>Inspect the equipment.</li><li>Make one change.</li><li>Test your idea below.</li></ol><div id="workspace" class="workspace"></div><div id="action-feedback" class="action-feedback" role="status">'+esc(r.events.length?eventMessage(r.events.at(-1)):'Choose a part to inspect. Then make one change.')+'</div>',
    '<section class="case-panel hypothesis-test" aria-labelledby="test-idea-title"><h2 id="test-idea-title">Test my idea</h2><p class="panel-help">Your first idea may not work. The test helps you decide what to try next.</p><h3>Symptoms</h3><p id="experiment-symptoms">'+esc(r.symptoms)+'</p><h3>My first idea</h3><p id="experiment-hypothesis">'+esc(r.plan||'Save your first idea on page 1.')+'</p><details class="idea-support"><summary>Clues &amp; replies from page 1</summary><h3>My clues</h3><div id="first-idea-evidence">'+evidenceList(s,r)+'</div><h3>My questions &amp; replies</h3><div id="first-idea-questions">'+interviewList(r,s)+'</div></details><p class="panel-help">'+esc(s.track==='hardware'?'Make your change above. When the desktop appears, click Lesson_Practice_File.docx on the monitor. Then test your idea.':'Save or apply your change above. Then test your idea.')+'</p><button class="button" id="run-hypothesis-test">Test my idea</button><div id="experiment-result" class="experiment-result" role="status">Make one change, then select Test my idea.</div></section>',
    s.secondLook?'<details id="second-look" class="case-panel second-look"><summary>Get a second look</summary><p>'+esc(s.secondLook.prompt)+'</p><ul>'+s.secondLook.checks.map(check=>'<li>'+esc(check)+'</li>').join('')+'</ul><p class="panel-help">Working on your own? Read your steps aloud and check them one at a time.</p></details>':'',
    '<div id="experiment-tools"></div><section class="case-panel bench-log" aria-labelledby="action-log-title"><div class="panel-title"><h2 id="action-log-title">Action log</h2><span id="action-count">'+r.events.length+' actions</span></div><p class="panel-help">Your steps appear here, in order. Up to 100 saved steps are kept.</p><ol id="bench-log" tabindex="0" aria-label="Saved investigation steps">'+eventList(r)+'</ol></section><p id="workbench-test-status" class="step-progress" role="status">Test your change, then explain what happened.</p><div class="lab-step-actions"><button class="lab-tool" data-jump-section="1">← Request &amp; clues</button><button id="workbench-next" class="button" data-jump-section="3" aria-describedby="workbench-test-status" disabled>Next: Check &amp; explain →</button></div></div>',
    '<aside id="lab-finish" class="evidence-sidebar" tabindex="0" role="region" aria-labelledby="lab-tab-3" hidden><h2 class="lab-section-heading">3. Check & explain</h2><section class="case-panel"><div class="panel-title"><h2>Explain what you tried</h2><span id="clue-count">'+r.evidence.length+' clues</span></div><section class="collected-clues"><h3>Your collected clues</h3><div class="evidence-list" id="evidence-list">'+evidenceList(s,r)+'</div></section><label class="lab-field">What did you change, and what did the test show?<textarea id="notes" aria-describedby="notes-error" maxlength="4000" rows="4" placeholder="I tried… The result was…">'+esc(r.notes)+'</textarea></label><p id="notes-error" class="field-error" role="alert" hidden></p><label class="lab-field">Does the evidence support your hypothesis? Why?<textarea id="reflection" aria-describedby="reflection-error" maxlength="2000" rows="3" placeholder="The evidence supports / changes my idea because…">'+esc(r.reflection)+'</textarea></label><p id="reflection-error" class="field-error" role="alert" hidden></p><p class="panel-help">Use your own words. Write a sentence for each answer.</p></section>',
    '<section class="case-panel verification-panel"><p class="eyebrow">CHECK THE GOAL</p><h2>Does the requested task work?</h2><p>'+esc(s.goal)+'</p><button class="button" id="verify-task">Check the original task</button><div class="verify-result" id="verify-result" role="status">'+(r.verified?'✓ The original task works.':'')+'</div><h3>Before you finish</h3><ul class="lab-finish-checklist">'+(s.intake?.kind==='follow-up'?'<li data-finish-check="inquiry">Clarify the missing request detail <span></span></li>':'')+'<li data-finish-check="clues">Collect two clues <span></span></li><li data-finish-check="plan">Explain your first idea <span></span></li><li data-finish-check="notes">Describe what you tried <span></span></li><li data-finish-check="reflection">Explain what you learned <span></span></li><li data-finish-check="verified">Check the original task <span></span></li></ul><button class="button" id="close-ticket">Finish investigation & open report</button><p class="save-status">'+esc(workStatus(r,workStorage))+'</p><div class="lab-step-actions"><button class="lab-tool" data-jump-section="2">↑ Workbench</button></div><button class="text-button" id="reset-ticket" aria-expanded="false" aria-controls="reset-confirm">Start this lab again</button><div id="reset-confirm" role="group" aria-labelledby="reset-question" hidden><p id="reset-question">This clears this lab’s current work and any saved copy when device saving is on. Export first.</p><button id="confirm-reset" class="lab-tool">Start over</button> <button id="cancel-reset" class="lab-tool">Keep my work</button></div></section></aside></div>',
    '<div id="work-privacy" hidden></div></section>',
    '<dialog id="lab-dialog"><div id="dialog-content"></div><button id="dialog-close" class="button button-outline">Close</button></dialog>'
  ].join('');
}
function evidenceList(s,r){return r.evidence.length?`<ul>${r.evidence.map(id=>`<li>${esc(s.clues.find(c=>c.id===id)?.text||'Clue recorded')}</li>`).join('')}</ul>`:'<p class="panel-help">No clues recorded yet. Inspect a clue to add it here.</p>';}
function interviewList(r,s=null){return conversationPairsHTML(readQuestionEvents(r.events).slice(-8).map(pair=>({...pair,source:'Case reply'})),s?requesterPersona(s)?.name:'Requester');}
function conversationPairsHTML(pairs,name='Requester'){
  return pairs.length?pairs.slice(-8).map(pair=>'<article class="interview-pair"><div class="interview-turn interview-user"><strong class="interview-speaker">You</strong><p>'+esc(pair.question)+'</p></div><div class="interview-turn interview-requester"><strong class="interview-speaker">'+esc(name)+'</strong><p>'+esc(pair.answer)+'</p><span class="interview-source">'+esc(pair.source||'Case reply')+'</span></div></article>').join(''):'<p class="conversation-empty">Send a message to start the conversation.</p>';
}
function firstPageProgress(s,r){
  const inquiry=inquiryProgress(s,r.events),pairs=readQuestionEvents(r.events);
  const asked=pairs.some((pair,index)=>{const reply=answerQuestion(s,pair.question,{},pairs.slice(Math.max(0,index-8),index));return reply.accepted&&reply.kind==='answer'&&!['conversation','how-to','privacy','scope','safety'].includes(reply.topic);});
  const clues=new Set(r.evidence.filter(id=>s.clues.some(c=>c.id===id&&(!c.requiresFact||inquiry.found.includes(c.requiresFact))))).size;
  const symptoms=typeof r.symptoms==='string'&&r.symptoms.trim().length>=12;
  const hypothesis=typeof r.plan==='string'&&r.plan.trim().length>=12;
  const saved=symptoms&&hypothesis&&r.ideaSaved===true;
  const ready=asked&&inquiry.complete&&clues>=2&&saved;
  const message=!asked?'Ask a question about the problem.':!inquiry.complete?inquiry.message:clues<2?'Read '+(2-clues)+' more clue'+(clues===0?'s':'')+'.':!saved?'Write both answers, then select Save first idea.':'Page 1 complete. You can continue.';
  return {asked,inquiry,clues,symptoms,hypothesis,saved,ready,message};
}
function eventMessage(event){const pair=readQuestionEvents([event])[0];return pair?'Question: '+pair.question+' / Reply: '+pair.answer:(experimentEventText(event,{compact:true})||event.message);}
function eventList(r){return r.events.length?r.events.map(e=>`<li><time>${new Date(e.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time><span>${esc(eventMessage(e))}</span></li>`).join(''):'<li class="empty-log">Your steps will appear here.</li>';}
function bindLab(s,route=null,{onModeChange=null}={}){
  bindWorkPrivacy(s);
  const r=recordFor(s),language=labLanguage(s),workspace=$('#workspace'),shell=$('.lab-shell');
  const panels=[$('.case-sidebar'),$('.bench-column'),$('.evidence-sidebar')];
  const tabs=$$('[data-lab-section]');
  const context={mode:route?.mode||'guided',sequence:route?.sequence||null};
  const chatPairs=readQuestionEvents(r.events).slice(-8).map(pair=>({...pair,source:'Case reply'}));
  const requester=mountRequesterChat($('#requester-options'),{scenario:s});
  const renderChat=(followLatest=true)=>{const log=$('#interview-history'),nearBottom=log.scrollHeight-log.clientHeight-log.scrollTop<64;log.innerHTML=conversationPairsHTML(chatPairs,requesterPersona(s).name);if(followLatest||nearBottom)log.scrollTop=log.scrollHeight;};
  const pageNames=['Request & clues','Workbench & test','Check & Explain'];
  const currentMode=()=>$('#learning-mode')?.value||context.mode;
  const renderBench=()=>{
    if(s.track==='hardware'){
      renderHardware(workspace,s.id,r.state,action);
      setHardwareVisible(workspace,shell.dataset.section==='2');
    }else renderWorkspace(workspace,s,r.state,action);
  };
  function currentTaskResult(){
    if(s.track==='coding'&&$('#coding-editor').value!==r.state.code)return {ok:false,message:'Your editor contains untested changes. Return to the workbench and run all fixtures for this version before checking or finishing.'};
    return s.track==='hardware'?verifyHardware(s.id,r.state):verifyWorkspace(s.id,r.state);
  }
  function jumpToSection(section,moveFocus=true,focusTab=false,writeHistory=true){
    const requested=Number(section);
    let index=Number.isInteger(requested)&&requested>=1&&requested<=3?requested-1:0;
    const progress=firstPageProgress(s,r);
    if(index>0&&!progress.ready){
      if(moveFocus){$('#page-one-progress').textContent=progress.message;showNotice(progress.message);$('#page-one-progress').focus({preventScroll:true});}
      index=0;
    }
    if(index===2&&!workbenchProgress(s,r,currentTaskResult()).ready){
      index=progress.ready&&labView?.section!==1?1:0;
      if(moveFocus)showNotice(workbenchProgress(s,r,currentTaskResult()).message);
    }
    if(index!==1){if(s.track==='hardware')cancelHardwareInteraction(workspace);cancelCodingWorkbench(workspace);}
    labView={id:s.id,section:index+1};
    shell.dataset.section=String(index+1);
    tabs.forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');if(i===2)button.setAttribute('aria-expanded',String(index===2));});
    // Keep controls mounted so unapplied settings, questions, and code survive
    // navigation. Native hidden removes inactive pages from focus and layout.
    panels.forEach((panel,i)=>{panel.hidden=i!==index;});
    $('.lab-topbar .back-link').hidden=index===1;
    $('#saving-options').hidden=index===1;$('#report-button').hidden=index===1;
    if(index===1)$('#work-privacy').hidden=true;
    refreshStatus();
    $('#lab-page-title').textContent=pageNames[index];
    $('#lab-page-progress').textContent='PAGE '+(index+1)+' OF 3';
    document.title=pageNames[index]+' · '+s.id+' · '+s.title+' · Cole Learning Labs';
    if(s.track==='hardware')setHardwareVisible(workspace,index===1);
    if(writeHistory){
      const hash=labPageHash(s.id,index+1,{mode:currentMode(),sequence:context.sequence});
      if(location.hash!==hash)history.pushState(null,'',hash);
    }
    document.dispatchEvent?.(new CustomEvent('cole:lab-section-change',{detail:{id:s.id,section:index+1}}));
    if(moveFocus){if(index<2)panels[index].scrollTop=0;(focusTab?tabs[index]:panels[index]).focus({preventScroll:true});$('#lab-page-title').scrollIntoView({block:'start',behavior:'instant'});}
  }
  function syncRoute(next,moveFocus=true){
    if(next.page!=='lab'||next.id!==s.id||(next.sequence||null)!==context.sequence)return false;
    if(next.mode!==currentMode()){
      // Browser history can restore an earlier support mode. Only its guidance
      // changes; the mounted workspace and every unfinished draft stay intact.
      onModeChange?.(next.mode);
      context.mode=next.mode;
      const modeControl=$('#learning-mode');if(modeControl)modeControl.value=next.mode;
    }
    jumpToSection(next.section,moveFocus,false,false);
    return true;
  }
  function refreshStatus(){
    const progress=firstPageProgress(s,r),inquiry=progress.inquiry,testing=workbenchProgress(s,r,currentTaskResult());
    $('#intake-progress').textContent=inquiry.required?inquiry.message:'Read the ticket. Then ask about the problem.';
    $$('[data-clue]').forEach(button=>{const clue=s.clues.find(c=>c.id===button.dataset.clue);const available=!clue.requiresFact||inquiry.found.includes(clue.requiresFact);button.setAttribute('aria-disabled',String(!available));button.querySelector('span').textContent=available?(r.evidence.includes(clue.id)?'Added':'+'):'Ask first';});
    $('#clues-progress').textContent=progress.clues+' of 2 clues read'+(progress.clues>=2?' · Done':'');
    $('#page-one-progress').textContent=progress.message;
    $('#page-one-next').disabled=!progress.ready;
    $('#idea-status').textContent=progress.saved?'First idea saved in this lab.':'Save both answers when you are ready.';
    $('#experiment-symptoms').textContent=r.symptoms||'Describe the symptoms on page 1.';
    $('#experiment-hypothesis').textContent=r.plan||'Save your first idea on page 1.';
    $('#first-idea-evidence').innerHTML=evidenceList(s,r);
    $('#first-idea-questions').innerHTML=interviewList(r,s);
    tabs.forEach((button,index)=>{const locked=index>0&&(!progress.ready||(index===2&&!testing.ready));button.disabled=locked;button.setAttribute('aria-disabled',String(locked));});
    $('#workbench-next').disabled=!progress.ready||!testing.ready;
    $('#workbench-test-status').textContent=testing.message;
    const checks={inquiry:progress.asked&&inquiry.complete,clues:progress.clues>=2,plan:progress.saved,notes:r.notes.trim().length>=15,reflection:r.reflection.trim().length>=15,verified:r.verified===true};
    const done=[progress.ready,testing.ready,r.closed];
    tabs.forEach((button,index)=>{button.classList.toggle('is-complete',done[index]);button.querySelector('.section-done').textContent=done[index]?'✓':'';});
    $$('[data-finish-check]').forEach(item=>{const complete=checks[item.dataset.finishCheck]===true;item.classList.toggle('is-complete',complete);item.querySelector('span').textContent=complete?'Done':'To do';});
    $('.save-status').textContent=workStatus(r,workStorage);$('#action-count').textContent=r.events.length+' actions';
  }
  function logEvent(event){r.events.push({time:new Date().toISOString(),kind:event.kind,message:event.message.slice(0,600)});r.events=retainExperimentEvents(s,r.events);$('#bench-log').innerHTML=eventList(r,s);}
  function action(id,value){
    const beforeState=r.state;
    const pending=id.startsWith('bench-')?[...workspace.querySelectorAll('select[name]')].filter(input=>input.value!==beforeState[input.name]).map(input=>[input.name,input.value]):[];
    const result=s.track==='hardware'?applyHardwareAction(s.id,r.state,id):applyWorkspaceAction(s.id,r.state,id,value);
    r.state=result.state;
    const inspectOnly=id==='enable-assembly'||id.startsWith('inspect-')||(s.track==='hardware'&&id.startsWith('view-'));
    if(!inspectOnly){r.verified=false;r.closed=false;$('#verify-result').textContent='';$('#experiment-result').textContent='The setup changed. Select Test my idea for a new result.';$('#experiment-result').dataset.kind='info';$('#workbench-test-status').textContent='Test this change before you explain your result.';}
    logEvent(result);save();
    if(id!=='inspect-command'){renderBench();for(const [name,draft] of pending)if(r.state[name]===beforeState[name]){const input=[...workspace.querySelectorAll('select[name]')].find(item=>item.name===name);if(input)input.value=draft;}}
    $('#action-feedback').textContent=result.message;$('#action-feedback').dataset.kind=result.kind;refreshStatus();document.dispatchEvent?.(new CustomEvent('cole:lab-state-change',{detail:{id:s.id,changed:!inspectOnly}}));
    return result;
  }
  function ask(question,reply){
    requester.cancel();
    $('#reply-source').textContent=reply.kind==='casual'?'Offline reply · extra chat, not a case clue':reply.accepted?'Case reply · compare it with your evidence':'';
    $('#question-response').textContent=reply.answer;
    let pair=null;
    if(reply.accepted){pair={question:question.trim(),answer:reply.answer,kind:reply.kind,topic:reply.topic,source:reply.kind==='casual'?'Offline reply · extra chat':'Case reply'};chatPairs.push(pair);if(chatPairs.length>8)chatPairs.shift();renderChat();}
    else{const log=$('#interview-history');log.innerHTML=conversationPairsHTML(chatPairs,requesterPersona(s).name)+'<p class="conversation-feedback">'+esc(reply.answer)+'</p>';log.scrollTop=log.scrollHeight;}
    requester.enrich(question,reply,answer=>{if(!pair)return;pair.answer=answer;pair.source='AI reply · may be wrong; not case evidence';$('#reply-source').textContent='AI reply · may be wrong; not case evidence';$('#question-response').textContent=answer;renderChat(false);});
    const suggestions=$('#question-suggestions');
    suggestions.replaceChildren();
    const prompts=Array.isArray(reply.suggestions)?[...new Set(reply.suggestions.filter(value=>typeof value==='string'&&value.trim()&&value.length<=240).map(value=>value.trim()))].slice(0,3):[];
    suggestions.hidden=prompts.length===0;
    if(prompts.length){
      const help=document.createElement('p');help.className='panel-help';help.textContent=language.followUpPrompt;suggestions.appendChild(help);
      for(const prompt of prompts){
        const button=document.createElement('button');button.type='button';button.className='question-button interview-followup';button.textContent=prompt;
        button.addEventListener('click',()=>{ask(prompt,answerQuestion(s,prompt,r.state,chatPairs.length?chatPairs:readQuestionEvents(r.events)));$('#student-question').focus({preventScroll:true});});
        suggestions.appendChild(button);
      }
    }
    const event=questionEvent(question,reply);
    if(event){logEvent(event);r.closed=false;save();refreshStatus();}
  }
  // Mount the workbench once without repairing the ticket or awarding progress.
  // It remains paused while either of the other pages is open.
  renderBench();if(s.track==='hardware'&&!r.state.assemblyEnabled)action('enable-assembly');
  jumpToSection(route?.section??(labView?.id===s.id?labView.section:1),false,false,false);
  $('#question-form').addEventListener('submit',event=>{
    event.preventDefault();
    const input=$('#student-question'),question=input.value;
    const reply=answerQuestion(s,question,r.state,chatPairs.length?chatPairs:readQuestionEvents(r.events));
    ask(question,reply);input.value='';input.focus({preventScroll:true});
  });
  if(s.track==='coding')workspace.addEventListener('input',()=>refreshStatus());
  $$('[data-question]').forEach(button=>button.addEventListener('click',()=>{const i=Number(button.dataset.question);if(!r.questions.includes(i))r.questions.push(i);button.setAttribute('aria-pressed','true');button.querySelector('span').textContent='Read';ask(s.questions[i].label,answerQuestion(s,s.questions[i].label,r.state,readQuestionEvents(r.events)));}));
  $$('[data-clue]').forEach(button=>button.addEventListener('click',()=>{const clue=s.clues.find(c=>c.id===button.dataset.clue);if(clue.requiresFact&&!inquiryProgress(s,r.events).found.includes(clue.requiresFact)){$('#evidence-detail').textContent=s.intake.missing;$('#student-question').focus();return;}if(!r.evidence.includes(clue.id))r.evidence.push(clue.id);button.classList.add('logged');button.setAttribute('aria-pressed','true');button.querySelector('span').textContent='Added';$('#evidence-detail').textContent=clue.text;$('#evidence-list').innerHTML=evidenceList(s,r);$('#clue-count').textContent=r.evidence.length+' clues';save();refreshStatus();}));
  function writingError(field,message=''){
    const input=$('#'+field),error=$('#'+field+'-error');
    error.textContent=message;error.hidden=!message;
    if(message)input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');
  }
  ['symptoms','plan','notes','reflection'].forEach(field=>$('#'+field).addEventListener('input',event=>{r[field]=event.target.value;r.closed=false;if(r[field].trim().length>=(field==='symptoms'||field==='plan'?12:15))writingError(field);if(field==='symptoms'||field==='plan'){r.ideaSaved=false;r.verified=false;$('#experiment-result').textContent='Your first idea changed. Save it, then test again.';$('#experiment-result').dataset.kind='info';$('#workbench-test-status').textContent='Test your saved idea before you explain the result.';}save();refreshStatus();if((field==='symptoms'||field==='plan')&&labView?.section>1)jumpToSection(1,false);}));
  $('#idea-form').addEventListener('submit',event=>{
    event.preventDefault();
    const progress=firstPageProgress(s,r);
    for(const [field,valid] of [['symptoms',progress.symptoms],['plan',progress.hypothesis]])writingError(field,valid?'':'Write a full sentence for this answer.');
    if(!progress.symptoms||!progress.hypothesis){
      $('#idea-status').textContent=!progress.symptoms?'Describe the symptoms in a full sentence.':'Explain your possible cause and a supporting clue in a full sentence.';
      $('#'+(!progress.symptoms?'symptoms':'plan')).focus();return;
    }
    r.ideaSaved=true;r.closed=false;
    $('#experiment-result').textContent='Make one change, then select Test my idea.';
    $('#workbench-test-status').textContent='Test your change, then explain what happened.';
    save();refreshStatus();
  });
  function runHypothesisTest(prediction=r.plan,{firstIdea=true}={}){
    if(!firstPageProgress(s,r).ready){jumpToSection(1,true);showNotice(firstPageProgress(s,r).message);return false;}
    if(typeof prediction!=='string'||prediction.trim().length<12){$('#experiment-result').textContent='Write a full sentence for your idea before testing.';return false;}
    if(s.track!=='hardware')action('run-check',s.track==='coding'?{code:$('#coding-editor').value}:undefined);
    const result=s.track==='hardware'?verifyHardware(s.id,r.state):verifyWorkspace(s.id,r.state);
    r.verified=result.ok;r.closed=false;
    const observed=(result.ok?'The task works. ':result.needsDocument?'':'Not fixed yet. ')+result.message;
    logEvent({kind:result.ok?'success':'warning',message:'Hypothesis test — '+prediction.trim().slice(0,140)+' / Observed: '+observed});
    const next=result.ok?' Explain what worked in Check & explain.':result.needsDocument?' Then select Test my idea again.':' Use the Experiment notebook below to try your next idea.';
    if(firstIdea){$('#experiment-result').textContent=observed+next;$('#experiment-result').dataset.kind=result.ok?'success':'warning';}
    $('#workbench-test-status').textContent=result.ok?'Your fix works. Continue to Check & explain.':result.needsDocument?'Open the lesson file on the monitor, then test again.':'Still stuck? Use the Experiment notebook to plan another test.';
    $('#verify-result').textContent=(result.ok?'✓ ':'Try again: ')+result.message;
    if(firstIdea)document.dispatchEvent?.(new CustomEvent('cole:lab-test-result',{detail:{id:s.id,firstIdea:true}}));
    save();refreshStatus();return true;
  }
  $('#run-hypothesis-test').addEventListener('click',()=>runHypothesisTest());
  $('#verify-task').addEventListener('click',()=>{const result=currentTaskResult();r.verified=result.ok;r.closed=r.closed&&result.ok;logEvent({message:'Verification: '+result.message,kind:result.ok?'success':'warning'});$('#verify-result').textContent=(result.ok?'✓ ':'Try again: ')+result.message;save();refreshStatus();});
  $('#close-ticket').addEventListener('click',()=>{
    const current=currentTaskResult(),testing=workbenchProgress(s,r,current);
    if(!testing.ready){if(!current.ok){r.verified=false;$('#verify-result').textContent='Try again: '+current.message;}r.closed=false;save();refreshStatus();jumpToSection(2,true);showNotice(current.ok?testing.message:current.message);return;}
    const check=currentTaskResult();
    if(!check.ok){r.verified=false;r.closed=false;save();refreshStatus();$('#verify-result').textContent='The task is not ready yet. '+check.message+' Return to the workbench to keep trying.';return;}
    const progress=firstPageProgress(s,r);
    if(!progress.ready){jumpToSection(1,true);showNotice(progress.message);$('#'+(!progress.asked||!progress.inquiry.complete?'student-question':!progress.symptoms?'symptoms':'plan')).focus();return;}
    if(r.notes.trim().length<15||r.reflection.trim().length<15){for(const field of ['notes','reflection'])writingError(field,r[field].trim().length<15?'Write a sentence for this answer.':'');$('#verify-result').textContent='Write a sentence about what you tried and a sentence explaining whether the evidence supports your idea. Then finish your investigation.';$('#'+(r.notes.trim().length<15?'notes':'reflection')).focus();return;}
    r.verified=true;r.closed=true;save();refreshStatus();showNotice('Investigation finished. Review your report before exporting.');openReport(s,r);
  });
  $('#reading-toggle').addEventListener('click',event=>{const on=shell.classList.toggle('larger-reading');event.target.setAttribute('aria-pressed',String(on));});
  tabs.forEach((button,index)=>{
    button.addEventListener('click',()=>jumpToSection(button.dataset.labSection,true,true));
    button.addEventListener('keydown',event=>{
      const target={ArrowLeft:(index+2)%3,ArrowRight:(index+1)%3,Home:0,End:2}[event.key];
      if(target===undefined)return;
      event.preventDefault();jumpToSection(target+1,true,true);
    });
  });
  $$('[data-jump-section]').forEach(button=>button.addEventListener('click',()=>jumpToSection(button.dataset.jumpSection,true)));
  $('#saving-options').addEventListener('click',()=>{const host=$('#work-privacy');host.hidden=!host.hidden;if(!host.hidden){const options=$('#work-privacy details');options.open=true;options.querySelector('summary').focus({preventScroll:true});options.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}});
  $('#report-button').addEventListener('click',()=>openReport(s,r));
  $('#reset-ticket').addEventListener('click',()=>{$('#reset-confirm').hidden=false;$('#reset-ticket').setAttribute('aria-expanded','true');$('#cancel-reset').focus({preventScroll:true});});
  const cancelReset=()=>{$('#reset-confirm').hidden=true;$('#reset-ticket').setAttribute('aria-expanded','false');$('#reset-ticket').focus({preventScroll:true});};
  $('#cancel-reset').addEventListener('click',cancelReset);
  $('#reset-confirm').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();cancelReset();}});
  $('#confirm-reset').addEventListener('click',()=>{resetLabImprovements();delete store.labs[s.id];labView={id:s.id,section:1};history.replaceState(null,'',labPageHash(s.id,1,{mode:currentMode(),sequence:context.sequence}));save();renderRoute(false);$('#main').focus({preventScroll:true});});
  $('#dialog-close').addEventListener('click',()=>$('#lab-dialog').close());refreshStatus();
  classroomConnection=classroomSharingPaused?null:attachClassroomLab({scenarioId:s.id,record:r,storageKey,onRestore:work=>{store.labs[s.id]=normalizeLabRecord(s,work);save();renderRoute(false);}});
  return {runHypothesisTest,currentTaskResult,refreshStatus,syncRoute,dispose(){if(s.track!=='hardware')disposeWorkspace(workspace);requester.dispose();chatPairs.length=0;}};
}

function hardwareCableSummary(h){return [
  ['AC power',h.acConnected],['HDMI PC end',h.pcVideoConnected!==false],['HDMI monitor end',h.signalConnected],
  ['ATX 24-pin',h.atxConnected],['CPU 8-pin',h.cpuPowerConnected],['GPU power',h.gpuPowerConnected],
  ['SATA data',h.sataDataConnected],['SATA power',h.sataPowerConnected],['Front panel',h.frontPanelConnected],
  ...(h.assemblyEnabled?[['CPU fan',h.assembly.cpuFanConnected]]:[])
].map(([label,connected])=>label+': '+(connected?'connected':'disconnected')).join('\n')+'\nPC video output: '+h.videoPort+'\nMonitor source: '+h.monitorInput;}
function reportText(s,r){return `COLE LEARNING LABS — INVESTIGATION REPORT\n${s.id} · ${s.title}\nGrades ${s.grade} · ${tracks[s.track].name}\nStatus: ${r.closed?'DELIVERED':r.verified?'TECHNICALLY VERIFIED — TICKET OPEN':'IN PROGRESS'}\n\nORIGINAL TASK\n${s.goal}\n\nEVIDENCE\n${r.evidence.map(id=>'- '+(s.clues.find(c=>c.id===id)?.text||id)).join('\n')||'No evidence recorded.'}\n\nQUESTIONS I ASKED\n${readQuestionEvents(r.events).map(pair=>'Q: '+pair.question+'\nRequester: '+pair.answer).join('\n\n')||'No interview questions recorded.'}\n\nSYMPTOMS\n${r.symptoms||'Not recorded.'}\n\nWORKING HYPOTHESIS\n${r.plan||'Not recorded.'}\n\nTEST NOTES\n${r.notes||'Not recorded.'}${s.track==='coding'?'\n\nPRACTICE LANGUAGE\n'+(r.state.language==='python'?'Python subset':'JavaScript subset')+'\n\nSAVED PRACTICE CODE\n'+(r.state.code||'Not recorded.')+'\n\nPRACTICE OUTPUT\n'+(Array.isArray(r.state.output)?r.state.output.join('\n'):r.state.output||'No output recorded.'):''}\n\nEXPERIMENT RECORD\n${experimentReport(r)}${s.track==='hardware'?'\n\nCABLE CONNECTIONS\n'+hardwareCableSummary(r.state):''}${s.track==='hardware'&&r.state.assemblyEnabled?'\n\nDETAILED ASSEMBLY STATUS\n'+['panel','psu','board','cooler','gpu','ssd'].map(group=>{const values=r.state.assembly[group+'Screws'];return group+': '+values.filter(Boolean).length+'/'+values.length+' screws secured';}).join('\n')+'\nThermal interface: '+r.state.assembly.paste+'\nCPU fan lead: '+(r.state.assembly.cpuFanConnected?'connected':'disconnected')+'\nCPU retention: '+(r.state.assembly.retentionOpen?'open':'closed')+'\nMemory clips: '+(r.state.assembly.ramClipsOpen?'open':'closed')+'\nPCIe latch: '+(r.state.assembly.pcieLatchOpen?'open':'closed'):''}\n\nACTION LOG\n${r.events.filter(e=>!readQuestionEvents([e]).length).map(e=>'- '+eventMessage(e)).join('\n')||'No actions recorded.'}\n\nREFLECTION\n${r.reflection||'Not recorded.'}\n\nThis is a simulated learning activity. Private-session work stays on this page unless exported or explicitly saved on this device. If you explicitly join an enabled classroom, assigned lab drafts and submitted snapshots may be shared with that teacher. Technical progress is student-reported; teachers review and grade submissions.\n`;}
function openReport(s,r,customContent){
  cancelHardwareInteraction($('#workspace'));
  cancelCodingWorkbench($('#workspace'));
  document.dispatchEvent?.(new CustomEvent('cole:lab-report-open'));
  reportCleanup?.();
  const content=typeof customContent==='string'?customContent:reportText(s,r),panel=$('#dialog-content'),dialog=$('#lab-dialog');
  const opener=typeof document!=='undefined'?document.activeElement:null;
  dialog.setAttribute('aria-labelledby','report-title');
  dialog.setAttribute('aria-describedby','report-review-help');
  panel.innerHTML=[
    '<p class="eyebrow">STUDENT REPORT</p><h2 id="report-title" tabindex="-1">'+esc(s.id)+' · '+esc(s.title)+'</h2>',
    '<p id="report-review-help">Review your notes for names, emails, student IDs, passwords, and private school details. Close this report and edit your lab notes to remove them before exporting. This tool does not automatically detect personal information.</p>',
    '<label class="lab-field">Review your report<textarea id="report-text" rows="10" readonly>'+esc(content)+'</textarea></label>',
    '<section class="report-plain" aria-labelledby="report-save-heading"><h3 id="report-save-heading">Download or save your work</h3><p>A plain-text copy can be read by anyone who can access it. Use only your teacher’s approved submission process. Saving this file does not submit it to your teacher. A save or share destination you choose, including a cloud folder, can receive the report.</p>',
    '<label class="privacy-checkbox"><input id="plain-report-confirm" type="checkbox"><span>I reviewed the report for private information and have approval to export an unencrypted copy.</span></label>',
    '<div class="button-row"><a class="button button-outline" id="download-report" download="'+esc(reportFilename(s.id))+'" aria-describedby="report-save-help" aria-disabled="true">Download .txt report</a><button class="button button-outline" id="share-report" disabled hidden>Save or share .txt</button><button class="button button-outline" id="copy-report" disabled>Copy report</button><button class="button button-outline" id="select-report" disabled>Select report text</button></div>',
    '<p id="report-save-help">On a Chromebook or Microsoft Edge, choose Download .txt, then check the browser’s Downloads list. On a tablet, choose Download .txt or, when offered, Save or share .txt and select your school-approved Files location. Your device or school may restrict these options. Keep this page open until you have checked the saved file.</p>',
    '<p id="report-plain-status" role="status" aria-live="polite"></p><p id="report-manual-help" hidden>Use Ctrl+C to copy the selected report on a keyboard. On a tablet, touch and hold the report, choose Select all, then Copy. Paste into your school-approved document app and save there. If copying is restricted, ask your teacher for the approved way to keep your work. Clear the clipboard before sharing this device.</p></section>',
    '<section class="report-encryption"><h3>Encrypt for your teacher</h3><p>Use a public key supplied through your teacher’s trusted school channel. Anyone with its matching private key and passphrase can decrypt this report. Encryption does not verify who wrote it.</p>',
    '<label class="lab-field">Teacher public key (.cllpub)<input id="report-public-key" type="file" accept=".cllpub" aria-describedby="report-fingerprint"></label>',
    '<p class="report-fingerprint" id="report-fingerprint" role="status">No public key selected.</p>',
    '<label class="privacy-checkbox"><input id="report-key-confirm" type="checkbox" disabled><span>I compared this fingerprint with the one supplied by my teacher through a trusted school channel.</span></label>',
    '<div class="button-row"><button class="button" id="encrypt-report" disabled>Encrypt this report</button><a class="button button-outline" id="encrypted-report-download" download="cole-lab-report.cllreport" hidden>Download encrypted report</a></div>',
    '<p role="status" id="report-encryption-status"></p><p><a href="secure-reports.html" target="_blank" rel="noopener noreferrer">Teacher key setup and report reader ↗</a>. Submit the downloaded file through your school’s approved process. This does not connect to Google Classroom. Your school’s submission system can still show your account identity and attachment metadata to authorized people.</p></section>'
  ].join('');
  let active=true,selection=0,publicFile='',plainArtifact=null,sharePending=false;
  const urls=createReportURLs(),keyInput=$('#report-public-key'),confirm=$('#report-key-confirm'),encrypt=$('#encrypt-report'),encrypted=$('#encrypted-report-download'),status=$('#report-encryption-status'),fingerprint=$('#report-fingerprint'),plain=$('#plain-report-confirm'),plainLink=$('#download-report'),copy=$('#copy-report'),share=$('#share-report'),select=$('#select-report'),plainStatus=$('#report-plain-status'),manualHelp=$('#report-manual-help');
  const current=token=>active&&dialog.open&&panel.isConnected&&selection===token;
  const plainAllowed=()=>active&&dialog.open&&panel.isConnected&&plain.checked;
  const reportActive=()=>typeof document!=='undefined'?document.activeElement:null;
  function restoreReportActionFocus(origin,target){
    if(!origin?.isConnected||!active||!dialog.open||!panel.isConnected)return;
    const focused=reportActive();
    if(!focused||focused===origin||focused===dialog||focused===document.body||!focused.isConnected||focused.disabled)target?.focus?.({preventScroll:true});
  }
  function clearPlain(){const url=plainLink.getAttribute('href');if(url)urls.release(url);plainArtifact=null;plainLink.removeAttribute('href');plainLink.setAttribute('aria-disabled','true');copy.disabled=true;select.disabled=true;share.disabled=true;share.hidden=true;plainStatus.textContent='';manualHelp.hidden=true;}
  function revokeLinks(){urls.clear();encrypted.hidden=true;encrypted.removeAttribute('href');plain.checked=false;clearPlain();}
  function cleanup(){if(!active)return;active=false;selection++;publicFile='';revokeLinks();panel.replaceChildren();dialog.removeEventListener('close',closed);if(reportCleanup===cleanup)reportCleanup=null;}
  function closed(){cleanup();if(opener?.isConnected)opener.focus?.({preventScroll:true});}
  reportCleanup=cleanup;dialog.addEventListener('close',closed);
  keyInput.addEventListener('change',async()=>{
    const token=++selection;publicFile='';confirm.checked=false;confirm.disabled=true;encrypt.disabled=true;keyInput.removeAttribute('aria-invalid');fingerprint.textContent='Checking public key…';status.textContent='';revokeLinks();
    try{
      const file=keyInput.files?.[0];
      if(!file||!file.name.toLowerCase().endsWith('.cllpub')||file.size<1||file.size>16000)throw new Error('Invalid file.');
      const text=await file.text(),cryptoModule=await import('./report-crypto.js?release=20261025-learning-plans');
      const result=await cryptoModule.inspectPublicKey(text);
      if(!current(token))return;
      publicFile=text;fingerprint.textContent=result.fingerprint;confirm.disabled=false;
    }catch{if(current(token)){keyInput.setAttribute('aria-invalid','true');fingerprint.textContent='Public key could not be read. Use the .cllpub file supplied by your teacher.';}}
  });
  confirm.addEventListener('change',()=>{encrypt.disabled=!confirm.checked||!publicFile;});
  encrypt.addEventListener('click',async()=>{
    if(!confirm.checked||!publicFile)return;
    const token=selection,key=publicFile,focused=reportActive(),origin=[encrypt,keyInput,confirm].includes(focused)?focused:null;
    encrypt.disabled=true;keyInput.disabled=true;confirm.disabled=true;encrypted.hidden=true;status.textContent='Encrypting on this device…';
    try{
      const cryptoModule=await import('./report-crypto.js?release=20261025-learning-plans');
      const protectedReport=await cryptoModule.encryptReport(key,{report:content,alias:cryptoModule.generateAlias()});
      if(!current(token))return;
      const url=urls.create(new Blob([protectedReport],{type:'application/octet-stream'}));encrypted.href=url;encrypted.hidden=false;
      status.textContent='Encrypted report ready. Only holders of the matching private key and passphrase can open its contents. Upload through your school’s approved process.';
    }catch{if(current(token))status.textContent='The report could not be encrypted. Check the teacher key and use a current browser over HTTPS.';}
    finally{if(current(token)){keyInput.disabled=false;confirm.disabled=false;encrypt.disabled=!confirm.checked;restoreReportActionFocus(origin,encrypted.hidden?encrypt:encrypted);}}
  });
  encrypted.addEventListener('click',()=>{const url=encrypted.getAttribute('href');if(url)urls.requested(url);});
  plain.addEventListener('change',()=>{
    clearPlain();
    if(!plainAllowed())return;
    copy.disabled=false;select.disabled=false;
    try{
      plainArtifact=createTextReport(content,s.id);
      share.hidden=!canShareTextReport(plainArtifact);share.disabled=sharePending;
      try{plainLink.href=urls.create(plainArtifact.blob);plainLink.removeAttribute('aria-disabled');plainStatus.textContent='Ready: '+plainArtifact.filename+'. Choose a save option above.';}
      catch{plainStatus.textContent='This browser could not prepare a download. Use Copy report, Select report text, or the available device save option.';}
    }catch{plainStatus.textContent='This browser could not prepare a file. Use Copy report or Select report text.';}
  });
  plainLink.addEventListener('click',event=>{const url=plainLink.getAttribute('href');if(!plainAllowed()||!plainArtifact||!url){event.preventDefault();return;}urls.requested(url);plainStatus.textContent='Download requested: '+plainArtifact.filename+'. Check Downloads or Files and open the file to confirm your work was saved. This page cannot confirm that the browser saved it.';});
  function selectText(){if(!plainAllowed())return;const text=$('#report-text');try{text.focus?.();text.select();}catch{/* Device text controls remain available when programmatic selection is restricted. */}manualHelp.hidden=false;plainStatus.textContent='Select and copy the report text above, then paste and save in your school-approved document app.';}
  select.addEventListener('click',selectText);
  copy.addEventListener('click',async()=>{if(!plainAllowed())return;try{await navigator.clipboard.writeText(content);if(plainAllowed())plainStatus.textContent='Report copied. Paste and save in your school-approved document app. Clear the clipboard before sharing this device.';}catch{if(plainAllowed())selectText();}});
  share.addEventListener('click',async()=>{
    if(!plainAllowed()||!plainArtifact||sharePending)return;
    const artifact=plainArtifact,focused=reportActive(),origin=focused===share?focused:null;sharePending=true;share.disabled=true;plainStatus.textContent='Choose a school-approved destination in your device’s save or share menu.';
    const result=await shareTextReport(artifact);
    sharePending=false;
    if(!plainAllowed())return;
    share.disabled=false;
    if(plainArtifact!==artifact)return;
    plainStatus.textContent=result==='opened'?'The device save or share menu was opened. Check the chosen destination and open the file to confirm it was saved. This page cannot confirm saving or submission.':result==='cancelled'?'The save or share menu was cancelled or had no destination. Nothing is confirmed saved. Try Download .txt or Copy report.':'Device saving or sharing is unavailable or blocked. Try Download .txt, Copy report, or Select report text.';
    restoreReportActionFocus(origin,share);
  });
  dialog.showModal();
  $('#report-title').focus({preventScroll:true});
}

function curriculumDownloads(){if(!MEMBER_CONTENT)return '<section class="wrap section membership-teaser"><p class="eyebrow">Member teaching resources</p><h2>Workbooks, quizzes and lesson packs</h2><p>These resources are reserved for adult members. Free beginner courses and sample investigations remain available without an account.</p><a class="button button-outline" href="#membership">View membership information →</a></section>';return `<section class="wrap section curriculum-downloads" aria-labelledby="curriculum-title"><p class="eyebrow">Write it down</p><h2 id="curriculum-title">Prefer to write it down?</h2><p>The web companions include the same student prompts and quiz questions with labeled response fields for keyboard and screen-reader use. Entries stay temporarily in that page; they are not automatically saved, uploaded or graded. Copy your answers or use browser Print, and check the print preview before leaving.</p><div class="curriculum-grid"><article><h3>Student investigation workbook</h3><p>Blank prompts for the three lab sections, questions, hypothesis tests, experiments, and reflection. Record your own evidence from the current lab.</p><p><a class="button" href="student-workbook.html">Open workbook web version</a></p><a class="button button-outline" href="assets/cole-learning-labs-student-workbook.pdf" download>Download workbook <span class="curriculum-file">Optional PDF · 6 pages · 12 KB</span></a></article><article><h3>Practice quizzes</h3><p>Unmarked questions for a quick check or class discussion. These are membership practice materials. Use a class alias or leave the name line blank.</p><p><a class="button" href="practice-quizzes.html">Open practice quizzes web version</a></p><a class="button button-outline" href="assets/cole-learning-labs-pop-quizzes.pdf" download>Download practice quizzes <span class="curriculum-file">Optional PDF · 8 pages · 120 KB</span></a></article></div><p class="curriculum-note">The original PDFs remain optional print copies; the workbook PDF has selectable text but is not a tagged PDF. Keep names, emails, student IDs, and private school details out of your notes. Submit work only through your teacher’s school-approved process. Opening or downloading a companion does not submit lab work.</p></section>`;}
function educators(){return renderTeachingPage(SCENARIOS)+curriculumDownloads()+standardsAlignmentHTML()+'<section class="wrap section prose"><h2>Before using a lab with your class</h2><p>Complete the selected lab on your actual school device and network before the lesson. Check touch, keyboard navigation, zoom, downloads and your approved submission route. Support levels are teaching choices; students can keep safety and accessibility help available.</p><p>Independent work stays in this page’s memory by default. Device saving is optional and unencrypted. Use the <a href="secure-reports.html">teacher encryption-key setup and local report reader</a> when approved by your school. Keep private answer keys and grading materials in your school’s authenticated teacher resources.</p><p><a href="#capstone">Classroom opening day capstone</a> connects all five pathways. Classroom access remains unavailable; adult membership does not authorize student accounts or shared billing credentials.</p><p>Share the <a href="school-it.html">School IT review</a> for browser requirements and district filtering review. These resources are created by Mx. Cole toward a future goal of teaching Computer Technology through CTE.</p></section>';}
function guide(){return renderLabTutorial()+curriculumDownloads();}
function connect(){return `<section class="wrap page-intro"><p class="eyebrow">Say hello</p><h1>Let’s talk<br><em>technology and learning.</em></h1><p>Have a question about a project, an idea for a lab or a professional opportunity to discuss? You can reach me on LinkedIn.</p>${routeLink('about','About my background →','text-link')}</section><section class="wrap connect-grid section">${[{name:'LinkedIn',type:'Get in touch',copy:'Connect with Alan “Al” Cole.',url:'https://www.linkedin.com/in/alan91cole'},{name:'GitHub',type:'Code and projects',copy:'Take a look at my code, project notes and research.',url:'https://github.com/AL91Cole'},{name:'Credly',type:'Certificates',copy:'View my public credentials.',url:'https://www.credly.com/users/alan91cole'}].map(p=>`<a href="${p.url}" target="_blank" rel="noopener noreferrer"><p class="eyebrow">${p.type}</p><h2>${p.name} ↗</h2><p>${p.copy}</p></a>`).join('')}</section>`;}
function privacy(){return privacyPage();}

function membershipGate(route,{unknown=false}={}){
  const lab=CATALOG.find(item=>item.id===route.id),heading=unknown?'That activity is unavailable.':'This activity requires membership.';
  return `<section class="wrap page-intro membership-gate"><p class="eyebrow">${unknown?'Choose an available activity':'Member area'}</p><h1>${heading}</h1>${lab?`<p><strong>${esc(lab.id)} · ${esc(lab.title)}</strong></p>`:''}<p>Free access includes all 15 K–6 activities, all five beginner courses for grades 7–12, the practice workbench and two investigations per topic.</p><p>Other investigations, Network Studio, Coding Studio, open coding sandboxes, the capstone and teaching resources are reserved for members.</p><div class="membership-notice" role="status"><strong>Memberships are being prepared.</strong><p>Prices are not set, and purchases are unavailable. Paid access will be for approved adult subscribers; classroom access remains disabled. Do not share a teacher's sign-in or enter student information.</p><button class="button" type="button" disabled>Subscriptions unavailable</button></div><p><a class="button button-outline" href="https://codex-private-owner-preview.cole-learning-labs.pages.dev/learn/" rel="noreferrer">Owner sign in →</a></p><p>The site owner can use the existing private sign-in to open all labs without a subscription or payment. Access is verified before the private workspace opens.</p><div class="button-row"><a class="button button-outline" href="#labs">Explore the free labs →</a><a class="text-link" href="#privacy">Privacy information →</a></div></section>`;
}
function checkCapstoneState(id,state){const s=SCENARIOS.find(item=>item.id===id);return s?.track==='hardware'?verifyHardware(id,state):verifyWorkspace(id,state);}
function renderRoute(preserveDraft=true){const route=learningRoute(location.hash);if(preserveDraft!==false&&labNavigation?.syncRoute(route))return false;labNavigation=null;disposeHardware($('#workspace'));if(preserveDraft!==false)preserveCodeDraft();reportCleanup?.();reportCleanup=null;classroomConnection?.dispose();classroomConnection=null;routeCleanup?.();routeCleanup=null;currentLab=null;document.body.classList.remove('lab-view');let {page,id}=route;let html,title;const access=routeAccess(route);if(page==='membership'||(access==='member'&&!MEMBER_CONTENT)||access==='unknown'){const unknown=access==='unknown'&&page!=='membership';page='membership';html=membershipGate(route,{unknown});title=unknown?'Activity unavailable':'Membership required';}else if(page==='explore'){html=id?renderElementaryLab(id):renderElementaryCatalogue({band:route.band});title=id?(ELEMENTARY_LABS.find(lab=>lab.id===id)?.title||'Technology activity'):'K–6 technology activities';}else if(page==='practice'){const scenario=practiceScenarioFor(id);if(scenario){document.body.classList.add('lab-view');html=renderPracticeWorkbench(scenario,practiceStates[id]);title=scenario.title+' · Practice';}else{html='<section class="wrap page-intro"><h1>Choose a practice workbench.</h1><a href="#labs">All labs →</a></section>';title='Practice workbenches';}}else if(page==='studio'&&id==='network'){document.body.classList.add('lab-view');html=renderNetworkStudio(networkStudioState);title='Network Studio';}else if(page==='studio'&&id==='coding'){document.body.classList.add('lab-view');html=renderCodingStudio(codingStudioState);title='Coding Studio';}else if(page==='learn'){const foundation=getFoundation(id);if(foundation){id=foundation.id;document.body.classList.add('lab-view');html=renderFoundationLab(foundation,foundationRecordFor(id));title=`${foundation.code} · ${foundation.title}`;}else{html=`<section class="wrap page-intro"><h1>Choose a beginner lab.</h1><p>Pick one of the five topics to start learning.</p>${routeLink('labs','All virtual labs →')}</section>`;title='Beginner lab not found';}}else if(page==='lab'){const s=SCENARIOS.find(x=>x.id===id);if(s){document.body.classList.add('lab-view');html=(route.sequence?'<div class="capstone-return"><strong>Classroom opening day</strong><a href="#capstone">← Return to your five work orders</a></div>':'')+labPage(s);title=`${s.id} · ${s.title}`;}else{html=`<section class="wrap page-intro"><h1>That ticket is not on this bench.</h1><p>Choose one of the available investigations.</p>${routeLink('labs','All virtual labs →')}</section>`;title='Lab not found';}}else if(page==='sandbox'){html=renderCodingSandbox({starterId:id});title='Coding sandbox';}else if(page==='capstone'){html=renderCapstone(store.labs,checkCapstoneState);title='Classroom opening day';}else{const pages={home:[home,'Alan Cole'],projects:[projectPage,'Projects'],about:[about,'About Alan Cole'],labs:[library,'Virtual labs'],educators:[educators,'For educators'],guide:[guide,'Student guide'],connect:[connect,'Connect'],privacy:[privacy,'Privacy & accessibility']};if(!Object.hasOwn(pages,page))page='home';if(page==='labs'&&Object.hasOwn(tracks,id))libraryTrack=id;[html,title]=[pages[page][0](),pages[page][1]];}
const improvementActivity=['lab','learn','practice','studio'].includes(page)?page+'/'+id:['sandbox','capstone'].includes(page)?page:null;
if(improvementActivity)html+='<div id="lab-improvement-summary" class="wrap"></div>';
$('#main').innerHTML=html;document.title=`${title} · Cole Learning Labs`;$$('#site-nav a').forEach(a=>{const active=a.hash===`#${['lab','learn','sandbox','studio','practice'].includes(page)?'labs':page}`;if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});$('#site-nav').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');$('#menu-toggle').setAttribute('aria-label','Open navigation menu');
if(page==='home')bindHome();
if(page==='guide')routeCleanup=mountLabTutorial($('#main'));
if(page==='explore'&&id){const controller=mountElementaryLab($('#main'),{id});routeCleanup=()=>controller.dispose();}
if(page==='sandbox')routeCleanup=mountCodingSandbox($('#main'),{starterId:id});
if(page==='practice'&&practiceScenarioFor(id))routeCleanup=mountPracticeWorkbench($('#main'),{scenario:practiceScenarioFor(id),getState:()=>practiceStates[id],onChange:state=>{practiceStates[id]=state;},onNavigate:next=>{location.hash='#practice/'+next;}});
if(page==='studio'&&id==='network')routeCleanup=mountNetworkStudio($('#main'),{getState:()=>networkStudioState,onChange:state=>{networkStudioState=state;}});
if(page==='studio'&&id==='coding')routeCleanup=mountCodingStudio($('#main'),{getState:()=>codingStudioState,onChange:state=>{codingStudioState=state;}});
if(page==='labs'){labCards();$$('.track-filters [data-track]').forEach(b=>b.addEventListener('click',()=>{filterLibraryTrack(b.dataset.track);}));$('#grade-filter').addEventListener('change',e=>{libraryGrade=e.target.value;labCards();});$('#duration-filter').addEventListener('change',e=>{libraryMinutes=e.target.value;labCards();});$('#lab-search').addEventListener('input',e=>{libraryQuery=e.target.value;labCards();});}if(currentLab){const labController=bindLab(currentLab,route,{onModeChange:mode=>cleanupLearning.setMode?.(mode)}),s=currentLab,r=store.labs[s.id];labNavigation=labController;const cleanupLearning=mountLabLearning($('#main'),{scenario:s,record:r,mode:route.mode,sequence:route.sequence,onSave:()=>{save();$('#bench-log').innerHTML=eventList(r);$('#action-count').textContent=r.events.length+' actions';labController.refreshStatus();},onTest:prediction=>labController.runHypothesisTest(prediction,{firstIdea:false}),getResult:()=>labController.currentTaskResult()});routeCleanup=()=>{labController.dispose();cleanupLearning?.();};}
if(page==='learn'&&getFoundation(id)){const foundation=getFoundation(id),controller=mountFoundationLab($('#main'),{lab:foundation,record:foundationRecordFor(id),onChange:record=>{foundationRecords[id]=record;},onReport:()=>{if(!foundationSummary(id,foundationRecords[id]).complete)return;openReport({id:foundation.code,title:foundation.title,grade:foundation.grade||'7–12'}, {},foundationReport(id,foundationRecords[id]));}});routeCleanup=()=>controller.dispose();$('#dialog-close').addEventListener('click',()=>$('#lab-dialog').close());}
if(page==='educators'){const disposeTeaching=mountTeachingPage($('#main'),SCENARIOS,{notify:showNotice}),disposeStandards=mountStandardsAlignment($('#standards-alignment'));routeCleanup=()=>{disposeTeaching?.();disposeStandards?.();};}
if(page==='capstone'){const s=SCENARIOS.find(item=>item.id==='CODE-503'),r=recordFor(s);bindWorkPrivacy(s);routeCleanup=mountCapstone($('#main'),{record:r,onSave:save,onReport:()=>openReport({id:'CAP-601',title:'Classroom opening day',grade:'7–12'},r,capstoneReport(store.labs,checkCapstoneState))});$('#dialog-close').addEventListener('click',()=>$('#lab-dialog').close());}
if(improvementActivity){const previousCleanup=routeCleanup,disposeImprovements=mountLabImprovements($('#lab-improvement-summary'),{activity:improvementActivity});routeCleanup=()=>{disposeImprovements?.();previousCleanup?.();};}
window.scrollTo(0,0);}
function setSiteMenuOpen(open,{restoreFocus=false}={}){
  $('#site-nav').classList.toggle('open',open);
  $('#menu-toggle').setAttribute('aria-expanded',String(open));
  $('#menu-toggle').setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
  if(restoreFocus)$('#menu-toggle').focus({preventScroll:true});
}
function bindMenuDismissal(){
  const nav=$('#site-nav'),toggle=$('#menu-toggle');
  const inside=target=>target===toggle||toggle.contains?.(target)||nav.contains(target);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')&&inside(event.target)){event.preventDefault();setSiteMenuOpen(false,{restoreFocus:true});}});
  document.addEventListener('click',event=>{if(nav.classList.contains('open')&&!inside(event.target))setSiteMenuOpen(false);});
  nav.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(!link||!nav.contains(link))return;const wasOpen=nav.classList.contains('open');setSiteMenuOpen(false);if(wasOpen&&link.hash&&link.hash===location.hash)$('#main').focus({preventScroll:true});});
  const leave=event=>{if(event.relatedTarget&&nav.classList.contains('open')&&!inside(event.relatedTarget))setSiteMenuOpen(false);};
  nav.addEventListener('focusout',leave);toggle.addEventListener('focusout',leave);
}
$('#menu-toggle').addEventListener('click',()=>setSiteMenuOpen(!$('#site-nav').classList.contains('open')));
bindMenuDismissal();
$('.skip-link').addEventListener('click',e=>{e.preventDefault();$('#main').focus();$('#main').scrollIntoView({block:'start'});});
window.addEventListener('hashchange',()=>{if(renderRoute()!==false)$('#main').focus({preventScroll:true});});
renderRoute();
