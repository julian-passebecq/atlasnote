# AtlasNote V2.3 finalization candidate - 19 September 2026

## Decision and identity

**BLOCKED. Safe archive generation/verification/read-only attachment remains available;
this is not a completed V2.3 durability/security release. Do not merge, tag, deploy
production or enable destructive compaction.**

Authoritative starting branch: `final/atlasnote-2.3-durability-access`.
Starting commit: `66f938796f06edfdf8764774bcb5e363f589fc07`.
Starting tree: `67e839f484de66355dc8ed160779cb655d35decc`.
Local finalization branch: `final/atlasnote-2.3-ready-qualification`.
The supplied current-branch source ZIP was reconstructed and its Git tree matched
exactly. The authentic base commit object was verified against GitHub metadata and
its SHA. The finalization branch starts from that exact commit, not main or the older ZIP,
and preserves the inherited history. Delivery-only corrections follow the qualification commit.
The final SHA/tree, source archive checksums and exact-commit results are recorded in
the external `CANDIDATE.json` / delivery manifest to avoid a self-referential commit.

No GitHub write, main merge, tag, Netlify deploy, production configuration or
credential generation was performed. The finalization branch exists locally only.

## Four evidence stages - do not conflate them

1. **Initial isolated V2.3 attempt:** historical dependency/browser failures and original
   limitations. The initial report and matrix are retained under `docs/v23/history/`.
   Their old source identity and environmental claims are not current release facts.
2. **Repaired inherited baseline at 66f9387:** the coordinator's green push run
   `35450871229` and PR run `35450873641` are preserved. Integrated dependency install,
   build and inherited V2.2 browser/PDF/history/Agent gates passed there. PR #18 deploy
   `6aaea568b15dfa0008f59d9b` reports three Edge Functions recognized. That is discovery,
   not proof of cookies, fail-closed coverage, cache isolation or rate enforcement.
3. **This local finalization:** stricter access-declaration/build-identity checks,
   mandatory V2.3 CI gating, repaired public-module browser tests, explicit unqualified
   matrices, no-secret anonymous preview probes and scoped secret/privacy scanning.
   The execution environment restarted once, losing pre-restart working files/logs;
   source changes were rebuilt and fresh runs retained. Earlier chat-only results are
   not used as current candidate evidence.
4. **Remaining blockers:** real IndexedDB destructive proof, capacity recovery,
   expanded normal-origin flows, live disposable Netlify qualification and a freshly
   built integrated artifact for the new candidate have not been established.

## What changed after 66f9387

- The inherited workflow is preserved in order, with a mandatory `test:v23:release`
  step before integrated artifact publication. A regression test pins all inherited
  run commands; no inherited assertion is weakened. A BLOCKED V2.3 result makes CI
  non-green and retains evidence rather than publishing a release artifact.
- The V2.3 runner executes all 13 required commands, records logs/exit codes/signals,
  and never promotes missing, duplicate, skipped, blocked or merely available tools
  to readiness. The production and disposable-provider requirements stay separate.
- Static auth declaration validation now rejects extra method/header/pattern predicates,
  additional exclusions, cache opt-in, fail-open error modes and unreviewed TOML
  routing/context overrides. The actual three Edge handlers and crypto are unchanged.
- A new identity gate rejects old-commit, dirty, wrong-source-hash, compatibility-only,
  wrong-database and wrong-PDFAtlas artifacts. Existing build identities are not edited.
- The old runtime test incorrectly imported the non-published mutable database module
  from the integrated build. It now uses the existing public Agent and read-only
  workspace snapshot entrypoints. No new production debug/mutation API was added.
- Normal-origin tests are provided for opt-in demo reload, two saved archives/native
  re-selection/wrong-file/altered-file rejection, old-A/current-B compare, fresh-profile
  live-demo recovery, four viewport/keyboard checks, and healthy-state HTTP lock refusal.
  Browser execution is blocked here. Additional required cases remain explicit BLOCKED
  rows; these test scripts are not represented as a fully qualified browser matrix.
- A guard test rejects fake/absent compaction receipts without database access or state
  change. All 13 destructive fault cases and four recovery boundaries stay BLOCKED.
  This guard is deliberately not claimed as transaction rollback proof.
- Anonymous preview probes accept only the AtlasNote disposable HTTPS host forms,
  never send secrets, never configure/deploy, and record transport failures as BLOCKED.
  Full configured-session, rotation, logout/cache and rate-limit proof remains absent.
- A final rule-based scan inventories source, present dist/source maps and evidence,
  checks known public binary fixtures by exact baseline SHA-256, and reports identifiers
  separately from actual secret values. Diagnostic paths in historical/raw logs are
  inventoried, not silently removed. Client-local paths and unapproved binary payloads
  fail. This is not a universal secret detector or a live-provider secret audit.

## Architecture/runtime preservation

There are **no changes to `src/`, `public/`, `netlify/`, `netlify.toml`, the lockfile,
PDFAtlas source/provenance, dependency pins or Vite configuration**. The same five
Subjects, content types and workspaces, A/B panes, canonical Article/QCM identities,
semantic Compare, reviewed Agent, immutable history, local-first ownership and
five-store version-3 database remain intact. V2.2 browser title compatibility remains.

The current `compactArchive()` still throws unconditionally. `COMPACTION_BLOCKED`
remains true, with no URL/environment/console/Agent bypass. No new transaction,
background pruning or history/asset deletion implementation ships in this candidate.
Current heads, private PDF bytes and pending proposals are not put at risk by an
unproven compactor. Archive plans remain detached read-only models.

## Qualification boundaries and actual environment

Local normal-origin Chromium reports `ERR_BLOCKED_BY_ADMINISTRATOR`. No security
policy was changed. No opaque-origin or MemoryBackend result substitutes for actual
five-store persistence/rollback, chooser qualification, migration, recovery or close.
Registry access from the execution runtime fails DNS; exact npm-ci/integrated build
cannot be reproduced here. The explicitly separate offline bootstrap/build is only
compatibility evidence. Original and current failed commands are preserved as failures.

Destructive release proof must cover stale epoch/history/preview, second-tab history,
concurrent personal/import/asset writes, abort during descriptor put, put failure,
revision/review/asset deletion failures and transaction quota failure. Reopen and
compare every key/value/raw byte in all five stores after each attempt. Success must
also restore an archived revision as a new current version, with exact attachment,
integrity validation and real recovered capacity at all four unchanged limits.

Netlify metadata confirms the inherited preview discovery, but the available deploy
write operation does not select a disposable context and was not used. No disposable
or production environment values were created, so none required cleanup. Anonymous
HTTP probes could not establish full live behavior. Missing proof never means a path
is secure, and this report makes no fail-closed runtime certification.

## Build and delivery truth

A verified **integrated BASELINE build**, artifact `10586761926` from push run
`35450871229`, was retrieved for testing and fingerprint verification. It remains a
baseline reference in GitHub Actions, not a freshly compiled build in this delivery. Its identity is commit `66f9387...`,
source hash `208725bc2c7cae5c77fa58beaa4e6c1ca254d3986d14602228fd4e1316598b8a`,
app 2.3.0 / database 3 / integrated. Its ZIP SHA-256 is
`000f30235a82eb3ccd22c7d81811c3e1e293c8027afe876148c3f293753d18ff`.
It is useful for the unchanged app runtime, **not a freshly compiled final-candidate
artifact**. The new build-identity gate correctly blocks its reuse as candidate proof.
The separate PR build artifact identifies GitHub's synthetic merge commit
`2d16861935cd0d9cf1aae0e4327c1930f414bacb` and is not substituted for the push build.

The delivery includes clean source, an exact-base Git handoff, integrated-build
provenance/reference, specs, current raw results, original downloaded green evidence,
checksums and a current external report. **A freshly compiled integrated build ZIP
for the final candidate could not be produced and is not supplied.** This missing
deliverable is an explicit blocker, not an offline/compatibility substitution. No node_modules, owner keys, .env,
private workspace/archive/library corpus or .git directory belongs in the clean source.
Do not drag-and-drop a static dist to Netlify: that bypasses deploying the Edge source.
Only a full-source reviewed provider build can include all three functions.

## Completion criteria before coordinator QA

This candidate deliberately blocks release until the real destructive/capacity matrix
(or an explicitly changed scope approved by the coordinator), complete browser flows,
fresh exact-candidate integrated build, disposable HTTPS access qualification, final
artifact scan and inherited plus V2.3 CI gates are genuinely green. See `QA_MATRIX.md`
and `FINALIZATION.md` for the exact unqualified cases and commands. No result is
inferred from a plan, disabled button, installed CLI or inherited success.

BLOCKED
