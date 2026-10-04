# AtlasNote 3.2.0-rc.1 — Web study candidate

Branch: `feat/atlasnote-v32-web-study`.

This branch continues the qualified V3.1 Web application. It does **not** replace
AtlasNote with Electron and it does not add cloud synchronization. Atlas remains a
React/Vite browser application with browser-local IndexedDB data and verified manual
backup/recovery.

Start with [docs/v32/IMPLEMENTATION.md](docs/v32/IMPLEMENTATION.md), then
[docs/v32/TEST_PLAN.md](docs/v32/TEST_PLAN.md).

## What V3.2 changes

The first V3.2 pass concentrates on Norsk Daily:

- **Newspaper** mode for scanning the day's accepted study items.
- **Focus** mode with Norwegian on the left and generated English on the right in
  one scroll surface.
- local full-text search across headline, generated translations/paraphrases,
  grammar labels and vocabulary;
- topic/section filtering when source metadata provides a section;
- vocabulary search and per-story vocabulary;
- keyboard `/` focuses Norsk Daily search;
- existing New / Learning / Known ratings remain the progress store;
- the existing Article and QCM resources remain canonical — Norsk Daily is only a
  study projection over accepted content.

No article scraping, remote AI call, automatic feed fetching, new IndexedDB store or
database migration is introduced.

## Preserved V3.1 foundation

V3.1 PDF navigation, A/B panes, immutable history, five workspaces, recovery,
ChangeSet review, PDF Atlas provenance and the browser storage model are unchanged.

Database: `knowledge-atlas`, version **3**, same five stores.

The exact earlier V3.1 application commit
`5631933357b23de984d9b24c94cac0f04faca34f` has its own historical
verification report at [docs/v31/VERIFICATION_20260926.md](docs/v31/VERIFICATION_20260926.md).
Those PASS results are not fresh evidence for this V3.2 branch.

## Run locally

Use Node >=22.12 and a real Git checkout:

```powershell
git clone --branch feat/atlasnote-v32-web-study --single-branch https://github.com/julian-passebecq/atlasnote.git atlasnote-v32
Set-Location atlasnote-v32
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`.

Before using an existing browser profile with a candidate build, export and independently
verify a complete recovery bundle. localhost, Cloudflare and Netlify are different browser
origins and therefore have independent IndexedDB data.

## Qualification

A new workflow, **V3.2 Web study qualification**, is intentionally
`workflow_dispatch` only. It consumes no GitHub Actions minutes from normal pushes or
PR creation. Run it explicitly when the source pass is ready for qualification.

Until that workflow and owner browser checks pass, this branch is an implementation
candidate, not a release.

## Cloudflare boundary

Cloudflare remains the intended primary host. The repository already contains the
Wrangler Static Assets configuration, static security headers and provider-boundary tests.

The repository configuration still names the former QA Worker
`atlasnote-v23-qa`. **Do not run `wrangler deploy` blindly.**

The last documented production observation remains source `bcd1e0f` / Cloudflare
Worker version `6f1e75f7`; that is historical evidence, not a fresh live check.
See [docs/v32/CLOUDFLARE_HANDOFF.md](docs/v32/CLOUDFLARE_HANDOFF.md).

No production deploy, Access policy change, token change or Netlify activation is part of
this branch.
