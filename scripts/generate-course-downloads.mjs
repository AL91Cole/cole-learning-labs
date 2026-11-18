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

/** A page that prints without a server: styles and pictures inlined, links pointed at the public site. */
function standalone(html) {
  return html
    .replace(/<link rel="stylesheet" href="\/([^"?]+)(?:\?[^"]*)?">/gu, (_, file) => '<style>' + read(file).toString('utf8') + '</style>')
    .replace(/<script\b[^>]*><\/script>/gu, '')
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
    return {file, ...entry};
  });
}

async function generate() {
  let chromium;
  try { ({chromium} = createRequire(import.meta.url)('playwright')); }
  catch { throw new Error('Playwright with Chromium is needed to print the course downloads. Install it on the authoring machine, then run this script again.'); }
  const browser = await chromium.launch();
  const files = {};
  try {
    const context = await browser.newContext({javaScriptEnabled: false});
    for (const {file, html, label} of documents()) {
      const tab = await context.newPage();
      await tab.setContent(standalone(html), {waitUntil: 'load'});
      await tab.emulateMedia({media: 'print'});
      const pdf = await tab.pdf({
        format: 'Letter', tagged: true, outline: true, printBackground: false, displayHeaderFooter: true,
        margin: {top: '16mm', bottom: '18mm', left: '16mm', right: '16mm'},
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="width:100%;font:8px Arial,sans-serif;color:#444;text-align:center">Cole Learning Labs · ${COURSE_TITLE} · ${label} · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`
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
  writeFileSync(path.join(ROOT, DOWNLOAD_MANIFEST), JSON.stringify({source: courseDownloadSourceDigest(), files}, null, 2) + '\n');
  console.log('Wrote ' + DOWNLOAD_MANIFEST + '. Review each PDF before committing.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await generate(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
