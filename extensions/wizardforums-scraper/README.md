# Wizard Forums Scraper (XenForo)

A personal, rate-limited, **session-based** archiver for `wizardforums.com` (XenForo 2.x). It runs as
a content script in *your own logged-in tab*, so it sees exactly what you can (post bodies there are
members-only), crawls forums → threads → posts, and downloads one organized **ZIP archive** per crawl.

## Install
1. `chrome://extensions` → Developer mode → **Load unpacked** → this folder (or drag the zip in).
2. Open and **log in to** https://wizardforums.com/ in the same Chrome profile.
3. Click the extension icon.

## Use
- The popup first shows the **site policy check** (see Compliance below). Acknowledge if prompted.
- Pick a **Scope**: Current page · This thread · This forum · Whole board.
- Set the **delay** (default 4000 ms — be polite), optional caps, **concurrent requests** (default 2, maximum 3), and **checkpoint frequency** (default every 100 pages).
- **Start.** Keep the tab open. Progress shows live counts and checkpoint status; while the crawl runs, the extension downloads
  checkpoint delta ZIPs under `Downloads/WizardForums/wf-<timestamp>/checkpoints/`; when the crawl finishes it downloads
  the final complete archive under `Downloads/WizardForums/wf-<timestamp>/final/`. The ZIPs contain typed JSONL data, CSV indexes, crawl
  metadata, robots policy metadata, request diagnostics, and a combined `data/all.ndjson` compatibility stream.
- **Self-test page** reports what the parser matched on the current DOM — use it to confirm selectors
  on the live members-only markup, or if a theme update ever breaks something.

## Output (organized ZIP archive)

Each crawl produces one ZIP when it fits within the browser download limit. Large crawls are automatically split into ordered ZIP parts such as `wf-<timestamp>-part-001-of-003.zip`; no manual configuration is required.

| Path | Contents |
|---|---|
| `metadata/crawl.json` | Scope, options, timestamps, page type, self-test snapshot, counts, stop state, and archive status |
| `metadata/robots.json` | Parsed Disallow/Allow rules, crawl delay, sitemaps, Content-Signal fields, and raw policy excerpt |
| `metadata/requests.jsonl` | Visited URL, page kind, HTTP status, success state, byte count, duration, and errors |
| `metadata/errors.json` | Request failures, robots-skipped URLs, stop state, and last error |
| `metadata/schema.json` | Archive schema and compatibility information |
| `metadata/archive_manifest.json` | Shared manifest listing every ZIP part, export kind, checkpoint number, and logical entry count |
| `metadata/checkpoint.json` | Checkpoint number, cumulative counts, queue state, and record cursors |
| `metadata/checkpoints.json` | Final-archive index of checkpoint exports and delta-application guidance |
| `metadata/part.json` | Part number, total part count, and filename for the current ZIP |
| `data/forums.jsonl` | Complete forum records with descriptions, counts, sub-forums, source URL, and timestamps |
| `data/threads.jsonl` | Complete thread records with author, prefix, counts, timestamps, status flags, and source URL |
| `data/posts.jsonl` | Complete post/reply records with body text/HTML, quotes, attachments, reactions, edit/deleted/ignored flags, and source URL |
| `data/links.jsonl` | Every discovered internal and external link with page/thread/post context |
| `data/resources.jsonl` | PDFs, ebooks/books, documents, archives, downloads, and attachment-like links |
| `data/pages.jsonl` | Page-level records with page kind, URL, and link totals |
| `data/all.ndjson` | Combined stream containing every forum, thread, post, link, resource, and page record |
| `index/*.csv` | Analysis-ready forum, thread, post, link, and resource indexes |

The JSONL files preserve nested metadata without flattening. `body_text` excludes signatures, edit notes,
and footer chrome; `body_html` keeps the raw content HTML. Whole-board mode follows forum pagination,
thread pagination, and every accessible thread discovered in every forum. Link records preserve visible text,
source context, internal/external status, and resource classification. Attachment, PDF, book, and document
URLs are recorded as metadata; binary files are not downloaded automatically.

When multiple ZIP parts are produced, extract all parts into the same directory. JSONL/CSV files split across parts use ordered `.part-001`, `.part-002` suffixes and can be concatenated in lexical order; `metadata/archive_manifest.json` describes the complete set. Checkpoint archives contain only records added since the preceding checkpoint and are safe to apply in checkpoint-number order. To merge extracted checkpoint deltas, run `python3 tools/merge_checkpoints.py extracted_root merged_output`. Existing NDJSON downloads can be reorganized with `python3 tools/ndjson_to_archive.py old.ndjson organized.zip`.
The converter preserves the original combined stream and creates the same typed JSONL, CSV, and metadata
layout used by new crawls.

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
full pagination traversal, per-page request diagnostics, link/resource extraction, adaptive 403/429/5xx retries, canonicalization of session-specific `/unread` URLs, bounded worker concurrency, durable checkpoint deltas, and a size-aware multi-part ZIP archive builder
with JSONL and CSV outputs. Each part is kept below the browser-safe raw ZIP target and preserves complete JSONL/CSV records. Leave max pages, max threads, and max requests at `0` for exhaustive mode. `popup/` exposes scope selection,
caps, compliance acknowledgement, self-test, live progress, and stop controls. Progress, checkpoint cursors, and a bounded resume mirror are stored in `chrome.storage.local`; checkpoint ZIPs are append-only deltas and the final archive is a complete snapshot. A new crawl starts cleanly rather than silently mixing old output with a new run.

## Verification

From this directory, run `node tests/test_scheduler.js` for unread/tracking URL canonicalization. Run `node tests/test_chunking.js` to validate size-aware partitioning and complete-line boundaries. Run `node tests/test_parse.js` to validate the live homepage, live forum, and live
thread fixtures together with synthetic cases for pagination, redirects, sticky and locked rows,
localized counts, canonical URLs, missing post IDs, quotes, attachments, edits, signatures, deleted
posts, ignored posts, login walls, outbound links, and PDF/book/document/archive classification. Run `node tests/test_compliance.js` to validate robots groups,
Allow-overrides, crawl delay, sitemaps, content signals, Article 4 reservations, and malformed input.
The extension JavaScript files are also checked with `node --check`, and the manifest is validated as
Manifest V3 with the WizardForums host restriction.

The included live fixtures represent the logged-out browser state. Full member-only post bodies still
require the user to open WizardForums in the same Chrome profile and log in normally; the extension does
not bypass authentication or scrape outside the permitted origin.
