# WizardForums archive schema v2.1

Each completed crawl downloads one ZIP file named `WizardForums/wf-<timestamp>.zip`. The archive is organized into stable directories so it can be inspected manually or loaded programmatically.

| Path | Purpose |
|---|---|
| `README.txt` | Human-readable archive summary and usage notes |
| `metadata/crawl.json` | Crawl identity, timestamps, scope, options, current page, counts, parser version, and self-test snapshot |
| `metadata/robots.json` | Parsed robots directives, Content-Signal fields, reservation flags, and raw robots excerpt |
| `metadata/requests.jsonl` | One record per visited URL with kind, status, duration, byte count, parse result, and error state |
| `metadata/errors.json` | Errors, skipped URLs, stop/cap state, and last error |
| `metadata/schema.json` | Versioned record and archive schema description |
| `data/forums.jsonl` | One normalized forum record per line |
| `data/threads.jsonl` | One normalized thread record per line |
| `data/posts.jsonl` | One complete normalized post/reply record per line, including body text/HTML, quotes, attachments, reactions, and status flags |
| `data/links.jsonl` | Every discovered internal and external link with source page/thread/post context |
| `data/resources.jsonl` | Links classified as PDFs, ebooks/books, documents, archives, downloads, or attachment-like resources |
| `data/pages.jsonl` | Page-level crawl records and link totals |
| `data/all.ndjson` | Combined stream containing every forum, thread, post, link, resource, and page record |
| `index/forums.csv` | Flat forum index for spreadsheets |
| `index/threads.csv` | Flat thread index for spreadsheets |
| `index/posts.csv` | Analysis-ready post index with body lengths, quote/link/attachment counts, and status flags |
| `index/links.csv` | Link graph edge list with source context and visible labels |
| `index/resources.csv` | Resource inventory suitable for filtering PDFs, books, and downloadable files |

Every data record retains its source URL and scrape timestamp. The crawler follows all reachable forum and thread pagination links within the permitted origin, while link/resource entries preserve URLs and metadata. Binary attachments and linked PDFs are not downloaded automatically; their URLs are recorded for later authorized retrieval.
