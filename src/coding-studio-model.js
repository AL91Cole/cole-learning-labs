// Creative studio state helpers. The start-up bundle needs these to reset and
// warn about page-memory drafts; the editor and interpreter load with the studio route.
export const SOURCE_LIMIT=4000;
export const CODING_PROJECTS=Object.freeze([
  {id:'art',name:'Message art',mode:'text',description:'Build a pattern with text and a repeat.',code:'print("MY CREATIVE STUDIO");\nlet row = "*";\nrepeat (repeats) {\n  print(row);\n  row = row + " *";\n}'},
  {id:'scoreboard',name:'Scoreboard',mode:'bars',description:'Turn your numbers into bars.',code:'let first = score;\nlet second = score + 5;\nlet third = score * 2;\nprint(first);\nprint(second);\nprint(third);'},
  {id:'calculator',name:'Supply calculator',mode:'bars',description:'Choose quantities and prices, then compare totals.',code:'let total = quantity * price;\nprint(total);\nprint(total + 10);'},
  {id:'decision',name:'Decision display',mode:'text',description:'Change an input and see a different message.',code:'if (score >= 10) {\n  print("LEVEL UP!");\n} else {\n  print("KEEP BUILDING");\n}\nprint("Your score: " + score);'},
  {id:'blank',name:'Start from scratch',mode:'text',description:'Make your own program.',code:''}
].map(project=>Object.freeze(project)));
export const INPUTS=Object.freeze([
  {name:'quantity',label:'Quantity',value:4,min:0,max:100,step:1},
  {name:'price',label:'Price',value:3,min:0,max:100,step:0.5},
  {name:'score',label:'Score',value:8,min:0,max:100,step:1},
  {name:'repeats',label:'Repeats',value:5,min:0,max:20,step:1}
]);
export const projectFor=id=>CODING_PROJECTS.find(project=>project.id===id)||CODING_PROJECTS[0];
export function dataRecord(value) {
  if(value===null||typeof value!=='object'||Array.isArray(value)) return null;
  try {
    if(![Object.prototype,null].includes(Object.getPrototypeOf(value))) return null;
    const descriptors=Object.getOwnPropertyDescriptors(value),result=Object.create(null);
    for(const name of Reflect.ownKeys(descriptors)) {
      if(typeof name!=='string'||!Object.hasOwn(descriptors[name],'value')) return null;
      result[name]=descriptors[name].value;
    }
    return result;
  } catch {return null;}
}
export function initialCodingStudioState(projectId='art') {
  const project=projectFor(projectId);
  return {projectId:project.id,code:project.code,mode:project.mode,inputs:Object.fromEntries(INPUTS.map(input=>[input.name,input.value])),runs:0};
}
export function normalizeCodingStudioState(saved) {
  const values=dataRecord(saved),state=initialCodingStudioState(values?.projectId);
  if(!values) return state;
  if(typeof values.code==='string'&&values.code.length<=SOURCE_LIMIT) state.code=values.code;
  if(['text','bars'].includes(values.mode)) state.mode=values.mode;
  if(Number.isSafeInteger(values.runs)&&values.runs>=0) state.runs=Math.min(values.runs,1000000);
  const inputs=dataRecord(values.inputs);
  for(const input of INPUTS) {
    const value=inputs?.[input.name];
    if(typeof value==='number'&&Number.isFinite(value)&&value>=input.min&&value<=input.max&&(input.step!==1||Number.isInteger(value))) state.inputs[input.name]=value;
  }
  return state;
}
export function codingStudioHasWork(saved) {
  const state=normalizeCodingStudioState(saved),initial=initialCodingStudioState();
  return state.runs>0||state.projectId!==initial.projectId||state.code!==initial.code||state.mode!==initial.mode||INPUTS.some(input=>state.inputs[input.name]!==initial.inputs[input.name]);
}
