import {coursePage, esc} from './course-page.mjs';

const title = 'Intro to Cybersecurity and Responsible AI';
const directory = 'courses/cybersecurity-responsible-ai';
const base = '/' + directory;
const lessonCount = 10;
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

function handout(lesson, number) {
  const tallySheet = number === 7 ? `<table><caption>Copy this tally sheet and fill in the counts from the evidence cards.</caption>
    <thead><tr><th scope="col">Who was asked?</th><th scope="col">Before school</th><th scope="col">Lunch</th></tr></thead>
    <tbody>${['At early practice', 'At the last bus', 'Total votes'].map(group =>
      `<tr><th scope="row">${group}</th><td>___</td><td>___</td></tr>`).join('')}</tbody></table>` : '';
  return `<h3>Try one together</h3><p>${esc(lesson.example)}</p>
    <div class="fc-context"><h3>${esc(lesson.caseTitle)}</h3><p>${esc(lesson.caseText)}</p></div>
    <h3>Evidence cards</h3> ${list(lesson.evidence)}${tallySheet}
    <h3>Your investigation</h3>${list(lesson.tasks, 'ol')}
    ${activityLink(lesson.activity)}
    <h3>Words for this case</h3><dl class="fc-vocabulary">${lesson.terms.map(({term, meaning}) =>
      `<div><dt>${esc(term)}</dt><dd>${esc(meaning)}</dd></div>`).join('')}</dl>
    <p><strong>Try this if you’re stuck.</strong> ${esc(lesson.support)}</p>
    <p><strong>Take it further.</strong> ${esc(lesson.stretch)}</p>
    <h3>Exit ticket</h3><p>${esc(lesson.exit)}</p>`;
}

function teacherPlan(lesson) {
  return section('teacher-plan', 'Teach this lesson', `<ol class="fc-sequence">${lesson.teacher.map(step =>
    `<li><p><strong>${esc(step.minutes)} minutes</strong> · ${esc(step.instruction)}</p></li>`).join('')}</ol>
    <h3>What to look for</h3><p>${esc(lesson.lookFor)}</p>`);
}

function lessonPage(lesson, number) {
  const nav = `<nav class="fc-lesson-nav" aria-label="Lesson navigation">${number > 1
    ? `<a href="${lessonPath(number - 1)}">← Lesson ${number - 1}</a>` : ''}
    <a href="${base}#lesson-map">All ten lessons</a>${number < lessonCount
      ? `<a href="${lessonPath(number + 1)}">Lesson ${number + 1} →</a>` : `<a href="${base}/project#rubric">Review the project rubric</a>`}</nav>`;
  const body = `${breadcrumb('Lesson ' + number)}
    <header class="fc-intro"><p class="eyebrow">Lesson ${number} of 10 · 40 minutes</p>
    <h1>${esc(lesson.title)}</h1><p class="fc-lede">${esc(lesson.objective)}</p>
    <div class="button-row"><a class="button" href="#student-handout">Open the case</a><a class="button button-outline" href="#teacher-plan">Teacher plan</a></div></header>
    ${number >= 9 ? `<p class="fc-notice">Use the <a href="${base}/project">Safe-to-Share Bulletin project brief and rubric</a> with this case.</p>` : ''}
    ${section('student-handout', 'Student handout', handout(lesson, number))}
    ${teacherPlan(lesson)}${nav}`;
  return page(lessonPath(number), `Lesson ${number} · ${lesson.title}`, lesson.objective, body);
}

function overview(lessons) {
  const units = [
    {heading: 'Protect the club', start: 0, end: 4},
    {heading: 'Question the AI draft', start: 4, end: 8},
    {heading: 'Publish a bulletin you can defend', start: 8, end: 10}
  ];
  const map = units.map(({heading, start, end}) => `<section class="fc-week"><h3>${heading}</h3><ol start="${start + 1}">${lessons.slice(start, end).map((lesson, i) =>
    `<li><a href="${lessonPath(start + i + 1)}">${esc(lesson.title)}</a></li>`).join('')}</ol></section>`).join('');
  const description = 'Help a fictional school club protect its files, question an AI draft and share a bulletin classmates can trust. Ten 40-minute lessons for grades 7–8.';
  const body = `${breadcrumb()}
    <header class="fc-intro"><p class="eyebrow">Grades 7–8 · Classroom course</p><h1>${title}</h1>
    <p class="fc-lede">An urgent message asks for the club password. An AI-written flyer lists a meeting time nobody remembers approving. What would you check before anyone acts on either one?</p>
    <dl class="fc-facts"><div><dt>Class time</dt><dd>10 × 40 minutes</dd></div><div><dt>Experience</dt><dd>Beginner</dd></div><div><dt>Materials</dt><dd>Browser or paper</dd></div><div><dt>Final project</dt><dd>Safe-to-Share Bulletin</dd></div></dl>
    <div class="button-row"><a class="button" href="${lessonPath(1)}">Start lesson 1</a><a class="button button-outline" href="${base}/workbook">Student workbook</a></div></header>
    <nav class="fc-section-nav" aria-label="Course sections"><a href="#lesson-map">Lesson map</a><a href="#teach">Teacher setup</a><a href="${base}/project">Project and rubric</a><a href="#background">Course background</a></nav>
    ${section('lesson-map', 'What will you investigate?', `<div class="fc-week-grid">${map}</div>
      <p>By the end, you can match a safeguard to a risk, report an incident using evidence, and decide what an AI-assisted announcement needs before anyone shares it.</p>`)}
    ${section('teach', 'Before you teach', `<p>Plan for two school weeks at five classes per week, or use one lesson per meeting. Start with lesson 1. Reserve the last two periods for drafting and revising the bulletin.</p>
      <h3>Prepare the cases</h3><p>Give each pair a copy of the <a href="${base}/workbook">student workbook</a> and each reviewer the <a href="${base}/project#rubric">project rubric</a>. Use the print command in your browser or project one case at a time. Students can write, draw an annotated timeline or dictate a response. All the evidence needed for the paper version appears on the handout.</p>
      <h3>Run the investigations</h3><p>Ask one partner to read the evidence and the other to challenge one assumption. Swap roles in the next case. Each lesson has a timed plan, an exit ticket and a description of what to listen for. Use the exit ticket to decide which idea to revisit next class.</p>
      <h3>Set the practice boundary</h3><p>Use only the invented records on these pages and the linked Cole Learning Labs simulations. Keep real names, passwords, school incidents and student work out of the examples. Use paper or your school’s approved assignment space for responses. The AI drafts are supplied, so the activities work without a chatbot account. For a real concern, follow your school’s reporting process.</p>`)}
    ${section('background', 'Where the cases come from', `<p>Mx. Cole’s cybersecurity study connects everyday school IT questions with two habits students can practice here. They check who has permission and show the evidence for a decision. The school clubs, messages and announcements in these lessons are original fictional cases.</p>
      <ul><li><strong>CompTIA Security+ and ISC2 Certified in Cybersecurity (CC).</strong> Lessons 1–2 draw on the Security+ V7 modules about managing risk and controlling access, alongside the CC security principles. Students name what could go wrong with a shared file, choose a safeguard and check who still needs access.</li>
      <li><strong>American Public University and TryHackMe.</strong> Lesson 1 draws on APU’s Professional Certificate in Computer Systems and Networks, including its Networking Concepts, Wireless Networks, and Computer and Network Security courses. It also draws on TryHackMe’s Pre Security (SEC0) and Cyber Security 101 (SEC1) paths. Two students can reach the same school network. Why can only one open the club file?</li>
      <li><strong>Google Cybersecurity Professional Certificate.</strong> Lesson 4 adapts the detection and response work in <em>Sound the Alarm</em> and the incident monitoring covered in Security+ V7. Pairs put four records in order, report what they can confirm and test whether the club can use its recovered work.</li>
      <li><strong>Google AI Professional Certificate and TryHackMe AI Security.</strong> The Google outline’s research and writing topics inform two tasks. Students check a claim in lesson 6 and adapt one verified fact for students and families in lesson 8. The TryHackMe learning path informs a paper exercise in which students decide who has the authority to change an announcement.</li>
      <li><strong>University at Albany coursework, AI ethics research and school IT practice.</strong> Mx. Cole studies cybersecurity at UAlbany with a focus on AI and ethical hacking. Across the course, students protect classmates’ privacy, ask whose voices a survey missed and explain when a person needs to review an AI suggestion.</li></ul>
      <h3>Teacher reading</h3><ul>
      <li><a href="https://github.com/AL91Cole/AL91Cole">Mx. Cole’s education, credentials and hands-on learning</a></li>
      <li><a href="https://github.com/AL91Cole/ai-ethics-and-moral-philosophy">Mx. Cole’s AI Ethics and Moral Philosophy research</a></li>
      <li><a href="https://github.com/AL91Cole/ai-guardian-web-shield">AI Guardian Web Shield project</a></li>
      <li><a href="https://help.openai.com/en/articles/8313428-does-chatgpt-tell-the-truth">OpenAI on inaccurate answers and source checking</a></li>
      <li><a href="https://airc.nist.gov/airmf-resources/playbook/measure/">NIST AI Risk Management Framework Playbook on evaluating AI risks and fairness</a></li></ul>`)}`;
  return page(base, title, description, body);
}

function workbook(lessons) {
  const description = 'Printable evidence cards, investigation prompts and exit tickets for every lesson.';
  const body = `${breadcrumb('Student workbook')}<header class="fc-intro">
    <p class="eyebrow">Student workbook · Grades 7–8</p><h1>Cybersecurity and Responsible AI workbook</h1>
    <p class="fc-lede">Use the evidence cards to make a decision. Write down what you saw, what you would do and what you still need to check.</p></header>
    <p class="fc-print-help">Use browser Print to print this workbook. Answer on a separate sheet, in a school-managed document or aloud with a partner. Label each response with the lesson and question number. All names and records in the cases are fictional.</p>
    <nav aria-label="Workbook contents"><ol>${lessons.map((lesson, i) => `<li><a href="#${lessonSlug(i + 1)}">${esc(lesson.title)}</a></li>`).join('')}</ol></nav>
    <div class="fc-workbook">${lessons.map((lesson, i) => section(lessonSlug(i + 1), `Lesson ${i + 1} · ${lesson.title}`,
      `<p>${esc(lesson.objective)}</p>${i >= 8 ? `<p>Use the <a href="${base}/project">project brief and rubric</a> for this lesson.</p>` : ''}${handout(lesson, i + 1)}`)).join('')}</div>`;
  return page(base + '/workbook', 'Student workbook · ' + title, description, body);
}

function project() {
  const body = `${breadcrumb('Final project')}<header class="fc-intro"><p class="eyebrow">Student project · Lessons 9 and 10</p>
    <h1>Safe-to-Share Bulletin</h1><p class="fc-lede">Your school club has a draft announcement, a suspicious message and a drawing it might use. Your job is to give students a bulletin they can trust and show the advisor why it’s ready.</p></header>
    ${section('brief', 'What to hand in', `<ol>
    <li>Use the <a href="${lessonPath(9)}#student-handout">lesson 9 records</a> to write a short public bulletin. Include the facts a student needs to attend, the approved way to sign up, and a credit line for any artwork you choose to use.</li>
    <li>Attach an editor’s note for the advisor. List what the AI draft got right, what you changed or left out, and the clue or dated source behind each choice. Describe how you would report the suspicious message.</li>
    <li>Give your draft to another pair. Ask them to circle one claim they can verify and put a question mark beside one claim or permission they would double-check.</li>
    <li>Open the <a href="${lessonPath(10)}#student-handout">lesson 10 update</a>. Keep both versions. Revise the bulletin and add a correction note saying what changed, what evidence changed your mind and how you would reach earlier readers.</li></ol>
    <p>A handwritten bulletin, typed announcement or recorded reading with an accompanying evidence note can earn the same score. Turn in both versions and your notes through your teacher’s usual process.</p>`)}
    ${section('rubric', 'Project rubric', `<p>Score each criterion from 0 to 2, for a total of 8. Award 2 when the work shows the decision and the specific evidence described below, 1 when the decision or its evidence is missing or incomplete, and 0 when neither appears.</p>
    <dl class="fc-vocabulary">${rubric.map(([criterion, evidence]) => `<div><dt>${esc(criterion)}</dt><dd>${esc(evidence)}</dd></div>`).join('')}</dl>
    <p>Before you hand it in, point to a line in your work for each criterion. Tell your reviewer which change made your bulletin safer or more accurate.</p>`)}`;
  return page(base + '/project', 'Safe-to-Share Bulletin', 'Draft, audit and revise a school club bulletin using a four-criterion rubric.', body);
}

export function renderCybersecurityCourse(lessons) {
  if (!Array.isArray(lessons) || lessons.length !== lessonCount) throw new Error('This course requires ten lessons.');
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
