#!/usr/bin/env python3
"""Post-level smoke analysis for WizardForums archives.

This intentionally starts with auditable lexical/descriptive measures before any
embedding or topic model. It does not diagnose users, beliefs, mental health, or
ritual efficacy.

Usage: python3 analysis/post_analysis.py archive.zip --out reports/post_analysis.json
"""
from __future__ import annotations
import argparse, json, math, re, zipfile
from collections import Counter

TOKEN = re.compile(r"[\w'’-]+", re.UNICODE)
STOP = set('the and for that with this from have are was were has had not but you your about into they them their there what when where which how can all any our out who why'.split())
LEXICONS = {
 'ritual_practice': set('ritual spell ceremony altar circle candle incense invocation banish cleanse protection offering divination sigil grimoire'.split()),
 'tradition_terms': set('ceremonial hermetic chaos witchcraft wicca thelema goetia tarot astrology alchemy shamanic folk pagan'.split()),
 'epistemic_discussion': set('proof evidence skeptical doubt believe experience theory source historical academic'.split()),
 'resource_requests': set('book pdf ebook download scan text file copy recommend library'.split()),
}

def rows(zf, name):
    if name not in zf.namelist(): return []
    return [json.loads(x) for x in zf.read(name).decode('utf-8').splitlines() if x.strip()]

def analyze(path):
    with zipfile.ZipFile(path) as zf:
        posts=rows(zf,'data/posts.jsonl'); links=rows(zf,'data/links.jsonl'); resources=rows(zf,'data/resources.jsonl')
    docs=[]; term_counts=Counter(); lex_counts=Counter(); quote_total=0; attachment_total=0
    for p in posts:
        text=str(p.get('body_text') or '')
        toks=[t.lower() for t in TOKEN.findall(text)]
        clean=[t for t in toks if len(t)>2 and t not in STOP]
        term_counts.update(clean); quote_total += int(p.get('quote_count') or 0); attachment_total += int(p.get('attachment_count') or 0)
        for name, words in LEXICONS.items(): lex_counts[name] += sum(1 for t in clean if t in words)
        docs.append({'id':p.get('id'),'thread_id':p.get('thread_id'),'tokens':len(toks),'unique_tokens':len(set(clean)),'body_chars':int(p.get('body_text_length') or len(text)),'quote_count':int(p.get('quote_count') or 0),'attachment_count':int(p.get('attachment_count') or 0),'link_count':len(p.get('links') or [])})
    vocab=sum(term_counts.values()); entropy=-sum((n/vocab)*math.log((n/vocab),2) for n in term_counts.values()) if vocab else None
    return {
      'archive':path,'posts_analyzed':len(posts),'document_features':docs[:1000],
      'lexical_baseline':{'top_terms':term_counts.most_common(100),'vocabulary_size':len(term_counts),'token_count':vocab,'token_entropy_bits':entropy,'lexicon_hits':dict(lex_counts)},
      'interaction_features':{'total_quotes':quote_total,'total_attachments':attachment_total,'post_links':sum(len(p.get('links') or []) for p in posts),'archive_links':len(links),'archive_resources':len(resources)},
      'topic_model_readiness':{'ready':len(posts)>=100,'reason':None if len(posts)>=100 else 'Need at least 100 non-empty posts for a smoke topic model; use larger samples for stable comparisons.'},
      'guardrails':['Do not infer belief, ritual efficacy, dangerousness, or offline behavior from lexical hits.','Validate topic labels with human coding and report uncertainty.','Keep quotes and usernames out of public examples unless consent and risk review justify inclusion.']
    }

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('archive'); ap.add_argument('--out',required=True); a=ap.parse_args(); r=analyze(a.archive); open(a.out,'w',encoding='utf-8').write(json.dumps(r,indent=2,ensure_ascii=False)+'\n'); print(json.dumps(r,indent=2,ensure_ascii=False))
if __name__=='__main__': main()
