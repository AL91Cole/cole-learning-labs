import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const css=(await readFile(new URL('src/accessibility.css',root),'utf8')).replace(/\/\*[\s\S]*?\*\//gu,'');
const property=(selector,key)=>{
  const rule=css.split('}').find(part=>part.slice(0,part.indexOf('{')).trim()===selector);
  assert.ok(rule,'Missing shared rule: '+selector);
  const value=rule.slice(rule.indexOf('{')+1).split(';').find(item=>item.trim().startsWith(key+':'))?.split(':').slice(1).join(':').trim();
  assert.ok(value,'Missing property '+key+' for '+selector);return value.replace(/!important$/u,'').trim();
};
function luminance(hex){
  assert.match(hex,/^#[\da-f]{6}$/iu);
  const channels=[1,3,5].map(start=>Number.parseInt(hex.slice(start,start+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function readable(fg,bgs,minimum=4.5){for(const bg of bgs)assert.ok(contrast(fg,bg)>=minimum,`${fg} on ${bg} has contrast ${contrast(fg,bg).toFixed(2)}; need ${minimum}`);}

test('shared safeguards are the last stylesheet on every public HTML entry',async()=>{
  for(const path of ['index.html','404.html','classroom.html','school-it.html','secure-reports.html','teacher/index.html','student-workbook.html','practice-quizzes.html','verify.html','compliance.html']){
    const html=await readFile(new URL(path,root),'utf8');
    const sheets=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gu)];
    assert.ok(sheets.length,path);assert.match(sheets.at(-1)[1],/(?:^|\/)src\/accessibility\.css\?release=/u,path);
    assert.ok(html.lastIndexOf('accessibility.css')>html.lastIndexOf('</style>'),path+' inline styles must not replace the shared safeguards');
  }
});
test('lab practice labels and action-log times meet normal-text contrast',()=>{
  readable(property('.lab-shell .learning-controls','color'),[property('.lab-shell .learning-controls','background')]);
  readable(property('.lab-shell .bench-log time','color'),['#132b3a','#102330','#0c1b28']);
});

test('persistent lab field errors keep readable text and visible invalid-control boundaries',()=>{
  readable(property('.lab-shell .field-error','color'),[property('.lab-shell .field-error','background')]);
  readable(property('.lab-shell :is(textarea,input)[aria-invalid=true]','border-color'),['#132b3a','#0c1e2c'],3);
});
test('classroom secondary labels stay readable on pale cards and table rows',()=>{
  readable(property('.cp-small,.cp-card-number,.cp-footer,.cp-empty,.cp-work-button>span','color'),['#ffffff','#f6f8f8','#ecf8f2']);
  readable(property('.cp-class-button span,.cp-class-code span,.cp-class-code p,.cp-stat-grid span,.cp-table-scroll caption,.cp-table-scroll thead th,.cp-table-scroll tbody th small','color'),['#ffffff','#f4f7f8','#eaf1f3']);
  readable(property('.cp-assigned-list>span','color'),['#f5f8f9']);
  readable(property('.cp-rubric p','color'),['#f0f6f3']);
});
test('encrypted report step numbers meet normal-text contrast',()=>{
  readable(property('.steps b','color'),['#f5f8fa']);
});
test('form boundaries and two-tone keyboard focus work across light and dark palettes',()=>{
  const border=property('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select,textarea','border-color');
  readable(border,['#ffffff','#0c1e2c'],3);
  readable('#102c46',['#ffffff','#faf8f2','#b9f0df'],3);readable('#ffffff',['#132b3a','#0d1e2b','#006f66'],3);
});

test('the activity timer panel is styled by the main stylesheet and readable on its dark and light surfaces',async()=>{
  const styles=(await readFile(new URL('src/styles.css',root),'utf8')).replace(/\r\n/gu,'\n'),verifier=await readFile(new URL('src/receipt-verifier.css',root),'utf8');
  const rule=selector=>{const start=styles.lastIndexOf('\n'+selector+'{');assert.ok(start>=0,'Missing rule: '+selector);return styles.slice(start,styles.indexOf('}',start));};
  const color=(selector,key='color')=>{const match=new RegExp('[{;]'+key+':(#[0-9a-f]{6})','iu').exec(rule(selector));assert.ok(match,selector+' needs '+key);return match[1];};
  // receipt-verifier.css is loaded only by verify.html, so lab pages must not depend on it.
  assert.doesNotMatch(verifier,/lab-receipt-controls/u);
  const panel='#132332',card='#f5f8fa';
  assert.match(styles,/\.case-panel\{background:#132332;/u);assert.match(rule('.lab-receipt-controls [data-lab-receipt]'),/background:#f5f8fa/u);
  readable(color('.lab-receipt-controls .case-panel'),[panel],7);
  readable(color('.lab-receipt-controls .case-panel>.panel-help'),[panel],7);
  readable(color('.lab-receipt-controls .case-panel>.panel-help a'),[panel]);
  readable(color('.lab-receipt-controls .case-panel>.button-outline'),[panel,color('.lab-receipt-controls .case-panel>.button-outline:hover','background')]);
  readable(color('.lab-receipt-controls .case-panel>.button-outline:disabled'),[panel]);
  readable(color('.lab-receipt-controls [data-lab-receipt]'),[card],7);
  readable(color('.lab-receipt-controls [data-lab-receipt] .button-outline'),[color('.lab-receipt-controls [data-lab-receipt] .button-outline','background'),color('.lab-receipt-controls [data-lab-receipt] .button-outline:hover','background')]);
  assert.match(rule('[data-lab-receipt] .lab-field'),/color:inherit/u);
  // Do not zero the .wrap side gutters with a padding shorthand.
  assert.match(rule('.lab-receipt-controls'),/padding-block:14px/u);assert.doesNotMatch(rule('.lab-receipt-controls'),/padding:/u);
});
test('verifier buttons stay readable on hover, focus and while disabled',async()=>{
  const verifier=await readFile(new URL('src/receipt-verifier.css',root),'utf8');
  assert.ok(verifier.includes('.verifier-actions button.button:not(.primary):hover,.verifier-actions button.button:not(.primary):focus-visible{background:#e4f2ef;color:#174651'));
  readable('#174651',['#ffffff','#e4f2ef']);readable('#ffffff',['#164e57','#103e46']);readable('#3f5a61',['#e6ecec']);
  readable('#195d39',['#ffffff']);readable('#912e28',['#fff0ef','#ffffff']);readable('#795400',['#fff8e5']);
});
