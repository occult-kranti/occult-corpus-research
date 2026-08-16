'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require.resolve('../content/content.js'), 'utf8');
const api = {};
const context = { console, URL, TextEncoder, DOMParser: class {}, performance: { now: () => 0 },
  window: { __wfScraperLoaded: false }, self: null, globalThis: { __WF_TEST__: api },
  chrome: { storage: { local: { set() {}, get(_, cb) { cb({}); } } }, runtime: { onMessage: { addListener() {} } } },
  fetch: async () => ({ ok: true, status: 200, text: async () => '' }), setTimeout, clearTimeout,
  btoa: (x) => Buffer.from(x, 'binary').toString('base64') };
context.self = context;
vm.runInNewContext(code, context);

const row = api.postFeatureRow({ id: null, thread_id: 't1', thread_title: '测试', forum: { id: '9' }, author: 'A',
  posted_at: '2026-08-15T00:00:00Z', body_text: 'Привет мир! 你好世界? https://example.com', body_html: '<p>x</p>',
  quote_count: 2, attachment_count: 1, links: [{}, {}], reactions_count: 3, has_reactions: true,
  edited: true, deleted: false, ignored: false, source_url: 'https://wizardforums.com/threads/x.1/' });
assert.equal(row.word_count, 6);
assert.equal(row.unique_word_count, 6);
assert.equal(row.question_count, 1);
assert.equal(row.exclamation_count, 1);
assert.equal(row.url_count, 1);
assert.equal(row.empty_body, false);
assert.equal(row.link_count, 2);
assert.equal(row.reaction_count, 3);
const empty = api.postFeatureRow({ body_text: '   ' });
assert.equal(empty.empty_body, true);
assert.equal(empty.word_count, 0);
console.log('PASS analysis feature edge cases');
