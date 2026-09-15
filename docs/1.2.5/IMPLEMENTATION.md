# AtlasNote 1.2.5 implementation notes

## Exact baseline

The uploaded `atlasnote-main (1).zip` matches the complete Git tree of remote main **b5e63f71185bcf525e985dfad1260d38ed3c4918**, the released 1.2.4. Both the uploaded baseline and GitHub report tree **72a8ea2ca18944a3c897d86f39579c7a347e3c37**. No old feature branch was used.

The archive had no Git history. A local baseline commit `f7ccc64b9ee3c1c1dc82f10bfbbe6c522b2c4225` records that identical tree, then the local branch `feature/atlasnote-1.2.5-reader-interview-polish` was created. This synthetic local commit is **not** the upstream starting SHA and is not its descendant. The delivered patch is a tree delta against the exact upstream baseline. No remote branch was created or modified; GitHub was read only. There is no merge or deployment.

## Reader controls and navigation

The existing `Pane.readerChromeCollapsed` field remains the only visibility preference. Each pane owns its + / A-B identity / Show-Hide reader controls, followed by tabs. The global toggle was removed, not copied into a new setting. Pane A/B highlighting remains; the star was removed. Clicking document tabs/body selects a pane; the existing A/B collapse affordance still collapses without closing tabs.

The nine-button navigation strip is app home, search, back, forward, left sidebar, Context, Focus, Compare, Swap. The Notes/PDF library switch is in the library filter row rather than occupying its first icon. With the sidebar collapsed the compact strip stays in the navigation dock. True Focus retains its separate Exit focus / Escape affordance.

The right rail groups Context/Workspace States; Bookmarks/Read Later; Export to AI/Theme; Settings. The existing More / Settings menu remains available, with its settings gear and actions. There is no global reader toolbar toggle in either rail.

A browser regression reproduced the pointer-down/outside-close race in the relocated top-left Context toggle. FloatingPanel now excludes explicitly marked panel-toggle controls from its outside-close handler. Clicking the toggle closes rather than immediately reopening the panel.

## PDF navigation is a projection, not a migration

`pdfNavigationSections` removes notebook groups and generic PDF Atlas wrappers, retaining at most two meaningful folder levels before the canonical PDF node. Domain/subject IDs and canonical PDF nodes are retained, as are archived/hidden filters and the original metadata/path. Note trees are unchanged. PDF indentation and typography are reduced independently.

Below the PDF, the existing categoryPageRows projection remains category -> physical-page/topic. Different useful titles on the same physical page are intentionally retained. Existing page actions keep their original typed targets and revision safeguards. Definitions and editing remain in Manage PDF details; no deep Companion term tree was restored.

## PDF wheel correction

The prior 90-pixel threshold, 220-ms gesture idle, 500-ms turn cooldown and 1,200-ms slow-tick accumulation window are unchanged. A wheel turn previously set pending restoration, but a subsequent momentum event could mark the reader as scrolling and cancel that restoration before the next canvas settled. The engine now consumes the remainder of the completed gesture while restoring the new physical page. Native mid-page and continuous scrolling remain native. A new intentional gesture is allowed after the existing idle gate and rendering.

A second correction retains the selected physical page at terminal spread/grid boundaries. A reverse wheel at the first group must not silently change selection from page 3 to page 1 just because no earlier group exists.

The new `test:pdf:wheel` suite uses real `mouse.wheel` events, real PDF.js canvases, and rendered physical-page assertions in Single, Spread, Grid and Compare. It also checks reverse progression and momentum. It does not manufacture progression by editing page-number fields or injecting scroll positions. These integrated tests are **not certified by the offline or pure-function tests**. Read FINAL_TEST_STATUS.md for actual execution status.

## Active-document Context

The existing floating right panel now contains Outline / Glossary, Search, Remarks, Related, History. Its document heading is visible; it is not a saved-workspace panel. The PDF outline reuses category/page entries. Notebook outlines retain their richer headings. Glossary results are restricted to entries linked to the document.

Search matches only this notebook's sections/code/text, its relevant glossary, or this PDF's page headings. Selectable PDF text search is explicitly initiated and registered to the exact active workspace/pane/document. It searches at most 1,000 physical pages, reports the searched/total count, is cancellable, and never fetches an unopened/disallowed PDF just to populate Context. Image-only PDFs are reported as lacking selectable text; there is no OCR. The offline fallback reports why integrated text search is unavailable.

Related links are explicit page overlays, including notebook-to-PDF and PDF-to-notebook links, with backlinks. There is no recommendation engine. History adds only a validated optional list of at most 50 document records (`firstOpenedAt`, `lastOpenedAt`), displaying 12 recent visits. Source added/modified dates are marked unknown instead of invented. Last remark modification is displayed when known. No remote analytics, full activity stream or schema-envelope/database version change was added.

## Workspace States

The dedicated Workspace States panel embeds the existing SavedStatesDialog. Its 1-5 and All scopes, saves, restore, rename/progress, history, deletion and undo are unchanged. Four existing quick actions are presented above it. Shared notes, reflections, reading lists, visits and library/PDF content are not rolled back by a reading-state restore.

## Interview prototype and boundaries

See INTERVIEW_CONTENT.md. The 15 samples are native pages with standard safe code and diagram blocks, not a new content type. No cheatsheet, PNG/SVG cheatsheet format, game, runner, score or dashboard was added.

## Compatibility corrections

The supplied baseline had an existing TypeScript error from a generic querySelector call through an untyped event parent. The parent is now explicitly typed. Tests that relied on the first pack in alphabetical order now select the canonical reader-guide pack by ID; the new interview pack must not accidentally replace the old fixture under test. Legacy navigation/state-manager selectors were updated for their documented new locations while preserving equality, source-preservation, physical-page and backup assertions.

### Persistence and rapid note switching
Context preserves its selected task while documents change, so rapid A-to-B remarks still write to the correct stable page keys. Document-specific search/link drafts are reset and an in-flight PDF search is cancelled.

A reader mount records a genuine local last-open visit. The normal-origin runtime assertions allow only that specific active-document visit to change on reload/restore: first-open date is preserved, last-open is monotonic, every unrelated visit and all other personal fields remain exact. Backup payload and canonical-vs-IndexedDB comparisons remain exact. Seven negative/positive Python assertion tests run from the Node release unit suite.

Legacy DOM tests now assert the intentional 1.2.5 locations and projected hierarchy rather than missing 1.2.4 controls. Exact expected notebook counts increase by one (the added interview notebook). The contextual glossary test asserts that a glossary term linked only to another document is excluded from document Search but remains discoverable in Global search; linked definitions, related documents and backlinks are still tested. PDF provenance/rights/hash/original-download assertions remain on the existing Document info surface, while Context tests its new document outline. The compact search button is explicitly constrained to 24-28 px, matching the requested nine-control strip.
