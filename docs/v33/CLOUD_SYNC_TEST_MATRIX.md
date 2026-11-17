# AtlasNote V3.3 Cloud Sync — targeted verification matrix

**Prepared 2026-10-13. Status: planned checks, NOT executed test evidence.**
Related: [Claude Opus master handoff](CLOUD_SYNC_CLAUDE_OPUS_HANDOFF.md).
Keep this plan **proportionate**: an isolated design review needs zero release-suite runs; a disposable PoC needs targeted tests; only a release candidate needs the inherited full gates. Existing tests must not be deleted or softened.

## A. Threat/risk priorities

**P0 — data safety and privacy, block progress on any failure:** partial/corrupt sync upload; stale device overwrites; two offline clients; local history-head mismatch; loss of notes/attempts; assets or external archive omissions; upload of unsaved volatile state; unprotected Access route; an empty client resetting remote; unintended destructive restore.

**P1 — usability and reliability:** no duplicates on retries; stable five workspaces and reader state; phone/laptop narrow viewport; unauthenticated session renewal; clear offline vs conflict indicators; bounded CPU/data transfer.

**P2 — optimize after P0:** delta sync, selective attachment download, continuous live updates, automatic disjoint-field merges, background scheduling, encryption choices, public generic multi-tenant platform.

## B. Minimal portable test fixture (no owner data)

Prepare two distinct disposable profiles **A** and **B**, each with the **same app origin but separate browser user-data directory** and an isolated fake owner account. A third disposable profile **C** simulates stale/rejoined devices. A local mock server and R2 bucket fixture must never use production identifiers or authenticated owner data.

Seed exact stable resource IDs and SHA-256s for:
- two Notebook pages under different folders; one source-derived notebook-tree edit;
- one Article, one Cheatsheet schemaVersion 1.1, one QCM with answer history;
- two notes, rating, bookmark, Read Later item and one QCM attempt/reflection;
- one small private PDF (byte hash + metadata), one external/public metadata-only PDF reference;
- one archive dependency with verifiable bytes and historical revision;
- five workspace slots with different A/B reading state and display geometry.

For every destructive or rejected scenario, record digest of **all five stores before, immediately after, and after reload**. Never use the actual owner's IndexedDB profile as a QA target.

## C. Scenarios — exactly scoped, with required outcomes

| ID | Priority | Scenario | Pass condition |
| --- | --- | --- | --- |
| S01 | P0 | Remote empty, profile A has local edits | Owner-confirmed verified complete recovery seeds remote; no auto-upload before opt-in |
| S02 | P0 | B local truly empty, enroll into cloud | B gets identical resources, notes, attempts, heads/history and attachments after validation; B layout remains B-specific |
| S03 | P0 | B already has unrelated personal notes | Never auto-replace B; conflict/migration wizard can safely preserve both or abort byte-for-byte |
| S04 | P0 | A edits Notebook; sync; B opens/reloads | Exact new page and folder tree appear with original stable IDs, only once |
| S05 | P0 | B edits Article/Cheatsheet; sync; A pulls | Original typed content persists, renderer/source round-trips; history appends without replacing ancestors |
| S06 | P0 | A/B edit different notes offline | Both survive or explicit blocked merge; no last-writer-wins loss |
| S07 | P0 | A/B edit same Notebook block offline | Detect common ancestor fork; preserve both candidates with provenance; block silent head replacement |
| S08 | P0 | A/B submit QCM attempts/ratings offline | Attempts retained, not duplicated or misgraded; conflict explicitly surfaced if unavoidable |
| S09 | P0 | Same resource create/delete/move races | No invisible duplicate, resurrection, dangling reference or unreviewed tombstone |
| S10 | P0 | Two clients upload with same manifest ETag | Only one CAS advances the head; loser receives 409 + preserved unsynced changes |
| S11 | P0 | Retry after network drop/timeout before ack | Idempotent ID; no duplicate revision, attempt, blob or accidental overwrite |
| S12 | P0 | Upload stops after partial asset/archive objects | Head stays on earlier complete verified snapshot; no "synced" badge |
| S13 | P0 | Tamper ZIP SHA, wrong asset hash, missing archive | Reject before any local write; 5-store digests unchanged after reload |
| S14 | P0 | Local storage full, failed IDB transaction, or failed flush | No successful cloud cursor/ack; original data and unsaved emergency recovery remain accessible |
| S15 | P0 | Wrong schema/build, older client or unknown target ID | Block remote apply, keep local read-only/offline safe; no downgrade or guessed references |
| S16 | P0 | Anonymous, expired, wrong owner or altered Access identity | All API methods deny; no metadata disclosure, no cloud snapshot download or upload |
| S17 | P0 | Invalid HTTP origin/CSRF or off-origin redirect | Mutation blocked; browser credentials never sent to third-party URL |
| S18 | P0 | Sync disabled or remote unavailable | Existing AtlasNote works fully locally; no automatic IndexedDB reset |
| S19 | P0 | Crash during local apply/remote CAS | Exact previous or complete next state, never half-state; after reload same invariants |
| S20 | P0 | History compaction with externalized archive | Recovery remains complete, external archive bytes retained; existing 13 rollback faults unaffected |
| S21 | P1 | A/B open tabs simultaneously | Existing cross-tab epoch CAS and personal 3-way protections remain; sync does not race against unflushed tab |
| S22 | P1 | Five different workspace layouts across PC/phone | Authored data matches; device-local active panes/screen arrangement do not jump |
| S23 | P1 | Access identity reauth on mobile browser | Controlled re-login, no secret exposure, retry after session renewal |
| S24 | P1 | Browser IndexedDB evicted on phone, remote intact | Owner-gated recovery, no accidental remote wipe; verify device-specific limitations |
| S25 | P1 | Large library near ZIP/entry cap | Explicit size/coverage failure or bounded chunk strategy; **never** claim partial snapshot is complete |
| S26 | P1 | Download old/replayed cloud manifest after newer sync | Version monotonicity maintained; no local rollback |
| S27 | P1 | Direct/public R2 URL, unprotected QA preview, cache headers | Denied or non-existent; signed/presigned public browsing disabled; private/no-store verified |
| S28 | P1 | Fast consecutive edits while background upload active | Final committed resource state eventually synced, all revisions or controlled coalescing proven |
| S29 | P1 | Fresh protected QA browser profile (not mocked) | Two-device smoke and authored-state persistence pass under actual Access |
| S30 | P1 | Rollback from new QA candidate to old V3.2 | Old app can load existing local data, no destructive cloud downgrade or hidden mutation |

An implementation may split a scenario into independent assertions; **do not turn this table into thirty large independent E2E suites**. Group by setup, reuse disposable fixtures, run pure contract tests first. Any red P0 blocks next gate.

## D. Suggested test layers and minimal CI cost

### G0 — Documentation / tech-lead review

- Verify sources and assumptions, write ADR / request approval.
- Tests required: **none**; output is not runnable product code.
- Do not dispatch exact-head full V23 qualification solely because a design document was added.

### G1 — Pure domain PoC, no provider writes

- Unit-test version vector/base head, CAS preconditions, ID uniqueness, deterministic hash/manifest, idempotent operation keys.
- Test three-way merge or conflict decisions of notes, ratings, QCM attempts, folders and source revisions.
- Reject missing external history dependencies, unsupported snapshot sizes, unknown schema, bad filenames/hash.
- Tests are isolated deterministic Node tests under tests/; do not introduce mock-only claims of browser durable success.
- Recommended grouping: ~10–20 named unit cases covering S03/S06–S13/S15/S19/S26.

### G2 — Real local browser durability

- Build once, run two real isolated Chromium user-data dirs at a normal local origin (not about:blank/mock adapter).
- Exercise S01–S05, S10–S14, S18–S22, S25 with durable five-store fingerprints and reload/reopen.
- Run targeted existing suites:
  - npm run typecheck
  - npm run typecheck:online
  - npm run test:history
  - npm run test:agent
  - npm run test:v23 (focused regression where appropriate)
  - python tests/v31_storage_runtime.py
- Adjust actual commands to the source checkout; **do not weaken historical test assertions**. Existing browser suite semantics are different from a mocked fetch/R2 server.
- Never claim normal-origin IndexedDB evidence from a React component test.

### G3 — Protected QA-only provider / real mobile smoke

- Approval required before any Cloudflare resource mutation.
- Ensure **new isolated private QA Worker / endpoint and private R2 bucket**, or approved alternative. Verify Auth anonymous denial for API and all previews; wrong identity rejects; rate/size, CORS, CSRF, caching, token exposure checks.
- Real device or authenticated browser profiles for desktop plus phone/laptop as confirmed by owner.
- Limited real-provider tests: S16/S17/S23/S24/S27/S29; log **no private content or credential**. Fake sample libraries only.
- The existing Static Assets QA qualification still runs separately against exact protected preview.

### G4 — Release candidate / owner GO-NO GO

- Freeze exact commit; clean build/source fingerprint; verify all new S01–S30 relevant P0/P1 and targeted regression.
- Invoke the **preserved full V23 13/13 gate and inherited 54-command workflow** on the exact source candidate, once ready. Include real native quota and all 13 compaction rollback cases. No fake green pass.
- Independently inspect Access policy, allowed owner login and anonymous denial, browser bootstrap/migration, original production rollback version, QA screen behavior, PDF/cheatsheet rendering.
- Export and **independently verify complete owner recovery before enrollment**. Get separate explicit production release authorization.
- No auto-deploy, no unprotected preview, no merging while release is blocked.

## E. Required evidence format (Claude must report, not imply)

For each gate record:
1. exact code commit, app distribution hash, worker/bucket test target (QA only), execution timestamp;
2. paths and commands actually run, pass/fail/blocked/skip counts, test profile isolation method;
3. fixture provenance **synthetic**, no user data;
4. screenshots or structured fingerprints without raw private data;
5. source vs mocked contract vs normal-origin browser vs protected-provider evidence separated;
6. all known failures, uncertainties and manual/physical checks not performed;
7. rollback procedure verified (not just written).

Do **not** mark a future scenario PASS before it has actually been executed.

## F. Acceptance checklist for owner review

- [ ] A verified complete private backup exists before enrollment.
- [ ] Notebook, notes, cheatsheets, articles, QCM and progress visible on both devices.
- [ ] Reading layouts remain appropriate for desktop and portable.
- [ ] Offline editing safe; conflict is visible and never silently overwrites.
- [ ] Repeated retries do not duplicate progress or history.
- [ ] Historical revisions and private PDF/asset bytes verified.
- [ ] Wrong/anonymous identity cannot see the API.
- [ ] Disabling sync keeps the existing local library intact.
- [ ] Owner approved current exact QA candidate and production rollout separately.

**Bottom line:** the most important proof is **zero data loss across two independently edited, intermittently offline real clients**. Test breadth is secondary to these P0 invariants.
