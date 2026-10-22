import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPreviewServer, previewContentType } from '../scripts/serve.mjs';
import { PUBLIC_FILES } from '../scripts/build.mjs';

const PRIVATE_CANARY = 'PRIVATE_CURRICULUM_OR_SECRET_MUST_NOT_BE_SERVED';

async function put(root, filename, content) {
  const target = path.join(root, filename);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

async function fixture(t) {
  const folder = await mkdtemp(path.join(process.env.CLL_TEST_TMPDIR || os.tmpdir(), 'cll-preview-test-'));
  const root = path.join(folder, 'project');
  await mkdir(root);
  t.after(() => rm(folder, { recursive: true, force: true }));
  for (const filename of PUBLIC_FILES) await put(root, filename, `PUBLIC_PREVIEW_FIXTURE:${filename}`);
  const server = createPreviewServer({ sourceRoot: root });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return { root, folder, server };
}

function request(server, pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: pathname, method, agent: false }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('preview serves approved pages, clean routes, and versioned modules without building output', async t => {
  const { server } = await fixture(t);
  for (const [pathname, filename, type] of [
    ['/', 'index.html', 'text/html; charset=utf-8'],
    ['/classroom', 'classroom.html', 'text/html; charset=utf-8'],
    ['/school-it/', 'school-it.html', 'text/html; charset=utf-8'],
    ['/secure-reports', 'secure-reports.html', 'text/html; charset=utf-8'],
    ['/teacher/', 'teacher/index.html', 'text/html; charset=utf-8'],
    ['/src/app.js?release=test', 'src/app.js', 'text/javascript; charset=utf-8'],
    ['/src/styles.css', 'src/styles.css', 'text/css; charset=utf-8']
  ]) {
    const response = await request(server, pathname);
    assert.equal(response.status, 200, pathname);
    assert.equal(response.body, `PUBLIC_PREVIEW_FIXTURE:${filename}`, pathname);
    assert.equal(response.headers['content-type'], type, pathname);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
  }
});

test('existing private files, repository metadata, and unreviewed browser files are never served', async t => {
  const { root, server } = await fixture(t);
  const hidden = [
    '.env', 'README.md', 'package.json', 'docs/TEACHER-RUBRICS.md',
    'private-teacher-materials/criteria.json', 'Teacher/Resources/INC-101_Worked_Report.txt',
    'assets/ColeLearningLabs_Pop_Quiz_Answer_Keys.pdf', 'assets/unreviewed.pdf',
    'teacher/secret.html', 'src/unreviewed.html', 'scripts/build.mjs', 'dist/index.html'
  ];
  for (const filename of hidden) await put(root, filename, PRIVATE_CANARY);
  for (const filename of [...hidden, '.git/config']) {
    const response = await request(server, `/${filename}`);
    assert.equal(response.status, 404, filename);
    assert.doesNotMatch(response.body, new RegExp(PRIVATE_CANARY), filename);
  }
});

test('nested missing paths return the same reviewed 404 without reflecting the request', async t => {
  const { root, server } = await fixture(t);
  await put(root, 'docs/private.txt', PRIVATE_CANARY);
  for (const pathname of ['/missing/deep/path', '/docs/private.txt', '/unavailable?detail=PRIVATE_QUERY']) {
    const response = await request(server, pathname);
    assert.equal(response.status, 404, pathname);
    assert.equal(response.body, 'PUBLIC_PREVIEW_FIXTURE:404.html', pathname);
    assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.doesNotMatch(response.body, /PRIVATE_QUERY|PRIVATE_CURRICULUM_OR_SECRET/);
  }
  const head = await request(server, '/missing/deep/path', 'HEAD');
  assert.equal(head.status, 404);
  assert.equal(head.body, '');
  assert.equal(Number(head.headers['content-length']), Buffer.byteLength('PUBLIC_PREVIEW_FIXTURE:404.html'));

  // Browser hash routes still request the existing homepage, not a static path.
  const lab = new URL('/#lab/INC-101', 'https://preview.invalid');
  const home = await request(server, lab.pathname);
  assert.equal(home.status, 200);
  assert.equal(home.body, 'PUBLIC_PREVIEW_FIXTURE:index.html');
});

test('a missing error document falls back to a fixed 404 for GET and HEAD', async t => {
  const { root, server } = await fixture(t);
  await rm(path.join(root, '404.html'));
  const response = await request(server, '/missing/deep/path');
  assert.equal(response.status, 404);
  assert.equal(response.body, 'Not found');
  assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8');
  const head = await request(server, '/missing/deep/path', 'HEAD');
  assert.equal(head.status, 404);
  assert.equal(head.body, '');
  assert.equal(Number(head.headers['content-length']), Buffer.byteLength('Not found'));
});

test('raw or encoded traversal, malformed escapes, and Windows separators cannot expose a file', async t => {
  const { root, server } = await fixture(t);
  await put(root, '.env', PRIVATE_CANARY);
  for (const pathname of [
    '/../.env', '/%2e%2e/.env', '/src/../../.env', '/src/%2e%2e/%2e%2e/.env',
    '/src%2f..%2f.env', '/src%5c..%5c.env', '/%00index.html', '/%ZZ',
    '//index.html', '/src/./app.js', '/%252e%252e/.env'
  ]) {
    const response = await request(server, pathname);
    assert.ok([403, 404].includes(response.status), `${pathname}: ${response.status}`);
    assert.doesNotMatch(response.body, new RegExp(PRIVATE_CANARY));
  }
});

test('preview exposes no local classroom data service for read or write requests', async t => {
  const { server } = await fixture(t);
  for (const method of ['GET', 'POST']) {
    const response = await request(server, '/api/classrooms', method);
    assert.equal(response.status, 503);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(JSON.parse(response.body), {
      enabled: false, error: 'classroom_unconfigured',
      message: 'Connected classrooms are not configured. Independent labs remain available.'
    });
  }
});

test('HEAD preserves approved resource headers without bytes and static writes are rejected', async t => {
  const { server } = await fixture(t);
  const response = await request(server, '/index.html', 'HEAD');
  assert.equal(response.status, 200);
  assert.equal(response.body, '');
  assert.ok(Number(response.headers['content-length']) > 0);
  const write = await request(server, '/index.html', 'POST');
  assert.equal(write.status, 405);
  assert.equal(write.headers.allow, 'GET, HEAD');
});

test('curriculum MIME mappings are explicit and reviewed document entries download as attachments', async t => {
  assert.equal(previewContentType('workbook.pdf'), 'application/pdf');
  assert.equal(previewContentType('workbook.DOCX'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(previewContentType('slides.pptx'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.equal(previewContentType('unrecognized.bin'), 'application/octet-stream');
  const { server } = await fixture(t);
  for (const filename of PUBLIC_FILES.filter(filename => /\.(?:pdf|docx|pptx)$/i.test(filename))) {
    const response = await request(server, `/${filename}`);
    assert.equal(response.status, 200, filename);
    assert.equal(response.headers['content-type'], previewContentType(filename));
    assert.equal(response.headers['content-disposition'], `attachment; filename="${path.basename(filename)}"`);
    assert.equal(response.body, `PUBLIC_PREVIEW_FIXTURE:${filename}`);
  }
});

test('a directory cannot replace an approved public file', async t => {
  const { root, server } = await fixture(t);
  await rm(path.join(root, 'index.html'));
  await mkdir(path.join(root, 'index.html'));
  await put(root, 'index.html/index.html', PRIVATE_CANARY);
  const response = await request(server, '/index.html');
  assert.equal(response.status, 404);
  assert.doesNotMatch(response.body, new RegExp(PRIVATE_CANARY));
});

test('linked public directories cannot expose files outside the approved source tree', async t => {
  const { root, folder, server } = await fixture(t);
  const outside = path.join(folder, 'outside');
  await mkdir(outside);
  await put(outside, 'app.js', PRIVATE_CANARY);
  await rm(path.join(root, 'src'), { recursive: true });
  try { await symlink(outside, path.join(root, 'src'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (process.env.CLL_REQUIRE_LINK_TESTS !== '1' && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('This host cannot create directory links.'); return; }
    throw error;
  }
  const response = await request(server, '/src/app.js');
  assert.equal(response.status, 404);
  assert.doesNotMatch(response.body, new RegExp(PRIVATE_CANARY));
});

test('a symbolic link cannot replace an approved preview file', async t => {
  const { root, folder, server } = await fixture(t);
  const outside = path.join(folder, 'outside-private.txt');
  await writeFile(outside, PRIVATE_CANARY);
  await rm(path.join(root, 'index.html'));
  try { await symlink(outside, path.join(root, 'index.html'), 'file'); }
  catch (error) {
    if (process.env.CLL_REQUIRE_LINK_TESTS !== '1' && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('This host cannot create file links.'); return; }
    throw error;
  }
  const response = await request(server, '/');
  assert.equal(response.status, 404);
  assert.doesNotMatch(response.body, new RegExp(PRIVATE_CANARY));
});
