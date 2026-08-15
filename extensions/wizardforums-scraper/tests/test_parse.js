#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseHTML } = require('linkedom');
const XF = require('../lib/xf-parse.js');

function doc(html) { return parseHTML(html).document; }
function check(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (err) { console.error(`FAIL ${name}: ${err.message}`); throw err; }
}

check('live forum fixture discovers current thread rows', () => {
  const html = fs.readFileSync(path.join(__dirname, '../fixtures/live-forum.html'), 'utf8');
  const r = XF.parseForumNode(doc(html), 'https://wizardforums.com/forums/general-occult-discussion.9/');
  assert.ok(r.threads.length > 0);
  assert.ok(r.threads.every((x) => x.url.includes('/threads/')));
});

check('live thread fixture extracts current public posts', () => {
  const html = fs.readFileSync(path.join(__dirname, '../fixtures/live-thread.html'), 'utf8');
  const r = XF.parseThread(doc(html), 'https://wizardforums.com/threads/pacts-with-unconventional-spirits.23055/');
  assert.equal(r.thread.id, '23055');
  assert.ok(r.posts.length > 0);
  assert.ok(r.posts.some((p) => p.body_text.length > 0));
});

check('homepage live fixture discovers forums and counts', () => {
  const html = fs.readFileSync('/home/ubuntu/browser_html/wizardforums_com_page_1786826606513.html', 'utf8');
  const r = XF.parseBoardIndex(doc(html), 'https://wizardforums.com/');
  assert.ok(r.forums.length > 10);
  const general = r.forums.find((x) => x.title === 'General Occult Discussion');
  assert.ok(general);
  assert.equal(general.id, '9');
  assert.equal(general.threads_count, 2000);
  assert.equal(general.messages_count, 25000);
});

check('counts support comma, decimal abbreviations, and invalid text', () => {
  assert.equal(XF.intFrom('2.6K'), 2600);
  assert.equal(XF.intFrom('13.5K'), 13500);
  assert.equal(XF.intFrom('1.1M'), 1100000);
  assert.equal(XF.intFrom('25,001'), 25001);
  assert.equal(XF.intFrom('—'), null);
});

check('forum parser handles sticky, locked, redirect, prefix, time, and pagination', () => {
  const d = doc(`<div class="structItemContainer-group--sticky"><div class="structItem structItem--thread structItem--sticky" data-thread-id="11"><div class="structItem-title"><a class="labelLink">Guide</a><a href="/threads/guide.11/">Guide</a></div><div class="structItem-parts"><a class="username">Alice</a><time datetime="2026-08-15T10:00:00Z"></time></div><div class="structItem-cell--meta"><dl><dd>1.2K</dd><dd>3M</dd></dl></div><div class="structItem-cell--latest"><a class="username">Bob</a><time data-time="10" title="today"></time></div><span class="structItem-status--locked"></span></div></div><div class="structItem structItem--thread structItem--redirect"><div class="structItem-title"><a href="/threads/moved.12/">Moved</a></div></div><nav class="pageNav"><li class="pageNav-page pageNav-page--current"><a>2</a></li><li class="pageNav-page"><a href="/forums/x.9/page-3/">3</a></li><a rel="next" href="/forums/x.9/page-3/">Next</a></nav>`);
  const r = XF.parseForumNode(d, 'https://wizardforums.com/forums/x.9/');
  assert.equal(r.threads.length, 2);
  assert.equal(r.threads[0].id, '11');
  assert.equal(r.threads[0].reply_count, 1200);
  assert.equal(r.threads[0].view_count, 3000000);
  assert.equal(r.threads[0].sticky, true);
  assert.equal(r.threads[0].locked, true);
  assert.equal(r.threads[1].redirect, true);
  assert.equal(r.pageNav.current, 2);
  assert.equal(r.pageNav.nextUrl, 'https://wizardforums.com/forums/x.9/page-3/');
});

check('thread parser extracts posts, quotes, attachments, signature removal, edit, reactions, and canonical URL', () => {
  const d = doc(`<link rel="canonical" href="/threads/test-topic.42/page-2/"><h1 class="p-title-value"><span class="labelLink">News</span>Test topic</h1><div class="p-breadcrumbs"><a href="/forums/x.9/">Forum X</a></div><nav class="pageNav"><li class="pageNav-page pageNav-page--current"><a>2</a></li><a class="pageNav-jump--next" href="/threads/test-topic.42/page-3/">Next</a></nav><article class="message--post" id="js-post-100" data-author="Alice"><div class="message-name"><a class="username" href="/members/alice.7/">Alice</a></div><div class="message-userContent"><div class="bbWrapper">Hello<br>world<div class="message-signature">sig</div><script>bad</script></div></div><div class="message-attribution-opposite"><a>#1</a></div><header><time datetime="2026-08-15T10:00:00Z"></time></header><div class="bbCodeBlock--quote" data-quote="Bob" data-source="post: 99"><div class="bbCodeBlock-content">quoted text</div></div><div class="message-attachments"><a href="/attachments/a.pdf"><span class="file-name">a.pdf</span></a></div><a class="reactionsBar-link">Like 3</a><span class="message-lastEdit">edited</span></article><article class="message--deleted message--post" data-content="post-101"><div class="message-userContent"></div></article>`);
  const r = XF.parseThread(d, 'https://wizardforums.com/threads/test-topic.42/page-2/');
  assert.equal(r.thread.id, '42');
  assert.equal(r.thread.url, 'https://wizardforums.com/threads/test-topic.42/');
  assert.equal(r.thread.forum.url, 'https://wizardforums.com/forums/x.9/');
  assert.equal(r.posts.length, 2);
  assert.equal(r.posts[0].id, '100');
  assert.match(r.posts[0].body_text, /Hello/);
  assert.doesNotMatch(r.posts[0].body_text, /sig|bad/);
  assert.equal(r.posts[0].quotes[0].source_post, '99');
  assert.equal(r.posts[0].attachments[0].url, 'https://wizardforums.com/attachments/a.pdf');
  assert.equal(r.posts[0].reactions_count, 3);
  assert.equal(r.posts[0].edited, true);
  assert.equal(r.posts[1].deleted, true);
  assert.equal(r.pageNav.current, 2);
});

check('login wall is detected without false positives on populated posts', () => {
  assert.equal(XF.isLoginWall(doc('<html><body>You must log in or register to view this page</body></html>').body), true);
  assert.equal(XF.isLoginWall(doc('<html><body>Register to see all posts <article class="message--post"><div class="message-body">Visible</div></article></body></html>').body), false);
});

check('page type and IDs handle query strings, fragments, and member URLs', () => {
  assert.equal(XF.idFromUrl('https://wizardforums.com/threads/a.123/page-4/?x=1#top'), '123');
  assert.equal(XF.idFromUrl('/members/alice.7/'), '7');
  assert.equal(XF.detectPageType('https://wizardforums.com/forums/a.9/page-2/'), 'forum');
  assert.equal(XF.detectPageType('https://wizardforums.com/threads/a.123/post-4/'), 'thread');
  assert.equal(XF.detectPageType('https://wizardforums.com/'), 'index');
});

console.log('All parser checks passed.');
