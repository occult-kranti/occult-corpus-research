# Experiment Design: Occult Corpus Research

> **Project:** Digital Folklore & Occult Knowledge Networks  
> **Date:** 2026-08-12  
> **Status:** Draft — Ready for Review  

---

## Overview

This document defines the experimental methodology for testing hypotheses about online occult communities. Each experiment is designed to be independently executable, with clear success/failure criteria, controls, and statistical rigor.

**Prerequisite:** Data collection (P1) must yield:
- Reddit: ≥5,000 posts with comments (r/occult, r/witchcraft, r/magick, r/LeftHandPath, r/chaosmagick)
- WizardForums: ≥500 threads with replies
- Temporal span: minimum 2 years (preferably 5+)

---

## 1. Experiment Matrix

### Experiment A: Topic Modeling — Thematic Structure of Occult Discourse

**Research Question:** What are the dominant thematic clusters in occult online discourse, and how do they differ from mainstream discourse?

**Hypothesis (H₁):** Occult communities have distinct topic clusters that differ significantly from mainstream discourse, with higher internal coherence on esoteric terminology.

**Method:**

| Component | Specification |
|-----------|--------------|
| **Primary Model** | BERTopic (sentence-transformers: `all-MiniLM-L6-v2`) |
| **Comparison Models** | LDA (gensim, 10/20/50 topics), NMF (sklearn, 20 topics), TF-IDF + K-Means |
| **Preprocessing** | Lowercase, remove URLs/HTML, keep punctuation for semantic meaning, lemmatize (spacy) |
| **Embedding** | 384-dim sentence embeddings, pooled |
| **Dimensionality Reduction** | UMAP (n_neighbors=15, min_dist=0.1, n_components=5) |
| **Clustering** | HDBSCAN (min_cluster_size=15, min_samples=5) |
| **Representation** | c-TF-IDF on clustered documents |

**Controls:**
- **Negative Control:** Random sample of 5,000 posts from r/AskReddit, r/lifeprotips, r/science (matched by post length distribution)
- **Null Model:** Shuffle word order within posts, re-run BERTopic (topics should degrade)
- **Cross-Validation:** 5-fold train/test split, test stability of topic assignments

**Metrics:**

| Metric | Tool | Threshold |
|--------|------|-----------|
| Topic Coherence (NPMI) | gensim `CoherenceModel` | > 0.15 (acceptable), > 0.25 (good) |
| Topic Diversity | % unique words in top-10 terms across topics | > 0.7 |
| Human Interpretability | 3 annotators rate topic clarity 1-5 | Mean > 3.5 |
| Stability (Jaccard) | Top-10 word overlap across folds | > 0.6 |
| Silhouette Score | sklearn | > 0.2 |

**Expected Outputs:**
- 15-30 coherent topics (BERTopic)
- Topic distribution per subreddit/forum
- Comparison table: BERTopic vs LDA vs NMF coherence scores
- Visualization: topic hierarchy (hierarchical clustering of topics)

**Failure Modes:**
- HDBSCAN marks everything as noise (-1 cluster) → tune `min_cluster_size`, reduce `n_components`
- Topics are generic ("people", "time", "think") → add domain-specific stopwords, use guided BERTopic with seed terms
- Overfitting to platform-specific vocabulary → remove platform boilerplate ("reddit", "upvote", "thread")

---

### Experiment B: Network Analysis — Reply Networks & Expertise Hierarchies

**Research Question:** Do reply networks in occult communities reveal expertise hierarchies and distinct community clusters?

**Hypothesis (H₂):** Reply networks exhibit scale-free properties with high clustering, and centrality correlates with linguistic markers of expertise (specialized vocabulary, citation of sources).

**Method:**

| Component | Specification |
|-----------|--------------|
| **Graph Type** | Directed reply graph: nodes = authors, edges = replies (weighted by frequency) |
| **Graph Construction** | Multi-layer: (1) direct replies, (2) same-thread co-participation, (3) quoted references |
| **Community Detection** | Louvain (igraph), Leiden (leidenalg), compare modularity |
| **Centrality** | In-degree (attention received), betweenness (bridge builders), eigenvector (influential neighbors), PageRank |
| **Null Model** | Configuration model preserving degree sequence (NetworkX `configuration_model`) |

**Controls:**
- **Null Model:** 100 random graphs with same degree sequence; compare clustering coefficient and path length
- **Cross-Platform Control:** Compare Reddit reply network vs WizardForums network (same metrics)
- **Temporal Control:** Split by year, compare network evolution

**Metrics:**

| Metric | Definition | Expected |
|--------|-----------|----------|
| Clustering Coefficient | Transitivity of reply triangles | > 0.1 (higher than random) |
| Modularity (Louvain) | Q-score for community structure | > 0.4 (significant communities) |
| Assortativity | Degree-degree correlation | Slight disassortativity (experts reply to novices) |
| Power-Law Exponent | Degree distribution fit (powerlaw package) | 2 < γ < 3 |
| Centality-Expertise Correlation | Spearman ρ between PageRank and expertise score | > 0.3, p < 0.001 |

**Expertise Score (Linguistic Proxy):**
- Vocabulary richness (Type-Token Ratio, MTLD)
- Citation of books/grimoires (regex: "Liber", "Goetia", "Crowley", "Regardie")
- Use of technical terms ("banishing", "invocation", "sigil", "tattva")
- Post length and complexity (Flesch-Kincaid inverse)

**Expected Outputs:**
- GEXF/GraphML files for both platforms
- Community membership lists
- Top-20 "expert" nodes by centrality + linguistic score
- Comparison: Reddit network stats vs WizardForums stats

**Failure Modes:**
- Graph too sparse (many isolates) → include same-thread edges, lower threshold
- Communities reflect subreddits not topics → control for subreddit in analysis
- WizardForums network too small for power-law → use exponential cut-off model, bootstrap

---

### Experiment C: Cross-Platform Comparison — Reddit vs WizardForums

**Research Question:** How do linguistic and thematic profiles differ between Reddit (mainstream occult) and WizardForums (dedicated occult)?

**Hypothesis (H₃):** Reddit posts show higher eclecticism (mixing traditions) and pop-culture references; WizardForums show higher technical specificity and traditional vocabulary.

**Method:**

| Component | Specification |
|-----------|--------------|
| **Vocabulary Comparison** | KL-divergence of word frequency distributions; chi-square test for distinctive terms |
| **Thematic Overlap** | Train BERTopic on combined corpus; compare topic distributions per platform |
| **Sentiment Analysis** | VADER (social media tuned) + fine-tuned RoBERTa on occult corpus |
| **Formality Analysis** | Flesch-Kincaid, automated readability index (ARI); formality markers (contractions, slang) |
| **Network Comparison** | Same metrics as Experiment B, test for significant differences (Mann-Whitney U) |

**Controls:**
- **Time-Matching:** Compare posts from same time period (avoid temporal confounds)
- **Length-Matching:** Match posts by character count distribution (shorter Reddit posts may bias results)
- **Topic-Matching:** Compare only posts tagged with same topics (from Experiment A)

**Metrics:**

| Metric | Test | Significance |
|--------|------|-------------|
| Vocabulary Overlap | Jaccard similarity, KL-divergence | KL > 0.5 (substantial divergence) |
| Distinctive Terms | Fisher's exact test (Bonferroni corrected) | adj. p < 0.001 |
| Sentiment Difference | Mann-Whitney U | p < 0.01, r > 0.1 (effect size) |
| Topic Distribution | χ² goodness-of-fit | p < 0.001 |
| Network Density | Permutation test (1000 swaps) | p < 0.01 |

**Expected Outputs:**
- Table of top-50 distinctive words per platform (log-odds ratio)
- Side-by-side topic distribution charts
- Statistical test results matrix
- Qualitative examples of platform-specific discourse patterns

**Failure Modes:**
- Sample size imbalance (Reddit >> WizardForums) → downsample Reddit, report both raw and balanced
- Platform jargon dominates differences → remove platform-specific terms before comparison
- Temporal mismatch → stratify by year/month

---

### Experiment D: Temporal Evolution — Dynamic Topic Modeling

**Research Question:** How does occult discourse evolve in response to cultural events, and what drives topic shifts?

**Hypothesis (H₄):** Major cultural events (COVID-19 pandemic, popular media releases) cause detectable shifts in topic prevalence and vocabulary, with increased interest in protective magic and banishing rituals during crises.

**Method:**

| Component | Specification |
|-----------|--------------|
| **Model** | Dynamic Topic Modeling (gensim DTM) or BERTopic with time-windowed fitting |
| **Time Bins** | Monthly aggregation (minimum 100 posts/month) |
| **Word Evolution** | Word2vec / GloVe diachronic embeddings; word shift graphs |
| **Changepoint Detection** | PELT algorithm (ruptures package), Bayesian Online Changepoint Detection |
| **Event Correlation** | Cross-reference with known events: COVID (Mar 2020), "Sabrina" release (Oct 2018), "Hereditary" (Jan 2018), TikTok witchcraft trend (2020-2021) |

**Controls:**
- **Non-Occult Control:** DTM on r/AskReddit same time period (check if shifts are occult-specific or platform-wide)
- **Random Baseline:** Permutation test — shuffle timestamps, re-run DTM (no coherent evolution expected)
- **Seasonal Control:** Check for seasonal patterns (Samhain/Halloween spikes) vs event-driven

**Metrics:**

| Metric | Definition | Threshold |
|--------|-----------|----------|
| Topic Stability | Jensen-Shannon divergence between consecutive months | < 0.3 (stable), flag > 0.5 |
| Word Shift Significance | z-score for word frequency changes | > 2.0 |
| Changepoint Confidence | BIC score for PELT segments | ΔBIC > 10 per change |
| Event Correlation | Point-biserial correlation (event present vs topic prevalence) | r > 0.2, p < 0.01 |

**Expected Outputs:**
- Topic prevalence time series (per topic, per month)
- Changepoint annotation chart
- Word shift graphs for major transitions
- Correlation matrix: events vs topic shifts

**Failure Modes:**
- Time bins too sparse → aggregate to quarterly
- DTM requires large corpus → fallback to sliding window BERTopic
- Confounding by platform growth → normalize by total posts per month
- Events are post-hoc rationalization → pre-register event list before analysis

---

### Experiment E: Expertise Detection — Novice vs Expert Classification

**Research Question:** Can linguistic features reliably distinguish novice from expert practitioners in occult communities?

**Hypothesis (H₅):** A classifier using lexical, syntactic, and discourse features can distinguish veterans from newcomers with F1 > 0.70.

**Method:**

| Component | Specification |
|-----------|--------------|
| **Ground Truth** | WizardForums user stats: rank (Apprentice → Archmage), join date, message count, reaction score; Reddit: account age, karma, subreddit-specific flair |
| **Classes** | Binary: Novice (new/low activity) vs Expert (veteran/high activity/ranked) |
| **Features** | Lexical (TTR, MTLD, technical term ratio), Syntactic (avg sentence length, dependency depth), Discourse (citation count, question ratio, imperative ratio), Network (PageRank, in-degree) |
| **Models** | Logistic Regression (baseline), Random Forest, XGBoost, BERT fine-tuned |
| **Validation** | Stratified 5-fold CV, temporal split (train on older, test on newer) |

**Feature Engineering:**

| Feature Category | Specific Features |
|-----------------|-------------------|
| **Lexical Richness** | TTR, MTLD, HD-D, technical vocabulary ratio |
| **Syntactic Complexity** | Mean sentence length, parse tree depth, subordinate clause ratio |
| **Discourse Markers** | Citations per post, question marks per post, imperative verbs ("do", "perform", "cast") |
| **Temporal** | Account age at post time, posts per month |
| **Engagement** | Reply ratio, average thread depth where user posts |
| **Network** | PageRank, in-degree, betweenness (from Experiment B) |

**Controls:**
- **Length Control:** Ensure average post length is balanced between classes
- **Topic Control:** Stratify by topic — expertise should predict class within topics
- **Platform Control:** Train/test within platform first, then cross-platform
- **Class Balance:** Use SMOTE or class weights if imbalanced

**Metrics:**

| Metric | Target |
|--------|--------|
| F1-Score (macro) | > 0.70 |
| Precision (expert) | > 0.65 |
| Recall (expert) | > 0.65 |
| AUC-ROC | > 0.75 |
| SHAP Feature Importance | Top 10 features ranked |

**Expected Outputs:**
- Feature importance plot (SHAP)
- Confusion matrix
- Learning curve (detect overfitting)
- Error analysis: misclassified examples

**Failure Modes:**
- Ground truth is noisy (rank ≠ expertise) → use multiple signals, report inter-rater agreement if manual labels
- Features leak (network features need future data) → use only pre-post network state
- Overfitting to platform → test cross-platform generalization
- Class imbalance → report precision-recall curves, not just accuracy

---

### Experiment F: Ritual Language Detection — Register Analysis

**Research Question:** Do ritual instructions have distinct linguistic markers that distinguish them from general discussion?

**Hypothesis (H₆):** Ritual posts exhibit higher use of imperatives, enumerated steps, sensory language, and second-person address compared to general occult discussion.

**Method:**

| Component | Specification |
|-----------|--------------|
| **Data** | 500 posts manually annotated for ritual vs non-ritual (2 annotators, inter-annotator agreement) |
| **Annotation Guidelines** | Ritual = post containing step-by-step instructions for magical practice; Non-ritual = discussion, question, or experience sharing |
| **Features** | POS ratios (imperative verbs, nouns, adjectives), register markers ("first", "then", "next", "light the candle"), sensory words ("visualize", "feel", "sense", "smell"), second-person pronouns, numbered lists |
| **Models** | SVM with TF-IDF, BERT sequence classification, rule-based baseline |
| **Validation** | Train/test split 80/20, cross-validation |

**Annotation Protocol:**

| Category | Definition | Examples |
|----------|-----------|----------|
| **Ritual Instruction** | Step-by-step magical procedure | "Light the black candle. Draw the circle. Chant the invocation three times." |
| **Ritual Discussion** | Talking about rituals without instructions | "I tried the LBRP last night and felt something strange." |
| **General Discussion** | Questions, opinions, experiences | "What do you think about Crowley's influence?" |
| **Unclear** | Ambiguous or mixed | Mark for adjudication |

**Controls:**
- **Baseline:** Random classifier (50%), majority-class classifier
- **Length Control:** Ritual posts may be longer → include post length as feature, check correlation
- **Topic Control:** Some topics (spells, rituals) naturally have more ritual posts → stratify by topic

**Metrics:**

| Metric | Target |
|--------|--------|
| Inter-Annotator Agreement (Cohen's κ) | > 0.70 |
| F1-Score (ritual class) | > 0.75 |
| Precision | > 0.70 |
| Recall | > 0.70 |
| Ablation: POS-only vs Lexical-only | Report both |

**Expected Outputs:**
- Annotated dataset (500 posts)
- Confusion matrix and classification report
- Feature analysis: which POS/register markers are most predictive
- Examples of true positives, false positives, false negatives

**Failure Modes:**
- Low inter-annotator agreement → refine guidelines, add adjudication round
- Class imbalance (few ritual posts) → active learning, oversample
- Overfitting to specific rituals (LBRP, etc.) → ensure diverse ritual types in training
- Features not generalizable to WizardForums → test cross-platform

---

## 2. Smoke Test Plan

For each experiment, the following minimum viable tests must pass before full execution:

### A. Topic Modeling Smoke Test
```python
# Load 100 sample posts
# Run BERTopic with default params
# Check: at least 3 coherent topics emerge
# Check: no more than 30% labeled as noise (-1)
# Check: top terms for largest topic are occult-related (not generic)
```
**Expected Failure:** All topics generic → adjust embedding model, add seed terms  
**Sanity Check:** Manually read 5 posts from largest cluster → do they belong together?

### B. Network Smoke Test
```python
# Load 100 posts with reply chains
# Construct reply graph
# Check: graph has > 50 nodes, > 100 edges
# Check: largest connected component > 30% of nodes
# Check: degree distribution is right-skewed (not uniform)
```
**Expected Failure:** Too sparse → include same-thread edges  
**Sanity Check:** Most connected node is a frequent poster (check username hash)

### C. Cross-Platform Smoke Test
```python
# Load 100 posts from each platform
# Compute word frequency distributions
# Check: KL-divergence > 0.1 (some difference exists)
# Check: top distinctive terms per platform make sense
```
**Expected Failure:** No difference → check for platform boilerplate contamination  
**Sanity Check:** Reddit top terms include "subreddit", "upvote" → remove platform terms

### D. Temporal Smoke Test
```python
# Load posts spanning 6+ months
# Aggregate by month, count posts
# Check: no month has < 10 posts
# Check: topic prevalence varies over time (not flat)
```
**Expected Failure:** Sparse months → aggregate to quarterly  
**Sanity Check:** October shows Halloween-related topic spike

### E. Expertise Smoke Test
```python
# Load 100 users with known ranks/join dates
# Compute basic features (post length, TTR)
# Check: experts have longer posts on average (t-test, p < 0.05)
# Check: experts use more technical terms
```
**Expected Failure:** No signal in simple features → need network features  
**Sanity Check:** Most senior rank users have higher in-degree

### F. Ritual Detection Smoke Test
```python
# Manually label 50 posts (ritual vs non-ritual)
# Train SVM on POS features only
# Check: accuracy > 60% (better than random)
# Check: imperative verb ratio is higher in ritual posts
```
**Expected Failure:** No pattern in POS → add lexical/register features  
**Sanity Check:** Imperative ratio correlation with ritual label > 0.3

---

## 3. Evaluation Framework

### 3.1 Statistical Significance Thresholds

| Test Type | Threshold | Correction |
|-----------|-----------|------------|
| Single hypothesis test | p < 0.05 | None |
| Multiple comparisons (per experiment) | p < 0.05 | Bonferroni or FDR (Benjamini-Hochberg) |
| Multiple experiments (family-wise) | p < 0.01 | Bonferroni across 6 experiments |
| Effect size (cohen's d) | Small: 0.2, Medium: 0.5, Large: 0.8 | Report with all significant tests |
| Correlation (Pearson/Spearman) | Weak: 0.1, Moderate: 0.3, Strong: 0.5 | Report r + p |

### 3.2 Effect Size Requirements

A result is considered **meaningful** only if:
1. Statistically significant (p < threshold after correction)
2. Practically significant (effect size ≥ medium)
3. Replicable across random seeds / splits

**Minimum Effect Sizes:**
- Topic coherence difference: ΔNPMI > 0.05
- Network metric difference: Cohen's d > 0.5
- Classification: F1 improvement > 0.05 over baseline
- Temporal correlation: |r| > 0.2

### 3.3 Multiple Comparison Corrections

| Scenario | Method | Rationale |
|----------|--------|-----------|
| Comparing 50 topics across 2 platforms | FDR (α = 0.05) | Many tests, want to preserve power |
| Testing 6 experiments × 5 metrics | Bonferroni (α = 0.05/30 = 0.0017) | Family-wise error control |
| Feature importance (100+ features) | Permutation importance + FDR | Avoid false feature selection |
| Post-hoc exploration | Report as exploratory, no correction | Transparently label as hypothesis-generating |

### 3.4 Ablation Studies

For each experiment, report the following ablations:

| Experiment | Ablation | Purpose |
|------------|----------|---------|
| A (Topic) | Remove esoteric stopwords | Test if topics are robust to vocabulary filtering |
| A (Topic) | LDA instead of BERTopic | Baseline comparison |
| B (Network) | Remove top 1% hubs | Test robustness to super-posters |
| B (Network) | Randomize edges | Null model validation |
| C (Cross-Platform) | Remove cross-posters | Test if same users drive differences |
| D (Temporal) | Shuffle timestamps | Test if evolution is real |
| E (Expertise) | Network features only | Test linguistic vs social signal |
| E (Expertise) | Linguistic features only | Test if network features add value |
| F (Ritual) | POS only vs Lexical only | Feature importance |
| F (Ritual) | Rule-based (imperative count) | Simple baseline |

### 3.5 Artifact Detection Checklist

Before claiming any result is "real":

- [ ] **Data Leakage:** Does the test set contain information from the future? (critical for temporal/expertise)
- [ ] **Selection Bias:** Are the samples representative? (check subreddit coverage)
- [ ] **Platform Effects:** Could the result be explained by platform mechanics rather than community? (e.g., Reddit upvote system)
- [ ] **Temporal Confound:** Does the result hold across time periods?
- [ ] **Sample Size:** Is power > 0.80 for the reported effect size?
- [ ] **Replication:** Does the result hold with different random seeds / splits?
- [ ] **Multiple Comparisons:** Is p-value corrected for number of tests?
- [ ] **Effect Size:** Is the effect practically meaningful, not just significant?
- [ ] **Cherry-Picking:** Were hypotheses pre-registered, or selected post-hoc?
- [ ] **Base Rate:** Is the result better than a trivial baseline?

### 3.6 Pre-Registration

The following decisions are locked before data analysis:

1. **Hypotheses:** H₁ through H₆ as stated above
2. **Significance threshold:** p < 0.05 per test, FDR corrected within experiment
3. **Primary metrics:** NPMI (topics), Modularity (networks), KL-divergence (cross-platform), Changepoint BIC (temporal), F1 (expertise + ritual)
4. **Minimum sample sizes:** 5,000 Reddit posts, 500 WizardForums threads
5. **Excluded data:** Posts < 20 characters, non-English posts (langdetect < 0.9), deleted/removed posts
6. **Anonymization:** SHA-256 hashing with salt, no usernames in outputs

**Exploratory analyses** (not pre-registered) will be clearly labeled as hypothesis-generating.

---

## 4. Experiment Execution Order

```
Phase 1: Foundation (Week 1)
├── A1: Smoke test topic modeling on sample
├── B1: Smoke test network on sample
└── C1: Smoke test cross-platform comparison

Phase 2: Core Analysis (Week 2-3)
├── A2: Full topic modeling (BERTopic + baselines)
├── B2: Full network analysis + community detection
└── E1: Expertise feature extraction

Phase 3: Comparative & Temporal (Week 3-4)
├── C2: Full cross-platform comparison
├── D1: Temporal analysis (DTM or windowed BERTopic)
└── E2: Expertise classification

Phase 4: Specialized (Week 4-5)
├── F1: Ritual annotation (manual)
├── F2: Ritual classification
└── All: Ablation studies

Phase 5: Validation (Week 5-6)
├── All: Artifact detection checklist
├── All: Replication with different seeds
└── All: Cross-platform generalization tests
```

---

## 5. Deliverables Checklist

- [ ] `experiments/experiment_a/topics.json` — BERTopic model output
- [ ] `experiments/experiment_a/coherence_scores.csv` — Comparison table
- [ ] `experiments/experiment_b/network_reddit.gexf` — Reddit reply graph
- [ ] `experiments/experiment_b/network_wf.gexf` — WizardForums reply graph
- [ ] `experiments/experiment_b/communities.csv` — Community assignments
- [ ] `experiments/experiment_c/platform_comparison.csv` — Statistical tests
- [ ] `experiments/experiment_d/topic_timeseries.csv` — Monthly topic prevalences
- [ ] `experiments/experiment_d/changepoints.json` — Detected changepoints
- [ ] `experiments/experiment_e/classification_report.json` — Expertise detection results
- [ ] `experiments/experiment_e/shap_importance.png` — Feature importance plot
- [ ] `experiments/experiment_f/annotations.csv` — Manual ritual labels (500 posts)
- [ ] `experiments/experiment_f/classification_report.json` — Ritual detection results
- [ ] `experiments/artifact_checklist.md` — Completed checklist per experiment

---

## 6. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Insufficient WizardForums data | High | Combine all WF sub-forums, supplement with Internet Archive |
| Topic models produce garbage | Medium | Human evaluation mandatory, multiple algorithms |
| Networks too sparse | Medium | Include same-thread edges, lower thresholds |
| Low annotation agreement | Medium | Refine guidelines, use adjudication, report κ |
| Temporal bins too sparse | Low | Aggregate to quarterly, skip sparse months |
| Reddit API shutdown | Low | Use existing Pushshift dump if available |
| Computational limits | Low | Use subsampling for development, full data for final |

---

## 7. Ethics & Reproducibility

- **Pre-registration:** All hypotheses and analysis plans documented before data inspection
- **Open Code:** All analysis scripts committed to repository
- **Open Data:** Anonymized dataset released under CC-BY-NC
- **No PII:** No usernames, locations, or identifiable quotes in publications
- **Transparent Reporting:** All failures, null results, and ablations reported
- **Independent Validation:** Key results replicated by second analyst when possible

---

*Document Version: 1.0*  
*Next Review: After P1 data collection completion*  
*Experiment execution begins: P2 (Week 1)*
