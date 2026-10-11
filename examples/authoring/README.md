# Authoring integration fixtures

These independently authored synthetic QA inputs contain no owner library, screenshot
transcription or publisher content. Import only into a disposable local browser profile.

- `sql-study.cheatsheet.json`: native schemaVersion 1.1, fixed 1200 × 1600 pages,
  SQL/code, table and native outline. SQL dialect: SQLite 3 and PostgreSQL-compatible
  portable SELECT queries; execution evidence uses SQLite only.
- `norsk-source.import.csv`: exact source spellings, quoted commas/quotes and deliberately
  blank relations. This synthetic fixture tests preservation, not dictionary accuracy.
- `article-blocks.import.json`: native ArticleSource with one canonical resource ID,
  nested section, code, table and callout. Page V2 is a QA projection only.

The browser gate imports files through the real UI, checks durable IndexedDB, edits
the cheatsheet, reloads, rejects invalid inputs and restores a downloaded backup into
a new isolated context. It does not prove remote hosting, owner-profile recovery,
physical input behavior, publisher rights or all 300 SQL questions.

Run after building the actual app:

```powershell
node --test tests/authoring-contract.test.mjs
python tests/authoring_runtime.py
```
