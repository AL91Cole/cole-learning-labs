import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PUBLIC_FILES} from '../../scripts/build.mjs';
import {IMPROVEMENT_SHARING_ENABLED} from '../../src/improvement-config.js';

const json=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));

test('student publishing and collection remain independent of adult memberships',async()=>{
  assert.equal(IMPROVEMENT_SHARING_ENABLED,false);
  assert.deepEqual((await json('../../_routes.json')).include,['/api/requester']);
  assert.equal(PUBLIC_FILES.some(path=>path.startsWith('memberships/')),false);
  const student=await json('../../wrangler.jsonc');
  for(const config of [student,...Object.values(student.env)]){
    assert.equal(config.vars.CLASSROOM_ENABLED,'false');
    assert.equal(config.vars.IMPROVEMENTS_ENABLED,'false');
    assert.equal((config.services||[]).some(service=>/member/iu.test(service.binding+' '+service.service)),false);
  }
});

test('all membership environments lack public routes, live mode and provisioned services',async()=>{
  const member=await json('../wrangler.jsonc');
  for(const config of [member,...Object.values(member.env)]){
    assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
    assert.deepEqual(config.routes,[]);
    assert.equal(config.vars.MEMBERSHIP_ENABLED,'false');
    assert.equal(config.vars.MEMBERSHIP_PROCESSING_REVIEWED,'false');
    assert.equal(config.vars.MEMBERSHIP_DEPLOYMENT_MODE,'test');
    for(const binding of ['d1_databases','services','kv_namespaces','r2_buckets','durable_objects','queues','ai'])assert.equal(config[binding],undefined);
  }
  assert.deepEqual(member.triggers.crons,[]);
  assert.equal(member.observability.enabled,false);
  assert.deepEqual((await readdir(new URL('../public/',import.meta.url))).sort(),['index.html','membership.css','membership.js']);
});
