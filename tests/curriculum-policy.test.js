import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertPublicCurriculumPaths, auditCurriculumRepository, curriculumPathIssue } from '../scripts/curriculum-policy.mjs';
import { PUBLIC_FILES } from '../scripts/build.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(process.env.CLL_TEST_TMPDIR || os.tmpdir(), 'cll-curriculum-policy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function put(root, filename, content = 'FICTIONAL_CURRICULUM_FIXTURE') {
  await mkdir(path.dirname(path.join(root, filename)), { recursive: true });
  await writeFile(path.join(root, filename), content);
}

function initGit(t, root) {
  const result = spawnSync('git', ['-C', root, 'init', '--quiet'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0 && /permission denied|access is denied/i.test(result.stderr || '')) {
    t.skip('This host cannot create temporary Git metadata; CI exercises the tracked-file audit.');
    return false;
  }
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return true;
}

test('curriculum policy catches imported private materials even after renaming separators or capitalization', () => {
  const forbidden = [
    'Teacher/Assessment/ColeLearningLabs_Pop_Quiz_Answer_Keys.docx',
    'downloads/ColeLearningLabs_Pop_Quiz_Answer_Keys.pdf',
    'assets/answerKEYS.json', 'assets/answer key.pdf', 'assets/answer-key.pdf',
    'assets/Answer_Keys/innocent-looking.pdf',
    'Teacher/Resources/INC-101_Worked_Report.txt', 'downloads/INC-101.worked.report.txt',
    'downloads/ColeLearningLabs_Engaging_Instructor_Guide.docx',
    'downloads/ColeLearningLabs_Engaging_Speaking_Script.pdf',
    'Teacher/Slides/public-looking-file.pptx', 'TEACHER/Assessment/quiz.pdf',
    'teacher/resources/guide.pdf', 'private_curriculum/notes.pdf',
    'private-teacher-materials/notes.pdf', 'Teacher_Bundle/unassuming.txt',
    'instructor-bundle/notes.pdf', 'teacher-rubrics/criteria.json',
    'upload.zip', 'downloads/Curriculum.ZIP'
  ];
  for (const filename of forbidden) {
    assert.ok(curriculumPathIssue(filename), filename);
    assert.throws(() => assertPublicCurriculumPaths(['README.md', filename]), /Private curriculum/, filename);
  }
});

test('reviewed public website resources and policy explanations stay eligible', () => {
  assert.doesNotThrow(() => assertPublicCurriculumPaths(PUBLIC_FILES));
  for (const filename of [
    'docs/TEACHER-RUBRICS.md', 'tests/rubric-boundary.test.js', 'scripts/curriculum-policy.mjs',
    'Students/Cole_Learning_Labs_Student_Workbook.pdf',
    'Students/Cole_Learning_Labs_Student_Workbook.docx',
    'downloads/ColeLearningLabs_Pop_Quizzes.pdf', 'downloads/lesson-1.pptx',
    'teacher/index.html', 'teacher\\index.html'
  ]) assert.equal(curriculumPathIssue(filename), null, filename);
  // Naming eligibility alone never adds a file to the reviewed publish manifest.
  assert.equal(PUBLIC_FILES.includes('downloads/lesson-1.pptx'), false);
});

test('malformed or escaping paths cannot pass the public curriculum policy', () => {
  for (const filename of ['', '../notes.pdf', '/notes.pdf', 'C:\\notes.pdf', 'docs//notes.pdf', 'docs/./notes.pdf', 'docs/../notes.pdf', 'bad\0name.pdf']) {
    assert.throws(() => assertPublicCurriculumPaths([filename]), /invalid repository path/);
  }
});

test('source snapshots fail closed on private curriculum while generated folders are excluded', async t => {
  const root = await fixture(t);
  await put(root, 'docs/TEACHER-RUBRICS.md', 'Public boundary documentation.');
  await put(root, 'dist/old-bundle.zip');
  assert.deepEqual(await auditCurriculumRepository({ sourceRoot: root }), { files: 1, mode: 'snapshot' });
  await put(root, 'assets/INC-101_Worked_Report.txt');
  await assert.rejects(auditCurriculumRepository({ sourceRoot: root }), /INC-101_Worked_Report/);
});

test('tracked-file audit rejects ignored private material force-added to Git', async t => {
  const root = await fixture(t);
  const git = args => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  if (!initGit(t, root)) return;
  await put(root, '.gitignore', '*.zip\n*Answer_Key*\n');
  await put(root, 'README.md', 'Public curriculum policy.');
  assert.equal(git(['add', '.gitignore', 'README.md']).status, 0);
  await put(root, 'untracked-worked-report.txt');
  assert.deepEqual(await auditCurriculumRepository({ sourceRoot: root }), { files: 2, mode: 'tracked' });
  await put(root, 'ColeLearningLabs_Pop_Quiz_Answer_Keys.pdf');
  assert.equal(git(['add', '--force', 'ColeLearningLabs_Pop_Quiz_Answer_Keys.pdf']).status, 0);
  await assert.rejects(auditCurriculumRepository({ sourceRoot: root }), /ColeLearningLabs_Pop_Quiz_Answer_Keys/);
});

test('invalid Git metadata refuses audit instead of silently falling back to a partial scan', async t => {
  const root = await fixture(t);
  await put(root, '.git', 'gitdir: missing-git-metadata\n');
  await assert.rejects(auditCurriculumRepository({ sourceRoot: root }), /repository audit refused/);
});

test('gitignore protects imported archive and teacher filenames while retaining the public teacher demo', async t => {
  const root = await fixture(t);
  const git = args => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  if (!initGit(t, root)) return;
  await put(root, '.gitignore', await readFile(new URL('../.gitignore', import.meta.url), 'utf8'));
  for (const filename of [
    'Teacher/Slides/Lesson_1.pptx', 'downloads/ColeLearningLabs_Pop_Quiz_Answer_Keys.pdf',
    'downloads/INC-101_Worked_Report.txt', 'downloads/answerkey.docx',
    'downloads/engaging-instructor-guide.pdf', 'downloads/engaging speaking script.pdf',
    'private_curriculum/notes.txt', 'Teacher_Bundle/notes.txt', 'uploads/Curriculum.ZIP'
  ]) {
    assert.equal(git(['check-ignore', '--quiet', '--', filename]).status, 0, filename);
  }
  assert.equal(git(['check-ignore', '--quiet', '--', 'teacher/index.html']).status, 1);
  assert.equal(git(['check-ignore', '--quiet', '--', 'docs/TEACHER-RUBRICS.md']).status, 1);
});

test('the build rejects a private filename even when it is accidentally added to the public manifest', async t => {
  const root = await fixture(t);
  const source = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  const modified = source.replace("'index.html'", "'assets/Answer_Keys.pdf'");
  assert.notEqual(modified, source, 'The fixture must introduce an otherwise explicitly approved private-named file.');
  await put(root, 'scripts/build.mjs', modified);
  await put(root, 'scripts/curriculum-policy.mjs', await readFile(new URL('../scripts/curriculum-policy.mjs', import.meta.url), 'utf8'));
  const { buildSite } = await import(pathToFileURL(path.join(root, 'scripts/build.mjs')).href);
  await assert.rejects(buildSite({ sourceRoot: root }), /Private curriculum[\s\S]*Answer_Keys/);
  await assert.rejects(readFile(path.join(root, 'dist/index.html')), { code: 'ENOENT' });
});
