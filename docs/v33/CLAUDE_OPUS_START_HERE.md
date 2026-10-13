# Claude Opus — start here: AtlasNote V3.3 Cloud Sync

## Mission handed off by the owner (2026-10-13)

> Je veux simplement retrouver les mêmes notebooks, notes, cheatsheets, articles, QCM et progrès sur mon ordinateur et mon portable. La V3.2 actuelle est stable : ne la casse pas. Prévois la synchronisation, sans réécrire tout AtlasNote en Rust ni mettre IndexedDB sur GitHub. Fais une passe tech lead avec seulement les tests utiles au bon moment.

**First read (ordered):**
1. [Complete technical handoff](CLOUD_SYNC_CLAUDE_OPUS_HANDOFF.md).
2. [Targeted tests and gates](CLOUD_SYNC_TEST_MATRIX.md).
3. Root README.md, START_HERE.md, AGENTS.md, V22_ARCHITECTURE.md, V22_MIGRATION_AND_BACKUP.md, V22_AI_CHANGESET_SPEC.md.
4. src/storage/database.ts, src/storage/personal-merge.mjs, src/storage/workspace-snapshot.ts, src/durability/recovery.ts, src/storage/archives.mjs, src/history/{model.ts,adapters.ts,engine.ts}.
5. src/agent/public.ts, docs/v32/CLOUDFLARE_HANDOFF.md, docs/v32/CI_STATUS_20261011.md, tests/provider-neutral-v23.test.mjs, current Wrangler configs and release guard.

**Known audited source:** GitHub main at bf2512d963962a86487d498ec783c0e9545c352e on 2026-10-13. Re-check head, local dirty tree, and live Cloudflare identity before any implementation/deployment claim. Earlier qualification results belong to their exact old heads.

### Your first response / deliverable (no code yet)

Write a concise but deep **tech-lead ADR** answering:

1. Is private R2 immutable snapshot + conditional CAS manifest sufficient for safe **bidirectional** sync while retaining full existing history, externalized archives, assets, five stores and personal progress? Demonstrate handling divergent offline edits and atomic local commit, not merely remote backup.
2. If not, propose the smallest resource-level protocol (possibly Durable Object SQLite for ordered commits, R2 assets) using the existing WorkspaceStore/history engine. State exactly where a separate API Worker, Access verification, manifest and conflict state live.
3. How will initial enrollment distinguish an empty client from an existing local library, preserve source device data and avoid destructive restore? How is a failed local write prevented from being uploaded?
4. What is the minimum **G1/G2** disposable PoC to decide feasibility without spending time on all inherited suites? Enumerate P0 failures and stop conditions.
5. What specifically requires owner approval: Access/R2 creation, phone/laptop target, backup verification, QA preview, feature-flag activation, merge and production deploy?

**Return:** a facts-vs-assumptions ledger; 1–2 ADR candidates with recommendation; trust boundaries and sequence diagram; list of code touchpoints; P0 test plan; blocking questions only; explicit stop/go criteria. Do not claim anything implemented.

### Scope / red lines

- Preserve **V3.2 production**, existing browser data, local-first behavior, IndexedDB **knowledge-atlas v3** and existing five stores; avoid risky migration.
- No GitHub backups of private user data; no public buckets or developer tokens in browser bundles.
- Existing Worker is a guarded **Static Assets-only deployment**. No undocumented request-handler change to it; tests reject such drift. A separate QA/private sync service is a candidate, **not automatically approved**.
- No unattended replacement of one browser's whole workspace; current Settings restore is intentionally destructive and user-confirmed.
- Retain immutable resource revisions/heads, source/asset hashes, all external archives and 13 compaction rollback cases; do not bypass WorkspaceStore or agent human review.
- No backend/R2 writes, Cloudflare/Access changes, actual owner IndexedDB access, new deployment, public PR merge or release until explicitly authorized for that step.
- Do not propose mandatory full 1,217-unit + 54-command release suite for the **design** or every PoC edit. But retain all release gates intact and rerun on the exact final release candidate.

### Implementation after explicit owner GO

Work on a separate feature branch; additive, opt-in feature flag initially OFF. Demonstrate two independent browser profiles with **synthetic data**, fail-closed conflicts, offline retry and browser reload. Test private mobile Access auth with owner permission. Never infer security from static-page Access alone. Produce narrow reviewable PRs and a rollback checklist.

### Short message to send back to the owner

Describe the **simplest safe synchronization** in plain French: how edits propagate PC <-> portable, what happens offline, how conflicts are handled and exactly what *does not* change in V3.2. Give a realistic phase/gate estimate **after** inspecting the actual code; do not invent test results or ETAs.

**Current deliverable is documentation only. The handoff does not authorize implementation or deployment.**
