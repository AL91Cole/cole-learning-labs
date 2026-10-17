import { SCENARIOS } from './scenarios.js?release=20261016-pathways6';

const main = document.querySelector('#portal-main');
const teacherEntry = document.body.dataset.portal === 'teacher';
const home = teacherEntry ? '../' : './';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}); };
const lab = id => SCENARIOS.find(item => item.id === id);
const idPath = value => encodeURIComponent(String(value));
const ACTIVE_CLASSROOM_KEY = 'cole-learning-labs:classroom:v1';
let model = { mode:'checking', session:null, classes:[], selectedClass:null, detail:null, selectedStudent:null, studentWork:null, selectedWork:null, error:'', busy:false, updatesPaused:false, lastChecked:null };
let demo = null;
let pollTimer=null, pollController=null, pollKey=null, refreshGeneration=0;
let pageStudentId=null;

async function api(path, method='GET', body, signal) {
  if (!path.startsWith('/api/')) throw new Error('Invalid classroom request.');
  const controller = new AbortController();
  const abort=()=>controller.abort();
  if(signal?.aborted) controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  const timeout = setTimeout(() => controller.abort(),12000);
  try {
    const logoutStudent=path==='/api/student/logout'?(model.session?.student?.id || pageStudentId):null;
    const response = await fetch(path,{method,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{Accept:'application/json',...(method!=='GET'?{'Content-Type':'application/json'}:{}),...(logoutStudent?{'X-Classroom-Student':logoutStudent}:{})},...(method!=='GET'?{body:JSON.stringify(body ?? {})}:{})});
    const contentType=response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw Object.assign(new Error('The classroom service did not return a validated JSON response. Real classroom tools remain unavailable.'),{status:response.status});
    const data=await response.json();
    if (!data || typeof data!=='object' || Array.isArray(data)) throw new Error('The classroom service returned an invalid response.');
    if (!response.ok) throw Object.assign(new Error(String(data.message || 'The classroom request could not be completed.')),{status:response.status,code:data.error});
    return data;
  } catch(error) {
    if(error.name==='AbortError') throw new Error('The classroom service did not respond in time. Your request is not confirmed; refresh before trying again.');
    throw error;
  } finally { clearTimeout(timeout);signal?.removeEventListener('abort',abort); }
}

function canPoll() {
  return model.mode==='live' && teacherEntry && model.session?.role==='teacher' && model.selectedClass && model.detail && !model.updatesPaused && !document.hidden;
}
function stopPolling() {
  clearTimeout(pollTimer);pollTimer=null;pollController?.abort();pollController=null;pollKey=null;
}
function updatePollControls(message) {
  const status=document.querySelector('#cp-update-status');
  const pause=document.querySelector('[data-action="toggle-updates"]');
  if(status) status.textContent=message || (model.updatesPaused?'Automatic progress updates paused.':`Refreshes about every 15 seconds while open. Last checked ${model.lastChecked?new Date(model.lastChecked).toLocaleTimeString():'not yet'}.`);
  if(pause){pause.textContent=model.updatesPaused?'Resume updates':'Pause updates';pause.setAttribute('aria-pressed',String(model.updatesPaused));}
}
function syncPolling() {
  if(!canPoll()){stopPolling();return;}
  const key=String(model.selectedClass);
  if(pollKey!==key){stopPolling();pollKey=key;}
  if(!pollTimer && !pollController) pollTimer=setTimeout(()=>pollProgress(key),15000);
}
function validateDetail(detail) {
  if(!detail.classroom || !Array.isArray(detail.students) || !Array.isArray(detail.assignments) || !Array.isArray(detail.progress)) throw new Error('The classroom detail could not be validated.');
  return detail;
}
function patchProgress(detail) {
  const stats=counts(detail);
  document.querySelectorAll('[data-progress-stat]').forEach(element=>{element.textContent=String(stats[element.dataset.progressStat] ?? 0);});
  const rows=document.querySelector('#cp-roster-rows');
  if(rows && !rows.contains(document.activeElement)){
    rows.innerHTML=rosterRows(detail);
    rows.querySelectorAll('[data-student]').forEach(control=>control.addEventListener('click',()=>act(()=>loadStudent(control.dataset.student))));
  }
  updatePollControls();
}
async function pollProgress(key) {
  pollTimer=null;
  if(!canPoll() || String(model.selectedClass)!==key)return;
  if(model.busy){syncPolling();return;}
  const controller=new AbortController();pollController=controller;
  try {
    const detail=validateDetail(await api(`/api/teacher/classes/${idPath(key)}`,'GET',undefined,controller.signal));
    if(controller.signal.aborted || !canPoll() || String(model.selectedClass)!==key)return;
    model.detail=detail;model.lastChecked=Date.now();patchProgress(detail);
  } catch(error) {
    if(controller.signal.aborted)return;
    if([401,403,503].includes(error.status)) {
      model={...model,mode:'unavailable',session:null,classes:[],detail:null,studentWork:null,selectedWork:null,error:errorMessage(error)};render();
    } else updatePollControls('Progress refresh failed. Displayed work is unchanged; another read will be tried while this page stays open.');
  } finally {
    if(pollController===controller)pollController=null;
    if(canPoll())syncPolling();
  }
}
function notice(message,kind='info') {
  const box=document.querySelector('#portal-notice'); box.textContent=message;box.dataset.kind=kind;box.hidden=false;
  clearTimeout(notice.timer); notice.timer=setTimeout(()=>{box.hidden=true;},8000);
}
function errorMessage(error) {
  if(error.code==='student_session_changed')return error.message;
  if(error.status===409) return `${error.message} The displayed record may be out of date. Refresh it before saving again.`;
  if(error.status===401 || error.status===403) return `${error.message} Access was not granted. No restricted classroom data is shown.`;
  return error.message || 'The request failed. No change is confirmed.';
}
function assertPinnedStudent(session) {
  if(session.role==='student' && (!session.student || typeof session.student.id!=='string' || typeof session.student.classId!=='string' || !session.classroom || !Array.isArray(session.assignments))) throw new Error('The classroom session could not be validated.');
  if(pageStudentId && (session.role!=='student' || session.student.id!==pageStudentId)) throw Object.assign(new Error('The classroom session changed in another tab or ended. This page will not switch learners or change the active classroom selection. Reload this entry page to review the current session.'),{status:409,code:'student_session_changed'});
  if(session.role==='student')pageStudentId=session.student.id;
}
function syncActiveSession(session) {
  try {
    if(session?.role==='student' && session.student?.id && session.student?.classId) localStorage.setItem(ACTIVE_CLASSROOM_KEY,JSON.stringify({studentId:session.student.id,classId:session.student.classId}));
    else localStorage.removeItem(ACTIVE_CLASSROOM_KEY);
  } catch { notice('Browser storage is unavailable. Keep this classroom session open and export your work.','error'); }
}
const button = (label,action,extra='',secondary=false) => `<button class="cp-button${secondary?' cp-button-secondary':''}" type="button" data-action="${action}" ${extra}>${label}</button>`;
const tag = (text,kind='') => `<span class="cp-tag ${kind?`cp-tag-${kind}`:''}">${esc(text)}</span>`;
function intro(eyebrow,title,copy) { return `<section class="cp-intro"><p class="cp-eyebrow">${eyebrow}</p><h1>${title}</h1><p>${copy}</p></section>`; }
function availability() {
  if(model.mode==='live') return `<div class="cp-service cp-service-ready"><span aria-hidden="true">●</span><div><strong>Classroom service available</strong><p>${teacherEntry?'Teacher identity and class ownership are checked by the server.':'Joining creates a classroom session in this browser. Independent labs remain available separately.'}</p></div></div>`;
  return `<div class="cp-service"><span aria-hidden="true">○</span><div><strong>${model.mode==='checking'?'Checking classroom service…':'Live classroom tools are unavailable'}</strong><p>${esc(model.error || 'Live classroom records remain locked pending school privacy review, required agreements, and operational approval. Independent labs and fictional demo work remain available.')}</p></div>${button('Check again','refresh','',true)}</div>`;
}
function demoBanner() { return `<div class="cp-demo-banner" role="note"><div><strong>FICTIONAL CLASSROOM DEMO</strong><span>Sample aliases and work only. Changes stay in this page’s memory and disappear when it reloads.</span></div>${button('Exit demo','exit-demo','',true)}</div>`; }
function startDemo() {
  refreshGeneration+=1;
  const created='2026-01-12T14:00:00.000Z';
  const assignments=['INC-101','AI-301','SEC-401'].map((labId,i)=>({id:`demo-assignment-${i+1}`,labId,title:lab(labId).title,createdAt:created}));
  const students=[{id:'demo-learner-a',alias:'Learner-A',joinedAt:created},{id:'demo-learner-b',alias:'Learner-B',joinedAt:created},{id:'demo-learner-c',alias:'Learner-C',joinedAt:created}];
  const classroom={id:'demo-class',name:'Technology investigations · Demo',code:'DEMO-7A',locked:false,createdAt:created,expiresAt:'2026-12-31T23:59:00.000Z',studentCount:3,assignmentCount:3};
  const work={evidence:['The monitor had power and displayed No signal.','The HDMI cable was connected to the inactive motherboard output.'],plan:'I think the cable is using the wrong video output because the dedicated graphics card is installed.',notes:'Moved the virtual display cable to the graphics-card output. The classroom desktop appeared.',reflection:'A running tower does not prove the screen receives a video signal. I verified the user’s file after restoring the display.',verified:true,closed:true,events:[{message:'Inspected monitor and video ports.'},{message:'Moved the display cable to the graphics output.'},{message:'Opened Lesson_Practice_File.docx.'}]};
  const submission={id:'demo-submission-1',assignmentId:assignments[0].id,studentId:students[0].id,draftVersion:2,revision:1,work,createdAt:created,status:'submitted',grade:null,feedback:'',gradedAt:null};
  demo={classroom,assignments,students,progress:[{studentId:students[0].id,assignmentId:assignments[0].id,version:2,updatedAt:created,submissionId:submission.id,status:'submitted',grade:null,feedback:''},{studentId:students[1].id,assignmentId:assignments[1].id,version:1,updatedAt:created,submissionId:null,status:'draft',grade:null,feedback:''}],workByStudent:{[students[0].id]:[{assignmentId:assignments[0].id,labId:'INC-101',draft:{version:2,work,updatedAt:created},submissions:[submission]}],[students[1].id]:[{assignmentId:assignments[1].id,labId:'AI-301',draft:{version:1,work:{evidence:['The example contains private student placeholders.'],plan:'Use a fictional learner and ask for one practice question.',notes:'Drafting a privacy-aware prompt.',reflection:'',verified:false,closed:false},updatedAt:created},submissions:[]}],[students[2].id]:[]}};
  model.mode='demo'; model.classes=[classroom];model.selectedClass=classroom.id;model.detail={classroom,students,assignments,progress:demo.progress};model.selectedStudent=null;model.studentWork=null;model.selectedWork=null;render();
}
function studentEntry() {
  const session=model.session;
  if(model.mode==='live' && session?.role==='student') return studentClassroom();
  return `${intro('CLASSROOM ENTRY','Your next investigation<br><em>starts here.</em>','Work independently, or join the class your teacher has prepared. You can practise the public labs without an account.')}${availability()}<div class="cp-entry-grid"><section class="cp-card cp-independent"><span class="cp-card-number">01 / YOUR OWN PACE</span><h2>Explore the independent labs.</h2><p>Choose from 27 hardware, networking, AI, cybersecurity, and coding investigations. Work stays in this page’s memory by default. Export a report before leaving, or explicitly choose device saving on your own approved browser profile.</p><a class="cp-button" href="${home}#labs" data-independent>Open independent labs <span aria-hidden="true">↗</span></a><p class="cp-small">Device saving is optional and is not locally encrypted. Independent work is not automatically submitted to a classroom.</p></section><section class="cp-card"><span class="cp-card-number">02 / YOUR CLASS</span><h2>Join with a class code.</h2><p>Use only the code your teacher gives you. The service creates a random learner alias; do not enter your name, email address, student ID, or a password.</p>${session?.role==='teacher'?`<div class="cp-inline-note">Your teacher identity is active. Open the <a href="${home}teacher/">teacher classroom</a> to manage classes.</div>`:`<form id="join-class"><fieldset ${model.mode!=='live'?'disabled':''}><label>Class code<input name="code" maxlength="32" required autocomplete="off" autocapitalize="characters" placeholder="Code from your teacher"></label><p class="cp-small">A random learner alias is generated by the server when joining. No student identity field is requested.</p><button class="cp-button" type="submit">Join class <span aria-hidden="true">→</span></button></fieldset></form>`}<p class="cp-small">A class code joins a class; it cannot recover a lost session. Keep this browser session until your work is exported or explicitly submitted.</p></section></div><section class="cp-demo-invite"><div><p class="cp-eyebrow">SEE THE WORKFLOW</p><h2>Look inside a fictional classroom.</h2><p>Inspect sample progress, read a sample report, and try giving feedback. No sign-in and no real student data.</p></div>${button('Explore classroom demo','demo')}</section>`;
}
function studentClassroom() {
  const {student,classroom,assignments=[]}=model.session;
  return `${intro('YOUR CLASSROOM',esc(classroom.name),`Signed in as <strong>${esc(student.alias)}</strong>. This classroom session belongs to this browser.`)}${classroom.locked?'<div class="cp-service"><strong>The teacher has locked this class.</strong><p>Existing work remains readable. New joins, saves, and submissions are paused.</p></div>':''}<div class="cp-toolbar"><p>${assignments.length} assigned investigation${assignments.length===1?'':'s'} · Alias ID <code>${esc(student.id.slice(0,8))}</code></p>${button('Refresh assignments','refresh','',true)}${button('Leave this session','logout','',true)}</div><div class="cp-assignment-grid">${assignments.length?assignments.map(a=>`<article class="cp-card"><span class="cp-eyebrow">${esc(a.labId)} · GRADES ${esc(lab(a.labId)?.grade || '7–12')}</span><h2>${esc(a.title || lab(a.labId)?.title || a.labId)}</h2><p>${esc(lab(a.labId)?.summary || 'Open the assigned virtual investigation.')}</p><a class="cp-button" href="${home}#lab/${encodeURIComponent(a.labId)}" data-assigned-lab="${esc(a.labId)}">Open assigned lab <span aria-hidden="true">↗</span></a></article>`).join(''):'<section class="cp-card"><h2>No assignments yet.</h2><p>Your teacher can add an investigation. Refresh this page when it is ready.</p></section>'}</div><section class="cp-inline-note"><h2>Keep your session and your work.</h2><p>Use the classroom save and submission controls inside an assigned lab. Export a local report too. Logging out removes access to this session; an alias and class code cannot recover it.</p><a href="${home}#guide">Read the student guide</a></section>`;
}
function teacherEntryView() {
  if(model.mode==='live' && model.session?.role==='teacher') return teacherDashboard();
  return `${intro('TEACHER CLASSROOM','Make the thinking<br><em>visible.</em>','Assign investigations, review learners’ evidence, and return your own feedback. Independent reports are available alongside optional classroom tools.')}${availability()}<div class="cp-entry-grid"><section class="cp-card"><span class="cp-card-number">LIVE CLASSROOM</span><h2>${model.mode==='live'?'Verified teacher access required.':'Prepare a classroom when the service is ready.'}</h2><p>${model.mode==='live'?'This session has not been recognized as an authorized teacher. The server must verify your Cloudflare Access identity and class ownership before showing any class records.':'Real classrooms remain locked pending school privacy review, required agreements, operational approval, and approved teacher access.'}</p>${button('Check teacher access','refresh','',true)}<p class="cp-small">There is no shared teacher PIN. Classroom records are never unlocked by a page setting or a demo button.</p></section><section class="cp-card cp-demo-invite-card"><span class="cp-card-number">FICTIONAL DEMO</span><h2>Try the review workflow.</h2><p>Open an example class with three fictional aliases. Inspect a report and try a manual grade or a request for revision.</p>${button('Explore classroom demo','demo')}<p class="cp-small">Demo changes exist only in this page’s memory. They are not real grades, accounts, or submissions.</p></section></div><section class="cp-inline-note"><h2>Teaching without a connected class.</h2><p>Students can complete public labs and export reports. Collect those reports through your school’s chosen classroom process.</p><a href="${home}#educators">Open teaching resources <span aria-hidden="true">↗</span></a></section>`;
}
function counts(detail) {
  const rows=detail?.progress || [];
  return {students:detail?.students.length || 0,assigned:detail?.assignments.length || 0,submitted:rows.filter(p=>p.submissionId).length,reviewed:rows.filter(p=>p.status==='graded' || p.status==='returned').length};
}
function teacherDashboard() {
  const detail=model.detail;
  const stats=counts(detail);
  return `${model.mode==='demo'?demoBanner():''}${intro(model.mode==='demo'?'DEMO TEACHER DESK':'TEACHER DESK','A clear view of<br><em>the next step.</em>',model.mode==='demo'?'Explore one fictional class. Inspect the sample work before deciding what feedback would help.':`Teacher access verified for <strong>${esc(model.session.teacher?.email || 'your account')}</strong>. Classroom records below come from the classroom service.`)}<div class="cp-dashboard"><aside class="cp-class-sidebar"><section class="cp-card"><div class="cp-section-heading"><h2>Classes</h2>${model.mode==='live'?button('Refresh','refresh-classes','',true):tag('Demo')}</div><div class="cp-class-list">${model.classes.map(c=>`<button class="cp-class-button${c.id===model.selectedClass?' cp-selected':''}" data-class="${esc(c.id)}" type="button"><b>${esc(c.name)}</b><span>${esc(c.studentCount ?? '—')} aliases · ${esc(c.assignmentCount ?? '—')} assignments</span></button>`).join('') || '<p class="cp-muted">No classes yet. Create one below.</p>'}</div><form id="create-class"><label>New class name<input name="name" required maxlength="80" placeholder="Example: Technology 8 · Period 2"></label><button class="cp-button" type="submit" ${model.mode==='demo'?'disabled':''}>Create class</button>${model.mode==='demo'?'<p class="cp-small">Class creation is a live-service action. The demo uses one example class.</p>':''}</form></section></aside><div class="cp-dashboard-main">${detail?`<section class="cp-card"><div class="cp-section-heading"><div><p class="cp-eyebrow">${model.mode==='demo'?'FICTIONAL CLASS':'SELECTED CLASS'}</p><h2>${esc(detail.classroom.name)}</h2></div>${tag(detail.classroom.locked?'Joins & changes locked':'Class open',detail.classroom.locked?'warn':'ready')}</div><div class="cp-class-code"><div><span>Join code</span><strong>${esc(detail.classroom.code || 'Not available')}</strong></div><p>Share only through your classroom. A code creates a new alias session; it is not an account-recovery method.</p></div><div class="cp-toolbar">${button(detail.classroom.locked?'Unlock class':'Lock joins & changes','lock-class','',true)}${button('Delete class','delete-class','',true)}<span class="cp-small">Expires ${esc(date(detail.classroom.expiresAt))}</span></div></section><div class="cp-stat-grid"><div><b data-progress-stat="students">${stats.students}</b><span>Classroom aliases</span></div><div><b data-progress-stat="assigned">${stats.assigned}</b><span>Assigned labs</span></div><div><b data-progress-stat="submitted">${stats.submitted}</b><span>Work with a submission</span></div><div><b data-progress-stat="reviewed">${stats.reviewed}</b><span>Graded or returned</span></div></div>${assignmentPanel(detail)}${rosterPanel(detail)}${model.studentWork?workPanel():''}`:'<section class="cp-card cp-empty"><h2>Your first classroom.</h2><p>Create a class, then assign a lab. Students join with a class code and receive a server-generated random alias.</p></section>'}</div></div>`;
}
function assignmentPanel(detail) {
  const assigned=new Set(detail.assignments.map(a=>a.labId));
  return `<section class="cp-card"><div class="cp-section-heading"><div><p class="cp-eyebrow">PLAN THE LESSON</p><h2>Assignments</h2></div><span class="cp-small">${detail.assignments.length} assigned</span></div><div class="cp-assigned-list">${detail.assignments.map(a=>`<span>${esc(a.labId)}<b>${esc(a.title || lab(a.labId)?.title || 'Lab')}</b></span>`).join('') || '<p class="cp-muted">Choose the first investigation below.</p>'}</div><form id="add-assignment" class="cp-inline-form"><label>Assign an investigation<select name="labId" required><option value="">Choose from 27 labs</option>${SCENARIOS.map(s=>`<option value="${esc(s.id)}" ${assigned.has(s.id)?'disabled':''}>${esc(s.id)} · ${esc(s.title)} · ${esc(s.grade)}</option>`).join('')}</select></label><button class="cp-button" type="submit">Add assignment</button></form></section>`;
}
function rosterRows(detail) {
  return detail.students.map(student=>{const progress=detail.progress.filter(p=>p.studentId===student.id);return `<tr><th scope="row"><b>${esc(student.alias)}</b><small>${esc(student.id.slice(0,8))}</small></th><td>${progress.filter(p=>Number(p.version)>0).length}</td><td>${progress.filter(p=>p.submissionId).length}</td><td>${progress.filter(p=>p.status==='graded' || p.status==='returned').length}</td><td>${button('Review work','student-work',`data-student="${esc(student.id)}"`,true)}</td></tr>`;}).join('') || '<tr><td colspan="5">No aliases have joined this class.</td></tr>';
}
function rosterPanel(detail) {
  const updating=model.mode==='live'?`<div class="cp-live-controls"><p id="cp-update-status">${model.updatesPaused?'Automatic progress updates paused.':`Refreshes about every 15 seconds while open. Last checked ${model.lastChecked?new Date(model.lastChecked).toLocaleTimeString():'not yet'}.`}</p><div>${button(model.updatesPaused?'Resume updates':'Pause updates','toggle-updates',`aria-pressed="${model.updatesPaused}"`,true)}${button('Refresh progress','refresh-progress','',true)}</div></div>`:'';
  return `<section class="cp-card"><div class="cp-section-heading"><div><p class="cp-eyebrow">REVIEW THE PROCESS</p><h2>Progress & work</h2></div><p class="cp-small">Progress is learner-reported; grades are teacher-entered.</p></div>${updating}<div class="cp-table-scroll" tabindex="0" role="region" aria-label="Classroom alias progress table"><table><caption>Open a learner’s work to review evidence and immutable submitted versions. Work details refresh only when you request them.</caption><thead><tr><th scope="col">Alias</th><th scope="col">Drafts saved</th><th scope="col">Submitted</th><th scope="col">Reviewed</th><th scope="col">Work</th></tr></thead><tbody id="cp-roster-rows">${rosterRows(detail)}</tbody></table></div></section>`;
}
function chosenSubmission() {
  const selected=model.selectedWork;
  if(!selected || !model.studentWork) return null;
  const item=model.studentWork.work.find(w=>w.assignmentId===selected.assignmentId);
  const submission=item?.submissions.find(s=>s.id===selected.submissionId);
  return submission?{item,submission}:null;
}
function reviewDirty() {
  const form=document.querySelector('#grade-submission'),chosen=chosenSubmission();
  if(!form || !chosen)return false;
  const data=new FormData(form),submission=chosen.submission;
  return String(data.get('grade')).trim()!==(submission.grade==null?'':String(submission.grade)) || String(data.get('feedback')).trim()!==String(submission.feedback || '').trim() || String(data.get('status'))!==(submission.status==='returned'?'returned':'graded');
}
function renderWorkValue(value) {
  if(value==null || value==='') return '<p class="cp-muted">Not recorded.</p>';
  if(Array.isArray(value)) return `<ul>${value.map(item=>`<li>${esc(typeof item==='object'?JSON.stringify(item):item)}</li>`).join('')}</ul>`;
  if(typeof value==='object') return `<pre>${esc(JSON.stringify(value,null,2))}</pre>`;
  return `<p>${esc(value)}</p>`;
}
function workEvidence(work,labId) {
  if(!work || typeof work!=='object') return '<p class="cp-muted">No work snapshot is available.</p>';
  const scenario=lab(labId);
  const evidence=Array.isArray(work.evidence)?work.evidence.map(value=>scenario?.clues.find(clue=>clue.id===value)?.text || value):work.evidence;
  const fields=[['Evidence',evidence],['Working explanation',work.plan],['Tests & observations',work.notes],['Reflection',work.reflection]];
  return `<div class="cp-work-evidence">${fields.map(([title,value])=>`<section><h4>${title}</h4>${renderWorkValue(value)}</section>`).join('')}<div class="cp-inline-note"><b>Learner-reported state</b><p>Technical verification: ${work.verified===true?'reported complete':'not reported complete'} · Ticket delivery: ${work.closed===true?'reported complete':'not reported complete'}</p><span>These flags are not an automatic grade.</span></div>${work.events?`<details class="cp-details"><summary>Inspect recorded action log</summary>${renderWorkValue(work.events)}</details>`:''}<details class="cp-details"><summary>Inspect complete saved snapshot</summary><pre>${esc(JSON.stringify(work,null,2))}</pre></details></div>`;
}
function workPanel() {
  const {student,work=[]}=model.studentWork;
  const selected=chosenSubmission();
  return `<section class="cp-card" id="work-review"><div class="cp-section-heading"><div><p class="cp-eyebrow">${model.mode==='demo'?'FICTIONAL WORK REVIEW':'WORK REVIEW'}</p><h2>${esc(student.alias)}</h2></div><div class="cp-review-tools">${model.mode==='live'?button('Refresh work','refresh-work','',true):''}${button('Close review','close-review','',true)}</div></div><p class="cp-small">Alias ID ${esc(student.id)} · Joined ${esc(date(student.joinedAt))}</p>${work.length?`<div class="cp-work-grid"><aside class="cp-work-list">${work.map(item=>`<section><h3>${esc(item.labId)} · ${esc(lab(item.labId)?.title || 'Investigation')}</h3>${item.submissions.map(submission=>`<button type="button" class="cp-work-button${model.selectedWork?.submissionId===submission.id?' cp-selected':''}" data-submission="${esc(submission.id)}" data-assignment="${esc(item.assignmentId)}"><b>Submitted version ${esc(submission.draftVersion)}</b><span>${esc(submission.status)}${submission.grade!=null?` · ${esc(submission.grade)}/100`:''} · ${esc(date(submission.createdAt))}</span></button>`).join('') || '<p class="cp-small">No submitted version.</p>'}${item.draft?.work?`<details class="cp-details"><summary>Inspect current draft · v${esc(item.draft.version)}</summary><p class="cp-small">Drafts can change. Grade a submitted snapshot, not this draft.</p>${workEvidence(item.draft.work,item.labId)}</details>`:''}</section>`).join('')}</aside><div class="cp-work-detail">${selected?submissionPanel(selected.item,selected.submission):'<div class="cp-empty"><h3>Choose a submitted version.</h3><p>Read the evidence and reasoning before recording a manual grade. A current draft can be inspected separately.</p></div>'}</div></div>`:'<div class="cp-empty"><h3>No saved work yet.</h3><p>This alias has not saved a draft or submitted an assignment.</p></div>'}</section>`;
}
function submissionPanel(item,submission) {
  return `<div class="cp-submission-heading"><div><h3>${esc(item.labId)} · Submitted v${esc(submission.draftVersion)}</h3><p class="cp-small">Immutable work snapshot · ${esc(date(submission.createdAt))}</p></div>${tag(submission.status)}</div>${workEvidence(submission.work,item.labId)}<section class="cp-review-guidance"><h3>Use your private assessment criteria</h3><p>Keep your rubric and answer keys in a school-approved system restricted to the assigned teacher. This public site does not store or deliver teacher rubrics. A completed simulation alone does not determine a grade.</p><p class="cp-small">The fictional dashboard is a public demonstration; its teacher label does not protect private material.</p></section><form id="grade-submission" class="cp-grade-form"><h3>${model.mode==='demo'?'Try a fictional review':'Manual teacher review'}</h3><label>Grade out of 100 <span class="cp-small">Optional when returning for revision</span><input name="grade" type="number" inputmode="decimal" min="0" max="100" step="1" value="${submission.grade==null?'':esc(submission.grade)}" placeholder="0–100"></label><label>Feedback<textarea name="feedback" rows="5" maxlength="4000" placeholder="Name the evidence that worked and a specific next step.">${esc(submission.feedback || '')}</textarea></label><label>Review decision<select name="status"><option value="graded" ${submission.status==='graded'?'selected':''}>Record grade and feedback</option><option value="returned" ${submission.status==='returned'?'selected':''}>Return for revision</option></select></label><button class="cp-button" type="submit">${model.mode==='demo'?'Save demo feedback':'Save teacher review'}</button><p class="cp-small">${model.mode==='demo'?'This review changes fictional page-memory data only.':'The server checks teacher ownership and the submission revision before saving. Submitted work is preserved.'}</p></form>`;
}
function render() {
  main.innerHTML=model.mode==='demo'?teacherDashboard():teacherEntry?teacherEntryView():studentEntry();
  bind();syncPolling();
}
async function refresh() {
  const generation=++refreshGeneration;
  model.mode='checking';model.error='';render();
  try {
    const session=await api('/api/session');
    if(generation!==refreshGeneration)return;
    if(session.enabled!==true || !['guest','student','teacher'].includes(session.role)) throw new Error('The classroom service is not configured for this site.');
    assertPinnedStudent(session);model.session=session;model.mode='live';syncActiveSession(session);
    if(teacherEntry && session.role==='teacher') await loadClasses(generation);
    else render();
  } catch(error) {
    if(generation!==refreshGeneration)return;
    model={...model,mode:'unavailable',session:null,classes:[],detail:null,studentWork:null,error:errorMessage(error)};render();
  }
}
async function loadClasses(generation) {
  const data=await api('/api/teacher/classes');
  if(generation && generation!==refreshGeneration)return;
  if(!Array.isArray(data.classes)) throw new Error('The classroom list could not be validated.');
  model.classes=data.classes;
  if(model.selectedClass && data.classes.some(c=>c.id===model.selectedClass)) await loadClass(model.selectedClass,generation);
  else if(data.classes.length) await loadClass(data.classes[0].id,generation);
  else {model.selectedClass=null;model.detail=null;model.studentWork=null;render();}
}
async function loadClass(id,generation) {
  const detail=await api(`/api/teacher/classes/${idPath(id)}`);
  if(generation && generation!==refreshGeneration)return;
  validateDetail(detail);model.lastChecked=Date.now();
  model.selectedClass=id;model.detail=detail;model.classes=model.classes.map(item=>item.id===id?{...item,...detail.classroom}:item);model.studentWork=null;model.selectedWork=null;render();
}
async function loadStudent(id) {
  if(model.mode==='demo') model.studentWork={student:demo.students.find(s=>s.id===id),work:demo.workByStudent[id] || []};
  else {
    const data=await api(`/api/teacher/classes/${idPath(model.selectedClass)}/students/${idPath(id)}`);
    if(!data.student || !Array.isArray(data.work)) throw new Error('The learner work could not be validated.');
    model.studentWork=data;
  }
  model.selectedStudent=id;model.selectedWork=null;render();document.querySelector('#work-review')?.scrollIntoView({behavior:'smooth',block:'start'});
}
async function act(operation) {
  if(model.busy) return;
  model.busy=true;main.setAttribute('aria-busy','true');
  try {await operation();} catch(error) {
    if([401,403,503].includes(error.status)) {model={...model,mode:'unavailable',session:null,classes:[],selectedClass:null,detail:null,studentWork:null,selectedWork:null,error:errorMessage(error)};render();}
    notice(errorMessage(error),'error');
  } finally {model.busy=false;main.removeAttribute('aria-busy');}
}
async function lockClass() {
  const locked=!model.detail.classroom.locked;
  if(model.mode==='demo') {demo.classroom.locked=locked;render();notice(locked?'Demo class locked. No real classroom changed.':'Demo class unlocked.');return;}
  const response=await api(`/api/teacher/classes/${idPath(model.selectedClass)}`,'PATCH',{locked});
  if(!response.classroom) throw new Error('The class change was not confirmed.');
  await loadClasses();notice(locked?'Class locked. New joins, saves, and submissions are paused.':'Class unlocked.');
}
function confirmDelete() {
  const id=model.selectedClass,name=model.detail.classroom.name;
  const dialog=document.createElement('dialog');dialog.className='cp-dialog';
  dialog.innerHTML=`<form method="dialog"><p class="cp-eyebrow">${model.mode==='demo'?'DEMO DELETE':'DELETE CLASSROOM'}</p><h2>Delete ${esc(name)}?</h2><p>${model.mode==='demo'?'This removes the fictional example from this page. Reloading or reopening the demo restores it.':'This permanently removes this class, its aliases, saved work, submissions, and grades. Export anything your school needs before continuing.'}</p><label>Type DELETE to confirm<input name="confirm" autocomplete="off" required pattern="DELETE"></label><div class="cp-toolbar"><button class="cp-button cp-button-danger" id="delete-class-confirm" type="button">Delete class</button><button class="cp-button cp-button-secondary" value="cancel" formnovalidate>Keep class</button></div><p id="delete-dialog-error" class="cp-small" role="status"></p></form>`;
  document.body.append(dialog);dialog.showModal();dialog.querySelector('input').focus();
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.querySelector('#delete-class-confirm').addEventListener('click',()=>act(async()=>{
    if(dialog.querySelector('input').value!=='DELETE'){dialog.querySelector('#delete-dialog-error').textContent='Type DELETE exactly before confirming.';return;}
    if(model.mode==='demo'){model.classes=[];model.detail=null;model.studentWork=null;model.selectedClass=null;dialog.close();render();notice('Fictional demo class removed from this page only.');return;}
    const response=await api(`/api/teacher/classes/${idPath(id)}`,'DELETE',{});if(response.deleted!==true)throw new Error('Deletion was not confirmed.');
    model.selectedClass=null;dialog.close();await loadClasses();notice('Class and its classroom records deleted.');
  }));
}
function bind() {
  main.querySelectorAll('[data-assigned-lab]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();act(async()=>{
      const session=await api('/api/session');
      if(session.enabled!==true)throw new Error('The classroom session could not be validated.');
      assertPinnedStudent(session);
      if(session.role!=='student' || !session.assignments.some(assignment=>assignment.labId===link.dataset.assignedLab))throw new Error('This investigation is no longer assigned to the current classroom session. Refresh the classroom before continuing.');
      model.session=session;syncActiveSession(session);window.location.assign(link.href);
    });
  }));
  main.querySelectorAll('[data-independent]').forEach(link=>link.addEventListener('click',()=>{try{localStorage.removeItem(ACTIVE_CLASSROOM_KEY);}catch{}}));
  main.querySelectorAll('[data-action]').forEach(control=>control.addEventListener('click',()=>act(async()=>{
    switch(control.dataset.action){
      case 'refresh': await refresh();break;
      case 'demo':startDemo();break;
      case 'exit-demo':demo=null;model.selectedClass=null;await refresh();break;
      case 'refresh-classes':await loadClasses();break;
      case 'student-work':await loadStudent(control.dataset.student);break;
      case 'close-review':model.studentWork=null;model.selectedWork=null;render();break;
      case 'toggle-updates':model.updatesPaused=!model.updatesPaused;updatePollControls();syncPolling();break;
      case 'refresh-progress':{
        const detail=validateDetail(await api(`/api/teacher/classes/${idPath(model.selectedClass)}`));
        model.detail=detail;model.lastChecked=Date.now();patchProgress(detail);break;
      }
      case 'refresh-work':{
        if(reviewDirty() && !window.confirm('Refresh this work? Your unsaved grade or feedback edits will be discarded.'))return;
        const selected=model.selectedWork?{...model.selectedWork}:null;await loadStudent(model.selectedStudent);model.selectedWork=selected;render();break;
      }
      case 'lock-class':await lockClass();break;
      case 'delete-class':confirmDelete();break;
      case 'logout':{
        if(!window.confirm('Leave this classroom session? Your alias and class code cannot recover it. Export any needed work first.'))return;
        const data=await api('/api/student/logout','POST',{});if(data.loggedOut!==true)throw new Error('Logout was not confirmed.');pageStudentId=null;syncActiveSession(null);await refresh();break;
      }
    }
  })));
  main.querySelectorAll('[data-class]').forEach(control=>control.addEventListener('click',()=>act(async()=>{
    if(model.mode==='demo'){model.detail={classroom:demo.classroom,students:demo.students,assignments:demo.assignments,progress:demo.progress};model.selectedClass=demo.classroom.id;model.studentWork=null;render();}else await loadClass(control.dataset.class);
  })));
  main.querySelectorAll('[data-submission]').forEach(control=>control.addEventListener('click',()=>{model.selectedWork={assignmentId:control.dataset.assignment,submissionId:control.dataset.submission};render();document.querySelector('.cp-work-detail')?.scrollIntoView({behavior:'smooth',block:'start'});}));
  main.querySelector('#join-class')?.addEventListener('submit',event=>{event.preventDefault();const values=new FormData(event.currentTarget);act(async()=>{
    if(model.mode!=='live') throw new Error('Live classroom joining is not available.');
    const data=await api('/api/student/join','POST',{code:String(values.get('code')).trim().toUpperCase()});
    if(data.enabled!==true || data.role!=='student' || !data.student?.id || !data.student?.classId || !data.classroom || !Array.isArray(data.assignments))throw new Error('A classroom session was not confirmed.');assertPinnedStudent(data);model.session=data;syncActiveSession(data);render();notice('Classroom session joined. Choose an assigned investigation.');
  });});
  main.querySelector('#create-class')?.addEventListener('submit',event=>{event.preventDefault();const values=new FormData(event.currentTarget);act(async()=>{
    if(model.mode!=='live')throw new Error('Class creation requires the live classroom service.');
    const data=await api('/api/teacher/classes','POST',{name:String(values.get('name')).trim()});if(!data.classroom?.id)throw new Error('Class creation was not confirmed.');model.selectedClass=data.classroom.id;await loadClasses();notice('Class created. Add an assignment before sharing its join code.');
  });});
  main.querySelector('#add-assignment')?.addEventListener('submit',event=>{event.preventDefault();const values=new FormData(event.currentTarget);act(async()=>{
    const scenario=lab(String(values.get('labId')));if(!scenario)throw new Error('Choose one of the available investigations.');
    if(model.mode==='demo'){const assignment={id:`demo-assignment-${Date.now()}`,labId:scenario.id,title:scenario.title,createdAt:new Date().toISOString()};demo.assignments.push(assignment);demo.classroom.assignmentCount=demo.assignments.length;render();notice('Fictional assignment added in page memory only.');return;}
    const response=await api(`/api/teacher/classes/${idPath(model.selectedClass)}/assignments`,'POST',{labId:scenario.id,title:scenario.title});if(!response.assignment)throw new Error('Assignment creation was not confirmed.');await loadClass(model.selectedClass);notice('Investigation assigned. Students can refresh their classroom entry.');
  });});
  main.querySelector('#grade-submission')?.addEventListener('submit',event=>{event.preventDefault();const values=new FormData(event.currentTarget);act(async()=>{
    const chosen=chosenSubmission();if(!chosen)throw new Error('Choose a submitted work version first.');
    const raw=String(values.get('grade')).trim(),grade=raw===''?null:Number(raw),status=String(values.get('status')),feedback=String(values.get('feedback')).trim();
    if(grade!==null && (!Number.isFinite(grade)||grade<0||grade>100))throw new Error('Use a grade between 0 and 100.');
    if(status==='graded' && grade===null)throw new Error('Enter a grade, or choose Return for revision.');
    if(status==='returned' && !feedback)throw new Error('Add a specific feedback note before returning work for revision.');
    if(model.mode==='demo'){
      Object.assign(chosen.submission,{grade,feedback,status,gradedAt:new Date().toISOString(),revision:chosen.submission.revision+1});
      const progress=demo.progress.find(p=>p.submissionId===chosen.submission.id);if(progress)Object.assign(progress,{grade,feedback,status});render();notice('Demo review saved in page memory. No real grade changed.');return;
    }
    const selected={...model.selectedWork};
    const response=await api(`/api/teacher/classes/${idPath(model.selectedClass)}/submissions/${idPath(chosen.submission.id)}`,'PATCH',{expectedRevision:chosen.submission.revision,grade,feedback,status});if(!response.submission)throw new Error('Teacher review was not confirmed.');
    const classId=model.selectedClass,studentId=model.selectedStudent;await loadClass(classId);await loadStudent(studentId);model.selectedWork=selected;render();notice(status==='returned'?'Feedback returned for revision.':'Teacher grade and feedback saved.');
  });});
}

document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPolling();else syncPolling();});
window.addEventListener('pagehide',stopPolling);
document.querySelectorAll('header [data-independent]').forEach(link=>link.addEventListener('click',()=>{try{localStorage.removeItem(ACTIVE_CLASSROOM_KEY);}catch{}}));
refresh();
