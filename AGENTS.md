# Current V2.3 migration scope

`START_HERE.md` and the explicit user request supersede historical release boundaries.
Use supplied source, not GitHub main. GitHub is read-only. No production is authorized.
Provider-neutral core and Cloudflare Access managed protection are mandatory; Netlify/Vercel internals
are optional legacy. Keep atomic compaction and all 13 rollback cases unchanged.
Do not label offline/browser mocks or historical results as integrated/live proof.
The full inherited workflow may start only after same-source complete V23 success.

# AtlasNote V2.2 working agreement

Read `START_HERE.md`, `V22_ARCHITECTURE.md`, `V22_MIGRATION_AND_BACKUP.md`, `V22_AI_CHANGESET_SPEC.md` and `docs/v22/PDFATLAS_CONTRACT.md` before changing architecture. The copied authoritative V2.2 handoff overrides historical 1.x/V2 documents.

- Extend the existing app. Keep five subjects (IT/Cloud/Job/KPI/Norsk), five content types, five workspaces, independent A/B panes and the existing PDF/structured-SVG engines.
- `ResourceTarget` and `ReadingDestination` remain canonical. `historyRevisionId` pins a logical revision; the PDF byte SHA and source Git commit remain separate.
- Notebook structure/manual placements are authored source; Concept Index and exact semantic links retain their separate ownership. Never persist a backlink mirror.
- Database `knowledge-atlas` is now version 3, with the original four stores plus one history store. Do not reset an existing profile during migration.
- Every authored write goes through `WorkspaceStore` and the shared history engine. Current projection, revisions, heads and accepted review audit commit atomically. Restore appends a new version.
- Reading positions, captures, bookmarks, Read Later, QCM attempts/reflections and workspace checkpoints are not authored history.
- The provider-neutral module is `app/agent/public.js`. Read/navigation are direct; authored/personal/semantic proposals use preview -> stage -> explicit human accept/reject. No provider SDK, raw database setter or unauthenticated write server.
- Do not add automatic backup restore/reset/history erase/QCM attempt rewriting/publication/self-approval operations.
- PDF Atlas remains metadata-only with an immutable 40-character production commit. Keep canonical source and enrichment separate and run `check:pdfatlas`. No public PDF binaries or inferred rights upgrades.
- Preserve every meaningful old release assertion. A compatibility test is not a normal-origin IndexedDB or embedded PDF test. Keep failed/blocked logs and do not relax browser policies.
- No GitHub writes, main merge, deployment or publication of private libraries/backups without a new explicit user request.

The QA head `215b60ff792a59e736b2b059a4e3fc60f1092d54` on `newversion2.2vfmanual` records **50/50 release gates, 813 unit tests and 15/15 expanded normal-origin browser scenarios passing**. See [V22_QA_REPORT.md](V22_QA_REPORT.md) for repairs, retained failures and coverage limits. The user-approved canonical single-ID Article/QCM invariant remains; independent wrapper/document IDs are outside V2.2. Nothing was merged or deployed.

For finalization, follow the user-authorized targeted checks only; preserve all existing gates and failed/blocked evidence.
