import { pcActivity } from './pc-activity.js?release=20261021-chat27';

/** Control recommendations only. The equipment model still decides every repair. */
const freezeList=values=>Object.freeze(values);
const ALL_TOOLS=freezeList(['inspect','move','cables','screwdriver','paste','clean']);
const ALL_GROUPS=freezeList(['panel','psu','board','cpu','paste','cooler','ram','gpu','ssd','cables','display']);
const ALL_CABLES=freezeList(['ac','hdmi-pc','hdmi-monitor','atx','eps','gpu-power','sata-data','sata-power','front-panel','cpu-fan']);
const ALL_SCREWS=freezeList(['panel','psu','board','cooler','gpu','ssd']);
const FULL_XRAY=freezeList(['bench']);
const EXTERNAL_TOOLS=freezeList(['inspect','cables']);
const REPAIR_TOOLS=freezeList(['inspect','move','cables','screwdriver']);
const profile=(title,kind,groups,cables,screws,initialPart,initialCable,tools=REPAIR_TOOLS)=>Object.freeze({title,kind,tools,groups:freezeList(groups),cables:freezeList(cables),screws:freezeList(screws),views:FULL_XRAY,initialPart,initialCable,initialView:'bench'});
// Transfer tickets deliberately share a profile: it cannot identify the bad end
// of a cable or the selected source before the student gathers evidence.
const DISPLAY=profile('Display checks','display',['display','cables'],['hdmi-pc','hdmi-monitor'],[],'display','hdmi-pc',EXTERNAL_TOOLS);
const POWER=profile('Power checks','power',['psu','cables','display'],['ac'],[],'psu','ac',EXTERNAL_TOOLS);
const MEMORY=profile('Startup and memory checks','memory',['panel','ram','cables','display'],['ac'],['panel'],'ram','ac');
const STORAGE=profile('Startup and storage checks','storage',['panel','ssd','cables','display'],['ac','sata-data','sata-power'],['panel','ssd'],'ssd','sata-data');
const BUILD=profile('Complete PC build','build',ALL_GROUPS,ALL_CABLES,ALL_SCREWS,'board','atx',ALL_TOOLS);
const FALLBACK=profile('Workstation checks','general',['psu','display','cables'],['ac','hdmi-pc','hdmi-monitor'],[],'display','hdmi-pc',EXTERNAL_TOOLS);
const PROFILES=Object.freeze({'INC-101':DISPLAY,'INC-102':POWER,'INC-103':MEMORY,'INC-104':STORAGE,'INC-105':STORAGE,'INC-106':BUILD,'INC-107':DISPLAY,'INC-108':DISPLAY});

// Saved state is data, not executable accessors or inherited instructions.
function own(value,key){
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  try{if(![Object.prototype,null].includes(Object.getPrototypeOf(value)))return undefined;const descriptor=Object.getOwnPropertyDescriptor(value,key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;}catch{return undefined;}
}
const yes=(value,key)=>own(value,key)===true;
const no=(value,key)=>own(value,key)===false;
function instructionFor(spec,hardware){
  const internal=['memory','storage','build'].includes(spec.kind),assembly=own(hardware,'assembly');
  if(internal&&yes(hardware,'pcOn')&&no(assembly,'panelInstalled'))return 'The case is open. Power off the virtual PC and disconnect AC before touching internal parts.';
  const activity=pcActivity(hardware);
  if(activity.display.desktop)return activity.display.documentOpened
    ?'Check the open original lesson file against the request, then explain which tests support your findings.'
    :'The desktop is available. Open the original lesson file and check the requester’s goal before explaining your work.';
  if(spec.kind==='display')return 'Read the monitor message and selected source, then trace both ends of the display cable. Use the ticket evidence to choose a change and test the result.';
  if(spec.kind==='power')return yes(hardware,'pcOn')
    ?'Read the startup and monitor evidence after your power test. Compare the result with the request before choosing another change.'
    :'Trace the external power path and inspect the outlet, cord and rear power controls. Choose one evidence-based change, then test the PC.';
  if(internal){
    if(yes(hardware,'pcOn'))return 'Record the startup evidence. Power off the virtual PC and disconnect AC before opening the case or changing internal parts.';
    if(no(hardware,'pcOn')&&yes(hardware,'acConnected'))return 'The PC is off. Disconnect virtual AC before opening the case or changing internal parts.';
    if(!no(hardware,'pcOn')||!no(hardware,'acConnected'))return 'Confirm that the PC is off and AC is disconnected before internal work. Use the ticket evidence to choose what to inspect.';
    if(yes(assembly,'panelInstalled'))return 'The PC is off and AC is disconnected. Open the case only for an evidence-based internal check; secure the panel before reconnecting power and testing.';
    if(spec.kind==='memory')return 'Compare the memory label, slot and clips with the startup evidence. After a justified change, secure the case and test startup.';
    if(spec.kind==='storage')return 'Compare the drive label and data/power connections with the motherboard specification. Preserve the original classroom files, then test your explanation.';
    return 'Use the motherboard specification and labeled parts to plan the build. Secure the parts, clips, fasteners and connections before testing startup.';
  }
  return 'Read the ticket and inspect the virtual equipment before choosing a change. Use the test result and original task to check your explanation.';
}

/** Fixed authored IDs; never permissions, saved state, answer keys or automatic actions. */
export function workbenchGuidance(hardware){
  const id=own(hardware,'caseId'),spec=typeof id==='string'&&Object.hasOwn(PROFILES,id)?PROFILES[id]:FALLBACK;
  const {kind,...view}=spec;
  return Object.freeze({...view,instruction:instructionFor(spec,hardware)});
}
