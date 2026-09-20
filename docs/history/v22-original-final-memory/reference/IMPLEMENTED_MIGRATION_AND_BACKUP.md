# V2.2 migration, backup and recovery

## Database migration

The database remains `knowledge-atlas`. Opening V2.2 upgrades raw IndexedDB version 2 to 3 and adds one indexed `history` store. The original `imports`, `overlays`, `personal` and `assets` stores are retained; `onupgradeneeded` does not clear or rewrite their content. History has `kind` and `resourceKey` indexes.

After loading and composing existing bundled/imported/local source, the store initializes canonical baseline snapshots in batches of 50 resources. Completed batches are recognized by current content hash; interrupted initialization can resume without duplicate baselines. The meta record is marked initialized only after all batches finish. Initialization can be blocked by another open older tab; the error instructs the reader to close that tab and reload, without resetting data.

This candidate's bundled catalogue has 39 pages and 14 projects, producing 54 versionable resources including the synthetic manual-reference-placement tree. The synthetic migration profile adds Article and QCM examples, giving 56 resources. These are fixture/library counts, not assumed limits on the user's imported library.

Baseline revisions record the handoff's V2.1.0 release/source provenance. An application source update after initialization appends changed resource snapshots as system revisions; it does not rewrite an existing revision. A Git commit is application provenance, not a replacement for a reader's resource revision ID.

## Atomic content and review writes

Manual edits, imports and reviewed content actions use the same revision engine. Hashing and validation happen before the transaction. Current-source projection, new revision records, heads and any accepted audit rows commit together. Immutable revisions use add-only writes; a duplicate revision key aborts rather than overwriting history. The history epoch is compared inside the write transaction to reject concurrent stale writers. Reviewed personal/layout candidates additionally compare expected persisted personal state.

Restoring an older content revision appends the next revision and records `restoredFromRevisionId`. Current and intervening history remain intact. No-op ordinary edits do not advance heads. A review can create multiple resource revisions atomically, with a common ChangeSet ID and corresponding audit links.

Personal changes are not content history: attempts/reflections, bookmarks, Read Later, captures, reading positions, pane state, workspace slots and Workspace States keep their existing ownership. Restoring a workspace checkpoint never moves resource heads backwards.

## Backup schema compatibility

Readers accept full backup envelope schemas **2, 3 and 4**. Legacy 2/3 backups lack authored history; restoring them initializes one baseline per composed resource, without fabricating earlier edits. A current initialized V2.2 workspace exports schema 4.

The existing verified ZIP envelope, path safety, binary SHA checks and archive expansion limits remain. Schema 4 adds `history/index.json` and bounded revision/review JSON shards. The index retains metadata, heads, shard paths and a complete structured-history SHA-256. Shards target about 2 MiB; a single snapshot can be up to 4 MiB, still below the existing archive-entry cap.

The full backup contains:

- Current canonical source/overlays, existing pack snapshots, local attachments and personal state.
- Every committed resource revision, head, source/restore provenance and staged/accepted/rejected/stale review record.
- Historical local/private PDF assets and embedded asset bindings, even when those assets are no longer current.
- Existing concepts, exact semantic links, semantic review/audit, sessions and workspace checkpoints.

Public external PDFs remain immutable URL/hash references. Backups do not silently download or republish them. Opening an unavailable external historical source fails explicitly; it is not redirected to newer bytes. External image dependencies keep the existing disclosure behavior.

A content-only export, per-version JSON export, source archive or GitHub clone is not a complete private-workspace backup.

## Restore validation and commit

Before a replacement transaction, validation checks the ZIP inventory, pack/asset hashes, history hash, unique revision IDs, resource identity/type, contiguous parent/number relationships, head consistency, restore/derived links, canonical snapshots, PDF provenance and required historical assets. Current composed content must match stored heads. Invalid history, missing local bytes or source/head divergence blocks restoration before any current data is cleared.

A validated full restore is an explicit user action in Settings: preview, replacement acknowledgement, then one transaction over all five stores. Full backup restore is intentionally absent from the agent operation registry. In a different application-source version, conflicting built-in content may cause the coherence check to refuse the restore instead of silently changing a historical snapshot; retain the matching source/build and backup for recovery.

## Failed writes and emergency exports

A manual save failure keeps unsaved in-memory work visible and raises a storage warning. A full backup from that state must not contain changed current content paired with an older history head. `prepareEmergencySnapshot` validates the retained history and appends any unsaved authored changes **only to a detached export copy**, then checks its projection. It does not claim those changes were durably saved in the live browser or rewrite its history. The exported recovery revision identifies this provenance.

If history itself is corrupt or a required asset is missing, a normal verified backup can still be refused. Settings retains raw recovery JSON as an explicit last-resort artifact; raw recovery is not advertised as a validated full backup. Keep the affected tab open until recovery is verified.

## Limits and retention

The bounded implementation permits 2,000 revisions per resource, 25,000 total committed revisions, 64 MiB structured history, 4 MiB per snapshot, 500 retained review records, 100 pending drafts/proposals, 50 operations and 1 MiB per ChangeSet. Context exports select at most 20 resources; paged query results are capped at 100 rows and context is capped at 4 MiB.

There is no silent pruning, historical-asset garbage collection or erase-history agent operation. Reaching a limit refuses additional writes and tells the reader to export/manage history. This pass does not provide a destructive in-app pruning/reset workflow; a future retention tool requires explicit design and review. A backup by itself does not free the live store's capacity.

## Evidence and migration fixtures

`docs/examples/v22/` contains synthetic V2.1 schema-2 and schema-3 full backups and their migrated schema-4 counterparts. They are generated by `node tools/generate-v22-examples.mjs` after `npm run build:offline`. They contain only public demo assets and synthetic authored/personal data, not a user's private library.

The unit suites verify serializers, pure resumable initialization, canonical projection, corruption rejection and detached recovery. `tests/v22_runtime.py` separately implements actual v2/v3 profile seeding, normal-origin startup/reload and fresh-context UI backup restoration. In this environment Chromium refuses the loopback URL with `ERR_BLOCKED_BY_ADMINISTRATOR`; those durable-browser guarantees therefore remain **unverified**, not passed. See the actual test report.
