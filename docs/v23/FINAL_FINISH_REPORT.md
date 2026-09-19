# Final-finish engineering report

Release decision: **BLOCKED** until the exact-current evidence establishes all 13
V2.3 gates and the complete inherited workflow. No main merge, tag or production
release is authorized by this report.

## Source and scope

Authoritative base: 84b8ba2addbfe3cb2527dc4a57039416ceabbb52, tree
19eadf07aa7485d5d07cb8bfabb22e02539940be. Branch:
`final/atlasnote-2.3-pro-finish`. No older branch is merged into this candidate.
The consolidated compactor, recovery implementation, five-store schema, V2.2 UI,
PDFAtlas pin, dependency lock and release contract are preserved. Changes concern
qualification tests, non-production CI diagnostics and corrected documentation.

## Completed engineering

- Replaced the stale disabled-compactor expectation with the actual saved-file plus
  confirmation authorization test. Wrong/altered files leave every store unchanged.
- Added native migration, persistent-corruption and storage-advisory matrices, plus
  late restore quota failure/rollback/retry and repeated committed archive lineage.
- Added real archived notebook/PDF UI comparisons and confirmed restore-as-new checks.
- Corrected PDF qualification to reveal the physical reader, verify visible ink/paper,
  download the original historical bytes and compare their SHA-256 and byte count.
- Added complete archive-bearing fresh-profile recovery, reload/missing archive,
  exact reattachment and tamper rejection. Current content cannot substitute for old.
- Added actual pending/aborted write, native unload dialog, emergency-export recovery
  and explicit retry assertions; separately retain the HTTPS lock requirement.
- Made all four capacity boundaries require a real native commit, saved-file ceremony,
  reload, retained proposal, fresh reviewed write and historical attachment/integrity.
- Bound provider observations to the current candidate and immutable preview identity;
  removed the old PR #18 default. Missing prerequisites and transport remain BLOCKED.

The first completed expanded run, 35475962006 at 36dd84a, achieved 9 PASS, 2 FAIL and
2 BLOCKED across the unchanged 13-gate contract. Failures were new test harness issues:
comparing fixture insertion order to IndexedDB key order, and an ambiguous Theme
selector. Both were corrected without modifying production data/storage logic.
Compaction, capacity, archived compare and complete recovery passed in that run.
The next run, 35476385002 at ea50fe4, proved all 22 runtime scenarios plus native
pending-write, failed-write, emergency-copy recovery and retry scenarios. Its only
FAIL was an over-specific provider test expecting a configured 403 where the provider
correctly returned fail-closed 503 for unavailable configuration. The corrected probe
records that situation as BLOCKED, not PASS: it still lacks configured-origin proof.
The final delivery reruns the unchanged 13-gate contract and supersedes these historical
counts. Native data-safety success does not remove the remaining provider requirements.

## Provider restriction and cleanup accounting

PR #21 is a disposable draft qualification preview, not a production deployment.
The 36dd84a preview was recognized with three Edge Functions. No access key/verifier,
Netlify environment variable or real production secret was created/read/modified.
Anonymous responses alone cannot satisfy the full configured-provider/session matrix.
The final package records the actual final preview identity and whether the draft PR
was closed. It must not claim that closing a PR deletes immutable Netlify deployments,
or that credentials were deleted when none were created.

## Deliverables and evidence provenance

The external final report and CANDIDATE.json identify the exact final SHA/tree, fresh
GitHub run/artifact IDs, source/dist/evidence checksums, per-gate counts, changed files,
preview identity and cleanup outcome. They are generated after this tracked source is
committed, avoiding a circular self-claimed commit hash. Source comes from git archive
at that SHA; the integrated build retains its actual embedded source identity. Current
evidence and prior iteration evidence are separated. No dependency cache, node_modules,
production credential or real private library is part of the deliverable.

A red inherited workflow remains red even if many earlier steps passed. A diagnostic
build artifact is not a production release. The only possible final labels remain
READY FOR COORDINATOR QA (all required evidence green) or BLOCKED.
