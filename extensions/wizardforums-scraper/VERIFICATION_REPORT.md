# Wizard Forums Scraper Verification Report

## Scope

The current release is **v2.4.0**.

The supplied Manifest V3 extension was reviewed against the live WizardForums homepage, forum page, thread page, and robots policy. The extension remains a session-based scraper: it uses ordinary same-origin requests in the user’s current Chrome profile and does not bypass authentication, CAPTCHA, paywalls, or access controls.

## Implemented hardening

The parser now normalizes canonical thread URLs, preserves stable forum slugs when numeric IDs are absent, accepts more permission-wall variants, handles locale-safe integer and abbreviated count parsing, and extracts post IDs from additional URL forms. The crawl engine now retains complete typed records in memory for one final organized ZIP, captures request diagnostics, records robots-skipped URLs, adds derived post measurements, applies wildcard-aware robots matching with longest-match Allow precedence, and keeps origin enforcement in place. Popup progress now reports the generated ZIP filename and size. Progress is rendered with `textContent` rather than `innerHTML`, preventing scraped error strings from being interpreted as markup.

## Verification matrix

| Area | Coverage | Result |
|---|---|---|
| Live board parsing | Current WizardForums homepage forum nodes, counts, descriptions, and URLs | Passed |
| Live forum parsing | Current forum thread rows and thread URLs | Passed |
| Live thread parsing | Current public thread title, posts, and bodies | Passed |
| Parser edge cases | Sticky, locked, moved, prefixes, pagination, canonical URLs, quotes, attachments, signatures, edits, reactions, deleted and ignored posts | Passed |
| Access behavior | Login and permission walls, populated-post false-positive guard | Passed |
| Compliance | Robots groups, Disallow/Allow, crawl delay, sitemaps, Content-Signal, Article 4 reservation, malformed input | Passed |
| Static integrity | JavaScript syntax checks and Manifest V3 host-permission validation | Passed |
| ZIP archive integrity | ZIP generation with Unicode, nested directories, empty JSONL files, CSV quoting, and external `unzip -t` validation | Passed |
| Archive metadata | Crawl summary, robots policy, request log, error log, schema descriptor, typed JSONL, combined NDJSON, and CSV indexes | Passed |
| Link/resource extraction | Internal/external links, PDF, ebook, document, archive, download, and attachment classification | Passed |
| Full-board model | Forum/thread pagination, exhaustive queue defaults, per-page record counters, page/link/resource datasets | Passed |
| Adaptive scheduler | Bounded 1–3 worker pool, shared pacing, retryable 403/408/425/429/5xx backoff, queue deduplication | Passed |
| URL safety | `/unread`, post anchors, tracking parameters, trailing-slash canonicalization | Passed |
| Checkpoint storage | Delta JSONL checkpoint layout, cursors, checkpoint manifests, final snapshot metadata | Passed |
| Scheduler edge cases | Canonical URL regression tests and manifest version validation | Passed |

The reproducible commands are `node tests/test_parse.js`, `node tests/test_compliance.js`, `node tests/test_archive.js`, `node tests/test_chunking.js`, `node tests/test_scheduler.js`, `unzip -t /tmp/wizardforums-test-archive.zip`, `node --check lib/xf-parse.js`, `node --check content/content.js`, `node --check background/sw.js`, and `node --check popup/popup.js`.

## Submitted-output diagnosis

The three submitted archives confirm that the parser itself was not the primary failure. The archives contained 0 post records because no thread requests were made in the board crawl: the request logs showed only the index page and forum pages, while the crawl was stopped with forum URLs still queued. The forum-scope archive was started while the active tab was the homepage, so it treated `/` as a forum URL and correctly found no thread rows. The new version rejects that invalid combination instead of silently producing an empty archive.

The crawler now prioritizes discovered thread URLs ahead of additional forum pages. This means a board crawl begins collecting posts as soon as its first forum page yields thread links, rather than waiting behind the entire forum queue. Request diagnostics now include `records_added`, making it immediately visible which fetched pages produced forums, threads, or posts.

## Full-board archival additions

Version 2.1.0 adds exhaustive whole-board traversal when the scope is set to Whole board and all caps remain at zero. It follows forum pagination, thread pagination, and every non-redirect thread discovered in every accessible forum. Each fetched page now records how many forums, threads, posts, links, and resources it contributed.

The parser inventories links found on forum, thread, and post pages. Each link preserves its URL, visible text, title, rel/download attributes, source page, thread and post context, internal/external status, and resource classification. PDFs, ebooks/books, office documents, archives, downloads, and attachment-like URLs are separated into `data/resources.jsonl` and `index/resources.csv`; raw post bodies, quote edges, attachments, reactions, and status flags remain in the post datasets. Binary files are intentionally represented as metadata URLs rather than downloaded automatically.

## Oversized archive diagnosis and fix

A submitted full-board run successfully collected 340 threads, 4,382 posts, and 442 pages, but the single ZIP download failed because its browser data URL reached 67,928,696 characters. Version 2.2.0 replaces the single-download assumption with automatic ordered ZIP parts. The exporter targets raw ZIP parts below 28 MB, which leaves headroom for base64 expansion under the browser download URL limit.

Large JSONL and CSV entries are split only at complete newline boundaries and receive deterministic `.part-001`, `.part-002` suffixes. Each part includes `metadata/archive_manifest.json` and `metadata/part.json`; the manifest records all filenames, part counts, logical entry counts, and crawl counts. Empty entries, Unicode rows, duplicate-safe ordering, and oversized single-line records are handled explicitly. A single non-line-splittable entry larger than the safe threshold produces a clear error rather than silently truncating data.

The archive chunking test suite passed together with parser, compliance, ZIP, and JavaScript syntax tests.

## Adaptive scheduling and checkpoint storage

Version 2.3.0 replaces the fully serial request loop with a bounded worker pool. The popup defaults to two concurrent requests and caps user-configurable concurrency at three. A shared request clock, randomized pacing, minimum delay, and exponential backoff are used for retryable 403, 408, 425, 429, and 5xx responses. Session-specific `/unread` and `/post-N` URLs are canonicalized to stable thread URLs, and tracking parameters are removed before queue deduplication. Unrestricted concurrency is intentionally not used because it can increase 403 responses and make a crawl less complete rather than faster.

Every configured checkpoint interval, the crawler downloads delta ZIPs containing only records added since the previous checkpoint, plus a checkpoint manifest with cumulative counts, queue state, and record cursors. The final export remains a complete snapshot. Checkpoint deltas are stored under `checkpoints/cp-NNN/` and can be merged with `tools/merge_checkpoints.py`. Chrome storage mirrors bounded progress and checkpoint cursors so a long crawl has recoverable evidence even if the final export is interrupted.

## Introductions exclusion

Version 2.4.0 excludes the forum identified on the live homepage as `Introductions`, URL `/forums/introductions.5/`. The exclusion is applied by forum ID, slug, title, and canonical URL before queueing, so its forum pages, pagination pages, and discovered threads are not fetched in Whole board mode. A direct This forum crawl of that forum is rejected with an explicit message. The omission is recorded in `skipped_excluded` progress and archive metadata.

The v2.4.0 scheduler regression suite passed the exact Introductions URL, its pagination URL, a similarly named non-excluded forum, and title-based fallback matching.

## Live-site limitation

The browser session used for validation was logged out. WizardForums visibly states that registration is needed to see all posts, and member-only bodies therefore cannot be validated without the user opening the site in their own Chrome profile and logging in normally. The extension is intentionally designed to see only what that authenticated session can see.

## Policy note

The live `robots.txt` contains a Content-Signal declaration and an Article 4 text-and-data-mining reservation. The popup surfaces this policy and requires acknowledgement when the policy reserves AI/TDM uses. The extension is intended for lawful personal archival or authorized research, not for evading access controls or feeding reserved content into AI training or input systems.
