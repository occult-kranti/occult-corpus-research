#!/usr/bin/env python3
"""Validate a WizardForums organized ZIP before any substantive analysis.

Usage: python3 analysis/smoke_test.py path/to/archive.zip [--json report.json]
The test is intentionally dependency-light and never prints post bodies or usernames.
"""
from __future__ import annotations
import argparse, csv, io, json, re, sys, zipfile
from collections import Counter
from datetime import datetime
from pathlib import PurePosixPath

REQUIRED = {
    "metadata/crawl.json", "metadata/schema.json", "metadata/errors.json",
    "data/forums.jsonl", "data/threads.jsonl", "data/posts.jsonl",
    "index/forums.csv", "index/threads.csv", "index/posts.csv",
}
OPTIONAL = {"data/links.jsonl", "data/resources.jsonl", "data/pages.jsonl", "metadata/requests.jsonl", "analysis/profile.json", "analysis/data_dictionary.json", "analysis/quality_gates.json", "index/post_features.csv"}
URL_RE = re.compile(r"^https://wizardforums\.com/")

def load_jsonl(zf: zipfile.ZipFile, name: str):
    if name not in zf.namelist(): return []
    out = []
    for line_no, line in enumerate(zf.read(name).decode("utf-8").splitlines(), 1):
        if not line.strip(): continue
        try: out.append(json.loads(line))
        except Exception as exc: raise AssertionError(f"{name}:{line_no}: invalid JSON: {exc}") from exc
    return out

def check(path: str) -> dict:
    result = {"archive": path, "pass": True, "errors": [], "warnings": [], "counts": {}, "files": []}
    def fail(msg): result["pass"] = False; result["errors"].append(msg)
    try:
        with zipfile.ZipFile(path) as zf:
            bad = zf.testzip()
            if bad: fail(f"ZIP CRC failure: {bad}")
            names = set(zf.namelist()); result["files"] = sorted(names)
            missing = sorted(REQUIRED - names)
            if missing: fail("missing required files: " + ", ".join(missing))
            crawl = json.loads(zf.read("metadata/crawl.json")) if "metadata/crawl.json" in names else {}
            result["crawl"] = {k: crawl.get(k) for k in ("schema_version", "scraper_version", "scope", "stopped", "queue_remaining", "last_error")}
            for kind, file_name in (("forums", "data/forums.jsonl"), ("threads", "data/threads.jsonl"), ("posts", "data/posts.jsonl"), ("links", "data/links.jsonl"), ("resources", "data/resources.jsonl"), ("pages", "data/pages.jsonl")):
                rows = load_jsonl(zf, file_name)
                result["counts"][kind] = len(rows)
                ids = [str(r.get("id")) for r in rows if r.get("id") is not None]
                dupes = [x for x, n in Counter(ids).items() if n > 1]
                if dupes and kind in {"forums", "threads", "posts"}: fail(f"duplicate {kind} IDs: {len(dupes)}")
                for i, row in enumerate(rows, 1):
                    if kind in {"forums", "threads", "posts", "links", "resources", "pages"} and not row.get("scraped_at"):
                        fail(f"{file_name}:{i}: missing scraped_at")
                    if row.get("source_url") and not URL_RE.match(row["source_url"]):
                        result["warnings"].append(f"{file_name}:{i}: non-WizardForums source URL")
                    if kind == "post" and not row.get("thread_id"):
                        fail(f"{file_name}:{i}: post missing thread_id")
                    if kind in {"links", "resources"} and not row.get("link_url"):
                        fail(f"{file_name}:{i}: link/resource missing link_url")
                    posted = row.get("posted_at")
                    if isinstance(posted, dict) and posted.get("iso"):
                        try: datetime.fromisoformat(str(posted["iso"]).replace("Z", "+00:00"))
                        except ValueError: fail(f"{file_name}:{i}: invalid posted_at.iso")
                    elif isinstance(posted, str) and posted:
                        try: datetime.fromisoformat(posted.replace("Z", "+00:00"))
                        except ValueError: result["warnings"].append(f"{file_name}:{i}: non-ISO posted_at string")
            if result["counts"].get("posts", 0) == 0:
                result["warnings"].append("no posts present; post/topic analysis is blocked until a successful thread crawl is supplied")
            for optional_name in sorted(OPTIONAL & names):
                result.setdefault("optional_files", []).append(optional_name)
            for csv_name in ("index/forums.csv", "index/threads.csv", "index/posts.csv", "index/post_features.csv"):
                if csv_name in names:
                    rows = list(csv.DictReader(io.StringIO(zf.read(csv_name).decode("utf-8"))))
                    if csv_name.endswith("posts.csv") and not rows:
                        result["warnings"].append("posts CSV has header only")
    except Exception as exc:
        fail(str(exc))
    return result

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("archive"); ap.add_argument("--json")
    args = ap.parse_args(); result = check(args.archive)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if args.json: open(args.json, "w", encoding="utf-8").write(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    return 0 if result["pass"] else 1

if __name__ == "__main__": sys.exit(main())
