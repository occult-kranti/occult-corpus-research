/* Wizard Forums Scraper — popup: compliance gate + scope + start/stop + progress. */
'use strict';
const $ = (id) => document.getElementById(id);
const ORIGIN = 'https://wizardforums.com';

function send(tabId, msg) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, (r) => { void chrome.runtime.lastError; resolve(r); });
  });
}
function sw(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (r) => { void chrome.runtime.lastError; resolve(r); });
  });
}
async function activeWfTab() {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  return t && /^https:\/\/wizardforums\.com\//.test(t.url || '') ? t : null;
}

let compliance = null;

function renderCompliance(c) {
  compliance = c;
  const cs = c.contentSignal || {};
  const lines = [];
  lines.push('robots.txt: ' + (c.ok ? 'loaded' : 'not found / error'));
  if (c.contentSignal && c.contentSignal.present) {
    lines.push('content-signal: search=' + (cs.search || '—') + ', ai-input=' + (cs['ai-input'] || '—') + ', ai-train=' + (cs['ai-train'] || '—'));
  }
  if (c.crawlDelay) lines.push('crawl-delay: ' + c.crawlDelay + 's (honored)');
  if (c.disallow && c.disallow.length) lines.push('disallow (' + c.disallow.length + '): ' + c.disallow.slice(0, 8).join(' '));
  $('compliance').textContent = lines.join('\n') || 'no directives';

  if (c.restrictsAiTdm || c.tdmReservation) {
    $('tdmWarn').hidden = false;
    $('tdmWarn').textContent = 'This site reserves text-and-data-mining / AI rights (Content-Signal / EU 2019/790 Art.4). '
      + 'Scraping for personal reading/archival or authorized research may be fine, but using this content to train or '
      + 'feed AI models likely conflicts with that reservation. You are responsible for lawful use.';
    $('ackWrap').hidden = false;
    updateStartEnabled();
  }
}
function updateStartEnabled() {
  const needAck = !$('ackWrap').hidden;
  $('start').disabled = needAck && !$('ack').checked;
  $('start').style.opacity = $('start').disabled ? 0.5 : 1;
}

async function refreshProgress() {
  const o = await chrome.storage.local.get('wf_progress');
  const p = o.wf_progress;
  if (!p) return;
  const c = p.counts || {};
  const status = p.running ? 'running' : (p.done ? 'done' : 'idle');
  const parts = [status,
    'forums ' + (c.forums || 0), 'threads ' + (c.threads || 0), 'posts ' + (c.posts || 0),
    'links ' + (c.links || 0), 'resources ' + (c.resources || 0), 'pages ' + (c.pages || 0), 'queue ' + (p.queue || 0)];
  if (c.errors) parts.push('errors ' + c.errors);
  if (c.skipped_disallow) parts.push('skipped(disallow) ' + c.skipped_disallow);
  if (p.concurrency) parts.push('workers ' + p.concurrency);
  if (p.archive && (p.archive.status === 'checkpoint_exporting' || p.archive.status === 'checkpoint_ready')) {
    parts.push('checkpoint ' + (p.archive.checkpoint || '?') + (p.archive.status === 'checkpoint_exporting' ? ' exporting' : ' ready'));
  }
  if (p.archive && p.archive.status === 'exporting') {
    parts.push('creating final ZIP part ' + p.archive.part + '/' + p.archive.parts + ': ' + p.archive.filename);
  } else if (p.archive && p.archive.filename) {
    const size = p.archive.bytes ? ' (' + Math.round(p.archive.bytes / 1024) + ' KB total)' : '';
    const count = p.archive.part_count ? ' [' + p.archive.part_count + ' parts]' : '';
    parts.push('ZIP ready' + count + ': ' + p.archive.filename + size);
  }
  $('progress').textContent = parts.join(' — ') + (p.lastError ? '\n' + p.lastError.slice(0, 240) : '');
  $('start').hidden = !!p.running;
  $('stop').hidden = !p.running;
}

$('ack').addEventListener('change', updateStartEnabled);

$('start').addEventListener('click', async () => {
  const tab = await activeWfTab();
  if (!tab) { $('progress').textContent = 'Open a wizardforums.com tab first.'; return; }
  const opts = {
    scope: $('scope').value,
    startUrl: tab.url,
    delayMs: parseInt($('delay').value, 10) || 4000,
    maxPagesPer: parseInt($('maxPages').value, 10) || 0,
    maxThreads: parseInt($('maxThreads').value, 10) || 0,
    maxRequests: parseInt($('maxReq').value, 10) || 0,
    concurrency: Math.max(1, Math.min(3, parseInt($('concurrency').value, 10) || 2)),
    checkpointEveryPages: Math.max(25, parseInt($('checkpointEvery').value, 10) || 100),
    retryAttempts: 3,
    includePosts: $('includePosts').checked,
  };
  const r = await send(tab.id, { type: 'WF_START', opts });
  if (!r || !r.ok) $('progress').textContent = 'Start failed: ' + ((r && r.error) || 'no content script — reload the page');
  else refreshProgress();
});
$('stop').addEventListener('click', async () => {
  const tab = await activeWfTab();
  if (tab) await send(tab.id, { type: 'WF_STOP' });
});
$('selftest').addEventListener('click', async () => {
  const tab = await activeWfTab();
  if (!tab) { $('progress').textContent = 'Open a wizardforums.com tab first.'; return; }
  const r = await send(tab.id, { type: 'WF_SELFTEST' });
  $('progress').textContent = r && r.ok ? 'Self-test: ' + JSON.stringify(r.selftest) : 'Self-test failed (reload page).';
});

(async function init() {
  const r = await sw({ type: 'WF_CHECK_COMPLIANCE' });
  if (r && r.ok) renderCompliance(r.compliance);
  else $('compliance').textContent = 'robots.txt check failed.';
  refreshProgress();
  setInterval(refreshProgress, 1000);
})();
