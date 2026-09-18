# AtlasNote V2.2.0 candidate - start here

**Verdict: NOT READY FOR COORDINATOR INTEGRATION.** Implementation and compatibility verification are delivered; integrated dependency installation/build and normal-origin browser verification are blocked in this environment. Read the actual evidence, not older release claims.

This continues the uploaded V2.1.0 production source. The supplied archive had no Git metadata: package 2.1.0 and the required final-polish/release-blocker tests were verified. `b50c27a987fa65eee1c51d36225908621e322da7` is the authoritative handoff's expected upstream commit, not independently verified ancestry. No final Git commit, remote write, merge or deployment was made.

Read in order:

1. `V22_DELIVERY_REPORT.md` - implemented scope, verdict and limitations.
2. `docs/ARCHITECTURE_INDEX.md` and `V22_ARCHITECTURE.md` - current boundaries.
3. `V22_MIGRATION_AND_BACKUP.md` - IndexedDB 2 -> 3, backup 2/3/4, recovery.
4. `V22_AI_CHANGESET_SPEC.md` - provider-neutral service, exact bases, human review.
5. `V22_TEST_EVIDENCE.md` - retained old/new gate results and browser blocker.
6. `V22_CHANGED_FILES.json` - hashes and changed-file inventory.

## Normal development environment

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install chromium
npm run test:release
```

The full runner attempts all old and new gates. It must pass in a normal environment before integration. Node >=22.12 is required; dependency versions/lock integrities remain the V2.1 pins. `npm run build` creates the integrated production distribution in `dist/`; `npm run preview` serves it. No production distribution is supplied in this delivery because it could not be built honestly here.

## Supplied compatibility build

```sh
npm run bootstrap:offline
npm run build:offline
npm test
npm run check:release:offline
```

This uses the existing compatibility renderer and is not React-PDF/Vite production proof. The separately named `compatibility_build_NOT_PRODUCTION.zip` is for inspection only. Do not put it on production as a substitute for the integrated build.

Source control is not a backup of a reader's IndexedDB profile. Before trying this candidate on a real profile, download and retain a V2.1 full workspace backup, then test the candidate in a separate browser profile/origin.

The earlier entry points are preserved in `docs/history/v21-entrypoints/`. Older 1.x/V2 reports remain historical evidence and do not override these V2.2 instructions.
