import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequest as telemetry} from '../functions/api/telemetry.js';
import {onRequest as verify} from '../functions/api/verify.js';
import {generateCompletionCode} from '../utils/receiptCrypto.js';
import {TELEMETRY_CLEANUP_SQL,storeTelemetryEvent,telemetryBands} from '../telemetry/storage.js';
import {turnstileEnv,turnstileReply} from './turnstile-fixture.js';
import {readReceiptJson} from '../edge/receipt-http.js';
mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(options.body.get('secret'),turnstileEnv.TURNSTILE_SECRET_KEY);
  assert.deepEqual([...options.body.keys()].sort(),['response','secret']);
  const token=options.body.get('response');
  return turnstileReply(token==='verify-test-token'?'verify':'receipt',{success:token!=='rejected-token'});
});
const secret='Receipt test secret with at least thirty-two bytes';
const event={labId:'NET-201',eventType:'complete',activeSeconds:720,stepReached:3,score:95};
function database(){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../telemetry/0001_telemetry.sql',import.meta.url),'utf8'));return {sql,prepare(text){let args=[];return {bind(...values){args=values;return this;},async all(){return {success:true,results:sql.prepare(text).all(...args)};},async run(){sql.prepare(text).run(...args);return {success:true};}};}};}
function context({body=event,method='POST',path='/api/telemetry',headers={},env={}}={}){
  return {request:new Request('https://www.colelearninglabs.com'+path,{method,headers:{Origin:'https://www.colelearninglabs.com','Sec-Fetch-Site':'same-origin','Content-Type':'application/json','X-CLL-Turnstile':path==='/api/verify'?'verify-test-token':'receipt-test-token',...headers},...(!['GET','HEAD'].includes(method)?{body:JSON.stringify(body)}:{})}),env:{...turnstileEnv,RECEIPTS_ENABLED:'true',RECEIPT_SECRET:secret,...env}};
}
test('receipt issuance needs reviewed deployment config and a valid bot challenge; telemetry stays off',async()=>{
  for(const env of [{RECEIPTS_ENABLED:'false'},{RECEIPT_SECRET:''},{TURNSTILE_SECRET_KEY:''}])assert.equal((await telemetry(context({env}))).status,503);
  assert.equal((await telemetry(context({headers:{'X-CLL-Turnstile':''}}))).status,403);
  const db=database(),c=context({env:{LAB_TELEMETRY:db}}),response=await telemetry(c),data=await response.json();
  assert.equal(response.status,200);assert.match(data.completionCode,/^CLL1-/u);assert.equal(data.telemetryStored,false);assert.equal(data.measurement,'browser-reported');
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM lab_telemetry_counts').get().n,0);db.sql.close();
  const get=await telemetry(context({method:'GET'}));assert.deepEqual(await get.json(),{enabled:true,receiptsEnabled:true,telemetryEnabled:false});
  assert.equal(get.headers.get('X-CLL-Turnstile-Sitekey'),turnstileEnv.TURNSTILE_SITE_KEY);
});
test('malformed, cross-origin, cookie-bearing and oversized requests fail without storage',async()=>{
  for(const options of [{body:{...event,notes:'private'}},{body:{...event,score:'100'}},{headers:{Origin:'https://evil.invalid'}},{headers:{Cookie:'student=secret'}},{headers:{'Content-Encoding':'gzip'}},{headers:{'Content-Type':'text/plain'}},{headers:{'Content-Length':'9999'}},{path:'/api/telemetry?student=private'},{method:'PUT'}])assert.ok((await telemetry(context(options))).status>=400);
});
test('verification marks every copy duplicate, preserves invalid rows and never leaks secrets',async()=>{
  const code=await generateCompletionCode(event,secret);
  const response=await verify(context({path:'/api/verify',body:{codes:[code,code.toLowerCase(),'bad-code']}}));
  const raw=await response.text(),data=JSON.parse(raw);
  assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/u);
  assert.deepEqual(data.results.map(row=>row.isDuplicate),[true,true,false]);assert.equal(data.results[2].valid,false);assert.doesNotMatch(raw,new RegExp(secret));
  for(const body of [{codes:'wrong'},{codes:[]},{codes:[{},code]},{codes:[code],name:'student'},{codes:Array(201).fill(code)},{codes:['x'.repeat(129)]}])assert.equal((await verify(context({path:'/api/verify',body}))).status,400);
  assert.equal((await verify(context({path:'/api/verify',body:{codes:[code]},env:{RECEIPTS_ENABLED:'false'}}))).status,503);
  for(const token of ['','rejected-token','receipt-test-token'])assert.equal((await verify(context({path:'/api/verify',body:{codes:[code]},headers:{'X-CLL-Turnstile':token}}))).status,403);
  assert.equal((await verify(context({path:'/api/verify',body:{codes:[code]},env:{TURNSTILE_SECRET_KEY:''}}))).status,503);
  const get=await verify(context({path:'/api/verify',method:'GET'}));assert.deepEqual(await get.json(),{enabled:true});assert.equal(get.headers.get('X-CLL-Turnstile-Sitekey'),turnstileEnv.TURNSTILE_SITE_KEY);
});
test('aggregate writes require explicit opt-in and all privacy and retention flags; signals suppress writes',async()=>{
  const db=database(),env={LAB_TELEMETRY:db,TELEMETRY_ENABLED:'true',TELEMETRY_PRIVACY_REVIEWED:'true',TELEMETRY_RETENTION_VERIFIED:'true'};
  assert.equal((await (await telemetry(context({env}))).json()).telemetryStored,false);
  for(const gate of ['TELEMETRY_ENABLED','TELEMETRY_PRIVACY_REVIEWED','TELEMETRY_RETENTION_VERIFIED'])assert.equal((await (await telemetry(context({env:{...env,[gate]:'false'},body:{...event,collectTelemetry:true}}))).json()).telemetryStored,false);
  for(const headers of [{DNT:'1'},{'Sec-GPC':'1'}]){
    const data=await (await telemetry(context({env,headers,body:{...event,collectTelemetry:true}}))).json();assert.equal(data.telemetryStored,false);assert.match(data.completionCode,/^CLL1-/u);
  }
  const data=await (await telemetry(context({env,body:{...event,collectTelemetry:true}}))).json();assert.equal(data.telemetryStored,true);
  const rows=db.sql.prepare('SELECT * FROM lab_telemetry_counts').all();assert.equal(rows.length,1);
  assert.equal(rows[0].duration_band,'5to15m');assert.equal(rows[0].score_band,'90to99');assert.equal(rows[0].step_band,'2to3');
  assert.doesNotMatch(JSON.stringify(rows),/receipt|salt|student|agent|0720|95/u);db.sql.close();
});
test('aggregate admission is atomic at the daily cap and deletes expired dates',async()=>{
  const db=database();db.sql.exec("INSERT INTO lab_telemetry_counts VALUES(date('now'),'NET201','complete','5to15m','90to99','2to3',4999)");
  assert.equal((await storeTelemetryEvent(db,{...event,collectTelemetry:true})).accepted,true);
  assert.equal((await storeTelemetryEvent(db,{...event,labId:'INC101',collectTelemetry:true})).error,'telemetry_full');
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM lab_telemetry_counts').get().n,1);
  db.sql.exec("INSERT INTO lab_telemetry_counts VALUES('2020-01-01','INC101','start','under1m','none','1',1)");db.sql.exec(TELEMETRY_CLEANUP_SQL);
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM lab_telemetry_counts WHERE event_date='2020-01-01'").get().n,0);db.sql.close();
  assert.deepEqual(telemetryBands({activeSeconds:86400,eventType:'abandon',stepReached:20}),{durationBand:'60mplus',scoreBand:'none',stepBand:'4plus'});
});
test('the shared request gate rejects each unsafe request shape with an exact status before any bot check',async()=>{
  const calls=()=>globalThis.fetch.mock.callCount();
  const cases=[
    [{headers:{Origin:'https://evil.invalid'}},403],[{headers:{Origin:'null'}},403],
    [{headers:{'Sec-Fetch-Site':'cross-site'}},403],[{headers:{'Sec-Fetch-Site':'same-site'}},403],[{headers:{'Sec-Fetch-Site':'none'}},403],
    [{headers:{Cookie:'student=secret'}},403],[{headers:{'Content-Encoding':'gzip'}},403],[{headers:{'Content-Type':'text/plain'}},403],
    [{query:'?student=private'},403],[{method:'GET',headers:{'Sec-Fetch-Site':'cross-site'}},403],[{method:'GET',query:'?x=1'},403],
    [{headers:{'Content-Length':'99999'}},400],[{method:'PUT'},405],[{method:'DELETE'},405]
  ];
  for(const [handler,path,body] of [[telemetry,'/api/telemetry',event],[verify,'/api/verify',{codes:['x']}]]){
    const before=calls();
    for(const [{query='',...options},status] of cases){
      const response=await handler(context({body,...options,path:path+query}));
      assert.equal(response.status,status,path+' '+JSON.stringify(options)+query);
      assert.equal(response.headers.get('Cache-Control'),'private, no-store');
      assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
      assert.equal(response.headers.get('Cross-Origin-Resource-Policy'),'same-origin');
      if(status===405)assert.equal(response.headers.get('Allow'),'GET, POST');
    }
    assert.equal(calls(),before,path+' contacted Siteverify for a rejected request');
  }
});
test('the body reader enforces its byte cap on the stream itself, not only on the declared length',async()=>{
  const stream=length=>new Request('https://www.colelearninglabs.com/api/verify',{method:'POST',duplex:'half',body:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{"codes":["'+'x'.repeat(length)+'"]}'));controller.close();}})});
  await assert.rejects(readReceiptJson(stream(30000),28000),/too large/u);
  assert.deepEqual(await readReceiptJson(stream(10),28000),{codes:['x'.repeat(10)]});
  await assert.rejects(readReceiptJson(new Request('https://www.colelearninglabs.com/api/verify',{method:'POST',body:'{"codes":'}),28000));
  const before=globalThis.fetch.mock.callCount();
  const padded=JSON.stringify(event)+' '.repeat(600);
  assert.equal((await telemetry({request:new Request('https://www.colelearninglabs.com/api/telemetry',{method:'POST',headers:{Origin:'https://www.colelearninglabs.com','Sec-Fetch-Site':'same-origin','Content-Type':'application/json','X-CLL-Turnstile':'receipt-test-token'},body:padded}),env:{...turnstileEnv,RECEIPTS_ENABLED:'true',RECEIPT_SECRET:secret}})).status,400);
  assert.equal(globalThis.fetch.mock.callCount(),before);
});
test('a verifier token cannot mint a receipt, and start or abandon events never reach signing',async()=>{
  const wrong=await telemetry(context({headers:{'X-CLL-Turnstile':'verify-test-token'}}));
  assert.equal(wrong.status,403);assert.equal((await wrong.json()).error,'verification_required');
  const before=globalThis.fetch.mock.callCount();
  for(const body of [{labId:'NET-201',eventType:'start',activeSeconds:0,stepReached:1},{labId:'NET-201',eventType:'abandon',activeSeconds:10,stepReached:1}]){
    const response=await telemetry(context({body}));assert.equal(response.status,503);assert.equal((await response.json()).error,'telemetry_unavailable');
  }
  assert.equal(globalThis.fetch.mock.callCount(),before);
  const db=database(),env={LAB_TELEMETRY:db,TELEMETRY_ENABLED:'true',TELEMETRY_PRIVACY_REVIEWED:'true',TELEMETRY_RETENTION_VERIFIED:'true'};
  const started=await telemetry(context({env,body:{labId:'NET-201',eventType:'start',activeSeconds:0,stepReached:1,collectTelemetry:true}}));
  assert.deepEqual(await started.json(),{ok:true,completionCode:null,telemetryStored:true,measurement:'browser-reported'});db.sql.close();
});
test('only the exact Pages deployment origin joins the allowlist, and a weak secret keeps receipts off',async()=>{
  const get=(origin,env={})=>telemetry({request:new Request(origin+'/api/telemetry',{method:'GET',headers:{'Sec-Fetch-Site':'same-origin'}}),env:{...turnstileEnv,...env}});
  const preview='https://abc123.cole-learning-labs.pages.dev';
  assert.equal((await get(preview,{CF_PAGES_URL:preview})).status,200);
  assert.equal((await get(preview)).status,403);
  assert.equal((await get(preview,{CF_PAGES_URL:'https://other.cole-learning-labs.pages.dev'})).status,403);
  assert.equal((await get('https://abc.evil.pages.dev',{CF_PAGES_URL:'https://abc.evil.pages.dev'})).status,403);
  assert.equal((await get('https://cole-learning-labs.pages.dev',{CF_PAGES_URL:'https://cole-learning-labs.pages.dev'})).status,403);
  assert.equal((await get('http://www.colelearninglabs.com')).status,403);
  for(const RECEIPT_SECRET of ['x'.repeat(31),'a'.repeat(64)]){
    const response=await telemetry(context({method:'GET',env:{RECEIPT_SECRET}}));
    assert.deepEqual(await response.json(),{enabled:false,receiptsEnabled:false,telemetryEnabled:false});
    assert.equal(response.headers.has('X-CLL-Turnstile-Sitekey'),false);
  }
});
