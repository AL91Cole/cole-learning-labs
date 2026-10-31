import {SCENARIOS} from './scenarios.js?release=20261025-learning-plans';
import {FOUNDATION_LABS} from './foundation-model.js?release=20261025-learning-plans';

// Authored route keys only. Never accept a URL, custom starter name, class,
// learner identifier, notes, code, elapsed time, or browser metadata.
export const IMPROVEMENT_ACTIVITIES=Object.freeze([
  ...SCENARIOS.map(item=>({id:'lab/'+item.id,title:item.title})),
  ...FOUNDATION_LABS.map(item=>({id:'learn/'+item.id,title:item.title})),
  ...SCENARIOS.filter(item=>['network','ai','security'].includes(item.track)).map(item=>({id:'practice/'+item.id,title:'Practice: '+item.title})),
  {id:'studio/network',title:'Network studio'},
  {id:'studio/coding',title:'Coding studio'},
  {id:'sandbox',title:'Open coding sandbox'},
  {id:'capstone',title:'Classroom opening day'}
].map(item=>Object.freeze(item)));

export const IMPROVEMENT_OUTCOMES=Object.freeze(['finished','needed_help','not_finished','exploring']);
export const IMPROVEMENT_ATTEMPTS=Object.freeze(['one','two_or_three','four_plus','not_applicable']);
export const IMPROVEMENT_ISSUES=Object.freeze(['none','instructions','controls','test_result','display','other']);
const activities=new Set(IMPROVEMENT_ACTIVITIES.map(item=>item.id));
const fields=['version','activity','outcome','attempts','issue'];

/** Returns a fresh normalized payload, or null. Extra fields are rejected,
 * never stripped. Own data descriptors prevent getters becoming a data source. */
export function validateImprovementSummary(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const prototype=Object.getPrototypeOf(value);
  if(prototype!==null&&prototype!==Object.prototype)return null;
  const keys=Reflect.ownKeys(value);
  if(keys.length!==fields.length||keys.some(key=>!fields.includes(key)))return null;
  const clean={};
  for(const key of fields){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value'))return null;
    clean[key]=descriptor.value;
  }
  if(clean.version!==1||typeof clean.activity!=='string'||!activities.has(clean.activity)||
    !IMPROVEMENT_OUTCOMES.includes(clean.outcome)||!IMPROVEMENT_ATTEMPTS.includes(clean.attempts)||
    !IMPROVEMENT_ISSUES.includes(clean.issue))return null;
  return Object.freeze(clean);
}
