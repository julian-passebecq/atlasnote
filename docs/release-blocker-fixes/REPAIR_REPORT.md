# Final V2.1 release-blocker repair

Scope: QA-01, QA-03, QA-02, in that order. No redesign, folder reorganization, cloud storage, merge or production deployment.

**READY FOR FINAL RELEASE REVIEW.** All three confirmed blockers are repaired. Final local release verification: **46/46 gates PASS**, **715/715 unit tests**, no final failures or skips. The first diagnostic run's two failures and their resolution remain documented, rather than omitted.

## Starting state

- Branch: `codex/atlasnote-v2.1-final-polish`.
- Exact starting commit: `0229d431a98defad72b8c6546fffb492baa9e942`.
- Working tree: verified clean before edits.
- Node: `v24.19.0`, explicitly placed first on PATH. npm was invoked through its JavaScript entry point with that Node executable; default Node 21 was not used.
- Read the four required root documents and `D:/PROJ/atlasnote-qa-20260917/FINAL_BROWSER_QA.md` plus `defects.json` before editing.
- Python runtime tests use the installed Python 3.13 environment with Playwright. No offline-bootstrap fallback.

## QA-01: canonical Article classification

**Root cause:** the visible picker read/wrote `source.taxonomy`, but canonical-mode Save parsed `raw`. Updating the picker never updated that draft. Conversely, editing JSON did not change the visible picker. The baseline built-in-browser capture shows Cloud selected while JSON contains IT.

**Repair:** while canonical JSON owns the draft, derive the classification from that JSON and write picker changes directly into it. JSON edits immediately update the picker. Malformed/non-object JSON or invalid taxonomy disables the picker and explains how to recover, rather than displaying a usable stale classification. Visual-mode editing and the existing source-replacement/effective-taxonomy transaction remain intact.

**Files:** `src/content-hub/Editors.tsx`, `src/content-hub/TaxonomyPicker.tsx`.

**Regression:** `tests/release_blockers_runtime.py` checks visual-to-JSON, JSON-to-visual, malformed JSON recovery, save/reload, Content Hub effective classification, explicit unclassification, unchanged Notebook reference object and Article target ID. The combined backup phase verifies exact overlays after restoration.

**Built-in browser:** reproduced before repair; corrected creation flow repeated twice, including JSON-to-picker change, save and reload. Repeated editing with all three fixes present also passes. Screenshots and DOM snapshots are under the ignored evidence directory.

## QA-03: author-selected QCM mode

**Root cause:** `multiple[q.id] ?? q.correctOptionIds.length > 1` recalculated an existing question's mode on every render until the author explicitly touched the mode selector. A reopened Multiple question had no entry in that map; removing one answer therefore switched it to Single and removed validation.

**Repair:** initialize editor-owned mode state from valid saved/imported canonical content once. Pass that state into QcmFields; answer-count changes no longer change it. Explicit Single selection still normalizes to one answer. Multiple drafts with fewer than two answers retain checkbox controls and validation. Guard both save and entry into canonical JSON so an invalid draft cannot lose author intent at that boundary. Valid canonical JSON still represents mode using its existing answer array; returning to visual mode initializes from the validated document.

**Files:** `src/content-hub/Editors.tsx`, `src/content-hub/QcmFields.tsx`, `src/content-hub/qcm-draft.ts`.

**Regression:** three unit tests plus the real-origin runtime suite cover reopening saved Multiple, two-to-one and zero-answer invalid drafts, explicit Single, valid JSON/visual round trips, blocked invalid conversion, save/reload, stable IDs and byte-equivalent attempt/reflection records.

**Built-in browser:** reproduced on the existing synthetic QA Visual QCM before repair. After repair, reopened/uncheck flows repeated twice; Multiple and validation remain. Invalid Save is blocked, deliberate Single works, valid canonical round trip and save/reload work. Combined retest also passes.

## QA-02: embedded PDF destination navigation

**Root cause:** the installed React-PDF 10.5.0 `Document` constructs its annotation viewer in `useRef`, retaining the first `onItemClick` callback. AtlasNote's initial callback closed over `setPage` while `pdf` was null. Every later annotation click reached that stale function and returned at `if (!pdf)`. Outline used current props and therefore worked. Verified in the installed `Document.js`, `LinkService.js`, and `OutlineItem.js`, and reproduced with the real PDF before editing.

**Repair:** the annotation callback delegates through a ref to the current physical-page handler. Outline uses the same handler. React-PDF's LinkService continues to resolve named destinations, explicit arrays, numeric zero-based indices and object page references, and supplies the already one-based physical `pageNumber`; AtlasNote does not add a second conversion. Default-navigation prevention and external-link handling remain in the existing PDF.js annotation layer.

**File:** `src/online/PdfEngine.tsx`.

**Regression:** the actual five-page fixture is opened on the integrated origin. In Single, Continuous, Spread and Four pages, twice each: start on physical page 1, click the embedded annotation, assert page control and durable reader/anchor state are 2, and assert a nonzero page-2 canvas and `QA-ANCHOR-BRAVO` text layer. Outline and external-link target/rel assertions remain explicit. Restored-backup navigation repeats the embedded click. This is not an Outline substitute or a compatibility-harness PDF test.

**Built-in browser:** baseline annotation remained on page 1 while Outline reached page 2. Corrected Single flow passes twice with real page-2 canvas/text; additional Continuous, Spread and grid interactions and a combined final flow are recorded.

## Persistence and safety

**No persistence schema migration.** `knowledge-atlas` remains version 2, with the existing stores and full-backup envelope. No canonical QCM field, taxonomy store, backlink mirror or network persistence was added. Draft answer-mode state is transient. Backup restoration compares complete overlays and the existing personal-state boundary, including attempts, reflections and Notebook references.

No original test was deleted, skipped, weakened, or given a larger timing threshold. No dependencies or lockfile changed. The dedicated runtime command is added to the local release runner and production CI.

## Evidence and limits

- Committed inventory and test report: [FILES.md](FILES.md), [TESTS.md](TESTS.md).
- Local evidence: `docs/evidence/release-blockers/` (ignored by existing repository policy).
- Manual: before/after PNGs, DOM snapshots, per-defect CDP failed-request/exception samples, console and combined-flow evidence.
- Automated: per-command release logs/results, targeted logs, runtime screenshots and actual app-produced backup ZIP.
- Browser Use native drag/drop, true hardware momentum and true fresh-profile restore remain uncertified by that bridge. They are not reclassified as application defects. The separate automated Playwright fresh-context restore is explicitly distinguished.
- Inherited `audit:local` Mermaid transitive SBOM/license closure remains a reported limitation; passing that command certifies its existing byte/version inventory, not the missing historical provenance.

The final 46-command table is in TESTS.md. The repair commit containing these documents is the delivered source; its exact SHA and push/remote-CI status are reported with delivery. No remaining confirmed QA-01/QA-03/QA-02 blocker exists. The bridge and inherited provenance limitations above remain separate review items. This verdict does not authorize merging or production deployment.
