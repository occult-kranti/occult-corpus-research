#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const listeners = [];
const context = {
  console, TextEncoder, Uint8Array, URL, performance: { now: () => 0 },
  setTimeout, clearTimeout,
  window: null,
  chrome: {
    storage: { local: { set: () => Promise.resolve(), get: (_k, cb) => cb({}) } },
    runtime: { onMessage: { addListener: (fn) => listeners.push(fn) }, sendMessage: () => Promise.resolve({ ok: true }) },
  },
  XFParse: { detectPageType: () => 'index', selftest: () => ({}) },
  document: { location: { href: 'https://wizardforums.com/' } },
};
context.window = context;
context.globalThis = context;
context.__WF_TEST__ = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../content/content.js'), 'utf8'), context, { filename: 'content.js' });
const split = context.__WF_TEST__.buildArchiveParts;
assert.equal(typeof split, 'function');

function size(part) { return part.reduce((n, e) => n + Buffer.byteLength(e.data) + e.name.length + 80, 22); }
const rows = Array.from({ length: 300000 }, (_, i) => JSON.stringify({ id: i, text: 'Δ unicode row ' + i + ' '.repeat(80) }) + '\n').join('');
const parts = split([{ name: 'data/posts.jsonl', data: rows }, { name: 'README.txt', data: 'ok\n' }]);
assert.ok(parts.length > 1, 'large JSONL should split');
assert.ok(parts.every((p) => size(p) <= 28000000), 'each part should remain under the ZIP target');
const postChunks = parts.flat().filter((p) => p.name.startsWith('data/posts.part-'));
assert.ok(postChunks.length > 1, 'posts should have multiple ordered chunks');
assert.deepEqual(postChunks.map((p) => p.name), postChunks.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => p.name));
assert.equal(parts.flat().filter((p) => p.name.startsWith('data/posts.part-')).map((p) => p.data).join('').includes('Δ unicode row 299999'), true);
assert.ok(parts.flat().every((p) => !p.data || p.data.endsWith('\n')), 'JSONL parts preserve complete lines');

const empty = split([{ name: 'data/empty.jsonl', data: '' }]);
assert.equal(empty.length, 1);
assert.equal(empty[0][0].data, '');

const small = split([{ name: 'metadata/crawl.json', data: '{"ok":true}\n' }]);
assert.equal(small.length, 1);
assert.equal(small[0][0].name, 'metadata/crawl.json');

assert.throws(() => split([{ name: 'data/one-record.jsonl', data: 'x'.repeat(30000000) }]), /too large/);
console.log('All archive chunking checks passed.');
