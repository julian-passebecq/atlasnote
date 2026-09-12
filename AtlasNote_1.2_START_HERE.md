# AtlasNote 1.2 - Start here

This package contains the implemented 1.2 improvement pass, not another coding prompt. No GitHub or Netlify operations were performed.

## Choose the correct archive

| File | Purpose |
|---|---|
| `AtlasNote_1.2_source.zip` | Complete project root for continued development/integration. Contains package/lock, application code, config, tests and current documentation. Not a patch-only ZIP. |
| `AtlasNote_1.2_build.zip` | Precompiled static website. Extract into its own folder. Only this ZIP's contents are website deployment content. |
| `pdfatlas_organized.zip` | Both supplied PDFs, unchanged, organized into categories with a manifest and update README. Review rights before public hosting. |
| `AtlasNote_1.2_RELEASE_REPORT.md` | Exact implementation, provenance, commands, limitations and all 86 acceptance rows. |
| `AtlasNote_1.2_TEST_EVIDENCE.zip` | Baseline/final logs, screenshots, two startup before/after diagnostics, machine results, PDF byte verification and packaging audits. Not public website content. |
| `AtlasNote_1.2_CHANGELOG.md` | What changed in 1.2. |
| `AtlasNote_1.2_CHECKSUMS.txt` | SHA-256 values for the individual deliverables and this guide. |

Do not upload this complete-package ZIP as a website. Do not mix source, build, evidence or private PDF exports into one deployment directory.

## Run the precompiled app locally

Extract `AtlasNote_1.2_build.zip` into a separate folder. In that folder, with Node installed, run:

```sh
node serve.mjs
```

Open `http://127.0.0.1:4173`. Windows users can use `Start_Atlas.cmd`. Keep the server terminal open. Do not double-click index.html. Back up a real workspace before changing its origin/browser/machine.

## Improvements included

The search-first compact top bar and right reader rail replace wide routine chrome. Context/Outline/Remarks now overlay rather than shrink the reader. Pane A is blue, Pane B lavender, and the tree supports simultaneous/dual ownership markers. Five complete themes are selectable. PDF Library mode filters the same canonical tree/tabs/panes instead of creating another app. Two inspected PDF Atlas references use a centralized URL configuration and checked metadata; actual PDFs stay in the separate organized ZIP. Startup hash replay into an empty restored Compare pane is fixed and guarded by strict diagnostics. Explicit private offline copies of remote metadata references are supported without weakening local duplicate checks.

## Read the limitations before calling it final

**This is an implementation candidate, not a production certificate.** The compiled build uses the honest native/browser PDF fallback. The existing advanced React-PDF implementation was preserved, but dependency installation was unavailable, so its 17 integrated runtime acceptance rows remain BLOCKED. PDF Single/Continuous/Spread controls are not simulated in the fallback.

Normal-origin browser navigation was blocked by environment policy. The startup App-mount mutation was reproduced twice before the fix and had zero differences twice afterward, but those diagnostics are not a successful real page.reload()/IndexedDB/backup/fresh-context/restore proof. That full strict runtime gate still needs the coordinator's unrestricted browser.

The organized PDF reference paths currently target staging main. They are not claimed to be uploaded/live. The coordinator must review publication rights, upload the organized library, pin `config/pdfatlas.json` to its final commit, run `npm run pdfatlas:sync` and rebuild/test. Local private PDFs do not depend on remote hosting.

## Evidence overview

176 core tests, 82 actual DOM/UI checks (14 baseline + 39 hardening + 18 reader + 11 compact) and 12 PDF-authoring checks pass. Both post-fix startup diagnostics have zero differences. Required viewport screenshots cover 1366x768, 1440x900, 1920x1080 and 390x844. The 86 supplied acceptance rows are 65 PASS / 21 BLOCKED / 0 FAIL, with explicit scopes.

The delivered source was extracted into a clean folder and rebuilt with the supplied offline bootstrap; typecheck and all 176 core tests passed again. All 171 rebuilt static files match the returned build ZIP byte-for-byte. This does not replace successful npm ci or live browser certification.

Start the next coding/integration step from the returned 1.2 source, not the old 1.1 input. Coordinator instructions are in `docs/release-1.2/COORDINATOR.md` inside the source ZIP.
