# AtlasNote 1.2.1 - Live source handoff

## Source to use

**Authoritative modified source:** `/mnt/data/atlasnote-1.2.1-workspace/`

This complete unpacked tree is left intact in the current chat runtime. It is the implementation artifact, not a patch or ZIP-first handoff. The next model should inspect and use these files directly. Do not overwrite this tree with the older AtlasNote 1.2 ZIP, restart from main, or ask the user to download/re-upload it.

**Status: ready for integration review; NOT ready for production deployment.** Substantial source changes and executable compatibility/regression tests are complete. Integrated dependency installation/locking and real-origin certification remain blocked. No GitHub/Netlify actions were performed.

## Provenance

- Original 1.2 source ZIP SHA-256: `cafc4f7ff3082e24080680b19bfc92ee39033f0fee70ee906a14fd19f94c4e51`.
- Extracted the supplied `AtlasNote_1.2_source.zip` once because the previous unpacked directory was not present in this runtime.
- Preserved and modified that source directly; no 1.0/1.1 restart.
- The supplied 1.2.1 handoff identifies the 1.2 candidate as `release/atlasnote-1.2-candidate`, source commit `4c0d0c15fcb11bdddc2ccab5f863c5aeebcffe2b`. This is handoff provenance, not a new remote verification.
- Local baseline per-file hashes: `docs/evidence/1.2.1/baseline/source-sha256.json`.
- Authoritative task instructions: `docs/release-1.2.1/IMPLEMENTATION_HANDOFF.md`.
- Changed source/config/test/doc files: `CHANGED_FILES.md`.

## Implemented in this tree

Strict note-only/PDF-only projection, deterministic keyboard/rapid toggle, matching sidebar/Home/footer counts, archive/hidden handling, and preserved open PDF tabs/personal data. Empty collections remain manageable without polluting strict discovery.

Compact PDF fallback and on-demand Document info/Context replace the giant intro. The preserved integrated engine has compact themed controls, floating Focus controls, overlay outline/search/info, centered unchanged artwork, physical keyboard navigation and guarded user-owned continuous position updates. Per-pane engine state controls the rail; chunk/render failures stay inside the affected PDF pane.

Focus requests the Fullscreen API synchronously in the click, handles rejection, owns only this app's fullscreen, synchronizes browser exit and never auto-requests on reload.

Backup now uses defined optional fields, bounded legacy absence repair and a production capture/flush/freeze point. The reproduced exact JSON mismatch is fixed in actual handler/serializer diagnostics. The real-origin test retains exact canonical/persisted/downloaded/restored equality. Emergency backups still preserve unsaved in-memory work after a storage failure.

Public PDF URLs are pinned to `fa5e83f7825cdc837078f87c5e130cb012332195`. Both supplied PDFs match their original SHA-256, bytes and page counts. No PDF Atlas binary/private corpus was added to public content.

## Exact dependency state

| Package | In this runtime/manifest | Integrated target |
|---|---|---|
| Node | 22.16.0 | Node 22, minimum 22.12 |
| TypeScript | 5.8.3, copied from installed global compiler by bootstrap | 5.8.3 |
| JSZip | 3.10.1, checked-in bundle restored | Existing 3.10.1 |
| Prism | 1.30.0, checked-in bundle restored | Existing 1.30.0 |
| React | NOT installed or locked | 18.3.1 |
| ReactDOM | NOT installed or locked | 18.3.1 |
| React-PDF | NOT installed or locked | 10.5.0 |
| React-PDF-resolved PDF.js | NOT installed or locked | 5.4.296, wrapper-resolved only |
| Vite | NOT installed or locked | 8.2.2 requested by the installer; compatibility unverified |
| @types/react | NOT installed or locked | Resolve React 18 version once and save exact result |
| @types/react-dom | NOT installed or locked | Resolve React 18 version once and save exact result |

**`package-lock.json` changed only for application version 1.2.1.** It does not contain a fabricated integrated closure. `package.json` contains the new build/test scripts but also lacks those runtime/dev dependency entries until a real install succeeds. Consequently `npm ci` alone on a connected runner cannot activate this source yet.

`npm run enable:online` is an explicit, one-time lock-authoring command for a registry-enabled runtime. It uses `--save-exact`, then verifies installed/manifest/lock consistency and the exact wrapper/PDF.js pair. It is not called by build, CI or deployment. After successful resolution, both manifests must be reviewed/retained, followed by clean `npm ci`, `npm audit` and all release gates. Do not independently force a newer PDF.js or claim unresolved React types are pinned.

## Exact build contract

- Primary: **`npm run build`** (equivalent `npm run build:vite`) -> integrated **`dist/`**.
- Compatibility: `npm run build:offline` -> **`dist-offline/`**.
- `npm test` pretest builds only `dist-offline`; it cannot overwrite the hosted distribution.
- Netlify configuration is prepared for **`npm ci && npm run build`**, publish **`dist`**, Node **22**. No remote configuration was changed.
- CI performs the normal PR integrated typecheck/build/resource check, PDF gates, real-origin restore and headers against the final hosted output. It does not resolve dependencies automatically.
- The old fallback `dist/` was removed. **There is currently no deployable integrated `dist/`.** Do not replace it with `dist-offline` or deploy the source/evidence directory.

## Test commands and results

See `FINAL_TEST_STATUS.md` for exact commands, scoped results, exit codes and evidence paths. Summary: core 208 PASS; DOM 14; hardening 39; reader 18; compact 11; finish UI 14; PDF authoring 12. Exact backup diagnostic PASS. Clean compatibility copy/rebuild matches all 176 build files. Local compatibility headers PASS.

**Known failing/unexecuted gates:** local dependency inventory FAIL (12 locked transitives not separately installed after failed npm ci; all 113 vendor hashes pass); real install/audit failed on registry DNS; integrated typecheck/build unavailable; existing integrated 17 and new integrated 14 cases BLOCKED; production runtime 13 phases BLOCKED for missing integrated dist. A separate compatibility-origin attempt is blocked by browser administrator policy before application load.

## Remaining integration blockers

1. Real integrated dependency resolution, exact lockfile closure and fresh `npm ci`; run live vulnerability audit. Do not loosen the dependency gate or invent lock entries.
2. Execute real `typecheck:online`, production build and resource integrity/private-public release gate. Resolve any executable defects those tests reveal; source-level syntax is not certification.
3. Execute both integrated browser suites and the full normal-origin backup download -> independent fresh restore -> exact state -> reload flow on an allowed browser origin. Preserve equality assertions and diagnostic dumps.
4. Obtain real integrated screenshots at all requested viewports. Existing native-frame screenshots show a non-rendering placeholder and prove shell geometry only, not integrated pages.

All test/gate failures are retained in evidence. This handoff is not a production-readiness claim.

## Workspace and recovery files

- Source: `/mnt/data/atlasnote-1.2.1-workspace/`
- Primary in-tree evidence: `docs/evidence/1.2.1/`
- Full working evidence, including earlier diagnostic iterations: `/mnt/data/atlasnote-1.2.1-evidence/`
- Secondary safety source backup: `/mnt/data/AtlasNote_1.2.1_workspace_safety_backup.zip`

The backup is only insurance against a runtime reset. It does not replace the live source workflow and requires no user download/re-upload. Runtime persistence between models cannot be guaranteed; use the automatically attached safety artifact only if the live tree is no longer present.
