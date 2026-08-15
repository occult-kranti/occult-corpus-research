/* Wizard Forums Scraper — background/sw.js
 * Compliance parsing and structured ZIP archive downloads.
 */
'use strict';

const ROBOTS_URL = 'https://wizardforums.com/robots.txt';
const ARCHIVE_DATA_URL_MAX = 45000000;

function parseRobots(text) {
  const rawText = String(text || '');
  const out = {
    raw: rawText.slice(0, 8000),
    disallow: [], allow: [], crawlDelay: null, sitemaps: [],
    contentSignal: { search: null, 'ai-input': null, 'ai-train': null, present: false },
    tdmReservation: /2019\/790|article\s*4|text.and.data.mining|tdm|content-signal/i.test(rawText),
  };
  let inStar = false;
  for (const rawLine of rawText.split(/\r?\n/)) {
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

function u16(a, n, v) { a[n] = v & 255; a[n + 1] = (v >>> 8) & 255; }
function u32(a, n, v) { a[n] = v & 255; a[n + 1] = (v >>> 8) & 255; a[n + 2] = (v >>> 16) & 255; a[n + 3] = (v >>> 24) & 255; }
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}
function makeZip(entries) {
  const enc = new TextEncoder();
  const local = [], central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = enc.encode(entry.name);
    const data = typeof entry.data === 'string' ? enc.encode(entry.data) : entry.data;
    const crc = crc32(data);
    const h = new Uint8Array(30 + name.length);
    u32(h, 0, 0x04034b50); u16(h, 4, 20); u16(h, 6, 0x800); u16(h, 8, 0);
    u16(h, 10, 0); u16(h, 12, 0); u32(h, 14, crc); u32(h, 18, data.length); u32(h, 22, data.length);
    u16(h, 26, name.length); u16(h, 28, 0); h.set(name, 30);
    local.push(h, data);
    const c = new Uint8Array(46 + name.length);
    u32(c, 0, 0x02014b50); u16(c, 4, 20); u16(c, 6, 20); u16(c, 8, 0x800); u16(c, 10, 0);
    u16(c, 12, 0); u16(c, 14, 0); u32(c, 16, crc); u32(c, 20, data.length); u32(c, 24, data.length);
    u16(c, 28, name.length); u16(c, 30, 0); u16(c, 32, 0); u16(c, 34, 0); u16(c, 36, 0); u32(c, 38, 0); u32(c, 42, offset); c.set(name, 46);
    central.push(c); offset += h.length + data.length;
  }
  const centralBytes = central.reduce((n, x) => n + x.length, 0);
  const total = offset + centralBytes + 22;
  const out = new Uint8Array(total); let p = 0;
  for (const x of local) { out.set(x, p); p += x.length; }
  const centralOffset = p;
  for (const x of central) { out.set(x, p); p += x.length; }
  u32(out, p, 0x06054b50); u16(out, p + 4, 0); u16(out, p + 6, 0); u16(out, p + 8, entries.length); u16(out, p + 10, entries.length);
  u32(out, p + 12, centralBytes); u32(out, p + 16, centralOffset); u16(out, p + 20, 0);
  return out;
}
if (typeof globalThis !== 'undefined' && globalThis.__WF_TEST__) {
  globalThis.__WF_TEST__.makeZip = makeZip;
}
function b64Bytes(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function downloadBytes(filename, bytes, mime) {
  const url = 'data:' + (mime || 'application/octet-stream') + ';base64,' + b64Bytes(bytes);
  if (url.length > ARCHIVE_DATA_URL_MAX) throw new Error('archive too large for browser download URL (' + url.length + ' characters)');
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
  if (msg.type === 'WF_DOWNLOAD_ARCHIVE') {
    try {
      const bytes = makeZip(msg.entries || []);
      downloadBytes(msg.filename || 'WizardForums/archive.zip', bytes, 'application/zip')
        .then((id) => sendResponse({ ok: true, id, bytes: bytes.length }))
        .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    } catch (e) { sendResponse({ ok: false, error: String((e && e.message) || e) }); }
    return true;
  }
  return false;
});
