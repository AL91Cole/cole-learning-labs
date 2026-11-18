import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PUBLIC_FILES,publicFilesFor,PUBLIC_SOURCE_FILES,MEMBER_FILES,COURSE_DOWNLOAD_FILES} from '../scripts/build.mjs';
import {DOWNLOAD_MANIFEST,courseDownloadSourceDigest} from '../scripts/generate-course-downloads.mjs';
import {SCENARIOS} from '../src/scenarios.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url));

// Changing either reviewed document requires another content and visual review.
const reviewed=new Map([
  ['assets/cole-learning-labs-student-workbook.pdf','4122cd0fda1a77dd345215dd8a3aa1011928f6c03c411668f182d5c68731fc93'],
  ['assets/cole-learning-labs-pop-quizzes.pdf','0384b582622b93c5f0571cc8a7fe4babd0c48362ef16bef55e7cb322e451df19']
]);
// The course PDFs are printed by scripts/generate-course-downloads.mjs, which records each file's hash
// and a digest of the pages they were printed from. Regenerate and review them when that digest moves.
const courseManifest=JSON.parse(read(DOWNLOAD_MANIFEST).toString());
const courseReviewed=new Map(Object.entries(courseManifest.files));
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

test('course downloads are the reviewed PDFs printed from the current pages, with isolated delivery',()=>{
  assert.deepEqual([...COURSE_DOWNLOAD_FILES].sort(),[...courseReviewed.keys()].sort());
  assert.equal(COURSE_DOWNLOAD_FILES.length,21,'four packs and one PDF for each of the seventeen lessons');
  assert.equal(courseManifest.source,courseDownloadSourceDigest(),'A lesson, printable lab or print style changed. Run node scripts/generate-course-downloads.mjs, review the PDFs and commit them.');
  const rule=read('_headers').toString().split('/assets/courses/cybersecurity-responsible-ai/*\n')[1]?.split(/\n\s*\n/u)[0];
  assert.ok(rule,'The course downloads need their header rule');
  assert.match(rule,/Content-Disposition: attachment/u);
  assert.match(rule,/Content-Type: application\/pdf/u);
  assert.match(rule,/Cache-Control: public, max-age=0, must-revalidate, no-transform/u);
  assert.equal([...read('_headers').toString().matchAll(/^\/assets\/courses\//gmu)].length,1,'No header rule may outlive a removed course download');
  let total=0;
  for(const [file,digest] of courseReviewed){
    const bytes=read(file);total+=bytes.length;
    assert.match(file,/^assets\/courses\/cybersecurity-responsible-ai\/[a-z0-9-]+\.pdf$/u);
    assert.equal(bytes.subarray(0,5).toString(),'%PDF-',file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),digest,file);
    assert.ok(PUBLIC_FILES.includes(file));
    assert.ok(publicFilesFor('preview').includes(file));
    assert.equal(MEMBER_FILES.includes(file),false);
    assert.doesNotMatch(bytes.toString('latin1'),/127\.0\.0\.1|localhost|\/home\/|file:\/\//u,file+' carries no local address or path');
  }
  assert.ok(total<8_000_000,'The course downloads stay small enough to keep in the repository');
  assert.equal(PUBLIC_SOURCE_FILES.includes(DOWNLOAD_MANIFEST),false,'The manifest is an authoring record, not a published file');
});
