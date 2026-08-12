# Occult Corpus Research — Unified Master Plan

**Version:** 2.0  
**Date:** 2026-08-13  
**Status:** Research Design Complete → Implementation Phase  

---

## Executive Summary

This plan documents a multi-loop research design process for analyzing online occult communities using computational methods. The design went through **2 full loops** of hypothesis generation → literature review → expert review → revision, resulting in a sharpened contribution: **culturally-aware NLP methodology for studying digital tradition**.

**Key Output:** 10 hypotheses → 30 testable sub-hypotheses, 6 experiments, 4 expert reviews, and a multi-perspective analysis framework.

---

## Phase 0: Research Design (Completed)

### Loop 1: Initial Design
- **Hypothesis Generator:** 10 exploratory hypotheses across linguistic, network, temporal, and epistemic dimensions
- **Literature Review:** 7 computational folkloristics papers synthesized
- **Initial Assessment:** Novelty unclear, contribution fuzzy, methodology toolkit-driven

### Loop 2: Expert Review & Revision
- **4 Simulated Expert Reviews:**
  - Computational Folklorist: Weak Accept (network construction concerns)
  - Digital Anthropologist: Borderline (extractive epistemology, ethics)
  - NLP/ML Researcher: Borderline (no baselines, vague metrics)
  - Conference Reviewer: Weak Accept (novelty unclear, contribution muddy)
- **Critical Insight:** Position as **culturally-aware NLP methodology** with a **theory of digital tradition**
- **Sharpened Contribution:** Not "NLP on witchcraft" but **methods for handling esoteric/spiritual language** that generalize beyond occult communities

### Refined Hypothesis Priorities (First Tier)
| Hypothesis | Focus | Novelty | Testability |
|-----------|-------|---------|-------------|
| H1: Linguistic Register Stratification | Ceremonial vs folk vs chaos vocabularies | ★★★★ | ★★★★★ |
| H3: Temporal Cyclicality | Sabbat-aligned posting patterns | ★★★★★ | ★★★★ |
| H6: Newcomer Linguistic Assimilation | Jargon acquisition over time | ★★★★ | ★★★★ |
| H8: Epistemic Pluralism | Different validation strategies per tradition | ★★★★★ | ★★★ |

---

## Phase 1: Data Collection

### Sources
| Platform | Communities | Expected Volume |
|----------|-------------|-----------------|
| Reddit | r/occult, r/witchcraft, r/magick, r/LeftHandPath, r/chaosmagick, r/hermeticism, r/demonolatryPractices | 50,000+ posts |
| WizardForums | General Occult, Satanism & Demonology, etc. | 5,000+ threads |

### Ethics
- Public data only
- SHA-256 username hashing with salt
- No identifiable quotes in publications
- CC-BY-NC dataset license
- Community consultation (post to r/occult asking for feedback)

### Deliverables
- `data/raw/reddit_posts.jsonl`
- `data/raw/wizardforums_threads.jsonl`
- `data/processed/occult_corpus.parquet` (anonymized, deduplicated)

---

## Phase 2: Experiments (6 Core)

| ID | Experiment | Hypothesis | Method | Status |
|----|-----------|------------|--------|--------|
| A | Topic Modeling | H1, H4 | BERTopic + LDA/NMF baselines | Design Complete |
| B | Network Analysis | H2 | Reply networks, Louvain/Leiden | Design Complete |
| C | Cross-Platform Comparison | H3, H4 | KL-divergence, Mann-Whitney U | Design Complete |
| D | Temporal Evolution | H3 | Dynamic Topic Modeling, changepoints | Design Complete |
| E | Expertise Detection | H5, H6 | Classification (LR, RF, XGBoost, BERT) | Design Complete |
| F | Ritual Language Detection | H6, H9 | POS-based classification, manual annotation | Design Complete |

### Controls & Validation
- Negative controls (r/AskReddit comparison)
- Null models (shuffled data, random graphs)
- Cross-validation (5-fold, temporal split)
- Ablation studies (per experiment)
- Artifact detection checklist (10 items)

### Pre-Registered Decisions
- Hypotheses H1-H6 (locked)
- Significance: p < 0.05 per test, FDR corrected
- Primary metrics: NPMI, Modularity, KL-divergence, F1, AUC-ROC
- Minimum sample: 5,000 Reddit posts, 500 WizardForums threads
- Exclusion: < 20 chars, non-English, deleted/removed

---

## Phase 3: Analysis & Paper

### Paper Structure (ACM Format, ~9 pages)
1. Introduction & Motivation
2. Related Work (computational folkloristics, digital religion, NLP)
3. Data & Ethics
4. Methodology (culturally-aware NLP pipeline)
5. Results (per experiment)
6. Discussion (digital tradition theory)
7. Limitations & Future Work
8. Conclusion

### Contribution Statement
> "We present a culturally-aware NLP methodology for analyzing esoteric discourse, validated on the largest corpus of online occult community text to date. Our approach combines domain-adapted topic modeling, temporal network analysis, and cross-platform comparison to reveal how digital folklore operates in algorithmically-mediated spaces."

### Target Venues
- **Primary:** WebSci 2027 (fits digital tradition + network analysis)
- **Secondary:** CSCW 2027 (fits online community + HCI)
- **Tertiary:** DH 2027 (fits computational humanities)

---

## Phase 4: Website & Dissemination

### GitHub Pages Site
- Interactive topic model visualization
- Network graph explorer
- Methodology documentation
- Dataset download (anonymized)
- Paper PDF

### Community Return
- Post findings summary to r/occult
- Blog post on methodology
- Open-source toolkit release

---

## Multi-Perspective Analysis Framework

### Developer Lens
- What's buildable? What's too slow?
- Escalation: > 48h compute → simplify; < 70% data quality → fix collection

### Researcher Lens
- What claims are valid? What's the threat?
- Escalation: p < 0.05 but d < 0.2 → "suggestive"; no replication → don't claim

### Math/Logic Lens
- What formal structures govern the data?
- Escalation: distribution violation → report as finding; network disconnected → analyze LCC

### Pattern-Matching Lens
- What unexpected connections emerge?
- Escalation: not significant but interesting → "exploratory"; contradicts experts → investigate

### Checkpoint Agreement Required
All 4 perspectives must agree before advancing: C1 (data) → C2 (topics) → C3 (network) → C4 (cross-platform) → C5 (temporal) → C6 (expertise) → C7 (ritual)

---

## Expert Review Summary

| Reviewer | Verdict | Key Fix |
|----------|---------|---------|
| Computational Folklorist | Weak Accept | Network construction justification |
| Digital Anthropologist | Borderline | Community engagement, ethics |
| NLP/ML Researcher | Borderline | Baselines, reproducibility |
| Conference Reviewer | Weak Accept | Sharpen novelty, pick one contribution |

**Meta-Verdict:** With revisions (sharpened contribution, rigorous evaluation, ethics expansion), this moves to **Accept/Strong Accept** at WebSci or CSCW.

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Reddit API changes | High | Use Pushshift dump; fallback to HTTP scraping |
| WizardForums data scarce | High | Combine sub-forums; supplement with Internet Archive |
| Topic models fail | Medium | Multiple algorithms; human evaluation mandatory |
| Networks too sparse | Medium | Include same-thread edges; lower thresholds |
| Low annotation agreement | Medium | Refine guidelines; adjudication; report κ |
| Compute limits | Low | Subsample for dev; full data for final |

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| P0: Research Design | 2 loops | ✅ Complete |
| P1: Data Collection | 2 weeks | 🔄 Next |
| P2: Experiments | 4-5 weeks | ⏳ Pending |
| P3: Paper Writing | 3 weeks | ⏳ Pending |
| P4: Website + Dissemination | 2 weeks | ⏳ Pending |

---

## Deliverables Checklist

- [x] Master Plan (this document)
- [x] Hypotheses (10 + 30 sub-hypotheses)
- [x] Expert Reviews (4 reviews + synthesis)
- [x] Experiment Designs (6 experiments)
- [x] Data Framework (taxonomy + smoke tests)
- [x] Literature Review (7 papers)
- [ ] Scrapers (Reddit + WizardForums)
- [ ] Collected Dataset
- [ ] Experiment Results
- [ ] Paper Draft
- [ ] Website
- [ ] GitHub Repo (public)

---

*Plan Version: 2.0*  
*Next Action: Create GitHub repo, push all design documents, begin P1 data collection*
