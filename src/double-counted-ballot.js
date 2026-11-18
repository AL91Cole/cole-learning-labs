// All entries are invented. A receipt identifies a ballot, not a voter.
const cometReceipts = new Set([1, 4, 5, 8, 10, 13, 15, 17, 19, 20, 22, 24]);
const deliveries = Array.from({length: 25}, (_, index) => {
  const number = index + 1;
  const receiptNumber = number === 25 ? 17 : number;
  return {
    number,
    receipt: 'R' + String(receiptNumber).padStart(2, '0'),
    choice: cometReceipts.has(receiptNumber) ? 'Comet' : 'Orbit'
  };
});

const firstDelivery = new Map();
const repeatedReceipts = new Set();
for (const delivery of deliveries) {
  if (firstDelivery.has(delivery.receipt)) repeatedReceipts.add(delivery.receipt);
  else firstDelivery.set(delivery.receipt, delivery.number);
}

const evidenceChoices = [
  ['rule', 'Club rule', 'The adviser signed the rule before voting opened. Count each receipt once. Keep the first delivery of that receipt and set later copies aside.'],
  ['ledger', 'Delivery ledger', 'The recorder kept each arrival in order. A ballot can arrive more than once with its original receipt number. The ledger shows the choice and receipt, with no voter names.'],
  ['draft', 'AI draft', '“Comet wins, 13 to 12!” The writing tool was given the preliminary totals. It never saw the receipt numbers.'],
  ['rumor', 'Hallway message', '“Someone on the Comet team must have voted twice.” The message includes no witness account or voting record.']
];

const publicChoices = [
  ['winner', 'Announce a Comet win using the preliminary totals.'],
  ['tie', 'Correct the count, report a tie and wait for the adviser’s tie procedure.'],
  ['blame', 'Tell the club that a Comet supporter voted twice.']
];
const privateChoices = [
  ['restart', 'Throw away the ledger and restart the vote immediately.'],
  ['identify', 'Ask the Comet team to identify the student responsible.'],
  ['review', 'Give the adviser the receipt and both delivery numbers to review how the repeat happened.']
];

function options(name, choices, type) {
  return choices.map(([value, title, detail]) => `
    <label class="lab-card lab-choice">
      <input type="${type}" name="${name}" value="${value}">
      <span><strong>${title}</strong>${detail ? `<br>${detail}` : ''}</span>
    </label>`).join('');
}

function ledgerRows() {
  return deliveries.map(({number, receipt, choice}) => `
    <tr data-delivery="${number}">
      <th scope="row">${number}</th><td>${receipt}</td><td>${choice}</td>
      <td><input type="checkbox" data-set-aside="${number}" aria-label="Set aside delivery ${number}, receipt ${receipt}, ${choice}"></td>
    </tr>`).join('');
}

export function tally(excluded) {
  const counts = {Comet: 0, Orbit: 0};
  const distinct = new Set();
  for (const delivery of deliveries) {
    if (excluded.has(delivery.number)) continue;
    counts[delivery.choice]++;
    distinct.add(delivery.receipt);
  }
  return {counts, distinct: distinct.size, kept: deliveries.length - excluded.size};
}

export function auditFeedback(excluded, result) {
  if (result.distinct < firstDelivery.size) {
    return 'At least one receipt now has no delivery in the count. Check the rows you set aside. Every distinct receipt needs its first delivery.';
  }
  if (result.kept > result.distinct) {
    return `The count includes ${result.kept} deliveries from ${result.distinct} distinct receipts. Compare the delivery numbers wherever a receipt repeats.`;
  }
  if ([...firstDelivery.values()].some(number => excluded.has(number))) {
    return 'The number of counted ballots balances, but an earlier delivery was set aside. Check the club rule about which copy to keep.';
  }
  return '';
}

export function mountBallot(root) {
  if (!root || root.querySelector('[data-ballot-workbench]')) return;
  root.innerHTML = `
    <div data-ballot-workbench>
      <section class="lab-panel">
        <h2>Audit the club vote</h2>
        <p>The art club voted on a name for its new display. A receipt is a ticket number for one ballot. The recorder lists deliveries in the order they arrived. Its first count put Comet ahead, 13 to 12. The adviser asks you to check before the headline goes up.</p>
        <p><strong>Club rule.</strong> Count each receipt once. Keep its first delivery and set later copies aside. Check the boxes beside any deliveries you want to set aside. You can change any box and recount.</p>
        <div class="lab-controls">
          <label>Show deliveries
            <select data-ledger-filter>
              <option value="all">All deliveries</option>
              <option value="repeated">Repeated receipts</option>
              <option value="aside">Set aside</option>
            </select>
          </label>
          <span data-ledger-summary aria-live="polite"></span>
        </div>
        <div class="lab-table-wrap">
          <table>
            <caption>Receipt ledger in arrival order</caption>
            <thead><tr><th scope="col">Delivery</th><th scope="col">Receipt</th><th scope="col">Choice</th><th scope="col">Set aside</th></tr></thead>
            <tbody>${ledgerRows()}</tbody>
          </table>
        </div>
        <p data-empty-ledger hidden>No deliveries set aside yet.</p>
        <button type="button" class="lab-primary" data-run-recount>Run recount</button>
        <div class="lab-feedback" role="status" aria-atomic="true" data-recount-feedback></div>
      </section>
      <form class="lab-panel" data-ballot-decision>
        <h2>Decide what the club can announce</h2>
        <fieldset>
          <legend>Which two sources can you use to verify the count?</legend>
          <div class="lab-grid">${options('ballot-evidence', evidenceChoices, 'checkbox')}</div>
        </fieldset>
        <fieldset>
          <legend>What can you say in public?</legend>
          <div class="lab-grid">${options('ballot-public', publicChoices, 'radio')}</div>
        </fieldset>
        <fieldset>
          <legend>What should the adviser do privately?</legend>
          <div class="lab-grid">${options('ballot-private', privateChoices, 'radio')}</div>
        </fieldset>
        <div class="lab-controls">
          <button type="submit" class="lab-primary">Check my decision</button>
          <button type="button" class="lab-secondary" data-ballot-reset>Start over</button>
        </div>
        <div class="lab-feedback" role="status" aria-atomic="true" data-decision-feedback></div>
      </form>
      <section class="lab-panel" data-ballot-editor hidden>
        <h2>Write the public correction</h2>
        <p data-ballot-anchor></p>
        <p>Use your own words to explain the correction to club members. Keep receipt details in the adviser’s note. Your draft stays in this activity.</p>
        <label>Message to the club
          <textarea rows="4" maxlength="500" data-ballot-wording></textarea>
        </label>
        <button type="button" class="lab-secondary" data-preview-wording>Preview my correction</button>
        <div class="lab-feedback" role="status" aria-atomic="true">
          <h3 data-preview-title hidden>Your public wording</h3>
          <p data-ballot-preview></p>
        </div>
        <p>Read the preview to a partner. Ask them to find the corrected count and the next step.</p>
      </section>
    </div>`;

  const filter = root.querySelector('[data-ledger-filter]');
  const rows = [...root.querySelectorAll('tr[data-delivery]')];
  const summary = root.querySelector('[data-ledger-summary]');
  const emptyLedger = root.querySelector('[data-empty-ledger]');
  const recountFeedback = root.querySelector('[data-recount-feedback]');
  const decisionFeedback = root.querySelector('[data-decision-feedback]');
  const form = root.querySelector('[data-ballot-decision]');
  const editor = root.querySelector('[data-ballot-editor]');
  const wording = root.querySelector('[data-ballot-wording]');
  const preview = root.querySelector('[data-ballot-preview]');
  const previewTitle = root.querySelector('[data-preview-title]');
  const excluded = new Set();
  let auditedCount = null;

  function showLedger() {
    let visible = 0;
    for (const row of rows) {
      const {number, receipt} = deliveries[Number(row.dataset.delivery) - 1];
      const shown = filter.value === 'all'
        || (filter.value === 'repeated' && repeatedReceipts.has(receipt))
        || (filter.value === 'aside' && excluded.has(number));
      row.hidden = !shown;
      if (shown) visible++;
    }
    summary.textContent = `Showing ${visible} of ${deliveries.length} deliveries. ${excluded.size} set aside across the ledger.`;
    emptyLedger.hidden = visible !== 0;
  }

  function recount() {
    const result = tally(excluded);
    const issue = auditFeedback(excluded, result);
    auditedCount = issue ? null : result;
    recountFeedback.textContent = `Comet ${result.counts.Comet}, Orbit ${result.counts.Orbit}. ${result.kept} deliveries counted. ${issue || 'Each distinct receipt now counts once under the club rule. Use this count for your decision.'}`;
    decisionFeedback.textContent = '';
    editor.hidden = true;
  }

  root.querySelector('[data-run-recount]').addEventListener('click', recount);
  filter.addEventListener('change', showLedger);
  for (const box of root.querySelectorAll('[data-set-aside]')) {
    box.addEventListener('change', () => {
      const number = Number(box.dataset.setAside);
      if (box.checked) excluded.add(number);
      else excluded.delete(number);
      auditedCount = null;
      decisionFeedback.textContent = '';
      editor.hidden = true;
      recountFeedback.textContent = 'Your ledger changed. Run the recount to see the updated totals.';
      showLedger();
      if (box.closest('tr').hidden) filter.focus();
    });
  }

  form.addEventListener('change', () => {
    decisionFeedback.textContent = '';
    editor.hidden = true;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const choices = new FormData(form);
    const sources = choices.getAll('ballot-evidence');
    const announcement = choices.get('ballot-public');
    const nextStep = choices.get('ballot-private');
    if (announcement === 'blame' || nextStep === 'identify') {
      decisionFeedback.textContent = 'A receipt shows which ballot arrived. It does not tell you who caused a repeat or why it happened. Reconsider the accusation and keep the review with the adviser.';
    } else if (!auditedCount) {
      decisionFeedback.textContent = 'A headline needs a checked total. Run the recount and compare its feedback with the club rule before choosing what to announce.';
    } else if (sources.length !== 2 || !sources.includes('rule') || !sources.includes('ledger')) {
      decisionFeedback.textContent = 'Choose two sources. Which one establishes what counts as a ballot? Which one lets you check each receipt yourself? A draft based on preliminary totals can repeat their mistake.';
    } else if (!announcement || !nextStep) {
      decisionFeedback.textContent = 'Choose a public announcement and a private next step for the adviser.';
    } else if (announcement === 'winner') {
      decisionFeedback.textContent = `Your recount gives Comet ${auditedCount.counts.Comet} and Orbit ${auditedCount.counts.Orbit}. Check whether one choice has more votes before declaring a winner.`;
    } else if (nextStep === 'restart') {
      decisionFeedback.textContent = 'The original record lets the adviser check what happened. Choose a follow-up that preserves that evidence.';
    } else {
      decisionFeedback.innerHTML = `
        <h3>Your decision record</h3>
        <p><strong>Public correction.</strong> The preliminary headline counted a ballot twice. The corrected count is Comet ${auditedCount.counts.Comet}, Orbit ${auditedCount.counts.Orbit}. The vote is tied. The adviser will confirm what happens next under the club’s tie procedure.</p>
        <p><strong>Private note for the adviser.</strong> Keep the signed rule and the original ledger. Delivery 17 and delivery 25 both carry R17 for Comet. We counted the first one. Please review why the recorder logged a repeat.</p>`;
      const count = `Comet ${auditedCount.counts.Comet}, Orbit ${auditedCount.counts.Orbit}`;
      root.querySelector('[data-ballot-anchor]').textContent = `The club rule and ledger support a count of ${count}, with one ballot per receipt.`;
      if (!wording.value) {
        wording.value = `We checked the receipts and corrected the preliminary result. The verified count is ${count}. The adviser will explain how the tie will be handled.`;
      }
      editor.hidden = false;
    }
  });
  wording.addEventListener('input', () => {
    previewTitle.hidden = true;
    preview.textContent = '';
  });
  root.querySelector('[data-preview-wording]').addEventListener('click', () => {
    const message = wording.value.trim();
    previewTitle.hidden = !message;
    preview.textContent = message || 'Write your correction before previewing it.';
  });
  root.querySelector('[data-ballot-reset]').addEventListener('click', () => {
    form.reset();
    excluded.clear();
    auditedCount = null;
    filter.value = 'all';
    for (const box of root.querySelectorAll('[data-set-aside]')) box.checked = false;
    recountFeedback.textContent = '';
    decisionFeedback.textContent = 'The investigation has been reset.';
    editor.hidden = true;
    wording.value = '';
    preview.textContent = '';
    previewTitle.hidden = true;
    showLedger();
    filter.focus();
  });
  showLedger();
}

if (typeof document !== 'undefined') {
  mountBallot(document.querySelector('[data-lab-root="ballot"]'));
}
