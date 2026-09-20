# AtlasNote 1.2.1 - Integrated PDF finishing pass

Continuation of the complete AtlasNote 1.2 source. The canonical content/storage model, note paginator, Compare ownership, stable IDs and existing React-PDF engine are preserved.

**Current status: implemented source candidate, NOT production-certified.** The registry cannot resolve in this runtime, so the integrated dependencies/lockfile and hosted distribution have not been installed/built. Chromium also blocks normal HTTP-origin navigation. Read `FINAL_TEST_STATUS.md` for actual results; compatibility DOM checks are not integrated-renderer or IndexedDB certification.

The live source is `/mnt/data/atlasnote-1.2.1-workspace/`. Start with `WORKSPACE_READY_FOR_GITHUB.md`; no download/re-upload is needed while this runtime remains available. Nothing was pushed or deployed. A secondary backup, when present, is recovery only.

## Product behavior

**Notes** and **PDF Library** are strict recursive projections of the same tree. Notes excludes PDFs and emptied PDF-only projects; PDF Library excludes note-only branches. Counts follow the projection, including archived/hidden items. Switching mode preserves open tabs, reading state, private bytes, placements, bookmarks and remarks. Global search remains cross-content; Compare may combine either type.

Create an empty folder/notebook and its collection opens immediately. The strict discovery tree hides empty branches. Home's explicit **Manage all notebooks** option exposes empty/hidden projects for management, not as a second content store.

The compact ribbon and reader rail remain. Context overlays the reader. PDF rights, attribution, hash, size, provenance and source/open/download links live in Document info or Context. The PDF pane has no large intro block. The native failure/compatibility path has a compact labelled strip and a full-height frame; it does not pretend to provide physical-page controls.

**Focus** requests browser fullscreen in the click handler. Unsupported/rejected requests keep CSS Focus working; browser exit synchronizes app state. No fullscreen request is made automatically on reload. In the integrated engine the controls float, PDF artwork stays unchanged, and arrow keys navigate physical pages outside form controls.

Compare retains independent panes, blue/lavender identity, dual tree markers, exact survivor behavior, five tabs per pane and per-tab history/language/modes. Five themes remain: Fluent Blue, Neutral/Sage, Academic Paper, Soft Lavender and Dark Slate.

## Build contracts

Node 22.12 or later. On a fully provisioned checkout with a resolved integrated lockfile:

```sh
npm ci
npm run check:integrated-deps
npm run typecheck:online
npm run build
npm run check:release
npm run preview
```

`build` and `build:vite` both target the integrated `dist/`. `netlify.toml` is prepared to run `npm ci && npm run build` and publish **only `dist`**. CI verifies the exact integrated distribution after the compatibility suites; there is no automatic dependency installation or silent fallback during deployment.

**This workspace still lacks the integrated dependency entries in the lockfile.** `npm ci` alone will not add them. The explicit one-time `npm run enable:online` command authors the lock on a registry-enabled runtime. It requests React/ReactDOM 18.3.1, React-PDF 10.5.0, React 18 types and Vite 8.2.2, saves exact installed versions and verifies React-PDF's own PDF.js 5.4.296. These are targets, not a claim that they installed here. Review both manifests, run a fresh `npm ci`, audit, typecheck, build and all hosted browser gates before release. Never independently force a newer PDF.js.

### Separate compatibility build

With registry installation or a preinstalled global TypeScript 5.8.3:

```sh
npm run bootstrap:offline
npm run build:offline
npm run dev:offline
```

The bootstrap restores checked-in JSZip/Prism and the local compiler. It is **not equivalent to `npm ci`** and does not install React-PDF/Vite. Compatibility output is **`dist-offline/`**, never `dist/`. `npm test` rebuilds this compatibility output, so it cannot overwrite the hosted bundle. Do not publish it as an integrated release.

## Backup ownership fix

The reproduced 1.2 mismatch was an own `undefined` `anchor`/`revision` on note remarks: IndexedDB/in-memory objects can retain those keys but ZIP JSON cannot. New writers omit absent optional fields; a bounded ownership repair removes only those known absent optional keys from older personal state. Meaningful anchors, timestamps, histories and view state are preserved.

The production `captureWorkspaceSnapshot()` flush point captures reader anchors, waits for queued writes and freezes a clone. Backup uses that snapshot and the serializer freezes its own input before asynchronous asset reads. Failed durable writes do not prevent an emergency copy of available in-memory work; Settings discloses that condition.

The real-origin test compares the post-flush canonical state to persisted state, downloaded backup and fresh-context restored state without deleting or normalizing meaningful fields. Its equality assertions remain strict. This runtime has not completed that normal-origin gate.

## Public/private PDF safety

`config/pdfatlas.json` is pinned to reviewed commit `fa5e83f7825cdc837078f87c5e130cb012332195`; run `npm run pdfatlas:sync` after an intentional configuration change. The supplied metadata, sizes, page counts and SHA-256 values are retained. No public-library binaries or private corpus are copied into the application.

Trusted one-click loads require the exact HTTPS host/owner/repository/path, known hash, byte cap and PDF magic, with credentials/referrers omitted and redirects rejected. Other external hosts retain consent. Public references back up metadata only; private local intake stores exact bytes, retains SHA dedupe and supports the existing private-library export.

## Evidence and testing

`FINAL_TEST_STATUS.md` separates unit, DOM, hardening, reader, compact, PDF authoring, integrated PDF, real-origin, build and header results. `docs/TESTING.md` lists the commands. `CHANGED_FILES.md` records file-level reasons. Earlier reports under `docs/release-1.2/` and `docs/RELEASE_REPORT.md` are historical 1.2 evidence, not 1.2.1 certification.

All illustrated PDFs/test payloads bundled with the project are synthetic/author-created fixtures. A native frame can be blocked by the browser policy even when its shell is measurable; native-frame screenshots do not prove the PDF artwork rendered. No invented integrated screenshots or passing statuses are supplied.
