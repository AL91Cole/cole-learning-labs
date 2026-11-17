import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {renderCybersecurityCourse, NEW_COURSE_PAGE_FILES} from '../scripts/cybersecurity-course.mjs';
import {coursePageRoute} from '../scripts/foundations-course.mjs';
import {MEMBER_FILES, publicFilesFor} from '../scripts/build.mjs';
import {createPreviewServer} from '../scripts/serve.mjs';
import {learningRoute} from '../src/learning-routes.js';
import {routeAccess} from '../src/access-policy.js';

const directory = 'courses/cybersecurity-responsible-ai';
const sources = ['security.json', 'responsible-ai.json'].map(name => directory + '/' + name);
const lessons = sources.flatMap(source => JSON.parse(readFileSync(new URL('../' + source, import.meta.url), 'utf8')));
const pages = renderCybersecurityCourse(lessons);
const origin = 'https://www.colelearninglabs.com';
const workbook = pages.get(directory + '/workbook.html');
const project = pages.get(directory + '/project.html');

// Match student-visible text even when authored source cards include quoted messages.
function visibleText(html) {
  const entities = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'"};
  return html.replace(/<[^>]*>/gu, ' ').replace(/&(?:amp|lt|gt|quot|#39);/gu, entity => entities[entity]);
}

test('each 40-minute lesson supplies its evidence, student handout, and teacher plan', () => {
  assert.equal(lessons.length, 10);
  assert.equal(new Set(lessons.map(lesson => lesson.title)).size, lessons.length);
  assert.deepEqual(new Set(pages.keys()), new Set(NEW_COURSE_PAGE_FILES));
  const allHandouts = visibleText(workbook);
  lessons.forEach((lesson, index) => {
    const file = directory + '/lesson-' + String(index + 1).padStart(2, '0') + '.html';
    const text = visibleText(pages.get(file));
    assert.equal(lesson.teacher.reduce((total, step) => total + step.minutes, 0), 40, file);
    assert.ok(lesson.evidence.length && lesson.terms.length && lesson.tasks.length, file);
    for (const passage of [lesson.title, lesson.caseText, ...lesson.evidence, ...lesson.tasks, lesson.exit]) {
      assert.ok(text.includes(passage), file + ' is missing student text: ' + passage);
      assert.ok(allHandouts.includes(passage), 'Workbook is missing student text: ' + passage);
    }
    for (const step of lesson.teacher) {
      assert.ok(text.includes(step.instruction), file + ' is missing teaching guidance');
      assert.ok(!allHandouts.includes(step.instruction), 'Teacher instructions in the student workbook');
    }
    if (lesson.activity) {
      const url = [...pages.get(file).matchAll(/<a\b[^>]*href="([^"]+)"/gu)]
        .map(match => new URL(match[1].replaceAll('&amp;', '&'), origin))
        .find(link => link.hash === lesson.activity.route);
      assert.ok(url, 'Missing activity link for ' + file);
      assert.equal(url.origin, origin);
      assert.equal(url.searchParams.get('mode'), 'student');
      assert.equal(url.searchParams.get('cart'), 'true');
      assert.equal(routeAccess(learningRoute(url.hash)), 'public', 'Activity requires access in preview mode: ' + url.href);
    }
  });
  assert.match(visibleText(project), /rubric/iu);
});

test('course pages keep working internal links, safe external destinations and one main heading', () => {
  const idsByRoute = new Map([...pages].map(([file, html]) => [
    coursePageRoute(file), [...html.matchAll(/\bid="([^"]+)"/gu)].map(match => match[1])
  ]));
  for (const [file, html] of pages) {
    const pathname = coursePageRoute(file);
    const ids = idsByRoute.get(pathname);
    assert.equal(new Set(ids).size, ids.length, 'Duplicate anchor on ' + pathname);
    assert.equal([...html.matchAll(/<h1\b/gu)].length, 1, pathname);
    assert.ok(html.includes('rel="canonical" href="' + origin + pathname + '"'), pathname);
    assert.doesNotMatch(html, /<(?:script|iframe|form|input|textarea|object|embed)\b|\son\w+\s*=|\/workspace\/|docs\.google\.com|drive\.google\.com/iu, pathname);
    for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/gu)) {
      const url = new URL(href.replaceAll('&amp;', '&'), origin + pathname);
      assert.equal(url.protocol, 'https:', url.href);
      if (url.origin !== origin) continue;
      if (url.pathname.startsWith('/' + directory)) {
        assert.ok(idsByRoute.has(url.pathname), url.href);
        if (url.hash) assert.ok(idsByRoute.get(url.pathname).includes(url.hash.slice(1)), url.href);
      }
    }
  }
});

test('extensionless course pages work in both preview modes while authoring files stay private to the build', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'cll-cyber-course-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(path.join(root, directory), {recursive: true});
  for (const [file, html] of pages) await writeFile(path.join(root, file), html);
  for (const source of sources) await writeFile(path.join(root, source), 'build input');

  for (const mode of ['open', 'preview']) {
    const manifest = publicFilesFor(mode);
    const server = createPreviewServer({sourceRoot: root, publicLabAccess: mode});
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const base = 'http://127.0.0.1:' + server.address().port;
      for (const [file, html] of pages) {
        assert.ok(manifest.includes(file), file);
        assert.ok(!MEMBER_FILES.includes(file), file);
        const response = await fetch(base + coursePageRoute(file));
        assert.equal(response.status, 200, file);
        assert.match(response.headers.get('content-type'), /text\/html/u);
        assert.equal(await response.text(), html, file);
      }
      for (const source of sources) {
        assert.ok(!manifest.includes(source) && !MEMBER_FILES.includes(source), source);
        assert.equal((await fetch(base + '/' + source)).status, 404, source);
      }
      assert.equal((await fetch(base + '/' + directory + '/lesson-11')).status, 404);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  }
});
