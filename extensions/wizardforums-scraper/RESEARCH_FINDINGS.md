# Initial research findings

## Live site

- Homepage: https://wizardforums.com/
- Current browser session is logged out; homepage visibly shows `Log in` and `Register`.
- Homepage is XenForo-like and exposes forum URLs such as `/forums/general-occult-discussion.9/` and thread URLs such as `/threads/why-do-i-never-dream.21681/post-142615`.
- Guest banner states registration is needed to see all posts; a public thread page can still render some content.
- The live homepage uses `.node--forum`-style forum structures in the visible DOM extraction and contains forum title, description, thread/message counts, and latest-thread links.
- Representative thread URL tested: https://wizardforums.com/threads/pacts-with-unconventional-spirits.23055/
- The representative thread includes title, breadcrumb forum, pagination, post numbers, authors, timestamps, quotes, edited markers, reactions, and post bodies in the rendered page.

## Site policy

- `https://wizardforums.com/robots.txt` was retrieved successfully.
- The file contains a Content-Signal policy preamble referring to content signals and EU Directive 2019/790 Article 4.
- The extension README says it is intended for personal/session-based archival only, does not bypass login, and should not be used to train or feed AI models where rights are reserved.

## Supplied extension

- Manifest V3 extension with host access only to `https://wizardforums.com/*`.
- Main components: `lib/xf-parse.js` (DOM parser), `content/content.js` (crawl engine), `background/sw.js` (robots/compliance and downloads), and `popup/*` (controls/UI).
- README claims 63 parser checks and 13 compliance checks, but the provided archive contains no `tests/` directory, so those claims are not currently reproducible from the archive.
- Parser supports board/forum/thread detection, pagination, counts with K/M/B abbreviations, quote and attachment extraction, signatures, deleted/ignored posts, login-wall detection, and self-test.
- Crawl engine supports current page, thread, forum, and board scopes; request/page/thread caps; deduplication; rate limiting; robots disallow enforcement; and NDJSON part splitting.

## Initial risks to verify

- Logged-out access must not be mistaken for a successful full crawl; member-only content may render as a login wall.
- The parser’s URL ID extraction, pagination handling, redirect detection, and forum-node selectors need live/fixture tests.
- Export splitting and failed download behavior need deterministic tests.
- Resume state is mirrored but the crawler does not yet appear to restore from it automatically.
- The archive’s README references tests that are absent, so a new test harness is required before claiming edge-case coverage.
