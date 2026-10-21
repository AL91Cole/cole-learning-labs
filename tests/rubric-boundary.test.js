import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Script } from 'node:vm';
import { SCENARIOS } from '../src/scenarios.js';
import { buildSite, PUBLIC_FILES } from '../scripts/build.mjs';

const forbiddenKeys = /^(?:rubrics?|answer_?keys?|grading_?criteria|mark_?schemes?|teacher_?notes|private_?criteria)$/i;
function inspectPublicValues(value, location = 'catalogue') {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    assert.equal(forbiddenKeys.test(key), false, `${location}.${key} must never be shipped in the public catalogue`);
    inspectPublicValues(item, `${location}.${key}`);
  }
}

test('all public lab cases exclude teacher grading and answer-key fields', () => {
  assert.equal(SCENARIOS.length, 32);
  inspectPublicValues(SCENARIOS);
  for (const scenario of SCENARIOS) {
    assert.ok(scenario.goal && scenario.brief, `${scenario.id}: learner instructions remain available`);
    assert.ok(scenario.clues.length && scenario.questions.length, `${scenario.id}: interactive investigation remains available`);
  }
});

test('the student lab has no rubric viewer and the public manifest has no private assessment resource', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.equal(/\bopenRubric\b|id=["']rubric["']|data-action=["'](?:teacher-)?rubric["']|\.rubric\b/.test(app), false, 'The public student application must not contain a rubric viewer or rubric payload access.');
  for (const filename of PUBLIC_FILES) {
    assert.doesNotMatch(filename, /rubric|answer[-_]?key|private[-_]?teacher|teacher[-_]?materials/i);
  }
  assert.equal(PUBLIC_FILES.includes('docs/TEACHER-RUBRICS.md'), false);
});

test('the public teacher demo cannot render assessment criteria from a scenario object', async () => {
  const source = await readFile(new URL('../src/classroom-portal.js', import.meta.url), 'utf8');
  const start = source.indexOf('function submissionPanel(');
  // Stop at the next top-level function; focus helpers may sit before render.
  const end = source.indexOf('\nfunction ', start + 1);
  assert.ok(start >= 0 && end > start);
  const panel = new Script(`(${source.slice(start, end)})`).runInNewContext({
    lab: () => ({ rubric: ['PRIVATE_ASSESSMENT_CANARY_NEVER_RENDER'] }),
    model: { mode: 'demo' },
    workEvidence: () => '<p>Fictional learner work</p>',
    tag: () => '<span>submitted</span>',
    date: () => 'Fictional date',
    esc: value => String(value ?? '')
  });
  const html = panel({ labId: 'INC-101' }, { draftVersion: 1, createdAt: 0, status: 'submitted', work: {} });
  assert.doesNotMatch(html, /PRIVATE_ASSESSMENT_CANARY_NEVER_RENDER/);
  assert.match(html, /public demonstration/);
  assert.match(html, /does not store or deliver teacher rubrics/);
});

test('a private teacher-material directory cannot enter the built public website', async t => {
  const directory = await mkdtemp(path.join(process.env.CLL_TEST_TMPDIR || os.tmpdir(), 'cll-rubric-boundary-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'project');
  await mkdir(root);
  for (const filename of PUBLIC_FILES) {
    const target = path.join(root, filename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, filename === '_routes.json' ? JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }) : 'PUBLIC_FIXTURE');
  }
  const privateDirectory = path.join(root, 'private-teacher-materials');
  await mkdir(privateDirectory);
  await writeFile(path.join(privateDirectory, 'rubric.json'), 'PRIVATE_ASSESSMENT_CANARY_NEVER_PUBLISH');
  const result = await buildSite({ sourceRoot: root });
  assert.equal((await readdir(result.directory)).includes('private-teacher-materials'), false);
  for (const filename of result.files) {
    assert.equal((await readFile(path.join(result.directory, filename), 'utf8')).includes('PRIVATE_ASSESSMENT_CANARY_NEVER_PUBLISH'), false);
  }
});
