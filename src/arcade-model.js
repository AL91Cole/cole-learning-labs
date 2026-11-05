import {ARCADE_LEVELS,PARTS,HARDWARE_SLOTS} from './arcade-levels.js?release=20261105-receipt-review';
export const ROVER_COMMANDS=Object.freeze({N:'↑ Up (north)',E:'→ Right (east)',S:'↓ Down (south)',W:'← Left (west)',E2:'→ → Repeat right ×2 (east)',S2:'↓ ↓ Repeat down ×2 (south)',IF:'If right is blocked: down; otherwise right'});
export const arcadeLevel=id=>typeof id==='string'&&Object.hasOwn(ARCADE_LEVELS,id)?ARCADE_LEVELS[id]:null;
export const arcadePart=id=>PARTS.find(part=>part.id===id)||null;
export function initialArcadeState(id){
  const level=arcadeLevel(id);if(!level)return null;
  return {id,turns:0,rotations:level.kind==='network'?level.tiles.map((_,i)=>i%3===0?1:0):[],slots:Object.fromEntries(HARDWARE_SLOTS.map(([slot])=>[slot,null])),selected:null,plugged:false,powered:false,rules:{service:true,identity:false,scope:false,override:true},assignments:{},program:[...(level.starter||[])],fixture:0,frame:0,result:null};
}
const row=(label,ok)=>({label,ok:ok===true});
const finish=(rows,detail={})=>({ok:rows.length>0&&rows.every(r=>r.ok),rows,...detail});
export function rotatedPorts(base,turns){const n=Number.isInteger(turns)&&turns>=0&&turns<4?turns:0;return ((base<<n)|(base>>(4-n)))&15;}
function routeResult(level,state){
  const ports=level.tiles.map((tile,i)=>rotatedPorts(tile,state.rotations?.[i])),seen=new Set(),queue=[];
  if(ports[level.start]&8)queue.push({at:level.start,path:[level.start],via:level.via.includes(level.start)?1:0});
  const reached=new Set();let path=null;
  for(let cursor=0;cursor<queue.length&&cursor<64;cursor++){
    const current=queue[cursor],key=current.at+':'+current.via;if(seen.has(key))continue;seen.add(key);reached.add(current.at);
    if(current.at===level.end&&(ports[current.at]&2)&&(!level.via.length||current.via))path??=current.path;
    const x=current.at%4,y=Math.floor(current.at/4);
    for(const [direction,next,inside]of [[0,current.at-4,y>0],[1,current.at+1,x<3],[2,current.at+4,y<3],[3,current.at-1,x>0]]){
      if(!inside||level.blocked.includes(next)||!(ports[current.at]&(1<<direction))||!(ports[next]&(1<<((direction+2)%4))))continue;
      const via=current.via||level.via.includes(next)?1:0;
      if(!seen.has(next+':'+via))queue.push({at:next,path:[...current.path,next],via});
    }
  }
  return finish([row('Continuous path from the source to the destination',!!path),...(level.via.length?[row('Required gateway is on the delivery route',!!path)]:[]),...(level.avoid.length?[row('The staff zone is unreachable from the guest source',level.avoid.every(i=>!reached.has(i)))]:[]),...(level.maxHops<16?[row('The working route fits the hop allowance',!!path&&path.length-1<=level.maxHops)]:[])],{path:path||[],reached:[...reached],hops:path?path.length-1:null});
}
export function buildStats(state){
  const selected=HARDWARE_SLOTS.map(([slot])=>arcadePart(state.slots?.[slot])).filter(Boolean),part=slot=>selected.find(p=>p.slot===slot);
  return {cost:selected.reduce((sum,p)=>sum+p.cost,0),watts:25+selected.reduce((sum,p)=>sum+p.watts,0),count:selected.length,cpu:part('cpu'),ram:part('ram'),drive:part('drive'),cooler:part('cooler'),psu:part('psu'),gpu:part('gpu')};
}
function hardwareResult(level,state){
  const s=buildStats(state);
  return finish([row('All six required parts are fitted to their matching slots',s.count===6&&HARDWARE_SLOTS.every(([slot])=>arcadePart(state.slots?.[slot])?.slot===slot)),row('Virtual power is connected and switched on',state.plugged===true&&state.powered===true),row('The build fits the token budget',s.cost<=level.budget),row('Memory has the right capacity and DDR4 compatibility',!!s.ram&&s.ram.ddr===4&&s.ram.gb>=level.ram),row('Power supply covers the modeled load',!!s.psu&&s.psu.capacity>=s.watts),row('Cooling covers modeled heat within the noise limit',!!s.cpu&&!!s.cooler&&s.cooler.cooling>=s.cpu.heat&&s.cooler.noise<=level.maxNoise),row('The supplied HDMI connection matches the display output',s.gpu?.output==='HDMI'),row('The graphics requirement is met',!level.dedicated||s.gpu?.dedicated===true),row('Original project files are preserved when required',!level.keepFiles||s.drive?.files===true)],{stats:{cost:s.cost,watts:s.watts}});
}
function securityResult(level,state){
  const rules=state.rules||{},traffic=level.requests.map(request=>{
    const allowed=rules.service===true&&(rules.override===true||(['identity','scope'].every(key=>rules[key]!==true||request.passes.includes(key))));
    return {name:request.name,allowed,expected:request.expected};
  });
  return finish(traffic.map(item=>row(item.name+' · '+(item.allowed?'admitted':'held at gate'),item.allowed===item.expected)),{traffic});
}
function sortResult(level,state){return finish(level.cards.map(card=>row(card.title+' → '+(level.bins.find(([id])=>id===state.assignments?.[card.id])?.[1]||'not placed'),state.assignments?.[card.id]===card.bin)));}
function roverRun(level,program,fixture){
  if(!Array.isArray(program)||program.length<1||program.length>level.maxInstructions||program.some(command=>!Object.hasOwn(ROVER_COMMANDS,command)||!level.commands.includes(command)))return {ok:false,position:fixture.start,collected:[],moves:0,trace:[fixture.start],message:'Use this mission’s instruction blocks within the limit.'};
  let position=fixture.start,moves=0,stopped=false,message='Program ended.';const trace=[position],collected=new Set();
  if(fixture.stars.includes(position))collected.add(position);
  function neighbor(from,direction){const x=from%5,y=Math.floor(from/5);return direction==='N'?(y?from-5:null):direction==='S'?(y<4?from+5:null):direction==='E'?(x<4?from+1:null):(x?from-1:null);}
  function move(direction){
    if(stopped)return;const next=neighbor(position,direction);moves++;
    if(moves>level.maxMoves){stopped=true;message='Energy allowance used up.';return;}
    if(next===null||fixture.blocks.includes(next)){stopped=true;message='A wall stopped the rover. Change the instructions.';return;}
    position=next;trace.push(position);if(fixture.stars.includes(position))collected.add(position);
  }
  for(const command of program){
    if(stopped)break;
    if(command==='E2'||command==='S2'){move(command[0]);move(command[0]);}
    else if(command==='IF'){const east=neighbor(position,'E');move(east===null||fixture.blocks.includes(east)?'S':'E');}
    else move(command);
  }
  const ok=!stopped&&position===fixture.end&&collected.size===fixture.stars.length;
  if(!stopped&&!ok)message=collected.size<fixture.stars.length?'Collected '+collected.size+' of '+fixture.stars.length+' cargo. Check which cargo squares your route missed.':'All cargo collected. Add a route from the current square to home.';
  return {ok,position,collected:[...collected],moves,trace,message:ok?'All cargo collected and home reached.':message};
}
export function evaluateArcade(id,state){
  const level=arcadeLevel(id);if(!level||!state||state.id!==id)return finish([row('Open an authored game',false)]);
  if(level.kind==='network')return routeResult(level,state);
  if(level.kind==='hardware')return hardwareResult(level,state);
  if(level.kind==='security')return securityResult(level,state);
  if(level.kind==='ai')return sortResult(level,state);
  const runs=level.fixtures.map(f=>roverRun(level,state.program,f));
  return finish(runs.map((run,index)=>row('Room '+(index+1)+': '+run.message,run.ok)),{runs});
}
function retryMessage(level,result){
  if(level.kind==='coding')return 'Try another plan. '+(result.runs?.find(run=>!run.ok)?.message||'Compare the instructions with the board.');
  const failed=result.rows.find(item=>!item.ok)?.label||'Review the mission goal';
  const hint=level.kind==='network'?(result.path.length?'Compare the gateway, staff-zone and hop checks.':'Start at the left edge of Source. Check that both ends of each neighboring link meet.'):level.kind==='hardware'?'Read the part labels and compare them with the failed check. Power off and unplug before changing parts.':level.kind==='security'?'Compare admitted couriers with the allowed task. The bypass admits every request.':'Use the printed fact and the mission rule. You can move a card to another basket.';
  return 'Try another plan. Check: '+failed+'. '+hint;
}
/** Only the authored controls below can change this local game. There is no text/code interpreter. */
export function arcadeAction(id,state,action,value){
  const level=arcadeLevel(id);if(!level||!state||state.id!==id)return {state:initialArcadeState(id),message:'Choose an available game.',changed:false};
  if(action==='reset')return {state:initialArcadeState(id),message:'Fresh game. Try a different plan.',changed:true};
  const unchanged=message=>({state,message:message||'Use a control in this game.',changed:false});
  if(state.turns>=120)return unchanged('Move limit reached. Start a fresh game to keep exploring.');
  let next={...state,turns:state.turns+1,result:null,frame:0},message='Setup changed. Launch a fresh test.';
  if(action==='run'){next.result=evaluateArcade(id,state);if(level.kind==='coding')next.frame=next.result.runs?.[state.fixture]?.trace.length-1||0;message=next.result.ok?'Mission complete. Your setup met every goal. Read what made it work.':retryMessage(level,next.result);}
  else if(action==='rotate'&&level.kind==='network'&&Number.isInteger(value)&&value>=0&&value<16&&!level.blocked.includes(value)){next.rotations=[...state.rotations];next.rotations[value]=(next.rotations[value]+1)%4;const ports=rotatedPorts(level.tiles[value],next.rotations[value]);message='Setup changed. Tile '+(value+1)+' now connects '+['top','right','bottom','left'].filter((_,i)=>ports&(1<<i)).join(' and ')+'. Send a packet to test the route.';}
  else if(action==='select-part'&&level.kind==='hardware'&&arcadePart(value)){next.selected=value;next.result=state.result;message='Part selected: '+arcadePart(value).name+'. Choose its matching slot in the virtual case.';}
  else if(action==='fit'&&level.kind==='hardware'&&HARDWARE_SLOTS.some(([slot])=>slot===value)){
    if(state.powered||state.plugged)return unchanged('Turn virtual power off and disconnect it before changing parts.');
    const part=arcadePart(state.selected);if(!part||part.slot!==value)return unchanged('Choose a part that fits this slot.');next.slots={...state.slots,[value]:part.id};next.selected=null;message='Fitted '+part.name+'. '+Object.values(next.slots).filter(Boolean).length+' of 6 parts fitted. Choose another part, or connect power and test when your build is ready.';
  }
  else if(action==='plug'&&level.kind==='hardware'){if(state.powered)return unchanged('Switch virtual power off before disconnecting it.');next.plugged=!state.plugged;}
  else if(action==='power'&&level.kind==='hardware'){if(!state.plugged)return unchanged('Connect virtual power before switching on.');next.powered=!state.powered;}
  else if(action==='gate'&&level.kind==='security'&&['service','identity','scope','override'].includes(value)){next.rules={...state.rules,[value]:!state.rules[value]};message=(value==='override'?'Emergency bypass':value[0].toUpperCase()+value.slice(1)+' check')+' is now '+(next.rules[value]?'on':'off')+'. Dispatch the couriers to see who can pass.';}
  else if(action==='select-card'&&level.kind==='ai'&&level.cards.some(card=>card.id===value)){next.selected=value;next.result=state.result;message='Card selected: '+level.cards.find(card=>card.id===value).title+'. Choose a destination basket.';}
  else if(action==='basket'&&level.kind==='ai'&&level.bins.some(([bin])=>bin===value)&&level.cards.some(card=>card.id===state.selected)){next.assignments={...state.assignments,[state.selected]:value};next.selected=null;message='Card placed in '+level.bins.find(([bin])=>bin===value)[1]+'. '+Object.keys(next.assignments).length+' of '+level.cards.length+' cards placed. Test the mission when you are ready.';}
  else if(action==='append'&&level.kind==='coding'&&typeof value==='string'&&Object.hasOwn(ROVER_COMMANDS,value)&&level.commands.includes(value)){if(state.program.length>=level.maxInstructions)return unchanged('Instruction limit reached. Remove a block before adding one.');next.program=[...state.program,value];message='Step '+next.program.length+' added: '+ROVER_COMMANDS[value]+'. Run the rover to see the route, or add another block.';}
  else if(action==='remove'&&level.kind==='coding'&&Number.isInteger(value)&&value>=0&&value<state.program.length){next.program=state.program.filter((_,i)=>i!==value);message='Step '+(value+1)+' removed. Run the revised program to test your new route.';}
  else if(action==='clear'&&level.kind==='coding'){next.program=[];}
  else if(action==='room'&&level.kind==='coding'&&Number.isInteger(value)&&value>=0&&value<level.fixtures.length){next.fixture=value;next.result=state.result;next.frame=state.result?.runs?.[value]?.trace.length-1||0;message='Showing room '+(value+1)+'. Your program stays the same.';}
  else if(action==='step'&&level.kind==='coding'&&state.result?.runs){next.result=state.result;const trace=state.result.runs[state.fixture].trace;next.frame=(state.frame+1)%trace.length;message='Showing trace move '+next.frame+'. This does not change the computed result.';}
  else return unchanged();
  return {state:next,message,changed:true};
}
