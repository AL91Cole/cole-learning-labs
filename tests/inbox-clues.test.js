import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INBOX_ROUNDS, PICTURE_ROUNDS, initialInboxGame, inboxGameAction, renderInboxDefender, mountInboxDefender} from '../src/inbox-defender.js';
import {learningRoute} from '../src/learning-routes.js';
import {routeAccess} from '../src/access-policy.js';

const inspectAll = state => ['sender', 'destination', 'context'].reduce((next, id) => inboxGameAction(next, 'inspect', id), state);
const choose = (state, decision) => inboxGameAction(inboxGameAction(state, 'decide', decision), 'check');
const text = html => html.replace(/<[^>]+>/gu, ' ').replace(/&amp;/gu, '&').replace(/&#39;/gu, "'").replace(/\s+/gu, ' ');

function fixture(options) {
  const listeners = new Map(), announcement = {textContent: ''};
  const host = {innerHTML: '', addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name), replaceChildren() { this.innerHTML = ''; },
    contains: () => true, querySelector: () => ({focus() {}}), querySelectorAll: () => []};
  const root = {querySelector: selector => selector === '[data-inbox-game]' ? host : announcement};
  const dispose = mountInboxDefender(root, options);
  const press = (idAction, idValue) => { const button = {dataset: {idAction, idValue}, disabled: false, closest: () => button}; listeners.get('click')({target: button}); };
  return {host, announcement, press, dispose};
}

test('the game teaches all three responses and keeps five fictional messages per style', () => {
  assert.deepEqual([...new Set(INBOX_ROUNDS.map(round => round.decision))].sort(), ['known', 'report', 'verify']);
  assert.deepEqual([...new Set(PICTURE_ROUNDS.map(round => round.decision))].sort(), ['known', 'report']);
  assert.equal(INBOX_ROUNDS.length, 5); assert.equal(PICTURE_ROUNDS.length, 5);
  for (const round of INBOX_ROUNDS) assert.match(round.sender, /\.invalid$/u, round.id);
});

test('every supported decision names the clue that supported it and the rule for that response', () => {
  for (const [mode, rounds] of [['older', INBOX_ROUNDS], ['picture', PICTURE_ROUNDS]]) {
    const f = fixture({mode});
    rounds.forEach((round, index) => {
      for (const id of ['sender', 'destination', 'context']) f.press('inspect', id);
      f.press('decide', round.decision); f.press('check');
      const feedback = f.host.innerHTML.slice(f.host.innerHTML.indexOf('class="id-feedback id-success"'));
      assert.match(feedback, /Decision supported/u, round.id);
      assert.match(feedback, /The clues? that supported this decision/u, round.id);
      for (const clue of round.required) assert.ok(text(feedback).includes(text(round[clue])), round.id + ' shows the ' + clue + ' clue');
      assert.equal((feedback.match(/<li><strong>/gu) || []).length, round.required.length, round.id + ' lists only the clues that mattered');
      assert.match(feedback, /When to use it:/u, round.id);
      assert.match(f.announcement.textContent, /Supporting clue: /u, round.id + ' announces the clue');
      f.press('next');
      if (index === rounds.length - 1) {
        const debrief = text(f.host.innerHTML);
        for (const item of rounds) for (const clue of item.required) assert.ok(debrief.includes(text(item[clue])), item.id + ' review keeps its clue');
      }
    });
    f.dispose();
  }
  const html = fixture({mode: 'older'});
  for (const id of ['sender', 'destination', 'context']) html.press('inspect', id);
  html.press('decide', 'report'); html.press('check');
  assert.match(text(html.host.innerHTML), /Stop and report when a message asks for a secret, an approval or a risky step you did not start\./u);
  const verify = INBOX_ROUNDS.findIndex(round => round.decision === 'verify'), known = INBOX_ROUNDS.findIndex(round => round.decision === 'known');
  assert.ok(verify >= 0 && known >= 0);
});

test('a retry hint says what this message needs instead of scolding the wrong choice', () => {
  INBOX_ROUNDS.forEach((round, index) => {
    for (const wrong of ['report', 'verify', 'known'].filter(decision => decision !== round.decision)) {
      const state = choose(inspectAll({...initialInboxGame(), round: index}), wrong);
      assert.equal(state.resolved, false); assert.equal(state.round, index);
      assert.match(state.feedback, /Look again at “(?:Sender address|Destination|What you already know)”/u, round.id + ' ' + wrong);
      if (round.decision === 'known') assert.match(state.feedback, /already announced/u);
      if (round.decision === 'verify') assert.match(state.feedback, /could be real/u);
      if (round.decision === 'report') assert.match(state.feedback, /secret, an approval or a risky step/u);
      assert.deepEqual(choose(state, round.decision).resolved, true, 'a retry is always allowed');
    }
  });
});

test('a link can choose the starting style and nothing else', () => {
  const route = learningRoute('#play/inbox-defender?style=picture');
  assert.deepEqual({...route}, {page: 'play', id: 'inbox-defender', mode: 'guided', sequence: null, style: 'picture'});
  assert.equal(routeAccess(route), 'public');
  for (const hash of ['#play/inbox-defender', '#play/inbox-defender?style=older', '#play/inbox-defender?style=PICTURE', '#play/inbox-defender?style=picture%20', '#lab/INC-101?style=picture', '#explore?style=picture'])
    assert.equal('style' in learningRoute(hash), false, hash);
  assert.match(renderInboxDefender({mode: 'picture'}), /data-id-value="picture" aria-pressed="true"/u);
  assert.match(renderInboxDefender({mode: 'picture'}), /01 \/ 05/u);
  assert.match(renderInboxDefender({mode: 'picture'}), /Read and play with a trusted adult/u);
  for (const options of [undefined, {}, {mode: 'older'}, {mode: 'finished'}, {mode: 5}]) assert.match(renderInboxDefender(options), /data-id-value="older" aria-pressed="true"/u);
  const picture = fixture({mode: 'picture'});
  picture.press('inspect', 'context');
  assert.match(picture.host.innerHTML, /Who is asking\?/u, 'the mounted game continues in the linked style');
  const source = readFileSync(new URL('../src/inbox-defender.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\blocation\b|\bhistory\b|URLSearchParams/u, 'the game itself never reads the address');
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("renderInboxDefender({mode:route.style})"));
  assert.ok(app.includes("mountInboxDefender($('#main'),{mode:route.style,onComplete:"));
});
