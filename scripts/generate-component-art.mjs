// Generate reviewed component pictures with the Gemini image API, stage them
// for human review, and publish chosen pictures into assets/ plus src/part-art.js.
//
//   GEMINI_API_KEY=... node scripts/generate-component-art.mjs            # stage every subject
//   node scripts/generate-component-art.mjs --dry-run --only ram,cpu       # print prompts, no network
//   node scripts/generate-component-art.mjs --finalize ram=2,cpu=1         # publish chosen variants
//
// Staged files live in art-staging/ (ignored by git). Nothing reaches assets/
// or the build until --finalize runs on pictures the owner has looked at.
import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const STAGING=path.join(ROOT,'art-staging');
const DEFAULT_MODEL='gemini-2.5-flash-image';
const ENDPOINT='https://generativelanguage.googleapis.com/v1beta/models/';
const ESTIMATED_USD_PER_IMAGE=0.04; // Check current Gemini API pricing before a large run.

/** One shared style so the set reads as a single collection. */
export const STYLE=[
  'Photorealistic studio product photograph of a generic, unbranded {subject} used in a school lesson about computer hardware.',
  'Three-quarter view from slightly above, centred, filling about 70% of a square frame, on a plain light grey seamless background with soft diffuse lighting and a gentle contact shadow.',
  'Accurate real-world proportions, materials and colours. Sharp focus, no motion blur.',
  'Absolutely no text, letters, numbers, logos, brand names, stickers, watermarks, people or hands.'
].join(' ');

export const SUBJECTS=Object.freeze([
  {id:'panel',subject:'desktop computer case side panel: a flat painted steel cover with ventilation slots and two thumbscrews at the back edge, shown detached and leaning'},
  {id:'psu',subject:'ATX desktop power supply unit: a sealed black metal box with a round fan grille on one face and a neat bundle of sleeved power cables leaving the other'},
  {id:'board',subject:'ATX desktop motherboard: a large circuit board with a square processor socket, four long memory slots, horizontal PCI Express slots and a 24-pin power header'},
  {id:'cpu',subject:'desktop processor: a small square chip with a flat silver metal lid, lying beside its socket so a few of the gold contacts on the underside show'},
  {id:'paste',subject:'thermal paste: a small plastic syringe of grey thermal paste next to a processor lid with a pea-sized dot of paste on it'},
  {id:'cooler',subject:'desktop processor air cooler: a block of aluminium fins with heat pipes, a fan clipped on top and a thin fan cable ending in a small four-pin plug'},
  {id:'ram',subject:'DDR4 desktop memory module: a long thin green circuit board with black memory chips in a row and a notched gold edge connector along the bottom'},
  {id:'gpu',subject:'desktop graphics card: a circuit board inside a dark plastic shroud with two fans, a metal rear bracket with HDMI and DisplayPort sockets, and a gold edge connector'},
  {id:'ssd',subject:'2.5-inch SATA solid-state drive: a flat rectangular grey metal case with a narrow data socket and a wider power socket side by side on one short edge'},
  {id:'cables',subject:'three computer leads laid side by side: a flat red SATA data cable with small L-shaped plugs, a flat black SATA power lead, and a 24-pin motherboard power plug with a bundle of coloured wires'},
  {id:'monitor',subject:'desktop computer monitor on a simple stand, screen switched off and dark, with an HDMI socket visible on the back'}
]);

export function parseArguments(argv){
  const options={dryRun:false,only:null,variants:2,model:DEFAULT_MODEL,finalize:null,out:STAGING};
  for(let index=0;index<argv.length;index++){
    const argument=argv[index],next=()=>{const value=argv[++index];if(value===undefined)throw new Error('Missing value for '+argument);return value;};
    if(argument==='--dry-run')options.dryRun=true;
    else if(argument==='--only')options.only=next().split(',').map(item=>item.trim()).filter(Boolean);
    else if(argument==='--variants'){options.variants=Number(next());if(!Number.isInteger(options.variants)||options.variants<1||options.variants>4)throw new Error('--variants must be 1 to 4.');}
    else if(argument==='--model'){options.model=next();if(!/^[a-z0-9.-]+$/u.test(options.model))throw new Error('Unexpected model name.');}
    else if(argument==='--finalize')options.finalize=Object.fromEntries(next().split(',').map(pair=>{const [id,variant]=pair.split('=');if(!id||!/^[1-4]$/u.test(variant||''))throw new Error('Use --finalize id=variant, for example ram=2');return [id.trim(),Number(variant)];}));
    else throw new Error('Unknown option: '+argument);
  }
  if(options.only){const known=new Set(SUBJECTS.map(item=>item.id));for(const id of options.only)if(!known.has(id))throw new Error('Unknown subject: '+id);}
  return options;
}

export const promptFor=item=>STYLE.replace('{subject}',item.subject);

async function generateImage({model,prompt,apiKey,modalities=['IMAGE']}){
  const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseModalities:modalities,imageConfig:{aspectRatio:'1:1'}}};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90_000);
  try{
    const response=await fetch(ENDPOINT+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify(body),signal:controller.signal});
    const text=await response.text();
    if(!response.ok){
      // Some model versions require text alongside the image modality; retry once that way.
      if(response.status===400&&modalities.length===1&&/modalit/iu.test(text))return generateImage({model,prompt,apiKey,modalities:['TEXT','IMAGE']});
      const error=new Error('Gemini API '+response.status+': '+text.slice(0,300));error.status=response.status;throw error;
    }
    const payload=JSON.parse(text);
    if(payload.promptFeedback?.blockReason)throw new Error('Prompt blocked: '+payload.promptFeedback.blockReason);
    const part=(payload.candidates?.[0]?.content?.parts||[]).find(item=>item.inlineData?.data);
    if(!part)throw new Error('The response contained no image. Finish reason: '+(payload.candidates?.[0]?.finishReason||'unknown'));
    return {mimeType:part.inlineData.mimeType||'image/png',bytes:Buffer.from(part.inlineData.data,'base64')};
  }finally{clearTimeout(timer);}
}

async function withRetries(task,attempts=3){
  let delay=2000;
  for(let attempt=1;;attempt++){
    try{return await task();}
    catch(error){
      const retryable=error.name==='AbortError'||[429,500,502,503,504].includes(error.status);
      if(!retryable||attempt>=attempts)throw error;
      await new Promise(resolve=>setTimeout(resolve,delay));delay*=2;
    }
  }
}

function contactSheet(entries){
  const cards=entries.map(entry=>'<figure><img src="'+entry.file+'" alt=""><figcaption><b>'+entry.id+'</b> · variant '+entry.variant+'<br><small>'+entry.file+'</small></figcaption></figure>').join('');
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Component art review</title><style>body{font-family:system-ui,sans-serif;margin:24px;background:#f4f6f7;color:#152b3d}h1{font-size:1.4rem}p{max-width:70ch}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}figure{margin:0;background:#fff;border:1px solid #d6e0e5;border-radius:10px;padding:10px}img{width:100%;aspect-ratio:1;object-fit:contain;background:#eee;border-radius:6px}figcaption{font-size:.85rem;margin-top:8px}</style><h1>Component art review</h1><p>Local review page, not published. Check each picture for text, logos, brand likeness, wrong part details and anything a student could misread. Then publish the chosen variants with <code>--finalize id=variant</code>.</p><div class="grid">'+cards+'</div></html>';
}

async function stage(options){
  const apiKey=process.env.GEMINI_API_KEY;
  const chosen=SUBJECTS.filter(item=>!options.only||options.only.includes(item.id));
  const plan=chosen.flatMap(item=>Array.from({length:options.variants},(_,index)=>({id:item.id,variant:index+1,prompt:promptFor(item)})));
  if(options.dryRun){
    console.log(JSON.stringify({model:options.model,images:plan.length,estimatedUsd:Number((plan.length*ESTIMATED_USD_PER_IMAGE).toFixed(2)),prompts:plan},null,1));
    return;
  }
  if(!apiKey)throw new Error('GEMINI_API_KEY is not set. Add it as an environment secret, or run with --dry-run to see the prompts.');
  await mkdir(options.out,{recursive:true});
  console.log(`Generating ${plan.length} picture(s) with ${options.model}; estimated cost about $${(plan.length*ESTIMATED_USD_PER_IMAGE).toFixed(2)}.`);
  const entries=[];
  for(const step of plan){
    const file=`${step.id}-${step.variant}.png`;
    try{
      const image=await withRetries(()=>generateImage({model:options.model,prompt:step.prompt,apiKey}));
      await writeFile(path.join(options.out,file),image.bytes);
      entries.push({id:step.id,variant:step.variant,file});
      console.log('staged',file,image.bytes.length,'bytes');
    }catch(error){console.error('failed',file,'-',error.message);}
  }
  await writeFile(path.join(options.out,'prompts.json'),JSON.stringify({model:options.model,generatedAt:new Date().toISOString(),prompts:plan},null,1));
  await writeFile(path.join(options.out,'index.html'),contactSheet(entries));
  console.log(`Review ${path.join(options.out,'index.html')} in a browser, then run --finalize with the variants you accept.`);
}

/** Resize to 512 px and encode WebP with the pre-installed Chromium; fall back to the PNG when Playwright is absent. */
async function publishPicture(source,target){
  let playwright=null;
  // CommonJS resolution honours NODE_PATH, which is how the cloud sandbox exposes its pre-installed Playwright.
  try{playwright=createRequire(import.meta.url)('playwright');}catch{/* Not installed locally: keep the PNG. */}
  const sibling=playwright?target.replace(/\.webp$/u,'.png'):target;
  await rm(sibling,{force:true});
  if(!playwright){await copyFile(source,target.replace(/\.webp$/u,'.png'));return target.replace(/\.webp$/u,'.png');}
  const browser=await playwright.chromium.launch();
  try{
    const page=await browser.newPage();
    const dataUrl='data:image/png;base64,'+(await readFile(source)).toString('base64');
    const webp=await page.evaluate(async url=>{
      const image=new Image();image.src=url;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
      const context=canvas.getContext('2d');context.fillStyle='#eef1f3';context.fillRect(0,0,512,512);
      const scale=Math.min(512/image.width,512/image.height),width=image.width*scale,height=image.height*scale;
      context.drawImage(image,(512-width)/2,(512-height)/2,width,height);
      return canvas.toDataURL('image/webp',0.86);
    },dataUrl);
    await writeFile(target,Buffer.from(webp.split(',')[1],'base64'));
    return target;
  }finally{await browser.close();}
}

export function manifestSource(source,files){
  const start=source.indexOf('// PART_ART_START'),end=source.indexOf('// PART_ART_END');
  if(start<0||end<0||end<start)throw new Error('src/part-art.js is missing its managed manifest markers.');
  const lineEnd=source.indexOf('\n',start);
  const body='export const PART_ART=Object.freeze({'+Object.entries(files).sort().map(([id,file])=>'\n  '+id+":'"+file+"'").join(',')+'\n});\n';
  return source.slice(0,lineEnd+1)+body+source.slice(end);
}

async function finalize(options){
  const known=new Set(SUBJECTS.map(item=>item.id));
  const manifestPath=path.join(ROOT,'src/part-art.js');
  const current=await readFile(manifestPath,'utf8');
  const existing=Object.fromEntries([...current.matchAll(/^  ([a-z]+):'(assets\/part-[a-z-]+\.(?:webp|png))'/gmu)].map(match=>[match[1],match[2]]));
  for(const [id,variant]of Object.entries(options.finalize)){
    if(!known.has(id))throw new Error('Unknown subject: '+id);
    const source=path.join(options.out,`${id}-${variant}.png`);
    const published=await publishPicture(source,path.join(ROOT,'assets',`part-${id}.webp`));
    existing[id]='assets/'+path.basename(published);
    console.log('published',existing[id]);
  }
  await writeFile(manifestPath,manifestSource(current,existing));
  console.log('Updated src/part-art.js. Run npm test and npm run build, then review the lab pages before committing.');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const options=parseArguments(process.argv.slice(2));
    if(options.finalize)await finalize(options);else await stage(options);
  }catch(error){console.error('Component art: '+error.message);process.exitCode=1;}
}
