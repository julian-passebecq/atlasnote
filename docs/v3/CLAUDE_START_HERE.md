# AtlasNote V3 — Claude/Codex start here

Prepared 2026-09-24 from `main` commit `215d3c962736bbac44c3f2e3602fa1f80cee77c8`.

This branch is a preparation anchor for the V3 implementation. **Extend the existing V2.3 codebase; do not rewrite AtlasNote.** Keep the existing durability/history/backup contracts, five independent workspace slots, A/B panes, content-type projections, strict public content review hashes, and PDF revision binding.

## P0: PDF wheel / trackpad navigation

The user's 2026-09-24 recording shows non-monotonic Spread scrolling: it moves forward, jumps back to the cover/first spread, advances again, then jumps back again.

Inspect first:
- `src/online/PdfEngine.tsx`
- `src/pdf/wheel-navigation.mjs`
- `src/pdf/physical-pages.mjs`
- `tests/wheel_125_dom.py`
- `tests/pdf_navigation_runtime.py`

Current wheel pager defaults are approximately threshold 90, idle 220 ms, cooldown 500 ms, accumulation window 1200 ms. The latch is released after the short idle window. A long trackpad momentum tail with small direction reversals can therefore plausibly become a new reverse-page gesture after cooldown. Instrument and prove the root cause; do not fix this only by increasing one timeout.

Implement an explicit gesture state model: native in-page scrolling first, one boundary turn, then a latched post-turn state that cannot navigate again or reverse until a genuinely fresh gesture begins. Continuous mode stays native. Add deterministic tests for forward momentum, opposite-sign tail noise, deliberate reverse after pause, Spread/Grid grouping, Compare independence, resize/restore races, and manual hardware-trackpad QA.

Important coverage gap: `pdf_navigation_runtime.py` uses Next/Previous buttons; it is not a wheel test. The existing wheel suite uses Playwright-generated wheel events and historical QA did not certify native hardware momentum.

## P0: current physical PDF page and direct selection

The full PDF toolbar already has an editable physical-page number input. The user still cannot reliably see where they are because the control disappears with reader chrome and the sidebar does not visually track the active physical page.

V3 requirement:
- keep a compact always-available `N / total` page control in the pane/reader header for PDFs;
- number remains editable and jumps directly to a physical page;
- `PdfStudyTree` receives current/visible pages and highlights them;
- use `aria-current="page"` for the primary page and a lighter visible-in-spread marker for the second page;
- remove redundant generic `Page N` + `p.N` duplication.

## P0: semantic PDF page names

Do not invent another model. Current `PdfCompanion` already supports `pages[physicalPage].title`, and `categoryPageRows()` already renders that title. Generic `Pages -> Page 1...` is fallback when no valid Companion exists for the exact PDF revision.

Make Companion generation/import the normal study path for imported PDFs, keep the safe fallback, and retain strict SHA/pageCount binding.

## P0: Workspace Experiences

Numbered workspaces 1–5 are independent instances. They are **not** IT/Cloud/Norsk/Job/KPI aliases. Subject/category filtering is separate.

Add a versioned per-workspace Experience profile containing:
- optional preset ID;
- enabled subjects;
- enabled content types;
- enabled/disabled pack IDs;
- enabled/disabled project IDs;
- enabled/disabled document IDs;
- feed IDs;
- default library mode;
- PDF Companion default;
- user overrides layered on the preset.

Enable/disable is only a projection/visibility preference. It must never delete, archive, clone, or silently close canonical resources.

Presets to ship: All, Data Engineering, Cloud/Fabric, Norsk Daily, Interview. Put Workspace setup in a compact popover/sheet near workspace controls rather than another permanent toolbar row.

## Product model that must remain true

- Workspaces 1–5 preserve independent tabs, pane state, reader positions, PDF page/mode/zoom/rotation, tree expansion, library mode, and Experience profile.
- Notebook hierarchy is user organization; the semantic Concept Index uses stable IDs and remains independent.
- Notebook/PDF/Cheatsheet/Article/QCM are projections of canonical resources, not duplicated copies per workspace.
- A/B collapse/reveal is view state, not navigation state.
- PDF Companion metadata is tied to the exact document revision.

## P1: scale / performance

Current startup fetches one compiled `content.json` containing full pack/page bodies. That is acceptable at today's size but conflicts with hundreds/thousands of pages.

Design V3 as:
`content/index.json -> resolve active Experience -> lazy pack/page body fetch`.

The small index should contain tree/search metadata. Fetch full page blocks on selection. Build a lightweight search index and load/search it in a Web Worker. Keep personal overlays indexed incrementally. Virtualize long library/PDF page lists. Memoize derived projections by content generation + Experience profile so PDF scroll updates do not recompute the whole tree.

Add a scale fixture around 1,500 page metadata entries, a 200-page PDF tree, five content types and five Experience profiles. Measure boot bytes/parse, usable-shell time, workspace switch latency, mounted tree rows, search initialization and PDF memory.

## Repository/content strategy

For V3:
- `atlasnote`: app, schemas, reviewed manifests, compact author-created JSON, indexes;
- existing `pdfatlas`: heavy/external PDFs and pinned metadata/bytes where rights permit;
- optionally later `atlasnote-feeds` / `norsk-daily` for high-churn daily generated feed JSON.

Do not prematurely split all general content into another repository. First fix the loader/index architecture.

## Norsk Daily Experience

The user wants a focused Norsk workspace where daily permitted headline metadata is transformed by ChatGPT into structured study JSON.

Feed items should carry stable ID, URL, timestamp, section, minimal Norwegian headline/source metadata, English translation, optional simpler Norwegian paraphrase, vocabulary/lemmas/POS, grammar notes, difficulty and study prompts. Do not mirror full articles into Git.

Initial provider-neutral flow:
source/user provides permitted headline metadata -> export package/prompt -> ChatGPT returns validated `atlas.norsk-daily@1` JSON -> commit/import feed -> AtlasNote displays it in the Norsk Daily Experience.

## UI audit items

- Long PDF page trees dominate the left sidebar; virtualize and use semantic page names.
- Show row overflow actions on hover/focus rather than visually emphasizing every ellipsis.
- Long selected PDF titles need full tooltip and better active-resource context.
- Current physical page must remain visible even when full PDF controls are collapsed.
- Modes that hide shell UI must retain an obvious escape route.
- Keep strong A/B ownership markers.

## Historical regressions to recheck after V3 state changes

- Article classification picker vs canonical JSON ownership mismatch.
- Embedded PDF page link navigation.
- Multiple-answer QCM editor silently changing to Single.
- Focus/Compare persisted state making the app appear trapped/empty.
- Book/Spread/Continuous mode switches altering open state.

## Content seed

A full companion ZIP prepared in the ChatGPT handoff contains **64 author-created study pages** using the current Page/block shape:
Python, SQL, Pandas, PySpark/Spark, Azure/Fabric, Databricks, Norsk, interviews and personal study workflow.

It also contains draft Experience preset data and a Norsk Daily JSON Schema. The page seed is intentionally not merged into current `content/packs` yet because the V2.3 publication gate uses exact semantic hashes. Integrate the seed after the V3 loader/Experience work, then run the real schema compiler and refresh exact public review hashes. Never weaken publication review to make content pass.

## Implementation phases

A. Baseline existing tests and migration state.
B. Fix PDF P0 first and add regression evidence.
C. Add Experience profile + V2.3 migration.
D. Add index/lazy content loader, worker search, virtualization.
E. Add Norsk feed validator/import UI.
F. Integrate reviewed foundation content.
G. Run full durability/history/backup/PDF/5-workspace/scale/mobile gates before preview or merge.

## Start instructions

Create a new implementation branch from this preparation branch, e.g.
`feat/atlasnote-v3-experiences-pdf-performance`.

Read, in order:
1. this file;
2. `START_HERE.md`;
3. `AGENTS.md`;
4. current V2.3 architecture/durability docs referenced there;
5. PDF engine + wheel tests;
6. `src/core/model.ts` and `src/core/workspace-slots.ts`;
7. `src/companion/*`;
8. `src/core/packs.mjs`, `tools/compile-content.mjs`, `src/main.tsx`.

Before coding, map every new state field to its owning module and migration path. Keep PDF P0 commits reviewable separately from the content-loader refactor. Do not merge or deploy production until the inherited and V3 gates are green.
