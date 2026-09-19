# AtlasNote V2.3 Durability, Archive, Disaster-Recovery & Access-Control

## Decision
**BLOCKED. This is the requested safe archive/read-only attachment fallback, not a
completed V2.3 release. Do not merge, tag, enable destructive compaction or deploy it.**

Baseline `5202f8a2afa388192789349307c9436c3c4403e2` was confirmed using GitHub Git
metadata; the entire uploaded tree exactly matched
`5e6b6122c52011e0604a7b59781438c9e46e94a9`. The authentic signed baseline commit
was reconstructed locally and is the candidate's parent. Branch:
`final/atlasnote-2.3-durability-access`. Main remains at the baseline. Final candidate
SHA, tree/source hash, changed-file inventory, artifact checksums and exact-candidate
reruns are recorded in the EXTERNAL delivery manifest/report, avoiding a self-referential
commit hash in this committed document. The branch is local; no remote push occurred.
Old V22 reports and SOURCE_MANIFEST.json remain historical baseline evidence only.

## Implemented
- Immutable archive schema/lineage and exact byte verification, oldest-prefix selection,
  closed audit handling, private historical asset closure, mandatory saved-file chooser
  ceremony and read-only removal preview. Exact memory-only archive attachments with
  missing-owner ID/root errors, no fallback to current content.
- Archived reader/Compare adapters and restore-as-new with exact lineage and verified
  historical assets; A=selected old and B=current for the same logical resource,
  independent of previously active pane. Dedicated History icon, not Read Later's clock.
- Optional explicit synthetic corpus with 8/5/4/4/4/5 versions for Notebook/Article/
  Cheatsheet/QCM/PDF/tree, original SVGs and two PDFs, closed audit examples and personal
  attempts. Idempotent loading and conservative cleanup keep edited/referenced content,
  immutable history and assets. Optional fixture exporter is never part of public content.
- Storage/persistence health, advisory quota preflight, read-only five-store integrity
  checking, standalone strict backup verification, schema-5 provenance/health metadata,
  flattened complete recovery bundle with all exact archives and pending-write close/lock
  protection. Old backup schemas 2/3/4 remain readable.
- Server-side single-owner Netlify Edge gate, high-entropy owner helper, signed 30-day
  __Host- HttpOnly/Secure/SameSite=Strict cookie, logout, strict same-origin bounded POST,
  one unlock rate rule and fail-closed error/config handling. Runtime verifier never enters
  the client graph. No production key was generated/configured or printed in evidence.

## Non-shipping destructive work
`store.compactArchive()` throws unconditionally. No revision/asset deletion transaction
is shipped, and the UI never enables its commit button, including after an exact saved-file
selection. A pure `planCompaction` only constructs a detached preview; it cannot write.
An early proposed transaction is delivered OUTSIDE the source/build as unverified review
material. Enabling compaction requires a reviewed source change plus real browser proof,
not an environment, URL, Agent call or console flag.

This intentionally does not satisfy completed H/I/O end-to-end capacity recovery. The
handoff expressly requires this fallback when atomicity cannot be proved. Browsing
archived fixtures/recovery can be exercised without enabling any destructive code.

## Verification obtained and its limits
132 new Node tests passed; the unchanged 813 baseline tests passed before the final
commit, for 945 expected final unit tests. Final exact-commit totals are in the delivery
manifest/evidence, not inferred from this expectation. No baseline assertion was weakened.
Core TypeScript, compatibility compilation and static access declarations passed.

All 52 original release commands were actually attempted, including install, audit,
integrated build/types, PDFAtlas, backup, browser, history and Agent gates. In the first
bounded diagnostic: 4 PASS, 38 FAIL, 10 BLOCKED. Failed npm install left incomplete
package/type directories; those were discarded, and the separately labeled checked-in
compatibility bootstrap restored JSZip/Prism and matching TypeScript. Original failures
remain in the evidence. This is NOT an npm-ci or integrated-dependency attestation.

Normal-origin Playwright navigation reports `net::ERR_BLOCKED_BY_ADMINISTRATOR`.
No security policy was changed and no opaque-origin/MemoryBackend result is substituted
for IndexedDB atomicity, migration, quota failure, close/retry or fresh-profile recovery.
Netlify CLI is unavailable. Provider function/rate-limit discovery, HTTPS cookie enforcement
and cache behavior are not certified by Node Request/Response tests.

The four required widths (1366x768, 1440x900, 1920x1080, 390x844) passed unlock HTML
keyboard/layout checks and application new-controls checks using the original DOM-only
harness. This is 8 layout checks, not normal-origin functionality. The opaque-origin app
screenshot deliberately retains the expected build-provenance invalid-origin error rather
than pretending this harness has a production origin.

The 2,000-revision stress test initially exceeded its diagnostic budget due to repeated
full-row searches in the pure plan. This was repaired with ID-indexed exact comparisons;
assertions and the failed/partial log were preserved. A subsequent run generated and
self-verified a 1,998-revision archive in about 0.55 seconds, independently verified it in
0.21 seconds and planned it in 0.21 seconds (machine-specific). A detached next normal
edit became version 2001 with three live rows; all 2001 identities remained accounted for.
The 25,000-count, 500-review and 64 MiB overflow guards were tested, but full committed
capacity recovery at those boundaries was not. The final evidence records actual timings.

## Invariants and migration
Same DB version 3 and exactly five stores; archive descriptors occupy existing history
records. Same five Subjects, five types and five workspaces. No content/reader redesign,
new backend, cloud ownership, automatic upload/pruning, Git per notebook, OAuth/account
system, provider-specific AI, annotation or OCR. Immutable PDFAtlas source and existing
Netlify headers/redirects remain unchanged. Agent action contract and release marker 2.2.0
remain compatible; application version/provenance separately identify V2.3.

## Owner / coordinator operation
Read `docs/v23/ACCESS_CONTROL.md` for manual Netlify Free-compatible setup, runtime
Functions verifier, preview isolation, one-time key paste, cookie persistence, rotation
and recovery. Runtime values stay out of Vite/dist/Git/logs. No Pro built-in shared password
is required. Source requires an actual Git checkout for precise build identity; the delivery
includes a bundle/patch to restore the exact candidate. The gate protects new remote
requests, not encryption of local disk, already-open tabs or archived files.

Read `docs/v23/RECOVERY.md` for schemas/migration/safe close;
`ARCHIVE_FORMAT.md` for roots/lineage/ceremony; `ASSET_REACHABILITY.md` for ownership;
`QA_DEMO.md` for optional corpus and Compare; `QA_MATRIX.md` for every A-X gate and
required real-browser fault experiment. Optional synthetic externally archived fixtures
are clearly marked CONSTRUCTED, not claimed as successful compaction evidence.

## Deliverables and release blockers
Clean source ZIP, specs, source integration bundle/patch, test evidence and a compatibility
QA build are deliverable. The requested integrated production build could not be produced:
React/React-PDF/Vite dependencies are unavailable. Its failure package is clearly labeled
NOT A PRODUCTION BUILD, and dist-offline is never relabeled dist. It must not be deployed.

Before this pass can be READY: obtain clean integrated installation/build/typecheck,
pass all unchanged release gates and complete new normal-origin matrix, prove every
compaction failure rolls back exact five-store state, validate full capacity recovery and
fresh-profile/private-PDF recovery, and verify actual Netlify Edge manifests/rate/cookies/
caching with disposable QA configuration. Any fail-open path remains a release blocker.

No main merge, release tag, remote push, production deployment, production-secret
configuration or user-data clearing occurred.

BLOCKED
