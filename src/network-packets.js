import {NETWORK_CONFIG,networkChecks} from './network-labs.js?release=20261025-learning-plans';
import {getNetworkBenchSpec,normalizeNetworkBench} from './network-bench.js?release=20261025-learning-plans';
import {getNetworkDiagram} from './network-diagrams.js?release=20261025-learning-plans';

// Reviewed local paths. A diagram signal never sends real network traffic,
// rewrites supplied evidence, or awards an investigation test result.
const paths={
 NET207:['ip','ethernet','Layer handoff illustration'],
 NET208:['pc04','building','Classroom-to-building signal'],
 NET209:['pc','school','Classroom-to-school signal'],
 NET210:['guest','core','Guest uplink signal'],
 NET211:['classroom','portal','Classroom-to-portal signal'],
 NET212:['pc','provider','PC-to-provider signal'],
 NET213:['phone','uplink','Voice uplink signal'],
 NET214:['students','gateway','Student-to-gateway signal'],
 NET215:['pc','hop','Routed-hop illustration'],
 NET216:['uplink','manager','Manager-link illustration']
};
const code=id=>typeof id==='string'?id.replaceAll('-','').toUpperCase():'';
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
function choicesFor(id,saved){
 const source=record(saved)?saved:{};
 return Object.fromEntries((NETWORK_CONFIG[id]?.fields??[]).map(field=>[field.name,Object.hasOwn(source,field.name)&&field.options.some(([value])=>source[field.name]===value)?source[field.name]:field.initial]));
}
export function packetTraceSignature(id,saved){
 const key=code(id);if(!paths[key])return '';
 return JSON.stringify([choicesFor(key,saved),normalizeNetworkBench(key,saved?.networkBench).disconnected]);
}
function route(cables,from,to,missing){
 const queue=[{node:from,steps:[]}],seen=new Set([from]);
 while(queue.length){
  const item=queue.shift();if(item.node===to)return item.steps;
  for(const cable of cables){
   if(missing.has(cable.id))continue;
   const next=cable.from===item.node?cable.to:cable.to===item.node?cable.from:null;
   if(next&&!seen.has(next)){seen.add(next);queue.push({node:next,steps:[...item.steps,{cableId:cable.id,from:item.node,to:next,blocked:false}]});}
  }
 }
 return null;
}

/** Return a bounded, deterministic signal trace from the current saved plan. */
export function getPacketTrace(id,saved){
 const key=code(id),spec=getNetworkBenchSpec(key),path=paths[key];
 if(!spec||!path)return null;
 const [source,target,title]=path,bench=normalizeNetworkBench(key,saved?.networkBench),missing=new Set(bench.disconnected);
 const graph=getNetworkDiagram(key,saved),labels=Object.fromEntries(graph.nodes.map(node=>[node.id,node.label]));
 let steps=route(spec.cables,source,target,missing),pathConnected=steps!==null;
 if(!steps){
  steps=[];
  for(const step of route(spec.cables,source,target,new Set())??[]){
   const blocked=missing.has(step.cableId);steps.push({...step,blocked});if(blocked)break;
  }
 }
 const checks=networkChecks(key,choicesFor(key,saved)),failedChecks=checks.filter(check=>!check.ok);
 const completeCabling=missing.size===0,ok=pathConnected&&completeCabling&&failedChecks.length===0;
 let message;
 if(!pathConnected){const last=steps.at(-1);message=`Signal stopped: the cable from ${labels[last?.from]??labels[source]} to ${labels[last?.to]??labels[target]} is unplugged.`;}
 else if(!completeCabling)message='This signal path reached its endpoint, but another required cable is unplugged. Reconnect it before the full plan can pass.';
 else if(failedChecks.length)message=`Signal path reached its endpoint. Saved-plan check failed: ${failedChecks[0].label}.`;
 else message=['NET207','NET215','NET216'].includes(key)?'Link illustration completed. Saved-plan checks pass. Run the workspace test separately to record the result.':'Signal and modeled reply completed. Saved-plan checks pass. Run the workspace test separately to record the result.';
 const illustration=['NET207','NET215','NET216'].includes(key);
 return {title,source,target,labels,steps,pathConnected,ok,reply:!illustration,failedChecks,missing:[...missing],message,
  note:illustration?'Local link illustration only. Supplied packet, counter, and receiver records stay fixed.':'Local signal model only. This does not send real packets or prove an application or remote service works.'};
}
