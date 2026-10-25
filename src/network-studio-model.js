// Local topology teaching model. It does not send network traffic or emulate IP routing.
export const NETWORK_STUDIO_LIMITS=Object.freeze({devices:12,links:24,minX:12,maxX:88,minY:18,maxY:82});
export const NETWORK_DEVICE_TYPES=Object.freeze([
 {id:'pc',type:'pc',label:'PC',ports:2,forwards:false,icon:'PC',description:'A two-port end device that sends and receives traffic. It does not forward between its ports.'},
 {id:'switch',type:'switch',label:'Switch',ports:6,forwards:true,icon:'SW',description:'Connects devices and forwards traffic between its active ports.'},
 {id:'router',type:'router',label:'Router',ports:4,forwards:true,icon:'RT',description:'A forwarding device in this simplified cabled-path model.'},
 {id:'server',type:'server',label:'Server',ports:1,forwards:false,icon:'SV',description:'An end device that can receive a test message.'},
 {id:'access-point',type:'access-point',label:'Access point',ports:4,forwards:true,icon:'AP',description:'A forwarding device with cabled teaching ports. Radio coverage is not simulated.'},
 {id:'printer',type:'printer',label:'Printer',ports:1,forwards:false,icon:'PR',description:'An end device that can receive a test message.'}
].map(Object.freeze));
const TYPES=new Map(NETWORK_DEVICE_TYPES.map(type=>[type.id,type]));
const DEVICE_ID=/^d[1-9]\d{0,3}$/;
const LINK_ID=/^l[1-9]\d{0,3}$/;
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const data=(value,key)=>record(value)?Object.getOwnPropertyDescriptor(value,key)?.value:undefined;
const integer=(value,min,max,fallback)=>Number.isInteger(value)&&value>=min&&value<=max?value:fallback;
const clamp=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.round(Math.max(min,Math.min(max,value))*10)/10:fallback;
const idNumber=id=>Number(id.slice(1));
const grid=[18,50,82].flatMap(y=>[12,37,63,88].map(x=>({x,y})));
const overlaps=(point,others)=>others.some(other=>Math.abs(point.x-other.x)<21&&Math.abs(point.y-other.y)<30);
function place(point,others,fallback){
 if(!overlaps(point,others))return point;
 return grid.filter(candidate=>!overlaps(candidate,others)).sort((a,b)=>(a.x-point.x)**2+(a.y-point.y)**2-((b.x-point.x)**2+(b.y-point.y)**2))[0]??fallback;
}
const labelFor=(type,id)=>`${TYPES.get(type).label} ${idNumber(id)}`;
const node=(id,type,x,y)=>({id,type,label:labelFor(type,id),x,y,powered:true});
const cable=(id,from,fromPort,to,toPort)=>({id,from,fromPort,to,toPort});
export function initialNetworkStudioState(template='classroom'){
 if(template==='blank')return {version:1,template:'blank',devices:[],links:[],source:'',target:'',nextDeviceId:1,nextLinkId:1,runs:0};
 return {version:1,template:'classroom',devices:[node('d1','pc',12,18),node('d2','switch',37,50),node('d3','router',63,50),node('d4','server',88,18),node('d5','printer',88,82)],links:[cable('l1','d1',0,'d2',0),cable('l2','d2',1,'d3',0),cable('l3','d3',1,'d4',0),cable('l4','d2',2,'d5',0)],source:'d1',target:'d4',nextDeviceId:6,nextLinkId:5,runs:0};
}
const portKey=(id,port)=>`${id}:${port}`;
const pairKey=(from,to)=>[from,to].sort().join(':');
function validPorts(link,devices){
 const a=devices.find(item=>item.id===link.from),b=devices.find(item=>item.id===link.to);
 return !!a&&!!b&&a.id!==b.id&&Number.isInteger(link.fromPort)&&link.fromPort>=0&&link.fromPort<TYPES.get(a.type).ports&&Number.isInteger(link.toPort)&&link.toPort>=0&&link.toPort<TYPES.get(b.type).ports;
}
export function normalizeNetworkStudioState(saved){
 if(!record(saved))return initialNetworkStudioState();
 const template=data(saved,'template')==='blank'?'blank':'classroom';
 const state=initialNetworkStudioState('blank');state.template=template;
 const rawDevices=data(saved,'devices'),rawLinks=data(saved,'links');
 // Reject oversized graphs instead of partially accepting a misleading topology.
 if(!Array.isArray(rawDevices)||rawDevices.length>12||!Array.isArray(rawLinks)||rawLinks.length>24)return state;
 const seen=new Set();
 for(let index=0;index<rawDevices.length;index++){
  const raw=Object.getOwnPropertyDescriptor(rawDevices,String(index))?.value;
  const id=data(raw,'id'),type=data(raw,'type');
  if(typeof id!=='string'||!DEVICE_ID.test(id)||seen.has(id)||!TYPES.has(type))continue;
  const fallback=grid.find(point=>!overlaps(point,state.devices));
  const supplied={x:clamp(data(raw,'x'),12,88,fallback?.x??12),y:clamp(data(raw,'y'),18,82,fallback?.y??18)};
  if(overlaps(supplied,state.devices)&&!fallback)continue;
  const point=place(supplied,state.devices,fallback??supplied);
  state.devices.push({...node(id,type,point.x,point.y),powered:data(raw,'powered')!==false});seen.add(id);
 }
 const ports=new Set(),pairs=new Set(),linkIds=new Set();
 for(let index=0;index<rawLinks.length;index++){
  const raw=Object.getOwnPropertyDescriptor(rawLinks,String(index))?.value;
  const link={id:data(raw,'id'),from:data(raw,'from'),fromPort:data(raw,'fromPort'),to:data(raw,'to'),toPort:data(raw,'toPort')};
  if(typeof link.id!=='string'||!LINK_ID.test(link.id)||linkIds.has(link.id)||!validPorts(link,state.devices))continue;
  const a=portKey(link.from,link.fromPort),b=portKey(link.to,link.toPort),pair=pairKey(link.from,link.to);
  if(ports.has(a)||ports.has(b)||pairs.has(pair))continue;
  state.links.push(link);ports.add(a);ports.add(b);pairs.add(pair);linkIds.add(link.id);
 }
 const source=data(saved,'source'),target=data(saved,'target');
 state.source=typeof source==='string'&&seen.has(source)?source:'';
 state.target=typeof target==='string'&&seen.has(target)?target:'';
 const nextDevice=Math.max(0,...state.devices.map(item=>idNumber(item.id)))+1;
 const nextLink=Math.max(0,...state.links.map(item=>idNumber(item.id)))+1;
 state.nextDeviceId=Math.max(nextDevice,integer(data(saved,'nextDeviceId'),1,10000,nextDevice));
 state.nextLinkId=Math.max(nextLink,integer(data(saved,'nextLinkId'),1,10000,nextLink));
 state.runs=integer(data(saved,'runs'),0,100000,0);
 return state;
}

export function applyNetworkStudioAction(saved,action,value){
 const state=normalizeNetworkStudioState(saved),before=JSON.stringify(state);
 let kind='none',topologyChanged=false,message='Choose a device, a port, or a test action.';
 const id=data(value,'id');
 const find=()=>state.devices.find(item=>item.id===id);
 if(action==='add-device'){
  const type=data(value,'type');
  if(!TYPES.has(type))return {state,changed:false,topologyChanged:false,message:'Choose a listed device type.',kind};
  if(state.devices.length>=12||state.nextDeviceId>9999)return {state,changed:false,topologyChanged:false,message:'This workbench holds up to 12 devices. Remove a device before adding another.',kind};
  const point=grid.find(candidate=>!overlaps(candidate,state.devices));
  if(!point)return {state,changed:false,topologyChanged:false,message:'Move devices to open a space before adding another device.',kind};
  const newId=`d${state.nextDeviceId++}`;
  state.devices.push(node(newId,type,point.x,point.y));
  if(!state.source)state.source=newId;
  else if(!state.target&&newId!==state.source)state.target=newId;
  kind='topology';topologyChanged=true;message=`${labelFor(type,newId)} added. Connect its ports to build a path.`;
 }else if(action==='remove-device'){
  const device=find();
  if(!device)return {state,changed:false,topologyChanged:false,message:'Choose a device to remove.',kind};
  state.devices=state.devices.filter(item=>item.id!==id);
  state.links=state.links.filter(link=>link.from!==id&&link.to!==id);
  if(state.source===id)state.source='';if(state.target===id)state.target='';
  kind='topology';topologyChanged=true;message=`${device.label} and its attached cables removed.`;
 }else if(action==='move-device'){
  const device=find(),x=data(value,'x'),y=data(value,'y');
  if(!device||typeof x!=='number'||!Number.isFinite(x)||typeof y!=='number'||!Number.isFinite(y))return {state,changed:false,topologyChanged:false,message:'Choose a device position inside the diagram.',kind};
  Object.assign(device,place({x:clamp(x,12,88,device.x),y:clamp(y,18,82,device.y)},state.devices.filter(item=>item.id!==id),{x:device.x,y:device.y}));
  kind='layout';message='Device moved. Its connections and network state stayed the same.';
 }else if(action==='connect'){
  const link={id:`l${state.nextLinkId}`,from:data(value,'from'),fromPort:data(value,'fromPort'),to:data(value,'to'),toPort:data(value,'toPort')};
  if(!validPorts(link,state.devices))return {state,changed:false,topologyChanged:false,message:'Choose valid ports on two different devices.',kind};
  if(state.links.length>=24||state.nextLinkId>9999)return {state,changed:false,topologyChanged:false,message:'The cable limit has been reached. Remove a cable first.',kind};
  if(state.links.some(item=>[portKey(item.from,item.fromPort),portKey(item.to,item.toPort)].some(key=>key===portKey(link.from,link.fromPort)||key===portKey(link.to,link.toPort))))return {state,changed:false,topologyChanged:false,message:'A selected port already has a cable. Disconnect it first.',kind};
  if(state.links.some(item=>pairKey(item.from,item.to)===pairKey(link.from,link.to)))return {state,changed:false,topologyChanged:false,message:'Those devices already have a cable between them.',kind};
  state.links.push(link);state.nextLinkId++;
  kind='topology';topologyChanged=true;message='Cable connected. The current path result has updated.';
 }else if(action==='disconnect'){
  const link=state.links.find(item=>item.id===id);
  if(!link)return {state,changed:false,topologyChanged:false,message:'Choose a cable to disconnect.',kind};
  state.links=state.links.filter(item=>item.id!==id);
  kind='topology';topologyChanged=true;message='Cable disconnected. The current path result has updated.';
 }else if(action==='power-device'){
  const device=find(),powered=data(value,'powered');
  if(!device||typeof powered!=='boolean')return {state,changed:false,topologyChanged:false,message:'Choose a device power setting.',kind};
  device.powered=powered;kind='topology';topologyChanged=true;message=`${device.label} powered ${powered?'on':'off'}.`;
 }else if(action==='select-source'||action==='select-target'){
  if(!find())return {state,changed:false,topologyChanged:false,message:'Choose a device in this layout.',kind};
  state[action==='select-source'?'source':'target']=id;
  kind='endpoint';message=`Test ${action==='select-source'?'source':'destination'} selected.`;
 }else if(action==='run'){
  state.runs=Math.min(100000,state.runs+1);kind='test';message=evaluateNetworkStudio(state).message;
 }else if(action==='reset'){
  const reset=initialNetworkStudioState(data(value,'template')==='blank'?'blank':'classroom');
  return {state:reset,changed:JSON.stringify(reset)!==before,topologyChanged:true,message:reset.template==='blank'?'Blank layout opened. Add two devices to begin.':'Classroom layout restored.',kind:'reset'};
 }
 const changed=JSON.stringify(state)!==before;
 return {state,changed,topologyChanged:changed&&topologyChanged,message,kind:changed?kind:'none'};
}

function search(state,source,target,active){
 const nodes=new Map(state.devices.map(device=>[device.id,device]));
 const queue=[source],visited=new Set([source]),parents=new Map();
 if(active&&!nodes.get(source)?.powered)return {found:false,parents,visited};
 for(let cursor=0;cursor<queue.length;cursor++){
  const id=queue[cursor],device=nodes.get(id);
  if(id===target)return {found:true,parents,visited};
  if(active&&id!==source&&!TYPES.get(device.type).forwards)continue;
  for(const link of state.links){
   const next=link.from===id?link.to:link.to===id?link.from:null;
   if(!next||visited.has(next)||(active&&!nodes.get(next).powered))continue;
   parents.set(next,{id,linkId:link.id});visited.add(next);queue.push(next);
  }
 }
 return {found:false,parents,visited};
}
function trace(parents,source,target){
 const path=[target],links=[];let at=target;
 while(at!==source){const parent=parents.get(at);if(!parent)return {path:[source],links:[]};links.unshift(parent.linkId);path.unshift(parent.id);at=parent.id;}
 return {path,links};
}

export function evaluateNetworkStudio(saved){
 const state=normalizeNetworkStudioState(saved),nodes=new Map(state.devices.map(device=>[device.id,device]));
 const source=nodes.get(state.source),target=nodes.get(state.target),selected=!!source&&!!target&&source.id!==target.id;
 const powered=selected&&source.powered&&target.powered;
 const physical=selected?search(state,source.id,target.id,false):null;
 const active=selected?search(state,source.id,target.id,true):null;
 const ok=!!(powered&&active?.found);
 const checks=[
  {label:'Choose two different devices as source and destination',ok:selected},
  {label:'Both test devices are powered on',ok:!!powered},
  {label:'Cables form a path between the two devices',ok:!!physical?.found},
  {label:'Intermediate devices are powered on and can forward the test message',ok}
 ];
 const result={ok,success:ok,status:ok?'success':'error',message:'',path:source?[source.id]:[],links:[],failedAt:source?.id??null,checks,steps:[],failureKind:null,blockedLinkId:null};
 if(!selected){result.status='incomplete';result.message=source&&target?'Choose two different devices to test a path.':'Add devices and choose a source and a destination.';result.failureKind='endpoints';return result;}
 if(!source.powered){result.message=`${source.label} is powered off. The test message cannot leave it.`;result.failureKind='power';return result;}
 const successfulSteps=(path,links)=>links.map((linkId,index)=>({from:path[index],to:path[index+1],linkId,ok:true,message:`Message passed from ${nodes.get(path[index]).label} to ${nodes.get(path[index+1]).label}.`}));
 if(ok){
  Object.assign(result,trace(active.parents,source.id,target.id));result.failedAt=null;
  result.message=`Success: a cabled path connects ${source.label} to ${target.label}.`;
  result.steps=successfulSteps(result.path,result.links);return result;
 }
 if(physical?.found){
  const proposed=trace(physical.parents,source.id,target.id);
  for(let index=0;index<proposed.links.length;index++){
   const from=nodes.get(proposed.path[index]),to=nodes.get(proposed.path[index+1]),linkId=proposed.links[index];
   if(index>0&&!TYPES.get(from.type).forwards){
    result.failedAt=from.id;result.failureKind='forwarding';result.blockedLinkId=linkId;
    result.message=`${from.label} is an end device and cannot forward the message. Use a switch, router, or access point between devices.`;
    result.steps.push({from:from.id,to:to.id,linkId,ok:false,message:result.message});return result;
   }
   if(!to.powered){
    result.failedAt=to.id;result.failureKind='power';result.blockedLinkId=linkId;
    result.message=`The message stopped before ${to.label}, which is powered off.`;
    result.steps.push({from:from.id,to:to.id,linkId,ok:false,message:result.message});return result;
   }
   result.path.push(to.id);result.links.push(linkId);
   result.steps.push({from:from.id,to:to.id,linkId,ok:true,message:`Message passed from ${from.label} to ${to.label}.`});
  }
 }
 // Show a reachable forwarding branch when the destination is physically disconnected.
 // This is a local probe trace, not a claim about an IP route or a routing protocol.
 const reachable=[...active.visited].map(id=>({device:nodes.get(id),...trace(active.parents,source.id,id)}));
 const candidates=reachable.filter(item=>item.device.id===source.id||TYPES.get(item.device.type).forwards);
 candidates.sort((a,b)=>b.links.length-a.links.length||a.device.id.localeCompare(b.device.id));
 const partial=candidates[0];
 if(partial){result.path=partial.path;result.links=partial.links;result.failedAt=partial.device.id;result.steps=successfulSteps(partial.path,partial.links);}
 result.failureKind='cable';
 result.message=`No cabled path reaches ${target.label}. The reachable probe stops at ${nodes.get(result.failedAt)?.label??source.label}. Connect the missing part of the path.`;
 return result;
}

export function networkStudioHasWork(saved){
 const state=normalizeNetworkStudioState(saved);
 return JSON.stringify(state)!==JSON.stringify(initialNetworkStudioState(state.template));
}
