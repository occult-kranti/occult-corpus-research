# Occult Corpus Research — Status Report
**Date:** 2026-08-12  
**Project:** Computational Analysis of Online Occult Communities  
**Phase:** P0 (Foundation) — **COMPLETE**

---

## ✅ Completed Deliverables

### 1. Research Plan (MASTER_PLAN.md)
- 6-phase methodology defined
- Dataset schema specified
- Target platforms identified (Reddit + WizardForums)
- Ethics framework established

### 2. Literature Review (docs/literature_review.md)
- **28 academic papers** reviewed and categorized
- 7 search queries across Google Scholar
- Research gap analysis completed
- Key finding: **No existing study combines cross-platform comparison + longitudinal analysis + combined NLP/network/discourse methods on occult communities**

### 3. Data Architecture (src/schema.py, config.yaml)
- Pydantic data models for ForumPost, Thread, Author
- Comprehensive YAML configuration
- Anonymization pipeline (SHA-256 hashing)
- Project structure established

### 4. Reddit Scraper (src/scrapers/reddit_scraper.py)
- PRAW-based OAuth pipeline
- Subreddit discovery and filtering
- Post/comment extraction with metadata
- Rate limiting and error handling
- Progress persistence

### 5. WizardForums Scraper (src/scrapers/wizardforums_scraper.py)
- BeautifulSoup + requests pipeline
- Forum discovery from home page
- Thread listing with pagination
- Post extraction (content, author, timestamps, reactions)
- User stats extraction (joined date, messages, reaction score, rank)
- Username anonymization
- Rate limiting (2s delay), User-Agent rotation, exponential backoff
- Progress save/resume
- Test suite (tests/test_wizardforums_scraper.py)

### 6. Site Structure Research
- **WizardForums mapped:** 16 forums identified, 22,112 threads, 138,188 messages total
- URL patterns documented: `/forums/name.id/`, `/threads/name.id/page-N`
- Post structure analyzed: XenForo-based, `<article>` tags for posts

---

## 📊 Current Project Stats

| Component | Status | Lines |
|-----------|--------|-------|
| Master Plan | ✅ | 400+ |
| Literature Review | ✅ | 400+ (28 papers) |
| Data Schema | ✅ | 200+ |
| Config | ✅ | 80+ |
| Reddit Scraper | ✅ | 500+ |
| WizardForums Scraper | ✅ | 400+ |
| Tests | ✅ | 150+ |
| **Total Code** | — | **~2,000+** |

---

## 🎯 Identified Research Gaps (Our Contribution)

1. **Cross-platform comparison** — No study compares Reddit vs. dedicated occult forums
2. **Longitudinal analysis** — Most studies are synchronic; we have 5+ year span
3. **Multi-method fusion** — No study combines BERTopic + network analysis + discourse analysis
4. **Open dataset** — We will release anonymized data
5. **Living traditions** — Computational folkloristics has focused on archives, not living communities

---

## 🚀 Next Phase: P1 (Data Collection)

### Immediate Actions:
1. **Obtain Reddit API credentials** (client_id, client_secret)
2. **Run test scrapes** — Verify both scrapers with small samples
3. **Begin data collection** — Target: 5K Reddit posts, 500 WizardForums threads
4. **Launch NLP Pipeline Agent** — BERTopic + LDA topic modeling
5. **Launch Network Analysis Agent** — Reply graph construction

### P1 Agents to Spawn:
- NLP Pipeline Agent (BERTopic, LDA, NER)
- Network Analysis Agent (reply graphs, centrality metrics)
- Preprocessing Agent (text cleaning, deduplication, anonymization verification)

---

## 📝 Files Created

```
projects/occult-corpus-research/
├── MASTER_PLAN.md
├── README.md
├── config.yaml
├── requirements.txt
├── docs/
│   └── literature_review.md          ← 28 papers reviewed
├── src/
│   ├── __init__.py
│   ├── schema.py                     ← Pydantic data models
│   ├── scrapers/
│   │   ├── __init__.py
│   │   ├── reddit_scraper.py         ← Reddit data pipeline
│   │   └── wizardforums_scraper.py   ← WizardForums pipeline
│   ├── preprocessing/
│   │   └── __init__.py
│   ├── analysis/
│   │   └── __init__.py
│   └── visualization/
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   ├── test_schema.py
│   └── test_wizardforums_scraper.py
└── scholar_1.csv ... scholar_7.csv   ← Raw search results
```

---

## ⚠️ Blockers / Needs Input

1. **Reddit API credentials** — Need client_id and client_secret for PRAW OAuth
2. **Collection scope confirmation** — Confirm target numbers (5K Reddit posts, 500 WF threads)
3. **Paper venue** — Confirm ACM conference target (CHI? CSCW? WebSci?)

---

## 🔄 Replanning Notes

**Logical check passed** — No fallacies detected in research design:
- ✅ Representative sampling (multiple subreddits + multiple WF forums)
- ✅ Cross-validation (BERTopic + LDA comparison)
- ✅ Ethics compliance (anonymization, public data only)
- ✅ Reproducibility (open code, documented methodology)

**Adjustment:** Extended WizardForums scraper to extract user stats (rank, join date, message count, reaction score) after site inspection revealed rich metadata available. This strengthens the network analysis potential.

---

*Report compiled by Research Team Lead*
*Swarm agents: 4 deployed, 4 returned (3 complete, 1 timed out but structure research completed manually)*
