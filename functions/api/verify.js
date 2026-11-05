import {verifyCompletionCode,validReceiptSecret} from '../../utils/receiptCrypto.js';
import {receiptJson,receiptRequestAllowed,readReceiptJson} from '../../edge/receipt-http.js';
import {turnstileSitekey,verifyTurnstile,TURNSTILE_KEY_HEADER} from '../../edge/turnstile.js';
export async function onRequest(context){
  const {request,env}=context;
  if(!['GET','POST'].includes(request.method))return receiptJson({error:'method_not_allowed'},405,{Allow:'GET, POST'});
  if(!receiptRequestAllowed(request,'/api/verify',env))return receiptJson({error:'request_not_allowed'},403);
  const sitekey=turnstileSitekey(env),enabled=!!sitekey&&env?.RECEIPTS_ENABLED==='true'&&validReceiptSecret(env?.RECEIPT_SECRET);
  if(request.method==='GET')return receiptJson({enabled},200,enabled?{[TURNSTILE_KEY_HEADER]:sitekey}:{});
  if(!enabled)return receiptJson({error:'verification_unavailable'},503);
  let body;try{body=await readReceiptJson(request,28000);}catch{return receiptJson({error:'invalid_request'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!Array.isArray(body.codes)||body.codes.length<1||body.codes.length>200||body.codes.some(code=>typeof code!=='string'||code.length>128))return receiptJson({error:'invalid_request'},400);
  if(!await verifyTurnstile(request,env,'verify'))return receiptJson({error:'verification_required'},403);
  const checks=[];
  try{for(const rawCode of body.codes)checks.push(await verifyCompletionCode(rawCode,env.RECEIPT_SECRET));}catch{return receiptJson({error:'verification_unavailable'},503);}
  const counts=new Map();for(const check of checks)if(check.valid)counts.set(check.code,(counts.get(check.code)||0)+1);
  return receiptJson({results:checks.map(check=>({...check,isDuplicate:check.valid&&counts.get(check.code)>1})),measurement:'browser-reported'});
}
export const onRequestPost=onRequest;
