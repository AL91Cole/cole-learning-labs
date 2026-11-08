import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {PUBLIC_FILES,PUBLIC_SOURCE_FILES,MEMBER_FILES} from '../scripts/build.mjs';

test('every reviewed source runtime stays local and excludes the retired graphics engines',async()=>{
  const seen=new Set(),pending=['src/app.js','src/classroom-portal.js','src/secure-reports.js'];
  let bytes=0;
  while(pending.length){
    const path=pending.pop();if(seen.has(path))continue;seen.add(path);
    assert.ok(PUBLIC_SOURCE_FILES.includes(path),`${path} must be an approved source module`);
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
  // Delivery policy and safe catalog metadata add a small reviewed source cost.
  // Fifteen self-contained K–6 activities add about 34 KB of authored models.
  // The reviewed block workshop and isolated member PC layout add about 28 KB;
  // public compilation omits the member layout and remains below 1 MB.
  // Generic repair views, bounded investigation blocks and network port dragging
  // add about 31 KB. Public compilation retains its separate sub-1-MB check.
  // Keep the bounded source graph; public compilation has its own tighter cap.
  // The 25 arcade levels add about 40 KB without an engine. Preview and open-public compilations have independent size checks.
  // Twelve eight-lesson language paths add authored examples, not twelve runtimes.
  // Shared onboarding, contextual retries and cancellable route playback add
  // about 25 KB of authored source; the compiled delivery cap stays unchanged.
  // On-demand bot verification adds about 4 KB; compiled caps stay unchanged.
  // Local engagement timing and reviewed receipt metadata add about 16 KB;
  // server crypto stays outside this graph and compiled caps stay unchanged.
  // Route-group aggregators, the shared route parser, the on-page Display menu,
  // device-only read-aloud, and the data-only scenario, catalog, session and
  // record-registry modules add about 21 KB of source. Learning routes and their
  // engines now download on demand, so start-up delivery shrinks while the graph
  // grows slightly.
  // Classroom link modes (student mode and the shared-device session) add about
  // 13 KB of source with no storage, network or engine; compiled caps stay unchanged.
  // The single test action with its list of remaining steps, the report summary, the
  // sentence helper, the Start here section, clue feedback in Inbox Defender, and the
  // capstone reasons, pair roles and debrief add about 19 KB of source. Teacher, family
  // and district content lives in plain pages outside this graph; compiled caps
  // stay unchanged.
  assert.ok(bytes<1_750_000,`Runtime module graph must remain lightweight (${bytes} bytes)`);
});

test('member implementation modules remain reviewed source without becoming standalone public assets',()=>{
  for(const filename of ['src/assembly-builder.js','src/coding-workbench.js','src/coding-sandbox.js','src/coding-studio.js','src/network-studio.js','src/scenarios.js','src/expanded-labs.js','src/coding-lab.js','src/lesson-plans.js','src/capstone.js']){
    assert.ok(PUBLIC_SOURCE_FILES.includes(filename),`${filename}: retain source review`);
    assert.ok(MEMBER_FILES.includes(filename),`${filename}: retain protected member implementation`);
    assert.equal(PUBLIC_FILES.includes(filename),false,`${filename}: cannot be an unprotected public file`);
  }
});

test('the published artifact cannot contain a retired engine, scene or graphics-vendor asset',async()=>{
  assert.doesNotMatch(PUBLIC_FILES.join('\n'),/babylon|three\.(?:module|core)|assembly-scene|virtual-lab-scene/i);
  for(const path of ['src/babylon.js','src/assembly-scene.js','src/virtual-lab-scene.js','assets/babylon-LICENSE.txt','assets/babylon-NOTICE.txt'])await assert.rejects(access(new URL('../'+path,import.meta.url)),{code:'ENOENT'});
});
