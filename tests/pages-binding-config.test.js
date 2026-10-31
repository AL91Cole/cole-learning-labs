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
