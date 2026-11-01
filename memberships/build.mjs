import {build} from 'esbuild';
import {mkdir,copyFile,writeFile,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('./',import.meta.url));
const output=path.join(root,'dist');
await mkdir(path.join(output,'public'),{recursive:true});
const publicFiles=['index.html','membership.js','membership.css'];
const actual=(await readdir(path.join(root,'public'))).sort();
if(JSON.stringify(actual)!==JSON.stringify([...publicFiles].sort()))throw new Error('Membership public asset manifest requires review.');
for(const filename of publicFiles)await copyFile(path.join(root,'public',filename),path.join(output,'public',filename));
await build({entryPoints:[path.join(root,'worker.js')],outfile:path.join(output,'worker.mjs'),bundle:true,
  format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','worker','browser','import'],
  mainFields:['module','main'],external:['node:*'],minify:true,sourcemap:false,logLevel:'warning'});
const bytes=await readFile(path.join(output,'worker.mjs'));
const receipt={bytes:bytes.byteLength,sha256:createHash('sha256').update(bytes).digest('hex'),sourceReleaseApproved:false,liveBillingReviewed:false,pricingApproved:false};
await writeFile(path.join(output,'build-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(`Built disabled membership module (${receipt.bytes} bytes) and three separate public preview assets. No deployment was made.`);
