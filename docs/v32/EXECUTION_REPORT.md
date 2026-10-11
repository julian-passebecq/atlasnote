# AtlasNote V3.2 mission delivery — 2026-10-11

## Qualified implementation snapshot and final review

The implementation at `b79e36b276648c64f3b91b5fd8e1438dc9749832` was freshly
qualified with canonical source fingerprint
`4348f63f9aba682c169a9bf55bc6e5220cdf1d219b9731566d9ecdc99c077514`.
[CI run 38173230439](https://github.com/julian-passebecq/atlasnote/actions/runs/38173230439)
passed both complete V23 runs (13/13 each), all 54 inherited commands in order,
and 1,217 unit tests. The qualification job named production-release performs
no deployment. [PR #44](https://github.com/julian-passebecq/atlasnote/pull/44)
contains the supplied-source changes; issue #2 stays OPEN.

Protected preview `4f87a067-atlasnote-v23-qa.datapass.workers.dev` qualified that
exact implementation. Navigation 33/33 and targeted 45 cases passed; separate
headed paint qualification passed 83/83. Computer Use retained 22 observations.
Physical mouse/trackpad validation is UNVERIFIED. A transient white frame
recovered; capture/readback timing does not establish its cause, which remains
unresolved. Seed editorial/rights and owner-profile recovery acceptance remain
separate. Production is unauthorized.

This is a recorded implementation snapshot, not a claim that another source
commit inherits its proof. The documentation-only review revision also changes
the source fingerprint: exact-current-head checks and protected preview identity
must be verified separately before a merge GO. Current results and independent
file reviews are retained in ignored `docs/evidence/mission/final-review/`, with
`docs/evidence/mission/FINAL_STATUS.md` as the local handback. The current PR body
and Actions checks are the remote review record; no private evidence is committed.


The mission continues the supplied `9034025` baseline on
`codex/v32-master-execution`. See [the canonical backlog](EXECUTION_BACKLOG.md).
Initial discovery used read-only GitHub access. The owner later approved scoped
CI integration: branch push, draft PR #44, secure CI secrets/variables, dispatch
and the existing issue #2 comment. No merge occurred.

## Implemented scope

- Separate inert local, QA preview and gated production Wrangler targets.
  Generic deployment refuses. Explicit release wrappers check source/build,
  distribution fingerprint, account and target/protection attestations.
- Accurate CI qualification output. Portable success with live jobs skipped
  is BLOCKED for release. Inherited commands and their order remain intact and
  require complete fresh same-source V23 evidence before running.
- Compatible `source-map-js` lock patch from 1.2.1 to 1.2.2; initial npm audit
  changed from one high-severity advisory to zero.
- Native authoring fixtures and real UI import/reload/edit/recovery tests for
  cheatsheet, source-faithful Norsk CSV and ArticleSource. SQL/source inventory
  and plugin contract checks are documented with the authoring delivery.
- QCM lifecycle regression for existing safe question removal, attempted and
  referenced-question guards, immutable history, reload and complete backup.
- Owner-approved QA infrastructure repair: protected harmless placeholder,
  dedicated exact-email owner policy, dedicated expiring Service Auth.
- Native quota qualification now derives passive debugger locations from the
  bundle's semantic AST instead of minified aliases. Emergency recovery JSON
  is read as UTF-8. Both harness repairs preserve the storage assertions.

The app architecture/storage model and compiled content are preserved. No
speculative app rewrite or new remote draft inbox was needed. No confirmed PDF
or QCM implementation defect was established by the initial diagnostics.

## Evidence handling and qualification

Tests against the initial dirty integrated build are diagnostics. Fresh exact
candidate results are generated after source freeze under ignored
`docs/evidence/mission/` and `docs/evidence/v23/release/`. Their embedded commit,
fingerprint and build identity are authoritative; this source document avoids
self-referential commit identities. The final local handback is
`docs/evidence/mission/FINAL_STATUS.md`. Failed diagnostic runs are retained.

The frozen initial candidate passed 11 of 13 V23 gates, including capacity and
live protected-preview authentication. Native quota observation failed before
pressure because minified aliases had changed; safe-close failed while decoding
downloaded Unicode recovery JSON on Windows. That full report is retained at
`docs/evidence/mission/v23-4722-failed/`. A repaired ignored-harness native
diagnostic reached real filesystem exhaustion with exact five-store rollback;
it remains diagnostic evidence pending fresh candidate qualification.

The repaired frozen candidate completed all 13 same-source V23 gates. Its full
inherited run then stopped at `test:reader:ui`: 17/18 compatibility DOM checks
passed, but the fallback iframe in Focus started 45.140625px below the viewport
because its visible reason paragraph remained in flex flow. The failure is
retained at `docs/evidence/v23/inherited/13.log`; it is not a stale selector or a
reason to weaken the existing full-viewport assertions. The Focus-only fallback
alert overlay repair preserves the alert and required a new clean source,
build, protected preview and full same-source qualification, later completed
at the canonical b79e36b snapshot above. Temporary CSS
causal diagnostics are not source qualification. Integrated PDF input and actual
QA software-input observations retain their own scopes; physical mouse/trackpad
acceptance remains separate.

A read-only audit of the remaining inherited scripts also reproduced a Windows
ANSI decoder failure on the actual UTF-8 `dist/content.json`. JSON fixture,
metadata and download readers now explicitly use UTF-8; their assertions and
the inherited command list remain unchanged. The intermediate `8f782d0` full
attempt was stopped before completion and retained as incomplete evidence at
`docs/evidence/mission/v23-8f782d0-incomplete`. Its protected navigation core
passed 18 checks, but neither result qualifies the next source candidate.

Independent authoring/QCM/PDF suites may run as targeted diagnostics. The full
inherited workflow must start only after all 13 same-source V23 gates pass.
Local Chromium input is synthetic, not hardware validation. Compatibility-entry
IndexedDB tests remain distinct from integrated PDF/application proof.

The UTF-8 candidate completed all 13 V23 gates; its evidence is retained at
`docs/evidence/mission/v23-cb861cf-green/`. Its stock inherited workflow passed
commands 1–13 and failed command 14. A same-source diagnostic continuation
finished the unchanged remaining commands and retained 49 PASS / 5 FAIL, without
claiming release success, at `inherited-cb861cf-continuation/`. The failures were
obsolete pre-baseline test contracts: a 44px desktop rail versus the documented
30px rail (mobile remains 36px), two versus three authored Norsk projects, old
theme buttons replaced by the six-option Interface theme selector, and a fixed
1600px Continuous wheel distance that left 3px of page 1 visible. Theme failures
also prevented an optional demo prerequisite from being created.

The repaired tests retain the historical behavior checks and add exact rail
control containment, an independent authored-project oracle, unchanged A/B and
canonical content checks, all six themes with real reload, explicit per-case
demo setup, and measured native forward/reverse PDF displacement with exact
page 2 then page 1. No timeout extension, scroll-position setter, app navigation
change or compaction assertion change was used. Ignored repair diagnostics and
all original failures are retained. This test-only repair required a new clean
build, protected preview, complete same-source V23, then stock inherited run;
that qualification was subsequently completed at canonical b79e36b.

## Live observations

The next frozen candidate `23e14ef` completed all 13 V23 gates. Its inherited
workflow passed commands 1–33, failed command 34 (`test:pdf`) at rotation, and
left commands 35–54 not run. The original report remains at
`docs/evidence/mission/inherited-23e14ef-failed/`. The test read a canvas after
a fixed 500ms delay while rotation remounted the actual React-PDF page. An
unmodified isolated rerun passed all 17 cases; an ignored repaired harness
passed all 17 cases in three fresh runs. It waits for the current document,
engine, geometry, render-success marker and visible canvas dimensions, while
retaining the original aspect-ratio assertion and existing 20-second deadline.
It also verifies the same physical page and changed rotation geometry. No app
rotation or navigation implementation changed. Those diagnostics did not qualify
the next source; a fresh build, protected preview and complete canonical run
were subsequently completed, as recorded above.

Measured comparable inherited command durations plus the CI job's additional
full V23 run total 36m44.605s, exceeding its old 30-minute job budget before
runner setup. The job now has a bounded 60-minute budget, preserving every
command and all individual test deadlines. This measurement combines retained
diagnostic durations to size the budget; it is not a release pass or a prediction
of exact GitHub runtime. Remote exact-source qualification was subsequently completed at canonical
b79e36b: actual inherited job duration 30m37s, all 54 commands PASS. Every later
commit still needs fresh exact-source evidence.

Production Worker version `161c6acc-8418-4af4-a82c-27057b20f7f5`, deployment
`4703ec87-418a-4cfa-bb97-92a617558ff8`, is annotated with source `9034025`.
Anonymous root, identity, static and deep-link probes redirect to Access without
AtlasNote bytes. These are fresh read-only observations, not qualification of
the modified candidate or authenticated production served-build proof.
Historical prior version: `dcb5be64-f8d3-4369-a15d-6f16826e9cfa`. A future release
must freshly identify its immediate pre-deployment rollback version; this record
is not an instruction to roll production back.

QA repair details and authorization are in [the Access proposal](QA_ACCESS_PROPOSAL.md).
Its stable URL remains a harmless placeholder; candidate uploads use protected
immutable version previews. Browser login and machine Service Auth have separate
proof requirements. Candidate URL/version and live gate results belong to the
generated final evidence.

## Owner decisions and boundaries

Physical Windows mouse/trackpad checks and editorial/source decisions are listed
in [owner checks](OWNER_INPUT_CHECKS.md). The seed still requires separate owner
publication review. Production authorization alone does not approve that pack.
No production deployment, production security change, resource deletion, DNS
change or publication of private libraries occurred.

Current seed: 64 Notebook pages, six QCM sets, 45 questions and 41 terms. Total
built source: 161 pages across eight packs; Norsk CSV contributes 41 pages.
Issue #2 remains open pending complete acceptance disposition; its historical
Netlify references are superseded by the current Cloudflare boundary.

Final production preparation requires a clean exact build, protected QA,
complete same-source V23 then inherited evidence, owner login/hardware checks,
content-publication decisions, a reviewed rollback target, and separate explicit
owner authorization naming the exact candidate and distribution fingerprint.
