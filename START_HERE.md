# AtlasNote V2.3 - provider-neutral access / Vercel candidate

This full source tree is the migration candidate, not an approved production release.
The authoritative starting tree was supplied in the handoff `06_SOURCE/`, not fetched
from GitHub. Baseline candidate: `2ece94b4e07e3179e8aee5dad4b32970c5be2242`;
baseline tree: `1a57e4db16efaf1ee4ac25f52da0462e388c93e9`.
App version remains 2.3.0; IndexedDB version remains 3.

Read `docs/v23/PROVIDER_NEUTRAL_ACCESS.md`, `docs/v23/VERCEL_QUALIFICATION.md`,
`docs/v23/NATIVE_CAPACITY.md` and `docs/v23/QA_MATRIX.md`. The final delivery's
`00_RESULT/FINAL_IDENTITY.json` and `FINAL_RESULT.md` contain the exact final identity
and observed outcomes. Historical reports and `SOURCE_MANIFEST.json` are not current
release evidence. The delivery's external SHA-256 manifest is authoritative.

The atomic compactor **is present and preserved**. Historical statements that
compaction is absent or Netlify is mandatory are superseded. All 13 fault cases,
archive/recovery semantics, five-store persistence, immutable history, Compare,
PDFAtlas and the Agent Interface retain their contracts.

## Build and verify

Work in an actual Git checkout. Keep Node >=22.12, the supplied lockfile and dependency
pins. `npm ci && npm run build` is the integrated production build, producing `dist`.
Run `npm run typecheck:online` as well. Never publish `dist-offline`.
`npm run bootstrap:offline` and `npm test` can exercise the existing separately
labeled compatibility toolchain where integrated dependencies are unavailable;
that does not prove the integrated build, PDF renderer, native quota or hosted app.

Vercel is the active provider. A protected disposable preview and its environment-only
automation credentials must be supplied explicitly. `vercel.json` is **not** an access
control switch; managed protection must be configured and independently tested.
No production deployment is authorized. No GitHub write is part of this pass.

Run `npm run test:v23:release` with the fresh preview and native Linux proof enabled.
Only a completely green result permits `npm run test:inherited:after-v23` on the exact
same clean source. Missing capability, stale evidence and unexecuted gates stay BLOCKED.
For a source copied into the owner's checkout, rebuild and requalify: the owner's new
Git commit is different from the local snapshot identity used in this delivery.
