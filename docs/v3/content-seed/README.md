# AtlasNote V3 content seed

The ChatGPT V3 preparation package contains 64 original study pages plus draft Workspace Experience and Norsk Daily feed contracts.

The full page seed is deliberately **not compiled into V2.3** on this preparation branch. Current public builds hash reviewed packs exactly, so the V3 agent must integrate the pages through the real pack compiler after the Experience/lazy-loader architecture is in place.

Target existing project IDs: `project.samples.python`, `sql`, `pandas`, `pyspark`, `azure`, `databricks`, `norsk`, `job`, and `personal`.

Do not disable publication-hash checks. Do not create a second unrelated page schema.

## Integration status (2026-09-24)

The 64 seed pages are now compiled as the draft pack `content/packs/atlas.v3-seed` (stable seed page and block IDs). Project IDs are globally owned by one pack, so the seed's suggested `project.samples.*` IDs (owned by `study.samples`) could not be reused; the pack defines five pack-owned projects mapped in `BUILTIN_CATEGORIES`: `project.v3seed.data-engineering` (IT), `project.v3seed.cloud` (Cloud), `project.v3seed.norsk` (Norsk), `project.v3seed.interview` (Job) and `project.v3seed.study-workflow` (KPI). Seed tags were reconciled to canonical `subject:it|cloud|norsk|job|kpi` plus `topic:*`.

The pack adds one linked data-engineering path (grain -> merge cardinality -> inner/left/anti joins -> window functions -> ROWS vs RANGE -> native QCM, 8 questions), one Norsk path (V2 -> subordinate clauses/ikke -> native QCM, 5 questions) and 10 glossary terms. The publication-review entry carries its exact semantic hash and is marked **owner review required before publication**. Code examples were not executed.

### Enrichment (pack 0.2.0, 2026-09-24)

The remaining 57 draft pages are now part of a connected library. The project set is still exactly the five `project.v3seed.*` IDs, and no page or block ID changed.

- **Related links.** Every one of the 64 Notebook pages has 2-5 related links. Eleven of them point to `page.samples.*` pages in `study.samples`, so the manifest now declares `requires: study.samples >= 1.1.0`.
- **Glossary.** There are 31 new terms, for 41 in total. The Spark terms cover lazy evaluation, transformations vs actions, shuffle, partitions, jobs/stages/tasks, broadcast joins, skew, AQE, physical plans, pushdown/pruning and small files. The other data terms are hashable, quarantine path, vectorization, nullable dtypes, three-valued logic, idempotency and data contracts. The platform terms are medallion architecture, the Delta transaction log, Unity Catalog, managed identity and OneLake. The Norsk terms, each with its Norwegian name, are bestemt form, grammatisk kjønn, adjektivbøying, preteritum, perfektum, modalverb and bindeord. The last term is the STAR method.
  - Each term's `pageIds` is derived from the pages' `terms`, so the two directions agree.
  - 56 of the 64 Notebook pages reference at least one term. Eight pages have no fitting term and are deliberately left without one: ADF parameters, cloud cost, functions, MLflow, NRK feed, reading queue, weekly review and workplace vocabulary.
- **Native QCMs.** There are four new sets, for six in total. Each new set has 8 questions, at least one multiple-answer question, an explanation for each question and notes on the wrong options. Every question links to its explaining page, and those pages list the quiz in `related`:
  - `page.v3seed.qcm.pyspark-execution-performance`, in the Spark folder
  - `page.v3seed.qcm.python-data-engineering`, in the Python folder
  - `page.v3seed.qcm.cloud-data-platforms`, in a new "Practice" folder of the Cloud project
  - `page.v3seed.qcm.norsk-grammar`, in the Norsk Grammar folder

  Notebook `question` blocks are unchanged (11) and are not counted as QCMs.
- **Sources.** Pages link only to the roots or long-standing pages of official documentation: docs.python.org, postgresql.org, spark.apache.org, pandas.pydata.org, learn.microsoft.com, docs.databricks.com (root only), delta.io, mlflow.org, sprakradet.no and ordbokene.no. No third-party text was copied.
- **Technical review.** No clear factual error was found in the remaining drafts. Two clarifications were added as new blocks or fields:
  - The adjective page gets an agreement table and a note that -ig adjectives take no -t in the neuter. Its only neuter example (et viktig møte) looked unchanged.
  - The nullable-dtype code block gets a note that `astype("Int64")` fails on coerced values that have a fractional part.
- **Checks.** Nothing was executed apart from the repository checks. The publication-review hash was updated and the entry still says **OWNER REVIEW REQUIRED before publication**.
