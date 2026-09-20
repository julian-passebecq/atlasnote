# Codex Light - final V2.2 verification and bounded fixes

## Objective and rules

Finish acceptance of the delivered completion source, not another architecture
pass. Read `START_HERE.md` and `V22_COMPLETION_REPORT.md`. This source has not been
compiled or tested after the coding changes. Use Light; do not escalate to a
Medium/higher-cost agent without the user's approval. Run work in bounded stages,
retain logs and fix genuine regressions without dropping assertions or weakening
validation. Do not merge main, deploy, publish private assets or reset a real
profile. Use disposable browser profiles and synthetic data.

Base source recorded by the input handoff:
`60db2cb7504503ac416ddad940441e24f82266b1`.
That is NOT the identity of this modified source. Record current file hashes and,
when available, the review branch's exact new commit. `SOURCE_MANIFEST.json`
identifies the received files; do not assume old build artifacts match them.

## 1. Setup and fast feedback

Use Node >=22.12, the checked-in npm lockfile, a supported Python environment and
an authorized normal Chromium browser. From the project root:

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install chromium
npm run typecheck
npm run typecheck:online
npm run build:offline
npm run test:completion
```

The completion file contains 15 authored unit cases, not previously passing
results. Repair type errors or regressions before the full suite. Do not treat a
missing dependency, syntax-only check or compatibility renderer as production
success. Do not use a browser-policy bypass or replace a normal origin with
`file://`/a mocked DOM to claim durable browser coverage.

## 2. Required release runner

```sh
npm run test:release
```

`tools/run-release.mjs` retains all 50 original commands, including clean install,
audit, core/integrated typechecks, unit/history/agent tests, integrated build,
React-PDF, old UI/runtime regressions, PDF Atlas and V2.2 runtime. `npm test` now
also includes `completion-v22.test.mjs`. The runner records raw output and exit
status for every command. Do not remove gates, shorten assertions or turn blocked
checks into passing skips. Final acceptance requires rerunning after any fix.

Default output: `docs/evidence/v22/release-gates/`. Use a distinct
`ATLAS_RELEASE_EVIDENCE` path per attempt so earlier failures survive. Record
actual Node/npm/Python/browser versions and platform. Regenerate the examples
with `node tools/generate-v22-examples.mjs` only after its prerequisites build.
Do not restore the old example bases into a real user workspace.

## 3. New menus and accessible operability (integrated browser)

Use normal-origin `dist/`, not `dist-offline`. For a Notebook, folder and note, and
for PDF, Article, Cheatsheet, QCM and a manual reference, exercise right-click,
the Actions button, Shift+F10 and the Context Menu key. Confirm all three history
actions, current-resource identity, explicit disabled first-version controls,
Up/Down/Home/End skipping disabled items, Escape/Tab dismissal and focus return.
Opening History must not leave focus on a detached menu button.

Test current and pinned reference targets. Generated grouping IDs must not create
fictional histories. A folder's History is its owning Notebook structure; a
reference's History is its target, not a copied document. Uninitialized, missing
and wrong-resource revisions must give explicit unavailable states.

Selectors: scope `data-agent-action` to a named dialog, pane or resource key.
`data-revision-id` is deliberately not globally unique. The existing runtime
checks are now scoped to `.revision-row`, `.document-pane` and `.agent-decision`.
Keep their original assertions. Check all identity attributes documented in
`docs/v22/BROWSER_AGENT_SEMANTICS.md` and exercise the public service, not screen
coordinates or private storage setters.

## 4. History and A/B reader behavior

Create three authored versions for Notebook page/structure, Article, Cheatsheet,
QCM and PDF metadata/asset references. Latest-only discovery remains the default.
Open old versions here, in a new tab, the other pane and workspaces 1-5. Historical
tabs show old titles and a version label. Confirm read-only authored controls;
personal reading state remains separate. No opening/comparison action creates a
content revision. Test tab/pane limits and precise failure without partial layout
change.

Select any two versions across history pagination. From active B, Compare must
still place requested A before and B after. Repeat more than five comparisons;
the active A/B tab counts must not grow. Check Changes, Side by side, A only, B
only, swap, mobile pane switching, collapsed panes, divider and reload. Compare
unrelated resources must not fabricate a semantic diff. Ensure reader positions
are captured and hash navigation remains synchronized for service-driven actions.

Restore as new must append a version, keep previous revisions and personal state,
and record provenance. While a restore confirmation is open, advance the head
through another legitimate edit; confirmation must not accept an unreviewed new
head. Double-click decisions must not create duplicate versions.

Copy a pinned link with clipboard available and unavailable. Test opening it in
a fresh tab, on reload, and after the current source has been removed (history
still present). Pinned missing sections/questions/sheet blocks/PDF pages and
foreign pins must not open current or parent content. Current semantic links keep
the existing explicit parent-fallback warning. Test Article/QCM document IDs that
differ from wrapper page IDs, including a wrong explicit wrapper which must fail.

Structure view: old folder order/IDs/metadata and manual placements must render;
large trees paginate. Floating child links open current content, explicitly pinned
links retain their own pins. Restoring a structure does not rewind child source.

## 5. Agent Review safety and interface discovery

Use the facade from `app/agent/public.js`. Exercise actual capability and context
exports. Verify exactly the supported 25 action kinds, target/payload descriptions,
all navigation methods and actual surface names `history`, `agent-review`,
`references`, `dashboard`, `capture`, `states`. Changing an exported capability
object must not mutate validators or another export.

Export 0, 1 and 20 selected context resources; confirm pagination, bounded size and
personal excerpts excluded by default. Imported content is inert data. Test the
one-MiB intake limit, malformed JSON, unsafe content and unknown operations.

Critical UI sequence: preview valid plan A, then import invalid B. No stage/accept
control may still submit A. Re-import the same filename. Change checked operations
after preview; Accept must stay disabled until that exact selection is re-previewed.
Stage must change review metadata only. Accept a subset atomically, ensure other
operations are not applied, then inspect/export the accepted audit without stale
replay. Verify rejected and stale histories, double-click guarding, checkbox versus
Compare-button behavior and disabled controls during persistence.

Exercise real proposals across resource adapters, native tree create/rename/move/
reorder (including cross-project destination base checks), manual-reference
placements through `notebook-tree:atlas.manual-references`, taxonomy, authored
links, semantic proposal review, bookmark/Read Later/capture and workspace routing.
New or retargeted links must be exact; unchanged unresolved source must survive.
Inject one invalid/stale operation into a multi-operation batch and prove no
partial projection/head/history/audit commit. Compare source, all heads and the
accepted audit after reload. No automatic self-approval or provider/backend added.

## 6. Real migration, concurrency and backups - not unit substitutes

Seed an actual non-empty IndexedDB v2 database on a disposable origin: at minimum
a user note, a user Article/QCM, one structured Cheatsheet, native Notebook
placements, manual and semantic references, personal reading state and local PDF
bytes. Record IDs, counts and SHA-256 of bytes before the v3 upgrade. Close and
reopen with this source. Verify the original stores plus history, unchanged source
and assets, matching heads and a baseline per versioned resource. Exercise an
interrupted/resumed baseline without duplicates or partial data loss.

Two actual tabs must contend on the same reviewed base; one later stale writer
must be rejected without erasing the other tab's commit. Keep transaction/storage
and public-service evidence rather than just a memory-backend unit result.

Restore schemas 2, 3 and 4 in fresh browser contexts. Include non-empty history,
old local assets, manual/semantic links, review audit and personal state. Verify
current-source/head consistency and byte hashes after restoration/reload. Reject
corrupt hash/index/history/identity inputs before any real-state mutation. Test
storage/quota failure and recovery/export behavior; never auto-prune or reset.

## 7. Distinct historical PDF assets and PDF Atlas provenance

Use two synthetic, non-encrypted PDFs for one logical document with visibly
different text, DIFFERENT SHA-256 values and preferably different page counts.
Import through normal intake and the reviewed revision path. Confirm both local
assets are retained. Render old in A and new in B through actual integrated
React-PDF canvases, inspect expected visible text/page counts, change independent
physical pages, reload, then full-backup/restore into a fresh profile and repeat.
A metadata-only revision over identical bytes does NOT satisfy this case. A native
browser-plugin fallback, blank canvas or mocked fetch is not integrated proof.

Retain all old wheel/grid/zoom/embedded-link regressions. Removing/unavailable old
bytes must yield a specific missing historical asset state, never current bytes.

Verify PDF Atlas's full 40-character pin, source/enrichment agreement, immutable
URL and byte checks. Preserve `reference-only` rights. The vendored source manifest
must keep this SHA-256 exactly:
`dc1f76c02e4e3fa4e3ed1d8fb0679e46147680c882d9991f57d0b076d45a4a0d`.
Do not rewrite expected hashes or fetch mutable `/main/` to get a pass.

## 8. Windows and responsive acceptance

Test a NORMAL Windows Git checkout of the candidate with `core.autocrlf=true`,
not only an archive/byte-preserving workaround. Confirm LF handling and binary
attributes with `git ls-files --eol` / `git check-attr`. The coordinator must
normalize text when committing the candidate; never renormalize the vendor
manifest or binary assets. Check clean diff and exact protected hashes.
Run the release suite in the normal locale with `PYTHONUTF8` unset; explicit UTF-8
fixture decoding should suffice. Keep any isolated rerun separate from the full
runner's outcome. A Windows encoding environment override is not the only fix.

For each of 1440x900, 1100x800, 800x900 and 390x844, cover Notebook/PDF/Cheatsheet/
Article/QCM reader, tree/reading menus, History/Compare, Agent Review, context and
workspace switching. Include all three existing themes, keyboard/focus behavior,
scrolling, overflows, touch-sized actions and long source text. Retain screenshots,
console/network/storage logs and annotate any untested combination.

## Final deliverables and decision

Return tested source ZIP, freshly built integrated `dist/` ZIP, reports, unchanged
failed-attempt logs plus final logs, screenshots and SHA-256 manifests. Update the
root evidence/report files to the actual results; preserve these coding-only
records as history. Include exact source identity, the 50 gate statuses, new
regression results, platform/browser details and every remaining failed/unverified
case. Only call the candidate ready for coordinator integration when all required
acceptance work passes. Do not merge main or deploy production yourself.
