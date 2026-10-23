import { pcActivity } from './pc-activity.js?release=20261023-workbench';

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
const POWER=profile('Power checks','power',['panel','cables','display'],['ac','atx'],['panel'],'cables','ac');
const MEMORY=profile('Startup and memory checks','memory',['panel','ram','cables','display'],['ac'],['panel'],'ram','ac');
const DRIVE_CABLES=profile('Drive cable checks','storage',['panel','cables','display'],['ac','sata-data','sata-power'],['panel'],'cables','sata-data');
const STORAGE=profile('Startup and storage checks','storage',['panel','ssd','cables','display'],['ac','sata-data','sata-power'],['panel','ssd'],'ssd','sata-data');
const BUILD=profile('Complete PC build','build',ALL_GROUPS,ALL_CABLES,ALL_SCREWS,'board','atx',ALL_TOOLS);
const FALLBACK=profile('Workstation checks','general',['psu','display','cables'],['ac','hdmi-pc','hdmi-monitor'],[],'display','hdmi-pc',EXTERNAL_TOOLS);
const PROFILES=Object.freeze({'INC-101':DISPLAY,'INC-102':POWER,'INC-103':MEMORY,'INC-104':DRIVE_CABLES,'INC-105':STORAGE,'INC-106':BUILD,'INC-107':DISPLAY,'INC-108':DISPLAY});

// Saved state is data, not executable accessors or inherited instructions.
function own(value,key){
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  try{if(![Object.prototype,null].includes(Object.getPrototypeOf(value)))return undefined;const descriptor=Object.getOwnPropertyDescriptor(value,key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;}catch{return undefined;}
}
const yes=(value,key)=>own(value,key)===true;
const no=(value,key)=>own(value,key)===false;
function instructionFor(spec,hardware){
  const internal=['power','memory','storage','build'].includes(spec.kind),assembly=own(hardware,'assembly');
  if(internal&&yes(hardware,'pcOn')&&no(assembly,'panelInstalled'))return 'The case is open. Power off and disconnect AC before touching internal parts.';
  const activity=pcActivity(hardware);
  if(activity.display.desktop)return activity.display.documentOpened
    ?'Check the open original lesson file, then explain what your tests showed.'
    :'Open the original lesson file on the monitor to check your fix.';
  if(spec.kind==='display')return 'Read the monitor message. Check its source and both cable ends. Change one thing, then test.';
  if(spec.kind==='power'){
    if(yes(hardware,'pcOn'))return 'Startup is not complete. Power off and disconnect AC before checking inside.';
    if(yes(hardware,'acConnected'))return no(hardware,'atxConnected')
      ?'Try the round power button. If the PC still will not start, power off and disconnect AC before checking inside.'
      :'Use the round power button, then check the monitor and open the lesson file.';
    if(no(assembly,'panelInstalled'))return no(hardware,'atxConnected')
      ?'Check the wide motherboard power cable. Connect it to its matching socket, then refit the panel and both screws.'
      :'Refit the side panel and tighten both screws before connecting power and testing startup.';
    if(no(hardware,'atxConnected')&&Number.isSafeInteger(own(hardware,'bootCount'))&&own(hardware,'bootCount')>0)return 'Power is disconnected. Remove both side-panel screws, then lift off the panel to check the power cable.';
    return no(hardware,'atxConnected')
      ?'Check the power cord first. Connect it, then try the round power button.'
      :'Check that the side panel and screws are secure. Connect power, then start the PC.';
  }
  if(internal){
    if(yes(hardware,'pcOn'))return 'Read the startup message. Power off and disconnect AC before internal work.';
    if(no(hardware,'pcOn')&&yes(hardware,'acConnected'))return 'The PC is off. Disconnect AC before opening the case.';
    if(!no(hardware,'pcOn')||!no(hardware,'acConnected'))return 'Confirm that the PC is off and AC is disconnected before internal work.';
    if(yes(assembly,'panelInstalled'))return 'Open the case only if you need to check inside. Secure the panel before reconnecting power.';
    if(spec.kind==='memory')return 'Check the memory label, slot and clips. After a change, secure the case and test startup.';
    if(spec.kind==='storage')return 'Check the drive label and its data and power leads. Keep the original files, then test your idea.';
    return 'Check the motherboard label and parts. Secure screws and clips, then connect the leads before startup.';
  }
  return 'Read the ticket. Inspect the equipment, change one thing, then test the original task.';
}

/** Fixed authored IDs; never permissions, saved state, answer keys or automatic actions. */
export function workbenchGuidance(hardware){
  const id=own(hardware,'caseId'),spec=typeof id==='string'&&Object.hasOwn(PROFILES,id)?PROFILES[id]:FALLBACK;
  const {kind,...view}=spec;
  return Object.freeze({...view,instruction:instructionFor(spec,hardware)});
}
