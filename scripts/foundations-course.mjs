import {parse} from 'acorn';

const ORIGIN='https://www.colelearninglabs.com';
const BASE='/courses/foundations';
const RELEASE='20261117-foundations-course';
const esc=value=>String(value??'').replace(/[&<>"']/gu,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const pad=day=>String(day).padStart(2,'0');
const prose=value=>String(value??'').split(/\n\s*\n/u).filter(Boolean).map(part=>`<p class="fc-authored">${esc(part)}</p>`).join('');
const list=(items=[],ordered=false)=>`<${ordered?'ol':'ul'}>${items.map(item=>`<li class="fc-authored">${esc(item)}</li>`).join('')}</${ordered?'ol':'ul'}>`;
const dayPath=day=>`${BASE}/day-${pad(day)}`;
export const COURSE_DATA_FILE='courses/foundations/course-data.mjs';
export const COURSE_PAGE_FILES=Object.freeze(['courses/foundations/index.html',...Array.from({length:45},(_,index)=>`courses/foundations/day-${pad(index+1)}.html`),'courses/foundations/project.html','courses/foundations/standards.html']);
export const COURSE_DOWNLOAD_FILES=Object.freeze(['assets/courses/foundations/student-workbook.pdf','assets/courses/foundations/student-workbook.docx','assets/courses/foundations/student-project.pdf','assets/courses/foundations/student-project.docx']);
export const coursePageRoute=file=>'/'+file.replace(/\/index\.html$/u,'').replace(/\.html$/u,'');

export function foundationsLabURL(route){
  if(typeof route!=='string'||!/^#[a-z0-9][a-z0-9/?=&_-]*$/iu.test(route))throw new Error('Expected an authored foundations lab route.');
  return `${ORIGIN}/?mode=student&cart=true${route}`;
}
export const foundationsShareURL=day=>'https://classroom.google.com/share?url='+encodeURIComponent(`${ORIGIN}${dayPath(day)}#student-handout`);

/** Only the two JSON-valued exports are accepted; source data is never executed. */
export function parseFoundationsData(source){
  const program=parse(source,{ecmaVersion:'latest',sourceType:'module'}),values={};
  if(program.body.length!==2)throw new Error('Foundations data must contain only COURSE and LESSONS JSON exports.');
  for(const item of program.body){
    const declaration=item.type==='ExportNamedDeclaration'&&item.declaration;
    const entry=declaration?.type==='VariableDeclaration'&&declaration.kind==='const'&&declaration.declarations.length===1&&declaration.declarations[0];
    if(!entry||entry.id.type!=='Identifier'||!['COURSE','LESSONS'].includes(entry.id.name)||Object.hasOwn(values,entry.id.name)||!entry.init)throw new Error('Unexpected foundations data export.');
    try{values[entry.id.name]=JSON.parse(source.slice(entry.init.start,entry.init.end));}catch{throw new Error('Foundations exports must be JSON data without executable expressions.');}
  }
  return {course:values.COURSE,lessons:values.LESSONS};
}

function shell({title,description,pathname,body}){
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#102c46">
  <meta name="description" content="${esc(description)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${ORIGIN}${pathname}">
  <meta property="og:image" content="${ORIGIN}/assets/cole-learning-labs-social.png">
  <meta name="twitter:card" content="summary_large_image">
  <title>${esc(title)} · Cole Learning Labs</title>
  <link rel="canonical" href="${ORIGIN}${pathname}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/src/styles.css?release=${RELEASE}">
  <link rel="stylesheet" href="/src/school.css?release=${RELEASE}">
  <link rel="stylesheet" href="/src/foundations-course.css?release=${RELEASE}">
  <link rel="stylesheet" href="/src/accessibility.css?release=${RELEASE}">
</head>
<body class="fc-page">
  <a class="skip-link" href="#main">Skip to main content</a>
  <header class="site-header school-header fc-header"><a class="brand" href="/"><img src="/assets/cole-learning-labs-logo.webp" alt="Cole Learning Labs" width="336" height="140"></a><nav aria-label="Site menu"><a href="/courses">Courses</a><a href="/teach">For teachers</a><a href="/#labs">Interactive labs</a><a href="/district-review">School review</a></nav></header>
  <main id="main" class="wrap fc-main" tabindex="-1">${body}</main>
  <footer class="wrap fc-footer"><p><a href="/courses">More courses will be added to the course catalog.</a> This first course is an authored teacher review edition; it has not been field-tested with a class.</p><p>Student work is submitted and graded through the school’s approved system. <a href="/district-review">Review the site’s data practices</a>.</p></footer>
</body>
</html>
`;
}

function facts(){return '<dl class="fc-facts"><div><dt>Grades</dt><dd>7–8</dd></div><div><dt>Length</dt><dd>9 weeks · 45 lessons</dd></div><div><dt>Class period</dt><dd>40 minutes</dd></div><div><dt>Access</dt><dd>Free · no student account</dd></div></dl>';}
function crumb(extra=''){return `<nav class="fc-breadcrumb" aria-label="Breadcrumb"><a href="/courses">Courses</a> <span aria-hidden="true">/</span> ${extra?`<a href="${BASE}">Foundations</a> <span aria-hidden="true">/</span> ${extra}`:'Foundations'}</nav>`;}
function section(id,title,content){return `<section class="fc-section"${id?` id="${id}"`:''}><h2>${esc(title)}</h2>${content}</section>`;}
function vocabulary(items){return `<dl class="fc-vocabulary">${items.map(item=>`<div><dt>${esc(item.term)}</dt><dd>${esc(item.definition)}</dd></div>`).join('')}</dl>`;}
function downloads(type='workbook'){
  const project=type==='project',stem=project?'student-project':'student-workbook',label=project?'project brief and rubric':'student workbook';
  return `<div class="fc-downloads"><a href="/assets/courses/foundations/${stem}.docx" download>Download ${label} (DOCX)</a><a href="/assets/courses/foundations/${stem}.pdf" download>Download ${label} (PDF)</a></div>`;
}
function rubric(course){
  if(!course.rubric?.length)return '';
  return `<h3>Final project rubric</h3><p>Six criteria scored 1–4, for 24 possible points. Missing evidence may receive 0. The same criteria apply to written, spoken, dictated, digital and paper alternatives.</p><div class="fc-table-scroll" role="region" tabindex="0" aria-label="Final project rubric; scroll horizontally on small screens"><table class="fc-rubric"><caption>School Tech Help Kit assessment criteria</caption><thead><tr><th scope="col">Criterion</th><th scope="col">1 · Beginning</th><th scope="col">2 · Developing</th><th scope="col">3 · Secure</th><th scope="col">4 · Extending</th></tr></thead><tbody>${course.rubric.map(row=>`<tr><th scope="row">${esc(row.criterion)}</th>${[0,1,2,3].map(level=>`<td>${esc(row.levels[level])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function projectContent(course){
  const project=course.capstone;
  return `${prose(project.brief)}<h3>What your kit must include</h3>${list(project.deliverables,true)}<h3>Project checkpoints</h3>${list(project.milestones)}<p>Use invented information and the supplied simulations or paper alternatives. Keep each version and its evidence in your school-managed document. Submit through the teacher’s Classroom assignment.</p>${rubric(course)}`;
}
function classroomGuidance(){return `<ol><li>Choose a lesson and select <strong>Share this lesson to Classroom</strong>. Google opens its own sign-in and class-selection interface for the public lesson link.</li><li>Attach a school-owned copy of the relevant student handout, or direct students to the printable handout on the lesson page. The editable workbook can be imported into Google Docs and split into daily documents.</li><li>Students open the lab, record their evidence in the school-managed document and turn it in through Classroom.</li><li>The teacher reviews the work and records feedback and grades in the school’s Google environment.</li></ol><p>Sharing posts a generic URL only. It does not attach the workbook, import a roster, submit student work or sync grades. Cole Learning Labs does not request Google Classroom credentials.</p>`;}
function privacy(){return `<p>No student accounts, roster imports, or student submissions and grades are stored in Cole Learning Labs through this course workflow. Use fictional details in the simulations and keep student records in the school’s approved system.</p><p>Lab links use student and shared-device modes. These modes are conveniences: the plain site remains available, and Downloads, clipboard contents and earlier saved browser work require school device procedures. Linked public labs and the hosting provider still process ordinary request and security metadata, such as IP address and request details.</p><p><a href="/district-review">Read the district review</a> and try the deployed site on a managed student device before class. This course is not a legal or accessibility certification.</p>`;}

function courseHub(course,lessons){
  const unitCards=course.units.map(unit=>`<li><strong>${esc(unit.title)}</strong><span>Weeks ${esc(unit.weeks)} · Days ${esc(unit.days)}</span></li>`).join('');
  return shell({title:course.title,description:'A nine-week grades 7–8 course: 45 complete 40-minute lessons, interactive labs, printable student handouts and a final School Tech Help Kit.',pathname:BASE,body:
  `${crumb()}<section class="fc-intro"><p class="eyebrow">First classroom-ready course · Teacher review edition</p><h1>${esc(course.title)}</h1><p class="fc-lede">${esc(course.overview)}</p>${facts()}<p class="fc-status">Complete authored first edition for teacher review and piloting. It has not been field-tested or approved by a district. Preview each lab on your school’s devices before teaching.</p><div class="button-row"><a class="button" href="${dayPath(1)}">Start with lesson 1</a><a class="button button-outline" href="#lesson-map">Browse all 45 lessons</a></div>${downloads()}<p><a href="/courses">More courses will be added later.</a></p></section>
  <nav class="fc-section-nav" aria-label="Course sections"><a href="#lesson-map">Lessons</a><a href="#teacher-setup">Teacher setup</a><a href="#classroom">Google Classroom</a><a href="${BASE}/project">Final project</a><a href="${BASE}/standards">Standards crosswalk</a><a href="#privacy">Student records</a></nav>
  ${section('outcomes','What students will learn',list(course.outcomes))}
  ${section('lesson-map','The 45-lesson course',`<ul class="fc-units">${unitCards}</ul><div class="fc-week-grid">${Array.from({length:9},(_,index)=>`<section class="fc-week"><h3>Week ${index+1}</h3><ol start="${index*5+1}">${lessons.filter(lesson=>Math.ceil(lesson.day/5)===index+1).map(lesson=>`<li><a href="${dayPath(lesson.day)}">${esc(lesson.title)}</a></li>`).join('')}</ol></section>`).join('')}</div>`)}
  ${section('teacher-setup','Before you teach',`<h3>Materials</h3>${list(course.materials)}<h3>Preparation</h3>${list(course.preparation)}<h3>Pacing and partner routines</h3>${list(course.pacing)}<h3>Assessment and feedback</h3>${list(course.assessment)}<p>Public lessons include teaching sequences, assessment criteria and student handouts. Private answer keys remain separate from this public course; keep teacher-only materials in staff-restricted school storage.</p>`)}
  ${section('classroom','Assign through Google Classroom',classroomGuidance())}
  ${section('project','The School Tech Help Kit',`${prose(course.capstone.brief)}<p><a class="button button-outline" href="${BASE}/project">Read the full student project brief and rubric</a></p>${downloads('project')}`)}
  ${section('privacy','Student records and site data',privacy())}
  ${section('next','Expanding the course',`${prose(course.extension)}<p><a href="/courses">More courses will be added to Cole Learning Labs.</a></p><h3>Sources</h3><ul>${course.sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a></li>`).join('')}</ul>`)}`});
}

function lessonPage(course,lesson){
  const lab=foundationsLabURL(lesson.lab.route), day=lesson.day, total=lesson.sequence.reduce((sum,step)=>sum+step.minutes,0);
  const nav=`<nav class="fc-lesson-nav" aria-label="Course lesson navigation">${day>1?`<a href="${dayPath(day-1)}">← Day ${day-1}</a>`:'<span>First lesson</span>'}<a href="${BASE}#lesson-map">All 45 lessons</a>${day<45?`<a href="${dayPath(day+1)}">Day ${day+1} →</a>`:'<span>Final lesson</span>'}</nav>`;
  return shell({title:`Day ${day}: ${lesson.title}`,description:`Grades 7–8, ${total} minutes. ${lesson.objective}`,pathname:dayPath(day),body:
  `${crumb(`Day ${day}`)}<section class="fc-intro"><p class="eyebrow">Week ${Math.ceil(day/5)} · Day ${day} of 45 · ${total} minutes</p><h1>${esc(lesson.title)}</h1><p class="fc-lede"><strong>Learning objective:</strong> ${esc(lesson.objective)}</p><div class="button-row"><a class="button" href="${esc(lab)}">Open the interactive lab</a><a class="button button-outline" href="#student-handout">Student handout</a><a class="button button-outline" href="${esc(foundationsShareURL(day))}" target="_blank" rel="noopener noreferrer">Share this lesson to Classroom</a></div><p class="fc-small">The Classroom link shares this public lesson and its student handout. It does not submit work, attach a document or sync grades.</p></section>${nav}
  ${section('student-handout','Student handout',`<p class="fc-print-help">Write in a school-managed document, on paper or use your teacher’s approved oral/dictated alternative. To print this lesson, use browser Print (Ctrl+P or Command+P) and check the preview. Use only fictional information.</p>${day>=41?`<p class="fc-notice">Keep the <a href="${BASE}/project">School Tech Help Kit project brief and six-criterion rubric</a> beside this handout during days 41–45.</p>`:''}<h3>Words to use</h3>${vocabulary(lesson.vocabulary)}<div class="fc-context"><h3>The fictional case</h3>${prose(lesson.handout.context)}</div><h3>Interactive lab: ${esc(lesson.lab.title)}</h3><p><a href="${esc(lab)}">Open the lab in student/shared-device mode</a></p><p class="fc-address">${esc(lab)}</p><p>Use the simulation controls only. Do not change real equipment, scan a real network or enter real credentials.</p>${list(lesson.lab.steps,true)}<p><strong>Evidence to hand in:</strong> ${esc(lesson.lab.output)}</p><aside class="fc-fallback"><h3>Paper alternative</h3>${prose(lesson.lab.fallback)}</aside><h3>Questions</h3><ol class="fc-questions">${lesson.handout.questions.map(question=>`<li><span class="fc-authored">${esc(question)}</span><div class="fc-response" aria-hidden="true"></div></li>`).join('')}</ol><h3>Before you hand in</h3>${list(lesson.handout.checklist)}<p>Turn in your school-managed document or attach a reviewed lab report through your teacher’s Classroom assignment. Nothing is submitted automatically by this page.</p><h3>Exit ticket</h3>${prose(lesson.exitTicket)}<div class="fc-response fc-short" aria-hidden="true"></div><h3>Support and response choices</h3>${list(lesson.support)}<h3>Further challenge</h3>${list(lesson.challenge)}${downloads()}`)}
  ${section('teacher-plan','Teach this lesson',`<h3>Materials</h3>${list(lesson.materials)}<h3>Preparation</h3>${list(lesson.prep)}<h3>Timed sequence</h3><ol class="fc-sequence">${lesson.sequence.map(step=>`<li><h4>${esc(step.label)} <span>(${step.minutes} min)</span></h4>${prose(step.teacher)}</li>`).join('')}</ol><h3>Discussion</h3>${list(lesson.discussion,true)}<h3>Assessment guidance</h3><table><caption>Evidence to review for day ${day}</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Look for</th></tr></thead><tbody>${lesson.assessment.criteria.map(criterion=>`<tr><th scope="row">${esc(criterion.label)}</th><td>${esc(criterion.lookFor)}</td></tr>`).join('')}</tbody></table><p><strong>Minimum evidence:</strong> ${esc(lesson.assessment.success)}</p><p>Assess the explanation and evidence. Speed and a successful simulation check alone are not a grade. Keep answer keys, student work and grades in the school’s approved restricted resources.</p>`)}
  ${section('standards','Standards connection',`<p>${lesson.standards.map(code=>`<span class="fc-standard">${esc(code)}</span>`).join(' ')||'Concept connection; no individual code asserted.'}</p>${prose(lesson.standardEvidence)}<p><a href="${BASE}/standards">Read the selected NYSED crosswalk, sources and limits</a>. This is an author-created connection, not NYSED endorsement or proof of mastery.</p>`)}${nav}`});
}

function projectPage(course){return shell({title:'School Tech Help Kit: student project brief',description:'Days 41–45 final project: build a tested program, diagram and troubleshooting procedure; review the six-criterion rubric and submission requirements.',pathname:`${BASE}/project`,body:`${crumb('Final project')}<section class="fc-intro"><p class="eyebrow">Student project brief · Days 41–45</p><h1>${esc(course.capstone.title)}</h1><p class="fc-lede">Build, test and explain a kit for a fictional school’s tech team.</p>${downloads('project')}<p><a href="${dayPath(41)}">Begin with day 41: project planning</a></p></section>${section('student-project','Your project brief',projectContent(course))}`});}

function standardsPage(course){
  const data=course.crosswalk||{},entries=Array.isArray(data)?data:data.entries||[];
  return shell({title:'Foundations: selected NYSED standards crosswalk',description:'Selected grades 7–8 NYSED standards connections with lesson days, observable evidence, source links and explicit coverage limitations.',pathname:`${BASE}/standards`,body:`${crumb('Standards')}<section class="fc-intro"><p class="eyebrow">Teacher planning reference</p><h1>Selected NYSED standards connections</h1><p class="fc-lede">Review the lesson objective and actual student evidence before selecting an expectation. This introductory course does not cover every grades 7–8 standard.</p>${prose(data.verificationNote)}${data.checkedDate?`<p>Source check: ${esc(data.checkedDate)}.</p>`:''}</section>${section('crosswalk','The selected crosswalk',`<div class="fc-table-scroll" role="region" tabindex="0" aria-label="Selected standards crosswalk; scroll horizontally on small screens"><table class="fc-crosswalk"><caption>Author-created connections. Expectations below are paraphrases, not exact quotations.</caption><thead><tr><th scope="col">Code and expectation</th><th scope="col">Lesson days</th><th scope="col">Evidence and scope</th></tr></thead><tbody>${entries.map(entry=>`<tr><th scope="row"><span class="fc-standard">${esc(entry.code)}</span><p>${esc(entry.paraphrase)}</p><a href="${esc(entry.sourceUrl)}" target="_blank" rel="noopener noreferrer">NYSED source</a></th><td>${entry.finalDays?.length?entry.finalDays.map(day=>`<a href="${dayPath(day)}">${esc(day)}</a>`).join(', '):'No direct connection asserted.'}</td><td>${prose(entry.scopeNote)}</td></tr>`).join('')}</tbody></table></div>`)}${section('limits','Coverage limits',list(data.coverageGaps||[]))}${section('sources','Official source documents',`<ul>${(data.sources||[]).map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>${source.retrieval?` — ${esc(source.retrieval)}`:''}</li>`).join('')}</ul>`)}`});
}

/** Render a fixed, public-only projection. No learner records or private key fields are read. */
export function renderFoundationsCourse({course,lessons}={}){
  if(!Array.isArray(lessons)||lessons.length!==45)throw new Error('Foundations needs exactly 45 public lessons.');
  const sorted=[...lessons].sort((a,b)=>a.day-b.day);
  for(const [index,lesson]of sorted.entries()){
    if(lesson.day!==index+1)throw new Error('Foundations lesson days must be 1 through 45.');
    if(lesson.sequence.reduce((sum,step)=>sum+step.minutes,0)!==40)throw new Error(`Foundations day ${lesson.day} must total 40 minutes.`);
    foundationsLabURL(lesson.lab.route);
  }
  const pages=new Map([['courses/foundations/index.html',courseHub(course,sorted)],...sorted.map(lesson=>[`courses/foundations/day-${pad(lesson.day)}.html`,lessonPage(course,lesson)]),['courses/foundations/project.html',projectPage(course)],['courses/foundations/standards.html',standardsPage(course)]]);
  if(pages.size!==COURSE_PAGE_FILES.length||[...pages.keys()].some(file=>!COURSE_PAGE_FILES.includes(file)))throw new Error('Unexpected generated course page.');
  return pages;
}
