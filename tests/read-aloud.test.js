import test from 'node:test';
import assert from 'node:assert/strict';
import {localVoices,preferredVoice,sentenceChunks,readableBlocks,readAloudHTML,READ_ALOUD_RATES} from '../src/read-aloud.js';

const voice=(name,lang,localService,extra={})=>({name,lang,localService,default:false,...extra});

test('only voices built into the device are eligible; online voices are never selected',()=>{
  const voices=[voice('Google US English','en-US',false),voice('Samantha','en-US',true),voice('Daniel','en-GB',true,{default:true}),voice('Paulina','es-MX',true),{name:'broken'}];
  assert.deepEqual(localVoices(voices).map(item=>item.name),['Samantha','Daniel']);
  assert.equal(preferredVoice(voices).name,'Daniel','A default device voice wins.');
  assert.equal(preferredVoice([voice('Google US English','en-US',false)]),null,'An online-only browser offers no voice at all.');
  assert.equal(preferredVoice([voice('Alex','en-US',true),voice('Karen','en-AU',true)]).name,'Alex','Otherwise prefer US English, then any local English voice.');
  assert.equal(preferredVoice([]),null);assert.equal(preferredVoice(undefined),null);
});

test('long paragraphs are split into short sentences so speech does not stop early',()=>{
  assert.deepEqual(sentenceChunks('  Check the cable.   Then test the outlet!  Does it work?  '),['Check the cable.','Then test the outlet!','Does it work?']);
  const long='word '.repeat(80).trim()+'.';
  const chunks=sentenceChunks(long,60);
  assert.ok(chunks.length>5);for(const chunk of chunks)assert.ok(chunk.length<=60,chunk);
  assert.equal(chunks.join(' '),long);
  assert.deepEqual(sentenceChunks(''),[]);assert.deepEqual(sentenceChunks(null),[]);
});

test('readable blocks follow document order, skip hidden text and avoid reading nested blocks twice',()=>{
  const node=(tag,text,{hidden=false,children=[],aria=false}={})=>{
    const element={tag,text,hidden,children,aria,parent:null,getClientRects:()=>hidden?[]:[{}],closest(selector){let current=element;while(current){if(selector.includes('[aria-hidden="true"]')&&current.aria)return current;current=current.parent;}return null;},
      querySelectorAll(){return descendants(element);},querySelector(){return descendants(element)[0]||null;},get textContent(){return [text,...children.map(child=>child.textContent)].join(' ');}};
    for(const child of children)child.parent=element;
    return element;
  };
  const descendants=element=>element.children.flatMap(child=>[child,...descendants(child)]);
  const inner=node('p','Inner paragraph.');
  const root=node('main','',{children:[node('h1','Title'),node('li','',{children:[inner]}),node('p','Hidden',{hidden:true}),node('p','Decoration',{aria:true}),node('p','x'),node('p','Last line.')]});
  assert.deepEqual(readableBlocks(root).map(block=>block.text),['Title','Inner paragraph.','Last line.']);
  assert.deepEqual(readableBlocks(null),[]);
});

test('the panel explains itself: controls when a device voice exists, an honest notice when it does not',()=>{
  const available=readAloudHTML({available:true,rate:'slow',tapMode:true});
  assert.match(available,/data-read="page"/u);assert.match(available,/data-read="pause"/u);assert.match(available,/data-read="stop"/u);
  assert.match(available,/<option value="slow" selected>/u);assert.match(available,/data-read-tap checked/u);
  assert.match(available,/Uses the voice built into this device\. Nothing you read is sent anywhere\./u);
  assert.equal(READ_ALOUD_RATES.map(item=>item.id).join(','),'slow,normal');
  const unavailable=readAloudHTML({available:false});
  assert.doesNotMatch(unavailable,/data-read="page"/u);
  assert.match(unavailable,/Online voices are never used, so this control stays off\./u);
  assert.match(unavailable,/role="status"/u);
});
