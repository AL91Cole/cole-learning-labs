import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PUBLIC_FILES} from '../scripts/build.mjs';
import {SCENARIOS} from '../src/scenarios.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url));

// Changing either reviewed document requires another content and visual review.
const reviewed=new Map([
  ['assets/cole-learning-labs-student-workbook.pdf','4122cd0fda1a77dd345215dd8a3aa1011928f6c03c411668f182d5c68731fc93'],
  ['assets/cole-learning-labs-pop-quizzes.pdf','0384b582622b93c5f0571cc8a7fe4babd0c48362ef16bef55e7cb322e451df19']
]);
test('public curriculum matches the exact visually reviewed, solution-free companion files',()=>{
  assert.deepEqual(PUBLIC_FILES.filter(file=>/\.(pdf|docx|pptx|zip)$/i.test(file)).sort(),[...reviewed.keys()].sort());
  for(const [file,digest] of reviewed){
    const bytes=read(file);
    assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),digest,`${file}: document review must be renewed`);
    assert.ok(bytes.length<200000,'printable companions should remain small');
  }
});
test('only the approved public PDFs receive a bounded shared download cache policy',()=>{
  const headers=read('_headers').toString();
  for(const file of reviewed.keys()){
    const block=headers.split(`/${file}\n`)[1]?.split(/\n\s*\n/)[0];
    assert.ok(block,`${file}: explicit download headers required`);
    assert.match(block,/Content-Type: application\/pdf/);
    assert.match(block,/Content-Disposition: attachment; filename="[a-z-]+\.pdf"/);
    assert.match(block,/Cache-Control: public, max-age=3600, must-revalidate, no-transform/);
  }
  assert.match(headers,/\/teacher\/\*\r?\n  Cache-Control: private, no-store/);
  assert.deepEqual(JSON.parse(read('_routes.json')),{version:1,include:['/api/requester'],exclude:[]});
});
test('README pathway totals are derived from the current investigation catalog',()=>{
  const md=read('README.md').toString();
  assert.ok(md.includes(`with ${FOUNDATION_LABS.length} beginner labs and ${SCENARIOS.length} troubleshooting investigations across five pathways`));
  const labels={hardware:'Hardware & ServiceDesk',network:'Network & Operating Systems',ai:'AI Literacy & Audit',security:'Ethical Hacking & Penetration Testing',coding:'Coding Sandbox'};
  for(const [track,label] of Object.entries(labels)){
    const count=SCENARIOS.filter(s=>s.track===track).length;
    assert.ok(count>0);
    assert.ok(md.includes(`| ${label} | ${count} |`),`${label}: table count differs from the current catalog`);
  }
});
