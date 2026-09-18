# AtlasNote V2.2.0 delivery report

Date: 2026-09-18. Verdict: **NOT READY FOR COORDINATOR INTEGRATION**.

## Delivery identity and scope

This is an implementation candidate extending the uploaded V2.1.0 source, not a rewritten app or a verified production release. The authoritative V2.2 master prompt, Universal Agent Interface and PDF Atlas contract are retained under `docs/v22/`. No GitHub write, main merge or deployment occurred. There is no final Git SHA: the input had no Git metadata. The package baseline and the two required V2.1 QA files were verified; the handoff's upstream SHA is provenance rather than independently established ancestry.

Original source archive SHA-256: `02e6d1d34ee2d372f102ab4f810f8b19255b9194cd94962054ffa7e41916da49`. The changed-file inventory contains before/after hashes. The outer delivery manifest identifies the final packaged files.

## Implemented

| Area | Delivered source behavior | Verification boundary |
| --- | --- | --- |
| Persistence/history | Same `knowledge-atlas` database, v2-to-v3 upgrade, added indexed history store, batched resumable baselines, immutable revisions/heads, atomic projection/history writes, optimistic-concurrency checks. | Core and serializer tests pass; actual browser migration/transactions remain unverified. |
| Resource scopes | Notebook pages and project/manual-reference trees, Articles, structured Cheatsheets, QCM and PDF logical metadata/asset references share one revision engine. | Six-resource unit coverage; mutation-boundary audit included. |
| Reader and Compare | Pinned `historyRevisionId`, read-only historical readers, rail and tree actions, revision panel, restore-as-new, semantic Changes/Side-by-side/A-only/B-only over existing panes. | Core target/diff/navigation checks pass; visual/keyboard/PDF runtime QA blocked. |
| Agent interface | Bounded capability/context/query facade, 25 typed operation kinds, pure preview, staging, selected acceptance, stale rejection and audit. Existing semantic review retained. | 23 executable example plans cover all operation kinds in an explicit unit backend. |
| PDF Atlas | Independently verified vendored source manifest, full commit pin, byte-field/provenance drift gate, separate logical/history/source/PDF identities, preserved reference-only rights. | Provenance gate passes. Public PDF files remain external; normal-origin native PDF rendering not verified. |
| Backup/recovery | Schemas 2/3 accepted; schema 4 adds full history/index/shards and historical local assets. Pre-commit integrity/coherence checks; detached emergency export recovers unsaved content without claiming a durable save. | Round trips, legacy migration and corrupt-history failures tested. Four synthetic backup fixtures supplied. Fresh browser restoration blocked. |
| Operability/docs | Stable agent module entry, accessible History/Review identities, updated entrypoint documentation, mutation audit, machine-readable capabilities, retained old gates plus new ones. | Core TypeScript passes. Integrated bundling and runtime entry still need normal-environment verification. |

The five subjects, five content types, five independent workspaces, structured SVG cheatsheets and personal-state separation are retained. There is no provider SDK, credential storage, backend, hidden network synchronization or automatic remote fetch.

## Actual result

The final core run passed **797/797 unit tests**: 715 existing plus 82 new, zero skipped. All 53 baseline test files checked by hash are unchanged. Original 46 release commands remain in order, with 4 additions; the original default timeout is unchanged. Dependency lock entries are unchanged apart from root package version metadata.

The actual complete release attempt is **not green**: 4 PASS, 36 FAIL, 10 BLOCKED. The failed `npm ci` (registry DNS `EAI_AGAIN`) left the integrated dependency graph unavailable; many subsequent failures are dependent failures. Raw command status is retained rather than reclassified into a passing skip. Final source corrections and supplemental checks were performed afterward.

Final supplemental checks: core typecheck, offline release check, isolated online syntax, content, interview/cheatsheet generators, PDF provenance, executable examples, runtime Python syntax and local compatibility HTTP headers pass. Local installed-dependency inventory fails (vendor byte integrity itself passes); integrated typecheck/build fail because required packages are unavailable. Normal-origin Chromium navigation is blocked by administrator policy. See `V22_TEST_EVIDENCE.md` for every command and scope.

## Artifact contents

- `AtlasNote_V2.2.0_source.zip`: complete modified source, tests, lockfile, docs and V2.2 evidence/examples. No `node_modules`, build cache, Git metadata or private user library.
- `AtlasNote_V2.2.0_compatibility_build_NOT_PRODUCTION.zip`: actual `dist-offline` output and an explicit build-status notice. It is **not** the integrated React-PDF deployment build and must not replace production.
- `AtlasNote_V2.2.0_reports_and_evidence.zip`: reports, changed-file inventory, complete attempted release logs, final supplemental logs, capability/ChangeSet examples and synthetic backup fixtures. No verified V2.2 screenshots exist.

A deployable integrated `dist/` ZIP could not be produced. This missing deliverable is not substituted silently by the compatibility ZIP.

## Remaining acceptance work and limitations

The coordinator must obtain the exact locked dependencies, run integrated typecheck/build/audit and all old/new release gates, and complete real-origin migration, persistence, restore, PDF and viewport/keyboard QA before accepting this candidate. This is a verification requirement, not a claim that the unrun checks would pass.

Historical Notebook structure opens as a read-only canonical structure view, with a semantic Changes view, not a second editable navigation tree. Historical full-text search and PDF pixel/OCR diff are not added. PDF changes use identity/hash/page count/metadata/outline and existing A/B readers; no automatic selectable-text extraction is required or performed.

History limits block writes rather than prune data. This pass provides export and explicit capacity disclosure, not a destructive retention/pruning tool. Export alone does not free capacity. Arbitrary new PDF bytes cannot be introduced by JSON alone; reviewed source or normal user file intake is required. Old external assets may be unavailable, and a missing historical asset is disclosed rather than replaced by current bytes.

Keep production V2.1.0 in place until the candidate meets the handoff's required acceptance gates. Test migration on a disposable profile and retain a verified full private-workspace backup before opening a real profile in this candidate.
