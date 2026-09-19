# Finalization scope and reproducible qualification

Status: **BLOCKED**, safe read-only archive fallback only.

## Running the candidate

Use a real Git checkout containing the candidate commit. Restore it with the delivered
bundle into a clone which already contains the exact base commit, or apply the delivered
patch on that base. A copy of files alone is not an exact Git commit identity.
Run the unchanged pinned `npm ci` in a registry-enabled environment. Then:

```sh
npm run build:offline
npm run typecheck:online
npm run build
npm run test:release
npm run test:v23:release
```

CI runs the V2.3 aggregate immediately after the integrated release check, before
later inherited example generators rewrite synthetic fixture files. This preserves
the exact clean-build identity check without ignoring real source changes. All
inherited commands and their order relative to each other remain unchanged.

The final runner runs all commands in `tools/v23-release-contract.mjs` and stores raw
stdout/stderr plus exit codes under `docs/evidence/v23/release/`. `check:v23:build`
requires an integrated clean artifact for HEAD and its exact source hash/PDFAtlas pin.
The inherited integrated artifact used for diagnostics intentionally fails that check
because it is the baseline, not a newly built candidate. The delivery records its
GitHub Actions provenance; no new exact-candidate integrated ZIP is supplied.

Current smoke suites expose missing proof as explicit BLOCKED rows. They do **not**
become a completed destructive/provider test matrix merely by running on a new machine.
Replace each blocker with reviewed executable assertions and retained actual evidence;
never delete a required case merely to turn CI green.

## Matrix that remains unqualified

Compaction: all 13 `COMPACTION_FAULTS` entries, byte-equivalent reopened five-store
rollback, every current projection/head/staged-review/private-PDF byte, positive
all-or-nothing descriptor/delete success, exact read-only attachment and restore-as-new.
The guard suite only confirms destructive code is disabled, including six fake receipts.

Capacity: unchanged 2,000/resource, 25,000 total, 500 reviews and 64 MiB bounds. Existing
pure diagnostics test rejection and detached plans. All four require actual limit ->
prepare -> save -> native re-select -> compact -> reload -> integrity -> new revision ->
attach -> browse -> restore-as-new. No limit was raised or removed.

Browser: populated V2.2 migration; old-tab/blocked/interrupted upgrade; real storage API
outcomes; quota after successful estimate; stored-corruption read-only checks; complete
trusted chooser and stale-preview races; all Version History UI modes/types; archived
compare/missing-file no-substitution; repeated lineage; complete archived/private PDF
recovery into a fresh profile; pending/failing/retrying/emergency close; provider unlock
layout and four integrated application viewports. The new common helper only reads
five stores and uses public navigation/read APIs; it does not patch production storage.

Provider: all 20 `PROVIDER_CASES` entries, real HTTPS and cookie enforcement, exact
all-path denial, wrong-method/origin/key, provider rate enforcement/warnings, successful
303/secure cookie, reload/fresh profile, invalid/expired/duplicate cookie, rotation,
warm authenticated cache -> anonymous denial, logout IDB preservation and cleanup.
Read-only preview probes do not cover configured-session behavior. They default to the
inherited PR #18 preview and record that target, not a claim that it hosts this candidate.
No deployment write or environment secret operation is automated in CI.

## Safety boundaries

Do not change the shipping compaction guard without the full real-IDB proof. Do not
add client secrets or production test backdoors. Do not use static upload as a gated
deployment. Do not disable Chromium policy or count about:blank/MemoryBackend as actual
normal-origin qualification. Never rewrite a prior build identity to match HEAD.

The original DOM-only layout diagnostic is still available as
`npm run test:v23:layout:diagnostic`; it is not the required integrated layout gate.

## Evidence classification

- Downloaded inherited green evidence: prior GitHub run, not new-candidate proof.
- Current command outputs: actual runs, including failures, timeouts and blockers.
- Synthetic binary fixture inventory: exact public baseline bytes, not user data.
- Raw logs may include diagnostic runtime paths; they are retained only in evidence,
  inventoried by the scanner and must not be published as application content.
- `SOURCE_MANIFEST.json`, older release reports and archived initial reports are
  historical. The external `CANDIDATE.json`/checksums identify this delivery.
