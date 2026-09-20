**V2.3 candidate:** see `v23/ARCHIVE_FORMAT.md`, `v23/ASSET_REACHABILITY.md`, `v23/RECOVERY.md`, `v23/ACCESS_CONTROL.md`, `v23/QA_DEMO.md` and `v23/QA_MATRIX.md`. Status BLOCKED; existing architecture below remains authoritative.

**V2.2 completion addendum:** Read `../START_HERE.md` and `v22/BROWSER_AGENT_SEMANTICS.md`; the current code has not been release-tested.

# Current architecture index - V2.2

- `../START_HERE.md`: release truth and baseline identity.
- `../V22_ARCHITECTURE.md`: adapters, revision engine, current/history projection and UI.
- `../V22_MIGRATION_AND_BACKUP.md`: IndexedDB migration, atomic writes, backup/recovery and retention.
- `../V22_AI_CHANGESET_SPEC.md`: queries, navigation, capabilities, operation schemas, review/permissions.
- `v22/PDFATLAS_CONTRACT.md`: authoritative immutable PDF source and rights contract.
- `v22/UNIVERSAL_AGENT_INTERFACE.md`: authoritative provider-neutral interface requirements.
- `../V22_TEST_EVIDENCE.md`: actual verification results and release blockers.
- `examples/v22/INDEX.json`: executable synthetic examples and coverage.
- `history/v21-entrypoints/`: former entry points, preserved as historical context.

Code boundaries: `src/history/`, `src/agent/`, `src/storage/database.ts`, `src/storage/archives.mjs`, `src/core/reading-navigation.ts`. Existing native readers and canonical subsystem validators remain authoritative.
