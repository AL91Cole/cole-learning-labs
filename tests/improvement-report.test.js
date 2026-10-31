import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {buildImprovementReport,readImprovementReport} from '../improvements/report.mjs';
import {IMPROVEMENT_RELEASE} from '../improvements/storage.js';

const NOW=Date.parse('2026-11-15T12:00:00Z');
function group({period='2026-10',activity='lab/INC-101',reports=31,outcome={finished:26,needed_help:5},attempts={one:31},issue={none:31}}={}){
  const base={scope:'month',period,release:IMPROVEMENT_RELEASE,activity};
  return [{...base,metric:'reports',bucket:'all',n:reports},...Object.entries({outcome,attempts,issue}).flatMap(([metric,values])=>Object.entries(values).map(([bucket,n])=>({...base,metric,bucket,n})))];
}

test('reports omit small groups, current month, expired periods and global quotas',()=>{
  const rows=[...group(),...group({activity:'lab/INC-102',reports:19,outcome:{finished:19},attempts:{one:19},issue:{none:19}}),...group({period:'2026-11'}),...group({period:'2026-08'}),{scope:'minute',period:'2026-10-31T12:00',n:30}];
  const result=buildImprovementReport(rows,{now:NOW});assert.equal(result.reports.length,1);assert.equal(result.reports[0].period,'2026-10');assert.equal(result.reports[0].activity,'lab/INC-101');
  assert.equal(result.reports[0].reports,30);assert.equal(result.reports[0].outcome.finished,20);assert.equal(result.reports[0].outcome.needed_help,'suppressed');assert.equal(result.reports[0].outcome.not_finished,0);
  assert.doesNotMatch(JSON.stringify(result),/2026-11|2026-08|2026-10-31T12:00|INC-102/);
  assert.match(result.interpretation,/not unique people/);assert.match(result.interpretation,/do not guarantee anonymity/);
});

test('exact threshold and old retained closed month use the same independent rounding',()=>{
  const result=buildImprovementReport(group({period:'2026-09',reports:20,outcome:{finished:20},attempts:{four_plus:20},issue:{controls:20}}),{now:NOW});
  assert.equal(result.reports.length,1);assert.equal(result.reports[0].reports,20);assert.equal(result.reports[0].attempts.four_plus,20);assert.equal(result.reports[0].issue.controls,20);
});

test('invalid identities, release labels and inconsistent aggregate snapshots cannot leak into reports',()=>{
  for(const change of [{activity:'school/PRIVATE_CANARY'},{release:'PRIVATE_CANARY'},{period:'2026-99'},{n:1.5},{n:0},{bucket:'private-text'},{metric:'private-text'}]){
    const rows=group();rows[0]={...rows[0],...change};assert.throws(()=>buildImprovementReport(rows,{now:NOW}),/invalid or inconsistent/);
  }
  const missing=group().slice(1);assert.throws(()=>buildImprovementReport(missing,{now:NOW}),/invalid or inconsistent/);
  const duplicated=group();duplicated.push({...duplicated[0]});assert.throws(()=>buildImprovementReport(duplicated,{now:NOW}),/invalid or inconsistent/);
});

test('owner report reads a local SQLite file without changing it and accepts no web source',async t=>{
  const folder=await mkdtemp(join(process.env.CLL_TEST_TMPDIR||tmpdir(),'cll-improvement-report-'));t.after(()=>rm(folder,{recursive:true,force:true}));
  const filename=join(folder,'local.sqlite'),database=new DatabaseSync(filename);
  database.exec(await readFile(new URL('../improvements/0001_improvements.sql',import.meta.url),'utf8'));
  const insert=database.prepare('INSERT INTO improvement_counts(scope,period,release,activity,metric,bucket,n) VALUES(?,?,?,?,?,?,?)');
  for(const row of group())insert.run(row.scope,row.period,row.release,row.activity,row.metric,row.bucket,row.n);
  database.close();const before=await readFile(filename);const report=readImprovementReport(filename,{now:NOW});
  assert.equal(report.reports.length,1);assert.deepEqual(await readFile(filename),before);
  assert.throws(()=>readImprovementReport('https://example.test/private.sqlite'));
  const source=await readFile(new URL('../improvements/report.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|node:https?|wrangler|process\.env|request\.headers/);
});
