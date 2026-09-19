# V2.3 qualification matrix A-X

Overall **BLOCKED**. Raw initial failures, intermediate repairs and exact-candidate
reruns are preserved in the delivery evidence. PASS below means only the stated scope;
it never promotes simulated storage to a real browser proof. Original V2.2 assertions
and release command list are unchanged. No paid agent or production deployment used.

| Matrix | Implemented evidence | Remaining qualification |
|---|---|---|
| A existing gates | original 813 Node tests; full 52-command runner attempted | integrated deps/build, browser gates must pass externally |
| B migration | empty and populated strict five-store readers; backup 2/3/4 tests | real V2.2 profile, reload, old-tab upgrade and interruption |
| C storage | unsupported/throwing/unavailable/healthy estimates; persistence variants | real browser API outcomes |
| D preflight | enough/insufficient/unknown estimates; no preflight mutation | IDB failure after optimistic estimate, exact rollback |
| E integrity | healthy and corrupt parent/head/hash/assets/PDF/descriptor; zero mutation | actual stored corrupt fixtures and read-only transaction |
| F verifier | schemas 2..5, traversal, corrupt/missing shards/assets, head/projection/canonical/PDF | browser file UI agrees with restore; saved file handling |
| G generation | oldest prefixes, one/multiple resources, retained heads, hashes/audit/assets | normal-origin generation/download exercise |
| H re-selection | exact ZIP vs wrong/altered bytes; synthetic events rejected | trusted native chooser; exact file intentionally cannot enable deletion |
| I compaction | pure stale-state rejection; production delete implementation absent | ALL real transaction fault injection; release blocking |
| J reachability | historic-only/shared/current/import/personal/same-SHA/missing/corrupt bytes | atomic deletion never shipped; actual IDB proof required |
| K Compare | all five type targets, stable IDs, A-old/B-current regardless prior B in unit logic | visible Changes/Side-by-side/A-only/B-only and PDF render |
| L archived browsing | exact missing/attached resolution, no fallback, clone-safe restore/Agent | normal-origin links, visual diffs and archived/archived rendering |
| M repeated archives | exact A/B lineage, overlap rejection, attachment independence | reload and saved-file UI for repeated archives |
| N Agent/audit | pending/spanning review retention, reviewed restore, no archive/delete API | real reviewed write failure rollback |
| O capacity | 2000 pure-plan capacity experiment; 25000 count, 500 review, byte overflow guards | all four committed limit-recovery end-to-end cases BLOCKED |
| P complete recovery | all exact dependency closure; corruption rejects; projection/hash equivalence | fresh real profile, reload, private PDF and integrity |
| Q pending close | safety-state unit coverage; existing queue/unload integration | real pending/failed/retry/unload dialogs and emergency export |
| R demo | opt-in/idempotent, revision counts, synthetic bytes, safe removal | load/reload/compare/archive UI |
| S icon | separate semantic icons and accessible labels in source | visible/keyboard verification |
| T access | real Web Crypto + Request/Response tests: key, cookie, expiry, rotation, path, errors | actual browser HttpOnly/Secure enforcement and logout keeps IDB |
| U Netlify | wrappers imported; declaration/error/rate rules checked before build | Netlify CLI discovery, provider manifest/cache/rate enforcement |
| V layout | four unlock HTML viewport/keyboard cases attempted; app harness separately | all four integrated new-control viewports |
| W privacy | static graph/distribution secret checks; original ZIP/security tests | final production dist/source-map scan, provider config audit |
| X performance | synthetic 2000-generation/verification/pure-plan timing | actual compaction timing absent by design |

## Exact commands
`npm run test:release` retains every original V2.2 gate. Diagnostic environment may set
ATLAS_GATE_TIMEOUT_MS=45000, npm fetch retries=0 and fetch timeout=10000; timeout is a
nonzero failure, never a passing skip. Exact commands/statuses/logs are in results.json.
Then restore the separately labeled compatibility dependency fallback:
`npm run bootstrap:offline && npm run build:offline`.
`npm run typecheck`, `node --test tests/*.test.mjs`, `npm run check:access`,
`npm run test:v23:capacity`, `npm run test:v23:runtime`, `npm run test:v23:layout`.
`npm run test:v23:release` runs the added sequence and retains each exit code.
Normal runtime uses dist by default; a compatibility attempt with ATLAS_DIST=dist-offline
must be labeled compatibility, never production PDF proof. Layout uses the original
opaque-origin harness only for DOM/layout, never IndexedDB/secure-cookie claims.

## Required fault experiment before any compactor can ship
Use disposable real browser profiles and the exact integrated candidate. Capture every
key/value of imports, overlays, personal, assets and history, including asset bytes.
After a trusted saved-file re-selection inject, individually: stale history epoch;
second-tab write before transaction; abort during descriptor put; simulated quota at
put; descriptor failure; revision deletion failure; closed-review deletion failure;
asset deletion failure. Reopen all stores and require exact pre-state equality after
EACH failed attempt, including heads, pending review, current projection and private PDF.
Inject a concurrent personal/asset/import write as well as a history edit. A stale preview
must require a NEW generation/save/reselection, not quietly recompute destructive intent.
On success require descriptor and all deletions together, reopen and validate the entire
workspace, attach exact archive, read every removed revision/asset and restore-as-new.
A control flag or MemoryBackend success is not sufficient proof.

## Provider security qualification (disposable preview, never production)
Run normal Netlify tooling and inspect declarations/rate warnings. Without config, all
HTML, JS, PDF worker, PDF, content JSON, build identity, SPA deep links and direct paths
must return locked/error, never static app bytes. Repeat with invalid config/function
error, tampered/expired/duplicate cookie. Warm caches with authorized requests, then
retry anonymously; all remain gated. POST valid disposable key once, reload browser,
confirm HttpOnly cookie not exposed to JavaScript, and verify session expiry/rotation.
Test cross-origin and GET unlock/lock, repeated failed unlocks and provider throttle.
Logout clears cookie, no Clear-Site-Data, IndexedDB bytes identical. Delete/misconfigure
a middleware in a test checkout and require the build to fail; never deploy the result.
