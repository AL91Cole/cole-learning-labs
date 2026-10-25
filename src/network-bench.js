// Reviewed local ports only. Student text never defines devices, addresses, or code.
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const code=id=>typeof id==='string'?id.replaceAll('-','').toUpperCase():'';
const positions={
 NET207:[['file',12,25],['voice',12,75],['transport',37,25],['ip',63,25],['ethernet',88,25],['addresses',63,75]],
 NET208:[['pc04',12,25],['pc05',12,75],['cabinet',37,50],['router',63,50],['building',88,50]],
 NET209:[['pc',12,25],['gateway',37,25],['edge',63,25],['school',88,25],['allocation',25,75],['remote',75,75]],
 NET210:[['guest',12,25],['switch',37,25],['core',63,25],['portal',88,25],['backup',50,75],['staff',88,75]],
 NET211:[['classroom',12,25],['signin',37,25],['firewall',63,25],['portal',88,25],['ids',37,75],['review',75,75]],
 NET212:[['pc',12,25],['gateway',37,25],['provider',63,25],['remote',88,25],['record',50,75]],
 NET213:[['phone',12,25],['queue',37,25],['uplink',63,25],['peer',88,25],['bulk',37,75],['management',75,75]],
 NET214:[['students',12,25],['staff',12,75],['switch',37,50],['ap',63,75],['guest',88,75],['gateway',88,25]],
 NET215:[['pc',12,25],['gateway',37,25],['hop',63,25],['remote',88,25],['capture',25,75],['interpretation',75,75]],
 NET216:[['uplink',12,25],['printer',12,75],['manager',50,25],['threshold',50,75],['desk',88,25]]
};
const paths={
 NET207:[['ip','ethernet']],
 NET208:[['pc04','cabinet'],['pc05','cabinet'],['cabinet','router'],['router','building','fiber']],
 NET209:[['pc','gateway'],['gateway','edge'],['edge','school']],
 NET210:[['guest','switch'],['switch','core'],['switch','backup'],['backup','core']],
 NET211:[['classroom','firewall'],['firewall','portal']],
 NET212:[['pc','gateway'],['gateway','provider']],
 NET213:[['phone','queue'],['bulk','queue'],['queue','uplink']],
 NET214:[['students','switch'],['staff','switch'],['switch','ap'],['switch','gateway']],
 NET215:[['pc','gateway'],['gateway','hop']],
 NET216:[['uplink','manager']]
};

export function getNetworkBenchSpec(id){
 const key=code(id);
 if(!positions[key])return null;
 return {nodes:positions[key].map(([id,x,y])=>({id,x,y})),cables:paths[key].map(([from,to,kind='copper'])=>{
  const id=`${from}-${to}`;
  return {id,from,to,kind,fromPort:`${id}:a`,toPort:`${id}:b`};
 })};
}

const clamp=(value,min,max,fallback)=>Number.isFinite(value)?Math.round(Math.max(min,Math.min(max,value))*10)/10:fallback;
const overlaps=(point,others)=>others.some(other=>Math.abs(point.x-other.x)<23&&Math.abs(point.y-other.y)<35);
function available(point,others,fallback){
 if(!overlaps(point,others))return point;
 const grid=[12,25,37,50,63,75,88].flatMap(x=>[18,25,50,75,82].map(y=>({x,y})));
 const candidates=grid.filter(item=>!overlaps(item,others));
 return candidates.sort((a,b)=>(a.x-point.x)**2+(a.y-point.y)**2-((b.x-point.x)**2+(b.y-point.y)**2))[0]??fallback;
}

export function networkBenchInitial(id){return normalizeNetworkBench(id,{});}

export function normalizeNetworkBench(id,saved){
 const spec=getNetworkBenchSpec(id);
 if(!spec)return {positions:{},disconnected:[]};
 const input=record(saved)?saved:{},source=record(input.positions)?input.positions:{};
 const normalized={positions:{},disconnected:[]},placed=[];
 for(const node of spec.nodes){
  const supplied=Object.hasOwn(source,node.id)&&record(source[node.id])?source[node.id]:{};
  const point=available({x:clamp(supplied.x,12,88,node.x),y:clamp(supplied.y,18,82,node.y)},placed,{x:node.x,y:node.y});
  normalized.positions[node.id]={...point};placed.push(point);
 }
 const known=new Set(spec.cables.map(cable=>cable.id));
 if(Array.isArray(input.disconnected))normalized.disconnected=[...new Set(input.disconnected.filter(item=>typeof item==='string'&&known.has(item)))].sort();
 return normalized;
}

// Device movement changes the drawing; only cable changes alter connectivity.
export function networkBenchSignature(id,bench){return JSON.stringify(normalizeNetworkBench(id,bench).disconnected);}

export function networkCableChecks(id,bench){
 const spec=getNetworkBenchSpec(id),state=normalizeNetworkBench(id,bench);
 return (spec?.cables??[]).map(cable=>({label:`${cable.kind==='fiber'?'Fiber':'Ethernet'} cable: ${cable.from} to ${cable.to}`,ok:!state.disconnected.includes(cable.id)}));
}

export function applyNetworkBenchAction(id,bench,action,value){
 const spec=getNetworkBenchSpec(id),state=normalizeNetworkBench(id,bench),result={bench:state,changed:false,kind:'layout',message:'Choose a device or a listed cable port.'};
 if(!spec||!record(value))return result;
 if(action==='move'){
  const node=spec.nodes.find(item=>item.id===value.nodeId);
  if(!node||!Number.isFinite(value.x)||!Number.isFinite(value.y))return result;
  const others=Object.entries(state.positions).filter(([key])=>key!==node.id).map(([,point])=>point);
  state.positions[node.id]=available({x:clamp(value.x,12,88,node.x),y:clamp(value.y,18,82,node.y)},others,state.positions[node.id]);
  result.message='Device position saved.';
 }else if(action==='reset-layout'){
  state.positions=networkBenchInitial(id).positions;result.message='Device positions reset. Cable connections kept.';
 }else if(action==='disconnect'){
  const cable=spec.cables.find(item=>item.id===value.cableId);
  if(!cable)return result;
  state.disconnected=[...new Set([...state.disconnected,cable.id])].sort();result.kind='cable';result.message='Cable disconnected. Run a fresh test after reconnecting.';
 }else if(action==='connect'){
  const cable=spec.cables.find(item=>(item.fromPort===value.fromPort&&item.toPort===value.toPort)||(item.toPort===value.fromPort&&item.fromPort===value.toPort));
  result.kind='cable';
  if(!cable){result.message='Those ports do not match. Use the two ends with the same cable label.';return result;}
  state.disconnected=state.disconnected.filter(item=>item!==cable.id);result.message='Cable connected. Run a fresh test to check the path.';
 }else return result;
 result.changed=JSON.stringify(state)!==JSON.stringify(normalizeNetworkBench(id,bench));
 return result;
}
