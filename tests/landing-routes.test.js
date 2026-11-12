import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createPreviewServer} from '../scripts/serve.mjs';
import {publicFilesFor, PUBLIC_LANDING_PAGES, offlinePrecacheList} from '../scripts/build.mjs';
import {learningRoute, labPageHash} from '../src/learning-routes.js';
import {routeAccess} from '../src/access-policy.js';
import {studentLinkAction} from '../src/session-modes.js';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

async function preview(t, access) {
  const folder = await mkdtemp(path.join(process.env.CLL_TEST_TMPDIR || os.tmpdir(), 'cll-landing-test-')), root = path.join(folder, 'project');
  await mkdir(root); t.after(() => rm(folder, {recursive: true, force: true}));
  for (const filename of publicFilesFor(access)) { const target = path.join(root, filename); await mkdir(path.dirname(target), {recursive: true}); await writeFile(target, 'FIXTURE:' + filename); }
  const server = createPreviewServer({sourceRoot: root, publicLabAccess: access});
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return pathname => new Promise((resolve, reject) => {
    const request = http.request({hostname: '127.0.0.1', port: server.address().port, path: pathname, agent: false}, response => { const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({status: response.statusCode, body: Buffer.concat(chunks).toString('utf8'), type: response.headers['content-type']})); });
    request.on('error', reject); request.end();
  });
}

test('every landing page opens directly at its ordinary address in both access modes, and unknown lesson paths stay not found', async t => {
  for (const access of ['open', 'preview']) {
    const get = await preview(t, access);
    for (const file of PUBLIC_LANDING_PAGES) {
      const response = await get('/' + file.replace('.html', ''));
      assert.equal(response.status, 200, access + ' ' + file); assert.equal(response.body, 'FIXTURE:' + file); assert.equal(response.type, 'text/html; charset=utf-8');
    }
    for (const missing of ['/lessons/', '/lessons/unknown', '/lessons/blank-monitor/extra', '/teach/extra', '/lessons/../package.json']) assert.notEqual((await get(missing)).status, 200, missing);
    assert.equal((await get('/')).status, 200);
  }
});

test('existing hash routes, classroom links and redirects are unchanged by the new pages', async () => {
  assert.deepEqual({...learningRoute('#lab/INC-101/workbench?mode=guided')}, {page: 'lab', id: 'INC-101', mode: 'guided', sequence: null, section: 2});
  assert.equal(labPageHash('INC-107', 1, {mode: 'challenge'}), '#lab/INC-107/request?mode=challenge');
  for (const hash of ['#home', '#labs', '#labs/hardware', '#explore', '#explore?band=k1', '#explore/EX-SEC-1', '#learn/hardware', '#arcade', '#arcade/packet-post', '#quests', '#play/inbox-defender', '#lab/INC-101', '#lab/SEC-405', '#capstone', '#educators', '#guide', '#about', '#projects', '#connect', '#privacy', '#signin'])
    assert.notEqual(routeAccess(learningRoute(hash)), 'unknown', hash);
  for (const hash of ['#teach', '#lessons', '#lessons/blank-monitor', '#everyday', '#district-review']) assert.equal(routeAccess(learningRoute(hash)), 'unknown', hash + ' is a page address, not an app route');
  const redirects = (await read('_redirects')).split(/\r?\n/u).filter(line => line && !line.startsWith('#'));
  assert.equal(redirects.some(rule => /teach(?!er)|lessons|everyday|district/u.test(rule)), false, 'Landing pages need no redirect rule.');
  assert.deepEqual(JSON.parse(await read('_routes.json')).include, ['/api/requester', '/api/reach', '/api/telemetry', '/api/verify', '/terminal/*']);
});

test('student view hides the adult landing pages and keeps the pages a learner needs', () => {
  const home = 'https://www.colelearninglabs.com/?mode=student';
  for (const href of ['teach.html', '/teach', 'everyday-tech.html', '/district-review', '/lessons/blank-monitor', 'lessons/troubleshooting-pilot.html']) assert.equal(studentLinkAction(href, home), 'hide', href);
  for (const href of ['#lab/INC-101', '#play/inbox-defender?style=picture', '#explore/EX-SEC-1', '#arcade/packet-post', 'compliance.html', 'ai-use-notice.html']) assert.equal(studentLinkAction(href, home), 'keep', href);
});

test('the offline cache holds the app only: landing pages stay network pages and the cache starts after the first load', async () => {
  const worker = await read('sw.js'), app = await read('src/app.js');
  assert.doesNotMatch(worker, /lessons|teach|everyday|district/u);
  const content = new Map([['index.html', Buffer.from(await read('index.html'))], ...['manifest.webmanifest', 'assets/favicon.svg', 'assets/apple-touch-icon.png', 'assets/cole-learning-labs-logo.webp', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'src/app.js', ...PUBLIC_LANDING_PAGES].map(name => [name, Buffer.from('')]),
    ...[...(await read('index.html')).matchAll(/<link rel="stylesheet" href="([^"?]+)/gu)].map(match => [match[1], Buffer.from('')])]);
  const precache = offlinePrecacheList(content);
  assert.equal(precache.some(entry => PUBLIC_LANDING_PAGES.some(file => entry.startsWith('/' + file.slice(0, -5)))), false, 'Landing pages are never precached.');
  assert.ok(precache.includes('/'));
  assert.ok(app.includes("function startOfflineCache(){if(!OWNER_PREVIEW&&typeof navigator!=='undefined'&&'serviceWorker' in navigator&&location.pathname==='/')navigator.serviceWorker.register('/sw.js').catch(()=>{});}"));
  assert.ok(app.trimEnd().endsWith("if(typeof document!=='undefined'&&document.readyState==='complete')startOfflineCache();else if(typeof addEventListener==='function')addEventListener('load',startOfflineCache,{once:true});"), 'Registration waits for the load event.');
  assert.equal((app.match(/serviceWorker\.register\(/gu) || []).length, 1);
});
