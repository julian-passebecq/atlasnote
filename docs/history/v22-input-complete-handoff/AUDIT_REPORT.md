# AtlasNote V2.2 independent delivery audit

Audit date: 2026-09-18. Status: audit complete. Automated functionality is substantially verified; ordinary Windows reproduction requires two portability fixes. No unconditional release clearance.

## Final measured results

| Run | Result | Interpretation |
|---|---|---|
| Original source-free handoff | 4/50 pass; 36 fail; 10 blocked | Historical environment-limited attempt, retained unchanged. |
| GitHub CI 35384025755, commit 60db2cb | All 50 npm command steps pass | Successful Linux CI and production artifact; downloaded evidence inspected. |
| Laptop ordinary CRLF checkout | 9/50 pass; 34 fail; 7 blocked | Manifest byte conversion blocks builds and causes downstream failures. |
| Laptop exact committed-byte checkout | 49/50 pass; 1 fail | All except v22-runtime pass. Includes npm ci/audit, 797/797 unit tests, integrated build, PDF and old browser suites. |
| Unchanged v22-runtime with Python UTF-8 mode | PASS, all 8 phases | Isolates and resolves the locale-dependent fixture transport failure without changing source or weakening assertions. |
| Independent browser supplements on CI artifact | 3/3 pass | Competing-tab writes, real historical/current PDF rendering, independent pages after reload. |

The full laptop run remains recorded as 49/50; the isolated UTF-8 recheck does not retroactively turn that run into an all-green run. No further full-suite rerun was needed to diagnose the sole remaining failure. All 50 commands have passing evidence under the stated environment conditions.

## Confirmed Windows fixture-encoding defect

The default Python preferred encoding is CP1252, with UTF-8 mode off. `tests/v22_runtime.py` runs Node and reads its JSON using `subprocess.check_output(..., text=True)` without an encoding. Node emits UTF-8. Three U+200B characters in the first partial-history cheatsheet snapshot become U+00E2/U+20AC/U+2039, while the content hashes remain those of the original Unicode strings. Consequently, history validation correctly refuses the corrupted synthetic fixture with `History content hash mismatch`. Startup catches that failure and does not configure the agent interface; the visible test error is then `AtlasNote agent interface is not initialized`.

This was reproduced twice and captured with the underlying visible storage warning. The diagnosis compares the same raw Node output decoded as UTF-8 versus CP1252: exactly three changed values, unchanged recorded hashes. Running `python -X utf8 tests/v22_runtime.py` against the same built source passes every phase, including resumed initialization and fresh-context history-backup restore. This is a fixture transport defect, not evidence that real uncorrupted user history was lost.

Evidence: `windows-encoding-diagnosis.json`, `v22-diagnostic-capture/startup-body.txt`, `v22-diagnostic-capture/startup-failure.png`, `v22-utf8/results.json`, and `v22-utf8.log`. Prefer an explicit `encoding='utf-8'` at the subprocess boundary as the maintained fix. Do not disable hash validation.

## Identity and remote commits

- User checkout: `b5af6c897b2272afd2cf1626a233805fbc5991af` on `v2.2manual`.
- Remote candidate selected for testing: `60db2cb7504503ac416ddad940441e24f82266b1`.
- Remote main observed: `b50c27a987fa65eee1c51d36225908621e322da7` (V2.1.0).
- Seven later commits exist on the candidate branch. Their combined diff changes CI and six test files, with no application implementation changes. They add V2.2 CI gates, account for the Version History rail button, open the current IndexedDB version in a PDF observation, and expect the V2.2 title. These are reasonable expectation updates; the diff does not delete substantive legacy behavior checks.
- Git author metadata names Julian Passebecq; it cannot establish whether a web AI or a human initiated those commits.
- The source-free package records `gitSha: null` and explicitly states no Git commit/remote write was made during its original creation. This is compatible with a later manual upload and subsequent test-only commits.
- No checkout update, commit, push, merge, deployment, or personal browser-profile access was performed by this audit. Read-only remote inspection/fetch and detached audit worktrees were used.

## Package verification

The supplied ZIP is 40 files, not the advertised 48. All 39 entries in SHA256SUMS.txt verify. The remaining file is SHA256SUMS.txt itself. Its source inventory has 242 entries: 105 match the local HEAD Git blob bytes exactly; 137 are absent from Git and are confined to generated evidence, four example backup archives, and one generated PDF-library archive. There are no other source mismatches. This ties the supplied claims to the local V2.2 implementation, but the source-free ZIP alone cannot reproduce a release.

The original evidence honestly records 797 passing compatibility unit tests and an unsuccessful 50-gate release attempt (4 pass, 36 fail, 10 blocked). Its browser and integrated-build claims are explicitly unresolved. Do not interpret its delivery message as production approval.

## Reproduction environment

Windows laptop; Node 24.19.0 from the bundled runtime; Python 3.13.1; committed Playwright 1.57.0, PyMuPDF 1.26.7 and Pillow 12.3.0 installed; Playwright Chromium install completed. The default system Node 21.7.1 is below the app requirement. The first standalone npm ci used the system npm launcher and warned about Node 21; the release runner and its own clean-install gate used Node 24. The second runner was launched explicitly through Node 24 and npm's JavaScript entry.

Both complete release attempts retain the default 600,000 ms gate timeout and original assertions. Each has separate logs; neither overwrites the supplied historical evidence. Browser contexts are synthetic test contexts.

## Confirmed Windows release blocker

The repository has `core.autocrlf=true`, while .gitattributes protects PDFs and vendor JavaScript but not the byte-verified JSON source manifest. A normal Windows checkout changes `config/vendor/pdfatlas.library.source.json` from LF to CRLF. Its SHA-256 becomes `12cb4451656b63b98edf6fd9879044c8e40b2011440e9b4b88caa7c321c65122`, instead of the reviewed `dc1f76c02e4e3fa4e3ed1d8fb0679e46147680c882d9991f57d0b076d45a4a0d`. The correctly strict PDF Atlas gate rejects this, preventing builds and causing downstream missing-build failures. Generated-content exact-text checks are also susceptible.

The independent LF checkout was created with `git -c core.autocrlf=false worktree add --detach ... 60db2cb...`. It restores exact committed bytes without modifying source or weakening provenance assertions. A repository fix should explicitly preserve reviewed bytes and deterministic generated text through .gitattributes; do not change expected hashes to bless transformed bytes.

## Coverage limitations found in source review

Even an all-green runner does not alone establish the full required V2.2 acceptance matrix:

1. `tests/v22_runtime.py` has no same-origin two-tab race test or forced real IndexedDB transaction-abort scenario. MemoryBackend failure injection is unit evidence only.
2. Its phase named PDF physical-page current/history Compare navigates and takes a screenshot, then checks workspace initialization. The downloaded successful CI screenshot actually selects the Password-protected PDF fixture and shows "Opening PDF..." in both panes, with no rendered pages. It does not wait for/assert both PDF canvases, independent page positions, or old/current PDF byte identity. Legacy PDF suites test the existing reader, but do not fill this history-specific gap.
3. The v2 migration fixture adds authored Article/QCM and a bookmark to a blank workspace. Its imports and assets are empty, so equality checks do not demonstrate preservation of non-empty user imports/PDF bytes during migration.
4. Historical edit controls, all manual editors, keyboard focus behavior, and the complete required surface/viewport matrix need stronger direct browser assertions or recorded manual inspection. Tab/Shift+Tab presses without focus assertions are not a full keyboard audit.

The internal agent module explicitly requires a future authorized bridge and is not an authentication boundary for trusted same-origin JavaScript. Its exposed accept method should not be treated as an AI-facing permission to self-approve.

## Evidence paths

- `audit-identity.json`: exact commits, changed files, ZIP and manifest hashes.
- `package-verification.json`: package checksums and source-inventory comparison.
- `release-gates/results.json`, `release-runner.log`: ordinary Windows checkout attempt.
- `release-gates-lf/results.json`, `release-runner-lf.log`: exact committed-byte attempt.
- `github-run.json`, `github-jobs.json`: timestamped GitHub run snapshots.

Final results and recommendations are recorded below.

## Independent supplemental browser checks

Using the successful GitHub production artifact for the same commit, a separate fresh normal-origin Chromium context passed:

- Two tabs accepted competing authored changes from the same history epoch. Exactly one committed; the other reported another-tab history conflict. After reload, the head advanced exactly once and only the winning content/audit was accepted. This closes a useful subset of the missing race coverage, without proving every multi-tab schedule or disk-failure mode.
- An unlocked PDF fixture was given a reviewed metadata revision and opened current/historical in A/B. Both actual React-PDF canvases rendered at 525x742, and both workers reported compatible. No page errors were observed. This establishes real rendering for metadata history over identical PDF bytes, not replacement-byte provenance.

See supplemental_checks.py, supplemental-results.json, and supplemental-pdf-rendered.png. These audit checks do not change the repository or replace its committed release tests.

A further supplemental check moved the current PDF to physical page 2 while the historical pane stayed on page 1. Both positions and rendered canvases persisted after normal-origin reload. See supplemental-pdf-independent-reload.png.

## GitHub CI evidence

Run [35384025755](https://github.com/julian-passebecq/atlasnote/actions/runs/35384025755) completed successfully at 2026-09-18 19:19:21 UTC on commit 60db2cb7504503ac416ddad940441e24f82266b1. All 50 npm command steps passed, and the production artifact was produced. The downloaded v22/runtime/results.json reports all eight scripted phases passing with empty page-error and request-failure arrays. The raw job log and artifacts were retained locally. This is newer evidence than the source-free handoff and supersedes its old environmental blockers for this Linux CI run only.

I visually inspected the downloaded Changes, side-by-side, Version History, and Agent Review screenshots at 390px, the Settings/history/backup screenshot, and the PDF-history screenshot. The small-screen dialogs use vertical scrolling; these static images cannot prove every focus target or below-fold action is operable. The PDF screenshot limitation is documented above and partially covered by the independent supplemental checks.

## Independent PDF Atlas source verification

The manifest fetched read-only from the pinned PDF Atlas commit `fa5e83f7825cdc837078f87c5e130cb012332195` has Git blob `20ea3cae33fd386a3f4924e76f8c4e9d18fa14af` and SHA-256 `dc1f76c02e4e3fa4e3ed1d8fb0679e46147680c882d9991f57d0b076d45a4a0d`. Its bytes exactly match the committed vendored source. Only metadata was fetched for this check; no public PDF binaries were copied. Evidence: pdfatlas-independent-check.json.

## Recommended follow-up, in priority order

1. Preserve reviewed source-manifest bytes and deterministic generated-text line endings in repository attributes. Also explicitly decode Node JSON as UTF-8 in the Python fixture subprocess call (tests/v22_runtime.py), instead of relying on the Windows locale. Verify a fresh ordinary Windows checkout passes npm ci and the release runner under supported Node.
2. Move the useful independent two-tab and rendered historical-PDF checks into maintained tests. Extend them to actual different PDF bytes, revision identity/provenance, and non-empty legacy import/asset migration. Preserve all older assertions.
3. Complete the remaining specified manual browser/keyboard matrix, including historical read-only controls and authored edits for every content type; retain visual and storage evidence.
4. Refresh V22_TEST_EVIDENCE.md and the delivery summary with the exact tested candidate SHA, successful CI run, laptop evidence, and outstanding limitations. Keep old failed/blocked logs as historical evidence.

This audit does not authorize a main merge or deployment. The strongest accurate description is a candidate with substantial verified functionality and explicit remaining portability/acceptance work, rather than an unconditional release clearance.
