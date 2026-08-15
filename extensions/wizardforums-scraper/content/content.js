/* Wizard Forums Scraper — content/content.js
 * The crawl engine, running in the user's logged-in wizardforums.com tab so it
 * sees exactly what the user can (post bodies are members-only here). Uses
 * same-origin fetch (session cookies included), a polite rate limit, honors
 * robots Disallow + Crawl-delay, dedupes, streams NDJSON parts to the SW, and
 * mirrors progress/state to chrome.storage for the popup + resume.
 */
(function () {
  'use strict';
  if (window.__wfScraperLoaded) return;
  window.__wfScraperLoaded = true;
  const XF = window.XFParse;
  const ORIGIN = 'https://wizardforums.com';

  const S = {
    running: false, stop: false, opts: null, compliance: null,
    queue: [], queued: new Set(), visited: new Set(), seenThreads: new Set(), seenPosts: new Set(),
    buf: [], partSeq: 0, stamp: '', flushChain: Promise.resolve(),
    counts: { forums: 0, threads: 0, posts: 0, pages: 0, errors: 0, skipped_disallow: 0 },
    lastError: '',
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nowStamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  function progress(extra) {
    const p = Object.assign({
      running: S.running, counts: S.counts, queue: S.queue.length,
      stamp: S.stamp, lastError: S.lastError, updatedAt: Date.now(),
    }, extra || {});
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

  async function fetchDoc(url) {
    // plain same-origin GET (session cookies included) → full HTML page. No custom
    // headers: X-Requested-With:XMLHttpRequest would make XenForo return JSON, not HTML.
    const resp = await fetch(url, { credentials: 'same-origin' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + url);
    const html = await resp.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function emit(rec) {
    rec.scraped_at = new Date().toISOString();
    S.buf.push(JSON.stringify(rec));
    if (S.buf.length >= (S.opts.flushEvery || 200)) queueFlush();
  }
  function queueFlush() {
    S.flushChain = S.flushChain.then(() => flushNow()).catch((e) => {
      S.lastError = 'export queue failed: ' + String((e && e.message) || e);
    });
    return S.flushChain;
  }
  async function flushNow() {
    if (!S.buf.length) return;
    const batch = S.buf; S.buf = [];
    await flushChunk(batch);
  }
  async function flush() {
    await S.flushChain;
    await flushNow();
    await S.flushChain;
  }
  // loss-safe: on an oversized-part failure, split and retry down to a single record;
  // the part sequence advances only on a successful download so there are no gaps.
  async function flushChunk(lines) {
    if (!lines.length) return;
    const text = lines.join('\n') + '\n';
    const filename = 'WizardForums/wf-' + S.stamp + '-' + String(S.partSeq + 1).padStart(4, '0') + '.ndjson';
    let r;
    try { r = await chrome.runtime.sendMessage({ type: 'WF_DOWNLOAD', filename, text, mime: 'application/x-ndjson' }); }
    catch (e) { r = { ok: false, error: String((e && e.message) || e) }; }
    if (r && r.ok) { S.partSeq += 1; return; }
    if (lines.length > 1) {
      const mid = Math.floor(lines.length / 2);
      await flushChunk(lines.slice(0, mid));
      await flushChunk(lines.slice(mid));
    } else {
      S.lastError = 'export failed for 1 record: ' + ((r && r.error) || 'unknown');
    }
  }

  function enqueue(url, kind) {
    if (!url) return;
    let u;
    try { u = new URL(url, ORIGIN).href.split('#')[0]; } catch (e) { return; }
    if (u.indexOf(ORIGIN) !== 0) return;          // never leave the origin
    if (S.visited.has(u) || S.queued.has(u)) return;
    if (disallowed(u)) { S.counts.skipped_disallow += 1; return; }
    S.queued.add(u);
    S.queue.push({ url: u, kind });
  }

  async function handleIndex(d, url) {
    const { forums } = XF.parseBoardIndex(d, url);
    for (const f of forums) {
      emit(Object.assign({ type: 'forum' }, f, { source_url: url }));
      S.counts.forums += 1;
      enqueue(f.url, 'forum');
      for (const sf of (f.sub_forums || [])) enqueue(sf.url, 'forum');
    }
  }

  async function handleForum(d, url) {
    const { threads, pageNav } = XF.parseForumNode(d, url);
    for (const t of threads) {
      if (t.id && S.seenThreads.has(t.id)) continue;
      if (t.id) S.seenThreads.add(t.id);
      emit(Object.assign({ type: 'thread' }, t, { source_url: url }));
      S.counts.threads += 1;
      if (S.opts.includePosts && !t.redirect && (!S.opts.maxThreads || S.counts.threads <= S.opts.maxThreads)) {
        enqueue(t.url, 'thread');
      }
    }
    if (pageNav.nextUrl && withinPageCap(url, pageNav)) enqueue(pageNav.nextUrl, 'forum');
  }

  async function handleThread(d, url) {
    const { thread, posts, pageNav, loginWall } = XF.parseThread(d, url);
    if (loginWall) { S.lastError = 'login wall: ' + url + ' (are you logged in?)'; }
    for (const p of posts) {
      const key = p.id || (url + '#' + (p.post_number || Math.random()));
      if (S.seenPosts.has(key)) continue;
      S.seenPosts.add(key);
      emit(Object.assign({ type: 'post', thread_id: thread.id, thread_title: thread.title,
        forum: thread.forum }, p, { source_url: url }));
      S.counts.posts += 1;
    }
    if (pageNav.nextUrl && withinPageCap(url, pageNav)) enqueue(pageNav.nextUrl, 'thread');
  }

  function withinPageCap(url, pageNav) {
    if (!S.opts.maxPagesPer) return true;
    return (pageNav.current || 1) < S.opts.maxPagesPer;
  }

  async function run() {
    S.stamp = nowStamp();
    S.running = true; S.stop = false;
    const delay = Math.max(S.opts.delayMs || 4000,
      ((S.compliance && S.compliance.crawlDelay) || 0) * 1000);
    let firstFetch = true;
    progress();
    while (S.queue.length && !S.stop) {
      if (S.opts.maxRequests && S.counts.pages >= S.opts.maxRequests) { S.lastError = 'reached maxRequests cap'; break; }
      const item = S.queue.shift();
      S.queued.delete(item.url);
      if (S.visited.has(item.url)) continue;
      S.visited.add(item.url);
      try {
        let d;
        if (item.useDocument) { d = document; }
        else {
          if (!firstFetch) await sleep(delay + Math.floor(delay * 0.25 * Math.random()));
          firstFetch = false;
          d = await fetchDoc(item.url);
        }
        S.counts.pages += 1;
        if (item.kind === 'index') await handleIndex(d, item.url);
        else if (item.kind === 'forum') await handleForum(d, item.url);
        else if (item.kind === 'thread') await handleThread(d, item.url);
      } catch (e) {
        S.counts.errors += 1;
        S.lastError = String((e && e.message) || e);
      }
      if (S.counts.pages % 5 === 0) mirror();
      progress();
    }
    await flush();
    S.running = false;
    mirror();
    progress({ done: true });
  }

  function mirror() {
    chrome.storage.local.set({
      wf_state: {
        stamp: S.stamp, counts: S.counts,
        visited: Array.from(S.visited).slice(-5000), // cap the resume mirror
        seenThreads: Array.from(S.seenThreads).slice(-20000),
        opts: S.opts, at: Date.now(),
      },
    });
  }

  function seedQueue() {
    const here = location.href.split('#')[0];
    const type = XF.detectPageType(here);
    if (S.opts.scope === 'current') {
      S.queue.push({ url: here, kind: type === 'other' ? 'index' : type, useDocument: true });
    } else if (S.opts.scope === 'thread') {
      S.queue.push({ url: S.opts.startUrl || here, kind: 'thread' });
    } else if (S.opts.scope === 'forum') {
      S.queue.push({ url: S.opts.startUrl || here, kind: 'forum' });
    } else { // board
      S.queue.push({ url: ORIGIN + '/', kind: 'index' });
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return false;
    if (msg.type === 'WF_START') {
      if (S.running) { sendResponse({ ok: false, error: 'already running' }); return true; }
      chrome.storage.local.get('wf_compliance', (o) => {
        S.compliance = o.wf_compliance || null;
        S.opts = Object.assign({ scope: 'current', delayMs: 4000, includePosts: true,
          maxPagesPer: 0, maxThreads: 0, maxRequests: 0, flushEvery: 200 }, msg.opts || {});
        S.queue = []; S.queued = new Set(); S.visited = new Set(); S.seenThreads = new Set(); S.seenPosts = new Set();
        S.buf = []; S.partSeq = 0; S.flushChain = Promise.resolve();
        S.counts = { forums: 0, threads: 0, posts: 0, pages: 0, errors: 0, skipped_disallow: 0 };
        S.lastError = '';
        seedQueue();
        run();
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.type === 'WF_STOP') { S.stop = true; sendResponse({ ok: true }); return true; }
    if (msg.type === 'WF_STATUS') { sendResponse({ ok: true, progress: progress(), page_type: XF.detectPageType(location.href) }); return true; }
    if (msg.type === 'WF_SELFTEST') { sendResponse({ ok: true, selftest: XF.selftest(document, location.href) }); return true; }
    if (msg.type === 'WF_FLUSH') { flush().then(() => sendResponse({ ok: true })); return true; }
    return false;
  });
})();
