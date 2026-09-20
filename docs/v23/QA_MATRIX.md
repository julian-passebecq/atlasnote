# Active V2.3 provider-neutral acceptance matrix

The executable source of truth is `tools/v23-release-contract.mjs`. Current result counts
come from the final delivery evidence, never from this static matrix or historical reports.

| Gate | Required proof |
| --- | --- |
| typecheck | Current source typecheck |
| check:access | Vercel configuration and client/server secret separation |
| test:v23 | Core durability and provider-boundary unit assertions |
| check:v23:build | Exact clean integrated build/source fingerprint |
| test:v23:runtime | Runtime, migration, integrity, storage estimates and actual native capacity rollback |
| test:v23:layout | AtlasNote controls at 1366x768, 1440x900, 1920x1080, 390x844; no vendor-login layout requirement |
| test:v23:compare | Ordered archived/current and archived/archived Compare; restore-as-new and historical PDF |
| test:v23:recovery | Fresh profile, saved-file verification, full recovery and exact archive reattachment |
| test:v23:safe-close | Real pending writes, native beforeunload, failed-write recovery/retry; no vendor-cookie internals |
| test:v23:compaction | All 13 preserved rollback/concurrency/fault cases |
| test:v23:capacity | All four preserved storage capacity boundaries |
| test:v23:access:preview | All 13 fresh provider-neutral live Vercel cases plus real browser evidence |
| check:v23:secrets | Source, integrated distribution and retained evidence scan |

Any FAIL or BLOCKED is non-green. The optional Netlify suite remains useful for that
legacy adapter, but no Netlify-only row blocks or satisfies the active Vercel matrix.
Portable core, compatibility tests and historical proofs are distinct evidence scopes.
The inherited 54-command workflow runs only after this entire contract is green, with
its original order and assertions preserved. Separate cleanup evidence records actual
preview resources created/deleted; absence of a preview is not a deployment success.
