import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from '../.graphics-vendor/node_modules/esbuild/lib/main.js';

// Install exact packages with scripts disabled in the ignored isolated folder.
// The regular site build and CI use this reviewed artifact, without npm install.
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const sha=text=>createHash('sha256').update(text).digest('hex');
const expected={core:'9.31.0',esbuild:'0.28.2',guid:'38f5c60124c605674eef651c88356cd90c1ce4c51685ff1e321457fb307a16dc',webRequest:'54738dfb01394754e72a9260923c23dfcead19be4f97398ca5ad58c02fa67f05'};
if(JSON.parse(read('.graphics-vendor/node_modules/@babylonjs/core/package.json')).version!==expected.core||JSON.parse(read('.graphics-vendor/node_modules/esbuild/package.json')).version!==expected.esbuild)throw Error('Unexpected graphics build dependency version.');
const result=await build({absWorkingDir:fileURLToPath(root),entryPoints:['scripts/babylon-entry.mjs'],bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,legalComments:'inline',write:false,metafile:true,splitting:false,plugins:[{name:'graphics-local-security',setup(builder){builder.onLoad({filter:/[/\\]Misc[/\\](?:guid|webRequest)\.js$/},({path})=>{
  const original=readFileSync(path,'utf8');
  if(/webRequest\.js$/.test(path)){
    if(sha(original)!==expected.webRequest)throw Error('The upstream URL check changed; review the patch again.');
    const previous='return WebRequest.SkipRequestModificationForBabylonCDN && (url.includes("preview.babylonjs.com") || url.includes("cdn.babylonjs.com"));';
    if(!original.includes(previous))throw Error('Expected upstream URL check was not found.');
    return {loader:'js',contents:original.replace(previous,`if (!WebRequest.SkipRequestModificationForBabylonCDN || typeof url !== 'string') return false;
        try {
            const target = new URL(url);
            return target.protocol === 'https:' && target.username === '' && target.password === '' && target.port === '' &&
                (target.hostname === 'preview.babylonjs.com' || target.hostname === 'cdn.babylonjs.com');
        } catch { return false; }`)};
  }
  if(sha(original)!==expected.guid)throw Error('The upstream GUID implementation changed; review the patch again.');
  const contents=original.replace(/export function RandomGUID\(\) \{[\s\S]*?\n\}/,`export function RandomGUID() {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
  }`);return {contents,loader:'js'};
});}}],banner:{js:'/* Babylon.js 9.31.0 — Apache-2.0. Selected self-hosted ESM bundle; CSPRNG GUID and exact HTTPS hostname patches. See assets/babylon-LICENSE.txt, assets/babylon-NOTICE.txt and docs/THIRD-PARTY.md. */'}});
const text=result.outputFiles[0].text;
if(/\bimport\s*\(|\bfrom\s*["'](?:https?:|@babylonjs)/.test(text))throw Error('The graphics bundle must not leave runtime module requests.');
writeFileSync(new URL('src/babylon.js',root),text);
for(const [source,target] of [['license.md','babylon-LICENSE.txt'],['NOTICE.md','babylon-NOTICE.txt']])writeFileSync(new URL('assets/'+target,root),read('.graphics-vendor/node_modules/@babylonjs/core/'+source));
const lock=JSON.parse(read('.graphics-vendor/package-lock.json'));
const packages=Object.fromEntries(Object.entries(lock.packages).filter(([key])=>key).map(([key,item])=>[key,{version:item.version,integrity:item.integrity,resolved:item.resolved,optional:item.optional||false}]));
const manifest={engine:'@babylonjs/core',version:expected.core,bundler:'esbuild',bundlerVersion:expected.esbuild,patches:{guidUpstreamSha256:expected.guid,urlValidationUpstreamSha256:expected.webRequest,description:'Graphics GUIDs use CSPRNG without weak fallback. CDN request-modification checks parse URLs and require exact HTTPS hostnames, no credentials or non-default port.'},entrySha256:sha(read('scripts/babylon-entry.mjs')),bundleSha256:sha(text),bundleBytes:Buffer.byteLength(text),packages};
writeFileSync(new URL('docs/BABYLON-SUPPLY-CHAIN.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({bytes:manifest.bundleBytes,sha256:manifest.bundleSha256,inputModules:Object.keys(result.metafile.inputs).length}));
