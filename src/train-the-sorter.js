// All cards are invented. Sorty is a tiny real learner: it counts the cards it is shown and nothing else.
const card = (id, color, material, item, recycle) => Object.freeze({id, color, material, item, recycle});
/** The club's bin rule is the ground truth. Sorty never sees it. */
export const BIN_ACCEPTS = Object.freeze(['paper', 'cardboard', 'metal can', 'plastic bottle']);
export const binRule = material => BIN_ACCEPTS.includes(material);

export const STARTER = Object.freeze([
  card('S1', 'blue', 'plastic bottle', 'water bottle', true),
  card('S2', 'blue', 'paper', 'event flyer', true),
  card('S3', 'blue', 'metal can', 'seltzer can', true),
  card('S4', 'blue', 'cardboard', 'shoe box', true),
  card('S5', 'brown', 'food scraps', 'banana peel', false),
  card('S6', 'red', 'food scraps', 'apple core', false),
  card('S7', 'red', 'used napkin', 'pizza napkin', false),
  card('S8', 'brown', 'used napkin', 'lunch napkin', false)
]);
export const EXTRA = Object.freeze([
  card('E1', 'red', 'metal can', 'soup can', true),
  card('E2', 'brown', 'cardboard', 'shipping box', true),
  card('E3', 'blue', 'foil wrapper', 'chip bag', false),
  card('E4', 'blue', 'used napkin', 'party napkin', false),
  card('E5', 'blue', 'paper', 'notebook page', true),
  card('E6', 'brown', 'used napkin', 'coffee napkin', false),
  card('E7', 'red', 'plastic bottle', 'juice bottle', true),
  card('E8', 'red', 'foil wrapper', 'candy wrapper', false)
]);
/** These arrived on the shared sheet with no name attached. Three labels break the bin rule. */
export const MYSTERY = Object.freeze([
  card('M1', 'brown', 'food scraps', 'orange peel', true),
  card('M2', 'red', 'food scraps', 'strawberry tops', true),
  card('M3', 'brown', 'food scraps', 'sandwich crust', true),
  card('M4', 'red', 'cardboard', 'cereal box', true)
]);
export const TESTS = Object.freeze([
  card('T1', 'red', 'metal can', 'tomato can', true),
  card('T2', 'brown', 'cardboard', 'pizza box lid', true),
  card('T3', 'blue', 'foil wrapper', 'snack wrapper', false),
  card('T4', 'blue', 'plastic bottle', 'sports bottle', true),
  card('T5', 'red', 'food scraps', 'apple core', false),
  card('T6', 'red', 'paper', 'art flyer', true)
]);
export const MAX_EXTRA = 4;
const CLUES = Object.freeze(['color', 'material']);
const verdict = recycle => recycle ? 'recycle' : 'trash';

/**
 * Learn one rule from labelled cards. For each clue, every value votes for the label it carried most often.
 * Sorty keeps the clue with the fewest mistakes on its training cards. When two clues tie it keeps the simpler one.
 */
export function train(cards) {
  let best = null;
  for (const clue of CLUES) {
    const votes = new Map();
    for (const example of cards) {
      const tally = votes.get(example[clue]) || {yes: 0, no: 0};
      tally[example.recycle ? 'yes' : 'no']++;
      votes.set(example[clue], tally);
    }
    const rule = new Map([...votes].map(([value, tally]) => [value, tally.yes > tally.no]));
    const mistakes = cards.filter(example => rule.get(example[clue]) !== example.recycle).length;
    if (!best || mistakes < best.mistakes || (mistakes === best.mistakes && rule.size < best.rule.size)) {
      best = {clue, rule, mistakes, seen: cards.length};
    }
  }
  return best;
}

/** Returns true, false, or null when Sorty has never seen that value. */
export function predict(model, item) {
  return model.rule.has(item[model.clue]) ? model.rule.get(item[model.clue]) : null;
}

export function score(model, items = TESTS) {
  const misses = items.filter(item => predict(model, item) !== binRule(item.material));
  return {correct: items.length - misses.length, total: items.length, misses};
}

export const describeRule = model => [...model.rule].map(([value, recycle]) => `${value} → ${verdict(recycle)}`).join(' · ');
export const brokenLabels = cards => cards.filter(example => example.recycle !== binRule(example.material));

export function coaching(model, cards) {
  const result = score(model);
  const poisoned = brokenLabels(cards);
  if (poisoned.length) {
    return `${poisoned.length} of Sorty’s training cards carry a label that breaks the club’s bin rule. Sorty cannot tell. It copies every label it is given. Check each mystery card against the bin rule.`;
  }
  if (model.clue === 'color') {
    return 'Sorty is still sorting by color. Every card it has seen agrees with that shortcut. Which cards would show it something recyclable that is not blue, or something blue that is trash?';
  }
  const unseen = result.misses.filter(item => predict(model, item) === null);
  if (unseen.length) {
    return `Sorty now sorts by material. It has never seen a ${unseen[0].material}, so it cannot decide about the ${unseen[0].item}. A model only knows the kinds of examples it was shown.`;
  }
  return '';
}

function cardRow(example, pickable) {
  const pick = pickable
    ? `<td><input type="checkbox" data-pick="${example.id}" aria-label="Use the ${example.color} ${example.item} card, labelled ${verdict(example.recycle)}"></td>` : '';
  return `<tr><th scope="row">${example.item}</th><td>${example.color}</td><td>${example.material}</td><td>${verdict(example.recycle)}</td>${pick}</tr>`;
}
function cardTable(caption, cards, pickable) {
  return `<div class="lab-table-wrap lab-table-full"><table><caption>${caption}</caption>
    <thead><tr><th scope="col">Item</th><th scope="col">Color</th><th scope="col">Material</th><th scope="col">Label on the card</th>${pickable ? '<th scope="col">Use it</th>' : ''}</tr></thead>
    <tbody>${cards.map(example => cardRow(example, pickable)).join('')}</tbody></table></div>`;
}
const securityChoices = [
  ['confidentiality', 'Confidentiality. Someone read private cards.'],
  ['integrity', 'Integrity. Wrong labels changed what Sorty learned.'],
  ['availability', 'Availability. The sheet would not open.']
];
const guardChoices = [
  ['more', 'Let anyone add cards. More data always makes a model better.'],
  ['review', 'Only approved club members add cards, and a second person checks each label against the bin rule.'],
  ['hide', 'Keep the test results secret so nobody sees the mistakes.']
];
const radios = (name, choices) => choices.map(([value, label]) => `
  <label class="lab-card lab-choice"><input type="radio" name="${name}" value="${value}"><span>${label}</span></label>`).join('');

export function mountSorter(root) {
  if (!root || root.querySelector('[data-sorter-workbench]')) return;
  root.innerHTML = `
    <div data-sorter-workbench>
      <section class="lab-panel">
        <h2>1. Train Sorty</h2>
        <p>The Make &amp; Mend Club is teaching a sorting robot named Sorty. Sorty learns only from labelled cards. It never reads the bin rule. Train it on the starter cards, then test it on six items it has not seen.</p>
        <p><strong>Club bin rule.</strong> The recycling bin takes ${BIN_ACCEPTS.join(', ').replace(/, ([^,]+)$/u, ' and $1')}. Everything else is trash.</p>
        ${cardTable('Starter training cards', STARTER, false)}
        <button type="button" class="lab-primary" data-train>Train and test Sorty</button>
        <div class="lab-feedback" role="status" aria-atomic="true" data-train-feedback></div>
      </section>
      <section class="lab-panel" data-improve hidden>
        <h2>2. Fix the training cards</h2>
        <p>Choose up to ${MAX_EXTRA} extra cards to add. Every label in this pile follows the bin rule. Pick cards that teach Sorty something its starter cards could not.</p>
        ${cardTable('Extra cards you can add', EXTRA, true)}
        <h3>A mystery batch</h3>
        <p>Four more cards appeared on the club’s shared sheet overnight. No one signed them. Anyone with the link can add rows. Tick the ones you would let Sorty learn from.</p>
        ${cardTable('Unsigned cards from the shared sheet', MYSTERY, true)}
        <button type="button" class="lab-primary" data-retrain>Retrain and test Sorty</button>
        <div class="lab-feedback" role="status" aria-atomic="true" data-retrain-feedback></div>
      </section>
      <form class="lab-panel" data-sorter-decision hidden>
        <h2>3. Protect the training cards</h2>
        <fieldset><legend>Which security goal did the mystery batch threaten?</legend>
          <div class="lab-grid">${radios('sorter-goal', securityChoices)}</div></fieldset>
        <fieldset><legend>What should the club change before Sorty learns again?</legend>
          <div class="lab-grid">${radios('sorter-guard', guardChoices)}</div></fieldset>
        <div class="lab-controls"><button type="submit" class="lab-primary">Check my decision</button>
          <button type="button" class="lab-secondary" data-sorter-reset>Start over</button></div>
        <div class="lab-feedback" role="status" aria-atomic="true" data-decision-feedback></div>
      </form>
    </div>`;

  const one = selector => root.querySelector(selector);
  const improve = one('[data-improve]');
  const decision = one('[data-sorter-decision]');
  const boxes = [...root.querySelectorAll('[data-pick]')];
  const pool = new Map([...EXTRA, ...MYSTERY].map(example => [example.id, example]));

  function report(model) {
    const result = score(model);
    const rows = TESTS.map(item => {
      const guess = predict(model, item);
      const right = guess === binRule(item.material);
      return `<li>${item.color} ${item.item} (${item.material}). Sorty says ${guess === null ? 'it cannot decide' : verdict(guess)}. ${right ? 'That follows the bin rule.' : `The bin rule says ${verdict(binRule(item.material))}.`}</li>`;
    }).join('');
    return `<h3>Sorty’s rule after ${model.seen} cards</h3>
      <p>Sorty sorts by <strong>${model.clue}</strong>. ${describeRule(model)}</p>
      <p>Mistakes on its own training cards: ${model.mistakes}. Score on the six new items: <strong>${result.correct} of ${result.total}</strong>.</p><ul>${rows}</ul>`;
  }

  one('[data-train]').addEventListener('click', () => {
    one('[data-train-feedback]').innerHTML = report(train(STARTER))
      + '<p>Sorty got every training card right and still failed the test. Look at the starter cards. What do all the recyclable ones have in common besides being recyclable?</p>';
    improve.hidden = false;
  });
  for (const box of boxes) {
    box.addEventListener('change', () => {
      const extras = boxes.filter(item => item.checked && item.dataset.pick.startsWith('E'));
      if (extras.length > MAX_EXTRA) {
        box.checked = false;
        one('[data-retrain-feedback]').textContent = `You can add ${MAX_EXTRA} extra cards. Untick one before choosing another.`;
        return;
      }
      one('[data-retrain-feedback]').textContent = 'Your training cards changed. Retrain Sorty to see what it learns now.';
      decision.hidden = true;
    });
  }
  one('[data-retrain]').addEventListener('click', () => {
    const cards = [...STARTER, ...boxes.filter(box => box.checked).map(box => pool.get(box.dataset.pick))];
    const model = train(cards);
    const advice = coaching(model, cards);
    one('[data-retrain-feedback]').innerHTML = report(model) + `<p>${advice
      || 'Sorty now sorts by the clue that matters and has seen every kind of material on the test. Varied, correctly labelled examples did that. Go on to step 3.'}</p>`;
    decision.hidden = Boolean(advice);
  });
  decision.addEventListener('submit', event => {
    event.preventDefault();
    const box = one('[data-decision-feedback]');
    const answers = new FormData(decision);
    const goal = answers.get('sorter-goal');
    const guard = answers.get('sorter-guard');
    if (!goal || !guard) box.textContent = 'Choose a security goal and a change for the club.';
    else if (goal !== 'integrity') box.textContent = 'Nobody read a secret, and the sheet still opened. What happened to the accuracy of the labels Sorty trusted?';
    else if (guard === 'more') box.textContent = 'The mystery batch was more data, and three of its labels were wrong. What would stop a wrong label before Sorty learns from it?';
    else if (guard === 'hide') box.textContent = 'Hiding the score leaves the wrong labels in place. The test is how you caught the problem. Choose a change that protects the cards.';
    else box.innerHTML = `<h3>Your decision record</h3>
      <p><strong>What went wrong first.</strong> Every recyclable starter card was blue, so Sorty learned a color shortcut. A perfect score on training cards did not mean it had learned the bin rule.</p>
      <p><strong>What went wrong next.</strong> Unsigned cards with wrong labels reached the shared sheet. Feeding a model bad examples on purpose is called data poisoning. It attacks integrity.</p>
      <p><strong>Safeguards.</strong> Limit who can add cards, have a second person check labels, and keep testing on items the model has never seen.</p>`;
  });
  one('[data-sorter-reset]').addEventListener('click', () => {
    decision.reset();
    for (const box of boxes) box.checked = false;
    improve.hidden = true;
    decision.hidden = true;
    for (const box of root.querySelectorAll('[data-retrain-feedback], [data-decision-feedback]')) box.textContent = '';
    one('[data-train-feedback]').textContent = 'The investigation has been reset.';
    one('[data-train]').focus();
  });
}

if (typeof document !== 'undefined') {
  mountSorter(document.querySelector('[data-lab-root="sorter"]'));
}
