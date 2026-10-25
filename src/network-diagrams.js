import {NETWORK_CONFIG} from './network-labs.js?release=20261025-hands-on';

// These diagrams describe saved choices and supplied evidence, never a test run.
const code=id=>typeof id==='string'?id.replaceAll('-','').toUpperCase():'';
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const node=(id,label,kind,detail,status,tone,fields,x,y)=>({id,label,kind,detail,status,tone,fields,x,y});
const link=(from,to,label,status,tone='neutral')=>({from,to,label,status,tone});
const diagram=(title,summary,nodes,links)=>({title,summary,nodes,links});
const models={};

export function getNetworkDiagram(id,saved={}) {
 const config=NETWORK_CONFIG[code(id)],model=models[code(id)];
 if(!config||!model)return null;
 const source=record(saved)?saved:{};
 const state=Object.fromEntries(config.fields.map(field=>[field.name,Object.hasOwn(source,field.name)&&field.options.some(([value])=>value===source[field.name])?source[field.name]:field.initial]));
 const label=name=>config.fields.find(field=>field.name===name)?.options.find(([value])=>value===state[name])?.[1]??'';
 return model(state,label);
}

models.NET207=(s,label)=>diagram('Follow the message path',
 `Saved file transport: ${s.fileTransport.toUpperCase()}; voice: ${s.callTransport.toUpperCase()}. The fixed packet cards remain HTTPS/TCP and RTP/UDP. Labels do not prove delivery.`,[
 node('file','File application','application',`HTTPS file card, port 443. Saved: ${label('fileTransport')}. ${s.fileTransport==='tcp'?'TCP supplies ordered reliable bytes.':'UDP alone does not provide ordered reliable bytes.'}`,s.fileTransport==='tcp'?'Matches file card':'Transport mismatch',s.fileTransport==='tcp'?'ready':'warning',['fileTransport'],12,25),
 node('voice','Voice application','phone',`RTP audio card, port 5004. Saved: ${label('callTransport')}. This supplied voice example uses UDP.`,s.callTransport==='udp'?'Matches voice card':'Transport mismatch',s.callTransport==='udp'?'ready':'warning',['callTransport'],12,75),
 node('transport','Transport','layers',`Saved jobs: ${label('layerMap')}. Actual transport job: end-to-end delivery; OSI 4.`,s.layerMap==='matched'?'Layer jobs matched':'Layer labels swapped',s.layerMap==='matched'?'ready':'warning',['layerMap','fileTransport','callTransport'],37,25),
 node('ip','IP routing','router','IP routes between networks: OSI 3; TCP/IP internet layer. Label choices do not change this job.','Routing job','neutral',['layerMap'],63,25),
 node('ethernet','Ethernet link','switch','Frames travel on the local link: OSI 1–2; TCP/IP link layer.','Local-link job','neutral',['layerMap'],88,25),
 node('addresses','Address cards','evidence',`192.0.2.24 is IPv4; 2001:db8::24 is IPv6. Saved labels: ${label('addressPair')}. Documentation addresses only.`,s.addressPair==='matched'?'Families matched':'Families reversed',s.addressPair==='matched'?'ready':'warning',['addressPair'],63,75)
 ],[
 link('file','transport',`${s.fileTransport.toUpperCase()} selected`,s.fileTransport==='tcp'?'Matches supplied TCP':'Differs from supplied TCP',s.fileTransport==='tcp'?'ready':'warning'),
 link('voice','transport',`${s.callTransport.toUpperCase()} selected`,s.callTransport==='udp'?'Matches supplied UDP':'Differs from supplied UDP',s.callTransport==='udp'?'ready':'warning'),
 link('transport','ip','End-to-end → routing','Fixed layer sequence'),
 link('ip','ethernet','Routing → local frame','Fixed layer sequence'),
 link('addresses','ip','IPv4 / IPv6','Documentation labels')
 ]);

models.NET208=(s,label)=>{
 const switching=s.localDevice==='switch',independent=s.topology==='star',routed=s.boundary==='router',building=s.media==='matched';
 const deskStatus=!switching?'Splitter cannot switch frames':s.media==='desk-fiber-only'?'Desk fiber lacks supplied approval':'Local frame switching available';
 const deskTone=switching?(independent&&s.media!=='desk-fiber-only'?'ready':'warning'):'blocked';
 const nodes=[
 node('pc04','PC-04','computer',`${label('topology')}. Desk run: 20 m; ${s.media==='desk-fiber-only'?'fiber selected instead of approved copper':'approved copper is within its 100 m limit'}.`,independent?'Independent desk run':'Other PCs depend on this PC',independent?'ready':'warning',['topology','media'],12,25),
 node('pc05','Neighboring PCs','computer',independent?'Each of the 12 PCs has its own cabinet run.':'Downstream PCs depend on PC-04 forwarding; disconnecting it breaks their selected path.',independent?'Separate runs':'Dependent chain',independent?'ready':'warning',['topology'],12,75),
 node('cabinet','Central cabinet','switch',label('localDevice'),switching?'Ethernet switch selected':'Passive splitter selected',switching?'ready':'blocked',['localDevice'],37,50),
 node('router','School boundary','router',routed?'Approved router forwards IP between networks.':'A local switch cannot provide this routed boundary.',routed?'Router selected':'Routed boundary missing',routed?'ready':'blocked',['boundary'],63,50),
 node('building','Other building','building',`Building link: 180 m. ${s.media==='matched'?'Approved fiber modules cover this run.':s.media==='all-copper'?'Copper exceeds the approved 100 m channel limit.':'No building uplink is included.'}`,building?'Suitable fiber selected':s.media==='all-copper'?'Copper run too long':'Building uplink missing',building?'ready':'blocked',['media'],88,50)
 ];
 const links=[link('pc04',independent?'cabinet':'pc05',independent?'20 m desk run':'PC forwarding chain',deskStatus,deskTone),link('pc05','cabinet',independent?'Separate desk run':'Dependent cabinet path',deskStatus,deskTone),link('cabinet','router','Other-network boundary',routed&&switching?'Routed connection planned':!switching?'No local frame switching':'Router missing',routed&&switching?'ready':'blocked'),link('router','building',s.media==='all-copper'?'180 m copper':s.media==='matched'?'180 m fiber':'No building cable',building&&routed&&switching?'Building path planned':!building?'Building link unavailable':'Upstream path incomplete',building&&routed&&switching?'ready':'blocked')];
 return diagram('Connect the classroom',`Desks and the 180 m building link have separate media limits. ${independent?'PCs have separate runs.':'PCs currently depend on a chain.'} This is an installation plan.`,nodes,links);
};

models.NET209=(s,label)=>{
 const size=2**(32-Number(s.subnet.slice(1))),start=Math.floor(64/size)*size,end=start+size-1;
 const host=Number(s.host.split('.').at(-1)),gateway=Number(s.gateway.split('.').at(-1));
 const usable=value=>value>start&&value<end;
 const duplicate=host===gateway,local=usable(host)&&usable(gateway)&&!duplicate,adjacent=s.edge==='school-edge';
 const addressStatus=(value,reserved)=>duplicate?'Duplicate IP address':!usable(value)?'Not a usable address':value===reserved?'Reserved address selected':'Usable, but not reserved';
 const addressTone=(value,reserved)=>duplicate||!usable(value)?'blocked':value===reserved?'ready':'warning';
 return diagram('Inspect the local and routed paths',`Selected block: 10.40.8.${start}${s.subnet}, ${size-2} usable hosts. Local IP path ${local?'has usable addresses':'has an address problem'}; OSPF adjacency ${adjacent?'matches area 0':'has an area mismatch'}. These are separate checks.`,[
 node('pc','PC-07','computer',`${s.host}${s.subnet}. Reserved: 10.40.8.70. The room allocation remains .64-.127; in its /26, .64 is network and .127 is broadcast.`,addressStatus(host,70),addressTone(host,70),['host','subnet'],12,25),
 node('gateway','Classroom gateway','router',`${s.gateway}; reserved 10.40.8.65. Usable selected range: 10.40.8.${start+1}-.${end-1}.`,addressStatus(gateway,65),addressTone(gateway,65),['gateway','subnet'],37,25),
 node('edge','Classroom OSPF','router',`${label('edge')}. ${adjacent?'Both sides use area 0; school route can be learned.':'Classroom area 1 differs from school area 0; no adjacency or learned school route.'}`,adjacent?'Area 0 adjacency modeled':'Area mismatch',adjacent?'ready':'blocked',['edge'],63,25),
 node('school','School neighbor','router','School OSPF area 0. Other supplied neighbor settings match. This neighbor state is independent of PC addressing.',adjacent?'School route learned':'School route not learned',adjacent?'ready':'blocked',['edge'],88,25),
 node('allocation','Room allocation','plan',`Owns 10.40.8.64-.127; needs 50 hosts. Saved ${s.subnet}: ${size-2} usable hosts. ${s.subnet==='/27'?'Only 30 hosts; demand does not fit.':s.subnet==='/24'?'Includes addresses assigned to other rooms.':'62 hosts fit within the owned block.'}`,s.subnet==='/26'?'Fits demand and allocation':s.subnet==='/27'?'Too few host addresses':'Overlaps other rooms',s.subnet==='/26'?'ready':'warning',['subnet'],25,75),
 node('remote','School / internet path','network',`${s.edge==='room-nat'?'Room NAT selected while the area mismatch remains. NAT does not repair that mismatch.':'Approved private IPv4 NAT belongs at the internet edge only.'} IPv6 2001:db8:40:8::70 keeps its own approved route. NAT is not a firewall.`,adjacent?'Boundary plan matches':'Boundary needs review',adjacent?'ready':'warning',['edge'],75,75)
 ],[
 link('pc','gateway','Selected local subnet',local?'Usable local IP path':duplicate?'Duplicate IP address':'Local addressing prevents path',local?'ready':'blocked'),
 link('gateway','edge','Classroom boundary',local?'Local next hop available':'Local next hop unavailable',local?'ready':'blocked'),
 link('edge','school','OSPF area 0 peer',adjacent?'Adjacency modeled up':'Adjacency down',adjacent?'ready':'blocked'),
 link('school','remote','Advertised school route',adjacent?'Route available at boundary':'No learned route',adjacent?'ready':'blocked')
 ]);
};

models.NET210=(s,label)=>{
 const guest=s.access==='30',carried=s.trunk!=='10',reaches=guest&&carried;
 const loop=s.redundancy==='both-forward',spare=s.redundancy!=='disconnect';
 const portal=reaches&&s.guestPolicy!=='deny-all';
 const staffStatus=!guest?'Endpoint shares staff VLAN':!carried?'Guest cannot reach gateway':s.guestPolicy==='allow-staff'?'Guest access allowed':'Guest access denied';
 const staffTone=!guest?'warning':!carried?'neutral':s.guestPolicy==='allow-staff'?'warning':'ready';
 return diagram('Separate guests and keep a backup',`Access VLAN ${s.access}; trunk ${s.trunk}. ${loop?'Both uplinks forward: loop risk.':spare?'Spanning tree retains one forwarding and one alternate path.':'The spare uplink is disconnected.'} Routed guest rules apply only after guests reach the gateway.`,[
 node('guest','Guest endpoint','computer',`Port 8 enters VLAN ${s.access}. ${guest?'Guest VLAN 30 is separate from staff VLAN 10.':'This endpoint joins staff VLAN 10; a routed guest rule cannot separate it here.'}`,guest?'Guest VLAN selected':'Joined staff VLAN',guest?'ready':'warning',['access'],12,25),
 node('switch','Guest switch','switch',`Trunk: ${label('trunk')}. ${carried?'VLAN 30 is carried.':'VLAN 30 is absent.'} ${s.trunk==='all'?'Every VLAN also allows unrequested traffic groups.':''}`,s.trunk==='10,30'?'Exact VLAN allowlist':s.trunk==='10'?'Guest VLAN missing':'Overbroad VLAN allowlist',s.trunk==='10,30'?'ready':s.trunk==='10'?'blocked':'warning',['access','trunk'],37,25),
 node('core','Core / gateway','router',`${label('guestPolicy')}. VLANs alone do not enforce routed access.`,s.guestPolicy==='approved'?'Required policy selected':s.guestPolicy==='deny-all'?'Required services also denied':'Guest-to-staff allowed',s.guestPolicy==='approved'?'ready':'warning',['guestPolicy'],63,25),
 node('portal','Listed guest services','server','Listed DNS, learning portal, internet services, and return traffic.',portal?'Allowed by modeled path':!guest?'Guest policy does not apply':!carried?'No guest path to gateway':'Denied by selected rule',portal?'ready':!guest?'neutral':'blocked',['guestPolicy'],88,25),
 node('backup','Backup uplink','switch',label('redundancy'),loop?'Forwarding: loop risk':spare?'Alternate / discarding':'Disconnected',loop?'warning':spare?'ready':'blocked',['redundancy'],50,75),
 node('staff','Staff devices','computer','Staff VLAN 10. A denied guest path is an intended boundary when the guest endpoint and trunk are correct.',staffStatus,staffTone,['access','guestPolicy'],88,75)
 ],[
 link('guest','switch',`Access VLAN ${s.access}`,guest?'Guest segment':'Shared staff segment',guest?'ready':'warning'),
 link('switch','core',`Primary trunk: ${s.trunk}`,loop?'Forwarding; loop risk':guest&&!carried?'Guest VLAN not carried':'Forwarding',loop?'warning':guest&&!carried?'blocked':s.trunk==='all'?'warning':'ready'),
 link('switch','backup','Second cabled uplink',loop?'Forwarding; loop risk':spare?'Alternate / discarding':'Disconnected',loop?'warning':spare?'ready':'blocked'),
 link('backup','core','Spare path',loop?'Loop path':spare?'Standby, not forwarding':'No backup',loop?'warning':spare?'ready':'blocked'),
 link('core','portal','Guest services',portal?'Allowed in model':!guest?'Guest policy not applied':!carried?'Guest path unavailable':'Denied by rule',portal?'ready':!guest?'neutral':'blocked'),
 link('core','staff','Guest-to-staff boundary',staffStatus,staffTone)
 ]);
};

models.NET211=(s,label)=>{
 const https=s.firewall!=='deny-all',ssh=s.firewall==='all';
 return diagram('Inspect each security layer',`Selected rule ${https?'allows':'denies'} classroom TCP 443 and ${ssh?'allows':'denies'} unapproved TCP 22. The IDS remains alert-only. Historical F-19 is evidence of a past firewall block; viewing it does not test the saved rule.`,[
 node('classroom','Classroom PC','computer','Source network 10.40.8.64/26. Required destination: portal 192.0.2.20, TCP 443.','Approved source range','neutral',['firewall'],12,25),
 node('signin','Portal sign-in','identity',label('authentication'),s.authentication==='individual'?'Individual sign-in + second factor':s.authentication==='shared'?'Shared sign-in lacks policy':'Sign-in removed',s.authentication==='individual'?'ready':'warning',['authentication'],37,25),
 node('firewall','Firewall','firewall',`${label('firewall')}. Classroom HTTPS ${https?'allowed':'denied'}; unapproved SSH ${ssh?'allowed':'denied'}.`,s.firewall==='https-classroom'?'Minimum rule selected':s.firewall==='all'?'Overbroad access':'Required HTTPS denied',s.firewall==='https-classroom'?'ready':s.firewall==='all'?'warning':'blocked',['firewall'],63,25),
 node('portal','Learning portal','server',`192.0.2.20. ${https?'The selected network rule allows required HTTPS.':'The selected network rule denies required HTTPS.'} Authentication is a separate layer.`,https?'HTTPS allowed by rule':'HTTPS blocked by rule',https?'ready':'blocked',['authentication','firewall'],88,25),
 node('ids','IDS A-19','sensor',`Supplied sensor only alerts. Saved interpretation: ${label('detection')}. ${s.detection==='ids-blocked'?'The claim that this IDS blocked the attempt is unsupported.':'Use firewall F-19 to establish the historical block.'}`,s.detection==='separate'?'Alert and block distinguished':'IDS blocking claim unsupported',s.detection==='separate'?'ready':'warning',['detection'],37,75),
 node('review','Review record','evidence',`${label('evidence')}. ${s.evidence==='full'?'Rule, A-19, F-19, and both allow/deny records retained.':s.evidence==='clear'?'Selected review discards the supplied record copy.':'The IDS alert alone does not establish blocking.'} Historical evidence does not replace a fresh workspace test.`,s.evidence==='full'?'Full review record selected':s.evidence==='clear'?'Review record cleared':'Enforcement evidence missing',s.evidence==='full'?'ready':'warning',['evidence'],75,75)
 ],[
 link('classroom','signin','Portal identity method','Selected method',s.authentication==='individual'?'ready':'warning'),
 link('signin','firewall','Required portal path','Identity and network access are separate'),
 link('firewall','portal','Classroom TCP 443',https?'Allowed by saved rule':'Denied by saved rule',https?'ready':'blocked'),
 link('firewall','ids','Observed attempt','Alert-only sensor'),
 link('ids','review','Historical A-19','Alert evidence'),
 link('firewall','review','Historical F-19','Recorded firewall block')
 ]);
};

models.NET212=(s,label)=>{
 const local=s.link==='up',gateway=local&&s.gateway==='10.50.0.1',remote=gateway&&s.route==='approved';
 return diagram('Find the first broken checkpoint',`Local link ${local?'up':'down'}; gateway ${gateway?'responds':'has no response'}; provider ${gateway?'responds':'is not reached'}; remote ${remote?'responds in the fixed model':gateway?'fails through the retired route':'is not reached through the local path'}. A missing response alone does not prove a server failed.`,[
 node('pc','PC-LIB','computer',`10.50.0.25/24. ${label('link')}.`,local?'Local link up':'Local link down',local?'ready':'blocked',['link'],12,25),
 node('gateway','Library gateway','router',`${label('gateway')}. ${s.gateway==='10.50.0.1'?'The approved gateway responded in baseline.':'The retired .254 gateway does not respond in this model.'}`,gateway?'Gateway responds':local?'Retired gateway: no response':'Not reached without cable',gateway?'ready':'blocked',['gateway'],37,25),
 node('provider','Provider handoff','network',`Handoff responds in baseline. Remote-route choice: ${label('route')}. A retired remote route does not break this working handoff.`,gateway?'Provider responds':'Provider not reached',gateway?'ready':'blocked',['route'],63,25),
 node('remote','Remote library','server',`${s.route==='approved'?'Approved Provider B route':'Retired Provider A route'}. ${remote?'Fixed remote response is available.':'Compare preceding checkpoints to locate the path problem.'}`,remote?'Remote responds in model':gateway?'Retired remote route fails':'Local path prevents reachability',remote?'ready':'blocked',['route'],88,25),
 node('record','Checkpoint record','evidence',`${label('diagnostic')}. ${s.diagnostic==='all'?'Local, gateway, provider, and remote observations retained.':'Only the remote result is retained; intermediate evidence is absent.'} Recording observations does not change the network.`,s.diagnostic==='all'?'All four checkpoints retained':'Intermediate evidence absent',s.diagnostic==='all'?'ready':'warning',['diagnostic'],50,75)
 ],[
 link('pc','gateway','Approved local cable',local?'Cable connected':'Cable disconnected',local?'ready':'blocked'),
 link('gateway','provider','Gateway → provider',gateway?'Handoff reachable':'Not reached through local path',gateway?'ready':'blocked'),
 link('provider','remote',s.route==='approved'?'Provider B route':'Retired Provider A route',remote?'Remote response modeled':gateway?'Remote route unavailable':'Upstream path unavailable',remote?'ready':'blocked'),
 link('gateway','record','Gateway checkpoint',s.diagnostic==='all'?'Retained in record':'Not in selected record',s.diagnostic==='all'?'ready':'neutral'),
 link('remote','record','Remote checkpoint','Fixed observations only')
 ]);
};

models.NET213=(s,label)=>{
 const scheduled=s.congestion==='reschedule',priority=s.voiceQueue==='rtp-priority';
 const load=scheduled?7:18,loss=scheduled?(priority?'0.4%':'2%'):'7%',jitter=scheduled?(priority?'12':'30'):'55';
 const quality=scheduled&&priority;
 return diagram('Follow signaling, audio, and competing traffic',`Uplink remains 10 Mb/s; total offered load is ${load} Mb/s. Fixed media sample: ${loss} loss, ${jitter} ms jitter. Queue priority does not add capacity, and a management record does not repair the call.`,[
 node('phone','Classroom phone','phone',`Fixed call: SIP setup succeeded; RTP carries audio. Saved roles: ${label('media')}.`,s.media==='matched'?'Call roles matched':'SIP / RTP labels reversed',s.media==='matched'?'ready':'warning',['media'],12,25),
 node('queue','Switch / voice queue','switch',`${label('voiceQueue')}. ${priority?'Bounded priority treats RTP audio.':s.voiceQueue==='sip-only'?'Only setup signaling is prioritized; RTP remains best effort.':'RTP audio remains best effort.'}`,priority?'RTP priority selected':'Audio stays best effort',priority?'ready':'warning',['voiceQueue'],37,25),
 node('uplink','10 Mb/s uplink','network',`${load} Mb/s offered overall. ${scheduled?'Moving the transfer reduces demand to 7 Mb/s.':'18 Mb/s exceeds the fixed physical capacity.'} Fixed sample: ${loss} loss; ${jitter} ms jitter.`,quality?'Sample within case targets':scheduled?'Sample still misses targets':'Demand exceeds capacity',quality?'ready':'warning',['congestion','voiceQueue'],63,25),
 node('peer','Remote call peer','phone',`RTP audio sample target: below 1% loss and at most 20 ms jitter. Current fixed sample: ${loss}; ${jitter} ms. SIP setup alone does not prove clear audio.`,quality?'Sample fits targets':'Choppy media sample',quality?'ready':'warning',['media','voiceQueue','congestion'],88,25),
 node('bulk','Bulk transfer job','computer',`${label('congestion')}. These choices change total offered load, not the 10 Mb/s link speed.`,scheduled?'Transfer moved outside call':'Transfer competes with audio',scheduled?'ready':'warning',['congestion'],37,75),
 node('management','Management record','evidence',`${label('record')}. ${s.record==='fcaps'?'Fault, Configuration, Accounting, Performance, Security retained. Accounting uses aggregate totals.':'Fault, Configuration, Accounting, and Security evidence is absent.'} No personal call data.`,s.record==='fcaps'?'All FCAPS categories retained':'Only performance retained',s.record==='fcaps'?'ready':'warning',['record'],75,75)
 ],[
 link('phone','queue','SIP setup / RTP audio','Fixed call roles'),
 link('bulk','queue',scheduled?'Transfer rescheduled':'Transfer during call',scheduled?'7 Mb/s total load':'18 Mb/s total load',scheduled?'ready':'warning'),
 link('queue','uplink',priority?'Bounded RTP priority':s.voiceQueue==='sip-only'?'SIP-only priority':'Best-effort queue',priority?'Audio priority selected':'Audio not prioritized',priority?'ready':'warning'),
 link('uplink','peer',`${loss} loss; ${jitter} ms jitter`,quality?'Within supplied case targets':'Outside supplied case targets',quality?'ready':'warning'),
 link('uplink','management','Fixed performance sample','Record, not a repair')
 ]);
};

models.NET214=(s,label)=>{
 const ports=s.capacity==='24-gigabit'?24:48,uplink=s.capacity==='48-fast'?100:1000;
 const capacity=ports>=28&&uplink>=700,managed=s.wireless==='managed',separate=s.segments==='approved';
 const plan=s.changePlan==='reviewable';
 return diagram('Plan the learning space',`27 access connections plus one uplink need 28 ports; 560 Mb/s peak plus 25% headroom needs 700 Mb/s. Selected plan has ${ports} ports and ${uplink} Mb/s. Change record: ${label('changePlan')}. School review precedes installation.`,[
 node('students','24 classroom PCs','computer','24 wired PCs at a planned 20 Mb/s each. Group boundaries depend on VLANs and gateway rules.',separate?'Student group separated':'Flat network selected',separate?'ready':'warning',['segments'],12,25),
 node('staff','Staff / printer','computer','Staff access is separate from guests in the approved plan. One printer is included in the access-port count.',separate?'Staff boundary planned':'Guest boundary missing',separate?'ready':'warning',['segments'],12,75),
 node('switch','Learning-space switch','switch',`${ports} usable ports: margin ${ports-28}. ${uplink} Mb/s uplink: margin ${uplink-700} Mb/s against demand with headroom.`,capacity?'Capacity fits plan':ports<28?'Four ports short':'Uplink 600 Mb/s short',capacity?'ready':'warning',['capacity'],37,50),
 node('ap','Two access points','wireless',`${label('wireless')}. Two switch ports included. ${managed?'Staff provision individual authentication and protected radio; check client compatibility.':'Open or shared access does not meet this staff/student policy.'}`,managed?'Managed access planned':'Wireless policy unmet',managed?'ready':'warning',['wireless'],63,75),
 node('guest','Guest devices','computer',`${label('segments')}. ${separate?'Approved gateway rules deny guests access to staff and allow listed services.':'A flat network lacks the required guest/staff boundary.'}`,separate?'Guest boundary planned':'Shared flat network',separate?'ready':'warning',['segments','wireless'],88,75),
 node('gateway','School uplink / review','router',`${label('segments')}. ${plan?'Inventory, prior settings, baseline, proposed settings, tests, and rollback retained for school review.':s.changePlan==='erase'?'Previous inventory and settings discarded; reliable rollback is unavailable.':'Baseline, tests, rollback, and school review are absent.'}`,plan?'Change record ready for review':'Change record incomplete',plan?'ready':'warning',['segments','changePlan'],88,25)
 ],[
 link('students','switch','24 access connections',ports>=28?'Port capacity available':'Port assignment exceeds capacity',ports>=28?'ready':'warning'),
 link('staff','switch','Staff / printer connection',separate?'Staff VLAN planned':'Shared flat network',separate?'ready':'warning'),
 link('switch','ap','Two wired AP ports',ports>=28?'Included in port budget':'Port budget short',ports>=28?'ready':'warning'),
 link('ap','guest','Wireless access',managed?'Managed protected access':'Required access policy missing',managed?'ready':'warning'),
 link('switch','gateway',`${uplink} Mb/s uplink`,uplink>=700?'700 Mb/s estimate fits':'Demand exceeds uplink capacity',uplink>=700?'ready':'warning'),
 link('guest','gateway','Guest gateway policy',separate?'Staff denied; listed services allowed':'Required boundary missing',separate?'ready':'warning')
 ]);
};

models.NET215=(s,label)=>diagram('Compare the supplied frames',
 `Fixed evidence: 192.0.2.24 → 198.51.100.20; TTL 64 → 63; no NAT on this hop. Saved interface: ${label('interface')}. Selecting a label does not change either supplied frame or establish application success.`,[
 node('pc','Classroom PC','computer','192.0.2.24/24; MAC 02:00:00:00:01:24. Fixed frame goes to the gateway LAN MAC, not a remote MAC.','Fixed Ethernet source','neutral',['nextHop'],12,25),
 node('gateway','Local gateway','router',`192.0.2.1; MAC 02:00:00:00:01:01. Saved frame destination: ${label('nextHop')}. ${s.nextHop==='gateway'?'Matches the supplied local ARP record.':'Remote MAC is not a local ARP neighbor.'}`,s.nextHop==='gateway'?'Next-hop label matched':'Next-hop label mismatched',s.nextHop==='gateway'?'ready':'warning',['nextHop'],37,25),
 node('hop','Router-out / next hop','router',`Supplied after-hop frame: new Ethernet addresses; same IP endpoints; TTL 63. Saved: ${label('headers')}.`,s.headers==='routed'?'Hop description matched':'Hop description mismatched',s.headers==='routed'?'ready':'warning',['headers'],63,25),
 node('remote','Remote IP endpoint','server','198.51.100.20 remains the IPv4 destination through this supplied routed hop. A single frame does not establish application delivery.','Fixed IP destination','neutral',['headers','interpretation'],88,25),
 node('capture','Capture interface','evidence',`${label('interface')}. ${s.interface==='ethernet'?'This is the supplied classroom Ethernet card.':'This unrelated Wi-Fi card does not establish the classroom Ethernet path.'}`,s.interface==='ethernet'?'Relevant interface selected':'Unrelated interface selected',s.interface==='ethernet'?'ready':'warning',['interface'],25,75),
 node('interpretation','Evidence conclusion','evidence',`${label('interpretation')}. The supplied records support link delivery and the stated IP path; they do not prove application success.`,s.interpretation==='link-path'?'Within evidence limits':'Conclusion exceeds evidence',s.interpretation==='link-path'?'ready':'warning',['interpretation'],75,75)
 ],[
 link('pc','gateway','PC MAC → gateway MAC; TTL 64','Fixed packet record'),
 link('gateway','hop','New Ethernet frame; TTL 63','Fixed packet record'),
 link('hop','remote','IP destination unchanged','Supplied IP path only'),
 link('capture','gateway','Supplied Ethernet card','Capture evidence'),
 link('hop','interpretation','Compare both headers','Evidence, not application test')
 ]);

models.NET216=(s,label)=>{
 const target=s.target==='uplink',protectedPoll=s.protection==='authpriv',rate=s.threshold==='rate';
 const polling=target&&protectedPoll,alert=polling&&rate&&s.receiver==='approved';
 const receiver=s.receiver==='approved';
 return diagram('Follow the protected poll and alert path',`SW-04 supplied counters are always 100 → 160 over 60 seconds: 1 error/second, above 0.5. ${alert?'Saved choices are ready for the fixed receiver check.':'The required alert path is incomplete.'} Routing an alert does not repair the interface errors.`,[
 node('uplink','SW-04 · uplink-1','switch','Supplied interface samples: 100 errors at 10:00:00; 160 at 10:01:00; no reset or reboot. The interface still has errors even when the notification path is prepared.',target?'Selected interface; errors present':'Required interface not selected','warning',['target'],12,25),
 node('printer','Unrelated printer','printer','This printer queue is not the source of the supplied SW-04 interface samples.',target?'Not selected':'Wrong target selected',target?'neutral':'warning',['target'],12,75),
 node('manager','NMS-01 manager','manager',`${label('target')}. ${label('protection')}. ${protectedPoll?'Authentication and privacy selected; staff provision credentials outside this model.':'Unprotected polling fails the supplied management policy.'}`,polling?'Protected target path selected':!target?'Wrong sampled target':'Polling protection missing',polling?'ready':'blocked',['target','protection'],50,25),
 node('threshold','Rate comparison','evidence',`Fixed observed rate: (160 - 100) / 60 = 1 error/second > 0.5. Saved: ${label('threshold')}. ${rate?'The interval rate is the required comparison.':'A lifetime total is not an interval rate.'}`,rate?'Rate comparison selected':'Wrong counter comparison',rate?'ready':'warning',['threshold'],50,75),
 node('desk','Alert receiver','manager',`${label('receiver')}. ${alert?'Target, protection, threshold, and receiver choices match the fixed acceptance-check conditions. Run the workspace test separately.':receiver?'Receiver is configured; check is held while target, protection, or threshold differs.':s.receiver==='external'?'Unapproved external receiver is rejected; no modeled notification is sent.':'No receiver or acceptance record is selected.'}`,alert?'Ready for receiver check':receiver?'Receiver configured; path held':s.receiver==='external'?'External receiver rejected':'Receiver missing',alert?'ready':receiver?'warning':'blocked',['receiver'],88,25)
 ],[
 link('uplink','manager',protectedPoll?'SNMPv3 authPriv poll':'Community-string poll',target?(protectedPoll?'Required protected poll selected':'Unprotected poll rejected'):'Required interface not polled',polling?'ready':target?'blocked':'neutral'),
 link('printer','manager',target?'Printer not selected':protectedPoll?'SNMPv3 authPriv poll':'Community-string poll',target?'Not the sample source':'Wrong data source',target?'neutral':'warning'),
 link('manager','threshold','Compare supplied SW-04 samples',polling?'Protected source path selected':'Required protected source path missing',polling?'ready':'blocked'),
 link('threshold','desk','Threshold-event notification',alert?'Ready for fixed acceptance check':receiver?'Notification path held':'No approved receiver',alert?'ready':'blocked')
 ]);
};
