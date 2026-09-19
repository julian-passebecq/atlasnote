# Storage, backup verification and complete recovery

## Database and compatibility
No database version bump: `knowledge-atlas`, version 3, with exactly imports, overlays,
personal, assets, history. Thin archive records use `archive:<archiveId>` keys in the
existing history store. No sixth store, cloud ownership or new workspace is introduced.
No destructive V2.2 migration is scheduled. The read-only integrity path reads all five
stores in a consistent transaction and checks keys against stored values, unknown
records and schema/projection/head/asset relationships without repairing anything.
Normal-origin migration, blocked upgrade and interrupted-upgrade evidence is still
required; format tests alone do not certify a browser migration.

| Artifact / caller | Read | Write / note |
|---|---|---|
| V2.2 workspace DB v3 | supported | same five stores |
| Backup schema 2, 3, 4 | supported | legacy direct API retained |
| V2.3 UI backup | schema 5 | exact provenance and archive dependencies |
| History schema 1 | supported | optional thin archives index |
| Archive schema 1 | supported | external immutable ZIP |
| Complete recovery schema 1 | supported | flattened complete dependency set |
| Earlier V2.2 reader on V2.3 archive/backup | not supported | do not downgrade |
| Reviewed Agent interface | unchanged 1.0.0 | compatibility release marker 2.2.0 retained |

The Agent's old contract marker is not the application build identity. Exact V2.3 build
identity is separate: appVersion, full sourceCommit, SHA-256 over sorted tracked source
paths/bytes, dirty flag, databaseVersion, immutable PDFAtlas commit and
integrated/compatibility buildKind. Builds require an actual Git checkout; the delivery
bundle/patch preserves the exact commit for coordinators restoring from a source ZIP.
Never represent a compatibility build as the integrated production reader.

## Schema 5 backups
`backup.json` retains the V2.2 full current workspace, imported revisions, local asset
inventory and sharded immutable history, adding artifactId, createdAt, provenance,
archiveDependencies, payloadHashes and rootHash. SHA-256 stable root excludes only
rootHash. The file table binds every included payload. The exact descriptor graph
lives in history/index.json. A current backup can declare missing external archives:
it protects live content, but is NOT a complete archived-history recovery artifact.

The Settings Verify action and restore preview use the same strict validator. They
re-open bytes and check schema, full history chain, hashes, asset/PDF provenance and
current projection before any replacement. Corrupt files cannot be silently repaired.
Integrity checking is read-only and explicitly does not certify unattached archive bytes.
Backup Health records only generated and independently selected verification metadata
locally, never a key or private content. Generated/self-verified is distinguished from
independently re-selected/saved. Neither proves indefinite external retention; a later
personal edit may require a new backup even without a new authored-history epoch.

## Complete recovery schema 1
`recovery.json` contains format atlas-complete-recovery, recoverySchema 1, artifactId,
createdAt, provenance, workspace {prefix,rootHash,schema}, archives [{archiveId,
rootHash,prefix}], files and rootHash. The root binds its stable fields except rootHash.
Files are flattened under `workspace/` and `archives/00000/`, not nested ZIP payloads.
Only the outer transfer manifest remains. Inner backups/archives are reconstructed
for verification and independently validated with their original logical roots.
Every declared workspace archive must be present exactly once. Missing, extra,
misbound or unowned archive payloads fail verification before restore. Generation
self-verifies the finished bundle. Existing ZIP bounds apply to the entire flattened
bundle; very large recovery sets can be rejected rather than silently truncated.

On confirmed restore the existing atomic five-store replacement installs live state,
assets and descriptors. Verified external archives are attached in session memory,
not re-inflated as permanent live history. Reload requires selecting the saved archive
or recovery bundle again for historical browsing; the archive index remains durable.
Fresh-profile/reload recovery with actual historical PDF rendering is still BLOCKED.

## Owner migration procedure (after candidate QA)
On the old origin: wait for saved status, create a complete recovery bundle with every
archive attached, save it and independently verify the actual saved file. Keep another
external copy. Do not erase the old profile. On the target origin/browser/device:
unlock, inspect restore preview, explicitly replace, run integrity, compare projections,
head IDs/counts and asset hashes, attach required archives and open an old private PDF.
Reload and repeat attachment/navigation. Retire the old origin only after these checks.
The access key is not included in a workspace backup and does not migrate IndexedDB.

## Quota and safe close
Storage estimates are advisory and origin-wide. Unsupported, unavailable and throwing
estimate/persistence APIs are distinguishable. Persistence is requested only by user
choice; denial does not claim durability. History warning thresholds are 70/85/95% of
existing bounds (2000 per resource, 25000 total, 64 MiB, 500 reviews/100 drafts).
Preflight adds 25% plus 4 MiB to estimated incoming data. Known insufficiency rejects
before import; unknown quota still depends on the actual transaction's outcome.

Before close/navigation, reader anchors are synchronously flushed into the existing
queue. Pending or failed writes request the browser's normal unload warning. Saved
state does not warn. Visibility changes are best effort; browsers can kill a page
without completing asynchronous work. Emergency backup repairs only its detached
export copy and never falsely clears a failed live-save indication. Lock waits for
pending writes and refuses on a save error; clearing the cookie never clears IDB.
