# V2.3 final-finish QA matrix - 20 September 2026

**Final decision: BLOCKED.** Current source identity and executed results are in the
delivery's CANDIDATE.json and EVIDENCE/final. The source starts exactly at
84b8ba2addbfe3cb2527dc4a57039416ceabbb52 / 19eadf07aa7485d5d07cb8bfabb22e02539940be.
Local candidate branch: final/atlasnote-2.3-pro-finish. No push or deployment.

## Mandatory release commands

| Gate | This delivery's scope | Release status |
|---|---|---|
| typecheck | Real local TypeScript check; final log retained | See final exit code |
| check:access | Static access declarations retained and checked | See final exit code; not provider proof |
| test:v23 | Real Node unit tests including emergency/connection and four exact-boundary fixtures | See final exit code; not browser proof |
| check:v23:build | Requires clean exact integrated artifact | BLOCKED: integrated dependencies/artifact absent |
| test:v23:runtime | Reselection/confirmation assertion repaired | BLOCKED: browser prerequisite and still-open matrix rows |
| test:v23:layout | Existing four integrated viewports retained | BLOCKED: browser and real HTTPS unlock proof |
| test:v23:compare | UI pair selection/pagination, archived pairs, missing/reattach, restore-as-new, repeated lineage added | BLOCKED: not executed in a normal-origin browser |
| test:v23:recovery | Visible worker/canvas/text/byte distinction; fresh recovery and reattachment | BLOCKED: not executed in a normal-origin browser |
| test:v23:safe-close | Real queued/aborted-write, native unload, raw unsaved export, retry scenarios added | BLOCKED: browser and real HTTPS lock/logout |
| test:v23:compaction | Original atomic writer and all 13 mandatory fault experiments retained | BLOCKED here; baseline handoff reports PASS, not new-SHA proof |
| test:v23:capacity | Replaced synthetic entrypoint with real four-boundary browser gate | BLOCKED: browser gate not executed; exact valid fixtures pass separately |
| test:v23:access:preview | All 20 provider cases remain mandatory | BLOCKED: no disposable exact-candidate preview configured |
| check:v23:secrets | Rule-based source and present-artifact scan | See final exit code; not universal/provider audit |

Exit 2 is never PASS. Pure diagnostics or a green auxiliary recovery workflow cannot
replace the complete inherited GitHub Actions release workflow on the same SHA.

## A-X coverage and remaining evidence

| Area | Preserved or implemented | Remaining actual evidence |
|---|---|---|
| A runtime | Five-store ownership; public read/navigation facade; orphan late-open fix | Populated prior-version, old-tab and interrupted-upgrade matrix |
| B estimates/persistence | Existing advisory storage-health logic retained | Granted/denied/unsupported/error UI matrix and real quota rollback |
| C integrity | Existing strict read-only stored-key/head/projection/asset validation retained | Corrupt native persisted fixtures and exact zero-write verification |
| D backups | Schema-5 exact imported packs/assets and unsaved emergency distinction | Integrated backup/restore regressions on final SHA |
| E recovery graph | Exact dependencies and fresh-profile scenario retained; PDF assertion fixed | Real fresh-profile run through archived PDF, reload and reattachment |
| F generation | Existing immutable archive roots/shards/identity retained | Final browser archive ceremonies |
| G verification | Exact saved bytes, root/identity/asset validation retained | Normal-origin chooser/download evidence |
| H authorization | Download/reselect/confirm gates; recheck/uncheck regression | Trusted native runtime execution |
| I reachability | Historical assets and retained review plans preserved | Final compactor and archive render rerun |
| J transaction | Atomic compactor unchanged; 13-fault test unchanged | All 13 cases plus successful commit/reload on final SHA |
| K Compare | Five types; UI archived/current and archived/archived pair selection | Real integrated rendering/ordering |
| L archived browsing | Missing archive fails closed; exact attach and UI restore-as-new harness | Real interaction, immutable/provenance/personal-state assertions |
| M repeated lineage | Second archive, disjoint ranges, prefix preservation and independent attachments | Execute new scenario; reconcile duplicate runtime coverage |
| N Agent/audit | Public stage/accept path; pending sentinel in capacity fixtures | Actual post-recovery commit at every boundary |
| O capacity | Exact valid 2000 / 25000 / 500 / 67108864-byte fixtures; real-browser gate added | Four committed native recovery flows, not pure projection |
| P complete recovery | Visible historical/current PDF text, painted pixels, exact asset hashes | Genuine fresh-profile and reattachment run |
| Q pending close | Raw memory/persisted split; bounded failed read; actual transaction/unload/retry harness | Browser execution and HTTPS lock behavior |
| R demo | Original opt-in demo and synthetic private PDFs unchanged | Final load/reload/compare/archive run |
| S controls | Truthful qualification-only compaction label | Visual and keyboard QA |
| T access | Existing fail-closed crypto/Request/Response tests retained | Actual cookie flags, session, rotation, cache isolation, logout |
| U provider | Three handlers/rate declarations unchanged; no credentials created | All 20 provider cases and cleanup on exact disposable preview |
| V layout | Original four viewport cases retained | Normal-origin UI and real gated unlock page |
| W privacy | No secrets/private-owner data added; final scan retained | Integrated dist/maps and live-provider audit after build |
| X performance | Valid 64 MiB ZIP/model experiment with timings | Native compaction/runtime capacity timings |

## Model evidence must stay separate

The exact-boundary tests validate both history and current projection. The 64 MiB
fixture is valid, not an overflow short-circuit. The additional byte-archive model
experiment creates a real ZIP and verifies a pure recovery plan, but performs no
IndexedDB write and no native file selection. Its report deliberately ends BLOCKED.

`npm run test:v23:capacity` is the mandatory browser gate.
`npm run test:v23:capacity:diagnostic` and
`npm run test:v23:capacity:byte-diagnostic` are **not release gates**.

## Reproduction

Install locked dependencies and the Python requirements, install Chromium through
Playwright, and build the integrated candidate from a clean checkout. Run the whole
existing `.github/workflows/ci.yml`; do not omit or reorder inherited gates for a
release claim. `npm run test:v23:release` records all 13 results and fails closed.
The provider checks need an actual disposable exact-SHA Netlify preview. No preview
URL, key or successful cleanup is invented in this delivery.

The offline bootstrap/build remain useful for local unit diagnostics only. They do
not qualify the integrated React-PDF browser runtime.
