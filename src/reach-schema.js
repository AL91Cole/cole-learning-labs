import {CATALOG} from './lab-catalog.js?release=20261107-tech-team';
import {ARCADE_CATALOG} from './arcade-catalog.js?release=20261107-tech-team';
import {CODE_QUESTS} from './code-quest-catalog.js?release=20261107-tech-team';

export const REACH_ACTIVITIES=Object.freeze([
  ...CATALOG.map(item=>'lab/'+item.id),...ARCADE_CATALOG.map(item=>'arcade/'+item.id),
  ...CODE_QUESTS.map(item=>'quests/'+item.id),
  ...['HW','NET','AI','SEC','CODE'].flatMap(topic=>[1,2,3].map(band=>'explore/EX-'+topic+'-'+band)),
  ...['hardware','network','ai','security','coding'].map(topic=>'learn/'+topic),
  'play/inbox-defender','tool/sandbox','tool/network-studio','tool/coding-studio','tool/practice'
]);
const activities=new Set(REACH_ACTIVITIES);
export function validateReachEvent(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='activity,metric,version'||value.version!==1||!activities.has(value.activity)||!['start','complete'].includes(value.metric))return null;
  if(value.activity.startsWith('tool/')&&value.metric==='complete')return null;
  return {version:1,activity:value.activity,metric:value.metric};
}
export function reachActivity(hash){
  const path=String(hash||'').replace(/^#/u,'').split('?')[0],parts=path.split('/');
  if(parts[0]==='lab'&&parts.length===3&&['request','workbench','explain'].includes(parts[2]))return activities.has(parts.slice(0,2).join('/'))?parts.slice(0,2).join('/'):null;
  if(activities.has(path)&&!path.startsWith('tool/'))return path;
  if(parts[0]==='sandbox'&&parts.length===2&&['blank','pixel-pet','arcade','rover','tiles'].includes(parts[1]))return 'tool/sandbox';
  if(parts[0]==='practice'&&parts.length===2&&CATALOG.some(item=>item.id===parts[1]))return 'tool/practice';
  return path==='studio/network'?'tool/network-studio':path==='studio/coding'?'tool/coding-studio':null;
}
