/* Wizard Forums Scraper — content/content.js
 * Session-based XenForo crawler with organized ZIP export.
 */
(function () {
  'use strict';
  if (window.__wfScraperLoaded) return;
  window.__wfScraperLoaded = true;
  const XF = window.XFParse;
  const ORIGIN = 'https://wizardforums.com';
  const VERSION = '2.5.0';
  const EXCLUDED_FORUMS = new Set(['5', 'introductions', 'introductions.5']);

  const S = {
    running: false, stop: false, opts: null, compliance: null,
    queue: [], queued: new Set(), visited: new Set(), seenForums: new Set(), seenThreads: new Set(), seenPosts: new Set(), seenLinks: new Set(), seenResources: new Set(),
    records: { forums: [], threads: [], posts: [], links: [], resources: [], pages: [], all: [] }, requestLog: [], skipped: [],
    stamp: '', counts: { forums: 0, threads: 0, posts: 0, links: 0, resources: 0, pages: 0, errors: 0, skipped_disallow: 0 },
    lastError: '', archive: null, checkpointNo: 0, checkpointBusy: false, checkpointCursor: { forums: 0, threads: 0, posts: 0, links: 0, resources: 0, pages: 0, all: 0, requests: 0 },
    inFlight: 0, nextRequestAt: 0, consecutive403: 0,
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function isExcludedForum(url, title) {
    let path = '', id = '', slug = '';
    try { path = new URL(url, ORIGIN).pathname.toLowerCase(); } catch (e) {}
    const m = path.match(/\/forums\/([^/]+)\.(\d+)\/?/i);
    if (m) { slug = m[1]; id = m[2]; }
    const normalizedTitle = String(title || '').trim().toLowerCase();
    return EXCLUDED_FORUMS.has(id) || EXCLUDED_FORUMS.has(slug) || EXCLUDED_FORUMS.has(slug + (id ? '.' + id : '')) || normalizedTitle === 'introductions';
  }
  function canonicalCrawlUrl(url) {
    try {
      const u = new URL(url, ORIGIN); u.hash = '';
      // /unread is a session-specific cursor, not a stable crawl page. Keep numbered pages.
      u.pathname = u.pathname.replace(/\/unread\/?$/i, '/').replace(/\/post-\d+\/?$/i, '/');
      if (u.pathname !== '/' && !u.pathname.endsWith('/')) u.pathname += '/';
      for (const k of Array.from(u.searchParams.keys())) if (/^(sid|_xfToken|fbclid)$/i.test(k) || /^utm_/i.test(k)) u.searchParams.delete(k);
      return u.href;
    } catch (e) { return ''; }
  }
  async function paceRequest(baseDelay) {
    const now = Date.now();
    const wait = Math.max(0, S.nextRequestAt - now);
    if (wait) await sleep(wait);
    const jitter = Math.floor(Math.random() * Math.max(50, baseDelay * 0.25));
    S.nextRequestAt = Date.now() + baseDelay + jitter;
  }
  const nowStamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const isoNow = () => new Date().toISOString();
  const json = (x) => JSON.stringify(x, null, 2) + '\n';
  const jsonl = (xs) => xs.map((x) => JSON.stringify(x)).join('\n') + (xs.length ? '\n' : '');
  const csvCell = (v) => '"' + String(v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v)).replace(/"/g, '""') + '"';
  const csv = (rows, columns) => [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
  function words(text) { return String(text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []; }
  function postFeatureRow(p) {
    const text = String(p.body_text || ''); const ws = words(text); const unique = new Set(ws);
    return { post_id: p.id || null, thread_id: p.thread_id || null, thread_title: p.thread_title || null, forum_id: p.forum && p.forum.id || null,
      author: p.author || null, posted_at: p.posted_at || null, body_text_length: text.length, body_html_length: String(p.body_html || '').length,
      word_count: ws.length, unique_word_count: unique.size, sentence_count: (text.match(/[.!?]+(?=\s|$)/g) || []).length,
      question_count: (text.match(/\?/g) || []).length, exclamation_count: (text.match(/!/g) || []).length,
      url_count: (text.match(/https?:\/\/|www\./gi) || []).length, quote_count: p.quote_count || 0, attachment_count: p.attachment_count || 0,
      link_count: Array.isArray(p.links) ? p.links.length : 0, reaction_count: Number(p.reactions_count || 0),
      has_reactions: !!p.has_reactions, empty_body: text.trim().length === 0, edited: !!p.edited, deleted: !!p.deleted, ignored: !!p.ignored, source_url: p.source_url || null };
  }
  function domainOf(url) { try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; } }
  function percentile(values, q) { if (!values.length) return null; const a = values.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor((a.length - 1) * q))]; }
  function analysisProfile() {
    const posts = S.records.posts, lengths = posts.map((p) => Number(p.body_text_length || 0));
    const domains = {}, resources = {}, statuses = {};
    for (const l of S.records.links) { const d = domainOf(l.link_url); if (d) domains[d] = (domains[d] || 0) + 1; }
    for (const r of S.records.resources) resources[r.resource_type || 'unknown'] = (resources[r.resource_type || 'unknown'] || 0) + 1;
    for (const x of S.requestLog) { const k = String(x.status == null ? 'network_error' : x.status); statuses[k] = (statuses[k] || 0) + 1; }
    const dateValues = posts.map((p) => p.posted_at).concat(S.records.threads.map((t) => t.created)).filter(Boolean).sort();
    const duplicateRisk = { forums: S.records.forums.length - new Set(S.records.forums.map((x) => x.id || x.url)).size, threads: S.records.threads.length - new Set(S.records.threads.map((x) => x.id || x.url)).size, posts: posts.length - new Set(posts.map((x) => x.id || x.source_url + '#' + x.post_number)).size };
    return { profile_version: '1.0', generated_at: isoNow(), record_counts: Object.fromEntries(Object.entries(S.records).map(([k, v]) => [k, v.length])), crawl_counts: S.counts,
      quality_gates: { has_threads: S.records.threads.length > 0, has_posts_when_requested: !S.opts.includePosts || posts.length > 0, error_rate: S.requestLog.length ? S.requestLog.filter((x) => x.ok === false).length / S.requestLog.length : 0, duplicate_risk: duplicateRisk, empty_post_rate: posts.length ? posts.filter((p) => !String(p.body_text || '').trim()).length / posts.length : null },
      post_body: { min_length: lengths.length ? Math.min(...lengths) : null, median_length: percentile(lengths, 0.5), p90_length: percentile(lengths, 0.9), max_length: lengths.length ? Math.max(...lengths) : null, date_min: dateValues[0] || null, date_max: dateValues[dateValues.length - 1] || null },
      top_link_domains: Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([domain, count]) => ({ domain, count })), resource_types: resources, http_statuses: statuses,
      exclusions: { introductions_forum: S.counts.skipped_excluded || 0 }, recommendations: [S.records.posts.length === 0 ? 'Do not run topic analysis until posts are present.' : null, S.counts.errors ? 'Review metadata/errors.json and request status distribution before interpreting coverage.' : null, duplicateRisk.posts ? 'Investigate duplicate post keys before graph or topic analysis.' : null].filter(Boolean) };
  }
  function dataDictionary() { return { generated_at: isoNow(), fields: { 'data/posts.jsonl': { body_text: 'Visible post text with signatures and chrome removed where parser can identify them.', body_html: 'Sanitized/raw message content HTML as captured from the page.', thread_id: 'Stable XenForo thread identifier.', post_number: 'Display position within the thread when available.' }, 'index/post_features.csv': { word_count: 'Unicode-aware token count from body_text.', unique_word_count: 'Distinct lowercase token count.', empty_body: 'Whether body_text is empty after trimming.', link_count: 'Links extracted from the post.' }, 'data/links.jsonl': { link_url: 'Absolute URL.', source_url: 'Page URL where link was observed.', post_id: 'Source post ID when available.', external: 'Whether hostname is outside wizardforums.com.' }, 'data/resources.jsonl': { resource_type: 'Classifier output such as pdf, ebook, document, archive, or download.' } } }; }

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
    const maxAttempts = Number(S.opts && S.opts.retryAttempts) || 3;
    const baseDelay = Math.max(Number(S.opts && S.opts.delayMs) || 1500, 750);
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const started = performance.now();
      try {
        await paceRequest(baseDelay * (S.consecutive403 ? clamp(1 + S.consecutive403 * 0.5, 1, 4) : 1));
        const resp = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
        const html = await resp.text();
        logRequest({ url, kind, status: resp.status, ok: resp.ok, bytes: html.length,
          attempt, duration_ms: Math.round(performance.now() - started) });
        if (resp.ok) { S.consecutive403 = 0; return new DOMParser().parseFromString(html, 'text/html'); }
        const retryable = resp.status === 403 || resp.status === 408 || resp.status === 425 || resp.status === 429 || resp.status >= 500;
        lastError = new Error('HTTP ' + resp.status + ' ' + url);
        if (resp.status === 403) S.consecutive403 += 1;
        if (!retryable || attempt >= maxAttempts) break;
        await sleep(Math.min(30000, baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500)));
      } catch (e) {
        lastError = e;
        logRequest({ url, kind, status: null, ok: false, bytes: 0, attempt,
          duration_ms: Math.round(performance.now() - started), error: String((e && e.message) || e) });
        if (attempt >= maxAttempts) break;
        await sleep(Math.min(30000, baseDelay * Math.pow(2, attempt - 1)));
      }
    }
    throw lastError || new Error('request failed: ' + url);
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
    const u = canonicalCrawlUrl(url);
    if (!u || u.indexOf(ORIGIN) !== 0) return;
    if (kind === 'forum' && isExcludedForum(u)) { S.counts.skipped_excluded += 1; S.skipped.push({ url: u, kind, reason: 'excluded_forum_introductions', at: isoNow() }); return; }
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
      const forumKey = f.id || f.url;
      if (forumKey && S.seenForums.has(forumKey)) continue;
      if (forumKey) S.seenForums.add(forumKey);
      if (isExcludedForum(f.url, f.title)) { S.counts.skipped_excluded += 1; S.skipped.push({ url: f.url, kind: 'forum', reason: 'excluded_forum_introductions', title: f.title, at: isoNow() }); continue; }
      emit(Object.assign({ type: 'forum' }, f, { source_url: url }));
      enqueue(f.url, 'forum');
      for (const sf of (f.sub_forums || [])) if (!isExcludedForum(sf.url, sf.title)) enqueue(sf.url, 'forum');
    }
  }
  async function handleForum(d, url) {
    if (isExcludedForum(url)) return;
    addPageLinks(d, url, 'forum');
    const parsed = XF.parseForumNode(d, url);
    for (const t of parsed.threads) {
      if (S.opts.maxThreads && S.counts.threads >= S.opts.maxThreads) break;
      const threadKey = t.id || t.url;
      if (threadKey && S.seenThreads.has(threadKey)) continue;
      if (threadKey) S.seenThreads.add(threadKey);
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
      const key = p.id || (parsed.thread.id ? parsed.thread.id + '#' + (p.post_number || p.author || 'unknown') : url + '#' + (p.post_number || p.author || 'unknown'));
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
    const crawl = { schema_version: '2.5', scraper_version: VERSION, archive_created_at: crawledAt,
      crawl_started_at: S.stamp, current_url: location.href, scope: S.opts.scope, options: S.opts, scheduler: { concurrency: S.opts.concurrency, retry_attempts: S.opts.retryAttempts, checkpoint_every_pages: S.opts.checkpointEveryPages },
      checkpoints: { count: S.checkpointNo, last: S.checkpointNo ? S.checkpointNo : null },
      counts: S.counts, queue_remaining: S.queue.length, visited_pages: S.visited.size, stopped: S.stop, last_error: S.lastError,
      page_type: XF.detectPageType(location.href), selftest: XF.selftest(document, location.href) };
    const errors = { schema_version: '2.5', errors: S.requestLog.filter((x) => x.error || x.ok === false),
      skipped: S.skipped, last_error: S.lastError, stopped: S.stop, generated_at: crawledAt };
    const schema = { schema_version: '2.5', description: 'WizardForums full-board analysis archive with checkpoint deltas', record_types: {
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
    const postCols = ['id', 'thread_id', 'thread_title', 'forum', 'author', 'author_id', 'post_number', 'posted_at', 'body_text_length', 'body_html_length', 'quote_count', 'attachment_count', 'reactions_count', 'has_reactions', 'edited', 'deleted', 'ignored', 'source_url', 'scraped_at'];
    const postFeatureCols = ['post_id', 'thread_id', 'thread_title', 'forum_id', 'author', 'posted_at', 'body_text_length', 'body_html_length', 'word_count', 'unique_word_count', 'sentence_count', 'question_count', 'exclamation_count', 'url_count', 'quote_count', 'attachment_count', 'link_count', 'reaction_count', 'has_reactions', 'empty_body', 'edited', 'deleted', 'ignored', 'source_url'];
    const linkCols = ['link_url', 'link_text', 'link_title', 'rel', 'download_name', 'external', 'resource_type', 'thread_id', 'post_id', 'thread_title', 'post_number', 'page_kind', 'source_url', 'scraped_at'];
    const resourceCols = ['link_url', 'link_text', 'resource_type', 'download_name', 'external', 'thread_id', 'post_id', 'thread_title', 'post_number', 'source_url', 'scraped_at'];
    return [
      { name: 'README.txt', data: readme },
      { name: 'metadata/crawl.json', data: json(crawl) },
      { name: 'metadata/robots.json', data: json(S.compliance || {}) },
      { name: 'metadata/requests.jsonl', data: jsonl(S.requestLog) },
      { name: 'metadata/errors.json', data: json(errors) },
      { name: 'metadata/schema.json', data: json(schema) },
      { name: 'analysis/profile.json', data: json(analysisProfile()) },
      { name: 'analysis/data_dictionary.json', data: json(dataDictionary()) },
      { name: 'analysis/quality_gates.json', data: json({ generated_at: isoNow(), gates: [{ name: 'posts_present', pass: !S.opts.includePosts || S.records.posts.length > 0, action: 'Do not interpret post-level results if false.' }, { name: 'request_error_rate', pass: !S.requestLog.length || S.requestLog.filter((x) => x.ok === false).length / S.requestLog.length < 0.1, action: 'Review errors and coverage before inference.' }, { name: 'duplicate_keys', pass: analysisProfile().quality_gates.duplicate_risk.posts === 0, action: 'Resolve duplicate identity keys before network analysis.' }] }) },
      { name: 'metadata/checkpoints.json', data: json({ archive_id: S.stamp, checkpoint_count: S.checkpointNo, checkpoint_directory: 'checkpoints/', note: 'Checkpoint archives are deltas; apply them in order before the final snapshot.' }) },
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
      { name: 'index/post_features.csv', data: csv(S.records.posts.map(postFeatureRow), postFeatureCols) },
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
  function sliceSince(kind) {
    const start = S.checkpointCursor[kind] || 0;
    const rows = kind === 'requests' ? S.requestLog : S.records[kind];
    return rows.slice(start);
  }
  function checkpointEntries() {
    const entries = [
      { name: 'metadata/checkpoint.json', data: json({ schema_version: '2.5', archive_id: S.stamp, checkpoint: S.checkpointNo, created_at: isoNow(), counts: S.counts, queue_remaining: S.queue.length, visited_pages: S.visited.size, cursor: S.checkpointCursor, note: 'Checkpoint contains only records added since the previous checkpoint; apply in order.' }) },
      { name: 'metadata/requests.jsonl', data: jsonl(sliceSince('requests')) },
      { name: 'data/forums.jsonl', data: jsonl(sliceSince('forums')) },
      { name: 'data/threads.jsonl', data: jsonl(sliceSince('threads')) },
      { name: 'data/posts.jsonl', data: jsonl(sliceSince('posts')) },
      { name: 'data/links.jsonl', data: jsonl(sliceSince('links')) },
      { name: 'data/resources.jsonl', data: jsonl(sliceSince('resources')) },
      { name: 'data/pages.jsonl', data: jsonl(sliceSince('pages')) },
      { name: 'data/all.ndjson', data: jsonl(sliceSince('all')) },
    ];
    return entries;
  }
  async function downloadEntries(rawEntries, base, kind) {
    const parts = buildArchiveParts(rawEntries);
    const partNames = parts.map((_, i) => base + '-part-' + String(i + 1).padStart(3, '0') + '-of-' + String(parts.length).padStart(3, '0') + '.zip');
    const manifest = { schema_version: '2.5', archive_id: S.stamp, export_kind: kind, checkpoint: kind === 'checkpoint' ? S.checkpointNo : null,
      part_count: parts.length, parts: partNames.map((name, i) => ({ part: i + 1, filename: name, entry_count: parts[i].length })),
      logical_entry_count: rawEntries.length, counts: S.counts, created_at: isoNow(), note: 'Extract all parts in order. Checkpoints contain deltas; final parts contain the complete snapshot.' };
    const downloaded = []; let totalBytes = 0;
    for (let i = 0; i < parts.length; i += 1) {
      const partEntries = [{ name: 'metadata/archive_manifest.json', data: json(manifest) },
        { name: 'metadata/part.json', data: json({ archive_id: S.stamp, export_kind: kind, checkpoint: kind === 'checkpoint' ? S.checkpointNo : null, part: i + 1, part_count: parts.length, filename: partNames[i] }) }, ...parts[i]];
      progress({ archive: { status: kind === 'checkpoint' ? 'checkpoint_exporting' : 'exporting', checkpoint: kind === 'checkpoint' ? S.checkpointNo : null, part: i + 1, parts: parts.length, filename: partNames[i] } });
      const r = await chrome.runtime.sendMessage({ type: 'WF_DOWNLOAD_ARCHIVE', filename: partNames[i], entries: partEntries });
      if (!r || !r.ok) throw new Error((r && r.error) || 'archive part download failed');
      downloaded.push({ filename: partNames[i], bytes: r.bytes || 0 }); totalBytes += r.bytes || 0;
    }
    return { parts: downloaded, part_count: parts.length, bytes: totalBytes, manifest };
  }
  async function downloadCheckpoint() {
    if (S.checkpointBusy || !S.running || S.stop) return;
    S.checkpointBusy = true;
    try {
      const result = await downloadEntries(checkpointEntries(), 'WizardForums/wf-' + S.stamp + '/checkpoints/cp-' + String(S.checkpointNo).padStart(4, '0'), 'checkpoint');
      for (const key of Object.keys(S.checkpointCursor)) S.checkpointCursor[key] = key === 'requests' ? S.requestLog.length : S.records[key].length;
      await chrome.storage.local.set({ wf_checkpoint: { archive_id: S.stamp, checkpoint: S.checkpointNo, cursor: S.checkpointCursor, counts: S.counts, queue_remaining: S.queue.length, parts: result.parts, at: Date.now() } });
      progress({ archive: { status: 'checkpoint_ready', checkpoint: S.checkpointNo, parts: result.parts } });
    } finally { S.checkpointBusy = false; }
  }
  async function downloadArchive() {
    const result = await downloadEntries(archiveEntries(), 'WizardForums/wf-' + S.stamp + '/final', 'final');
    S.archive = { status: 'ready', filename: result.parts[0] && result.parts[0].filename, parts: result.parts, part_count: result.part_count, bytes: result.bytes, downloaded_at: isoNow() };
  }

  if (typeof globalThis !== 'undefined' && globalThis.__WF_TEST__) {
    globalThis.__WF_TEST__.buildArchiveParts = buildArchiveParts;
    globalThis.__WF_TEST__.splitLargeEntry = splitLargeEntry;
    globalThis.__WF_TEST__.canonicalCrawlUrl = canonicalCrawlUrl;
    globalThis.__WF_TEST__.isExcludedForum = isExcludedForum;
    globalThis.__WF_TEST__.postFeatureRow = postFeatureRow;
  }

  async function processItem(item, delay) {
    if (!item || S.stop || (S.opts.maxRequests && S.counts.pages >= S.opts.maxRequests)) return;
    if (S.visited.has(item.url)) return;
    S.visited.add(item.url); S.inFlight += 1;
    try {
      let d;
      if (item.useDocument) { d = document; logRequest({ url: item.url, kind: item.kind, status: 'current-document', ok: true, bytes: null, duration_ms: 0 }); }
      else d = await fetchDoc(item.url, item.kind);
      S.counts.pages += 1;
      const before = { forums: S.counts.forums, threads: S.counts.threads, posts: S.counts.posts, links: S.counts.links, resources: S.counts.resources };
      if (item.kind === 'index') await handleIndex(d, item.url);
      else if (item.kind === 'forum') await handleForum(d, item.url);
      else if (item.kind === 'thread') await handleThread(d, item.url);
      const request = [...S.requestLog].reverse().find((x) => x.url === item.url && x.kind === item.kind);
      if (request) request.records_added = { forums: S.counts.forums - before.forums, threads: S.counts.threads - before.threads, posts: S.counts.posts - before.posts, links: S.counts.links - before.links, resources: S.counts.resources - before.resources };
    } catch (e) { S.counts.errors += 1; S.lastError = String((e && e.message) || e); }
    finally { S.inFlight = Math.max(0, S.inFlight - 1); }
  }
  async function run() {
    S.running = true; S.stop = false; S.archive = null; S.stamp = nowStamp(); S.checkpointNo = 0; S.checkpointBusy = false;
    S.checkpointCursor = { forums: 0, threads: 0, posts: 0, links: 0, resources: 0, pages: 0, all: 0, requests: 0 };
    progress();
    const delay = Math.max(Number(S.opts.delayMs) || 1500, ((S.compliance && S.compliance.crawlDelay) || 0) * 1000);
    const workers = clamp(Number(S.opts.concurrency) || 2, 1, 3);
    const checkpointEvery = Math.max(25, Number(S.opts.checkpointEveryPages) || 100);
    while ((S.queue.length || S.inFlight) && !S.stop) {
      const batch = [];
      while (batch.length < workers && S.queue.length && !S.stop) {
        if (S.opts.maxRequests && S.counts.pages + S.inFlight >= S.opts.maxRequests) break;
        const item = S.queue.shift(); S.queued.delete(item.url);
        if (!S.visited.has(item.url)) batch.push(processItem(item, delay));
      }
      if (batch.length) await Promise.all(batch);
      if (S.counts.pages && S.counts.pages % checkpointEvery < workers && !S.checkpointBusy) {
        S.checkpointNo += 1;
        try { await downloadCheckpoint(); } catch (e) { S.counts.errors += 1; S.lastError = 'checkpoint: ' + String((e && e.message) || e); }
      }
      mirror(); progress({ concurrency: workers, inFlight: S.inFlight, next_checkpoint_pages: checkpointEvery });
      if (!batch.length && !S.inFlight && S.queue.length) await sleep(250);
    }
    if (!S.stop) {
      try { await downloadArchive(); }
      catch (e) { S.counts.errors += 1; S.lastError = 'archive: ' + String((e && e.message) || e); }
    }
    S.running = false; mirror(); progress({ done: true, inFlight: 0 });
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
    if (S.opts.scope === 'forum' && isExcludedForum(target)) return 'The Introductions forum is excluded from this crawl.';
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
        S.opts = Object.assign({ scope: 'current', delayMs: 1500, retryAttempts: 3, concurrency: 2, checkpointEveryPages: 100, includePosts: true, maxPagesPer: 0, maxThreads: 0, maxRequests: 0 }, msg.opts || {});
        const scopeError = validateScopeStart();
        if (scopeError) { sendResponse({ ok: false, error: scopeError }); return; }
        S.queue = []; S.queued = new Set(); S.visited = new Set(); S.seenForums = new Set(); S.seenThreads = new Set(); S.seenPosts = new Set(); S.seenLinks = new Set(); S.seenResources = new Set();
        S.records = { forums: [], threads: [], posts: [], links: [], resources: [], pages: [], all: [] }; S.requestLog = []; S.skipped = [];
        S.counts = { forums: 0, threads: 0, posts: 0, links: 0, resources: 0, pages: 0, errors: 0, skipped_disallow: 0, skipped_excluded: 0 }; S.lastError = ''; S.checkpointNo = 0; S.checkpointBusy = false; S.inFlight = 0; S.nextRequestAt = 0; S.consecutive403 = 0;
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
