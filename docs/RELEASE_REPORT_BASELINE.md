# Knowledge Atlas - application delivery report

Date: September 10, 2026  
Input authority: `Knowledge_Atlas_V2_Fresh_Start_MegaPack.zip`, beginning with `00_START_HERE/BUILD_NOW.md`  
Target repository, documentation only: `julian-passebecq/deepnote_jul`

## Release decision

**Runnable offline note-reader delivery, with important incomplete release gates. This is not a fully accepted implementation of the entire PDF/Vite specification.**

This delivery contains actual application source, a static build, a separate complete normalized private library, runnable tests, and evidence. The offline note reader has been built and its actual React components and rendered layouts have been exercised in Chromium. The source is not merely a content archive or a UI mockup.

The two primary limitations are explicit:

1. Normal HTTP-origin browser navigation is blocked by this environment's administrator policy. Actual IndexedDB persistence, production-entry boot, native downloads and a fresh-context restore could not be browser-certified. The DOM harness does not replace those checks.
2. React-PDF and Vite dependency downloads were unavailable. The shipped static build uses a tested TypeScript-to-ESM fallback and browser PDF preview/open/download. A real optional React-PDF/Vite source path is included but has only been syntax-transpiled, not installed, type-checked with its dependencies, bundled or runtime-tested. It is not enabled in the prebuilt ZIP.

A complete transitive license/SBOM audit of the emergency vendored Mermaid dependency closure also remains open. The content publication check does not establish complete licensing or security certification. See `THIRD_PARTY_NOTICES.md` before broad public redistribution.

No repository, remote service or live site was modified as part of this delivery.

## Delivered files

| File | Contents and intended use |
| --- | --- |
| `knowledge-atlas-v1-source.zip` | Clean source at ZIP root, real lockfile, build tools, schemas, tests, documentation, screenshot evidence, public starter/help content and local vendor assets. No `node_modules`, compiled `dist`, private study corpus or system font files. |
| `knowledge-atlas-v1-built.zip` | Static app at ZIP root, including `index.html`, bundled local runtime assets, public content, license notices, `serve.mjs`, `Start_Atlas.cmd` and `START_HERE.txt`. No private study corpus. |
| `knowledge-atlas-local-library-private.zip` | Complete canonical normalized private library and locally supplied assets, explicit block-ID migration records, SHA-256 transfer manifest and import instructions. Keep this outside GitHub and outside the served website folder. |
| `RELEASE_REPORT.md` | This report; also included in the source under `docs/RELEASE_REPORT.md`. |

The source and built archives deliberately contain only the reviewed neutral example pack and newly authored public reader guide. The full private library is imported locally through Settings, not compiled into the website. The private ZIP is a source-content transfer, not a future backup of your personal changes.

## Start and import

### Fastest: use the prebuilt reader

Extract `knowledge-atlas-v1-built.zip` into its own folder. On Windows, double-click `Start_Atlas.cmd`; it needs Node.js or Python already installed. Keep its terminal open. Alternatively, run either command in the extracted folder:

```sh
node serve.mjs
# Alternative:
python -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173`. Refresh once if the browser opens before the server is listening. Do not open `index.html` directly as a `file://` URL.

Keep the private ZIP outside this extracted folder. In the app, open **Workspace settings -> Import library -> Choose library ZIP**. Select `knowledge-atlas-local-library-private.zip`, review the preview, then confirm. The private transfer contains 137 pages and 685 terms. The app also retains the separate public examples/help, so combined workspace totals will be larger.

Immediately create a workspace backup and test restoring a copy before making this your only storage. Keep using the same browser profile and site address. Different hostnames, ports, profiles or deployed domains have different browser storage. Clearing site data removes locally saved work.

### Source development and manual GitHub upload

Extract `knowledge-atlas-v1-source.zip` and use its contents as the repository root, rather than uploading only the ZIP itself. Include dotfiles and `.github`. Do not include private library ZIPs, personal workspace backups or `node_modules` in a public repository.

With Node.js 22.12 or later:

```sh
npm ci
npm run dev
```

The app is then served at `http://127.0.0.1:4173`. For a static host, use `npm ci && npm run build` and publish `dist`. Netlify settings and a manual GitHub Pages workflow are included as configuration only; neither was deployed remotely here.

### Optional advanced PDF build - not certified

On a computer with dependency-download access:

```sh
npm run enable:online
npm run build:vite
npm run preview
```

The first command deliberately updates `package.json` and `package-lock.json` to actually installed exact versions. Review and retain those files after installation. The worker, CMaps and WASM are resolved from React-PDF's own compatible PDF.js dependency; the app does not force-install a separate latest PDF.js. Run the PDF matrix in `docs/TESTING.md` before treating this path as usable or deploying it.

## Implemented / partial / blocked matrix

| Area | Delivered behavior | Verification / limitation |
| --- | --- | --- |
| App shell and Home | Project cards, compact tree, utility rails, project grouping, local creation/editing, icons, archives and settings. | Real Home and navigation rendered in Chromium. Exhaustive Home operation persistence remains unverified. |
| Tree and local editing | Arbitrary nested folders, page/project creation, rename/move/archive/restore, stable links, local overlays and validated structured editing. | Core logic tested. Not every UI combination was end-to-end exercised. |
| Continuous notes | Text, links, sections, lists, tables, code, figures, questions, answers and bilingual blocks. | Real components exercised with source-preserving fixtures. Markdown is a safe supported subset, not a claim of full CommonMark coverage. |
| Book | Real DOM measurement into numbered same-note sheets; one vertical scroller; wide paired sheets, narrow single sheets; safe paragraph/code/list/table fragments and explicit oversized fallback. | Actual Chromium geometry and source-text reconstruction passed. Representative long fixture, not a proof for every conceivable imported layout. |
| Book reflow | Reflow on resize, font/content changes; source-block anchors rather than generated sheet numbers. | Font change preserved target visibility. The captured anchor may normalize to a containing block; exact pixel restoration is not promised. |
| Compare and internal tabs | Up to two independently navigable resizable panes, same-page comparison, internal cross-project tabs, Back/Forward, mobile active-pane switching. | Same-page independent English visibility and keyboard resizing passed. Complete persistence and all tab/history combinations remain manual gates. |
| Parallel NO/EN | Aligned bilingual pairs with per-view English visibility. | Real Compare DOM verified independence. |
| Context and glossary | Searchable glossary, related pages, outline, source provenance and personal remarks. Glossary backlinks and page annotations are both considered. | All supplied glossary relationships accounted for; no missing targets. |
| Search and learning state | Global text/code search, bookmarks, flags and view controls; hiding flags does not delete their underlying values. | Search navigation and core state preservation tested; full reload certification blocked. |
| Mermaid and code | Real local Mermaid SVG rendering and Prism syntax highlighting. No fake diagram image substituted. | SVG rendered in Chromium, including Book cloning. Vendor license audit incomplete. |
| Images | Local images and provenance; external references require a load decision. | No automatic rights upgrade or automatic remote-asset download. No exhaustive remote-host matrix. |
| Local storage | Native IndexedDB with separate imports, overlays, personal state and asset stores; queued writes, explicit saving/error state and atomic import/restore transactions. | Implemented, but actual browser persistence/atomicity/quota/fresh-context restoration are BLOCKED here. |
| Library import | Bounded ZIP parsing, schemas, checksums, preview, stable ownership, dependency/reference validation, version conflict handling and idempotent reimport. | Pure algorithms and final private ZIP parser passed. UI-to-IndexedDB commit remains unverified. |
| Personal-state safety | Source pack imports do not replace remarks, flags, bookmarks, local additions or open views. | Real corpus composition test preserved all tested personal fields; this is not an IndexedDB integration claim. |
| Workspace backup | Source packs, retained imported revisions, local overlays, personal state and exact local attachment bytes; preflight validation before restore. | Pure ZIP backup/restore and exact synthetic PDF bytes passed. Browser download plus fresh-context restore is BLOCKED. |
| Repository-ready export | Canonical private content pack export retains IDs, dependencies and local assets. | Core round-trip tested. Personal state requires workspace backup, not content-only export. |
| Export to AI | Local preview/copy/download only, scope controls, answer/remark exclusions and private-content acknowledgement. No external AI call. | Privacy UI and core omissions tested. Native clipboard/download not certified. |
| Print / Save as PDF | Explicit note/collection print projection and browser print dialog. | Implemented; native print output and Save-as-PDF interaction not certified here. |
| PDF in prebuilt reader | Local PDF attachment storage, honest browser preview, original-document opening/downloading and fallback notices. | Integrated Atlas physical-page controls are NOT included in this offline build. |
| Optional React-PDF | Source adapter for physical single/continuous/spread modes, worker compatibility checks, page input, zoom/rotation, outline, text search, memory-only password prompt, anchors and visibility-based rendering. | Syntax-only checked. Dependency installation, optional type compatibility, Vite production build, worker loading and all real PDF interactions BLOCKED. |
| Themes and accessibility | Three light token themes, Focus, collapsible sidebars, labels, modal focus/Escape and keyboard pane divider. | Representative responsive layouts passed. Full screen-reader/axe/keyboard audit not done. |
| Public-source controls | Exact public pack allowlist and semantic SHA-256 review, no raw notebooks or private source library in static output. | Actual release check passed. This is a content boundary, not comprehensive legal/security certification. |

## Actual commands and evidence

All commands below were executed against the delivered offline application code, unless explicitly described as a reference or a blocked optional path. Raw selected logs are in `docs/evidence/`.

| Command / check | Actual result | Evidence |
| --- | --- | --- |
| `npm ci --offline --cache /root/.npm` | PASS; restored the locked cached build dependencies. The explicit cache path is specific to this environment. | `npm-ci-offline.txt` |
| `npm test` | PASS; its pretest builds the real static app, then 66 tests passed, zero failed/skipped. | `app-unit-tests.txt` |
| `npm run typecheck` | PASS for the offline application's configured TypeScript scope. Optional online adapter is intentionally outside this check. | `typecheck.txt` |
| `npm run validate` | PASS; reviewed public content and references validated. | `validation.txt` |
| `npm run check:release` | PASS; public build matches exact reviewed source pack hashes; excluded file classes absent. | `release-check.txt` |
| `node --check public/serve.mjs` | PASS; standalone static-server syntax checked. | Executed during final build verification. |
| `ATLAS_EVIDENCE=... python tests/dom_test.py` | PASS; 14 actual Chromium DOM/layout checks, zero failures. | `dom-tests.json`, `dom-tests.log`, eight PNGs |
| `ATLAS_EVIDENCE=... python tests/browser_test.py` | BLOCKED, not PASS: `net::ERR_BLOCKED_BY_ADMINISTRATOR` on the real HTTP app origin. | `browser-integration.json`, `browser-integration.log` |
| `node tools/audit-private-library.mjs ORIGINAL MIGRATED REPORT.json` | PASS; complete original/migrated corpus equality, relationship accounting, idempotence and preservation checks. | `private-library-audit.json` |
| `node tools/package-library.mjs PRIVATE OUTPUT.zip` plus final `unzipBounded` / `readWorkspace` | PASS; delivered private ZIP CRC, file SHA-256 values, safe paths, decompression limits and actual parser verified. | `private-library-package.json`, `final-private-zip.json` |
| Optional online source transpilation | Syntax-only PASS; no claim of dependency resolution or type compatibility. | `online-syntax-only.json` |
| Optional Vite build | BLOCKED; required package unavailable. | `online-build-blocked.txt` |
| Supplied reference suites | 124 reference tests passed: 39 content, 42 Book, 43 PDF. These are separate from the 66 new app tests and do not certify app integration. | `reference-tests-summary.json` |

The DOM suite loads actual React components, real public content, actual styles, Prism and Mermaid into an opaque-origin `about:blank` harness. Persistence writes, UUID availability and address-bar updates are adapted there. It **does not** verify normal-origin boot, IndexedDB, secure clipboard APIs, real downloads or PDF.js. Browser policy was not altered or bypassed.

Observed Book results: 14 sheets in the representative desktop fixture; all paragraph/code/table/list source text reconstructed exactly across fragments; no stranded final heading in tested sheets; zero measured vertical overflow. The same fixture reflowed without overflow at 1366x768, 1920x1080 and 390x844. Wide Focus created two consecutive same-note columns. Compare retained both mobile views while showing one selected pane.

The cached npm install's audit output is not a fresh comprehensive vulnerability assessment, and does not audit all vendored JavaScript. No full dependency security audit, performance benchmark, long-PDF memory profile or cross-browser release matrix is claimed.

## Private content and migration accounting

The normalized private library contains:

| Measure | Verified value |
| --- | ---: |
| Pages | 137 |
| Glossary terms | 685 |
| Projects | 5 |
| Packs | 6 |
| Glossary backlink edges | 1,205 |
| Unique target pages of those glossary edges | 57 |
| Backlink edges not mirrored in target page `terms` annotations | 50 |
| Resulting stable block IDs | 1,820 |
| Newly assigned deterministic block IDs | 1,131 |
| Existing block/section IDs retained | 689 |
| Unresolved references | 0 |
| Added pages on identical reimport | 0 |

The 50 non-mirrored backlink edges are not silently deleted or fabricated into symmetric relationships. Page-side terms and glossary-side page IDs remain independent supplied relationships; the contextual glossary accounts for either direction.

The migration preserves every page ID, complete page body, glossary record, project tree and workspace group. Existing block IDs remain intact; missing block IDs are assigned deterministically by an explicit @1-to-@2 migration. Parsers, validators, content compiler and backups accept the new format rather than passing it into the unchanged strict @1 schema. The migration tool refuses to overwrite an existing output directory.

The full library is the 137-page complete set, not that set plus the alternative 125-page core. Raw historical notebooks, old prompts and redundant source archive copies are not replicated into the import ZIP. Remote image/source links remain references with their existing provenance, not locally cached assets or newly approved public content.

The eight public pages are separate: two original neutral examples plus six new reader-help pages. Added guide IDs are `page.atlas.welcome`, `page.atlas.layouts`, `page.atlas.language`, `page.atlas.pdf`, `page.atlas.rotated` and `page.atlas.password`, under `project.atlas.guide`. App logic does not hard-code the private corpus counts.

## Screenshot index

These are actual Chromium renders of the shipped reader components with only public guide/example content, not generated mockups. They show the DOM test harness, not a certified production-origin persistence session.

| Screenshot | What it demonstrates |
| --- | --- |
| `01-home-desktop.png` | Home and reviewed public project cards. |
| `02-continuous-desktop.png` | Continuous reader, tree and context layout. |
| `03-book-desktop.png` | Numbered Book sheets for a long source note. |
| `04-book-paired-focus.png` | Consecutive same-note sheet pairs in Focus. |
| `05-book-mobile.png` | Single-column mobile Book reflow. |
| `06-compare-desktop.png` | Independently configured two-pane note comparison. |
| `07-export-privacy-preview.png` | Export scope and privacy controls. |
| `08-compare-mobile.png` | Mobile active-pane switching without discarding the other view. |

All are in `docs/evidence/` in the source ZIP. There are deliberately no screenshots pretending to demonstrate a working advanced PDF engine.

## Storage, security and remaining acceptance work

Use a single active browser tab for writing. Atlas internal tabs and Compare panes are supported, but simultaneous writes from separate browser tabs are not coordinated. No cloud sync, account recovery, application-level encryption or automatic backup service is provided. A downloaded workspace ZIP can contain sensitive text and attachment bytes.

Unknown saved schemas are not erased or guessed. Automatic database-v1 migration is not implemented. Opening an incompatible database can block normal recovery access; preserve/export it with the previous application before attempting migration. Test storage quota failures, aborts and recovery on a normal browser before relying on the app for irreplaceable work.

The source includes ZIP expansion limits, path checks, schema validation, checksums, safe rendering boundaries and source-publication hashes, but these are not a penetration test. No raw HTML or notebook execution is enabled. Questions with hidden answers remain ordinary reading content; there is no grading or execution engine.

The exact uncompleted acceptance matrix is in `docs/TESTING.md`. The most important next gates are actual-origin private import and reload, A-to-B rapid remark persistence, newer-pack import with personal additions retained, corrupt-backup rejection before writes, backup download and restore into a genuinely fresh browser context, local PDF byte equality after restore, quota/abort recovery, optional PDF worker and physical-page tests, native print/download behavior, and a transitive dependency license/security review.

Excluded intentionally: quiz/QCM engine, code execution, graph mode, nested docking, AI chat, authentication, Drive OAuth, browser GitHub publishing, cloud synchronization, OCR and PDF editing. No completion of those excluded modes is implied.
