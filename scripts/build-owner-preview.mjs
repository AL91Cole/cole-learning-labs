import {lstat,realpath,readdir,mkdtemp,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareProtectedAssets} from '../memberships/build.mjs';
import {bundleTier} from './tier-bundles.mjs';

const PROJECT_ROOT=fileURLToPath(new URL('../',import.meta.url));
export const OWNER_PREVIEW_BRANCH='codex/private-owner-preview';
export const OWNER_PREVIEW_HOST='codex-private-owner-preview.cole-learning-labs.pages.dev';
export const OWNER_GUARD_PATHS=Object.freeze(['/','/learn/','/learn/src/app.js','/learn/src/member-app.css','/learn/assets/cole-learning-labs-pop-quizzes.pdf']);
const ALLOWED_HTML=new Set(['index.html','school-it.html','ai-use-notice.html','secure-reports.html','student-workbook.html','practice-quizzes.html']);
const ALLOWED_JS=new Set(['src/app.js','src/report-crypto.js','src/secure-reports.js']);
const ROOT_HTML='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Owner lab workspace</title><main><h1>Owner lab workspace</h1><p>Full lab content with local authored replies. No subscription or payment is needed here.</p><p><a href="/learn/">Open your labs</a></p><p>Use fictional information. Classroom collection and online AI are unavailable in this workspace.</p></main></html>\n';
const NOT_FOUND='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Not found</title><p>Not found.</p></html>\n';
export const OWNER_PREVIEW_ROUTES=Object.freeze({version:1,include:Object.freeze(['/*']),exclude:Object.freeze(['/*'])});
export const OWNER_PREVIEW_HEADERS=`/*
  Cache-Control: private, no-store, max-age=0, no-transform
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  X-Frame-Options: DENY
  Strict-Transport-Security: max-age=31536000
  Permissions-Policy: camera=(), microphone=(), geolocation=(), display-capture=(), usb=(), serial=(), hid=(), payment=()
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'; worker-src 'none'; upgrade-insecure-requests
`;

function requirePrivateBranch(environment){
  if(environment?.CF_PAGES!=='1'||environment.CF_PAGES_BRANCH!==OWNER_PREVIEW_BRANCH)throw new Error('Owner preview build is restricted to its reviewed Pages preview branch.');
}

function guardConfiguration(environment){
  const value=environment.CLL_OWNER_ACCESS_ISSUER;
  if(typeof value!=='string'||!/^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/u.test(value))throw new Error('Owner Access guard is not configured.');
  const issuer=new URL(value);if(issuer.origin!==value)throw new Error('Owner Access guard is not configured.');
  const canary=environment.CLL_OWNER_ACCESS_CANARY_HOST;
  if(typeof canary!=='string'||!/^[a-f0-9]{8}\.cole-learning-labs\.pages\.dev$/u.test(canary))throw new Error('Owner Access canary is not configured.');
  return {issuer,hosts:[OWNER_PREVIEW_HOST,canary]};
}

/** Anonymous probes are read-only. Never follow a login redirect or send an
 * identity, cookie, token, operator email or existing browser session. */
export async function verifyOwnerPreviewAccess(environment,{fetcher=globalThis.fetch,timeoutMs=5000}={}){
  requirePrivateBranch(environment);
  const {issuer,hosts}=guardConfiguration(environment);
  if(typeof fetcher!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)throw new Error('Owner Access guard is unavailable.');
  const probes=hosts.flatMap(host=>OWNER_GUARD_PATHS.map(pathname=>({host,pathname})));
  const results=await Promise.allSettled(probes.map(async({host,pathname})=>{
    const controller=new AbortController();let timer,response;
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Owner Access guard failed.'));},timeoutMs);});
    try{
      response=await Promise.race([deadline,fetcher('https://'+host+pathname,{
        method:'GET',redirect:'manual',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
        headers:{Accept:'text/html'},signal:controller.signal})]);
      if(response.status!==302)throw new Error('Owner Access guard failed.');
      const location=response.headers.get('Location');if(!location||location.length>16384)throw new Error('Owner Access guard failed.');
      const login=new URL(location);
      if(login.origin!==issuer.origin||login.username||login.password||login.hash||
        login.pathname!=='/cdn-cgi/access/login/'+host)throw new Error('Owner Access guard failed.');
    }catch{controller.abort();throw new Error('Owner Access guard failed.');}
    finally{clearTimeout(timer);void response?.body?.cancel().catch(()=>{});}
  }));
  if(results.some(result=>result.status!=='fulfilled'))throw new Error('Owner Access guard failed; no owner artifact was prepared.');
  return true;
}

function approvedAssetName(name){
  if(typeof name!=='string'||!name.startsWith('/learn/')||/[\\%\u0000-\u0020\u007f]/u.test(name))throw new Error('Unreviewed owner asset path.');
  if(name==='/learn/')return null; // Its explicit index.html is written once.
  const relative=name.slice('/learn/'.length);
  if(!/^[A-Za-z0-9_./-]+$/u.test(relative)||relative.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Unreviewed owner asset path.');
  const extension=path.posix.extname(relative);
  if(extension==='.html'&&!ALLOWED_HTML.has(relative)||extension==='.js'&&!ALLOWED_JS.has(relative)||
    extension==='.css'&&!/^src\/[a-z0-9-]+\.css$/u.test(relative)||
    ['.png','.svg','.pdf'].includes(extension)&&!/^assets\/[A-Za-z0-9_-]+\.(?:png|svg|pdf)$/u.test(relative)||
    !['.html','.js','.css','.png','.svg','.pdf'].includes(extension))throw new Error('Unreviewed owner asset type.');
  return 'learn/'+relative;
}

async function inspectOutput(root,directory){
  if(path.dirname(directory)!==root||path.basename(directory)!=='dist')throw new Error('Owner output escaped the reviewed directory.');
  let info;try{info=await lstat(directory);}catch(error){if(error.code==='ENOENT')return false;throw error;}
  if(info.isSymbolicLink()||!info.isDirectory()||await realpath(directory)!==directory)throw new Error('Owner output must be a canonical directory.');
  const visit=async folder=>{for(const entry of await readdir(folder,{withFileTypes:true})){const filename=path.join(folder,entry.name),item=await lstat(filename);if(item.isSymbolicLink())throw new Error('Owner output contains a link.');if(item.isDirectory())await visit(filename);else if(!item.isFile())throw new Error('Owner output contains a nonregular file.');}};
  await visit(directory);return true;
}

/** Dependency injection is for offline tests, never request/browser settings.
 * The ordinary public build remains scripts/build.mjs and its free allowlist. */
export async function buildOwnerPreview({sourceRoot=PROJECT_ROOT,environment=process.env,
  guard=verifyOwnerPreviewAccess,prepare=prepareProtectedAssets,bundler=bundleTier}={}){
  requirePrivateBranch(environment);
  if(await guard(environment)!==true)throw new Error('Owner Access guard did not approve the preview.');
  const requested=path.resolve(sourceRoot),info=await lstat(requested);
  if(info.isSymbolicLink()||!info.isDirectory())throw new Error('Owner source root must be a canonical directory.');
  const root=await realpath(requested),output=path.join(root,'dist');
  const {assets}=await prepare({sourceRoot:root,bundler:options=>bundler({...options,localOnly:true,ownerPreview:true})});
  if(!(assets instanceof Map)||!assets.has('/learn/index.html')||!assets.has('/learn/src/app.js'))throw new Error('Owner assets are incomplete.');
  const files=new Map([['index.html',ROOT_HTML],['404.html',NOT_FOUND],['_headers',OWNER_PREVIEW_HEADERS],
    ['_routes.json',JSON.stringify(OWNER_PREVIEW_ROUTES,null,2)+'\n'],['robots.txt','User-agent: *\nDisallow: /\n']]);
  for(const [name,asset]of assets){
    const filename=approvedAssetName(name);if(!filename)continue;
    if(!(asset?.bytes instanceof Uint8Array))throw new Error('Invalid owner asset bytes.');
    let bytes=asset.bytes;
    if(filename.endsWith('.html')){
      // No production/member canonical metadata is attached to a private copy.
      const html=new TextDecoder('utf-8',{fatal:true}).decode(bytes)
        .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/giu,'')
        .replace(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/giu,'');
      bytes=new TextEncoder().encode(html);
    }
    files.set(filename,bytes);
  }
  await inspectOutput(root,output);
  const staging=await mkdtemp(path.join(root,'.publish-stage-owner-'));
  try{
    for(const [filename,bytes]of files){const target=path.join(staging,filename);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes,{flag:'wx'});}
    // Recheck immediately before exposing the upload directory. No deployment
    // is performed here, and a later Access policy change remains operational.
    if(await guard(environment)!==true)throw new Error('Owner Access guard did not approve the preview.');
    if(await inspectOutput(root,output))await rm(output,{recursive:true});
    await rename(staging,output);
    return {directory:output,files:[...files.keys()]};
  }catch(error){
    if(path.dirname(staging)===root&&path.basename(staging).startsWith('.publish-stage-owner-')&&await realpath(staging)===staging)await rm(staging,{recursive:true});
    throw error;
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length>2)throw new Error('Owner preview build accepts no destination arguments.');
    const result=await buildOwnerPreview();
    console.log(`Prepared ${result.files.length} static owner-preview files after anonymous Access guards. No deployment was made.`);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
