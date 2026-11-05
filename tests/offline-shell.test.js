import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {PUBLIC_FILES,PUBLIC_SOURCE_FILES,MEMBER_FILES,PUBLIC_SHELL_FILES,offlinePrecacheList,offlineWorkerSource,buildSite} from '../scripts/build.mjs';
import {previewContentType} from '../scripts/serve.mjs';

const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');

test('the web app manifest is valid, local and backed by published icons',async()=>{
  const manifest=JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.name,'Cole Learning Labs');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');
  assert.match(manifest.theme_color,/^#[0-9a-f]{6}$/u);assert.match(manifest.background_color,/^#[0-9a-f]{6}$/u);
  assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192')&&manifest.icons.some(icon=>icon.sizes==='512x512')&&manifest.icons.some(icon=>icon.purpose==='maskable'));
  for(const icon of manifest.icons){
    assert.ok(icon.src.startsWith('/assets/'),icon.src);
    assert.ok(PUBLIC_FILES.includes(icon.src.slice(1)),icon.src+' must be a published public file');
  }
  const html=await read('index.html');
  assert.match(html,/<link rel="manifest" href="manifest\.webmanifest">/u);
  assert.match(html,/<link rel="apple-touch-icon" href="assets\/apple-touch-icon\.png">/u);
  assert.equal(previewContentType('manifest.webmanifest'),'application/manifest+json; charset=utf-8');
  for(const filename of PUBLIC_SHELL_FILES){
    assert.ok(PUBLIC_SOURCE_FILES.includes(filename)&&PUBLIC_FILES.includes(filename),filename);
    assert.equal(MEMBER_FILES.includes(filename),false,filename+' belongs to the public root site, not private member delivery');
  }
});

test('the offline worker caches only public site files and leaves API, downloads and protected pages alone',async()=>{
  const template=await read('sw.js');
  assert.match(template,/if\(url\.origin!==self\.location\.origin\|\|url\.pathname==='\/api'\|\|url\.pathname\.startsWith\('\/api\/'\)\)return;/u);
  assert.doesNotMatch(template,/skipWaiting/u,'A new version waits for open tabs to close so running pages keep their chunks.');
  assert.doesNotMatch(template,/localStorage|indexedDB|postMessage|fetch\(['"]https?:/u);
  const content=new Map([['index.html',Buffer.from('<!doctype html><link rel="stylesheet" href="src/styles.css?release=r1"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="assets/favicon.svg"><script type="module" src="src/app.js?release=r1-open"></script>')],
    ['src/styles.css',Buffer.from('')],['src/app.js',Buffer.from('')],['manifest.webmanifest',Buffer.from('{}')],['assets/favicon.svg',Buffer.from('')],['src/chunks/chunk-ABC123.js',Buffer.from('')],['src/chunks/lazy-arcade-DEF456.js',Buffer.from('')],
    ['assets/cole-learning-labs-logo.webp',Buffer.from('')],['assets/icon-192.png',Buffer.from('')],['assets/icon-512.png',Buffer.from('')],['assets/icon-maskable-512.png',Buffer.from('')],['assets/cole-learning-labs-pop-quizzes.pdf',Buffer.from('')]]);
  const list=offlinePrecacheList(content);
  assert.deepEqual(list,['/','/assets/cole-learning-labs-logo.webp','/assets/favicon.svg','/assets/icon-192.png','/assets/icon-512.png','/assets/icon-maskable-512.png','/manifest.webmanifest','/src/app.js?release=r1-open','/src/chunks/chunk-ABC123.js','/src/chunks/lazy-arcade-DEF456.js','/src/styles.css?release=r1']);
  assert.ok(!list.some(entry=>entry.endsWith('.pdf')));
  content.set('index.html',Buffer.from('<script src="https://cdn.invalid/x.js"></script>'));
  assert.throws(()=>offlinePrecacheList(content),/same-origin/u);
  content.set('index.html',Buffer.from('<script src="src/missing.js"></script>'));
  assert.throws(()=>offlinePrecacheList(content),/not a published file/u);
  const worker=offlineWorkerSource(template,list);
  assert.match(worker,/const CACHE_NAME="cll-static-[0-9a-f]{16}";/u);
  assert.ok(worker.includes('const PRECACHE='+JSON.stringify(list)+';'));
  assert.notEqual(offlineWorkerSource(template,[...list,'/extra']).match(/cll-static-([0-9a-f]+)/u)[1],worker.match(/cll-static-([0-9a-f]+)/u)[1],'A different file list is a different cache version.');
  assert.throws(()=>offlineWorkerSource('const x=1;',list),/placeholders/u);
});

// Test files run at the same time, so each build gets its own output folder
// instead of the checkout's shared dist.
async function buildSeparately(t,options){
  const outputRoot=await mkdtemp(path.join(process.env.CLL_TEST_TMPDIR||os.tmpdir(),'cll-offline-shell-test-'));
  t.after(()=>rm(outputRoot,{recursive:true,force:true,maxRetries:5}));
  return buildSite({...options,outputRoot});
}

test('the public build ships a filled-in worker whose list matches the published files',async t=>{
  const built=await buildSeparately(t,{publicLabAccess:'open'});
  const worker=await readFile(path.join(built.directory,'sw.js'),'utf8');
  const list=JSON.parse(worker.match(/const PRECACHE=(\[[^\]]*\]);/u)[1]);
  assert.ok(list.includes('/')&&list.some(entry=>/^\/src\/app\.js\?release=.+-open$/u.test(entry))&&list.some(entry=>/^\/src\/styles\.css\?release=/u.test(entry)));
  for(const chunk of built.generated)assert.ok(list.includes('/'+chunk),chunk);
  for(const entry of list){
    const filename=entry==='/'?'index.html':entry.slice(1).split('?')[0];
    assert.ok(built.files.includes(filename)||built.generated.includes(filename),entry+' must be a published file');
  }
  assert.doesNotMatch(worker,/__CACHE_VERSION__|__PRECACHE_MANIFEST__/u);
  const headers=await read('_headers');
  assert.match(headers,/\n\/sw\.js\n  Cache-Control: public, max-age=0, must-revalidate\n/u);
  assert.match(headers,/\n\/manifest\.webmanifest\n  Content-Type: application\/manifest\+json; charset=utf-8\n/u);
  assert.match(headers,/\n\/src\/chunks\/\*\n  Cache-Control: public, max-age=31536000, immutable\n/u);
  const app=await read('src/app.js');
  assert.match(app,/if\(!OWNER_PREVIEW&&typeof navigator!=='undefined'&&'serviceWorker' in navigator&&location\.pathname==='\/'\)navigator\.serviceWorker\.register\('\/sw\.js'\)/u,'Registration stays out of owner preview and private delivery paths.');
});
