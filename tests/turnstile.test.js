import test from 'node:test';
import assert from 'node:assert/strict';
import {turnstileSitekey,verifyTurnstile} from '../edge/turnstile.js';
import {requestTurnstileToken} from '../src/turnstile-client.js';
import {turnstileEnv,turnstileReply} from './turnstile-fixture.js';
const request=(headers={},signal)=>new Request('https://www.colelearninglabs.com/api/requester',{headers:{'X-CLL-Turnstile':'fresh-token',Cookie:'not-forwarded','Cf-Connecting-Ip':'192.0.2.1',...headers},signal});
test('production configuration rejects missing and Cloudflare test keys before external contact',async()=>{
  for(const env of [{},{...turnstileEnv,TURNSTILE_SITE_KEY:'1x00000000000000000000BB'},{...turnstileEnv,TURNSTILE_SECRET_KEY:'1x0000000000000000000000000000000AA'}]){
    assert.equal(turnstileSitekey(env),null);assert.equal(await verifyTurnstile(request(),env,'requester',{fetcher:()=>assert.fail('Disabled verifier contacted provider.')}),false);
  }
  for(const token of ['', 'x'.repeat(2049),'invalid token','<script>'])assert.equal(await verifyTurnstile(request({'X-CLL-Turnstile':token}),turnstileEnv,'requester',{fetcher:()=>assert.fail('Bad token reached provider.')}),false);
});
test('Siteverify validates action, exact hostname and age and sends only transient secret/token',async()=>{
  const fetcher=async(url,options)=>{
    assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(options.redirect,'error');
    assert.deepEqual([...options.body], [['secret',turnstileEnv.TURNSTILE_SECRET_KEY],['response','fresh-token']]);
    assert.deepEqual(options.headers,{'Content-Type':'application/x-www-form-urlencoded'});return turnstileReply();
  };
  assert.equal(await verifyTurnstile(request(),turnstileEnv,'requester',{fetcher}),true);
  for(const extra of [{success:false,'error-codes':['timeout-or-duplicate']},{success:'true'},{hostname:'evil.example'},{hostname:'colelearninglabs.com'},{action:'reach'},{action:undefined},{challenge_ts:'invalid'},{challenge_ts:new Date(Date.now()-301000).toISOString()},{challenge_ts:new Date(Date.now()+60000).toISOString()}]){
    assert.equal(await verifyTurnstile(request(),turnstileEnv,'requester',{fetcher:async()=>turnstileReply('requester',extra)}),false,JSON.stringify(extra));
  }
});
test('provider outages, redirects, malformed streams, slow reads and cancellation fail closed',async()=>{
  for(const fetcher of [async()=>{throw Error('offline');},async()=>new Response('{}',{status:302}),async()=>new Response('not-json',{headers:{'Content-Type':'application/json'}}),async()=>new Response('x'.repeat(4097),{headers:{'Content-Type':'application/json'}}),async()=>new Response('{}',{headers:{'Content-Type':'text/plain'}}),()=>new Promise(()=>{}),async()=>new Response(new ReadableStream({start(){}}),{headers:{'Content-Type':'application/json'}})])assert.equal(await verifyTurnstile(request(),turnstileEnv,'requester',{fetcher,timeoutMs:5}),false);
  const controller=new AbortController();let entered;const started=new Promise(resolve=>{entered=resolve;});
  const result=verifyTurnstile(request({},controller.signal),turnstileEnv,'requester',{fetcher:()=>{entered();return new Promise(()=>{});}});await started;controller.abort();assert.equal(await result,false);
});
function browser({loadFail=false,mode='pass'}={}){
  const scripts=[],containers=[],removed=[],options=[];let finish;
  const window={turnstile:{render(_element,config){options.push(config);finish=config.callback;if(mode==='pass')queueMicrotask(()=>config.callback('single-use-'+options.length));else if(mode==='fail')queueMicrotask(()=>config['error-callback']());return options.length;},remove:id=>removed.push(id)}};
  const document={head:{append(script){scripts.push(script);queueMicrotask(()=>loadFail?script.onerror():script.onload());}},body:{append:element=>containers.push(element)},createElement:tag=>({tag,remove(){this.removed=true;}})};
  return {document,window,scripts,containers,removed,options,finish:()=>finish?.('late-token')};
}
test('client loads the official SDK once on demand but renders a fresh single-use check per POST',async()=>{
  const f=browser();assert.equal(f.scripts.length,0);
  for(let i=1;i<=2;i++)assert.equal(await requestTurnstileToken({...f,sitekey:turnstileEnv.TURNSTILE_SITE_KEY,action:'requester'}),'single-use-'+i);
  assert.equal(f.scripts.length,1);assert.equal(f.scripts[0].src,'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
  assert.deepEqual(f.removed,[1,2]);assert.ok(f.containers.every(element=>element.removed));
  for(const config of f.options){assert.equal(config.action,'requester');assert.equal(config.retry,'never');assert.equal(config['refresh-expired'],'never');assert.equal(config['response-field'],false);assert.equal(config['feedback-enabled'],false);}
});
test('client blocked scripts, failed checks and canceled checks return without an interactive requirement or retry',async()=>{
  for(const setting of [{loadFail:true},{mode:'fail'},{mode:'pending'}]){
    const f=browser(setting);assert.equal(await requestTurnstileToken({...f,sitekey:turnstileEnv.TURNSTILE_SITE_KEY,action:'reach',timeoutMs:5}),null);assert.equal(f.scripts.length,1);assert.ok(f.containers.every(element=>element.removed));
  }
  const f=browser({mode:'pending'}),controller=new AbortController();
  const pending=requestTurnstileToken({...f,sitekey:turnstileEnv.TURNSTILE_SITE_KEY,action:'reach',signal:controller.signal});await new Promise(resolve=>setImmediate(resolve));controller.abort();assert.equal(await pending,null);f.finish();assert.ok(f.containers.every(element=>element.removed));
  const disabled=browser();assert.equal(await requestTurnstileToken({...disabled,sitekey:null,action:'reach'}),null);assert.equal(disabled.scripts.length,0);
});
