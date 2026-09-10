# Test scopes and remaining release gates

## Reproduce the actual checks

```sh
npm ci
npm run validate
npm run typecheck
npm test
npm run check:release
```

Install browser tools on a machine that permits normal local navigation:

```sh
python -m pip install playwright
python -m playwright install chromium
```

Set `CHROMIUM_PATH` to your Chromium executable when it is not `/usr/bin/chromium`. Start `npm run preview` in a separate terminal. Run `npm run test:browser`. This script loads the **production entry at a real HTTP origin**, writes a remark to real IndexedDB, reloads and checks it. It exits 2 for policy-blocked navigation, never a false PASS. It is a smoke test, not the entire acceptance matrix below.

For the separate DOM-only suite, start the static server with `ATLAS_DOM_TESTS=1` (PowerShell: `$env:ATLAS_DOM_TESTS="1"`). Then run `npm run test:dom`. This enables CORS on public static assets for the harness. The suite injects the real application into `about:blank`, uses in-memory store writes and adapts unavailable UUID/address-bar APIs. It measures actual Chromium geometry and executes the real Mermaid renderer. It cannot prove IndexedDB, production boot, native clipboard, downloads, PDF.js, or backup persistence. Its report says this explicitly.

## Required normal-origin acceptance gates (not completed here)

- Fresh profile: import the complete private ZIP. Verify canonical counts and glossary navigation. Add a page/folder/project, move them, add notes, flags, bookmarks and two open views. Reimport the same ZIP: no duplicates or lost personal state. Import a newer valid pack; attempt an equal-version conflict and omitted-ID update: both must be rejected without writes.
- Write a remark in page A and immediately navigate to B and type another. Reload and verify both exact texts. Repeat with closing an internal tab and with two Compare panes.
- Download a complete backup. Restore it into a **new browser context on the same origin**, not the original context. Verify the exact local PDF bytes, page IDs, block anchors, notes, ratings, bookmarks, folder moves, source overlays and view state. Corrupt one byte and prove rejection before any transaction.
- Simulate quota failure and transaction abort. Verify a visible error, no silent reset, recoverable in-memory data, an emergency backup and a successful retry. Database v1-to-v2 migration is deliberately not automatic; unknown schemas must not be erased.
- Open 3-5 cross-project tabs; use Back/Forward independently. Resize the two panes, swap them, open the same page in both, collapse sidebars, change themes and enter/leave Focus. Keyboard-only navigation and a screen-reader audit remain manual gates.
- In Book, exercise all long fixtures after fonts, image loads, English toggles and answer/section disclosure. Check unbroken source reconstruction and continued headers, no clipping and no stranded headings. The included DOM suite covers representative cases, not every imaginable block layout.
- Export active page/folder/notebook with and without answers, translations and private remarks. Confirm the exact preview and explicit privacy gate before clipboard/download/print. Verify notes collections in the native print dialog; the actual print/Save-as-PDF workflow is not certified here.

## Optional real React-PDF gate (network-enabled build required)

Run `npm run enable:online`, then `npm run build:vite`. Do not count syntax transpilation as runtime testing. Verify that `/pdf-assets/engine.json` agrees with `pdfjs.version` and that the actual worker request succeeds locally with no CDN.

Use the public original synthetic fixtures in `content/packs/atlas.reader-guide/assets/`:

1. `atlas-reader-fixture.pdf`: five pages, text/outline, mixed orientation and an image-only last page. Verify physical pages 1-2 / 3-4 / 5, cover-alone 1 / 2-3 / 4-5, text selection and text search, outline and internal/external links. No OCR should be invented for image-only content.
2. `atlas-reader-rotated-fixture.pdf`: preserve intrinsic rotation and add 90-degree viewer rotation; check fit width, zoom, portrait/landscape and odd page count.
3. `atlas-reader-password-fixture.pdf`: password `atlas-demo`; test wrong password, cancel and retry. Inspect IndexedDB and backup bytes: the entered password must not be persisted.
4. Try an HTML response, LFS pointer, corrupt PDF, missing attachment, remote CORS rejection, an unapproved external host and a missing worker. All must show honest recovery, not a fake page.
5. Note/PDF and PDF/PDF Compare, independent physical-page anchors, bookmarks, revision-scoped remarks and local PDF bytes after fresh-context backup restore. Profile memory for long documents; virtualization and pixel bounds have not been runtime-profiled here.

## Evidence honesty

The delivery environment returned `ERR_BLOCKED_BY_ADMINISTRATOR` for normal localhost navigation. This is retained in `browser-integration.json`. The browser policy was not changed or bypassed. Dependency downloads were unavailable, so React-PDF/Vite was not installed. The successful offline build is a deliberate fallback, not Vite under another name.
