# AtlasNote V2.2 — Final Memory / Continuation Handoff

This archive is the compact source of truth for the AtlasNote V2.2 end-state. It exists so a new AI can continue the project without access to the long prior conversation.

## Read order

1. `01_FINAL_V22_CONTRACT.md` — concise end-state architecture and product rules.
2. `02_IMPLEMENTED_STATUS_AND_GAPS.md` — what the delivered V2.2 candidate actually contains and what is still missing/unverified.
3. `03_REQUIRED_FINAL_QA.md` — mandatory acceptance work before V2.2 may replace production.
4. `04_NEXT_AI_PROMPT.txt` — ready-to-send continuation instruction.
5. `05_REPOSITORY_AND_ARTIFACT_IDENTITY.md` — exact baseline/current repository and artifact hashes.
6. `reference/` — retained authoritative V2.2 handoff files. If a concise summary conflicts with a reference contract, the reference contract wins.

## Current release state

- Production GitHub `julian-passebecq/atlasnote` remains **V2.1.0** at commit `b50c27a987fa65eee1c51d36225908621e322da7`.
- The delivered local V2.2 candidate is package **2.2.0**, but it has **not** been merged or deployed.
- PDFAtlas remains at commit `fa5e83f7825cdc837078f87c5e130cb012332195`; AtlasNote production is pinned to that full immutable SHA.
- V2.2 unit/compatibility evidence: **797/797 unit tests pass** after the implementation corrections.
- V2.2 is **not yet production accepted** because the integrated dependency/build and normal-origin browser QA could not be completed in the prior execution environment.

## Important newly discovered implementation gap

The V2.2 requirement explicitly says the Notebook/tree right-click menu must expose:

- Version history...
- Compare with previous version
- Open previous version in other pane

The candidate passes `onHistory`, `onComparePrevious`, and `onOpenPrevious` into `ProjectTree`, but `src/components/Tree.tsx` does not render those actions in the context menu. This is a real omission and must be repaired and browser-tested before V2.2 acceptance.

Do not treat the previous delivery report's statement that tree actions were delivered as sufficient evidence; source inspection found this mismatch.
