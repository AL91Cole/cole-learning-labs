// Saved-work normalization needs the hardware, workspace, interview and
// experiment engines. Those download with the investigation routes, so the
// start-up bundle reaches them through this registry instead of importing them.
// records.js registers itself when it loads; until then saved work cannot be
// read or written, and the storage manager reports that honestly.
let normalizer=null;
export function registerRecordNormalizer(fn){if(typeof fn!=='function')throw new Error('A record normalizer function is required.');normalizer=fn;}
export const recordNormalizerReady=()=>normalizer!==null;
export function normalizeSavedRecord(scenario,value){
  if(!normalizer)throw new Error('Saved work cannot be read before the investigation modules load.');
  return normalizer(scenario,value);
}
