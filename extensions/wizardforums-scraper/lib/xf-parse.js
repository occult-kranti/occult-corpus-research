/* Wizard Forums Scraper — lib/xf-parse.js
 *
 * PURE XenForo 2.x DOM parsers: (document|Element, baseUrl) -> structured data.
 * No chrome.*, no fetch, no network — only DOM reads — so it is unit-testable in
 * node via linkedom against saved HTML fixtures (see tests/).
 *
 * Every selector has 1-2 fallbacks because custom themes rename/reorder things;
 * when a primary misses we degrade rather than throw. detectTheme/selftest let
 * the extension report what actually matched on the live (member-only) markup.
 *
 * UMD-lite: window.XFParse in the browser, module.exports under node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.XFParse = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- small helpers ----------
  const txt = (el) => (el && el.textContent ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const attr = (el, a) => (el && el.getAttribute ? el.getAttribute(a) || '' : '');
  function q(root, sel) { try { return root.querySelector(sel); } catch (e) { return null; } }
  function qa(root, sel) { try { return Array.prototype.slice.call(root.querySelectorAll(sel)); } catch (e) { return []; } }
  function first(root, sels) { for (const s of sels) { const el = q(root, s); if (el) return el; } return null; }

  function absUrl(href, baseUrl) {
    if (!href) return '';
    try { return new URL(href, baseUrl || 'https://wizardforums.com/').href; }
    catch (e) { return href; }
  }
  // /forums/slug.15/ -> 15 ; /threads/slug.23247/page-2 -> 23247 ; post-12345 -> 12345
  function idFromUrl(href) {
    if (!href) return null;
    const m = String(href).match(/\.(\d+)\/?(?:page-\d+)?(?:[/?#]|$)/);
    return m ? m[1] : null;
  }
  function slugFromUrl(href) {
    const m = String(href || '').match(/\/(?:forums|threads)\/([^./]+)\.\d+/);
    return m ? m[1] : '';
  }
  function intFrom(s) {
    if (s == null) return null;
    // XenForo abbreviates: "2.6K", "13.5K", "25K", "1.1M".
    const raw = String(s).replace(/\u00a0/g, ' ').trim();
    const m = raw.replace(/,/g, '').match(/([\d]+(?:\.\d+)?)\s*([KMB])?/i);
    if (!m) return null;
    let n = parseFloat(m[1]);
    const u = (m[2] || '').toUpperCase();
    if (u === 'K') n *= 1e3; else if (u === 'M') n *= 1e6; else if (u === 'B') n *= 1e9;
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  // XenForo always renders <time class="u-dt" datetime="ISO" data-time="epoch" title="...">;
  // fall back to any <time>, then to a raw string.
  function parseTime(el) {
    const t = el && (el.matches && el.matches('time') ? el : q(el, 'time'));
    if (t) {
      const iso = attr(t, 'datetime');
      const epoch = attr(t, 'data-time');
      return {
        iso: iso || null,
        epoch: epoch ? parseInt(epoch, 10) : (iso ? Math.floor(Date.parse(iso) / 1000) || null : null),
        text: attr(t, 'title') || txt(t) || null,
      };
    }
    return { iso: null, epoch: null, text: el ? txt(el) : null };
  }

  // ---------- login / theme detection ----------
  function detectLoggedIn(doc) {
    // XenForo default does NOT set html.is-logged-in — the reliable signal is the
    // header nav group: .p-navgroup--member (in) vs .p-navgroup--guest / login link (out).
    if (q(doc, '.p-navgroup--member, a.p-navgroup-link--user, a[href*="/logout/"], a[href="/account/"]')) return true;
    if (q(doc, '.p-navgroup--guest, a.p-navgroup-link--logIn, a.p-navgroup-link--register')) return false;
    if (q(doc, 'a[href*="/login/"]') && !q(doc, 'a[href*="/logout/"]')) return false;
    // last resort: the (unreliable) body class some custom themes add
    return /(^|\s)is-logged-in(\s|$)/.test(attr(doc.documentElement, 'class'));
  }
  // login/permission wall in the body instead of content
  function isLoginWall(root) {
    const b = txt(root).toLowerCase();
    const hasAuthPrompt = /you must log in or register/.test(b)
      || /log in to view/.test(b)
      || /register(?:ed)? to (?:see|view) all posts/.test(b)
      || /you do not have permission to view this page/.test(b)
      || /you must be logged in/.test(b);
    const hasPostBody = qa(root, 'article.message--post, article.message, .message--post .message-userContent, .message-body').length > 0;
    return hasAuthPrompt && !hasPostBody;
  }

  // ---------- board index (forum/category list) ----------
  function parseBoardIndex(doc, baseUrl) {
    const forums = [];
    const nodes = qa(doc, '.node--forum, .node--category, .node');
    for (const node of nodes) {
      const cls = attr(node, 'class');
      const isForum = /node--forum/.test(cls) || (!/node--category/.test(cls) && q(node, '.node-title a[href*="/forums/"]'));
      const link = first(node, ['.node-title a', 'h3.node-title a', '.node-body .node-title a', 'a[href*="/forums/"]']);
      const url = absUrl(attr(link, 'href'), baseUrl);
      const id = idFromUrl(url) || attr(node, 'data-node-id') || null;
      const stats = qa(node, '.node-statsMeta dd, .node-stats dd, .pairs dd');
      forums.push({
        type: /node--category/.test(cls) ? 'category' : 'forum',
        id: id,
        slug: slugFromUrl(url) || null,
        url: url,
        title: txt(link) || txt(first(node, ['.node-title', 'h3'])),
        description: txt(first(node, ['.node-description', '.node-body .node-description'])),
        threads_count: stats[0] ? intFrom(txt(stats[0])) : null,
        messages_count: stats[1] ? intFrom(txt(stats[1])) : null,
        sub_forums: qa(node, '.node-subNodesFlat a, .subNodeFlatList a')
          .map((a) => ({ title: txt(a), url: absUrl(attr(a, 'href'), baseUrl), id: idFromUrl(attr(a, 'href')) }))
          .filter((s) => s.url.indexOf('/forums/') !== -1),
      });
    }
    // keep only real forum nodes with a /forums/ URL (drop bare category headers with no link)
    return { forums: forums.filter((f) => f.url && f.url.indexOf('/forums/') !== -1) };
  }

  // ---------- thread list (a forum node page) ----------
  function parseForumNode(doc, baseUrl) {
    const threads = [];
    for (const row of qa(doc, '.structItem--thread, .structItem--article')) {
      const cls = attr(row, 'class');
      const titleWrap = first(row, ['.structItem-title', '.structItem-cell--main .structItem-title']);
      // the title anchor is the one whose href contains /threads/ (skip prefix/label links)
      const links = qa(titleWrap || row, 'a');
      const titleLink = links.find((a) => /\/threads\//.test(attr(a, 'href'))) || links[links.length - 1] || null;
      const url = absUrl(attr(titleLink, 'href'), baseUrl);
      if (!url || url.indexOf('/threads/') === -1) continue;
      const authorCell = first(row, ['.structItem-cell--main', '.structItem-parts']);
      const metaDds = qa(row, '.structItem-cell--meta dd, .structItem-cell--meta .pairs dd');
      threads.push({
        id: idFromUrl(url) || attr(row, 'data-thread-id') || null,
        url: url,
        title: txt(titleLink),
        slug: slugFromUrl(url),
        prefix: txt(first(row, ['.structItem-title .labelLink', '.structItem-title .label'])) || null,
        author: attr(row, 'data-author')
          || txt(first(row, ['.structItem-parts .username', '.structItem-minor .username', '.username'])) || null,
        author_url: absUrl(attr(first(row, ['.structItem-parts a.username', '.structItem-minor a.username', 'a.username']), 'href'), baseUrl) || null,
        created: parseTime(first(row, ['.structItem-startDate time', '.structItem-parts time'])),
        reply_count: metaDds[0] ? intFrom(txt(metaDds[0])) : null,
        view_count: metaDds[1] ? intFrom(txt(metaDds[1])) : null,
        last_post: {
          time: parseTime(first(row, ['.structItem-cell--latest time', '.structItem-latest time'])),
          user: txt(first(row, ['.structItem-cell--latest .username', '.structItem-latest .username'])) || null,
        },
        // sticky may be a row class, a status icon, or membership in a sticky group
        sticky: /structItem--sticky/.test(cls)
          || !!q(row, '.structItem-status--sticky, .structItem-status--stickyfirst')
          || !!(row.closest && row.closest('.structItemContainer-group--sticky')),
        locked: !!q(row, '.structItem-status--locked, .structItem-status.structItem-status--locked'),
        // redirect/moved: explicit class OR (a thread row with no reply/view meta cell)
        redirect: /structItem--redirect/.test(cls)
          || (!q(row, '.structItem-cell--meta') && !/structItem--sticky/.test(cls)),
      });
    }
    return { threads: threads, pageNav: parsePageNav(doc, baseUrl) };
  }

  // ---------- links and downloadable resources ----------
  function classifyResource(url, label) {
    const value = (String(url || '') + ' ' + String(label || '')).toLowerCase();
    const path = String(url || '').split(/[?#]/)[0];
    const ext = (path.match(/\.([a-z0-9]{2,8})$/i) || [])[1] || '';
    if (ext === 'pdf' || /\bpdf\b/.test(value)) return 'pdf';
    if (/\.(doc|docx|odt|rtf|txt|xls|xlsx|ppt|pptx)$/.test(path)) return 'document';
    if (/\b(ebook|e-book|book|novel|grimoire|manual)\b/.test(value) || /\.(epub|mobi|azw|azw3|fb2)$/.test(path)) return 'ebook';
    if (/\.(zip|rar|7z|tar|gz|iso)$/.test(path)) return 'archive';
    if (/\b(download|attachment|file|upload)\b/.test(value)) return 'download';
    return null;
  }
  function parseLinks(root, baseUrl, context) {
    const links = [];
    for (const a of qa(root, 'a[href], area[href]')) {
      const href = attr(a, 'href');
      const url = absUrl(href, baseUrl);
      if (!url || /^(javascript|mailto|tel):/i.test(href || '')) continue;
      const text = txt(a);
      const resource_type = classifyResource(url, text + ' ' + attr(a, 'title') + ' ' + attr(a, 'download'));
      links.push({
        url, text: text || null, title: attr(a, 'title') || null, rel: attr(a, 'rel') || null,
        download: attr(a, 'download') || null, external: !/^https?:\/\/wizardforums\.com\//i.test(url),
        resource_type, context: context || null,
      });
    }
    return links;
  }

  // ---------- thread page (posts) ----------
  function parseThread(doc, baseUrl) {
    const wall = isLoginWall(first(doc, ['.p-body-content', '.p-body', 'body']) || doc);
    const titleEl = first(doc, ['h1.p-title-value', '.p-title-value', 'h1']);
    // the canonical thread URL (strip /page-N/post-N) from the current page or canonical link
    const canon = attr(first(doc, ['link[rel="canonical"]']), 'href');
    const threadUrl = absUrl(canon || baseUrl || '', baseUrl);
    const thread = {
      id: idFromUrl(threadUrl) || null,
      url: (threadUrl || '').replace(/\/(page-\d+|post-\d+)\/?$/, '/'),
      title: txt(titleEl),
      prefix: txt(first(doc, ['.p-title-value .labelLink', '.p-title-value .label'])) || null,
      forum: (function () {
        const bc = qa(doc, '.p-breadcrumbs a, .breadcrumb a').map((a) => ({ title: txt(a), url: absUrl(attr(a, 'href'), baseUrl) }))
          .filter((b) => /\/forums\//.test(b.url));
        return bc.length ? bc[bc.length - 1] : null;
      })(),
    };
    const posts = [];
    for (const art of qa(doc, 'article.message--post, article.message, .message--post')) {
      const cls = attr(art, 'class');
      const dataContent = attr(art, 'data-content'); // "post-12345"
      const idAttr = attr(art, 'id'); // "js-post-12345" / "post-12345"
      const pid = (dataContent.match(/post-(\d+)/i) || idAttr.match(/post-(\d+)/i) || [])[1]
        || ((attr(first(art, ['a[href*="/post-"]']), 'href').match(/post-(\d+)/i) || [])[1]) || null;
      const body = first(art, ['.message-userContent .bbWrapper', '.message-body .bbWrapper', '.bbWrapper', '.message-userContent']);
      const authorLink = first(art, ['.message-name a.username', '.message-user .username', '.message-name .username']);
      posts.push({
        id: pid,
        url: pid && thread.url ? thread.url + 'post-' + pid : thread.url,
        author: attr(art, 'data-author') || txt(authorLink) || null,
        author_id: (function () {
          const h = attr(authorLink, 'href') || attr(first(art, ['a[href*="/members/"]']), 'href');
          return idFromUrl(h);
        })(),
        post_number: (function () {
          const n = txt(first(art, ['.message-attribution-opposite a', 'ul.message-attribution-opposite li:last-child a']));
          const m = n.match(/#?([\d,]+)/); return m ? intFrom(m[1]) : null;
        })(),
        posted_at: parseTime(first(art, ['.message-attribution-main time', 'header time', '.message-date time', 'time'])),
        edited: !!q(art, '.message-lastEdit'),
        body_text: bodyText(body),
        body_html: body ? (body.innerHTML || '').trim() : '',
        quotes: qa(art, '.bbCodeBlock--quote, blockquote.bbCodeBlock--quote').map((bq) => ({
          author: (function () {
            // real XenForo: blockquote data-quote="Name" (+ data-source="post: N")
            const dq = attr(bq, 'data-quote');
            if (dq) return dq.trim();
            // some renders: data-attributes="member: 'Name'" (single or double quotes, or none)
            const da = attr(bq, 'data-attributes').match(/member:\s*['"]?([^'",]+)/);
            if (da) return da[1].trim();
            // fallback: ".bbCodeBlock-title" / aside reads "Name said:"
            const t = txt(first(bq, ['.bbCodeBlock-title', 'aside .attribution'])).match(/^(.*?)\s+said:/);
            return t ? t[1].trim() : null;
          })(),
          source_post: (attr(bq, 'data-source').match(/post:\s*(\d+)/) || [])[1] || null,
          text: txt(first(bq, ['.bbCodeBlock-expandContent', '.bbCodeBlock-content'])) || txt(bq),
        })),
        attachments: qa(art, '.message-attachments a, .attachmentList a, .file-preview').map((a) => ({
          name: txt(first(a, ['.file-name'])) || txt(a) || null,
          url: absUrl(attr(a, 'href'), baseUrl) || null,
        })).filter((x) => x.url),
        links: parseLinks(art, baseUrl, { type: 'post', post_id: pid, thread_url: thread.url }),
        reactions_count: (function () {
          const r = first(art, ['.reactionsBar-link', '.sv-rating-count']);
          if (!r) return 0;
          const m = txt(r).match(/(\d[\d,]*)/); return m ? intFrom(m[1]) : (txt(r) ? 1 : 0);
        })(),
        deleted: /message--deleted/.test(cls),
        ignored: /message--ignored|is-ignored/.test(cls),
      });
    }
    return { thread, posts, pageNav: parsePageNav(doc, baseUrl), loginWall: wall,
      page_links: parseLinks(doc, baseUrl, { type: 'thread_page', thread_url: thread.url }) };
  }

  // post body text WITHOUT signature / edit note / quoted blocks removed? keep quotes inline but
  // strip signature + "Last edited" — clone and prune so the original DOM is untouched.
  function bodyText(body) {
    if (!body) return '';
    let clone;
    try { clone = body.cloneNode(true); } catch (e) { return txt(body); }
    for (const sel of ['.message-signature', '.bbCodeBlock-button', '.js-unfurl', 'script', 'style']) {
      for (const el of qa(clone, sel)) { if (el.remove) el.remove(); }
    }
    // normalize <br> and block boundaries to newlines for readable text
    return (clone.textContent || '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n').replace(/\s+$/g, '').replace(/^\s+/g, '').trim();
  }

  // ---------- pagination ----------
  function parsePageNav(doc, baseUrl) {
    // Use the OUTER .pageNav as root: the prev/next "jump" links are siblings of
    // .pageNav-main, not inside it, so a .pageNav-main root would miss the next link.
    const nav = first(doc, ['nav.pageNav', '.pageNav']);
    if (!nav) return { current: 1, last: 1, nextUrl: null };
    let last = 1, current = 1, nextUrl = null;
    for (const a of qa(nav, '.pageNav-page a')) {
      const n = parseInt(txt(a), 10);
      if (!isNaN(n) && n > last) last = n;
    }
    const cur = first(nav, ['.pageNav-page--current a', 'li.pageNav-page.pageNav-page--current a', '.is-active']);
    if (cur) current = parseInt(txt(cur), 10) || 1;
    const next = first(nav, ['a.pageNav-jump--next', 'a[rel="next"]']);
    if (next) nextUrl = absUrl(attr(next, 'href'), baseUrl);
    if (!nextUrl && current < last) {
      // synthesize page-(current+1) from a link that actually carries a page-N segment
      const pageA = qa(nav, '.pageNav-page a').map((a) => attr(a, 'href')).find((h) => /page-\d+/.test(h));
      if (pageA) nextUrl = absUrl(pageA.replace(/page-\d+/, 'page-' + (current + 1)), baseUrl);
    }
    return { current: current, last: last, nextUrl: nextUrl };
  }

  // ---------- self-test: what matched on the live DOM (for the gated markup) ----------
  function selftest(doc, baseUrl) {
    return {
      logged_in: detectLoggedIn(doc),
      login_wall: isLoginWall(first(doc, ['.p-body-content', 'body']) || doc),
      board_forums: parseBoardIndex(doc, baseUrl).forums.length,
      thread_rows: qa(doc, '.structItem--thread').length,
      posts: qa(doc, 'article.message--post, article.message').length,
      page_nav: parsePageNav(doc, baseUrl),
      page_type: detectPageType(String(baseUrl || (doc.location && doc.location.href) || '')),
    };
  }

  function detectPageType(url) {
    if (/\/threads\//.test(url)) return 'thread';
    if (/\/forums\//.test(url)) return 'forum';
    if (/\/(members)\//.test(url)) return 'member';
    if (/wizardforums\.com\/?($|\?|#)/.test(url) || /\/forums\/?$/.test(url)) return 'index';
    return 'other';
  }

  return {
    absUrl, idFromUrl, slugFromUrl, intFrom, parseTime, detectLoggedIn, isLoginWall,
    parseBoardIndex, parseForumNode, parseThread, parsePageNav, parseLinks, classifyResource, bodyText,
    selftest, detectPageType,
  };
});
