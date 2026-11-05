// On demand for optional requests only. No token cache, storage, pre-clearance
// cookie, visitor identifier, background refresh, or retry queue.
const SCRIPT='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const loads=new WeakMap();
function load(document,window){
  if(loads.has(document))return loads.get(document);
  const loading=new Promise(resolve=>{
    const script=document.createElement('script');let settled=false;
    const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;resolve(ok);};
    const timer=setTimeout(()=>finish(false),4000);
    script.src=SCRIPT;script.async=true;script.referrerPolicy='no-referrer';
    script.onload=()=>finish(typeof window.turnstile?.render==='function');script.onerror=()=>finish(false);
    document.head.append(script);
  });
  loads.set(document,loading);return loading;
}
export async function requestTurnstileToken({sitekey,action,signal,document=globalThis.document,window=globalThis,timeoutMs=8000}={}){
  if(typeof sitekey!=='string'||!/^0x[A-Za-z0-9_-]{10,100}$/u.test(sitekey)||!['requester','reach','receipt','verify'].includes(action)||signal?.aborted||!document?.head||!document?.body)return null;
  let timer,container,widget,finish;const controller=new AbortController();
  const abort=()=>{controller.abort();finish?.(null);};signal?.addEventListener('abort',abort,{once:true});
  const deadline=new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(null);},timeoutMs);controller.signal.addEventListener('abort',()=>resolve(null),{once:true});});
  try{
    return await Promise.race([(async()=>{
      if(!await load(document,window)||controller.signal.aborted)return null;
      container=document.createElement('div');container.className='turnstile-check';document.body.append(container);
      return await new Promise(resolve=>{
        finish=resolve;
        widget=window.turnstile.render(container,{sitekey,action,execution:'render',appearance:'interaction-only',
          'response-field':false,'feedback-enabled':false,retry:'never','refresh-expired':'never','refresh-timeout':'never',
          callback:token=>resolve(typeof token==='string'&&token.length<=2048?token:null),
          'error-callback':()=>{resolve(null);return true;},'expired-callback':()=>resolve(null),'timeout-callback':()=>resolve(null)});
      });
    })(),deadline]);
  }catch{return null;}finally{clearTimeout(timer);controller.abort();signal?.removeEventListener('abort',abort);try{if(widget!==undefined)window.turnstile.remove(widget);}catch{}container?.remove();}
}
