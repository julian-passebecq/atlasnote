# V2 test changes and verification scope

## Inherited 1.2.7 PDF component prerequisite

The handoff identifies PR #12 / source commit `0c4455f8ca25eb16c882287a4dc61ddfc32f5b89`, remote run `35141263687`, failing at `test:pdf:component` after the earlier build/UI gates passed. This is historical source evidence, not a new successful V2 run.

The local integrated-harness reset was inspected. `blankWorkspace()` starts on the Dashboard surface. The old reset set `screen = 'reader'` and installed a PDF view but left `session.surface = 'dashboard'`; the actual App therefore kept rendering Dashboard. The reset now explicitly removes that surface override. It expands the active `projectLibrary` projection, rather than trying to expand absent nodes from the unprojected Notebook tree. This fixes test prerequisites without replacing the PDF engine or relaxing canvas/text/physical-page assertions.

This environment could not install the complete integrated dependencies; consequently the original native component failure was **not reproduced to completion locally**, and the corrected actual React-PDF suite is **not claimed as passed**. The source-level defect is fixed, but Phase 0 native clearance remains an explicit release gate.

## Real PDF wheel assertions

The production change no longer swallows legitimate inner-page movement merely because a prior physical turn's pager remains latched. Pending restore is still protected. A separate latch prevents a momentum burst from turning several physical groups. True top/bottom measurements gate turns; a large wheel event reaching the edge cannot also trigger a turn in that same event.

`tests/engine_123_dom.py` retains reverse physical-page/canvas assertions, allowing an additional deliberate wheel tick when actual host padding must first scroll to zero.

`tests/wheel_125_dom.py` retains Single/Spread/Grid progression, reverse bottom restore, Compare independence and real canvas assertions. Its old demand that every post-turn momentum tick leave scrollTop under 40 pixels is deliberately no longer the desired behavior: the user now requires natural movement inside a rendered tall page. The test instead retains initial top-restore checks, checks no multiple-page skip during the burst and valid scroll bounds, then proves a new gesture can scroll.

Additional tests measure actual native inner movement in zoomed tall Single, Spread and Grid; reach the boundary with a large wheel event without changing the physical page; then require continued intent to turn and render the next canvas. Another real-UI case checks first-open Spread, narrow one-page rendering without preference loss and retention of a chosen Single mode across Dashboard. No script scrollTop assignment or page-number-only transition substitutes for wheel input.

These integrated cases were added but could not be cleared locally. Missing-harness results must be reported as blocked, not passed.

## New reference tests

- `tests/references-v2.test.mjs`: pure resolver, identities, state mutations, concept safety, backlink derivation, stale atomic suggestion review, bounded exports, Explorer state and reading destinations, shared/checkpoint boundaries, PDF defaults and wheel guards.
- `tests/references_v2_dom.py`: visible UI actions against the compiled compatibility App, exact Notebook/Article/QCM/Cheatsheet targets, conceptual linking, virtual Lens, Explorer, actual downloaded review and backup payloads, reviewed import, pane header ownership/ARIA and mobile overflow.
- `tests/references_v2_runtime.py`: normal-origin production entry, canonical versus durable IndexedDB, reload, five-workspace checkpoint behavior, actual download, fresh browser-context restore, restored exact references and actual PDF canvas/wheel. No intercepted requests, fake storage or about:blank fallback is used in this suite.

The legacy simplified-UI and reader-polish tests asserted the old pane-header child positions. It now requires the new persistent shortcut group between tabs and the detailed-toolbar toggle for a loaded Notebook, including visible Book/Mode controls while the details are hidden. An empty second pane must still omit irrelevant layout controls. Navigation order and independent-pane/swap/state assertions are retained. Its initial failures are retained separately.

The legacy finish-UI and reader-polish metadata checks asserted an exhaustive Context tab list. That list is extended by the new References tab in its actual position; all five old tabs, rights/hash/byte-size metadata, original download action, and PDF study-outline assertions remain required. Its first V2 run failure is retained, and the corrected assertion is rerun.

Existing Dashboard/QCM/Article and cheatsheet sources/tests are retained. The established about:blank component harness intentionally suppresses storage writes; it is a supported diagnostic route, **not** durable storage evidence. Native suites use the actual entry and must pass separately.

The release runner retains all 39 prior commands and adds three reference commands, for 42 total. A diagnostic per-gate timeout was used for the recorded full attempt; no blocked/failed gate was reclassified as successful. Refer to FINAL_TEST_STATUS.md for exact final counts and evidence paths.

## Bookmark regression caught and corrected

The first regression run found that applying new missing-anchor parent fallback in the global target router changed the old bookmarked-deleted-sheet behavior. That production regression was fixed, not hidden by changing the bookmark test. Semantic reference views/action menus explicitly opt into warning-bearing parent fallback. Existing bookmark and Read Later routing keeps the original exact-unavailable behavior and retains saved entries. The original native cheatsheet browser assertion remains unchanged and is rerun.

The added deleted-sheet unit case initially exposed shared mutable test fixture data: a prior reordering case changed the reused built catalogue. The V2 fixture now deep-clones the bundled catalogue per test. The assertions were not weakened; the isolated reference unit suite passes all 63 cases, including strict saved-target versus warned semantic-parent behavior.
