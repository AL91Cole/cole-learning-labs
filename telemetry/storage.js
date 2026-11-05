import {validateReceiptEvent} from '../src/receipt-schema.js';
export const TELEMETRY_CLEANUP_SQL="DELETE FROM lab_telemetry_counts WHERE event_date<date('now','-29 days') OR event_date>date('now')";
export const TELEMETRY_ADMISSION_SQL=`
WITH capacity(ok) AS MATERIALIZED (
 SELECT 1 WHERE COALESCE((SELECT SUM(n) FROM lab_telemetry_counts WHERE event_date=date('now')),0)<5000
)
INSERT INTO lab_telemetry_counts(event_date,lab_id,event_type,duration_band,score_band,step_band,n)
SELECT date('now'),?,?,?,?,?,1 FROM capacity WHERE ok=1
ON CONFLICT(event_date,lab_id,event_type,duration_band,score_band,step_band)
DO UPDATE SET n=lab_telemetry_counts.n+1 RETURNING n`;
export function telemetryBands(event){
  const seconds=event.activeSeconds;
  return {
    durationBand:seconds<60?'under1m':seconds<300?'1to5m':seconds<900?'5to15m':seconds<1800?'15to30m':seconds<3600?'30to60m':'60mplus',
    scoreBand:event.eventType!=='complete'?'none':event.score<50?'0to49':event.score<70?'50to69':event.score<90?'70to89':event.score<100?'90to99':'100',
    stepBand:event.stepReached===1?'1':event.stepReached<4?'2to3':'4plus'
  };
}
export async function cleanupTelemetry(db){try{return typeof db?.prepare==='function'&&(await db.prepare(TELEMETRY_CLEANUP_SQL).run())?.success===true;}catch{return false;}}
export async function storeTelemetryEvent(db,input){
  const event=validateReceiptEvent(input);if(!event||!event.collectTelemetry)return {accepted:false,error:'invalid_event'};
  if(!await cleanupTelemetry(db))return {accepted:false,error:'telemetry_unavailable'};
  const bands=telemetryBands(event);
  try{
    const result=await db.prepare(TELEMETRY_ADMISSION_SQL).bind(event.labId,event.eventType,bands.durationBand,bands.scoreBand,bands.stepBand).all();
    if(result?.success!==true||!Array.isArray(result.results))return {accepted:false,error:'telemetry_unavailable'};
    if(result.results.length===0)return {accepted:false,error:'telemetry_full'};
    if(result.results.length!==1||!Number.isSafeInteger(result.results[0].n)||result.results[0].n<1)return {accepted:false,error:'telemetry_unavailable'};
    return {accepted:true};
  }catch{return {accepted:false,error:'telemetry_unavailable'};}
}
