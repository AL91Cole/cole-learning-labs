import {NETWORK_CONFIG} from './network-labs.js?release=20261024-network-studio';
import {getPacketTrace,packetTraceSignature} from './network-packets.js?release=20261024-network-studio';
import {getNetworkDiagram} from './network-diagrams.js?release=20261024-network-studio';
import {getNetworkBenchSpec,normalizeNetworkBench,applyNetworkBenchAction} from './network-bench.js?release=20261024-network-studio';

const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const packetSnapshots=new WeakMap();
const tones=new Set(['ready','blocked','warning','neutral']);
const tone=value=>tones.has(value)?value:'neutral';
const position=value=>Number.isFinite(value)?Math.max(12,Math.min(88,value)):50;
const code=id=>typeof id==='string'?id.replaceAll('-','').toUpperCase():'';
const fieldLabels=(id,node)=>{
 const fields=NETWORK_CONFIG[code(id)]?.fields??[];
 return fields.filter(field=>node.fields?.includes(field.name));
};
const symbol=kind=>{
 const name=String(kind??'').toLowerCase();
 if(/switch/.test(name))return '<rect x="3" y="8" width="26" height="16" rx="3"/><path d="M7 13h3m4 0h3m4 0h3M7 19h3m4 0h3m4 0h3"/>';
 if(/router|gateway/.test(name))return '<rect x="4" y="11" width="24" height="14" rx="3"/><path d="M9 11V5m14 6V5M8 18h6m4 0h6m-4-3 4 3-4 3M12 15l-4 3 4 3"/>';
 if(/server|portal|manager|monitor|service/.test(name))return '<rect x="7" y="3" width="18" height="26" rx="3"/><path d="M7 12h18M7 21h18M11 8h2m-2 9h2m-2 9h2M18 8h3m-3 9h3m-3 9h3"/>';
 if(/firewall|security|policy/.test(name))return '<path d="M16 3 27 8v8c0 6-5 10-11 13C10 26 5 22 5 16V8L16 3Z"/><path d="m10 16 4 4 8-9"/>';
 if(/wireless|wifi|access/.test(name))return '<path d="M3 11c8-8 18-8 26 0M8 16c5-5 11-5 16 0m-11 5c2-2 4-2 6 0"/><circle cx="16" cy="27" r="1"/>';
 if(/packet|message|transport|frame/.test(name))return '<rect x="3" y="7" width="26" height="19" rx="3"/><path d="m3 9 13 10L29 9M3 25l9-9m17 9-9-9"/>';
 if(/cloud|internet/.test(name))return '<path d="M8 25a6 6 0 0 1-1-12A9 9 0 0 1 24 11a7 7 0 0 1 0 14H8Z"/>';
 return '<rect x="3" y="4" width="26" height="19" rx="2"/><path d="M16 23v5m-7 0h14M7 9h18"/>';
};
const icon=kind=>`<svg class="net-node-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${symbol(kind)}</svg>`;

function visualModel(id,saved){
 const graph=getNetworkDiagram(id,saved),spec=getNetworkBenchSpec(id);
 if(!graph||!spec)return graph;
 const bench=normalizeNetworkBench(id,saved?.networkBench),missing=new Set(bench.disconnected);
 graph.bench=bench;graph.spec=spec;
 for(const item of graph.nodes)Object.assign(item,bench.positions[item.id]);
 for(const cable of spec.cables){
  let edge=graph.links.find(item=>item.from===cable.from&&item.to===cable.to);
  if(!edge){edge={from:cable.from,to:cable.to,label:`${cable.kind==='fiber'?'Fiber':'Ethernet'} cable`,status:'Physical connection',tone:'neutral'};graph.links.push(edge);}
  Object.assign(edge,{cableId:cable.id,kind:cable.kind,connected:!missing.has(cable.id)});
  if(missing.has(cable.id)){edge.tone='blocked';edge.status='Cable disconnected';}
 }
 if(missing.size){
  for(const item of graph.nodes){
   const attached=spec.cables.filter(cable=>cable.from===item.id||cable.to===item.id);
   if(attached.some(cable=>missing.has(cable.id))){item.detail=`A cable at this device is unplugged. Other connected ports keep their own state. ${item.detail}`;item.status='Cable unplugged';item.tone=attached.some(cable=>!missing.has(cable.id))?'warning':'blocked';}
  }
 }
 // These checkpoint cases have an ordered physical path. Desk branches in the
 // other cases keep their independent state when a neighboring cable is removed.
 const mark=(nodeId,status,detail)=>{const item=graph.nodes.find(node=>node.id===nodeId);if(item)Object.assign(item,{status,detail,tone:'blocked'});};
 if(code(id)==='NET212'){
  const localMissing=missing.has('pc-gateway'),providerMissing=missing.has('gateway-provider');
  if(localMissing){
   for(const nodeId of ['gateway','provider','remote'])mark(nodeId,'Not reached from PC','The PC cable is unplugged. This checkpoint is not reached from the PC; this does not prove the remote service failed.');
  }else if(providerMissing){
   const gateway=graph.nodes.find(node=>node.id==='gateway');
   if(gateway&&saved?.gateway==='10.50.0.1'&&saved?.link==='up')gateway.status='Gateway responds; uplink unplugged';
   mark('provider','Provider not reached','The gateway-to-provider cable is unplugged. The local gateway checkpoint is separate from this handoff.');
   mark('remote','Remote not reached','The physical path stops before the provider. Restore that path before testing the selected remote route.');
  }
  if(localMissing||providerMissing)for(const edge of graph.links){
   if(edge.from==='provider'&&edge.to==='remote'||localMissing&&edge.from==='gateway'&&edge.to==='provider'&&edge.connected){edge.tone='blocked';edge.status='Checkpoint not reached from PC';}
  }
 }
 if(code(id)==='NET209'&&missing.has('edge-school')){
  mark('school','OSPF peer link unplugged','The classroom-to-school peer cable is unplugged. Matching area numbers cannot form an adjacency or learn the school route across this missing link.');
  const route=graph.links.find(edge=>edge.from==='school'&&edge.to==='remote');
  if(route){route.status='No route learned across unplugged peer link';route.tone='blocked';}
 }
 return graph;
}

function portsFor(diagram,nodeId){return diagram.spec.cables.flatMap(cable=>cable.from===nodeId?[{cable,port:cable.fromPort,peer:cable.to}]:cable.to===nodeId?[{cable,port:cable.toPort,peer:cable.from}]:[]);}
function portPoint(diagram,cable,nodeId){
 const item=diagram.nodes.find(node=>node.id===nodeId),ports=portsFor(diagram,nodeId),index=ports.findIndex(port=>port.cable.id===cable.id);
 return {x:position(item.x)*7.6+(index-(ports.length-1)/2)*48*(diagram.unitX??1),y:position(item.y)*4.8+53};
}
function cableControls(diagram,node){
 const ports=portsFor(diagram,node.id);
 return `<div class="net-ports" aria-label="${escape(node.label)} cable ports">${ports.map(({cable,port,peer})=>{const connected=!diagram.bench.disconnected.includes(cable.id),label=`${cable.kind==='fiber'?'F':'E'}${diagram.spec.cables.indexOf(cable)+1}`;return `<button type="button" class="net-port ${connected?'net-ready':'net-blocked'}" data-net-port="${escape(port)}" aria-label="${escape(`${node.label}, ${cable.kind} port ${label} to ${diagram.nodes.find(item=>item.id===peer)?.label??peer}. ${connected?'Connected':'Unplugged'}. Select cable end.`)}" aria-pressed="false" title="${escape(`${label}: ${peer}`)}"><span aria-hidden="true">${label}</span><span class="sr-only">${connected?'Connected':'Unplugged'}</span></button>`;}).join('')}</div>`;
}

function inspector(id,node,diagram){
 const fields=fieldLabels(id,node);
 const cables=diagram?portsFor(diagram,node.id):[];
 return `<div class="net-inspect-heading">${icon(node.kind)}<div><p class="net-eyebrow">Selected device</p><h4>${escape(node.label)}</h4></div><span class="net-status net-${tone(node.tone)}">${escape(node.status)}</span></div><div class="net-move-controls" aria-label="Move selected device">${[['left','←',-5,0],['up','↑',0,-5],['down','↓',0,5],['right','→',5,0]].map(([name,arrow,x,y])=>`<button type="button" data-net-move="${name}" data-dx="${x}" data-dy="${y}" aria-label="Move ${escape(node.label)} ${name}">${arrow}</button>`).join('')}</div>${cables.length?`<div class="net-cable-controls">${cables.map(({cable,peer})=>{const disconnected=diagram.bench.disconnected.includes(cable.id);return `<button type="button" data-net-cable-action="${disconnected?'connect':'disconnect'}" data-net-cable-id="${escape(cable.id)}">${disconnected?'Connect':'Disconnect'} ${escape(cable.kind)} to ${escape(diagram.nodes.find(item=>item.id===peer)?.label??peer)}</button>`;}).join('')}</div>`:''}<details class="net-device-details"><summary>Device details</summary><p>${escape(node.detail)}</p>${fields.length?`<p class="net-related"><strong>Device settings:</strong> ${fields.map(field=>escape(field.label)).join(' · ')}</p>`:''}</details>${fields.length?'<button type="button" class="net-settings" data-network-settings>Show device settings</button>':''}`;
}

function connection(link,diagram,index){
 const from=diagram.nodes.find(node=>node.id===link.from),to=diagram.nodes.find(node=>node.id===link.to);
 if(!from||!to)return '';
 const cable=diagram.spec.cables.find(item=>item.id===link.cableId);
 const a=cable?portPoint(diagram,cable,from.id):{x:position(from.x)*7.6,y:position(from.y)*4.8-26};
 const b=cable?portPoint(diagram,cable,to.id):{x:position(to.x)*7.6,y:position(to.y)*4.8-26};
 const {x:x1,y:y1}=a,{x:x2,y:y2}=b;
 const midX=(x1+x2)/2,midY=(y1+y2)/2;
 const attrs=cable?` data-net-wire="${escape(cable.id)}"`:' data-net-logical';
 return `<g class="net-wire net-${tone(link.tone)}${cable?' net-physical':' net-logical'}"${attrs}><path d="M ${x1} ${y1} L ${x2} ${y2}"/><circle cx="${midX}" cy="${midY}" r="12"/><text x="${midX}" y="${midY+4}" text-anchor="middle">${index+1}</text></g>`;
}

/** Render a saved local plan. Selecting a device never applies choices or runs a test. */
export function renderNetworkVisual(id,saved,selectedId){
 const diagram=visualModel(id,saved);
 if(!diagram?.nodes?.length)return '';
 const selected=diagram.nodes.find(node=>node.id===selectedId)??diagram.nodes[0];
 const nodes=diagram.nodes.map(node=>`<div class="net-device" data-net-device="${escape(node.id)}" style="left:${position(node.x)}%;top:${position(node.y)}%"><button type="button" class="net-node net-${tone(node.tone)}" data-net-node="${escape(node.id)}" aria-pressed="${node.id===selected.id}" aria-label="${escape(`${node.label}: ${node.status}. Drag to move or select to inspect.`)}">${icon(node.kind)}<strong>${escape(node.label)}</strong><span>${escape(node.status)}</span></button>${cableControls(diagram,node)}</div>`).join('');
 const links=diagram.links??[];
 return `<section class="network-visual" data-network-visual aria-label="Visual network"><div class="net-visual-heading"><p class="net-eyebrow">Visual network</p><h3>${escape(diagram.title)}</h3></div><p class="net-use-note">Drag a device. Select a cable to unplug it. Select its two matching ports to reconnect.</p><p class="net-bench-feedback" data-net-feedback role="status" aria-live="polite">Cables and positions save as you work. Run a fresh test after cable changes.</p><div class="net-viewport" tabindex="0" role="region" aria-label="Network diagram. Scroll horizontally to see every device."><div class="net-canvas"><svg class="net-connections" viewBox="0 0 760 480" preserveAspectRatio="none" aria-hidden="true" focusable="false">${links.map((link,index)=>connection(link,diagram,index)).join('')}</svg>${nodes}</div></div><div class="net-bench-toolbar"><span>E = Ethernet · F = Fiber · dotted = reference or policy</span><button type="button" data-net-reset>Reset positions</button></div><div class="net-packet-panel"><div class="net-packet-actions"><button type="button" data-net-send-packet>Send test packet</button><button type="button" data-net-stop-packet hidden>Stop signal</button></div><p data-net-packet-status role="status" aria-live="polite">Send a local signal through the saved plan. This does not record a workspace test.</p><details class="net-packet-steps"><summary>Signal steps</summary><ol data-net-packet-steps></ol></details></div><div class="net-device-inspector" data-network-inspector aria-live="polite" aria-atomic="true">${inspector(id,selected,diagram)}</div><details class="net-link-details"><summary>Map help and connection details (${links.length})</summary><p class="net-plan-note"><strong>Saved network plan</strong> · Apply my choices updates this picture. Run a fresh test to check the plan.</p><p>${escape(diagram.summary)}</p><p>Ports with the same cable label form one reviewed connection. Other pairings stay blocked. Move arrows are available after selecting a device. Supplied packet and event records stay fixed.</p><ul class="net-legend" aria-label="Connection legend"><li class="net-ready">Ready or expected</li><li class="net-blocked">Blocked or missing</li><li class="net-warning">Needs attention</li><li class="net-neutral">Supplied reference</li></ul><ol>${links.map(link=>{const from=diagram.nodes.find(node=>node.id===link.from),to=diagram.nodes.find(node=>node.id===link.to);return `<li><strong>${escape(from?.label??link.from)} → ${escape(to?.label??link.to)}</strong><span>${escape(link.label)} · ${escape(link.status)}${link.cableId?` · ${escape(link.kind)} cable`:' · fixed reference'}</span></li>`;}).join('')}</ol></details></section>`;
}

/** Bind only the map and its inspector, leaving unsaved form choices untouched. */
export function mountNetworkVisual(root,id,saved,{selectedId,onSelect,onSettings,onBenchAction}={}){
 let diagram=visualModel(id,saved);
 const visual=root?.querySelector?.('[data-network-visual]');
 if(!diagram?.nodes?.length||!visual?.querySelectorAll||!visual?.querySelector)return ()=>{};
 const panel=visual.querySelector('[data-network-inspector]');
 if(!panel)return ()=>{};
 let selected=diagram.nodes.find(node=>node.id===selectedId)??diagram.nodes[0],drag=null,suppressClick=null,pendingPort=null,stopPackets=()=>{};
 const removers=[];
 const buttons=[...visual.querySelectorAll('[data-net-node]')];
 const bindSettings=()=>{
  const button=panel.querySelector('[data-network-settings]');
  if(button)button.onclick=()=>onSettings?.(fieldLabels(id,selected).map(field=>field.name));
 };
 const selectNode=node=>{
  selected=node;
  buttons.forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.netNode===node.id)));
  panel.innerHTML=inspector(id,node,diagram);bindSettings();onSelect?.(node.id);
 };
 buttons.forEach(button=>{
  const select=()=>{
   if(suppressClick===button.dataset.netNode){suppressClick=null;return;}
   const node=diagram.nodes.find(item=>item.id===button.dataset.netNode);
   if(!node)return;
   selectNode(node);
  };
  button.addEventListener('click',select);
  removers.push(()=>button.removeEventListener('click',select));
 });
 bindSettings();
 // Lightweight roots used by read-only consumers keep inspection only.
 if(typeof visual.addEventListener!=='function')return ()=>{removers.forEach(remove=>remove());const settings=panel.querySelector('[data-network-settings]');if(settings)settings.onclick=null;};
 const canvas=visual.querySelector('.net-canvas'),wires=visual.querySelector('.net-connections'),feedback=visual.querySelector('[data-net-feedback]');
 const announce=message=>{if(feedback)feedback.textContent=message;};
 const listen=(element,event,handler)=>{element?.addEventListener(event,handler);removers.push(()=>element?.removeEventListener(event,handler));};
 const redraw=()=>{
  const width=canvas?.getBoundingClientRect?.().width;
  diagram.unitX=width>0?760/width:1;
  if(wires)wires.innerHTML=diagram.links.map((link,index)=>connection(link,diagram,index)).join('');
  for(const button of buttons){
   const node=diagram.nodes.find(item=>item.id===button.dataset.netNode),wrapper=button.closest('[data-net-device]');
   if(wrapper){wrapper.style.left=`${node.x}%`;wrapper.style.top=`${node.y}%`;}
   button.className=`net-node net-${tone(node.tone)}`;
   button.setAttribute('aria-label',`${node.label}: ${node.status}. Drag to move or select to inspect.`);
   const label=button.querySelector('span');if(label)label.textContent=node.status;
  }
  for(const port of visual.querySelectorAll('[data-net-port]')){
   const cable=diagram.spec.cables.find(item=>item.fromPort===port.dataset.netPort||item.toPort===port.dataset.netPort),connected=!diagram.bench.disconnected.includes(cable.id);
   port.className=`net-port ${connected?'net-ready':'net-blocked'}`;port.setAttribute('aria-pressed',String(port.dataset.netPort===pendingPort));
   const oldLabel=port.getAttribute('aria-label')??'';port.setAttribute('aria-label',oldLabel.replace(/Connected|Unplugged/,connected?'Connected':'Unplugged'));
   const stateLabel=port.querySelector('.sr-only');if(stateLabel)stateLabel.textContent=connected?'Connected':'Unplugged';
  }
 };
 const refresh=bench=>{diagram=visualModel(id,{...saved,networkBench:bench});selected=diagram.nodes.find(node=>node.id===selected.id)??diagram.nodes[0];redraw();panel.innerHTML=inspector(id,selected,diagram);bindSettings();};
 const act=(action,value,focusSelector)=>{
  stopPackets('Plan changed. Send a fresh test packet.');
  const result=applyNetworkBenchAction(id,diagram.bench,action,value);
  pendingPort=null;refresh(result.bench);announce(result.message);
  if(result.changed||(action==='connect'&&result.message.startsWith('Cable connected'))){const returned=onBenchAction?.(action,value),state=returned?.state??returned;if(!returned?.rendered&&state?.networkBench){saved=state;refresh(state.networkBench);}}
  if(focusSelector)root.querySelector(focusSelector)?.focus?.({preventScroll:true});
  return result;
 };
 const click=e=>{
  const port=e.target.closest?.('[data-net-port]');
  if(port&&visual.contains(port)){
   if(!pendingPort){pendingPort=port.dataset.netPort;redraw();const cable=diagram.spec.cables.find(item=>item.fromPort===pendingPort||item.toPort===pendingPort);announce(`${cable.kind==='fiber'?'Fiber':'Ethernet'} cable end selected. Select its matching port to connect.`);}
   else if(pendingPort===port.dataset.netPort){pendingPort=null;redraw();announce('Cable selection cleared.');}
   else act('connect',{fromPort:pendingPort,toPort:port.dataset.netPort},`[data-net-port="${port.dataset.netPort}"]`);
   return;
  }
  const cable=e.target.closest?.('[data-net-wire]');
  if(cable&&visual.contains(cable)){const item=diagram.spec.cables.find(item=>item.id===cable.dataset.netWire);if(item){if(diagram.bench.disconnected.includes(item.id))announce('Select the two matching ports to reconnect this cable.');else act('disconnect',{cableId:item.id});}return;}
  const move=e.target.closest?.('[data-net-move]');
  if(move&&panel.contains(move))act('move',{nodeId:selected.id,x:selected.x+Number(move.dataset.dx),y:selected.y+Number(move.dataset.dy)},`[data-net-move="${move.dataset.netMove}"]`);
  const cableAction=e.target.closest?.('[data-net-cable-action]');
  if(cableAction&&panel.contains(cableAction)){const item=diagram.spec.cables.find(item=>item.id===cableAction.dataset.netCableId);if(item)act(cableAction.dataset.netCableAction,cableAction.dataset.netCableAction==='connect'?{fromPort:item.fromPort,toPort:item.toPort}:{cableId:item.id},`[data-net-cable-id="${item.id}"]`);}
  if(e.target.closest?.('[data-net-reset]'))act('reset-layout',{},'[data-net-reset]');
 };
 listen(visual,'click',click);
 for(const button of buttons){
  listen(button,'pointerdown',event=>{
   if(event.button!==0||event.isPrimary===false||!canvas)return;
   const node=diagram.nodes.find(item=>item.id===button.dataset.netNode);
   drag={pointerId:event.pointerId,nodeId:node.id,startX:event.clientX,startY:event.clientY,x:node.x,y:node.y,moved:false,bench:diagram.bench};
   button.setPointerCapture?.(event.pointerId);
  });
  listen(button,'pointermove',event=>{
   if(!drag||drag.pointerId!==event.pointerId)return;
   const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
   if(!drag.moved&&Math.hypot(dx,dy)<6)return;
   if(!drag.moved)stopPackets('Device moved. Send a test packet when ready.');
   event.preventDefault();drag.moved=true;
   const bounds=canvas.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
   const result=applyNetworkBenchAction(id,drag.bench,'move',{nodeId:drag.nodeId,x:drag.x+dx/bounds.width*100,y:drag.y+dy/bounds.height*100});
   diagram=visualModel(id,{...saved,networkBench:result.bench});redraw();
  });
  listen(button,'pointerup',event=>{
   if(!drag||drag.pointerId!==event.pointerId)return;
   const finished=drag;drag=null;button.releasePointerCapture?.(event.pointerId);
   if(finished.moved){event.preventDefault();suppressClick=finished.nodeId;const point=diagram.bench.positions[finished.nodeId];diagram.bench=finished.bench;act('move',{nodeId:finished.nodeId,...point});}
  });
  listen(button,'pointercancel',()=>{if(drag){const bench=drag.bench;drag=null;refresh(bench);announce('Move canceled.');}});
 }
 redraw();
 if(typeof globalThis.ResizeObserver==='function'&&canvas){const observer=new globalThis.ResizeObserver(()=>redraw());observer.observe(canvas);removers.push(()=>observer.disconnect());}
 stopPackets=mountPacketVisual(root,visual,id,saved,()=>diagram);
 return ()=>{stopPackets();removers.forEach(remove=>remove());const settings=panel.querySelector('[data-network-settings]');if(settings)settings.onclick=null;};
}




export function mountPacketVisual(root,visual,id,saved,getDiagram){
 const send=visual.querySelector('[data-net-send-packet]'),stop=visual.querySelector('[data-net-stop-packet]'),status=visual.querySelector('[data-net-packet-status]'),list=visual.querySelector('[data-net-packet-steps]'),canvas=visual.querySelector('.net-canvas');
 const trace=getPacketTrace(id,saved),doc=visual.ownerDocument;
 if(!send||!stop||!status||!list||!canvas||!trace||!doc?.createElement)return ()=>{};
 const signature=packetTraceSignature(id,saved),previous=packetSnapshots.get(root),automatic=previous?.id===id&&previous.signature!==signature;
 packetSnapshots.set(root,{id,signature});
 let frame=null,marker=null,active=false;
 const clearHighlights=()=>visual.querySelectorAll('.net-packet-travel,.net-packet-return,.net-packet-error').forEach(edge=>edge.classList.remove('net-packet-travel','net-packet-return','net-packet-error'));
 const cancel=message=>{
  if(frame!==null)globalThis.cancelAnimationFrame?.(frame);frame=null;
  marker?.remove();marker=null;clearHighlights();
  if(active&&message)status.textContent=message;
  active=false;stop.hidden=true;
 };
 const point=(cableId,nodeId)=>{
  const diagram=getDiagram(),cable=diagram.spec.cables.find(item=>item.id===cableId);
  return cable?portPoint(diagram,cable,nodeId):{x:50*7.6,y:50*4.8};
 };
 const place=(a,b,progress)=>{if(marker){marker.style.left=`${(a.x+(b.x-a.x)*progress)/760*100}%`;marker.style.top=`${(a.y+(b.y-a.y)*progress)/480*100}%`;}};
 const edgeFor=step=>visual.querySelector(`[data-net-wire="${step.cableId}"]`);
 const finish=()=>{
  active=false;frame=null;stop.hidden=true;
  status.textContent=`${trace.ok?'Success':'Check failed'}: ${trace.message} ${trace.note}`;
  status.dataset.result=trace.ok?'success':'error';
  marker?.classList.toggle('net-packet-failed',!trace.ok);
  marker?.classList.toggle('net-packet-succeeded',trace.ok);
 };
 const run=()=>{
  cancel();status.dataset.result='running';active=true;send.textContent='Replay packet';stop.hidden=false;
  list.replaceChildren();
  for(const step of trace.steps){const item=doc.createElement('li');item.textContent=`${trace.labels[step.from]} → ${trace.labels[step.to]}: ${step.blocked?'stops at unplugged cable':'connected cable'}`;list.append(item);}
  const outcome=doc.createElement('li');outcome.textContent=trace.message;list.append(outcome);
  marker=doc.createElement('span');marker.className='net-packet-marker';marker.setAttribute('aria-hidden','true');marker.textContent='●';canvas.append(marker);
  const reply=trace.ok&&trace.reply?trace.steps.slice().reverse().map(step=>({...step,from:step.to,to:step.from,reply:true})):[];
  const sequence=[...trace.steps,...reply],reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(!sequence.length){finish();return;}
  const last=sequence.at(-1);
  if(reduced||typeof globalThis.requestAnimationFrame!=='function'){
   for(const step of sequence)edgeFor(step)?.classList.add(step.blocked?'net-packet-error':trace.ok?'net-packet-return':'net-packet-travel');
   place(point(last.cableId,last.from),point(last.cableId,last.to),last.blocked ? .5 : 1);finish();
   if(reduced){list.closest('details').open=true;status.textContent+=' Reduced motion: static signal steps shown.';}return;
  }
  let index=0,started=null;
  const tick=time=>{
   if(!active)return;
   if(visual.isConnected===false){cancel();return;}
   const step=sequence[index];
   if(started===null){started=time;clearHighlights();edgeFor(step)?.classList.add(step.blocked?'net-packet-error':step.reply?'net-packet-return':'net-packet-travel');status.textContent=`${step.reply?'Modeled reply':'Sending local signal'}: ${trace.labels[step.from]} → ${trace.labels[step.to]} (${index+1}/${sequence.length}).`;}
   const progress=Math.min(1,(time-started)/430);
   place(point(step.cableId,step.from),point(step.cableId,step.to),progress*(step.blocked ? .5 : 1));
   if(progress===1){index++;started=null;if(index===sequence.length){finish();return;}}
   frame=globalThis.requestAnimationFrame(tick);
  };
  frame=globalThis.requestAnimationFrame(tick);
 };
 const stopClick=()=>{cancel('Signal stopped. Replay the packet to try again.');status.dataset.result='stopped';};
 send.addEventListener('click',run);stop.addEventListener('click',stopClick);
 if(automatic)run();
 return message=>{cancel(message);if(message===undefined){send.removeEventListener('click',run);stop.removeEventListener('click',stopClick);}};
}
