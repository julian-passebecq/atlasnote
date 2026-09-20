# Active V2.3 provider-neutral acceptance matrix

The executable source of truth is `tools/v23-release-contract.mjs`. Current result counts
come from fresh evidence, never from this static matrix or historical reports.

| Gate | Required proof |
| --- | --- |
| typecheck | Current source typecheck |
| check:access | Minimal Wrangler Static Assets config, `_headers` policy and client/server credential separation |
| test:v23 | Core durability and Cloudflare provider-boundary unit assertions |
| check:v23:build | Exact clean integrated build/source fingerprint |
| test:v23:runtime | Runtime, migration, integrity, storage estimates and actual native capacity rollback |
| test:v23:layout | AtlasNote controls at required viewports; no provider-login layout requirement |
| test:v23:compare | Ordered archived/current and archived/archived Compare; restore-as-new and historical PDF |
| test:v23:recovery | Fresh profile, saved-file verification, full recovery and exact archive reattachment |
| test:v23:safe-close | Real pending writes, native beforeunload, failed-write recovery/retry; no provider-cookie internals |
| test:v23:compaction | All 13 preserved rollback/concurrency/fault cases |
| test:v23:capacity | All four preserved storage capacity boundaries |
| test:v23:access:preview | All 13 live cases against a fresh Access-protected, undeployed Cloudflare Worker version preview plus real browser evidence |
| check:v23:secrets | Source, integrated distribution and retained evidence credential/privacy scan |

The 13 live provider rows remain: ready-preview, exact-build, anonymous root/static/deep
denial, authorized root/deep access, security headers, cache isolation, exact five-store
auth transition, automation credential scope, invalid-token fail-closed behavior and
browser sanity.

Any FAIL or BLOCKED is non-green. Portable core, compatibility tests and historical
Netlify/Vercel proofs are separate scopes. The inherited workflow runs only after this
entire contract is green on the same clean source.
