# AtlasNote authoring integration — 2026-10-11

The three authoring formats have reproducible real-app import coverage. The installed
AtlasNote Authoring plugin 0.4.1 is available in this Codex session. No new importer,
storage migration, write server or draft inbox was required.

## Formats and acceptance boundary

| Capability | Manual input and UI path | Preserved contract |
| --- | --- | --- |
| Cheatsheet | Native `schemaVersion: "1.1"` JSON → More / Settings → Import cheatsheet JSON → Validate source → Import local cheatsheet | Fixed 1200 × 1600 pages; canonical JSON; globally stable block/page IDs; all five palettes |
| Norsk | UTF-8 CSV → Workspace settings → Choose CSV → preview → Confirm library import | Exact source cells, Unicode, provenance and blank relations; 40 source rows/page |
| Article | ArticleSource JSON → Article content → Add article → Advanced / JSON → Import JSON file → Import local content | Exactly one of text/blocks; safe typed blocks; `page.id === page.article.id` |

Manual UI confirmation is an explicit local owner write through WorkspaceStore/history.
Agent proposals still require preview → stage → explicit human acceptance. A Page V2
QA projection is not a direct Article/Norsk import file. An authenticated plugin draft
inbox remains optional and deferred; no automatic storage integration was added.

## Reproducible checks

```powershell
npm run build:offline
node --test tests/authoring-contract.test.mjs
python tests/authoring_sql.py
node tools/check-authoring-plugin.mjs <installed-plugin-root>
npm run build
python tests/authoring_runtime.py
python tests/csv_tables_runtime.py
python tests/csv_presets_runtime.py
```

`check-authoring-plugin.mjs` reads an explicitly supplied plugin root. It checks eight
exact native files, both Page V2 schema copies, CSV behavior with Unicode/quoting/
multiline/empty/malformed inputs, and all three plugin examples against actual local
validators/renderer. Divergence fails closed. No plugin installation/publication is
performed by that command.

`authoring_runtime.py` runs the integrated app in isolated Chromium contexts on a
normal local HTTP origin and real IndexedDB. Its nine cases cover invalid-input
recovery, file imports, exact structured Article/text compatibility, collision rejection,
cheatsheet source editing, source and reading-layout persistence, full UI backup,
fresh-profile verified restore and uncaught browser errors. The full backup materializes
built-in packs and retains original local imports separately; history uses verified
archive shards. Assertions preserve that existing format rather than expecting a
local-only backup. No owner browser profile is opened.

## Evidence and limits

Initial evidence is stored outside Git at
`D:/PROJ/atlasnote-evidence/master-20261011/`:

- `authoring-runtime-diagnostic-8/results.json`: 9/9 real local UI cases PASS.
- `csv-tables/results.json`: 5/5 retained importer/A-B/Book/print-projection cases PASS.
- `csv-presets/results.json`: 9/9 retained grouping/search/collapse/preset/reload cases PASS.
- `authoring-native-previews-v2/validation-report.json`: JSON Schema and native semantic
  validation PASS; three pages × five palettes; zero overflow diagnostics.
- Source/black/paper PNGs of all three pages were visually inspected: readable code,
  clear table alignment, no clipped content. Remaining blank space is deliberate
  revision-sheet spacing. Browser import/reload screenshots confirm native rendering.

These initial browser runs used the diagnostic integrated build at source `9034025`
with `sourceDirty: true`. They establish exercised local behavior, not a clean release,
remote QA deployment, live owner library, native printer or PostgreSQL execution.
The final qualification record must identify and rerun the frozen clean candidate.
Early harness failures remain in `authoring-runtime-diagnostic-1` through `-6`:
incorrect UI edit label, Python Windows source-decoding mismatch, and incorrect
assumptions about materialized backup imports/history. They were harness defects;
no application assertions or storage contract were weakened to pass.

The ten repository Norsk CSV sources were rechecked with the native parser and their
existing preservation tests. They remain 1,449 rows over 41 pages; source selections
are not independent dictionary validation. Publication decisions stay separate.

## Plugin package

The original package exists at
`C:/Users/julia/Downloads/atlasnote-authoring-plugin-v0.4.1.zip`.
SHA-256: `3128279c361dac51f238b681d055909463dc65965553a1d2da12174a4309c65d`.
The installed skill/reference/example files match that archive. The host-normalized
`.codex-plugin/plugin.json` differs; installation metadata is not native app-contract
evidence. No plugin code update was justified by this alignment check. The existing
archive is the exact handoff artifact, not a newly published plugin. Private source
screenshots, owner libraries, backups and credentials are not added to it.

## SQL source inventory and useful output

The owner ZIP was located at
`C:/Users/julia/Downloads/atlas-sql-video-frames-all-20.zip`. Its 20 PNG frame hashes
all match the supplied extraction manifest. Inventory and conservative uncertainty
ledgers are private evidence under `sql-source/`; no source image is added to Git.

Readable chapter headings cover basics, filtering/sorting, aggregates, GROUP BY/HAVING,
two join chapters and thirteen subquery chapters. The last inspected frame visibly
contains Q241–Q247 and a recap. The cover says 300, but these supplied frames do not
establish 300 distinct available/readable questions. Compressed code/result tables
cannot support a complete faithful transcription. No missing question is invented.

`examples/authoring/sql-study.cheatsheet.json` is a separate independently authored
three-page study fixture: filtering, sorting, counts, HAVING, LEFT JOIN, scalar and
correlated subqueries, CTEs, deterministic ROW_NUMBER and running SUM/ROWS. CTE/window
content is added pedagogy, not an assertion that it was visible in these slides. It
contains small exercises and six portable queries executed with SQLite 3.50.4. No
PostgreSQL execution is claimed. The source-derived private handoff clearly separates
topic selection from these new examples. Faithful reconstruction of all tiny source
queries and unavailable Q248–Q300 remains outside the completed output.
