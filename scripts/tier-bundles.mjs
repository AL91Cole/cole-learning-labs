import {constants} from 'node:fs';
import {lstat,open,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {parse} from 'acorn';
import {FREE_LAB_IDS} from '../src/access-policy.js';

const PROJECT_ROOT=fileURLToPath(new URL('../',import.meta.url));
const FREE_IDS=Object.freeze([...FREE_LAB_IDS]);
const FREE_SET=new Set(FREE_IDS);
const TRACKS=new Set(['hardware','network','ai','security','coding']);
const METADATA_KEYS=['access','grade','id','minutes','title','track'];
const MAX_MODULE_BYTES=2_000_000;

const emptyMount='()=>()=>{}';
const emptyState='()=>({})';
const falseValue='()=>false';
const noOperation='()=>{}';
const unavailable='()=>"Membership required."';
const publicStubs=Object.freeze({
  'coding-sandbox.js':{
    SANDBOX_STARTERS:'Object.freeze([])',hasCodingSandboxWork:falseValue,clearCodingSandboxWork:noOperation,
    runCodingSandbox:'()=>({ok:false,output:[],message:"Membership required."})',codingSandboxSnippet:'()=>""',
    renderCodingSandbox:unavailable,mountCodingSandbox:emptyMount
  },
  'coding-studio.js':{
    CODING_PROJECTS:'Object.freeze([])',initialCodingStudioState:emptyState,normalizeCodingStudioState:emptyState,
    runCodingStudio:'()=>({ok:false,output:[]})',codingStudioHasWork:falseValue,codingStudioBars:'()=>[]',
    renderCodingStudio:unavailable,mountCodingStudio:emptyMount
  },
  'network-studio.js':{
    networkStudioPacketPlan:'()=>[]',networkStudioWirePath:'()=>""',renderNetworkStudio:unavailable,mountNetworkStudio:emptyMount
  },
  'network-studio-model.js':{
    NETWORK_STUDIO_LIMITS:'Object.freeze({})',NETWORK_DEVICE_TYPES:'Object.freeze([])',
    initialNetworkStudioState:emptyState,normalizeNetworkStudioState:emptyState,
    applyNetworkStudioAction:'()=>({state:null,message:"Membership required."})',
    evaluateNetworkStudio:'()=>({ok:false})',networkStudioHasWork:falseValue
  },
  'capstone.js':{
    CAPSTONE_STAGES:'Object.freeze([])',capstoneHandoff:emptyState,writeCapstoneHandoff:noOperation,
    capstoneProgress:'()=>({complete:false})',capstoneReport:unavailable,renderCapstone:unavailable,mountCapstone:emptyMount
  },
  'expanded-labs.js':{
    EXPANDED_SCENARIOS:'Object.freeze([])',supportsExpandedLab:falseValue,expandedStateFields:emptyState,
    initialExpandedState:emptyState,normalizeExpandedState:emptyState,
    applyExpandedAction:'()=>({state:null,message:"Membership required."})',verifyExpanded:'()=>({ok:false})',
    getExpandedMission:'()=>({passed:0,total:0,complete:false})',expandedDiagnostic:unavailable,
    disposeExpanded:noOperation,renderExpanded:unavailable
  },
  'lesson-plans.js':{
    renderLessonPlans:'()=>""',mountLessonPlans:emptyMount,hasLessonPlanWork:falseValue,clearLessonPlanWork:noOperation
  }
});

const tree=source=>parse(source,{ecmaVersion:'latest',sourceType:'module'});
function declaration(ast,name){
  const matches=[];
  for(const statement of ast.body){
    const item=statement.type==='ExportNamedDeclaration'?statement.declaration:statement;
    if(item?.type==='VariableDeclaration')for(const entry of item.declarations)if(entry.id.type==='Identifier'&&entry.id.name===name)matches.push(entry);
  }
  if(matches.length!==1||!matches[0].init)throw new Error(`Expected exactly one reviewed ${name} declaration.`);
  return matches[0].init;
}
function propertyName(property){
  if(property.type!=='Property'||property.kind!=='init'||property.method||property.computed)throw new Error('Only reviewed literal properties can enter a public catalog.');
  const key=property.key.type==='Identifier'?property.key.name:property.key.type==='Literal'?property.key.value:null;
  if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key))throw new Error('Unsupported catalog property.');
  return key;
}
function literal(node,{freeze=false,budget={remaining:20000}}={}){
  if(!node||--budget.remaining<0)throw new Error('Reviewed literal structure exceeded its bound.');
  const descend=child=>literal(child,{freeze,budget});
  if(node.type==='Literal'&&(node.value===null||['string','number','boolean'].includes(typeof node.value))&&!node.regex)return node.value;
  if(node.type==='ArrayExpression')return node.elements.map(descend);
  if(node.type==='ObjectExpression'){
    const result=Object.create(null);
    for(const property of node.properties){
      if(property.type==='SpreadElement'){
        const value=descend(property.argument);
        if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Unsupported literal spread.');
        for(const [key,item]of Object.entries(value)){if(Object.hasOwn(result,key))throw new Error('Duplicate catalog property.');result[key]=item;}
      }else{
        const key=propertyName(property);if(Object.hasOwn(result,key))throw new Error('Duplicate catalog property.');result[key]=descend(property.value);
      }
    }
    return result;
  }
  if(node.type==='CallExpression'&&!node.optional){
    const callee=node.callee;
    if(freeze&&callee.type==='MemberExpression'&&!callee.computed&&callee.object.type==='Identifier'&&callee.object.name==='Object'&&callee.property.name==='freeze'&&node.arguments.length===1)return descend(node.arguments[0]);
    if(callee.type==='Identifier'&&callee.name==='clue'&&node.arguments.length===3){const [id,label,text]=node.arguments.map(descend);if([id,label,text].every(value=>typeof value==='string'))return {id,label,text};}
    if(callee.type==='Identifier'&&callee.name==='question'&&node.arguments.length===2){const [label,answer]=node.arguments.map(descend);if([label,answer].every(value=>typeof value==='string'))return {label,answer};}
  }
  throw new Error('A public catalog requires literals and the reviewed clue/question constructors only.');
}
function objectId(node){
  if(node?.type!=='ObjectExpression')return null;
  const ids=node.properties.filter(property=>property.type==='Property'&&propertyName(property)==='id');
  return ids.length===1&&ids[0].value.type==='Literal'?ids[0].value.value:null;
}
function filteredArray(source,ast,name,ids){
  const array=declaration(ast,name);if(array.type!=='ArrayExpression')throw new Error(`Expected a literal ${name} array.`);
  const selected=array.elements.filter(element=>element?.type==='ObjectExpression'&&ids.has(objectId(element)));
  if(selected.length!==ids.size||new Set(selected.map(objectId)).size!==ids.size)throw new Error(`Reviewed ${name} entries are missing or duplicated.`);
  return {array,selected};
}
function replaceParts(source,replacements){
  let output=source,previous=Infinity;
  for(const {start,end,value}of [...replacements].sort((a,b)=>b.start-a.start)){
    if(end>previous||start<0||end<start)throw new Error('Overlapping compiler replacement.');
    output=output.slice(0,start)+value+output.slice(end);previous=start;
  }
  return output;
}
function publicCoding(source){
  const ast=tree(source),ids=new Set(FREE_IDS.filter(id=>id.startsWith('CODE-'))),keys=new Set([...ids].map(id=>id.replaceAll('-','')));
  const {array,selected}=filteredArray(source,ast,'CODING_SCENARIOS',ids);
  const replacements=[{start:array.start,end:array.end,value:'['+selected.map(node=>source.slice(node.start,node.end)).join(',')+']'}];
  for(const name of ['definitions','pythonStarters']){
    const object=declaration(ast,name);if(object.type!=='ObjectExpression')throw new Error(`Expected reviewed ${name} map.`);
    const selectedProperties=object.properties.filter(property=>keys.has(propertyName(property)));
    if(selectedProperties.length!==keys.size||new Set(selectedProperties.map(propertyName)).size!==keys.size)throw new Error(`Reviewed ${name} entries are missing or duplicated.`);
    replacements.push({start:object.start,end:object.end,value:'{'+selectedProperties.map(node=>source.slice(node.start,node.end)).join(',')+'}'});
  }
  for(const statement of ast.body)if(statement.type==='FunctionDeclaration'&&statement.id?.name==='storyCard'){
    replacements.push({start:statement.start,end:statement.end,value:'function storyCard(){return "";}'});
  }
  return replaceParts(source,replacements);
}
function accessContext(source,member){
  const node=declaration(tree(source),'MEMBER_CONTENT');
  if(node.type!=='Literal'||typeof node.value!=='boolean')throw new Error('Membership context must be a reviewed source boolean.');
  return replaceParts(source,[{start:node.start,end:node.end,value:member?'true':'false'}]);
}
function localRequesterContext(source){
  const node=declaration(tree(source),'REQUESTER_CLOUD_ENABLED');
  if(node.type!=='Literal'||typeof node.value!=='boolean')throw new Error('Local requester context must be a reviewed source boolean.');
  return replaceParts(source,[{start:node.start,end:node.end,value:'false'}]);
}
function walk(node,visit){
  if(!node||typeof node!=='object')return;
  if(typeof node.type==='string')visit(node);
  for(const value of Object.values(node)){
    if(Array.isArray(value))for(const child of value)walk(child,visit);
    else if(value&&typeof value==='object')walk(value,visit);
  }
}
function publicActivity(source,track){
  const ast=tree(source),replacements=[],keys=new Set(FREE_IDS.filter(id=>id.startsWith(track+'-')).map(id=>id.replaceAll('-','')));
  const ids=declaration(ast,'IDS'),array=ids.type==='NewExpression'&&ids.callee.name==='Set'?ids.arguments[0]:ids;
  if(array?.type!=='ArrayExpression'||![...keys].every(key=>array.elements.some(node=>node.type==='Literal'&&node.value===key)))throw new Error('Activity catalog no longer matches the reviewed free cases.');
  replacements.push({start:array.start,end:array.end,value:JSON.stringify([...keys])});
  let maps=0;
  walk(ast,node=>{
    if(node.type!=='ObjectExpression'||!node.properties.length||!node.properties.every(property=>property.type==='Property'&&new RegExp('^'+track+'\\d{3}$','u').test(propertyName(property))))return;
    const retained=node.properties.filter(property=>keys.has(propertyName(property)));
    replacements.push({start:node.start,end:node.end,value:'{'+retained.map(property=>source.slice(property.start,property.end)).join(',')+'}'});maps++;
  });
  if(maps!==1)throw new Error('Expected one reviewed activity renderer map.');
  return replaceParts(source,replacements);
}
function publicControls(source){
  const ast=tree(source),keys=new Set(FREE_IDS.map(id=>id.replaceAll('-',''))),replacements=[];
  for(const statement of ast.body){
    const call=statement.type==='ExpressionStatement'?statement.expression:null;
    if(call?.type!=='CallExpression'||call.callee.type!=='Identifier'||!['add','expanded'].includes(call.callee.name))continue;
    const id=call.arguments[0];if(id?.type!=='Literal'||typeof id.value!=='string')throw new Error('Interactive controls require a reviewed literal case ID.');
    if(!keys.has(id.value))replacements.push({start:statement.start,end:statement.end,value:''});
  }
  return replaceParts(source,replacements);
}
function publicHardware(source){
  const object=declaration(tree(source),'CASES'),ids=new Set(FREE_IDS.filter(id=>id.startsWith('INC-')));
  if(object.type!=='ObjectExpression')throw new Error('Expected the reviewed hardware case map.');
  const retained=object.properties.filter(property=>ids.has(propertyName(property)));
  if(retained.length!==ids.size)throw new Error('The free hardware case map is incomplete.');
  return replaceParts(source,[{start:object.start,end:object.end,value:'{'+retained.map(property=>source.slice(property.start,property.end)).join(',')+'}'}]);
}
function validateMetadata(value){
  if(!Array.isArray(value)||value.length<FREE_IDS.length||value.length>200)throw new Error('Invalid reviewed catalog length.');
  const seen=new Set();
  const metadata=value.map(row=>{
    if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!==METADATA_KEYS.join(','))throw new Error('Catalog may contain only safe teaser fields.');
    if(typeof row.id!=='string'||!/^(?:INC|NET|AI|SEC|CODE)-\d{3}$/u.test(row.id)||seen.has(row.id)||!TRACKS.has(row.track)||
      typeof row.title!=='string'||!row.title.trim()||row.title.length>180||typeof row.grade!=='string'||!['7–8','9–10','11–12','7–12'].includes(row.grade)||
      !Number.isSafeInteger(row.minutes)||row.minutes<1||row.minutes>240||row.access!==(FREE_SET.has(row.id)?'free':'member'))throw new Error('Invalid reviewed teaser metadata.');
    seen.add(row.id);return Object.freeze({id:row.id,title:row.title,track:row.track,grade:row.grade,minutes:row.minutes,access:row.access});
  });
  if(FREE_IDS.some(id=>!seen.has(id)))throw new Error('A reviewed free investigation is missing from the catalog.');
  return Object.freeze(metadata);
}
const inside=(root,target)=>{const relative=path.relative(root,target);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};

/** Compile two isolated delivery artifacts. The helper writes no files and does
 * not execute source modules, create services, authenticate anyone or deploy. */
export async function bundleTier({sourceRoot=PROJECT_ROOT,member=false,entry='app.js',localOnly=false}={}){
  if(typeof sourceRoot!=='string'||typeof member!=='boolean')throw new Error('A canonical source directory and boolean tier are required.');
  if(typeof localOnly!=='boolean')throw new Error('A boolean local-only build option is required.');
  if(!['app.js','secure-reports.js'].includes(entry))throw new Error('Only reviewed application or local report-reader entries may be bundled.');
  const root=path.resolve(sourceRoot),info=await lstat(root);
  if(info.isSymbolicLink()||!info.isDirectory()||await realpath(root)!==root)throw new Error('Tier source root must be a canonical real directory.');
  const sourceDirectory=path.join(root,'src'),sourceInfo=await lstat(sourceDirectory);
  if(sourceInfo.isSymbolicLink()||!sourceInfo.isDirectory()||await realpath(sourceDirectory)!==sourceDirectory)throw new Error('Tier sources must be a canonical real directory.');
  const sources=new Map();
  async function readSource(target){
    if(!inside(sourceDirectory,target)||path.extname(target)!=='.js')throw new Error('Tier imports must stay in the reviewed JavaScript source directory.');
    if(sources.has(target))return sources.get(target).source;
    const relative=path.relative(sourceDirectory,target),parts=relative.split(path.sep);let current=sourceDirectory;
    for(let index=0;index<parts.length;index++){
      current=path.join(current,parts[index]);const item=await lstat(current);
      if(item.isSymbolicLink()||(index===parts.length-1?!item.isFile():!item.isDirectory()))throw new Error('Linked or nonregular tier source is forbidden.');
    }
    if(await realpath(target)!==target)throw new Error('Tier source resolved outside its reviewed path.');
    const handle=await open(target,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
    try{
      const before=await handle.stat();if(before.size>MAX_MODULE_BYTES)throw new Error('Tier module exceeded its reviewed size bound.');
      const source=await handle.readFile('utf8'),after=await handle.stat();
      if(before.ino!==after.ino||before.dev!==after.dev||before.size!==after.size||before.mtimeMs!==after.mtimeMs||Buffer.byteLength(source)>MAX_MODULE_BYTES)throw new Error('Tier source changed during compilation.');
      sources.set(target,{source,ino:after.ino,dev:after.dev,size:after.size,mtimeMs:after.mtimeMs});return source;
    }finally{await handle.close();}
  }
  const read=filename=>readSource(path.join(sourceDirectory,filename));
  const metadata=validateMetadata(literal(declaration(tree(await read('lab-catalog.js')),'CATALOG'),{freeze:true}));
  let publicScenarios='';
  if(!member){
    const freeCases=new Map();
    for(const [filename,name]of [['scenarios.js','SCENARIOS'],['coding-lab.js','CODING_SCENARIOS']]){
      const source=await read(filename),array=declaration(tree(source),name);
      if(array.type!=='ArrayExpression')throw new Error('Public case extraction requires reviewed arrays.');
      for(const node of array.elements){
        const id=objectId(node);if(!FREE_SET.has(id))continue;
        if(freeCases.has(id))throw new Error('A reviewed free investigation is duplicated.');
        const value=literal(node),row=metadata.find(item=>item.id===id);
        if(!row||['title','track','grade','minutes'].some(key=>row[key]!==value[key]))throw new Error('Free investigation metadata drifted from its reviewed source.');
        freeCases.set(id,value);
      }
    }
    if(FREE_IDS.some(id=>!freeCases.has(id)))throw new Error('A reviewed free investigation is missing.');
    publicScenarios='export const SCENARIOS=Object.freeze('+JSON.stringify(FREE_IDS.map(id=>freeCases.get(id)))+');export const TRANSFER_CASES=Object.freeze([]);export const transferCaseFor=()=>null;';
  }
  const result=await build({absWorkingDir:root,entryPoints:[path.join(sourceDirectory,entry)],bundle:true,write:false,
    format:'esm',platform:'browser',target:'es2022',minify:true,sourcemap:false,legalComments:'none',metafile:true,logLevel:'silent',
    plugins:[{name:'reviewed-delivery-tier',setup(builder){
      builder.onResolve({filter:/.*/},async args=>{
        let target;
        if(args.kind==='entry-point')target=path.resolve(args.path);
        else{
          if(!/^\.{1,2}\//u.test(args.path)||args.path.includes('\\')||args.path.includes('%')||args.path.includes('#'))throw new Error('External and encoded tier imports are forbidden.');
          const [filename,query,...extra]=args.path.split('?');
          if(extra.length||(query!==undefined&&!/^release=[A-Za-z0-9_-]{1,100}$/u.test(query)))throw new Error('Unreviewed tier import query.');
          target=path.resolve(path.dirname(args.importer),filename);
        }
        await readSource(target);return {path:target,namespace:'tier-source'};
      });
      builder.onLoad({filter:/.*/,namespace:'tier-source'},async args=>{
        const source=await readSource(args.path),filename=path.relative(sourceDirectory,args.path).split(path.sep).join('/');let contents=source;
        if(filename==='access-policy.js')contents=accessContext(source,member);
        // Trusted build configuration only; browser state and environment flags
        // cannot opt a compiled local preview back into cloud requests.
        else if(localOnly&&filename==='requester-config.js')contents=localRequesterContext(source);
        else if(filename==='lab-catalog.js')contents='export const CATALOG=Object.freeze('+JSON.stringify(metadata)+');';
        else if(!member&&filename==='scenarios.js')contents=publicScenarios;
        else if(!member&&Object.hasOwn(publicStubs,filename))contents=Object.entries(publicStubs[filename]).map(([name,value])=>'export const '+name+'='+value+';').join('\n');
        else if(!member&&filename==='coding-lab.js')contents=publicCoding(source);
        else if(!member&&filename==='ai-activities.js')contents=publicActivity(source,'AI');
        else if(!member&&filename==='security-activities.js')contents=publicActivity(source,'SEC');
        else if(!member&&filename==='interactive-tools.js')contents=publicControls(source);
        else if(!member&&filename==='hardware.js')contents=publicHardware(source);
        return {contents,loader:'js',resolveDir:path.dirname(args.path)};
      });
    }}]});
  if(result.warnings.length||result.outputFiles.length!==1||Object.values(result.metafile.outputs).some(output=>output.imports.length))throw new Error('Tier compilation must produce one self-contained reviewed module without warnings.');
  for(const [filename,snapshot]of sources){
    const after=await lstat(filename);
    if(after.isSymbolicLink()||after.ino!==snapshot.ino||after.dev!==snapshot.dev||after.size!==snapshot.size||after.mtimeMs!==snapshot.mtimeMs||await realpath(filename)!==filename)throw new Error('Tier source changed before compilation completed.');
  }
  const inputs=Object.freeze([...sources.keys()].map(filename=>path.relative(root,filename).split(path.sep).join('/')).sort());
  return {javascript:new Uint8Array(result.outputFiles[0].contents),metadata,inputs};
}
