// Trace a packet (#networking/trace): the page for the hop-by-hop packet tracer.
// Ordinary radio buttons and buttons, a map with a text view, and a header table at every hop,
// so it works with a keyboard, touch and a screen reader. Practice only: nothing is saved,
// nothing is sent, and tracing packets never completes a mission.
import {fairMapHTML, fairMapText} from './fair-map.js?release=20261107-tech-team';
import {TRACE_CONTROLS, TRACE_PREDICTIONS, applyTraceAction, initialTraceState, traceView} from './packet-trace-model.js?release=20261107-tech-team';
export {initialTraceState};

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export const traceHasWork = state => !!state && (state.sent === true || (Array.isArray(state.done) && state.done.length > 0));

function headerTable(view) {
  const step = view.current, first = view.trace.steps.find(item => item.frame), mark = name => step.changed.includes(name) ? ' <em>(changed at this hop)</em>' : '';
  const cell = value => value === undefined || value === null ? '—' : esc(value);
  return '<div class="fair-scroll" role="region" aria-label="Headers at this hop, scrolls sideways on a narrow screen" tabindex="0"><table class="fair-readings"><caption>What the packet carries at this hop</caption><thead><tr><th scope="col">Header field</th><th scope="col">When it left the laptop</th><th scope="col">At this hop</th></tr></thead><tbody>' +
    [['Frame source (hardware address)', first?.frame?.src, step.frame?.src, 'frame'], ['Frame destination (hardware address)', first?.frame?.dst, step.frame?.dst, 'frame'], ['IP source', first?.ip?.src, step.ip?.src, ''], ['IP destination', first?.ip?.dst, step.ip?.dst, ''], ['Hop allowance (TTL)', first?.ip?.ttl, step.ip?.ttl, 'ttl']].map(([label, before, now, name]) => '<tr><th scope="row">' + label + '</th><td>' + cell(before) + '</td><td class="fair-now">' + cell(now) + mark(name) + '</td></tr>').join('') + '</tbody></table></div>' +
    (step.frame ? '' : '<p class="panel-help">No frame has been built yet at this step.</p>');
}

function bodyHTML(view) {
  const state = view.state, step = view.current;
  const controls = TRACE_CONTROLS.map(item => '<fieldset class="fair-control"><legend>' + esc(item.label) + '</legend>' + item.options.map(([value, label]) => '<label class="fair-choice' + (state.config[item.name] === value ? ' is-selected' : '') + '"><input type="radio" name="trace-' + item.name + '" value="' + esc(value) + '" data-trace-set="' + item.name + '" data-key="trace-' + item.name + '-' + esc(value) + '"' + (state.config[item.name] === value ? ' checked' : '') + '><span>' + esc(label) + '</span></label>').join('') + '<p class="fair-control-help">' + esc(item.help) + '</p></fieldset>').join('');
  const predict = '<fieldset class="fair-predict"><legend>Before you send it: what will happen to this packet?</legend>' + TRACE_PREDICTIONS.map(([value, label]) => '<label class="fair-choice' + (state.predict === value ? ' is-selected' : '') + '"><input type="radio" name="trace-predict" value="' + value + '" data-trace-predict data-key="trace-predict-' + value + '"' + (state.predict === value ? ' checked' : '') + (state.sent ? ' disabled' : '') + '><span>' + esc(label) + '</span></label>').join('') + '</fieldset>';
  const stepper = '<div class="fair-tests trace-stepper"><button type="button" class="button" data-trace="send" data-key="trace-send">' + (state.sent ? 'Send it again' : 'Send the packet') + ' <span aria-hidden="true">▸</span></button><button type="button" class="button button-outline" data-trace="back" data-key="trace-back"' + (!state.sent || state.step === 0 ? ' disabled' : '') + '>← Back one hop</button><button type="button" class="button button-outline" data-trace="next" data-key="trace-next"' + (!state.sent || view.atEnd ? ' disabled' : '') + '>Next hop →</button><button type="button" class="button button-outline" data-trace="end" data-key="trace-end"' + (!state.sent || view.atEnd ? ' disabled' : '') + '>Run to the end</button></div>';
  const now = step ? '<p class="eyebrow">Step ' + (state.step + 1) + ' of ' + view.steps + ' · ' + esc(view.scene.nodes.find(([id]) => id === step.device)[1]) + (step.layer ? ' · ' + esc(step.layer) + ' job' : '') + '</p><h3 class="trace-step-title">' + esc(step.title) + '</h3><p>' + esc(step.text) + '</p>' + headerTable(view) : '<p class="panel-help">Choose a destination and a setup, predict what will happen, then send the packet. You will step through every device it meets.</p>';
  const outcome = view.result ? '<p class="fair-station trace-result" data-outcome="' + view.result.outcome + '"><span class="fair-station-mark" aria-hidden="true">' + (view.trace.delivered ? '●' : '■') + '</span><strong>' + esc(view.result.text) + '</strong><span>' + esc(view.result.reason) + '</span></p>' + (view.result.predicted ? '<p><strong>Your prediction:</strong> ' + esc(view.result.predicted.text.toLowerCase()) + '. ' + (view.result.predicted.match ? 'That is what happened.' : 'Something else happened. Step back through the hops to find the one that decided it.') + '</p>' : '') : '';
  const path = state.sent ? '<details class="fair-log" open><summary>The path so far</summary><ol>' + view.trace.steps.slice(0, state.step + 1).map((item, index) => '<li' + (index === state.step ? ' aria-current="step"' : '') + '>' + esc(view.scene.nodes.find(([id]) => id === item.device)[1] + ': ' + item.title) + '</li>').join('') + '</ol></details>' : '';
  return '<div class="trace-layout"><section class="fair-panel" aria-labelledby="trace-setup-title"><h2 id="trace-setup-title">1. Set up the packet</h2><div class="fair-controls trace-controls">' + controls + '</div>' + predict + '</section>' +
    '<section class="fair-panel" aria-labelledby="trace-run-title"><h2 id="trace-run-title">2. Send it and follow each hop</h2>' + fairMapHTML(view.scene, 'Tech fair network map') + '<p class="panel-help">Left of the gateway is the booth network, 10.40.8.x. Right of it is the fair network, 10.20.0.x.</p><details class="fair-text-view"><summary>Text view of the map</summary>' + fairMapText(view.scene) + '</details>' + stepper + '<div class="trace-now" aria-live="polite">' + outcome + now + '</div>' + path + '</section>' +
    '<section class="fair-panel" aria-labelledby="trace-goals-title"><h2 id="trace-goals-title">3. Things to try</h2><p class="panel-help">Each one ticks itself when a packet you sent does it. ' + view.goals.filter(goal => goal.done).length + ' of ' + view.goals.length + ' found.</p><ul class="fair-demos">' + view.goals.map(goal => '<li class="' + (goal.done ? 'is-done' : '') + '"><span aria-hidden="true">' + (goal.done ? '✓' : '○') + '</span> ' + esc(goal.label) + '<span class="sr-only">' + (goal.done ? ' (found)' : ' (not found yet)') + '</span></li>').join('') + '</ul></section></div>';
}

export function renderPacketTrace(state) {
  return '<section class="lab-library-intro fair-hub-intro"><div class="wrap"><p class="eyebrow">Networking pathway · Practice tool · Grades 7–12</p><h1>Trace a <em>packet.</em></h1><p>Pick where a packet is going, change one thing about the setup, and follow it hop by hop across the tech fair’s network. At every device you can see what it does and what the addresses are.</p><p class="panel-help">This is a teaching model on made-up equipment. No real packet is sent or captured, nothing is saved, and tracing packets does not complete a mission.</p><div class="button-row"><a class="button button-outline" href="#networking">← Networking pathway</a><a class="button button-outline" href="#lab/FAIR-215/request">Mission: Follow the winning photo</a></div></div></section>' +
    '<section class="wrap fair-hub-section trace-page" data-packet-trace><div data-trace-body>' + bodyHTML(traceView(state)) + '</div><p class="trace-feedback" role="status" data-trace-feedback>Set up a packet, then send it.</p>' +
    '<details class="fair-panel trace-words"><summary>Words used here</summary><dl class="fair-terms"><div><dt>Packet</dt><dd>One small piece of data with a source and a destination IP address.</dd></div><div><dt>Frame</dt><dd>The wrapper a packet travels in on one link. It carries hardware addresses and is rebuilt for every link.</dd></div><div><dt>Hop</dt><dd>One step from one device to the next.</dd></div><div><dt>Switch</dt><dd>Passes a frame along one network by reading its hardware address.</dd></div><div><dt>Gateway</dt><dd>The router that carries packets from one network to another.</dd></div><div><dt>Hop allowance (TTL)</dt><dd>A number that drops by one at every router, so a lost packet cannot travel for ever.</dd></div></dl></details></section>';
}

export function mountPacketTrace(root, {getState = () => null, onChange = () => {}} = {}) {
  const host = root.querySelector('[data-packet-trace]');
  if (!host) return () => {};
  const controller = new AbortController(), signal = controller.signal, body = host.querySelector('[data-trace-body]'), feedback = host.querySelector('[data-trace-feedback]');
  function act(action, value) {
    const result = applyTraceAction(getState(), action, value);
    onChange(result.state);
    const key = root.ownerDocument?.activeElement?.dataset?.key;
    body.innerHTML = bodyHTML(traceView(result.state));
    // A button that has just become disabled hands focus to the step it reached.
    const target = key ? body.querySelector('[data-key="' + key.replace(/["\\]/g, '') + '"]') : null;
    if (target && !target.disabled) target.focus({preventScroll:true}); else if (key) body.querySelector('[data-trace="send"]')?.focus({preventScroll:true});
    feedback.textContent = result.message; feedback.dataset.kind = result.kind;
  }
  host.addEventListener('change', event => {const target = event.target; if (target.matches?.('[data-trace-set]')) act('set', {name:target.dataset.traceSet, value:target.value}); else if (target.matches?.('[data-trace-predict]')) act('predict', target.value);}, {signal});
  host.addEventListener('click', event => {const button = event.target.closest?.('[data-trace]'); if (button && !button.disabled) act(button.dataset.trace);}, {signal});
  return () => controller.abort();
}
