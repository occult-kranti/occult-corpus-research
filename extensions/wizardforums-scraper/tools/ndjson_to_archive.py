#!/usr/bin/env python3
"""Convert legacy WizardForums NDJSON output into the organized archive layout."""
from __future__ import annotations

import argparse
import csv
import json
import zipfile
from collections import Counter
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path


def jsonl(records: list[dict]) -> str:
    return "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in records)


def csv_text(records: list[dict], columns: list[str]) -> str:
    out = StringIO()
    writer = csv.DictWriter(out, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for row in records:
        normalized = {}
        for key in columns:
            value = row.get(key, "")
            normalized[key] = json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value
        writer.writerow(normalized)
    return out.getvalue()


def convert(source: Path, destination: Path) -> None:
    records: list[dict] = []
    for line_number, line in enumerate(source.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid JSON on line {line_number}: {exc}") from exc

    groups = {kind: [r for r in records if r.get("type") == kind] for kind in ("forum", "thread", "post")}
    counts = Counter(r.get("type", "unknown") for r in records)
    generated = datetime.now(timezone.utc).isoformat()
    crawl = {
        "schema_version": "2.0",
        "archive_type": "legacy-ndjson-migration",
        "archive_created_at": generated,
        "source_file": str(source),
        "counts": dict(counts),
        "total_records": len(records),
    }
    errors = {"errors": [], "skipped": [], "source_file": str(source), "generated_at": generated}
    schema = {
        "schema_version": "2.0",
        "description": "WizardForums organized scrape archive created from legacy NDJSON",
        "record_types": {"forum": "data/forums.jsonl", "thread": "data/threads.jsonl", "post": "data/posts.jsonl"},
    }
    readme = (
        "WizardForums archive converted from legacy NDJSON\n"
        "===============================================\n\n"
        "This archive preserves the original records and adds typed JSONL files, CSV indexes, and metadata.\n"
        "The source NDJSON was not discarded; it is stored as data/all.ndjson.\n"
    )
    forum_cols = ["id", "slug", "url", "title", "description", "threads_count", "messages_count", "sub_forums", "source_url", "scraped_at"]
    thread_cols = ["id", "url", "title", "slug", "prefix", "author", "author_id", "author_url", "forum", "created", "reply_count", "view_count", "last_post", "sticky", "locked", "redirect", "source_url", "scraped_at"]
    post_cols = ["id", "thread_id", "thread_title", "forum", "author", "author_id", "post_number", "posted_at", "body_text", "body_html", "body_text_length", "body_html_length", "quote_count", "attachment_count", "attachments", "reactions_count", "has_reactions", "edited", "deleted", "ignored", "source_url", "scraped_at"]

    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        files = {
            "README.txt": readme,
            "metadata/crawl.json": json.dumps(crawl, ensure_ascii=False, indent=2) + "\n",
            "metadata/robots.json": "{}\n",
            "metadata/requests.jsonl": "",
            "metadata/errors.json": json.dumps(errors, ensure_ascii=False, indent=2) + "\n",
            "metadata/schema.json": json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
            "data/forums.jsonl": jsonl(groups["forum"]),
            "data/threads.jsonl": jsonl(groups["thread"]),
            "data/posts.jsonl": jsonl(groups["post"]),
            "data/all.ndjson": jsonl(records),
            "index/forums.csv": csv_text(groups["forum"], forum_cols),
            "index/threads.csv": csv_text(groups["thread"], thread_cols),
            "index/posts.csv": csv_text(groups["post"], post_cols),
        }
        for name, content in files.items():
            archive.writestr(name, content)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    convert(args.source, args.destination)
    print(f"wrote {args.destination}")


if __name__ == "__main__":
    main()
