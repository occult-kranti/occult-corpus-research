#!/usr/bin/env python3
"""Merge extracted WizardForums checkpoint deltas in order.

Usage:
  python3 tools/merge_checkpoints.py extracted_archive_root merged_output

The utility reads checkpoints/cp-NNN/data/*.jsonl and metadata requests, preserves
record order, deduplicates stable IDs/URLs, and writes a manifest. It does not
merge the final snapshot; use the final archive as the authoritative complete set
when available.
"""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

KINDS = ('forums','threads','posts','links','resources','pages','all')
ID_KEYS = {'forums':'id','threads':'id','posts':'id','links':None,'resources':None,'pages':None,'all':None}

def read_jsonl(path):
    if not path.exists(): return []
    out=[]
    for n,line in enumerate(path.read_text(encoding='utf-8').splitlines(),1):
        if line.strip():
            try: out.append(json.loads(line))
            except Exception as e: raise ValueError(f'{path}:{n}: {e}')
    return out

def key(kind,row):
    ident = ID_KEYS.get(kind)
    if ident and row.get(ident) is not None: return f'{kind}:{row[ident]}'
    if kind in ('links','resources'):
        return '|'.join(str(row.get(k) or '') for k in ('source_url','post_id','link_url','resource_type'))
    if kind == 'pages': return '|'.join(str(row.get(k) or '') for k in ('url','kind'))
    return hashlib.sha256(json.dumps(row,sort_keys=True,ensure_ascii=False).encode()).hexdigest()

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('root',type=Path); ap.add_argument('out',type=Path); a=ap.parse_args()
    cps=sorted((a.root/'checkpoints').glob('cp-*'))
    if not cps: raise SystemExit('no checkpoints/cp-* directories found')
    a.out.mkdir(parents=True,exist_ok=True); seen={k:set() for k in KINDS}; counts={k:0 for k in KINDS}; used=[]
    for cp in cps:
        used.append(cp.name)
        for kind in KINDS:
            rows=[]
            for row in read_jsonl(cp/'data'/f'{kind}.jsonl'):
                k=key(kind,row)
                if k in seen[kind]: continue
                seen[kind].add(k); rows.append(row)
            if rows:
                with (a.out/f'{kind}.jsonl').open('a',encoding='utf-8') as f:
                    for row in rows: f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
                counts[kind]+=len(rows)
    manifest={'checkpoint_directories':used,'counts':counts,'note':'Checkpoint deltas merged in lexical checkpoint order; final archive remains authoritative.','deduplication':'stable IDs for forums/threads/posts; source/post/link/resource keys for links/resources; URL/kind for pages.'}
    (a.out/'merge_manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps(manifest,indent=2,ensure_ascii=False))
if __name__=='__main__': main()
