# Release acceptance matrix

Mark every row PASS / FAIL / BLOCKED with evidence.

## A. Home and hierarchy
- Create notebook.
- Rename notebook.
- Archive and restore notebook.
- Create folder.
- Create nested folders to at least depth 6.
- Create page at root.
- Create page in deep folder.
- Rename page.
- Move page between folders.
- Move page between notebooks if supported.
- Archive and restore page/folder.
- Manage project groups.
- Reload and verify all changes.

## B. Tabs
- Open 5 tabs in one pane.
- New-tab picker starts a fresh view.
- Ctrl/Cmd-click opens new tab.
- Middle-click opens new tab.
- Right-click menu opens page in new tab.
- Closing active tab activates a sensible neighbor.
- Back/Forward independent by tab.
- Book/Continuous/Parallel state independent by tab.
- English visibility independent by tab.
- Reading position restored after tab switches.

## C. Book
- Long fixture produces >5 sheets.
- Wide single-pane Focus displays paired consecutive sheets.
- First spread is 1–2, next is 3–4.
- One vertical scroller only.
- Short page produces one sheet without error.
- Resize 1366x768 -> 1920x1080 -> mobile, no lost content.
- Font-size change repaginates and restores source anchor.
- Paragraph source reconstructed exactly.
- Code source reconstructed exactly.
- Table rows reconstructed exactly.
- List items reconstructed exactly.
- No stranded heading at tested page endings.
- Mermaid survives cloned Book fragments.
- Page-break starts next virtual sheet.
- Oversized unsplittable block provides readable fallback.

## D. Compare
- Compare button opens pane 2.
- Compare button clicked again closes pane 2.
- Active pane survives top-bar close.
- Same page in two panes.
- Different pages in two panes.
- Book left + Continuous right.
- Parallel left + Book right.
- Divider drag.
- Divider keyboard arrows.
- Swap.
- Per-pane tabs.
- Per-pane history.
- Mobile pane switcher.
- No accidental state leakage.

## E. Focus
- Focus button is immediately before Compare.
- Focus hides full left/right panels.
- Utility rails remain usable.
- Exit Focus restores exact prior sidebar state.
- Escape exits Focus.
- Book remains usable in Focus.
- Compare remains usable in Focus.

## F. Context, remarks, glossary
- Contextual terms only before search.
- Global glossary search.
- Related pages.
- Backlinks.
- Outline jump.
- Folded section opens on jump.
- Remark A saved to page A when rapidly switching to page B.
- Remark B saved to page B.
- PDF revision-specific remark not silently reassigned.
- Remarks excluded from AI export by default.

## G. Search
- title
- body
- code token
- tags
- folder path
- glossary label
- glossary definition
- glossary translation
- bilingual English/Norwegian
- result opens in active pane
- new-tab search result opens separate tab

## H. Learning state / bookmarks
- red/orange/green/gray flag.
- global hide/show flags preserves values.
- document bookmark.
- block-position bookmark.
- reload persistence.
- bookmark still works after source pack update with stable IDs.

## I. Import/update
- import synthetic v1.0.0.
- personal note/flag/bookmark added.
- import synthetic v1.1.0.
- source update applied.
- moved page keeps ID.
- personal state survives.
- v1.1 reimport idempotent.
- same-version different bytes blocked.
- older version blocked/ignored.
- missing stable page IDs never treated as deletion without explicit semantics.
- local source edit conflict requires rebase/explicit resolution.

## J. Backup/restore
- actual backup download.
- ZIP opens.
- fresh browser context.
- restore succeeds.
- remarks exact.
- bookmarks exact.
- flags exact.
- tabs/session as specified.
- imported packs retained.
- local page retained.
- local PDF bytes byte-identical.
- missing attachment dependency blocks incomplete backup.

## K. PDF
- local PDF import into chosen folder.
- local bytes persist after reload.
- integrated engine actually loads.
- worker version check.
- single page.
- continuous.
- two-page physical spread.
- cover-alone.
- page input.
- zoom.
- rotate.
- outline.
- searchable selectable text.
- image-only reports no selectable text; no fake OCR.
- password PDF unlock + bad-password retry.
- password never persisted.
- note + PDF Compare.
- PDF + PDF Compare.
- original PDF open/download.

## L. Security / release
- no private corpus in public `dist`.
- release allowlist/hash check.
- no raw notebooks.
- active SVG rejected.
- path traversal rejected.
- ZIP bomb limits.
- no executable notebook imports.
- dependency/license audit.
- Netlify headers verified.
- accessibility smoke.
- no uncaught errors.
