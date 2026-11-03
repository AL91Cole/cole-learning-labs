// Server-only. Tokens and secrets are transient and never enter AI, counts,
// logs, or responses. No application IP is supplied to Siteverify.
const VERIFY_URL='https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const TURNSTILE_HEADER='X-CLL-Turnstile';
export const TURNSTILE_KEY_HEADER='X-CLL-Turnstile-Sitekey';
export function turnstileSitekey(env){
  const key=env?.TURNSTILE_SITE_KEY,secret=env?.TURNSTILE_SECRET_KEY;
  return typeof key==='string'&&/^0x[A-Za-z0-9_-]{10,100}$/u.test(key)&&typeof secret==='string'&&/^[A-Za-z0-9_-]{20,100}$/u.test(secret)&&!/^\d+x0{10}/u.test(secret)?key:null;
}
export async function verifyTurnstile(request,env,action,{fetcher=globalThis.fetch,timeoutMs=2500,now=Date.now}={}){
  const token=request.headers.get(TURNSTILE_HEADER);
  if(!turnstileSitekey(env)||!token||token.length>2048||!/^[A-Za-z0-9_.-]+$/u.test(token)||request.signal.aborted)return false;
  const controller=new AbortController();let timer,reader;
  const abort=()=>controller.abort();request.signal.addEventListener('abort',abort,{once:true});
  const deadline=new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(false);},timeoutMs);controller.signal.addEventListener('abort',()=>resolve(false),{once:true});});
  try{
    const verification=(async()=>{
      const result=await fetcher(VERIFY_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token}),redirect:'error',signal:controller.signal});
      if(controller.signal.aborted){void result.body?.cancel().catch(()=>{});return false;}
      if(!result.ok||!/^application\/json(?:\s*;|$)/iu.test(result.headers.get('Content-Type')||'')||result.headers.has('Content-Encoding')){void result.body?.cancel().catch(()=>{});return false;}
      const length=result.headers.get('Content-Length');if(length!==null&&(!/^\d+$/u.test(length)||Number(length)>4096)){void result.body?.cancel().catch(()=>{});return false;}
      reader=result.body?.getReader();if(!reader)return false;
      let raw='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
      while(true){const {done,value}=await reader.read();if(controller.signal.aborted)return false;if(done)break;size+=value.byteLength;if(size>4096)return false;raw+=decoder.decode(value,{stream:true});}
      raw+=decoder.decode();const data=JSON.parse(raw),age=now()-Date.parse(data?.challenge_ts);
      return data?.success===true&&data.hostname===new URL(request.url).hostname&&data.action===action&&Number.isFinite(age)&&age>=-30000&&age<=300000;
    })();
    return await Promise.race([verification,deadline]);
  }catch{return false;}finally{clearTimeout(timer);controller.abort();request.signal.removeEventListener('abort',abort);try{void reader?.cancel().catch(()=>{});}catch{}}
}
