// No price is approved. Environment variables and browser fields cannot add one.
// A separately reviewed source change must pin Stripe test/live price IDs, exact
// USD amounts and intervals after the owner decides the product and price.
export const BILLING_TERMS_VERSION = '2026-10-31-review';
export const MEMBERSHIP_ORIGIN = 'https://members.colelearninglabs.com';
export const MEMBERSHIP_PRODUCT = 'teacher-resources';
export const DRAFT_CATALOG = Object.freeze({reviewed:false,plans:Object.freeze([])});
export const MEMBERSHIP_OFFER = Object.freeze({
  id:MEMBERSHIP_PRODUCT,
  name:'Cole Learning Labs Teacher Membership',
  audience:'Approved adult educators and school purchasers',
  status:'pricing-pending',
  description:'Adult access to the full lab collection, studios, open coding sandboxes and teaching resources. All 15 K–6 activities, five beginner courses, practice workbenches for free cases and two labs per topic remain free. No student accounts or results collection are included.',
  termsVersion:BILLING_TERMS_VERSION,
  plans:Object.freeze([
    Object.freeze({id:'teacher-monthly',label:'Monthly membership',interval:'month',amount:null,currency:'usd'}),
    Object.freeze({id:'teacher-annual',label:'Annual membership',interval:'year',amount:null,currency:'usd'})
  ])
});

export function reviewedPlans(catalog=DRAFT_CATALOG){
  if(catalog?.reviewed!==true||!Array.isArray(catalog.plans)||catalog.plans.length<1||catalog.plans.length>2)return [];
  const ids=new Set(),prices=new Set();
  for(const plan of catalog.plans){
    if(!plan||!['teacher-monthly','teacher-annual'].includes(plan.id)||ids.has(plan.id)||
      typeof plan.priceId!=='string'||!/^price_[A-Za-z0-9]{4,100}$/u.test(plan.priceId)||prices.has(plan.priceId)||
      !Number.isSafeInteger(plan.amount)||plan.amount<50||plan.amount>100_000||plan.currency!=='usd'||
      plan.interval!==(plan.id==='teacher-monthly'?'month':'year'))return [];
    ids.add(plan.id);prices.add(plan.priceId);
  }
  return catalog.plans;
}
