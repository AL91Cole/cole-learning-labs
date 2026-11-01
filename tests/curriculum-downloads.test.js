import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PUBLIC_FILES,PUBLIC_SOURCE_FILES,MEMBER_FILES} from '../scripts/build.mjs';
import {SCENARIOS} from '../src/scenarios.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url));

// Changing either reviewed document requires another content and visual review.
const reviewed=new Map([
  ['assets/cole-learning-labs-student-workbook.pdf','4122cd0fda1a77dd345215dd8a3aa1011928f6c03c411668f182d5c68731fc93'],
  ['assets/cole-learning-labs-pop-quizzes.pdf','0384b582622b93c5f0571cc8a7fe4babd0c48362ef16bef55e7cb322e451df19']
]);
test('retained curriculum matches the exact reviewed companion files and is excluded from public publishing',()=>{
  assert.deepEqual(PUBLIC_SOURCE_FILES.filter(file=>/\.(pdf|docx|pptx|zip)$/i.test(file)).sort(),[...reviewed.keys()].sort());
  assert.deepEqual(PUBLIC_FILES.filter(file=>/\.(pdf|docx|pptx|zip)$/i.test(file)),[]);
  for(const [file,digest] of reviewed){
    assert.ok(MEMBER_FILES.includes(file),`${file}: curriculum belongs to protected delivery`);
    const bytes=read(file);
    assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),digest,`${file}: document review must be renewed`);
    assert.ok(bytes.length<200000,'printable companions should remain small');
  }
});
test('member curriculum cannot inherit a public shared download cache policy',()=>{
  const headers=read('_headers').toString().replaceAll('\r\n','\n');
  for(const file of reviewed.keys()){
    const block=headers.split(`/${file}\n`)[1]?.split(/\n\s*\n/)[0];
    // A removed public path may keep a defensive no-store rule, but must never
    // advertise a shared cache for protected curriculum or a fallback response.
    if(block){assert.match(block,/Cache-Control: private, no-store/);assert.doesNotMatch(block,/Cache-Control: public/);}
    assert.equal(PUBLIC_FILES.includes(file),false);
  }
  assert.match(headers,/\/teacher\/\*\r?\n  Cache-Control: private, no-store/);
  assert.deepEqual(JSON.parse(read('_routes.json')),{version:1,include:['/api/requester'],exclude:[]});
});
test('README repository pathway totals are derived from the complete source catalogue',()=>{
  const md=read('README.md').toString();
  assert.ok(md.includes(`${FOUNDATION_LABS.length} beginner courses`));
  assert.ok(md.includes(`${SCENARIOS.length} troubleshooting investigations`));
  const labels={hardware:'Hardware & ServiceDesk',network:'Network & Operating Systems',ai:'AI Literacy & Audit',security:'Ethical Hacking & Penetration Testing',coding:'Coding Sandbox'};
  for(const [track,label] of Object.entries(labels)){
    const count=SCENARIOS.filter(s=>s.track===track).length;
    assert.ok(count>0);
    assert.ok(md.includes(`| ${label} | ${count} |`),`${label}: table count differs from the current catalog`);
  }
});
