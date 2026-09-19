# V2.3 final-finish scope and reproducible qualification

Status: **BLOCKED** until all required gates pass on the exact final SHA.

## Authoritative lineage and preserved implementation

Start: `final/atlasnote-2.3-consolidated`, commit
`84b8ba2addbfe3cb2527dc4a57039416ceabbb52`, tree
`19eadf07aa7485d5d07cb8bfabb22e02539940be`.
Final-finish branch: `final/atlasnote-2.3-pro-finish`.
No main/older-branch merge, production deploy or tag is part of this pass.

This is not the earlier disabled-compactor candidate. The consolidated native atomic
compactor and recovery fixes remain intact. Final-finish changes are qualification
code and documentation, not a replacement writer, migration, UI redesign or schema
change. The database remains version 3 with the same five stores. Dependency pins,
released V2.2 readers and PDFAtlas provenance remain unchanged.

`tools/v23-release-contract.mjs` and the inherited `.github/workflows/ci.yml` are not
weakened or replaced. All 13 V2.3 commands must exit zero. Missing assertions,
transport errors, exit 2, timed-out commands and BLOCKED subcases are not passes.
The additional non-production workflow saves source/build diagnostics even when
qualification fails; those artifacts are NOT production release approvals.

## Executable evidence

The native compaction suite covers the positive all-or-nothing commit/reload and
all 13 required stale/history/personal/import/asset/concurrency/abort/request/quota
faults. It reopens all five stores and compares normalized keys, values and raw bytes.
The writer implementation is unchanged from the consolidated baseline.

Capacity qualification now requires real browser transactions at 2,000 revisions per
resource, 25,000 total revisions, 500 reviews and exactly 64 MiB structured history.
Each case proves a blocked next write without persistent mutation; prepares and saves
an archive; re-selects the actual saved file; confirms and commits; reloads; accepts
an already-staged proposal and creates/accepts a fresh reviewed edit; reattaches the
archive, reads an old version and passes integrity. Pure planning tests remain but
cannot by themselves make the gate pass. Thin indexes still consume real capacity;
this does not promise unlimited archived history or physical-disk reclamation.

Version comparison uses actual archived notebook/PDF entries, current/archived and
archived/archived pairs, explicit restore-as-new confirmation, increasing head numbers
and unchanged prior records. Recovery restores a complete archive-bearing bundle in a
fresh browser profile. A visible physical historical PDF page, original-byte download
hash/length, reload/missing-file refusal, exact reattachment and tamper rejection are
mandatory. Hidden thumbnails and current-document substitution are not accepted.

Runtime qualification includes populated v3, legacy-v2, partial-baseline, blocked old
tab and interrupted upgrade cases; injected storage-estimate/persistence outcomes in
the real Settings UI; actual corrupt stored fixtures; late transaction quota failure
following an optimistic estimate; retry; and repeated committed archive lineage.
Advisory API injection is labeled explicitly: it is not evidence of hardware failure,
actual OS quota exhaustion or browser eviction guarantees.

Safe-close tests hold and abort actual native transactions. They require the browser's
real beforeunload dialog, a persistent unsaved indication, an independently verified
emergency export, recovery of unsaved content in another profile and explicit saving
retry. HTTP lock refusal is not proof of HTTPS authenticated logout safety.

## Remaining provider boundary

The complete 20-case provider contract is still required. Exact-candidate anonymous
route/method/origin probes cannot certify valid-key authentication, browser-enforced
HttpOnly/Secure/SameSite, expiry, duplicate cookies, verifier rotation, authenticated
cache isolation, logout with identical IndexedDB bytes or actual provider throttling.
Recognizing three Edge Functions also cannot certify those behaviors.

Only an explicitly identified non-production preview may be probed. Resolve its SHA
and immutable deployment before attributing HTTP observations. No default to an old
PR or production is permitted. A missing preview, configuration or transport remains
BLOCKED. Temporary credential handling must not expose a verifier (also signing
material), alter production configuration or imply cleanup without evidence.

No Netlify runtime environment variable or access credential was created/read/changed
in this pass. No production key was requested. A disposable draft PR creates the
preview automatically; closing that PR is not evidence that immutable deployments
were deleted. The delivery's cleanup record states precisely what was done.

## Reproduction

Use the exact delivered Git commit, not a manually re-uploaded tree with another SHA.
The source ZIP is the full tree for inspection; the branch/commit preserves ancestry.

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run build:offline
npm run typecheck:online
npm run build
npm run check:v23:build
npm run test:v23:release
npm run test:release
```

Provider qualification requires a separately controlled disposable environment.
Without that prerequisite, local data-safety results may pass while the aggregate
correctly returns BLOCKED. Do not suppress that exit or weaken the required matrix.

## Artifact provenance

Every current build must identify HEAD, the exact tracked-source fingerprint, a clean
checkout, integrated build kind, database 3 and the immutable PDFAtlas commit. Never
rewrite an inherited build identity. The delivery records source/dist/evidence ZIP
SHA-256 values, GitHub run/artifact IDs, candidate SHA/tree and preview identity.
Prior run evidence is labeled by its own SHA and never substituted for the final run.
Historical `SOURCE_MANIFEST.json`, older reports and docs under history are not current
release approval. The final external candidate/report/checksum records are authoritative.
