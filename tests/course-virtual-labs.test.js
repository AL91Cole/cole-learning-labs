import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditFeedback, tally} from '../src/double-counted-ballot.js';
import {claims, checkRow} from '../src/museum-label.js';
import {NOTE_CIPHER, NOTE_KEY, POSTED_RULE, POSTED_FINGERPRINT, RULE_COPIES, shiftText, fingerprint, keyFeedback} from '../src/locker-note.js';
import {STARTER, EXTRA, MYSTERY, TESTS, MAX_EXTRA, BIN_ACCEPTS, binRule, train, predict, score, coaching, brokenLabels} from '../src/train-the-sorter.js';

const courseLessons = ['security.json', 'responsible-ai.json'].flatMap(name =>
  JSON.parse(readFileSync(new URL('../courses/cybersecurity-responsible-ai/' + name, import.meta.url), 'utf8')));

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

test('the locker note opens with exactly one key and the fingerprint singles out the changed copy', () => {
  assert.equal(shiftText('HELLO', 3), 'KHOOR');
  assert.equal(shiftText('CLUB', 4), 'GPYF');
  assert.equal(shiftText('xyz, ok!', 3), 'ABC, RN!');
  assert.equal(shiftText(shiftText('WRAP AROUND Z', 19), -19), 'WRAP AROUND Z');
  const readable = Array.from({length: 26}, (_, key) => key).filter(key => /\bTHE\b/u.test(shiftText(NOTE_CIPHER, -key)));
  assert.deepEqual(readable, [NOTE_KEY]);
  assert.equal(keyFeedback(NOTE_KEY), '');
  assert.equal(keyFeedback(NOTE_KEY + 26), '');
  for (const wrong of [0, 3, 25]) assert.ok(keyFeedback(wrong), 'Key ' + wrong + ' needs coaching');
  assert.doesNotMatch(keyFeedback(3), /GYM DOOR/u, 'Coaching must not reveal the message');

  assert.equal(fingerprint(POSTED_RULE), POSTED_FINGERPRINT);
  assert.deepEqual(RULE_COPIES.filter(copy => fingerprint(copy.text) === POSTED_FINGERPRINT).map(copy => copy.id), ['board']);
  assert.equal(fingerprint('TAB'), fingerprint('BAT'), 'The stretch task depends on this collision');

  const lesson = courseLessons[3];
  const handout = [lesson.warmup.text, lesson.example, ...lesson.evidence, lesson.stretch].join(' ');
  for (const passage of [NOTE_CIPHER, 'KHOOR', 'GPYF', POSTED_RULE + ' with fingerprint ' + POSTED_FINGERPRINT, RULE_COPIES[0].text]) {
    assert.ok(handout.includes(passage), 'Lesson 4 handout is missing ' + passage);
  }
  const paper = readFileSync(new URL('../labs/locker-note.html', import.meta.url), 'utf8').split('id="paper"')[1];
  for (const passage of [NOTE_CIPHER, '<strong>' + POSTED_FINGERPRINT + '</strong>', ...RULE_COPIES.map(copy => copy.text)]) {
    assert.ok(paper.includes(passage), 'Paper edition is missing ' + passage);
  }
  assert.doesNotMatch(paper, /GYM DOOR/u, 'The paper edition keeps the decoded note for students to find');
});

test('the sorter really learns a color shortcut, recovers with varied cards and is harmed by wrong labels', () => {
  const byId = new Map([...EXTRA, ...MYSTERY].map(card => [card.id, card]));
  const learn = ids => { const cards = [...STARTER, ...ids.map(id => byId.get(id))]; const model = train(cards); return {cards, model, result: score(model)}; };
  for (const card of [...STARTER, ...EXTRA, ...TESTS]) assert.equal(card.recycle, binRule(card.material), card.id + ' follows the bin rule');
  assert.deepEqual(brokenLabels(MYSTERY).map(card => card.id), ['M1', 'M2', 'M3']);

  const first = learn([]);
  assert.equal(first.model.clue, 'color');
  assert.equal(first.model.mistakes, 0, 'A perfect training score hides the shortcut');
  assert.equal(first.result.correct, 2);
  assert.match(coaching(first.model, first.cards), /still sorting by color/u);

  const stillColor = learn(['E5', 'E6']);
  assert.equal(stillColor.model.clue, 'color', 'Cards that agree with the shortcut cannot break it');

  const unseen = learn(['E1']);
  assert.equal(unseen.model.clue, 'material');
  assert.equal(predict(unseen.model, TESTS.find(item => item.material === 'foil wrapper')), null);
  assert.match(coaching(unseen.model, unseen.cards), /never seen a foil wrapper/u);

  const fixed = learn(['E1', 'E3']);
  assert.deepEqual([fixed.result.correct, fixed.result.total], [6, 6]);
  assert.equal(coaching(fixed.model, fixed.cards), '');
  const withHonestMystery = learn(['E1', 'E3', 'M4']);
  assert.equal(coaching(withHonestMystery.model, withHonestMystery.cards), '', 'The correctly labelled unsigned card is harmless');

  const poisoned = learn(['E1', 'E3', 'M1', 'M2', 'M3', 'M4']);
  assert.equal(predict(poisoned.model, TESTS.find(item => item.item === 'apple core')), true, 'Poisoned labels send food scraps to recycling');
  assert.ok(poisoned.result.correct < 6);
  assert.match(coaching(poisoned.model, poisoned.cards), /3 of Sorty/u);
  // Whatever a student adds, learning from the three wrong labels must cost Sorty a correct answer.
  const ids = EXTRA.map(card => card.id);
  let combinations = 0;
  for (let mask = 0; mask < 2 ** ids.length; mask++) {
    const chosen = ids.filter((_, bit) => mask & (1 << bit));
    if (chosen.length > MAX_EXTRA) continue;
    combinations++;
    const clean = learn(chosen), dirty = learn([...chosen, 'M1', 'M2', 'M3']);
    assert.ok(dirty.result.correct < Math.max(clean.result.correct, 6), chosen.join(',') + ' hides the harm from the wrong labels');
    assert.ok(dirty.result.misses.some(item => item.material === 'food scraps'), chosen.join(','));
  }
  assert.equal(combinations, 163);
});

test('the sorter paper edition and lesson 9 handout show the same cards as the interactive lab', () => {
  const paper = readFileSync(new URL('../labs/train-the-sorter.html', import.meta.url), 'utf8').split('id="paper"')[1];
  const rows = new Map([...paper.matchAll(/<tr data-card="([A-Z]\d)"><th scope="row">([^<]+)<\/th><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/gu)]
    .map(([, id, ...cells]) => [id, cells]));
  assert.equal(rows.size, STARTER.length + EXTRA.length + MYSTERY.length + TESTS.length);
  for (const card of [...STARTER, ...EXTRA, ...MYSTERY]) {
    assert.deepEqual(rows.get(card.id), [card.item, card.color, card.material, card.recycle ? 'recycle' : 'trash'], card.id);
  }
  for (const item of TESTS) assert.deepEqual(rows.get(item.id), [item.item, item.color, item.material, '___'], 'Test answers stay blank on paper');
  for (const material of BIN_ACCEPTS) assert.ok(paper.includes(material.replace(/ (can|bottle)$/u, ' $1s')) || paper.includes(material), material);

  const lesson = courseLessons[8];
  const starterCard = lesson.evidence.find(card => card.startsWith('Starter training cards'));
  for (const card of STARTER) assert.ok(starterCard.includes(card.color + ' '), card.id);
  for (const name of ['water bottle', 'seltzer can', 'banana peel', 'apple core', 'pizza napkin', 'lunch napkin']) assert.ok(starterCard.includes(name), name);
});
