# Data Understanding & Multi-Perspective Analysis Framework

## 1. Data Taxonomy

### Content Type Classification
| Type | Definition | Example |
|------|-----------|---------|
| **Question** | Seeks information or help | "How do I banish a spirit?" |
| **Tutorial** | Step-by-step instruction | "Here's how to cast a protection circle..." |
| **Experience Report** | First-person account | "Last night I contacted my guardian angel..." |
| **Debate** | Argumentative exchange | "Demons are external entities vs. psychological projections" |
| **Book/Resource** | Recommendation or sharing | "Read The Lesser Key of Solomon for goetia" |
| **Request** | Asks for materials or help | "Does anyone have a PDF of Agrippa?" |

### Discourse Mode Classification
| Mode | Markers | Example |
|------|---------|---------|
| **Instructional** | Imperatives, lists, "first/then/next" | "Light the candle. Draw the circle." |
| **Testimonial** | "I felt", "I saw", "it seemed" | "I felt a presence behind me" |
| **Skeptical** | "I doubt", "has anyone proven", "what if" | "What if magic is just placebo?" |
| **Devotional** | "praise", "thank", "honor" | "Thank you Hekate for guiding me" |
| **Syncretic** | Combining traditions | "I mix Wiccan circle casting with LBRP" |

### Knowledge Level Markers
| Level | Signals |
|-------|---------|
| **Novice** | Generic terms, many questions, "new to", "beginner" |
| **Intermediate** | Some jargon, references to known practices, "I've been practicing for X months" |
| **Expert** | Dense jargon, historical references, citations, correcting others, "in the tradition of..." |

### Entity Mention Taxonomy
- **Demonic**: demons, goetic spirits, fallen angels
- **Angelic**: archangels, angels, seraphim
- **Deity**: gods, goddesses, pantheon-specific names
- **Elemental**: spirits of earth, air, fire, water
- **Planetary**: Saturn, Jupiter, Mars, etc.
- **Ancestoral**: ancestors, lineage spirits
- **Abstract**: egregores, thought-forms, servitors

---

## 2. Smoke Test Protocol

### Step 1: Connectivity & Collection Test
```
[ ] Reddit API connection succeeds (OAuth handshake)
[ ] WizardForums homepage loads (200 OK)
[ ] Thread detail page parses correctly (extracts posts)
[ ] Rate limits respected (no 429 errors in first 10 requests)
[ ] Output files write successfully (JSONL format valid)
```
**Failure action:** Fix credentials, selectors, or output paths before proceeding.

### Step 2: Content Validation Test
```
[ ] Sample 100 posts — read 10 manually
[ ] Are they actually occult-related? (not spam, ads, off-topic)
[ ] Do they contain expected vocabulary? (magic, ritual, spirit, etc.)
[ ] Is anonymization working? (no raw usernames in output)
[ ] Are timestamps parseable? (consistent format)
```
**Failure action:** Refine filtering, check subreddit/forum selection, verify anonymization.

### Step 3: Quality Assessment Test
```
[ ] What % of posts are < 20 characters? (noise threshold)
[ ] What % are non-English? (langdetect check)
[ ] What % are deleted/removed? (missing content)
[ ] Duplicate rate? (near-duplicate detection)
[ ] Spam rate? (promotional content, bot posts)
```
**Failure action:** Adjust minimum length, add language filtering, deduplicate.

### Step 4: Representativeness Test
```
[ ] Temporal coverage: posts per month (check for gaps)
[ ] User diversity: unique authors / total posts ratio
[ ] Topic coverage: do major traditions appear? (Wicca, ceremonial, chaos, folk)
[ ] Platform balance: Reddit vs WizardForums ratio
```
**Failure action:** Expand subreddits/forums, extend time range, check for sampling bias.

### Step 5: Data Pipeline Stress Test
```
[ ] Can the pipeline handle 1000 posts without memory issues?
[ ] Does progress save/resume work? (kill mid-run, restart)
[ ] Are error logs informative? (traceable failures)
[ ] Is output reproducible? (same seed → same sample)
```
**Failure action:** Optimize memory usage, fix progress persistence, improve error handling.

---

## 3. Multi-Perspective Analysis Framework

### Perspective A: Developer Lens
**Question:** What can we actually build? What's the cost? What breaks?

| Checkpoint | Decision Gate |
|-----------|---------------|
| Data size < 10GB | Proceed with in-memory processing |
| Data size 10-100GB | Use streaming (Dask/Spark), sample for dev |
| Data size > 100GB | Need distributed infrastructure; reassess scope |
| Model training > 24h on GPU | Use smaller model or cloud compute |
| API rate limits block collection | Use Pushshift dump or extend timeline |

**Developer Escalation Rules:**
- If a method needs > 48h compute → simplify or use subset
- If a library is unmaintained → find alternative before committing
- If data quality is < 70% → stop and fix collection first
- If output is not reproducible → don't publish it

### Perspective B: Researcher Lens
**Question:** What claims can we support? What's the threat to validity?

| Threat | Mitigation |
|--------|-----------|
| Selection bias (English-only, Reddit-only) | Acknowledge limitation; compare with non-English when possible |
| Platform effects (upvotes shape visibility) | Analyze by new-queue, not hot-queue |
| Temporal confound (COVID changed everything) | Control for time period; compare pre/post |
| Self-selection (only certain practitioners post online) | Limit claims to "online practitioners" |
| Moderation bias (removed posts) | Note removal rate; analyze removed vs kept if accessible |
| Researcher bias (we're looking for patterns) | Pre-register hypotheses; report null results |

**Researcher Escalation Rules:**
- If p < 0.05 but effect size < 0.2 → report as "suggestive" not "significant"
- If result doesn't replicate across 3 random seeds → don't claim it
- If finding contradicts prior ethnographic work → investigate, don't dismiss
- If community members dispute interpretation → include their perspective

### Perspective C: Math/Logic Lens
**Question:** What formal structures govern this data?

| Property | Expectation | Test |
|----------|-------------|------|
| Degree distribution | Power-law (scale-free) | Fit powerlaw, log-normal, exponential; compare AIC |
| Clustering coefficient | Higher than random | Compare with configuration model |
| Small-world property | L ≈ L_random, C >> C_random | Check Watts-Strogatz criteria |
| Word frequency | Zipf's law | Log-log plot; check linearity |
| Post length | Log-normal or power-law | Fit distributions |
| Temporal pattern | Poisson process vs bursty | Check inter-event time distribution |
| Semantic similarity | Small-world in embedding space | Check average cosine similarity vs path length |

**Math Escalation Rules:**
- If data violates expected distribution → report the deviation (may be interesting)
- If network is not connected → analyze largest component separately
- If embedding space is degenerate → check for outliers, try different model
- If time series is non-stationary → difference or use cointegration methods

### Perspective D: Pattern-Matching / Synthesis Lens
**Question:** What unexpected connections emerge? What's the shape of this space?

| Pattern Type | Detection Method |
|-------------|------------------|
| Cross-tradition borrowing | Track entity mentions across tradition-specific subreddits |
| Conceptual metaphors | Metaphor detection (Lakoff-style): "energy flows", "vibrations rise" |
| Ritual homology | Structural similarity between rituals from different traditions |
| Temporal clustering | Do events (Mercury retrograde, eclipses) correlate with post volume? |
| Emotional contagion | Sentiment propagation through reply chains |
| Knowledge gatekeeping | Who gets answered? Who gets ignored? Network + content analysis |
| Syncretic pressure | Does mainstream exposure (Reddit) drive hybridization? |

**Pattern Escalation Rules:**
- If pattern is interesting but not statistically significant → label as "exploratory"
- If pattern contradicts expert reviews → investigate (might be novel finding)
- If pattern is too obvious → it's not a finding, it's validation
- If pattern is beautiful but unexplainable → don't force an explanation; report it

---

## 4. Iteration Loop Design

### Loop Structure
```
Developer builds pipeline →
  Researcher validates claims →
    Math checks distributions →
      Pattern-matcher finds connections →
        Developer builds new tool for pattern →
          ...repeat...
```

### Checkpoints (All perspectives must agree)

| Checkpoint | Developer | Researcher | Math | Pattern |
|-----------|-----------|------------|------|---------|
| **C1: Data ready** | Pipeline runs | Quality acceptable | Distributions sensible | Patterns detectable |
| **C2: Topics valid** | Model trains | Topics interpretable | Coherence significant | Topics match intuition |
| **C3: Network real** | Graph constructs | Edges meaningful | Metrics non-random | Communities make sense |
| **C4: Cross-platform** | Both platforms parsed | Comparable samples | Distributions similar | Differences are real |
| **C5: Temporal** | Time bins valid | No confounds | Stationarity checked | Events correlate |
| **C6: Expertise** | Features extractable | Ground truth valid | Class separable | Errors are informative |
| **C7: Ritual** | Annotators agree | Categories valid | POS patterns distinct | Rituals have structure |

### Escalation Rules for Conflicts

| Conflict | Resolution |
|----------|-----------|
| Developer says "too slow" vs Researcher says "need more data" → | Subsample for dev; full data for final |
| Math says "not significant" vs Pattern says "interesting" → | Report as exploratory; design follow-up |
| Researcher says "not valid" vs Pattern says "beautiful" → | Investigate threat to validity; if unresolved, don't claim |
| Developer says "impossible" vs Math says "theoretically possible" → | Simplify; find approximate solution |
| All agree but experts disagree → | Address expert concerns directly; revise if needed |

---

## 5. Annotation Protocol

### What Needs Annotation
1. **Ritual vs Non-Ritual** (Experiment F) — 500 posts, 2 annotators
2. **Topic Labels** (Experiment A) — 50 topics × 3 posts each = 150 posts, 3 annotators
3. **Expertise Level** (Experiment E) — 200 users, 2 annotators
4. **Content Type** (Data Taxonomy) — 200 posts, 2 annotators

### Annotator Guidelines
- **Recruitment:** Recruit 2-3 annotators with occult knowledge (practitioners or scholars)
- **Training:** 2-hour training session with examples and practice
- **Adjudication:** Third annotator resolves disagreements (κ < 0.7)
- **Compensation:** Paid at fair rate; acknowledge in paper

### Quality Metrics
- Cohen's κ > 0.70 for all annotation tasks
- If κ < 0.70 → refine guidelines, retrain, re-annotate
- Report κ for all annotated categories

---

## 6. Data Quality Dashboard

Real-time monitoring during collection:

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Posts/hour | > 50 | < 20 |
| Error rate | < 5% | > 10% |
| Duplicate rate | < 10% | > 20% |
| Non-English rate | < 15% | > 30% |
| Short post rate (< 20 chars) | < 10% | > 20% |
| Anonymization failures | 0% | > 0% |

---

*Framework Version: 1.0*  
*Applies to: P1 (Data Collection) through P3 (Analysis)*
