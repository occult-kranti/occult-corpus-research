# Wizard Forums Scraper Verification Report

## Scope

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

The reproducible commands are `node tests/test_parse.js`, `node tests/test_compliance.js`, `node tests/test_archive.js`, `unzip -t /tmp/wizardforums-test-archive.zip`, `node --check lib/xf-parse.js`, `node --check content/content.js`, `node --check background/sw.js`, and `node --check popup/popup.js`.

## Live-site limitation

The browser session used for validation was logged out. WizardForums visibly states that registration is needed to see all posts, and member-only bodies therefore cannot be validated without the user opening the site in their own Chrome profile and logging in normally. The extension is intentionally designed to see only what that authenticated session can see.

## Policy note

The live `robots.txt` contains a Content-Signal declaration and an Article 4 text-and-data-mining reservation. The popup surfaces this policy and requires acknowledgement when the policy reserves AI/TDM uses. The extension is intended for lawful personal archival or authorized research, not for evading access controls or feeding reserved content into AI training or input systems.
