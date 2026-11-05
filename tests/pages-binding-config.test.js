import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {handleRequesterRequest} from '../functions/api/requester.js';
import {PUBLIC_FILES} from '../scripts/build.mjs';

const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const pages=await read('wrangler.jsonc'),worker=await read('worker-requester/wrangler.jsonc');

test('only production receives the private requester binding, and Pages never receives AI, records or budget storage',()=>{
  assert.equal(pages.name,'cole-learning-labs');assert.equal(pages.pages_build_output_dir,'./dist');
  assert.equal(pages.compatibility_date,'2026-10-16');assert.deepEqual(pages.compatibility_flags,[]);
  assert.equal(pages.send_metrics,false);assert.equal(pages.upload_source_maps,false);
  assert.deepEqual(pages.env.production.services,[{binding:'REQUESTER_SERVICE',service:worker.name}]);
  for(const config of [pages,pages.env.preview]){
    assert.deepEqual(config.services,[]);assert.equal(config.vars.REQUESTER_ENABLED,'false');assert.equal(config.vars.REQUESTER_BILLING_REVIEWED,'false');
  }
  assert.equal(pages.env.production.vars.REQUESTER_ENABLED,'true');assert.equal(pages.env.production.vars.REQUESTER_BILLING_REVIEWED,'true');
  for(const config of [pages,pages.env.preview,pages.env.production]){
    assert.equal(config.vars.NODE_VERSION,'24.22.0');
    assert.equal(config.vars.CLASSROOM_ENABLED,'false');assert.equal(config.vars.IMPROVEMENTS_ENABLED,'false');
    for(const key of ['ai','d1_databases','kv_namespaces','analytics_engine_datasets','queues','r2_buckets','durable_objects'])assert.equal(config[key],undefined,key);
  }
  assert.equal(PUBLIC_FILES.includes('wrangler.jsonc'),false);assert.equal(PUBLIC_FILES.some(file=>file.startsWith('worker-requester/')),false);
});

test('preview and local flags prevent parsing user content or attempting the missing service binding',async()=>{
  for(const config of [pages,pages.env.preview]){
    const request=new Request('https://www.colelearninglabs.com/api/requester',{method:'POST',headers:{Origin:'https://www.colelearninglabs.com','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},body:'PRIVATE_CANARY'});
    Object.defineProperty(request,'body',{get(){assert.fail('Disabled environment parsed a browser body.');}});
    const response=await handleRequesterRequest({request,env:{...config.vars,get REQUESTER_SERVICE(){assert.fail('Disabled environment read a service binding.');}}},{privacyApproved:true});
    assert.equal(response.status,503);assert.equal((await response.json()).error,'requester_not_enabled');
  }
});

test('receipts and lab telemetry ship disabled in every environment and fail closed without parsing a body',async()=>{
  const {onRequest:telemetry}=await import('../functions/api/telemetry.js'),{onRequest:verify}=await import('../functions/api/verify.js');
  for(const config of [pages,pages.env.preview,pages.env.production]){
    for(const flag of ['RECEIPTS_ENABLED','TELEMETRY_ENABLED','TELEMETRY_PRIVACY_REVIEWED','TELEMETRY_RETENTION_VERIFIED'])assert.equal(config.vars[flag],'false',flag);
    assert.equal('RECEIPT_SECRET' in config.vars,false,'A signing secret must never be a Wrangler variable.');
    for(const [handler,path] of [[telemetry,'/api/telemetry'],[verify,'/api/verify']]){
      const url='https://www.colelearninglabs.com'+path;
      const get=await handler({request:new Request(url,{headers:{'Sec-Fetch-Site':'same-origin'}}),env:{...config.vars}});
      assert.equal(get.status,200,path);assert.equal((await get.json()).enabled,false,path);assert.equal(get.headers.has('X-CLL-Turnstile-Sitekey'),false,path);
      const request=new Request(url,{method:'POST',headers:{Origin:'https://www.colelearninglabs.com','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},body:'PRIVATE_CANARY'});
      Object.defineProperty(request,'body',{get(){assert.fail('Disabled environment parsed a browser body.');}});
      assert.equal((await handler({request,env:{...config.vars}})).status,503,path);
    }
  }
});

test('the telemetry retention worker ships unprovisioned: no binding, no schedule, no variables',async()=>{
  const config=await read('telemetry/wrangler.retention.jsonc');
  assert.equal(config.main,'retention-worker.js');assert.deepEqual(config.d1_databases,[]);
  // A schedule without a database could only fail nightly. Add both in the same reviewed change.
  assert.deepEqual(config.triggers,{crons:[]});
  assert.equal(config.vars,undefined);assert.equal(config.observability.enabled,false);
  for(const key of ['workers_dev','preview_urls','send_metrics','upload_source_maps'])assert.equal(config[key],false,key);
});
