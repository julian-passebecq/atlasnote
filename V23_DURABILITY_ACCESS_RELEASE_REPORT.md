# AtlasNote V2.3 ZIP final-finish candidate - 20 September 2026

## Decision: BLOCKED

This is a **non-production qualification candidate**, not a finished V2.3 release.
No GitHub write, merge, tag, Netlify deployment or production configuration change
was performed. No access key or verifier was generated or installed.

Authoritative repository: `julian-passebecq/atlasnote`.
Starting branch: `final/atlasnote-2.3-consolidated`.
Starting commit: `84b8ba2addbfe3cb2527dc4a57039416ceabbb52`.
Starting tree: `19eadf07aa7485d5d07cb8bfabb22e02539940be`.
Local candidate branch: `final/atlasnote-2.3-pro-finish`.

The uploaded source ZIP's reconstructed Git tree exactly matched the required tree.
The original commit object was reconstructed from GitHub read-only metadata and its
exact SHA independently matched. The new local commit descends directly from that
commit, not main or an older branch. Exact final commit/tree, clean status, source
fingerprint and checksums are in the delivery's `CANDIDATE.json` and manifests. They
are external to this document to avoid self-referential commit identities.

## Implemented changes

### Recovery and database lifecycle

`openDatabase()` now closes an orphan connection if a previously rejected blocked
open succeeds later. The retry path can obtain a fresh owned connection. This
change is confined to connection opening; the atomic compactor and all transaction
writer code below it remain byte-for-byte unchanged from the baseline.

Raw emergency export now captures a detached **in-memory** workspace before reading
IndexedDB. The saved database snapshot is separately labelled. A missing, failed or
hung read does not prevent the in-memory copy being returned after a bounded wait.
The format explicitly records pending/failed persistence and states that this is a
private diagnostic, **not a verified restorable backup**. It does not mark a failed
write as saved, synthesize revisions, alter the workspace, or invoke Restore.
The existing verified complete-recovery action also warns when it captures unsaved
work rather than a successful database commit.

### Archived Compare and complete recovery qualification

The original recovery failure was a hidden canvas: Compare intentionally defaults
to Changes, which hides the reading panes. The revised test reveals Side-by-side,
requires a compatible real PDF worker and a visible rendered canvas in each pane,
checks nonblank pixels and distinct hashes, and checks original synthetic PDF text
(`byte revision 1` versus `byte revision 2`). It also checks distinct asset hashes.
This is not an attached-only wait or a placeholder-render substitution.

The Compare test now drives the actual Version History selection and pagination
controls for archived/current and archived/archived comparisons, exact attachment,
missing-archive errors and manual restore-as-new. It checks new parent/provenance,
old immutable revisions, heads, archived descriptors, review records and personal
state. A second real archive ceremony checks disjoint ranges, retained first-prefix
identities, reload and independent archive attachment. Recovery checks rendering
again after reload and exact reattachment, before testing tampered recovery rejection.

### Persistence and unload qualification

The safe-close browser test now holds an actual IndexedDB transaction to queue a
UI write, exercises the native beforeunload dialog, releases the transaction, then
aborts a later native personal write. It checks exact rollback, the visible UNSAVED
state, the downloaded unsaved/persisted emergency copies, a failed-state native
unload warning, Retry saving and reload. HTTPS lock/logout remains separately blocked
until a real disposable provider can be qualified.

### Real capacity gate and valid fixtures

`test:v23:capacity` now points to `tests/v23_capacity_runtime.py`, not the synthetic
model script. It requires the exact integrated build and a real normal-origin
browser. Its four valid fixtures reach 2,000 revisions per resource, 25,000 total,
500 review rows and **exactly 67,108,864 structured-history bytes**. Byte padding is
in valid closed audit records, split below archive entry limits and deterministically
incompressible enough not to evade ZIP safety checks. Pending reviews and original
private assets are retained.

The gate attempts the next normal public reviewed write, requires zero five-store
mutation on refusal, performs native download/reselection/confirmation/compaction,
checks exact retained data and saved historical asset hashes, reloads and checks
integrity, stages/accepts the next edit, reattaches the archive and compares/renders
an externalized historical PDF. Fixture setup alone uses direct test-side IDB writes;
no mutable application hook was introduced.

Four pure fixture regressions validate these exact boundaries. A separate valid
64 MiB experiment creates and re-parses a real ZIP, validates a pure compaction plan
and the next model edit, and preserves the pending review. It **does not** claim a
browser transaction, native chooser or capacity release pass. Both model diagnostic
commands deliberately end BLOCKED/exit 2 for release qualification.

### Release truthfulness

The runtime authorization assertion now requires BOTH trusted saved-file reselection
and explicit confirmation, including uncheck/recheck. It no longer expects the
qualification writer to stay disabled after valid authorization.
The compaction button accurately says qualification-only. `COMPACTION_BLOCKED=false`
is preserved solely on this isolated qualification branch; it is not production
permission. No integrated deployable artifact is supplied while qualification is
blocked. Production/main must not expose this candidate as released functionality.

The auxiliary recovery workflow no longer swallows failure with continue-on-error.
The mandatory inherited `.github/workflows/ci.yml`, 13 V2.3 gates, 13 compaction
faults, four capacity limits and 20 provider cases are retained. The auxiliary job
alone is never the full release verdict. Missing integrated build prerequisites
report BLOCKED, never success. No browser security policy was changed.

## Current evidence and limitations

The final evidence package contains a fresh full Node unit run, TypeScript check,
offline compatibility build/check, Python/embedded-JavaScript syntax checks, the
13-command V2.3 runner, access/provenance/privacy checks, and diagnostic model logs.
Use the machine-readable final results for exact counts, exit codes and identity.
An intermediate run passed 1,001 unit tests; the four subsequently added boundary
fixture tests also passed. These intermediate runs are not promoted to current-SHA
browser evidence; the delivery includes a fresh final complete run.

Locked integrated dependencies are not available locally. The online install could
not complete in this environment; an isolated locked offline install returned
ENOTCACHED. `npm run build` fails with MODULE_NOT_FOUND. There is no new integrated
`dist`, and no inherited build has been relabelled or substituted. The separate
vendored offline compatibility build is explicitly non-release and cannot prove the
React-PDF path.

Actual navigation to the unchanged local HTTP application in Chromium fails with
`ERR_BLOCKED_BY_ADMINISTRATOR`. The attempt and error are retained. The agent-browser
CLI is also unavailable. No policy override, opaque-origin substitute, intercepted
application entry, or fabricated screenshot was used. Newly expanded browser tests
are implemented and syntax-checked, **not browser-qualified here**.

## Remaining bounded work

1. Finish the still-explicit runtime migration/old-tab/interrupted-upgrade,
   storage-estimate/persistence API matrix, optimistic-preflight quota rollback and
   persisted-corruption integrity cases in `tests/v23_runtime.py`. Its repeated
   lineage row remains conservatively blocked although mandatory Compare now has
   the corresponding scenario. Reconcile coverage only after real execution.
2. Install the locked integrated toolchain; build the clean exact candidate; run
   all new and inherited real-browser suites. Fix any actual failures without
   replacing visible PDF assertions, native file selection or transaction proof.
3. Run all four actual capacity-recovery flows. Pure/model success is insufficient.
4. Qualify the exact candidate on a disposable Netlify HTTPS preview: all 20 provider
   cases, access-page layout/keyboard, pending/failed lock behavior and cookie-only
   logout. Remove temporary configuration and retain cleanup evidence.
5. Obtain all 13 V2.3 PASS/exit 0 results and the entire inherited V2.2 GitHub Actions
   workflow green on the **same exact SHA**, then produce the integrated dist ZIP.

The capacity, Compare, recovery and non-HTTPS safe-close harness implementations are
new code awaiting real browser execution; runtime/provider gaps are not merely
missing screenshots. This delivery does not claim the whole finish pass is complete.

## Historical evidence is not current evidence

The supplied handoff reports the baseline compactor success plus all 13 fault cases
PASS at `84b8ba2...`. That implementation is preserved, not redesigned. Its full run
`35471566562` nevertheless ended BLOCKED; artifact `10592654610` has supplied digest
`400305ac78421bf192ce1f4117c5b67ac8a0ff2f25b4a469419eeceb5071c4c7`.
The auxiliary run `35471566550` was not a release pass.

No GitHub Actions run or remote artifact exists for this local final commit. No
Netlify preview was created or qualified. Cleanup is **not applicable because no
temporary provider configuration was created**, not a claimed cleanup test PASS.
Earlier reports are preserved under `docs/v23/history/` as historical documents only.

## Delivery

The outer ZIP supplies the exact source ZIP, an incremental local Git bundle and
patch, final evidence, preservation/changed-file manifests, SHA-256 checksums and
operator instructions. Any compatibility build is named DIAGNOSTIC-NOT-PRODUCTION.
It deliberately does not contain a fake integrated production dist artifact.
