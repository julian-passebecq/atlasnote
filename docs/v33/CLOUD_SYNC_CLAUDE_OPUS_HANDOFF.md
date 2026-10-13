# AtlasNote V3.3 Cloud Sync — handoff technique pour Claude Opus

**Status:** design/handoff only. **No implementation, migration, provider mutation, data upload, merge or deployment authorized by this document.**
**Date:** 2026-10-13.
**Audited GitHub main head:** bf2512d963962a86487d498ec783c0e9545c352e. This is a repository snapshot, not independently verified live Cloudflare runtime evidence.
**Owner request (authoritative):** "je veux juste que atlas note ait les meme notebook notes etc sur ordi et portable". Desktop and portable must share one private library, even when each has its own browser IndexedDB. "Portable" may mean phone or laptop: do a responsive/mobile validation, but confirm target platforms with owner before production rollout.

## 0. Executive decision / scope control

Build **AtlasNote Cloud Sync**, not AtlasDB, not an IndexedDB-to-GitHub migration, not a Rust rewrite, not a new UI framework.
Preserve the stable V3.2 React/Vite app and its existing browser-local, offline-first storage. Add an **opt-in private sync boundary** with Cloudflare Access and versioned remote storage. Do not move private library data to the public repository. Keep the application functional without cloud credentials or network.

**Tech-lead gate:** an architecture/design review and small isolated proof of concept are mandatory **before** any production implementation. Exhaustive inherited regression is **not** required to approve this documentation or to begin a disposable PoC. Full inherited qualification is mandatory on the exact release candidate before any deployment.

**Preferred exploratory design:** immutable, verified complete-recovery snapshots in a private Cloudflare R2 bucket, with a small, atomic compare-and-swap remote head/manifest (R2 conditional put may suffice); authenticated Worker API; browser-local IndexedDB unchanged. This is a **candidate**, not a final architecture decision. It only supports reliable bidirectional edits if conflicts are explicitly detected, retained and resolved rather than overwritten. A single synchronized ZIP alone is **backup transfer, not safe synchronization**. If whole-snapshot conflicts or size thresholds make UX unacceptable, design resource-granular sync through the existing revision engine and evaluate a Durable Object / D1 for ordered commits. Never falsely promise automatic conflict-free merges.

## 1. Concrete user outcome / P0 acceptance

Two real browser profiles/devices access the **same deployed, owner-protected AtlasNote origin** and (once enrolled) see the same logical library:

| Synchronize in P0 | Expected |
| --- | --- |
| Notebook pages, projects, folders, ordering, manual references | Same IDs and authored structure on both devices |
| Local Articles, native Cheatsheets, imported study pages, QCM definitions | Same authored resources; no duplicate IDs or orphan links |
| Notes/remarks, bookmarks, Read Later, ratings, Norsk learning status, QCM attempts/reflections | Same personal *content and progress* without losing newer activity |
| Private PDF metadata and available authorized local PDF/asset bytes | Exact SHA and historical references; fail explicitly when bytes/rights unavailable |
| Immutable resource history, live heads, accepted review audit and externalized archive dependencies | Full verifiable continuity, not a history reset or in-place revision replacement |
| Five subjects, five content types, five independent workspaces, exact targets | Remain identical in semantic behavior |

**Device-local by default:** active A/B panes, open tabs, screen layout, scroll position, current reader session, visual preferences and ephemeral controls. Do not let a phone viewport unexpectedly replace the desktop layout. Whether to sync reading location separately is a later owner decision. Existing personal state mixes durable progress and session/layout data, so classification/exclusion must be explicit and tested, not achieved by blind JSON field drops.

**User journey:** enroll primary device after a verified backup; enroll the second device; push/pull works when network returns; clear badges (synced / uploading / offline / conflict / error); imported cheatsheet visible on both; edits from either device converge when sequential; concurrent offline edits result in a reviewable conflict or safe merge; there is never a silent overwrite. Mobile browser storage eviction must be considered.

P0 **does not** include live multi-user collaboration, automatic NRK ingestion, plugin-to-Atlas submission, real-time cursors, zero-knowledge E2EE, Rust/WASM replatforming, or SQL/SQLite migration. Keep plugin Authoring integration as a future dependent feature.

## 2. Verified V3.2 code contracts (read these exact current files first)

- README.md and START_HERE.md: Web app, Cloudflare Workers Static Assets, Cloudflare Access managed boundary, no cloud sync today; separate gated local/QA/production deployment.
- AGENTS.md and V22_ARCHITECTURE.md: preserve canonical ResourceTarget / ReadingDestination, five subjects/types/workspaces, A/B reading and history semantics, provider-neutral Agent Review human acceptance.
- src/storage/database.ts: **IndexedDB knowledge-atlas, DB_VERSION=3, five stores imports, overlays, personal, assets, history**. WorkspaceStore/commitProjection validates before one atomic transaction, uses history.meta.epoch CAS, rejects stale concurrent-tab authored writes; writePersonalChecked invokes a three-way merge.
- src/storage/personal-merge.mjs: merge granularity is keyed notes/ratings, ID-keyed bookmarks/readLater/dashboardItems/qcmAttempts/qcmResponses, workspace slots; conflicting edits use selected winner. **This is single-browser cross-tab logic, NOT an approved cross-device merge protocol.** It must not auto-resolve remote competing edits with last-write-wins.
- src/history/model.ts, src/history/adapters.ts, src/history/engine.ts: stable IDs, immutable revisions, heads, hash, per-resource lineage, full history provenance; include notebook-tree synthetic structural records. preserve restore-as-new semantics.
- src/storage/workspace-snapshot.ts: captureWorkspaceSnapshot dispatches flush, then takes snapshot; if disk persistence failed, the snapshot can still include **unsaved in-memory recovery data**. For remote uploads insist on separately verified durable consistency, not merely the snapshot function result.
- src/storage/archives.mjs: bounded ZIP, transfer checksums, backup schema 5, local attachments; archive format has **250 MiB total, 25 MiB per entry**, plus bounded expansion. Do not silently truncate a library to fit.
- src/durability/recovery.ts: createVerifiedBackup / verifyBackupFile, createRecoveryBundle / verifyRecoveryBundle, archive dependencies and exact hashes. Complete recovery contains necessary externalized history archives; ordinary workspace backup may depend on separate archive bytes.
- src/components/SettingsDialog.tsx: manual full backup and explicit **destructive** restore confirmation. **Never invoke WorkspaceStore.restore or the settings restore flow automatically for routine sync/pull.**
- src/storage/database.ts: writesBlocked / staged hydration / safe-close semantics are critical. Don't upload if local writes are failed/uncertain; don't overwrite a tab's unflushed state.
- src/agent/public.ts and docs/handoffs/atlas-plugin/HANDOFF.md: same-origin internal read/preview/stage/accept API is NOT an authenticated network endpoint.
- wrangler.jsonc, wrangler.qa.jsonc, wrangler.production.jsonc, tools/cloudflare-release-guard.mjs, docs/v32/CLOUDFLARE_HANDOFF.md: guarded Static Assets-only Workers; **do not bypass existing release gates**.
- tests/provider-neutral-v23.test.mjs: existing provider test explicitly rejects adding a request-handler main to the guarded static Worker config. Treat the API topology as an architectural compatibility decision, not a casual edit to production Wrangler JSON.
- tests/v31_storage_runtime.py, tests/durability-v23.test.mjs, docs/v32/CI_STATUS_20261011.md: preserved real-browser durability and protected-provider qualification scope. Prior PASS is historical and does not transfer to a new source revision.

**Initial read-only audit:** these are code/repository observations only. Existing owner Chrome IndexedDB, production Access policy and mobile browsers were **not** inspected or mutated in preparing this handoff. Reconfirm current tree and release configuration before any code change.

## 3. Architecture options / required tech-lead ADR

| Option | Advantages | Risk / limitations | Recommendation |
| --- | --- | --- | --- |
| A. **Private R2 immutable complete snapshots + CAS manifest** | Smallest initial server surface; reuse verified recovery; cheap to reason about; preserved history | Full-bundle upload/download, memory/ZIP limits, conflicting offline edits, external archive dependencies, rich merge not built-in | **Preferred disposable PoC**, only ship if P0 conflict semantics genuinely work |
| B. **Change-log / resource-level sync on history revisions + Durable Object SQLite/R2** | Finer transfers; naturally tracks independent resource edits; serializes commits | More new code/protocol, tricky personal state/tree/asset references and compaction | Escalate if A fails P0 practicality |
| C. **D1 relational cloud primary + IndexedDB cache** | SQL inspection, server queries | Stronger server-centric rewrite; requires new sync correctness anyway | Not needed for v1 |
| D. **GitHub private repository as database** | Easy versioned source JSON | Git is not browser IndexedDB; sensitive histories in repo, conflicts, auth, binary/big payloads | **Reject for private sync** |
| E. **Rust / SQLite OPFS replacement** | Future reusable core | No automatic multi-device sync; high migration/QA cost | Out of scope |

Server transport proposal for option A:
1. Authenticated Worker endpoint reads/writes **private** R2 objects (never public r2.dev or public custom domain).
2. Immutable content-addressed snapshots (and required archive payloads) are uploaded first; server verifies allowed size/hash/type, owner identity and quota. Remote state holds **a small versioned manifest** referencing only complete verified objects. No direct object overwrite.
3. Update authoritative manifest with an atomic conditional write (expected ETag/version). A failed condition is a **409 conflict, not an overwrite**. The server must ensure a stale/duplicate client cannot reset the head or replay an older snapshot.
4. Download checks hash, length, schema/build compatibility and entire archive dependencies before proposing a local change. Remote network acknowledgments are not evidence that IndexedDB committed.
5. Server and local apply path must maintain explicit lineage/base state, idempotent client request IDs and durable last-known-remote version. Recovery for interrupted uploads must not expose half-complete data.
6. No independent remote mutation of resource history that bypasses WorkspaceStore semantics. **Remote snapshots are untrusted input** and cannot authorize a local destructive replace.

If whole-snapshot safe merge cannot be implemented without hacking local restore, mark option A **PoC only** and write ADR selecting B; do not ship an automatic "latest ZIP wins" feature.

Cloudflare docs to re-verify at implementation time:
- R2 conditional operations / Workers API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- R2 public/private access: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Cloudflare Access validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Durable Objects consistency: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- Cloudflare Worker Access runtime identity (confirm availability/current API): https://developers.cloudflare.com/workers/configuration/cloudflare-access/

## 4. Authentication, topology, and confidentiality — fail closed

- Preserve owner-only Cloudflare Access for **every** sync API and protected QA version preview. Do not infer API security from protection of the SPA's static files: verify actual route coverage.
- The current production app uses guarded **Static Assets-only Worker config**. Prefer a **separate private QA sync Worker** during PoC so the production Worker and its guard stay untouched; compare this with a verified same-origin protected API route. The latter may require new Worker handler/route or guard changes and a separate approved review.
- Authenticate and **verify** Access identity (JWT issuer/audience/signature or equivalent platform-verified context), then authorize the exact intended owner's account/tenant for each request; check origin/CSRF for mutations, limit methods, sizes and request rates. Do not trust client-supplied email/user ID or an unvalidated Access-looking header.
- Browser requests must not embed Cloudflare API tokens, R2 keys, GitHub tokens, service-token secrets or long-lived credentials. No secrets in repository, client bundle, URL, HAR/logs, exports or test fixtures.
- Cross-origin sync is nontrivial with Access cookies, CORS, mobile browsers and preview versions; prototype actual authenticated requests before deciding the API hostname. Deny redirects/anonymous content responses from being parsed as a valid manifest.
- No public R2 bucket, signed public download link, public fallback endpoint, auto-publication or upload to public GitHub. Store private content at rest using provider protections; client-side encryption is a separately scoped choice, not a v1 claim.
- Verify mobile session expiration / reauthentication UX, offline retry, transport timeouts and origin-specific IndexedDB. No destructive reset to "fix" stale sessions.

## 5. State machine and flows (must specify before coding)

Minimum states: disabled, unlinked, initial-backup-required, checking, downloading, uploading, synced, offline-with-pending, conflict, auth-expired, integrity-failed, paused. Each state has a timestamp and clear remediation. Never display "synced" if durable local save, archive verification or remote manifest CAS is pending.

**Primary enrollment (cloud empty):** first create and independently verify **complete recovery** in local profile. Owner explicitly selects the source device and opts in to seed its current verified *durable* state. After upload, independently read/verify remote manifest and payload. Only then mark baseline synchronized. No automatic cloud push on page load.

**Second-device enrollment:** authenticate. If its local library has edits/imports/personal data, offer reviewable conflict/merge or isolated safe-copy flow; **never silently replace**. If truly empty, verify and explicitly approve initial adoption through the guarded local application write boundary. Preserve this device's pane/session geometry.

**Sequential editing:** local writes remain immediate and offline-safe. Queue sync after a successful local durable commit/flush; send expected base/version; prove cloud commit; other device checks remote and safely applies after pending local writes are settled. No duplicated revisions or attempts after retries.

**Offline edits on both devices:** when reconnecting, compare common ancestor. Disjoint-resource edits may merge only with proven invariants; same-resource/text/tree/history divergences require conflict UI and preservation of **both** branches until chosen. No last-write-wins, timestamp-only ordering or treating the entire other device's personal state as trusted. A forced overwrite is never an implicit retry.

**Deletions:** explicit tombstone/intent; do not infer deletion from missing arrays or a partial/incomplete snapshot. Resolve refs, history and asset reachability. Client retries, manifest races, crashes, compaction, retention/GC and restores must not resurrect old removed resources or garbage-collect required bytes.

**Version upgrades:** schema negotiation, compatible projection checks and explicit block on unknown versions. Device on old build stays offline-safe; never downgrades cloud content.

**Rollbacks/disable:** disabling sync leaves the full local library and history untouched, with manual backup still working; rollback app does not rewrite/drop remote schema. Local complete-recovery bundles remain retrievable independent of provider availability.

## 6. Data hazards requiring explicit design proofs

1. **Three-way resource/content merges:** immutable revision IDs/parent IDs and head hashes cannot be rewritten for convenience. No hash-only acceptance without lineage. Branching history must not be silently flattened.
2. **Atomicity across different stores:** imports/overlays/personal/assets/history must remain mutually consistent in the local IndexedDB commit boundary. A half-applied incoming remote bundle is forbidden.
3. **Personal progress vs device session:** notes, ratings, bookmarks and QCM attempts must converge; A/B pane state must not. src/storage/personal-merge.mjs is a candidate for granular algorithms but its conflicts currently choose a winner. Remote conflicts need explicit review.
4. **Externalized history and big bytes:** backup without required archive payload is not a complete recovery; 250 MiB ZIP / 25 MiB entry bounds and browser memory limitations are real. Sync must declare exactly which private PDFs/assets are covered and which public external references remain metadata-only.
5. **Initial upload ambiguity:** a recently created browser profile with empty IndexedDB is not proof the owner has no cloud content. It must pull/discover before offering "initialize cloud".
6. **Crash/storage quota:** aborted transaction, browser tab close, offline retry, partial upload, hash mismatch and quota failure must not advance sync cursors or erase a previously valid copy.
7. **Compaction:** existing 13 rollback cases and archive commitments must be preserved; remote snapshots must not claim a complete history after omitting externally saved archives.
8. **Built-in library vs private overlays:** avoid sending all public bundled seed assets to R2 repeatedly; maintain provenance/identity across builds, never "repair" changed built pack with fabricated IDs.
9. **Remote security:** owner access token expiration, route coverage, rate/size limits, content sniffing, untrusted ZIP and cache no-store. Never use GitHub as an automatic private backup.

## 7. Implementation work packages (small, gated)

**T0 — Tech-lead / audit (NO code changes):**
- Confirm current main/owner checkout, deployment guards, source validators, backup payloads and archive descriptor contract; inspect representative non-sensitive fixtures only.
- Confirm target phone vs laptop, browser/OS, one account, private PDF size and whether any concurrent offline editing is expected. Answer unresolved questions in ADR; don't invent them.
- Write a decision record selecting snapshot-CAS pilot or resource-granular protocol, including asset/archive completeness, failure semantics, auth topology and downgrade policy. Owner sign-off before infrastructure or production work.

**T1 — Pure isolated PoC (NO real user data, NO production):**
- Two disposable browser profiles + fake Workspaces, versioned manifest and mocked R2 transport; inject races, duplicates, interruptions and invalid hashes.
- Validate R2 conditional head semantics and guarded Worker Access in a separate **protected QA-only** service only if explicitly authorized. Do not create public resources or change production configuration.
- Demonstrate primary seed, empty-client enrollment, sequential two-way edits and blocked concurrent conflict, plus byte-for-byte unchanged local stores on failure.
- If P0 unsafe, stop and revise design rather than patching around safety invariants.

**T2 — Additive implementation behind OFF-by-default feature flag:**
- API version, explicit identity and per-device registration, schema/integrity validation, bounded transport and CAS.
- Local sync coordinator listening only to successful WorkspaceStore commits (not direct raw IndexedDB setters); robust idempotency, pausing, offline queue and conflict state.
- Safe apply/merge via an approved WorkspaceStore-mediated transaction; no unattended restore/reseed/clear.
- Minimal settings UI for opt-in, status, manual Sync now, conflict inspection and disable. Maintain safe-close.
- No new IndexedDB version/store or separate global mutable state by default; any necessary cursor storage design needs a separate ADR plus migration/recovery proof.

**T3 — QA and explicit owner launch decision:**
- Targeted new sync tests and real two-profile browser proof; mobile smoke. Keep the regression evidence exact-head.
- Only then execute preserved full V23/inherited release qualification on the exact candidate, provider Access/privacy review, backup/restore drills and a protected immutable QA preview.
- Document current production version/rollback candidate immediately before any separately approved deploy. No automatic prod deploy/merge or owner private data publication.

## 8. Tests: risk-based, not a 1,000-test rebuild every commit

See [CLOUD_SYNC_TEST_MATRIX.md](CLOUD_SYNC_TEST_MATRIX.md) for executable scope and acceptance matrix.

| Gate | When | Minimum requirement |
| --- | --- | --- |
| G0 documentation | Now | Reviewer reads/contracts confirmed, architecture decisions recorded; **no tests claimed or required** |
| G1 isolated domain PoC | Before provider mutation | Pure deterministic unit tests of manifest CAS, idempotency, merge/retention, schema and hash rejection |
| G2 genuine local browsers | Before QA candidate | **Two distinct real browser profiles/origins**, real IndexedDB transactions, offline/concurrency/crash and byte-level invariants |
| G3 protected QA | Before production proposal | Owner-only Access denial proof, authenticated device flows, no public R2, phone/laptop trial, quota/rollback smoke |
| G4 release candidate | Only once candidate frozen | Exact-head full V23 (all 13 retained gates), inherited 54-command sequence, unchanged 13 compaction rollback cases, new sync suites, owner approval |

Historical 1,217 unit tests or older CI/preview passes are **not** fresh V3.3 evidence. A docs-only commit does not prove any implementation. Keep negative and blocked evidence; don't mislabel mocked R2 / localhost as production proof.

## 9. Go / no-go decision

**GO to PoC:** the ADR provides a credible non-destructive path, identity/Access boundary, verified complete recovery baseline, immutable remote history, atomic CAS, and explicit conflict UX.
**NO-GO:** "copy IndexedDB to GitHub"; auto-restore remote ZIP on startup; write directly to five IDB stores bypassing WorkspaceStore; last writer wins; missing archive/asset data; unprotected Worker/R2; mobile anonymous access; or bypassing the QA release gate.
**GO to production only** with separately explicit owner approval, current protected QA/evidence and tested rollback. Neither this handoff nor a draft PR is such approval.

## 10. Claude Opus expected response

1. Begin with a **read-only tech-lead pass**: list verified facts vs assumptions; do not start code/deploy immediately.
2. Challenge preferred design where needed; produce a short ADR including resource-level vs full-snapshot tradeoffs and specific risk of restore overwrites.
3. Size targeted PoC tests, propose concrete interfaces/data contracts, and ask only blocking owner questions.
4. Work in a fresh feature branch after approval, never mutate production, owner browser storage or Access policy without a separate instruction.
5. Preserve README/AGENTS/provider neutrality and document precise evidence boundaries.
6. Return PR(s) with exact changed paths, test results (or "not run"), data-safety audit and pending decisions.

## 11. Source map / references

- Repository: https://github.com/julian-passebecq/atlasnote
- Current source entry: README.md, START_HERE.md, AGENTS.md
- Existing history/storage specification: V22_ARCHITECTURE.md, V22_MIGRATION_AND_BACKUP.md, src/storage/database.ts, src/storage/personal-merge.mjs, src/history/model.ts
- Backup and completeness: src/durability/recovery.ts, src/storage/workspace-snapshot.ts, src/storage/archives.mjs, src/history/backup.mjs
- Provider and qualification: docs/v32/CLOUDFLARE_HANDOFF.md, docs/v32/CI_STATUS_20261011.md, docs/v32/EXECUTION_REPORT.md, tests/provider-neutral-v23.test.mjs
- Plugin Authoring (future only): docs/handoffs/atlas-plugin/HANDOFF.md, docs/v32/AUTHORING_INTEGRATION.md

This is a **proposal and source-backed handoff**, not an implemented Cloud Sync feature.
