/* Wizard Forums Scraper — content/content.js
 * Session-based XenForo crawler with organized ZIP export.
 */
(function () {
  'use strict';
  if (window.__wfScraperLoaded) return;
  window.__wfScraperLoaded = true;
  const XF = window.XFParse;
  const ORIGIN = 'https://wizardforums.com';
  const VERSION = '2.1.0';

  const S = {
    running: false, stop: false, opts: null, compliance: null,
    queue: [], queued: new Set(), visited: new Set(), seenThreads: new Set(), seenPosts: new Set(), seenLinks: new Set(), seenResources: new Set(),
    records: { forums: [], threads: [], posts: [], links: [], resources: [], pages: [], all: [] }, requestLog: [], skipped: [],
    stamp: '', counts: { forums: 0, threads: 0, posts: 0, links: 0, resources: 0, pages: 0, errors: 0, skipped_disallow: 0 },
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
    else if (out.type === 'link') { S.records.links.push(out); S.counts.links += 1; }
    else if (out.type === 'resource') { S.records.resources.push(out); S.counts.resources += 1; }
    else if (out.type === 'page') S.records.pages.push(out);
  }

  function enqueue(url, kind) {
    if (!url) return;
    let u;
    try { u = new URL(url, ORIGIN).href.split('#')[0]; } catch (e) { return; }
    if (u.indexOf(ORIGIN) !== 0) return;
    if (S.visited.has(u) || S.queued.has(u)) return;
    if (disallowed(u)) { S.counts.skipped_disallow += 1; S.skipped.push({ url: u, kind, reason: 'robots_disallow', at: isoNow() }); return; }
    S.queued.add(u);
    const priority = kind === 'thread' ? 1 : (kind === 'forum' ? 2 : 0);
    S.queue.push({ url: u, kind, priority });
    S.queue.sort((a, b) => a.priority - b.priority);
  }

  function addPageLinks(d, url, kind, context) {
    const links = XF.parseLinks(d, url, { type: kind + '_page', page_url: url, ...(context || {}) });
    emit({ type: 'page', url, kind, link_count: links.length, scraped_at: isoNow() });
    for (const link of links) addLink(link, { source_url: url, page_kind: kind, ...(context || {}) });
  }
  function addLink(link, context) {
    const out = Object.assign({ type: 'link', link_url: link.url, link_text: link.text, link_title: link.title,
      rel: link.rel, download_name: link.download, external: link.external, resource_type: link.resource_type || null }, context || {});
    const key = [out.source_url || '', out.post_id || '', out.page_kind || '', out.link_url || ''].join('|');
    if (!out.link_url || S.seenLinks.has(key)) return;
    S.seenLinks.add(key); emit(out);
    if (link.resource_type) {
      const rkey = key + '|' + link.resource_type;
      if (!S.seenResources.has(rkey)) { S.seenResources.add(rkey); emit(Object.assign({}, out, { type: 'resource' })); }
    }
  }
  async function handleIndex(d, url) {
    addPageLinks(d, url, 'index');
    for (const f of XF.parseBoardIndex(d, url).forums) {
      emit(Object.assign({ type: 'forum' }, f, { source_url: url }));
      enqueue(f.url, 'forum');
      for (const sf of (f.sub_forums || [])) enqueue(sf.url, 'forum');
    }
  }
  async function handleForum(d, url) {
    addPageLinks(d, url, 'forum');
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
    for (const link of (parsed.page_links || [])) addLink(link, { source_url: url, thread_id: parsed.thread.id, thread_title: parsed.thread.title, page_kind: 'thread_page' });
    if (parsed.thread.id && !S.seenThreads.has(parsed.thread.id)) {
      S.seenThreads.add(parsed.thread.id);
      emit(Object.assign({ type: 'thread' }, parsed.thread, { source_url: url, discovered_from: 'thread_page' }));
    }
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
      for (const link of (p.links || [])) addLink(link, { source_url: url, post_id: p.id, thread_id: parsed.thread.id, thread_title: parsed.thread.title, post_number: p.post_number, page_kind: 'thread' });
    }
    if (parsed.pageNav.nextUrl && withinPageCap(parsed.pageNav)) enqueue(parsed.pageNav.nextUrl, 'thread');
  }
  function withinPageCap(pageNav) { return !S.opts.maxPagesPer || (pageNav.current || 1) < S.opts.maxPagesPer; }

  function archiveEntries() {
    const crawledAt = isoNow();
    const crawl = { schema_version: '2.1', scraper_version: VERSION, archive_created_at: crawledAt,
      crawl_started_at: S.stamp, current_url: location.href, scope: S.opts.scope, options: S.opts,
      counts: S.counts, queue_remaining: S.queue.length, visited_pages: S.visited.size, stopped: S.stop, last_error: S.lastError,
      page_type: XF.detectPageType(location.href), selftest: XF.selftest(document, location.href) };
    const errors = { schema_version: '2.1', errors: S.requestLog.filter((x) => x.error || x.ok === false),
      skipped: S.skipped, last_error: S.lastError, stopped: S.stop, generated_at: crawledAt };
    const schema = { schema_version: '2.1', description: 'WizardForums full-board analysis archive', record_types: {
      forum: 'data/forums.jsonl', thread: 'data/threads.jsonl', post: 'data/posts.jsonl', link: 'data/links.jsonl', resource: 'data/resources.jsonl', page: 'data/pages.jsonl' },
      compatibility: 'data/all.ndjson contains every typed record; every record has scraped_at and scraper_version.' };
    const readme = 'WizardForums Scraper full-board analysis archive\n===============================================\n\n'
      + 'This ZIP contains all accessible forums, paginated forum pages, threads, paginated thread pages, posts, replies, links, and resource metadata discovered during the crawl.\n'
      + 'Open metadata/crawl.json first. Use data/*.jsonl for lossless typed records and index/*.csv for spreadsheets, pandas, SQL imports, and graph analysis.\n'
      + 'Links and resources retain their source post/thread/page, visible text, external/internal status, and classified resource type.\n'
      + 'PDFs, books, ebooks, documents, archives, and attachments are recorded as URLs and metadata; binary files are not downloaded automatically.\n\n'
      + 'The archive reflects only content visible to the authenticated browser session and the selected scope. A full-board crawl can be large and should be allowed to finish.\n';
    const forumCols = ['id', 'slug', 'url', 'title', 'description', 'threads_count', 'messages_count', 'sub_forums', 'source_url', 'scraped_at'];
    const threadCols = ['id', 'url', 'title', 'slug', 'prefix', 'author', 'author_id', 'author_url', 'forum', 'created', 'reply_count', 'view_count', 'last_post', 'sticky', 'locked', 'redirect', 'source_url', 'scraped_at'];
    const postCols = ['id', 'thread_id', 'thread_title', 'forum', 'author', 'author_id', 'post_number', 'posted_at', 'body_text', 'body_html', 'body_text_length', 'body_html_length', 'quote_count', 'attachment_count', 'attachments', 'links', 'reactions_count', 'has_reactions', 'edited', 'deleted', 'ignored', 'source_url', 'scraped_at'];
    const linkCols = ['link_url', 'link_text', 'link_title', 'rel', 'download_name', 'external', 'resource_type', 'thread_id', 'post_id', 'thread_title', 'post_number', 'page_kind', 'source_url', 'scraped_at'];
    const resourceCols = ['link_url', 'link_text', 'resource_type', 'download_name', 'external', 'thread_id', 'post_id', 'thread_title', 'post_number', 'source_url', 'scraped_at'];
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
      { name: 'data/links.jsonl', data: jsonl(S.records.links) },
      { name: 'data/resources.jsonl', data: jsonl(S.records.resources) },
      { name: 'data/pages.jsonl', data: jsonl(S.records.pages) },
      { name: 'data/all.ndjson', data: jsonl(S.records.all) },
      { name: 'index/forums.csv', data: csv(S.records.forums, forumCols) },
      { name: 'index/threads.csv', data: csv(S.records.threads, threadCols) },
      { name: 'index/posts.csv', data: csv(S.records.posts, postCols) },
      { name: 'index/links.csv', data: csv(S.records.links, linkCols) },
      { name: 'index/resources.csv', data: csv(S.records.resources, resourceCols) },
    ];
  }

  const MAX_PART_ZIP_BYTES = 28000000;
  const entryBytes = (entry) => {
    const data = typeof entry.data === 'string' ? new TextEncoder().encode(entry.data).length : (entry.data || []).length;
    return data + String(entry.name || '').length + 80;
  };
  function suffixPartName(name, partNo) {
    const m = String(name).match(/^(.*?)(\.[^./]*)?$/);
    return (m ? m[1] : name) + '.part-' + String(partNo).padStart(3, '0') + (m && m[2] ? m[2] : '');
  }
  function splitLargeEntry(entry, maxBytes) {
    if (entryBytes(entry) <= maxBytes) return [entry];
    if (typeof entry.data !== 'string' || !entry.data.includes('\n')) throw new Error('archive entry too large to split safely: ' + entry.name);
    const lines = entry.data.split(/(?<=\n)/);
    const out = []; let buf = ''; let bufBytes = 0; let part = 1;
    for (const line of lines) {
      const lineBytes = new TextEncoder().encode(line).length;
      const partName = suffixPartName(entry.name, part);
      const overhead = partName.length + 80;
      if (buf && overhead + bufBytes + lineBytes > maxBytes) {
        out.push({ name: partName, data: buf }); part += 1; buf = ''; bufBytes = 0;
      }
      const nextName = suffixPartName(entry.name, part);
      if (nextName.length + 80 + lineBytes > maxBytes) throw new Error('archive line too large to split safely: ' + entry.name);
      buf += line; bufBytes += lineBytes;
    }
    if (buf) out.push({ name: suffixPartName(entry.name, part), data: buf });
    return out;
  }
  function buildArchiveParts(entries) {
    const expanded = [];
    for (const entry of entries) expanded.push(...splitLargeEntry(entry, MAX_PART_ZIP_BYTES - 1024));
    const parts = []; let current = []; let size = 22;
    for (const entry of expanded) {
      const n = entryBytes(entry);
      if (current.length && size + n > MAX_PART_ZIP_BYTES) { parts.push(current); current = []; size = 22; }
      current.push(entry); size += n;
    }
    if (current.length || !parts.length) parts.push(current);
    return parts;
  }
  async function downloadArchive() {
    const base = 'WizardForums/wf-' + S.stamp;
    const rawEntries = archiveEntries();
    const parts = buildArchiveParts(rawEntries);
    const partNames = parts.map((_, i) => base + '-part-' + String(i + 1).padStart(3, '0') + '-of-' + String(parts.length).padStart(3, '0') + '.zip');
    const manifest = { schema_version: '2.2', archive_id: S.stamp, part_count: parts.length,
      parts: partNames.map((name, i) => ({ part: i + 1, filename: name, entry_count: parts[i].length })),
      logical_entry_count: rawEntries.length, counts: S.counts, created_at: isoNow(), note: 'Join by extracting all parts into one directory; JSONL/CSV files with .part-NNN suffix are ordered chunks.' };
    const downloaded = []; let totalBytes = 0;
    for (let i = 0; i < parts.length; i += 1) {
      const partEntries = [{ name: 'metadata/archive_manifest.json', data: json(manifest) },
        { name: 'metadata/part.json', data: json({ archive_id: S.stamp, part: i + 1, part_count: parts.length, filename: partNames[i] }) }, ...parts[i]];
      progress({ archive: { status: 'exporting', part: i + 1, parts: parts.length, filename: partNames[i] } });
      const r = await chrome.runtime.sendMessage({ type: 'WF_DOWNLOAD_ARCHIVE', filename: partNames[i], entries: partEntries });
      if (!r || !r.ok) throw new Error((r && r.error) || 'archive part download failed');
      downloaded.push({ filename: partNames[i], bytes: r.bytes || 0 }); totalBytes += r.bytes || 0;
    }
    S.archive = { status: 'ready', filename: partNames[0], parts: downloaded, part_count: parts.length, bytes: totalBytes, downloaded_at: isoNow() };
  }

  if (typeof globalThis !== 'undefined' && globalThis.__WF_TEST__) {
    globalThis.__WF_TEST__.buildArchiveParts = buildArchiveParts;
    globalThis.__WF_TEST__.splitLargeEntry = splitLargeEntry;
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
        const before = { forums: S.counts.forums, threads: S.counts.threads, posts: S.counts.posts, links: S.counts.links, resources: S.counts.resources };
        if (item.kind === 'index') await handleIndex(d, item.url);
        else if (item.kind === 'forum') await handleForum(d, item.url);
        else if (item.kind === 'thread') await handleThread(d, item.url);
        const request = [...S.requestLog].reverse().find((x) => x.url === item.url && x.kind === item.kind);
        if (request) request.records_added = { forums: S.counts.forums - before.forums, threads: S.counts.threads - before.threads, posts: S.counts.posts - before.posts, links: S.counts.links - before.links, resources: S.counts.resources - before.resources };
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
  function validateScopeStart() {
    const target = S.opts.startUrl || location.href;
    const type = XF.detectPageType(target);
    if (S.opts.scope === 'thread' && type !== 'thread') return 'Thread scope requires a thread page. Open a thread first.';
    if (S.opts.scope === 'forum' && type !== 'forum') return 'Forum scope requires a forum page. Open a forum first.';
    return '';
  }
  function seedQueue() {
    const here = location.href.split('#')[0], type = XF.detectPageType(here);
    if (S.opts.scope === 'current') S.queue.push({ url: here, kind: type === 'other' ? 'index' : type, useDocument: true, priority: 0 });
    else if (S.opts.scope === 'thread') S.queue.push({ url: S.opts.startUrl || here, kind: 'thread', priority: 1 });
    else if (S.opts.scope === 'forum') S.queue.push({ url: S.opts.startUrl || here, kind: 'forum', priority: 2 });
    else S.queue.push({ url: ORIGIN + '/', kind: 'index', priority: 0 });
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return false;
    if (msg.type === 'WF_START') {
      if (S.running) { sendResponse({ ok: false, error: 'already running' }); return true; }
      chrome.storage.local.get('wf_compliance', (o) => {
        S.compliance = o.wf_compliance || null;
        S.opts = Object.assign({ scope: 'current', delayMs: 4000, includePosts: true, maxPagesPer: 0, maxThreads: 0, maxRequests: 0 }, msg.opts || {});
        const scopeError = validateScopeStart();
        if (scopeError) { sendResponse({ ok: false, error: scopeError }); return; }
        S.queue = []; S.queued = new Set(); S.visited = new Set(); S.seenThreads = new Set(); S.seenPosts = new Set(); S.seenLinks = new Set(); S.seenResources = new Set();
        S.records = { forums: [], threads: [], posts: [], links: [], resources: [], pages: [], all: [] }; S.requestLog = []; S.skipped = [];
        S.counts = { forums: 0, threads: 0, posts: 0, links: 0, resources: 0, pages: 0, errors: 0, skipped_disallow: 0 }; S.lastError = '';
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
