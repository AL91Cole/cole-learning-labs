import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
import {SCENARIOS} from '../src/scenarios.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';
import {IMPROVEMENT_ACTIVITIES,validateImprovementSummary} from '../src/improvement-schema.js';
import {handleImprovementRequest,onRequest,IMPROVEMENT_RELEASE} from '../functions/api/improvements.js';
import {IMPROVEMENT_ADMISSION_SQL,IMPROVEMENT_CLEANUP_SQL,storeImprovementSummary,cleanupImprovementCounts} from '../improvements/storage.js';
import retentionWorker,{runImprovementRetention} from '../improvements/retention-worker.js';

const SCHEMA=await readFile(new URL('../improvements/0001_improvements.sql',import.meta.url),'utf8');
const ORIGIN='https://www.colelearninglabs.com';
const SAMPLE=Object.freeze({version:1,activity:'lab/INC-101',outcome:'finished',attempts:'two_or_three',issue:'controls'});
const plain=rows=>rows.map(row=>({...row}));

function fixture(t){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(SCHEMA);t?.after(()=>sqlite.close());
  const calls=[];
  const binding={prepare(sql){calls.push(sql);let values=[];const statement={bind(...next){values=next;return statement;},async all(){return {success:true,results:sqlite.prepare(sql).all(...values)};},async run(){const result=sqlite.prepare(sql).run(...values);return {success:true,meta:{changes:Number(result.changes)}};}};return statement;}};
  return {sqlite,binding,calls,rows:()=>plain(sqlite.prepare('SELECT * FROM improvement_counts ORDER BY scope,period,metric,bucket').all())};
}

function request({body=SAMPLE,method='POST',path='/api/improvements',origin=ORIGIN,headers={},env,stream}={}){
  const h=new Headers({'Content-Type':'application/json','Origin':origin,'Sec-Fetch-Site':'same-origin',...headers});
  const req=new Request(origin+path,{method,headers:h,...(!['GET','HEAD'].includes(method)?{body:stream??(typeof body==='string'?body:JSON.stringify(body)),...(stream?{duplex:'half'}:{})}:{})});
  return {request:req,env:env??{IMPROVEMENTS_ENABLED:'true'}};
}
async function send(h,options={}){
  const context=request({env:{IMPROVEMENTS_ENABLED:'true',LAB_IMPROVEMENTS:h.binding},...options});
  const response=await handleImprovementRequest(context,{privacyApproved:true});
  return {response,status:response.status,data:await response.json()};
}

test('both default handlers are closed before context, environment, body or database access',async()=>{
  const poison=new Proxy({}, {get(){throw Error('PRIVATE_CONTEXT_MUST_NOT_BE_READ');}});
  for(const call of [()=>onRequest(poison),()=>handleImprovementRequest(poison),()=>handleImprovementRequest(poison,{privacyApproved:'true'})]){
    const response=await call();assert.equal(response.status,503);assert.deepEqual(await response.json(),{accepted:false,error:'improvement_privacy_review_required'});
  }
  assert.equal(await runImprovementRetention(poison),false);
  await retentionWorker.scheduled(poison,poison);
  assert.equal(retentionWorker.fetch().status,404);
});

test('schema consists only of the fixed authored route keys and exact data fields',()=>{
  const expected=[...SCENARIOS.map(s=>'lab/'+s.id),...FOUNDATION_LABS.map(s=>'learn/'+s.id),...SCENARIOS.filter(s=>['network','ai','security'].includes(s.track)).map(s=>'practice/'+s.id),'studio/network','studio/coding','sandbox','capstone'];
  assert.deepEqual(IMPROVEMENT_ACTIVITIES.map(s=>s.id),expected);assert.equal(new Set(expected).size,expected.length);
  assert.equal(Object.isFrozen(IMPROVEMENT_ACTIVITIES),true);assert.ok(IMPROVEMENT_ACTIVITIES.every(s=>Object.isFrozen(s)));
  for(const activity of expected){const output=validateImprovementSummary({...SAMPLE,activity});assert.deepEqual(output,{...SAMPLE,activity});assert.notEqual(output,SAMPLE);assert.equal(Object.isFrozen(output),true);}
  let reads=0;const getters={...SAMPLE};Object.defineProperty(getters,'issue',{get(){reads++;return 'controls';},enumerable:true});
  assert.equal(validateImprovementSummary(getters),null);assert.equal(reads,0);
  const inherited=Object.create(SAMPLE);assert.equal(validateImprovementSummary(inherited),null);
  assert.equal(validateImprovementSummary({...SAMPLE,[Symbol('private')]:'hidden'}),null);
});

test('a valid prepared request increments independent marginals and shared quotas without storing a summary',async t=>{
  const h=fixture(t),result=await send(h);assert.equal(result.status,202);assert.deepEqual(result.data,{accepted:true});
  assert.equal(result.response.headers.get('Cache-Control'),'private, no-store');assert.equal(result.response.headers.has('Set-Cookie'),false);
  const rows=h.rows();assert.equal(rows.length,6);assert.deepEqual(rows.map(r=>r.n),[1,1,1,1,1,1]);
  const month=rows.filter(r=>r.scope==='month');assert.deepEqual(month.map(r=>[r.metric,r.bucket]).sort(),[['attempts','two_or_three'],['issue','controls'],['outcome','finished'],['reports','all']]);
  assert.ok(month.every(r=>r.release===IMPROVEMENT_RELEASE&&r.activity===SAMPLE.activity));
  assert.deepEqual(h.sqlite.prepare('PRAGMA table_info(improvement_counts)').all().map(row=>row.name),['scope','period','release','activity','metric','bucket','n']);
  assert.deepEqual(h.sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(row=>row.name),['improvement_counts']);
  assert.equal(h.calls.length,2,'One cleanup, then one atomic admission statement.');
});

test('credential, origin, route and method boundaries reject before database access',async t=>{
  const h=fixture(t);
  const variants=[{method:'GET'},{method:'OPTIONS'},{method:'PUT'},
    {origin:'https://attacker.example'},{origin:'http://www.colelearninglabs.com'},
    {headers:{Origin:'https://colelearninglabs.com'}},{headers:{Origin:'https://www.colelearninglabs.com.attacker.example'}},
    {headers:{Origin:'null'}},{headers:{Origin:''}},{headers:{'Sec-Fetch-Site':'cross-site'}},{headers:{'Sec-Fetch-Site':'same-site'}},{headers:{'Sec-Fetch-Site':''}},
    {headers:{Cookie:''}},{headers:{Authorization:'Bearer example-only'}},{headers:{'Cf-Access-Jwt-Assertion':'example-only'}},
    {path:'/api/improvements?class=fictional'},{path:'/api/improvements/'},{path:'/api/classroom'}];
  for(const variant of variants){const result=await send(h,variant);assert.ok([400,403,405].includes(result.status),JSON.stringify(variant));assert.equal(result.data.accepted,false);}
  assert.equal(h.calls.length,0);assert.deepEqual(h.rows(),[]);
  assert.equal((await send(h,{origin:'https://colelearninglabs.com'})).status,202,'The configured apex supports its own exact same-origin request.');
});

test('extra fields, nested or unknown values and learner text are rejected rather than stripped',async t=>{
  const h=fixture(t),variants=[null,[],true,'null','{broken',{},
    {...SAMPLE,version:'1'},{...SAMPLE,activity:'lab/unknown'},{...SAMPLE,activity:'https://example.test/learner'},
    {...SAMPLE,activity:'sandbox/custom-personal-title'},{...SAMPLE,outcome:{finished:true}},
    {...SAMPLE,attempts:2},{...SAMPLE,issue:'private typed answer'},
    {...SAMPLE,notes:'PRIVATE_FICTIONAL_CANARY'},{...SAMPLE,release:'private-label'},
    {...SAMPLE,clientTime:'2026-10-31T12:00:00Z'},{...SAMPLE,sessionId:'fictional-session'},
    JSON.parse('{"version":1,"activity":"lab/INC-101","outcome":"finished","attempts":"one","issue":"none","__proto__":{"private":"canary"}}')];
  for(const body of variants){const result=await send(h,{body});assert.equal(result.status,400,JSON.stringify(body));assert.equal(result.data.error,'invalid_summary');assert.doesNotMatch(JSON.stringify(result.data),/PRIVATE|private-label|fictional-session/);}
  assert.equal(h.calls.length,0);assert.deepEqual(h.rows(),[]);
  assert.deepEqual(await storeImprovementSummary(h.binding,{...SAMPLE,notes:'canary'}),{accepted:false,error:'invalid_summary'});assert.equal(h.calls.length,0);
});

test('streamed byte limit rejects chunked data and valid JSON prefixes before database access',async t=>{
  const h=fixture(t),encoded=new TextEncoder().encode(JSON.stringify(SAMPLE));
  assert.ok(encoded.byteLength<512);
  for(const chunks of [[encoded,new Uint8Array(513)], [new TextEncoder().encode('{}'),new TextEncoder().encode(' '.repeat(600))], [new TextEncoder().encode('€'.repeat(172))]]){
    let cancelled=false;const stream=new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(chunk);},cancel(){cancelled=true;}});
    const result=await send(h,{stream});assert.equal(result.status,413);assert.equal(cancelled,true);assert.equal(h.calls.length,0);
  }
  const exactly=JSON.stringify(SAMPLE)+' '.repeat(512-encoded.length);
  assert.equal((await send(h,{body:exactly})).status,202);
  assert.equal((await send(h,{body:exactly+' '})).status,413);
  const broken=new ReadableStream({start(controller){controller.enqueue(new Uint8Array([255]));controller.close();}});
  assert.equal((await send(h,{stream:broken})).status,400);
});

test('encoding and declared limits fail closed without accepting compressed or misleading bodies',async t=>{
  const h=fixture(t);
  for(const headers of [{'Content-Type':'text/plain'},{'Content-Encoding':'gzip'},{'Content-Encoding':'identity'},
    {'Content-Length':'513'},{'Content-Length':'-1'},{'Content-Length':'1.5'},{'Content-Length':'NaN'}]){
    assert.ok([413,415].includes((await send(h,{headers})).status));
  }
  assert.equal(h.calls.length,0);
});

test('an unfinished stream is canceled on the fixed request deadline',async t=>{
  const h=fixture(t);let cancelled=false;
  const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));},cancel(){cancelled=true;}});
  const result=await send(h,{stream});assert.equal(result.status,408);assert.equal(cancelled,true);assert.equal(h.calls.length,0);
});

test('disabled, missing and broken storage cannot enable collection or expose failures',async t=>{
  const h=fixture(t);
  const disabled=request({env:{IMPROVEMENTS_ENABLED:'false'}});let bodyReads=0;
  Object.defineProperty(disabled.request,'body',{get(){bodyReads++;throw Error('PRIVATE_BODY_MUST_NOT_BE_READ');}});
  assert.equal((await handleImprovementRequest(disabled,{privacyApproved:true})).status,503);assert.equal(bodyReads,0);
  for(const env of [{}, {IMPROVEMENTS_ENABLED:'false',LAB_IMPROVEMENTS:h.binding},{IMPROVEMENTS_ENABLED:true,LAB_IMPROVEMENTS:h.binding},
    {IMPROVEMENTS_ENABLED:'true'},{IMPROVEMENTS_ENABLED:'true',LAB_IMPROVEMENTS:{prepare(){throw Error('PRIVATE_STORAGE_DETAIL');}}}]){
    const result=await send(h,{env});assert.equal(result.status,503);assert.equal(result.data.accepted,false);assert.doesNotMatch(JSON.stringify(result.data),/PRIVATE_STORAGE_DETAIL/);
  }
  assert.equal(h.calls.length,0);
});

test('minute and day capacity admit all six rows together and reject without any partial increments',async t=>{
  const h=fixture(t);
  for(let i=0;i<30;i++)assert.equal((await send(h)).status,202);
  const before=h.rows();for(let i=0;i<5;i++)assert.equal((await send(h)).status,429);
  assert.deepEqual(h.rows(),before);assert.ok(before.every(r=>r.n===30));
  h.sqlite.prepare("UPDATE improvement_counts SET n=500 WHERE scope='day'").run();
  h.sqlite.prepare("DELETE FROM improvement_counts WHERE scope='minute'").run();
  const full=h.rows();assert.equal((await send(h)).status,429);assert.deepEqual(h.rows(),full);
});

test('SQL failures roll back every quota and aggregate mutation and are not retried',async t=>{
  const h=fixture(t);
  h.sqlite.exec("CREATE TRIGGER synthetic_failure BEFORE INSERT ON improvement_counts WHEN NEW.metric='issue' BEGIN SELECT RAISE(ABORT,'PRIVATE_STORAGE_FAILURE'); END");
  const result=await send(h);assert.equal(result.status,503);assert.deepEqual(h.rows(),[]);assert.equal(h.calls.length,2);assert.doesNotMatch(JSON.stringify(result.data),/PRIVATE_STORAGE_FAILURE/);
});

test('an ambiguous successful commit is not retried or refunded',async t=>{
  const h=fixture(t);let admissions=0;
  const binding={prepare(sql){const statement=h.binding.prepare(sql);if(sql===IMPROVEMENT_ADMISSION_SQL){admissions++;const original=statement.all;statement.all=async()=>{await original();throw Error('PRIVATE_TRANSPORT_FAILURE');};}return statement;}};
  const result=await send(h,{env:{IMPROVEMENTS_ENABLED:'true',LAB_IMPROVEMENTS:binding}});
  assert.equal(result.status,503);assert.equal(admissions,1);assert.ok(h.rows().every(row=>row.n===1));
});

test('scheduled and per-write cleanup retain only the documented aggregate windows',async t=>{
  const h=fixture(t);
  h.sqlite.exec(`INSERT INTO improvement_counts VALUES
    ('month',strftime('%Y-%m','now','start of month','-3 months'),'${IMPROVEMENT_RELEASE}','lab/INC-101','reports','all',1),
    ('month',strftime('%Y-%m','now','start of month','-2 months'),'${IMPROVEMENT_RELEASE}','lab/INC-101','reports','all',1),
    ('month',strftime('%Y-%m','now'),'${IMPROVEMENT_RELEASE}','lab/INC-101','reports','all',1),
    ('day',date('now','-2 day'),'*','*','reports','all',1),
    ('day',date('now','-1 day'),'*','*','reports','all',1),
    ('minute',strftime('%Y-%m-%dT%H:%M','now','-3 minutes'),'*','*','reports','all',1),
    ('minute',strftime('%Y-%m-%dT%H:%M','now','-1 minute'),'*','*','reports','all',1)`);
  assert.equal(await runImprovementRetention({IMPROVEMENTS_ENABLED:'true',LAB_IMPROVEMENTS:h.binding},{privacyApproved:true}),true);
  const rows=h.rows();assert.equal(rows.length,4);assert.equal(rows.filter(r=>r.scope==='month').length,2);
  assert.equal(await cleanupImprovementCounts({}),false);
  h.sqlite.exec(`INSERT INTO improvement_counts VALUES ('day',date('now','-2 day'),'*','*','reports','all',1)`);
  assert.equal(await runImprovementRetention({IMPROVEMENTS_ENABLED:'false',LAB_IMPROVEMENTS:h.binding},{privacyApproved:true}),true);
  assert.equal(h.rows().length,4,'Disabling collection does not disable cleanup of old data.');
  assert.match(IMPROVEMENT_CLEANUP_SQL,/-2 months/);
});

test('real concurrent SQLite writers cannot over-admit or partially count a shared minute',async t=>{
  const folder=await mkdtemp(join(process.env.CLL_TEST_TMPDIR||tmpdir(),'cll-improvement-sql-'));
  t.after(()=>rm(folder,{recursive:true,force:true}));
  const filename=join(folder,'aggregate.sqlite'),database=new DatabaseSync(filename);
  database.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=15000;');database.exec(SCHEMA);database.close();
  const code=`const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');
    const db=new DatabaseSync(workerData.filename);db.exec('PRAGMA busy_timeout=15000');
    db.function('date',{varargs:true},value=>value==='now'?'2026-10-31':value);
    db.function('strftime',{varargs:true},(format,value)=>value==='now'?(format==='%Y-%m'?'2026-10':'2026-10-31T12:00'):value);
    parentPort.once('message',()=>{let accepted=0;const s=db.prepare(workerData.sql);for(let i=0;i<20;i++){const rows=s.all(workerData.release,'lab/INC-101','finished','one','none');if(rows.length===6)accepted++;else if(rows.length!==0)throw Error('Partial admission');}db.close();parentPort.postMessage({accepted});});parentPort.postMessage({ready:true});`;
  const workers=[],results=[];
  for(let i=0;i<6;i++){
    const worker=new Worker(code,{eval:true,workerData:{filename,sql:IMPROVEMENT_ADMISSION_SQL,release:IMPROVEMENT_RELEASE}});workers.push(worker);t.after(()=>worker.terminate());
    results.push(new Promise((resolve,reject)=>{worker.on('error',reject);worker.on('message',message=>{if(message.ready)worker.postMessage('go');else resolve(message.accepted);});}));
  }
  assert.equal((await Promise.all(results)).reduce((a,b)=>a+b,0),30);
  const check=new DatabaseSync(filename);try{const rows=check.prepare('SELECT * FROM improvement_counts').all();assert.equal(rows.length,6);assert.ok(rows.every(row=>row.n===30));}finally{check.close();}
});

test('collector sources have no outbound network or request-content logging',async()=>{
  const source=(await Promise.all(['functions/api/improvements.js','improvements/storage.js','improvements/retention-worker.js'].map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')))).join('\n');
  assert.doesNotMatch(source,/console\.|\bfetch\s*\((?!\s*\)\s*\{)|\.headers\.get\(['"](?:CF-Connecting-IP|User-Agent|Referer)|request\.cf|localStorage|sessionStorage|indexedDB|randomUUID/iu);
  const config=JSON.parse((await readFile(new URL('../improvements/wrangler.retention.jsonc',import.meta.url),'utf8')).replace(/\/\/[^\n]*/g,''));
  assert.equal(config.observability.enabled,false);assert.equal(config.workers_dev,false);assert.equal(config.vars.IMPROVEMENTS_ENABLED,'false');assert.equal(config.triggers.crons.length,1);
});
