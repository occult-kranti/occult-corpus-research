# Research Hypotheses: Occult Corpus NLP Study

## Study Context
**Data Sources:** Reddit (r/occult, r/witchcraft, r/magick, r/LeftHandPath, r/chaosmagick, r/hermeticism, r/demonolatryPractices) + WizardForums.com
**Methodology:** NLP, network analysis, temporal modeling, cross-platform comparison
**Research Goal:** Understand how occult knowledge is constructed, transmitted, and validated in online communities

---

## Loop 1: Exploratory Hypotheses

### H1: Linguistic Register Stratification
**Hypothesis:** Occult communities exhibit distinct linguistic registers that correlate with tradition/paradigm (e.g., ceremonial magic vs. folk witchcraft vs. chaos magic), with ceremonial traditions using more Latinate/Greco-Roman terminology and formal register, while folk traditions use more embodied, sensory language.

**Rationale:** Different magical traditions draw from different historical linguistic reservoirs. Ceremonial magic inherits grimoire traditions with their formal, commanding syntax; folk witchcraft preserves oral traditions with tactile, domestic vocabulary.

---

### H2: Network Centrality and Knowledge Authority
**Hypothesis:** A small number of users ("elders" or "veterans") occupy disproportionately central positions in reply networks and are disproportionately cited/referenced by newcomers, creating implicit authority structures that mirror traditional occult lodge hierarchies.

**Rationale:** Online communities often replicate offline power structures. In occult communities, where lineage and experience are traditionally valued, we expect to see network centrality correlate with perceived expertise.

---

### H3: Temporal Cyclicality and Seasonal Patterns
**Hypothesis:** Discussion topics, emotional valence, and participation rates follow predictable seasonal cycles aligned with pagan/Wiccan liturgical calendar (Wheel of the Year), with spikes around Sabbats and esoteric calendar events (e.g., Halloween/Samhain, solstices).

**Rationale:** The Wheel of the Year is a central organizing framework for many occult practitioners. Even non-Wiccan practitioners often participate in these seasonal patterns due to cultural diffusion.

---

### H4: Platform-Dependent Fracture Lines
**Hypothesis:** Reddit communities (mainstream-accessible, pseudonymous, vote-driven) and WizardForums (specialized, membership-based, archival) will show systematic differences in: epistemic stance (Reddit more skeptical/agnostic, Forums more committed/experiential), discourse length (Forums longer, more detailed), and tolerance for fringe/chaos content (Forums higher).

**Rationale:** Platform affordances shape discourse. Reddit's voting system and mainstream visibility may exert normalization pressure, while specialized forums may preserve more heterodox content.

---

### H5: The Vocabulary of Experience vs. Belief
**Hypothesis:** Users employ systematically different linguistic patterns when describing personal experiences ("I felt," "I saw," "it seemed like") versus when asserting doctrinal claims ("spirits are," "magic works by," "the correct way is"), with experience-talk being more common in chaos/tradition-agnostic spaces and doctrine-talk in tradition-specific spaces.

**Rationale:** The occult community has long struggled with the epistemological status of its claims. The experience/doctrine distinction may be a key fault line in how knowledge is constructed.

---

### H6: Newcomer Trajectory and Linguistic Assimilation
**Hypothesis:** New users show predictable linguistic trajectories: initially using generic/spiritual-but-not-religious vocabulary, then assimilating into subcommunity-specific jargon over 3-6 months, with assimilation speed correlating with participation frequency and reply-network integration.

**Rationale:** All communities have linguistic socialization processes. Occult communities, with their dense jargon and tradition-specific terminology, should show particularly strong newcomer assimilation patterns.

---

### H7: Emotional Polarity in Entity Discussion
**Hypothesis:** Discussion of spiritual entities (angels, demons, deities, spirits) shows bimodal emotional distribution: either reverent/wonder-filled or fearful/anxious, with the specific valence predictable by entity type (demons → more fear; deities → more reverence; spirits → mixed) and user experience level (veterans more neutral, newcomers more emotional).

**Rationale:** Entity interaction is a core concern in occult practice. The emotional valence of these discussions may reveal implicit ontological commitments and psychological coping patterns.

---

### H8: Epistemic Pluralism and Validation Strategies
**Hypothesis:** Different sub-traditions employ different epistemic validation strategies: ceremonial magicians cite historical texts and "success rates," chaos magicians cite psychological utility and subjective results, Wiccans cite lineage and tradition, and folk practitioners cite ancestral knowledge and personal gnosis (UPG). These strategies are mutually recognized but hierarchically ranked within each community.

**Rationale:** The occult is epistemologically complex—claims are validated through text, experience, tradition, and utility simultaneously. Understanding these validation strategies is key to understanding the community's knowledge structure.

---

### H9: Ritual Transmission and Modification Patterns
**Hypothesis:** Ritual descriptions show systematic modification patterns: core rituals (LBRP, Middle Pillar, etc.) are transmitted with high fidelity in ceremonial communities but are more freely modified/adapted in chaos magic and folk witchcraft communities, with modification frequency correlating negatively with tradition age and text-centrality.

**Rationale:** Ritual is a core transmission medium in occult practice. The tension between fidelity and innovation may be a key marker of community type and epistemic orientation.

---

### H10: The Shadow Corpus — Suppressed Discourse
**Hypothesis:** There exists a "shadow corpus" of topics that are discussed in peripheral/sub-threads or rapidly deleted/removed: dangerous practices, mental health concerns, criminal activity, and extreme/fringe claims. The ratio of shadow to main-corpus discussion correlates with subreddit moderation strictness and community size.

**Rationale:** All communities have taboo topics. In occult communities, where practices can be psychologically risky and socially stigmatized, understanding what is suppressed may be as important as understanding what is celebrated.

---

## Loop 2: Refined Hypotheses

### H1.1: Ceremonial Register Specificity
**Sub-hypothesis:** The ceremonial magic subcorpus will show significantly higher type-token ratio in ritual vocabulary compared to folk witchcraft subcorpus, indicating more specialized/technical terminology.
- **Falsification:** If TTR is equal or lower in ceremonial subcorpus, the hypothesis fails.
- **Test:** Calculate TTR for ritual-context tokens in r/occult vs. r/witchcraft.

### H1.2: Command Syntax Prevalence
**Sub-hypothesis:** Imperative mood and second-person command syntax ("thou shalt," "let X be done") will be significantly more frequent in ceremonial magic texts than in chaos magic or folk texts.
- **Falsification:** No significant difference in imperative density across traditions.
- **Test:** POS-tag and count imperative constructions in tradition-segmented corpora.

### H1.3: Sensory Adjective Density
**Sub-hypothesis:** Folk witchcraft texts will show higher density of sensory adjectives (relating to smell, touch, temperature) compared to ceremonial texts, which will show higher density of visual/spatial metaphors.
- **Falsification:** No significant difference in sensory adjective distribution.
- **Test:** Extract and categorize sensory adjectives using WordNet hypernym lookup.

---

### H2.1: Degree Distribution Skew
**Sub-hypothesis:** Reply networks in occult subreddits follow a power-law degree distribution (scale-free), with a small number of users receiving >50% of all replies in advice-seeking threads.
- **Falsification:** Degree distribution is normal or exponential rather than power-law.
- **Test:** Fit degree distributions to power-law, exponential, and log-normal models; compare AIC/BIC.

### H2.2: Centrality-Expertise Correlation
**Sub-hypothesis:** Users with high betweenness centrality in advice-thread reply networks will use more tradition-specific jargon and receive more explicit gratitude/acknowledgment ("thank you, elder/wise one") than peripheral users.
- **Falsification:** High-centrality users do not differ linguistically from peripheral users.
- **Test:** Correlate betweenness centrality with jargon density and acknowledgment mentions.

### H2.3: Authority Challenge Patterns
**Sub-hypothesis:** Central users face predictable challenge patterns: newcomers challenge on grounds of personal experience ("but when I tried..."), while peer veterans challenge on grounds of textual/historical accuracy ("that's not what Agrippa says...").
- **Falsification:** No difference in challenge type by challenger status.
- **Test:** Classify reply types to central-user comments by challenger tenure.

---

### H3.1: Sabbat Spike Magnitude
**Sub-hypothesis:** Post volume increases by >30% in the 7 days preceding major Sabbats (Samhain, Beltane, Solstices) compared to baseline, with content shifting toward ritual-sharing and experience-reporting.
- **Falsification:** No significant volume spike or no content shift during Sabbat windows.
- **Test:** Time-series analysis with intervention detection around Sabbat dates.

### H3.2: Emotional Valence Cyclicality
**Sub-hypothesis:** Emotional valence of posts becomes more positive during "light" half of year (Beltane to Samhain) and more introspective/serious during "dark" half (Samhain to Beltane), measurable through sentiment analysis.
- **Falsification:** No cyclical sentiment pattern or reverse pattern.
- **Test:** Monthly sentiment aggregation with seasonal decomposition.

### H3.3: Retrograde Discussion Bursts
**Sub-hypothesis:** Mentions of Mercury retrograde and other astrological events show predictable spikes that correlate with actual astrological dates, even among practitioners who claim not to believe in astrology.
- **Falsification:** No correlation between astrological event dates and mention frequency.
- **Test:** Cross-reference mention time series with ephemeris data.

---

### H4.1: Skepticism Marker Density
**Sub-hypothesis:** Reddit posts contain significantly more hedging/epistemic markers ("I think," "maybe," "in my opinion," "take this with a grain of salt") per 1000 words than WizardForums posts on equivalent topics.
- **Falsification:** No difference in hedging density between platforms.
- **Test:** Extract and count hedging markers in matched-topic samples.

### H4.2: Detail and Length Distribution
**Sub-hypothesis:** WizardForums posts on ritual/technical topics are systematically longer (mean word count >2x) and contain more step-by-step procedural detail than equivalent Reddit posts.
- **Falsification:** No significant length difference or Reddit posts are longer.
- **Test:** Compare word count and procedural-step density in matched samples.

### H4.3: Chaos Content Tolerance
**Sub-hypothesis:** r/chaosmagick and WizardForums chaos sections contain more references to paradigm-shifting, belief-as-tool, and anti-dogmatic stances than tradition-specific subreddits, with Reddit chaos content showing more defensive/justifying language due to mainstream exposure.
- **Falsification:** No difference in anti-dogmatic stance density across platforms.
- **Test:** Classify posts by stance and compare density across subreddits/forums.

---

### H5.1: Experience-Talk Prevalence by Tradition
**Sub-hypothesis:** Chaos magic and folk witchcraft communities show >2x higher density of first-person experiential constructions ("I experienced," "I felt," "it seemed to me") compared to ceremonial and hermetic communities.
- **Falsification:** No significant difference in experiential construction density.
- **Test:** Extract first-person experiential constructions; compare across tradition-segmented corpora.

### H5.2: Doctrine-Talk and Authority Citation
**Sub-hypothesis:** Ceremonial and hermetic communities show higher density of authority citations (book titles, author names, historical references) per post compared to chaos/folk communities, which show higher density of personal testimony.
- **Falsification:** No difference in citation density across traditions.
- **Test:** Extract named entities (books, authors, historical figures); compare densities.

### H5.3: Epistemic Stance Shifts
**Sub-hypothesis:** Individual users shift between experience-talk and doctrine-talk based on thread context: more experiential in "what happened to me" threads, more doctrinal in "how do I" threads, with veterans showing more stable stance and newcomers more context-dependent shifts.
- **Falsification:** No correlation between thread type and epistemic stance.
- **Test:** Classify threads by type; model epistemic stance as function of thread type × user tenure.

---

### H6.1: Jargon Acquisition Curve
**Sub-hypothesis:** New users' posts show a logistic growth curve in subcommunity-specific jargon usage, with rapid acquisition in weeks 2-8 and plateau thereafter, following a predictable sequence: generic spiritual → Wiccan/generic occult → tradition-specific terminology.
- **Falsification:** No predictable jargon acquisition pattern or random sequence.
- **Test:** Track jargon usage longitudinally for users with known join dates; fit logistic curves.

### H6.2: Network Integration Speed
**Sub-hypothesis:** Users who achieve reply-network integration (receiving >5 replies to their posts) within their first month show significantly faster jargon acquisition than users who remain peripheral, controlling for post frequency.
- **Falsification:** Network integration does not predict jargon acquisition speed.
- **Test:** Regression: jargon density ~ network integration × time + controls.

### H6.3: Failed Assimilation Markers
**Sub-hypothesis:** Users who fail to assimilate (defined as: low jargon use after 6 months, high downvote ratio, frequent correction by others) show distinctive linguistic markers: excessive generic New Age vocabulary, aggressive self-promotion, or persistent resistance to community norms.
- **Falsification:** Failed assimilation users are linguistically indistinguishable from successful newcomers.
- **Test:** Compare linguistic profiles of "successful" vs. "failed" assimilation cohorts.

---

### H7.1: Entity Emotion Lexicon
**Sub-hypothesis:** Demons/demon-related posts show higher density of fear/anxiety markers; deity posts show higher density of reverence/gratitude markers; spirit/ghost posts show mixed/ambiguous emotional markers; angel posts show protective/gratitude markers.
- **Falsification:** No correlation between entity type and emotional valence.
- **Test:** Classify posts by entity type; extract and categorize emotional markers.

### H7.2: Veteran Emotional Neutrality
**Sub-hypothesis:** Users with >2 years tenure and high centrality show significantly lower emotional intensity (measured by affect lexicon density) when discussing all entity types compared to newcomers (<6 months), suggesting "normalization" through repeated exposure.
- **Falsification:** No tenure-emotion correlation or reverse correlation.
- **Test:** Regression: emotional intensity ~ tenure × entity type + controls.

### H7.3: Entity Discussion and Mental Health Co-occurrence
**Sub-hypothesis:** Posts discussing negative/demonic entities show higher co-occurrence with mental health vocabulary (anxiety, depression, fear, sleep disturbance) compared to posts discussing positive/angelic entities, particularly in newcomer posts.
- **Falsification:** No correlation between entity valence and mental health vocabulary.
- **Test:** Extract mental health markers; model co-occurrence with entity types.

---

### H8.1: Text-Centrality in Ceremonial Communities
**Sub-hypothesis:** r/hermeticism and ceremonial-adjacent communities show highest density of text citations (grimoires, Agrippa, Crowley, etc.) as validation strategy, with citation density correlating positively with post upvotes.
- **Falsification:** No correlation between text citation and community type or upvotes.
- **Test:** Extract citations; model citation density ~ community type + upvote count.

### H8.2: Utility/Pragmatism in Chaos Communities
**Sub-hypothesis:** r/chaosmagick shows highest density of utility/pragmatic validation ("it worked for me," "the results speak for themselves," "if it works, it works") with lowest density of historical/traditional citations.
- **Falsification:** Chaos communities cite texts as frequently as ceremonial communities.
- **Test:** Compare validation strategy densities across subreddits.

### H8.3: UPG Contestation Patterns
**Sub-hypothesis:** Claims of personal gnosis (UPG — "unverified personal gnosis") face systematic contestation: ceremonial communities challenge on textual/historical grounds, Wiccan communities on lineage/tradition grounds, and chaos communities on pragmatic/result grounds.
- **Falsification:** No difference in contestation type by community.
- **Test:** Identify UPG claims; classify contestation replies; model by community type.

---

### H9.1: Core Ritual Fidelity
**Sub-hypothesis:** Descriptions of core ceremonial rituals (LBRP, Middle Pillar, Bornless Ritual) in ceremonial communities show >80% structural fidelity (same steps, same order, same tools) compared to source texts, while chaos magic adaptations show <50% fidelity.
- **Falsification:** No difference in ritual fidelity across communities.
- **Test:** Extract ritual descriptions; compare to canonical texts using structural similarity metrics.

### H9.2: Innovation Justification Patterns
**Sub-hypothesis:** Ritual modifications are systematically justified: chaos modifications justified by pragmatism/paradigm flexibility; folk modifications by intuition/ancestral guidance; ceremonial modifications by scholarly textual analysis.
- **Falsification:** No pattern in modification justification or random distribution.
- **Test:** Identify modified rituals; classify justification types; model by community.

### H9.3: Ritual Transmission Chain Length
**Sub-hypothesis:** Core rituals in ceremonial communities show longer attribution chains ("as taught by X, who learned from Y, who studied with Z") compared to folk/chaos rituals, which show shorter or absent chains.
- **Falsification:** No difference in attribution chain length across traditions.
- **Test:** Extract attribution chains from ritual descriptions; compare lengths.

---

### H10.1: Shadow Topic Detection
**Sub-hypothesis:** A distinct cluster of topics (psychosis, self-harm, dangerous practices, criminal activity) appears in removed/deleted posts at >5x baseline rate compared to surviving posts, detectable through moderation log analysis or removeddit recovery.
- **Falsification:** Removed posts show no topical distinctiveness from surviving posts.
- **Test:** Compare topic distributions of removed vs. surviving posts.

### H10.2: Shadow Corpus Size
**Sub-hypothesis:** The shadow corpus comprises 5-15% of total posting activity, with larger communities (r/occult) having higher absolute shadow volume but lower proportional shadow rate than smaller communities (r/demonolatryPractices).
- **Falsification:** Shadow corpus is negligible (<1%) or uniformly distributed.
- **Test:** Estimate removed post volume; compare across subreddits by size.

### H10.3: Shadow Discussion Migration
**Sub-hypothesis:** When shadow topics are suppressed in main communities, discussion migrates to: (a) private messages, (b) smaller/less-moderated communities, (c) off-platform spaces (Discord, WizardForums), detectable through cross-reference of usernames and topic patterns.
- **Falsification:** No evidence of migration; suppressed topics simply disappear.
- **Test:** Track users involved in removed posts; analyze their activity in other spaces.

---

## Novelty Assessment

| Hypothesis | Novelty | Testability | Existing Work |
|-----------|---------|-------------|---------------|
| H1: Linguistic Register Stratification | 3 | 5 | Builds on: Biber's register analysis, Swales' genre analysis. Contradicts: assumption that online occult discourse is homogeneous. Novel contribution: systematic register mapping across occult traditions. |
| H2: Network Centrality and Authority | 2 | 5 | Builds on: Authority structures in online communities (Welser et al.), network analysis of Reddit. Contradicts: ideal of occult communities as egalitarian. Novel contribution: mapping offline hierarchy to online network structure. |
| H3: Temporal Cyclicality | 3 | 5 | Builds on: Seasonal patterns in religious practice (Bell), internet activity cycles. Contradicts: assumption that online practice is de-ritualized. Novel contribution: linking pagan liturgical calendar to digital behavior. |
| H4: Platform-Dependent Fracture | 4 | 4 | Builds on: Platform affordances literature (van Dijck, boyd). Contradicts: assumption that platform differences are superficial. Novel contribution: systematic cross-platform comparison of epistemic stance. |
| H5: Experience vs. Belief Language | 4 | 4 | Builds on: Epistemic stance in religious discourse (Ochs, Du Bois). Contradicts: binary believer/non-believer frameworks. Novel contribution: fine-grained epistemic stance taxonomy for occult discourse. |
| H6: Newcomer Trajectory | 3 | 5 | Builds on: Community of practice socialization (Lave & Wenger), linguistic accommodation. Contradicts: assumption that occult knowledge is acquired through texts alone. Novel contribution: longitudinal linguistic assimilation in esoteric community. |
| H7: Emotional Polarity in Entity Discussion | 4 | 4 | Builds on: Affective analysis of religious texts, entity cognition (Barrett). Contradicts: assumption that occult practitioners are uniformly positive about all entities. Novel contribution: emotion-entity mapping in practitioner discourse. |
| H8: Epistemic Pluralism | 5 | 3 | Builds on: Epistemic cultures (Knorr-Cetina), religious epistemology. Contradicts: monolithic views of occult epistemology. Novel contribution: systematic taxonomy of validation strategies across traditions. |
| H9: Ritual Transmission Patterns | 4 | 4 | Builds on: Ritual studies (Bell, Grimes), memetics. Contradicts: assumption that oral transmission is fidelity-poor and textual transmission fidelity-rich. Novel contribution: quantitative ritual fidelity analysis. |
| H10: Shadow Corpus | 5 | 2 | Builds on: Censorship and content moderation research (Roberts), dark web studies. Contradicts: assumption that studying visible content is sufficient. Novel contribution: shadow corpus methodology for occult communities. |

**Novelty Scale:** 1=obvious/widely assumed, 5=groundbreaking/paradigm-shifting
**Testability Scale:** 1=impossible with available data, 5=straightforward with current methods

---

## Summary and Prioritization

### High-Impact, High-Feasibility (Do First)
- **H1** (Linguistic Register): Strong testability, clear methodology, novel contribution
- **H3** (Temporal Cyclicality): Strong testability, seasonal data readily available
- **H6** (Newcomer Trajectory): Strong testability, longitudinal data available
- **H8** (Epistemic Pluralism): High novelty, feasible with current NLP methods

### High-Impact, Moderate Feasibility (Do Second)
- **H4** (Platform Fracture): Requires cross-platform data access
- **H5** (Experience vs. Belief): Requires fine-grained epistemic stance annotation
- **H7** (Entity Emotion): Requires entity extraction + affect analysis pipeline
- **H9** (Ritual Transmission): Requires ritual extraction and canonical comparison

### High-Impact, Lower Feasibility (Do Third/Stretch)
- **H2** (Network Authority): Requires full reply graph construction
- **H10** (Shadow Corpus): Requires access to removed content (mod logs, removeddit)

---

## Falsification Summary

| Hypothesis | Key Falsification Condition |
|-----------|----------------------------|
| H1 | No register differences across traditions; all occult discourse is linguistically homogeneous |
| H2 | Network is egalitarian (normal degree distribution); no correlation between centrality and expertise markers |
| H3 | No seasonal patterns; occult online activity is temporally flat |
| H4 | No platform differences; Reddit and WizardForums are discursively identical |
| H5 | No experience/doctrine distinction; all claims are made with equal epistemic force |
| H6 | No newcomer assimilation; users maintain initial linguistic patterns indefinitely |
| H7 | No emotion-entity correlation; all entities discussed with uniform emotional valence |
| H8 | Single epistemic strategy; all traditions validate knowledge identically |
| H9 | No fidelity differences; all rituals are transmitted with equal modification rates |
| H10 | No shadow corpus; removed posts are topically identical to surviving posts |

---

*Document generated for occult corpus NLP research project.*
*Last updated: 2026-08-13*
