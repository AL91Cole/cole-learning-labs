import test from 'node:test';
import assert from 'node:assert/strict';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite, PUBLIC_FILES } from '../scripts/build.mjs';

async function fixture(t) {
  // Restricted hosts may supply a writable scratch directory without touching source.
  const directory = await mkdtemp(path.join(process.env.CLL_TEST_TMPDIR || os.tmpdir(), 'cll-publish-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'project');
  await mkdir(root);
  for (const filename of PUBLIC_FILES) {
    const target = path.join(root, filename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, filename === '_routes.json' ? JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }) : `Reviewed fixture: ${filename}`);
  }
  return { root, directory };
}

async function list(folder, prefix = '') {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const filename = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await list(path.join(folder, entry.name), filename + '/'));
    else files.push(filename);
  }
  return files.sort();
}

test('publish output includes browser resources and API routing while excluding repository and secret files', async t => {
  const { root } = await fixture(t);
  const privateFiles = ['.env', '.git/config', '.github/workflows/security.yml', 'docs/private.md', 'tests/example.test.js', 'scripts/serve.mjs', 'migrations/0001_classrooms.sql', 'package.json', 'functions/api/[[path]].js'];
  for (const filename of privateFiles) {
    const target = path.join(root, filename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, 'PRIVATE_FIXTURE_DO_NOT_PUBLISH');
  }
  const result = await buildSite({ sourceRoot: root });
  assert.equal(result.directory, path.join(root, 'dist'));
  const files = await list(result.directory);
  assert.ok(files.includes('index.html') && files.includes('teacher/index.html'));
  assert.ok(files.includes('src/app.js') && files.includes('assets/favicon.svg'));
  assert.ok(files.includes('_headers') && files.includes('_routes.json'));
  assert.equal(files.some(filename => privateFiles.includes(filename)), false);
  for (const filename of files) assert.equal((await readFile(path.join(result.directory, filename), 'utf8')).includes('PRIVATE_FIXTURE_DO_NOT_PUBLISH'), false);
  assert.equal(await readFile(path.join(root, 'functions/api/[[path]].js'), 'utf8'), 'PRIVATE_FIXTURE_DO_NOT_PUBLISH', 'Functions stay at project root for Cloudflare compilation.');
  assert.deepEqual(JSON.parse(await readFile(path.join(result.directory, '_routes.json'), 'utf8')), { version: 1, include: ['/api/*'], exclude: [] });
});

for (const unexpected of ['src/.env', 'src/unreviewed.js', 'assets/unreviewed.svg', 'assets/secret.json', 'teacher/extra.html']) {
  test(`an unreviewed file in a public directory fails closed: ${unexpected}`, async t => {
    const { root } = await fixture(t);
    await mkdir(path.join(root, 'dist'));
    await writeFile(path.join(root, 'dist', 'previous.txt'), 'Previous output remains intact.');
    await writeFile(path.join(root, unexpected), 'DO_NOT_PUBLISH');
    await assert.rejects(buildSite({ sourceRoot: root }), /Unapproved public file/);
    assert.deepEqual(await list(path.join(root, 'dist')), ['previous.txt']);
    assert.equal((await readdir(root)).some(name => name.startsWith('.publish-stage-')), false);
  });
}

test('missing or nonregular required sources refuse a new build without replacing existing output', async t => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, 'dist'));
  await writeFile(path.join(root, 'dist', 'previous.txt'), 'Keep this on failure.');
  await rm(path.join(root, 'index.html'));
  await mkdir(path.join(root, 'index.html'));
  await assert.rejects(buildSite({ sourceRoot: root }), /regular public file/);
  assert.equal(await readFile(path.join(root, 'dist', 'previous.txt'), 'utf8'), 'Keep this on failure.');
});

test('unreviewed API routing cannot broaden Functions invocation', async t => {
  const { root } = await fixture(t);
  await writeFile(path.join(root, '_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude: [] }));
  await assert.rejects(buildSite({ sourceRoot: root }), /reviewed \/api\/\*/);
  await assert.rejects(lstat(path.join(root, 'dist')), { code: 'ENOENT' });
});

test('successful rebuild removes stale output without copying new root files', async t => {
  const { root } = await fixture(t);
  await buildSite({ sourceRoot: root });
  await mkdir(path.join(root, 'dist', 'old'));
  await writeFile(path.join(root, 'dist', 'old', 'secret.txt'), 'Do not retain stale artifacts.');
  await writeFile(path.join(root, 'new-private.txt'), 'Do not publish new root files.');
  await buildSite({ sourceRoot: root });
  assert.equal((await list(path.join(root, 'dist'))).some(filename => /secret|private|old\//.test(filename)), false);
  assert.equal((await readdir(root)).some(name => name.startsWith('.publish-stage-')), false);
});

test('symlinked public trees and output folders never expose or remove an outside directory', async t => {
  const { root, directory } = await fixture(t);
  const outside = path.join(directory, 'outside');
  await mkdir(outside);
  await writeFile(path.join(outside, 'keep.txt'), 'Outside data must survive.');
  const link = path.join(root, 'dist');
  try { await symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('This host cannot create directory links.'); return; } throw error; }
  await assert.rejects(buildSite({ sourceRoot: root }), /real directory/);
  assert.equal(await readFile(path.join(outside, 'keep.txt'), 'utf8'), 'Outside data must survive.');
  await rm(link);
  await rm(path.join(root, 'src'), { recursive: true });
  await symlink(outside, path.join(root, 'src'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildSite({ sourceRoot: root }), /real directory/);
  assert.equal(await readFile(path.join(outside, 'keep.txt'), 'utf8'), 'Outside data must survive.');
});

test('a symbolic link cannot replace a required public file', async t => {
  const { root, directory } = await fixture(t);
  const outside = path.join(directory, 'private.txt');
  await writeFile(outside, 'PRIVATE_OUTSIDE_SOURCE');
  await rm(path.join(root, 'index.html'));
  try { await symlink(outside, path.join(root, 'index.html'), 'file'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('This host cannot create file links.'); return; } throw error; }
  await assert.rejects(buildSite({ sourceRoot: root }), /regular public file/);
  await assert.rejects(lstat(path.join(root, 'dist')), { code: 'ENOENT' });
  assert.equal(await readFile(outside, 'utf8'), 'PRIVATE_OUTSIDE_SOURCE');
});
