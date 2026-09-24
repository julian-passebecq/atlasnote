# AtlasNote V3 content seed

The ChatGPT V3 preparation package contains 64 original study pages plus draft Workspace Experience and Norsk Daily feed contracts.

The full page seed is deliberately **not compiled into V2.3** on this preparation branch. Current public builds hash reviewed packs exactly, so the V3 agent must integrate the pages through the real pack compiler after the Experience/lazy-loader architecture is in place.

Target existing project IDs: `project.samples.python`, `sql`, `pandas`, `pyspark`, `azure`, `databricks`, `norsk`, `job`, and `personal`.

Do not disable publication-hash checks. Do not create a second unrelated page schema.

## Integration status (2026-09-24)

The 64 seed pages are now compiled as the draft pack `content/packs/atlas.v3-seed` (stable seed page and block IDs). Project IDs are globally owned by one pack, so the seed's suggested `project.samples.*` IDs (owned by `study.samples`) could not be reused; the pack defines five pack-owned projects mapped in `BUILTIN_CATEGORIES`: `project.v3seed.data-engineering` (IT), `project.v3seed.cloud` (Cloud), `project.v3seed.norsk` (Norsk), `project.v3seed.interview` (Job) and `project.v3seed.study-workflow` (KPI). Seed tags were reconciled to canonical `subject:it|cloud|norsk|job|kpi` plus `topic:*`.

The pack adds one linked data-engineering path (grain -> merge cardinality -> inner/left/anti joins -> window functions -> ROWS vs RANGE -> native QCM, 8 questions), one Norsk path (V2 -> subordinate clauses/ikke -> native QCM, 5 questions) and 10 glossary terms. The publication-review entry carries its exact semantic hash and is marked **owner review required before publication**. Code examples were not executed.
