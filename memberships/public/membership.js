// Reviewed separately from the student application. No request runs while false.
export const MEMBERSHIP_CLIENT_RELEASE_APPROVED=false;
export const MEMBERSHIP_TERMS_VERSION='2026-10-31-review';
const ORIGIN='https://members.colelearninglabs.com';
const AUTH_PATH='/api/auth/sign-in/social';
export function reviewedDestination(value,kind){
  try{
    if(typeof value!=='string'||value.length>8192)return null;
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password)return null;
    if(kind==='signin'&&!url.hash&&url.origin==='https://accounts.google.com'&&['/o/oauth2/v2/auth','/o/oauth2/auth'].includes(url.pathname))return url.href;
    // Stripe's hosted session URLs include an opaque fragment. Preserve it only
    // on the exact reviewed checkout origin/path; it is not a script or return URL.
    if(kind==='checkout'&&url.origin==='https://checkout.stripe.com'&&url.pathname.startsWith('/c/pay/'))return url.href;
    if(kind==='portal'&&!url.hash&&url.origin==='https://billing.stripe.com'&&url.pathname.startsWith('/p/session/'))return url.href;
  }catch{/* A malformed redirect is never a navigation instruction. */}
  return null;
}

export function mountMembership(root,{
  enabled=MEMBERSHIP_CLIENT_RELEASE_APPROVED,fetcher=globalThis.fetch?.bind(globalThis),
  navigate=url=>globalThis.location.assign(url),origin=globalThis.location?.origin,
  pricingApproved=false,planSelector=globalThis.document?.querySelector('[data-plan]')
}={}){
  const find=selector=>root.querySelector(selector);
  const adult=find('[data-adult]'),renewal=find('[data-renewal]'),signin=find('[data-sign-in]'),
    checkout=find('[data-checkout]'),portal=find('[data-portal]'),logout=find('[data-sign-out]'),openLabs=find('[data-open-labs]'),status=find('[data-status]');
  let disposed=false,pending=false,session=null,stopActive=null;
  const allowed=enabled===true&&origin===ORIGIN&&typeof fetcher==='function';
  const say=value=>{if(!disposed)status.textContent=value;};
  const ownerAccess=()=>session?.labAccess==='owner';
  const labAccess=()=>ownerAccess()||session?.labAccess==='subscriber'&&session?.membership?.active===true;
  function sync(){
    signin.disabled=!allowed||pending||adult.checked!==true||!!session;
    checkout.disabled=!allowed||!pricingApproved||pending||!session||ownerAccess()||adult.checked!==true||renewal.checked!==true||session.membership?.active===true;
    checkout.hidden=ownerAccess();
    renewal.disabled=!allowed||!pricingApproved||pending||!session||ownerAccess();
    portal.disabled=!allowed||pending||!session||ownerAccess();portal.hidden=ownerAccess();
    logout.disabled=!allowed||pending||!session;
    if(openLabs){openLabs.disabled=!allowed||pending||!labAccess();openLabs.textContent='Open labs';}
    if(planSelector)planSelector.disabled=!allowed||!pricingApproved||pending||!session||ownerAccess();
    checkout.textContent=!pricingApproved?'Purchases unavailable':session?.membership?.active?'Membership active':'Continue to secure checkout';
  }
  async function request(path,{method='GET',body,csrf=false}={}){
    if(!allowed||disposed||pending)return null;
    pending=true;sync();
    const controller=new AbortController();
    let reader=null,response=null,complete=false,stopped=false,rejectDeadline;
    const deadline=new Promise((resolve,reject)=>{rejectDeadline=reject;});
    const stop=()=>{
      if(stopped)return;
      stopped=true;controller.abort();
      if(reader)void reader.cancel().catch(()=>{});
      else if(response?.body)void response.body.cancel().catch(()=>{});
      rejectDeadline(new Error('Membership request unavailable'));
    };
    stopActive=stop;
    const timer=setTimeout(stop,12000);
    try{
      response=await Promise.race([deadline,fetcher(path,{method,credentials:'same-origin',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal:controller.signal,
        headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(csrf?{'X-Membership-CSRF':session?.csrfToken||''}:{})},
        ...(body===undefined?{}:{body:JSON.stringify(body)})})]);
      if(disposed||stopped)return null;
      if(!response.ok)return null;
      if(!/^application\/json(?:\s*;|$)/iu.test(response.headers.get('Content-Type')||''))return null;
      const declared=response.headers.get('Content-Length');
      if(declared!==null&&(!/^\d+$/u.test(declared)||Number(declared)>8192))return null;
      reader=response.body?.getReader();if(!reader)return null;
      let size=0,raw='';const decoder=new TextDecoder('utf-8',{fatal:true});
      try{
        while(true){const {done,value}=await Promise.race([deadline,reader.read()]);if(disposed||stopped)return null;if(done)break;size+=value.byteLength;if(size>8192)return null;raw+=decoder.decode(value,{stream:true});}
        raw+=decoder.decode();
        if(disposed||stopped)return null;
        const result=JSON.parse(raw);complete=true;return result;
      }finally{if(!complete)void reader.cancel().catch(()=>{});reader.releaseLock();}
    }catch{return null;}
    finally{
      clearTimeout(timer);
      if(!complete){controller.abort();if(!reader&&response?.body)void response.body.cancel().catch(()=>{});}
      if(stopActive===stop)stopActive=null;
      pending=false;if(!disposed)sync();
    }
  }
  async function signIn(){
    if(!allowed||pending||session||adult.checked!==true)return;
    say('Opening secure sign-in…');
    const result=await request(AUTH_PATH,{method:'POST',body:{provider:'google',adultConfirmed:true}});
    const destination=reviewedDestination(result?.url,'signin');
    if(destination&&!disposed)navigate(destination);else say('Sign-in is unavailable. Please try again later.');
  }
  async function startCheckout(){
    if(!allowed||!pricingApproved||pending||!session||ownerAccess()||adult.checked!==true||renewal.checked!==true||session.membership?.active)return;
    const plan=planSelector?.value;if(!['teacher-monthly','teacher-annual'].includes(plan))return;
    // A failed or completed attempt needs a fresh deliberate renewal choice.
    renewal.checked=false;
    say('Opening secure checkout…');
    const result=await request('/api/member/checkout',{method:'POST',csrf:true,body:{plan,adult:true,renewalConsent:true,termsVersion:MEMBERSHIP_TERMS_VERSION}});
    const destination=reviewedDestination(result?.url,'checkout');
    if(destination&&!disposed)navigate(destination);else say('Checkout is unavailable. Please try again later.');
  }
  async function manageBilling(){
    if(!allowed||pending||!session||ownerAccess())return;
    say('Opening billing and cancellation…');
    const result=await request('/api/member/portal',{method:'POST',body:{},csrf:true});
    const destination=reviewedDestination(result?.url,'portal');
    if(destination&&!disposed)navigate(destination);else say('Billing tools are unavailable. Use the cancellation link provided with your subscription confirmation.');
  }
  async function signOut(){
    if(!allowed||pending||!session)return;
    const result=await request('/api/auth/sign-out',{method:'POST',body:{}});
    if(result?.success===true){session=null;renewal.checked=false;adult.checked=false;say('Signed out.');sync();}
    else say('Sign-out could not be confirmed. Please try again.');
  }
  const validSession=result=>result?.signedIn===true&&typeof result.csrfToken==='string'&&/^[A-Za-z0-9_-]{43}$/u.test(result.csrfToken)&&
    result.membership&&typeof result.membership.active==='boolean'&&['owner','subscriber','none'].includes(result.labAccess)&&
    (result.labAccess==='subscriber')===result.membership.active;
  async function openMemberLabs(){
    if(!allowed||pending||!labAccess())return;
    const result=await request('/api/member/session');
    if(disposed)return;
    session=validSession(result)?result:null;sync();
    if(labAccess())navigate(ORIGIN+'/learn/');
    else say('Current authorized access is required to open these labs.');
  }
  const onChoice=()=>sync();
  for(const control of [adult,renewal])control.addEventListener('change',onChoice);
  signin.addEventListener('click',signIn);checkout.addEventListener('click',startCheckout);portal.addEventListener('click',manageBilling);logout.addEventListener('click',signOut);
  openLabs?.addEventListener('click',openMemberLabs);
  sync();
  const ready=allowed?request('/api/member/session').then(result=>{
    if(disposed)return;
    if(validSession(result)){
      session=result;say(ownerAccess()?'Your lab access is active. No purchase is needed.':session.membership.active?'Your educator membership is active.':'Signed in. Review the membership terms before continuing.');
    }else say('Sign in to your educator account when you are ready.');
    sync();
  }):Promise.resolve();
  if(!allowed)say('Preview only. Sign-in, billing and payments are unavailable.');
  return {ready,dispose(){
    disposed=true;stopActive?.();session=null;
    for(const control of [adult,renewal])control.removeEventListener('change',onChoice);
    signin.removeEventListener('click',signIn);checkout.removeEventListener('click',startCheckout);portal.removeEventListener('click',manageBilling);logout.removeEventListener('click',signOut);
    openLabs?.removeEventListener('click',openMemberLabs);
  }};
}
if(typeof document!=='undefined'){
  const root=document.querySelector('[data-membership-root]');
  if(root)mountMembership(root);
}
