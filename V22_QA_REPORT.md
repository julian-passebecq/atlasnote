# AtlasNote V2.2 QA report - 2026-09-18

**50/50 release gates and 15/15 expanded integrated-browser scenarios pass.**
The V2.2 candidate is verified for the scope below. The user explicitly confirmed
the existing single-ID Article/QCM schema on 2026-09-18. The handoff wording about
independent wrapper/document IDs is a bounded exception, not an open blocker.
No schema migration, duplicate identity or alias was introduced.

## Repairs

1. Tree menu: narrow the event target before using a typed `closest` call. Both
   TypeScript configurations previously failed to compile.
2. Restore the vendored PDF Atlas manifest's exact bytes from the immutable
   upstream commit. The received ZIP contained CRLF-altered bytes. The original
   expected SHA and Git blob checks were retained, not rewritten.
3. Reading actions: transfer keyboard focus to the destination tab after opening
   a resource. Previously a subsequent search dialog restored focus to the source
   pane, incorrectly changing the active pane. Both original Cheatsheet assertions
   now pass unchanged.
4. Regenerate generated interview/Cheatsheet text through the existing generators
   and verify LF checkout behavior. Regenerate the 25-kind capability/examples
   from this candidate. Add `npm run test:completion:runtime` for the new tests.

5. PDF loading: fetch consented PDF URLs in an abortable reader-owned step before
   creating the PDF.js document. This avoids a reproduced uncaught worker error
   during rapid navigation. React-PDF, the pinned worker/version check, original
   download URLs and external-host consent remain. Each load receives its own
   byte buffer; the retry copy cannot be detached by worker transfer. This reads
   the entire file before rendering rather than streaming it through PDF.js.
6. Keep the canonical Article/QCM identity invariant, as explicitly directed by
   the user. Correct the invalid independent-ID unit fixture and add validation,
   rename, history and restore identity assertions (16 completion unit cases).

## Source and environment

- Received working-tree Git HEAD: `5580c517e19e7b0323d189573ac61d139f763ff3`.
- Clean Windows release snapshot: `b42dcb99cc2ad530e3949524295c47a45469280a`. This is a
  local isolated QA repository commit, not a commit or merge on the user's branch.
- `SOURCE_MANIFEST.json` identifies the delivered source bytes, including final
  reports and the expanded test harness added after the release snapshot.
- Windows 11 build 26200, Node 24.19.0, npm 10.5.0, Python 3.13.1,
  Playwright 1.57.0 / Chromium 143.0.7499.4, PyMuPDF 1.26.7, Pillow 12.3.0.
- Normal Git clone with `core.autocrlf=true`; text checked out LF; vendor bytes
  exempt. `PYTHONUTF8` unset. Normal HTTP loopback origins and disposable browser
  contexts. No browser policy was loosened during this pass. The original helper
  retains its pre-existing `--no-sandbox` launch argument; the new expanded and
  PDF lifecycle suites use default Chromium launch flags. No real-profile reset,
  remote write or deploy.
- Protected PDF Atlas manifest SHA-256:
  `dc1f76c02e4e3fa4e3ed1d8fb0679e46147680c882d9991f57d0b076d45a4a0d`.
- PDF Atlas immutable commit remains
  `fa5e83f7825cdc837078f87c5e130cb012332195`; reference-only rights unchanged.

## Evidence and scope

The 813 unit tests include 16 completion regressions. All original
50 commands were retained and run again after the application fixes. The normal
Windows final run is the authoritative release-gate result. DOM compatibility
results are distinct from integrated React-PDF and IndexedDB results.

The expanded browser run verifies real five-store transactions, a non-empty v2
migration and rich schema-2/3 restores, schema-4 full backup, two actual tabs with
stale writes, preview/import/selection safety, all 25 action kinds with 23 visible
accepted proposals, audit reload, double-click guards, quota-abort atomicity,
corrupt-backup rejection, pinned links/clipboard fallback, removed current source,
history pagination and structure restore, keyboard menus, and 100 reader plus 40
dialog combinations across five themes and four viewport sizes.

Distinct-byte PDF acceptance uses two generated files (2 and 3 pages). Both hashes
and assets are retained; real React-PDF canvases/text layers show different old/new
content with independent physical pages. Reload and fresh-context backup restore
pass. Removing only the old asset in a disposable fault fixture shows an error in
the pinned historical pane while the newer PDF continues rendering. No native
plugin, blank canvas or metadata-only comparison substitutes for this evidence.

Quota testing injects `QuotaExceededError` into a real transaction after earlier
store writes were queued; all five stores remain unchanged and recovery export
restores. It does not claim to fill the user's physical disk.

The PDF lifecycle regression failed before the repair with three uncaught worker
errors. Two subsequent runs each passed 80 rapid switches with no page errors.
The original PDF gates also exercise passwords, physical pages, grids, text,
annotations and wheel behavior. No error suppression was added.

## Preserved failures

- Initial setup: unsupported default Node 21.7.1, both typecheck failures,
  manifest provenance/build failure and consequent unavailable unit build.
- First 50-gate attempt: 45/50. Generated line endings; two Cheatsheet focus
  failures; a transient local-server failure during an overlapping rebuild;
  one reference snapshot timing failure. The isolated reference rerun passed.
- Pre-focus-fix clean Windows attempt: 48/50; the two Cheatsheet gates exposed
  the focus regression. No assertion was dropped.
- Third complete Windows attempt: 49/50. The last V2.2 gate caught an uncaught
  PDF worker termination error although its functional assertions passed. The
  targeted stress test reproduced it; the reader was repaired before the final run.
- Fourth Windows run: 49/50. A PDF component test rejected the wheel input itself
  (383 ms inter-event gap, versus its unchanged 220 ms maximum) while another
  browser suite was active. The release runner was repeated without a competing
  browser suite. Its original timing and page assertions were retained.
- An expanded browser run passed all scenarios but recorded one
  `ERR_BLOCKED_BY_RESPONSE` worker request. A repeat with case-tagged request
  diagnostics passed all 15 scenarios with zero page errors and zero failed
  requests; the earlier raw diagnostic remains. Its exact cause was not proven.
- All added-harness attempts remain under `docs/evidence/v22/qa-20260918/`, including
  fixture setup/selector/expectation mistakes and the schema conflict. Their later
  passing runs do not erase them.

## Handoff exception and limits

The existing content validator requires `page.article.id === page.id` and
`page.qcm.id === page.id`. The user explicitly confirmed this invariant during QA.
The wrapper/page ID is the canonical stable `resourceId` for history, deep links,
ChangeSets, query/navigation, backups and restore. Existing typed target fields
carry that same ID; they do not create another identity. Historical links use this
ID plus the logical revision ID. Conflicting authored objects reject atomically.

The handoff's independent-ID normalization fixture was invalid under the authored
schema. Its navigation assertions now run against canonical content, with new
conflicting-ID rejection and rename/restore identity assertions. Omitted wrappers
resolve for valid content; wrong explicit wrappers and missing historical sections,
questions, sheet blocks and PDF pages reject without navigation or revision writes.
A future separate document identity requires a concrete use case and separate
architecture approval. It is outside this V2.2 scope by the user's explicit decision.

The viewport matrix covers reader content and History/Review dialogs in all five
themes. Compare has the original four-viewport integrated coverage; menus have
keyboard/pointer coverage at desktop size. Every theme x action x viewport
permutation, physical touchscreen hardware, and exhausted physical disk space
were not tested. These are not presented as passing cases. No real private library
was used or published.

## Final 50-gate results

| Gate | Status | Seconds |
| --- | --- | ---: |
| clean-install | PASS | 2.4 |
| integrated-deps | PASS | 0.5 |
| npm-audit | PASS | 0.9 |
| core-typecheck | PASS | 14.4 |
| unit | PASS | 38.2 |
| offline-release | PASS | 5.3 |
| online-syntax | PASS | 0.9 |
| local-inventory | PASS | 1.1 |
| dom | PASS | 23.6 |
| hardening | PASS | 46.2 |
| reader | PASS | 47.9 |
| compact | PASS | 20.9 |
| finish-ui | PASS | 20.6 |
| backup-diagnostic | PASS | 8.8 |
| pdf-authoring | PASS | 12.1 |
| workspaces-ui | PASS | 13.9 |
| simplified-ui | PASS | 19.3 |
| reading-ui | PASS | 17.2 |
| interview-content | PASS | 0.5 |
| polish-ui | PASS | 18.9 |
| integrated-typecheck | PASS | 7.8 |
| integrated-build | PASS | 7.0 |
| public-release | PASS | 2.7 |
| component-harness | PASS | 1.4 |
| pdf-component | PASS | 25.7 |
| pdf-grid | PASS | 26.1 |
| pdf-wheel | PASS | 81.8 |
| pdf-runtime | PASS | 15.2 |
| finish-integrated | PASS | 10.7 |
| runtime | PASS | 20.9 |
| workspaces-runtime | PASS | 61.5 |
| saved-states-runtime | PASS | 22.1 |
| reading-runtime | PASS | 15.7 |
| headers | PASS | 1.2 |
| cheatsheets-content | PASS | 0.5 |
| cheatsheets-ui | PASS | 43.9 |
| cheatsheets-runtime | PASS | 25.5 |
| stabilization-ui | PASS | 28.7 |
| stabilization-runtime | PASS | 10.1 |
| content-hub-ui | PASS | 47.1 |
| content-hub-runtime | PASS | 16.6 |
| references-unit | PASS | 1.2 |
| references-ui | PASS | 22.7 |
| references-runtime | PASS | 24.5 |
| final-polish-runtime | PASS | 20.3 |
| release-blockers-runtime | PASS | 27.1 |
| history-unit | PASS | 4.0 |
| agent-unit | PASS | 15.9 |
| pdfatlas-provenance | PASS | 0.5 |
| v22-runtime | PASS | 17.6 |

## Expanded normal-origin browser results

| Scenario | Status |
| --- | --- |
| capabilities-context-keyboard-menus | PASS |
| review-invalid-import-subset-double-click | PASS |
| history-compare-real-tab-concurrency | PASS |
| distinct-byte-pdf-reload-backup | PASS |
| legacy-schema-2-3-fresh-profile-restores | PASS |
| rich-nonempty-v2-migration | PASS |
| five-theme-responsive-matrix | PASS |
| pinned-links-and-restore | PASS |
| quota-failure-atomicity | PASS |
| all-25-action-kinds-through-review | PASS |
| corrupt-backups-rejected-atomically | PASS |
| history-pagination-and-structure | PASS |
| all-resource-keyboard-menus | PASS |
| deleted-source-pinned-startup | PASS |
| exact-historical-targets-and-wrappers | PASS |

## Run locally

Build from source with Node >=22.12: `npm ci`, `npm run build`, then
`npm run preview`. Open the printed loopback address. The separate integrated
build ZIP can be unpacked beside the source as `dist/` and served with
`npm run preview` without rebuilding. Do not open `dist/index.html` through
`file://`. This laptop's default Node is older; the QA used the bundled Node 24
runtime recorded in the evidence. No global Node installation was changed.

Reproduce the original gates with `npm run test:release`; then run
`node tools/generate-v22-examples.mjs`, `npm run test:completion:runtime`, and
`python tests/pdf_lifecycle_runtime.py`.
Install the two requirements files and Playwright Chromium first. Choose a fresh
`ATLAS_RELEASE_EVIDENCE` / `ATLAS_EVIDENCE` path to retain earlier attempts.
