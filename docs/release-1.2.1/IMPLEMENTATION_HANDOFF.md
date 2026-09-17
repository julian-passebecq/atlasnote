# AtlasNote 1.2.1 — Integrated PDF + Mode Toggle + Fullscreen Finish Pass

## ROLE

You are the implementation model continuing the existing AtlasNote 1.2 work. This is a bounded finishing pass, not a restart and not a redesign.

The user has already tested the AtlasNote 1.2 Netlify deploy preview and identified concrete UX defects. The existing source contains substantial correct work: compact shell, Compare, five themes, PDF Library projection, external PDF integrity checks, local/private PDF intake, backup/export logic, and an advanced React-PDF/PDF.js engine that was preserved but not activated in the shipped fallback build.

Your job is to finish that implementation in the live chat workspace.

---

# CRITICAL HANDOFF / WORKSPACE RULE

**Do not make a ZIP the primary working artifact.**

The user wants the next, lower-cost model in this same conversation to be able to take the files you modified and push them to GitHub without the user downloading and re-uploading anything.

Therefore:

1. Locate the `AtlasNote_1.2_source` source tree that you previously produced in this conversation.
2. If only `AtlasNote_1.2_source.zip` exists, extract it once into a persistent working directory in the current chat/tool workspace, for example:
   - `atlasnote-1.2.1-workspace/`
3. Perform ALL implementation work directly in that unpacked source directory.
4. Do not delete, replace, hide, or move that working directory after finishing.
5. Do not return only a ZIP.
6. At the end, leave the complete modified source tree intact and create:
   - `WORKSPACE_READY_FOR_GITHUB.md`
   - `FINAL_TEST_STATUS.md`
   - `CHANGED_FILES.md`
7. You MAY additionally create a source ZIP as a safety backup, but it is secondary. The user must not be required to download/re-upload it.
8. Do not push to GitHub or deploy Netlify. The coordinating/lower-cost model will do repository/preview integration after your implementation returns.
9. Do not restart from the repository `main` branch or from AtlasNote 1.0/1.1.
10. Do not return a plan/checkpoint and stop. Complete the bounded pass, test it, and leave the live files ready.

If the runtime environment does not preserve directories between models, still create the safety source ZIP **inside the chat runtime** and explicitly state its exact path so a subsequent model can use it without requiring the user to download/re-upload.

---

# SOURCE OF TRUTH

Continue from the complete **AtlasNote 1.2 source** that you previously produced.

The GitHub integration performed after your prior package confirmed that source as the AtlasNote 1.2 candidate.

Reference remote state for orientation only — do NOT use GitHub as your implementation source:

- AtlasNote repository: `julian-passebecq/atlasnote`
- candidate branch created by coordinator: `release/atlasnote-1.2-candidate`
- candidate source commit: `4c0d0c15fcb11bdddc2ccab5f863c5aeebcffe2b`
- PR: `#4`
- current deploy preview used by the user:
  `https://deploy-preview-4--atlasnotej.netlify.app`
- production `main` is intentionally still untouched.

Public PDF repository:

- repository: `julian-passebecq/pdfatlas`
- organized library has now actually been merged to `main`
- exact organized commit:
  `fa5e83f7825cdc837078f87c5e130cb012332195`
- actual paths now exist:
  - `library/data-engineering/apache-spark/apache-spark-30-concepts.pdf`
  - `library/data-engineering/apache-spark/pyspark-pandas-dataframe-guide.pdf`

The coordinator reused the original Git blobs; the organized PDF bytes were not recompressed or altered.

---

# WHAT THE USER TESTED

The user tested the deployed 1.2 preview and confirmed:

- PDF Library mode itself is the right product direction.
- Tree hierarchy `PDF Atlas / Data Engineering / Apache Spark / PDF` is the correct interaction model.
- Clicking a PDF opens it in the normal AtlasNote tab/pane shell.
- Public external PDFs now load.
- Current browser-native fallback is functional.
- Current Focus partially hides AtlasNote chrome.

But the user identified the following defects / unfinished areas.

---

# P0 — FIX THE NOTES / PDF MODE TOGGLE

## Current defect

The top-left Notes/PDF icon does not behave like a clear two-mode switch from the user's perspective.

Current implementation changes `session.libraryMode`, but Notes mode deliberately keeps the original **mixed workspace tree**.

The current predicate is effectively:

```ts
if (mode === 'notes') return true;
```

So after the user enters PDF Library and clicks the top-left icon again, PDF content remains present in the library and it looks as if PDF mode never exited.

This behavior is now explicitly rejected by the user.

## Required behavior

Top-left mode icon is a real two-way discovery switch:

### Notes mode
- Sidebar heading: `My notebooks`
- Show note pages and note-containing folders/notebooks.
- Hide PDF leaves.
- Hide branches that become empty after PDF leaves are removed.
- Hide a PDF-only notebook/project such as `PDF Atlas`.
- Do NOT delete or mutate PDF metadata, tabs, pane history, bookmarks, remarks, files, or placements.
- An already-open PDF tab may remain open in the reader; switching mode is about library discovery, not destructive tab closure.
- But the sidebar must clearly become the Notes tree.

### PDF mode
- Sidebar heading: `PDF Library`
- Show PDF leaves only.
- Keep only parent folders/notebooks required to reach those PDFs.
- Hide note-only branches.
- Do not clone tree IDs and do not create a second write model.

## Exact implementation direction

Keep the canonical tree and change the projection predicate so BOTH modes are recursive projections.

Conceptually:

```ts
if (node.pageId) {
  const isPdf = pdfPages.has(node.pageId);
  return mode === 'pdfs' ? isPdf : !isPdf;
}
return !!node.children?.some(child =>
  visibleLibraryNode(child, pdfPages, archived, mode)
);
```

Archived behavior must remain intact.

Review all project/group counts and filters so hidden PDF-only projects do not still contribute to the Notes-mode count.

## Toggle polish

The top-left icon must visually change state:

- Notes mode: notebook/book icon; tooltip/aria-label `Switch to PDF library`
- PDF mode: PDF icon; tooltip/aria-label `Switch to notes`
- switching twice must deterministically return to the original mode
- no double-click race
- keyboard activation must work

## New tests required

Add explicit tests for:

1. Notes mode hides both reviewed public PDFs and the `PDF Atlas` project if it becomes empty.
2. PDF mode hides all note leaves.
3. Switching Notes -> PDF -> Notes returns the exact canonical note projection.
4. The toggle does not delete/modify open PDF tabs or personal state.
5. Archived items remain absent in both modes.
6. Mixed folders keep only matching leaf types in each mode.
7. Search/tree filter does not resurrect hidden leaf types.

Replace the old assertion that says:

`Notes mode preserves mixed tree`

because that product contract is now obsolete.

---

# P0 — ACTIVATE THE EXISTING INTEGRATED REACT-PDF ENGINE

## Product decision

The browser-native `<iframe>` PDF viewer is now only a fallback.

It must NOT be the normal hosted experience.

The current native viewer creates:
- dark/black browser-controlled canvas,
- duplicate browser PDF toolbar,
- random blob UUID title,
- poor visual integration,
- too much vertical chrome,
- styling that AtlasNote cannot control.

Do not attempt to CSS-style Chrome's internal PDF viewer.

Instead use the already-written integrated engine in:

- `src/online/PdfEngine.tsx`
- `src/online/pdf.css`
- `src/online/entry.tsx`
- `tools/build-vite.mjs`
- `vite.config.mjs`

Do not rewrite a second PDF application.

## Existing integrated engine capabilities to preserve

The existing source already supports:

- physical PDF pages
- single-page mode
- continuous mode
- physical-page spread
- cover-alone spread
- responsive width
- page number
- previous/next
- zoom
- rotation
- outline
- selectable text layer
- annotation layer
- text search
- image-only PDF fallback language
- passwords in memory only
- worker compatibility verification
- PDF state stored in AtlasNote `Location`
- PDF/Note Compare
- PDF/PDF Compare
- original/download links
- continuous rendering virtualization

Preserve this architecture unless a real executable defect requires a bounded fix.

---

# DEPENDENCIES — INSTALL AND PIN THEM FOR REAL

The previous Pro environment could not access npm. The actual GitHub runner proved internet/package installation is available.

Current `npm ci` on the candidate succeeds, but the advanced PDF dependencies are not yet in the committed lockfile.

Install and pin the integrated stack.

Required compatibility target:

- `react` = `18.3.1`
- `react-dom` = `18.3.1`
- `react-pdf` = `10.5.0`
- React-PDF-resolved `pdfjs-dist` MUST be `5.4.296`
- `@types/react` = exact installed React 18 compatible version
- `@types/react-dom` = exact installed React 18 compatible version
- `vite` = resolve a compatible current version once, then PIN THE EXACT RESOLVED VERSION in `package.json` / lockfile

Do not leave `vite@latest` as the permanent reproducibility contract after successful installation.

Do not independently force a random newer `pdfjs-dist`.

`tools/build-vite.mjs` already rejects an unsupported React-PDF/PDF.js pair. Keep that gate.

Recommended dependency separation:

Runtime:
- react
- react-dom
- react-pdf

Development/build:
- vite
- @types/react
- @types/react-dom
- typescript as appropriate to the existing repository policy

Commit/update:
- `package.json`
- `package-lock.json`

Run a clean `npm ci` from the resulting lockfile to prove reproducibility.

Run `npm audit` and record results. Do not silently ignore vulnerabilities.

---

# BUILD CONTRACT — MAKE INTEGRATED PDF THE HOSTED PRODUCTION BUILD

Current Netlify candidate still runs:

```toml
command = "npm ci && npm run build"
publish = "dist"
```

and current `npm run build` is the offline/static fallback builder.

That is why Netlify currently shows the browser-native PDF fallback.

The hosted production path must now build the integrated Vite distribution.

Use a clean script split, for example:

```json
{
  "scripts": {
    "build:offline": "node tools/build.mjs",
    "build": "node tools/build-vite.mjs"
  }
}
```

You may choose equivalent naming if existing tests require another split, but final invariants are:

1. `npm run build` should produce the deployable integrated reader OR Netlify must explicitly run `npm run build:vite`.
2. Netlify must publish the exact integrated `dist/`.
3. The offline/fallback build must remain available as a separately named compatibility build.
4. Existing public-content/private-content validation must still run against the appropriate build.
5. The fallback renderer must remain available if the integrated engine fails at runtime, but it is not the default deployment.

Do not accidentally run the offline builder after the Vite builder and overwrite integrated `dist/` before deployment.

---

# PDF VIEWER UI — REMOVE THE LARGE WASTED ZONE ABOVE THE DOCUMENT

The user explicitly marked the current entire PDF intro area for removal.

Current fallback page wastes a large region on:

- `PDF DOCUMENT`
- title
- long rights sentence
- verified reference sentence
- `Browser preview only in this offline build`
- Hide preview
- Open original PDF
- Download original
- provenance accordion

This pushes the actual PDF far below the fold.

## Required normal PDF layout

When a PDF is active, after the AtlasNote tab bar and a very small breadcrumb if retained, the document should begin almost immediately.

Target:

```text
[Atlas tab]
PDF Atlas / Data Engineering / Apache Spark        (optional slim breadcrumb)
--------------------------------------------------------------
[‹] [1 / 28] [›] [Single/Continuous/Spread] [Fit] [Rotate]
[Find] [Outline] [...]                             compact row
--------------------------------------------------------------
                    PDF PAGE
```

Maximum routine vertical chrome before the page should be small.

### Move metadata elsewhere

Move these into Context / More / Document Info:
- full rights text
- attribution
- SHA-256
- byte count
- source URL
- provenance
- Open original
- Download original (may also stay as compact icon)
- remote/local status

Do not delete metadata/security information; relocate it.

## Integrated engine

For integrated React-PDF:
- no `pdf-intro`
- no native fallback warning
- render compact AtlasNote controls directly
- page canvas begins immediately below controls
- use theme semantic tokens for surrounding canvas
- original PDF artwork remains unchanged

## Native fallback

If integrated engine fails or is unavailable:
- fallback must still be readable
- do NOT restore the old giant intro panel
- show a compact fallback indicator, e.g. small 28–36 px strip:
  `Browser PDF fallback`
- place details in Context / More
- let iframe use nearly all remaining pane height
- keep open/download accessible but not as a 3-button block above the document

Do not rely on non-standard URL fragments such as `#toolbar=0` as the primary design.

---

# FULLSCREEN / FOCUS — MAKE IT REAL

Current `Focus` only toggles `session.focus` and hides AtlasNote chrome. It does not enter browser fullscreen.

The user tested this and correctly observed that it is only partial focus.

Implement real fullscreen as a progressive enhancement.

## Required behavior

When the user clicks Focus:

1. close Context/popovers
2. set AtlasNote focus state
3. from the same user activation event, attempt:
   `appRoot.requestFullscreen()` or the correct reader-root element
4. if fullscreen succeeds:
   - browser address/navigation chrome is removed by browser fullscreen mode
   - AtlasNote shell is hidden according to Focus
   - PDF is centered in the full screen
5. if fullscreen is unavailable/rejected:
   - AtlasNote CSS Focus still works
   - no error loop
6. pressing Escape/browser fullscreen exit:
   - synchronize AtlasNote focus state back to false
   - restore exactly the previous sidebar/context visibility rules already covered by tests
7. toggling Focus off programmatically:
   - call `document.exitFullscreen()` if this app owns fullscreen
8. do not attempt automatic fullscreen on reload (browsers require user activation)
9. do not persist browser fullscreen state; only Atlas focus preference/state may persist according to existing design

Listen to:
- `fullscreenchange`
- optionally `fullscreenerror`

Do not confuse CSS full-viewport mode with browser Fullscreen API.

## PDF Focus UX

For integrated PDFs, Focus should feel like a reading mode:
- no sidebar
- no top search bar
- no tabbar
- no right rail
- no Context drawer
- no duplicated browser PDF UI
- centered page(s)
- lightweight floating PDF controls
- `Esc` exits cleanly
- arrow keys may navigate physical PDF pages when focus is not inside a form control
- do not break note Focus behavior

Optional polish if time permits:
- controls fade after pointer inactivity and reappear on pointer/key interaction
- but correctness and testability take priority

---

# P0 — FIX THE REAL CI BACKUP FAILURE

Important new evidence from the actual GitHub Actions runner:

The earlier reload/session failure is FIXED in 1.2.

Real-origin runtime now passes:

- real_origin
- import_v1
- personal_state
- local_pdf
- reload
- import_v2
- idempotent

The current real blocker is now:

```text
FAIL backup_download
assert package['workspace']['personal'] == before_backup['personal']
```

This is from the real normal-origin production app using actual IndexedDB and actual browser download.

Do NOT weaken this assertion just to get green.

## Required diagnostic

Before changing logic:

1. dump exact `before_backup.personal`
2. dump exact `package.workspace.personal`
3. generate a structural diff
4. identify the exact field(s) that differ
5. determine whether:
   - backup generation mutates/captures reader state after the pre-backup snapshot,
   - modal/settings opening changes session,
   - pending debounced reader state is flushed during backup,
   - timestamp/ephemeral fields are incorrectly included,
   - or backup serialization is wrong.

Fix the underlying ownership/timing problem.

If the intended semantic is that the download button must flush active reader position immediately before serialization, update the test to snapshot the canonical post-flush state through an explicit production-supported flush point — but do not normalize or delete meaningful session state.

Then rerun the FULL real-origin flow through:
- backup download
- new browser context
- restore
- exact restored state
- second reload
- no errors

The complete runtime gate must become PASS, not BLOCKED.

---

# PDFATLAS — PIN THE PUBLIC LIBRARY COMMIT

The external public paths are now live.

Do not leave the production base URL floating on `main`.

Update:

`config/pdfatlas.json`

from:

```json
{
  "baseUrl": "https://raw.githubusercontent.com/julian-passebecq/pdfatlas/main/"
}
```

to the exact reviewed commit:

```json
{
  "baseUrl": "https://raw.githubusercontent.com/julian-passebecq/pdfatlas/fa5e83f7825cdc837078f87c5e130cb012332195/"
}
```

Then run:

```sh
npm run pdfatlas:sync
```

Verify generated document URLs are commit-pinned and still match exact known:
- SHA-256
- bytes
- page counts

Do not alter the actual PDF bytes.

Keep existing trust rules:
- `raw.githubusercontent.com`
- exact owner/repo
- `library/...pdf`
- HTTPS
- no credentials/query/hash
- no redirects
- exact SHA-256
- byte cap
- PDF magic check

---

# REACT-PDF ENGINE VISUAL POLISH

The existing engine is functional code, but polish it for AtlasNote.

## Canvas

Use semantic theme tokens. Examples:
- Fluent/Neutral/Academic/Lavender: light neutral reader canvas around white PDF page
- Dark Slate: dark slate canvas around white PDF page
- never recolor/invert PDF artwork

Avoid pure black unless explicitly required for Dark Slate.

## Page

- subtle shadow/border
- centered
- sensible max fit
- responsive
- at Fit width, no horizontal overflow at common widths
- spread should center both pages
- narrow viewport keeps spread preference but safely renders one page

## Controls

Compact, one row where possible:
- Previous
- page input / count
- Next
- presentation
- zoom
- rotate
- search
- outline
- optional overflow for less-used actions

Do not recreate a huge Acrobat toolbar.

Use icons/tooltips where AtlasNote already has icon vocabulary.

## Search / outline

Search results and Outline can use a compact overlay/drawer rather than permanently consuming vertical space where practical.

---

# READER SHELL / PDF NORMAL-MODE GEOMETRY

The user wants PDFs readable without entering Focus.

Acceptance target at 1366×768 and 1920×1080:

- top global bar ~ existing 50 px
- pane tabbar ~ existing compact height
- breadcrumb optional slim row
- integrated PDF controls compact
- at least ~70–75% of remaining vertical reader pane belongs to actual document canvas
- no 200–300 px metadata intro

At 390×844:
- no horizontal viewport overflow
- controls wrap or use overflow menu
- PDF remains usable
- tree remains mobile-safe

---

# NOTES/PDF MODE PRODUCT CONTRACT

Clarify terminology everywhere:

- **Notes mode** = note-only library projection
- **PDF Library mode** = PDF-only library projection
- Search can still search all content unless explicitly filtered by the search UI; do not silently destroy cross-content search.
- Existing open tabs may contain either type regardless of current library mode.
- Compare can combine note/PDF or PDF/PDF regardless of discovery mode.
- Library mode changes visibility/discovery, not stored content.

This avoids making the two modes separate applications.

---

# DO NOT REGRESS THESE 1.2 FEATURES

Preserve:

- independent Compare panes
- Pane A blue / Pane B lavender identity
- dual A/B tree markers
- exact survivor behavior when closing Compare
- 5-tab cap per pane
- per-tab history
- per-tab note reading mode
- per-tab PDF mode/zoom/rotation/page
- English toggle independence
- Context overlay rather than width-consuming permanent panel
- five themes:
  - Fluent Blue
  - Neutral/Sage
  - Academic Paper
  - Soft Lavender
  - Dark Slate
- private PDF local intake
- exact PDF byte storage
- SHA dedupe
- backup/restore
- private PDF library export
- public/private publication safety
- no cloud sync
- no private reference corpus in public build

---

# CURRENT REAL CI BASELINE YOU MUST IMPROVE

Actual GitHub runner already proved:

- `npm ci` PASS
- `npm run typecheck` PASS
- `npm test` = **176 / 176 PASS**
- `npm run check:release` PASS
- `npm run test:online:syntax` PASS
- `npm run audit:local` PASS
- Playwright install PASS
- headers PASS
- DOM PASS
- hardening UI = **39 / 39 PASS**
- reader UI = **18 / 18 PASS**
- PDF authoring = **12 / 12 PASS**
- runtime:
  - 7 phases PASS through idempotent
  - `backup_download` FAIL
  - later restore phases blocked only because backup prerequisite failed

The final pass must keep all previous green suites green while adding integrated PDF coverage.

---

# TEST MATRIX — REQUIRED

## A. Existing regression suites

Run all existing:
```sh
npm ci
npm run typecheck
npm test
npm run check:release
npm run test:online:syntax
npm run audit:local
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:headers
npm run test:dom
npm run test:hardening:ui
npm run test:reader:ui
npm run test:pdf:authoring
npm run test:runtime
```

Do not claim release success if `test:runtime` fails.

## B. Integrated engine build

After dependency pinning:

```sh
npm run typecheck:online
npm run build:vite
npm run test:pdf
```

The 17 integrated PDF acceptance rows that were previously blocked must now actually execute.

They include at minimum:
- worker version match
- single rendering
- continuous rendering
- spread
- cover
- physical page navigation
- zoom
- rotation
- outline
- selectable text/search
- image-only behavior
- password path
- original byte download behavior
- PDF Compare behavior
- error/retry handling

Do not count iframe fallback screenshots as integrated-engine PASS.

## C. New 1.2.1 tests

Add:
1. strict note-only projection
2. strict PDF-only projection
3. top-left toggle twice
4. open PDF tab remains intact while switching tree mode
5. integrated PDF has no `.pdf-intro`
6. routine integrated PDF does not render `.pdf-fallback`
7. fallback still works when engine intentionally fails
8. normal PDF layout vertical-space measurement
9. real Fullscreen API request initiated by Focus click (mock only where browser automation cannot actually grant fullscreen)
10. `fullscreenchange` synchronizes Escape exit
11. fallback Focus remains functional if fullscreen request rejects
12. pinned pdfatlas URLs
13. backup download exact personal-state equality
14. integrated production `dist` contains worker/CMaps/WASM/standard fonts
15. no browser-native PDF toolbar in normal integrated path

## D. Viewports

Repeat:
- 390×844
- 1366×768
- 1440×900
- 1920×1080

Capture screenshots of:
- Notes mode
- PDF mode
- integrated PDF normal
- integrated PDF Focus
- PDF spread
- PDF/Note Compare
- Dark Slate PDF
- mobile PDF

---

# CI WORKFLOW RECOMMENDATION

Once integrated PDF is the production build, fold its verification into normal PR CI rather than leaving it only as manual `workflow_dispatch`.

Current `.github/workflows/pdf-runtime.yml` may remain as a targeted gate, but main PR CI should prove the exact deployable distribution.

Suggested order:

1. checkout
2. Node 22
3. Python
4. `npm ci`
5. offline/static validation build if needed
6. core typecheck/tests
7. public release checks
8. browser packages
9. integrated typecheck
10. integrated Vite build
11. integrated PDF runtime
12. real-origin runtime against exact production distribution
13. headers
14. upload evidence
15. upload exact `dist`

Be careful: existing `npm test` pretest may rebuild the offline `dist`. Build the final integrated distribution AFTER all steps that overwrite `dist`, then run production runtime/deploy evidence against that exact integrated output.

---

# NETLIFY CONFIGURATION TO PREPARE (DO NOT DEPLOY)

Prepare `netlify.toml` so the coordinator can deploy the integrated build after your pass.

Expected form:

```toml
[build]
  command = "npm ci && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

This assumes `npm run build` has become the integrated reproducible Vite build.

If you retain `build` as offline for compatibility, Netlify must instead explicitly call:

```toml
command = "npm ci && npm run build:vite"
```

Do not leave Netlify pointed at the fallback build.

---

# DOCUMENTATION / STATUS HONESTY

Update docs so they no longer describe the hosted target as permanently `Browser preview only in this offline build`.

Distinguish:

- integrated hosted build = primary
- browser/native fallback = fallback
- offline compatibility build = optional local fallback if desired

Do not say React-PDF is certified until its tests execute.

If any integrated acceptance row fails, record it as FAIL with evidence.

---

# FILES MOST LIKELY TO CHANGE

Expected review set includes:

- `package.json`
- `package-lock.json`
- `netlify.toml`
- `vite.config.mjs` if needed
- `tools/enable-online.mjs`
- `tools/build-vite.mjs`
- `src/app/App.tsx`
- `src/components/Tree.tsx`
- `src/core/library-projection.ts`
- `src/pdf/PdfReader.tsx`
- `src/pdf/pdf.css` / relevant main styles
- `src/online/PdfEngine.tsx`
- `src/online/pdf.css`
- `src/online/entry.tsx`
- `config/pdfatlas.json`
- generated `content/packs/pdfatlas.public/...`
- `tests/*.test.mjs`
- `tests/compact_12_dom.py`
- `tests/reader_11_dom.py`
- `tests/pdf_runtime.py`
- `tests/release_runtime.py`
- `.github/workflows/ci.yml`
- `.github/workflows/pdf-runtime.yml`
- release docs/evidence

Do not mechanically edit files if they do not require change.

---

# ARCHITECTURAL NON-GOALS

Do NOT:

- rebuild the app from scratch
- introduce another PDF framework if React-PDF/PDF.js works
- embed Mozilla `viewer.html` as a second full application
- ship an Acrobat clone
- convert PDFs to images/HTML
- OCR image PDFs as part of this pass
- add cloud sync/accounts/backend
- publish private PDF bytes
- remove security/hash checks
- merge Notes/PDF content stores into a new schema without need
- rewrite Compare
- redesign the entire shell again
- touch GitHub or Netlify from this Pro implementation pass

---

# QUALITY / FAILURE HANDLING

If React-PDF install/build fails:

1. diagnose exact dependency problem
2. preserve the source tree
3. do not silently fall back and call it finished
4. report blocker precisely
5. still complete independent mode-toggle, PDF-layout, fullscreen-fallback, backup bug work where possible

If the Fullscreen API is unavailable under automated browser policy:
- unit/DOM test the event/state logic
- manually document browser limitation
- do not claim browser-chrome removal was automated if it was not

---

# REQUIRED FINAL OUTPUT IN THIS CHAT

When done, return:

## 1. Live workspace
State the exact path of the complete modified source directory.

Example:
`/mnt/data/atlasnote-1.2.1-workspace/`

Do not delete it.

## 2. Status summary
Include:
- implemented
- not implemented
- tests passed
- tests failed
- blockers

## 3. `WORKSPACE_READY_FOR_GITHUB.md`
Must contain:
- source path
- base provenance
- changed files
- exact dependency versions
- exact build command
- exact test commands/results
- whether package-lock changed
- whether Netlify should run `build` or `build:vite`
- current remaining blockers

## 4. `CHANGED_FILES.md`
One line per changed file with concise reason.

## 5. `FINAL_TEST_STATUS.md`
No blended fake count. Separate:
- core unit
- DOM
- hardening
- reader
- compact
- PDF authoring
- integrated PDF
- real-origin runtime
- clean build
- headers

## 6. Optional safety source ZIP
Allowed only as secondary backup. Do not require the user to download/re-upload it.

## 7. Screenshots
Provide actual screenshots from the implemented build at requested viewports.

---

# FINAL RELEASE GATE

Do not label this production-ready unless ALL of these are true:

- note/PDF top-left mode toggle behaves correctly
- Notes tree excludes PDFs
- PDF tree excludes notes
- large PDF intro zone removed
- integrated React-PDF is the primary hosted build
- browser/native viewer only appears as fallback
- real Focus attempts browser fullscreen and degrades safely
- pdfatlas URLs pinned to `fa5e83f7825cdc837078f87c5e130cb012332195`
- integrated PDF runtime tests pass
- real-origin backup/download/restore/reload flow passes exactly
- clean `npm ci` passes from committed lockfile
- clean production build passes
- existing 176 core tests remain green or intentionally expanded with no regression
- DOM/hardening/reader/PDF-authoring suites remain green
- exact production `dist` is what the coordinator will deploy

Do the complete pass now. Do not stop at a plan.
