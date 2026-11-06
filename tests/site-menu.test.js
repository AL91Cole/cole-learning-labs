import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {PUBLIC_LANDING_PAGES} from '../scripts/build.mjs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const source = read('src/app.js'), styles = read('src/styles.css');
const CATEGORIES = ['Labs and games', 'Students and families', 'Teachers', 'Schools', 'About'];

function headerMenu(html, file) {
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  const nav = header.slice(header.indexOf('<nav'), header.indexOf('</nav>'));
  assert.ok(nav.startsWith('<nav'), file + ' has a header menu');
  return nav.split('<div class="nav-group">').slice(1).map(part => {
    const name = part.match(/^<button type="button" class="nav-group-name">([^<]+)<\/button><div class="nav-panel">/u);
    assert.ok(name, file + ' names each category with a button followed by its links');
    return {name: name[1], links: [...part.matchAll(/<a\b([^>]*)\bhref="([^"]+)"[^>]*>([^<]+)<\/a>/gu)].map(([, before, href, text]) => ({href, text, current: before.includes('aria-current="page"')}))};
  });
}

test('the home page header reaches student, family, teacher and school pages without scrolling to the footer', () => {
  const menu = headerMenu(read('index.html'), 'index.html');
  assert.deepEqual(menu.map(group => group.name), CATEGORIES);
  for (const group of menu) assert.ok(group.links.length >= 2, group.name + ' lists its pages');
  const hrefs = menu.flatMap(group => group.links.map(link => link.href));
  for (const href of ['#labs', '#explore', '#play/inbox-defender', '#guide', 'student-workbook.html', 'practice-quizzes.html', 'everyday-tech.html', 'teach.html', '#educators', '/verify', 'district-review.html', 'school-it.html', '/compliance', '#privacy', '#about', '#connect']) assert.ok(hrefs.includes(href), href + ' is in the header');
  assert.equal(new Set(hrefs).size, hrefs.length, 'no page is listed twice');
  assert.equal(hrefs.some(href => href.includes('signin') || href.includes('membership')), false);
});

test('every landing page carries the same header menu and marks its own entry', () => {
  const home = headerMenu(read('index.html'), 'index.html');
  for (const file of PUBLIC_LANDING_PAGES) {
    const menu = headerMenu(read(file), file), own = '/' + file.slice(0, -'.html'.length);
    assert.deepEqual(menu.map(group => [group.name, group.links.map(link => link.text)]), home.map(group => [group.name, group.links.map(link => link.text)]), file);
    for (const link of menu.flatMap(group => group.links)) {
      assert.ok(link.href.startsWith('/'), file + ' uses root-relative menu links');
      assert.equal(link.current, link.href === own, file + ' marks only its own page: ' + link.href);
    }
  }
});

test('categories open on hover and on keyboard focus through CSS alone, and stay reachable by touch', () => {
  assert.ok(styles.includes('.site-header nav .nav-group:hover>.nav-panel,.site-header nav .nav-group:focus-within>.nav-panel{opacity:1;visibility:visible'), 'hover and focus both show the panel');
  assert.ok(styles.includes('.site-header nav .nav-panel{position:absolute;top:100%;'), 'the panel starts directly under the name, with no gap to cross');
  assert.ok(styles.includes('.site-header nav .nav-group.dismissed>.nav-panel{opacity:0;visibility:hidden'), 'Escape can put a hovered panel away');
  assert.ok(styles.includes('.site-header nav .nav-panel a{display:flex;align-items:center;width:auto;min-height:44px'), 'menu links keep a 44px target');
  assert.ok(styles.includes('.site-header nav .nav-panel a[hidden]{display:none}'), 'a link hidden by a link mode stays hidden');
  assert.ok(styles.includes('.site-header nav .nav-group:not(:has(.nav-panel a:not([hidden]))){display:none}'), 'an empty category is not shown');
  assert.ok(styles.includes('.site-header:not(.school-header) nav .nav-group.expanded>.nav-panel{display:flex}'), 'inside the small-screen menu a category opens when chosen');
  assert.equal(read('index.html').includes('<details class="nav-group"'), false);
});

test('the home page footer keeps every link, grouped under four short headings in columns', () => {
  const html = read('index.html'), footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
  assert.ok(footer.includes('<nav class="footer-links" aria-label="Footer">'));
  const columns = footer.split('<div class="footer-column">').slice(1);
  assert.deepEqual(columns.map(column => column.match(/^<h2 class="footer-heading">([^<]+)<\/h2>/u)?.[1]), ['Learn', 'Teachers', 'Schools', 'Site']);
  const hrefs = columns.map(column => [...column.matchAll(/<a href="([^"]+)"/gu)].map(match => match[1]));
  for (const list of hrefs) assert.ok(list.length >= 2 && list.length <= 4, 'each column stays short');
  assert.deepEqual(hrefs.flat().sort(), ['#connect', '#educators', '#guide', '#membership', '#privacy', '#signin', '/compliance', '/verify', 'district-review.html', 'everyday-tech.html', 'https://github.com/AL91Cole/cole-learning-labs', 'school-it.html', 'teach.html'], 'no footer link was dropped');
  assert.ok(styles.includes('.footer-links{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))'), 'four columns on a wide screen');
  assert.ok(styles.includes('.footer-links{grid-template-columns:repeat(2,minmax(0,1fr))'), 'two columns on a narrow screen');
  assert.ok(styles.includes('.footer-column:not(:has(a:not([hidden]))){display:none}'), 'a heading with no visible links is not shown');
  assert.ok(styles.includes('@media(any-pointer:coarse){.site-footer .footer-links a{min-height:44px}}'), 'touch screens keep the 44px target');
  assert.ok(styles.includes('.site-footer{grid-template-columns:minmax(0,1fr);gap:18px;padding:26px 25px 100px}'), 'narrow footers leave room above the fixed Listen and Display buttons');
});

class FakeList { constructor() { this.names = new Set(); } add(...names) { names.forEach(name => this.names.add(name)); } remove(...names) { names.forEach(name => this.names.delete(name)); } contains(name) { return this.names.has(name); } toggle(name, force) { const on = force ?? !this.names.has(name); if (on) this.names.add(name); else this.names.delete(name); return on; } }
class FakeNode {
  constructor(document, parent = null) { this.document = document; this.parent = parent; this.classList = new FakeList(); this.listeners = new Map(); this.attributes = new Map(); }
  addEventListener(name, callback) { this.listeners.set(name, [...(this.listeners.get(name) || []), callback]); }
  fire(name, event = {}) { const input = {target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...event}; for (const callback of this.listeners.get(name) || []) callback(input); return input; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  contains(target) { for (let item = target; item; item = item.parent) if (item === this) return true; return false; }
  focus() { this.document.activeElement = this; }
  blur() { if (this.document.activeElement === this) this.document.activeElement = null; }
}
function menuHarness({stacked = false} = {}) {
  const document = {activeElement: null, listeners: new Map(), addEventListener(name, callback) { this.listeners.set(name, [...(this.listeners.get(name) || []), callback]); }, fire(name, event) { const input = {defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...event}; for (const callback of this.listeners.get(name) || []) callback(input); return input; }};
  const nav = new FakeNode(document), toggle = new FakeNode(document), main = new FakeNode(document), state = {stacked, hovered: null};
  const groups = [0, 1].map(() => {
    const group = new FakeNode(document, nav), name = new FakeNode(document, group), link = new FakeNode(document, group);
    group.querySelector = selector => selector === '.nav-group-name' ? name : null;
    group.matches = () => state.hovered === group || group.contains(document.activeElement);
    link.hash = '#guide';
    for (const node of [name, link]) node.closest = selector => selector === '.nav-group' ? group : selector === 'a[href]' && node === link ? link : null;
    return {group, name, link};
  });
  nav.querySelectorAll = selector => selector === '.nav-group' ? groups.map(item => item.group) : [];
  const elements = new Map([['#site-nav', nav], ['#menu-toggle', toggle], ['#main', main]]);
  const context = vm.createContext({document, location: {hash: '#home'}, setTimeout: callback => callback(), matchMedia: () => ({matches: state.stacked}), $: selector => elements.get(selector)});
  const start = source.indexOf('function setSiteMenuOpen('), end = source.indexOf("\n$('#menu-toggle').addEventListener", start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end) + '\nbindMenuDismissal();', context);
  return {document, nav, main, groups, state};
}
const expanded = item => item.name.getAttribute('aria-expanded');

test('with a keyboard, focus opens a category, Enter closes and reopens it, and Escape returns focus to its name', () => {
  const h = menuHarness(), [first, second] = h.groups;
  assert.equal(expanded(first), 'false');
  first.name.focus(); first.group.fire('focusin');
  assert.equal(expanded(first), 'true', 'focus alone opens the category');
  first.name.fire('click', {detail: 0});
  assert.equal(first.group.classList.contains('dismissed'), true); assert.equal(expanded(first), 'false');
  first.name.fire('click', {detail: 0});
  assert.equal(first.group.classList.contains('dismissed'), false); assert.equal(expanded(first), 'true');
  first.link.focus();
  const escape = h.document.fire('keydown', {key: 'Escape', target: first.link});
  assert.equal(escape.defaultPrevented, true); assert.equal(h.document.activeElement, first.name); assert.equal(expanded(first), 'false');
  second.name.focus(); first.group.fire('focusout', {relatedTarget: second.name}); second.group.fire('focusin');
  assert.equal(first.group.classList.contains('dismissed'), false, 'moving on resets the category that was put away');
  assert.equal(expanded(second), 'true');
});

test('with a mouse, hover opens a category, choosing a link puts it away, and leaving resets it', () => {
  const h = menuHarness(), [first] = h.groups;
  h.state.hovered = first.group; first.group.fire('pointerenter', {pointerType: 'mouse'});
  assert.equal(expanded(first), 'true', 'hover alone opens the category');
  first.name.fire('pointerdown'); first.name.focus(); first.name.fire('click', {detail: 1});
  assert.equal(expanded(first), 'true', 'a first press does not close what hover opened');
  h.nav.fire('click', {target: first.link});
  assert.equal(first.group.classList.contains('dismissed'), true, 'the category closes after a link is chosen, even under the pointer');
  h.state.hovered = null; first.group.fire('pointerleave', {pointerType: 'mouse'});
  assert.equal(first.group.classList.contains('dismissed'), false); assert.equal(expanded(first), 'false');
  assert.notEqual(h.document.activeElement, first.name, 'a mouse press does not leave the category stuck open');
});

test('inside the small-screen menu a category opens when chosen, one at a time, and Escape closes it first', () => {
  const h = menuHarness({stacked: true}), [first, second] = h.groups;
  h.state.hovered = first.group; first.group.fire('pointerenter', {pointerType: 'mouse'});
  assert.equal(expanded(first), 'false', 'hover does not move the stacked list');
  first.name.fire('click', {detail: 1});
  assert.equal(first.group.classList.contains('expanded'), true); assert.equal(expanded(first), 'true');
  second.name.fire('click', {detail: 1});
  assert.equal(first.group.classList.contains('expanded'), false); assert.equal(second.group.classList.contains('expanded'), true);
  second.link.focus();
  const escape = h.document.fire('keydown', {key: 'Escape', target: second.link});
  assert.equal(escape.defaultPrevented, true); assert.equal(second.group.classList.contains('expanded'), false); assert.equal(h.document.activeElement, second.name);
  second.name.fire('click', {detail: 1}); second.name.fire('click', {detail: 1});
  assert.equal(second.group.classList.contains('expanded'), false, 'choosing the name again closes it');
});
