#!/usr/bin/env python3
"""Initial descriptive analysis for WizardForums organized ZIP archives.

Usage: python3 analysis/initial_analysis.py archive.zip --out reports/initial.json
This is descriptive, not inferential, and never prints raw post bodies.
"""
from __future__ import annotations
import argparse, json, zipfile
from collections import Counter
from datetime import datetime
from urllib.parse import urlparse

def rows(zf, name):
    if name not in zf.namelist(): return []
    return [json.loads(x) for x in zf.read(name).decode('utf-8').splitlines() if x.strip()]

def month(row):
    t = row.get('posted_at') or row.get('created')
    if isinstance(t, dict): t = t.get('iso')
    if not t: return None
    try: return datetime.fromisoformat(str(t).replace('Z', '+00:00')).strftime('%Y-%m')
    except ValueError: return None

def analyze(path):
    with zipfile.ZipFile(path) as zf:
        forums, threads, posts = rows(zf, 'data/forums.jsonl'), rows(zf, 'data/threads.jsonl'), rows(zf, 'data/posts.jsonl')
        links, resources = rows(zf, 'data/links.jsonl'), rows(zf, 'data/resources.jsonl')
    forum_counts = Counter((t.get('forum') or {}).get('title') if isinstance(t.get('forum'), dict) else str(t.get('forum') or '') for t in threads)
    post_forums = Counter((p.get('forum') or {}).get('title') if isinstance(p.get('forum'), dict) else str(p.get('forum') or '') for p in posts)
    resource_types = Counter(r.get('resource_type') or 'unclassified' for r in resources)
    domains = Counter(urlparse(l.get('link_url', '')).netloc.lower() for l in links if l.get('link_url'))
    months = Counter(m for r in posts for m in [month(r)] if m)
    body_lengths = [int(p.get('body_text_length') or len(p.get('body_text') or '')) for p in posts]
    return {
        'archive': path,
        'counts': {'forums': len(forums), 'threads': len(threads), 'posts': len(posts), 'links': len(links), 'resources': len(resources)},
        'coverage': {'post_months': dict(sorted(months)), 'first_post_month': min(months) if months else None, 'last_post_month': max(months) if months else None},
        'thread_distribution_top20': forum_counts.most_common(20),
        'post_distribution_top20': post_forums.most_common(20),
        'resource_types': resource_types,
        'link_domains_top30': domains.most_common(30),
        'post_length': {'n': len(body_lengths), 'min': min(body_lengths) if body_lengths else None, 'median': sorted(body_lengths)[len(body_lengths)//2] if body_lengths else None, 'max': max(body_lengths) if body_lengths else None},
        'analysis_status': 'blocked_for_post_topics' if not posts else 'ready_for_post_smoke_analysis',
        'interpretation_guardrail': 'Descriptive coverage only; forum counts and links are not evidence of belief prevalence, influence, causality, or offline practice.'
    }

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('archive'); ap.add_argument('--out', required=True); a=ap.parse_args()
    result=analyze(a.archive); open(a.out,'w',encoding='utf-8').write(json.dumps(result,indent=2,ensure_ascii=False,default=list)+'\n'); print(json.dumps(result,indent=2,ensure_ascii=False,default=list))
if __name__=='__main__': main()
