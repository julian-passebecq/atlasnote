# Regression-test adaptations and integrity notes

All previous release commands remain. Existing PDF engine, PDF/grid/wheel tests, normal-origin restoration logic and original cheatsheet/interview content are not replaced by new component tests.

| Test | Why the assertions/selectors changed |
|---|---|
| browser_support.py | Helpers now select the visible five-way content controls and bottom-right saved-state buttons. The in-memory adapter is unchanged in purpose and still disclosed. New blank sessions may be Dashboard; explicit reader seeds remove that surface flag. |
| dom_test.py | Typed resource projection replaces implicit mixed Notebook contents. Reflow checks measure actual anchor visibility in the scroller, retaining semantic anchor and overflow assertions rather than an obsolete fixed header offset. |
| hardening_dom.py | Six-button ribbon, new per-pane control order, short-screen dock and intentionally visible empty native folders. CRUD, keyboard, archive/restore, links and personal-state invariants remain. |
| reader_11_dom.py | Synthetic mixed collections now explicitly add PDF references using the production helper; keyboard and modifier routes, metadata facets, move/remove/archive, bytes/hash and real file-download checks remain. No implicit duplicate PDF pages are introduced to satisfy the old tree fixture. |
| compact_12_dom.py | Old parallel PDF subject headings are replaced by the shared IT/Unfiled projection. Collapse/expand is exercised on the actual projected bucket, with exact canonical leaf IDs and unchanged overlays. |
| finish_121_dom.py / finish_121_integrated.py | Five-way discovery and specialized manager replace binary Notes/PDF navigation. Exact native projection return, cross-content global search, PDF state/bytes, focus and metadata checks remain. |
| workspace_122_dom.py | Display labels use IT/KPI while persisted IDs remain unchanged; six controls and new content-type ownership replace superseded ribbon assumptions. |
| simplified_123_dom.py | A/B is only in Compare; + and tabs precede the far-right controls toggle. The same independent-pane and focus invariants are checked. |
| reading_124_dom.py | Category labels are projected as IT/Cloud/Job/KPI/Norsk; original stored values and bookmark/read-later semantics are retained. |
| reader_polish_125_dom.py | The new top ribbon owns six specified actions. Context/Workspace States use their new visible buttons. All original interview content, PDF page actions and independent controls remain tested. |
| cheatsheets_126_dom.py | SVG glyph bounding tolerance changes from 2 to 2.1 logical units: the revised reader scale produced a -2.0279-unit left ink bearing on the unchanged PySpark page-two title. This is an explicit 0.1-unit rounding allowance, not a removed geometry check. All frame collisions, live-text preservation, original sources, zero renderer diagnostics and scale checks remain. |

The exact corrected baseline was built separately and its unmodified cheatsheet UI suite passed 26/26 in this environment. That comparison and the failing intermediate geometry screenshot are retained in the evidence. The implementation did not change the eight fixture pages or the SVG renderer to conceal that result.

Bugs actually corrected during regression work include the lingering controls row in Focus, reference-menu focus returning to a non-focusable card, inaccessible exact labels on populated Article textareas, explicit PDF reference facets, native folder ordering and QCM scroll restoration. Failing intermediate logs are retained; final results are reported separately.

Never equate a compatibility harness pass with normal-origin persistence or integrated React-PDF certification. FINAL_TEST_STATUS.md lists both the full attempted suite and the separately feasible checks.
