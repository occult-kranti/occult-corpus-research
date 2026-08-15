# WizardForums Occult Corpus Research Handoff

## Handoff status

This handoff transfers the project from scraper construction to evidence-controlled analysis. The current repository contains the v2.2 scraper, a smoke-test script, initial descriptive analysis, post-level baseline analysis, literature findings, and an analysis protocol. The three locally available WizardForums ZIPs are diagnostic archives with zero posts. The next analyst must supply or generate a successful v2.2 multi-part archive before making post-level or topic claims.

## Research posture

Treat WizardForums as one dynamic, access-limited online community. The corpus is a set of digital witnesses shaped by platform design, moderation, search visibility, user self-selection, edits, deletions, and the researcher’s crawl scope. Do not generalize from the forum to occult practitioners, magical traditions, or society at large without independent evidence.

Study ritual instructions, magical claims, grimoires, books, PDFs, and resource recommendations as discourse and cultural transmission. Do not assess supernatural efficacy, diagnose participants, infer dangerousness, or expose personal identities. Keep raw data restricted and make public outputs aggregated, de-identified, and non-searchable where needed.

## Current evidence state

| Artifact | Status | Consequence |
|---|---|---|
| `wf-2026-08-15T21-05-58.zip` | Valid structure; 28 forums, 107 threads, 0 posts | Useful for crawl-failure diagnosis only |
| `wf-2026-08-15T21-07-53.zip` | Valid structure; 0 forums, 0 threads, 0 posts | Invalid/empty-scope diagnostic only |
| `wf-2026-08-15T21-08-04.zip` | Valid structure; 28 forums, 211 threads, 0 posts | Useful for crawl-failure diagnosis only |
| User-reported successful run | 340 threads, 4,382 posts, 442 pages; single ZIP too large | Use v2.2 multi-part exporter and rerun smoke test |

## Required next action

Run the v2.2 extension from a normally authenticated WizardForums tab. Choose **Whole board**, leave maximum pages, threads, and requests at zero, and allow all ZIP parts to download. Extract all parts into one analysis directory. Do not rename files until the manifest has been copied and checked.

Then run:

```bash
python3 analysis/smoke_test.py /path/to/part-001.zip --json reports/smoke.json
python3 analysis/initial_analysis.py /path/to/archive.zip --out reports/initial.json
python3 analysis/post_analysis.py /path/to/archive.zip --out reports/post_baseline.json
```

For multipart archives, the next implementation task is a merge utility that reads `metadata/archive_manifest.json`, concatenates `.part-NNN` JSONL/CSV files in order, and prevents duplicate metadata files from being treated as observations. Until that utility is present, concatenate only the split data/index files and preserve one manifest.

## Analysis sequence

### Phase A: Archive and data quality

Run ZIP integrity, schema, referential, timestamp, duplicate, URL provenance, privacy, and coverage checks. Record a gate decision. If posts equal zero, stop topic and post-level analysis. If links/resources are absent in a v2.2 archive despite posts being present, inspect scraper version and parser diagnostics before interpretation.

### Phase B: Descriptive initial analysis

Report counts by forum and thread, monthly post coverage, body-length distributions, deleted/ignored/edited status, quotes, attachments, links, resource types, domains, and request errors. Include missingness and coverage plots. Use descriptive language such as “in the observed archive” rather than “the community believes.”

### Phase C: Human-coded calibration

Draw a stratified sample by forum, month, thread activity, post length, and resource presence. Code content type, discourse mode, tradition references, epistemic stance, resource-sharing behavior, and uncertainty. Use two annotators for core labels, calculate agreement, adjudicate conflicts, and retain ambiguous cases. Do not use a model to create ground truth for its own evaluation.

### Phase D: Post and topic analysis

Begin with lexical baselines. Compare transparent dictionary features with human labels. Fit topic models only after validating preprocessing and sample sufficiency. Compare LDA/NMF with embedding-based discovery if resources permit. Record seeds and parameters. Evaluate topic stability over seeds, forum strata, time windows, and document-length filters. Label topics from representative posts and coder review, not top words alone.

### Phase E: Interaction and resource networks

Construct separate participation, quote/reply, thread-similarity, hyperlink, and resource networks. Report edge definitions, deduplication, connected components, and temporal windows. Use randomization or degree-preserving null models when making structural comparisons. Treat a link as a circulation trace, not proof of reading, download, belief, or practice.

### Phase F: Critical review and revision

Invite four review perspectives: a computational methods reviewer, an occult/esotericism domain reviewer, an Internet-research ethics/privacy reviewer, and an independent rerunner. Maintain a review ledger with objection, evidence, decision, code change, affected outputs, and residual uncertainty. Rerun all affected analyses after adoption.

## Reproducibility contract

Every analysis run must save the archive ID, archive manifest, file list, SHA-256 checksums, scraper version, schema version, Python version, package versions, operating-system information, code commit, preprocessing parameters, random seeds, sample selection seed, and output file hashes. Raw content remains restricted. The public release should contain the smoke-test report, schemas, code, aggregate tables, de-identified feature data, and synthetic examples where raw quotations would be identifying.

## Review ledger template

| ID | Concern | Raised by | Evidence | Decision | Adopted change | Residual limitation |
|---|---|---|---|---|---|---|
| CR-001 |  |  |  | pending |  |  |
| CR-002 |  |  |  | pending |  |  |
| CR-003 |  |  |  | pending |  |  |

## Deliverable checklist

| Deliverable | Required contents |
|---|---|
| Archive report | Counts, scope, dates, errors, missingness, manifest, checksums |
| Initial analysis | Descriptive coverage and no-overclaim interpretation |
| Annotation protocol | Codebook, examples, sampling, agreement, adjudication |
| Post baseline | Lexical, length, quote, link, resource, and status features |
| Topic analysis | Parameters, stability, labels, representative examples, caveats |
| Network analysis | Layer definitions, graph metrics, null models, visualizations |
| Critical review | Objections, decisions, revisions, sensitivity results |
| Ethics appendix | Access basis, risk assessment, minimization, storage, sharing, retention |
| Reproducibility bundle | Code, environment, manifests, checksums, tests, changelog |

## References

See `reports/literature_review_and_analysis_plan.md` and the source notes under `research/` for the reviewed literature and official guidance.
