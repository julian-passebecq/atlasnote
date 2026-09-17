# AtlasNote V2 stabilization - requirements coverage

Scope authority: `00_START_HERE/PRO_IMPROVEMENT_PASS.md` from the improvement handoff. This matrix covers that bounded pass, not a redesign of the previous V2 handoff. The previous V2 coverage report is retained under `docs/stabilization/historical-v2-delivery/`.

**Functional implementation is delivered; production acceptance remains open where actual-origin verification or dependency review is blocked.** UI case numbers refer to the 31 named checks in `sealed-final/ui/results.json` in the evidence ZIP. No blocked case is counted as passing.

| Handoff section | Requirement | Status | Implementation | Evidence / qualification |
| --- | --- | --- | --- | --- |
| 1 | PDF Compare/save/restore blocker | Implemented and verified | tests/grid_124_dom.py; docs/stabilization/PDF_RESTORE_DIAGNOSIS.md | Actual grid 12/12, component 11/11, wheel 11/11; stage-labelled compare-state.json; engine unchanged. |
| 2 | Frozen V2 architecture | Preserved | src/core, src/references, src/cheatsheets; existing storage validators | 114 protected files checked byte-identical; all 63 reference unit cases and 15 reference UI cases pass. |
| 3 | Five compact Dashboard tables + true toggle | Implemented and verified | src/content-hub/Dashboard.tsx; surfaces.ts; App.tsx | UI 2-4 and 26-29: five tables, three rows, no fake records, correct plus targets, subject/folder/completed controls; exact Compare return. |
| 4 | Top-left ownership | Implemented and verified | App.tsx sidebar-navigation | UI 1: Sidebar/Search/Back/Forward/Capture/Dashboard/Compare; preserved active-tab history. |
| 5 | Right rail ownership | Implemented and verified | ReaderRail.tsx | UI 1 and legacy Focus/Compare tests: Focus above Context, Swap only Compare, plus before slot1, no Capture/Dashboard duplicates. |
| 6 | Directional A/B collapsed strips | Implemented and verified | App.tsx; stabilization.css | UI19 and workspace_122_dom.py: directional labels, 44px desktop/36px mobile, full-height hit area, exact preserved tab/history state. |
| 7 | Shared typed resource drag/drop | Implemented and verified | stabilization/resource-drag.ts; Tree.tsx; LibraryManager.tsx | UI8/10/12/14 select all4 types; UI16 references not copies; UI17 malformed atomic; UI18 keyboard; unit size/schema/target validation. |
| 8 | Manager layout + compact fallback | Implemented and verified | LibraryManager.tsx; stabilization.css | Add to Notebook left, resource workspace right, explicit empty drop state, collapsed Choose resource, selected resource retained; four viewport checks. |
| 9 | Visual/JSON source editing | Implemented and verified | stabilization/resource-source.ts; LibraryManager.tsx | UI9/11/13/15 + focused unit cases: staging, Copy/Export/Import/Apply, no mutation on malformed/stale/invalid source, stable IDs and exact links; PDF metadata only. |
| 10 | Quick Capture three-row floor | Implemented and verified | stabilization/capture-draft.ts; Editors.tsx | UI5: exactly3initial, min3/max5, blank-row omission; Link/Task/Note/Article/Transcript retained. |
| 11 | Capture -> Article/Transcript -> Back | Implemented and verified in memory | App.tsx workflow state; Editors.tsx | UI6 preserves rows/mode/taxonomy/context/hidden fields and Article draft; Cancel saves no partial capture; normal-origin path blocked. |
| 12 | Content-first Article editor | Implemented and verified | Editors.tsx | UI6/default fields; Advanced/JSON keeps secondary metadata and structured source; old30content-hub UI checks retained. |
| 13 | Theme regression/live reload | DOM verified; live/reload BLOCKED | Existing theme engine unchanged; stabilization.css; stabilization_v2_runtime.py | UI20-25: five distinct themes and exact theme-only change; all new Dark Slate surfaces. Local+hosted initial navigation denied; no claim of cleared live persistence. |
| 14 | Optional deterministic demo/QCM | Implemented and verified in memory | stabilization/demo.ts; database.ts shared transaction | UI7/30 + unit cleanup/backup tests:3Articles,3QCMs/7explained questions,3wired cheatsheets,PDFs,allcapturetypes,bookmarks/later,overlappingconcepts,done/archive; no autoload; protecteduserwork retained. |
| 15 | Preserve existing V2 workflows | Preserved and tested; durability pending | Original readers, reference model, workspace and backup boundaries | 206 existing DOM checks +34 PDF component checks +705 full unit cases +12authoring;9legacy origin gates blocked. |
| 16 | Consistent V2/2.0.0 branding | Implemented | App.tsx settings/about; package.json stays2.0.0 | No stale1.2.x branding in user-visible TSX; historical changelogs retain historical versions. |
| 17 | Required release and focused tests | Executed with explicit blockers | All existing scripts; two new stabilization commands; ci.yml; run-release.mjs | FINAL_TEST_STATUS lists allcommands;705units,31newUI,206existingUI,34realPDF. Clean install/audit/origin blocks are not waived. |
| 18 | Keyboard/accessibility/responsive | Implemented and verified in harness | Tree.tsx; LibraryManager.tsx; Editors.tsx; styles; existing dialog focus handling | UI18keyboardalternatives; UI26-29at390/1366/1440/1920; existingEscape/focus/Context/Compare assertions retained. |
| 19 | Scope discipline | Preserved | No dependency/lock/schema/renderer replacement | No cloud/auth/sync/server/AI backend; no speculative reference architecture; changed files limited to required UI, guards, demo, tests/docs. |
| 20 | Git/delivery boundaries | No remote writes; source ZIP delivery | WORKSPACE_READY_FOR_GITHUB.md; external manifest | Requiredfcsource tree proven; movedf366head reported+diagnosticdelta retained; bounded local commits onv2manualupload; reconstructed history clearly disclosed; no merge/deploy. |
| 21 | Final report and complete artifacts | Delivered | External delivery report +manifest; sourceZIP;evidenceZIP;requiredrootdocs | Exact final local commit/tree/hash supplied externally; no recycled pass/fail claims or missing production verification hidden. |

## Source editing safety

The four manager modes share bounded parsing and typed target preflight. Invalid input does not partially modify source or personal state. Source identity is checked against the currently effective source to reject stale editor writes. The exact-target inventory includes canonical source links, references, bookmarks, context targets and retained reader/saved snapshots. A previously exact target must stay exact; retained QCM attempt question/option identities also stay valid. Missing targets that were already missing are not silently repaired.

PDF export deep-clones metadata, never embeds bytes, and uses the effective overlaid title. PDF category IDs receive an explicit preservation check without changing the original semantic resolver. Unit tests cover all these boundaries.

## Demo safety

The demo is deterministic and explicit. Repeated loads preserve existing values. Cleanup is conservative, removing only unchanged demo-owned records; user edits, non-demo references, retained attempts and current/saved reader targets protect records and needed dependencies. All changes use the existing stores with atomic validation/write. The source ZIP contains only synthetic/public demo definitions, not the user's private library.

## Optional item deliberately not added

Section7C's optional extra upper-right drop surface is unnecessary: the central management drop area plus existing reading/source actions cover the required workflow. No duplicate action area or parallel content representation was added.

## Outstanding acceptance evidence

Live theme reload, actual-origin app navigation, durable reload/backup restoration and clean registry installation cannot be certified from the current environment. Exact commands, errors and scope limitations are documented in FINAL_TEST_STATUS.md. These are release blockers, not undisclosed missing functionality or passing tests.
