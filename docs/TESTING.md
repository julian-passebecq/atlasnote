# AtlasNote 1.2 testing

Run commands from the source root. The release report, acceptance JSON and evidence ZIP distinguish actual results from unavailable gates. A DOM harness result is never an IndexedDB/reload or integrated PDF pass.

| Command | What it actually checks |
|---|---|
| `npm ci` | Complete dependency installation with the supplied lockfile; blocked here by registry DNS |
| `npm run bootstrap:offline` | Supplied vendor bundles plus an already installed global TypeScript 5.8.3; not a full install attestation |
| `npm run build` | Actual offline TypeScript compilation, public content validation and static build |
| `npm run typecheck` | Application TypeScript typecheck |
| `npm test` | Builds, then executes all Node tests (176 in this pass) |
| `npm run check:release` | Exact reviewed public hashes and private/raw/font exclusion |
| `npm run test:dom` | Real DOM pagination/layout/interaction regression suite; opaque origin and in-memory writes |
| `npm run test:hardening:ui` | Real UI hardening, keyboard, tree, Compare, flags, remarks and CRUD tests |
| `npm run test:reader:ui` | Reader contracts, five-theme contrasts, mixed collections, local PDF intake and actual export ZIPs; in-memory commit/SHA bridge explicitly labelled |
| `npm run test:compact:ui` | Four viewport geometry, Context overlay, Compare identity, five themes, PDF filtering, active rail, controlled synthetic external transport |
| `npm run test:startup:dom` | Twice repeated strict before/after App-mount session comparison; preloaded session, NOT browser reload |
| `npm run test:runtime` | Unmodified normal-origin entry, actual IndexedDB/import/reload/backup/fresh-context/restore sequence, exact state equality |
| `npm run test:pdf` | Actual optional React-PDF worker/canvas/search/password/Compare/download matrix, no fake renderer |
| `npm run test:pdf:authoring` | Real PDF processing, safety, limits, source-byte/visual checks and authoring round-trip |
| `npm run test:headers` | Actual local HTTP response headers and packaged hosting-header configuration |
| `npm run test:online:syntax` | Optional-source syntax/isolated emit only; NOT installed-module typecheck or render certification |
| `npm run audit:local` | Checked-in vendor integrity and installed dependency inventory; no remote vulnerability database claim |

## Reproducible complete local run

```sh
python tools/run-release-gates.py --out docs/evidence/release-1.2
```

The runner is offline and performs no connector or deployment operations. It intentionally tries `npm ci --offline`, then the documented bootstrap, before building. It returns **0 only when every gate passes, 1 for failures, 2 for blockers without failures**. It preserves command logs and individual statuses. It restores the fallback build last, even if an optional build was possible. Therefore, run `build:vite` separately after its installed prerequisites when preparing an integrated-engine distribution.

An unrestricted coordinator must also run normal `npm ci` against the final lockfile. Optional dependencies require the separate `enable:online` installation and resulting reviewed lockfile. A syntax check is never a substitute for these gates.

## Browser harness boundaries

This execution environment denies Chromium navigation to normal HTTP origins with `ERR_BLOCKED_BY_ADMINISTRATOR`. No browser policy was changed. Existing opaque-origin DOM tests use real compiled components and CSS, with explicitly suppressed storage writes. The startup diagnostic reproduces and tests the actual App startup route behavior against preloaded state; it does not simulate a successful real reload.

The compact external-reference case uses **author-created synthetic PDF bytes and a mocked transport**. It makes zero remote repository calls. The UI consent/hash logic is real; hashing in the opaque-origin harness uses the labelled Python SHA-256 bridge when secure-context WebCrypto is unavailable. The live external host and normal-origin WebCrypto gates remain for independent verification.

Screenshots are actual test-run screenshots, not generated mockups. Native browser PDF frames are labelled fallback, not integrated-renderer evidence. Native/plugin pixels may be unavailable to headless Chromium; the fallback shell must not be reported as an actual PDF.js render.

## Intentional regression-test updates

Existing behavioral assertions were retained. Selectors now open the shared rail's Reading mode, More / Settings or Context drawer through actual UI clicks. The old top-ribbon order was replaced by the specified 1.2 rail order. Legacy `rightOpen` preference values remain in saved sessions, but the Context drawer is transient rather than a persistent restored column. Hidden flags retain their values; editing a flag is now available in More even when tree flags are hidden.

The default catalog assertion is still exact: 10 pages/3 notebooks/1 term, including exactly the original 8 guide/example pages. The stale-publication-hash test retains the explicit metadata-review permission before deliberately corrupting hashes, so it still tests the stale-hash rejection rather than an earlier permission rejection. Three-theme assertions were extended to all five themes. Real-runtime exact equality and import/restore/download checks were not relaxed.
