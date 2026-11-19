// The Networking pathway as a complete course: an overview, one 40-minute lesson plan for each
// of the twelve tech fair missions, a capstone lesson and a student workbook.
// Briefs, choices, tests and changed conditions come from the mission models the browser uses;
// the launch question, what to listen for, the look-for and the exit ticket are written here.
// Lesson pages describe how to teach a mission. They do not state its readings, its outcome or
// a point scale: evidence cards are in the student handout, and scoring stays in the school's system.
import {coursePage, esc} from './course-page.mjs';
import {FAIR_BANDS, FAIR_CAPSTONE, FAIR_FOLLOW_UPS, SYSTEMS_SUPPORT, fairBandMissions} from '../src/fair-catalog.js';
import {DECISIONS, FAIR_MISSIONS} from '../src/fair-missions.js';
import {CAPSTONE_STATIONS, ROLLBACK_OPTIONS} from '../src/fair-capstone.js';

export const NETWORKING_COURSE_TITLE = 'Networking: Run the School Tech Fair';
const title = NETWORKING_COURSE_TITLE;
const directory = 'courses/networking-tech-fair';
const base = '/' + directory;
const ORIGIN = 'https://www.colelearninglabs.com';
const lessonSlug = number => 'lesson-' + String(number).padStart(2, '0');
const lessonPath = number => base + '/' + lessonSlug(number);
// Lesson order: grades 7–8, then 9–10, then 11–12, each in mission order; the shared capstone is last.
const ORDER = FAIR_BANDS.flatMap(band => fairBandMissions(band.id).map(item => item.id));
const CAPSTONE_LESSON = ORDER.length + 1;
export const NETWORKING_COURSE_PAGE_FILES = Object.freeze([directory + '/index.html', ...Array.from({length:CAPSTONE_LESSON}, (_, index) => directory + '/' + lessonSlug(index + 1) + '.html'), directory + '/workbook.html']);
export const networkingLessonNumber = id => id === FAIR_CAPSTONE.id ? CAPSTONE_LESSON : ORDER.indexOf(id) + 1;
const classroomShare = address => 'https://classroom.google.com/share?url=' + encodeURIComponent(ORIGIN + address);

// What a teacher adds to each mission. None of these names a reading or a correct setting.
const PLANS = Object.freeze({
  'FAIR-208':{launch:'Two people share one phone charger. What happens to the second phone when the first person leaves with it?', listen:'“It is plugged in, so it is connected.” Ask what the cable is plugged into, and what that depends on.', lookFor:'The student traces each laptop’s cable to its other end before testing, and reads both rows of the result.', exit:'Why does it matter where a cable’s other end is? Use one reading from your tests.'},
  'FAIR-215':{launch:'You post a letter to a friend in another town. Who is the first person to handle it, and is that the person it is addressed to?', listen:'“The address changed, so it went to the wrong place.” Ask which address, and whether every address on the snapshot changed.', lookFor:'The student compares the two snapshots column by column and uses the address list to say whose address each one is.', exit:'Name one address that changed at the hop and one that did not. What job does each do?'},
  'FAIR-204':{launch:'The robot keeps moving, so what exactly has stopped? How could you tell where it stops?', listen:'“The blue line is fixed, so we are done.” Ask what the other two counters say.', lookFor:'The student reads all three counters after every lap, and runs a fresh lap once the curtain changes the room.', exit:'At the blue line, how many of ten arrived before your change and how many after? What does the difference tell the next crew?'},
  'FAIR-217':{launch:'You can whisper to the person next to you. Can the same whisper reach someone in the next room? What would it need?', listen:'“Direct mode is broken.” Ask what direct mode was able to do, and what it was never connected to.', lookFor:'The student tests both destinations in each mode before deciding, and changes only one thing between tests.', exit:'When is a direct link enough, and when do you need the access point? Give one reading for each.'},
  'FAIR-201':{launch:'You know a friend’s house but have lost their street name. Can you still get there? What does a name give you that the place alone does not?', listen:'“The scoreboard is down.” Ask which test shows the server answering, and which test fails.', lookFor:'The student runs the address test, the lookup and the page as three separate checks and says what each one answers.', exit:'Which check told you the server was fine, and which told you what was wrong?'},
  'FAIR-209':{launch:'A bus has 30 seats. Fifty students need a ride. What are your choices?', listen:'“A bigger number after the slash is a bigger block.” Have the student list the first and last address of each block and count.', lookFor:'The student counts usable addresses, crosses off the ones that cannot be given out, and tests the gateway from the new address.', exit:'Which two addresses in a block can never be given to a device, and why did your first address choice work or fail?'},
  'FAIR-210':{launch:'A museum lets visitors into the galleries and keeps the storeroom locked. How would you check both of those are true?', listen:'“Staff files are blocked, so it is safe.” Ask what the same guest can still see, and whether that was the whole target.', lookFor:'The student runs both tests as the same guest and treats a pass on one and a miss on the other as a miss.', exit:'Why does this station need two tests? What went wrong when only one of them passed?'},
  'FAIR-218':{launch:'Walking between two rooms on a phone call, where is the call most likely to drop, and why there?', listen:'“The gym and the hall are both fine, so the network is fine.” Ask what happens at the place in between.', lookFor:'The student reads the three counts in walking order, and retests after the spare camera is swapped in.', exit:'What did the doorway count tell you that the gym and hall counts did not?'},
  'FAIR-216':{launch:'One car’s odometer reads 90,000 miles and another reads 16,000. Which car is moving faster right now? What else would you need to know?', listen:'“900 is bigger, so the printer is worse.” Ask how much each counter changed, and in how long.', lookFor:'The student subtracts two readings, divides by the time between them, and compares the rate with the threshold before choosing.', exit:'Why can a big counter be less urgent than a small one? Show the sum you used.'},
  'FAIR-213':{launch:'Two people need the same doorway at once, and one of them is carrying a stretcher. What are two different ways to solve that?', listen:'“Turn on priority and it is fixed.” Ask which of the two targets is still missed, and what is still on the link.', lookFor:'The student tests each fix on its own before combining them, and keeps each pair of readings beside the baseline.', exit:'What did each fix do on its own? When can the upload run, and how do you know?'},
  'FAIR-211':{launch:'To get backstage you need to get into the building, be on the guest list for that door, and have the right badge. Which of those does a ticket give you?', listen:'“The VPN is on, so she can do everything.” Ask what the tunnel gave her, and what still decides who may submit.', lookFor:'The student changes one of the three controls at a time and says which control each result blames.', exit:'Name what the tunnel, the firewall rule and the role each decide. Which one stopped the observer?'},
  'FAIR-214':{launch:'You are planning a party for 24 guests. What do people forget to count? What is your plan if the oven breaks on the day?', listen:'“24 computers, so 24 ports.” Ask what else plugs into the switch.', lookFor:'The student shows the two sums, tests an allowed path and a blocked path, and names what to restore before anything fails.', exit:'What would you restore if the new design failed on install day, and what would you lose by choosing something else?'}
});

const list = (items, tag = 'ul') => '<' + tag + '>' + items.map(item => '<li>' + esc(item) + '</li>').join('') + '</' + tag + '>';
const section = (id, heading, body) => '<section class="fc-section" id="' + id + '"><h2>' + esc(heading) + '</h2>' + body + '</section>';
const page = (pathname, heading, description, body) => coursePage({title:heading, pathname, description, body, footerNote:'<p><a href="' + base + '">' + title + '</a> · <a href="/courses">Course catalog</a> · <a href="/networking">Networking pathway</a></p>'});
const breadcrumb = current => '<nav class="fc-breadcrumb" aria-label="Breadcrumb"><a href="/courses">Courses</a><span aria-hidden="true">/</span>' + (current ? '<a href="' + base + '">' + title + '</a><span aria-hidden="true">/</span><span aria-current="page">' + esc(current) + '</span>' : '<span aria-current="page">' + title + '</span>') + '</nav>';
const lessonNav = number => '<nav class="fc-lesson-nav" aria-label="Lesson navigation">' + (number > 1 ? '<a href="' + lessonPath(number - 1) + '">← Lesson ' + (number - 1) + '</a>' : '<span></span>') + '<a href="' + base + '">Course overview</a>' + (number < CAPSTONE_LESSON ? '<a href="' + lessonPath(number + 1) + '">Lesson ' + (number + 1) + ' →</a>' : '<span></span>') + '</nav>';
const openLinks = (address, name) => '<div class="button-row"><a class="button" href="' + address + '">Open ' + esc(name) + '</a><a class="button button-outline" href="/networking-handout">Student handout and evidence cards</a></div><p class="fc-downloads"><a href="' + esc(classroomShare(address)) + '" rel="noopener">Share this mission to Google Classroom</a></p>';
const follow = id => (FAIR_FOLLOW_UPS[id] || []).map(([href, label]) => '<a href="/' + href + '">' + esc(label) + '</a>');

function handout(mission) {
  return '<div class="fc-context"><h3>' + esc(mission.person) + ' needs help</h3><p>' + esc(mission.brief) + '</p></div>' +
    '<h3>What you can observe</h3><p>' + esc(mission.observe) + '</p><h3>Target</h3><p>' + esc(mission.success) + '</p>' +
    '<h3>Predict first</h3><p>' + esc(mission.predict.prompt) + '</p>' + list(mission.predict.options.map(([, label]) => label)) +
    '<h3>What your crew can change</h3>' + list(mission.controls.map(item => item.label + ': ' + item.options.map(([, label]) => label).join(' / '))) +
    '<h3>Tests you can run</h3>' + list(mission.tests.map(item => item.label)) +
    '<h3>Then one thing changes</h3><p>' + esc(mission.replay.text) + ' Run a fresh test. A reading from before the change is no longer current.</p>' +
    '<h3>Tell the next crew</h3>' + list(DECISIONS.map(item => item.label + '. ' + item.help)) + '<p><strong>Sentence starter.</strong> ' + esc(mission.starter) + '</p>' +
    '<h3>Words for this mission</h3><dl class="fc-vocabulary">' + mission.terms.map(item => '<div><dt>' + esc(item.term) + '</dt><dd>' + esc(item.plain) + '</dd></div>').join('') + '</dl>';
}

function missionLesson(mission, number) {
  const plan = PLANS[mission.id], band = FAIR_BANDS.find(item => item.id === mission.band), after = follow(mission.id);
  const steps = [
    [5, 'Launch. Ask: ' + plan.launch + ' Read the brief aloud. Every student chooses a prediction before anyone tests.'],
    [5, 'Model. On a shared screen, read the worked example together: ' + mission.worked + ' Run the first test and read every row aloud. Do not change the setup yourself.'],
    [13, 'Pairs. Crews change one thing in “Your setup” and run a test, then compare the reading with the baseline and the reading before it. They keep going until every row meets the target. A crew that is stuck selects “Give me a clue”.'],
    [10, 'The changed condition. Crews select “' + mission.replay.action + '”. Their last reading is now out of date. They run a fresh test, decide what it means and change the setup again if they need to. Driver and recorder swap roles here.'],
    [7, 'Handoff. Crews select the evidence they are relying on, choose open, hold or revise, and write one handoff sentence. Two or three crews read theirs aloud. Collect the exit ticket.']
  ];
  const body = breadcrumb('Lesson ' + number) + '<header class="fc-intro"><p class="eyebrow">Lesson ' + number + ' of ' + CAPSTONE_LESSON + ' · Grades ' + band.grade + ' · ' + esc(band.title) + '</p><h1>' + esc(mission.title) + '</h1><p>' + esc(mission.crew) + '</p><p><strong>40 minutes · One skill: ' + esc(mission.skill.toLowerCase()) + ' · ' + mission.id + '</strong></p></header>' +
    section('student-handout', 'Student handout', handout(mission) + '<h3>Exit ticket</h3><p>' + esc(plan.exit) + '</p>' + openLinks('/networking/' + mission.slug, 'the mission')) +
    section('teacher-plan', 'Teach this lesson', '<ol class="fc-sequence">' + steps.map(([minutes, text]) => '<li><p><strong>' + minutes + ' minutes</strong> · ' + esc(text) + '</p></li>').join('') + '</ol>' +
      '<h3>What to look for</h3><p>' + esc(plan.lookFor) + '</p><h3>Listen for</h3><p>' + esc(plan.listen) + '</p>' +
      '<h3>Pair roles</h3><p>The driver operates the controls and says each change aloud before making it. The recorder reads every row of the reading aloud and keeps the record sheet. With no devices, a third student keeps the evidence cards face down and turns over the card that matches the crew’s setup and test.</p>' +
      '<h3>What students hand in</h3><p>The mission report from “My report”, downloaded as a text file, or the record sheet from the workbook. Clues and retries carry no penalty. A decision of hold or revise is a complete answer when the evidence supports it.</p>' +
      (after.length ? '<h3>Afterwards</h3><p>' + after.join(' · ') + '</p>' : '')) + lessonNav(number);
  return page(lessonPath(number), 'Lesson ' + number + ' · ' + mission.title, 'A 40-minute networking lesson plan for grades ' + band.grade + ': ' + mission.crew.replace(/\.$/u, '') + ', with a student handout and timed teaching steps.', body);
}

function capstoneLesson() {
  const steps = [
    [5, 'Set the scene. The fair opens in forty minutes, and four stations rehearsed last night. Each crew chooses its grade band in the lab guide, which marks the stations it owns.'],
    [10, 'First station. Crews read the rehearsal condition and the evidence needed to open, repair the setup, run a new test and decide. Remind them that a station on hold does not stop the others.'],
    [15, 'Remaining stations. Grades 7–8 and 9–10 may try a second station once theirs is decided. Grades 11–12 work through all four and choose a rollback plan.'],
    [10, 'Report out. Each crew says which stations opened, which are on hold, and the reading each decision rests on. Collect the capstone report or the record sheet.']
  ];
  const body = breadcrumb('Lesson ' + CAPSTONE_LESSON) + '<header class="fc-intro"><p class="eyebrow">Lesson ' + CAPSTONE_LESSON + ' of ' + CAPSTONE_LESSON + ' · Capstone · Grades 7–12</p><h1>' + esc(FAIR_CAPSTONE.title) + '</h1><p>' + esc(FAIR_CAPSTONE.crew) + '</p><p><strong>40 minutes · One skill: ' + esc(FAIR_CAPSTONE.skill.toLowerCase()) + ' · ' + FAIR_CAPSTONE.id + '</strong></p></header>' +
    section('student-handout', 'Student handout', '<div class="fc-context"><h3>The fair opens in forty minutes</h3><p>Four stations rehearsed last night, and not all of them passed. For each station your crew owns: repair it, run a new test and tell the next crew to open, hold or revise. Each station opens on its own evidence.</p></div>' +
      '<div class="fc-table-scroll"><table><caption>The four stations</caption><thead><tr><th scope="col">Station</th><th scope="col">Rehearsal</th><th scope="col">Evidence for opening</th><th scope="col">What you can change</th></tr></thead><tbody>' + CAPSTONE_STATIONS.map(item => '<tr><th scope="row">' + esc(item.title) + '</th><td>' + esc(item.rehearsal) + '</td><td>' + esc(item.target) + '</td><td>' + esc(item.control.label + ': ' + item.control.options.map(([, label]) => label).join(' / ')) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<h3>Who owns what</h3>' + list(FAIR_BANDS.map(band => 'Grades ' + band.grade + ': ' + band.owns.toLowerCase() + '.')) +
      '<h3>Rollback decision (grades 11–12)</h3><p>If a station fails after the doors open, what does the crew do?</p>' + list(ROLLBACK_OPTIONS.map(([, label]) => label)) +
      '<h3>Exit ticket</h3><p>Name one station you opened or held. Which reading does that decision rest on, and what would make you change it?</p>' + openLinks('/networking/' + FAIR_CAPSTONE.slug, 'the capstone')) +
    section('teacher-plan', 'Teach this lesson', '<ol class="fc-sequence">' + steps.map(([minutes, text]) => '<li><p><strong>' + minutes + ' minutes</strong> · ' + esc(text) + '</p></li>').join('') + '</ol>' +
      '<h3>What to look for</h3><p>The crew runs a new test after every repair, decides each station on its own reading, and can say why one station opening does not depend on another.</p><h3>Listen for</h3><p>“One station failed, so nothing can open.” Ask which stations share anything with the one that failed.</p>' +
      '<h3>Mixed-grade classes</h3><p>Seat one crew from each band together. The younger crews report their station to the grades 11–12 crew, who keep the opening-day board and give the rollback decision.</p>') + lessonNav(CAPSTONE_LESSON);
  return page(lessonPath(CAPSTONE_LESSON), 'Lesson ' + CAPSTONE_LESSON + ' · ' + FAIR_CAPSTONE.title, 'A 40-minute capstone lesson plan for grades 7–12: four tech fair stations to repair, retest and open, hold or revise, with a rollback decision.', body);
}

function overview(missions) {
  const bandTable = band => '<h3>Grades ' + band.grade + ' · ' + esc(band.title) + '</h3><p>' + esc(band.summary) + ' About one week: four mission lessons and the capstone.</p><div class="fc-table-scroll"><table><thead><tr><th scope="col">Lesson</th><th scope="col">The crew’s job</th><th scope="col">One skill</th></tr></thead><tbody>' + fairBandMissions(band.id).map(meta => '<tr><th scope="row"><a href="' + lessonPath(networkingLessonNumber(meta.id)) + '">Lesson ' + networkingLessonNumber(meta.id) + ' · ' + esc(meta.title) + '</a></th><td>' + esc(meta.crew) + '</td><td>' + esc(meta.skill) + '</td></tr>').join('') + '<tr><th scope="row"><a href="' + lessonPath(CAPSTONE_LESSON) + '">Lesson ' + CAPSTONE_LESSON + ' · ' + esc(FAIR_CAPSTONE.title) + '</a></th><td>Owns: ' + esc(band.owns.toLowerCase()) + '.</td><td>' + esc(FAIR_CAPSTONE.skill) + '</td></tr></tbody></table></div>';
  const body = breadcrumb() + '<header class="fc-intro"><p class="eyebrow">Complete course · Grades 7–12 · Networking</p><h1>' + title + '</h1><p>Students run part of a school tech fair. In every lesson a crew makes a decision, sees what happens and uses the evidence to explain it.</p><p><strong>' + missions.length + ' mission lessons and a capstone · 40 minutes per lesson · Three grade bands · No accounts</strong></p><div class="button-row"><a class="button" href="' + lessonPath(networkingLessonNumber('FAIR-204')) + '">Start with The frozen robot cam</a><a class="button button-outline" href="/networking">Open the Networking pathway</a><a class="button button-outline" href="' + base + '/workbook">Student workbook</a></div></header>' +
    section('how-it-works', 'How every lesson works', '<ol class="fc-sequence"><li><p><strong>Get the brief.</strong> Students meet the person who needs help, read what they can observe and the measurable target, and predict what will happen.</p></li><li><p><strong>Try it.</strong> A worked example models one careful test. Then the crew changes one thing and runs a test. The reading appears beside the baseline.</p></li><li><p><strong>Prove it.</strong> One condition changes. The crew runs a fresh test, selects its evidence and tells the next crew to open, hold or revise.</p></li></ol><p>Every lesson page has a student handout and a timed teaching plan: 5 minutes to launch, 5 to model, 13 for pairs, 10 for the changed condition and 7 for the handoff.</p>') +
    section('lessons', 'Lessons by grade band', '<p>Teach one band as a week of five lessons, or pick single missions. Each band ends with the same capstone, where it owns different stations.</p>' + FAIR_BANDS.map(bandTable).join('')) +
    section('materials', 'What you need', list(['One device with a current browser for each pair. Nothing to install and no accounts.', 'Or no devices: print the evidence cards and record sheets from the student handout and play in threes.', 'A shared screen for the worked example.', 'Your school’s own place for students to hand in a report or a record sheet.']) + '<p>Try one mission on a student device before teaching. The missions have not yet been checked on a school-managed Chromebook.</p>') +
    section('resources', 'Course resources', '<ul><li><a href="' + base + '/workbook">Student workbook</a>: the word guide, a tracker for each band and a mission record sheet.</li><li><a href="/networking-handout">Student handout and evidence cards</a>: every mission on paper.</li><li><a href="/lessons/networking-fair">Teaching notes</a>: pair roles, debrief questions and look-fors for the whole pathway.</li><li><a href="/#learn/NET-200">Meet the network</a>: the 12-minute introduction to use before lesson 1.</li></ul><p>Print any lesson from the browser: the page prints as a handout followed by its teaching plan. This course does not yet have PDF downloads.</p>') +
    section('around', 'Around the course', '<p>Each mission lesson lists a practice game, a workbench or a deeper investigation to use afterwards. The original networking investigations keep their own links and saved work, and are separate assignments from the missions. For sharing, startup, printing and backups, use the Systems Support collection: ' + SYSTEMS_SUPPORT.map(([id, name]) => '<a href="/#lab/' + id + '">' + id + ' · ' + esc(name) + '</a>').join(', ') + '. Younger students can start with <a href="/lessons/packet-post">Packet Post</a>.</p>') +
    section('assessment', 'Assessment', '<p>Students hand in a mission report or a record sheet. The <a href="/lessons/networking-fair#look-fors">look-fors</a> describe reasoning in four parts: defining the problem, choosing a test, verifying the result and explaining the decision. Clues and retries carry no penalty. Keep any point scale and pass mark in your school’s own private system.</p>') +
    section('scope', 'What this course is, and is not', '<p>The missions are teaching models on fictional equipment. They do not configure a switch, survey a real room or capture traffic, and each practises one skill from a much larger subject. Topics follow three university courses the author has studied (ISSC231, ISSC343 and ISSC421), used as a guide to sequence. The situations and wording are original.</p>');
  return page(base, title, 'A complete networking course for grades 7–12: twelve 40-minute tech fair missions and a capstone, each with a student handout and a timed lesson plan.', body);
}

function workbook(missions) {
  const words = new Map();
  for (const mission of missions) for (const item of mission.terms) if (!words.has(item.term.toLowerCase())) words.set(item.term.toLowerCase(), item);
  const tracker = band => '<div class="fc-table-scroll"><table><caption>Grades ' + band.grade + ' · ' + esc(band.title) + '</caption><thead><tr><th scope="col">Lesson</th><th scope="col">Skill</th><th scope="col">My decision</th><th scope="col">Handed off</th></tr></thead><tbody>' + [...fairBandMissions(band.id).map(meta => [networkingLessonNumber(meta.id), meta.title, meta.skill]), [CAPSTONE_LESSON, FAIR_CAPSTONE.title, FAIR_CAPSTONE.skill]].map(([number, name, skill]) => '<tr><th scope="row">' + number + ' · ' + esc(name) + '</th><td>' + esc(skill) + '</td><td>open / hold / revise</td><td>___</td></tr>').join('') + '</tbody></table></div>';
  const sheet = ['Mission', 'Who needs help, and the target', 'My prediction', 'First test: what I chose and what I read', 'What I changed, and the new reading', 'The condition that changed', 'Fresh test after the change', 'Evidence my decision rests on', 'My decision: open, hold or revise', 'Handoff sentence for the next crew'];
  const body = breadcrumb('Student workbook') + '<header class="fc-intro"><p class="eyebrow">Student workbook · Grades 7–12</p><h1>Tech fair crew workbook</h1><p>Keep track of your missions, the words you meet and the evidence behind each decision.</p></header>' +
    section('routine', 'The crew routine', '<ol class="fc-sequence"><li><p><strong>Get the brief.</strong> Who needs help? What can you observe? What is the target? Predict.</p></li><li><p><strong>Try it.</strong> Change one thing. Run a test. Read every row.</p></li><li><p><strong>Prove it.</strong> One condition changes. Test again. Choose your evidence. Open, hold or revise.</p></li></ol><p>A reading from before you changed the setup is out of date. Clues and retries carry no penalty.</p>') +
    section('tracker', 'Skill tracker', FAIR_BANDS.map(tracker).join('')) +
    section('words', 'Networking word guide', '<dl class="fc-vocabulary">' + [...words.values()].sort((a, b) => a.term.localeCompare(b.term)).map(item => '<div><dt>' + esc(item.term) + '</dt><dd>' + esc(item.plain) + '</dd></div>').join('') + '</dl>') +
    section('record', 'Mission record sheet', '<p>Copy this sheet for each mission, or print this page.</p><div class="fc-table-scroll"><table><thead><tr><th scope="col">Step</th><th scope="col">My notes</th></tr></thead><tbody>' + sheet.map(label => '<tr><th scope="row">' + esc(label) + '</th><td>___</td></tr>').join('') + '</tbody></table></div>');
  return page(base + '/workbook', 'Tech fair crew workbook', 'Student workbook for the grades 7–12 networking course: the crew routine, a skill tracker for each band, a word guide and a mission record sheet.', body);
}

/** Every page of the course, keyed by its published file. */
export function renderNetworkingCourse() {
  const missions = ORDER.map(id => FAIR_MISSIONS.find(item => item.id === id));
  if (missions.length !== 12 || missions.some(item => !item || !PLANS[item.id])) throw new Error('Every mission needs a lesson plan.');
  const pages = new Map([[NETWORKING_COURSE_PAGE_FILES[0], overview(missions)]]);
  for (const [index, mission] of missions.entries()) pages.set(directory + '/' + lessonSlug(index + 1) + '.html', missionLesson(mission, index + 1));
  pages.set(directory + '/' + lessonSlug(CAPSTONE_LESSON) + '.html', capstoneLesson());
  pages.set(directory + '/workbook.html', workbook(missions));
  return pages;
}
