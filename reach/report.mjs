import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validateReachEvent} from '../src/reach-schema.js';

export function summarizeReach(rows,{now=new Date()}={}){
  if(!Array.isArray(rows)||rows.length>1000)throw new Error('Expected a bounded reach-count export.');
  const end=now.toISOString().slice(0,7),first=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-2,1)).toISOString().slice(0,7),seen=new Set();
  return rows.filter(row=>row.scope==='month').map(row=>{
    if(!/^20\d\d-(?:0[1-9]|1[0-2])$/u.test(row.period)||!validateReachEvent({version:1,activity:row.activity,metric:row.metric})||!Number.isSafeInteger(row.n)||row.n<1)throw new Error('Invalid aggregate row.');
    const key=row.period+'/'+row.activity+'/'+row.metric;if(seen.has(key))throw new Error('Duplicate aggregate row.');seen.add(key);
    if(row.period<first||row.period>=end)return null;
    return {month:row.period,activity:row.activity,metric:row.metric,total:row.n<10?'Suppressed (<10)':String(Math.floor(row.n/5)*5)};
  }).filter(Boolean).sort((a,b)=>(a.month+a.activity+a.metric).localeCompare(b.month+b.activity+b.metric));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Usage: node reach/report.mjs input.json output.csv');
  const raw=await readFile(input,'utf8');if(Buffer.byteLength(raw)>250000)throw new Error('Export exceeds limit.');
  const data=JSON.parse(raw),rows=Array.isArray(data?.[0]?.results)?data[0].results:data;
  const report=summarizeReach(rows),csv=['month,activity,metric,engaged_browser_events',...report.map(row=>[row.month,row.activity,row.metric,row.total].join(','))].join('\n')+'\n';
  await writeFile(output,csv,{flag:'wx'});
  console.log('Created completed-month aggregate report. Counts are events, not unique or verified people.');
}
