# AtlasNote V3: implementation status (2026-09-24)

Branch `feat/atlasnote-v3-experiences-performance`, started from `886c24230389212119b25c6009089eef1763c0a7` (docs-only above application base `215d3c9`). Local commits only. **Nothing was pushed, merged or deployed**, and no Cloudflare/Access configuration was touched.

This is a partial V3 implementation. It is **not** a V3 release certification. The section at the end gives the precise continuation boundary.

## Commits

| Commit | Scope |
| --- | --- |
| `942e7de` | Phase B: PDF navigation owner and trace, asset-resolver lifecycle, page control, study-tree sync, coalesced reading checkpoints, cross-tab personal guard |
| `187bc3c` | Phase C: per-workspace Experiences and the single right-side setup panel |
| `de5bd3c` | Phase E: V3 seed integrated as draft pack `atlas.v3-seed`, with linked data-engineering and Norsk slices |
| `f9a516e` | Phase F (partial): Norsk Daily feed adapter against synthetic fixtures |
| `c788035`, `644114b` | V3 browser checks; compact-control fixes; two legacy tests made robust to library growth (exact sets instead of hard-coded counts) |

## New state: owner, persistence and migration boundary

| State | Owner | Persistence | Migration |
| --- | --- | --- | --- |
| `Session.experience` (per slot) | `src/experience/profile.mjs` (validation, evaluator) | Inside the existing personal record, and inside saved states and backups as part of the session | None. An absent field means All content, so existing profiles are untouched. Unknown future `schemaVersion` fails visibly, and data is retained. |
| Reader position (page, visible pages, verified count) | `src/pdf/reader-state.ts` | **Not persisted**; runtime only | n/a |
| PDF navigation trace | `src/pdf/navigation-trace.mjs` | In memory only (400-row ring); downloaded only on explicit user action | n/a |
| Reading-position checkpoint | `WorkspaceStore.checkpoint()` | Same personal record, coalesced to at most one write per 500 ms plus a trailing write | Flushed by `flush()`, by every explicit personal write, and on pagehide or hidden visibility. The documented loss window on abrupt termination is 500 ms of scroll position. |
| Cross-tab base (`persistedPersonal`) | `WorkspaceStore` | Memory only (what this tab last read or wrote) | n/a. The durable record is compared inside one readwrite transaction; if another tab changed it, the two versions are 3-way merged (`src/storage/personal-merge.mjs`). |

`knowledge-atlas` stays at version 3 with the same five stores. There is no schema change and no new database. History, compaction, the 13 rollback cases and the full-backup code are unchanged. The Experience filter is never passed to them.

## What changed

**PDF reader** (`src/online/PdfEngine.tsx`, `src/pdf/*`, `src/companion/*`)
- Restoration is tagged with a generation and a reason. A late canvas render may only re-anchor while the viewport is still where it was last committed. Once the reader has moved without a newer command, the viewport wins and a stale anchor is never revived.
- **The momentum root cause is not claimed.** The wheel pager thresholds are unchanged. To diagnose it, use Document info → "Download navigation trace" on the affected device. The trace contains timings, deltas, pages and restore reasons, but no PDF text, titles or URLs.
- Page input: blank, junk or out-of-range values no longer silently jump to page 1. They show an inline message instead, and Escape restores the committed value.
- A compact `Page [n] / N (a–b)` control stays visible when the reader chrome is collapsed.
- Study tree:
  - The reader's page is marked `aria-current`, other visible pages get a secondary marker, and A/B markers show which pane displays a page.
  - The page count shown is the verified PDF.js count. A mismatch with library metadata is reported, and the metadata is never rewritten.
  - Companion titles are used even when there are no categories.
  - A far page such as 190 is revealed with a bounded window instead of expanding every earlier batch.

**Lifecycle** (`src/app/assets.ts`): the resolver owns its archive subscription and object URLs, `dispose()` is idempotent, and it re-subscribes if reused. In the test, 24 lifetimes now leave 0 listeners and 0 URLs; before the fix they left 24 of each.

**Experiences** (`src/experience/*`, `Tree.tsx`, `SearchContext.tsx`, `ReaderRail.tsx`, `App.tsx`)
- One evaluator decides visibility, in this order: content type, exclude, include, subject, project, PDF selection. An empty selection means none.
- Metadata facts are indexed in O(n) once per catalogue generation.
- The tree is filtered upstream, and search is filtered before the text scan, with an explicit "All library" scope.
- The panel "Workspace N — Name" opens from the sidebar gear or the rail's workspace dock. Changes are a draft until Apply or Cancel, and Apply is pinned to the labelled workspace slot.
- Open tabs are kept, marked "Outside", and offer "Add to Experience". That action asks before turning on a disabled content type.
- A saved state from before Experiences existed keeps the slot's current profile. A newer saved state restores the profile it saved.

**Content** (`content/packs/atlas.v3-seed`): all 64 seed pages, with stable IDs, in five new projects mapped to canonical subjects.
- The data-engineering slice links grain → cardinality → joins → windows → ROWS/RANGE → an 8-question native QCM, plus 7 glossary terms.
- The Norsk slice links V2 word order → subordinate clauses → a 5-question QCM, plus 3 glossary terms.
- Three technical corrections, including the Spark cache/unpersist order. **None of the code was executed.**
- `publication-review.json` marks the pack **OWNER REVIEW REQUIRED before publication**.

**Norsk Daily** (`src/norsk-daily/*`, `examples/norsk-daily/*`)
- A strict, bounded validator for feed schemaVersion 2 with Europe/Oslo day boundaries.
- Source wording and generated study text are labelled separately, and a claim to cover all of a day's headlines is rejected without evidence of complete coverage.
- Projection to Article and QCM pages is deterministic, with stable IDs and item revisions.
- Import goes only through the existing Agent Review flow: preview, stage, then an explicit human accept.
- Only a synthetic fixture is included; there are no real headlines.

## Test evidence (clean tree, Windows 11, Node 26.9, Python 3.14, Playwright Chromium headless)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` / `-p tsconfig.online.json` | PASS |
| `npm test` | PASS 1094/1094 (baseline 1053) |
| `npm run test:v23` | PASS 214/214 |
| `npm run validate`, `npm run check:pdfatlas`, `npm run build` | PASS |
| `tests/v3_runtime.py` (new) | PASS 6/6 |
| `pdf_navigation_runtime`, `workspace_122_runtime`, `workspace_122_dom`, `v22_runtime`, `wheel_125_dom`, `reading_124_dom`, `saved_states_runtime`, `pdf_lifecycle_runtime`, `stabilization_v2_runtime` | PASS |

Run the build-gated Python suites from the repository root, on a clean committed tree, after `npm run build`.

Retained failures found during this work, all fixed and re-run:
- The compact Prev/Next buttons defaulted to submit, so Enter in the page field "clicked" Previous.
- A duplicate accessible name broke `workspace_122_runtime`.
- Two legacy tests assumed a fixed library size.

Browser runs used Playwright wheel injection. **This is not physical mouse or trackpad evidence.**

## Remaining work and blockers

- **BLOCKED: real-device PDF wheel trace.** This needs the owner's affected mouse or trackpad and the trace export. The Spread backward jump is hardened against stale restores but not proven fixed.
- **BLOCKED: protected preview and Access qualification.** It needs the owner's credentials and explicit authorization. No deployment was done.
- **BLOCKED: Norsk Daily with real sources.** The publisher's permission is unverified.
- **Not started (phase D core):**
  - Metadata-first split compiler output and lazy body loading. Boot still fetches the full `content.json`, and `loadWorkspace()` still calls `getAll()` on assets and history.
  - Worker-based search shards.
  - A windowed list of Continuous PDF page wrappers and true tree virtualization.
  - Reducing the PDF byte copies.
- **Not run:** 1,500/10,000-resource scale fixtures and budgets, the full `test:v23:release` gates including the compaction fault matrix, and offline or auth-expiry transitions.
- **Content:** 59 of the 64 seed pages remain unlinked drafts, and the whole pack needs the owner's review. Presets are subject-based, so they don't depend on the seed's project IDs.
- **Norsk Daily UI** (daily queue, New/Learning/Known progress) and adding vocabulary to the glossary are not built.
