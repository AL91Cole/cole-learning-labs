import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {once} from 'node:events';
import os from 'node:os';
import path from 'node:path';
import {COURSE_DATA_FILE,COURSE_PAGE_FILES,COURSE_DOWNLOAD_FILES,parseFoundationsData,renderFoundationsCourse,coursePageRoute,foundationsLabURL,foundationsShareURL} from '../scripts/foundations-course.mjs';
import {PUBLIC_FILES,PUBLIC_SOURCE_FILES,MEMBER_FILES,publicFilesFor} from '../scripts/build.mjs';
import {createPreviewServer} from '../scripts/serve.mjs';
import {learningRoute} from '../src/learning-routes.js';
import {CATALOG} from '../src/lab-catalog.js';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const source=read(COURSE_DATA_FILE),data=parseFoundationsData(source),pages=renderFoundationsCourse(data);
const origin='https://www.colelearninglabs.com';

test('the complete public course has 45 distinct teachable days and real source lab routes',()=>{
  assert.equal(data.lessons.length,45);
  for(const [i,lesson]of data.lessons.entries()){
    assert.equal(lesson.day,i+1);
    assert.equal(lesson.sequence.reduce((n,s)=>n+s.minutes,0),40);
    assert.ok(lesson.objective.length>25);
    for(const field of ['materials','prep','vocabulary','discussion','support','challenge'])assert.ok(lesson[field].length,`${lesson.day}: ${field}`);
    assert.ok(lesson.lab.fallback.length>80);
    assert.ok(lesson.lab.steps.length>=3);
    assert.ok(lesson.handout.context.length>40);
    assert.ok(lesson.handout.questions.length>=3);
    assert.equal(lesson.assessment.criteria.length,2);
    assert.ok(lesson.exitTicket.length>20);
    assert.ok(lesson.standards.length);
    const route=learningRoute(lesson.lab.route);
    assert.notEqual(route.page,'unknown');
    if(['lab','practice'].includes(route.page))assert.ok(CATALOG.some(x=>x.id===route.id));
    const link=new URL(foundationsLabURL(lesson.lab.route));
    assert.equal(link.search,'?mode=student&cart=true');
    assert.equal(link.hash,lesson.lab.route);
  }
  assert.equal(data.course.rubric.length,6);
  assert.ok(data.course.rubric.every(row=>row.levels.length===4));
});

test('public authoring is literal data without private teacher fields or executable expressions',()=>{
  const walk=value=>{
    if(!value||typeof value!=='object')return;
    for(const [key,item]of Object.entries(value)){
      assert.doesNotMatch(key,/^(?:keys|teacherKeys|handoutAnswers|exitAnswer|lookFors|misconceptions)$/u);
      walk(item);
    }
  };
  walk(data);
  assert.throws(()=>parseFoundationsData(source+'\nexport const keys=[];'),/only COURSE and LESSONS/);
  assert.throws(()=>parseFoundationsData('export const COURSE=(()=>({}))(); export const LESSONS=[];'),/JSON data/);
  assert.throws(()=>parseFoundationsData('export const COURSE={}; export const COURSE={};'));
  assert.equal(PUBLIC_FILES.includes(COURSE_DATA_FILE),false);
  assert.equal(MEMBER_FILES.includes(COURSE_DATA_FILE),false);
  assert.ok(PUBLIC_SOURCE_FILES.includes(COURSE_DATA_FILE));
});

test('generated lessons are inert documents with intact code, internal anchors and no private endpoints',()=>{
  assert.deepEqual([...pages.keys()],COURSE_PAGE_FILES);
  const ids=new Map([...pages].map(([file,html])=>[coursePageRoute(file),new Set([...html.matchAll(/\bid="([^"]+)"/gu)].map(m=>m[1]))]));
  const externalHosts=new Set(['classroom.google.com','www.nysed.gov','developers.google.com','github.com']);
  for(const [file,html]of pages){
    const route=coursePageRoute(file);
    assert.equal([...html.matchAll(/<h1[ >]/gu)].length,1,file);
    assert.match(html,new RegExp('rel="canonical" href="'+origin+route+'"'));
    assert.match(html,/<main id="main"/u);
    assert.doesNotMatch(html,/<(?:script|iframe|form|input|textarea|embed|object)\b|\son[a-z]+\s*=|javascript:/iu);
    assert.doesNotMatch(html,/handoutAnswers|exitAnswer|teacher-key|drive\.google\.com|\/workspace\/(?:work|cole-learning-labs)|student-project\.html/u);
    const allIds=[...html.matchAll(/\bid="([^"]+)"/gu)].map(m=>m[1]);
    assert.equal(allIds.length,new Set(allIds).size,file);
    for(const [,written]of html.matchAll(/<a\b[^>]*href="([^"]+)"/gu)){
      const url=new URL(written.replaceAll('&amp;','&'),origin+route);
      if(url.origin!==origin){assert.ok(externalHosts.has(url.hostname),url.href);continue;}
      if(ids.has(url.pathname)&&url.hash)assert.ok(ids.get(url.pathname).has(url.hash.slice(1)),url.href);
      else if(url.pathname.startsWith('/assets/'))assert.ok(PUBLIC_FILES.includes(url.pathname.slice(1)),url.href);
      else assert.ok(ids.has(url.pathname)||['/','/courses','/teach','/district-review','/school-it'].includes(url.pathname),url.href);
    }
  }
  assert.match(pages.get('courses/foundations/day-38.html'),/\n {4}print\(&quot;Warm&quot;\)/u);
  assert.match(read('src/foundations-course.css'),/white-space:pre-wrap/u);
  assert.match(pages.get('courses/foundations/project.html'),/six|Six/u);
  const catalog=read('courses.html');
  assert.match(catalog,/More courses will be added here/u);
  assert.equal([...catalog.matchAll(/class="lesson-card"/gu)].length,1);
});

test('Classroom sharing contains only the generic public handout URL',()=>{
  for(let day=1;day<=45;day++){
    const url=new URL(foundationsShareURL(day));
    assert.equal(url.origin,'https://classroom.google.com');
    assert.equal(url.pathname,'/share');
    assert.deepEqual([...url.searchParams.keys()],['url']);
    assert.equal(url.searchParams.get('url'),`${origin}/courses/foundations/day-${String(day).padStart(2,'0')}#student-handout`);
  }
});

test('course pages and reviewed downloads are public in both modes while raw data and teacher files remain unserved',async t=>{
  for(const mode of ['open','preview']){
    const root=await mkdtemp(path.join(os.tmpdir(),'cll-course-preview-'));
    t.after(()=>rm(root,{recursive:true,force:true}));
    for(const filename of [...COURSE_PAGE_FILES,...COURSE_DOWNLOAD_FILES,'404.html',COURSE_DATA_FILE,'courses/foundations/teacher-guide.html']){
      const target=path.join(root,filename);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,pages.get(filename)||'FIXTURE:'+filename);
    }
    const server=createPreviewServer({sourceRoot:root,publicLabAccess:mode});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base='http://127.0.0.1:'+server.address().port;
    for(const file of COURSE_PAGE_FILES){
      assert.ok(publicFilesFor(mode).includes(file));
      assert.equal(MEMBER_FILES.includes(file),false);
      const response=await fetch(base+coursePageRoute(file));
      assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/html/u);
    }
    for(const file of COURSE_DOWNLOAD_FILES){
      const response=await fetch(base+'/'+file);
      assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/^attachment;/u);
    }
    for(const file of [COURSE_DATA_FILE,'courses/foundations/teacher-guide.html','courses/foundations/day-46','courses/foundations/keys.json'])assert.equal((await fetch(base+'/'+file)).status,404,file);
  }
});
