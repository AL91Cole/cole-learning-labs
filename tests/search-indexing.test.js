import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PUBLIC_FILES, PUBLIC_SOURCE_FILES } from '../scripts/build.mjs';
import { previewContentType } from '../scripts/serve.mjs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const canonicalPages = new Map([
  ['index.html', '/'], ['school-it.html', '/school-it'],
  ['student-workbook.html', '/student-workbook'], ['practice-quizzes.html', '/practice-quizzes'],
  ['classroom.html', '/classroom'], ['secure-reports.html', '/secure-reports'], ['teacher/index.html', '/teacher/']
]);
const origin = 'https://www.colelearninglabs.com';

test('reviewed HTML sources retain their stable canonical URLs independently of public publication', () => {
  for (const [file, pathname] of canonicalPages) {
    assert.ok(PUBLIC_SOURCE_FILES.includes(file),`${file}: canonical source remains reviewed`);
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
  const contentPaths = [...canonicalPages].filter(([name]) => PUBLIC_FILES.includes(name)&&!utilities.includes(name)).map(([, pathname]) => origin + pathname).sort();
  const sitemap = read('sitemap.xml');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(match => match[1]).sort();
  assert.deepEqual(locations, contentPaths);
  assert.equal(new Set(locations).size, locations.length);
  assert.match(sitemap, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/u);
  assert.match(read('robots.txt'), /^Sitemap: https:\/\/www\.colelearninglabs\.com\/sitemap\.xml$/mu);
  assert.doesNotMatch(read('robots.txt'), /^Disallow:\s*\/\s*$/mu, 'crawlers must be able to read canonical and noindex signals');
  for (const file of utilities) assert.match(read(file), /<meta name="robots" content="noindex(?:,nofollow)?">/u, file);
  for(const file of ['classroom.html','teacher/index.html','student-workbook.html','practice-quizzes.html']){
    assert.equal(PUBLIC_FILES.includes(file),false,`${file}: cannot be a public search entry`);
    assert.ok(!locations.includes(origin+canonicalPages.get(file)),`${file}: cannot be advertised in the public sitemap`);
  }
  for (const file of ['robots.txt', 'sitemap.xml', '_redirects']) assert.ok(PUBLIC_FILES.includes(file), file + ' must reach the reviewed build');
  assert.equal(previewContentType('sitemap.xml'), 'application/xml; charset=utf-8');
});

test('homepage and explicit member-document redirects stay relative without a broad catch-all', () => {
  const rules = read('_redirects').split(/\r?\n/u).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  assert.deepEqual(rules, ['/index.html / 301', '/index / 301',
    ...['/classroom','/classroom/','/classroom.html','/teacher','/teacher/','/teacher/index.html','/student-workbook','/student-workbook.html','/practice-quizzes','/practice-quizzes.html'].map(route=>route+' /#membership 302')]);
  assert.equal(rules.some(rule=>rule.includes('*')||rule.includes('https://')),false);
});

test('deployment noindex headers apply only to this project alternate hosts',()=>{
  const scopes=read('_headers').split(/\r?\n/u).filter(line=>line&&!/^\s|#/u.test(line));
  const alternateScopes=scopes.filter(scope=>scope.startsWith('https://'));
  assert.deepEqual(alternateScopes,['https://cole-learning-labs.pages.dev/*','https://:version.cole-learning-labs.pages.dev/*']);
  const source=read('_headers');
  for(const scope of alternateScopes){
    const block=source.slice(source.indexOf(scope)+scope.length).split(/\r?\n(?=\S)/u)[0];
    assert.match(block,/^\s+X-Robots-Tag: noindex\s*$/mu);
  }
  const globalBlock=source.slice(source.indexOf('/*')+2).split(/\r?\n(?=\S)/u)[0];
  assert.doesNotMatch(globalBlock,/X-Robots-Tag/iu,'The preferred production site remains indexable.');
  assert.equal(alternateScopes.some(scope=>scope===origin+'/*'||scope==='https://colelearninglabs.com/*'),false);
});
