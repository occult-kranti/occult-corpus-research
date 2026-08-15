# WizardForums archive schema v2

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
| `data/posts.jsonl` | One normalized post record per line |
| `data/all.ndjson` | Backward-compatible combined stream containing every forum, thread, and post record |
| `index/forums.csv` | Flat forum index for spreadsheets |
| `index/threads.csv` | Flat thread index for spreadsheets |
| `index/posts.csv` | Flat post index for spreadsheets |

Every data record retains its source URL and scrape timestamp. Post attachment entries remain metadata links; binary attachments are not downloaded automatically.
