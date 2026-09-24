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
| `498c12b` | Phase D: staged boot and change-only history reconciliation |
| `c2fbb1c` | Phase D: bounded (windowed) Continuous PDF rendering |
| `9e2ebbf` | Phase D: compute-once search index, proven equivalent to the legacy search |
| `b5242b8` | Phase D: the tree stops rescanning the library on every state change |
| `3d60619` | Study-samples test selects results by page ID; `data-page-id` added to search results |
| `1a61fd1` | Norsk Daily study queue: date navigation, New/Learning/Known progress on the existing learning flags, English reveal, grammar links, the day's QCM |
| `ccd0d87` | Live cross-tab sync (BroadcastChannel + 3-way merge, reload notice) and single-owner PDF bytes |
| `43c9711` | Content: all 64 seed pages linked; 41 glossary terms; 6 native QCMs (45 questions); pack 0.2.0, still **OWNER REVIEW REQUIRED** |

| `f7e346a` | Norsk Daily vocabulary review (reveal-on-demand word cards from the accepted stories) |
| `db83c44`, `866646f`, `1bfe42b` | **Owner-approved agent contract extension:** `concept.create` (25 → 26 operations). Norsk Daily vocabulary goes to the Concept Index through preview, stage and explicit accept |
| `2356368` | Fix: pinned-revision deep links wait for the complete history under staged boot (found by `completion_v22_runtime`) |

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
- Study screen (`NorskDailyView`), opened from the sidebar "Norsk Daily" entry, which appears when the Norsk subject is in scope.
  - Europe/Oslo study days, a queue ordered New → Learning → Known, and reveal/hide English.
  - Grammar links and the day's native QCM.
  - Progress is the existing learning flag on each stable story ID. There is no second progress store, and progress survives corrections and re-imports.
- A strict, bounded validator for feed schemaVersion 2 with Europe/Oslo day boundaries.
- Source wording and generated study text are labelled separately, and a claim to cover all of a day's headlines is rejected without evidence of complete coverage.
- Projection to Article and QCM pages is deterministic, with stable IDs and item revisions.
- Import goes only through the existing Agent Review flow: preview, stage, then an explicit human accept.
- Only a synthetic fixture is included; there are no real headlines.

## Phase D: loading and rendering (measured, same machine)

| Change | Before | After | Evidence |
| --- | --- | --- | --- |
| Staged boot: first render after `content.json` plus a shell read (imports, overlays, personal, history meta/heads/reviews/archive descriptors via the `kind` index); asset bytes and revisions hydrate afterwards | Time to shell with 12 × 16 MB local assets: 404–431 ms | 146–160 ms (one outlier run: 307 ms); first render 83–121 ms after start, independent of asset volume | `tests/v3_boot_scale.py` with `atlas:boot:*` marks |
| Boot reconciliation only sends changed resources through `advanceHistory` | Unchanged library: one full-history deep clone plus JSON serialization per 50 resources, every boot | Zero history clones for an unchanged library | `tests/v3-loading.test.mjs` |
| Windowed Continuous PDF (above 40 pages) with measured spacers | 400-page PDF: 400 wrappers and 800 observers | 13 wrappers; jump to page 250 in 87 ms with 0 px anchor error; monotonic wheel across window shifts; scrollbar at 30% maps to page 118 | `tests/v3_pdf_window.py` (generated 400-page PDF) |
| Compute-once search index | 1,500 resources: 14.3 ms per keystroke; 10,000: 118 ms | 1.15 ms and 7 ms (one-time index 17 ms and 108 ms); identical results for 20 queries | `tests/v3-search-scale.test.mjs` (legacy oracle) |
| PDF bytes handed to PDF.js without a retained copy | 48 MB PDF open: 50.6 MB of page ArrayBuffer backing store | 2.6 MB (after GC); Retry still works | `tests/v3_pdf_memory.py`, `pdf_runtime` |
| Memoized, early-exit tree filtering | `pages.find` for every node on every render | Map lookup, and only while a text filter is active | Full DOM/runtime suites |

**Safety boundary.** Staged boot is opt-in from `main.tsx` only.
- Authored, import, asset, reviewed-change, compaction and backup commands **wait** for the complete, hydrated and reconciled state. If hydration fails, they fail closed ("Nothing was changed"). Restore and retry remain available for recovery.
- A pinned revision that isn't loaded yet reports "still loading", never "missing".
- The history writer, compactor, backups and the 13 rollback cases are unchanged.

**Deliberately not done, with reasons:**
- **Web Worker search:** the measured costs above don't warrant a second search path.
- **Asset bytes on demand:** asset bytes still hydrate into memory after the first render. Making them lazy means replacing the synchronous `Asset.bytes` contract used by about 20 durability and backup call sites. That needs its own equivalence and rollback proof.
- **Split compiler output:** today's reviewed catalogue is 548 KB. At 1,500 or 10,000 synthetic resources the costs measured above are dominated by computation, which is now bounded, not by transfer.

## V2.3 portable release core (clean worktree at `4fe5995`)

`npm run test:v23:core:portable` passed all 12 gates: typecheck, check:access, test:v23, check:v23:build, test:v23:runtime:portable, layout, compare, recovery, safe-close, compaction (the 13 rollback cases), capacity and check:v23:secrets. The runner's verdict is **PORTABLE CORE PASS - NOT A RELEASE**. The full release additionally needs the protected Cloudflare preview and the Linux/WSL native-quota proof, and both remain BLOCKED here.

## Test evidence (clean tree, Windows 11, Node 26.9, Python 3.14, Playwright Chromium headless)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` / `-p tsconfig.online.json` | PASS |
| `npm test` | PASS 1115/1115 (baseline 1053) |
| `npm run test:v23` | PASS 214/214 |
| `npm run validate`, `npm run check:pdfatlas`, `npm run build` | PASS |
| `tests/v3_runtime.py`, `tests/v3_pdf_window.py`, `tests/v3_norsk_daily.py`, `tests/v3_tabs.py` (new) | PASS 6/6, 5/5, 5/5, 4/4 |
| `pdf_navigation_runtime`, `workspace_122_runtime`, `workspace_122_dom`, `wheel_125_dom`, `reading_124_dom`, `v22_runtime`, `saved_states_runtime`, `stabilization_v2_runtime`, `reading_124_runtime`, `content_hub_127_runtime`, `references_v2_runtime`, `release_blockers_runtime`, `final_polish_runtime`, `pdf_lifecycle_runtime`, `study_samples_runtime`, `simplified_123_dom`, `hardening_dom`, `compact_12_dom` | PASS |
| `v23_runtime` | Every case PASS except one BLOCKED gate: native quota failure requires Linux or WSL (`ATLAS_V23_NATIVE_QUOTA=1`) |

`content_hub_127_runtime`, `references_v2_runtime` and `v22_runtime` each failed once in a long sequential run: two `goto(networkidle)` timeouts of 12 s on a fresh profile, and one readiness race. All three passed when re-run individually.
- The readiness race was a real test assumption. `v22_runtime` expected history to be initialized as soon as the shell appeared. With staged boot that happens about 0.2 s later, so the test now waits for it explicitly.
- A fresh profile measures about 1 s to the shell and 1.1–1.2 s to initialized (100 resources), so the 12 s timeouts are not explained by boot cost. They are recorded as intermittent.

`npm run test:completion:runtime` passes completely on `1bfe42b`. That covers 26 action kinds, all 24 example proposals replayed through review in the browser, pinned links, deleted-source pinned startup, quota atomicity and corrupt-backup rejection. Two staged-boot regressions it found (pinned-revision deep links) are fixed.

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
- **Phase D remaining:**
  - Loading asset bytes on demand (see above).
  - Split compiler output.
  - Reducing the PDF byte copies.
  - Full virtualization of very long expanded Notebook trees (PDF study trees are already bounded).
- **Not run:** the full `test:v23:release` gates including the compaction fault matrix, offline or auth-expiry transitions, and a browser-level 1,500-resource UI run. The 1,500/10,000-resource figures above are computation benchmarks in Node.
- **Content:** all 64 pages are now linked. The whole pack (Norwegian text, quiz answers, reference URLs) still needs the owner's review. Presets are subject-based, so they don't depend on the seed's project IDs.
- **Norsk Daily:** vocabulary now reaches the Concept Index through the reviewed `concept.create` operation. Dropping stale questions from a batch QCM still requires a delete operation that doesn't exist yet.
