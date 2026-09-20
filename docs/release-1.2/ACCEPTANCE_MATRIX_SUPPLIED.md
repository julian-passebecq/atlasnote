# Acceptance Matrix - AtlasNote 1.2 Compact Library Pass

All existing release/security/data-preservation tests remain in force. Update tests only when the product behavior intentionally changes.

## A. Regression baseline

- [ ] `npm ci` succeeds with the final lockfile.
- [ ] TypeScript typecheck passes.
- [ ] Existing Node suite remains green (127 baseline tests, plus new tests).
- [ ] Release/private-content check passes; no private reference library leaks into public build.
- [ ] DOM/browser hardening suite passes after intentional selector updates.
- [ ] Reader 1.1 behavioral contracts remain intact unless explicitly superseded below.
- [ ] PDF preparation/authoring suite remains green.

## B. P0 persistence

- [ ] Runtime normal-origin test survives reload with exact equality for notes, ratings, bookmarks, overlays, imports, assets AND `personal.session`.
- [ ] Runtime flow continues past reload and completes import-v2, idempotent reimport, backup download, fresh context, restore, restored exact state, restored reload and no-errors gates.
- [ ] No test relaxation, storage mock or browser-policy workaround is accepted.

## C. Compact chrome

- [ ] Visible `Knowledge Atlas`/`LOCAL` brand block no longer consumes the top ribbon.
- [ ] Global search occupies the primary top-bar area.
- [ ] Export-to-AI is icon-only in routine chrome with accessible label/tooltip.
- [ ] Compare is icon-only in routine chrome with accessible label/tooltip.
- [ ] No overflow at 1366x768, 1440x900, 1920x1080 and 390x844.
- [ ] Context drawer overlays instead of shrinking the reader canvas.
- [ ] Opening/closing Context does not alter reading anchor, split ratio, active pane or saved history.

## D. Right reader rail

- [ ] Rail grouping/order matches the product decisions.
- [ ] Focus affects the active workspace exactly as before.
- [ ] Reading Mode applies only to active pane/view.
- [ ] Context opens the preserved Context/Outline/Remarks drawer.
- [ ] Compare opens/closes without cloning source pane.
- [ ] Swap works only when relevant.
- [ ] Bookmark targets active view/page.
- [ ] Theme popover exposes exactly five themes.
- [ ] More/Settings exposes learning-flag visibility and less-frequent actions.

## E. Compare pane identity

- [ ] Pane A selected tab has blue identity.
- [ ] Pane B selected tab has lavender identity.
- [ ] Tree marks Pane A page in blue.
- [ ] Tree marks Pane B page in lavender.
- [ ] Same page in both panes gets a dual marker.
- [ ] Active pane has a non-color-only indicator.
- [ ] Behavior remains clear under all five themes.
- [ ] Same-page Compare still preserves independent history/layout/English/PDF state.

## F. Themes

- [ ] Fluent Blue
- [ ] Neutral/Sage
- [ ] Academic Paper
- [ ] Soft Lavender
- [ ] Dark Slate
- [ ] all persist through reload and backup/restore
- [ ] old backups with the original three theme values still validate
- [ ] text/focus contrast tests pass
- [ ] dialog, tree, collection, context drawer, tabs, PDF, Focus and Compare surfaces are all themed

## G. PDF Library mode

- [ ] top-left mode icon toggles Notes <-> PDF Library
- [ ] PDF mode uses the same notebook/folder/subfolder tree
- [ ] note leaves are recursively filtered out in PDF mode
- [ ] folders/notebooks with PDF descendants remain visible
- [ ] PDF leaf click opens in the same tabs/panes shell
- [ ] Focus works on PDF
- [ ] Compare supports PDF/PDF and Note/PDF
- [ ] bookmarks/remarks preserve document identity and revision rules
- [ ] PDF presentation state is independent per view
- [ ] no second PDF dashboard/shell exists

## H. pdfatlas external library

- [ ] If PDF snapshot supplied, both actual PDFs are inspected and truthfully named/categorized.
- [ ] SHA-256/size/page count are recorded from actual bytes.
- [ ] Stable IDs do not depend on path.
- [ ] Returned organized pdfatlas package includes README + manifest + category directories.
- [ ] AtlasNote bundles metadata/tree only; it does not duplicate public pdfatlas binaries into the app build.
- [ ] URLs use raw GitHub form, not `blob` HTML.
- [ ] final coordinator can pin all URLs to one pdfatlas commit in a single well-defined place.
- [ ] only exact `raw.githubusercontent.com/julian-passebecq/pdfatlas/...` entries bypass the arbitrary-external consent gate.
- [ ] arbitrary external PDFs still require consent.

## I. Integrated PDF engine - preferred final gate

If dependencies are available:

- [ ] online/Vite build succeeds
- [ ] PDF.js worker metadata/version compatibility passes
- [ ] single page
- [ ] continuous pages
- [ ] spread / cover-alone
- [ ] page input
- [ ] zoom
- [ ] rotation
- [ ] outline
- [ ] selectable-text search
- [ ] image-only no-fake-OCR behavior
- [ ] password wrong/correct flow
- [ ] password not persisted
- [ ] Note/PDF Compare
- [ ] PDF/PDF Compare
- [ ] original download is byte-identical
- [ ] worker mismatch fails safely and can retry

If dependencies are unavailable, these rows must be reported BLOCKED, never PASS.

## J. Deliverable quality

- [ ] no GitHub or Netlify operations performed
- [ ] source ZIP contains complete project root, not a patch-only bundle
- [ ] build ZIP is deployable with `index.html` at root of extracted build contents
- [ ] organized pdfatlas ZIP returned separately when source PDFs were supplied
- [ ] actual test logs/results included
- [ ] screenshots include: compact single-pane, Compare pane identity, PDF Library tree, PDF opened, context drawer, each of five themes, narrow viewport
- [ ] release report lists every PASS/FAIL/BLOCKED row without hiding blockers
