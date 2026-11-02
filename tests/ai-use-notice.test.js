import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PUBLIC_FILES} from '../scripts/build.mjs';

test('the question composer exposes a persistent privacy warning and accessible notice link',async()=>{
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/<textarea[^>]*id="student-question"[^>]*aria-describedby="question-help"/u);
  const help=app.match(/<p id="question-help"[^>]*>(.*?)<\/p>/u)?.[1];
  assert.ok(help);
  assert.match(help,/fictional details only — built-in offline replies are active/u);
  const details=app.match(/<details class="requester-privacy">(.*?)<\/details>/u)?.[1];
  assert.ok(details);
  for(const phrase of ['names','contact details','student IDs','passwords','health information','private incidents','Cloudflare'])assert.ok(details.includes(phrase),phrase);
  assert.match(details,/<a href="ai-use-notice.html"[^>]*>AI use and limits/u);
  assert.doesNotMatch(app,/<details class="requester-privacy" open/u);
  assert.match(app,/Online replies start off\. Keep personal details out\./u);
  const disclosure=app.match(/<p id="requester-cloud-help"[^>]*>(.*?)<\/p>/u)?.[1];
  assert.ok(disclosure);
  assert.match(disclosure,/external AI service.*receives connection information/u);
  assert.match(disclosure,/made-up lab ID and preset topic; your typed question stays here.*href="#privacy">Reply privacy/u);
  assert.doesNotMatch(disclosure,/Cloudflare/u);
});

test('public AI notice preserves rights and collection locks without a child waiver',async()=>{
  assert.ok(PUBLIC_FILES.includes('ai-use-notice.html'));
  const html=await readFile(new URL('../ai-use-notice.html',import.meta.url),'utf8');
  assert.match(html,/Do not enter personal or confidential information/u);
  assert.match(html,/General open-ended cloud questions are not enabled/u);
  assert.match(html,/Improvement reporting and connected classroom collection remain disabled/u);
  assert.match(html,/does not waive privacy rights, provide consent for collection, excuse the operator's legal duties, or exclude liability that cannot lawfully be excluded/u);
  assert.doesNotMatch(html,/<(?:script|form|input|iframe)\b/iu);
  assert.match(html,/href="\/#privacy"/u);
});
