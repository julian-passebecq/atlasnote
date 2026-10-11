# AtlasNote V3.2 execution backlog — 2026-10-11

This is the current mission backlog. `PASS` identifies the stated check only,
not full release qualification. Retained historical evidence remains historical.
Supplied source: `9034025c187680a06f6262b7c21a1e88f507c40e`, equal to GitHub
main on read-only inspection. Work branch: `codex/v32-master-execution`.
No GitHub writes have been performed. The owner approved isolated QA repair;
production remains unchanged.

| Priority | Reproducible problem / scope | Change and acceptance | Dependencies / evidence | Status |
| --- | --- | --- | --- | --- |
| P0 | Old generic Wrangler config targets deleted QA Worker | Explicit local/QA/production configs; generic upload/deploy refuses; clean source/dist/account/Access preflight | `tools/cloudflare-release-guard.mjs`; 150 focused tests and actual local/QA dry-run denials | PASS: source hardening |
| P0 | CI at baseline succeeds while live/inherited jobs are skipped | Always retain an explicit qualification status; requested incomplete qualification must fail | GitHub run `37728943900`: portable success, full-V23 and production-release skipped; status unit checks | PASS: source hardening; remote run pending |
| P0 | Protected QA no longer exists | Bootstrap harmless QA; attach dedicated owner and Service Auth policies; reject anonymous root/static/deep-link; qualify exact preview | [QA Access proposal](QA_ACCESS_PROPOSAL.md); owner approved; stable and placeholder-preview anonymous/Service Auth checks pass | PASS: protected placeholder; candidate proof pending |
| P0 | Full same-source V23/inherited release unavailable | Run every V23 gate on frozen source; unlock inherited only after complete V23 success | Provider credentials/protected preview and native quota environment | BLOCKED |
| P1 | Locked `source-map-js` 1.2.1 has advisory GHSA-68fv-2mgg-jv7q | Compatible lock update to 1.2.2; audit zero and unchanged build/type/unit behavior | `npm update source-map-js`; audit zero, build/type diagnostics pass; frozen unit rerun recorded separately | PASS: patch and initial checks |
| P1 | Authoring outputs previously lacked conclusive app import proof | Actual UI import, refresh/reopen, editable source, invalid recovery for cheatsheet/CSV/Article; native schema/semantic/render/palette checks | Installed plugin 0.4.1:14 alignment checks; local UI:9 cases;3pages×5palettes zero overflow; frozen rerun evidence separate | PASS: local diagnostics |
| P1 | SQL material source provenance uncertain | Inventory original 20-frame ZIP, readable coverage/uncertainty; validate and import supported material; execute dialect-labelled queries | Original20frame hashes checked; six independent SQLite queries; private3page handoff and uncertainty ledger | PASS: available-source study output; full300 transcription BLOCKED |
| P1 | PDF backward-jump/lifecycle concerns | Current integrated nav, lifecycle, storage suites; fix confirmed regressions only | Integrated PDF6cases; lifecycle80opens zero errors; compatibility-entry IDB5cases; frozen reruns separate | PASS: diagnostics; physical input BLOCKED |
| P1 | Historical QCM question-removal concern | Verify existing removal of unused questions; refusal for attempted/referenced questions; preserve attempts/history through reload/recovery | Existing canonical guard already present; six isolated lifecycle cases; frozen rerun separate | PASS: local diagnostics; no feature fix needed |
| P1 | Seed includes owner-review publication decision | Preserve exact review flag; require separate pack approval before publication | `atlas.v3-seed`: 64 Notebook pages, 6 QCM sets, 45 questions, 41 terms | BLOCKED: owner editorial decision |
| P2 | Norsk counts/persistence may be stale | Verify current source fidelity, search/group/layout and recovery without overwriting library | 1449rows/41pages/10sources; CSV browser14cases; exact blank/source preservation checks | PASS: local diagnostics |
| P2 | Historical issue #2 contains old integration/provider requirements | Maintain read-only issue disposition; retain physical/rights exceptions, do not close based on partial checks | [Issue #2](https://github.com/julian-passebecq/atlasnote/issues/2) still open, no open PRs | PASS: inspected; remote update deferred |
| P2 | Current start/handoff documents cite older live deployment | Link this backlog and fresh read-only account observation; separate source, local browser and live provider evidence | [Execution report](EXECUTION_REPORT.md); final exact-source results in ignored evidence | PASS: documentation; final evidence separate |
| P3 | Optional draft inbox and speculative performance work | Defer until required manual imports and measured stability needs justify work | No new service/database/API introduced | DEFERRED |

## Current live observations

Cloudflare production deployment `4703ec87-418a-4cfa-bb97-92a617558ff8`
serves Worker version `161c6acc-8418-4af4-a82c-27057b20f7f5` at
`https://atlasnote.datapass.workers.dev`. Provider annotations name baseline
`9034025`; authenticated served build identity has not been fetched. Previous
version `dcb5be64-f8d3-4369-a15d-6f16826e9cfa` is recorded for later rollback review.
Anonymous root, build identity, agent static module and deep-link probes each
returned 302 to Cloudflare Access without AtlasNote bytes. Evidence:
`docs/evidence/mission/cloudflare/anonymous.json` (ignored local evidence).

Initial QA inspection found a deleted Worker and stale Access application.
After owner approval, a new QA Worker-wide Access application now protects the
harmless placeholder and its previews with exact email and dedicated Service
Auth. See the proposal for IDs and actual checks. Production Access retains its
exact owner-email rule. These account/probe observations remain distinct from
full candidate provider qualification and owner browser-login proof.

## Integration boundary

Database version 3 and five stores, authored WorkspaceStore/history writes,
manual review, canonical targets, five workspaces/A-B panes, PDF/SVG engines,
atomic compaction and all 13 rollback cases are retained. No normal-origin test
is replaced by a DOM/offline diagnostic. Full inherited workflow must not start
until complete same-source V23 success.
