import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const start=source.indexOf('function curriculumDownloads('),end=source.indexOf('\nfunction educators(',start);
assert.ok(start>=0&&end>start);
const context=vm.createContext({});
vm.runInContext(source.slice(start,end)+'\nglobalThis.curriculumLinks=curriculumDownloads;',context);

test('student companions offer working web alternatives before the optional original PDFs',async()=>{
  const html=context.curriculumLinks();
  for(const [web,pdf] of [['student-workbook.html','assets/cole-learning-labs-student-workbook.pdf'],['practice-quizzes.html','assets/cole-learning-labs-pop-quizzes.pdf']]){
    assert.match(html,new RegExp('href="'+web.replaceAll('.','\\.')+'"'));
    assert.match(html,new RegExp('href="'+pdf.replaceAll('.','\\.')+'" download'));
    assert.ok(html.indexOf('href="'+web+'"')<html.indexOf('href="'+pdf+'"'));
    const target=await readFile(new URL('../'+web,import.meta.url),'utf8');
    assert.match(target,/<html lang="en">/u);assert.match(target,/<main\b/u);
    assert.match(target,/<(?:textarea|input)\b/u);
  }
  assert.match(html,/not automatically saved, uploaded or graded/u);
  assert.match(html,/check the print preview/u);
  assert.match(html,/not a tagged PDF/u);
});

test('both the student guide and educator page include the same companion choices',()=>{
  const educators=source.slice(end,source.indexOf('\nfunction guide(',end));
  const guide=source.slice(source.indexOf('\nfunction guide(',end),source.indexOf('\nfunction ',source.indexOf('\nfunction guide(',end)+2));
  assert.match(educators,/curriculumDownloads\(\)/u);
  assert.match(guide,/curriculumDownloads\(\)/u);
});
