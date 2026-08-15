# Prompt handoff: next WizardForums analysis cycle

You are the next research analyst on the Occult Corpus Research project. Work from the repository root and read these files first:

- `reports/literature_review_and_analysis_plan.md`
- `handoff/research_handoff.md`
- `docs/data_framework.md`
- `analysis/smoke_test.py`
- `analysis/initial_analysis.py`
- `analysis/post_analysis.py`
- `research/*.md`

## Mission

Analyze a successfully collected WizardForums v2.2 multipart archive as a dynamic online-community corpus. Produce an auditable, privacy-preserving initial analysis, post-level baseline, topic/resource/network analyses, and a critical-review revision cycle. Do not make claims about supernatural truth, ritual efficacy, dangerousness, mental health, criminality, or offline behavior.

## Step 0: Freeze provenance

Record archive manifest, SHA-256 checksums, file list, scraper/schema versions, extraction timestamp, Python/runtime versions, package lock information, code commit, and all analysis parameters. If the archive is multipart, extract all parts into one directory and merge split `.part-NNN` JSONL/CSV files in lexical order without duplicating metadata.

## Step 1: Run the smoke gate

Run:

```bash
python3 analysis/smoke_test.py path/to/archive.zip --json reports/smoke.json
```

Stop if ZIP integrity, required files, schema, timestamps, provenance, or referential checks fail. Stop post/topic analysis if `posts == 0`. If link/resource counts are unexpectedly zero while posts are nonzero, inspect scraper version and request diagnostics.

## Step 2: Produce the initial analysis

Run:

```bash
python3 analysis/initial_analysis.py path/to/archive.zip --out reports/initial.json
```

Add a Markdown report with forum/thread/post coverage, monthly activity, missingness, body lengths, status flags, quote/attachment/link/resource rates, top domains, and crawl errors. Include a sentence that all findings are conditional on the observed archive and do not estimate the offline occult population.

## Step 3: Produce the post baseline

Run:

```bash
python3 analysis/post_analysis.py path/to/archive.zip --out reports/post_baseline.json
```

Inspect token counts, vocabulary, body-length distribution, quote/attachment/link/resource features, and transparent lexicon hits. Treat lexicon hits as discovery features only. Do not publish raw usernames or searchable verbatim quotations.

## Step 4: Human annotation before modeling

Draw a stratified sample by forum, month, thread size, post length, and resource presence. Annotate content type, discourse mode, tradition reference, epistemic stance, resource-sharing behavior, and uncertainty. Use at least two annotators for primary labels. Report agreement and adjudication. Do not treat a model’s labels as ground truth for evaluating that model.

## Step 5: Topic analysis

Compare at least two transparent baselines and one embedding-based method if feasible. Record preprocessing, language policy, stopwords, minimum length, model, topic count, seed, and sample. Test stability across seeds, time slices, forums, and document-length filters. Name topics from representative documents and human review. Report unstable topics as exploratory.

## Step 6: Network/resource analysis

Build separate graphs for participation, quote/reply, thread similarity, hyperlinks, and resources. Preserve edge type. Compute degree, weighted degree, components, clustering, assortativity, and temporal change. Use null models for structural claims. Treat URLs as circulation or recommendation traces, not evidence of reading, downloading, endorsement, or practice.

## Step 7: Critical review loop

Create `reports/critical_review_round_1.md` with four reviewer perspectives:

1. Computational methods: sampling, parsing, preprocessing, model validity, reproducibility.
2. Domain scholarship: emic/etic distinctions, historical/esoteric categories, ritual and book interpretation.
3. Internet research ethics: privacy, identifiability, consent, vulnerable disclosures, quoting, retention, sharing.
4. Independent rerunner: can the analysis execute from the recorded artifacts and produce semantically consistent outputs?

For every concern, record evidence, decision (`adopted`, `partially adopted`, `unresolved`, or `rejected`), change made, affected outputs, and residual limitation. Rerun analyses after adopted changes.

## Step 8: Final claims

Separate claims into:

- **Supported:** directly descriptive and reproducible from the frozen archive.
- **Suggestive:** stable across some checks but dependent on modeling or sampling assumptions.
- **Exploratory:** pattern-generating observations requiring further validation.
- **Unsupported:** claims blocked by missing posts, inadequate coverage, weak annotation, or privacy constraints.

Conclude with limitations, not just findings. Recommend a new collection only when the current archive cannot answer the question and the new collection is authorized, rate-limited, and ethically reviewed.

## Output files

Create:

- `reports/archive_manifest.md`
- `reports/smoke.json`
- `reports/initial_analysis.md` and `.json`
- `reports/post_baseline.md` and `.json`
- `reports/topic_analysis.md`
- `reports/network_resource_analysis.md`
- `reports/critical_review_round_1.md`
- `reports/revision_decisions.md`
- `reports/limitations.md`
- `reports/reproducibility_manifest.json`

Do not delete raw data. Do not commit restricted archives or raw identifiable posts to a public repository. Commit only code, schemas, aggregate reports, de-identified derivatives, and documentation approved for sharing.
