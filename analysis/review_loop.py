#!/usr/bin/env python3
"""Run a critical data-analysis review loop over a WizardForums archive.

Usage:
  python3 analysis/review_loop.py archive.zip --out review.json

This is a gatekeeping tool, not a substantive interpretation engine. It prevents
post/topic claims when the archive is incomplete, empty, duplicated, or error-heavy.
It emits machine-readable decisions plus a Markdown handoff for the next reviewer.
"""
from __future__ import annotations
import argparse, json, sys, zipfile
from pathlib import Path
try:
    from analysis.smoke_test import check
except ModuleNotFoundError:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from smoke_test import check

def review(archive: str) -> dict:
    smoke = check(archive)
    with zipfile.ZipFile(archive) as zf:
        names = set(zf.namelist())
        crawl = json.loads(zf.read('metadata/crawl.json')) if 'metadata/crawl.json' in names else {}
        profile = json.loads(zf.read('analysis/profile.json')) if 'analysis/profile.json' in names else {}
    counts = smoke.get('counts', {})
    errors = smoke.get('errors', [])
    warnings = smoke.get('warnings', [])
    request_error_rate = (profile.get('quality_gates', {}).get('error_rate') if profile else None)
    if request_error_rate is None:
        request_error_rate = None
    decisions = []
    def add(gate, status, reason, action):
        decisions.append({'gate': gate, 'status': status, 'reason': reason, 'action': action})
    add('archive_integrity', 'PASS' if smoke.get('pass') else 'BLOCK',
        'ZIP/schema/record checks passed.' if smoke.get('pass') else '; '.join(errors[:5]),
        'Proceed to coverage review.' if smoke.get('pass') else 'Repair archive or rerun export before analysis.')
    posts = counts.get('posts', 0)
    add('post_availability', 'PASS' if posts else 'BLOCK',
        f'{posts} post records available.',
        'Post-level analysis may proceed.' if posts else 'Do not run topic, ritual, reply, or author analysis; collect a successful thread crawl.')
    stopped = bool(crawl.get('stopped'))
    queue_remaining = crawl.get('queue_remaining')
    complete = not stopped and (queue_remaining in (0, None))
    add('coverage_completion', 'PASS' if complete else 'REVIEW',
        f'stopped={stopped}, queue_remaining={queue_remaining}.',
        'Treat board-wide summaries as coverage-bounded.' if not complete else 'Coverage status is compatible with complete export; still inspect exclusions.')
    if request_error_rate is None:
        add('request_error_rate', 'REVIEW', 'No analysis/profile.json error-rate field is available.', 'Use metadata/requests.jsonl to calculate failed-request strata.')
    else:
        status = 'PASS' if request_error_rate < 0.10 else 'REVIEW'
        add('request_error_rate', status, f'Observed request error rate={request_error_rate:.3f}.', 'Continue with sensitivity analysis.' if status == 'PASS' else 'Report missingness by page kind/status and rerun high-impact failures.')
    duplicate_risk = profile.get('quality_gates', {}).get('duplicate_risk', {}) if profile else {}
    dup_posts = duplicate_risk.get('posts', 0)
    add('identity_deduplication', 'PASS' if not dup_posts else 'REVIEW',
        f'post duplicate risk={dup_posts}.',
        'Use stable post/thread IDs for joins.' if not dup_posts else 'Resolve duplicate identities before network or frequency analysis.')
    add('privacy_and_quote_risk', 'REVIEW',
        'Posts, links, usernames, and quotations can be identifying even when publicly visible.',
        'De-identify authors, avoid searchable verbatim quotations, and restrict raw archives.')
    add('construct_validity', 'REVIEW',
        'Occult/ritual labels are cultural and textual categories, not empirical evidence that supernatural claims are true.',
        'Use source-critical coding; separate emic belief language from analyst claims.')
    statuses = {d['status'] for d in decisions}
    overall = 'BLOCK' if 'BLOCK' in statuses else ('REVIEW' if 'REVIEW' in statuses else 'PASS')
    next_actions = [d['action'] for d in decisions if d['status'] != 'PASS']
    return {'review_version': '1.0', 'archive': archive, 'overall': overall, 'smoke': smoke, 'profile_present': bool(profile), 'decisions': decisions, 'next_actions': next_actions, 'review_protocol': ['Independent rerun of smoke test', 'Data-quality review of missingness and HTTP failures', 'Methods review of deduplication and sampling', 'Ethics/privacy review of quotes, authors, and resource URLs', 'Adopt changes, rerun, and compare reports']}

def markdown(result: dict) -> str:
    lines = [f"# WizardForums Analysis Review\n\n**Overall decision:** `{result['overall']}`\n", '## Gate decisions\n', '| Gate | Status | Reason | Action |', '|---|---|---|---|']
    for d in result['decisions']:
        lines.append(f"| {d['gate']} | {d['status']} | {d['reason'].replace('|','/')} | {d['action'].replace('|','/')} |")
    lines += ['\n## Iteration protocol\n', 'Run the independent smoke test, review missingness and failed-request strata, challenge the construct definitions and deduplication keys, review privacy risks, adopt only justified changes, rerun the analysis, and compare the new report with the prior report.']
    return '\n'.join(lines) + '\n'

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('archive'); ap.add_argument('--out', default='review.json'); ap.add_argument('--md')
    a=ap.parse_args(); result=review(a.archive); Path(a.out).write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8'); md=a.md or str(Path(a.out).with_suffix('.md')); Path(md).write_text(markdown(result),encoding='utf-8'); print(json.dumps({'overall':result['overall'],'out':a.out,'md':md},indent=2)); return 0 if result['overall'] != 'BLOCK' else 2
if __name__ == '__main__': sys.exit(main())
