import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url));
const files=[];
async function scan(folder){
  for(const entry of await readdir(folder,{withFileTypes:true})){
    if(['node_modules','dist','.wrangler'].includes(entry.name))continue;
    const filename=path.join(folder,entry.name);
    if(entry.isDirectory())await scan(filename);else if(/\.m?js$/u.test(entry.name))files.push(filename);
  }
}
await scan(root);
for(const filename of files){const result=spawnSync(process.execPath,['--check',filename],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
for(const filename of ['worker.js','billing.js','public/membership.js']){
  const source=await readFile(path.join(root,filename),'utf8');
  const gate=filename==='worker.js'?'MEMBERSHIP_SOURCE_RELEASE_APPROVED=false':filename==='billing.js'?'LIVE_BILLING_REVIEW_APPROVED=false':'MEMBERSHIP_CLIENT_RELEASE_APPROVED=false';
  if(!source.includes(gate))throw new Error('Membership release gate changed; separate review required.');
}
console.log(`Syntax checked ${files.length} isolated membership modules; release gates remain closed.`);
