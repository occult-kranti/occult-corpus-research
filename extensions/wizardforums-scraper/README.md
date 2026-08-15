# Wizard Forums Scraper (XenForo)

A personal, rate-limited, **session-based** archiver for `wizardforums.com` (XenForo 2.x). It runs as
a content script in *your own logged-in tab*, so it sees exactly what you can (post bodies there are
members-only), crawls forums → threads → posts, and streams structured **NDJSON** to your Downloads.

## Install
1. `chrome://extensions` → Developer mode → **Load unpacked** → this folder (or drag the zip in).
2. Open and **log in to** https://wizardforums.com/ in the same Chrome profile.
3. Click the extension icon.

## Use
- The popup first shows the **site policy check** (see Compliance below). Acknowledge if prompted.
- Pick a **Scope**: Current page · This thread · This forum · Whole board.
- Set the **delay** (default 4000 ms — be polite), and optional caps (max pages/threads/requests).
- **Start.** Keep the tab open. Progress shows live counts; data streams to
  `Downloads/WizardForums/wf-<timestamp>-NNNN.ndjson` (one part per ~200 records).
- **Self-test page** reports what the parser matched on the current DOM — use it to confirm selectors
  on the live members-only markup, or if a theme update ever breaks something.

## Output (NDJSON, one record per line)
- `{type:"forum", id, url, title, description, threads_count, messages_count, sub_forums[]}`
- `{type:"thread", id, url, title, prefix, author, reply_count, view_count, created, last_post, sticky, locked, redirect}`
- `{type:"post", id, thread_id, thread_title, author, author_id, post_number, posted_at{iso,epoch}, body_text, body_html, quotes[], attachments[], reactions_count, edited, deleted, ignored}`

Concatenate the parts (`cat wf-*.ndjson`) or load line-by-line. `body_text` excludes signatures,
edit notes, and footer chrome; `body_html` keeps the raw content HTML.

## Compliance (read this)
The extension fetches `wizardforums.com/robots.txt` and parses both classic directives **and** the
site's **Content-Signal** policy. Wizard Forums serves a Content-Signal declaration that invokes
**Article 4 of EU Directive 2019/790** — an express reservation of text-and-data-mining / AI rights.
The popup surfaces this and, when AI/TDM use is reserved, **requires you to acknowledge** before
crawling. The crawler also **honors `Disallow` paths and `Crawl-delay`** from robots.txt.

What this means: personal reading/archival or authorized research on content you can access is one
thing; **using this content to train or feed AI models likely conflicts with the site's reservation.**
You are responsible for lawful, policy-compliant use. This tool does not bypass login or evade
detection — it uses your own authenticated access, politely rate-limited.

## Design notes
`lib/xf-parse.js` contains pure DOM parsers for board, forum, thread, post, and pagination pages. The
parser normalizes canonical URLs, handles abbreviated counts, recognizes sticky/locked/moved threads,
extracts quotes and attachments, removes signatures from text, detects deleted/ignored posts, and
identifies common login or permission walls. It is covered by live HTML fixtures captured from the
current site plus synthetic edge-case fixtures.

`background/sw.js` parses robots directives and Content-Signal declarations and performs size-capped
UTF-8-safe downloads. `content/content.js` performs same-origin authenticated fetching, polite delay
and jitter, wildcard-aware Disallow/Allow enforcement, queue deduplication, ID-based record deduplication,
request/page/thread caps, and serialized loss-safe NDJSON exports. `popup/` exposes scope selection,
caps, compliance acknowledgement, self-test, live progress, and stop controls. Progress and a bounded
resume mirror are stored in `chrome.storage.local`; a new crawl starts cleanly rather than silently
mixing old output with a new run.

## Verification

From this directory, run `node tests/test_parse.js` to validate the live homepage, live forum, and live
thread fixtures together with synthetic cases for pagination, redirects, sticky and locked rows,
localized counts, canonical URLs, missing post IDs, quotes, attachments, edits, signatures, deleted
posts, ignored posts, and login walls. Run `node tests/test_compliance.js` to validate robots groups,
Allow-overrides, crawl delay, sitemaps, content signals, Article 4 reservations, and malformed input.
The extension JavaScript files are also checked with `node --check`, and the manifest is validated as
Manifest V3 with the WizardForums host restriction.

The included live fixtures represent the logged-out browser state. Full member-only post bodies still
require the user to open WizardForums in the same Chrome profile and log in normally; the extension does
not bypass authentication or scrape outside the permitted origin.
