import {build} from 'esbuild';
import {constants} from 'node:fs';
import {mkdir,writeFile,readdir,lstat,realpath,open,mkdtemp,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {MEMBER_FILES} from '../scripts/build.mjs';
import {bundleTier} from '../scripts/tier-bundles.mjs';

const root=fileURLToPath(new URL('./',import.meta.url));
const siteRoot=fileURLToPath(new URL('../',import.meta.url));
const PUBLIC_FILES=Object.freeze(['index.html','membership.js','membership.css']);
const OMIT=new Set(['404.html','classroom.html','teacher/index.html','src/classroom-portal.js','src/classroom-portal.css',
  '_headers','_routes.json','_redirects','robots.txt','sitemap.xml']);
// The main application is self-contained after bundling. These two modules are
// needed only by the separate local report page; its import graph is reviewed.
const STANDALONE_JS=new Set(['src/app.js','src/secure-reports.js','src/report-crypto.js']);
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf','.json':'application/json; charset=utf-8'};
const encoder=new TextEncoder();
const stripRelease=text=>text.replace(/\?release=[A-Za-z0-9_.-]+/gu,'');
const validRelative=filename=>typeof filename==='string'&&/^[A-Za-z0-9_./-]+$/u.test(filename)&&
  filename.split('/').every(part=>part&&part!=='.'&&part!=='..')&&!path.isAbsolute(filename);

async function canonicalBytes(sourceRoot,filename){
  if(!validRelative(filename))throw new Error('Invalid protected asset path.');
  const rootPath=await realpath(sourceRoot);
  for(let current=rootPath,parts=filename.split('/'),index=0;index<parts.length;index++){
    current=path.join(current,parts[index]);const info=await lstat(current);
    if(info.isSymbolicLink()||(index<parts.length-1?!info.isDirectory():!info.isFile()))throw new Error('Protected assets must be canonical regular files.');
  }
  const target=path.join(rootPath,filename),before=await lstat(target);
  if(await realpath(target)!==target)throw new Error('Protected asset resolves outside its approved path.');
  const handle=await open(target,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{const current=await handle.stat();if(!current.isFile()||current.dev!==before.dev||current.ino!==before.ino)throw new Error('Protected asset changed while being read.');return new Uint8Array(await handle.readFile());}
  finally{await handle.close();}
}

function privateText(text,html=false){
  let result=stripRelease(text);
  if(html){
    result=result.replace(/<a\b[^>]*\bhref=["'](?:\.?\/?(?:classroom\.html|teacher\/[^"']*))["'][^>]*>[\s\S]*?<\/a>/giu,'');
    result=result.replace(/(\b(?:href|src)=["'])\/(?!\/|learn\/)/giu,'$1/learn/');
    result=result.replace(/(<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["'])[^"']+(["'])/giu,'$1https://members.colelearninglabs.com/learn/$2');
  }
  return result;
}

/** Private bytes stay in memory until the server-only esbuild plugin embeds
 * them. No member content is written into a static/public directory. */
export async function prepareProtectedAssets({sourceRoot=siteRoot,files=MEMBER_FILES,bundler=bundleTier}={}){
  if(!Array.isArray(files)||new Set(files).size!==files.length||files.some(filename=>!validRelative(filename)))throw new Error('Protected manifest requires review.');
  const assets=new Map();
  for(const filename of files){
    if(OMIT.has(filename))continue;
    if(filename.endsWith('.js')&&!STANDALONE_JS.has(filename))continue;
    const type=TYPES[path.posix.extname(filename)];if(!type)throw new Error('Unreviewed protected asset type.');
    const bytes=await canonicalBytes(sourceRoot,filename);
    assets.set('/learn/'+filename,{bytes:/\.(?:html|js|css|json)$/u.test(filename)?encoder.encode(privateText(new TextDecoder('utf-8',{fatal:true}).decode(bytes),filename.endsWith('.html'))):bytes,contentType:type});
  }
  if(!assets.has('/learn/index.html')||!assets.has('/learn/src/app.js'))throw new Error('Private entry files are missing.');
  const memberBundle=await bundler({sourceRoot,member:true});
  if(!(memberBundle?.javascript instanceof Uint8Array))throw new Error('Invalid private app bundle.');
  assets.set('/learn/src/app.js',{bytes:memberBundle.javascript,contentType:TYPES['.js']});
  // One stylesheet avoids a burst of paid-entitlement checks for every CSS
  // import. All existing CSS lives below src, preserving its relative URL base.
  const expand=(filename,ancestors=new Set())=>{
    if(!filename.startsWith('src/')||!filename.endsWith('.css')||ancestors.has(filename))throw new Error('Unreviewed private stylesheet import.');
    const asset=assets.get('/learn/'+filename);if(!asset)throw new Error('Missing private stylesheet.');
    const next=new Set(ancestors);next.add(filename);
    return new TextDecoder().decode(asset.bytes).replace(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?\s*;/giu,(_,specifier)=>{
      if(!specifier.startsWith('./')||/[?#\\]/u.test(specifier))throw new Error('Unreviewed private stylesheet import.');
      return expand(path.posix.join(path.posix.dirname(filename),specifier),next);
    });
  };
  for(const [name,asset]of [...assets]){
    if(!name.endsWith('.html'))continue;
    let html=new TextDecoder().decode(asset.bytes);
    const links=[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/giu)];
    if(!links.length){if(name==='/learn/index.html')throw new Error('Private stylesheet entry requires review.');continue;}
    const css=links.map(link=>expand(link[1])).join('\n');
    if(/@import\b/iu.test(css))throw new Error('Unsupported private stylesheet import.');
    const stylesheet=name==='/learn/index.html'?'member-app.css':'member-'+path.posix.basename(name,'.html')+'.css';
    assets.set('/learn/src/'+stylesheet,{bytes:encoder.encode(css),contentType:TYPES['.css']});
    for(const [index,link]of links.entries())html=html.replace(link[0],index===0?'<link rel="stylesheet" href="src/'+stylesheet+'">':'');
    assets.set(name,{bytes:encoder.encode(html),contentType:TYPES['.html']});
  }
  assets.set('/learn/',assets.get('/learn/index.html'));
  return {assets,metadata:memberBundle.metadata,inputs:memberBundle.inputs};
}

function privateAssetModule(assets){
  const entries=[...assets].map(([name,asset])=>[name,{contentType:asset.contentType,base64:Buffer.from(asset.bytes).toString('base64')}]);
  return `const entries=${JSON.stringify(entries)};export const PROTECTED_ASSETS=new Map(entries.map(([name,value])=>[name,{contentType:value.contentType,bytes:Uint8Array.from(atob(value.base64),character=>character.charCodeAt(0))}]));`;
}

export async function bundleMembershipWorker(assets){
  const result=await build({entryPoints:[path.join(root,'worker.js')],bundle:true,write:false,
    format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','worker','browser','import'],mainFields:['module','main'],
    external:['node:*'],minify:true,sourcemap:false,logLevel:'warning',plugins:[{name:'server-only-protected-assets',setup(builder){
      builder.onResolve({filter:/^\.\/protected-assets\.js$/},()=>({path:'reviewed-private-assets',namespace:'member-private'}));
      builder.onLoad({filter:/.*/,namespace:'member-private'},()=>({contents:privateAssetModule(assets),loader:'js'}));
    }}]});
  if(result.outputFiles.length!==1)throw new Error('Unexpected private worker output.');
  return new Uint8Array(result.outputFiles[0].contents);
}

async function removeGeneratedOutput(directory){
  const expected=path.join(root,'dist');if(path.resolve(directory)!==expected)throw new Error('Unexpected generated output directory.');
  let info;try{info=await lstat(directory);}catch(error){if(error.code==='ENOENT')return;throw error;}
  if(info.isSymbolicLink()||!info.isDirectory()||await realpath(directory)!==expected)throw new Error('Generated output must be a canonical directory.');
  const inspect=async folder=>{for(const entry of await readdir(folder,{withFileTypes:true})){const name=path.join(folder,entry.name),item=await lstat(name);if(item.isSymbolicLink())throw new Error('Generated output contains a link.');if(item.isDirectory())await inspect(name);else if(!item.isFile())throw new Error('Generated output contains a nonregular file.');}};
  await inspect(directory);await rm(directory,{recursive:true});
}

export async function buildMembership(){
  const actual=(await readdir(path.join(root,'public'))).sort();
  if(JSON.stringify(actual)!==JSON.stringify([...PUBLIC_FILES].sort()))throw new Error('Membership public asset manifest requires review.');
  const prepared=await prepareProtectedAssets();
  const staging=await mkdtemp(path.join(root,'.member-stage-')),output=path.join(root,'dist');
  try{
    await mkdir(path.join(staging,'public'));
    for(const filename of PUBLIC_FILES)await writeFile(path.join(staging,'public',filename),await canonicalBytes(root,'public/'+filename));
    const bytes=await bundleMembershipWorker(prepared.assets);
    await writeFile(path.join(staging,'worker.mjs'),bytes);
    const receipt={bytes:bytes.byteLength,gzipBytes:gzipSync(bytes).byteLength,sha256:createHash('sha256').update(bytes).digest('hex'),protectedAssets:prepared.assets.size,
      publicAssets:[...PUBLIC_FILES],sourceReleaseApproved:false,liveBillingReviewed:false,pricingApproved:false};
    await writeFile(path.join(staging,'build-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
    await removeGeneratedOutput(output);await rename(staging,output);
    return receipt;
  }catch(error){
    // The only temporary path is mkdtemp's direct child of this canonical root.
    if(path.dirname(staging)===root.replace(/[\\/]$/u,'')&&await realpath(staging)===staging)await rm(staging,{recursive:true});
    throw error;
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length>2)throw new Error('Membership build accepts no destination arguments.');
  const receipt=await buildMembership();
  console.log(`Built disabled membership module (${receipt.bytes} bytes), ${receipt.protectedAssets} private assets embedded only in its server bundle, and three public preview files. No deployment was made.`);
}
