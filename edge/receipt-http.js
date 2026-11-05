export const receiptJson=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",...headers}});
export function receiptRequestAllowed(request,path,env){
  const url=new URL(request.url),origins=new Set(['https://www.colelearninglabs.com','https://colelearninglabs.com']);
  // Pages injects the exact deployment URL. Do not trust arbitrary *.pages.dev
  // origins or a caller-controlled Host as an origin allowlist.
  try{const preview=new URL(env?.CF_PAGES_URL);if(preview.protocol==='https:'&&preview.hostname.endsWith('.cole-learning-labs.pages.dev'))origins.add(preview.origin);}catch{}
  if(url.protocol!=='https:'||!origins.has(url.origin)||url.pathname!==path||url.search||request.headers.has('Cookie'))return false;
  if(request.method==='GET')return request.headers.get('Sec-Fetch-Site')!=='cross-site';
  return request.headers.get('Origin')===url.origin&&request.headers.get('Sec-Fetch-Site')==='same-origin'&&!request.headers.has('Content-Encoding')&&/^application\/json(?:\s*;|$)/iu.test(request.headers.get('Content-Type')||'');
}
export async function readReceiptJson(request,maxBytes){
  const declared=request.headers.get('Content-Length');
  if(declared!==null&&(!/^\d+$/u.test(declared)||Number(declared)>maxBytes))throw new Error('Body too large');
  const reader=request.body?.getReader();if(!reader)throw new Error('Body required');
  let bytes=0,raw='',timer;const decoder=new TextDecoder('utf-8',{fatal:true});
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Body timeout')),2000);});
  try{
    while(true){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;bytes+=value.byteLength;if(bytes>maxBytes)throw new Error('Body too large');raw+=decoder.decode(value,{stream:true});}
    raw+=decoder.decode();return JSON.parse(raw);
  }finally{clearTimeout(timer);try{void reader.cancel().catch(()=>{});}catch{}}
}
