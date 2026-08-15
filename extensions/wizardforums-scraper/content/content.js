/* Wizard Forums Scraper — content/content.js
 * Session-based XenForo crawler with organized ZIP export.
 */
(function () {
  'use strict';
  if (window.__wfScraperLoaded) return;
  window.__wfScraperLoaded = true;
  const XF = window.XFParse;
  const ORIGIN = 'https://wizardforums.com';
  const VERSION = '2.0.0';

  const S = {
    running: false, stop: false, opts: null, compliance: null,
    queue: [], queued: new Set(), visited: new Set(), seenThreads: new Set(), seenPosts: new Set(),
    records: { forums: [], threads: [], posts: [], all: [] }, requestLog: [], skipped: [],
    stamp: '', counts: { forums: 0, threads: 0, posts: 0, pages: 0, errors: 0, skipped_disallow: 0 },
    lastError: '', archive: null,
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nowStamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const isoNow = () => new Date().toISOString();
  const json = (x) => JSON.stringify(x, null, 2) + '\n';
  const jsonl = (xs) => xs.map((x) => JSON.stringify(x)).join('\n') + (xs.length ? '\n' : '');
  const csvCell = (v) => '"' + String(v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v)).replace(/"/g, '""') + '"';
  const csv = (rows, columns) => [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';

  function progress(extra) {
    const p = Object.assign({ running: S.running, counts: S.counts, queue: S.queue.length,
      stamp: S.stamp, lastError: S.lastError, archive: S.archive, updatedAt: Date.now() }, extra || {});
    chrome.storage.local.set({ wf_progress: p });
    return p;
  }

  function robotsPatternMatches(pattern, path) {
    if (!pattern) return false;
    const p = String(pattern).trim();
    if (!p) return false;
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
    try { return new RegExp('^' + escaped).test(path); } catch (e) { return path.indexOf(p) === 0; }
  }
  function disallowed(url) {
    const c = S.compliance || {};
    let path;
    try { path = decodeURIComponent(new URL(url).pathname); } catch (e) { return false; }
    const blocked = (c.disallow || []).filter((p) => robotsPatternMatches(p, path));
    const allowed = (c.allow || []).filter((p) => robotsPatternMatches(p, path));
    if (!blocked.length) return false;
    const longest = (xs) => xs.reduce((n, x) => Math.max(n, String(x).length), 0);
    return longest(blocked) > longest(allowed);
  }

  function logRequest(entry) { S.requestLog.push(Object.assign({ at: isoNow() }, entry)); }
  async function fetchDoc(url, kind) {
    const started = performance.now();
    try {
      const resp = await fetch(url, { credentials: 'same-origin' });
      const html = await resp.text();
      logRequest({ url, kind, status: resp.status, ok: resp.ok, bytes: html.length,
        duration_ms: Math.round(performance.now() - started) });
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + url);
      return new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
      logRequest({ url, kind, status: null, ok: false, bytes: 0,
        duration_ms: Math.round(performance.now() - started), error: String((e && e.message) || e) });
      throw e;
    }
  }

  function emit(rec) {
    const out = Object.assign({}, rec, { scraped_at: isoNow(), scraper_version: VERSION });
    S.records.all.push(out);
    if (out.type === 'forum') { S.records.forums.push(out); S.counts.forums += 1; }
    else if (out.type === 'thread') { S.records.threads.push(out); S.counts.threads += 1; }
    else if (out.type === 'post') { S.records.posts.push(out); S.counts.posts += 1; }
  }

  function enqueue(url, kind) {
    if (!url) return;
    let u;
    try { u = new URL(url, ORIGIN).href.split('#')[0]; } catch (e) { return; }
    if (u.indexOf(ORIGIN) !== 0) return;
    if (S.visited.has(u) || S.queued.has(u)) return;
    if (disallowed(u)) { S.counts.skipped_disallow += 1; S.skipped.push({ url: u, kind, reason: 'robots_disallow', at: isoNow() }); return; }
    S.queued.add(u); S.queue.push({ url: u, kind });
  }

  async function handleIndex(d, url) {
    for (const f of XF.parseBoardIndex(d, url).forums) {
      emit(Object.assign({ type: 'forum' }, f, { source_url: url }));
      enqueue(f.url, 'forum');
      for (const sf of (f.sub_forums || [])) enqueue(sf.url, 'forum');
    }
  }
  async function handleForum(d, url) {
    const parsed = XF.parseForumNode(d, url);
    for (const t of parsed.threads) {
      if (t.id && S.seenThreads.has(t.id)) continue;
      if (t.id) S.seenThreads.add(t.id);
      emit(Object.assign({ type: 'thread' }, t, { source_url: url }));
      if (S.opts.includePosts && !t.redirect && (!S.opts.maxThreads || S.counts.threads <= S.opts.maxThreads)) enqueue(t.url, 'thread');
    }
    if (parsed.pageNav.nextUrl && withinPageCap(parsed.pageNav)) enqueue(parsed.pageNav.nextUrl, 'forum');
  }
  async function handleThread(d, url) {
    const parsed = XF.parseThread(d, url);
    if (parsed.loginWall) S.lastError = 'login wall: ' + url + ' (are you logged in?)';
    for (const p of parsed.posts) {
      const key = p.id || (url + '#' + (p.post_number || p.author || 'unknown'));
      if (S.seenPosts.has(key)) continue;
      S.seenPosts.add(key);
      emit(Object.assign({ type: 'post', thread_id: parsed.thread.id, thread_title: parsed.thread.title,
        forum: parsed.thread.forum }, p, {
        source_url: url,
        body_text_length: (p.body_text || '').length,
        body_html_length: (p.body_html || '').length,
        quote_count: Array.isArray(p.quotes) ? p.quotes.length : 0,
        attachment_count: Array.isArray(p.attachments) ? p.attachments.length : 0,
        has_reactions: Number(p.reactions_count || 0) > 0,
      }));
    }
    if (parsed.pageNav.nextUrl && withinPageCap(parsed.pageNav)) enqueue(parsed.pageNav.nextUrl, 'thread');
  }
  function withinPageCap(pageNav) { return !S.opts.maxPagesPer || (pageNav.current || 1) < S.opts.maxPagesPer; }

  function archiveEntries() {
    const crawledAt = isoNow();
    const crawl = { schema_version: '2.0', scraper_version: VERSION, archive_created_at: crawledAt,
      crawl_started_at: S.stamp, current_url: location.href, scope: S.opts.scope, options: S.opts,
      counts: S.counts, queue_remaining: S.queue.length, stopped: S.stop, last_error: S.lastError,
      page_type: XF.detectPageType(location.href), selftest: XF.selftest(document, location.href) };
    const errors = { schema_version: '2.0', errors: S.requestLog.filter((x) => x.error || x.ok === false),
      skipped: S.skipped, last_error: S.lastError, stopped: S.stop, generated_at: crawledAt };
    const schema = { schema_version: '2.0', description: 'WizardForums organized scrape archive', record_types: {
      forum: 'data/forums.jsonl', thread: 'data/threads.jsonl', post: 'data/posts.jsonl' },
      compatibility: 'data/all.ndjson is the combined record stream; every data record has source_url, scraped_at, and scraper_version.' };
    const readme = 'WizardForums Scraper archive\n===========================\n\n'
      + 'This ZIP contains structured forum, thread, and post metadata captured from a session-based crawl.\n'
      + 'Open metadata/crawl.json first. Use data/*.jsonl for typed records and index/*.csv for spreadsheets.\n'
      + 'Attachments are preserved as metadata URLs; binary files are not downloaded automatically.\n\n'
      + 'The archive reflects only content visible to the authenticated browser session and the selected scope.\n';
    const forumCols = ['id', 'slug', 'url', 'title', 'description', 'threads_count', 'messages_count', 'sub_forums', 'source_url', 'scraped_at'];
    const threadCols = ['id', 'url', 'title', 'slug', 'prefix', 'author', 'author_id', 'author_url', 'forum', 'created', 'reply_count', 'view_count', 'last_post', 'sticky', 'locked', 'redirect', 'source_url', 'scraped_at'];
    const postCols = ['id', 'thread_id', 'thread_title', 'forum', 'author', 'author_id', 'post_number', 'posted_at', 'body_text', 'body_html', 'body_text_length', 'body_html_length', 'quote_count', 'attachment_count', 'attachments', 'reactions_count', 'has_reactions', 'edited', 'deleted', 'ignored', 'source_url', 'scraped_at'];
    return [
      { name: 'README.txt', data: readme },
      { name: 'metadata/crawl.json', data: json(crawl) },
      { name: 'metadata/robots.json', data: json(S.compliance || {}) },
      { name: 'metadata/requests.jsonl', data: jsonl(S.requestLog) },
      { name: 'metadata/errors.json', data: json(errors) },
      { name: 'metadata/schema.json', data: json(schema) },
      { name: 'data/forums.jsonl', data: jsonl(S.records.forums) },
      { name: 'data/threads.jsonl', data: jsonl(S.records.threads) },
      { name: 'data/posts.jsonl', data: jsonl(S.records.posts) },
      { name: 'data/all.ndjson', data: jsonl(S.records.all) },
      { name: 'index/forums.csv', data: csv(S.records.forums, forumCols) },
      { name: 'index/threads.csv', data: csv(S.records.threads, threadCols) },
      { name: 'index/posts.csv', data: csv(S.records.posts, postCols) },
    ];
  }

  async function downloadArchive() {
    const filename = 'WizardForums/wf-' + S.stamp + '.zip';
    const r = await chrome.runtime.sendMessage({ type: 'WF_DOWNLOAD_ARCHIVE', filename, entries: archiveEntries() });
    if (!r || !r.ok) throw new Error((r && r.error) || 'archive download failed');
    S.archive = { filename, bytes: r.bytes || null, downloaded_at: isoNow() };
  }

  async function run() {
    S.running = true; S.stop = false; S.archive = null; S.stamp = nowStamp(); progress();
    const delay = Math.max(S.opts.delayMs || 4000, ((S.compliance && S.compliance.crawlDelay) || 0) * 1000);
    let firstFetch = true;
    while (S.queue.length && !S.stop) {
      if (S.opts.maxRequests && S.counts.pages >= S.opts.maxRequests) { S.lastError = 'reached maxRequests cap'; break; }
      const item = S.queue.shift(); S.queued.delete(item.url);
      if (S.visited.has(item.url)) continue;
      S.visited.add(item.url);
      try {
        let d;
        if (item.useDocument) { d = document; logRequest({ url: item.url, kind: item.kind, status: 'current-document', ok: true, bytes: null, duration_ms: 0 }); }
        else { if (!firstFetch) await sleep(delay + Math.floor(delay * 0.25 * Math.random())); firstFetch = false; d = await fetchDoc(item.url, item.kind); }
        S.counts.pages += 1;
        if (item.kind === 'index') await handleIndex(d, item.url);
        else if (item.kind === 'forum') await handleForum(d, item.url);
        else if (item.kind === 'thread') await handleThread(d, item.url);
      } catch (e) { S.counts.errors += 1; S.lastError = String((e && e.message) || e); }
      if (S.counts.pages % 5 === 0) mirror();
      progress();
    }
    try { await downloadArchive(); }
    catch (e) { S.counts.errors += 1; S.lastError = 'archive: ' + String((e && e.message) || e); }
    S.running = false; mirror(); progress({ done: true });
  }

  function mirror() {
    chrome.storage.local.set({ wf_state: { stamp: S.stamp, counts: S.counts,
      visited: Array.from(S.visited).slice(-5000), seenThreads: Array.from(S.seenThreads).slice(-20000), opts: S.opts, at: Date.now() } });
  }
  function seedQueue() {
    const here = location.href.split('#')[0], type = XF.detectPageType(here);
    if (S.opts.scope === 'current') S.queue.push({ url: here, kind: type === 'other' ? 'index' : type, useDocument: true });
    else if (S.opts.scope === 'thread') S.queue.push({ url: S.opts.startUrl || here, kind: 'thread' });
    else if (S.opts.scope === 'forum') S.queue.push({ url: S.opts.startUrl || here, kind: 'forum' });
    else S.queue.push({ url: ORIGIN + '/', kind: 'index' });
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return false;
    if (msg.type === 'WF_START') {
      if (S.running) { sendResponse({ ok: false, error: 'already running' }); return true; }
      chrome.storage.local.get('wf_compliance', (o) => {
        S.compliance = o.wf_compliance || null;
        S.opts = Object.assign({ scope: 'current', delayMs: 4000, includePosts: true, maxPagesPer: 0, maxThreads: 0, maxRequests: 0 }, msg.opts || {});
        S.queue = []; S.queued = new Set(); S.visited = new Set(); S.seenThreads = new Set(); S.seenPosts = new Set();
        S.records = { forums: [], threads: [], posts: [], all: [] }; S.requestLog = []; S.skipped = [];
        S.counts = { forums: 0, threads: 0, posts: 0, pages: 0, errors: 0, skipped_disallow: 0 }; S.lastError = '';
        seedQueue(); run(); sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.type === 'WF_STOP') { S.stop = true; sendResponse({ ok: true }); return true; }
    if (msg.type === 'WF_STATUS') { sendResponse({ ok: true, progress: progress(), page_type: XF.detectPageType(location.href) }); return true; }
    if (msg.type === 'WF_SELFTEST') { sendResponse({ ok: true, selftest: XF.selftest(document, location.href) }); return true; }
    if (msg.type === 'WF_FLUSH') { downloadArchive().then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: String(e) })); return true; }
    return false;
  });
})();
