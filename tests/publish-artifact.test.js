import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite, PUBLIC_FILES, PUBLIC_SOURCE_FILES } from '../scripts/build.mjs';

async function fixture(t) {
  // Restricted hosts may supply a writable scratch directory without touching source.
  const directory = await mkdtemp(path.join(process.env.CLL_TEST_TMPDIR || os.tmpdir(), 'cll-publish-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'project');
  await mkdir(root);
  for (const filename of PUBLIC_SOURCE_FILES) {
    const target = path.join(root, filename);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(new URL('../'+filename,import.meta.url),target);
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
    await writeFile(target,filename==='package.json'?JSON.stringify({private:true,type:'module',description:'PRIVATE_FIXTURE_DO_NOT_PUBLISH'}):'PRIVATE_FIXTURE_DO_NOT_PUBLISH');
  }
  const result = await buildSite({ sourceRoot: root });
  assert.equal(result.directory, path.join(root, 'dist'));
  const files = await list(result.directory);
  assert.ok(files.includes('index.html'));
  assert.equal(files.includes('teacher/index.html'),false,'The legacy teacher document cannot bypass member delivery.');
  const chunks=files.filter(filename=>filename.startsWith('src/chunks/'));
  assert.deepEqual(files.filter(filename=>!chunks.includes(filename)),[...PUBLIC_FILES].sort());
  assert.deepEqual(chunks,[...result.generated].sort(),'Generated route chunks are reported with the build.');
  assert.ok(chunks.length>=10&&chunks.every(filename=>/^src\/chunks\/[a-z0-9-]+-[A-Z0-9]+\.js$/u.test(filename)));
  const referenced=new Set();
  for(const filename of ['src/app.js',...chunks])for(const match of (await readFile(path.join(result.directory,filename),'utf8')).matchAll(/\b(?:from|import|import\()"\.\/([^"]+\.js)"/gu))referenced.add(path.posix.normalize(path.posix.join(path.posix.dirname(filename),match[1])));
  for(const filename of chunks)assert.ok(referenced.has(filename),`${filename}: every generated chunk is referenced by the entry or another chunk`);
  for(const filename of referenced)assert.ok(files.includes(filename),`${filename}: chunk references resolve inside the published artifact`);
  assert.ok(files.includes('404.html'), 'Pages needs a top-level 404 to disable homepage fallback for missing paths');
  assert.ok(files.includes('src/app.js') && files.includes('assets/favicon.svg'));
  assert.ok(files.includes('_headers') && files.includes('_routes.json'));
  assert.equal(await readFile(path.join(result.directory,'.well-known/security.txt'),'utf8'),await readFile(new URL('../.well-known/security.txt',import.meta.url),'utf8'));
  assert.equal(files.some(filename => privateFiles.includes(filename)), false);
  for (const filename of files) assert.equal((await readFile(path.join(result.directory, filename), 'utf8')).includes('PRIVATE_FIXTURE_DO_NOT_PUBLISH'), false);
  assert.equal(await readFile(path.join(root, 'functions/api/[[path]].js'), 'utf8'), 'PRIVATE_FIXTURE_DO_NOT_PUBLISH', 'Functions stay at project root for Cloudflare compilation.');
  assert.deepEqual(JSON.parse(await readFile(path.join(result.directory, '_routes.json'), 'utf8')), { version: 1, include: ['/api/requester', '/api/reach', '/api/telemetry', '/api/verify'], exclude: [] });
  for(const filename of files.filter(name=>name.endsWith('.html'))){
    const html=await readFile(path.join(result.directory,filename),'utf8');
    const styles=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/gu)];
    assert.equal(styles.length,1,`${filename}: one blocking stylesheet`);
    const url=new URL(styles[0][1],new URL(filename,'https://test.invalid/'));
    assert.ok(files.includes(url.pathname.slice(1)));
    assert.doesNotMatch(await readFile(path.join(result.directory,url.pathname.slice(1)),'utf8'),/@import\b/u);
    if(filename==='404.html')assert.ok(styles[0][1].startsWith('/'),'Nested 404 styles must resolve from the origin.');
  }
});

test('CSS bundling refuses remote and unreviewed imports before replacing a previous build',async t=>{
  const {root}=await fixture(t);
  await mkdir(path.join(root,'dist'));
  await writeFile(path.join(root,'dist','previous.txt'),'KEEP');
  for(const reference of ['https://external.invalid/collect.css','./unreviewed.css','../../private.css']){
    await writeFile(path.join(root,'src/styles.css'),`@import "${reference}";`);
    await assert.rejects(buildSite({sourceRoot:root}),/Unapproved stylesheet reference/u);
    assert.equal(await readFile(path.join(root,'dist/previous.txt'),'utf8'),'KEEP');
  }
});

for (const unexpected of ['src/.env', 'src/unreviewed.js', 'assets/unreviewed.svg', 'assets/secret.json', 'teacher/extra.html', '.well-known/private.json']) {
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

test('unreviewed API routing cannot expose other Functions or broaden the requester route', async t => {
  const { root } = await fixture(t);
  for (const routes of [
    { version: 1, include: ['/*'], exclude: [] },
    { version: 1, include: ['/api', '/api/*'], exclude: [] },
    { version: 1, include: ['/api/requester', '/api/improvements'], exclude: [] },
    { version: 1, include: ['/api/requester', '/api/session'], exclude: [] },
    { version: 1, include: ['/api/requester/*'], exclude: [] }
  ]) {
    await writeFile(path.join(root, '_routes.json'), JSON.stringify(routes));
    await assert.rejects(buildSite({ sourceRoot: root }), /requester/);
    await assert.rejects(lstat(path.join(root, 'dist')), { code: 'ENOENT' });
  }
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

test('a separate build location receives the same artifact and leaves the source tree untouched', async t => {
  const { root, directory } = await fixture(t);
  const location = path.join(directory, 'location');
  await mkdir(location);
  await writeFile(path.join(location, 'neighbour.txt'), 'Unrelated files here are not touched.');
  const before = await list(root);
  const result = await buildSite({ sourceRoot: root, outputRoot: location });
  assert.equal(result.directory, path.join(location, 'dist'));
  assert.deepEqual(await list(root), before, 'No dist or staging folder appears in the source tree.');
  assert.deepEqual((await readdir(location)).sort(), ['dist', 'neighbour.txt']);
  const files = await list(result.directory);
  assert.deepEqual(files.filter(filename => !filename.startsWith('src/chunks/')), [...PUBLIC_FILES].sort());
  assert.deepEqual(files.filter(filename => filename.startsWith('src/chunks/')), [...result.generated].sort());
  // The default location is unchanged, and naming the source root itself is the default.
  assert.equal((await buildSite({ sourceRoot: root, outputRoot: root })).directory, path.join(root, 'dist'));
  assert.deepEqual(await list(path.join(root, 'dist')), files);
});

test('a separate build location is refused unless it is an absolute, existing, empty-of-dist folder outside the source tree', async t => {
  const { root, directory } = await fixture(t);
  const location = path.join(directory, 'location');
  await mkdir(location);
  for (const outputRoot of ['location', '', '.', null, 0, {}]) await assert.rejects(buildSite({ sourceRoot: root, outputRoot }), /absolute directory path/);
  await assert.rejects(buildSite({ sourceRoot: root, outputRoot: path.join(directory, 'missing') }), { code: 'ENOENT' });
  await writeFile(path.join(directory, 'file.txt'), 'Not a folder.');
  await assert.rejects(buildSite({ sourceRoot: root, outputRoot: path.join(directory, 'file.txt') }), /real directory/);
  for (const inside of ['assets', 'src', 'docs/nested']) {
    await mkdir(path.join(root, 'docs/nested'), { recursive: true });
    await assert.rejects(buildSite({ sourceRoot: root, outputRoot: path.join(root, inside) }), /outside the source tree/);
  }
  // An existing dist in a separate location is never replaced or emptied, whatever it is.
  await mkdir(path.join(location, 'dist'));
  await writeFile(path.join(location, 'dist', 'previous.txt'), 'KEEP');
  await assert.rejects(buildSite({ sourceRoot: root, outputRoot: location }), /must not already contain a dist/);
  assert.deepEqual(await list(location), ['dist/previous.txt']);
  await rm(path.join(location, 'dist'), { recursive: true });
  await writeFile(path.join(location, 'dist'), 'KEEP');
  await assert.rejects(buildSite({ sourceRoot: root, outputRoot: location }), /must not already contain a dist/);
  assert.equal(await readFile(path.join(location, 'dist'), 'utf8'), 'KEEP');
  await rm(path.join(location, 'dist'));
  // A source tree that is itself named dist cannot be chosen as the output of its own build.
  const named = path.join(location, 'dist');
  await rename(root, named);
  await assert.rejects(buildSite({ sourceRoot: named, outputRoot: location }), /outside the source tree/);
  assert.ok((await list(named)).includes('index.html'));
  assert.equal((await readdir(location)).concat(await readdir(directory)).some(name => name.startsWith('.publish-stage-')), false);
});

test('symlinked public trees and output folders never expose or remove an outside directory', async t => {
  const { root, directory } = await fixture(t);
  const outside = path.join(directory, 'outside');
  await mkdir(outside);
  await writeFile(path.join(outside, 'keep.txt'), 'Outside data must survive.');
  const link = path.join(root, 'dist');
  try { await symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (process.env.CLL_REQUIRE_LINK_TESTS !== '1' && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('This host cannot create directory links.'); return; } throw error; }
  await assert.rejects(buildSite({ sourceRoot: root }), /real directory/);
  assert.equal(await readFile(path.join(outside, 'keep.txt'), 'utf8'), 'Outside data must survive.');
  await rm(link);
  const linkedLocation = path.join(directory, 'linked-location');
  await symlink(outside, linkedLocation, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildSite({ sourceRoot: root, outputRoot: linkedLocation }), /real directory/);
  assert.deepEqual(await readdir(outside), ['keep.txt']);
  await rm(linkedLocation);
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
  catch (error) { if (process.env.CLL_REQUIRE_LINK_TESTS !== '1' && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('This host cannot create file links.'); return; } throw error; }
  await assert.rejects(buildSite({ sourceRoot: root }), /regular public file/);
  await assert.rejects(lstat(path.join(root, 'dist')), { code: 'ENOENT' });
  assert.equal(await readFile(outside, 'utf8'), 'PRIVATE_OUTSIDE_SOURCE');
});
