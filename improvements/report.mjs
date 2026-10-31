import {DatabaseSync} from 'node:sqlite';
import {lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {IMPROVEMENT_ACTIVITIES,IMPROVEMENT_OUTCOMES,IMPROVEMENT_ATTEMPTS,IMPROVEMENT_ISSUES} from '../src/improvement-schema.js';

const activities=new Map(IMPROVEMENT_ACTIVITIES.map(item=>[item.id,item.title]));
const dimensions={outcome:IMPROVEMENT_OUTCOMES,attempts:IMPROVEMENT_ATTEMPTS,issue:IMPROVEMENT_ISSUES};
// Add new reviewed releases; retain old entries until their database rows expire.
// This registry is deliberately independent of the collector's current release.
export const IMPROVEMENT_REPORT_RELEASES=Object.freeze(['20261031-opt-in-results']);
export const IMPROVEMENT_REPORT_THRESHOLD=20;
export const IMPROVEMENT_REPORT_ROUNDING=10;
const invalid=()=>{throw new Error('The aggregate snapshot is invalid or inconsistent.');};
const rounded=n=>Math.floor(n/IMPROVEMENT_REPORT_ROUNDING)*IMPROVEMENT_REPORT_ROUNDING;

/** Fixed, closed-period report. Thresholds count submissions, not people, and
 * provide no formal k-anonymity or differential-privacy guarantee. */
export function buildImprovementReport(rows,{now=Date.now()}={}){
  const date=new Date(now);
  if(!Number.isFinite(date.getTime())||!Array.isArray(rows)||rows.length>10000)invalid();
  const current=date.toISOString().slice(0,7);
  const earliest=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-2,1)).toISOString().slice(0,7);
  const groups=new Map(),seen=new Set();
  for(const row of rows){
    if(!row||row.scope!=='month')continue;
    if(typeof row.period!=='string'||!/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(row.period)||
      !IMPROVEMENT_REPORT_RELEASES.includes(row.release)||!activities.has(row.activity)||
      !Number.isSafeInteger(row.n)||row.n<1||row.n>50000)invalid();
    if(row.metric==='reports'?row.bucket!=='all':!dimensions[row.metric]?.includes(row.bucket))invalid();
    if(row.period>=current||row.period<earliest)continue;
    const key=JSON.stringify([row.period,row.release,row.activity]);
    const cell=JSON.stringify([key,row.metric,row.bucket]);
    if(seen.has(cell))invalid();seen.add(cell);
    if(!groups.has(key))groups.set(key,{period:row.period,release:row.release,activity:row.activity,title:activities.get(row.activity),reports:0,...Object.fromEntries(Object.entries(dimensions).map(([metric,values])=>[metric,Object.fromEntries(values.map(value=>[value,0]))]))});
    const group=groups.get(key);
    if(row.metric==='reports')group.reports=row.n;else group[row.metric][row.bucket]=row.n;
  }
  const reports=[];
  for(const group of groups.values()){
    if(group.reports<1||Object.keys(dimensions).some(metric=>Object.values(group[metric]).reduce((a,b)=>a+b,0)!==group.reports))invalid();
    if(group.reports<IMPROVEMENT_REPORT_THRESHOLD)continue;
    reports.push({...group,reports:rounded(group.reports),...Object.fromEntries(Object.keys(dimensions).map(metric=>[metric,Object.fromEntries(Object.entries(group[metric]).map(([bucket,n])=>[bucket,n===0?0:n<IMPROVEMENT_REPORT_THRESHOLD?'suppressed':rounded(n)]))]))});
  }
  reports.sort((a,b)=>a.period.localeCompare(b.period)||a.activity.localeCompare(b.activity));
  return {version:1,interpretation:'Unverified voluntary summaries, not unique people or attendance. Small groups are omitted and positive small cells suppressed; rounding and thresholds do not guarantee anonymity.',periods:'Closed UTC calendar months within the retained three-month window; no current-month counts.',minimumReports:IMPROVEMENT_REPORT_THRESHOLD,rounding:IMPROVEMENT_REPORT_ROUNDING,reports};
}

/** Reads an operator-held SQLite file locally, read-only. No URLs, network,
 * credentials, custom query, public endpoint or database provisioning. */
export function readImprovementReport(filename,options={}){
  const resolved=path.resolve(filename),info=lstatSync(resolved);
  if(!info.isFile()||info.isSymbolicLink())throw new Error('Select a regular local SQLite snapshot.');
  const actual=realpathSync(resolved);
  if(actual!==resolved)throw new Error('Linked database paths are not supported.');
  const database=new DatabaseSync(actual,{readOnly:true});
  try{
    const rows=database.prepare("SELECT scope,period,release,activity,metric,bucket,n FROM improvement_counts WHERE scope='month' LIMIT 10001").all();
    return buildImprovementReport(rows,options);
  }finally{database.close();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3){console.error('Usage: node improvements/report.mjs <operator-owned-local.sqlite>');process.exitCode=1;}
  else{
    try{process.stdout.write(JSON.stringify(readImprovementReport(process.argv[2]),null,2)+'\n');}
    catch{console.error('The local aggregate report could not be created. Check the reviewed snapshot and schema.');process.exitCode=1;}
  }
}
