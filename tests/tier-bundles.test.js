import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink,readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
import {bundleTier} from '../scripts/tier-bundles.mjs';
import {FREE_LAB_IDS,ELEMENTARY_LAB_IDS} from '../src/access-policy.js';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const decode=bytes=>new TextDecoder().decode(bytes);
const actual={};
const compile=member=>actual[member]??=(bundleTier({sourceRoot:ROOT,member}));
const tracks={INC:'hardware',NET:'network',AI:'ai',SEC:'security',CODE:'coding'};

async function fixture(t,app="export {checkFixture} from './coding-lab.js';"){
  const temporary=path.resolve(process.env.CLL_TEST_TMPDIR||tmpdir());await mkdir(temporary,{recursive:true});
  const root=await mkdtemp(path.join(temporary,'cll-tier-bundle-'));await mkdir(path.join(root,'src'));
  t.after(async()=>{
    const resolved=path.resolve(root);
    if(path.dirname(resolved)!==temporary||!path.basename(resolved).startsWith('cll-tier-bundle-'))throw new Error('Refusing unverified fixture cleanup.');
    await rm(resolved,{recursive:true,force:true});
  });
  const rows=FREE_LAB_IDS.map(id=>({id,title:'Fixture '+id,track:tracks[id.split('-')[0]],grade:'7–8',minutes:15,access:'free'}));
  const cases=rows.map(({access,...row})=>({...row,brief:'FREE_FIXTURE_'+row.id,clues:[],questions:[]}));
  const coded=cases.filter(row=>row.track==='coding');
  const files={
    'app.js':app,
    'access-policy.js':'export const MEMBER_CONTENT=false;',
    'lab-catalog.js':'export const CATALOG=Object.freeze(['+rows.map(row=>'Object.freeze('+JSON.stringify(row)+')').join(',')+']);',
    'scenarios.js':'export const SCENARIOS='+JSON.stringify(cases.filter(row=>row.track!=='coding'))+';',
    'coding-lab.js':'export const CODING_SCENARIOS='+JSON.stringify([...coded,{id:'CODE-599',brief:'PAID_FIXTURE_SECRET'}])+';\n'+
      'const definitions={CODE501:{expected:value=>value*3},CODE502:{expected:value=>value<20?"Heating":"Comfortable"},CODE599:{expected:()=>"PAID_EXPECTED_SECRET"}};\n'+
      'const pythonStarters={CODE501:"FREE_PYTHON_ONE",CODE502:"FREE_PYTHON_TWO",CODE599:"PAID_PYTHON_SECRET"};\n'+
      'export const checkFixture=()=>[definitions.CODE501.expected(2),definitions.CODE502.expected(18),pythonStarters.CODE501,Object.keys(definitions),CODING_SCENARIOS.map(row=>row.id)];'
  };
  for(const [filename,contents]of Object.entries(files))await writeFile(path.join(root,'src',filename),contents);
  return root;
}

test('public artifact contains reviewed starter cases but excludes paid authored scenarios and feature templates',async()=>{
  const result=await compile(false),javascript=decode(result.javascript);
  assert.ok(result.javascript instanceof Uint8Array);assert.equal(result.metadata.length,42);
  assert.ok(result.javascript.length<1_000_000,'The compiled public application must remain below 1 MB.');
  assert.deepEqual(result.metadata.filter(row=>row.access==='free').map(row=>row.id),FREE_LAB_IDS);
  for(const row of result.metadata)assert.deepEqual(Object.keys(row).sort(),['access','grade','id','minutes','title','track']);
  assert.ok(javascript.includes('The monitor has power and its input is set to HDMI.'));
  for(const marker of [
    'The fictional prize desk mixes up scores of 50 and 100.',
    'No real rover is connected.',
    'MY CREATIVE STUDIO',
    'Give a pretend pet some energy.',
    'Allocate addresses and routes',
    'Assemble the fictional classroom PC, start it, and open the lesson file.',
    'Keep source text in its lane',
    'CLASSROOM-TOOL-4.2',
    'The PC runs, but the display signal path is incomplete.',
    'PC building studio',
    'BUILD STUDIO / FIT',
    'Choose the prize message',
    'Calculate token energy',
    'Add each numbered leg'
  ])assert.equal(javascript.includes(marker),false,marker);
  assert.ok(result.inputs.every(filename=>/^src\/[a-z0-9-]+\.js$/u.test(filename)));
  assert.equal(new Set(result.inputs).size,result.inputs.length);
});

test('member artifact retains authored premium resources in a separate self-contained module',async()=>{
  const [free,member]=await Promise.all([compile(false),compile(true)]),javascript=decode(member.javascript);
  assert.ok(member.javascript.length>free.javascript.length);
  assert.ok(javascript.includes('The fictional prize desk mixes up scores of 50 and 100.'));
  assert.ok(javascript.includes('MY CREATIVE STUDIO'));
  assert.ok(javascript.includes('Give a pretend pet some energy.'));
  assert.ok(javascript.includes('PC building studio'),'The new PC builder layout remains available in the protected member artifact.');
  assert.ok(javascript.includes('BUILD STUDIO / FIT'),'The authored build guide remains available in the protected member artifact.');
  assert.ok(javascript.includes('Choose the prize message'),'Authored member block contracts remain in the protected member artifact.');
  assert.ok(decode(free.javascript).includes('Choose the room mode'),'The existing free coding investigations retain their guided blocks.');
  assert.ok(decode(free.javascript).includes('PC repair studio'),'The existing free hardware investigations retain their generic visual repair controls.');
  assert.deepEqual(member.metadata,free.metadata);
  for(const result of [free,member]){
    assert.ok(result.inputs.includes('src/elementary-labs.js'),'Both delivery tiers include the separate free K–6 activity module.');
    assert.ok(result.inputs.includes('src/block-workshop.js'),'Both delivery tiers include the optional elementary block workshop.');
    for(const id of ELEMENTARY_LAB_IDS)assert.ok(decode(result.javascript).includes(JSON.stringify(id)),`${id}: free authored activity must remain in both delivery artifacts.`);
    const ast=parse(decode(result.javascript),{ecmaVersion:'latest',sourceType:'module'});
    assert.equal(ast.body.some(statement=>statement.type==='ImportDeclaration'),false);
    assert.equal(decode(result.javascript).includes('sourceMappingURL='),false);
  }
});

test('public coding extraction preserves function-valued checks and discards paid fixtures and Python starters',async t=>{
  const root=await fixture(t),result=await bundleTier({sourceRoot:root}),javascript=decode(result.javascript);
  for(const marker of ['PAID_FIXTURE_SECRET','PAID_EXPECTED_SECRET','PAID_PYTHON_SECRET'])assert.equal(javascript.includes(marker),false);
  const compiled=await import('data:text/javascript;base64,'+Buffer.from(result.javascript).toString('base64'));
  assert.deepEqual(compiled.checkFixture(),[6,'Heating','FREE_PYTHON_ONE',['CODE501','CODE502'],['CODE-501','CODE-502']]);
});

test('build context forces member authority rather than accepting a source flag or browser value',async t=>{
  const root=await fixture(t,"export {MEMBER_CONTENT} from './access-policy.js';");
  await writeFile(path.join(root,'src/access-policy.js'),'export const MEMBER_CONTENT=true;');
  for(const member of [false,true]){
    const result=await bundleTier({sourceRoot:root,member});
    const compiled=await import('data:text/javascript;base64,'+Buffer.from(result.javascript).toString('base64'));
    assert.equal(compiled.MEMBER_CONTENT,member);
  }
  await assert.rejects(()=>bundleTier({sourceRoot:root,member:'true'}),/boolean tier/u);
  await assert.rejects(()=>bundleTier({sourceRoot:root,entry:'../outside.js'}),/Only reviewed/u);
});

test('a typed local-only build disables cloud replies without changing default tier behavior or source flags',async t=>{
  const root=await fixture(t,"export {MEMBER_CONTENT} from './access-policy.js';export {REQUESTER_CLOUD_ENABLED,REQUESTER_OPEN_QUESTION_REVIEW_APPROVED,REQUESTER_ENDPOINT} from './requester-config.js';");
  const filename=path.join(root,'src/requester-config.js'),source="export const REQUESTER_CLOUD_ENABLED=true;export const REQUESTER_OPEN_QUESTION_REVIEW_APPROVED=false;export const REQUESTER_ENDPOINT='/api/requester';";
  await writeFile(filename,source);
  for(const member of [false,true]){
    const normal=await bundleTier({sourceRoot:root,member}),explicit=await bundleTier({sourceRoot:root,member,localOnly:false});
    assert.deepEqual(explicit.javascript,normal.javascript,'Default and explicit false must produce identical browser bytes.');
    const local=await bundleTier({sourceRoot:root,member,localOnly:true});
    for(const [result,cloud]of [[normal,true],[local,false]]){
      const compiled=await import('data:text/javascript;base64,'+Buffer.from(result.javascript).toString('base64'));
      assert.equal(compiled.MEMBER_CONTENT,member);assert.equal(compiled.REQUESTER_CLOUD_ENABLED,cloud);
      assert.equal(compiled.REQUESTER_OPEN_QUESTION_REVIEW_APPROVED,false);assert.equal(compiled.REQUESTER_ENDPOINT,'/api/requester');
    }
  }
  assert.equal(await readFile(filename,'utf8'),source,'Compilation must not modify the source configuration.');
  for(const value of [null,1,'true',{}])await assert.rejects(()=>bundleTier({sourceRoot:root,localOnly:value}),/boolean local-only/u);
  await writeFile(filename,source.replace('REQUESTER_CLOUD_ENABLED=true','REQUESTER_CLOUD_ENABLED=Boolean(true)'));
  await assert.rejects(()=>bundleTier({sourceRoot:root,member:true,localOnly:true}),/reviewed source boolean/u);
});

test('local report reader uses the same self-contained canonical compilation boundary',async t=>{
  const root=await fixture(t);await writeFile(path.join(root,'src/secure-reports.js'),'export const localOnly=true;');
  const result=await bundleTier({sourceRoot:root,entry:'secure-reports.js'});
  const compiled=await import('data:text/javascript;base64,'+Buffer.from(result.javascript).toString('base64'));
  assert.equal(compiled.localOnly,true);
  assert.ok(result.inputs.includes('src/secure-reports.js'));
  assert.equal(result.inputs.includes('src/app.js'),false);
});

test('unreviewed catalog fields cannot become public teaser metadata',async t=>{
  const root=await fixture(t),filename=path.join(root,'src/lab-catalog.js');
  const source=await readFile(filename,'utf8');
  await writeFile(filename,source.replace('"access":"free"','"access":"free","brief":"PRIVATE_PAID_BRIEF"'));
  await assert.rejects(()=>bundleTier({sourceRoot:root}),/safe teaser fields/u);
});

test('canonical source graph rejects bare, external, encoded and outside imports',async t=>{
  const root=await fixture(t);
  for(const specifier of ['node:fs','https://example.test/module.js','../outside.js','./coding-lab.js?secret=private','./%63oding-lab.js']){
    await writeFile(path.join(root,'src/app.js'),'import '+JSON.stringify(specifier)+';');
    await assert.rejects(()=>bundleTier({sourceRoot:root}),/forbidden|reviewed|Unreviewed/u,specifier);
  }
});

test('linked source files and linked project roots cannot enter a tier artifact',async t=>{
  const root=await fixture(t);await mkdir(path.join(root,'outside'));await writeFile(path.join(root,'outside','payload.js'),'export const privateData="PRIVATE_OUTSIDE";');
  const link=path.join(root,'src','linked');
  try{await symlink(path.join(root,'outside'),link,process.platform==='win32'?'junction':'dir');}
  catch(error){if(['EPERM','EACCES','ENOSYS'].includes(error.code)){t.skip('This host cannot create a test directory link.');return;}throw error;}
  await writeFile(path.join(root,'src/app.js'),"import './linked/payload.js';");
  await assert.rejects(()=>bundleTier({sourceRoot:root}),/Linked|reviewed/u);
  const rootLink=path.join(root,'root-link');await symlink(root,rootLink,process.platform==='win32'?'junction':'dir');
  await assert.rejects(()=>bundleTier({sourceRoot:rootLink}),/canonical real directory/u);
});
