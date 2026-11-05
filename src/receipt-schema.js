import {CATALOG} from './lab-catalog.js?release=20261106-fast-start';
import {ARCADE_CATALOG} from './arcade-catalog.js?release=20261106-fast-start';
import {CODE_QUESTS} from './code-quest-catalog.js?release=20261106-fast-start';

// Only public identifiers and titles belong here. Never derive an identifier by
// truncating arbitrary input: that can collide and can admit private text.
const foundations=[
  ['hardware','HW-100','Meet the computer'],
  ['network','NET-200','Follow a network connection'],
  ['ai','AI-300','Understand an AI response'],
  ['security','SEC-400','Practice safe security habits'],
  ['coding','CODE-500','Read, change, and test code']
];
// Append new mappings rather than renumbering existing receipt identifiers.
const arcadeIds=['packet-post','gateway-garden','vlan-village','resilient-ring','hop-count-hike','budget-bot','quiet-cube','memory-match','pixel-stage','archive-rover','permission-park','firewall-fort','factor-watch','backup-bunker','update-harbor','shape-sprouts','evidence-orbit','privacy-picnic','prompt-reef','fairness-fair','garden-rover','loop-lagoon','branch-bridge','delivery-drone','bug-trail'];
const questIds={python:'CQPY',javascript:'CQJS',java:'CQJAVA',cpp:'CQCPP',csharp:'CQCS',typescript:'CQTS',sql:'CQSQL',go:'CQGO',rust:'CQRUST',swift:'CQSWIFT',kotlin:'CQKOTLIN',ruby:'CQRUBY'};
const elementary=[
  ['HW','Meet the computer parts','Plan a safe virtual repair','Trace a screen signal'],
  ['NET','Help a pretend message travel','Choose a packet’s destination','Find the missing network step'],
  ['AI','Check the robot’s guess','Find evidence for an answer','Question a tiny survey'],
  ['SEC','Keep private things private','Pause, check, get help','Choose the least access'],
  ['CODE','Move the picture robot','Predict a small counter','Trace repeats and decisions']
];
export const RECEIPT_LABS=Object.freeze([
  ...CATALOG.map(lab=>({id:lab.id,labId:lab.id.replaceAll('-',''),title:lab.title})),
  ...foundations.map(([alias,id,title])=>({id,alias,labId:id.replaceAll('-',''),title})),
  {id:'CAP-601',labId:'CAP601',title:'Classroom opening day'},
  ...arcadeIds.map((id,index)=>({id,alias:'arcade/'+id,labId:'AR'+String(index+1).padStart(2,'0'),title:ARCADE_CATALOG.find(lab=>lab.id===id).title})),
  ...CODE_QUESTS.map(lab=>({id:lab.id,alias:'quest/'+lab.id,labId:questIds[lab.id],title:lab.title+' Code Quest'})),
  ...elementary.flatMap(([topic,...titles])=>titles.map((title,index)=>({id:`EX-${topic}-${index+1}`,labId:`EX${topic}${index+1}`,title}))),
  {id:'inbox-defender',alias:'play/inbox-defender',labId:'INBOX',title:'Inbox Defender'},
  {id:'inbox-picture',labId:'INBOXPIC',title:'Inbox Defender: Picture Patrol'}
].map(Object.freeze));
export function receiptLabId(value){
  if(typeof value!=='string'||value.length>64)return null;
  const direct=RECEIPT_LABS.find(lab=>value===lab.id||value===lab.labId||value===lab.alias);
  if(direct)return direct.labId;
  const route=/^(?:lab|learn|explore|arcade|quests|quest)\/([^/]+)$/u.exec(value);
  return route?RECEIPT_LABS.find(lab=>route[1]===lab.id||route[1]===lab.alias)?.labId||null:null;
}
export function validateReceiptEvent(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const keys=Object.keys(value),allowed=['labId','eventType','activeSeconds','stepReached','score','collectTelemetry'];
  if(keys.some(key=>!allowed.includes(key))||!['labId','eventType','activeSeconds','stepReached'].every(key=>Object.hasOwn(value,key)))return null;
  const labId=receiptLabId(value.labId);
  if(!labId||!['start','complete','abandon'].includes(value.eventType)||!Number.isSafeInteger(value.activeSeconds)||value.activeSeconds<0||value.activeSeconds>86400||!Number.isSafeInteger(value.stepReached)||value.stepReached<1||value.stepReached>100)return null;
  const hasScore=Object.hasOwn(value,'score');
  if(value.eventType==='complete'?!hasScore||!Number.isSafeInteger(value.score)||value.score<0||value.score>100:hasScore)return null;
  if(value.eventType==='start'&&(value.activeSeconds!==0||value.stepReached!==1))return null;
  if(Object.hasOwn(value,'collectTelemetry')&&typeof value.collectTelemetry!=='boolean')return null;
  return {labId,eventType:value.eventType,activeSeconds:value.activeSeconds,stepReached:value.stepReached,collectTelemetry:value.collectTelemetry===true,...(hasScore?{score:value.score}:{})};
}
