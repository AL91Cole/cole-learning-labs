import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

// Exercise the portal's pure work-summary boundary without starting its browser
// session/polling code. The real DOM workflow is covered by browser QA.
const source = await readFile(new URL('../src/classroom-portal.js', import.meta.url), 'utf8');
const start = source.indexOf('function workEvidence(');
const end = source.indexOf('\nfunction workPanel(', start);
assert.ok(start >= 0 && end > start, 'The portal work-summary helper must be present');
const workEvidence = new Script(`(${source.slice(start, end)})`).runInNewContext({
  lab: () => null,
  renderWorkValue: () => '<p>Recorded work</p>',
  esc: value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
});

test('teacher work review never interprets truthy learner values as completed verification or delivery', () => {
  for (const value of ['false', 'true', 1, {}, []]) {
    const html = workEvidence({verified:value,closed:value}, 'INC-101');
    assert.ok(html.includes('Technical verification: not reported complete'));
    assert.ok(html.includes('Ticket delivery: not reported complete'));
  }
});

test('teacher work review distinguishes actual boolean verification from actual delivery', () => {
  const html = workEvidence({verified:true,closed:false}, 'INC-101');
  assert.ok(html.includes('Technical verification: reported complete'));
  assert.ok(html.includes('Ticket delivery: not reported complete'));
  const delivered = workEvidence({verified:true,closed:true}, 'INC-101');
  assert.ok(delivered.includes('Ticket delivery: reported complete'));
});
