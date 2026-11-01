import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {serializeSignedCookie} from 'better-call';
import {runWithEndpointContext} from '@better-auth/core/context';
import {createMembershipAuth,getAdultSession,getOwnerLabAccess,MEMBERSHIP_SESSION_SECONDS} from '../auth.js';
import worker,{handleMembershipRequest,MEMBERSHIP_SOURCE_RELEASE_APPROVED} from '../worker.js';
import {createLocalAuthDatabase,fictionalAuthEnvironment} from '../auth-schema.mjs';
import {createBackstop,MembershipError} from '../security.js';

const ORIGIN='https://members.colelearninglabs.com';
const OWNER_EMAIL='teacher@example.test';
const OWNER_SUBJECT='fictional-verified-google-owner-subject';
const authSchema=await readFile(new URL('../auth-schema.sql',import.meta.url),'utf8');
const guardSchema=await readFile(new URL('../guard-schema.sql',import.meta.url),'utf8');

async function fixture(t){
  const database=createLocalAuthDatabase();database.sqlite.exec(authSchema);database.sqlite.exec(guardSchema);t.after(()=>database.close());
  const env={...fictionalAuthEnvironment(database.binding),MEMBERSHIP_ENABLED:'true',MEMBERSHIP_PROCESSING_REVIEWED:'true',
    MEMBERSHIP_DEPLOYMENT_MODE:'test',MEMBERSHIP_CSRF_SECRET:'Fictional-independent-csrf-secret-000000000000',
    MEMBERSHIP_OWNER_EMAIL:OWNER_EMAIL,MEMBERSHIP_OWNER_GOOGLE_SUBJECT:OWNER_SUBJECT,
    MEMBERSHIP_ALLOWED_EMAILS:OWNER_EMAIL+',second@example.test'};
  const auth=createMembershipAuth(env),context=await auth.$context;
  const assets=new Map([
    ['/learn/',{bytes:new TextEncoder().encode('PRIVATE_OWNER_HTML'),contentType:'text/html; charset=utf-8'}],
    ['/learn/src/app.js',{bytes:new TextEncoder().encode('PRIVATE_OWNER_FULL_APP'),contentType:'application/javascript; charset=utf-8'}],
    ['/learn/src/member-app.css',{bytes:new TextEncoder().encode('.owner{color:green}'),contentType:'text/css; charset=utf-8'}]
  ]);
  const billing=new Proxy({},{get(){assert.fail('Owner content access must not inspect or call any billing provider.');}});
  const options={reviewApproved:true,billing,protectedAssets:assets,limiter:createBackstop()};
  async function member({email=OWNER_EMAIL,subject=OWNER_SUBJECT}={}){
    const request=new Request(ORIGIN+'/api/auth/callback/google?state=fictional');
    const record=await runWithEndpointContext({context,request,headers:request.headers},async()=>{
      const user=await context.internalAdapter.createUser({email,emailVerified:true,name:'Teacher member',image:null},
        {method:'oauth',oauth:{providerId:'google',profile:{sub:subject,email,email_verified:true}}});
      await context.internalAdapter.createAccount({userId:user.id,providerId:'google',accountId:subject});
      return {user,session:await context.internalAdapter.createSession(user.id)};
    });
    const cookie=(await serializeSignedCookie(context.authCookies.sessionToken.name,record.session.token,
      env.MEMBERSHIP_AUTH_SECRET,context.authCookies.sessionToken.attributes)).split(';')[0];
    return {...record,cookie};
  }
  const make=(path='/learn/',{member,method='GET',headers={},body,signal}={})=>new Request(ORIGIN+path,{method,signal,
    headers:{'Sec-Fetch-Site':'same-origin',...(member?{Cookie:member.cookie}:{}),
      ...(method==='POST'?{Origin:ORIGIN,'Content-Type':'application/json'}:{}),...headers},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {database,env,context,assets,options,make,member,
    run:(request,overrides={})=>handleMembershipRequest(request,env,{...options,...overrides})};
}

test('real signed owner sessions open every private asset with no price, subscription, customer or billing calls',async t=>{
  const h=await fixture(t),member=await h.member();
  for(const [path,asset]of h.assets){
    const response=await h.run(h.make(path,{member}));assert.equal(response.status,200,path);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()),asset.bytes);
    assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  }
  const response=await h.run(h.make('/api/member/session',{member}));assert.equal(response.status,200);
  const status=await response.json();assert.equal(status.labAccess,'owner');
  assert.deepEqual(status.membership,{active:false,plan:null,renewsAt:null,cancelAtPeriodEnd:false});
  assert.match(status.csrfToken,/^[A-Za-z0-9_-]{43}$/u);
  assert.ok(!JSON.stringify(status).includes(OWNER_EMAIL));assert.ok(!JSON.stringify(status).includes(OWNER_SUBJECT));
  const tables=h.database.sqlite.prepare("SELECT name FROM sqlite_schema WHERE name LIKE 'membership_billing_%'").all();
  assert.deepEqual(tables,[],'Owner access must not even need billing tables.');
  assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS count FROM membership_admission').get().count,2,'Normal anonymous admission remains mandatory.');
});

test('owner checkout and portal actions are rejected before reading provider configuration or browser payment claims',async t=>{
  const h=await fixture(t),member=await h.member();
  for(const path of ['/api/member/checkout','/api/member/portal']){
    const response=await h.run(h.make(path,{member,method:'POST',body:{role:'owner',price:'free',owner:true}}));
    assert.equal(response.status,403);assert.deepEqual(await response.json(),{available:false,error:'membership_unavailable'});
  }
});

test('removing or changing the live linked Google subject immediately revokes owner access and never falls through to billing',async t=>{
  const h=await fixture(t),member=await h.member();assert.equal((await h.run(h.make('/learn/',{member}))).status,200);
  h.database.sqlite.prepare('UPDATE membership_auth_account SET accountId=? WHERE userId=?').run('different-google-subject',member.user.id);
  for(const path of ['/learn/','/learn/src/app.js','/api/member/session','/api/member/checkout','/api/member/portal']){
    const payment=path.endsWith('/checkout')||path.endsWith('/portal');
    assert.equal((await h.run(h.make(path,{member,method:payment?'POST':'GET',...(payment?{body:{}}:{})}))).status,403,path);
  }
  h.database.sqlite.prepare('DELETE FROM membership_auth_account WHERE userId=?').run(member.user.id);
  assert.equal((await h.run(h.make('/learn/',{member}))).status,403);
});

test('owner grants require one exact linked Google identity and the current allowlist, not an email alone',async t=>{
  const h=await fixture(t),member=await h.member();
  const session=await getAdultSession(h.make('/learn/',{member}),h.env);assert.ok(session);
  await h.context.internalAdapter.createAccount({userId:member.user.id,providerId:'google',accountId:'second-fictional-subject'});
  await assert.rejects(getOwnerLabAccess(session,h.env),error=>error instanceof MembershipError&&error.status===403);
  h.database.sqlite.prepare('DELETE FROM membership_auth_account WHERE accountId=?').run('second-fictional-subject');
  h.env.MEMBERSHIP_ALLOWED_EMAILS='second@example.test';
  assert.equal((await h.run(h.make('/learn/',{member}))).status,401);
  await assert.rejects(getOwnerLabAccess(session,h.env),error=>error.status===403);
});

test('missing, forged, expired, revoked and unverified sessions cannot authorize the owner path',async t=>{
  const h=await fixture(t),member=await h.member();
  for(const headers of [{Cookie:'__Host-cll-member.session_token=forged; role=owner'},
    {'X-Owner-Email':OWNER_EMAIL,'X-Owner-Subject':OWNER_SUBJECT,'X-Role':'owner'},
    {Authorization:'Bearer fictional-owner-token'}]){
    assert.ok([401,403].includes((await h.run(h.make('/learn/',{headers}))).status));
  }
  assert.equal((await h.run(h.make('/learn/'))).status,401);
  const session=await getAdultSession(h.make('/learn/',{member}),h.env);
  await assert.rejects(getOwnerLabAccess({...session,user:{...session.user,emailVerified:false}},h.env),error=>error.status===403);
  await assert.rejects(getOwnerLabAccess({...session,session:{...session.session,id:'forged-session'}},h.env),error=>error.status===403);
  h.database.sqlite.prepare('UPDATE membership_auth_session SET expiresAt=? WHERE id=?').run(new Date(Date.now()-1).toISOString(),member.session.id);
  assert.equal((await h.run(h.make('/learn/',{member}))).status,401);
  await assert.rejects(getOwnerLabAccess(session,h.env),error=>error.status===403);
  h.database.sqlite.prepare('DELETE FROM membership_auth_session WHERE id=?').run(member.session.id);
  await assert.rejects(getOwnerLabAccess(session,h.env),error=>error.status===403);
});

test('the owner check separately enforces absolute session age and current stored verified email',async t=>{
  const h=await fixture(t),member=await h.member(),session=await getAdultSession(h.make('/learn/',{member}),h.env);
  const selectedNow=Date.now();h.database.sqlite.prepare('UPDATE membership_auth_session SET createdAt=?,expiresAt=? WHERE id=?').run(
    new Date(selectedNow-MEMBERSHIP_SESSION_SECONDS*1000-1).toISOString(),new Date(selectedNow+3600000).toISOString(),member.session.id);
  await assert.rejects(getOwnerLabAccess(session,h.env,{now:()=>selectedNow}),error=>error.status===403);
  h.database.sqlite.prepare('UPDATE membership_auth_session SET createdAt=? WHERE id=?').run(new Date(selectedNow).toISOString(),member.session.id);
  h.database.sqlite.prepare('UPDATE membership_auth_user SET email=? WHERE id=?').run('second@example.test',member.user.id);
  await assert.rejects(getOwnerLabAccess(session,h.env),error=>error.status===403);
});

test('partial, wildcard or malformed private owner configuration fails closed without billing',async t=>{
  const h=await fixture(t),member=await h.member();
  for(const change of [{MEMBERSHIP_OWNER_EMAIL:'*@example.test'}, {MEMBERSHIP_OWNER_EMAIL:OWNER_EMAIL+',second@example.test'},
    {MEMBERSHIP_OWNER_EMAIL:' '+OWNER_EMAIL}, {MEMBERSHIP_OWNER_GOOGLE_SUBJECT:undefined},
    {MEMBERSHIP_OWNER_EMAIL:undefined}, {MEMBERSHIP_OWNER_GOOGLE_SUBJECT:'subject with whitespace'}]){
    const env={...h.env,...change};
    assert.equal((await handleMembershipRequest(h.make('/api/member/session',{member}),env,h.options)).status,503);
  }
});

test('nonowner identities and forged roles cannot receive owner access; paid subscribers still need their own fresh checks',async t=>{
  const h=await fixture(t),member=await h.member({email:'second@example.test',subject:'fictional-second-subject'});
  let checks=0;const billing={async verifyPremium(){checks++;return false;}};
  const request=()=>h.make('/learn/',{member,headers:{'X-Role':'owner','X-Owner-Email':OWNER_EMAIL,'X-Owner-Subject':OWNER_SUBJECT}});
  assert.equal((await h.run(request(),{billing})).status,403);assert.equal(checks,1);
  const paid={async verifyPremium(){checks++;return true;}};
  assert.equal((await h.run(request(),{billing:paid})).status,200);assert.equal(checks,2);
  assert.equal((await h.run(h.make('/learn/src/app.js',{member}),{billing:paid})).status,200);assert.equal(checks,3);
  assert.equal((await h.run(request(),{billing})).status,403);assert.equal(checks,4);
});

test('owner content access preserves global concurrency/admission, unknown-resource denials and the closed production export',async t=>{
  const h=await fixture(t),member=await h.member();
  assert.equal((await h.run(h.make('/learn/unknown.js',{member}))).status,404);
  assert.equal((await h.run(h.make('/learn/',{member}),{limiter:{acquire:()=>null}})).status,429);
  assert.equal((await h.run(h.make('/learn/',{member}),{async admission(){throw new MembershipError(429);}})).status,429);
  assert.equal(MEMBERSHIP_SOURCE_RELEASE_APPROVED,false);
  const poison=new Proxy({},{get(){assert.fail('Source-closed worker read owner configuration.');}});
  assert.equal((await worker.fetch(poison,poison)).status,503);
  const response=await handleMembershipRequest(h.make('/learn/',{member}),{...h.env,MEMBERSHIP_ENABLED:'false'},h.options);
  assert.equal(response.status,503);
});
