# AtlasNote 1.2.4 - reading managers and PDF overview

Status: implementation checkpoint; external release checks remain required. FINAL_TEST_STATUS.md is the authoritative current validation record. Historic reports are not fresh execution evidence.

## User-facing changes

Navigation controls are icon-only, with Search immediately after PDF/Notes. The reader controls toggle moved to the same top-left strip and affects the active pane. New panes default to hidden reader controls; explicitly stored values remain intact. The right rail uses small separators between functional pairs.

Bookmarks and Read later occupy separate right-side panels. Each has six subject tabs: All, Informatics, Cloud, Norsk, Job and Personal. Saved items are shared across the five workspaces. Items can be filtered, renamed, annotated, recategorized and removed with confirmation. Read later additionally supports read/unread status and pasted HTTP(S) URLs with a deliberate external-link click. There is no remote preview fetch or server-side queue.

Reading-state management is embedded in Context: Workspace saves has numbered slots 1-5; All-workspace saves has no redundant one-option selector. Remarks and original page details remain available. The existing save/restore/undo/history semantics and full-backup integration are preserved.

PDF study navigation contains only top-level categories and page-heading rows. Descendant metadata contributes page headings, not nested branches. Repeated physical pages are allowed when the headings differ. Whole PDFs, page references and categories can be queued separately. Definitions, glossary promotion and metadata authoring remain available through Manage PDF details, without a panel beneath the reader.

A new four-square quick control renders up to four consecutive physical pages in two columns and two rows. It uses the real React-PDF/PDF.js engine, selectable text and original page dimensions/rotation. Grid and two-page Spread are independent modes. A final incomplete group renders only existing pages. Current page selection and saved references use physical page numbers, not group numbers. At small viewport sizes, the four-page overview remains a small overview; choose Single for detailed reading.

## State, privacy and compatibility

New optional fields extend existing personal state; old backups do not have an empty reading queue injected. Bookmark targets can identify pages, collections, PDF pages or PDF categories. Read later can additionally identify validated URLs. External addresses reject unsafe schemes, credentials and invalid whitespace/control characters. A queue is bounded to 500 entries / 2 MiB; it never silently evicts old entries. Saved-state bounds remain unchanged.

Queue and bookmark mutations use the existing storage path. Reading-state snapshots contain sessions, not copies of the library or reading queue. Restoring a session preserves newer shared lists and content. Full library backup serialization includes the new personal data. Source IDs, PDF revisions, attachment integrity and publication safeguards remain in place.

Known-reference mismatch or missing imported content produces an error without deleting the saved entry. Destination panes are checked for five-tab capacity before creating or selecting another workspace. Whole-document bookmark toggles cannot delete category bookmarks.

No new API, cloud database, account, paid package or production site is introduced. Dependency versions remain pinned as in the source baseline.

## Evidence boundaries

Current component/UI evidence comes from executing the current source, not from inherited 1.2.4 screenshots. About:blank test harnesses use real UI handlers and real PDF.js for PDF tests, but suppress persistent storage writes. They cannot certify IndexedDB. Normal-origin runtime suites and fresh-context backup restoration remain required in local/Codex or GitHub CI.

The original unzipped 1.2.4 source was absent after the runtime transition. Reconstruction used the complete supplied 1.2.3 source archive and its committed runtime-test corrections. This checkpoint includes the entire reconstructed source and a recovery ZIP to remove dependence on temporary chat directories.
