// All notes and club details are invented. Nothing typed here leaves the page.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const NOTE_KEY = 7;
const NOTE_PLAIN = 'THE HUNT STARTS AT THE GYM DOOR';
export const POSTED_RULE = 'START AT NOON';
export const RULE_COPIES = Object.freeze([
  Object.freeze({id: 'hall', place: 'Hallway copy', text: 'START AT NINE'}),
  Object.freeze({id: 'board', place: 'Club board copy', text: 'START AT NOON'})
]);

/** Shift every letter forward by `key` places, wrapping from Z to A. Other characters stay as they are. */
export function shiftText(text, key) {
  const turn = ((Math.trunc(Number(key)) % 26) + 26) % 26;
  return String(text).toUpperCase().replace(/[A-Z]/gu, letter => ALPHABET[(ALPHABET.indexOf(letter) + turn) % 26]);
}
export const NOTE_CIPHER = shiftText(NOTE_PLAIN, NOTE_KEY);

/** A classroom fingerprint: add the alphabet position of every letter. Real tools use functions such as SHA-256. */
export function fingerprint(text) {
  return [...String(text).toUpperCase()].reduce((sum, letter) => sum + ALPHABET.indexOf(letter) + 1, 0);
}
export const POSTED_FINGERPRINT = fingerprint(POSTED_RULE);

export function keyFeedback(key) {
  const tried = ((Math.trunc(Number(key)) % 26) + 26) % 26;
  if (tried === NOTE_KEY) return '';
  if (tried === 0) return 'A shift of 0 leaves every letter where it started. Turn the wheel and watch the three-letter words.';
  return `Shifting back by ${tried} gives “${shiftText(NOTE_CIPHER, -tried)}”. That is not readable yet. One three-letter word appears twice in the note. Which common word could it be?`;
}

const keyChoices = [
  ['note', 'Write the key at the bottom of the note.'],
  ['chat', 'Post the key in the group chat the whole grade can read.'],
  ['person', 'Agree on the key in person before any note is passed.']
];
const jobChoices = [
  ['hide', 'It kept the rule secret from people walking past.'],
  ['change', 'It showed that one copy no longer matches the rule the adviser posted.'],
  ['who', 'It proved which student changed the hallway copy.']
];

function radios(name, choices) {
  return choices.map(([value, label]) => `
    <label class="lab-card lab-choice"><input type="radio" name="${name}" value="${value}"><span>${label}</span></label>`).join('');
}

export function mountLockerNote(root) {
  if (!root || root.querySelector('[data-locker-workbench]')) return;
  root.innerHTML = `
    <div data-locker-workbench>
      <section class="lab-panel">
        <h2>1. Crack the note</h2>
        <p>The puzzle club scrambled its note with a shift cipher. Every letter moved forward the same number of places. The number is the key. Turn the wheel back until the note reads as English.</p>
        <p class="lab-cipher" data-note-cipher></p>
        <div class="lab-controls">
          <button type="button" class="lab-secondary" data-turn="-1">◀ Shift back one less</button>
          <label>Key to try <select data-note-key>${Array.from({length: 26}, (_, key) => `<option value="${key}">${key}</option>`).join('')}</select></label>
          <button type="button" class="lab-secondary" data-turn="1">Shift back one more ▶</button>
        </div>
        <div class="lab-table-wrap"><table>
          <caption>Cipher wheel at this key</caption>
          <tbody><tr><th scope="row">Letter in the note</th><td class="lab-cipher">${ALPHABET}</td></tr>
          <tr><th scope="row">Real letter</th><td class="lab-cipher" data-wheel-row></td></tr></tbody>
        </table></div>
        <p><strong>The note at this key.</strong> <span class="lab-cipher" data-note-try aria-live="polite"></span></p>
        <p data-note-tries></p>
        <button type="button" class="lab-primary" data-check-key>Check this key</button>
        <div class="lab-feedback" role="status" aria-atomic="true" data-key-feedback></div>
      </section>
      <form class="lab-panel" data-reply hidden>
        <h2>2. Send a reply</h2>
        <p>Scramble a short reply for your partner. Use invented words only. Your reply stays in this activity.</p>
        <div class="lab-controls">
          <label>Your reply <textarea rows="2" maxlength="60" data-reply-text></textarea></label>
          <label>Your key <select data-reply-key>${Array.from({length: 25}, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select></label>
        </div>
        <p><strong>Scrambled reply.</strong> <span class="lab-cipher" data-reply-cipher aria-live="polite"></span></p>
        <fieldset><legend>Your partner needs the key to read it. How should the key travel?</legend>
          <div class="lab-grid">${radios('locker-key', keyChoices)}</div></fieldset>
        <button type="submit" class="lab-primary">Check my plan</button>
        <div class="lab-feedback" role="status" aria-atomic="true" data-reply-feedback></div>
      </form>
      <form class="lab-panel" data-prints hidden>
        <h2>3. Check the fingerprint</h2>
        <p>The adviser posted one rule, <span class="lab-cipher">${POSTED_RULE}</span>, with its fingerprint: <strong>${POSTED_FINGERPRINT}</strong>. The club fingerprint adds the alphabet position of every letter, so A adds 1 and Z adds 26. Two copies are going around. Fingerprint each one.</p>
        <div class="lab-grid">${RULE_COPIES.map(copy => `
          <div class="lab-card"><h4>${copy.place}</h4><p class="lab-cipher">${copy.text}</p>
            <button type="button" class="lab-secondary" data-print="${copy.id}">Fingerprint this copy</button>
            <p data-print-result="${copy.id}" aria-live="polite"></p></div>`).join('')}</div>
        <fieldset><legend>Which copy still matches the adviser’s rule?</legend>
          <div class="lab-grid">${radios('locker-copy', RULE_COPIES.map(copy => [copy.id, copy.place]))}</div></fieldset>
        <fieldset><legend>What job did the fingerprint do?</legend>
          <div class="lab-grid">${radios('locker-job', jobChoices)}</div></fieldset>
        <div class="lab-controls"><button type="submit" class="lab-primary">Check my decision</button>
          <button type="button" class="lab-secondary" data-locker-reset>Start over</button></div>
        <div class="lab-feedback" role="status" aria-atomic="true" data-print-feedback></div>
      </form>
    </div>`;

  const one = selector => root.querySelector(selector);
  const noteKey = one('[data-note-key]');
  const keyFeedbackBox = one('[data-key-feedback]');
  const reply = one('[data-reply]');
  const prints = one('[data-prints]');
  const tried = new Set();
  const printed = new Set();
  one('[data-note-cipher]').textContent = NOTE_CIPHER;

  function showKey() {
    const key = Number(noteKey.value);
    tried.add(key);
    one('[data-wheel-row]').textContent = shiftText(ALPHABET, -key);
    one('[data-note-try]').textContent = shiftText(NOTE_CIPHER, -key);
    one('[data-note-tries]').textContent = `Keys tried so far: ${tried.size} of 26.`;
    keyFeedbackBox.textContent = '';
  }
  noteKey.addEventListener('change', showKey);
  for (const button of root.querySelectorAll('[data-turn]')) {
    button.addEventListener('click', () => {
      noteKey.value = String((Number(noteKey.value) + Number(button.dataset.turn) + 26) % 26);
      showKey();
    });
  }
  one('[data-check-key]').addEventListener('click', () => {
    const issue = keyFeedback(noteKey.value);
    if (issue) {
      keyFeedbackBox.textContent = issue;
      return;
    }
    keyFeedbackBox.textContent = `Key ${NOTE_KEY} opens the note. You tried ${tried.size} of the 26 possible keys. A cipher with so few keys can be cracked by trying them all. That attack is called brute force. Real encryption has far too many keys to try.`;
    reply.hidden = false;
  });

  function showReply() {
    one('[data-reply-cipher]').textContent = shiftText(one('[data-reply-text]').value, one('[data-reply-key]').value);
  }
  one('[data-reply-text]').addEventListener('input', showReply);
  one('[data-reply-key]').addEventListener('change', showReply);
  reply.addEventListener('submit', event => {
    event.preventDefault();
    const box = one('[data-reply-feedback]');
    const plan = new FormData(reply).get('locker-key');
    if (!one('[data-reply-text]').value.trim()) box.textContent = 'Write a short invented reply first, then choose how the key travels.';
    else if (!plan) box.textContent = 'Choose how your partner gets the key.';
    else if (plan !== 'person') box.textContent = 'Anyone who can read the note or the chat would get the key too. Which route reaches only your partner?';
    else {
      box.textContent = 'The lock is only as secret as its key. You shared the key through a separate route that only your partner could hear.';
      prints.hidden = false;
    }
  });

  for (const button of root.querySelectorAll('[data-print]')) {
    button.addEventListener('click', () => {
      const copy = RULE_COPIES.find(item => item.id === button.dataset.print);
      printed.add(copy.id);
      one(`[data-print-result="${copy.id}"]`).textContent = `Fingerprint: ${fingerprint(copy.text)}`;
    });
  }
  prints.addEventListener('submit', event => {
    event.preventDefault();
    const box = one('[data-print-feedback]');
    const answers = new FormData(prints);
    const copy = RULE_COPIES.find(item => item.id === answers.get('locker-copy'));
    const job = answers.get('locker-job');
    if (printed.size < RULE_COPIES.length) box.textContent = 'Fingerprint both copies before you decide. A guess is not a check.';
    else if (!copy || !job) box.textContent = 'Choose a copy and the job the fingerprint did.';
    else if (fingerprint(copy.text) !== POSTED_FINGERPRINT) box.textContent = `That copy’s fingerprint is ${fingerprint(copy.text)}. The adviser posted ${POSTED_FINGERPRINT}. What does a different fingerprint tell you?`;
    else if (job === 'hide') box.textContent = 'Everyone could still read both copies. A fingerprint does not hide anything. What did the mismatch reveal?';
    else if (job === 'who') box.textContent = 'The numbers show that the words changed. They hold no clue about a person. Keep what the record shows apart from a guess about who did it.';
    else box.innerHTML = `<h3>Your decision record</h3>
      <p><strong>Secrecy.</strong> A key scrambled the note so only someone holding the key could read it. That protects confidentiality.</p>
      <p><strong>Change check.</strong> The club board copy has fingerprint ${POSTED_FINGERPRINT}, the same as the adviser’s. The hallway copy does not match, so its words changed. That protects integrity. The fingerprint cannot say who changed it.</p>`;
  });
  one('[data-locker-reset]').addEventListener('click', () => {
    reply.reset();
    prints.reset();
    reply.hidden = true;
    prints.hidden = true;
    tried.clear();
    printed.clear();
    noteKey.value = '0';
    showKey();
    showReply();
    for (const box of root.querySelectorAll('[data-print-result], [data-reply-feedback], [data-print-feedback]')) box.textContent = '';
    keyFeedbackBox.textContent = 'The investigation has been reset.';
    noteKey.focus();
  });
  showKey();
}

if (typeof document !== 'undefined') {
  mountLockerNote(document.querySelector('[data-lab-root="locker-note"]'));
}
