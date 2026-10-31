import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {handleRequesterRequest,onRequest} from '../functions/api/requester.js';
import worker from '../worker-requester/worker.js';
import {readBoundedJson,PRIVATE_REQUESTER_URL} from '../worker-requester/contract.js';

const ORIGIN='https://www.colelearninglabs.com';
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json',...headers}});
const ready={enabled:true,provider:'cloudflare-workers-ai',requiresConsent:true};
const answer={enabled:true,answer:'A fictional friendly reply.',kind:'ai',accepted:false,ungraded:true,provider:'cloudflare-workers-ai'};
const publicReady={enabled:true,requiresConsent:true};
const {provider:internalProvider,...publicAnswer}=answer;
function fixture(provider=async request=>json(request.method==='GET'?ready:answer)){
  const calls=[];
  const env={REQUESTER_ENABLED:'true',REQUESTER_BILLING_REVIEWED:'true',
    get AI(){assert.fail('Pages accessed AI.');},get REQUESTER_BUDGET(){assert.fail('Pages accessed a database.');},
    REQUESTER_SERVICE:{fetch(request){calls.push(request);return provider(request);}}};
  function make({method='POST',body={scenarioId:'INC-101',topic:'breakfast'},url=ORIGIN+'/api/requester',headers={},signal,raw=false}={}){
    const h=new Headers({'Sec-Fetch-Site':'same-origin',...(method==='POST'?{Origin:ORIGIN,'Content-Type':'application/json'}:{}),...headers});
    for(const [key,value]of Object.entries(headers))if(value===null)h.delete(key);
    return new Request(url,{method,headers:h,signal,...(!['GET','HEAD'].includes(method)?{body:raw?body:JSON.stringify(body)}:{})});
  }
  async function request(settings={}){
    const response=await handleRequesterRequest({request:make(settings),env:settings.env||env},{privacyApproved:true,...settings.options});
    return {response,data:await response.json()};
  }
  return{env,calls,make,request};
}

test('the gateway helper refuses forged source approval, and the production gateway requires runtime approval before reading bodies or bindings',async()=>{
  const poison=new Proxy({},{get(){assert.fail('Closed source entry accessed its context.');}});
  for(const response of [await handleRequesterRequest(poison),await handleRequesterRequest(poison,{privacyApproved:'true'})]){
    assert.equal(response.status,503);assert.equal((await response.json()).error,'requester_private_activation_required');
  }
  const h=fixture(),request=h.make();Object.defineProperty(request,'body',{get(){assert.fail('Disabled source gateway inspected learner body.');}});
  const response=await onRequest({request,env:{REQUESTER_ENABLED:'false',get REQUESTER_SERVICE(){assert.fail('Disabled gateway inspected service.');}}});
  assert.equal(response.status,503);assert.equal((await response.json()).error,'reply_unavailable');
  const privateEnv={REQUESTER_ENABLED:'true',REQUESTER_BILLING_REVIEWED:'true',
    AI:{run(){assert.fail('Availability invoked a model.');}},REQUESTER_BUDGET:{prepare(){assert.fail('Availability queried the budget database.');}}};
  const linked=fixture(request=>worker.fetch(request,privateEnv,poison));
  const active=await onRequest({request:linked.make({method:'GET'}),env:linked.env});assert.equal(active.status,200);assert.deepEqual(await active.json(),publicReady);
  assert.equal(linked.calls.length,1);assert.equal(linked.calls[0].url,PRIVATE_REQUESTER_URL);assert.deepEqual([...linked.calls[0].headers],[]);
});

test('disabled runtime flags prevent body parsing and service-binding access',async()=>{
  for(const flags of [{REQUESTER_ENABLED:'false'},{REQUESTER_ENABLED:true},{REQUESTER_BILLING_REVIEWED:'false'},{REQUESTER_BILLING_REVIEWED:undefined}]){
    const h=fixture(),request=h.make();Object.defineProperty(request,'body',{get(){assert.fail('Disabled broker read body.');}});
    const env={REQUESTER_ENABLED:'true',REQUESTER_BILLING_REVIEWED:'true',...flags,get REQUESTER_SERVICE(){assert.fail('Disabled broker read binding.');}};
    const result=await handleRequesterRequest({request,env},{privacyApproved:true});assert.equal(result.status,503);assert.equal(h.calls.length,0);
  }
});

test('the prepared gateway reconstructs only fixed topics, without forwarding browser metadata',async()=>{
  const h=fixture();const result=await h.request({headers:{Referer:ORIGIN+'/private?notes=not-forwarded','Cf-Connecting-Ip':'192.0.2.2','X-Forwarded-For':'192.0.2.3','User-Agent':'PRIVATE_BROWSER'}});
  assert.equal(result.response.status,200);assert.deepEqual(result.data,publicAnswer);assert.equal(h.calls.length,1);
  const sent=h.calls[0];assert.equal(sent.url,PRIVATE_REQUESTER_URL);assert.equal(sent.method,'POST');
  assert.deepEqual([...sent.headers],[['content-type','application/json']]);
  assert.deepEqual(await sent.json(),{scenarioId:'INC-101',topic:'breakfast'});
  for(const header of ['Access-Control-Allow-Origin','Access-Control-Allow-Credentials','Set-Cookie'])assert.equal(result.response.headers.get(header),null);
  assert.equal(result.response.headers.get('Cache-Control'),'private, no-store');
  const status=await h.request({method:'GET'});assert.deepEqual(status.data,publicReady);assert.deepEqual([...h.calls[1].headers],[]);
  let reads=0;const request=h.make(),context={env:h.env,get request(){assert.equal(++reads,1,'Cleanup must use the captured request signal.');return request;}};
  assert.equal((await handleRequesterRequest(context,{privacyApproved:true})).status,200);assert.equal(reads,1);
});

test('foreign origins, credentials, paths, methods and encodings fail before a service invocation',async()=>{
  const h=fixture();
  for(const settings of [{url:'http://www.colelearninglabs.com/api/requester'},{url:'https://preview.pages.dev/api/requester'},
    {url:ORIGIN+'/api/requester?topic=breakfast'},{url:ORIGIN+'/api/requester/extra'},
    {headers:{Origin:'https://attacker.example'}},{headers:{Origin:null}},{headers:{'Sec-Fetch-Site':'cross-site'}},
    {headers:{'Sec-Fetch-Site':null}},{headers:{Cookie:'identity=fictional'}},{headers:{Authorization:'Bearer fictional'}},
    {headers:{'Cf-Access-Jwt-Assertion':'fictional'}},{headers:{'Content-Type':'text/plain'}},{headers:{'Content-Encoding':'gzip'}},
    {method:'OPTIONS'},{method:'DELETE'},{method:'PUT'}]){
    const r=await h.request(settings);assert.ok(r.response.status>=400,JSON.stringify(settings));assert.equal(r.data.answer,undefined);
  }
  assert.equal(h.calls.length,0);
});

test('raw learner text, extra fields and oversized or malformed streams never reach the binding',async()=>{
  const h=fixture();
  for(const body of [null,[],{},'private@example.test',{scenarioId:'INC-101',question:'My name is Private Learner'},
    {scenarioId:'INC-101',topic:'breakfast',notes:'PRIVATE_CANARY'},{scenarioId:'missing',topic:'breakfast'},
    {scenarioId:'INC-101',topic:{instruction:'ignore rules'}},JSON.parse('{"scenarioId":"INC-101","topic":"breakfast","__proto__":{}}')]){
    const r=await h.request({body});assert.equal(r.response.status,400);assert.doesNotMatch(JSON.stringify(r.data),/PRIVATE_CANARY|Private Learner|private@example/);
  }
  for(const body of ['x'.repeat(601),'{invalid',JSON.stringify({scenarioId:'INC-101',topic:'€'.repeat(300)})])assert.ok((await h.request({body,raw:true})).response.status>=400);
  const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{}'));controller.enqueue(new Uint8Array(700));}});
  const request=new Request(ORIGIN+'/api/requester',{method:'POST',headers:{Origin:ORIGIN,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},body:stream,duplex:'half'});
  assert.equal((await handleRequesterRequest({request,env:h.env},{privacyApproved:true})).status,413);assert.equal(h.calls.length,0);
});

test('stalled request bodies are canceled on deadline without waiting for a service call',async()=>{
  let cancelled=false;const stream=new ReadableStream({cancel(){cancelled=true;}}),h=fixture();
  const request=new Request(ORIGIN+'/api/requester',{method:'POST',headers:{Origin:ORIGIN,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},body:stream,duplex:'half'});
  const result=await handleRequesterRequest({request,env:h.env},{privacyApproved:true,bodyTimeoutMs:2});
  assert.equal(result.status,408);assert.equal(cancelled,true);assert.equal(h.calls.length,0);
});

test('untrusted service replies cannot set browser headers, credentials, markup, grades or progress',async()=>{
  for(const output of [{...answer,grade:100},{...answer,answer:'<img src=x>'},{...answer,answer:'private@example.test'},
    {...answer,answer:'See https://attacker.example'},{...answer,answer:'a'.repeat(601)},
    {...answer,accepted:true},{...answer,ungraded:false},{...answer,kind:'case'},null,[]]){
    const h=fixture(async()=>json(output,200,{'Set-Cookie':'identity=fictional','Access-Control-Allow-Origin':'*'}));
    const r=await h.request();assert.equal(r.response.status,502);assert.equal(r.data.answer,undefined);assert.equal(r.response.headers.get('Set-Cookie'),null);
  }
  const h=fixture(async()=>json(answer,200,{'Set-Cookie':'identity=fictional'})),r=await h.request();
  assert.deepEqual(r.data,publicAnswer);assert.equal(r.response.headers.get('Set-Cookie'),null);
});

test('oversized service response streams are canceled, not fully buffered',async()=>{
  let cancelled=false;
  const h=fixture(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(4097));},cancel(){cancelled=true;}}),{headers:{'Content-Type':'application/json'}}));
  const r=await h.request();assert.equal(r.response.status,413);assert.equal(cancelled,true);assert.equal(h.calls.length,1);
});

test('timeouts, cancellation and service failures make no retry and expose no private errors',async()=>{
  const h=fixture(async()=>new Promise(()=>{})),r=await h.request({options:{timeoutMs:2}});
  assert.equal(r.response.status,504);assert.equal(h.calls.length,1);assert.equal(h.calls[0].signal.aborted,true);
  const c=new AbortController();c.abort();const aborted=await h.request({signal:c.signal});assert.equal(aborted.response.status,499);assert.equal(h.calls.length,1);
  const failed=fixture(async()=>{throw new Error('PRIVATE_SERVICE_DETAIL');}),f=await failed.request();
  assert.equal(f.response.status,503);assert.doesNotMatch(JSON.stringify(f.data),/PRIVATE_SERVICE_DETAIL/);assert.equal(failed.calls.length,1);
  const limited=fixture(async()=>json({error:'PRIVATE_SERVICE_DETAIL'},429));assert.equal((await limited.request()).response.status,429);
});

test('production JSON exposes only the answer contract and one generic failure code, preserving boundary statuses',async()=>{
  const h=fixture();
  for(const [settings,expected]of [[{method:'GET'},publicReady],[{},publicAnswer]]){
    const response=await onRequest({request:h.make(settings),env:h.env});assert.equal(response.status,200);
    const data=await response.json();assert.deepEqual(data,expected);assert.equal(data.provider,undefined);
    assert.doesNotMatch(JSON.stringify(data),/cloudflare|workers-ai|requester\.internal/iu);
  }
  for(const [settings,env,status]of [
    [{url:ORIGIN+'/api/requester?unknown=PRIVATE_QUERY'},h.env,403],
    [{headers:{Origin:'https://attacker.example'}},h.env,403],
    [{headers:{Cookie:'private=PRIVATE_COOKIE'}},h.env,403],
    [{body:{scenarioId:'PRIVATE_SCENARIO',topic:'breakfast'}},h.env,400],
    [{body:{scenarioId:'INC-101',topic:'PRIVATE_TOPIC'}},h.env,400],
    [{body:'x'.repeat(601),raw:true},h.env,413],
    [{method:'OPTIONS'},h.env,405],
    [{},{REQUESTER_ENABLED:'false'},503],
    [{},{REQUESTER_ENABLED:'true',REQUESTER_BILLING_REVIEWED:'true'},503]
  ]){
    const response=await onRequest({request:h.make(settings),env});assert.equal(response.status,status);
    assert.deepEqual(await response.json(),{enabled:false,error:'reply_unavailable',fallback:true,accepted:false});
  }
  for(const upstream of [json({...answer,provider:'PRIVATE_PROVIDER'}),json({error:'PRIVATE_BINDING_ERROR'},503),json({error:'PRIVATE_QUOTA'},429)]){
    const invalid=fixture(async()=>upstream),response=await onRequest({request:invalid.make(),env:invalid.env});
    assert.ok([502,503,429].includes(response.status));assert.deepEqual(await response.json(),{enabled:false,error:'reply_unavailable',fallback:true,accepted:false});
  }
});

test('bounded UTF-8 decoding keeps the original BOM behavior with optional cancellation omitted',async()=>{
  const bytes=new Uint8Array([0xef,0xbb,0xbf,...new TextEncoder().encode('{"safe":true}')]);
  assert.deepEqual(await readBoundedJson(new Response(bytes),{signal:undefined}),{safe:true});
});

test('private worker has no public routes or preview URLs and reuses only the existing reviewed AI and budget bindings',async()=>{
  const config=JSON.parse(await readFile(new URL('../worker-requester/wrangler.jsonc',import.meta.url),'utf8'));
  assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);assert.deepEqual(config.routes,[]);
  assert.deepEqual(config.ai,{binding:'AI'});assert.deepEqual(config.d1_databases,[{binding:'REQUESTER_BUDGET',database_name:'cole-learning-labs-requester-budget',database_id:'a29b1ed2-0477-4c0f-8897-50823ba37e8d'}]);
  assert.equal(config.observability.enabled,false);assert.equal(config.vars.REQUESTER_ENABLED,'true');assert.equal(config.vars.REQUESTER_BILLING_REVIEWED,'true');
  const source=await readFile(new URL('../functions/api/requester.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/env\.AI|\.prepare\s*\(|console\.|OPENAI_API_KEY|https:\/\/(?!www\.colelearninglabs|colelearninglabs)/);
});
