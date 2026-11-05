import {validateReceiptEvent} from '../../src/receipt-schema.js';
import {generateCompletionCode,validReceiptSecret} from '../../utils/receiptCrypto.js';
import {turnstileSitekey,verifyTurnstile,TURNSTILE_KEY_HEADER} from '../../edge/turnstile.js';
import {receiptJson,receiptRequestAllowed,readReceiptJson} from '../../edge/receipt-http.js';
import {storeTelemetryEvent} from '../../telemetry/storage.js';

function configuration(request,env){
  const sitekey=turnstileSitekey(env);
  const receiptsEnabled=!!sitekey&&env?.RECEIPTS_ENABLED==='true'&&validReceiptSecret(env?.RECEIPT_SECRET);
  const telemetryEnabled=!!sitekey&&env?.TELEMETRY_ENABLED==='true'&&env?.TELEMETRY_PRIVACY_REVIEWED==='true'&&env?.TELEMETRY_RETENTION_VERIFIED==='true'&&typeof env?.LAB_TELEMETRY?.prepare==='function'&&request.headers.get('DNT')!=='1'&&request.headers.get('Sec-GPC')!=='1';
  return {sitekey,receiptsEnabled,telemetryEnabled};
}
export async function onRequest(context){
  const {request,env}=context;
  if(!['GET','POST'].includes(request.method))return receiptJson({ok:false,error:'method_not_allowed'},405,{Allow:'GET, POST'});
  if(!receiptRequestAllowed(request,'/api/telemetry',env))return receiptJson({ok:false,error:'request_not_allowed'},403);
  const config=configuration(request,env),enabled=config.receiptsEnabled||config.telemetryEnabled;
  if(request.method==='GET')return receiptJson({enabled,receiptsEnabled:config.receiptsEnabled,telemetryEnabled:config.telemetryEnabled},200,enabled?{[TURNSTILE_KEY_HEADER]:config.sitekey}:{});
  if(!enabled)return receiptJson({ok:false,error:'receipts_unavailable'},503);
  let event;try{event=validateReceiptEvent(await readReceiptJson(request,512));}catch{return receiptJson({ok:false,error:'invalid_request'},400);}
  if(!event)return receiptJson({ok:false,error:'invalid_request'},400);
  if(event.eventType!=='complete'&&(!config.telemetryEnabled||!event.collectTelemetry))return receiptJson({ok:false,error:'telemetry_unavailable'},503);
  if(event.eventType==='complete'&&!config.receiptsEnabled&&(!config.telemetryEnabled||!event.collectTelemetry))return receiptJson({ok:false,error:'receipts_unavailable'},503);
  if(!await verifyTurnstile(request,env,'receipt'))return receiptJson({ok:false,error:'verification_required'},403);
  // Signing attests issuance of these browser-reported fields. The Worker has
  // no independent observation of the learner's actions, identity or timing.
  let completionCode=null;
  try{if(event.eventType==='complete'&&config.receiptsEnabled)completionCode=await generateCompletionCode(event,env.RECEIPT_SECRET);}catch{return receiptJson({ok:false,error:'receipts_unavailable'},503);}
  let telemetryStored=false;
  if(config.telemetryEnabled&&event.collectTelemetry){
    const stored=await storeTelemetryEvent(env.LAB_TELEMETRY,event);telemetryStored=stored.accepted;
    if(!stored.accepted&&!completionCode)return receiptJson({ok:false,error:stored.error},stored.error==='telemetry_full'?429:503);
  }
  return receiptJson({ok:true,completionCode,telemetryStored,measurement:'browser-reported'});
}
export const onRequestGet=onRequest;
export const onRequestPost=onRequest;
