# Available WizardForums archive analysis summary

## Scope of this report

This report covers the three ZIP archives currently available in the workspace. They are earlier diagnostic outputs, not successful full post archives. The user separately reported a later run with 340 threads, 4,382 posts, and 442 pages, but that successful archive is not present locally. Consequently, this report does not claim substantive findings about post content or occult discourse.

## Archive-level results

| Archive | Forums | Threads | Posts | Crawl interpretation |
|---|---:|---:|---:|---|
| `wf-2026-08-15T21-05-58.zip` | 28 | 107 | 0 | Board crawl stopped with forum URLs remaining; no thread pages were fetched |
| `wf-2026-08-15T21-07-53.zip` | 0 | 0 | 0 | Empty/invalid scope diagnostic |
| `wf-2026-08-15T21-08-04.zip` | 28 | 211 | 0 | Forum pages were fetched but post collection did not begin |

All three archives passed basic ZIP and schema checks. The smoke test correctly issues a warning that post/topic analysis is blocked because `data/posts.jsonl` is empty and `index/posts.csv` contains only its header.

## What can be learned now

The available archives are useful for validating the crawler failure mode and demonstrating the need for a post-availability gate. They show that forum and thread discovery can succeed while post collection remains empty. That distinction should be represented in future reports as separate coverage dimensions rather than one success/failure flag.

No current archive supports claims about ritual language, books, PDFs, authorship, replies, topics, sentiment, resource circulation, or network structure. Any such claim would be unsupported because the post layer is absent.

## Required rerun

Use WizardForums Scraper v2.2.0. Select **Whole board**, leave all caps at `0`, keep the authenticated tab open, and allow all multipart ZIPs to finish downloading. After extraction, run the smoke test and confirm nonzero posts, links, and resources before running `initial_analysis.py` and `post_analysis.py`.

## Interpretation rule adopted

> A forum/thread archive with zero posts is a collection diagnostic, not a content corpus.

This rule is now encoded in `analysis/smoke_test.py`, which blocks post/topic interpretation through a warning and in the handoff protocol, which treats the post gate as mandatory.
