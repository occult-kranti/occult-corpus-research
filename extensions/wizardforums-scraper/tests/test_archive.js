#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../background/sw.js'), 'utf8');
const hooks = {};
const ctx = {
  __WF_TEST__: hooks, globalThis: null, TextEncoder,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  fetch: async () => ({ ok: false, text: async () => '' }),
  chrome: { storage: { local: { set: async () => {} } }, runtime: { onMessage: { addListener: () => {} } }, downloads: { download: () => {} } },
  console,
};
ctx.globalThis = ctx;
vm.runInNewContext(source, ctx, { filename: 'sw.js' });
assert.equal(typeof hooks.makeZip, 'function');
const entries = [
  { name: 'README.txt', data: 'WizardForums archive\n' },
  { name: 'metadata/crawl.json', data: JSON.stringify({ schema_version: '2.0', title: 'Unicode ✓' }) + '\n' },
  { name: 'data/forums.jsonl', data: '' },
  { name: 'index/posts.csv', data: 'id,body_text\n"1","hello, world"\n' },
];
const bytes = hooks.makeZip(entries);
assert.ok(bytes.length > 100);
const out = '/tmp/wizardforums-test-archive.zip';
fs.writeFileSync(out, Buffer.from(bytes));
console.log(`PASS ZIP generated: ${out} (${bytes.length} bytes)`);
