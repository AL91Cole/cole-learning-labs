// Test-only provider transport, never imported by the application.
import assert from 'node:assert/strict';
export const turnstileEnv={TURNSTILE_SITE_KEY:'0xUNIT_TEST_SITE_KEY',TURNSTILE_SECRET_KEY:'UNIT_TEST_SECRET_NOT_A_REAL_CREDENTIAL'};
export function turnstileReply(action='requester',extra={}){return new Response(JSON.stringify({success:true,hostname:'www.colelearninglabs.com',action,challenge_ts:new Date().toISOString(),...extra}),{headers:{'Content-Type':'application/json'}});}
export function mockSiteverify(mock,action='requester'){
  mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(options.body.get('secret'),turnstileEnv.TURNSTILE_SECRET_KEY);
    assert.deepEqual([...options.body.keys()].sort(),['response','secret']);
    return turnstileReply(action);
  });
}
