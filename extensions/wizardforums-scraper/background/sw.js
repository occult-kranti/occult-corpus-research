/* Wizard Forums Scraper — background/sw.js
 * Owns: (1) compliance — fetch + parse /robots.txt (standard directives AND the
 * Cloudflare Content-Signal line invoking EU 2019/790 Art.4); (2) file exports
 * via chrome.downloads (content scripts can't). Data-URL parts are size-capped
 * because a service worker has no URL.createObjectURL.
 */
'use strict';

const ROBOTS_URL = 'https://wizardforums.com/robots.txt';
const DATA_URL_MAX = 1600000; // encoded-char ceiling for chrome.downloads data: URLs

// ---------- robots.txt + content-signal parsing ----------
function parseRobots(text) {
  const out = {
    raw: String(text || '').slice(0, 8000),
    disallow: [], allow: [], crawlDelay: null, sitemaps: [],
    contentSignal: { search: null, 'ai-input': null, 'ai-train': null, present: false },
    tdmReservation: /2019\/790|article\s*4|text.and.data.mining|tdm|content-signal/i.test(String(text || '')),
  };
  let inStar = false;
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'user-agent') inStar = (val === '*');
    else if (key === 'sitemap') out.sitemaps.push(val);
    else if (key === 'content-signal') {
      out.contentSignal.present = true;
      for (const pair of val.split(',')) {
        const kv = pair.split('=').map((s) => s.trim().toLowerCase());
        if (kv.length === 2 && kv[0] in out.contentSignal) out.contentSignal[kv[0]] = kv[1];
      }
    } else if (inStar && key === 'disallow' && val) out.disallow.push(val);
    else if (inStar && key === 'allow' && val) out.allow.push(val);
    else if (inStar && key === 'crawl-delay') out.crawlDelay = parseFloat(val) || null;
  }
  // restriction = any AI/TDM signal explicitly "no", or a bare Art.4 reservation preamble
  out.restrictsAiTdm = out.contentSignal['ai-train'] === 'no'
    || out.contentSignal['ai-input'] === 'no'
    || (out.tdmReservation && out.contentSignal['ai-train'] !== 'yes');
  return out;
}

if (typeof globalThis !== 'undefined' && globalThis.__WF_TEST__) {
  globalThis.__WF_TEST__.parseRobots = parseRobots;
}

async function fetchCompliance() {
  try {
    const resp = await fetch(ROBOTS_URL, { credentials: 'omit', cache: 'no-cache' });
    const text = resp.ok ? await resp.text() : '';
    const parsed = parseRobots(text);
    parsed.ok = resp.ok;
    await chrome.storage.local.set({ wf_compliance: parsed, wf_compliance_at: Date.now() });
    return parsed;
  } catch (e) {
    const parsed = parseRobots('');
    parsed.ok = false; parsed.error = String((e && e.message) || e);
    await chrome.storage.local.set({ wf_compliance: parsed });
    return parsed;
  }
}

// ---------- exports (data: URL, size-capped, split if needed) ----------
function b64(str) {
  // UTF-8 safe base64 for a data: URL
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}
async function downloadText(filename, text, mime) {
  const url = 'data:' + (mime || 'application/x-ndjson') + ';base64,' + b64(text);
  if (url.length > DATA_URL_MAX) throw new Error('part too large (' + url.length + ' > ' + DATA_URL_MAX + ')');
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename, saveAs: false, conflictAction: 'uniquify' }, (id) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message)); else resolve(id);
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return false;
  if (msg.type === 'WF_CHECK_COMPLIANCE') {
    fetchCompliance().then((c) => sendResponse({ ok: true, compliance: c }));
    return true;
  }
  if (msg.type === 'WF_DOWNLOAD') {
    downloadText(msg.filename, msg.text, msg.mime)
      .then((id) => sendResponse({ ok: true, id }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  return false;
});
