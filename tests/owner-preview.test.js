import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,realpath,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildOwnerPreview,verifyOwnerPreviewAccess,OWNER_PREVIEW_BRANCH,OWNER_PREVIEW_HOST,OWNER_PREVIEW_ROUTES,OWNER_GUARD_PATHS} from '../scripts/build-owner-preview.mjs';
import {prepareProtectedAssets} from '../memberships/build.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const ISSUER='https://fictional-owner-team.cloudflareaccess.com';
const CANARY='abc123ef.cole-learning-labs.pages.dev';
const environment=()=>({CF_PAGES:'1',CF_PAGES_BRANCH:OWNER_PREVIEW_BRANCH,
  CLL_OWNER_ACCESS_ISSUER:ISSUER,CLL_OWNER_ACCESS_CANARY_HOST:CANARY});
const encode=text=>new TextEncoder().encode(text);
const login=url=>ISSUER+'/cdn-cgi/access/login/'+new URL(url).hostname+'?fictional=not-a-credential';
async function fixture(t){
  const root=await mkdtemp(path.join(tmpdir(),'cll-owner-preview-test-'));
  t.after(async()=>{
    const parent=await realpath(tmpdir());assert.equal(path.dirname(await realpath(root)),parent);
    assert.ok(path.basename(root).startsWith('cll-owner-preview-test-'));await rm(root,{recursive:true});
  });
  await mkdir(path.join(root,'dist'));await writeFile(path.join(root,'dist','old.txt'),'OLD_FREE_BUILD');
  const assets=new Map([
    ['/learn/',{bytes:encode('alias'),contentType:'text/html; charset=utf-8'}],
    ['/learn/index.html',{bytes:encode('<!doctype html><link rel="canonical" href="https://members.colelearninglabs.com/learn/"><meta property="og:url" content="https://colelearninglabs.com/"><script type="module" src="src/app.js"></script>PRIVATE_PREVIEW_CONTENT'),contentType:'text/html; charset=utf-8'}],
    ['/learn/src/app.js',{bytes:encode('const authoredLocalOnly=true;'),contentType:'application/javascript; charset=utf-8'}],
    ['/learn/src/member-app.css',{bytes:encode('body{color:green}'),contentType:'text/css; charset=utf-8'}]
  ]);
  let guards=0;
  const options={sourceRoot:root,environment:environment(),guard:async()=>{guards++;return true;},prepare:async()=>({assets})};
  return {root,assets,options,guards:()=>guards};
}

test('the owner builder refuses public, missing and misleading branch flags before guard, files or app preparation',async()=>{
  const poison=()=>assert.fail('Closed branch reached a build dependency.');
  for(const env of [{},{CF_PAGES:'true',CF_PAGES_BRANCH:OWNER_PREVIEW_BRANCH},{CF_PAGES:'1',CF_PAGES_BRANCH:'main'},
    {CF_PAGES:'1',CF_PAGES_BRANCH:OWNER_PREVIEW_BRANCH+'-copy'},{CF_PAGES:1,CF_PAGES_BRANCH:OWNER_PREVIEW_BRANCH}]){
    await assert.rejects(buildOwnerPreview({environment:env,guard:poison,prepare:poison,sourceRoot:'missing-source'}),/restricted/u);
  }
});

test('anonymous guards cover branch/hash documents and direct assets with exact host-specific Access login redirects',async()=>{
  const calls=[];
  assert.equal(await verifyOwnerPreviewAccess(environment(),{fetcher:async(url,options)=>{
    calls.push({url,options});return new Response(null,{status:302,headers:{Location:login(url)}});
  }}),true);
  assert.equal(calls.length,OWNER_GUARD_PATHS.length*2);
  for(const host of [OWNER_PREVIEW_HOST,CANARY])assert.deepEqual(calls.filter(call=>new URL(call.url).hostname===host).map(call=>new URL(call.url).pathname),OWNER_GUARD_PATHS);
  for(const {url,options}of calls){
    assert.ok(OWNER_GUARD_PATHS.includes(new URL(url).pathname));assert.equal(options.redirect,'manual');
    assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');
    assert.deepEqual(options.headers,{Accept:'text/html'});assert.equal(options.method,'GET');
  }
});

test('invalid issuer/canary settings cannot cause an outbound probe to an arbitrary destination',async()=>{
  const poison=()=>assert.fail('Malformed guard configuration performed a fetch.');
  for(const settings of [{CLL_OWNER_ACCESS_ISSUER:undefined},{CLL_OWNER_ACCESS_ISSUER:'https://evil.example.test'},
    {CLL_OWNER_ACCESS_ISSUER:ISSUER+'/'},{CLL_OWNER_ACCESS_ISSUER:ISSUER+'.evil.example.test'},
    {CLL_OWNER_ACCESS_ISSUER:ISSUER.replace('https:','http:')},{CLL_OWNER_ACCESS_CANARY_HOST:'abc123ef.evil.example.test'},
    {CLL_OWNER_ACCESS_CANARY_HOST:OWNER_PREVIEW_HOST}]){
    await assert.rejects(verifyOwnerPreviewAccess({...environment(),...settings},{fetcher:poison}),/configured/u);
  }
});

test('a public response, unrelated redirect, wrong login path or credential-bearing URL fails the Access guard',async()=>{
  for(const make of [()=>new Response('PUBLIC_BYTES'),url=>new Response(null,{status:301,headers:{Location:login(url)}}),
    ()=>new Response(null,{status:302,headers:{Location:'https://evil.example.test/login'}}),
    ()=>new Response(null,{status:302,headers:{Location:ISSUER+'/other-login'}}),
    url=>new Response(null,{status:302,headers:{Location:login(url)+'#fragment'}}),
    url=>new Response(null,{status:302,headers:{Location:login(url).replace('https://','https://fictional:password@')}})]){
    await assert.rejects(verifyOwnerPreviewAccess(environment(),{fetcher:async url=>make(url)}),/guard failed/u);
  }
});

test('one unprotected hostname is enough to reject the artifact and rejected response bodies are canceled',async()=>{
  let cancelled=false;
  await assert.rejects(verifyOwnerPreviewAccess(environment(),{fetcher:async url=>new URL(url).hostname===CANARY?
    new Response(new ReadableStream({cancel(){cancelled=true;}}),{status:200}):
    new Response(null,{status:302,headers:{Location:login(url)}})}),/guard failed/u);
  assert.equal(cancelled,true);
});

test('a single direct-script bypass is rejected even when both hostname entry pages require login',async()=>{
  await assert.rejects(verifyOwnerPreviewAccess(environment(),{fetcher:async url=>new URL(url).pathname==='/learn/src/app.js'?
    new Response('PUBLIC_SCRIPT_BYTES',{status:200}):new Response(null,{status:302,headers:{Location:login(url)}})}),/guard failed/u);
});

test('a guard timeout settles even when a fetch implementation ignores cancellation',async()=>{
  const signals=[];
  await assert.rejects(verifyOwnerPreviewAccess(environment(),{timeoutMs:10,fetcher:async(url,options)=>{
    signals.push(options.signal);return new Promise(()=>{});
  }}),/guard failed/u);
  assert.equal(signals.length,OWNER_GUARD_PATHS.length*2);assert.ok(signals.every(signal=>signal.aborted));
});

test('static owner output contains only reviewed learn assets and blocks every Functions route without enabling services',async t=>{
  const h=await fixture(t),result=await buildOwnerPreview(h.options);assert.equal(h.guards(),2);
  assert.equal(await readFile(path.join(result.directory,'learn/src/app.js'),'utf8'),'const authoredLocalOnly=true;');
  assert.ok((await readFile(path.join(result.directory,'index.html'),'utf8')).includes('href="/learn/"'));
  assert.equal(await readFile(path.join(result.directory,'learn/index.html'),'utf8'),
    '<!doctype html><script type="module" src="src/app.js"></script>PRIVATE_PREVIEW_CONTENT');
  assert.deepEqual(JSON.parse(await readFile(path.join(result.directory,'_routes.json'),'utf8')),OWNER_PREVIEW_ROUTES);
  const headers=await readFile(path.join(result.directory,'_headers'),'utf8');
  for(const value of ['private, no-store','X-Robots-Tag: noindex','connect-src \'none\'','script-src \'self\'',
    'Cross-Origin-Opener-Policy: same-origin','Cross-Origin-Resource-Policy: same-origin'])assert.ok(headers.includes(value),value);
  assert.ok(!headers.includes('unsafe-eval'));assert.ok(!headers.includes('script-src \'self\' \'unsafe-inline\''));
  assert.ok(result.files.every(name=>!/(?:^|\/)(?:functions|api|memberships|classroom|teacher)(?:\/|\.)/u.test(name)));
  assert.ok(result.files.every(name=>!name.includes('_worker')&&!name.includes('billing')&&!name.includes('wrangler')));
  await assert.rejects(readFile(path.join(result.directory,'old.txt')),error=>error.code==='ENOENT');
});

test('a failed first or final Access guard preserves the old output and removes temporary full files',async t=>{
  for(const failOn of [1,2]){
    const h=await fixture(t);let attempts=0,prepared=0;
    await assert.rejects(buildOwnerPreview({...h.options,guard:async()=>{if(++attempts===failOn)return false;return true;},
      prepare:async()=>{prepared++;return {assets:h.assets};}}),/guard did not approve/u);
    assert.equal(prepared,failOn===1?0:1);assert.equal(await readFile(path.join(h.root,'dist/old.txt'),'utf8'),'OLD_FREE_BUILD');
    assert.ok(!(await readdir(h.root)).some(name=>name.startsWith('.publish-stage-owner-')));
  }
});

test('unexpected server files and traversal never become static owner output',async t=>{
  for(const name of ['/learn/../private.js','/learn/src/worker.js','/learn/classroom.html','/learn/api/requester.js','/learn/_worker.js']){
    const h=await fixture(t);h.assets.set(name,{bytes:encode('UNREVIEWED_SERVER_BYTES')});
    await assert.rejects(buildOwnerPreview(h.options),/Unreviewed owner asset/u);
    assert.equal(await readFile(path.join(h.root,'dist/old.txt'),'utf8'),'OLD_FREE_BUILD');
  }
});

test('the real private app uses the local-only compile option while public build and source AI settings remain unchanged',async t=>{
  const h=await fixture(t),seen=[];
  const {bundleTier}=await import('../scripts/tier-bundles.mjs');
  const result=await buildOwnerPreview({...h.options,
    prepare:options=>prepareProtectedAssets({...options,sourceRoot:ROOT}),
    bundler:async options=>{seen.push(options);return bundleTier(options);}});
  assert.ok(seen.length>0);assert.ok(seen.every(options=>options.member===true&&options.localOnly===true&&options.ownerPreview===true));
  const javascript=await readFile(path.join(result.directory,'learn/src/app.js'),'utf8');assert.match(javascript,/INC-103/u);
  assert.ok(javascript.includes('Owner preview navigation.'),'The guarded full owner artifact contains the preview navigation UI.');
  const pkg=JSON.parse(await readFile(path.join(ROOT,'package.json'),'utf8'));
  const approvedPrivateContext=process.env.CF_PAGES==='1'&&process.env.CF_PAGES_BRANCH===OWNER_PREVIEW_BRANCH;
  assert.ok(pkg.scripts.build==='node scripts/build.mjs'||approvedPrivateContext&&pkg.scripts.build==='node scripts/build-owner-preview.mjs');
  assert.match(await readFile(path.join(ROOT,'src/requester-config.js'),'utf8'),/REQUESTER_CLOUD_ENABLED = true/u);
  assert.equal((await import('../src/owner-preview.js')).OWNER_PREVIEW,false,'The reviewed source default stays closed.');
  assert.equal(result.files.includes('learn/src/owner-preview.js'),false,'Only the compiled application may contain this build context.');
  assert.ok(result.files.every(name=>!name.endsWith('.map')));
});

test('owner static compilation works using only root build dependencies without membership runtime packages',()=>{
  const script=`
    import {registerHooks} from 'node:module';
    import {pathToFileURL} from 'node:url';
    const root=process.argv[1],base=new URL('package.json',pathToFileURL(root));
    registerHooks({resolve(specifier,context,nextResolve){
      const bare=!specifier.startsWith('.')&&!specifier.startsWith('/')&&!specifier.includes(':');
      const result=nextResolve(specifier,bare?{...context,parentURL:base.href}:context);
      if(result.url.includes('/memberships/node_modules/'))throw new Error('Membership package dependency entered owner static compilation.');
      return result;
    }});
    await import(new URL('scripts/build-owner-preview.mjs',base));
    const {prepareProtectedAssets}=await import(new URL('memberships/build.mjs',base));
    const {bundleTier}=await import(new URL('scripts/tier-bundles.mjs',base));
    const result=await prepareProtectedAssets({sourceRoot:root,bundler:options=>bundleTier({...options,localOnly:true,ownerPreview:true})});
    if(!result.assets.has('/learn/src/app.js'))throw new Error('Missing full owner app.');
    console.log('Root build packages only.');
  `;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script,ROOT],{encoding:'utf8',timeout:20000});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Root build packages only/u);
});
