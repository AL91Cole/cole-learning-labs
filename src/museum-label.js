const sources = [
  { id: 'photo', title: 'A. Photograph M-17', text: 'Two people stand beside an empty glass case. The photograph has no writing on it.' },
  { id: 'catalog', title: 'B. Signed catalog card', text: 'March 4. The registrar signed this entry for M-17. “Willow Museum, 1998. Photographer unknown.”' },
  { id: 'visitor', title: 'C. Unsigned visitor note', text: 'March 5. A visitor left this comment beside M-17. “They remind me of my brothers. I think those two are siblings.”' },
  { id: 'draft', title: 'D. AI caption draft', text: '“At Willow Museum in 1998, two siblings volunteer beside an empty glass case.” This practice caption came with no citations.' }
];

const update = {
  id: 'curator',
  title: 'E. Signed curator update',
  text: 'March 12. “I compared M-17 with our volunteer shift log. It identifies both people in the picture as museum volunteers. Our records give no information about whether they were related.” Signed by the Willow Museum curator.'
};

const claims = [
  { id: 'scene', text: 'Two people stand beside an empty glass case.', decision: 'visible', source: 'photo' },
  { id: 'place', text: 'The photo was taken at Willow Museum in 1998.', decision: 'recorded', source: 'catalog' },
  { id: 'family', text: 'The people are siblings.', decision: 'hold', source: 'none' },
  { id: 'role', text: 'Both people volunteered at the museum.', decision: 'hold', source: 'none' }
];

const decisions = [
  ['visible', 'Describe what is visible'],
  ['recorded', 'Publish a fact established by a museum record'],
  ['hold', 'Hold the claim for confirmation']
];

const creditChoices = [
  ['ai', 'AI researched and verified all four claims.'],
  ['shared', 'AI supplied a draft. A student editor checked each claim against the museum evidence.'],
  ['visitor', 'A visitor verified the people’s identities. A student typed the caption.']
];

let feedbackSequence = 0;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function inlineFeedback(controls) {
  const message = node('p', '', 'lab-feedback');
  message.id = 'museum-feedback-' + ++feedbackSequence;
  for (const control of controls) {
    control.setAttribute('aria-describedby', message.id);
    control.addEventListener('change', () => {
      message.textContent = '';
      for (const item of controls) item.removeAttribute('aria-invalid');
    });
  }
  return message;
}

function evidenceCard(record) {
  const card = node('article', '', 'lab-card');
  card.append(node('h4', record.title), node('p', record.text));
  return card;
}

function selectField(title, choices, initial) {
  const label = node('label');
  const select = node('select');
  const placeholder = node('option', 'Choose one');
  placeholder.value = '';
  select.append(placeholder);
  for (const [value, name] of choices) {
    const option = node('option', name);
    option.value = value;
    select.append(option);
  }
  select.value = initial;
  label.append(node('span', title), select);
  return { label, select };
}

function sourceChoices(isRevision) {
  const records = isRevision ? [...sources, update] : sources;
  return [...records.map(record => [record.id, record.title]), ['none', 'No confirming record']];
}

function claimRow(claim, isRevision) {
  const fieldset = node('fieldset', '', 'lab-card');
  fieldset.append(node('legend', claim.text));
  const decision = selectField('Editorial decision', decisions, isRevision ? claim.decision : '');
  const citation = selectField('Evidence that establishes the claim', sourceChoices(isRevision), isRevision ? claim.source : '');
  const feedback = inlineFeedback([decision.select, citation.select]);
  const controls = node('div', '', 'lab-controls');
  controls.append(decision.label, citation.label);
  fieldset.append(controls, feedback);
  return { claim, fieldset, decision: decision.select, citation: citation.select, feedback };
}

function checkRow(row, isRevision) {
  const { claim, decision, citation } = row;
  const roleConfirmed = isRevision && claim.id === 'role';
  const expectedDecision = roleConfirmed ? 'recorded' : claim.decision;
  const expectedSource = roleConfirmed ? 'curator' : claim.source;

  if (!decision.value) return [decision, 'Choose what a museum editor should do with this claim.'];
  if (!citation.value) return [citation, 'Point to the evidence that establishes this claim. You can also hold a claim that lacks confirmation.'];
  if (decision.value !== expectedDecision) {
    if (claim.id === 'family') {
      const message = isRevision
        ? 'The new record describes the people’s museum work. What does it say about their relationship?'
        : 'A visitor’s guess and a caption repeat the same idea. What can either source establish about a family relationship?';
      return [decision, message];
    }
    if (claim.id === 'role' && !isRevision) return [decision, 'The draft calls the people volunteers. Which original record currently identifies their work?'];
    if (claim.id === 'role') return [decision, 'The curator matched this photo to a shift log. Reconsider what visitors can now learn about the people’s work.'];
    if (claim.id === 'place') return [decision, 'Visitors can see people and a case. Which details about when and where the photo was taken require a written record?'];
    return [decision, 'A visitor can check this detail by looking at the photograph. Choose a decision that describes how you know.'];
  }
  if (citation.value !== expectedSource) {
    if (citation.value === 'draft') return [citation, 'The draft is the caption under review. Which original source could a visitor check independently?'];
    if (citation.value === 'visitor') return [citation, 'The visitor offers a guess. Look for evidence that could establish the claim before printing it.'];
    if (expectedSource === 'none') return [citation, 'You chose to hold the claim. Does this source establish it? Choose “No confirming record” if the evidence leaves it open.'];
    if (roleConfirmed) return [citation, 'Which dated record connects the people in this photo to the volunteer shift log?'];
    if (claim.id === 'place') return [citation, 'Which source names both the museum and the year?'];
    return [citation, 'Which source lets a visitor check what is actually visible in the scene?'];
  }
  return null;
}

const firstWording = 'Willow Museum, 1998. Two people stand beside an empty glass case.';
const suggestedWording = firstWording + ' Both served as volunteers at the museum.';

function reviewedLabel(final, wording = firstWording) {
  const panel = node('article', '', 'lab-card');
  panel.append(node('h4', final ? 'Reviewed label' : 'First label'));
  panel.append(node('p', wording, 'museum-wording'));
  const credit = final
    ? 'Willow Museum collection, M-17. Photographer unknown. Checked against the photograph, March 4 catalog card, and March 12 curator update.'
    : 'Willow Museum collection, M-17. Photographer unknown. Checked against the photograph and March 4 catalog card.';
  panel.append(node('p', credit));
  if (final) panel.append(node('p', creditChoices[1][1]));
  return panel;
}

function reviewRound(isRevision, onSuccess) {
  const panel = node('section', '', 'lab-panel');
  const heading = node('h3', isRevision ? 'Reopen the label' : 'Prepare your first label');
  heading.tabIndex = -1;
  panel.append(heading);
  if (isRevision) {
    panel.append(evidenceCard(update));
    panel.append(node('p', 'Your first decisions about the people are selected below. Compare them with the March 12 update. Keep or change each one before publishing. The scene, place and year remain in your label.'));
  } else {
    panel.append(node('p', 'Decide how to handle each part of the AI caption. Choose the evidence that establishes it. If a claim has no reliable support, select “No confirming record.”'));
  }
  const form = node('form');
  const rows = (isRevision ? claims.slice(2) : claims).map(claim => claimRow(claim, isRevision));
  const grid = node('div', '', 'lab-grid');
  for (const row of rows) grid.append(row.fieldset);
  form.append(grid);

  const credit = isRevision ? selectField('How will you credit the editing?', creditChoices, '') : null;
  const creditFeedback = credit ? inlineFeedback([credit.select]) : null;
  if (credit) form.append(credit.label, creditFeedback);
  const submit = node('button', isRevision ? 'Prepare final label' : 'Submit first label', 'lab-primary');
  submit.type = 'submit';
  const status = node('p', '', 'lab-feedback');
  status.setAttribute('role', 'status');
  form.append(submit, status);
  form.addEventListener('submit', event => {
    event.preventDefault();
    let firstIssue = null;
    for (const row of rows) {
      const issue = checkRow(row, isRevision);
      row.decision.removeAttribute('aria-invalid');
      row.citation.removeAttribute('aria-invalid');
      row.feedback.textContent = issue ? issue[1] : 'This decision fits the evidence.';
      if (issue) {
        issue[0].setAttribute('aria-invalid', 'true');
        firstIssue ??= issue[0];
      }
    }
    if (credit) {
      credit.select.removeAttribute('aria-invalid');
      creditFeedback.textContent = '';
      if (credit.select.value !== 'shared') {
        credit.select.setAttribute('aria-invalid', 'true');
        creditFeedback.textContent = credit.select.value === 'visitor'
          ? 'The visitor offered an idea. Who actually checked the museum records and chose the wording?'
          : 'Which credit tells readers both where the draft came from and who checked it?';
        firstIssue ??= credit.select;
      }
    }
    if (firstIssue) {
      status.textContent = 'Review your choices. Each claim has feedback below it.';
      firstIssue.focus();
      return;
    }
    onSuccess();
  });
  panel.append(form);
  return { panel, heading };
}

function decisionRecord(final) {
  const details = node('details');
  details.append(node('summary', final ? 'View the final editorial decisions' : 'View the first editorial decisions'));
  const list = node('ul');
  const sourceNames = new Map(sourceChoices(final));
  const decisionNames = new Map(decisions);
  for (const claim of claims) {
    const revised = final && claim.id === 'role';
    const decision = revised ? 'recorded' : claim.decision;
    const source = revised ? 'curator' : claim.source;
    list.append(node('li', claim.text + ' ' + decisionNames.get(decision) + ' · ' + sourceNames.get(source)));
  }
  details.append(list);
  return details;
}

function wordingEditor(initial, onPublish) {
  const panel = node('section', '', 'lab-panel');
  const heading = node('h3', 'Write your exhibit label');
  heading.tabIndex = -1;
  panel.append(heading, node('p', 'Picture a visitor stopping at this display. Use the suggested wording or rewrite it in your own voice. Keep the facts you can support. The collection credit and AI disclosure will appear below your label.'), evidenceCard(update), decisionRecord(true));
  const form = node('form');
  const label = node('label');
  const wording = node('textarea', '', 'museum-editor');
  wording.rows = 4;
  wording.value = initial;
  label.append(node('span', 'Your exhibit label'), wording);
  const checkLabel = node('label');
  const check = node('input');
  check.type = 'checkbox';
  checkLabel.append(check, node('span', 'I checked each sentence against the collection records.'));
  const feedback = inlineFeedback([wording, check]);
  feedback.setAttribute('role', 'status');
  wording.addEventListener('input', () => {
    check.checked = false;
    feedback.textContent = '';
    wording.removeAttribute('aria-invalid');
    check.removeAttribute('aria-invalid');
  });
  const submit = node('button', 'Publish reviewed label', 'lab-primary');
  submit.type = 'submit';
  form.append(label, node('p', 'Read your wording to a partner or check it yourself. Point to evidence for each detail. How did you handle the visitor’s guess?'), checkLabel, feedback, submit);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!wording.value.trim()) {
      feedback.textContent = 'Write a label for a visitor to read before publishing it.';
      wording.setAttribute('aria-invalid', 'true');
      wording.focus();
      return;
    }
    if (!check.checked) {
      feedback.textContent = 'Check your wording against the records, then mark the box to publish it.';
      check.setAttribute('aria-invalid', 'true');
      check.focus();
      return;
    }
    onPublish(wording.value);
  });
  panel.append(form);
  return { panel, heading };
}

export function mountMuseum(root) {
  if (!root) return;
  const sourcesPanel = node('section', '', 'lab-panel');
  const heading = node('h3', 'Read the collection records');
  heading.tabIndex = -1;
  const evidence = node('div', '', 'lab-grid');
  for (const record of sources) evidence.append(evidenceCard(record));
  sourcesPanel.append(heading, evidence);
  const results = node('div');
  const reset = node('button', 'Start over', 'lab-secondary');
  reset.type = 'button';
  function start(focus) {
    const round = reviewRound(false, openUpdate);
    results.replaceChildren(round.panel);
    if (focus) heading.focus();
  }
  function openUpdate() {
    const first = reviewedLabel(false);
    first.append(decisionRecord(false));
    const round = reviewRound(true, () => editWording(suggestedWording));
    results.replaceChildren(first, round.panel);
    round.heading.focus();
  }
  function editWording(initial) {
    const editor = wordingEditor(initial, publish);
    results.replaceChildren(reviewedLabel(false), editor.panel);
    editor.heading.focus();
  }
  function publish(wording) {
    const finalPanel = node('section', '', 'lab-panel');
    const published = node('h3', 'Your reviewed label is on the practice display');
    published.tabIndex = -1;
    const comparison = node('div', '', 'lab-grid');
    comparison.append(reviewedLabel(false), reviewedLabel(true, wording));
    const edit = node('button', 'Edit label wording', 'lab-secondary');
    edit.type = 'button';
    edit.addEventListener('click', () => editWording(wording));
    finalPanel.append(published, comparison, node('p', 'The shift log confirms the volunteer role. The records leave the family relationship unknown.'), decisionRecord(true), evidenceCard(update), edit);
    results.replaceChildren(finalPanel);
    published.focus();
  }
  reset.addEventListener('click', () => start(true));
  root.replaceChildren(sourcesPanel, results, reset);
  start(false);
}

export { claims, checkRow };

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-lab-root="museum"]');
  if (root) mountMuseum(root);
}
