# Release acceptance matrix - AtlasNote 1.0.1

**139 supplied rows: 103 PASS / 0 FAIL / 36 BLOCKED.**

PASS is scoped to the evidence actually run. DOM means real Chromium interactions/layout with in-memory writes, not durable IndexedDB. Core means actual source algorithms and real ZIP bytes. BLOCKED rows are dependency or runtime checks; they are not counted as passing.

Original row text is retained in `RELEASE_ACCEPTANCE_MATRIX_SUPPLIED.md`. Normal-origin and integrated engine scripts are executable gates, not simulated substitutes.

## A. Home and hierarchy

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| A01 | Create notebook. | **PASS** | DOM / in-memory UI. Notebook create/rename/archive/restore through real controls. [Evidence](evidence/hardening/ui/results.json). |
| A02 | Rename notebook. | **PASS** | DOM / in-memory UI. Notebook create/rename/archive/restore through real controls. [Evidence](evidence/hardening/ui/results.json). |
| A03 | Archive and restore notebook. | **PASS** | DOM / in-memory UI. Notebook create/rename/archive/restore through real controls. [Evidence](evidence/hardening/ui/results.json). |
| A04 | Create folder. | **PASS** | DOM / in-memory UI. Six-level folders, deep-page rename/move and folder restore. [Evidence](evidence/hardening/ui/results.json). |
| A05 | Create nested folders to at least depth 6. | **PASS** | DOM / in-memory UI. Six-level folders, deep-page rename/move and folder restore. [Evidence](evidence/hardening/ui/results.json). |
| A06 | Create page at root. | **PASS** | DOM / in-memory UI. Root page creation, same-notebook move and page restore. [Evidence](evidence/hardening/ui/results.json). |
| A07 | Create page in deep folder. | **PASS** | DOM / in-memory UI. Six-level folders, deep-page rename/move and folder restore. [Evidence](evidence/hardening/ui/results.json). |
| A08 | Rename page. | **PASS** | DOM / in-memory UI. Six-level folders, deep-page rename/move and folder restore. [Evidence](evidence/hardening/ui/results.json). |
| A09 | Move page between folders. | **PASS** | DOM / in-memory UI. Root page moved into PDF documents through the destination selector. [Evidence](evidence/hardening/ui/results.json). |
| A10 | Move page between notebooks if supported. | **PASS** | DOM / in-memory UI. Deep page moved from Reader guide into Example project. [Evidence](evidence/hardening/ui/results.json). |
| A11 | Archive and restore page/folder. | **PASS** | DOM / in-memory UI. Both folder and page archive/restore exercised through Home. [Evidence](evidence/hardening/ui/results.json). |
| A12 | Manage project groups. | **PASS** | DOM / in-memory UI. Manage project groups via Home. [Evidence](evidence/hardening/ui/results.json). |
| A13 | Reload and verify all changes. | **BLOCKED** | Normal-origin browser runtime. Administrative policy blocks normal HTTP-origin navigation before persistence/reload can run. [Evidence](evidence/hardening/runtime/results.json). |

## B. Tabs

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| B01 | Open 5 tabs in one pane. | **PASS** | DOM / in-memory UI. Five-tab cap enforced and reported; neighbor activation checked. [Evidence](evidence/hardening/ui/results.json). |
| B02 | New-tab picker starts a fresh view. | **PASS** | DOM / in-memory UI. New-tab picker and tree new tab do not inherit another view state. [Evidence](evidence/hardening/ui/results.json). |
| B03 | Ctrl/Cmd-click opens new tab. | **PASS** | DOM / in-memory UI. Both Control and Meta modifiers exercised. [Evidence](evidence/hardening/ui/results.json). |
| B04 | Middle-click opens new tab. | **PASS** | DOM / in-memory UI. Middle-click exercised on the actual tree page button. [Evidence](evidence/hardening/ui/results.json). |
| B05 | Right-click menu opens page in new tab. | **PASS** | DOM / in-memory UI. Right-click menu plus keyboard menu activation exercised. [Evidence](evidence/hardening/ui/results.json). |
| B06 | Closing active tab activates a sensible neighbor. | **PASS** | DOM / in-memory UI. Closing the fifth active tab selects the previous neighbor. [Evidence](evidence/hardening/ui/results.json). |
| B07 | Back/Forward independent by tab. | **PASS** | DOM / in-memory UI. Tab history navigation and per-pane history tested independently. [Evidence](evidence/hardening/ui/results.json). |
| B08 | Book/Continuous/Parallel state independent by tab. | **PASS** | DOM / in-memory UI. Book/Continuous/Parallel views and mixed pane layouts tested. [Evidence](evidence/hardening/ui/results.json). |
| B09 | English visibility independent by tab. | **PASS** | DOM / in-memory UI. Per-tab and per-pane English toggle isolation checked. [Evidence](evidence/hardening/ui/results.json). |
| B10 | Reading position restored after tab switches. | **PASS** | DOM / in-memory UI. Exact source anchor and tab state restored after switches. [Evidence](evidence/hardening/ui/results.json). |

## C. Book

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| C01 | Long fixture produces >5 sheets. | **PASS** | DOM / in-memory UI. Long-note guide and original fixture yield more than five measured sheets. [Evidence](evidence/hardening/ui/results.json). |
| C02 | Wide single-pane Focus displays paired consecutive sheets. | **PASS** | DOM / actual pagination geometry. Wide Focus Book forms two columns of the same source note. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| C03 | First spread is 1–2, next is 3–4. | **PASS** | DOM / in-memory UI. Actual sheet positions pair 1-2, then 3-4. [Evidence](evidence/hardening/ui/results.json). |
| C04 | One vertical scroller only. | **PASS** | DOM / in-memory UI. One Book scroller; grid/sheets/reader body do not introduce nested vertical scrolling. [Evidence](evidence/hardening/ui/results.json). |
| C05 | Short page produces one sheet without error. | **PASS** | DOM / in-memory UI. Short supplied fixture produces exactly one sheet. [Evidence](evidence/hardening/ui/results.json). |
| C06 | Resize 1366x768 -> 1920x1080 -> mobile, no lost content. | **PASS** | DOM / actual pagination geometry. 1366/1920/mobile geometry and source markers checked. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| C07 | Font-size change repaginates and restores source anchor. | **PASS** | DOM / actual pagination geometry. Font reflow restores the exact saved source block and offset. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| C08 | Paragraph source reconstructed exactly. | **PASS** | DOM / actual pagination geometry. Paragraph fragments reconstruct source text exactly. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| C09 | Code source reconstructed exactly. | **PASS** | DOM / actual pagination geometry. Code fragments reconstruct source lines exactly. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| C10 | Table rows reconstructed exactly. | **PASS** | DOM / actual pagination geometry. Table fragments reconstruct source rows exactly. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| C11 | List items reconstructed exactly. | **PASS** | DOM / actual pagination geometry. List fragments reconstruct source items exactly. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| C12 | No stranded heading at tested page endings. | **PASS** | DOM / actual pagination geometry. No stranded headings in the tested measured page endings. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| C13 | Mermaid survives cloned Book fragments. | **PASS** | DOM / actual pagination geometry. Actual Mermaid SVG survives cloned Book fragments. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| C14 | Page-break starts next virtual sheet. | **PASS** | DOM / in-memory UI. Explicit page-break block advances to a later sheet. [Evidence](evidence/hardening/ui/results.json). |
| C15 | Oversized unsplittable block provides readable fallback. | **PASS** | DOM / in-memory UI. Oversized callout links to Continuous; all 500 source tokens retained. [Evidence](evidence/hardening/ui/results.json). |

## D. Compare

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| D01 | Compare button opens pane 2. | **PASS** | DOM / in-memory UI. Top-bar Compare opens a second pane with independent view identity. [Evidence](evidence/hardening/ui/results.json). |
| D02 | Compare button clicked again closes pane 2. | **PASS** | DOM / in-memory UI. Second click closes Compare, including an empty active pane. [Evidence](evidence/hardening/ui/results.json). |
| D03 | Active pane survives top-bar close. | **PASS** | DOM / in-memory UI. Both left-active and right-active exact surviving states checked. [Evidence](evidence/hardening/ui/results.json). |
| D04 | Same page in two panes. | **PASS** | DOM / in-memory UI. Same source page opened independently in both panes. [Evidence](evidence/hardening/ui/results.json). |
| D05 | Different pages in two panes. | **PASS** | DOM / in-memory UI. Other-pane menu opens a different page without mutating the active peer. [Evidence](evidence/hardening/ui/results.json). |
| D06 | Book left + Continuous right. | **PASS** | DOM / in-memory UI. Book left / Continuous right exercised with independent scroll anchors. [Evidence](evidence/hardening/ui/results.json). |
| D07 | Parallel left + Book right. | **PASS** | DOM / in-memory UI. Parallel left / Book right exercised through the toolbar. [Evidence](evidence/hardening/ui/results.json). |
| D08 | Divider drag. | **PASS** | DOM / in-memory UI. Pointer drag moves the divider within allowed bounds. [Evidence](evidence/hardening/ui/results.json). |
| D09 | Divider keyboard arrows. | **PASS** | DOM / in-memory UI. Arrow key divider controls checked on the real separator. [Evidence](evidence/hardening/ui/results.json). |
| D10 | Swap. | **PASS** | DOM / in-memory UI. Swap exchanges pane order without losing the panes. [Evidence](evidence/hardening/ui/results.json). |
| D11 | Per-pane tabs. | **PASS** | DOM / in-memory UI. Second-pane extra tab leaves first-pane tabs unchanged. [Evidence](evidence/hardening/ui/results.json). |
| D12 | Per-pane history. | **PASS** | DOM / in-memory UI. Second-pane Back/Forward leaves first-pane history unchanged. [Evidence](evidence/hardening/ui/results.json). |
| D13 | Mobile pane switcher. | **PASS** | DOM / in-memory UI. Mobile shows one selected pane and keeps the visible survivor on close. [Evidence](evidence/hardening/ui/results.json). |
| D14 | No accidental state leakage. | **PASS** | DOM / in-memory UI. Exact peer-pane snapshots remain unchanged during other-pane operations. [Evidence](evidence/hardening/ui/results.json). |

## E. Focus

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| E01 | Focus button is immediately before Compare. | **PASS** | DOM / in-memory UI. Topbar control order asserted exactly. [Evidence](evidence/hardening/ui/results.json). |
| E02 | Focus hides full left/right panels. | **PASS** | DOM / in-memory UI. Full left and right panels hidden in Focus. [Evidence](evidence/hardening/ui/results.json). |
| E03 | Utility rails remain usable. | **PASS** | DOM / in-memory UI. Utility rails remain; Global search opens from Focus and modal focus stays trapped. [Evidence](evidence/hardening/ui/results.json). |
| E04 | Exit Focus restores exact prior sidebar state. | **PASS** | DOM / in-memory UI. All four initial sidebar-open combinations restored exactly. [Evidence](evidence/hardening/ui/results.json). |
| E05 | Escape exits Focus. | **PASS** | DOM / in-memory UI. Escape exits Focus. [Evidence](evidence/hardening/ui/results.json). |
| E06 | Book remains usable in Focus. | **PASS** | DOM / in-memory UI. Measured Book remains visible and usable in Focus. [Evidence](evidence/hardening/ui/results.json). |
| E07 | Compare remains usable in Focus. | **PASS** | DOM / in-memory UI. Compare remains open and usable when exiting Focus. [Evidence](evidence/hardening/ui/results.json). |

## F. Context, remarks, glossary

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| F01 | Contextual terms only before search. | **PASS** | DOM / in-memory UI. Only two contextual stress-page terms initially displayed. [Evidence](evidence/hardening/ui/results.json). |
| F02 | Global glossary search. | **PASS** | DOM / in-memory UI. Global definition-only token finds the unrelated glossary entry. [Evidence](evidence/hardening/ui/results.json). |
| F03 | Related pages. | **PASS** | DOM / in-memory UI. Related pages section inspected on the supplied fixture. [Evidence](evidence/hardening/ui/results.json). |
| F04 | Backlinks. | **PASS** | DOM / in-memory UI. Backlinks section inspected on the supplied fixture. [Evidence](evidence/hardening/ui/results.json). |
| F05 | Outline jump. | **PASS** | DOM / in-memory UI. Outline click sets a stable source block anchor. [Evidence](evidence/hardening/ui/results.json). |
| F06 | Folded section opens on jump. | **PASS** | DOM / in-memory UI. Previously folded section is expanded before the jump. [Evidence](evidence/hardening/ui/results.json). |
| F07 | Remark A saved to page A when rapidly switching to page B. | **PASS** | DOM / in-memory UI. Immediate A-to-B remark switching preserves the exact A key/text. [Evidence](evidence/hardening/ui/results.json). |
| F08 | Remark B saved to page B. | **PASS** | DOM / in-memory UI. Immediate A-to-B remark switching preserves the exact B key/text. [Evidence](evidence/hardening/ui/results.json). |
| F09 | PDF revision-specific remark not silently reassigned. | **PASS** | DOM / in-memory UI. Old PDF revision note remains separate; current note starts empty and saves separately. [Evidence](evidence/hardening/ui/results.json). |
| F10 | Remarks excluded from AI export by default. | **PASS** | DOM / in-memory UI. Export dialog excludes remarks by default; core export tests verify omission. [Evidence](evidence/hardening/ui/results.json). |

## G. Search

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| G01 | title | **PASS** | Core algorithms / real ZIP serialization. Synthetic title search: pagination stress. [Evidence](evidence/hardening/unit.log). |
| G02 | body | **PASS** | Core algorithms / real ZIP serialization. Synthetic body search: UniqueSearchToken_ATLAS_9472. [Evidence](evidence/hardening/unit.log). |
| G03 | code token | **PASS** | Core algorithms / real ZIP serialization. Synthetic code search: row_04. [Evidence](evidence/hardening/unit.log). |
| G04 | tags | **PASS** | Core algorithms / real ZIP serialization. Synthetic tag search: search-tag-unique-813. [Evidence](evidence/hardening/unit.log). |
| G05 | folder path | **PASS** | Core algorithms / real ZIP serialization. Synthetic deep folder search: Level 5. [Evidence](evidence/hardening/unit.log). |
| G06 | glossary label | **PASS** | Core algorithms / real ZIP serialization. Glossary label search: Glossary-only audit term. [Evidence](evidence/hardening/unit.log). |
| G07 | glossary definition | **PASS** | Core algorithms / real ZIP serialization. Glossary definition search: GlossaryDefinitionOnlyToken_7319. [Evidence](evidence/hardening/unit.log). |
| G08 | glossary translation | **PASS** | Core algorithms / real ZIP serialization. Glossary translation search: Parallellsprak (actual accented fixture tested). [Evidence](evidence/hardening/unit.log). |
| G09 | bilingual English/Norwegian | **PASS** | Core algorithms / real ZIP serialization. Separate English and Norwegian phrase searches. [Evidence](evidence/hardening/unit.log). |
| G10 | result opens in active pane | **PASS** | DOM / actual pagination geometry. Actual search UI opens its result in the active pane. [Evidence](evidence/hardening/baseline-dom/dom-tests.json). |
| G11 | new-tab search result opens separate tab | **PASS** | DOM / in-memory UI. Explicit new-tab search result creates a separate view. [Evidence](evidence/hardening/ui/results.json). |

## H. Learning state / bookmarks

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| H01 | red/orange/green/gray flag. | **PASS** | DOM / in-memory UI. All four learning-flag values tested through the select control. [Evidence](evidence/hardening/ui/results.json). |
| H02 | global hide/show flags preserves values. | **PASS** | DOM / in-memory UI. Global hide/show removes the controls without changing stored in-memory values. [Evidence](evidence/hardening/ui/results.json). |
| H03 | document bookmark. | **PASS** | DOM / in-memory UI. Tree document bookmark toggles the intended page without another page anchor. [Evidence](evidence/hardening/ui/results.json). |
| H04 | block-position bookmark. | **PASS** | DOM / in-memory UI. Scrolled source-block bookmark captures the current stable anchor. [Evidence](evidence/hardening/ui/results.json). |
| H05 | reload persistence. | **BLOCKED** | Normal-origin browser runtime. Normal-origin reload is blocked; exact in-memory and ZIP data are separately tested. [Evidence](evidence/hardening/runtime/results.json). |
| H06 | bookmark still works after source pack update with stable IDs. | **PASS** | DOM / in-memory UI. Saved bookmark opens the same stable page after synthetic source relocation. [Evidence](evidence/hardening/ui/results.json). |

## I. Import/update

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| I01 | import synthetic v1.0.0. | **BLOCKED** | Normal-origin browser runtime. Both supplied ZIPs pass the real parser/schema checks, but browser commit is not certified. [Evidence](evidence/hardening/runtime/results.json). |
| I02 | personal note/flag/bookmark added. | **PASS** | DOM / in-memory UI. Actual remark/flag/bookmark UI exercised; synthetic state also constructed for exact merge tests. [Evidence](evidence/hardening/ui/results.json). |
| I03 | import synthetic v1.1.0. | **BLOCKED** | Normal-origin browser runtime. v1.1 parser/plan/compose succeeds, but native IndexedDB commit is not certified. [Evidence](evidence/hardening/runtime/results.json). |
| I04 | source update applied. | **PASS** | Core algorithms / real ZIP serialization. Actual supplied v1.1 source summary/version/hash applied by the core composition path. [Evidence](evidence/hardening/unit.log). |
| I05 | moved page keeps ID. | **PASS** | Core algorithms / real ZIP serialization. Relocated long page keeps its page ID and remains reachable. [Evidence](evidence/hardening/unit.log). |
| I06 | personal state survives. | **BLOCKED** | Normal-origin browser runtime. Exact pure import-update retention passes; persistence across native transactions remains blocked. [Evidence](evidence/hardening/runtime/results.json). |
| I07 | v1.1 reimport idempotent. | **PASS** | Core algorithms / real ZIP serialization. v1.1 reimport leaves source and local state unchanged without duplicate pages. [Evidence](evidence/hardening/unit.log). |
| I08 | same-version different bytes blocked. | **PASS** | Core algorithms / real ZIP serialization. Changed equal-version source conflicts without mutating the workspace. [Evidence](evidence/hardening/unit.log). |
| I09 | older version blocked/ignored. | **PASS** | Core algorithms / real ZIP serialization. Older synthetic source revision is blocked. [Evidence](evidence/hardening/unit.log). |
| I10 | missing stable page IDs never treated as deletion without explicit semantics. | **PASS** | Core algorithms / real ZIP serialization. Omitted stable IDs produce explicit conflicts instead of deletion. [Evidence](evidence/hardening/unit.log). |
| I11 | local source edit conflict requires rebase/explicit resolution. | **PASS** | Core algorithms / real ZIP serialization. Locally edited source requires explicit rebase/resolution. [Evidence](evidence/hardening/unit.log). |

## J. Backup/restore

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| J01 | actual backup download. | **BLOCKED** | Normal-origin browser runtime. Actual browser download is attempted only by the blocked normal-origin suite. [Evidence](evidence/hardening/runtime/results.json). |
| J02 | ZIP opens. | **PASS** | Core algorithms / real ZIP serialization. Real generated ZIP passes CRC/checksum/bounded decompression and backup parsing. [Evidence](evidence/hardening/unit.log). |
| J03 | fresh browser context. | **BLOCKED** | Normal-origin browser runtime. Independent fresh browser context is part of the blocked production suite. [Evidence](evidence/hardening/runtime/results.json). |
| J04 | restore succeeds. | **BLOCKED** | Normal-origin browser runtime. Native restore commit not certified; pure verified parsing succeeds separately. [Evidence](evidence/hardening/runtime/results.json). |
| J05 | remarks exact. | **BLOCKED** | Normal-origin browser runtime. Core ZIP round trip preserves exact remarks; fresh-context persistence remains blocked. [Evidence](evidence/hardening/runtime/results.json). |
| J06 | bookmarks exact. | **BLOCKED** | Normal-origin browser runtime. Core ZIP round trip preserves exact bookmarks; fresh-context persistence remains blocked. [Evidence](evidence/hardening/runtime/results.json). |
| J07 | flags exact. | **BLOCKED** | Normal-origin browser runtime. Core ZIP round trip preserves exact flags; fresh-context persistence remains blocked. [Evidence](evidence/hardening/runtime/results.json). |
| J08 | tabs/session as specified. | **BLOCKED** | Normal-origin browser runtime. Core ZIP round trip preserves exact session; fresh-context persistence remains blocked. [Evidence](evidence/hardening/runtime/results.json). |
| J09 | imported packs retained. | **BLOCKED** | Normal-origin browser runtime. Core ZIP includes selected source snapshots; fresh-context persistence remains blocked. [Evidence](evidence/hardening/runtime/results.json). |
| J10 | local page retained. | **BLOCKED** | Normal-origin browser runtime. Core ZIP includes local pages; fresh-context persistence remains blocked. [Evidence](evidence/hardening/runtime/results.json). |
| J11 | local PDF bytes byte-identical. | **BLOCKED** | Normal-origin browser runtime. Core ZIP preserves exact PDF bytes/SHA-256; fresh-context persisted bytes remain blocked. [Evidence](evidence/hardening/runtime/results.json). |
| J12 | missing attachment dependency blocks incomplete backup. | **PASS** | Core algorithms / real ZIP serialization. Missing pack/local PDF dependencies and corrupt required/orphan assets reject before ZIP offer. [Evidence](evidence/hardening/unit.log). |

## K. PDF

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| K01 | local PDF import into chosen folder. | **BLOCKED** | Normal-origin browser runtime. Prepared actual UI import into a selected folder; native browser entry blocked. [Evidence](evidence/hardening/runtime/results.json). |
| K02 | local bytes persist after reload. | **BLOCKED** | Normal-origin browser runtime. Prepared exact byte/hash comparison after reload; native browser entry blocked. [Evidence](evidence/hardening/runtime/results.json). |
| K03 | integrated engine actually loads. | **BLOCKED** | Installed integrated PDF runtime. React-PDF and Vite unavailable; no integrated loader/canvas claim. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K04 | worker version check. | **BLOCKED** | Installed integrated PDF runtime. Actual matching worker/version and mismatch recovery tests prepared; dependencies unavailable. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K05 | single page. | **BLOCKED** | Installed integrated PDF runtime. Integrated physical single-page case awaits the real engine. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K06 | continuous. | **BLOCKED** | Installed integrated PDF runtime. Integrated continuous-page case awaits the real engine. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K07 | two-page physical spread. | **BLOCKED** | Installed integrated PDF runtime. Physical spread helper exhaustively tested; actual rendered spreads not certified. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K08 | cover-alone. | **BLOCKED** | Installed integrated PDF runtime. Cover-aware helper tested for odd/even counts; actual renderer case not certified. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K09 | page input. | **BLOCKED** | Installed integrated PDF runtime. Actual physical-page input case prepared, not executed. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K10 | zoom. | **BLOCKED** | Installed integrated PDF runtime. Actual canvas-size zoom case prepared, not executed. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K11 | rotate. | **BLOCKED** | Installed integrated PDF runtime. Intrinsic plus viewer rotation case prepared, not executed. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K12 | outline. | **BLOCKED** | Installed integrated PDF runtime. Actual PDF outline case prepared, not executed. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K13 | searchable selectable text. | **BLOCKED** | Installed integrated PDF runtime. Real text-layer selection/search case prepared, not executed. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K14 | image-only reports no selectable text; no fake OCR. | **BLOCKED** | Installed integrated PDF runtime. Raster-only fixture verified without OCR; engine no-text message case not executed. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K15 | password PDF unlock + bad-password retry. | **BLOCKED** | Installed integrated PDF runtime. Wrong-password and correct-password retry scenario prepared, not executed. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K16 | password never persisted. | **BLOCKED** | Installed integrated PDF runtime. Password field remains transient in source; real database inspection not executed. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K17 | note + PDF Compare. | **BLOCKED** | Installed integrated PDF runtime. Note/browser-fallback Compare UI passes; integrated note/PDF Compare remains blocked. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K18 | PDF + PDF Compare. | **BLOCKED** | Installed integrated PDF runtime. Integrated PDF/PDF independent-page Compare case prepared, not executed. [Evidence](evidence/hardening/pdf-runtime/results.json). |
| K19 | original PDF open/download. | **BLOCKED** | Normal-origin browser runtime. Original open/download links present in fallback UI; actual byte-download browser gate blocked. [Evidence](evidence/hardening/runtime/results.json). |

## L. Security / release

| ID | Requirement | Status | Executed scope and evidence |
| --- | --- | --- | --- |
| L01 | no private corpus in public `dist`. | **PASS** | Public build / release scan. Public dist contains only the two reviewed generic packs: 8 pages, 1 term. [Evidence](evidence/hardening/release-check.log). |
| L02 | release allowlist/hash check. | **PASS** | Public build / release scan. Publication allowlist and exact semantic review hashes validated. [Evidence](evidence/hardening/release-check.log). |
| L03 | no raw notebooks. | **PASS** | Public build / release scan. Release scan excludes raw notebooks, private library files and font binaries. [Evidence](evidence/hardening/release-check.log). |
| L04 | active SVG rejected. | **PASS** | Core algorithms / real ZIP serialization. Active SVG/script/events/foreignObject/remote references rejected in tests. [Evidence](evidence/hardening/unit.log). |
| L05 | path traversal rejected. | **PASS** | Core algorithms / real ZIP serialization. Unsafe paths and ZIP traversal rejected before extraction. [Evidence](evidence/hardening/unit.log). |
| L06 | ZIP bomb limits. | **PASS** | Core algorithms / real ZIP serialization. Entry count, expansion size and compression-ratio guards tested. [Evidence](evidence/hardening/unit.log). |
| L07 | no executable notebook imports. | **PASS** | Core algorithms / real ZIP serialization. Notebook/executable imports quarantined, not run. [Evidence](evidence/hardening/unit.log). |
| L08 | dependency/license audit. | **BLOCKED** | Dependency/license verification. 113 vendor hashes and installed lock versions pass; complete transitive/license/vulnerability audit unavailable. [Evidence](evidence/hardening/dependency-inventory.json). |
| L09 | Netlify headers verified. | **BLOCKED** | Live hosted runtime verification. dist/_headers and actual localhost headers pass; no live Netlify response verification. [Evidence](evidence/hardening/headers.json). |
| L10 | accessibility smoke. | **PASS** | DOM / in-memory UI. Keyboard menu navigation, focus return, modal focus containment and divider keys exercised. [Evidence](evidence/hardening/ui/results.json). |
| L11 | no uncaught errors. | **PASS** | DOM / in-memory UI. No uncaught JavaScript errors in the executed DOM/UI suites; blocked runtimes not implied. [Evidence](evidence/hardening/ui/results.json). |

