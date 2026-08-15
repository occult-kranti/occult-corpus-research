# Computational Analysis of WizardForums and Online Occult/Fringe Discourse

## Executive summary

This report proposes a defensible research program for studying WizardForums as a dynamic online community and as a source of contemporary esoteric discourse. It combines computational social science, digital humanities, web philology, reproducible computational research, and ethics of Internet research. The central recommendation is to treat the corpus as a **situated, access-limited set of digital witnesses**, not as a neutral census of occult belief or practice.

The project should proceed in stages. First, validate the archive and record provenance. Second, run a descriptive initial analysis without fitting a topic model or making claims about users. Third, run a post-level analysis using transparent lexical, interaction, temporal, topic, and resource measures. Fourth, conduct a structured critical review that challenges sampling, measurement, model stability, privacy, and interpretation. Fifth, revise the analysis plan and only then produce substantive claims.

The term **ARR** requires a terminology distinction. In the literature and guidance reviewed here, ARR most directly refers to **ACL Rolling Review**, whose reviewer guidance emphasizes specific assessment, ethics, reproducibility, initial impressions before related-work search, and updating assessments after discussion. ACM’s related framework is **Artifact Review and Badging**, which distinguishes repeatability, reproducibility, and replicability and asks whether artifacts are documented, consistent, complete, exercisable, and validated [1] [2].

> The project should claim only what the observed corpus and validated methods support: patterns of discourse and interaction within an archived WizardForums sample, not the prevalence, truth, efficacy, danger, or offline consequences of magical beliefs or rituals.

## 1. Scope and research questions

The corpus should include publicly visible or normally authenticated content that the researcher is authorized to access, collected through the rate-limited WizardForums extension while respecting the site’s access controls, robots policy, and applicable institutional requirements. The archive should retain forum, thread, post, reply/quote, attachment, link, resource, timestamp, and crawl-provenance metadata. The content of rituals and books is studied as discourse, textual transmission, recommendation, identity work, and community practice—not as evidence that supernatural claims are true or false.

| Research question | Data needed | Primary method | Claim boundary |
|---|---|---|---|
| RQ1. What themes and discourse modes recur across forums and time? | Post text, forum, thread, timestamps | Descriptive lexical analysis, human-coded sample, topic model | Describes corpus language; does not estimate population prevalence |
| RQ2. How do users exchange knowledge and resources? | Authors, replies/quotes, links, resources, thread structure | Interaction and hyperlink networks; resource inventory | Measures observed platform relations, not offline influence |
| RQ3. How do instructional, testimonial, skeptical, devotional, and syncretic modes co-occur? | Post text and annotations | Mixed-method coding plus supervised/exploratory classification | Requires annotation and error analysis |
| RQ4. How are books, PDFs, grimoires, and external resources circulated? | `links.jsonl`, `resources.jsonl`, post context | Resource classification, domain analysis, provenance tracing | A link or recommendation is not proof of reading or use |
| RQ5. How stable are topics and networks across time, forum, and sampling choices? | Full archive plus timestamps | Bootstrap/subsample stability, temporal comparisons, sensitivity analysis | Stability is a condition for stronger claims, not proof of causality |
| RQ6. What ethical and methodological risks arise from studying a fringe/occult community? | Metadata, risk register, stakeholder review | AoIR-style contextual ethics and critical review | Risks must be reported and mitigated, not hidden |

## 2. Literature synthesis

### 2.1 Review and artifact standards

ACL Rolling Review guidance is useful as a model for the project’s internal review workflow, even though it is not an ACM publication rule. It recommends specific, professional, neutral assessments and an explicit update after author response and discussion. It also warns against disclosing confidential review information and notes that anonymized review data should be shared only with consent [1]. The transferable principle is procedural: establish an initial impression and plan before results-driven searching, document disagreements, and revisit judgments after critique.

ACM’s artifact policy provides the project’s reproducibility vocabulary. **Repeatability** means the same team can obtain the measurement again with the same setup. **Reproducibility** means a different team can obtain the same result using the authors’ artifacts and the same setup. **Replicability** means a different team obtains the result with an independently developed setup and artifacts [2]. For this project, a frozen fixture smoke test can support repeatability; a documented analysis against an access-controlled or synthetic fixture can support limited reproducibility; independent recrawling and reanalysis can test replicability. Dynamic, private, or deleted forum content prevents a simple claim of exact public-data reproducibility.

### 2.2 Computational reproducibility

Piccolo and Frampton argue that reproducibility requires more than code. Researchers should record operating systems, dependency versions, software versions, parameters, preprocessing, execution order, and data provenance; narrative documentation remains necessary even when code is automated [3]. The WizardForums handoff therefore requires a schema version, crawl manifest, scraper version, archive checksums, extraction date, robots snapshot, request diagnostics, analysis parameters, random seeds, and a changelog.

The same principle applies to model selection. Topic models, embeddings, classifiers, and network measures should be treated as parameterized experiments. Every run should record the sample, text normalization, language filter, stopword list, model version, number of topics or embedding model, random seed, minimum document length, and exclusion rules. A result that cannot be reconstructed from a manifest should be treated as exploratory.

### 2.3 Online-community mining and mixed methods

Rueger, Dolfsma, and Aalbers present a workflow that mines an online community and combines social-network analysis with text/sentiment analysis to study both relationships and content [4]. This is a useful template, but sentiment should not be treated as a universal proxy for emotion in occult discourse. Ritual language, quotation, irony, devotional praise, warnings, fictional narration, and technical instructions can all confuse generic sentiment models. The project should prioritize descriptive text features, human-coded discourse modes, and validation on a domain-specific sample before using sentiment as an exploratory feature.

Network analysis should use multiple edge definitions rather than one undifferentiated “social network.” Candidate layers include author-to-thread participation, author-to-author quotation/reply edges, post-to-post quote-source edges, and post-to-resource hyperlink edges. Each layer answers a different question. Combining them without preserving edge type would create an analytically misleading hairball.

### 2.4 Internet research ethics and web scraping

The Association of Internet Researchers treats ethics guidance as a starting point for contextual deliberation, not a universal checklist [5]. Relevant factors include the context in which participants shared material, expectations of privacy, vulnerability, identifiability, likely harms, researcher safety, consent feasibility, data minimization, quotation risk, and the effects of publication.

Brown and colleagues distinguish traditional HTML scraping, undocumented API use, and browser-plugin collection, noting that each has distinct legal, ethical, institutional, and scientific implications [6]. This project uses authenticated, session-based browser collection. That means the data are access-limited and context-dependent; the method should not be described as an unrestricted public crawl. The project should document the access basis, collection purpose, robots and content-signal observations, retention period, storage controls, sharing restrictions, and institutional review decision.

The recommended privacy posture is to keep raw usernames and raw post text in a restricted working archive, create hashed or pseudonymous author IDs for analysis, avoid publishing searchable verbatim quotations, suppress low-frequency identifiers and sensitive URLs when necessary, and provide derived aggregate statistics or synthetic examples in public artifacts. A legal review is not replaced by this methodological report.

### 2.5 Web philology and occult/esoteric primary sources

Plaisance’s study of contemporary esoteric digital sources argues that critical analysis of electronic witnesses requires adapting textual scholarship to digital forensics, computer metadata, and web archives [7]. This is especially important for WizardForums because threads can be edited, deleted, merged, paginated, quoted, linked, and recontextualized over time. A post is not simply “the text”; it is a dated digital witness with a page position, URL, author presentation, quote context, edit state, and resource provenance.

The project’s occult corpus should distinguish **emic** language, meaning how participants describe their own traditions and experiences, from **etic** analytic categories imposed by the researcher. “Ritual,” “magic,” “spirit,” “initiation,” “book,” and “tradition” should not be treated as self-evident classes. Annotation should preserve uncertainty, allow multiple labels, and distinguish historical references, recommendation, personal testimony, fictional or role-play content, skepticism, and procedural instruction.

## 3. Data model and archive contract

The current organized archives provide typed JSONL and CSV datasets. The intended analysis contract is as follows.

| Dataset | Role in analysis |
|---|---|
| `data/forums.jsonl` | Forum identity, hierarchy, descriptions, counts, and provenance |
| `data/threads.jsonl` | Thread title, author, status, counts, forum relation, and provenance |
| `data/posts.jsonl` | Post/reply text, HTML, quotes, attachments, reactions, edits, deletion/ignore state, timestamps, and source context |
| `data/links.jsonl` | Internal/external hyperlinks with source page, thread, post, visible text, and URL metadata |
| `data/resources.jsonl` | PDFs, ebooks/books, documents, archives, downloads, and attachment-like resources |
| `data/pages.jsonl` | Page-level coverage and link totals |
| `data/all.ndjson` | Combined record stream for generic ingestion |
| `metadata/*.jsonl/json` | Crawl provenance, request diagnostics, robots/content-signal snapshot, errors, and schema |
| `index/*.csv` | Flat analysis tables for pandas, spreadsheets, SQL, and graph construction |

Every analysis must report the archive ID, extraction date, scraper version, schema version, and the exact files used. The successful full-board crawl reported by the user contained 340 threads, 4,382 posts, and 442 pages, but the local files currently available for validation are earlier incomplete archives with zero posts. Therefore, the post analyses below are implemented and ready, but substantive post-level findings remain pending a successful v2.2 multi-part archive.

## 4. Smoke-test protocol

The smoke test is a hard gate before modeling. It verifies ZIP integrity, required files, JSONL parsing, CSV headers, duplicate IDs, timestamps, source URL provenance, post-to-thread references, link/resource URLs, and whether post analysis is possible. It deliberately does not print raw bodies or usernames.

| Gate | Test | Pass criterion | Failure action |
|---|---|---|---|
| Archive integrity | ZIP CRC and required paths | No CRC failure; required metadata and typed files exist | Re-export or repair archive |
| Schema | JSONL parse and expected fields | Every record parses; IDs/provenance fields are present | Fix exporter or schema adapter |
| Coverage | Forums, threads, posts, pages, links, resources | Counts are nonzero where the selected scope requires them | Inspect crawl diagnostics and queue state |
| Referential integrity | Post `thread_id`, source URLs, resource context | References resolve to observed thread/page IDs where expected | Flag partial crawl or parser issue |
| Temporal validity | ISO timestamps and month coverage | Parseable times; no impossible date range | Correct parser/timezone handling |
| Duplication | ID and URL duplicate checks | Duplicates explained or removed | Revisit pagination/dedup keys |
| Privacy | Raw identifiers and sensitive content review | Restricted raw layer; public derived layer minimized | Stop publication and revise access controls |
| Analysis readiness | Non-empty body text and adequate sample size | At least 100 non-empty posts for a smoke topic model; larger samples for final claims | Report blocked status |

The command is:

```bash
python3 analysis/smoke_test.py path/to/archive.zip --json reports/smoke.json
```

The three local archives were smoke-tested. Two contained 28 forums and 107 or 211 threads but zero posts; one contained zero records because an invalid scope was used. These are valid diagnostic outputs but are not suitable for post/topic conclusions.

## 5. Initial analysis

The initial analysis is descriptive and should precede any inferential or interpretive model. It should report forum and thread coverage, post counts by forum, monthly activity, body-length distributions, resource types, external-link domains, deleted/ignored/edited fractions, quote and attachment rates, and crawl errors. It should include a coverage table and a missingness table.

```bash
python3 analysis/initial_analysis.py path/to/archive.zip --out reports/initial.json
```

The first interpretive questions are: Which forums are represented? Which threads and months are absent? Does the archive overrepresent highly active forums? Are resource links concentrated in a few domains? Are posts sufficiently long and numerous for topic analysis? The initial report should not call the most frequent terms “the community’s beliefs.” It should call them frequent terms in the observed archive.

## 6. Post-level analysis

The post analysis begins with auditable baselines. It computes token counts, vocabulary size, body lengths, quote and attachment counts, link counts, resource counts, and transparent lexicon hits for ritual/practice, tradition terms, epistemic discussion, and resource requests. These lexicons are discovery tools, not validated classifications.

```bash
python3 analysis/post_analysis.py path/to/archive.zip --out reports/post_analysis.json
```

The next stage is a human-coded sample. Sample across forum, month, thread activity, and post length rather than taking only the most active threads. Annotate content type (question, tutorial, experience report, debate, book/resource, request), discourse mode (instructional, testimonial, skeptical, devotional, syncretic), and uncertainty. Use at least two annotators for core labels, report agreement, adjudicate disagreements, and preserve ambiguous cases.

Only after annotation should the project compare LDA, NMF, and embedding-based topic discovery. Topic stability should be tested across seeds, time slices, forum strata, and reasonable preprocessing choices. Topic labels should be written by inspecting representative documents, not generated from top words alone. Report topic prevalence with uncertainty and distinguish document frequency from token frequency.

## 7. Network and resource analyses

The recommended network layers are:

| Layer | Nodes | Edge | Interpretation |
|---|---|---|---|
| Participation | Author, thread | Author participated in thread | Engagement structure |
| Quote/reply | Author/post | Author quoted or replied to another post | Observed conversational relation |
| Thread similarity | Thread | Shared terms or embeddings | Thematic similarity, not social tie |
| Hyperlink | Post/thread, URL/domain | Content points to resource | Resource circulation |
| Tradition/resource | Tradition label, book/resource | Co-occurrence or recommendation | Cultural association, subject to annotation error |

Report degree, weighted degree, connected components, clustering, assortativity, and temporal change separately for each layer. Compare observed networks against degree-preserving randomizations where appropriate. Do not describe high degree as authority without an operational definition and validation.

For books and PDFs, build a resource table with normalized URL, domain, file extension, visible label, source post, thread, forum, link count, first/last observed timestamp, and access status. Treat a URL as a recommendation or circulation trace, not proof of download, reading, possession, or ritual use. Where possible, resolve bibliographic entities separately from URLs and retain both raw and normalized forms.

## 8. Critical-review loop

The project should use the following loop after every substantive analysis.

1. **Freeze the input.** Record archive ID, files, hashes, schema version, code commit, parameters, and seed.
2. **Run the smoke test.** If coverage or privacy gates fail, stop analysis.
3. **Produce the initial result.** Use descriptive tables and plots; do not overinterpret.
4. **Invite critical review.** Ask a methods reviewer to challenge sampling, a domain reviewer to challenge occult/esoteric categories, a privacy reviewer to challenge identifiability and harm, and a technical reviewer to rerun the code.
5. **Log objections.** Classify each objection as accepted, partially accepted, unresolved, or rejected with evidence.
6. **Adopt changes.** Revise code, labels, models, or claims; rerun affected analyses.
7. **Run sensitivity analysis.** Compare alternative filters, strata, seeds, topic counts, network definitions, and exclusion rules.
8. **Publish only stable claims.** Mark unstable or unvalidated patterns as exploratory.

| Review question | If concern is valid | Adopted response |
|---|---|---|
| Are posts representative of practitioners? | No | Limit claims to the observed online corpus and report selection bias |
| Are usernames identifiable? | Yes | Hash or suppress identifiers; restrict raw layer; avoid searchable quotes |
| Are topic labels stable? | No | Report sensitivity ranges or use qualitative themes instead |
| Are “ritual” labels reliable? | Low agreement | Refine codebook, add uncertainty, or remove label from claims |
| Do links indicate use? | No | Call them circulation/recommendation traces only |
| Are deleted/ignored posts missing systematically? | Unknown | Report missingness and avoid prevalence claims |
| Do network edges mean influence? | No | Use “observed interaction” and test alternative edge definitions |
| Does a result replicate across time/forums? | No | Mark exploratory and avoid generalization |

## 9. Limitations and risk register

The main limitations are selection bias, access bias, survivorship bias from edits/deletions, platform-specific affordances, unknown lurkers, changing moderation, nonstationary topic vocabulary, misclassification of ritual and esoteric terms, privacy risks, and the inability to infer offline behavior. WizardForums is not the occult world; it is one community with a particular history, moderation regime, audience, and technical platform.

The content may include copyrighted books or PDFs, personal disclosures, health claims, dangerous instructions, or material that creates risk if reidentified. The public research layer should therefore contain aggregates, hashed identifiers, redacted examples, and derived features where possible. Raw data should be access-controlled, encrypted, retention-limited, and shared only under an approved protocol.

No model in this project should diagnose mental health, classify people as dangerous, determine whether magic works, infer criminality, or identify individuals. Any safety-relevant content should be studied at the level of discourse and risk communication, with expert review and no operational amplification.

## 10. Decision gates for next steps

| Gate | Proceed when | Do not proceed when |
|---|---|---|
| G1. Successful archive | Multi-part v2.2 archive passes smoke test and has posts | ZIP has zero posts or unresolved integrity errors |
| G2. Human coding | Agreement is acceptable or uncertainty is modeled | Categories are imposed without annotation validation |
| G3. Topic model | Topics are stable across seeds and interpretable by coders | Topics change radically with minor parameters |
| G4. Network model | Edges have explicit meanings and sensitivity checks | A single hairball is used as evidence of influence |
| G5. Resource analysis | URLs are normalized and provenance is retained | Links are treated as proof of use or endorsement |
| G6. Publication | Privacy and legal/IRB review are satisfied | Raw searchable content or identifying examples remain |

## References

[1] ACL Rolling Review. “ARR Reviewer Guidelines.” https://aclrollingreview.org/reviewerguidelines

[2] Association for Computing Machinery. “Artifact Review and Badging — Current.” https://www.acm.org/publications/policies/artifact-review-and-badging-current

[3] Stephen R. Piccolo and Michael B. Frampton. “Tools and techniques for computational reproducibility.” *GigaScience*, 5, 30, 2016. https://doi.org/10.1186/s13742-016-0135-4

[4] Jasmina Rueger, Wilfred Dolfsma, and Rick Aalbers. “Mining and analysing online social networks: Studying the dynamics of digital peer support.” *MethodsX*, 10, 102005, 2023. https://doi.org/10.1016/j.mex.2023.102005

[5] Association of Internet Researchers. “Internet Research: Ethical Guidelines 3.0.” https://aoir.org/reports/ethics3.pdf

[6] Megan A. Brown et al. “Web scraping for research: Legal, ethical, institutional, and scientific considerations.” *Big Data & Society*, 2025. https://doi.org/10.1177/20539517251381686

[7] Christopher Plaisance. “Methods of Web Philology: Computer Metadata and Web Archiving in the Primary Source Documents of Contemporary Esotericism.” *International Journal for the Study of New Religions*, 7(1), 43–68, 2016. https://doi.org/10.1558/ijsnr.v7i1.26074

[8] J. Abello, P. Broadwell, and T. R. Tangherlini. “Computational folkloristics.” *Communications of the ACM*, 55(7), 2012. https://doi.org/10.1145/2209249.2209267

[9] D. Rieger et al. “Assessing the extent and types of hate speech in fringe communities.” *Social Media + Society*, 7(4), 2021. Project literature note; verify final bibliographic metadata before manuscript submission.
