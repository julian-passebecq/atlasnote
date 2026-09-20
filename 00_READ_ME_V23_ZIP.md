# AtlasNote V2.3 ZIP candidate

**Status: BLOCKED - qualification only, not a production release.**

This source continues `julian-passebecq/atlasnote` from exact commit
`84b8ba2addbfe3cb2527dc4a57039416ceabbb52`, tree
`19eadf07aa7485d5d07cb8bfabb22e02539940be`, on local branch
`final/atlasnote-2.3-pro-finish`.

Read `V23_DURABILITY_ACCESS_RELEASE_REPORT.md`, then `docs/v23/QA_MATRIX.md`.
The outer delivery supplies exact final identity, source/evidence checksums and an
incremental Git bundle. Use that bundle to preserve the exact local candidate SHA;
copying source and making a different commit creates a new candidate needing a new
build and QA run.

The compactor is the preserved qualification writer, not an approved production
feature. Do not merge into main, deploy this as production, or test destructive
compaction on irreplaceable data. No GitHub push or Netlify deployment was performed.

No integrated production dist is supplied: locked dependency installation and real
normal-origin browser execution were unavailable in this environment. Any included
compatibility build is **DIAGNOSTIC-NOT-PRODUCTION**, not an integrated PDF substitute.

For unit diagnostics only:

```sh
npm run bootstrap:offline
npm run build:offline
npm run typecheck
npm test
```

For actual qualification, install the lockfile dependencies with `npm ci`, install
`requirements-test.txt` and Playwright Chromium, run `npm run build`, and execute the
complete existing GitHub Actions release workflow. The still-open runtime/provider
matrix must be completed; rerunning alone is not guaranteed to close it.

The four exact-boundary fixture tests and valid 64 MiB ZIP experiment are model
checks. The mandatory real-browser gate is `npm run test:v23:capacity`.
