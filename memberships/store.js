// D1 statements contain only opaque adult account/payment IDs, consent facts and
// membership state. Network identities and provider event bodies are not stored.
export class BillingStoreError extends Error{constructor(){super('billing_unavailable');}}
const row=result=>result?.success===true&&Array.isArray(result.results)?result.results:null;
const changes=result=>result?.success===true&&Number.isSafeInteger(result.meta?.changes)?result.meta.changes:-1;
export function createBillingStore(db){
  const stmt=(sql,...values)=>{
    if(typeof db?.prepare!=='function')throw new BillingStoreError();
    return db.prepare(sql).bind(...values);
  };
  async function one(sql,...values){const data=row(await stmt(sql,...values).all());if(!data)throw new BillingStoreError();return data[0]||null;}
  async function write(sql,...values){const result=await stmt(sql,...values).run();if(changes(result)<0)throw new BillingStoreError();return result.meta.changes;}
  return {
    async ensureAccount(memberId,key,now){
      await write('INSERT INTO membership_billing_accounts(member_id,customer_key,created_at) VALUES(?,?,?) ON CONFLICT(member_id) DO NOTHING',memberId,key,now);
      return one('SELECT * FROM membership_billing_accounts WHERE member_id=?',memberId);
    },
    account(memberId){return one('SELECT * FROM membership_billing_accounts WHERE member_id=?',memberId);},
    consent(memberId,key){return one('SELECT * FROM membership_billing_consents WHERE member_id=? AND checkout_key=?',memberId,key);},
    byCustomer(customerId){return one('SELECT * FROM membership_billing_accounts WHERE customer_id=?',customerId);},
    acquire(memberId,token,now){
      return one('UPDATE membership_billing_accounts SET lease_token=?,lease_until=? WHERE member_id=? AND lease_until<=? RETURNING *',token,now+60,memberId,now);
    },
    release(memberId,token){return write('UPDATE membership_billing_accounts SET lease_token=NULL,lease_until=0 WHERE member_id=? AND lease_token=?',memberId,token);},
    async customerAttempt(memberId,token,now){
      return one('UPDATE membership_billing_accounts SET customer_attempt_at=COALESCE(customer_attempt_at,?) WHERE member_id=? AND lease_token=? AND lease_until>? RETURNING *',now,memberId,token,now);
    },
    async customerSaved(memberId,token,customerId,now){
      return one('UPDATE membership_billing_accounts SET customer_id=? WHERE member_id=? AND customer_id IS NULL AND lease_token=? AND lease_until>? RETURNING *',customerId,memberId,token,now);
    },
    async beginCheckout(memberId,token,key,plan,version,now,cancellationUrl,expectedVersion){
      if(typeof db?.batch!=='function')throw new BillingStoreError();
      const results=await db.batch([
        stmt('UPDATE membership_billing_accounts SET checkout_key=?,checkout_attempt_at=?,checkout_plan_id=?,checkout_id=NULL,checkout_consent_version=?,checkout_consent_at=? WHERE member_id=? AND lease_token=? AND lease_until>? AND billing_hold=0 AND version=?',key,now,plan.id,version,now,memberId,token,now,expectedVersion),
        stmt('INSERT INTO membership_billing_consents(checkout_key,member_id,terms_version,plan_id,amount,currency,interval,consented_at,cancellation_url) SELECT ?,member_id,?,?,?,?,?,?,? FROM membership_billing_accounts WHERE member_id=? AND checkout_key=? AND lease_token=? AND lease_until>? ON CONFLICT(checkout_key) DO NOTHING',key,version,plan.id,plan.amount,plan.currency,plan.interval,now,cancellationUrl,memberId,key,token,now)
      ]);
      if(!Array.isArray(results)||results.length!==2||changes(results[0])!==1||changes(results[1])!==1)throw new BillingStoreError();
      return one('SELECT * FROM membership_billing_accounts WHERE member_id=?',memberId);
    },
    saveCheckout(memberId,token,key,checkoutId,now,expectedVersion){
      return one('UPDATE membership_billing_accounts SET checkout_id=? WHERE member_id=? AND lease_token=? AND checkout_key=? AND lease_until>? AND billing_hold=0 AND version=? RETURNING *',checkoutId,memberId,token,key,now,expectedVersion);
    },
    async markEvent(eventId,digest,memberId,eventType,now){
      await write('INSERT INTO membership_billing_events(event_id,digest,member_id,event_type,received_at) VALUES(?,?,?,?,?) ON CONFLICT(event_id) DO NOTHING',eventId,digest,memberId,eventType,now);
      return one('SELECT * FROM membership_billing_events WHERE event_id=?',eventId);
    },
    async invalidate(memberId,hold=false){
      return one("UPDATE membership_billing_accounts SET state='blocked',paid_until=0,billing_hold=MAX(billing_hold,?),version=version+1 WHERE member_id=? RETURNING *",hold?1:0,memberId);
    },
    async commit(memberId,token,expectedVersion,snapshot,now,eventId=null){
      if(typeof db?.batch!=='function')throw new BillingStoreError();
      const update=stmt('UPDATE membership_billing_accounts SET subscription_id=?,plan_id=?,state=?,paid_until=?,cancel_at_period_end=?,verified_at=? WHERE member_id=? AND lease_token=? AND lease_until>? AND version=? AND billing_hold=0',snapshot.subscriptionId,snapshot.planId,snapshot.active?'active':'inactive',snapshot.paidUntil,snapshot.cancelAtPeriodEnd?1:0,now,memberId,token,now,expectedVersion);
      if(eventId===null)return changes(await update.run())===1;
      const results=await db.batch([update,stmt("UPDATE membership_billing_events SET state='processed',processed_at=? WHERE event_id=? AND member_id=? AND EXISTS(SELECT 1 FROM membership_billing_accounts WHERE member_id=? AND lease_token=? AND lease_until>? AND version=? AND billing_hold=0 AND verified_at=?)",now,eventId,memberId,memberId,token,now,expectedVersion,now)]);
      return Array.isArray(results)&&results.length===2&&changes(results[0])===1&&changes(results[1])===1;
    },
    finishHeldEvent(eventId,memberId,now){return write("UPDATE membership_billing_events SET state='processed',processed_at=? WHERE event_id=? AND member_id=? AND EXISTS(SELECT 1 FROM membership_billing_accounts WHERE member_id=? AND billing_hold=1)",now,eventId,memberId,memberId);}
  };
}
