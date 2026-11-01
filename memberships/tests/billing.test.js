import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import Stripe from 'stripe';
import {createCheckout,createPortal,getMembershipStatus,verifyPremium,processWebhook,BillingError,STRIPE_API_VERSION,LIVE_BILLING_REVIEW_APPROVED} from '../billing.js';
import {createBillingStore} from '../store.js';
import {BILLING_TERMS_VERSION,DRAFT_CATALOG,MEMBERSHIP_OFFER,reviewedPlans} from '../catalog.js';

const schema=readFileSync(new URL('../billing-schema.sql',import.meta.url),'utf8');
const APP='cole-learning-labs-memberships';
const MEMBER={id:'adult-member-one',email:'educator@example.invalid',emailVerified:true};
const CATALOG={reviewed:true,plans:[
  {id:'teacher-monthly',priceId:'price_monthly0001',amount:1000,currency:'usd',interval:'month'},
  {id:'teacher-annual',priceId:'price_annual0001',amount:9900,currency:'usd',interval:'year'}
]};
const consent=(plan='teacher-monthly')=>({plan,adult:true,renewalConsent:true,termsVersion:BILLING_TERMS_VERSION});
function database(t){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(schema);t.after(()=>sqlite.close());
  const make=(sql,values=[])=>({sql,values,bind(...selected){return make(sql,selected);},
    async all(){return {success:true,results:sqlite.prepare(sql).all(...values)};},
    async run(){const r=sqlite.prepare(sql).run(...values);return {success:true,meta:{changes:Number(r.changes)}};},
    execute(){const r=sqlite.prepare(sql).run(...values);return {success:true,meta:{changes:Number(r.changes)}};}});
  const binding={prepare(sql){return make(sql);},async batch(statements){
    sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(statement=>statement.execute());sqlite.exec('COMMIT');return results;}
    catch(error){sqlite.exec('ROLLBACK');throw error;}
  }};
  return {sqlite,binding,store:createBillingStore(binding)};
}
function fixture(t){
  const db=database(t),calls=[],verifiedEvents=[],customers=new Map(),checkouts=new Map(),idempotency=new Map();
  let time=Math.floor(Date.now()/1000),serial=0;
  const env={MEMBERSHIP_DEPLOYMENT_MODE:'test',STRIPE_SECRET_KEY:'sk_test_notarealcredential00000000',
    MEMBERSHIP_STRIPE_ACCOUNT_ID:'acct_ownaccount0001',MEMBERSHIP_STRIPE_PORTAL_CONFIGURATION_ID:'bpc_cancelonly0001',
    MEMBERSHIP_STRIPE_WEBHOOK_SECRET:'whsec_fictionalfixture0000000000000000',MEMBERSHIP_DB:db.binding,
    MEMBERSHIP_STRIPE_CANCELLATION_URL:'https://billing.stripe.com/p/login/test_fixture0001'};
  const state={subscriptions:[],hasMore:false,priceOverride:null,portalOverride:null,chargeOverride:null,intentOverride:null,invoicePaymentOverride:null};
  const realStripe=new Stripe(env.STRIPE_SECRET_KEY,{apiVersion:STRIPE_API_VERSION});
  const record=(method,data,options)=>calls.push({method,data,options});
  const planPrice=priceId=>{
    const p=CATALOG.plans.find(plan=>plan.priceId===priceId);
    return {id:p.priceId,active:true,livemode:false,type:'recurring',currency:p.currency,unit_amount:p.amount,
      billing_scheme:'per_unit',recurring:{interval:p.interval,interval_count:1,usage_type:'licensed'}};
  };
  const stripe={
    accounts:{async retrieveCurrent(data,opts){record('accounts.retrieveCurrent',data,opts);return {id:env.MEMBERSHIP_STRIPE_ACCOUNT_ID,charges_enabled:true};}},
    prices:{async retrieve(priceId,data,opts){record('prices.retrieve',{priceId,...data},opts);return {...planPrice(priceId),...state.priceOverride};}},
    customers:{async create(data,opts){
      record('customers.create',data,opts);
      if(idempotency.has(opts.idempotencyKey))return idempotency.get(opts.idempotencyKey);
      const result={id:'cus_customer'+String(customers.size+1).padStart(4,'0'),livemode:false,...data};
      customers.set(result.id,result);idempotency.set(opts.idempotencyKey,result);return result;
    }},
    subscriptions:{async list(data,opts){record('subscriptions.list',data,opts);return {data:state.subscriptions,has_more:state.hasMore};}},
    checkout:{sessions:{async create(data,opts){
      record('checkout.sessions.create',data,opts);
      if(idempotency.has(opts.idempotencyKey))return idempotency.get(opts.idempotencyKey);
      const checkoutId='cs_test_session'+String(checkouts.size+1).padStart(4,'0');
      const result={id:checkoutId,livemode:false,status:'open',mode:'subscription',customer:data.customer,
        client_reference_id:data.client_reference_id,expires_at:data.expires_at,
        line_items:{has_more:false,data:[{price:{id:data.line_items[0].price}}]},url:'https://checkout.stripe.com/c/pay/'+checkoutId};
      checkouts.set(checkoutId,result);idempotency.set(opts.idempotencyKey,result);return result;
    },async retrieve(checkoutId,data,opts){record('checkout.sessions.retrieve',{checkoutId,...data},opts);return checkouts.get(checkoutId);}}},
    billingPortal:{configurations:{async retrieve(configId,data,opts){record('billingPortal.configurations.retrieve',{configId,...data},opts);
      return {id:configId,active:true,livemode:false,login_page:{enabled:true,url:env.MEMBERSHIP_STRIPE_CANCELLATION_URL},features:{invoice_history:{enabled:true},subscription_cancel:{enabled:true,mode:'at_period_end'},subscription_update:{enabled:false}},...state.portalOverride};}},
      sessions:{async create(data,opts){record('billingPortal.sessions.create',data,opts);return {livemode:false,...data,url:'https://billing.stripe.com/p/session/test_fixture0001'};}}},
    invoicePayments:{async list(data,opts){record('invoicePayments.list',data,opts);
      return {has_more:false,data:[{livemode:false,status:'paid',currency:'usd',amount_paid:1000,invoice:data.invoice,
        payment:{type:'payment_intent',payment_intent:'pi_payment0001'},...state.invoicePaymentOverride}]};}},
    paymentIntents:{async retrieve(intentId,data,opts){record('paymentIntents.retrieve',{intentId,...data},opts);
      return {id:intentId,livemode:false,status:'succeeded',amount_received:1000,currency:'usd',customer:'cus_customer0001',
        latest_charge:{id:'ch_charge0001',livemode:false,paid:true,captured:true,status:'succeeded',refunded:false,amount_refunded:0,
          disputed:false,amount:1000,currency:'usd',customer:'cus_customer0001',payment_intent:intentId,payment_method_details:{type:'card'},...state.chargeOverride},...state.intentOverride};}},
    charges:{async retrieve(chargeId,data,opts){record('charges.retrieve',{chargeId,...data},opts);return {id:chargeId,livemode:false,customer:'cus_customer0001'};}},
    webhooks:realStripe.webhooks
  };
  const deps={stripe,store:db.store,catalog:CATALOG,now:()=>time,randomId:()=>`fixture-random-00000000-${++serial}`};
  const context={env,member:MEMBER,body:consent()};
  const account=()=>db.sqlite.prepare('SELECT * FROM membership_billing_accounts WHERE member_id=?').get(MEMBER.id);
  async function checkout(){return createCheckout(context,deps);}
  function activate(overrides={}){
    const invoice={id:'in_invoice0001',livemode:false,status:'paid',currency:'usd',amount_paid:1000,amount_due:1000,amount_remaining:0,
      customer:'cus_customer0001',parent:{subscription_details:{subscription:'sub_subscription0001'}},billing_reason:'subscription_create'};
    state.subscriptions=[{id:'sub_subscription0001',customer:'cus_customer0001',livemode:false,status:'active',collection_method:'charge_automatically',
      metadata:{app:APP,member_id:MEMBER.id,plan_id:'teacher-monthly',checkout_key:account().checkout_key,
        terms_version:BILLING_TERMS_VERSION,cancellation_url:env.MEMBERSHIP_STRIPE_CANCELLATION_URL},cancel_at_period_end:false,cancel_at:null,discounts:[],
      items:{has_more:false,data:[{quantity:1,price:planPrice(CATALOG.plans[0].priceId),current_period_start:time-60,current_period_end:time+86400}]},
      latest_invoice:invoice,...overrides}];
  }
  function event(type='invoice.paid',overrides={}){
    const value={id:'evt_event0001',api_version:STRIPE_API_VERSION,livemode:false,created:time,type,
      data:{object:{customer:'cus_customer0001',livemode:false}},...overrides};
    const rawBody=JSON.stringify(value);
    const signature=realStripe.webhooks.generateTestHeaderString({payload:rawBody,secret:env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET});
    return {env,rawBody,signature,onVerified:async()=>{verifiedEvents.push(value.id);}};
  }
  return {...db,env,stripe,state,calls,verifiedEvents,context,deps,customers,checkouts,idempotency,checkout,account,activate,event,
    setTime(value){time=value;},getTime(){return time;}};
}
const rejectStatus=(fn,status)=>assert.rejects(fn,error=>error instanceof BillingError&&error.status===status&&error.message==='membership_unavailable');

test('unpriced production catalog stays closed before reading secrets, payloads, storage or SDK',async()=>{
  const poison=new Proxy({},{get(){assert.fail('Unapproved price accessed an external dependency.');}});
  assert.equal(LIVE_BILLING_REVIEW_APPROVED,false);assert.deepEqual(reviewedPlans(DRAFT_CATALOG),[]);
  assert.ok(MEMBERSHIP_OFFER.plans.every(plan=>plan.amount===null));
  await rejectStatus(()=>createCheckout({env:poison,member:poison,body:poison}),503);
  await rejectStatus(()=>createPortal({env:poison,member:poison}),503);
  await rejectStatus(()=>processWebhook({env:poison,rawBody:poison,signature:poison}),503);
  assert.deepEqual(await getMembershipStatus({env:poison,member:poison}),{active:false,plan:null,renewsAt:null,cancelAtPeriodEnd:false});
  assert.equal(await verifyPremium({env:poison,member:poison}),false);
});

test('server pins the test catalog, amount, recurring term, account, cancellation policy and hosted destination',async t=>{
  const h=fixture(t),result=await h.checkout();
  assert.match(result.url,/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/u);
  const call=h.calls.find(entry=>entry.method==='checkout.sessions.create');
  assert.equal(call.options.maxNetworkRetries,0);assert.equal(call.options.timeout,5000);
  assert.equal(call.data.mode,'subscription');assert.deepEqual(call.data.line_items,[{price:'price_monthly0001',quantity:1}]);
  assert.deepEqual(call.data.allowed_payment_method_types,['card']);assert.equal(call.data.allow_promotion_codes,false);
  assert.deepEqual(call.data.automatic_tax,{enabled:false});assert.equal(call.data.success_url,'https://members.colelearninglabs.com/');
  assert.equal(call.data.cancel_url,call.data.success_url);assert.equal(call.data.client_reference_id,MEMBER.id);
  assert.match(call.data.custom_text.submit.message,/USD \$10\.00 per month/u);
  assert.match(call.data.custom_text.submit.message,/renews automatically/u);assert.match(call.data.custom_text.submit.message,/Cancel online/u);
  assert.equal(call.data.consent_collection.terms_of_service,'required');
  const consentRow=h.sqlite.prepare('SELECT * FROM membership_billing_consents').get();
  assert.equal(consentRow.amount,1000);assert.equal(consentRow.terms_version,BILLING_TERMS_VERSION);
  assert.equal(consentRow.member_id,MEMBER.id);assert.equal(consentRow.interval,'month');
  assert.equal(consentRow.cancellation_url,h.env.MEMBERSHIP_STRIPE_CANCELLATION_URL);
  assert.equal(call.data.subscription_data.metadata.cancellation_url,consentRow.cancellation_url);
  assert.equal(h.account().state,'inactive');assert.equal(h.account().paid_until,0,'Checkout creation must never grant access.');
});

test('extra browser authority, missing affirmative consent and unverified identities are rejected before provider calls',async t=>{
  const h=fixture(t);
  for(const body of [{...consent(),priceId:'price_attacker0001'},{...consent(),customer:'cus_other0001'},
    {...consent(),returnUrl:'https://attacker.invalid'}, {...consent(),amount:1}, {...consent(),adult:false},
    {...consent(),renewalConsent:false},{...consent(),termsVersion:'old'}, {...consent(),plan:'unknown'}]){
    await rejectStatus(()=>createCheckout({...h.context,body},h.deps),400);
  }
  await rejectStatus(()=>createCheckout({...h.context,member:{...MEMBER,emailVerified:false}},h.deps),401);
  assert.equal(h.calls.length,0);assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM membership_billing_accounts').get().n,0);
});

test('live keys, wrong mode and malformed account IDs remain closed even with approved fixture prices',async t=>{
  const h=fixture(t);
  for(const override of [{STRIPE_SECRET_KEY:'sk_live_forbidden0000000000'},{MEMBERSHIP_DEPLOYMENT_MODE:'live'},
    {MEMBERSHIP_STRIPE_ACCOUNT_ID:'acct_other/escape'},{MEMBERSHIP_STRIPE_PORTAL_CONFIGURATION_ID:'not-approved'}]){
    await rejectStatus(()=>createCheckout({...h.context,env:{...h.env,...override}},h.deps),503);
  }
  assert.equal(h.calls.length,0);
});

test('sequential and parallel duplicate checkout attempts create one customer and one subscription checkout',async t=>{
  const h=fixture(t),both=await Promise.allSettled([h.checkout(),h.checkout()]);
  assert.equal(both.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(both.filter(result=>result.status==='rejected'&&result.reason.status===409).length,1);
  const again=await h.checkout();assert.equal(again.url,[...h.checkouts.values()][0].url);
  assert.equal(h.calls.filter(call=>call.method==='customers.create').length,1);
  assert.equal(h.calls.filter(call=>call.method==='checkout.sessions.create').length,1);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM membership_billing_consents').get().n,1);
});

test('unknown checkout outcome keeps a durable idempotency key and cannot silently create another checkout',async t=>{
  const h=fixture(t),original=h.stripe.checkout.sessions.create;
  let first=true;h.stripe.checkout.sessions.create=async(...args)=>{const result=await original(...args);if(first){first=false;throw new Error('fictional provider timeout containing private content');}return result;};
  await rejectStatus(()=>h.checkout(),503);const pending=h.account();assert.ok(pending.checkout_key);assert.equal(pending.checkout_id,null);
  const resumed=await h.checkout();assert.match(resumed.url,/checkout.stripe.com/u);assert.equal(h.checkouts.size,1);
  const attempts=h.calls.filter(call=>call.method==='checkout.sessions.create');assert.equal(attempts.length,2);
  assert.equal(attempts[0].options.idempotencyKey,attempts[1].options.idempotencyKey);
  assert.deepEqual(attempts[0].data,attempts[1].data);
});

test('unknown customer creation beyond the processor idempotency window requires review rather than making a duplicate',async t=>{
  const h=fixture(t),original=h.stripe.customers.create;
  h.stripe.customers.create=async(...args)=>{await original(...args);throw new Error('unknown commit');};
  await rejectStatus(()=>h.checkout(),503);h.setTime(h.getTime()+24*3600);
  h.stripe.customers.create=original;await rejectStatus(()=>h.checkout(),503);
  assert.equal(h.customers.size,1);assert.equal(h.calls.filter(call=>call.method==='customers.create').length,1);
});

test('provider price drift and cancellation-obstructing portal settings fail before creating a customer or checkout',async t=>{
  const h=fixture(t);
  for(const override of [{unit_amount:1},{currency:'eur'},{livemode:true},{active:false},{recurring:{interval:'week',interval_count:1,usage_type:'licensed'}}]){
    h.state.priceOverride=override;await rejectStatus(()=>h.checkout(),503);
  }
  h.state.priceOverride=null;
  for(const features of [{subscription_cancel:{enabled:false,mode:'at_period_end'}},
    {subscription_cancel:{enabled:true,mode:'immediately'}},
    {subscription_cancel:{enabled:true,mode:'at_period_end'},subscription_update:{enabled:true}}]){
    h.state.portalOverride={features};await rejectStatus(()=>h.checkout(),503);
  }
  assert.equal(h.customers.size,0);assert.equal(h.checkouts.size,0);
});

test('only a current paid approved subscription and successful unreversed card charge unlock premium',async t=>{
  const h=fixture(t);await h.checkout();h.activate();
  const state=await getMembershipStatus(h.context,h.deps);
  assert.deepEqual(state,{active:true,plan:'teacher-resources',renewsAt:h.getTime()+86400,cancelAtPeriodEnd:false});
  assert.equal(await verifyPremium(h.context,h.deps),true);
  assert.equal(h.account().state,'active');assert.equal(h.calls.filter(call=>call.method==='paymentIntents.retrieve').length,2);
  await rejectStatus(()=>h.checkout(),409,'An existing subscription must not be duplicated.');
});

test('reviewed annual test prices retain annual renewal disclosure and require the matching annual paid amount',async t=>{
  const h=fixture(t);h.context.body=consent('teacher-annual');await h.checkout();h.activate();
  const plan=CATALOG.plans[1],sub=h.state.subscriptions[0];
  sub.metadata.plan_id=plan.id;sub.items.data[0].price.id=plan.priceId;sub.items.data[0].current_period_end=h.getTime()+365*86400;
  sub.latest_invoice.amount_paid=plan.amount;sub.latest_invoice.amount_due=plan.amount;
  h.state.invoicePaymentOverride={amount_paid:plan.amount};
  h.state.intentOverride={amount_received:plan.amount};h.state.chargeOverride={amount:plan.amount};
  assert.equal(await verifyPremium(h.context,h.deps),true);
  const call=h.calls.find(entry=>entry.method==='checkout.sessions.create');
  assert.match(call.data.custom_text.submit.message,/USD \$99\.00 per year/u);
  assert.equal(h.sqlite.prepare('SELECT interval FROM membership_billing_consents').get().interval,'year');
});

test('trialing, past-due, unpaid, duplicate, expired, mismatched and refunded states never unlock premium',async t=>{
  const h=fixture(t);await h.checkout();
  for(const status of ['trialing','past_due','unpaid','incomplete','paused']){
    h.activate({status});assert.equal(await verifyPremium(h.context,h.deps),false,status);
  }
  h.activate({status:'canceled'});assert.equal(await verifyPremium(h.context,h.deps),false);
  h.activate();h.state.subscriptions.push({...h.state.subscriptions[0],id:'sub_duplicate0001'});await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
  h.activate();h.state.subscriptions[0].items.data[0].current_period_end=h.getTime()-1;await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
  h.activate();h.state.subscriptions[0].metadata.member_id='another-member';await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
  h.activate();h.state.subscriptions[0].latest_invoice.status='open';await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
  h.activate();h.state.chargeOverride={amount_refunded:1};await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
  h.state.chargeOverride={disputed:true};await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
  h.state.chargeOverride=null;h.state.invoicePaymentOverride={payment:{type:'payment_record',payment_record:'manual'}};
  await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
});

test('provider metadata and paid money alone cannot replace the recorded affirmative renewal consent',async t=>{
  const h=fixture(t);await h.checkout();h.activate();
  h.state.subscriptions[0].metadata.checkout_key='unrecorded-operation';await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
  h.activate();h.state.subscriptions[0].metadata.terms_version='unapproved-terms';await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
  h.activate();h.state.subscriptions[0].metadata.cancellation_url='https://attacker.invalid';await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
  h.activate();h.sqlite.exec('DELETE FROM membership_billing_consents');await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
});

test('cancellation stops renewal but permits access only until the already paid period ends',async t=>{
  const h=fixture(t);await h.checkout();h.activate({cancel_at_period_end:true});
  assert.equal((await getMembershipStatus(h.context,h.deps)).cancelAtPeriodEnd,true);
  h.setTime(h.getTime()+86401);await rejectStatus(()=>verifyPremium(h.context,h.deps),503);
});

test('billing portal uses only the authenticated member customer and reviewed cancel-at-period-end configuration',async t=>{
  const h=fixture(t);await h.checkout();const result=await createPortal(h.context,h.deps);
  assert.equal(result.url,'https://billing.stripe.com/p/session/test_fixture0001');
  const call=h.calls.find(entry=>entry.method==='billingPortal.sessions.create');
  assert.deepEqual(call.data,{customer:'cus_customer0001',configuration:'bpc_cancelonly0001',return_url:'https://members.colelearninglabs.com/'});
  await h.store.invalidate(MEMBER.id,true);
  assert.match((await createPortal(h.context,h.deps)).url,/^https:\/\/billing\.stripe\.com\/p\/session\//u,'A billing hold must not obstruct cancellation.');
  await rejectStatus(()=>createPortal({...h.context,member:{...MEMBER,id:'another-adult'}},h.deps),409);
});

test('checkout requires an independent, enabled and exact hosted cancellation login before creating payment objects',async t=>{
  const h=fixture(t);
  for(const login_page of [{enabled:false,url:h.env.MEMBERSHIP_STRIPE_CANCELLATION_URL},{enabled:true,url:'https://billing.stripe.com/p/login/test_another'}]){
    h.state.portalOverride={login_page};await rejectStatus(()=>h.checkout(),503);
  }
  h.state.portalOverride=null;
  for(const url of ['https://billing.stripe.com.attacker.invalid/p/login/test_fake','https://billing.stripe.com/p/login/live_link',
    'https://billing.stripe.com/p/login/test_fixture0001?prefilled_email=private@example.invalid']){
    await rejectStatus(()=>createCheckout({...h.context,env:{...h.env,MEMBERSHIP_STRIPE_CANCELLATION_URL:url}},h.deps),503);
  }
  assert.equal(h.customers.size,0);assert.equal(h.checkouts.size,0);
});

test('real SDK signature validation rejects unsigned, tampered, expired and wrong-mode/version webhooks',async t=>{
  const h=fixture(t);await h.checkout();h.activate();
  const signed=h.event();
  await rejectStatus(()=>processWebhook({...signed,signature:'not-signed'},h.deps),400);
  await rejectStatus(()=>processWebhook({...signed,rawBody:signed.rawBody+' '},h.deps),400);
  const expired=h.stripe.webhooks.generateTestHeaderString({payload:signed.rawBody,secret:h.env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET,timestamp:1});
  await rejectStatus(()=>processWebhook({...signed,signature:expired},h.deps),400);
  for(const override of [{livemode:true},{api_version:'old-api'},{account:'acct_foreign0001'},{created:h.getTime()+120}]){
    await rejectStatus(()=>processWebhook(h.event('invoice.paid',override),h.deps),400);
  }
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM membership_billing_events').get().n,0);
  assert.equal(h.verifiedEvents.length,0,'Rejected signatures or account/mode/version must not spend the persistent admission quota.');
});

test('verified event replays are idempotent and event-ID payload changes are rejected',async t=>{
  const h=fixture(t);await h.checkout();h.activate();const signed=h.event();
  assert.deepEqual(await processWebhook(signed,h.deps),{received:true});assert.equal(h.account().state,'active');
  const count=h.calls.length;assert.deepEqual(await processWebhook(signed,h.deps),{received:true});assert.equal(h.calls.length,count);
  await rejectStatus(()=>processWebhook(h.event('invoice.payment_failed'),h.deps),400);
  const row=h.sqlite.prepare('SELECT * FROM membership_billing_events').get();
  assert.equal(row.state,'processed');assert.equal(row.digest.length,64);assert.equal(Object.hasOwn(row,'payload'),false);
});

test('old paid events consult current provider state instead of reviving a canceled subscription',async t=>{
  const h=fixture(t);await h.checkout();h.activate({status:'canceled'});
  assert.deepEqual(await processWebhook(h.event('invoice.paid',{created:h.getTime()-1000}),h.deps),{received:true});
  assert.equal(h.account().state,'inactive');assert.equal(await verifyPremium(h.context,h.deps),false);
});

test('refunds and disputes latch a review hold that later paid events cannot clear',async t=>{
  const h=fixture(t);await h.checkout();h.activate();await processWebhook(h.event(),h.deps);
  const refunded=h.event('charge.refunded',{id:'evt_refunded0001'});await processWebhook(refunded,h.deps);
  assert.equal(h.account().billing_hold,1);assert.equal(h.account().state,'blocked');
  await processWebhook(h.event('invoice.paid',{id:'evt_laterpaid0001'}),h.deps);
  assert.equal(await verifyPremium(h.context,h.deps),false);await rejectStatus(()=>h.checkout(),409);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM membership_billing_events WHERE state='processed'").get().n,3);
});

test('lease fencing and event invalidation prevent a stale in-flight premium read from committing an unlock',async t=>{
  const h=fixture(t);await h.checkout();h.activate();
  const original=h.stripe.paymentIntents.retrieve;let release,entered;
  const didEnter=new Promise(resolve=>{entered=resolve;});
  h.stripe.paymentIntents.retrieve=async(...args)=>{entered();await new Promise(resolve=>{release=resolve;});return original(...args);};
  const inFlight=verifyPremium(h.context,h.deps);await didEnter;
  await processWebhook(h.event('charge.refunded',{id:'evt_racerefund0001'}),h.deps);
  release();await rejectStatus(()=>inFlight,503);
  assert.equal(h.account().state,'blocked');assert.equal(h.account().billing_hold,1);
});

test('busy webhook processing fails for retry with access blocked; the same event can then complete safely',async t=>{
  const h=fixture(t);await h.checkout();h.activate();
  const held=await h.store.acquire(MEMBER.id,'existing-operation-token',h.getTime());assert.ok(held);
  const signed=h.event();await rejectStatus(()=>processWebhook(signed,h.deps),409);
  assert.equal(h.account().state,'blocked');assert.equal(h.account().paid_until,0);
  await h.store.release(MEMBER.id,'existing-operation-token');
  await processWebhook(signed,h.deps);assert.equal(h.account().state,'active');
});

test('unknown customer events are acknowledged without recording a payload or creating a membership',async t=>{
  const h=fixture(t);
  await processWebhook(h.event(),h.deps);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM membership_billing_events').get().n,0);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM membership_billing_accounts').get().n,0);
  assert.equal(h.verifiedEvents.length,0,'An unrelated customer does not spend the feature webhook quota.');
});

test('webhook processing requires trusted admission after verification and fails closed if that admission is unavailable',async t=>{
  const h=fixture(t);await h.checkout();h.activate();
  await rejectStatus(()=>processWebhook({...h.event(),onVerified:undefined},h.deps),503);
  await rejectStatus(()=>processWebhook({...h.event(),onVerified:async()=>{throw {status:429};}},h.deps),429);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM membership_billing_events').get().n,0);
  assert.equal(h.account().state,'inactive');
});

test('a completed checkout can be replaced only after its exact subscription is canonically terminal',async t=>{
  const h=fixture(t);await h.checkout();const existing=[...h.checkouts.values()][0];
  existing.status='complete';existing.subscription='sub_subscription0001';
  await rejectStatus(()=>h.checkout(),409,'A just-completed checkout without confirmed subscription state must not be duplicated.');
  h.activate({status:'canceled'});await h.checkout();assert.equal(h.checkouts.size,2);
  assert.equal(h.customers.size,1);assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM membership_billing_consents').get().n,2);
});

test('a stale checkout operation cannot persist a payment link after a signed event invalidates its revision',async t=>{
  const h=fixture(t),original=h.stripe.checkout.sessions.create;
  h.stripe.checkout.sessions.create=async(...args)=>{
    const result=await original(...args);
    await h.store.invalidate(MEMBER.id,true);return result;
  };
  await rejectStatus(()=>h.checkout(),503);assert.equal(h.account().checkout_id,null);assert.equal(h.account().billing_hold,1);
  assert.equal(h.account().state,'blocked');
});

test('hosted-URL validation rejects a substituted destination without exposing provider messages',async t=>{
  const h=fixture(t),original=h.stripe.checkout.sessions.create;
  h.stripe.checkout.sessions.create=async(...args)=>({...await original(...args),url:'https://checkout.stripe.com.attacker.invalid/c/pay/fake'});
  await rejectStatus(()=>h.checkout(),503);assert.equal(h.account().state,'inactive');
});

test('expired leases cannot persist customer, checkout or access state',async t=>{
  const h=fixture(t);await h.store.ensureAccount(MEMBER.id,'customer-key-only',h.getTime());
  const lock=await h.store.acquire(MEMBER.id,'expiring-operation-token',h.getTime());h.setTime(h.getTime()+61);
  assert.equal(await h.store.customerSaved(MEMBER.id,lock.lease_token,'cus_customer0001',h.getTime()),null);
  assert.equal(await h.store.commit(MEMBER.id,lock.lease_token,lock.version,{active:true,subscriptionId:'sub_test0001',planId:'teacher-monthly',paidUntil:h.getTime()+1000,cancelAtPeriodEnd:false},h.getTime()),false);
  assert.equal(h.account().state,'inactive');
});

test('the pinned real Stripe SDK constructs the reviewed account, checkout and payment-verification requests without any network',async t=>{
  const h=fixture(t),wire=[];
  const fakeFetch=async(url,init)=>{
    const parsed=new URL(url),headers=new Headers(init.headers),form=new URLSearchParams(init.body||'');
    assert.equal(parsed.origin,'https://api.stripe.com');assert.equal(headers.get('Stripe-Version'),STRIPE_API_VERSION);
    wire.push({method:init.method,path:parsed.pathname,query:parsed.searchParams,form,headers});
    let result;
    if(parsed.pathname==='/v1/account')result=await h.stripe.accounts.retrieveCurrent({},{});
    else if(parsed.pathname.startsWith('/v1/billing_portal/configurations/'))result=await h.stripe.billingPortal.configurations.retrieve(parsed.pathname.split('/').at(-1),{},{});
    else if(parsed.pathname.startsWith('/v1/prices/'))result=await h.stripe.prices.retrieve(parsed.pathname.split('/').at(-1),{},{});
    else if(parsed.pathname==='/v1/customers')result=await h.stripe.customers.create({email:form.get('email'),metadata:{app:form.get('metadata[app]'),member_id:form.get('metadata[member_id]')}},{idempotencyKey:headers.get('Idempotency-Key')});
    else if(parsed.pathname==='/v1/subscriptions')result=await h.stripe.subscriptions.list({},{});
    else if(parsed.pathname==='/v1/checkout/sessions')result=await h.stripe.checkout.sessions.create({customer:form.get('customer'),client_reference_id:form.get('client_reference_id'),expires_at:Number(form.get('expires_at')),line_items:[{price:form.get('line_items[0][price]')}]},{idempotencyKey:headers.get('Idempotency-Key')});
    else if(parsed.pathname==='/v1/invoice_payments')result=await h.stripe.invoicePayments.list({invoice:parsed.searchParams.get('invoice')},{});
    else if(parsed.pathname.startsWith('/v1/payment_intents/'))result=await h.stripe.paymentIntents.retrieve(parsed.pathname.split('/').at(-1),{},{});
    else assert.fail('Unexpected SDK operation: '+parsed.pathname);
    return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json','Request-Id':'req_offline0001'}});
  };
  const sdk=new Stripe(h.env.STRIPE_SECRET_KEY,{apiVersion:STRIPE_API_VERSION,maxNetworkRetries:0,telemetry:false,httpClient:Stripe.createFetchHttpClient(fakeFetch)});
  const deps={...h.deps,stripe:sdk};await createCheckout(h.context,deps);
  const checkout=wire.find(call=>call.path==='/v1/checkout/sessions');
  assert.equal(checkout.method,'POST');assert.equal(checkout.form.get('mode'),'subscription');
  assert.equal(checkout.form.get('line_items[0][price]'),'price_monthly0001');assert.equal(checkout.form.get('allowed_payment_method_types[0]'),'card');
  assert.equal(checkout.form.has('payment_method_types[0]'),false,'The new pinned API uses allowed_payment_method_types.');
  assert.ok(checkout.headers.get('Idempotency-Key'));h.activate();assert.equal(await verifyPremium(h.context,deps),true);
  assert.ok(wire.some(call=>call.path==='/v1/invoice_payments'&&call.query.get('invoice')==='in_invoice0001'));
  assert.ok(wire.some(call=>call.path==='/v1/payment_intents/pi_payment0001'&&call.query.get('expand[0]')==='latest_charge'));
});
