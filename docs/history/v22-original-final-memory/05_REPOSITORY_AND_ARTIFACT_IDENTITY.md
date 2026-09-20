# Repository and Artifact Identity — verified 2026-09-18

## GitHub repositories

### AtlasNote production

Repository: `julian-passebecq/atlasnote`

Default branch: `main`

Current production/main head verified via GitHub:

`b50c27a987fa65eee1c51d36225908621e322da7`

Commit title: `AtlasNote V2.1.0`

This is the frozen production baseline. The local V2.2 candidate has not been pushed/merged/deployed.

### PDFAtlas

Repository: `julian-passebecq/pdfatlas`

Current/main head verified via GitHub:

`fa5e83f7825cdc837078f87c5e130cb012332195`

AtlasNote `config/pdfatlas.json` on production `main` points to:

`https://raw.githubusercontent.com/julian-passebecq/pdfatlas/fa5e83f7825cdc837078f87c5e130cb012332195/`

Therefore current production is pinned to the exact immutable PDFAtlas commit and not `/main/`.

## Local handoff/artifact hashes

Exact uploaded V2.1 source baseline ZIP (`atlasnote-main (3).zip`):

`02e6d1d34ee2d372f102ab4f810f8b19255b9194cd94962054ffa7e41916da49`

Authoritative V2.2 end-state handoff ZIP:

`a1406e7fccb1b96fe397371f08f793a1205938faefa949c19ad1aad891c5a42e`

Delivered V2.2 candidate source ZIP:

`c0135d375c58871865660743f3a51747d8c69a94c91b6c7e16c9d40c19dee11d`

Delivered V2.2 reports/evidence ZIP:

`7a7a8ff9ae3f75e51ebb3ec18ad77e2c50527de12a26ef557e1285751082764e`

Small audit/QA ZIP:

`44e453fc9bc5581da5b1b8e96f45a1adabae7bf558b0a954107ca0ab9aa2acbb`

## Important distinction

- Git commit/history = application development history.
- AtlasNote full backup = user knowledge/workspaces/history/assets.
- AtlasNote Version History = logical content evolution inside the app.
- PDFAtlas Git commit = immutable source-library snapshot for public PDF bytes.
- PDF SHA-256 = exact byte identity of one PDF revision.

Do not collapse these identities.
