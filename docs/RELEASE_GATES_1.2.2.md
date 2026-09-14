# AtlasNote 1.2.2 release-gate fixes

Validated locally on 2026-09-14 on Windows, using Node 24.19.0, Python 3.13,
Playwright 1.57.0 and its Chromium 143. Started from
`release/atlasnote-1.2.2-workspaces-pdf-companion` at
`53738c3f33d25878b75abbdfa0c891603f244f13`; all changes are on
`fix/atlasnote-1.2.2-release-gates`.

## Failures and fixes

1. **Compact geometry:** `tests/compact_12_dom.py:33` requires a 36 px reader
   rail at widths at or below 540 px. At 390 px it measured 44 px. The legacy
   `flex:0 0 44px` overrode the mobile width declaration. The mobile rule now
   also sets `flex-basis:36px`. The original assertion remains unchanged.
2. **Companion navigation:** the workspace runtime assertion `number(page)==2`
   after a page-map click read the previous page, 4. Diagnostic observation
   confirmed it eventually became 2 with correct persisted state. The page
   input mirrored location through a passive effect. It now synchronizes in
   a layout effect before paint. The original runtime assertion is unchanged.
3. **Fresh backup restore after glossary promotion:** the restore preview never
   appeared because validation threw
   `local glossary.glossary[0].tags: unsupported field`. Promotion writes tags
   but the legacy content schema does not support them. Local-state validation
   now validates tags separately (array of at most 100 strings, each at most
   256 characters), retaining every value. Exact five-workspace backup tests
   now include promotion tags; malformed tags and unknown fields still fail.
4. **Stale CI mutation:** the workflow expected obsolete `if new_tab:` and PDF
   zoom test source strings, then committed and pushed generated edits. That
   entire step is removed. Checkout tests the triggering commit, permissions
   are read-only, and pushes to the fix branch also trigger validation.
5. **Windows byte integrity:** `core.autocrlf=true` changed ASCII PDF fixtures
   and pinned vendor files on checkout. This caused PDF hash mismatches and
   vendor audit failure. `.gitattributes` preserves PDF and vendor bytes.
   The original committed bytes were restored; no PDF, vendor artifact, or
   integrity baseline was changed.

Initial local prerequisites were also missing. Playwright and Python authoring
dependencies were installed. The default npm launcher used Node 21 despite a
PATH override and omitted a native Rolldown dependency. Running npm explicitly
with Node 24 and repeating `npm ci` resolved this without lockfile changes.
Missing-build failures in the first downstream pass were rerun after the build
succeeded; they are not counted as passing runs.

## Final gate results

Every command below exited 0. No meaningful assertion was removed or relaxed.

| Command | Result |
| --- | --- |
| `npm run test:compact:ui` | PASS, 11 checks |
| `npm run test:finish:ui` | PASS, 14 checks |
| `npm run test:backup:diagnostic` | PASS, exact personal equality, no differences |
| `npm run test:pdf:authoring` | PASS, 12 checks |
| `npm run typecheck:online` | PASS |
| `npm run build` | PASS, integrated production distribution |
| `npm run check:release` | PASS |
| `npm run test:pdf` | PASS, 17 checks |
| `npm run test:finish:integrated` | PASS, 14 checks |
| `npm run test:runtime` | PASS, 13 checks |
| `npm run test:headers` | PASS, local/package headers |
| `npm run test:workspaces:ui` | PASS, 9 checks |
| `npm run test:workspaces:runtime` | PASS, 26 checks |

Additional passing checks: `node --test tests/*.test.mjs` (288 tests),
`npm run typecheck`, `npm run check:integrated-deps`,
`npm run test:online:syntax`, `npm run audit:local`, and
`npm run check:release:offline`. The corrected `npm ci` also reported zero
vulnerabilities. Both distributions were rebuilt from the fixed source.

The full workspace runtime includes actual IndexedDB, five independent slots,
duplicate category filters, note/PDF positions, wheel navigation, Companion
editing/import/promotion, exact backup/fresh-context restore, reload, legacy
migration, and the live pinned six-page public Spark PDF with 30 concepts.

## Files and commits

- `4c1524f`: `.gitattributes`, `src/styles/workspaces.css`,
  `src/online/PdfEngine.tsx`.
- `4524447`: `src/storage/state-validation.mjs`,
  `tests/workspace-122.test.mjs`.
- `d890b1a`: `.github/workflows/fix-122-validation.yml`.
- This report: `docs/RELEASE_GATES_1.2.2.md`.

Local logs and generated evidence are retained under `.local/release-gates/`.
They include failed diagnostic attempts as well as final successful runs.

## Remaining release status

No requested local gate remains failing or blocked. The revised GitHub Actions
workflow has not been run remotely in this pass; its Ubuntu/Node 22 result
remains to be confirmed after pushing. No merge, push, or Netlify deployment
was performed. Live deployed Netlify headers were intentionally not tested;
the headers gate certifies local/package behavior only.
