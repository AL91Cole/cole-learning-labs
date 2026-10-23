import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PUBLIC_FILES } from '../scripts/build.mjs';
import { previewContentType } from '../scripts/serve.mjs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const canonicalPages = new Map([
  ['index.html', '/'], ['school-it.html', '/school-it'],
  ['student-workbook.html', '/student-workbook'], ['practice-quizzes.html', '/practice-quizzes'],
  ['classroom.html', '/classroom'], ['secure-reports.html', '/secure-reports'], ['teacher/index.html', '/teacher/']
]);
const origin = 'https://www.colelearninglabs.com';

test('each public HTML page declares one stable canonical in its source head', () => {
  for (const [file, pathname] of canonicalPages) {
    const head = read(file).split('</head>')[0];
    const links = [...head.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/gu)];
    assert.equal(links.length, 1, file);
    assert.ok(links[0][0].includes(`href="${origin}${pathname}"`), file);
    assert.doesNotMatch(links[0][0], /\?|#/u, 'fragments and release queries cannot become canonical URLs');
  }
  assert.match(read('404.html'), /<meta name="robots" content="noindex">/u);
});

test('sitemap and robots expose only crawlable preferred content URLs and retain utility noindex', () => {
  const utilities = ['classroom.html', 'secure-reports.html', 'teacher/index.html'];
  const contentPaths = [...canonicalPages].filter(([name]) => !utilities.includes(name)).map(([, pathname]) => origin + pathname).sort();
  const sitemap = read('sitemap.xml');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(match => match[1]).sort();
  assert.deepEqual(locations, contentPaths);
  assert.equal(new Set(locations).size, locations.length);
  assert.match(sitemap, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/u);
  assert.match(read('robots.txt'), /^Sitemap: https:\/\/www\.colelearninglabs\.com\/sitemap\.xml$/mu);
  assert.doesNotMatch(read('robots.txt'), /^Disallow:\s*\//mu, 'crawlers must be able to read canonical and noindex signals');
  for (const file of utilities) assert.match(read(file), /<meta name="robots" content="noindex(?:,nofollow)?">/u, file);
  for (const file of ['robots.txt', 'sitemap.xml', '_redirects']) assert.ok(PUBLIC_FILES.includes(file), file + ' must reach the reviewed build');
  assert.equal(previewContentType('sitemap.xml'), 'application/xml; charset=utf-8');
});

test('homepage alias redirects stay relative so branch previews remain usable', () => {
  const rules = read('_redirects').split(/\r?\n/u).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  assert.deepEqual(rules, ['/index.html / 301', '/index / 301']);
});
