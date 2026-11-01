import {CATALOG} from './lab-catalog.js?release=20261025-learning-plans';

/** The public entry cannot grant membership from browser state or a URL.
 * Only the separately protected member build replaces this source constant. */
export const MEMBER_CONTENT=false;

export const FREE_LAB_IDS_BY_TOPIC=Object.freeze({
  hardware:Object.freeze(['INC-101','INC-102']),
  network:Object.freeze(['NET-201','NET-202']),
  ai:Object.freeze(['AI-301','AI-302']),
  security:Object.freeze(['SEC-401','SEC-402']),
  coding:Object.freeze(['CODE-501','CODE-502'])
});
export const FREE_LAB_IDS=Object.freeze(Object.values(FREE_LAB_IDS_BY_TOPIC).flat());
const freeLabIds=new Set(FREE_LAB_IDS);
const catalogue=new Map(CATALOG.map(lab=>[lab.id,lab]));
const topics=new Set(Object.keys(FREE_LAB_IDS_BY_TOPIC));
const foundationIds=new Set([
  ...topics,'HW-100','NET-200','AI-300','SEC-400','CODE-500'
]);
const informationalPages=new Set(['home','projects','about','connect','privacy','guide']);
const practiceTopics=new Set(['network','ai','security']);
const studioIds=new Set(['network','coding']);
const sandboxIds=new Set(['blank','pixel-pet','arcade','rover','tiles']);

export const isFreeLab=id=>typeof id==='string'&&freeLabIds.has(id);

/** Classify a parsed application route; this does not authenticate a purchaser.
 * Unknown input stays closed. Query flags and client membership claims have no
 * authority here. Protected delivery must separately verify current access. */
export function routeAccess(route){
  if(!route||typeof route!=='object'||Array.isArray(route))return 'unknown';
  const {page,id}=route;
  if(typeof page!=='string'||(id!==undefined&&typeof id!=='string'))return 'unknown';
  const noId=id===undefined||id==='';
  if(informationalPages.has(page))return noId?'public':'unknown';
  if(page==='labs')return noId||topics.has(id)?'public':'unknown';
  if(page==='learn')return foundationIds.has(id)?'public':'unknown';
  if(page==='lab')return catalogue.has(id)?(isFreeLab(id)?'public':'member'):'unknown';
  if(page==='practice'){
    const lab=catalogue.get(id);
    return lab&&practiceTopics.has(lab.track)?(isFreeLab(id)?'public':'member'):'unknown';
  }
  if(page==='studio')return studioIds.has(id)?'member':'unknown';
  if(page==='sandbox')return noId||sandboxIds.has(id)?'member':'unknown';
  if(page==='capstone'||page==='educators')return noId?'member':'unknown';
  return 'unknown';
}
