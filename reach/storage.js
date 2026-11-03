import {validateReachEvent} from '../src/reach-schema.js';

export const REACH_ADMISSION_SQL=`
WITH clock(month,day,minute) AS MATERIALIZED (
 SELECT strftime('%Y-%m','now'),date('now'),strftime('%Y-%m-%dT%H:%M','now')
), capacity(ok) AS MATERIALIZED (
 SELECT 1 FROM clock WHERE
 COALESCE((SELECT n FROM reach_counts WHERE scope='day' AND period=clock.day AND activity='*' AND metric='admissions'),0)<5000
 AND COALESCE((SELECT n FROM reach_counts WHERE scope='minute' AND period=clock.minute AND activity='*' AND metric='admissions'),0)<100
), payload(activity,metric) AS MATERIALIZED (VALUES(?,?)), additions(scope,period,activity,metric,n) AS (
 SELECT 'month',month,activity,metric,1 FROM clock,payload
 UNION ALL SELECT 'day',day,'*','admissions',1 FROM clock
 UNION ALL SELECT 'minute',minute,'*','admissions',1 FROM clock
)
INSERT INTO reach_counts SELECT additions.* FROM additions CROSS JOIN capacity WHERE capacity.ok=1
ON CONFLICT(scope,period,activity,metric) DO UPDATE SET n=reach_counts.n+1
RETURNING scope,n`;
export const REACH_CLEANUP_SQL=`DELETE FROM reach_counts WHERE
 (scope='month' AND period<strftime('%Y-%m','now','start of month','-2 months'))
 OR (scope='day' AND period<date('now','-1 day'))
 OR (scope='minute' AND period<strftime('%Y-%m-%dT%H:%M','now','-2 minutes'))`;
export async function cleanupReachCounts(db){try{return typeof db?.prepare==='function'&&(await db.prepare(REACH_CLEANUP_SQL).run())?.success===true;}catch{return false;}}
export async function storeReachEvent(db,event){
  const valid=validateReachEvent(event);if(!valid)return {accepted:false,error:'invalid_event'};
  if(!await cleanupReachCounts(db))return {accepted:false,error:'reach_unavailable'};
  try{
    const result=await db.prepare(REACH_ADMISSION_SQL).bind(valid.activity,valid.metric).all();
    if(result?.success!==true||!Array.isArray(result.results))return {accepted:false,error:'reach_unavailable'};
    if(result.results.length===0)return {accepted:false,error:'reach_full'};
    if(result.results.length!==3||result.results.some(row=>!Number.isSafeInteger(row.n)||row.n<1)||result.results.map(row=>row.scope).sort().join(',')!=='day,minute,month')return {accepted:false,error:'reach_unavailable'};
    return {accepted:true};
  }catch{return {accepted:false,error:'reach_unavailable'};}
}
