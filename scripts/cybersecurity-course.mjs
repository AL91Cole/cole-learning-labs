import {coursePage, esc} from './course-page.mjs';
import {CYBER_FIELD_LABS} from '../src/linux-catalog.js';

const title = 'Intro to Cybersecurity and Responsible AI';
const directory = 'courses/cybersecurity-responsible-ai';
const base = '/' + directory;
const lessonCount = 17;
const projectLessons = [16, 17];
const labPacing = 'Grades 7–8 · 15–20 minutes';
const practiceId = number => 'practice-' + String(number).padStart(2, '0');
const lessonSlug = number => 'lesson-' + String(number).padStart(2, '0');
const lessonPath = number => base + '/' + lessonSlug(number);
const lessonFiles = Array.from({length: lessonCount}, (_, i) => directory + '/' + lessonSlug(i + 1) + '.html');
export const NEW_COURSE_PAGE_FILES = Object.freeze([
  directory + '/index.html', ...lessonFiles, directory + '/workbook.html', directory + '/project.html'
]);

const list = (items, tag = 'ul') => `<${tag}>${items.map(item => `<li>${esc(item)}</li>`).join('')}</${tag}>`;
const section = (id, heading, body) => `<section class="fc-section" id="${id}"><h2>${esc(heading)}</h2>${body}</section>`;
const rubric = [
  ['Protect the audience', 'Identify the suspicious request, point to its clue and name a trusted reporting channel. Keep private details out of the bulletin.'],
  ['Verify the announcement', 'Check the draft against the dated club and office records. Identify the source that supports each correction and flag any claim still waiting for confirmation.'],
  ['Respect the creator', 'Check what the creator allowed. Credit any art you use, explain how AI helped and name the person who reviews the bulletin before it goes out.'],
  ['Revise and follow up', 'Show what changed between your two drafts. Explain why the newer evidence matters and how earlier readers will get the correction.']
];

function page(pathname, heading, description, body) {
  return coursePage({
    title: heading, pathname, description, body,
    footerNote: `<p><a href="${base}">${title}</a> · <a href="/courses">Course catalog</a></p>`
  });
}

function breadcrumb(current) {
  return `<nav class="fc-breadcrumb" aria-label="Breadcrumb"><a href="/courses">Courses</a><span aria-hidden="true">/</span>${current
    ? `<a href="${base}">${title}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(current)}</span>`
    : `<span aria-current="page">${title}</span>`}</nav>`;
}

function activityLink(activity) {
  if (!activity) return '';
  if (!/^#(?:learn|play|practice|arcade|lab)\/[a-z0-9-]+$/iu.test(activity.route)) {
    throw new Error('Course activities must link to a local learning route.');
  }
  return `<aside class="fc-fallback"><h3>Try the simulation</h3><p><a href="/?mode=student&amp;cart=true${esc(activity.route)}">${esc(activity.label)}</a></p><p>${esc(activity.prompt)}</p></aside>`;
}

/** A link to a cyber field lab on a real Linux computer. The lesson's own browser or paper work is the fallback. */
function machineLab(entry, number) {
  if (!entry) return '';
  const lab = CYBER_FIELD_LABS.find(item => item.id === entry.id);
  if (!lab || lab.lesson !== number) throw new Error('Lesson ' + number + ' needs the cyber field lab written for it.');
  return `<aside class="fc-fallback" id="real-lab-${String(number).padStart(2, '0')}"><h3>Real Linux lab · ${esc(lab.title)}</h3>
    <p><strong>Grades 7–8 · ${lab.minutes} minutes · ${lab.skills.map(skill => `<code>${esc(skill)}</code>`).join(' ')}</strong></p>
    <p><a href="/?mode=student&amp;cart=true#linux/${esc(lab.id)}">Open ${esc(lab.id)} on a real Linux computer</a></p>
    <p>${esc(entry.prompt)}</p>
    <p>This lab opens a real Linux desktop in your browser. It is private to you, has no internet access and is erased when you leave. Every step shows the exact command to type. If no practice computer is available, use the other activities on this page. Use these tools only on the practice files.</p></aside>`;
}

function codeBlocks(blocks = []) {
  return blocks.map(block => `<h4>${esc(block.title)}</h4><pre class="fc-authored fc-code"><code>${esc(block.lines.join('\n'))}</code></pre>`).join('');
}

function classLab(lab, number) {
  if (!lab) return '';
  if (!/^\/labs\/[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(lab.path)) {
    throw new Error('Class investigations require a local lab page.');
  }
  return `<section class="fc-context" id="${practiceId(number)}"><h3>${esc(lab.title)}</h3>
    <p><strong>${labPacing}</strong></p><p>${esc(lab.introduction)}</p>
    <div class="button-row"><a class="button" href="${esc(lab.path)}">Open interactive lab</a>
    <a class="button button-outline" href="${esc(lab.path)}#paper">Open printable lab</a></div>
    ${list(lab.steps, 'ol')}<p><strong>What to turn in.</strong> ${esc(lab.artifact)}</p></section>`;
}

function handout(lesson, number) {
  const tallySheet = lesson.tallySheet ? `<table><caption>Copy this tally sheet and fill in the counts from the evidence cards.</caption>
    <thead><tr><th scope="col">Who was asked?</th><th scope="col">Before school</th><th scope="col">Lunch</th></tr></thead>
    <tbody>${['At early practice', 'At the last bus', 'Total votes'].map(group =>
      `<tr><th scope="row">${group}</th><td>___</td><td>___</td></tr>`).join('')}</tbody></table>` : '';
  return `<aside class="fc-fallback"><h3>Warm-up · ${esc(lesson.warmup.title)}</h3><p>${esc(lesson.warmup.text)}</p></aside>
    <h3>Try one together</h3><p>${esc(lesson.example)}</p>
    <div class="fc-context"><h3>${esc(lesson.caseTitle)}</h3><p>${esc(lesson.caseText)}</p></div>
    <h3>Evidence cards</h3> ${list(lesson.evidence)}${codeBlocks(lesson.code)}${tallySheet}
    <h3>${lesson.courseLab ? 'Work the class case together' : 'Your investigation'}</h3>${list(lesson.tasks, 'ol')}
    ${classLab(lesson.courseLab, number)}${machineLab(lesson.machineLab, number)}${activityLink(lesson.activity)}
    <h3>Words for this case</h3><dl class="fc-vocabulary">${lesson.terms.map(({term, meaning}) =>
      `<div><dt>${esc(term)}</dt><dd>${esc(meaning)}</dd></div>`).join('')}</dl>
    <p><strong>Try this if you’re stuck.</strong> ${esc(lesson.support)}</p>
    <p><strong>Take it further.</strong> ${esc(lesson.stretch)}</p>
    <h3>Exit ticket</h3><p>${esc(lesson.exit)}</p>
    <p><strong>Skill unlocked · ${esc(lesson.skill)}.</strong> Tick it on your skill tracker once you can explain your exit ticket answer to a partner.</p>`;
}

function teacherPlan(lesson) {
  return section('teacher-plan', 'Teach this lesson', `<ol class="fc-sequence">${lesson.teacher.map(step =>
    `<li><p><strong>${esc(step.minutes)} minutes</strong> · ${esc(step.instruction)}</p></li>`).join('')}</ol>
    <h3>What to look for</h3><p>${esc(lesson.lookFor)}</p>`);
}

function lessonPage(lesson, number) {
  const nav = `<nav class="fc-lesson-nav" aria-label="Lesson navigation">${number > 1
    ? `<a href="${lessonPath(number - 1)}">← Lesson ${number - 1}</a>` : ''}
    <a href="${base}#lesson-map">All ${lessonCount} lessons</a>${number < lessonCount
      ? `<a href="${lessonPath(number + 1)}">Lesson ${number + 1} →</a>` : `<a href="${base}/project#rubric">Review the project rubric</a>`}</nav>`;
  const body = `${breadcrumb('Lesson ' + number)}
    <header class="fc-intro"><p class="eyebrow">Lesson ${number} of ${lessonCount} · 40 minutes</p>
    <h1>${esc(lesson.title)}</h1><p class="fc-lede">${esc(lesson.objective)}</p>
    <div class="button-row"><a class="button" href="#student-handout">Open the case</a>${lesson.courseLab ? `<a class="button button-outline" href="#${practiceId(number)}">Hands-on investigation</a>` : ''}<a class="button button-outline" href="#teacher-plan">Teacher plan</a></div></header>
    ${projectLessons.includes(number) ? `<p class="fc-notice">Use the <a href="${base}/project">Safe-to-Share Bulletin project brief and rubric</a> with this case.</p>` : ''}
    ${section('student-handout', 'Student handout', handout(lesson, number))}
    ${teacherPlan(lesson)}${nav}`;
  return page(lessonPath(number), `Lesson ${number} · ${lesson.title}`, lesson.objective, body);
}

function skillTracker(lessons) {
  return `<ul class="fc-skill-list">${lessons.map((lesson, i) =>
    `<li><span aria-hidden="true">☐</span> <a href="${lessonPath(i + 1)}">Lesson ${i + 1}</a> · <strong>${esc(lesson.skill)}</strong></li>`).join('')}</ul>`;
}

function overview(lessons) {
  const units = [
    {heading: 'Unit 1 · Lock it down', start: 0, end: 4},
    {heading: 'Unit 2 · Spot it and stop it', start: 4, end: 8},
    {heading: 'Unit 3 · Question the AI', start: 8, end: 12},
    {heading: 'Unit 4 · Automate it and share it safely', start: 12, end: 17}
  ];
  const map = units.map(({heading, start, end}) => `<section class="fc-week"><h3>${heading}</h3><ol start="${start + 1}">${lessons.slice(start, end).map((lesson, i) =>
    `<li><a href="${lessonPath(start + i + 1)}">${esc(lesson.title)}</a></li>`).join('')}</ol></section>`).join('');
  const classLabs = lessons.flatMap((lesson, i) => {
    if (!lesson.courseLab) return [];
    const {title: labTitle, path, introduction} = lesson.courseLab;
    return `<article class="fc-week"><h3><a href="${esc(path)}">${esc(labTitle)}</a></h3>
      <p>${esc(introduction)}</p><p><a href="${lessonPath(i + 1)}#student-handout">Lesson ${i + 1} handout</a> · <a href="${esc(path)}#paper">Printable lab</a></p></article>`;
  }).join('');
  const realLabs = CYBER_FIELD_LABS.map(lab => `<article class="fc-week"><h3><a href="/?mode=student&amp;cart=true#linux/${esc(lab.id)}">${esc(lab.title)}</a></h3>
      <p>${esc(lab.summary)}</p><p>${lab.skills.map(skill => `<code>${esc(skill)}</code>`).join(' ')}</p><p><a href="${lessonPath(lab.lesson)}#real-lab-${String(lab.lesson).padStart(2, '0')}">Lesson ${lab.lesson} handout</a> · ${lab.minutes} minutes</p></article>`).join('');
  const labLessons = lessons.flatMap((lesson, i) => lesson.courseLab ? [i + 1] : []);
  const description = 'Crack a cipher, read a real sign-in log, run a first Python script, train a sorting robot and catch an AI draft getting it wrong. Seventeen 40-minute lessons for grades 7–8.';
  const body = `${breadcrumb()}
    <header class="fc-intro"><p class="eyebrow">Grades 7–8 · Classroom course</p><h1>${title}</h1>
    <p class="fc-lede">A scrambled note falls out of a locker. A message wants your sign-in code in two minutes. A robot aces its practice cards, then puts a soup can in the trash. Each lesson hands you a case from a fictional school club. Your job is to work out what happened and what to do next.</p>
    <dl class="fc-facts"><div><dt>Class time</dt><dd>${lessonCount} × 40 minutes</dd></div><div><dt>Experience</dt><dd>Beginner</dd></div><div><dt>Materials</dt><dd>Browser, real Linux lab or paper</dd></div><div><dt>Final project</dt><dd>Safe-to-Share Bulletin</dd></div></dl>
    <div class="button-row"><a class="button" href="${lessonPath(1)}">Start lesson 1</a><a class="button button-outline" href="${base}/workbook">Student workbook</a></div></header>
    <nav class="fc-section-nav" aria-label="Course sections"><a href="#lesson-map">Lesson map</a><a href="#course-labs">Hands-on investigations</a><a href="#skills">Skill tracker</a><a href="#teach">Teacher setup</a><a href="${base}/project">Project and rubric</a><a href="#background">Course background</a></nav>
    ${section('lesson-map', 'What will you investigate?', `<div class="fc-week-grid">${map}</div>
      <p>By the end, you can match a safeguard to a risk, explain how a message travels and stays secret, report an incident using evidence, say what an AI model learned and why it can be wrong, read a short Python script that automates a security check, and decide what an AI-assisted announcement needs before anyone shares it.</p>`)}
    ${section('course-labs', 'Hands-on investigations', `<p><strong>${labPacing} per lab.</strong> Each investigation fits inside its 40-minute lesson. Choose the browser or paper edition. Lessons 2, 3, 5 and 10 also link to a practice simulation.</p><div class="fc-week-grid">${classLabs}</div>
      <h3 id="real-labs">On a real Linux computer</h3><p>Four cyber field labs repeat a classroom case with the tools a security analyst uses. Each opens a real Linux desktop in the browser and checks every step. They need the Cole Learning Labs practice computers to be available, so each lesson keeps a browser or paper activity as well.</p><div class="fc-week-grid">${realLabs}</div>`)}
    ${section('skills', 'Skill tracker', `<p>Every lesson starts with a short warm-up challenge and ends with a skill. Tick a skill once you can explain your exit ticket answer to a partner.</p>${skillTracker(lessons)}`)}
    ${section('teach', 'Before you teach', `<p>Plan for three and a half school weeks at five classes per week, or use one lesson per meeting. Units 1 and 2 cover cybersecurity, unit 3 covers how AI works and where it goes wrong, and unit 4 adds a first Python script before the project brings everything together. Start with lesson 1. Reserve the last two periods for drafting and revising the bulletin.</p>
      <h3>Prepare the cases</h3><p>Give each pair a copy of the <a href="${base}/workbook">student workbook</a> and each reviewer the <a href="${base}/project#rubric">project rubric</a>. Use the print command in your browser or project one case at a time. Students can write, draw an annotated timeline or dictate a response. For lessons ${labLessons.slice(0, -1).join(', ')} and ${labLessons.at(-1)}, also open each printable lab from the student handout and print its evidence and prompts before class.</p>
      <h3>Try the real Linux labs first</h3><p>Lessons ${CYBER_FIELD_LABS.map(lab => lab.lesson).slice(0, -1).join(', ')} and ${CYBER_FIELD_LABS.at(-1).lesson} each offer a <a href="#real-labs">real Linux lab</a>. Open one on a student device and your school network before class. In lessons 4 and 7 it can replace the browser investigation or fill an extra period. If the practice computers are not available, teach from the browser and paper activities, which cover the same ideas. Students new to a command line can warm up with the first <a href="/?mode=student&amp;cart=true#linux">Linux basics</a> lab.</p>
      <h3>Gather a few supplies</h3><p>The warm-ups use scrap paper, a hole punch for lesson 6, six small classroom objects for lesson 9 and a short fact card about an invented animal for lesson 11. No warm-up needs a device.</p>
      <h3>Run the investigations</h3><p>Open with the warm-up challenge. Ask one partner to read the evidence and the other to challenge one assumption. Swap roles in the next case. Each lesson has a timed plan, an exit ticket and a description of what to listen for. Use the exit ticket to decide which idea to revisit next class.</p>
      <h3>Set the practice boundary</h3><p>Use only the invented records on these pages and the linked Cole Learning Labs simulations. Students crack only the supplied note, test only the fictional systems on the cards, run commands and scripts only on the practice computer’s own files, and never try a technique on a real account, network or person. Keep real names, passwords, school incidents and student work out of the examples. Use paper or your school’s approved assignment space for responses. The AI drafts are supplied, so the activities work without a chatbot account. For a real concern, follow your school’s reporting process.</p>`)}
    ${section('background', 'Where the cases come from', `<p>Mx. Cole’s cybersecurity and AI study connects everyday school IT questions with habits students can practice here. They check who has permission, show the evidence for a decision and ask what a tool was actually taught. The school clubs, messages, robots and announcements in these lessons are original fictional cases.</p>
      <ul><li><strong>CompTIA Security+ and ISC2 Certified in Cybersecurity (CC).</strong> Lessons 1 and 2 draw on the Security+ V7 modules about managing risk and controlling access, alongside the CC security principles and access control concepts. Lesson 4 introduces encryption and hashing from the CC data security outline. Lesson 6 uses the CC ideas of technical, administrative and physical controls, defense in depth and recovery. Lesson 8 follows the ISC2 Code of Ethics: act honorably, honestly, justly, responsibly and legally.</li>
      <li><strong>American Public University and TryHackMe.</strong> Lesson 3 draws on APU’s Professional Certificate in Computer Systems and Networks, including its Networking Concepts, Wireless Networks, and Computer and Network Security courses, and on TryHackMe’s Pre Security (SEC0) and Cyber Security 101 (SEC1) paths. Students follow a request from a web address to a web page, the way those paths do. The certificate’s computer systems and hardware courses inform the shared-laptop troubles in lesson 6.</li>
      <li><strong>Google Cybersecurity Professional Certificate.</strong> Lesson 5 practices the social engineering and phishing response covered across the certificate. Lesson 6 adapts <em>Assets, Threats, and Vulnerabilities</em>. Lesson 7 adapts the detection and response work in <em>Sound the Alarm</em>. Pairs put four records in order, report what they can confirm and test whether the club can use its recovered work. The real Linux labs follow <em>Tools of the Trade: Linux and SQL</em>, and lesson 15 is a first step into <em>Automate Cybersecurity Tasks with Python</em>: students read, run and adjust a short script that counts failed sign-ins.</li>
      <li><strong>Google AI Professional Certificate.</strong> The certificate’s AI fundamentals inform unit 3. Students build a prompt that says what to make and for whom in lesson 10, evaluate an AI draft for accuracy in lesson 11 and for bias in lesson 12, and keep a person responsible for the final decision.</li>
      <li><strong>TryHackMe AI Security and the ISC2 guidance on AI.</strong> Lesson 9 introduces training data and data poisoning as an integrity problem. Lesson 13 turns prompt injection and prompt defense into a paper exercise in which students separate information from instructions, then limit what an AI helper may do. Both lessons apply least privilege to AI tools, as the ISC2 CC outline now does.</li>
      <li><strong>University at Albany coursework, AI ethics research and school IT practice.</strong> Mx. Cole studies cybersecurity at UAlbany with a focus on AI and ethical hacking. Across the course, students work inside a signed testing agreement, protect classmates’ privacy, ask whose voices a survey missed and explain when a person needs to review an AI suggestion.</li></ul>
      <h3>Teacher reading</h3><ul>
      <li><a href="https://github.com/AL91Cole/AL91Cole">Mx. Cole’s education, credentials and hands-on learning</a></li>
      <li><a href="https://github.com/AL91Cole/ai-ethics-and-moral-philosophy">Mx. Cole’s AI Ethics and Moral Philosophy research</a></li>
      <li><a href="https://github.com/AL91Cole/ai-guardian-web-shield">AI Guardian Web Shield project</a></li>
      <li><a href="https://www.isc2.org/ethics">ISC2 Code of Ethics</a></li>
      <li><a href="https://www.cisa.gov/secure-our-world">CISA Secure Our World guidance on passwords, multifactor authentication, phishing and updates</a></li>
      <li><a href="https://genai.owasp.org/llm-top-10/">OWASP Top 10 for large language model applications, including prompt injection and data poisoning</a></li>
      <li><a href="https://help.openai.com/en/articles/8313428-does-chatgpt-tell-the-truth">OpenAI on inaccurate answers and source checking</a></li>
      <li><a href="https://airc.nist.gov/airmf-resources/playbook/measure/">NIST AI Risk Management Framework Playbook on evaluating AI risks and fairness</a></li></ul>`)}`;
  return page(base, title, description, body);
}

function workbook(lessons) {
  const description = 'Printable evidence cards, investigation prompts and exit tickets for every lesson.';
  const body = `${breadcrumb('Student workbook')}<header class="fc-intro">
    <p class="eyebrow">Student workbook · Grades 7–8</p><h1>Cybersecurity and Responsible AI workbook</h1>
    <p class="fc-lede">Start each case with the warm-up challenge. Use the evidence cards to make a decision. Write down what you saw, what you would do and what you still need to check.</p></header>
    <p class="fc-print-help">Use browser Print to print this workbook. Answer on a separate sheet, in a school-managed document or aloud with a partner. Label each response with the lesson and question number. All names and records in the cases are fictional.</p>
    <section class="fc-section" id="skills"><h2>My skill tracker</h2>${skillTracker(lessons)}</section>
    <nav aria-label="Workbook contents"><ol>${lessons.map((lesson, i) => `<li><a href="#${lessonSlug(i + 1)}">${esc(lesson.title)}</a>${lesson.courseLab ? ` · <a href="#${practiceId(i + 1)}">${esc(lesson.courseLab.title)}</a>` : ''}</li>`).join('')}</ol></nav>
    <div class="fc-workbook">${lessons.map((lesson, i) => section(lessonSlug(i + 1), `Lesson ${i + 1} · ${lesson.title}`,
      `<p>${esc(lesson.objective)}</p>${projectLessons.includes(i + 1) ? `<p>Use the <a href="${base}/project">project brief and rubric</a> for this lesson.</p>` : ''}${handout(lesson, i + 1)}`)).join('')}</div>`;
  return page(base + '/workbook', 'Student workbook · ' + title, description, body);
}

function project() {
  const body = `${breadcrumb('Final project')}<header class="fc-intro"><p class="eyebrow">Student project · Lessons ${projectLessons[0]} and ${projectLessons[1]}</p>
    <h1>Safe-to-Share Bulletin</h1><p class="fc-lede">Your school club has a draft announcement, a suspicious message and a drawing it might use. Your job is to give students a bulletin they can trust and show the adviser why it’s ready.</p></header>
    ${section('brief', 'What to hand in', `<ol>
    <li>Use the <a href="${lessonPath(projectLessons[0])}#student-handout">lesson ${projectLessons[0]} records</a> to write a short public bulletin. Include the facts a student needs to attend, the approved way to sign up, and a credit line for any artwork you choose to use.</li>
    <li>Attach an editor’s note for the adviser. List what the AI draft got right, what you changed or left out, and the clue or dated source behind each choice. Describe how you would report the suspicious message.</li>
    <li>Give your draft to another pair. Ask them to circle one claim they can verify and put a question mark beside one claim or permission they would double-check.</li>
    <li>Open the <a href="${lessonPath(projectLessons[1])}#student-handout">lesson ${projectLessons[1]} update</a>. Keep both versions. Revise the bulletin and add a correction note saying what changed, what evidence changed your mind and how you would reach earlier readers.</li></ol>
    <p>A handwritten bulletin, typed announcement or recorded reading with an accompanying evidence note can earn the same score. Turn in both versions and your notes through your teacher’s usual process.</p>`)}
    ${section('rubric', 'Project rubric', `<p>Score each criterion from 0 to 2, for a total of 8. Award 2 when the work shows the decision and the specific evidence described below, 1 when the decision or its evidence is missing or incomplete, and 0 when neither appears.</p>
    <dl class="fc-vocabulary">${rubric.map(([criterion, evidence]) => `<div><dt>${esc(criterion)}</dt><dd>${esc(evidence)}</dd></div>`).join('')}</dl>
    <p>Before you hand it in, point to a line in your work for each criterion. Tell your reviewer which change made your bulletin safer or more accurate.</p>`)}`;
  return page(base + '/project', 'Safe-to-Share Bulletin', 'Draft, audit and revise a school club bulletin using a four-criterion rubric.', body);
}

export function renderCybersecurityCourse(lessons) {
  if (!Array.isArray(lessons) || lessons.length !== lessonCount) throw new Error('This course requires ' + lessonCount + ' lessons.');
  const pages = new Map([[NEW_COURSE_PAGE_FILES[0], overview(lessons)]]);
  for (const [i, lesson] of lessons.entries()) {
    if (lesson.teacher.reduce((total, step) => total + step.minutes, 0) !== 40) {
      throw new Error(`Lesson ${i + 1} needs a 40-minute teaching plan.`);
    }
    pages.set(lessonFiles[i], lessonPage(lesson, i + 1));
  }
  pages.set(directory + '/workbook.html', workbook(lessons));
  pages.set(directory + '/project.html', project());
  return pages;
}
