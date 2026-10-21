import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdtemp,unlink,rmdir,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {REQUESTER_BUDGET_RESERVATION_SQL,reserveRequesterBudget,requesterBudgetReservationCurrent} from '../worker-requester/budget.js';

const SCHEMA=await readFile(new URL('../worker-requester/budget-schema.sql',import.meta.url),'utf8');
const DAY_MS=86_400_000;
const nextDay=day=>new Date(Date.parse(day+'T00:00:00Z')+DAY_MS).toISOString().slice(0,10);
const today=()=>new Date(Date.now()).toISOString().slice(0,10);
function fixture(initialDay='2026-10-20') {
  const database=new DatabaseSync(':memory:');let day=initialDay;
  // Test-only control of SQLite's clock. The production SQL uses its own UTC
  // date, with no client date, clock argument or environment cap override.
  database.function('date',{varargs:true},(value,modifier)=>{
    if(value==='now')return modifier==='+1 day'?nextDay(day):day;
    if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/u.test(value)){
      const time=Date.parse(value+'T00:00:00Z');return Number.isFinite(time)?new Date(time).toISOString().slice(0,10):null;
    }
    return null;
  });
  database.exec(SCHEMA);
  let calls=0;
  const binding={prepare(sql){calls++;const stmt=database.prepare(sql);return {async all(){return {success:true,results:stmt.all()};}};}};
  const rows=()=>database.prepare('SELECT day,reserved_neurons FROM requester_ai_budget ORDER BY day').all().map(row=>({...row}));
  const seed=(selectedDay,value)=>database.prepare('INSERT INTO requester_ai_budget(day,reserved_neurons) VALUES(?,?)').run(selectedDay,value);
  return {database,binding,rows,seed,calls:()=>calls,setDay(value){day=value;},close(){database.close();}};
}

test('real SQLite reserves both UTC buckets in one statement and persists across handler instances',async()=>{
  const h=fixture();try{
    const first=await reserveRequesterBudget(h.binding),second=await reserveRequesterBudget(h.binding);
    assert.deepEqual(first,{ok:true,day:'2026-10-20',nextDay:'2026-10-21'});assert.deepEqual(second,first);
    assert.deepEqual(h.rows(),[{day:'2026-10-20',reserved_neurons:50},{day:'2026-10-21',reserved_neurons:50}]);
    assert.equal(h.calls(),2);
    const columns=h.database.prepare('PRAGMA table_info(requester_ai_budget)').all().map(row=>row.name);
    assert.deepEqual(columns,['day','reserved_neurons'],'Only anonymous aggregate fields are stored.');
  }finally{h.close();}
});

test('exactly 240 empty-window starts fit and rejected attempts do not consume either bucket',async()=>{
  const h=fixture();try{
    for(let i=0;i<240;i++)assert.equal((await reserveRequesterBudget(h.binding)).ok,true);
    const full=h.rows();assert.deepEqual(full,[{day:'2026-10-20',reserved_neurons:6000},{day:'2026-10-21',reserved_neurons:6000}]);
    for(let i=0;i<20;i++)assert.deepEqual(await reserveRequesterBudget(h.binding),{ok:false,error:'requester_budget_exhausted'});
    assert.deepEqual(h.rows(),full);
  }finally{h.close();}
});

test('either nearly-full or full bucket gates the entire SQL operation before either mutation',async()=>{
  for(const [first,second] of [[5975,6000],[6000,5975],[null,6000],[6000,null]]){
    const h=fixture();try{
      if(first!==null)h.seed('2026-10-20',first);if(second!==null)h.seed('2026-10-21',second);
      const before=h.rows();
      for(let i=0;i<10;i++)assert.equal((await reserveRequesterBudget(h.binding)).error,'requester_budget_exhausted');
      assert.deepEqual(h.rows(),before,JSON.stringify([first,second])+' did not partially consume/create a bucket.');
    }finally{h.close();}
  }
  const h=fixture();try{
    h.seed('2026-10-20',5975);h.seed('2026-10-21',5950);
    assert.equal((await reserveRequesterBudget(h.binding)).ok,true);
    assert.deepEqual(h.rows(),[{day:'2026-10-20',reserved_neurons:6000},{day:'2026-10-21',reserved_neurons:5975}]);
    const before=h.rows();assert.equal((await reserveRequesterBudget(h.binding)).error,'requester_budget_exhausted');assert.deepEqual(h.rows(),before);
  }finally{h.close();}
});

test('UTC rollover retains yesterday carry and never resets reservations on a new day',async()=>{
  const h=fixture();try{
    for(let i=0;i<120;i++)assert.equal((await reserveRequesterBudget(h.binding)).ok,true);
    h.setDay('2026-10-21');
    for(let i=0;i<120;i++)assert.equal((await reserveRequesterBudget(h.binding)).ok,true);
    assert.equal((await reserveRequesterBudget(h.binding)).error,'requester_budget_exhausted');
    assert.deepEqual(h.rows(),[{day:'2026-10-20',reserved_neurons:3000},{day:'2026-10-21',reserved_neurons:6000},{day:'2026-10-22',reserved_neurons:3000}]);
    h.setDay('2026-10-22');assert.equal((await reserveRequesterBudget(h.binding)).ok,true);
    assert.equal(h.rows().find(row=>row.day==='2026-10-22').reserved_neurons,3025);
  }finally{h.close();}
});

test('a fully used prior window closes the next day without wasting the following day',async()=>{
  const h=fixture();try{
    for(let i=0;i<240;i++)await reserveRequesterBudget(h.binding);
    h.setDay('2026-10-21');const before=h.rows();
    for(let i=0;i<10;i++)assert.equal((await reserveRequesterBudget(h.binding)).error,'requester_budget_exhausted');
    assert.deepEqual(h.rows(),before);assert.ok(!h.rows().some(row=>row.day==='2026-10-22'));
    h.setDay('2026-10-22');assert.equal((await reserveRequesterBudget(h.binding)).ok,true);
  }finally{h.close();}
});

test('actual SQL rolls back all changes when either row encounters a storage constraint failure',async()=>{
  const h=fixture();try{
    h.database.exec("CREATE TRIGGER refuse_second BEFORE INSERT ON requester_ai_budget WHEN NEW.day = '2026-10-21' BEGIN SELECT RAISE(ABORT, 'test-storage-failure'); END");
    const result=await reserveRequesterBudget(h.binding);
    assert.deepEqual(result,{ok:false,error:'requester_budget_unavailable'});assert.deepEqual(h.rows(),[]);
  }finally{h.close();}
});

test('schema enforces valid dates, integral reservation increments and the immutable bucket ceiling',()=>{
  const h=fixture();try{
    for(const value of [-25,1,24,26,6001,6025,25.5,'private'])assert.throws(()=>h.seed('2026-10-20',value));
    for(const day of ['2026-99-99','2026-02-31','not-a-day','2026-1-1'])assert.throws(()=>h.seed(day,25));
    h.seed('2026-10-20',6000);assert.equal(h.rows()[0].reserved_neurons,6000);
  }finally{h.close();}
});

test('missing bindings, tables and ambiguous commits fail closed without retry or refund',async()=>{
  for(const binding of [undefined,null,{}, {prepare(){throw Error('PRIVATE_DB_DETAIL');}},
    {prepare(){return {all:async()=>{throw Error('PRIVATE_DB_DETAIL');}};}}])
    assert.deepEqual(await reserveRequesterBudget(binding),{ok:false,error:'requester_budget_unavailable'});
  const h=fixture();try{
    let calls=0;
    const ambiguous={prepare(sql){const statement=h.database.prepare(sql);return {async all(){calls++;statement.all();throw Error('Commit succeeded but response was lost');}};}};
    assert.deepEqual(await reserveRequesterBudget(ambiguous),{ok:false,error:'requester_budget_unavailable'});
    assert.equal(calls,1);assert.deepEqual(h.rows(),[{day:'2026-10-20',reserved_neurons:25},{day:'2026-10-21',reserved_neurons:25}]);
    assert.equal((await reserveRequesterBudget(h.binding)).ok,true);assert.equal(h.rows()[0].reserved_neurons,50);
    h.database.exec('DROP TABLE requester_ai_budget');assert.equal((await reserveRequesterBudget(h.binding)).error,'requester_budget_unavailable');
  }finally{h.close();}
});

test('partial or malformed D1 responses cannot authorize an inference',async()=>{
  const row={day:'2026-10-20',reserved_neurons:25},next={day:'2026-10-21',reserved_neurons:25};
  for(const output of [null,{}, {success:false,results:[]},{success:'true',results:[row,next]},
    {success:true,results:null},{success:true,results:[row]},{success:true,results:[row,next,next]},
    {success:true,results:[row,row]},{success:true,results:[row,{...next,day:'2026-10-23'}]},
    {success:true,results:[row,{...next,reserved_neurons:6025}]},
    {success:true,results:[row,{...next,reserved_neurons:'25'}]},
    {success:true,results:[row,{...next,reserved_neurons:24}]},
    {success:true,results:[row,{...next,reserved_neurons:0}]},
    {success:true,results:[row,{...next,day:'2026-99-99'}]},
    {success:true,results:[null,next]}]){
    let calls=0;const binding={prepare(){return {async all(){calls++;return output;}};}};
    assert.deepEqual(await reserveRequesterBudget(binding),{ok:false,error:'requester_budget_unavailable'});assert.equal(calls,1);
  }
});

test('current-day helper rejects stale, future or malformed reservations at the immediate pre-AI boundary',()=>{
  const day=today(),later=nextDay(day),previous=new Date(Date.parse(day+'T00:00:00Z')-DAY_MS).toISOString().slice(0,10);
  assert.equal(requesterBudgetReservationCurrent({ok:true,day,nextDay:later}),true);
  for(const value of [null,{}, {ok:false,day,nextDay:later},{ok:'true',day,nextDay:later},
    {ok:true,day:previous,nextDay:day},{ok:true,day:later,nextDay:nextDay(later)},
    {ok:true,day,nextDay:day},{ok:true,day,nextDay:nextDay(later)},{ok:true,day:'2026-99-99',nextDay:later}])
    assert.equal(requesterBudgetReservationCurrent(value),false);
});

test('an admission crossing UTC midnight becomes unusable while its two persisted reservations remain spent',async t=>{
  let time=Date.parse('2026-12-31T23:59:59.999Z');t.mock.method(Date,'now',()=>time);
  const h=fixture('2026-12-31');try{
    const reserved=await reserveRequesterBudget(h.binding);
    assert.deepEqual(reserved,{ok:true,day:'2026-12-31',nextDay:'2027-01-01'});
    assert.equal(requesterBudgetReservationCurrent(reserved),true);
    time++;assert.equal(requesterBudgetReservationCurrent(reserved),false);
    assert.deepEqual(h.rows(),[{day:'2026-12-31',reserved_neurons:25},{day:'2027-01-01',reserved_neurons:25}]);
    h.setDay('2027-01-01');const fresh=await reserveRequesterBudget(h.binding);
    assert.equal(requesterBudgetReservationCurrent(fresh),true);
    assert.equal(h.rows().find(row=>row.day==='2027-01-01').reserved_neurons,50);
  }finally{h.close();}
});

test('many concurrent independent SQLite connections cannot over-admit or consume a rejected bucket',async()=>{
  const base=process.env.CLL_TEST_TMPDIR||tmpdir();await mkdir(base,{recursive:true});
  const directory=await mkdtemp(join(base,'cll-requester-budget-')),filename=join(directory,'budget.sqlite');
  const database=new DatabaseSync(filename);database.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000');database.exec(SCHEMA);database.close();
  const moduleUrl=new URL('../worker-requester/budget.js',import.meta.url).href;
  const source=`const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');
    (async()=>{const {REQUESTER_BUDGET_RESERVATION_SQL}=await import(workerData.moduleUrl);const db=new DatabaseSync(workerData.filename);
    db.exec('PRAGMA busy_timeout=10000');let admitted=0,rejected=0;
    for(let i=0;i<64;i++){const rows=db.prepare(REQUESTER_BUDGET_RESERVATION_SQL).all();if(rows.length===2)admitted++;else if(rows.length===0)rejected++;else throw Error('Partial admission');}
    db.close();parentPort.postMessage({admitted,rejected});})().catch(error=>{throw error});`;
  try{
    const results=await Promise.all(Array.from({length:8},()=>new Promise((resolve,reject)=>{
      const worker=new Worker(source,{eval:true,workerData:{filename,moduleUrl}});
      worker.once('message',resolve);worker.once('error',reject);worker.once('exit',code=>{if(code!==0)reject(Error('Budget test worker exited '+code));});
    })));
    assert.equal(results.reduce((sum,result)=>sum+result.admitted,0),240);
    assert.equal(results.reduce((sum,result)=>sum+result.rejected,0),272);
    const inspect=new DatabaseSync(filename);
    try{assert.deepEqual(inspect.prepare('SELECT reserved_neurons FROM requester_ai_budget ORDER BY day').all().map(row=>row.reserved_neurons),[6000,6000]);}
    finally{inspect.close();}
  }finally{
    // Remove only the known files in this newly-created temporary directory.
    for(const suffix of ['','-wal','-shm']){try{await unlink(filename+suffix);}catch(error){if(error.code!=='ENOENT')throw error;}}
    await rmdir(directory);
  }
});
