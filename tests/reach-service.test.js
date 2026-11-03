import test,{mock} from 'node:test';
import {turnstileEnv,mockSiteverify} from './turnstile-fixture.js';
mockSiteverify(mock,'reach');
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleReach,onRequest} from '../functions/api/reach.js';
import {storeReachEvent,REACH_ADMISSION_SQL,REACH_CLEANUP_SQL} from '../reach/storage.js';
import {summarizeReach} from '../reach/report.mjs';
const event={version:1,activity:'arcade/garden-rover',metric:'start'};
function database(){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../reach/0001_reach.sql',import.meta.url),'utf8'));return {sql,prepare(text){let args=[];return {bind(...values){args=values;return this;},async all(){return {success:true,results:sql.prepare(text).all(...args)};},async run(){sql.prepare(text).run(...args);return {success:true};}};}};}
function context({body=event,method='POST',country='US',agent='Mozilla/5.0 Chrome/156',headers={},env={},path='/api/reach'}={}){
  const request=new Request('https://www.colelearninglabs.com'+path,{method,headers:{'Content-Type':'application/json','X-CLL-Turnstile':'reach-test-token',Origin:'https://www.colelearninglabs.com','Sec-Fetch-Site':'same-origin','User-Agent':agent,...headers},...(method==='POST'?{body:JSON.stringify(body)}:{})});Object.defineProperty(request,'cf',{value:{country},configurable:true});
  return {request,env:{...turnstileEnv,REACH_ENABLED:'true',REACH_RETENTION_VERIFIED:'true',LAB_REACH:database(),...env}};
}
test('production collection remains unavailable until both live activation and verified retention flags are set',async()=>{
  for(const env of [{REACH_ENABLED:'false'},{REACH_RETENTION_VERIFIED:'false'}]){const c=context({env});const result=await onRequest(c);assert.equal(result.status,503);assert.equal(c.env.LAB_REACH.sql.prepare('SELECT count(*) n FROM reach_counts').get().n,0);}
  assert.equal((await handleReach(context())).status,503);
});
test('receiver accepts only the exact US same-origin credential-free schema and rejects obvious automation',async()=>{
  for(const options of [{country:'CA'},{country:undefined},{agent:'Googlebot/2.1'},{agent:'node'},{agent:'CensysInspect'},{agent:''},{headers:{Cookie:'private=secret'}},{headers:{Origin:'https://attacker.invalid'}},{headers:{'Sec-Fetch-Site':'cross-site'}},{body:{...event,notes:'private'}},{path:'/api/reach?student=private'}]){
    const c=context(options);if(Object.hasOwn(options,'country')&&options.country===undefined)Object.defineProperty(c.request,'cf',{value:{},configurable:true});
    const result=await handleReach(c,{privacyApproved:true});assert.ok(result.status>=400);assert.equal(c.env.LAB_REACH.sql.prepare('SELECT count(*) n FROM reach_counts').get().n,0);
  }
  const c=context();assert.equal((await handleReach(c,{privacyApproved:true})).status,200);assert.equal(c.env.LAB_REACH.sql.prepare("SELECT n FROM reach_counts WHERE scope='month'").get().n,1);
  const get=context({method:'GET'});assert.deepEqual(await (await handleReach(get,{privacyApproved:true})).json(),{enabled:true});
});
test('storage atomically admits bounded events, retains no per-event rows, and expires old periods',async()=>{
  const db=database();for(let i=0;i<100;i++)assert.equal((await storeReachEvent(db,event)).accepted,true);
  assert.deepEqual(await storeReachEvent(db,event),{accepted:false,error:'reach_full'});assert.equal(db.sql.prepare("SELECT n FROM reach_counts WHERE scope='month'").get().n,100);assert.equal(db.sql.prepare('SELECT count(*) n FROM reach_counts').get().n,3);
  db.sql.exec("INSERT INTO reach_counts VALUES ('month','2020-01','lab/INC-101','start',11),('day','2020-01-01','*','admissions',1),('minute','2020-01-01T00:00','*','admissions',1)");db.sql.exec(REACH_CLEANUP_SQL);assert.equal(db.sql.prepare("SELECT count(*) n FROM reach_counts WHERE period LIKE '2020%'").get().n,0);
  assert.doesNotMatch(REACH_ADMISSION_SQL,/\bip\b|user|session|cookie|referrer/iu);db.sql.close();
});
test('the shared daily cap cannot partially increment activity counts and malformed bodies never touch storage',async()=>{
  const db=database();db.sql.exec("INSERT INTO reach_counts VALUES ('day',date('now'),'*','admissions',4999)");
  assert.equal((await storeReachEvent(db,event)).accepted,true);assert.equal((await storeReachEvent(db,{...event,metric:'complete'})).error,'reach_full');
  assert.equal(db.sql.prepare("SELECT count(*) n FROM reach_counts WHERE metric='complete'").get().n,0);db.sql.close();
  for(const options of [{headers:{'Content-Length':'193'}},{body:{...event,notes:'x'.repeat(250)}},{headers:{DNT:'1'}},{headers:{'Sec-GPC':'1'}},{headers:{'Content-Encoding':'gzip'}},{headers:{'Content-Type':'text/plain'}}]){
    const c=context(options);assert.ok((await handleReach(c,{privacyApproved:true})).status>=400);assert.equal(c.env.LAB_REACH.sql.prepare('SELECT count(*) n FROM reach_counts').get().n,0);
  }
});
test('owner reports suppress small totals, round counts and exclude current, expired and future months',()=>{
  const row={scope:'month',period:'2026-10',activity:'lab/INC-101',metric:'start',n:14};
  assert.deepEqual(summarizeReach([row],{now:new Date('2026-11-02T12:00Z')}),[{month:'2026-10',activity:'lab/INC-101',metric:'start',total:'10'}]);
  assert.equal(summarizeReach([{...row,n:9}],{now:new Date('2026-11-02T12:00Z')})[0].total,'Suppressed (<10)');
  for(const period of ['2026-11','2026-12','2026-08'])assert.deepEqual(summarizeReach([{...row,period}],{now:new Date('2026-11-02T12:00Z')}),[]);
  assert.throws(()=>summarizeReach([row,{...row}],{now:new Date('2026-11-02T12:00Z')}));
});
