# AtlasNote V2 working agreement

This repository continues the completed 1.2.7 application. Read START_HERE.md, V2_REFERENCE_MODEL.md, REQUIREMENTS_COVERAGE.md and FINAL_TEST_STATUS.md before editing.

- Notebook structural folders/pages and manual pins remain user-owned. Concept Index and exact semantic links are separate optional personal state.
- Use the existing ResourceTarget and ReadingDestination union. Do not introduce competing target stores or persisted backlink mirrors.
- Reference Lens rows are virtual. Explorer is a closable system tab, not a fake content Page or sixth content type.
- Keep the existing database `knowledge-atlas` version 2 and full-backup envelope. Workspace checkpoints must not rewind newer semantic state, captures or QCM attempts.
- AI review is local export/import only. Validate the entire batch and stale source/semantic revisions before mutation; preview and accept are distinct.
- Preserve real PDF canvas/wheel/restore assertions and independent panes. A compatibility harness is never evidence of durable storage or integrated PDF behavior.
- No automatic GitHub writes, merge, deployment, cloud sync, scraping, secret keys or private library publication.

Run `npm ci`, `npm run test:release` in a normal environment for release verification. `npm run bootstrap:offline` is only the documented compatibility fallback; label its results accordingly. Keep failures and blockers visible and attach actual evidence rather than changing assertions to manufacture a pass.
