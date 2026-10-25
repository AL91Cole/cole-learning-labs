// Output is data. This module never interprets HTML, code, URLs or drawing commands.
const esc=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const CODING_VISUAL_MODES=Object.freeze([{id:'text',label:'Text'},{id:'bars',label:'Number bars'},{id:'tiles',label:'Pixel tiles'}].map(Object.freeze));
export const normalizeCodingVisualMode=value=>typeof value==='string'&&CODING_VISUAL_MODES.some(mode=>mode.id===value)?value:'text';
function outputData(result){
  try{
    if(!result||typeof result!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(result)))return null;
    const descriptors=Object.getOwnPropertyDescriptors(result),output=descriptors.output?.value;
    if(!Array.isArray(output))return null;
    const lines=Object.getOwnPropertyDescriptors(output),length=lines.length?.value;
    if(!Number.isInteger(length)||length<0||length>20)return null;
    const text=[];
    for(let index=0;index<length;index++){const line=lines[String(index)];if(!line||!Object.hasOwn(line,'value')||typeof line.value!=='string'||line.value.length>300)return null;text.push(line.value);}
    return {lines:text,ok:descriptors.ok?.value===true};
  }catch{return null;}
}
export function codingVisualData(result,mode='text'){
  const data=outputData(result);mode=normalizeCodingVisualMode(mode);
  if(!data)return {status:'idle',mode,lines:[]};
  if(!data.ok)return {status:'stopped',mode,lines:data.lines};
  if(!data.lines.length)return {status:'empty',mode,lines:[]};
  if(mode==='bars'){
    const rows=data.lines.map((line,index)=>{
      const trimmed=line.trim(),number=/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(trimmed)?Number(trimmed):NaN;
      return {line:index+1,text:line,value:Number.isFinite(number)&&Math.abs(number)<=1000000?number:null};
    });
    const maximum=Math.max(100,...rows.map(row=>Math.abs(row.value??0)));
    return {status:'ready',mode,lines:data.lines,scale:maximum,rows:rows.map(row=>({...row,width:row.value===null?0:Math.min(100,Math.abs(row.value)/maximum*100)}))};
  }
  if(mode==='tiles'){
    const rows=data.lines.map(line=>line.trim().split(/\s+/));
    if(rows.length>8||rows.some(row=>row.length>8||row.length!==rows[0].length||row.some(value=>! /^[0-9]$/.test(value))))return {status:'text-fallback',mode,lines:data.lines};
    return {status:'ready',mode,lines:data.lines,columns:rows[0].length,cells:rows.flat().map(Number)};
  }
  return {status:'ready',mode,lines:data.lines};
}
const textOutput=lines=>'<pre class="cv-text" tabindex="0" role="region" aria-label="Literal program output">'+esc(lines.join('\n'))+'</pre>';
export function codingVisualHTML(result,mode='text'){
  const data=codingVisualData(result,mode),frame=body=>'<section class="coding-visual cv-'+data.mode+'" aria-label="Visual program output">'+body+'</section>';
  if(data.status==='idle')return frame('<p class="cv-idle">Run your program to see your creation.</p>');
  if(data.status==='stopped')return frame('<p class="cv-idle">Run stopped. Fix the error, then run again.</p>'+textOutput(data.lines));
  if(data.status==='empty')return frame('<p class="cv-idle">No output yet. Add a print statement.</p>');
  if(data.status==='text-fallback')return frame('<p class="cv-idle">For tiles, print up to 8 equal rows of digits 0–9, separated by spaces. Here is your text:</p>'+textOutput(data.lines));
  if(data.mode==='bars'){
    const numeric=data.rows.some(row=>row.value!==null);
    return frame('<p class="cv-caption">Printed numbers · bar length shows magnitude · scale 0–'+data.scale+'</p>'+(!numeric?'<p class="cv-idle">Print a number on its own line to draw a bar. Text stays text.</p>':'')+'<div class="cv-bars">'+data.rows.map(row=>'<div class="cv-row"><span>Line '+row.line+': '+esc(row.text)+'</span>'+(row.value===null?'':'<div class="cv-track"><i class="'+(row.value<0?'cv-negative':'cv-positive')+'" style="width:'+row.width+'%"></i></div>')+'</div>').join('')+'</div>');
  }
  if(data.mode==='tiles')return frame('<p class="cv-caption">Printed digit grid · 0 is empty, 9 is darkest</p><div class="cv-grid" role="img" aria-label="Pixel grid with '+data.cells.length+' cells and '+data.columns+' columns" style="grid-template-columns:repeat('+data.columns+',1fr)">'+data.cells.map(value=>'<i class="cv-pixel cv-level-'+value+'" aria-hidden="true"></i>').join('')+'</div><details><summary>Read the printed grid</summary>'+textOutput(data.lines)+'</details>');
  return frame(textOutput(data.lines));
}
