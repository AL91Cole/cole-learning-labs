import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PUBLIC_FILES,publicFilesFor,PUBLIC_SOURCE_FILES,MEMBER_FILES,COURSE_DOWNLOAD_FILES} from '../scripts/build.mjs';
import {SCENARIOS} from '../src/scenarios.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url));

// Changing either reviewed document requires another content and visual review.
const reviewed=new Map([
  ['assets/cole-learning-labs-student-workbook.pdf','4122cd0fda1a77dd345215dd8a3aa1011928f6c03c411668f182d5c68731fc93'],
  ['assets/cole-learning-labs-pop-quizzes.pdf','0384b582622b93c5f0571cc8a7fe4babd0c48362ef16bef55e7cb322e451df19']
]);
const courseReviewed=new Map([["assets/courses/foundations/student-workbook.pdf", "a9826503362fc08c25f3196ebb43379cc45ac0079043fed57ed140d35507ad49"], ["assets/courses/foundations/student-workbook.docx", "e0b68f627324efc380d03b2bf8aeb7a20ce19a1024ce86eb74047c16aa09e150"], ["assets/courses/foundations/student-project.pdf", "322d1a5946eb2214ef6a0c47c16ab35abe955a32009dcec101f88b401b4f9a61"], ["assets/courses/foundations/student-project.docx", "f1eafe4883f60c01e0f845e7ceb4dbbf362829175aaa766447aa9c6023e970eb"]]);
test('retained curriculum matches the exact reviewed companion files and is excluded from public publishing',()=>{
  assert.deepEqual(PUBLIC_SOURCE_FILES.filter(file=>/\.(pdf|docx|pptx|zip)$/i.test(file)).sort(),[...reviewed.keys(),...courseReviewed.keys()].sort());
  assert.deepEqual(PUBLIC_FILES.filter(file=>/\.(pdf|docx|pptx|zip)$/i.test(file)).sort(),[...reviewed.keys(),...courseReviewed.keys()].sort());
  assert.deepEqual(publicFilesFor('preview').filter(file=>/\.(pdf|docx|pptx|zip)$/i.test(file)).sort(),[...courseReviewed.keys()].sort());
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
    assert.equal(publicFilesFor('preview').includes(file),false);
  }
  assert.match(headers,/\/teacher\/\*\r?\n  Cache-Control: private, no-store/);
  assert.deepEqual(JSON.parse(read('_routes.json')),{version:1,include:['/api/requester','/api/reach','/api/telemetry','/api/verify','/terminal/*'],exclude:[]});
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

test('new foundations downloads are reviewed public student editions with exact content and isolated delivery',()=>{
  assert.deepEqual([...COURSE_DOWNLOAD_FILES].sort(),[...courseReviewed.keys()].sort());
  for(const [file,digest] of courseReviewed){
    assert.equal(createHash('sha256').update(read(file)).digest('hex'),digest,file);
    assert.ok(PUBLIC_FILES.includes(file));
    assert.ok(publicFilesFor('preview').includes(file));
    assert.equal(MEMBER_FILES.includes(file),false);
    const block=read('_headers').toString().split('/'+file+'\n')[1]?.split(/\n\s*\n/u)[0];
    assert.ok(block,file);
    assert.match(block,/Content-Disposition: attachment/u);
    assert.match(block,/Cache-Control: public, max-age=0, must-revalidate, no-transform/u);
    assert.match(block,file.endsWith('.pdf')?/Content-Type: application\/pdf/u:/Content-Type: application\/vnd.openxmlformats-officedocument.wordprocessingml.document/u);
  }
});
