# AtlasNote V3.2 Web study candidate

AtlasNote stays a **Web application**: React + Vite, browser-local IndexedDB and manual
verified backup/recovery. The current mission uses supplied baseline `9034025`
on `codex/v32-master-execution`, continuing the V3.2 study application.

V3.2 adds a compact Norsk Daily newspaper/focus workflow without changing the database,
PDF engine contracts or the five-workspace/A-B architecture.

Start with [START_HERE.md](START_HERE.md).
Manual content generation and reproducible real-app import checks are documented
in [authoring integration](docs/v32/AUTHORING_INTEGRATION.md).

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

The default Wrangler configuration is local-only and refuses deployment. Explicit
QA and production configurations have separate preflight guards; see
[Cloudflare commands](docs/v32/CLOUDFLARE_HANDOFF.md). The current
[execution backlog](docs/v32/EXECUTION_BACKLOG.md) distinguishes source checks,
local browser evidence and live QA. Production requires separate owner approval.

## Data safety

IndexedDB `knowledge-atlas` stays at version 3 with the same five stores. A Git clone is
not a backup of browser-local data. Before changing browser origin or testing with valuable
content, create and independently verify a complete recovery bundle from Settings.

## Qualification

The V3.2 qualification workflow is **manual only**. Normal pushes do not spend Actions
minutes. Earlier V3.1 PASS evidence remains historical evidence and must not be relabelled
as V3.2 qualification.
