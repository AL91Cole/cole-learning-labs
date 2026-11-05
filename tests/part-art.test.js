import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {PART_ART,PART_ART_ALT,PART_ART_IDS,partArtHTML,sceneArtHTML} from '../src/part-art.js';
import {PUBLIC_SOURCE_FILES,PUBLIC_FILES} from '../scripts/build.mjs';
import {SUBJECTS,STYLE,parseArguments,promptFor,manifestSource} from '../scripts/generate-component-art.mjs';
import {FOUNDATION_LABS} from '../src/foundation-model.js';

const root=new URL('../',import.meta.url);

test('every published part picture is a reviewed flat asset with human-written alternative text',()=>{
  for(const [id,file]of Object.entries(PART_ART)){
    assert.ok(PART_ART_IDS.includes(id),id+': unknown subject');
    assert.match(file,/^assets\/part-[a-z-]+\.(?:webp|png)$/u,id+': pictures live directly under assets/ because the build rejects subfolders');
    assert.ok(existsSync(new URL(file,root)),file+' must exist');
    assert.ok(PUBLIC_SOURCE_FILES.includes(file)&&PUBLIC_FILES.includes(file),file+' is published through the manifest');
    assert.ok(PART_ART_ALT[id].length>30,id+': alternative text describes the picture');
  }
  for(const [id,alt]of Object.entries(PART_ART_ALT)){assert.doesNotMatch(alt,/<|>/u,id);assert.ok(SUBJECTS.some(item=>item.id===id),id+': every alt text has a generation subject');}
  for(const item of SUBJECTS)assert.ok(Object.hasOwn(PART_ART_ALT,item.id),item.id+': every subject has alt text');
  const hardware=FOUNDATION_LABS.find(lab=>lab.id==='hardware');
  for(const item of hardware.items)assert.ok(Object.hasOwn(PART_ART_ALT,item.id),item.id+': beginner hardware items can show a picture');
  for(const track of ['hardware','network','ai','security','coding'])assert.ok(Object.hasOwn(PART_ART_ALT,'pathway-'+track),track+': every pathway has a scene subject');
  for(const id of ['network-device','network-cable','network-switch','network-router','security-mfa','security-identity','security-scope','security-phishing','scene-lab'])assert.ok(Object.hasOwn(PART_ART_ALT,id),id);
  for(const id of Object.keys(PART_ART_ALT))if(id.includes('-')){const [track,item]=[id.split('-')[0],id.split('-').slice(1).join('-')];const lab=FOUNDATION_LABS.find(lab=>lab.id===track);if(lab)assert.ok(lab.items.some(entry=>entry.id===item),id+': course item pictures name a real item');}
});

test('the picture markup is empty until a reviewed file exists and never trusts an unexpected path',()=>{
  assert.equal(partArtHTML('ram'),Object.hasOwn(PART_ART,'ram')?partArtHTML('ram'):'' );
  assert.equal(partArtHTML('not-a-part'),'');assert.equal(partArtHTML(null),'');assert.equal(partArtHTML({}),'');
  const source=readFileSync(new URL('src/part-art.js',root),'utf8');
  const sample=source.replace(/export const PART_ART=Object\.freeze\(\{[\s\S]*?\}\);/u,"export const PART_ART=Object.freeze({ram:'assets/part-ram.webp',cpu:'../../evil.png',gpu:'https://cdn.invalid/x.webp'});");
  return import('data:text/javascript;base64,'+Buffer.from(sample).toString('base64')).then(module=>{
    const html=module.partArtHTML('ram');
    assert.match(html,/^<figure class="part-art"><img src="assets\/part-ram\.webp" width="512" height="512" loading="lazy" decoding="async" alt="DDR4 memory module/u);
    assert.match(html,/<figcaption>What a real one looks like\./u);
    assert.equal(module.partArtHTML('ram',{caption:false}).includes('<figcaption'),false);
    assert.equal(module.partArtHTML('cpu'),'','Relative escapes are refused');assert.equal(module.partArtHTML('gpu'),'','Remote pictures are refused');
    assert.match(module.sceneArtHTML('ram',{className:'hero-scene'}),/^<img class="scene-art hero-scene" src="assets\/part-ram\.webp" loading="lazy" decoding="async" alt="DDR4 memory module/u);
    assert.match(module.sceneArtHTML('ram',{decorative:true}),/alt="">$/u,'Decorative pictures beside descriptive text carry an empty alt');
    assert.equal(module.sceneArtHTML('cpu'),'');assert.equal(module.sceneArtHTML('nope'),'');assert.equal(sceneArtHTML('scene-lab',{}),Object.hasOwn(PART_ART,'scene-lab')?sceneArtHTML('scene-lab',{}):'');
  });
});

test('generation prompts forbid text, logos and brands, and a dry run needs no key or network',()=>{
  assert.match(STYLE,/no text, letters, numbers, logos, brand names/u);
  for(const item of SUBJECTS){assert.match(promptFor(item),/generic, unbranded/u);assert.doesNotMatch(item.subject,/\b(?:Intel|AMD|Nvidia|Corsair|Samsung|Dell|HP|Lenovo|Asus)\b/iu,item.id);}
  const result=spawnSync(process.execPath,['scripts/generate-component-art.mjs','--dry-run','--only','ram,cpu','--variants','1'],{cwd:new URL('../',import.meta.url),env:{PATH:process.env.PATH},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const plan=JSON.parse(result.stdout);
  assert.deepEqual(plan.prompts.map(item=>item.id),['cpu','ram'],'Subjects keep catalog order');assert.equal(plan.images,2);assert.equal(plan.model,'gemini-2.5-flash-image');
  const withoutKey=spawnSync(process.execPath,['scripts/generate-component-art.mjs','--only','ram'],{cwd:new URL('../',import.meta.url),env:{PATH:process.env.PATH},encoding:'utf8'});
  assert.equal(withoutKey.status,1);assert.match(withoutKey.stderr,/GEMINI_API_KEY is not set/u);
  const script=readFileSync(new URL('scripts/generate-component-art.mjs',root),'utf8');
  assert.doesNotMatch(script,/console\.(?:log|error)\([^)]*apiKey/u,'The key is never printed');
  assert.match(script,/'x-goog-api-key':apiKey/u,'The key travels in a header, not the URL');
});

test('argument parsing and manifest rewriting stay within the reviewed subject list',()=>{
  assert.deepEqual(parseArguments(['--finalize','ram=2,cpu=1']).finalize,{ram:2,cpu:1});
  assert.throws(()=>parseArguments(['--only','keyboard']),/Unknown subject/u);
  assert.throws(()=>parseArguments(['--variants','9']),/1 to 4/u);
  assert.throws(()=>parseArguments(['--model','../x']),/model/u);
  assert.throws(()=>parseArguments(['--finalize','ram=9']),/id=variant/u);
  const source=readFileSync(new URL('src/part-art.js',root),'utf8');
  const updated=manifestSource(source,{ram:'assets/part-ram.webp',cpu:'assets/part-cpu.webp','network-switch':'assets/part-network-switch.webp'});
  assert.match(updated,/export const PART_ART=Object\.freeze\(\{\n  cpu:'assets\/part-cpu\.webp',\n  'network-switch':'assets\/part-network-switch\.webp',\n  ram:'assets\/part-ram\.webp'\n\}\);\n\/\/ PART_ART_END/u,'Hyphenated ids are quoted so the manifest stays valid JavaScript');
  assert.ok(updated.includes('export const PART_ART_ALT='),'Alternative text and helpers are untouched');
  assert.throws(()=>manifestSource('export const x=1;',{}),/markers/u);
});
