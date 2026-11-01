import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker,{handleMembershipRequest,MEMBERSHIP_SOURCE_RELEASE_APPROVED} from '../worker.js';
import {MEMBER_ORIGIN,MembershipError,boundedBytes,csrfToken,verifyCsrf,reserveAdmission,createBackstop} from '../security.js';
const schema=await readFile(new URL('../guard-schema.sql',import.meta.url),'utf8');
const activeSession=()=>({user:{id:'adult_teacher_1',email:'educator@example.test',emailVerified:true},session:{id:'opaque_session_1',createdAt:new Date(),expiresAt:new Date(Date.now()+3600000)}});
function database(t){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(schema);t.after(()=>sqlite.close());
  const prepare=sql=>({bind(...values){return {async all(){return {success:true,results:sqlite.prepare(sql).all(...values)};}};}});
  return {sqlite,prepare,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.all());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
}
function fixture(t){
  const calls=[],db=database(t),session=activeSession();
  const env={MEMBERSHIP_ENABLED:'true',MEMBERSHIP_PROCESSING_REVIEWED:'true',MEMBERSHIP_DEPLOYMENT_MODE:'test',MEMBERSHIP_DB:db,
    MEMBERSHIP_CSRF_SECRET:'a'.repeat(64),MEMBERSHIP_AUTH_SECRET:'b'.repeat(64),
    MEMBERSHIP_PUBLIC_ASSETS:{async fetch(request){calls.push(['asset',request]);return new Response('<!doctype html><title>Membership preview</title>',{headers:{'Content-Type':'text/html'}});}}};
  const auth={async getAdultSession(request){calls.push(['session',request]);return session;},async handleMembershipAuth(request){calls.push(['auth',request]);return new Response('{}',{headers:{'Content-Type':'application/json','Set-Cookie':'__Host-example=fictional; Secure; HttpOnly; Path=/; SameSite=Lax'}});}};
  const billing={async getMembershipStatus(){calls.push(['status']);return {active:false,plan:null,renewsAt:null,cancelAtPeriodEnd:false};},
    async createCheckout(context){calls.push(['checkout',context]);return {url:'https://checkout.stripe.com/c/pay/fictional'};},
    async createPortal(){calls.push(['portal']);return {url:'https://billing.stripe.com/p/session/fictional'};},
    async verifyPremium(){calls.push(['premium']);return true;},
    async processWebhook({onVerified}){calls.push(['webhook']);await onVerified();return {received:true};}};
  const make=(path='/api/member/session',{method='GET',body,headers={},raw=false,signal}={})=>new Request(MEMBER_ORIGIN+path,{method,signal,
    headers:{'Sec-Fetch-Site':'same-origin',...(method==='POST'?{'Content-Type':'application/json',Origin:MEMBER_ORIGIN}:{}),...headers},
    ...(body===undefined?{}:{body:raw?body:JSON.stringify(body)})});
  const options={reviewApproved:true,auth,billing,limiter:createBackstop()};
  const run=(request=make(),overrides={})=>handleMembershipRequest(request,env,{...options,...overrides});
  return {calls,db,session,env,auth,billing,make,run,options};
}
test('production source gate is closed before any request, environment or execution-context access',async()=>{
  assert.equal(MEMBERSHIP_SOURCE_RELEASE_APPROVED,false);
  const poison=new Proxy({},{get(){assert.fail('A disabled entry inspected input.');}});
  for(const response of [await worker.fetch(poison,poison,poison),await handleMembershipRequest(poison,poison),await handleMembershipRequest(poison,poison,{reviewApproved:'true'})]){
    assert.equal(response.status,503);assert.deepEqual(await response.json(),{available:false,error:'membership_unavailable'});
  }
});
test('runtime switches cannot enable live mode or access bindings while disabled',async t=>{
  const h=fixture(t);
  for(const change of [{MEMBERSHIP_ENABLED:'false'},{MEMBERSHIP_PROCESSING_REVIEWED:'false'},{MEMBERSHIP_DEPLOYMENT_MODE:'live'},{MEMBERSHIP_ENABLED:true}]){
    const response=await handleMembershipRequest(h.make(),{...h.env,...change,get MEMBERSHIP_DB(){assert.fail('Closed runtime read storage.');}},h.options);
    assert.equal(response.status,503);
  }
  assert.equal(h.calls.length,0);
});
test('only fixed public assets are served and their binding receives no purchaser headers',async t=>{
  const h=fixture(t),response=await h.run(h.make('/',{headers:{Cookie:'__Host-private=fictional','User-Agent':'PRIVATE_AGENT'}}));
  assert.equal(response.status,200);assert.equal(h.calls[0][0],'asset');
  assert.deepEqual([...h.calls[0][1].headers],[]);assert.equal(h.calls[0][1].url,MEMBER_ORIGIN+'/index.html');
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/u);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
  for(const path of ['/auth.js','/billing-schema.sql','/.env','/api/student','/api/classroom','/api/improvements','/api/member/session?debug=true','/api/member/%73ession'])assert.ok((await h.run(h.make(path))).status>=400,path);
});
test('foreign origins and caller credentials fail before auth, storage or provider work',async t=>{
  const h=fixture(t);
  const attempts=[new Request('https://www.colelearninglabs.com/api/member/session'),h.make('/api/member/session',{headers:{Origin:'https://attacker.example','Sec-Fetch-Site':'cross-site'}}),h.make('/api/member/session',{headers:{Authorization:'Bearer fictional'}}),h.make('/api/member/portal',{method:'POST',body:{},headers:{Origin:'https://attacker.example'}}),h.make('/api/member/portal',{method:'POST',body:{},headers:{'Sec-Fetch-Site':'cross-site'}})];
  for(const request of attempts)assert.equal((await h.run(request)).status,403);
  assert.equal(h.calls.length,0);assert.equal(h.db.sqlite.prepare('SELECT count(*) AS n FROM membership_admission').get().n,0);
});
test('only a verified unexpired server session receives a session-bound CSRF token',async t=>{
  const h=fixture(t),response=await h.run();assert.equal(response.status,200);
  const data=await response.json();assert.match(data.csrfToken,/^[A-Za-z0-9_-]{43}$/u);assert.equal(data.signedIn,true);
  assert.doesNotMatch(JSON.stringify(data),/educator@example|opaque_session|adult_teacher/);
  const request=h.make('/api/member/portal',{method:'POST',body:{},headers:{'X-Membership-CSRF':data.csrfToken}});
  assert.equal((await h.run(request)).status,200);assert.ok(h.calls.some(call=>call[0]==='portal'));
  for(const session of [null,{...h.session,user:{...h.session.user,emailVerified:false}},{...h.session,session:{...h.session.session,expiresAt:new Date(Date.now()-1)}}]){
    assert.equal((await h.run(h.make(),{auth:{...h.auth,async getAdultSession(){return session;}}})).status,401);
  }
});
test('billing mutations require current session-bound CSRF, strict JSON and bounded bytes',async t=>{
  const h=fixture(t),token=await csrfToken(h.env,h.session);
  for(const headers of [{},{'X-Membership-CSRF':'x'.repeat(43)},{'X-Membership-CSRF':await csrfToken(h.env,{...h.session,session:{...h.session.session,id:'another-session'}})}])assert.equal((await h.run(h.make('/api/member/portal',{method:'POST',body:{},headers}))).status,403);
  for(const [body,headers,expected]of [[{customer:'cus_OTHER'},{},400],['x'.repeat(2049),{},413],[{}, {'Content-Length':'bad'},413],[{}, {'Content-Type':'text/plain'},415]]){
    const response=await h.run(h.make('/api/member/portal',{method:'POST',body,raw:typeof body==='string',headers:{'X-Membership-CSRF':token,...headers}}));assert.equal(response.status,expected);
  }
  assert.equal(h.calls.some(call=>call[0]==='portal'),false);
});
test('stream byte ceiling and deadline do not trust declared length or a stalled sender',async()=>{
  await assert.rejects(boundedBytes(new Request(MEMBER_ORIGIN,{method:'POST',headers:{'Content-Length':'1'},body:'x'.repeat(2049)})),error=>error instanceof MembershipError&&error.status===413);
  const request=new Request(MEMBER_ORIGIN,{method:'POST',body:new ReadableStream({pull(){return new Promise(()=>{});}}),duplex:'half'});
  await assert.rejects(boundedBytes(request,{timeoutMs:10}),error=>error.status===408);
});
test('persistent admission counts only global route buckets and fails closed at a shared cap',async t=>{
  const db=database(t),now=()=>Date.parse('2026-10-31T12:00:00Z');
  for(let i=0;i<20;i++)await reserveAdmission(db,'auth',{now});
  await assert.rejects(reserveAdmission(db,'auth',{now}),error=>error.status===429);
  const rows=db.sqlite.prepare('SELECT * FROM membership_admission').all();assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.used===20),'Rejected minute admission must not consume the daily bucket.');
  assert.ok(rows.every(row=>/^auth:[md]:\d+$/u.test(row.bucket)));assert.ok(rows.every(row=>Object.keys(row).join(',')==='bucket,used,expires_at'));
  await assert.rejects(reserveAdmission({prepare(){throw new Error('fictional_storage_failure');}},'auth'),error=>error.status===503);
});
test('webhooks spend persistent admission only after the billing adapter verifies the signature',async t=>{
  const h=fixture(t),make=()=>h.make('/api/member/webhook',{method:'POST',body:{id:'fictional'},headers:{Origin:null,'Sec-Fetch-Site':'none','Stripe-Signature':'fictional'}});
  const webhookRequest=()=>{const request=make();request.headers.delete('Origin');return request;};
  const denied=await h.run(webhookRequest(),{billing:{...h.billing,async processWebhook(){throw new MembershipError(400);}}});assert.equal(denied.status,400);
  assert.equal(h.db.sqlite.prepare('SELECT count(*) AS n FROM membership_admission').get().n,0);
  assert.equal((await h.run(webhookRequest())).status,200);
  assert.equal(h.db.sqlite.prepare('SELECT count(*) AS n FROM membership_admission').get().n,2);
});
test('protected resources require both ownership-authenticated session and fresh paid entitlement',async t=>{
  const h=fixture(t);let reads=0;const resources=new Map([['review-sample',async()=>{reads++;return new Response('Fictional reviewed resource');}]]);
  const request=()=>h.make('/api/member/resources/review-sample');
  assert.equal((await h.run(request(),{resources,billing:{...h.billing,async verifyPremium(){return false;}}})).status,403);assert.equal(reads,0);
  const response=await h.run(request(),{resources});assert.equal(response.status,200);assert.equal(await response.text(),'Fictional reviewed resource');assert.equal(reads,1);
  assert.equal((await h.run(h.make('/api/member/resources/unknown'),{resources})).status,404);assert.equal(reads,1);
});
test('unset production catalog cannot start checkout even with injected authentication and enabled runtime',async t=>{
  const h=fixture(t),token=await csrfToken(h.env,h.session);
  const response=await handleMembershipRequest(h.make('/api/member/checkout',{method:'POST',body:{plan:'teacher-annual',adult:true,renewalConsent:true,termsVersion:'2026-10-31-review'},headers:{'X-Membership-CSRF':token}}),{...h.env,get STRIPE_SECRET_KEY(){assert.fail('Unset price inspected Stripe credentials.');}},{reviewApproved:true,auth:h.auth});
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{available:false,error:'membership_unavailable'});
});
