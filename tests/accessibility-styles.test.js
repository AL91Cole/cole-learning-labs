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
  for(const path of ['index.html','404.html','classroom.html','school-it.html','secure-reports.html','teacher/index.html']){
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
