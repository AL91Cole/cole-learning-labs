import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_FILES, PUBLIC_SOURCE_FILES } from '../scripts/build.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ORIGIN = 'https://release-test.invalid/';
const ENTRIES = PUBLIC_SOURCE_FILES.filter(filename => filename.endsWith('.html'));
const read = filename => readFileSync(path.join(ROOT, filename), 'utf8');

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map(([, name, double, single, unquoted]) => [name.toLowerCase(), double ?? single ?? unquoted]));
}

function htmlDependencies(source) {
  return [...source.matchAll(/<(?:script|link)\b[^>]*>/gi)].flatMap(([tag]) => {
    const attrs = attributes(tag);
    if (/^<script\b/i.test(tag) && attrs.src) return [attrs.src];
    if (/^<link\b/i.test(tag) && /(?:^|\s)stylesheet(?:\s|$)/i.test(attrs.rel || '') && attrs.href) return [attrs.href];
    return [];
  });
}

function moduleDependencies(source) {
  const imports = [...source.matchAll(/^\s*(?:import\s+(?:[^;'"\n]+?\s+from\s+)?|export\s+[^;'"\n]+?\s+from\s+)(['"])([^'"\n]+)\1/gm)].map(match => match[2]);
  const dynamic = [...source.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)].map(match => match[2]);
  return [...imports, ...dynamic];
}

function filesWithin(folder) {
  return readdirSync(path.join(ROOT, folder), { withFileTypes:true }).flatMap(entry => {
    const filename = `${folder}/${entry.name}`;
    return entry.isDirectory() ? filesWithin(filename) : [filename];
  });
}

const indexReferences = htmlDependencies(read('index.html'));
const appReference = indexReferences.find(ref => new URL(ref, ORIGIN).pathname === '/src/app.js');
assert.ok(appReference, 'index.html must define the application entry module');
const RELEASE = new URL(appReference, ORIGIN).searchParams.get('release');

function asset(reference, importer, extension) {
  assert.ok(reference && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference), `${importer}: asset must be a local relative/root path: ${reference}`);
  const url = new URL(reference, new URL(importer, ORIGIN));
  assert.equal(url.origin, new URL(ORIGIN).origin, `${importer}: external dependency ${reference}`);
  assert.equal(url.searchParams.get('release'), RELEASE, `${importer}: missing or inconsistent release query on ${reference}`);
  assert.deepEqual([...url.searchParams.keys()], ['release'], `${importer}: unexpected module/style query parameters on ${reference}`);
  assert.equal(url.hash, '', `${importer}: module/style fragments create a separate cache identity: ${reference}`);
  assert.match(url.pathname, extension, `${importer}: unexpected module/style extension: ${reference}`);

  // The query belongs to the browser cache identity, never the filesystem path.
  const filename = decodeURIComponent(url.pathname.slice(1));
  const target = path.resolve(ROOT, filename);
  const relative = path.relative(ROOT, target);
  assert.ok(relative && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), `${importer}: asset escaped the source root`);
  assert.ok(existsSync(target), `${importer}: referenced asset does not exist: ${filename}`);
  return filename.replaceAll(path.sep, '/');
}

test('all reviewed source entry scripts and styles retain the entry-defined asset release', () => {
  assert.match(RELEASE || '', /^\d{8}-[a-z0-9-]+$/, 'app.js must define a nonempty named release');
  for (const entry of ENTRIES) {
    const dependencies = htmlDependencies(read(entry));
    assert.ok(dependencies.length, `${entry}: no scripts or styles were found`);
    for (const reference of dependencies) asset(reference, entry, /\.(?:m?js|css)$/);
  }
});

test('source-only learning entry pages are excluded from the public file manifest',()=>{
  for(const filename of ['classroom.html','teacher/index.html','student-workbook.html','practice-quizzes.html']){
    assert.ok(ENTRIES.includes(filename),`${filename}: keep source dependency review`);
    assert.equal(PUBLIC_FILES.includes(filename),false,`${filename}: require protected delivery`);
  }
  for(const filename of ['index.html','404.html','school-it.html','ai-use-notice.html','secure-reports.html'])assert.ok(PUBLIC_FILES.includes(filename),`${filename}: public information or local privacy utility remains available`);
});

test('the static 404 resolves navigation and assets from a nested missing URL', () => {
  const source = read('404.html');
  assert.match(source, /<meta\s+name="robots"\s+content="noindex"/i);
  assert.doesNotMatch(source, /<script\b/i, 'the error page must not load the application or reflect request data');
  assert.doesNotMatch(source, /<base\b/i);
  const nested = new URL('/missing/deep/path', ORIGIN);
  const references = [...source.matchAll(/<(?:a|img|link)\b[^>]*>/gi)].map(([tag]) => attributes(tag)).flatMap(attrs => [attrs.href || attrs.src].filter(Boolean));
  for (const reference of references) {
    if (reference === '#main') continue;
    assert.ok(reference.startsWith('/') && !reference.startsWith('//'), `404 reference must be root-relative: ${reference}`);
    const url = new URL(reference, nested);
    assert.equal(url.origin, nested.origin);
    assert.ok(url.pathname === '/' || existsSync(path.join(ROOT, url.pathname.slice(1))), `404 target is missing: ${reference}`);
  }
  for (const target of ['/#home', '/#labs']) assert.ok(references.includes(target), `404 needs a working recovery link: ${target}`);
});

test('the complete source import graph cannot combine cached module releases', () => {
  const modules = filesWithin('src').filter(filename => /\.m?js$/.test(filename));
  let edges = 0;
  for (const importer of modules) {
    for (const reference of moduleDependencies(read(importer))) {
      assert.ok(reference.startsWith('.') || reference.startsWith('/'), `${importer}: bare/external module dependency ${reference}`);
      asset(reference, importer, /\.m?js$/);
      edges += 1;
    }
  }
  assert.ok(edges >= 8, 'the app, record normalization, and classroom module dependencies must be inspected');
  const recordDependencies = moduleDependencies(read('src/records.js'));
  assert.ok(recordDependencies.some(ref => new URL(ref, new URL('src/records.js', ORIGIN)).pathname === '/src/hardware.js'), 'record normalization must include its hardware dependency');
});

test('stylesheet imports cannot load an unversioned or external dependency', () => {
  for (const importer of filesWithin('src').filter(filename => filename.endsWith('.css'))) {
    const source = read(importer);
    for (const match of source.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/gi)) asset(match[1], importer, /\.css$/);
    for (const match of source.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi)) {
      const reference = match[1];
      if (reference.startsWith('data:') || reference.startsWith('#')) continue;
      const url = new URL(reference, new URL(importer, ORIGIN));
      assert.equal(url.origin, new URL(ORIGIN).origin, `${importer}: external stylesheet resource ${reference}`);
      if (url.pathname.endsWith('.css')) asset(reference, importer, /\.css$/);
    }
  }
});

test('release validation rejects stale imports and normalizes query-bearing targets', () => {
  assert.equal(asset(`./hardware.js?release=${RELEASE}`, 'src/records.js', /\.js$/), 'src/hardware.js');
  assert.throws(() => asset('./hardware.js', 'src/records.js', /\.js$/), /release query/);
  assert.throws(() => asset('./hardware.js?release=20000101-stale', 'src/records.js', /\.js$/), /release query/);
  assert.throws(() => asset(`https://external.invalid/module.js?release=${RELEASE}`, 'src/records.js', /\.js$/), /local relative/);
  assert.throws(() => asset(`./missing-module.js?release=${RELEASE}`, 'src/records.js', /\.js$/), /does not exist/);
  assert.throws(() => asset(`./hardware.js?release=${RELEASE}#second-copy`, 'src/records.js', /\.js$/), /cache identity/);
});
