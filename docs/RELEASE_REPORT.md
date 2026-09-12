# AtlasNote 1.2 - Release report

Date: 12 September 2026. Delivered as local artifacts only.

## Decision

**IMPLEMENTATION CANDIDATE - NOT PRODUCTION-CERTIFIED.** The compact reader/PDF-library implementation, organized library and working native-fallback build are delivered. There are **no failing executable gates** in the final complete run, but the release cannot be called fully validated: normal-origin persistence testing, complete dependency installation, integrated PDF.js runtime and final public-library hosting/pinning remain BLOCKED.

The 86 supplied checklist rows are individually mapped below: **65 PASS, 21 BLOCKED, 0 FAIL**. The cohesive gate runner has **17 PASS and 7 BLOCKED** commands; these are command-level counts, not checklist counts or a blended test total. The provided source is the full implemented app, not another handoff prompt or patch-only bundle.

## Source provenance and environment

The authoritative input is `atlasnote-release-atlasnote-1.1-v5-final.zip`, supplied as branch `release/atlasnote-1.1-v5-final`, head `c44b052e19c2012f62fe0f5a9a1b9960286fbfce`. This is supplied provenance, not a newly fetched remote verification. No older source was substituted. The 1.2 handoff and master prompt governed the bounded pass. No GitHub or Netlify tool, repository write, branch, tag, pull request, deployment or remote CI operation was used.

Local tools: Node 22.16.0; npm 10.9.2; TypeScript 5.8.3; Python 3.13.5; Chromium 144.0.7559.96. Package-registry DNS returned `EAI_AGAIN`; cache-only installation returned `ENOTCACHED`. The existing offline bootstrap supplied the checked-in JSZip/Prism entry points and globally available compiler. This is explicitly **not** a complete successful `npm ci` or installed transitive-dependency audit.

Normal HTTP browser navigation returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. No Chromium policy workaround, fake HTTP origin or substituted IndexedDB was used to claim a release-gate pass. Actual DOM/layout tests use the existing permitted `about:blank` harness; persistence writes are suppressed. The reader intake and synthetic external-fetch checks disclose in-memory adapters and a test-only Python SHA bridge where the opaque origin lacks secure-context crypto.

Input SHA-256 values:

| Input | SHA-256 |
|---|---|
| `AtlasNote_1.2_Pro_Handoff.zip` | `e9380541930d79e87f34b6a97c5e33967add328a8120224e1d956e6a1c113a97` |
| `AtlasNote_1.2_PRO_MASTER_PROMPT.md` | `2e90aa03e4153c88558607f00e24bd4d93219572f5067f7c344157935e56713d` |
| `atlasnote-release-atlasnote-1.1-v5-final.zip` | `94593e971ff84198748e14f0d1895ceeff3c8dc8566bb4f707f960b052ffc160` |
| `pdfatlas-main.zip` | `ea2c63b33d4e59bc3cc481a6f541d833a42b731f6e8b9321bf1f88eaa521ed68` |

## Implemented changes

### Startup hydration, not a second navigation

A restored session can have the last-opened page in the left pane or a previous tab/history entry while the active right Compare pane is deliberately empty. Replaying the saved hash through `openPage()` during startup creates a new view in that empty pane. The pure startup-route predicate now recognizes an already-owned page/collection route and leaves the durable session untouched. Genuinely new deep links still open; later `hashchange` events remain normal navigation. No session reset, architecture replacement, normalization of expected state or relaxed equality was used.

The actual App-mount diagnostic reproduced this **twice before the change**. Both structural diffs showed `session.panes[1].active` changing from an empty string to a new view ID and `session.panes[1].views.length` changing from 0 to 1. Complete before/after JSON is retained in `baseline/startup-dom/`. After the fix, **both repeated complete session diffs are empty**, in `final/complete-run/startup-dom/`; the delivered diagnostic fails by default if any difference exists.

This demonstrates and tests the startup mutation, **not an actual successful `page.reload()` on a normal origin**. Both original normal-origin attempts and the final release runtime stopped at the policy restriction. A true pre/post-reload diff proving the whole import/backup/restore flow could not be obtained here; that requested evidence remains BLOCKED. The production test now writes full before/after session JSON and structural diffs when it can execute, and retains exact equality for session, notes, ratings, bookmarks, overlays, imports and local assets.

Startup interpretation: if the initial URL names an already-owned page with a different/old block anchor, hydration preserves the durable session rather than overriding it. A subsequent explicit link remains navigation. This tradeoff is recorded for coordinator review rather than hidden in a normalization layer.

### Compact shell and Context overlay

The top ribbon contains mode, Back/Forward, a dominant Search control and icon-only AI export. Routine Knowledge Atlas/LOCAL branding and visible Compare text are removed. The old persistent per-pane controls and left utility rail are replaced by the shared right reader rail in the requested order. Home, Bookmarks, Edit, Print and learning-flag visibility/rating are in More / Settings. Existing saved rating values remain when hidden.

Context is a non-modal overlay reusing Context/Outline/Remarks. It does not consume reader width or modify the session. Escape restores trigger focus; outside click dismisses; Context and rail popovers are mutually exclusive. The rail is 44 px wide; the top bar is 50 px high. Geometry tests pass at 1366x768, 1440x900, 1920x1080 and 390x844, with no viewport overflow. No Context-width shrink is measured.

Reading-mode and English actions target only the active view. Notes retain Continuous/Book/Parallel; Focus remains a full-viewport workspace mode and Compare preserves empty-thread creation, exact survivor, independent history and swap behavior.

### Pane identity and five themes

Blue Pane A and lavender Pane B tokens drive selected tabs and simultaneous tree ownership. A shared page shows both A/B markers. A visible active label, solid border and asterisk prevent dependence on color alone.

Exactly Fluent Blue (`fluent`), Neutral/Sage (`neutral`), Academic Paper (`academic`), Soft Lavender (`lavender`) and Dark Slate (`slate`) are selectable. Types, validation, backups and CSS include all five; old three-theme backups remain valid. All five actual backup serializer/parser round-trips pass. Real browser reload is still a separate blocked gate.

Twenty tested text/muted/accent semantic contrast pairs exceed 4.5:1; the smallest measured ratio is 5.085:1. Keyboard focus is visibly indicated. This is not an exhaustive accessibility certification. Tree, collections, drawer, dialogs, tabs, Focus, Compare and native-PDF chrome receive theme tokens. Original PDF artwork is not inverted/recolored.

### One PDF Library, not a second application

PDF Library mode recursively filters the existing canonical tree: note leaves and empty note branches hide; folders/notebooks containing PDFs remain. The same IDs, tree, collection facets, tabs, pane history and reader shell are used. Notes mode retains the original mixed workspace. Switching modes does not rewrite overlays or delete content.

Single/Continuous/Spread are contextual PDF choices, but remain disabled with an explicit explanation in the shipped native-fallback build. No fake control of native browser page/zoom/search is represented as integrated support. PDF/PDF and Note/PDF shell/Focus behavior passes the existing DOM tests; actual integrated rendering is not certified.

### Reviewed external references and explicit private copies

`config/pdfatlas.library.json` supplies the inspected metadata. The offline generator validates path-independent IDs, category hierarchy, safe relative paths, SHA-256, byte/page counts, language and conservative rights. It regenerates only the `pdfatlas.public` pack and its explicitly reviewed publication hash. The app bundles no actual PDF Atlas binary.

The public-reference trust exception is narrow: exact HTTPS raw-content host/repository/library path, main or full commit, approved pack identity and reviewed SHA; no credentials, query, fragment or redirects. Credential-free/no-referrer, bounded fetch checks the byte count, PDF signature and SHA before making a temporary object URL. Arbitrary external references retain explicit consent. Synthetic controlled transport tests cover actual opening, mismatch rejection and consent; live remote files were not requested or verified.

Reference-only metadata publication requires an explicit `metadataOnlyReferences: true` review entry, public visibility, HTTPS source, no asset key, an empty asset list and matching semantic hash. Reference-only binary publication is still rejected; no false author-created or permission rights were assigned to the user's documents.

An explicitly imported private offline copy is now allowed even when a matching external metadata reference already exists. Only actual local/bundled bytes participate in SHA deduplication. The remote reference is not overwritten, and genuine local duplicates still reuse the existing document. This closes a concrete metadata-versus-asset integration defect discovered during the pass.

## Organized PDF library

Both actual supplied PDFs were examined using metadata, full selectable text and rendered cover images. Category: **Data Engineering / Apache Spark**. Numeric source filenames were not used to invent categories. Descriptive human titles are distinguished from printed cover titles in the manifest; missing author/title metadata and unestablished redistribution licences are explicitly recorded.

| Descriptive title | Pages | Exact bytes | Original file | Organized file |
|---|---:|---:|---|---|
| Apache Spark: 30 concepts | 6 | 2,548,426 | `1788785230477.pdf` | `library/data-engineering/apache-spark/apache-spark-30-concepts.pdf` |
| PySpark and Pandas: DataFrame guide | 28 | 5,912,749 | `1788834725906.pdf` | `library/data-engineering/apache-spark/pyspark-pandas-dataframe-guide.pdf` |

SHA-256:
- `doc.pdfatlas.spark-concepts`: `b6761e0907cb28ff660936c79ad2a2dcafd500cc01c5fa5a613470396a0af095`
- `doc.pdfatlas.pyspark-pandas`: `15f7be6e6970a77ddfc70be4cf8a9418c03445bf82937482b2a78ee5348b65c2`

Both organized files are **byte-for-byte identical** to their supplied originals; no compression, PDF rewriting or content alteration occurred. The separate organized ZIP contains the manifest, README and nested category directories. `final/verification/pdf-byte-preservation.json` records repeat verification. Returning these supplied bytes does not establish public-hosting permission.

`config/pdfatlas.json` centralizes the raw base URL. It currently uses the organized paths under **staging `main`**. Those new paths are not claimed to be live. The coordinator must review publication rights, upload the organized tree, replace `main` with the final 40-character commit in that one file, then run `npm run pdfatlas:sync` and rebuild/test. Until then, clicking an unavailable reference can show the honest fetch error. Local private import does not depend on those remote paths.

## PDF engine status

`src/online/PdfEngine.tsx` matches the supplied source **byte-for-byte**; its SHA is recorded in `final/verification/engine-preservation.json`. The existing React-PDF 10.5.0 / PDF.js 5.4.296 pairing and worker/resource checks were not replaced with another viewer. Only optional engine chrome CSS was extended for semantic themes.

The optional dependency installation is unavailable, so `typecheck:online`, `build:vite` and all **17 integrated engine acceptance rows** remain BLOCKED. Syntax-only parsing passes; it is not installed typechecking. Single/continuous/spread, cover handling, physical-page input, zoom, rotation, outline, selectable text/search, image-only behavior, passwords, byte-identical integrated download, worker mismatch and actual PDF Compare require an unrestricted follow-up run. No iframe screenshot is counted as a PASS for those rows.

The delivered build is the honest **browser/native fallback**, not an integrated PDF build.

## Executed evidence

| Suite/check | Final result | Scope |
|---|---|---|
| Original core baseline | 127/127 PASS | Before implementation |
| Expanded core suite | **176/176 PASS** | Original cases plus 49 new, zero skipped |
| Original DOM suite | **14/14 PASS** | Actual Chromium DOM; no persistence certification |
| Hardening UI | **39/39 PASS** | Actual UI interactions with updated locations |
| Reader UI | **18/18 PASS** | Focus, Compare, note pagination, native PDF, intake/export |
| Compact 1.2 UI | **11/11 PASS** | Four viewports, themes, drawer, identity, filtering, controlled external fetch |
| Startup App-mount diagnostic | **2/2 zero-diff PASS** | Separate in-memory hydration diagnostic, not real reload |
| PDF authoring | **12/12 PASS** | Real PyMuPDF/Pillow processing and library-builder fixtures |
| Typecheck/build/catalog/release | PASS | Default application and reviewed fallback distribution |
| Local HTTP safety headers | PASS | Actual localhost responses, not a deployed host |
| Normal-origin browser/runtime | BLOCKED | Browser policy prohibits HTTP navigation |
| Normal npm ci / complete dependency inventory | BLOCKED | Registry DNS/cache unavailable; offline bootstrap not equivalent |
| Installed optional engine/typecheck/Vite/runtime | BLOCKED | No installed renderer/worker dependencies |
| Live organized PDF URLs and deployed headers | BLOCKED / not performed | User requested no remote repository or hosting operations |

The four DOM/UI suites total **82 checks**, counted once from the latest final result. Do not add repeat runs or count blocked tests as passes. `final/complete-run/gates.json` is the cohesive command-level run. `final/compact-verified/` is the later stronger compact rerun: it waits for actual right-pane Book/English reflow before checking the unchanged left pane and capturing the Compare screenshot.

Original and intermediate failures are retained, not overwritten: old catalog-count and publication-review fixture expectations, selectors after controls moved, an ambiguous Theme label, popover/reset timing, and an opaque-origin fixture fetch all surfaced during development. Tests now select actual moved controls and use a disclosed synthetic transport, while exact equality, stable IDs, ownership, private-content exclusion and the real-origin test remain strict. The final report only uses the final validated outputs; earlier logs are explicitly historical. The private-copy integration fix has added regressions rather than a relaxed deduplication assertion.

### Commands

Core/default and publication:
```sh
npm ci
npm run bootstrap:offline  # separate offline route, not npm ci success
npm run build
npm run validate
npm run typecheck
npm test
npm run check:release
npm run pdfatlas:sync
```

Behavior and gate reproduction:
```sh
npm run test:dom
npm run test:hardening:ui
npm run test:reader:ui
npm run test:compact:ui
npm run test:startup:dom
npm run test:pdf:authoring
npm run pdf:library:validate
npm run pdf:library:build
npm run test:headers
npm run test:browser
npm run test:runtime
npm run test:pdf
npm run test:online:syntax
npm run audit:local
npm run typecheck:online
npm run build:vite
python tools/run-release-gates.py --out docs/evidence/release-1.2
```

The local gate runner intentionally uses `npm ci --offline --ignore-scripts --no-audit --no-fund`, reports blocked prerequisites, and returns exit 2 when only blockers remain. The additional real-registry probe used `npm ci --ignore-scripts --fetch-retries=0 --fetch-timeout=2000 --no-audit --no-fund` in an isolated copy; see `final/npm-ci.log`. Optional cached-install output is in `final/online-install.log`.

## Delivery and required coordinator work

`AtlasNote_1.2_source.zip` has the complete root source, package/lockfile, config, fixtures, tests and documentation. It excludes node_modules, build output, generated evidence, caches, private user corpus and raw font files. `AtlasNote_1.2_build.zip` has `index.html` at its root with compiled code, assets, licenses, HTTP headers and local launchers. It is publishable static content, not proof of a successful deployment. `pdfatlas_organized.zip` alone contains the actual supplied PDFs. The evidence and report are separate; do not publish them as website content.

Run the prebuilt app by extracting its own ZIP and executing `node serve.mjs`, then open `http://127.0.0.1:4173`. Windows can use `Start_Atlas.cmd`. Do not use `file://` or change an existing workspace origin without first downloading a backup. Source and build are not interchangeable folders.

Before release, the coordinator must (1) install and verify the delivered lockfile, (2) complete the unchanged real-origin import/reload/backup/fresh-context/restore/second-reload flow with zero differences, (3) install the existing optional renderer and run its actual 17-case matrix, (4) review PDF rights and upload/pin/test the two actual remote documents, and (5) rerun the four-viewports and deployed header checks on the exact final distribution. Preserve the returned source rather than restarting another UI redesign. Detailed commands and source interpretation are in `docs/release-1.2/COORDINATOR.md`.

## Full supplied acceptance checklist

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

