import {NETWORK_DEVICE_TYPES,initialNetworkStudioState,normalizeNetworkStudioState,applyNetworkStudioAction,evaluateNetworkStudio} from './network-studio-model.js?release=20261024-network-studio';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const specFor=type=>NETWORK_DEVICE_TYPES.find(item=>item.id===type);
const titleFor=(state,id)=>state.devices.find(device=>device.id===id)?.label||'Device';
const portKey=(id,port)=>id+':'+port;
const linkedPort=(state,id,port)=>state.links.find(link=>(link.from===id&&link.fromPort===port)||(link.to===id&&link.toPort===port));
const iconFor=type=>({pc:'▣',switch:'↔',router:'⇄',server:'▤','access-point':'⌁',printer:'▧'}[type]||'▣');
export function networkStudioPacketPlan(result) {
  const path=Array.isArray(result?.path)?result.path:[],links=Array.isArray(result?.links)?result.links:[];
  const forward=(Array.isArray(result?.steps)&&result.steps.length?result.steps.filter(step=>step.ok||result.failureKind==='power').map(step=>({linkId:step.linkId,from:step.from,to:step.to,phase:'request',ok:step.ok})):links.slice(0,Math.max(0,path.length-1)).map((linkId,index)=>({linkId,from:path[index],to:path[index+1],phase:'request',ok:true}))).filter(step=>typeof step.linkId==='string');
  return result?.ok?[...forward,...forward.slice().reverse().map(step=>({linkId:step.linkId,from:step.to,to:step.from,phase:'reply'}))]:forward;
}
export function networkStudioWirePath(from,to) {
  if(!from||!to||![from.x,from.y,to.x,to.y].every(Number.isFinite)) return '';
  const bend=Math.max(24,Math.min(80,Math.abs(to.x-from.x)/3));
  return `M ${from.x} ${from.y} C ${from.x} ${from.y+bend}, ${to.x} ${to.y+bend}, ${to.x} ${to.y}`;
}
function deviceMarkup(state,selected,pending) {
  return state.devices.map(device=>{
    const spec=specFor(device.type),ports=Array.from({length:spec.ports},(_,index)=>index);
    return `<div class="ns-device${device.powered?'':' ns-powered-off'}" data-ns-device="${device.id}" style="left:${device.x}%;top:${device.y}%"><button type="button" class="ns-device-face" data-ns-select="${device.id}" data-ns-key="device-${device.id}" aria-pressed="${selected===device.id}" aria-label="${esc(device.label)}. ${device.powered?'Power on':'Power off'}. Drag to move, or use the movement buttons."><span class="ns-icon" aria-hidden="true">${iconFor(device.type)}</span><strong>${esc(device.label)}</strong><small>${esc(spec.label)} · ${device.powered?'On':'Off'}</small></button><div class="ns-ports" aria-label="${esc(device.label)} ports">${ports.map(port=>{
      const link=linkedPort(state,device.id,port),active=pending?.id===device.id&&pending.port===port;
      return `<button type="button" class="ns-port${link?' ns-port-used':''}" data-ns-port="${device.id}" data-ns-port-number="${port}" data-ns-key="port-${device.id}-${port}" aria-pressed="${active}" aria-label="${esc(device.label)} port ${port+1}, ${link?'connected. Select to unplug cable':'free. Select, then choose another free port'}" title="${esc(device.label)} · Port ${port+1}${link?' · Click to unplug':''}">${port+1}<span class="ns-port-dot" aria-hidden="true"></span></button>`;
    }).join('')}</div></div>`;
  }).join('');
}
function resultMarkup(state,result) {
  const path=result.path.map(id=>titleFor(state,id));
  return `<section class="ns-results ns-result-${result.status}" aria-labelledby="ns-results-title"><div class="ns-result-heading"><h2 id="ns-results-title">Live connection check</h2><span class="ns-result-badge">${result.ok?'✓ Connected':result.status==='incomplete'?'Choose two devices':'! Cannot deliver'}</span></div><p class="ns-selected-pair"><b>${esc(titleFor(state,state.source))} → ${esc(titleFor(state,state.target))}</b></p><p data-ns-live-result>${esc(result.message)}</p><ol class="ns-checks">${result.checks.map(check=>`<li class="${check.ok?'ns-check-pass':'ns-check-fail'}"><span aria-hidden="true">${check.ok?'✓':'!'}</span>${esc(check.label)}</li>`).join('')}</ol><div class="ns-route"><b>Packet route</b><ol aria-label="Packet route">${path.length?path.map((label,index)=>`<li><span>${index+1}</span>${esc(label)}</li>`).join(''):'<li>Choose a source and destination.</li>'}</ol></div><p class="ns-simulation-note">This models cables, power, and which devices can forward a packet. It sends no real network traffic.</p></section>`;
}
function inspectorMarkup(state,selected) {
  const device=state.devices.find(item=>item.id===selected);
  if(!device) return '<section class="ns-inspector"><h2>Your device</h2><p>Add or select a device to change it.</p></section>';
  const links=state.links.filter(link=>link.from===device.id||link.to===device.id),spec=specFor(device.type);
  return `<section class="ns-inspector" aria-labelledby="ns-selected-title"><div class="ns-inspector-heading"><h2 id="ns-selected-title">${esc(device.label)}</h2><span>${esc(spec.label)} · ${spec.ports} ${spec.ports===1?'port':'ports'}</span></div><p>${esc(spec.description)}</p><div class="ns-device-actions"><button type="button" data-ns-power="${device.id}" data-ns-key="power-${device.id}" aria-pressed="${device.powered}">Power ${device.powered?'on':'off'}</button><button type="button" data-ns-remove="${device.id}" data-ns-key="remove-${device.id}" class="ns-danger">Remove device</button></div><fieldset class="ns-movement"><legend>Move device</legend><button type="button" data-ns-move="up" data-ns-key="move-${device.id}-up" aria-label="Move ${esc(device.label)} up">↑</button><button type="button" data-ns-move="left" data-ns-key="move-${device.id}-left" aria-label="Move ${esc(device.label)} left">←</button><button type="button" data-ns-move="down" data-ns-key="move-${device.id}-down" aria-label="Move ${esc(device.label)} down">↓</button><button type="button" data-ns-move="right" data-ns-key="move-${device.id}-right" aria-label="Move ${esc(device.label)} right">→</button></fieldset><details class="ns-cable-list"><summary>Cables (${links.length})</summary>${links.length?links.map(link=>`<div><span>${esc(titleFor(state,link.from))} P${link.fromPort+1} ↔ ${esc(titleFor(state,link.to))} P${link.toPort+1}</span><button type="button" data-ns-disconnect="${link.id}" data-ns-key="cable-${link.id}">Unplug</button></div>`).join(''):'<p>No cables. Select two free ports on different devices to connect them.</p>'}</details></section>`;
}
function bodyMarkup(state,selected,pending,options={}) {
  const result=evaluateNetworkStudio(state),devices=state.devices;
  const endpoints=field=>`<label>${field==='source'?'From':'To'}<select data-ns-endpoint="${field}" data-ns-key="${field}"><option value="">Choose device</option>${devices.map(device=>`<option value="${device.id}"${state[field]===device.id?' selected':''}>${esc(device.label)}</option>`).join('')}</select></label>`;
  return `<section class="ns-palette" aria-labelledby="ns-palette-title"><div class="ns-toolbar-heading"><h2 id="ns-palette-title">Add a device</h2><span>${devices.length}/12 devices · ${state.links.length}/24 cables</span></div><div>${NETWORK_DEVICE_TYPES.map(type=>`<button type="button" data-ns-add="${type.id}" data-ns-key="add-${type.id}"${devices.length>=12?' disabled':''}><span aria-hidden="true">${iconFor(type.id)}</span>${esc(type.label)}<small>${type.ports} ${type.ports===1?'port':'ports'}</small></button>`).join('')}</div></section><div class="ns-topbar">${endpoints('source')}${endpoints('target')}<button type="button" class="ns-send" data-ns-run data-ns-key="send">▶ Send packet</button><button type="button" data-ns-pause data-ns-key="pause" disabled>Pause</button><button type="button" data-ns-replay data-ns-key="replay">Replay</button><label class="ns-auto"><input type="checkbox" data-ns-auto${options.auto!==false?' checked':''}> Animate changes</label></div><p class="ns-interaction-help">Drag devices. Select two free ports to connect them. Select a used port or cable to unplug it.</p><p class="ns-action-status" data-ns-message role="status">${esc(options.message||'Select a device or start building.')}</p><div class="ns-layout"><section class="ns-diagram-panel" aria-label="Your network"><div class="ns-viewport" tabindex="0" aria-label="Scrollable network diagram"><div class="ns-canvas" data-ns-canvas><svg class="ns-wires" data-ns-wires aria-label="Network cables"></svg><div class="ns-devices" data-ns-devices>${deviceMarkup(state,selected,pending)}</div><div class="ns-empty"${devices.length?' hidden':''}>Your network starts here.<br>Add a device above.</div></div></div><div class="ns-packet-state"><span class="ns-packet-key" aria-hidden="true"></span><p data-ns-animation-status role="status">${options.reduced?'Reduced motion: follow the numbered packet route below.':'Ready. A dot follows the cables; green means delivery and reply.'}</p></div><details class="ns-help"><summary>Connection tips &amp; keyboard controls</summary><p>PCs, servers, and printers are endpoints. Use switches, routers, or access points to pass packets between devices. A cable needs a free port at each end.</p><p>Tab to a device and press Enter to select it. Use the Move buttons or arrow keys while its device button is focused. Tab to ports and press Enter to connect or unplug.</p><p>Changing the network updates the check immediately. Moving a device only changes the drawing. Work stays here until this page closes.</p></details></section><aside class="ns-sidebar">${inspectorMarkup(state,selected)}${resultMarkup(state,result)}</aside></div><div class="ns-bottom-actions"><button type="button" data-ns-reset="blank" data-ns-key="reset-blank">Clear &amp; start empty</button><button type="button" data-ns-reset="classroom" data-ns-key="reset-classroom">Load classroom network</button><span>This is a teaching model, not a full network emulator.</span></div>`;
}
export function renderNetworkStudio(saved) {
  const state=normalizeNetworkStudioState(saved);
  return `<section class="network-studio" data-network-studio><header class="ns-heading"><div><p class="ns-eyebrow">BUILD · CONNECT · WATCH</p><h1>Network studio</h1><p>Build your own network and watch a packet travel.</p></div><a href="#labs/network">Networking labs →</a></header><div class="ns-body" data-ns-body>${bodyMarkup(state,state.source||state.devices[0]?.id,null)}</div></section>`;
}
export function mountNetworkStudio(root,{getState=()=>null,onChange=()=>{}}={}) {
  const host=root.querySelector('[data-network-studio]'),body=host?.querySelector('[data-ns-body]');
  if(!host||!body) return ()=>{};
  let state=normalizeNetworkStudioState(getState()),selected=state.source||state.devices[0]?.id||null,pending=null,auto=true,disposed=false,animation=null,frame=0,drag=null,ignoreClick=false,resizeObserver=null;
  const win=host.ownerDocument.defaultView,motion=win.matchMedia?.('(prefers-reduced-motion: reduce)'),reduced=()=>motion?.matches===true;
  const listeners=[],wirePaths=new Map(),find=selector=>host.querySelector(selector);
  const listen=(node,event,callback,options)=>{node.addEventListener(event,callback,options);listeners.push(()=>node.removeEventListener(event,callback,options));};
  const announce=text=>{const output=find('[data-ns-message]');if(output) output.textContent=text;};
  const packetMessage=text=>{const output=find('[data-ns-animation-status]');if(output) output.textContent=text;};
  function stopAnimation(message) {
    win.cancelAnimationFrame(frame);frame=0;animation=null;find('[data-ns-packet]')?.remove();find('[data-ns-failure]')?.remove();
    const pause=find('[data-ns-pause]');if(pause){pause.disabled=true;pause.textContent='Pause';}
    for(const node of host.querySelectorAll('.ns-failure-device')) node.classList.remove('ns-failure-device');
    if(message) packetMessage(message);
  }
  function pointFor(id,port) {
    const node=find(`[data-ns-port="${id}"][data-ns-port-number="${port}"]`),canvas=find('[data-ns-canvas]');if(!node||!canvas) return null;
    const rect=node.getBoundingClientRect(),bounds=canvas.getBoundingClientRect();return {x:rect.left-bounds.left+rect.width/2,y:rect.top-bounds.top+rect.height/2};
  }
  function svgElement(name,attributes={}) {
    const element=host.ownerDocument.createElementNS('http://www.w3.org/2000/svg',name);
    for(const [key,value] of Object.entries(attributes)) element.setAttribute(key,String(value));return element;
  }
  function drawWires() {
    const svg=find('[data-ns-wires]'),canvas=find('[data-ns-canvas]');if(!svg||!canvas) return;
    const bounds=canvas.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.replaceChildren();wirePaths.clear();
    const result=evaluateNetworkStudio(state),route=new Set(result.links);
    for(const link of state.links) {
      const path=networkStudioWirePath(pointFor(link.from,link.fromPort),pointFor(link.to,link.toPort));if(!path) continue;
      const group=svgElement('g',{'class':'ns-wire'+(route.has(link.id)?(result.ok?' ns-wire-pass':' ns-wire-error'):'')}),line=svgElement('path',{d:path,'class':'ns-wire-line'}),hit=svgElement('path',{d:path,'class':'ns-wire-hit','data-ns-disconnect':link.id});
      const title=svgElement('title');title.textContent=`Unplug ${titleFor(state,link.from)} port ${link.fromPort+1} to ${titleFor(state,link.to)} port ${link.toPort+1}`;
      hit.append(title);group.append(line,hit);svg.append(group);wirePaths.set(link.id,{element:line,link});
    }
    if(animation) stopAnimation('The drawing changed. Send the packet again.');
  }
  function draw(message='') {
    stopAnimation();resizeObserver?.disconnect();const viewport=find('.ns-viewport'),scrollLeft=viewport?.scrollLeft||0,scrollTop=viewport?.scrollTop||0,key=host.ownerDocument.activeElement?.getAttribute?.('data-ns-key');
    if(!state.devices.some(device=>device.id===selected)) selected=state.devices[0]?.id||null;
    body.innerHTML=bodyMarkup(state,selected,pending,{auto,message,reduced:reduced()});const nextViewport=find('.ns-viewport');if(nextViewport){nextViewport.scrollLeft=scrollLeft;nextViewport.scrollTop=scrollTop;}drawWires();
    const canvas=find('[data-ns-canvas]');
    if(win.ResizeObserver&&canvas) {let first=true;resizeObserver=new win.ResizeObserver(()=>{if(first){first=false;return;}drawWires();});resizeObserver.observe(canvas);}
    if(key) host.querySelector(`[data-ns-key="${key}"]`)?.focus({preventScroll:true});
  }
  function showFailure(result) {
    find(`[data-ns-device="${result.failedAt}"]`)?.classList.add('ns-failure-device');
    const device=find(`[data-ns-device="${result.failedAt}"] .ns-device-face`),canvas=find('[data-ns-canvas]'),svg=find('[data-ns-wires]');
    if(device&&canvas&&svg) {const bounds=device.getBoundingClientRect(),origin=canvas.getBoundingClientRect();svg.append(svgElement('circle',{cx:bounds.left-origin.left+bounds.width/2,cy:bounds.top-origin.top+bounds.height/2,r:30,'class':'ns-failure','data-ns-failure':''}));}
    packetMessage('Delivery failed. '+result.message);
  }
  function startAnimation() {
    stopAnimation();const result=evaluateNetworkStudio(state),plan=networkStudioPacketPlan(result);
    if(reduced()) {if(!result.ok) showFailure(result);packetMessage((result.ok?'Delivered and reply returned. ':'Delivery failed. ')+result.message+' Follow the numbered route. Animation is off for reduced motion.');return;}
    if(!plan.length) {showFailure(result);return;}
    const svg=find('[data-ns-wires]'),dot=svgElement('circle',{r:7,'class':'ns-packet','data-ns-packet':''});svg.append(dot);
    animation={plan,index:0,elapsed:0,last:0,paused:false,dot,result};
    const pause=find('[data-ns-pause]');if(pause) pause.disabled=false;
    function tick(now) {
      if(disposed||!animation||animation.paused) return;
      const current=animation,step=current.plan[current.index],wire=wirePaths.get(step.linkId);if(!wire) {stopAnimation('A cable changed. Send the packet again.');return;}
      if(!current.last) {current.last=now;packetMessage(`${step.phase==='reply'?'Reply':'Request'}: ${titleFor(state,step.from)} → ${titleFor(state,step.to)}`);}
      current.elapsed+=Math.min(80,Math.max(0,now-current.last));current.last=now;
      const distance=wire.element.getTotalLength(),duration=Math.max(450,Math.min(900,distance*2)),progress=Math.min(1,current.elapsed/duration),forward=wire.link.from===step.from,point=wire.element.getPointAtLength(distance*(forward?(step.ok===false?progress*.82:progress):1-(step.ok===false?progress*.82:progress)));
      dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);dot.setAttribute('class','ns-packet'+(step.ok===false?' ns-packet-failure':step.phase==='reply'?' ns-packet-reply':''));
      if(progress>=1) {current.index++;current.elapsed=0;current.last=0;if(current.index>=current.plan.length) {animation=null;frame=0;if(pause){pause.disabled=true;pause.textContent='Pause';}if(result.ok) packetMessage('Delivered. The reply returned to '+titleFor(state,state.source)+'.');else {dot.remove();showFailure(result);}return;}}
      frame=win.requestAnimationFrame(tick);
    }
    animation.tick=tick;frame=win.requestAnimationFrame(tick);
  }
  function act(name,value) {
    stopAnimation();const result=applyNetworkStudioAction(state,name,value);state=result.state;
    if(result.changed) onChange(state);
    if(name==='add-device'&&result.changed) selected=state.devices.at(-1)?.id||selected;
    pending=null;draw(result.message);
    if(name==='run'||((result.topologyChanged||result.kind==='endpoint')&&auto)) startAnimation();
    return result;
  }
  function portClick(id,port) {
    const link=linkedPort(state,id,port);
    if(link) {act('disconnect',{id:link.id});return;}
    if(!pending) {pending={id,port};draw('Now choose a free port on another device.');return;}
    if(pending.id===id&&pending.port===port) {pending=null;draw('Cable selection cleared.');return;}
    if(pending.id===id) {announce('Choose a port on a different device.');return;}
    act('connect',{from:pending.id,fromPort:pending.port,to:id,toPort:port});
  }
  function moveSelected(direction,id=selected) {
    const device=state.devices.find(item=>item.id===id);if(!device) return;
    const delta={left:[-5,0],right:[5,0],up:[0,-5],down:[0,5]}[direction];if(!delta) return;
    selected=id;act('move-device',{id,x:device.x+delta[0],y:device.y+delta[1]});
  }
  listen(host,'click',event=>{
    if(ignoreClick){ignoreClick=false;return;}
    const node=event.target.closest?.('button,[data-ns-disconnect]');if(!node||!host.contains(node)) return;
    if(node.hasAttribute('data-ns-add')) {act('add-device',{type:node.dataset.nsAdd});return;}
    if(node.hasAttribute('data-ns-select')) {selected=node.dataset.nsSelect;pending=null;draw('Selected '+titleFor(state,selected)+'.');return;}
    if(node.hasAttribute('data-ns-port')) {portClick(node.dataset.nsPort,Number(node.dataset.nsPortNumber));return;}
    if(node.hasAttribute('data-ns-disconnect')) {act('disconnect',{id:node.dataset.nsDisconnect});return;}
    if(node.hasAttribute('data-ns-remove')) {act('remove-device',{id:node.dataset.nsRemove});find('[data-ns-add]')?.focus({preventScroll:true});return;}
    if(node.hasAttribute('data-ns-power')) {const device=state.devices.find(item=>item.id===node.dataset.nsPower);if(device) act('power-device',{id:device.id,powered:!device.powered});return;}
    if(node.hasAttribute('data-ns-move')) {moveSelected(node.dataset.nsMove);return;}
    if(node.hasAttribute('data-ns-run')) {act('run');return;}
    if(node.hasAttribute('data-ns-replay')) {startAnimation();return;}
    if(node.hasAttribute('data-ns-pause')&&animation) {animation.paused=!animation.paused;node.textContent=animation.paused?'Resume':'Pause';if(animation.paused) {win.cancelAnimationFrame(frame);frame=0;packetMessage('Packet paused. Choose Resume or Replay.');}else {animation.last=0;frame=win.requestAnimationFrame(animation.tick);}return;}
    if(node.hasAttribute('data-ns-reset')) {selected=null;act('reset',{template:node.dataset.nsReset});}
  });
  listen(host,'change',event=>{
    if(event.target.hasAttribute('data-ns-endpoint')) act(event.target.dataset.nsEndpoint==='source'?'select-source':'select-target',{id:event.target.value});
    if(event.target.hasAttribute('data-ns-auto')) {auto=event.target.checked;announce(auto?'Network changes will animate.':'Automatic animation off. Use Send packet or Replay.');}
  });
  listen(host,'keydown',event=>{
    if(event.key==='Escape') {pending=null;stopAnimation('Packet stopped.');draw('Cable selection cleared.');return;}
    const node=event.target.closest?.('[data-ns-select]'),direction={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[event.key];
    if(node&&direction) {event.preventDefault();moveSelected(direction,node.dataset.nsSelect);}
  });
  listen(host,'pointerdown',event=>{
    const face=event.target.closest?.('[data-ns-select]');if(!face||event.button!==0) return;
    const device=state.devices.find(item=>item.id===face.dataset.nsSelect),canvas=find('[data-ns-canvas]');if(!device||!canvas) return;
    drag={id:device.id,face,startX:event.clientX,startY:event.clientY,x:device.x,y:device.y,moved:false,bounds:canvas.getBoundingClientRect()};
    face.setPointerCapture?.(event.pointerId);
  });
  listen(host,'pointermove',event=>{
    if(!drag) return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(!drag.moved&&Math.hypot(dx,dy)<6) return;
    if(!drag.moved) {stopAnimation('Moving device. Send the packet again when ready.');drag.moved=true;}
    const node=find(`[data-ns-device="${drag.id}"]`),x=Math.max(12,Math.min(88,drag.x+dx/drag.bounds.width*100)),y=Math.max(18,Math.min(82,drag.y+dy/drag.bounds.height*100));
    node.style.left=x+'%';node.style.top=y+'%';drag.next={x,y};drawWires();
  });
  listen(host,'pointerup',event=>{
    if(!drag) return;const current=drag;drag=null;current.face.releasePointerCapture?.(event.pointerId);
    if(current.moved) {ignoreClick=true;win.setTimeout(()=>{ignoreClick=false;},0);selected=current.id;act('move-device',{id:current.id,...current.next});}
  });
  listen(host,'pointercancel',()=>{if(drag){drag=null;draw('Move cancelled.');}});
  const motionChanged=()=>{stopAnimation('Motion preference changed. Send the packet again.');draw('Motion preference updated.');};
  if(motion?.addEventListener) listen(motion,'change',motionChanged);
  draw();
  return ()=>{disposed=true;stopAnimation();resizeObserver?.disconnect();for(const remove of listeners) remove();drag=null;pending=null;wirePaths.clear();};
}
