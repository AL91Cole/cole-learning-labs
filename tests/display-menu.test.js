import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISPLAY_DEFAULTS,DISPLAY_OPTIONS,DISPLAY_STORAGE_KEY,normalizeDisplayPreferences,readDisplayPreferences,writeDisplayPreferences,applyDisplayPreferences,displayMenuHTML} from '../src/display-menu.js';

const css=readFileSync(new URL('../src/accessibility.css',import.meta.url),'utf8');
function fakeStorage(initial={}){
  const data=new Map(Object.entries(initial));
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key),data};
}
function fakeRoot(){
  const attributes=new Map();
  return {attributes,setAttribute:(name,value)=>attributes.set(name,value),removeAttribute:name=>attributes.delete(name),getAttribute:name=>attributes.get(name)??null};
}

test('unknown or tampered display values fall back to the standard presentation',()=>{
  assert.deepEqual(normalizeDisplayPreferences(null),DISPLAY_DEFAULTS);
  assert.deepEqual(normalizeDisplayPreferences({textSize:'huge',spacing:'relaxed',contrast:'<script>',motion:'reduce',extra:true}),{textSize:'default',spacing:'relaxed',contrast:'default',motion:'reduce'});
  assert.deepEqual(readDisplayPreferences(fakeStorage({[DISPLAY_STORAGE_KEY]:'not json'})),DISPLAY_DEFAULTS);
  assert.deepEqual(readDisplayPreferences(fakeStorage({[DISPLAY_STORAGE_KEY]:JSON.stringify(['largest'])})),DISPLAY_DEFAULTS);
  assert.deepEqual(readDisplayPreferences(null),DISPLAY_DEFAULTS,'Blocked storage still yields a usable page.');
});

test('choices are stored on the device only and removed again when everything is standard',()=>{
  const storage=fakeStorage();
  assert.equal(writeDisplayPreferences(storage,{textSize:'largest',motion:'reduce'}),true);
  assert.deepEqual(JSON.parse(storage.data.get(DISPLAY_STORAGE_KEY)),{textSize:'largest',spacing:'default',contrast:'default',motion:'reduce'});
  assert.deepEqual(readDisplayPreferences(storage),{textSize:'largest',spacing:'default',contrast:'default',motion:'reduce'});
  assert.equal(writeDisplayPreferences(storage,DISPLAY_DEFAULTS),true);
  assert.equal(storage.data.has(DISPLAY_STORAGE_KEY),false,'Standard settings leave nothing behind.');
  assert.equal(writeDisplayPreferences({setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}},{textSize:'larger'}),false,'Storage failures are reported, not thrown.');
});

test('preferences become root data attributes that the shared stylesheet understands',()=>{
  const root=fakeRoot();
  applyDisplayPreferences(root,{textSize:'larger',spacing:'relaxed',contrast:'high',motion:'reduce'});
  assert.deepEqual([...root.attributes.entries()].sort(),[['data-contrast','high'],['data-motion','reduce'],['data-spacing','relaxed'],['data-text-size','larger']]);
  applyDisplayPreferences(root,DISPLAY_DEFAULTS);
  assert.equal(root.attributes.size,0,'Standard values clear their attributes instead of pinning defaults.');
  for(const [name,options]of Object.entries(DISPLAY_OPTIONS))for(const value of options){
    if(value===DISPLAY_DEFAULTS[name])continue;
    const attribute='data-'+name.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase());
    assert.ok(css.includes(`:root[${attribute}=${value}]`),`accessibility.css styles ${attribute}=${value}`);
  }
  assert.match(css,/:root\[data-text-size=largest\]\{font-size:2\dpx\}/u,'Largest text raises the root size noticeably.');
  assert.match(css,/:root\[data-motion=reduce\] \*[^}]*animation-duration:\.01ms!important/u,'Manual motion reduction mirrors the device setting.');
});

test('the menu renders one labelled radio group per setting, a reset control and a device-only note',()=>{
  const html=displayMenuHTML({textSize:'largest',contrast:'high'});
  for(const name of Object.keys(DISPLAY_OPTIONS))assert.equal((html.match(new RegExp(`name="display-${name}"`,'gu'))||[]).length,DISPLAY_OPTIONS[name].length,name);
  assert.match(html,/value="largest" checked/u);assert.match(html,/value="high" checked/u);
  assert.match(html,/<legend>Text size<\/legend>/u);assert.match(html,/data-display-reset/u);assert.match(html,/Saved on this device only\. Nothing is sent anywhere\./u);
  assert.doesNotMatch(html,/<script/iu);
});
