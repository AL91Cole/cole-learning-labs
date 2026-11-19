// Prints the course's PDF downloads from the same pages the site publishes:
// the student workbook, every lesson, the project brief and the paper labs.
//
//   node scripts/generate-course-downloads.mjs
//
// Run it after changing a lesson, a printable lab or the course print styles,
// review the PDFs, and commit them with the updated manifest. A test compares
// the manifest's source digest with the current pages and fails when the
// downloads have fallen behind. This is an authoring tool: it needs Playwright
// with Chromium on the author's machine and is not part of the site build.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderCybersecurityCourse, COURSE_DOWNLOADS} from './cybersecurity-course.mjs';
import {STANDALONE_LAB_IDS} from './tier-bundles.mjs';
import {renderNetworkingCourse, NETWORKING_COURSE_DOWNLOADS, NETWORKING_COURSE_TITLE} from './networking-course.mjs';
import {renderEvidenceCardsPrint, NETWORKING_CARDS_PDF} from './networking-pages.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ORIGIN = 'https://www.colelearninglabs.com';
const COURSE = 'courses/cybersecurity-responsible-ai';
const COURSE_TITLE = 'Intro to Cybersecurity and Responsible AI';
// Kept beside the authoring scripts: nothing under courses/ may hold an unpublished file.
export const DOWNLOAD_MANIFEST = 'scripts/course-downloads.json';
// Course order, not registration order: the lessons that use each printable lab.
const LAB_ORDER = ['locker-note', 'double-counted-ballot', 'train-the-sorter', 'museum-label'];
const STYLE_SOURCES = ['src/styles.css', 'src/school.css', 'src/foundations-course.css', 'src/accessibility.css', 'src/standalone-labs.css'];
const read = name => readFileSync(path.join(ROOT, name));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function coursePages() {
  const lessons = ['security.json', 'responsible-ai.json'].flatMap(name => JSON.parse(read(COURSE + '/' + name).toString('utf8')));
  return renderCybersecurityCourse(lessons);
}

/** One digest over everything a download is printed from. */
export function courseDownloadSourceDigest() {
  const hash = createHash('sha256');
  for (const [file, html] of [...coursePages()].sort(([a], [b]) => a.localeCompare(b))) hash.update(file + '\n' + html + '\n');
  for (const name of [...LAB_ORDER.map(id => 'labs/' + id + '.html'), ...STYLE_SOURCES, 'assets/museum-record-m17.webp']) {
    hash.update(name + '\n').update(read(name)).update('\n');
  }
  return hash.digest('hex');
}
const NETWORKING_COURSE = 'courses/networking-tech-fair';
const NETWORKING_STYLE_SOURCES = ['src/styles.css', 'src/school.css', 'src/foundations-course.css', 'src/accessibility.css'];
/** The same kind of digest for the networking course, kept separately so one course can change without reprinting the other. */
export function networkingDownloadSourceDigest() {
  const hash = createHash('sha256');
  for (const [file, html] of [...renderNetworkingCourse()].sort(([a], [b]) => a.localeCompare(b))) hash.update(file + '\n' + html + '\n');
  for (const name of NETWORKING_STYLE_SOURCES) hash.update(name + '\n').update(read(name)).update('\n');
  return hash.digest('hex');
}

/**
 * A page that prints without a server: styles and pictures inlined, links pointed at the public site.
 * Script tags are left as they are. The print context has JavaScript turned off, so nothing runs.
 */
function standalone(html) {
  return html
    .replace(/<link rel="stylesheet" href="\/([^"?]+)(?:\?[^"]*)?">/gu, (_, file) => '<style>' + read(file).toString('utf8') + '</style>')
    .replace(/src="\/(assets\/[^"]+\.webp)"/gu, (_, file) => 'src="data:image/webp;base64,' + read(file).toString('base64') + '"')
    .replace(/href="\/(?!\/)/gu, 'href="' + ORIGIN + '/');
}
const mainOf = html => html.match(/<main\b[^>]*>([\s\S]*)<\/main>/u)[1];
/** Several pages as one document, each part starting on a new sheet. */
function combined(pages, title) {
  const [first] = pages;
  const parts = pages.map((html, index) => `<div${index ? ' style="break-before:page"' : ''}>${mainOf(html)}</div>`).join('\n');
  return first.replace(/<title>[\s\S]*?<\/title>/u, '<title>' + title + ' · Cole Learning Labs</title>').replace(/(<main\b[^>]*>)[\s\S]*(<\/main>)/u, (_, open, close) => open + parts + close);
}

function documents() {
  const pages = coursePages();
  const page = name => pages.get(COURSE + '/' + name + '.html');
  const lessonNames = [...pages.keys()].filter(file => /\/lesson-\d\d\.html$/u.test(file)).sort().map(file => path.basename(file, '.html'));
  const labs = LAB_ORDER.map(id => read('labs/' + id + '.html').toString('utf8'));
  if (LAB_ORDER.length !== STANDALONE_LAB_IDS.length || !LAB_ORDER.every(id => STANDALONE_LAB_IDS.includes(id))) throw new Error('Every printable lab needs a place in the printable-labs download.');
  const named = new Map([
    ['student-workbook.pdf', {html: page('workbook'), label: 'Student workbook'}],
    ['lesson-plans.pdf', {html: combined(lessonNames.map(page), 'Lesson plans · ' + COURSE_TITLE), label: 'Lesson plans'}],
    ['printable-labs.pdf', {html: combined(labs, 'Printable labs · ' + COURSE_TITLE), label: 'Printable labs'}],
    ['final-project.pdf', {html: page('project'), label: 'Project and rubric'}],
    ...lessonNames.map(name => [name + '.pdf', {html: page(name), label: 'Lesson ' + Number(name.slice(-2))}])
  ]);
  return COURSE_DOWNLOADS.map(file => {
    const entry = named.get(path.basename(file));
    if (!entry) throw new Error('No page is printed for ' + file);
    return {file, course: COURSE_TITLE, ...entry};
  });
}

const CARD_STYLE_SOURCES = ['src/styles.css', 'src/school.css', 'src/landing.css', 'src/accessibility.css'];
function evidenceCardsPage() {
  const release = read('index.html').toString('utf8').match(/src\/app\.js\?release=([A-Za-z0-9_-]+)/u)?.[1];
  return renderEvidenceCardsPrint({release, template: read('lessons/packet-post.html').toString('utf8')});
}
/** The evidence cards are printed from the mission models; this digest moves when a model, the card layout or a style does. */
export function evidenceCardsSourceDigest() {
  const hash = createHash('sha256').update(evidenceCardsPage());
  for (const name of CARD_STYLE_SOURCES) hash.update(name + '\n').update(read(name)).update('\n');
  return hash.digest('hex');
}
const cardDocuments = () => [{file: NETWORKING_CARDS_PDF, html: evidenceCardsPage(), label: 'Evidence cards', course: 'Networking pathway'}];

function networkingDocuments() {
  const pages = renderNetworkingCourse(), page = name => pages.get(NETWORKING_COURSE + '/' + name + '.html');
  const lessonNames = [...pages.keys()].filter(file => /\/lesson-\d\d\.html$/u.test(file)).sort().map(file => path.basename(file, '.html'));
  const named = new Map([
    ['student-workbook.pdf', {html: page('workbook'), label: 'Student workbook'}],
    ['lesson-plans.pdf', {html: combined(lessonNames.map(page), 'Lesson plans · ' + NETWORKING_COURSE_TITLE), label: 'Lesson plans'}],
    ...lessonNames.map(name => [name + '.pdf', {html: page(name), label: 'Lesson ' + Number(name.slice(-2))}])
  ]);
  return NETWORKING_COURSE_DOWNLOADS.map(file => {
    const entry = named.get(path.basename(file));
    if (!entry) throw new Error('No page is printed for ' + file);
    return {file, course: NETWORKING_COURSE_TITLE, ...entry};
  });
}

async function generate() {
  let chromium;
  try { ({chromium} = createRequire(import.meta.url)('playwright')); }
  catch { throw new Error('Playwright with Chromium is needed to print the course downloads. Install it on the authoring machine, then run this script again.'); }
  // A course is reprinted only when its own pages or styles moved, so an unchanged course keeps its reviewed files.
  let previous = {files: {}};
  try { previous = JSON.parse(read(DOWNLOAD_MANIFEST).toString('utf8')); } catch { /* first run */ }
  const sources = {source: courseDownloadSourceDigest(), networkingSource: networkingDownloadSourceDigest(), cardsSource: evidenceCardsSourceDigest()};
  const known = file => previous.files?.[file] || previous.openFiles?.[file];
  const kept = (list, key) => previous[key] === sources[key] && list.every(known);
  const queue = [], files = {};
  for (const [list, key, build] of [[COURSE_DOWNLOADS, 'source', documents], [NETWORKING_COURSE_DOWNLOADS, 'networkingSource', networkingDocuments], [[NETWORKING_CARDS_PDF], 'cardsSource', cardDocuments]]) {
    if (kept(list, key)) { for (const file of list) files[file] = known(file); console.log('Unchanged, kept: ' + path.dirname(list[0])); }
    else queue.push(...build());
  }
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({javaScriptEnabled: false});
    for (const {file, html, label, course} of queue) {
      const tab = await context.newPage();
      await tab.setContent(standalone(html), {waitUntil: 'load'});
      await tab.emulateMedia({media: 'print'});
      const pdf = await tab.pdf({
        format: 'Letter', tagged: true, outline: true, printBackground: false, displayHeaderFooter: true,
        margin: {top: '16mm', bottom: '18mm', left: '16mm', right: '16mm'},
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="width:100%;font:8px Arial,sans-serif;color:#444;text-align:center">Cole Learning Labs · ${course} · ${label} · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`
      });
      await tab.close();
      mkdirSync(path.dirname(path.join(ROOT, file)), {recursive: true});
      writeFileSync(path.join(ROOT, file), pdf);
      files[file] = sha256(pdf);
      console.log(String(Math.round(pdf.length / 1024)).padStart(5) + ' KB  ' + file);
    }
  } finally {
    await browser.close();
  }
  writeFileSync(path.join(ROOT, DOWNLOAD_MANIFEST), JSON.stringify({...sources, files: Object.fromEntries([...COURSE_DOWNLOADS, ...NETWORKING_COURSE_DOWNLOADS].map(file => [file, files[file]])), openFiles: {[NETWORKING_CARDS_PDF]: files[NETWORKING_CARDS_PDF]}}, null, 2) + '\n');
  console.log('Wrote ' + DOWNLOAD_MANIFEST + '. Review each PDF before committing.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await generate(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
