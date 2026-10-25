import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {PUBLIC_FILES} from '../scripts/build.mjs';

test('every reachable runtime module stays local and excludes the retired graphics engines',async()=>{
  const seen=new Set(),pending=['src/app.js','src/classroom-portal.js','src/secure-reports.js'];
  let bytes=0;
  while(pending.length){
    const path=pending.pop();if(seen.has(path))continue;seen.add(path);
    assert.ok(PUBLIC_FILES.includes(path),`${path} must be an approved public module`);
    const text=await readFile(new URL('../'+path,import.meta.url),'utf8');bytes+=Buffer.byteLength(text);
    // Follow literal static AND lazy imports, so a hidden workbench cannot reintroduce an engine.
    for(const match of text.matchAll(/(?:^(?:import|export)\s[^;\n]*?\bfrom\s*|^import\s*(?=['"])|\bimport\s*\(\s*)(['"])([^'"]+)\1/gm)){
      assert.ok(match[2].startsWith('./'),`${path} imports only same-origin reviewed modules`);
      const next=new URL(match[2],new URL('../'+path,import.meta.url));next.search='';
      pending.push(decodeURIComponent(next.pathname.slice(new URL('../',import.meta.url).pathname.length)));
    }
  }
  assert.doesNotMatch([...seen].join('\n'),/(?:babylon|three\.(?:core|module)|assembly-scene|virtual-lab-scene)\.js/);
  for(const path of ['src/workbench-guidance.js','src/pc-activity.js','src/assembly-model.js','src/assembly-workbench.js','src/assembly-cables.js','src/foundation-model.js','src/foundation-scene.js','src/interview.js','src/report-downloads.js','src/report-crypto.js'])assert.ok(seen.has(path),`Keep the current ${path} behavior`);
  // Includes the requester/coding modules, native network builder, and 30 authored
  // grade/category lesson plans plus their local editor and beginner practice boards.
  // Keep a bounded source budget and continue rejecting external graphics engines.
  assert.ok(bytes<1_300_000,`Runtime module graph must remain lightweight (${bytes} bytes)`);
});

test('the published artifact cannot contain a retired engine, scene or graphics-vendor asset',async()=>{
  assert.doesNotMatch(PUBLIC_FILES.join('\n'),/babylon|three\.(?:module|core)|assembly-scene|virtual-lab-scene/i);
  for(const path of ['src/babylon.js','src/assembly-scene.js','src/virtual-lab-scene.js','assets/babylon-LICENSE.txt','assets/babylon-NOTICE.txt'])await assert.rejects(access(new URL('../'+path,import.meta.url)),{code:'ENOENT'});
});
