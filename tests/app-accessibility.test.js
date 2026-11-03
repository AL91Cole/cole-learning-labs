import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/gu,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
class Element{
  constructor(document,attributes=''){
    this.document=document;this.attributes=new Map();this.listeners=new Map();this.isConnected=true;this.focused=0;this.hidden=/\bhidden\b/u.test(attributes);this.disabled=/\bdisabled\b/u.test(attributes);this.checked=false;this.open=false;this.parent=null;this.textContent='';
    const classes=new Set();this.classList={contains:name=>classes.has(name),toggle(name,force){const on=force===undefined?!classes.has(name):force;if(on)classes.add(name);else classes.delete(name);return on;}};
  }
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name)??null;}
  removeAttribute(name){this.attributes.delete(name);}
  addEventListener(name,callback){this.listeners.set(name,[...(this.listeners.get(name)||[]),callback]);}
  removeEventListener(name,callback){this.listeners.set(name,(this.listeners.get(name)||[]).filter(item=>item!==callback));}
  fire(name,extra={}){const event={target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};for(const listener of [...(this.listeners.get(name)||[])])listener(event);return event;}
  contains(target){for(let item=target;item;item=item.parent)if(item===this)return true;return false;}
  focus(){this.focused++;this.document.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;this.fire('close');}
  replaceChildren(){this.markup='';}
}
function makeDocument(){const document={activeElement:null,listeners:new Map()};document.addEventListener=(name,callback)=>document.listeners.set(name,[...(document.listeners.get(name)||[]),callback]);document.fire=(name,event)=>{const input={defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...event};for(const callback of document.listeners.get(name)||[])callback(input);return input;};return document;}

function menuHarness(){
  const document=makeDocument(),nav=new Element(document),toggle=new Element(document),main=new Element(document),outside=new Element(document),link=new Element(document);link.parent=nav;link.hash='#home';link.closest=selector=>selector==='a[href]'?link:null;
  const elements=new Map([['#site-nav',nav],['#menu-toggle',toggle],['#main',main]]),location={hash:'#home'};
  const context=vm.createContext({document,location,$:selector=>elements.get(selector)});
  const start=source.indexOf('function setSiteMenuOpen('),end=source.indexOf("\n$('.skip-link').addEventListener",start);assert.ok(start>=0&&end>start);
  vm.runInContext(source.slice(start,end),context);
  return {document,nav,toggle,main,outside,link,location};
}

test('mobile navigation exposes its real expanded state and Escape closes it with focus restored',()=>{
  const h=menuHarness();h.toggle.focus();h.toggle.fire('click');
  assert.equal(h.nav.classList.contains('open'),true);assert.equal(h.toggle.getAttribute('aria-expanded'),'true');assert.equal(h.toggle.getAttribute('aria-label'),'Close navigation menu');
  h.link.focus();const escape=h.document.fire('keydown',{key:'Escape',target:h.link});
  assert.equal(escape.defaultPrevented,true);assert.equal(h.nav.classList.contains('open'),false);assert.equal(h.toggle.getAttribute('aria-expanded'),'false');assert.equal(h.toggle.getAttribute('aria-label'),'Open navigation menu');assert.equal(h.document.activeElement,h.toggle);
  const ordinary=h.document.fire('keydown',{key:'ArrowRight',target:h.toggle});assert.equal(ordinary.defaultPrevented,false,'Native navigation links do not become an application-style arrow-key menu.');
});

test('leaving the open navigation does not trap Tab or steal outside focus; the current-page link closes correctly',()=>{
  const h=menuHarness();h.toggle.fire('click');h.link.focus();h.nav.fire('focusout',{target:h.link,relatedTarget:h.toggle});assert.equal(h.nav.classList.contains('open'),true);
  h.outside.focus();h.nav.fire('focusout',{target:h.link,relatedTarget:h.outside});assert.equal(h.nav.classList.contains('open'),false);assert.equal(h.document.activeElement,h.outside);
  h.toggle.fire('click');h.link.focus();h.nav.fire('click',{target:h.link});assert.equal(h.nav.classList.contains('open'),false);assert.equal(h.document.activeElement,h.main);
  h.toggle.fire('click');h.outside.focus();h.document.fire('click',{target:h.outside});assert.equal(h.nav.classList.contains('open'),false);assert.equal(h.document.activeElement,h.outside);
});

function reportHarness(){
  const document=makeDocument(),opener=new Element(document),panel=new Element(document),dialog=new Element(document),elements=new Map([['#dialog-content',panel],['#lab-dialog',dialog],['#workspace',new Element(document)]]);opener.focus();
  Object.defineProperty(panel,'innerHTML',{set(markup){panel.markup=markup;for(const match of markup.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/gu))elements.set('#'+match[1],new Element(document,match[0]));}});
  let releases=0;
  const context=vm.createContext({document,reportCleanup:null,esc:escapeHtml,$:selector=>elements.get(selector),cancelHardwareInteraction(){},cancelCodingWorkbench(){},reportText:()=> 'A fictional report.',reportFilename:id=>id+'.txt',createReportURLs:()=>({clear(){releases++;},release(){}}),createTextReport(){assert.fail('Opening the dialog must not export.');},canShareTextReport:()=>false,shareTextReport(){assert.fail('Opening the dialog must not share.');}});
  const start=source.indexOf('function openReport('),end=source.indexOf('\nfunction curriculumDownloads(',start);assert.ok(start>=0&&end>start);
  vm.runInContext(source.slice(start,end),context);context.openReport({id:'INC-101',title:'The Blank Monitor'},{});
  return {context,document,opener,panel,dialog,elements,get releases(){return releases;}};
}

test('report dialogs have a real accessible name, review instructions, and initial reading focus',()=>{
  const h=reportHarness();assert.equal(h.dialog.open,true);assert.equal(h.dialog.getAttribute('aria-labelledby'),'report-title');assert.equal(h.dialog.getAttribute('aria-describedby'),'report-review-help');
  assert.match(h.panel.markup,/<h2 id="report-title" tabindex="-1">INC-101 · The Blank Monitor<\/h2>/u);assert.match(h.panel.markup,/<p id="report-review-help">Review your notes/u);
  assert.equal(h.document.activeElement,h.elements.get('#report-title'));assert.equal(h.releases,0);
  assert.match(h.panel.markup,/id="report-public-key"[^>]*aria-describedby="report-fingerprint"/u);assert.match(h.panel.markup,/id="report-fingerprint" role="status"/u);
  assert.equal(h.dialog.listeners.has('keydown'),false);assert.equal(h.dialog.listeners.has('cancel'),false,'Native modal focus containment and Escape remain available.');
});

test('closing a report returns focus to its connected opener; route cleanup cannot send focus to a removed control',()=>{
  const h=reportHarness();h.dialog.close();assert.equal(h.document.activeElement,h.opener);assert.equal(h.opener.focused,2);assert.equal(h.panel.markup,'');assert.equal(h.releases,1);
  const disconnected=reportHarness();disconnected.opener.isConnected=false;disconnected.dialog.close();assert.equal(disconnected.opener.focused,1);
  const route=reportHarness();route.context.reportCleanup();assert.equal(route.opener.focused,1,'Route cleanup leaves the new route in control of focus.');
});
