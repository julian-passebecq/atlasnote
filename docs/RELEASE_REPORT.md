# AtlasNote / Knowledge Atlas - release-hardening report

**Version:** 1.0.1  
**Date:** September 10, 2026  
**Baseline:** repository-matched `julian-passebecq/atlasnote` source plus the supplied release-audit/PDF fallback package.

## Release decision

The existing reader has been hardened and packaged as an actual source release and static build. **The application hardening changes are delivered; full release sign-off is still blocked by the explicitly identified browser, PDF dependency/runtime and dependency-provenance gates.** The build is not presented as a fully certified advanced-PDF release.

No repository, branch, remote workflow or deployed site was changed. GitHub read access worked. All **17 repository-root blob/tree entries** matched the uploaded source snapshot; that snapshot was used as the authoritative baseline. Shell cloning was unavailable, but connector inspection and hash comparison resolved the source authority. The PDF fallback copy is executable-equivalent to that baseline; two files differ only in a historical header comment or statement line break. See `evidence/hardening/provenance.json` for exact hashes.

## Deliverables

| Artifact | Contents |
| --- | --- |
| `AtlasNote_Release_Hardened_Source.zip` | Repository-root source, exact base lockfile, original and new tests, synthetic fixtures, deployment config, preserved advanced PDF code, all acceptance rows and evidence. No node_modules, private corpus or font files. |
| `AtlasNote_Release_Hardened_Build.zip` | Static site with index.html at the root, compiled fallback reader, local server, Windows launcher, public starter and Netlify header file. No build installation is needed to serve it. |
| `AtlasNote_Release_Test_Report.md` | This release report. |
| `AtlasNote_Release_Test_Evidence.zip` | Convenience copy of current logs, machine-readable results, acceptance matrix and actual screenshots. The same evidence is in the source ZIP. |

The existing separate `knowledge-atlas-local-library-private.zip` is not changed or embedded in either public artifact. Import it locally through Workspace settings. Public content remains **8 generic pages, 2 notebooks and 1 glossary term**; the private library is deliberately separate.

## Implemented changes

### Compare, Focus and tabs

Compare is now a real on/off toggle. Closing it retains the **active pane**, not an arbitrary left pane, with its complete views, active tab, histories, anchors, English visibility, disclosure settings and reading modes. An empty active pane does not make Compare impossible to close. The per-pane close controls still work.

Focus is immediately before Compare in the top bar. The tested control order is Export to AI, Print, Focus, Compare, Learning flags. All four initial left/right-sidebar combinations restore exactly on exit. Utility rails, search, keyboard focus containment, Escape, Book and Compare remain usable.

Tree pages have right-click/More/Shift+F10 menus for open, fresh internal tab, other pane, bookmark, rename, move and archive. Folder/notebook actions reuse the existing management dialogs. Menus support keyboard traversal, Escape focus restoration and viewport clamping. Ctrl/Cmd-click, middle-click, the five-tab cap, neighbor selection and explicit search-result new-tab actions are exercised. Separate pane histories, tabs, English state and source anchors are checked for leakage.

### Book and linked context

A Home shortcut opens the existing long reading fixture directly in Book mode. Its real measured sheets form 1-2 and 3-4 pairs on a wide canvas; Compare remains a different workflow.

A reflow bug that replaced the saved source anchor with a newly generated sheet's first block was fixed. Font changes now retain the exact block/offset. The tests reconstruct paragraph, code, table and list source content, check heading boundaries and real Mermaid clones, and resize through desktop/mobile widths. An explicit page break advances the sheet. An oversized callout opens its full Continuous source rather than clipping or discarding it.

Outline jumps expand folded sections. Rapid A/B remarks retain the correct keys. PDF revision notes remain separate and require an explicit copy to move to the current revision. Contextual/global glossary, related pages, backlinks, flags, document/position bookmarks and post-update stable-ID navigation are exercised.

### Import updates and backups

The supplied synthetic v1.0.0 and v1.1.0 ZIPs are parsed with the application's actual bounded ZIP/schema validation. Their changed source content and relocation are applied by the core update/composition path. Exact personal and local state retention, idempotence, equal-version changed-byte conflicts, older versions, omitted IDs and local-source rebase requirements are checked.

Backup preparation now includes **imported-pack and local-PDF dependencies**, not only built-in assets. Missing bytes, mismatched hashes, wrong PDF byte counts and corrupt orphan attachments stop an incomplete backup before it is offered. Restore validates local PDF revision metadata against the actual bytes. A real ZIP serialization/parser round trip preserves exact remarks, bookmarks, flags, session, overlays, imports and PDF bytes. **That is not a substitute for a real fresh-browser restore.**

The normal-origin suite is designed to perform the full UI sequence: import, local additions, chosen-folder PDF import, reload, update, actual browser backup download, new empty browser context, restore, exact checks and another reload. It was attempted here and stopped at the administrative navigation block. No mock database is substituted.

### Retained PDF implementation

`src/online/PdfEngine.tsx`, its React runtime bridge, physical-page helpers, worker/version check, Vite path and CSS remain present. No replacement PDF implementation was introduced. This pass fixes cover-aware spread stepping, prevents a worker mismatch error from being cleared by a document-reset effect, supports retry, resets stale search results, restores continuous-page positioning and preserves original download access. Worker/CMap/WASM/standard-font resource paths are taken from the wrapper-resolved PDF.js package.

The delivered static build still uses `src/pdf/PdfReader.tsx`'s **clearly labelled browser preview fallback**. It does not claim integrated page, zoom, rotate, text-search or physical-spread controls. The integrated source passes isolated syntax/emit checks, but installation, installed-dependency type checking, Vite bundling and real PDF runtime are blocked. The optional typecheck currently reports missing React/React-PDF modules, not a successful check.

A prepared 17-scenario integrated suite waits for real canvases and text layers, records the actual local worker response, tests spreads/cover, navigation, zoom, intrinsic rotation, outline, search/selection, image-only behavior, passwords, Compare, original-byte download and a fault-injected worker mismatch/retry. None of those scenarios is falsely counted as executed here. The standalone raster-only fixture was extracted from the original public fixture, checked for zero selectable text and visually inspected without OCR.

## Actual test results

| Gate | Result | Evidence |
| --- | --- | --- |
| Offline TypeScript and static build | PASS | `typecheck.log`, `final-build.log` |
| Original plus new core tests | **106 PASS, 0 FAIL** | `unit.log` |
| Strengthened baseline Chromium geometry/UI | **14 PASS, 0 FAIL** | `baseline-dom/dom-tests.json` |
| Added Chromium hardening UI | **39 PASS, 0 FAIL** | `ui/results.json` |
| Synthetic ZIP/update and PDF-byte round trip | PASS, core/serialization scope | `synthetic-roundtrip.json`, `unit.log` |
| Public review hashes and excluded private/raw/font files | PASS | `release-check.log` |
| Installed base dependency versions and vendor bytes | PASS, local inventory scope; 113 vendored files | `dependency-inventory.json` |
| Packaged header file and actual local HTTP responses | PASS, not live Netlify | `headers.json` |
| Retained integrated source isolated syntax/emit | PASS, not installed-dependency typecheck or runtime | `pdf-static/syntax.json` |
| Normal-origin persistence/download/fresh-context workflow | **BLOCKED, 13 stages** | `runtime/results.json`, `runtime.log` |
| Optional PDF installation/typecheck/build/runtime | **BLOCKED, 17 runtime scenarios** | `online-install.log`, `online-typecheck.log`, `online-build.log`, `pdf-runtime/results.json` |
| Registry vulnerability audit / complete transitive license reconciliation | **BLOCKED** | `npm-audit.json`, `dependency-inventory.json` |
| Clean source ZIP extraction and rebuild | PASS | `clean-source.json`, `clean-source.log` |

**Clean build detail:** PASS: clean ZIP extraction, cached lockfile installation, TypeScript, build, 106 tests and release scan; every generated dist file matches the working build.

The supplied acceptance matrix contains **139 rows: 103 PASS, 0 FAIL, 36 BLOCKED**. Every row retains the original requirement, its executed scope, a reason and an evidence pointer in `RELEASE_ACCEPTANCE_MATRIX.md` and `.json`. Strict native-restore and integrated-PDF rows remain blocked even where their underlying algorithms have passed unit tests.

## Exact blockers and remaining limits

**Normal browser runtime:** managed Chromium returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` for localhost navigation. Its policy was inspected only, not modified. The about:blank DOM harness explicitly suppresses persistent writes and cannot establish production boot, real IndexedDB durability, native download or fresh-context restoration.

**Optional dependencies/runtime:** npm requests returned `EAI_AGAIN` for `registry.npmjs.org`. React-PDF/Vite are not installed and no compatible worker bundle could be produced here. The base app uses its locked cached dependencies; optional syntax/physical-page-helper passes are not represented as a runtime pass.

**Dependency provenance:** all inherited vendor byte pins match. A complete original transitive lock/SBOM for the precompiled Mermaid closure was not present, and registry audit access failed. Original notices and the existing licensing caveat remain. This needs completion before broad redistribution is described as fully license/audit-cleared.

**Hosted response verification:** the Netlify header file is in the deployable ZIP and the same headers were checked over actual localhost HTTP. A live Netlify site was neither deployed nor tested, so that specific acceptance row remains blocked.

Other normal browser/OS actions such as native print, clipboard permissions, quota failures and cross-browser/screen-reader certification are not implied by this release's selected DOM tests. No Chrome policy workaround, fake PDF engine, fake IndexedDB, silent schema reset or untested cloud synchronization was added.

## Use the artifacts

For GitHub, extract the source ZIP and place its contents at the repository root. For the prebuilt reader, extract the build ZIP and run:

```sh
node serve.mjs
```

Open `http://127.0.0.1:4173`. Windows users can use `Start_Atlas.cmd`. Import the existing private library from Workspace settings. Keep private libraries and complete backups out of a public repository.

The source's default build is `npm ci && npm run build`, with output `dist`. The optional network-enabled PDF gate is separate: `npm run enable:online`, `npm run typecheck:online`, `npm run build:vite`, then `npm run test:pdf`. The normal production persistence gate is `npm run test:runtime` against the default fallback build.

The existing database name/schema and source IDs are retained. Back up before changing browser/origin; clearing browser storage can remove local data. A backup snapshots selected built-in packs and assets in addition to imports, so restore comparisons intentionally account for those snapshots.

## Evidence and source references

Current screenshots are actual application renders in `evidence/hardening/baseline-dom/` and `evidence/hardening/ui/`. They are not AI-generated app mockups and do not prove a successful native PDF/IndexedDB runtime. The image-only fixture render is in `pdf-static/`.

Primary technical references consulted while preparing the optional gates and static deployment configuration:

- React-PDF official repository/README: https://github.com/wojtekmaj/react-pdf
- Playwright browser downloads: https://playwright.dev/python/docs/downloads
- Playwright browser contexts: https://playwright.dev/python/docs/browser-contexts
- Netlify custom headers: https://docs.netlify.com/manage/routing/headers/

Historical baseline reports and evidence remain explicitly named/separated; the counts and blockers above describe this hardening pass, not a reused claim from the previous delivery.
