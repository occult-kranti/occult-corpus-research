'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadContentTestApi() {
  const code = fs.readFileSync(require.resolve('../content/content.js'), 'utf8');
  const api = {};
  const context = {
    console, URL, TextEncoder, DOMParser: class {}, performance: { now: () => 0 },
    window: { __wfScraperLoaded: false }, self: null, globalThis: { __WF_TEST__: api },
    chrome: { storage: { local: { set() {}, get(_, cb) { cb({}); } } }, runtime: { onMessage: { addListener() {} } } },
    fetch: async () => ({ ok: true, status: 200, text: async () => '<html></html>' }),
    setTimeout, clearTimeout, btoa: (x) => Buffer.from(x, 'binary').toString('base64'),
  };
  context.self = context;
  vm.runInNewContext(code, context, { filename: 'content.js' });
  return api;
}

const api = loadContentTestApi();
assert.equal(api.canonicalCrawlUrl('https://wizardforums.com/threads/a.123/unread'), 'https://wizardforums.com/threads/a.123/');
assert.equal(api.canonicalCrawlUrl('https://wizardforums.com/threads/a.123/post-99/?utm_source=x#top'), 'https://wizardforums.com/threads/a.123/');
assert.equal(api.canonicalCrawlUrl('https://wizardforums.com/forums/x.9/page-2/?fbclid=abc'), 'https://wizardforums.com/forums/x.9/page-2/');
assert.equal(api.canonicalCrawlUrl('https://example.com/a'), 'https://example.com/a/');
console.log('PASS canonical crawl URLs');
console.log('All scheduler checks passed.');
