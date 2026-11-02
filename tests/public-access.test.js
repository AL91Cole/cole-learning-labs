import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {readFile,readdir} from 'node:fs/promises';
import {buildSite,publicFilesFor} from '../scripts/build.mjs';
import {createPreviewServer} from '../scripts/serve.mjs';
import {CATALOG} from '../src/lab-catalog.js';
import {FREE_LAB_IDS,ELEMENTARY_LAB_IDS} from '../src/access-policy.js';
import {createWorkStorage,WORK_PREFIX,PUBLIC_WORK_PREFIX} from '../src/local-work.js';
import {SCENARIOS} from '../src/scenarios.js';
import {handleRequesterRequest} from '../functions/api/requester.js';

const request=(server,url)=>new Promise((resolve,reject)=>{
  const req=http.get({host:'127.0.0.1',port:server.address().port,path:url,agent:false},res=>{
    const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));
  });req.on('error',reject);
});

test('the actual public artifact has no raw source or paid resource endpoint, including direct legacy URLs',async t=>{
  const built=await buildSite({publicLabAccess:'preview'}),server=createPreviewServer({sourceRoot:built.directory,publicLabAccess:'preview'});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
  assert.deepEqual((await readdir(new URL('../dist/src/',import.meta.url))).filter(file=>file.endsWith('.js')).sort(),['app.js','secure-reports.js']);
  assert.equal(publicFilesFor('preview').some(file=>file.startsWith('memberships/')||file.endsWith('.pdf')),false);
  for(const path of ['/src/scenarios.js','/src/expanded-labs.js','/src/coding-lab.js','/src/coding-workbench.js','/src/sign-in.js','/src/owner-preview.js','/src/owner-preview.js?ownerPreview=true','/src/coding-sandbox.js','/src/lesson-plans.js','/src/elementary-labs.js','/src/block-workshop.js','/src/assembly-builder.js','/src/inbox-defender.js',
    '/memberships/worker.js','/memberships/dist/worker.mjs','/learn/src/app.js','/assets/cole-learning-labs-pop-quizzes.pdf']){
    const result=await request(server,path);assert.equal(result.status,404,path);
    assert.equal(result.body.includes('MY CREATIVE STUDIO'),false);
  }
  for(const path of ['/student-workbook.html','/practice-quizzes','/classroom','/teacher/']){
    const result=await request(server,path);assert.equal(result.status,302,path);assert.equal(result.headers.location,'/#membership');
  }
  const app=await request(server,'/src/app.js');assert.equal(app.status,200);
  assert.equal(app.body.includes('The fictional prize desk mixes up scores of 50 and 100.'),false);
  assert.equal(app.body.includes('MY CREATIVE STUDIO'),false);
  assert.equal(app.body.includes('Memberships are being prepared.'),true);
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');assert.ok(html.includes('src/app.js'));
  assert.equal((html.match(/href="#signin">Approved account access<\/a>/gu)||[]).length,1,'The footer retains the shared internal entry.');
  assert.doesNotMatch(html.match(/<nav id="site-nav"[\s\S]*?<\/nav>/u)?.[0],/#signin|#membership/u);
  assert.equal(html.includes('Owner sign in'),false);assert.equal(html.includes('codex-private-owner-preview'),false,'The ordinary navigation does not jump straight to a separate owner page.');
  assert.ok(app.body.includes('Subscriber sign-in is being prepared. Existing authorized access remains available.'));
  assert.doesNotMatch(await readFile(new URL('../dist/sitemap.xml',import.meta.url),'utf8'),/\/(?:student-workbook|practice-quizzes)<\/loc>/u,'Restricted previews must not advertise unavailable companions.');
});

test('open-public delivery includes every reviewed lab without raw modules, owner capabilities or collection pages',async t=>{
  const built=await buildSite({publicLabAccess:'open'}),server=createPreviewServer({sourceRoot:built.directory,publicLabAccess:'open'});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
  const app=await request(server,'/src/app.js');assert.equal(app.status,200);
  assert.ok(app.body.includes('All labs are open without an account.'));
  assert.ok(app.body.includes('MY CREATIVE STUDIO'));assert.ok(app.body.includes('The fictional prize desk mixes up scores of 50 and 100.'));
  assert.ok(app.body.includes('Game on. Build a fix as you play.'));
  assert.doesNotMatch(app.body,/Owner preview navigation\./);
  assert.ok(Buffer.byteLength(app.body)<1_300_000,'The full open application keeps a separate reviewed size budget.');
  for(const path of ['/src/arcade.js','/src/arcade-levels.js','/src/arcade-model.js','/src/scenarios.js','/src/owner-preview.js','/memberships/worker.js','/learn/src/app.js'])assert.equal((await request(server,path)).status,404,path);
  for(const path of ['/classroom','/teacher/'])assert.equal((await request(server,path)).status,302,path);
  for(const path of ['/student-workbook','/practice-quizzes','/secure-reports','/ai-use-notice','/assets/cole-learning-labs-pop-quizzes.pdf'])assert.equal((await request(server,path)).status,200,path);
  const unavailable=await request(server,'/api/classroom');assert.equal(unavailable.status,503);
  const redirects=await readFile(new URL('../dist/_redirects',import.meta.url),'utf8');
  assert.doesNotMatch(redirects,/^\/(?:student-workbook|practice-quizzes)/m);assert.match(redirects,/\/teacher\/ \/#membership/);
});

test('the public cloud reply gateway rejects every member case and elementary activity before touching the private service',async()=>{
  const env={REQUESTER_ENABLED:'true',REQUESTER_BILLING_REVIEWED:'true',get REQUESTER_SERVICE(){assert.fail('Member case reached public AI binding.');}};
  for(const lab of [...CATALOG.filter(row=>row.access==='member').map(row=>({...row,expectedStatus:403})),...ELEMENTARY_LAB_IDS.map(id=>({id,title:'Elementary activity',expectedStatus:400}))]){
    const request=new Request('https://www.colelearninglabs.com/api/requester',{method:'POST',headers:{Origin:'https://www.colelearninglabs.com',
      'Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},body:JSON.stringify({scenarioId:lab.id,topic:'breakfast'})});
    const result=await handleRequesterRequest({request,env},{privacyApproved:true});assert.equal(result.status,lab.expectedStatus,lab.id);
    assert.equal((await result.text()).includes(lab.title),false);
  }
});

test('saving the reduced free catalog never reads, normalizes or overwrites previously saved full-catalog drafts',()=>{
  const legacy=JSON.stringify({version:2,labs:{'CODE-503':{notes:'Previously saved fictional private draft',state:{code:'legacy work'}}}});
  const data=new Map([[WORK_PREFIX,legacy],['unrelated-setting','keep']]),reads=[];
  const storage={get length(){return data.size;},key:index=>[...data.keys()][index]??null,
    getItem(key){reads.push(key);return data.get(key)??null;},setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const free=SCENARIOS.filter(lab=>FREE_LAB_IDS.includes(lab.id));
  const manager=createWorkStorage({storage,key:PUBLIC_WORK_PREFIX,scenarios:free});
  assert.equal(manager.hasSaved(),false);assert.deepEqual(reads,[PUBLIC_WORK_PREFIX]);
  assert.equal(manager.enable({version:2,labs:{'INC-101':{notes:'New fictional starter work',state:{}}}}),true);
  assert.equal(data.get(WORK_PREFIX),legacy);assert.ok(data.get(PUBLIC_WORK_PREFIX).includes('New fictional starter work'));
  assert.equal(manager.clearAll(),true);assert.equal(data.has(PUBLIC_WORK_PREFIX),false);assert.equal(data.has(WORK_PREFIX),false);
  assert.equal(data.get('unrelated-setting'),'keep');
});
