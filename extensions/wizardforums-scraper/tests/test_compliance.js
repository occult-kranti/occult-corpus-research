#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../background/sw.js'), 'utf8');
const hooks = {};
const ctx = {
  __WF_TEST__: hooks,
  globalThis: null,
  TextEncoder,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  fetch: async () => ({ ok: false, text: async () => '' }),
  chrome: { storage: { local: { set: async () => {} } }, runtime: { onMessage: { addListener: () => {} } }, downloads: { download: () => {} } },
  console,
};
ctx.globalThis = ctx;
vm.runInNewContext(source, ctx, { filename: 'sw.js' });
const parseRobots = hooks.parseRobots;
assert.equal(typeof parseRobots, 'function');

function check(name, fn) { fn(); console.log(`PASS ${name}`); }

check('robots parser handles star group, other group, sitemap, delay, and signals', () => {
  const r = parseRobots('User-agent: Foo\nDisallow: /foo\n\nUser-agent: *\nDisallow: /private\nAllow: /private/public\nCrawl-delay: 2.5\nSitemap: https://wizardforums.com/sitemap.xml\nContent-Signal: search=yes, ai-input=no, ai-train=no');
  assert.deepEqual(Array.from(r.disallow), ['/private']);
  assert.deepEqual(Array.from(r.allow), ['/private/public']);
  assert.equal(r.crawlDelay, 2.5);
  assert.equal(r.sitemaps[0], 'https://wizardforums.com/sitemap.xml');
  assert.equal(r.contentSignal['ai-input'], 'no');
  assert.equal(r.restrictsAiTdm, true);
});

check('current WizardForums robots fixture is parseable', () => {
  const live = fs.readFileSync(require('node:path').join(__dirname, '../fixtures/live-robots.txt'), 'utf8');
  const r = parseRobots(live);
  assert.equal(r.tdmReservation, true);
  assert.equal(r.restrictsAiTdm, true);
  assert.equal(r.raw.length > 0, true);
});

check('bare Article 4 reservation restricts AI/TDM by default', () => {
  const r = parseRobots('# Article 4 reservation of text and data mining rights');
  assert.equal(r.tdmReservation, true);
  assert.equal(r.restrictsAiTdm, true);
});

check('empty, null, comments, and malformed lines do not throw', () => {
  for (const x of ['', null, '# only comments\nnot a directive']) assert.doesNotThrow(() => parseRobots(x));
});

console.log('All compliance checks passed.');
