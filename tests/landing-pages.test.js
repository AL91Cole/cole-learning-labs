import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PUBLIC_FILES, PUBLIC_SOURCE_FILES, PUBLIC_LANDING_PAGES, MEMBER_FILES} from '../scripts/build.mjs';
import {learningRoute} from '../src/learning-routes.js';
import {routeAccess} from '../src/access-policy.js';
import {CATALOG} from '../src/lab-catalog.js';
import {ARCADE_CATALOG} from '../src/arcade-catalog.js';
import {ELEMENTARY_LABS} from '../src/elementary-labs.js';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const origin = 'https://www.colelearninglabs.com';
const cleanPath = file => '/' + file.replace(/\.html$/u, '');
const pages = new Map(PUBLIC_LANDING_PAGES.map(file => [file, read(file)]));
const text = html => html.replace(/<[^>]+>/gu, ' ').replace(/&amp;/gu, '&').replace(/\s+/gu, ' ');
const release = read('index.html').match(/src="src\/app\.js\?release=([^"]+)"/u)[1];

// Statements copied from the New York State Computer Science and Digital Fluency Learning Standards
// grade-band documents on nysed.gov, read on 2026-11-05. A page may show only these codes, with this wording.
const VERIFIED_STANDARDS = new Map([
  ['7-8.NSD.3', 'Identify and fix problems with computing devices and their components using a systematic troubleshooting method or guide.'],
  ['7-8.CY.2', 'Describe physical, digital, and behavioral safeguards that can be employed in different situations.'],
  ['2-3.CY.2', 'Compare and contrast behaviors that do and do not keep information secure.'],
  ['K-1.CY.1', 'Identify reasons for keeping information private.'],
  ['K-1.CY.5', 'Identify when it is appropriate to open and/or click on links or files.'],
  ['4-6.CY.5', 'Explain suspicious activity of applications and devices.'],
  ['9-12.CY.5', 'Recommend multiple actions to take prior and in response to various types of digital security breaches.']
]);
const EXTERNAL_HOSTS = new Set(['www.nysed.gov', 'www.cloudflare.com', 'github.com', 'docs.goguardian.com', 'support.google.com']);
const SITE_PAGES = new Set(['/', '/school-it', '/compliance', '/verify', '/ai-use-notice', '/secure-reports', '/student-workbook', '/practice-quizzes', ...PUBLIC_LANDING_PAGES.map(cleanPath)]);

function activityExists(route) {
  if (route.page === 'lab' || route.page === 'practice') return CATALOG.some(item => item.id === route.id);
  if (route.page === 'arcade') return !route.id || ARCADE_CATALOG.some(item => item.id === route.id);
  if (route.page === 'explore') return !route.id || ELEMENTARY_LABS.some(item => item.id === route.id);
  return true;
}
function checkHash(hash, context) {
  const route = learningRoute(hash);
  assert.notEqual(route.page, 'unknown', context);
  assert.notEqual(routeAccess(route), 'unknown', context);
  assert.ok(activityExists(route), context + ' names a real activity');
}

test('every landing page is a reviewed, published, public-only file', () => {
  assert.equal(PUBLIC_LANDING_PAGES.length, 9);
  for (const file of PUBLIC_LANDING_PAGES) {
    assert.ok(PUBLIC_SOURCE_FILES.includes(file), file);
    assert.ok(PUBLIC_FILES.includes(file), file + ' is published');
    assert.equal(MEMBER_FILES.includes(file), false, file + ' stays out of member bundles');
    assert.doesNotMatch(file, /^(?:teacher|classroom)/u, file);
  }
  assert.equal(MEMBER_FILES.includes('src/landing.css'), false);
});

test('landing pages are script-free documents with one heading, a canonical URL and shared safeguards last', () => {
  const titles = new Set(), descriptions = new Set();
  for (const name of PUBLIC_SOURCE_FILES.filter(file => file.endsWith('.html') && !PUBLIC_LANDING_PAGES.includes(file))) {
    titles.add(read(name).match(/<title>([^<]+)<\/title>/u)?.[1]);
  }
  for (const [file, html] of pages) {
    assert.match(html, /^<!doctype html>\s*<html lang="en">/u, file);
    assert.doesNotMatch(html, /<script\b|<iframe\b|<form\b|<input\b|<base\b|<object\b|<embed\b|\son[a-z]+\s*=|javascript:/iu, file + ' stays inert');
    const title = html.match(/<title>([^<]+)<\/title>/u)?.[1];
    assert.ok(title && title.endsWith(' · Cole Learning Labs') && !titles.has(title), file + ' has a unique title');
    titles.add(title);
    const description = html.match(/<meta name="description" content="([^"]+)">/u)?.[1];
    assert.ok(description && description.length >= 70 && description.length <= 170 && !descriptions.has(description), file + ' has a unique description of 70 to 170 characters');
    descriptions.add(description);
    assert.equal([...html.matchAll(/<h1[\s>]/gu)].length, 1, file + ' has one h1');
    const canonical = [...html.matchAll(/<link rel="canonical" href="([^"]+)">/gu)];
    assert.equal(canonical.length, 1, file);
    assert.equal(canonical[0][1], origin + cleanPath(file), file);
    assert.ok(html.includes('<meta property="og:url" content="' + origin + cleanPath(file) + '">'), file + ' has a matching og:url');
    const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/gu)].map(match => match[1]);
    assert.deepEqual(sheets, ['styles', 'school', 'landing', 'accessibility'].map(sheet => '/src/' + sheet + '.css?release=' + release), file);
    assert.match(html, /<a class="skip-link" href="#main">Skip to main content<\/a>/u, file);
    assert.match(html, /<main id="main" tabindex="-1">/u, file);
    assert.doesNotMatch(html, /<meta name="robots"/u, file + ' is indexable');
    for (const [, alt] of html.matchAll(/<img\b[^>]*\balt="([^"]*)"/gu)) assert.ok(alt.length > 0, file);
    assert.equal([...html.matchAll(/<img\b/gu)].length, [...html.matchAll(/<img\b[^>]*\balt="/gu)].length, file + ' images have alternative text');
  }
});

test('every link on a landing page resolves to a real route, a published page or a reviewed outside source', () => {
  for (const [file, html] of pages) {
    const links = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/gu)];
    assert.ok(links.length > 5, file);
    for (const [tag, written] of links) {
      const href = written.replaceAll('&amp;', '&'), context = file + ' → ' + href;
      assert.doesNotMatch(written.replaceAll('&amp;', ''), /&/u, context + ' escapes ampersands');
      if (href === '#main') continue;
      if (href.startsWith('mailto:')) { assert.equal(href, 'mailto:support@colelearninglabs.com', context); continue; }
      assert.ok(href.startsWith('/') || href.startsWith('https://'), context + ' must be root-relative or absolute');
      const url = new URL(href, origin + cleanPath(file));
      if (url.origin !== origin) {
        assert.ok(EXTERNAL_HOSTS.has(url.hostname), context + ' is not a reviewed outside source');
        assert.match(tag, /rel="noopener noreferrer"/u, context);
        continue;
      }
      if (url.pathname.startsWith('/assets/')) { assert.ok(PUBLIC_FILES.includes(url.pathname.slice(1)), context); continue; }
      assert.ok(SITE_PAGES.has(url.pathname), context + ' is not a published page');
      if (url.search) {
        assert.equal(url.pathname, '/', context);
        assert.match(url.search, /^\?mode=student(?:&cart=true)?$|^\?cart=true$/u, context + ' uses a documented classroom link mode');
      }
      if (url.pathname === '/' && url.hash) checkHash(url.hash, context);
      else if (url.hash) assert.match(html + [...pages].find(([name]) => cleanPath(name) === url.pathname)?.[1], new RegExp('id="' + url.hash.slice(1) + '"', 'u'), context + ' names a real section');
    }
    for (const [, shown] of html.matchAll(/class="lesson-share-text lesson-share-link">([^<]+)</gu)) {
      const url = new URL(shown.trim());
      assert.equal(url.origin, origin, file);
      if (url.pathname === '/') checkHash(url.hash, file + ' share link ' + shown); else assert.ok(SITE_PAGES.has(url.pathname), file + ' share link ' + shown);
    }
  }
});

test('landing pages avoid approval, coverage and outcome claims', () => {
  for (const [file, html] of pages) {
    const words = text(html);
    assert.doesNotMatch(words, /100%|guarantee|green.?light|certified|compliant|zero.?PII|endorsed by|approved by (?:NYSED|the state|New York)|meets (?:the|all|every) standard|covers (?:the|all|every) standard|fully aligned/iu, file);
    assert.doesNotMatch(words, /pilot (?:showed|proved|found|demonstrated)|students (?:improved|scored|gained)|was piloted|were piloted|results from the pilot/iu, file + ' must not report a pilot that has not run');
    assert.doesNotMatch(words, /leaderboard|high score|countdown timer starts/iu, file);
  }
});

test('standards codes on landing pages are limited to verified NYSED wording with a source link', () => {
  for (const [file, html] of pages) {
    const codes = [...html.matchAll(/<span class="standard-code">([^<]+)<\/span>/gu)].map(match => match[1]);
    for (const code of codes) {
      assert.match(code, /^(?:K-1|2-3|4-6|7-8|9-12)\.(?:NSD|CY|DL|CT|IC)\.\d+$/u, file);
      assert.ok(VERIFIED_STANDARDS.has(code), file + ' shows unverified code ' + code);
      assert.ok(text(html).includes(VERIFIED_STANDARDS.get(code)), file + ' quotes ' + code + ' exactly');
    }
    if (codes.length) {
      assert.match(html, /href="https:\/\/www\.nysed\.gov\/[^"]+"/u, file + ' links the official source');
      assert.match(text(html), /not an official NYSED review or endorsement/u, file);
    }
    for (const [, code] of text(html).matchAll(/\b((?:K-1|2-3|4-6|7-8|9-12)\.(?:NSD|CY|DL|CT|IC)\.\d+)\b/gu)) assert.ok(VERIFIED_STANDARDS.has(code), file + ' mentions unverified code ' + code);
  }
  assert.ok(pages.get('lessons/blank-monitor.html').includes('<span class="standard-code">7-8.NSD.3</span>'));
  assert.ok(pages.get('lessons/inbox-defender.html').includes('<span class="standard-code">7-8.CY.2</span>'));
  assert.equal(pages.get('lessons/packet-post.html').includes('class="standard-code"'), false, 'Packet Post play does not yet demonstrate an individual standard');
});

test('featured lesson pages match the catalogs and carry every ready-to-run part', () => {
  const blank = CATALOG.find(item => item.id === 'INC-101'), packet = ARCADE_CATALOG.find(item => item.id === 'packet-post');
  const featured = [
    ['lessons/blank-monitor.html', blank.title, '/#lab/INC-101', 'Grades ' + blank.grade],
    ['lessons/inbox-defender.html', 'Inbox Defender', '/#play/inbox-defender', 'Grades K–12'],
    ['lessons/packet-post.html', packet.title, '/#arcade/packet-post', 'Grades ' + packet.grade]
  ];
  for (const [file, title, play, grade] of featured) {
    const html = pages.get(file), words = text(html);
    assert.ok(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/u)[1].includes(title), file);
    assert.ok(html.includes('href="' + play + '"'), file + ' has a direct Play link');
    assert.ok(words.includes(grade), file + ' keeps the catalog grade band');
    for (const id of ['objective', 'materials', 'sequence', 'evidence', 'look-fors', 'exit-question', 'unplugged', 'share']) assert.match(html, new RegExp('<h[23] id="' + id + '"', 'u'), file + ' #' + id);
    assert.match(html, /class="lesson-share-text lesson-share-link">https:\/\/www\.colelearninglabs\.com\//u, file + ' shows a share link');
    assert.match(words, /oral|aloud/iu, file + ' offers a spoken response');
    assert.match(words, /does not record|no audio/iu, file);
  }
  assert.ok(text(pages.get('lessons/blank-monitor.html')).includes('About ' + blank.minutes + ' minutes'));
  assert.ok(pages.get('lessons/inbox-defender.html').includes('/#play/inbox-defender?style=picture'), 'the picture style has a direct link');
  const hub = pages.get('teach.html');
  for (const [file] of featured) assert.ok(hub.includes('href="' + cleanPath(file) + '"'), 'teacher hub links ' + file);
  for (const file of ['lessons/k-6.html', 'lessons/troubleshooting-pilot.html', 'lessons/design-a-ticket.html', 'district-review.html']) assert.ok(hub.includes('href="' + cleanPath(file) + '"'), 'teacher hub links ' + file);
});

test('the K–6 lane, pilot pack and ticket template keep work local and adult-led', () => {
  const lane = pages.get('lessons/k-6.html');
  for (const band of ['K–1', '2–3', '4–6']) assert.ok(text(lane).includes(band), band);
  const linked = new Set([...lane.matchAll(/href="\/#explore\/(EX-[A-Z]+-\d)"/gu)].map(match => match[1]));
  assert.ok(linked.size >= 6, 'the lane links individual elementary activities');
  for (const id of linked) assert.ok(ELEMENTARY_LABS.some(item => item.id === id), id);
  assert.match(text(lane), /read aloud|read-aloud|reads? .* aloud/iu);
  const pilot = pages.get('lessons/troubleshooting-pilot.html'), pilotText = text(pilot);
  assert.ok(pilot.includes('/#lab/INC-101'));
  assert.match(pilot, /href="\/(?:\?mode=student(?:&amp;cart=true)?)?#lab\/INC-107/u, 'the unseen alternate ticket is linked');
  for (const word of ['setup time', 'navigation', 'needed help', 'apply the method']) assert.match(pilotText, new RegExp(word, 'iu'), word);
  assert.match(pilotText, /proposed|has not (?:yet )?been run|not yet run/iu, 'the pilot is described as a plan');
  assert.match(pilotText, /district.{0,40}approved/iu);
  const template = pages.get('lessons/design-a-ticket.html'), templateText = text(template);
  for (const part of ['Symptom', 'Hidden cause', 'Clues', 'Safe test', 'Expected result', 'Teacher review']) assert.ok(templateText.includes(part), part);
  assert.match(templateText, /fictional/iu);
  assert.match(templateText, /not uploaded|nothing is uploaded|does not upload|no upload/iu);
});

test('the district review separates each optional service and prints contact details and a Chromebook checklist', () => {
  const html = pages.get('district-review.html'), words = text(html);
  for (const href of ['/school-it', '/compliance', '/#privacy', '/ai-use-notice', '/verify']) assert.ok(html.includes('href="' + href), href);
  for (const row of ['Connected classrooms', 'Online requester replies', 'Lab telemetry', 'Aggregate activity counts', 'Signed completion codes', 'Teacher Code Verifier']) assert.ok(words.includes(row), row);
  assert.match(words, /Transmitted/u); assert.match(words, /Retained/u);
  assert.ok(html.includes('href="mailto:support@colelearninglabs.com"'));
  assert.match(html, /<h2 id="chromebook-checklist"/u);
  assert.match(html, /<h2 id="school-pilot"/u);
  assert.ok(html.includes('/?mode=student&amp;cart=true'), 'the pilot uses the existing combined classroom link');
  assert.match(words, /IP address/u);
  assert.match(words, /It is not an approval, a certification or a legal determination\./u);
  assert.match(words, /Enforced/u); assert.match(words, /Not enforced/u);
});

test('Everyday Tech reuses existing activities and leaves school grade labels in the catalog', () => {
  const html = pages.get('everyday-tech.html'), words = text(html);
  for (const href of ['/#play/inbox-defender', '/#lab/INC-101']) assert.ok(html.includes('href="' + href + '"'), href);
  assert.match(html, /href="\/#(?:learn\/ai|lab\/AI-302|practice\/AI-302|explore\/EX-AI-2)"/u, 'an AI fact-checking activity is linked');
  assert.match(words, /famil/iu); assert.match(words, /adult/iu);
  assert.match(words, /grade label|grade band|school grade/iu, 'the page explains that activities keep their school grade label');
});
