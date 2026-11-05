// Server only. Never add this module or RECEIPT_SECRET to a browser bundle.
import {receiptLabId} from '../src/receipt-schema.js';
const encoder=new TextEncoder();
const hex=bytes=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('').toUpperCase();
// Length plus a distinct-byte floor only catches placeholder or repeated-character
// values. It is not an entropy check: generate the secret with a CSPRNG.
export function validReceiptSecret(secret){
  if(typeof secret!=='string')return false;
  const bytes=encoder.encode(secret);
  return bytes.length>=32&&bytes.length<=256&&new Set(bytes).size>=8;
}
// Import the non-extractable key once per isolate instead of once per code in a
// 200-code batch. The cache is keyed on the exact secret string.
let cachedSecret=null,cachedKey=null;
async function hmacKey(secretKey){
  if(cachedSecret===secretKey&&cachedKey)return cachedKey;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secretKey),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  cachedSecret=secretKey;cachedKey=key;return key;
}
// Internal helper. Never expose this through an endpoint: it signs any string.
export async function signPayload(payloadString,secretKey){
  if(!validReceiptSecret(secretKey)||typeof payloadString!=='string')throw new Error('Receipt signing unavailable');
  const key=await hmacKey(secretKey);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payloadString))).slice(0,16));
}
export async function generateCompletionCode({labId,score,activeSeconds},secretKey){
  const id=receiptLabId(labId);
  if(!id||!Number.isSafeInteger(score)||score<0||score>100||!Number.isSafeInteger(activeSeconds)||activeSeconds<0||activeSeconds>86400)throw new Error('Invalid receipt fields');
  const day=new Date().toISOString().slice(2,10).replaceAll('-','');
  const salt=hex(crypto.getRandomValues(new Uint8Array(8)));
  const payload=`CLL1-${id}-${score}-${String(activeSeconds).padStart(4,'0')}-${day}-${salt}`;
  return `${payload}-${await signPayload(payload,secretKey)}`;
}
export async function verifyCompletionCode(rawCode,secretKey){
  if(!validReceiptSecret(secretKey))throw new Error('Receipt verification unavailable');
  const invalid=reason=>({code:typeof rawCode==='string'?rawCode.slice(0,128):'',valid:false,reason});
  if(typeof rawCode!=='string'||rawCode.length>128)return invalid('Invalid format');
  // toUpperCase() applies full Unicode case mapping, so look-alike characters such
  // as U+017F or U+0131 would fold into ASCII and verify. Reject them first.
  const trimmed=rawCode.trim();
  if(!/^[A-Za-z0-9-]+$/u.test(trimmed))return invalid('Invalid format');
  const code=trimmed.toUpperCase();
  const match=/^CLL1-([A-Z0-9]{2,8})-(0|[1-9]\d?|100)-(\d{4}|[1-8]\d{4})-(\d{6})-([A-F0-9]{16})-([A-F0-9]{32})$/u.exec(code);
  if(!match)return invalid('Invalid format');
  const [,labId,scoreText,timeText,dateText,,provided]=match;
  const activeSeconds=Number(timeText),score=Number(scoreText);
  const date=`20${dateText.slice(0,2)}-${dateText.slice(2,4)}-${dateText.slice(4,6)}`;
  if(receiptLabId(labId)!==labId||activeSeconds>86400||String(activeSeconds).padStart(4,'0')!==timeText||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)return invalid('Invalid fields');
  const expected=await signPayload(code.slice(0,code.lastIndexOf('-')),secretKey);
  let difference=0;for(let index=0;index<expected.length;index++)difference|=expected.charCodeAt(index)^provided.charCodeAt(index);
  if(difference!==0)return invalid('Invalid signature or changed fields');
  return {code,valid:true,labId,score,activeSeconds,date};
}
