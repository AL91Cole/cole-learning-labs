import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_LAB_ACCESS,labsAreOpen} from '../scripts/public-release.mjs';
import {publicFilesFor} from '../scripts/build.mjs';
import {MEMBER_CONTENT,PUBLIC_LABS_OPEN} from '../src/access-policy.js';
test('one reviewed release setting opens learning content and preview mode restores resource exclusion',()=>{
  assert.equal(PUBLIC_LAB_ACCESS,'open');assert.equal(labsAreOpen(),true);assert.equal(labsAreOpen('preview'),false);
  assert.equal(MEMBER_CONTENT,false);assert.equal(PUBLIC_LABS_OPEN,false,'Source cannot grant itself a public build context');
  const open=publicFilesFor('open'),preview=publicFilesFor('preview');
  for(const file of ['student-workbook.html','practice-quizzes.html','assets/cole-learning-labs-student-workbook.pdf','assets/cole-learning-labs-pop-quizzes.pdf']){assert.ok(open.includes(file));assert.equal(preview.includes(file),false);}
  for(const files of [open,preview])for(const file of ['classroom.html','teacher/index.html','memberships/worker.js','src/arcade-levels.js','src/scenarios.js'])assert.equal(files.includes(file),false,file);
  for(const bad of ['all','true','OPEN',true,false,{},null])assert.throws(()=>labsAreOpen(bad),/must be open or preview/);
});
