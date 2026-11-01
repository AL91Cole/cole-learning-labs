import Stripe from 'stripe';
import {BILLING_TERMS_VERSION,DRAFT_CATALOG,MEMBERSHIP_ORIGIN,MEMBERSHIP_PRODUCT,reviewedPlans} from './catalog.js';
import {createBillingStore} from './store.js';

export const STRIPE_API_VERSION='2026-10-28.endive';
// Test credentials cannot be turned into live billing by an environment value.
export const LIVE_BILLING_REVIEW_APPROVED=false;
const APP='cole-learning-labs-memberships';
const RETRY_WINDOW=23*60*60;
const IDS={member:/^[A-Za-z0-9_-]{1,128}$/u,customer:/^cus_[A-Za-z0-9]{4,100}$/u,
  subscription:/^sub_[A-Za-z0-9]{4,100}$/u,checkout:/^cs_test_[A-Za-z0-9]{4,200}$/u,
  event:/^evt_[A-Za-z0-9]{4,100}$/u,account:/^acct_[A-Za-z0-9]{4,100}$/u,
  portal:/^bpc_[A-Za-z0-9]{4,100}$/u,invoice:/^in_[A-Za-z0-9]{4,100}$/u,
  intent:/^pi_[A-Za-z0-9]{4,100}$/u,charge:/^ch_[A-Za-z0-9]{4,100}$/u};
export class BillingError extends Error{constructor(status=503){super('membership_unavailable');this.status=status;}}
const fail=(status=503)=>{throw new BillingError(status);};
const seconds=()=>Math.floor(Date.now()/1000);
const id=(value,kind)=>{const selected=typeof value==='string'?value:value?.id;if(typeof selected!=='string'||!IDS[kind].test(selected))fail();return selected;};
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const inactive=()=>({active:false,plan:null,renewsAt:null,cancelAtPeriodEnd:false});
const snapshotInactive=()=>({active:false,planId:null,subscriptionId:null,paidUntil:0,cancelAtPeriodEnd:false});
function memberIdentity(member){
  if(!member||!IDS.member.test(member.id)||member.emailVerified!==true||typeof member.email!=='string'||
    member.email.length>254||!/^\S+@\S+\.\S+$/u.test(member.email))fail(401);
  return {id:member.id,email:member.email};
}
function configured(env,deps){
  if(env?.MEMBERSHIP_DEPLOYMENT_MODE!=='test'||typeof env.STRIPE_SECRET_KEY!=='string'||!/^sk_test_[A-Za-z0-9]{12,}$/u.test(env.STRIPE_SECRET_KEY)||
    !IDS.account.test(env.MEMBERSHIP_STRIPE_ACCOUNT_ID)||!IDS.portal.test(env.MEMBERSHIP_STRIPE_PORTAL_CONFIGURATION_ID))fail();
  const stripe=deps.stripe||new Stripe(env.STRIPE_SECRET_KEY,{apiVersion:STRIPE_API_VERSION,
    maxNetworkRetries:0,timeout:5000,telemetry:false,httpClient:Stripe.createFetchHttpClient()});
  return {stripe,store:deps.store||createBillingStore(env.MEMBERSHIP_DB),now:deps.now||seconds,
    randomId:deps.randomId||(()=>crypto.randomUUID())};
}
function approved(deps){const plans=reviewedPlans(deps.catalog||DRAFT_CATALOG);if(!plans.length)fail();return plans;}
function bodyPlan(body,plans){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='adult,plan,renewalConsent,termsVersion'||
    body.adult!==true||body.renewalConsent!==true||body.termsVersion!==BILLING_TERMS_VERSION)fail(400);
  const plan=plans.find(entry=>entry.id===body.plan);if(!plan)fail(400);return plan;
}
const options=(key)=>({maxNetworkRetries:0,timeout:5000,...(key?{idempotencyKey:key}:{})});
function safeHostedUrl(value,host,pathPrefix){
  if(typeof value!=='string'||value.length>4096)fail();
  let url;try{url=new URL(value);}catch{fail();}
  if(url.protocol!=='https:'||url.hostname!==host||url.port||url.username||url.password||!url.pathname.startsWith(pathPrefix))fail();
  return value;
}
async function accountAndPortal(stripe,env){
  const account=await stripe.accounts.retrieveCurrent({},options());
  if(account?.id!==env.MEMBERSHIP_STRIPE_ACCOUNT_ID||account.charges_enabled!==true)fail();
  const config=await stripe.billingPortal.configurations.retrieve(env.MEMBERSHIP_STRIPE_PORTAL_CONFIGURATION_ID,{},options());
  if(config?.id!==env.MEMBERSHIP_STRIPE_PORTAL_CONFIGURATION_ID||config.active!==true||config.livemode!==false||
    config.features?.subscription_cancel?.enabled!==true||config.features.subscription_cancel.mode!=='at_period_end'||
    config.features?.subscription_update?.enabled===true||config.features?.subscription_pause?.enabled===true||
    config.features?.invoice_history?.enabled!==true||config.login_page?.enabled!==true)fail();
  const cancellationUrl=safeHostedUrl(env.MEMBERSHIP_STRIPE_CANCELLATION_URL,'billing.stripe.com','/p/login/test_');
  const parsed=new URL(cancellationUrl);
  if(cancellationUrl.length>400||parsed.search||parsed.hash||config.login_page.url!==cancellationUrl)fail();
  return cancellationUrl;
}
async function priceMatches(stripe,plan){
  const price=await stripe.prices.retrieve(plan.priceId,{},options());
  if(price?.id!==plan.priceId||price.active!==true||price.livemode!==false||price.type!=='recurring'||
    price.currency!==plan.currency||price.unit_amount!==plan.amount||price.billing_scheme!=='per_unit'||
    price.recurring?.interval!==plan.interval||price.recurring.interval_count!==1||price.recurring.usage_type!=='licensed'||
    price.transform_quantity||price.tiers_mode)fail();
  return price;
}
async function withLease(store,memberId,now,randomId,action){
  const token=randomId();if(typeof token!=='string'||token.length<16||token.length>128)fail();
  const row=await store.acquire(memberId,token,now());if(!row)fail(409);
  try{return await action(row,token);}finally{await store.release(memberId,token);}
}
async function verifiedSnapshot(stripe,store,row,plans,now){
  if(row.billing_hold===1)return snapshotInactive();
  const customerId=id(row.customer_id,'customer');
  const list=await stripe.subscriptions.list({customer:customerId,status:'all',limit:10,expand:['data.latest_invoice']},options());
  if(!Array.isArray(list?.data)||list.has_more!==false||list.data.length>10)fail();
  const current=list.data.filter(sub=>!['canceled','incomplete_expired'].includes(sub.status));
  if(current.length===0){
    const terminalIds=list.data.filter(sub=>sub.livemode===false&&sub.metadata?.app===APP&&sub.metadata.member_id===row.member_id&&
      (typeof sub.customer==='string'?sub.customer:sub.customer?.id)===customerId&&IDS.subscription.test(sub.id)).map(sub=>sub.id);
    return {...snapshotInactive(),terminalIds};
  }
  if(current.length!==1)fail();
  const sub=current[0];
  id(sub.id,'subscription');
  if(sub.livemode!==false||id(sub.customer,'customer')!==customerId||sub.metadata?.app!==APP||sub.metadata?.member_id!==row.member_id||
    sub.collection_method!=='charge_automatically'||sub.pause_collection||sub.pending_update||
    !Array.isArray(sub.items?.data)||sub.items.has_more!==false||sub.items.data.length!==1||
    (sub.discounts&&(!Array.isArray(sub.discounts)||sub.discounts.length!==0)))fail();
  const item=sub.items.data[0],plan=plans.find(entry=>entry.priceId===item.price?.id);
  if(!plan||sub.metadata.plan_id!==plan.id||item.quantity!==1)fail();
  if(typeof sub.metadata.checkout_key!=='string'||sub.metadata.checkout_key.length>128)fail();
  const consent=await store.consent(row.member_id,sub.metadata.checkout_key);
  if(!consent||consent.plan_id!==plan.id||consent.amount!==plan.amount||consent.currency!==plan.currency||
    consent.interval!==plan.interval||consent.terms_version!==sub.metadata.terms_version||
    consent.cancellation_url!==sub.metadata.cancellation_url||!integer(consent.consented_at)||consent.consented_at>now+60)fail();
  await priceMatches(stripe,plan);
  if(sub.status!=='active')return {...snapshotInactive(),subscriptionId:sub.id,planId:plan.id};
  if(!integer(item.current_period_start)||!integer(item.current_period_end)||item.current_period_start>now+60||
    item.current_period_end<=now||item.current_period_end-item.current_period_start>(plan.interval==='year'?367:32)*86400)fail();
  const invoice=sub.latest_invoice;
  if(!invoice||typeof invoice!=='object'||!IDS.invoice.test(invoice.id)||invoice.livemode!==false||invoice.status!=='paid'||
    invoice.currency!==plan.currency||invoice.amount_paid!==plan.amount||invoice.amount_due!==plan.amount||invoice.amount_remaining!==0||
    id(invoice.customer,'customer')!==customerId||id(invoice.parent?.subscription_details?.subscription,'subscription')!==sub.id||
    !['subscription_create','subscription_cycle'].includes(invoice.billing_reason))fail();
  // Read the actual latest payment and charge as well. A cached "paid" invoice
  // alone cannot grant access after a refund/dispute or an out-of-band marking.
  const payments=await stripe.invoicePayments.list({invoice:invoice.id,status:'paid',limit:2},options());
  if(payments?.has_more!==false||!Array.isArray(payments.data)||payments.data.length!==1)fail();
  const payment=payments.data[0];
  if(payment.livemode!==false||payment.status!=='paid'||payment.currency!==plan.currency||payment.amount_paid!==plan.amount||
    id(payment.invoice,'invoice')!==invoice.id||payment.payment?.type!=='payment_intent')fail();
  const intent=await stripe.paymentIntents.retrieve(id(payment.payment.payment_intent,'intent'),{expand:['latest_charge']},options());
  const charge=intent?.latest_charge;
  if(intent?.livemode!==false||intent.status!=='succeeded'||intent.amount_received!==plan.amount||intent.currency!==plan.currency||
    id(intent.customer,'customer')!==customerId||!charge||typeof charge!=='object'||!IDS.charge.test(charge.id)||
    charge.livemode!==false||charge.paid!==true||charge.captured!==true||charge.status!=='succeeded'||
    charge.refunded!==false||charge.amount_refunded!==0||charge.disputed!==false||charge.amount!==plan.amount||
    charge.currency!==plan.currency||charge.payment_method_details?.type!=='card'||id(charge.customer,'customer')!==customerId||id(charge.payment_intent,'intent')!==intent.id)fail();
  let paidUntil=item.current_period_end;
  if(sub.cancel_at!==null&&sub.cancel_at!==undefined){if(!integer(sub.cancel_at))fail();paidUntil=Math.min(paidUntil,sub.cancel_at);}
  if(paidUntil<=now)return snapshotInactive();
  return {active:true,subscriptionId:sub.id,planId:plan.id,paidUntil,cancelAtPeriodEnd:sub.cancel_at_period_end===true};
}
async function guarded(action){try{return await action();}catch(error){if(error instanceof BillingError)throw error;throw new BillingError();}}

export async function createCheckout({env,member,body},deps={}){return guarded(async()=>{
  // Prices are source-approved, never dashboard/browser activated. Fail before
  // inspecting a credential, touching a database or creating an SDK client.
  const plans=approved(deps),plan=bodyPlan(body,plans),adult=memberIdentity(member);
  const {stripe,store,now,randomId}=configured(env,deps);
  await store.ensureAccount(adult.id,'membership-test-customer-'+randomId(),now());
  return withLease(store,adult.id,now,randomId,async(row,token)=>{
    if(row.billing_hold===1)fail(409);
    const cancellationUrl=await accountAndPortal(stripe,env);await priceMatches(stripe,plan);
    if(!row.customer_id){
      row=await store.customerAttempt(adult.id,token,now());if(!row||now()-row.customer_attempt_at>RETRY_WINDOW)fail();
      const customer=await stripe.customers.create({email:adult.email,metadata:{app:APP,member_id:adult.id}},options(row.customer_key));
      if(customer?.livemode!==false||customer.deleted===true)fail();
      const customerId=id(customer.id,'customer');
      row=await store.customerSaved(adult.id,token,customerId,now());if(!row)fail();
    }
    const canonical=await verifiedSnapshot(stripe,store,row,plans,now());
    if(!await store.commit(adult.id,token,row.version,canonical,now()))fail();
    if(canonical.subscriptionId)fail(409);
    if(row.checkout_id){
      const existing=await stripe.checkout.sessions.retrieve(id(row.checkout_id,'checkout'),{expand:['line_items.data.price']},options());
      if(existing?.livemode!==false||id(existing.customer,'customer')!==row.customer_id||existing.mode!=='subscription')fail();
      if(existing.status==='complete'&&!canonical.terminalIds?.includes(id(existing.subscription,'subscription')))fail(409);
      if(existing.status==='open'&&integer(existing.expires_at)&&existing.expires_at>now()){
        if(row.checkout_plan_id!==plan.id||existing.client_reference_id!==adult.id||
          existing.line_items?.data?.length!==1||existing.line_items.has_more!==false||existing.line_items.data[0].price?.id!==plan.priceId)fail(409);
        return {url:safeHostedUrl(existing.url,'checkout.stripe.com','/c/pay/')};
      }
      if(!['expired','complete'].includes(existing.status))fail();
      row=await store.beginCheckout(adult.id,token,'membership-test-checkout-'+randomId(),plan,BILLING_TERMS_VERSION,now(),cancellationUrl,row.version);
    }else if(!row.checkout_key){
      row=await store.beginCheckout(adult.id,token,'membership-test-checkout-'+randomId(),plan,BILLING_TERMS_VERSION,now(),cancellationUrl,row.version);
    }
    if(row.checkout_plan_id!==plan.id||row.checkout_consent_version!==BILLING_TERMS_VERSION||
      !integer(row.checkout_attempt_at)||now()-row.checkout_attempt_at>RETRY_WINDOW)fail(409);
    const amount=(plan.amount/100).toFixed(2),interval=plan.interval==='year'?'year':'month';
    const checkout=await stripe.checkout.sessions.create({
      mode:'subscription',customer:row.customer_id,client_reference_id:adult.id,
      line_items:[{price:plan.priceId,quantity:1}],allowed_payment_method_types:['card'],
      success_url:MEMBERSHIP_ORIGIN+'/',cancel_url:MEMBERSHIP_ORIGIN+'/',expires_at:row.checkout_attempt_at+1800,
      automatic_tax:{enabled:false},allow_promotion_codes:false,phone_number_collection:{enabled:false},
      consent_collection:{terms_of_service:'required'},
      custom_text:{submit:{message:`Teacher membership renews automatically at USD $${amount} per ${interval}. Cancel online at ${cancellationUrl} before renewal. Access continues until the paid period ends.`}},
      metadata:{app:APP,member_id:adult.id,plan_id:plan.id,terms_version:BILLING_TERMS_VERSION,cancellation_url:cancellationUrl,checkout_key:row.checkout_key},
      subscription_data:{metadata:{app:APP,member_id:adult.id,plan_id:plan.id,terms_version:BILLING_TERMS_VERSION,cancellation_url:cancellationUrl,checkout_key:row.checkout_key}}
    },options(row.checkout_key));
    if(checkout?.livemode!==false||checkout.mode!=='subscription'||id(checkout.customer,'customer')!==row.customer_id||
      checkout.client_reference_id!==adult.id||checkout.status!=='open'||!IDS.checkout.test(checkout.id))fail();
    const url=safeHostedUrl(checkout.url,'checkout.stripe.com','/c/pay/');
    if(!await store.saveCheckout(adult.id,token,row.checkout_key,checkout.id,now(),row.version))fail();
    if(!integer(checkout.expires_at)||checkout.expires_at<=now())fail(409);
    return {url};
  });
});}

export async function createPortal({env,member},deps={}){return guarded(async()=>{
  approved(deps);const adult=memberIdentity(member),{stripe,store}=configured(env,deps);
  const row=await store.account(adult.id);if(!row?.customer_id)fail(409);
  await accountAndPortal(stripe,env);
  const portal=await stripe.billingPortal.sessions.create({customer:id(row.customer_id,'customer'),
    configuration:env.MEMBERSHIP_STRIPE_PORTAL_CONFIGURATION_ID,return_url:MEMBERSHIP_ORIGIN+'/'},options());
  if(portal?.livemode!==false||id(portal.configuration,'portal')!==env.MEMBERSHIP_STRIPE_PORTAL_CONFIGURATION_ID||portal.customer!==row.customer_id||portal.return_url!==MEMBERSHIP_ORIGIN+'/')fail();
  return {url:safeHostedUrl(portal.url,'billing.stripe.com','/p/session/')};
});}

export async function getMembershipStatus({env,member},deps={}){return guarded(async()=>{
  const plans=reviewedPlans(deps.catalog||DRAFT_CATALOG);if(!plans.length)return inactive();
  const adult=memberIdentity(member),{stripe,store,now,randomId}=configured(env,deps);
  const row=await store.account(adult.id);if(!row?.customer_id||row.billing_hold===1)return inactive();
  return withLease(store,adult.id,now,randomId,async(current,token)=>{
    await accountAndPortal(stripe,env);
    const state=await verifiedSnapshot(stripe,store,current,plans,now());
    if(!await store.commit(adult.id,token,current.version,state,now()))fail();
    return state.active?{active:true,plan:MEMBERSHIP_PRODUCT,renewsAt:state.paidUntil,cancelAtPeriodEnd:state.cancelAtPeriodEnd}:inactive();
  });
});}
export async function verifyPremium(context,deps={}){return (await getMembershipStatus(context,deps)).active===true;}

const HOLD_EVENTS=new Set(['charge.refunded','charge.dispute.created','charge.dispute.updated','charge.dispute.closed','customer.deleted']);
const EVENTS=new Set([...HOLD_EVENTS,'checkout.session.completed','checkout.session.expired','customer.subscription.created',
  'customer.subscription.updated','customer.subscription.deleted','customer.subscription.paused','customer.subscription.resumed',
  'invoice.paid','invoice.payment_failed','invoice.payment_action_required','invoice.voided','invoice.marked_uncollectible']);
async function eventCustomer(event,stripe){
  const object=event.data?.object;if(!object||typeof object!=='object')fail(400);
  if(event.type==='customer.deleted')return id(object.id,'customer');
  if(event.type.startsWith('charge.dispute.')){
    const charge=await stripe.charges.retrieve(id(object.charge,'charge'),{},options());
    if(charge?.livemode!==false)fail();return id(charge.customer,'customer');
  }
  return id(object.customer,'customer');
}
export async function processWebhook({env,rawBody,signature,onVerified},deps={}){return guarded(async()=>{
  if(typeof onVerified!=='function')fail();
  const plans=approved(deps),{stripe,store,now,randomId}=configured(env,deps);
  const bytes=typeof rawBody==='string'?new TextEncoder().encode(rawBody):rawBody;
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<2||bytes.byteLength>65536||typeof signature!=='string'||signature.length>2048||
    typeof env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET!=='string'||!/^whsec_[A-Za-z0-9]{16,}$/u.test(env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET))fail(400);
  let event;try{
    event=await stripe.webhooks.constructEventAsync(bytes,signature,env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET,300,Stripe.createSubtleCryptoProvider());
  }catch{fail(400);}
  if(!IDS.event.test(event?.id)||event.livemode!==false||event.api_version!==STRIPE_API_VERSION||
    !integer(event.created)||event.created>now()+60||
    (Object.hasOwn(event,'account')&&event.account!==env.MEMBERSHIP_STRIPE_ACCOUNT_ID)||Object.hasOwn(event,'context'))fail(400);
  if(!EVENTS.has(event.type))return {received:true};
  const customer=await eventCustomer(event,stripe),row=await store.byCustomer(customer);
  if(!row)return {received:true};
  // Only a signature-verified, correctly scoped event for a known adult customer
  // may consume persistent webhook admission. Forged traffic cannot exhaust it.
  try{await onVerified();}catch(error){fail(error?.status===429?429:503);}
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
  const receipt=await store.markEvent(event.id,digest,row.member_id,event.type,now());
  if(!receipt||receipt.digest!==digest||receipt.member_id!==row.member_id||receipt.event_type!==event.type)fail(400);
  if(receipt.state==='processed')return {received:true};
  // Fencing invalidation precedes any awaited provider read or lease acquisition.
  // An older in-flight reconciliation can no longer commit an unlock afterward.
  const invalidated=await store.invalidate(row.member_id,HOLD_EVENTS.has(event.type));if(!invalidated)fail();
  if(invalidated.billing_hold===1){await store.finishHeldEvent(event.id,row.member_id,now());return {received:true};}
  return withLease(store,row.member_id,now,randomId,async(current,token)=>{
    await accountAndPortal(stripe,env);
    const state=await verifiedSnapshot(stripe,store,current,plans,now());
    if(!await store.commit(row.member_id,token,current.version,state,now(),event.id))fail();
    return {received:true};
  });
});}
