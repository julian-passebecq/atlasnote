# AtlasNote V3.2 Web study candidate

AtlasNote stays a **Web application**: React + Vite, browser-local IndexedDB and manual
verified backup/recovery. The current development line is
`feat/atlasnote-v32-web-study`, based on the V3.1 stabilization work.

V3.2 adds a compact Norsk Daily newspaper/focus workflow without changing the database,
PDF engine contracts or the five-workspace/A-B architecture.

Start with [START_HERE.md](START_HERE.md).

## Current scope

- Atlas A/B readers, Notes, PDFs, Cheatsheets, Articles and QCM remain unchanged.
- Norsk Daily gains Newspaper, bilingual Focus, topic filtering and local study search.
- Existing ratings remain the Norsk New/Learning/Known progress mechanism.
- Existing reviewed Article/QCM resources remain canonical.
- No scraping, cloud sync, remote AI runtime, Electron shell or new storage backend.

## Hosting

Cloudflare Workers + Static Assets remains the primary hosting adapter and Cloudflare
Access remains the managed access boundary. Source validation does not prove the live
account configuration.

The active repository Wrangler file still targets a former QA Worker. Production
deployment requires an explicit owner-authorized live-account check; this branch does not
deploy anything.

## Data safety

IndexedDB `knowledge-atlas` stays at version 3 with the same five stores. A Git clone is
not a backup of browser-local data. Before changing browser origin or testing with valuable
content, create and independently verify a complete recovery bundle from Settings.

## Qualification

The V3.2 qualification workflow is **manual only**. Normal pushes do not spend Actions
minutes. Earlier V3.1 PASS evidence remains historical evidence and must not be relabelled
as V3.2 qualification.
