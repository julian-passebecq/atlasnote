# AtlasNote 1.2 acceptance matrix

**65 PASS / 21 BLOCKED / 0 FAIL** across the 86 supplied checklist rows. This is not a production approval.

PASS is limited to the scope in its note. Real reload, installed optional PDF engine and live PDF hosting are not simulated. Existing 1.1 acceptance IDs in test output remain historical; this matrix maps the supplied 1.2 checklist.

## A. Regression baseline

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| A01 | **BLOCKED** | `npm ci` succeeds with the final lockfile. | Registry DNS EAI_AGAIN and offline cache ENOTCACHED. Existing bundled bootstrap passes; it is not npm ci. Evidence: `final/npm-ci.log`; `final/complete-run/logs/offline-install.log` |
| A02 | **PASS** | TypeScript typecheck passes. | Main application TypeScript check; optional installed React-PDF typecheck remains blocked in section I. Evidence: `final/complete-run/logs/typecheck.log` |
| A03 | **PASS** | Existing Node suite remains green (127 baseline tests, plus new tests). | 127 supplied core cases retained; 49 new cases; 176/176 pass, zero skipped. Intentional public catalog is now 10 pages rather than 8. Evidence: `baseline/core.log`; `final/complete-run/logs/unit.log` |
| A04 | **PASS** | Release/private-content check passes; no private reference library leaks into public build. | Reviewed public-only catalog, exact review hashes, original 8 stable page IDs retained. Actual PDF Atlas bytes are absent from source/build. Evidence: `final/complete-run/logs/public-release.log`; `final/verification/public-content.json` |
| A05 | **PASS** | DOM/browser hardening suite passes after intentional selector updates. | 39/39 hardening UI and 14/14 baseline DOM cases; actual Chromium DOM with suppressed persistence. Normal-origin browser is separately BLOCKED. Evidence: `final/complete-run/hardening-ui/results.json`; `final/complete-run/baseline-dom/dom-tests.json` |
| A06 | **PASS** | Reader 1.1 behavioral contracts remain intact unless explicitly superseded below. | 18/18 reader behavior cases and existing core contracts pass for notes, Focus, Compare, native fallback, intake and private export. Does not certify real reload or integrated PDF. Evidence: `final/complete-run/reader-ui/reader-11-dom.json` |
| A07 | **PASS** | PDF preparation/authoring suite remains green. | 12/12 actual offline PDF-authoring/processing and repository-builder checks on synthetic fixtures. Evidence: `final/complete-run/pdf-authoring/pdf-authoring-tests.json` |

## B. P0 persistence

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| B01 | **BLOCKED** | Runtime normal-origin test survives reload with exact equality for notes, ratings, bookmarks, overlays, imports, assets AND `personal.session`. | Normal HTTP navigation rejected by ERR_BLOCKED_BY_ADMINISTRATOR before IndexedDB. Startup mutation fixed and two App-mount diffs are empty, but these do not certify page.reload(). Evidence: `final/complete-run/runtime/results.json`; `final/complete-run/startup-dom/` |
| B02 | **BLOCKED** | Runtime flow continues past reload and completes import-v2, idempotent reimport, backup download, fresh context, restore, restored exact state, restored reload and no-errors gates. | Every production flow row remains blocked behind real_origin. No mock, skipped equality, or partial pipeline was counted as a pass. Evidence: `final/complete-run/runtime/results.json` |
| B03 | **PASS** | No test relaxation, storage mock or browser-policy workaround is accepted. | Real-origin suite retains exact whole-session/record equality and no storage substitution. Separate DOM diagnostics explicitly do not close B01/B02. No browser-policy bypass. Evidence: `baseline/release_runtime.original.py`; `tests/release_runtime.py`; `tests/startup_diagnostic.py` |

## C. Compact chrome

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| C01 | **PASS** | Visible `Knowledge Atlas`/`LOCAL` brand block no longer consumes the top ribbon. | Routine top ribbon has mode/back/forward/search/AI export, no brand or LOCAL block. Evidence: `final/compact-verified/results.json` |
| C02 | **PASS** | Global search occupies the primary top-bar area. | Measured search width exceeds 80% on tested desktops and 55% at 390px. Evidence: `final/compact-verified/results.json` |
| C03 | **PASS** | Export-to-AI is icon-only in routine chrome with accessible label/tooltip. | Export icon has full accessible label and title tooltip. Evidence: `final/compact-verified/results.json` |
| C04 | **PASS** | Compare is icon-only in routine chrome with accessible label/tooltip. | Compare icon in rail has full accessible label and title tooltip. Evidence: `final/compact-verified/results.json` |
| C05 | **PASS** | No overflow at 1366x768, 1440x900, 1920x1080 and 390x844. | All four required viewport geometry/overflow checks pass; full screenshots included. Evidence: `final/compact-verified/results.json` |
| C06 | **PASS** | Context drawer overlays instead of shrinking the reader canvas. | Exact reader bounding box unchanged when drawer opens; drawer overlays the canvas. Evidence: `final/compact-verified/results.json` |
| C07 | **PASS** | Opening/closing Context does not alter reading anchor, split ratio, active pane or saved history. | Whole in-memory session exactly unchanged across Context open/close; Escape returns trigger focus. Not a durable reload test. Evidence: `final/compact-verified/results.json` |

## D. Right reader rail

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| D01 | **PASS** | Rail grouping/order matches the product decisions. | Required rail order/grouping; More anchored at bottom. Evidence: `final/complete-run/hardening-ui/results.json` |
| D02 | **PASS** | Focus affects the active workspace exactly as before. | Full-viewport Focus and exact semantic anchors across note presentations, Compare and native-PDF shell. Evidence: `final/complete-run/reader-ui/reader-11-dom.json` |
| D03 | **PASS** | Reading Mode applies only to active pane/view. | Actions target active pane only; opposite pane object remains equal. Actual English DOM reflow checked. Evidence: `final/compact-verified/results.json` |
| D04 | **PASS** | Context opens the preserved Context/Outline/Remarks drawer. | Original Context/Outline/Remarks content reused in overlay, not a reduced replacement. Evidence: `final/compact-verified/results.json`; `final/complete-run/hardening-ui/results.json` |
| D05 | **PASS** | Compare opens/closes without cloning source pane. | Empty Compare thread, no cloned source view; exact active survivor on close. Evidence: `final/complete-run/hardening-ui/results.json` |
| D06 | **PASS** | Swap works only when relevant. | Swap visible only with two panes; whole pane state preserved. Evidence: `final/compact-verified/results.json` |
| D07 | **PASS** | Bookmark targets active view/page. | Bookmark targets active page/reading view in Compare. Evidence: `final/compact-verified/results.json` |
| D08 | **PASS** | Theme popover exposes exactly five themes. | Exactly the five requested choices. Evidence: `final/compact-verified/results.json` |
| D09 | **PASS** | More/Settings exposes learning-flag visibility and less-frequent actions. | More contains Home, Bookmarks, Edit, Print, flags visibility/rating and settings; hiding flags preserves rating values. Evidence: `final/compact-verified/results.json` |

## E. Compare pane identity

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| E01 | **PASS** | Pane A selected tab has blue identity. | Semantic blue Pane A selected-tab border/tint. Evidence: `final/compact-verified/compare-dual-identity.png` |
| E02 | **PASS** | Pane B selected tab has lavender identity. | Semantic lavender Pane B selected-tab border/tint. Evidence: `final/compact-verified/compare-dual-identity.png` |
| E03 | **PASS** | Tree marks Pane A page in blue. | Pane A page marker in shared canonical tree. Evidence: `final/compact-verified/compare-dual-identity.png` |
| E04 | **PASS** | Tree marks Pane B page in lavender. | Pane B marker independent of selected tree node. Evidence: `final/compact-verified/compare-dual-identity.png` |
| E05 | **PASS** | Same page in both panes gets a dual marker. | Same-page tree ownership contains a and b; both visible letter markers. Evidence: `final/compact-verified/results.json` |
| E06 | **PASS** | Active pane has a non-color-only indicator. | Active-pane text, solid border and asterisk in addition to color. Evidence: `final/compact-verified/results.json` |
| E07 | **PASS** | Behavior remains clear under all five themes. | All five themes tested with two-pane ownership and Context; screenshots reviewed. Evidence: `final/compact-verified/results.json` |
| E08 | **PASS** | Same-page Compare still preserves independent history/layout/English/PDF state. | Core/DOM independence of history, layouts, English and saved PDF view state retained. Actual integrated PDF rendering remains blocked. Evidence: `final/complete-run/logs/unit.log`; `final/complete-run/hardening-ui/results.json`; `final/compact-verified/results.json` |

## F. Themes

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| F01 | **PASS** | Fluent Blue | Rendered, selectable theme fluent. Evidence: `final/compact-verified/theme-fluent.png` |
| F02 | **PASS** | Neutral/Sage | Rendered, selectable theme neutral. Evidence: `final/compact-verified/theme-neutral.png` |
| F03 | **PASS** | Academic Paper | Rendered, selectable theme academic. Evidence: `final/compact-verified/theme-academic.png` |
| F04 | **PASS** | Soft Lavender | Rendered, selectable theme lavender. Evidence: `final/compact-verified/theme-lavender.png` |
| F05 | **PASS** | Dark Slate | Rendered, selectable theme slate. Evidence: `final/compact-verified/theme-slate.png` |
| F06 | **BLOCKED** | all persist through reload and backup/restore | All five actual backup serializer/parser round-trips pass; runtime reload remains unavailable. Conjunctive reload-and-backup criterion not claimed. Evidence: `final/complete-run/logs/unit.log`; `final/complete-run/runtime/results.json` |
| F07 | **PASS** | old backups with the original three theme values still validate | Original fluent/neutral/academic values and legacy absent libraryMode remain valid. Evidence: `final/complete-run/logs/unit.log` |
| F08 | **PASS** | text/focus contrast tests pass | Twenty tested normal/muted/accent semantic text pairs exceed 4.5:1; keyboard focus visibly indicated. Not an exhaustive WCAG audit. Evidence: `final/complete-run/reader-ui/reader-11-dom.json` |
| F09 | **PASS** | dialog, tree, collection, context drawer, tabs, PDF, Focus and Compare surfaces are all themed | Five semantic themes applied to shell/portals/collections/tree/drawer/tabs and fallback PDF chrome; original PDF artwork is not recolored. Optional engine chrome CSS updated but runtime blocked. Evidence: `final/compact-verified/results.json`; `final/complete-run/reader-ui/reader-11-dom.json` |

## G. PDF Library mode

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| G01 | **PASS** | top-left mode icon toggles Notes <-> PDF Library | Top-left accessible icon toggles notes/pdfs session mode. Evidence: `final/compact-verified/results.json` |
| G02 | **PASS** | PDF mode uses the same notebook/folder/subfolder tree | Projection reuses canonical notebook/node IDs and collection renderer. Evidence: `src/core/library-projection.ts`; `final/compact-verified/results.json` |
| G03 | **PASS** | note leaves are recursively filtered out in PDF mode | Recursive note-leaf filtering tested at depth without mutating overlays. Evidence: `final/complete-run/logs/unit.log`; `final/compact-verified/results.json` |
| G04 | **PASS** | folders/notebooks with PDF descendants remain visible | Folders/notebooks with PDF descendants retained; empty note branches hidden. Evidence: `final/complete-run/logs/unit.log`; `final/compact-verified/results.json` |
| G05 | **PASS** | PDF leaf click opens in the same tabs/panes shell | PDF leaves open existing tabs/views; no separate routing shell. Evidence: `final/compact-verified/results.json` |
| G06 | **PASS** | Focus works on PDF | PDF native-preview shell expands in Focus; no integrated-renderer claim. Evidence: `final/compact-verified/results.json` |
| G07 | **PASS** | Compare supports PDF/PDF and Note/PDF | PDF/PDF and Note/PDF native-fallback Compare shells; actual PDF.js cases in I remain blocked. Evidence: `final/complete-run/reader-ui/reader-11-dom.json` |
| G08 | **PASS** | bookmarks/remarks preserve document identity and revision rules | Stable document/revision-scoped bookmark/remark behavior retained. Evidence: `final/complete-run/hardening-ui/results.json`; `final/complete-run/logs/unit.log` |
| G09 | **PASS** | PDF presentation state is independent per view | Independent persisted view-state model remains; fallback mode controls honestly disabled. Physical rendering not certified. Evidence: `final/complete-run/logs/unit.log`; `final/compact-verified/results.json` |
| G10 | **PASS** | no second PDF dashboard/shell exists | Same tree/tabs/panes/collections; no second PDF app or storage engine. Evidence: `src/core/library-projection.ts`; `src/app/App.tsx` |

## H. pdfatlas external library

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| H01 | **PASS** | If PDF snapshot supplied, both actual PDFs are inspected and truthfully named/categorized. | Both supplied documents inspected using complete selectable text, metadata and rendered covers; content-derived titles/categories. Evidence: `pdf-inspection/catalogue.json`; `final/verification/pdf-byte-preservation.json` |
| H02 | **PASS** | SHA-256/size/page count are recorded from actual bytes. | SHA-256, exact bytes and 6/28 page counts recomputed from supplied binaries. Evidence: `final/verification/pdf-byte-preservation.json` |
| H03 | **PASS** | Stable IDs do not depend on path. | Explicit document/category IDs independent from relativePath; generated page IDs stable. Evidence: `config/pdfatlas.library.json` |
| H04 | **PASS** | Returned organized pdfatlas package includes README + manifest + category directories. | Organized ZIP contains unchanged PDFs, README, manifest and category/subcategory folders. Evidence: `pdfatlas_organized.zip`; `final/verification/pdf-byte-preservation.json` |
| H05 | **PASS** | AtlasNote bundles metadata/tree only; it does not duplicate public pdfatlas binaries into the app build. | Only reference metadata/tree in app; zero PDF Atlas pack assets. Original synthetic guide fixtures retained. Evidence: `final/verification/public-content.json` |
| H06 | **PASS** | URLs use raw GitHub form, not `blob` HTML. | Canonical HTTPS raw-content URLs, no blob HTML page links; live paths are staging and not verified hosted. Evidence: `config/pdfatlas.json`; `content/packs/pdfatlas.public/atlas-documents.json` |
| H07 | **PASS** | final coordinator can pin all URLs to one pdfatlas commit in a single well-defined place. | Single base URL config accepts final full commit; deterministic offline sync regenerates reviewed pack. Evidence: `config/pdfatlas.json`; `tools/sync-pdfatlas.mjs` |
| H08 | **PASS** | only exact `raw.githubusercontent.com/julian-passebecq/pdfatlas/...` entries bypass the arbitrary-external consent gate. | Exact repo/path + approved pack + reviewed hash, no query/credentials/redirect; bounded verified fetch. Controlled synthetic transport tests, not live hosting. Evidence: `final/complete-run/logs/unit.log`; `final/compact-verified/results.json` |
| H09 | **PASS** | arbitrary external PDFs still require consent. | Arbitrary external references retain explicit consent; spoofed/mismatched inputs fail closed. Evidence: `final/compact-verified/results.json` |

## I. Integrated PDF engine - preferred final gate

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| I01 | **BLOCKED** | online/Vite build succeeds | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I02 | **BLOCKED** | PDF.js worker metadata/version compatibility passes | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I03 | **BLOCKED** | single page | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I04 | **BLOCKED** | continuous pages | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I05 | **BLOCKED** | spread / cover-alone | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I06 | **BLOCKED** | page input | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I07 | **BLOCKED** | zoom | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I08 | **BLOCKED** | rotation | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I09 | **BLOCKED** | outline | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I10 | **BLOCKED** | selectable-text search | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I11 | **BLOCKED** | image-only no-fake-OCR behavior | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I12 | **BLOCKED** | password wrong/correct flow | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I13 | **BLOCKED** | password not persisted | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I14 | **BLOCKED** | Note/PDF Compare | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I15 | **BLOCKED** | PDF/PDF Compare | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I16 | **BLOCKED** | original download is byte-identical | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |
| I17 | **BLOCKED** | worker mismatch fails safely and can retry | Optional React-PDF/Vite dependencies unavailable; no installed integrated engine/worker. Browser-native or DOM behavior is not a substitute. Evidence: `final/complete-run/pdf-runtime/results.json`; `final/complete-run/logs/online-build.log` |

## J. Deliverable quality

| ID | Status | Criterion | Scope and evidence |
|---|---|---|---|
| J01 | **PASS** | no GitHub or Netlify operations performed | No remote repository/hosting operations performed; all inputs/outputs are local ZIP artifacts. Evidence: `docs/release-1.2/COORDINATOR.md` |
| J02 | **PASS** | source ZIP contains complete project root, not a patch-only bundle | Full root source with package/lock/config/tests/docs; excludes node_modules, dist, caches, private corpus and generated evidence. Evidence: `AtlasNote_1.2_source.zip` |
| J03 | **PASS** | build ZIP is deployable with `index.html` at root of extracted build contents | Actual compiled fallback distribution, index.html at root; Node static launcher and safety headers included. No hosted production assertion. Evidence: `AtlasNote_1.2_build.zip` |
| J04 | **PASS** | organized pdfatlas ZIP returned separately when source PDFs were supplied | Separate organized PDF ZIP, not bundled into app build. Evidence: `pdfatlas_organized.zip` |
| J05 | **PASS** | actual test logs/results included | Baseline, intermediate and final machine results, stdout/stderr and diagnostics included. Evidence: `AtlasNote_1.2_TEST_EVIDENCE.zip` |
| J06 | **PASS** | screenshots include: compact single-pane, Compare pane identity, PDF Library tree, PDF opened, context drawer, each of five themes, narrow viewport | All required screenshot categories included; PDF opened screenshot is explicitly native fallback, not integrated PDF evidence. Evidence: `final/compact-verified/`; `final/complete-run/reader-ui/` |
| J07 | **PASS** | release report lists every PASS/FAIL/BLOCKED row without hiding blockers | All supplied checklist rows individually classified, with evidence scope and blocked prerequisites. Evidence: `AtlasNote_1.2_RELEASE_REPORT.md` |

