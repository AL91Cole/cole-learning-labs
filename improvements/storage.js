import {validateImprovementSummary} from '../src/improvement-schema.js';
export const IMPROVEMENT_RELEASE='20261031-opt-in-results';
export const IMPROVEMENT_DAILY_CAP=500;
export const IMPROVEMENT_MINUTE_CAP=30;

// A single statement checks both shared quotas before changing ANY row. All
// six rows are admitted together: four independent marginal counters and two
// content-free global quotas. There is never an individual event/summary row.
export const IMPROVEMENT_ADMISSION_SQL=`
WITH clock(month,day,minute) AS MATERIALIZED (
  SELECT strftime('%Y-%m','now'),date('now'),strftime('%Y-%m-%dT%H:%M','now')
), capacity(ok) AS MATERIALIZED (
  SELECT 1 FROM clock WHERE
    COALESCE((SELECT n FROM improvement_counts WHERE scope='day' AND period=clock.day AND release='*' AND activity='*' AND metric='reports' AND bucket='all'),0) < 500
    AND COALESCE((SELECT n FROM improvement_counts WHERE scope='minute' AND period=clock.minute AND release='*' AND activity='*' AND metric='reports' AND bucket='all'),0) < 30
), payload(release,activity,outcome,attempts,issue) AS MATERIALIZED (
  VALUES(?,?,?,?,?)
), additions(scope,period,release,activity,metric,bucket,n) AS (
  SELECT 'month',month,release,activity,'reports','all',1 FROM clock,payload
  UNION ALL SELECT 'month',month,release,activity,'outcome',outcome,1 FROM clock,payload
  UNION ALL SELECT 'month',month,release,activity,'attempts',attempts,1 FROM clock,payload
  UNION ALL SELECT 'month',month,release,activity,'issue',issue,1 FROM clock,payload
  UNION ALL SELECT 'day',day,'*','*','reports','all',1 FROM clock
  UNION ALL SELECT 'minute',minute,'*','*','reports','all',1 FROM clock
)
INSERT INTO improvement_counts(scope,period,release,activity,metric,bucket,n)
SELECT additions.* FROM additions CROSS JOIN capacity WHERE capacity.ok=1
ON CONFLICT(scope,period,release,activity,metric,bucket) DO UPDATE SET n=improvement_counts.n+1
RETURNING scope,n`;

// Current month plus preceding two calendar months. Global quota rows do not
// describe a person: retain only today/yesterday and the last two UTC minutes.
export const IMPROVEMENT_CLEANUP_SQL=`DELETE FROM improvement_counts WHERE
  (scope='month' AND period < strftime('%Y-%m','now','start of month','-2 months'))
  OR (scope='day' AND period < date('now','-1 day'))
  OR (scope='minute' AND period < strftime('%Y-%m-%dT%H:%M','now','-2 minutes'))`;

export async function cleanupImprovementCounts(db){
  if(typeof db?.prepare!=='function')return false;
  try{
    const result=await db.prepare(IMPROVEMENT_CLEANUP_SQL).run();
    return result?.success===true;
  }catch{return false;}
}

export async function storeImprovementSummary(db,summary){
  try{
    summary=validateImprovementSummary(summary);
    if(!summary)return {accepted:false,error:'invalid_summary'};
    if(typeof db?.prepare!=='function')return {accepted:false,error:'improvements_unavailable'};
    if(!await cleanupImprovementCounts(db))return {accepted:false,error:'improvements_unavailable'};
    const result=await db.prepare(IMPROVEMENT_ADMISSION_SQL)
      .bind(IMPROVEMENT_RELEASE,summary.activity,summary.outcome,summary.attempts,summary.issue).all();
    if(result?.success!==true||!Array.isArray(result.results))return {accepted:false,error:'improvements_unavailable'};
    if(result.results.length===0)return {accepted:false,error:'improvements_full'};
    if(result.results.length!==6||result.results.some(row=>!Number.isSafeInteger(row?.n)||row.n<1))return {accepted:false,error:'improvements_unavailable'};
    const scopes=result.results.map(row=>row.scope).sort();
    if(scopes.join(',')!=='day,minute,month,month,month,month')return {accepted:false,error:'improvements_unavailable'};
    return {accepted:true};
  }catch{
    // The commit may have succeeded before a transport failure. Never retry,
    // refund, expose storage errors, or create a per-submission recovery token.
    return {accepted:false,error:'improvements_unavailable'};
  }
}
