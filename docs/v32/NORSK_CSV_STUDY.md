# Norsk CSV reading and study controls

The Newspaper starts with progress controls off. A small `Study` toolbar button
reveals the existing New/Learning/Known controls; switching it off preserves
ratings. The remaining per-row book button opens Focus. Study resets to off when
the surface remounts.

UTF-8 CSV/TSV files can now enter through Workspace settings. The bounded parser
supports comma, semicolon, tab, BOM, escaped quotes and multiline cells. It rejects
broken row widths, invalid UTF-8, unclosed quotes and oversized inputs. Preview
does not write content. Confirmation reuses `readWorkspace`, `planImport` and
`WorkspaceStore.importPacks`; authored pages/tree/history remain atomic.
No new store, database migration, provider call or automatic publication exists.

The original CSV file is not retained as an attachment. Parsed cells become
canonical Notebook table blocks, at most 40 rows per page. Same-filename local
imports advance a private pack version, retaining page IDs. Existing source edit
conflicts and omitted pages block replacement through the normal import planner.
Direct CSV import currently assigns Norsk, with arbitrary column headers retained.
For NO/EN presentation put Norwegian in column 1 and English in column 2.

Pages tagged `csv-table` expose Columns, Table, NO / EN and Lines controls.
The first three columns are visible initially. NO / EN displays the first two
visible cells next to each other; extra selected columns appear beneath. Lines
shows selected cells vertically, with source column 1 bold. Reading masks/layout
use bounded keys in the existing pane-local disclosure map, never alter source
or authored history, and survive reload. Print projection retains all columns.
Book measurement, semantic row splitting and delegated actions remain in use.

Ten owner-authorized lexical CSV selections add 1,449 entries in 41 Notebook
pages. Folders cover A2 vocabulary, B1 vocabulary, B2 thematic vocabulary,
grammar and writing/essay connectors. These are interactive Notebook fiches,
not fixed SVG Cheatsheet resources. The public selection excludes textbook
passages, definitions, exam examples and complete textbook translations.
CSV sources total 196,234 bytes; generated pages total 378,852 bytes.
The original workbooks are kept outside the repository.

## Local validation

Final local pass: 1,171/1,171 unit tests, both TypeScript configurations,
integrated build, PDF Atlas provenance and generated-source check pass.
CSV integrated runtime: 5/5; existing Norsk Daily runtime: 8/8;
compact responsive runtime: 5/5. These use disposable local profiles.

- Parser/converter tests reconcile every selected row and canonical schemas.
- Existing original 1.2.1/V2 catalogue assertions stay exact; the added pack is
  counted separately, as for the existing V3 seed.
- Integrated disposable-profile test covers preview vs confirmation, real
  IndexedDB reload, A/B independence, Book controls, intact source and the actual
  app print projection. Its native print call is stubbed; it is not physical
  printer or produced-PDF proof.
- Norsk Daily existing reviewed workflow and compact responsive reading tests.
- React review: no new dependency/fetch, stable IDs, accessible pressed states,
  validated action indices and at least one visible column. Only the selected
  40-row page is rendered; full wordbanks are not mounted in one canvas.

The first integrated persistence test caught invalid preference keys rejected
by the existing disclosure-ID validator. The keys were corrected; storage rules
were not relaxed. Earlier failed unit isolation output also captured edits made
while source-drift checks ran; the final full run must use stable source.
Private logs/screenshots remain under `D:/PROJ/atlasnote-private/norsk-csv`.
Local checks do not substitute for exact deployed-SHA and owner Access checks.
