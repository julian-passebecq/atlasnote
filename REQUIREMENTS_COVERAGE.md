# AtlasNote 1.2.7 requirements coverage

Source of truth: `AtlasNote_1.2.7_Pro_Handoff_v2_SOURCE_OF_TRUTH`, specifically its 26-row acceptance matrix. Earlier `library-reader-capture` decisions are not combined with it.

Baseline: `f9345c11d98f13d33032666d5148a55a27805742`
Local branch: `feature/atlasnote-1.2.7-content-dashboard-qcm`

**Implementation is delivered; integrated release acceptance is NOT cleared.** The table separates implemented behavior and locally exercised evidence from unverified normal-origin/dependency-dependent gates. `FINAL_TEST_STATUS.md` is authoritative for exact final counts and every failed/blocked command. Evidence paths refer to the separate test-evidence archive.

| # | Acceptance area | Implementation | Proof / verification boundary |
|---|---|---|---|
| 1 | Baseline | Exact corrected f9345c11 baseline reconstructed and Git-tree verified; no restart. | 82 protected files match baseline byte-for-byte; source-integrity.json. Full new-version integrated release gates are NOT cleared. |
| 2 | Type selector | Five content types replace the old workspace row: Notebook/PDF/Cheatsheet/Article/QCM. | 70 new unit cases; new UI axes/modes checks; updated compact/workspace/finish suites. |
| 3 | Subject selector | IT/Cloud/Job/KPI/Norsk are a display projection over existing subject IDs. Type switching retains the subject. | Unit subject and projection invariants; UI content-mode switching and scoped Dashboard. |
| 4 | Workspaces | Five original slots and save/state actions relocated to bottom-right; unused-slot action never creates slot six or overwrites data. | Workspace/saved-state unit tests; new UI checkpoint/Compare and 390x600 chooser cases. Durable reload is blocked. |
| 5 | Top ribbon | Only library collapse, search, back, forward, Focus and Compare remain. | Compact, hardening, simplified and new content-hub UI geometry/interaction checks. |
| 6 | Pane header | A/B controls only in two-pane Compare; + and tabs left; independent reader-controls toggle far right. | Simplified and new Compare checks; original independent-pane regressions retained. |
| 7 | Reader modes | Notebook/PDF/cheatsheet modes remain contextual per pane. QCM uses its own educational reader. | Existing compatibility reader/cheatsheet checks pass. Actual integrated PDF worker/canvas/grid/wheel execution remains a release blocker. |
| 8 | Dropdown | Reclick, outside, Escape with focus return, mutual exclusion and document/pane changes dismiss popovers without changing the mode. | New popover case plus original compact/hardening cases. Reference-origin focus bug fixed in production code. |
| 9 | Shared taxonomy | Shared stable Notebook folders seed every type; legacy unmappable resources retain metadata and project to Unfiled. | Unit stable IDs, duplicate names, descendants, explicit unclassification and non-mutation; UI assignment/modes. |
| 10 | Notebook references | Specialized resources appear in the master Notebook only through explicit typed references. | Unit no-implicit-copy/deduplication cases; UI button, drag and exact typed link routes. |
| 11 | Reference safety | Reference rename/move/remove is separate from source resource deletion. Missing sources remain explicit unresolved targets. | Unit source/attempt/capture preservation; UI reference edit/remove; original mixed-collection reader regressions. |
| 12 | Management | One generic specialized management shell, mode-specific metadata/actions and a shared Notebook assignment tree. | New QCM and Article manager cases; PDF/cheatsheet regression discovery; drag has a tested non-drag button alternative. |
| 13 | Dashboard | Five subjects by five default rows, three-card cap with Show more, subject/folder scopes, Unclassified and original-store pointers. | Unit derivation/scope/collection-target tests; UI empty/filled/scoped/Show more/task-toggle cases. |
| 14 | Dashboard state | New empty workspace starts Dashboard; existing reading state is preserved; new surface flag is optional. | Old-state and session migration unit tests; UI new-workspace and mode round-trips. |
| 15 | Dashboard non-destructive | Dashboard and management are session surfaces over existing panes, not replacement documents. | UI exact pane comparisons, cheatsheet/QCM Compare, actual wheel scroll and workspace switches. |
| 16 | Quick Capture | Link/Task/Note supports 1-5 rows, blank filtering, importance and due dates; Article/Transcript opens a long editor. | Unit bounds/date/URL/atomicity tests; UI batch tasks/notes/links and long Transcript editor. |
| 17 | Context capture | Explicit opt-in stores exact ResourceTarget; global/unclassified capture is the default. | Unit exact QCM/PDF/cheatsheet target cases; UI current-question return and no silent context inheritance. |
| 18 | Article | Link-only URL or safe pasted native text/blocks, taxonomy/status/importance, editing, source export and archive/restore. | Fixture exactness and unsafe-source unit tests; UI native/link-only/malformed import and full lifecycle case. |
| 19 | QCM | Single and multi-answer questions, check/reveal, every option explanation, reflection, draft response, progress and immutable attempt history. | Unit exact-set scoring/reveal/invalid selection/attempt bounds; UI single/multi/reveal/reflection/history and actual scroll. |
| 20 | QCM export | Canonical source, attempts and bounded AI review exports use local downloads; review supports JSON and Markdown. | Unit all-option/attempt/range checks; actual browser downloads decoded and checked in UI suite. |
| 21 | Cheatsheet | Summary, Architecture, Bilingual concept and Vocabulary starters use the existing 1.2.6 grammar/renderer. | Unit all four preset validation; UI all four imports/live SVG; existing 26-case cheatsheet suite; protected renderer and eight fixture pages unchanged. |
| 22 | Typed links | One extended ReadingTarget / ResourceTarget alias across Notebook blocks, references, Related, captures and navigation. | Unit current/tab/other-pane/workspace-5 routes; UI exact PDF page, stable cheatsheet block, Article and QCM-question links. |
| 23 | Persistence | Additive personal/overlay/session contracts in the same database and backup envelope; no automatic reset. | Unit exact whole-payload encode/decode and optional-field compatibility; backup diagnostic passes. Actual IndexedDB reload/fresh-profile restoration BLOCKED in this environment; new 12-case runtime suite supplied and invoked. |
| 24 | Saved-state boundary | Restoring old reading/workspace snapshots never rewinds newer shared captures, Articles, references or QCM responses/attempts. | Unit restore/undo boundary and exact payload assertions; UI save, answer/capture, restore, switch workspaces. Durable counterpart is blocked. |
| 25 | Security | Bounded parsing and strict allowlists reject malformed/executable/prototype-bearing sources before mutation; no iframe/scraping/AI/API runner. | Unit validators and atomicity plus UI malformed/unsafe Article and QCM import. Dependency audit is not cleared; see final test status. |
| 26 | Accessibility | Explicit labels, selected states, keyboard actions, Escape/focus return and non-drag assignment; short-screen chooser. | New UI form/popover/390x600 cases plus existing keyboard/theme/Focus suites. This is targeted testing, not a WCAG certification. |

## Implementation map

- `src/content-hub/model.ts`, `validation.mjs`, `content.ts`: additive contracts, import/edit, capture, responses, attempts and export.
- `src/content-hub/taxonomy.ts`, `TaxonomyPicker.tsx`, `LibraryManager.tsx`: shared folder projection, specialized managers and safe explicit references.
- `src/content-hub/Dashboard.tsx`, `dashboard.ts`, `surfaces.ts`: app-level/scoped Dashboard without replacing readers.
- `src/content-hub/Editors.tsx`, `QcmReader.tsx`, `ResourcePicker.tsx`: local authoring, QCM, exact typed targets.
- `src/app/App.tsx`, `components/Tree.tsx`, `ReaderRail.tsx`, `ReadingActions.tsx`, `reader/Reader.tsx`: existing-shell integration and navigation cleanup.
- `src/storage/*validation.mjs`, `core/reading-navigation.ts`, `core/workspace-slots.ts`: validation/routing extensions and saved-state boundary.
- `src/cheatsheets/presets.ts`: four starters; no replacement SVG engine or new block types.
- `tests/content-hub-127.test.mjs`, `content_hub_127_dom.py`, `content_hub_127_runtime.py`: 70 unit, 30 component/browser and 12 normal-origin cases.

## Explicit limits

New Article/QCM resources are local imports; the supplied examples are in `examples/content-hub`. Existing private library content is not published or replaced. There is no cloud sync, background scheduling, scraping, arbitrary web embedding, automatic AI request, code runner, exam timer/ranking, sixth library type or new SVG grammar.

Safe fixed bounds are enforced with visible errors instead of silently discarding data. Reference/source deletion and full backup restoration retain their separate confirmations. An archived or missing source does not erase historical attempts or resolve to a different resource.

## Evidence scope

`final-feasible/` contains the final sequential local checks. `final-full-release/` contains the complete clean-dependency release attempt without offline substitution. `final-normal-origin/` records the explicit actual-browser-origin refusal. `source-integrity.json` proves protected baseline bytes and exact supplied fixtures. Earlier failures are retained as development history and are not relabeled as final passes.
