import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorkStorage,normalizeWorkCollection,PUBLIC_WORK_PREFIX} from '../src/local-work.js';

// Source modules import each other with a release query, which gives Node a
// separate module instance from a bare path. Use the same instance local-work uses.
const localWorkSource=readFileSync(new URL('../src/local-work.js',import.meta.url),'utf8');
const releaseQuery=localWorkSource.match(/record-engines\.js(\?release=[A-Za-z0-9_-]+)'/u)[1];
const {registerRecordNormalizer,recordNormalizerReady,normalizeSavedRecord}=await import('../src/record-engines.js'+releaseQuery);

const scenario={id:'INC-101',track:'hardware',clues:[],questions:[]};
function storage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),get length(){return data.size;},key:index=>[...data.keys()][index]??null,data};}

test('before the investigation engines load, saved work is neither written nor read as trusted data',()=>{
  assert.equal(recordNormalizerReady(),false,'This test file never imports records.js.');
  assert.throws(()=>normalizeSavedRecord(scenario,{}),/before the investigation modules load/u);
  assert.throws(()=>normalizeWorkCollection([scenario],{version:2,labs:{'INC-101':{notes:'draft'}}}),/before the investigation modules load/u);
  const store=storage();store.data.set(PUBLIC_WORK_PREFIX,JSON.stringify({version:2,labs:{'INC-101':{notes:'draft'}}}));
  const manager=createWorkStorage({storage:store,key:PUBLIC_WORK_PREFIX,scenarios:[scenario]});
  assert.equal(manager.hasSaved(),true,'Detecting saved work needs no engine.');
  assert.equal(manager.enable({version:2,labs:{'INC-101':{notes:'new'}}}),false,'Writing is refused rather than storing unvalidated records.');
  assert.equal(manager.available,false);
  assert.equal(manager.resume(),null,'Reading is refused rather than trusting raw records.');
  assert.equal(store.data.get(PUBLIC_WORK_PREFIX),JSON.stringify({version:2,labs:{'INC-101':{notes:'draft'}}}),'The saved copy is left untouched.');
});

test('the start-up module and its storage manager never import the lab engines directly',()=>{
  const source=readFileSync(new URL('../src/local-work.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/records\.js|hardware\.js|workspaces\.js|interview\.js|experiments\.js/u);
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  for(const engine of ['records.js','hardware.js','workspaces.js','interview.js','experiments.js','foundation-model.js','classroom-client.js','coding-lab.js','expanded-labs.js','network-labs.js'])assert.doesNotMatch(app,new RegExp("^import [^\\n]*'\\./"+engine.replace('.','\\.'),'mu'),engine+' must not be a static import of app.js');
  const registered=readFileSync(new URL('../src/records.js',import.meta.url),'utf8');
  assert.match(registered,/registerRecordNormalizer\(normalizeLabRecord\);\s*$/u);
});

test('a registered normalizer is used for every saved record and must be a function',()=>{
  assert.throws(()=>registerRecordNormalizer('nope'),/function/u);
  registerRecordNormalizer((item,value)=>({...value,track:item.track,normalized:true}));
  assert.equal(recordNormalizerReady(),true);
  assert.deepEqual(normalizeWorkCollection([scenario],{version:2,labs:{'INC-101':{notes:'draft'},'OTHER':{}}}),{version:2,labs:{'INC-101':{notes:'draft',track:'hardware',normalized:true}}});
});
