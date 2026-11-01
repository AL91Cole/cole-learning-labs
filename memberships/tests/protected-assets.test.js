import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker,{handleMembershipRequest,MEMBERSHIP_SOURCE_RELEASE_APPROVED} from '../worker.js';
import {PROTECTED_ASSETS} from '../protected-assets.js';
import {MembershipError,createBackstop} from '../security.js';
import {prepareProtectedAssets,bundleMembershipWorker} from '../build.mjs';
import {BillingError} from '../billing.js';

const ORIGIN='https://members.colelearninglabs.com';
const encoder=new TextEncoder();
test('deployment configuration selects only the generated server bundle and portal assets with activation closed',async()=>{
  const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  assert.equal(config.main,'dist/worker.mjs');
  assert.deepEqual(config.build,{command:'npm run build',cwd:'.'});
  assert.deepEqual(config.assets,{directory:'./dist/public',binding:'MEMBERSHIP_PUBLIC_ASSETS',run_worker_first:true});
  for(const target of [config,...Object.values(config.env)]){
    assert.equal(target.workers_dev,false);assert.equal(target.preview_urls,false);assert.deepEqual(target.routes,[]);
    assert.equal(target.vars.MEMBERSHIP_ENABLED,'false');assert.equal(target.vars.MEMBERSHIP_PROCESSING_REVIEWED,'false');
    assert.equal(target.vars.MEMBERSHIP_DEPLOYMENT_MODE,'test');
  }
});
const validSession=()=>({user:{id:'fictional-adult',email:'teacher@example.test',emailVerified:true},
  session:{id:'fictional-session',createdAt:new Date(),expiresAt:new Date(Date.now()+3600000)}});
function fixture(){
  const calls=[],assets=new Map([
    ['/learn/',{bytes:encoder.encode('<!doctype html><title>PRIVATE_MEMBER_HTML</title>'),contentType:'text/html; charset=utf-8'}],
    ['/learn/src/app.js',{bytes:encoder.encode('export const marker="PRIVATE_MEMBER_CASE";'),contentType:'application/javascript; charset=utf-8'}],
    ['/learn/src/member-app.css',{bytes:encoder.encode('.member{color:green}'),contentType:'text/css; charset=utf-8'}],
    ['/learn/assets/fictional.pdf',{bytes:encoder.encode('PRIVATE_MEMBER_DOWNLOAD'),contentType:'application/pdf'}]
  ]);
  let session=validSession(),premium=true;
  const env={MEMBERSHIP_ENABLED:'true',MEMBERSHIP_PROCESSING_REVIEWED:'true',MEMBERSHIP_DEPLOYMENT_MODE:'test',MEMBERSHIP_DB:{},
    MEMBERSHIP_PUBLIC_ASSETS:{fetch(){assert.fail('Private assets reached the public asset binding.');}}};
  const protectedAssets={has(path){calls.push(['has',path]);return assets.has(path);},get(path){calls.push(['payload',path]);return assets.get(path);}};
  const auth={async getAdultSession(){calls.push(['session']);return session;},handleMembershipAuth(){assert.fail('Private files reached an auth endpoint.');}};
  const billing={async verifyPremium({member}){calls.push(['premium',member]);return premium;},getMembershipStatus(){assert.fail('Display status cannot replace current paid entitlement.');}};
  const options={reviewApproved:true,protectedAssets,auth,billing,limiter:createBackstop(),async admission(database,kind){assert.equal(database,env.MEMBERSHIP_DB);calls.push(['admission',kind]);}};
  const request=(pathname='/learn/',{method='GET',headers={},...init}={})=>new Request(ORIGIN+pathname,{method,headers:{'Sec-Fetch-Site':'same-origin',...headers},...init});
  return {calls,assets,env,options,request,setSession(value){session=value;},setPremium(value){premium=value;},
    run:(req=request(),overrides={})=>handleMembershipRequest(req,env,{...options,...overrides})};
}

test('source private manifest and production entry remain closed before request or environment access',async()=>{
  assert.equal(PROTECTED_ASSETS.size,0);assert.equal(MEMBERSHIP_SOURCE_RELEASE_APPROVED,false);
  const poison=new Proxy({},{get(){assert.fail('Closed worker inspected private-delivery input.');}});
  assert.equal((await worker.fetch(poison,poison,poison)).status,503);
  assert.equal((await handleMembershipRequest(poison,poison)).status,503);
});

test('every private document, script, stylesheet and download requires admission, adult auth and a fresh paid check before bytes',async()=>{
  const h=fixture();
  for(const [pathname,asset]of h.assets){
    h.calls.length=0;const response=await h.run(h.request(pathname));
    assert.equal(response.status,200,pathname);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),asset.bytes);
    assert.deepEqual(h.calls.map(call=>call[0]),['admission','session','premium','has','payload']);
    assert.equal(h.calls[0][1],'read');assert.equal(h.calls[2][1].id,'fictional-adult');
    assert.equal(response.headers.get('Content-Type'),asset.contentType);
    assert.equal(response.headers.get('Cache-Control'),'private, no-store');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
    assert.equal(response.headers.get('Cross-Origin-Resource-Policy'),'same-origin');
    assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  }
});

test('no cookie, expired sessions and unverified adult identities never read private content or billing state',async()=>{
  for(const session of [null,{...validSession(),session:{...validSession().session,expiresAt:new Date(Date.now()-1)}},
    {...validSession(),user:{...validSession().user,emailVerified:false}}]){
    for(const path of ['/learn/','/learn/src/app.js','/learn/unknown.js']){
      const h=fixture();h.setSession(session);const response=await h.run(h.request(path));
      assert.equal(response.status,401);assert.deepEqual(await response.json(),{available:false,error:'membership_unavailable'});
      assert.deepEqual(h.calls.map(call=>call[0]),['admission','session']);
    }
  }
});

test('inactive, unpaid, expired or refunded entitlement blocks direct URLs and does not consult the asset map',async()=>{
  for(const state of ['inactive','unpaid','expired','refunded','disputed']){
    const h=fixture();h.setPremium(false);
    for(const path of ['/learn/','/learn/src/app.js','/learn/assets/fictional.pdf','/learn/unknown.js']){
      h.calls.length=0;const response=await h.run(h.request(path));
      assert.equal(response.status,403,state);assert.deepEqual(await response.json(),{available:false,error:'membership_unavailable'});
      assert.deepEqual(h.calls.map(call=>call[0]),['admission','session','premium']);
    }
  }
  for(const value of ['true',1,{active:true},null]){
    const h=fixture();h.setPremium(value);assert.equal((await h.run()).status,403);
  }
});

test('revocation between asset requests takes effect immediately and cannot be revived by a prior page load',async()=>{
  const h=fixture();assert.equal((await h.run()).status,200);
  h.setPremium(false);assert.equal((await h.run(h.request('/learn/src/app.js'))).status,403);
  assert.equal(h.calls.filter(call=>call[0]==='payload').length,1);
  h.setPremium(true);h.setSession(null);assert.equal((await h.run(h.request('/learn/src/member-app.css'))).status,401);
  assert.equal(h.calls.filter(call=>call[0]==='payload').length,1);
});

test('concurrent private assets serialize provider leases but each performs its own fresh check and a later refund blocks bytes',async()=>{
  const h=fixture();let busy=false,checks=0,peak=0,active=0,refunded=false;
  const billing={async verifyPremium(){
    if(busy)throw new BillingError(409);
    busy=true;checks++;active++;peak=Math.max(peak,active);
    await new Promise(setImmediate);busy=false;active--;return !refunded;
  }};
  const paths=['/learn/','/learn/src/app.js','/learn/src/member-app.css'];
  const replies=await Promise.all(paths.map(path=>h.run(h.request(path),{billing})));
  assert.deepEqual(replies.map(response=>response.status),[200,200,200]);assert.equal(peak,1);assert.equal(checks,3);
  assert.equal(h.calls.filter(call=>call[0]==='payload').length,3);
  refunded=true;assert.equal((await h.run(h.request('/learn/assets/fictional.pdf'),{billing})).status,403);
  assert.equal(checks,4);assert.equal(h.calls.filter(call=>call[0]==='payload').length,3);
});

test('private verification queues cap four jobs and release their state after success or provider failure',async()=>{
  const h=fixture();let releaseFirst,checks=0;
  const first=new Promise(resolve=>{releaseFirst=resolve;});
  const billing={async verifyPremium(){checks++;if(checks===1)await first;return true;}};
  const limiter={acquire:()=>()=>{}};
  const pending=Array.from({length:4},()=>h.run(h.request('/learn/src/app.js'),{billing,limiter}));
  await new Promise(setImmediate);assert.equal(checks,1);
  assert.equal((await h.run(h.request('/learn/src/app.js'),{billing,limiter})).status,429);
  releaseFirst();assert.deepEqual((await Promise.all(pending)).map(response=>response.status),[200,200,200,200]);assert.equal(checks,4);
  assert.equal((await h.run(h.request('/learn/src/app.js'),{billing,limiter})).status,200);assert.equal(checks,5);
  let fail=true;
  const failures={async verifyPremium(){if(fail){fail=false;throw new BillingError(503);}return true;}};
  const replies=await Promise.all([h.run(h.request(),{billing:failures}),h.run(h.request(),{billing:failures})]);
  assert.deepEqual(replies.map(response=>response.status),[503,200]);
});

test('only typed cross-isolate billing contention is retried, at most twice, without granting or caching access',async()=>{
  const h=fixture();let checks=0;
  const billing={async verifyPremium(){if(++checks<3)throw new BillingError(409);return true;}};
  assert.equal((await h.run(h.request(),{billing})).status,200);assert.equal(checks,3);
  let failedChecks=0;
  assert.equal((await h.run(h.request(),{billing:{async verifyPremium(){failedChecks++;throw new BillingError(409);}}})).status,409);
  assert.equal(failedChecks,3);assert.equal(h.calls.filter(call=>call[0]==='payload').length,1);
  let otherChecks=0;
  assert.equal((await h.run(h.request(),{billing:{async verifyPremium(){otherChecks++;throw Object.assign(new Error('PRIVATE_PROVIDER_DETAIL'),{status:409});}}})).status,503);
  assert.equal(otherChecks,1);assert.equal(h.calls.filter(call=>call[0]==='payload').length,1);
});

test('unknown private resources stay generic and never fall back to the public asset binding',async()=>{
  const h=fixture();const response=await h.run(h.request('/learn/unknown.js'));
  assert.equal(response.status,404);assert.deepEqual(await response.json(),{available:false,error:'membership_unavailable'});
  assert.deepEqual(h.calls.map(call=>call[0]),['admission','session','premium','has']);
  assert.equal((await h.run(h.request('/learn/classroom.html'))).status,404);
  assert.equal((await h.run(h.request('/learn/teacher/index.html'))).status,404);
});

test('admission, live mode, methods, origins, query variants and aborts fail before protected payload lookup',async()=>{
  const h=fixture();
  const attempts=[h.request('/learn/src/app.js?release=old'),h.request('/learn/%73rc/app.js'),
    h.request('/learn/src//app.js'),h.request('/learn/',{method:'POST'}),h.request('/learn/',{method:'HEAD'}),
    h.request('/learn/',{headers:{Origin:'https://www.colelearninglabs.com','Sec-Fetch-Site':'same-site'}}),
    h.request('/learn/',{headers:{Authorization:'Bearer fictional'}}),new Request('https://www.colelearninglabs.com/learn/src/app.js')];
  const abort=new AbortController();abort.abort();attempts.push(h.request('/learn/',{signal:abort.signal}));
  for(const request of attempts){const response=await h.run(request);assert.ok(response.status>=400);}
  assert.equal(h.calls.length,0);
  const rejected=await h.run(h.request(),{async admission(){throw new MembershipError(429);}});
  assert.equal(rejected.status,429);assert.equal(h.calls.length,0);
  h.env.MEMBERSHIP_DEPLOYMENT_MODE='live';assert.equal((await h.run()).status,503);assert.equal(h.calls.length,0);
});

test('private HTML permits authored styles while portal scripts, framing and object policies remain strict',async()=>{
  const h=fixture(),html=await h.run();const policy=html.headers.get('Content-Security-Policy');
  assert.match(policy,/style-src 'self' 'unsafe-inline'/u);assert.match(policy,/script-src 'self';/u);
  assert.match(policy,/frame-src 'none'/u);assert.match(policy,/frame-ancestors 'none'/u);assert.match(policy,/object-src 'none'/u);
  assert.doesNotMatch(policy,/unsafe-eval|script-src[^;]*unsafe-inline/u);
  const script=await h.run(h.request('/learn/src/app.js'));
  assert.doesNotMatch(script.headers.get('Content-Security-Policy'),/unsafe-inline/u);
});

test('the real member build contains premium cases only behind private paths with consolidated styles and no classroom pages',async()=>{
  const {assets,inputs}=await prepareProtectedAssets();
  assert.ok(assets.has('/learn/'));assert.ok(assets.has('/learn/src/app.js'));assert.ok(assets.has('/learn/src/member-app.css'));
  assert.ok(inputs.every(name=>name.startsWith('src/')));
  assert.match(new TextDecoder().decode(assets.get('/learn/src/app.js').bytes),/INC-103/u);
  for(const path of ['/learn/classroom.html','/learn/teacher/index.html','/learn/src/classroom-portal.js',
    '/learn/src/scenarios.js','/learn/src/expanded-labs.js','/learn/_headers','/learn/_routes.json'])assert.equal(assets.has(path),false,path);
  for(const [name,asset]of assets){
    assert.ok(name.startsWith('/learn/'),name);
    if(/text|javascript|json/u.test(asset.contentType))assert.doesNotMatch(new TextDecoder().decode(asset.bytes),/\?release=/u,name);
    if(name.endsWith('.html')||name==='/learn/'){
      const html=new TextDecoder().decode(asset.bytes);
      assert.ok([...html.matchAll(/<link\b[^>]*rel=["']stylesheet/giu)].length<=1,name);
      assert.doesNotMatch(html,/<a\b[^>]*href=["'][^"']*(?:classroom\.html|teacher\/)/iu,name);
    }
    if(name.includes('/src/member-')&&name.endsWith('.css'))assert.doesNotMatch(new TextDecoder().decode(asset.bytes),/@import\b/u,name);
  }
});

test('the private build refuses unknown paths, duplicate manifest entries and missing entry files before bundling',async()=>{
  const poison=()=>assert.fail('Invalid manifest reached the app compiler.');
  for(const files of [['../memberships/package.json'],['src/../app.js'],['index.html','index.html'],['/index.html'],['src\\app.js']]){
    await assert.rejects(prepareProtectedAssets({files,bundler:poison}),/manifest|path/iu);
  }
  await assert.rejects(prepareProtectedAssets({files:[],bundler:poison}),/entry files/u);
});

test('the actual server bundle embeds its private map while its production export still cannot be unlocked by environment flags',async()=>{
  const h=fixture(),bytes=await bundleMembershipWorker(h.assets);
  const compiled=await import('data:text/javascript;base64,'+Buffer.from(bytes).toString('base64'));
  assert.equal(compiled.MEMBERSHIP_SOURCE_RELEASE_APPROVED,false);
  const poison=new Proxy({},{get(){assert.fail('Compiled closed entry inspected environment.');}});
  assert.equal((await compiled.default.fetch(poison,poison)).status,503);
  const {protectedAssets,...options}=h.options;
  const response=await compiled.handleMembershipRequest(h.request('/learn/src/app.js'),h.env,options);
  assert.equal(response.status,200);assert.equal(await response.text(),'export const marker="PRIVATE_MEMBER_CASE";');
  assert.equal(h.calls.some(call=>call[0]==='payload'),false,'The source/test map must not provide the compiled worker’s bytes.');
  assert.equal(PROTECTED_ASSETS.size,0,'Building must not modify the committed empty manifest.');
});
