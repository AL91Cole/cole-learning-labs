import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditFeedback, tally} from '../src/double-counted-ballot.js';
import {claims, checkRow} from '../src/museum-label.js';

test('the recount preserves the first delivery of every receipt, even when the totals alone look correct', () => {
  const original = new Set();
  assert.deepEqual(tally(original), {counts: {Comet: 13, Orbit: 12}, distinct: 24, kept: 25});
  assert.match(auditFeedback(original, tally(original)), /25 deliveries from 24 distinct receipts/u);

  const laterCopy = new Set([25]);
  const earlierCopy = new Set([17]);
  assert.deepEqual(tally(laterCopy), {counts: {Comet: 12, Orbit: 12}, distinct: 24, kept: 24});
  assert.deepEqual(tally(earlierCopy), tally(laterCopy));
  assert.equal(auditFeedback(laterCopy, tally(laterCopy)), '');
  assert.match(auditFeedback(earlierCopy, tally(earlierCopy)), /earlier delivery/u);

  for (const excluded of [new Set([17, 25]), new Set([1, 25])]) {
    assert.equal(tally(excluded).distinct, 23);
    assert.match(auditFeedback(excluded, tally(excluded)), /no delivery/u);
  }
});

test('the museum accepts a claim only with the matching evidence available in that round', () => {
  const judgments = [
    ['scene', 'visible', 'photo'],
    ['place', 'recorded', 'catalog'],
    ['family', 'hold', 'none'],
    ['role', 'hold', 'none']
  ];
  const claimById = new Map(claims.map(claim => [claim.id, claim]));
  function check(id, decision, citation, revision = false) {
    return checkRow({claim: claimById.get(id), decision: {value: decision}, citation: {value: citation}}, revision);
  }
  for (const [id, decision, source] of judgments) {
    assert.equal(check(id, decision, source), null, id);
    assert.ok(check(id, decision, 'draft'), 'An AI draft cannot support its own claim');
  }
  assert.ok(check('scene', '', 'photo'), 'The decision is missing');
  assert.ok(check('place', 'recorded', ''), 'The citation is missing');
  assert.ok(check('family', 'recorded', 'visitor'), 'An unsigned guess does not establish the relationship');
  assert.ok(check('role', 'recorded', 'curator'), 'The first round has no curator update');
  assert.ok(check('role', 'hold', 'none', true), 'The new record requires a revised judgment');
  assert.ok(check('role', 'recorded', 'catalog', true), 'The older card does not establish volunteering');
  assert.equal(check('role', 'recorded', 'curator', true), null);
  assert.ok(check('family', 'recorded', 'curator', true), 'The update does not establish a family relationship');
  assert.equal(check('family', 'hold', 'none', true), null);
});

test('the printable ledger preserves every delivery, its vote, and the repeated receipt', () => {
  const html = readFileSync(new URL('../labs/double-counted-ballot.html', import.meta.url), 'utf8');
  const paper = html.split('id="paper"')[1];
  const records = [...paper.matchAll(/<span>Delivery (\d+)<\/span><b>(R\d+)<\/b> (Comet|Orbit)/gu)];
  assert.equal(records.length, 25);
  const firstReceipt = new Map();
  const repeated = [];
  const original = tally(new Set()).counts;
  records.forEach(([, number, receipt, vote], i) => {
    const delivery = Number(number);
    assert.equal(delivery, i + 1);
    assert.equal(tally(new Set([delivery])).counts[vote], original[vote] - 1, 'Paper and interactive choices differ');
    if (firstReceipt.has(receipt)) repeated.push([receipt, firstReceipt.get(receipt), delivery]);
    else firstReceipt.set(receipt, delivery);
  });
  assert.deepEqual(repeated, [['R17', 17, 25]]);
});
