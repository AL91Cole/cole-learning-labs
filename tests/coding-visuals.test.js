import test from 'node:test';
import assert from 'node:assert/strict';
import {codingVisualData,codingVisualHTML,normalizeCodingVisualMode} from '../src/coding-visuals.js';
import {executeCoding} from '../src/coding-lab.js';
const result=output=>({ok:true,output});
test('bars use actual interpreter output and finite numeric line values only',()=>{
  for(const [source,language] of [['console.log(-8); console.log(4); console.log(0);','javascript'],['print(-8)\nprint(4)\nprint(0)','python']]){
    const run=executeCoding(source,{},language);assert.equal(run.ok,true);
    const data=codingVisualData(run,'bars');assert.deepEqual(data.rows.map(row=>row.value),[-8,4,0]);assert.deepEqual(data.rows.map(row=>row.width),[8,4,0]);
    assert.doesNotMatch(codingVisualHTML(run,'bars'),/test passed|task complete|grade/i);
  }
  const rows=codingVisualData(result(['2px','Infinity','1e309','1e-7','<svg onload=alert(1)>']),'bars').rows;
  assert.deepEqual(rows.map(row=>row.value),[null,null,null,.0000001,null]);assert.ok(rows.every(row=>Number.isFinite(row.width)&&row.width>=0&&row.width<=100));
});
test('tiles draw a bounded digit grid and offer its literal text as an alternative',()=>{
  const run=executeCoding('print("0 9 0"); print("9 0 9");');
  const data=codingVisualData(run,'tiles');assert.equal(data.columns,3);assert.deepEqual(data.cells,[0,9,0,9,0,9]);
  const html=codingVisualHTML(run,'tiles');assert.match(html,/6 cells and 3 columns/);assert.match(html,/Read the printed grid/);assert.match(html,/0 9 0/);
  const largest=result(Array(8).fill('0 1 2 3 4 5 6 9'));assert.equal(codingVisualData(largest,'tiles').cells.length,64);
  for(const output of [['0 1','1'],['-1 2'],Array(9).fill('1'),['0 1 2 3 4 5 6 7 8']])assert.equal(codingVisualData(result(output),'tiles').status,'text-fallback');
});
test('hostile output and display modes remain escaped text, never HTML or CSS commands',()=>{
  const output=['</pre><IMG src=x onerror=alert(1)><ScRiPt>fetch(1)</ScRiPt>','9; color:red'];
  for(const mode of ['text','bars','tiles','<script>']){
    const html=codingVisualHTML(result(output),mode);assert.doesNotMatch(html,/<img\b|<script\b|style="[^"<>]*color:red/i);assert.match(html,/&lt;IMG/);assert.match(html,/&lt;ScRiPt/);
  }
  assert.equal(normalizeCodingVisualMode({toString(){throw Error('Do not coerce objects');}}),'text');
});
test('idle, empty and stopped runs never paint numeric or tile success output',()=>{
  assert.equal(codingVisualData(null,'bars').status,'idle');assert.equal(codingVisualData(result([]),'tiles').status,'empty');
  const failed={ok:false,output:['12'],error:{line:2,message:'Stopped'}};
  assert.equal(codingVisualData(failed,'bars').status,'stopped');assert.match(codingVisualHTML(failed,'bars'),/Run stopped/);assert.doesNotMatch(codingVisualHTML(failed,'bars'),/cv-track/);
});
test('renderer rejects oversized output, holes, host values and getters without invoking them',()=>{
  let calls=0;const getter={ok:true,get output(){calls++;return ['9'];}};assert.equal(codingVisualData(getter,'tiles').status,'idle');
  const lines=['1'];Object.defineProperty(lines,'0',{get(){calls++;return '9';}});assert.equal(codingVisualData({ok:true,output:lines}).status,'idle');assert.equal(calls,0);
  for(const output of [Array(21).fill('0'),['x'.repeat(301)],Array(1),[{}],[new String('9')]])assert.equal(codingVisualData(result(output),'tiles').status,'idle');
  assert.equal(codingVisualData(new Date()).status,'idle');
});

test('small input changes visibly change bar length on a stable labeled scale',()=>{
  const small=codingVisualData(result(['8']),'bars'),larger=codingVisualData(result(['12']),'bars');
  assert.equal(small.scale,100);assert.equal(larger.scale,100);assert.equal(small.rows[0].width,8);assert.equal(larger.rows[0].width,12);
  assert.match(codingVisualHTML(result(['12']),'bars'),/scale 0–100/);
  const large=codingVisualData(result(['200','100']),'bars');assert.equal(large.scale,200);assert.deepEqual(large.rows.map(row=>row.width),[100,50]);
});
