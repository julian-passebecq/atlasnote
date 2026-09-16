# AtlasNote 1.2.7 - content libraries, Dashboard and QCM

This is the implemented application source. Do not restart it or replay an older 1.2.7 handoff.

| Identity | Value |
|---|---|
| Authoritative scope | `AtlasNote_1.2.7_Pro_Handoff_v2_SOURCE_OF_TRUTH` only |
| Exact starting commit | `f9345c11d98f13d33032666d5148a55a27805742` |
| Verified starting Git tree | `201e3b9c5034b5e275850337aa7dfb437aa599bb` |
| Local implementation branch | `feature/atlasnote-1.2.7-content-dashboard-qcm` |
| Final local commit | Read the delivery manifest or run `git rev-parse HEAD` in the preserved working tree. A ZIP has no Git history. |
| Remote changes | None: no push, pull request, merge or deployment |
| Release status | Implementation delivered; production certification remains gated by `FINAL_TEST_STATUS.md` |

## Start here

1. Read `FINAL_TEST_STATUS.md` for measured results and environment blockers.
2. Read `REQUIREMENTS_COVERAGE.md` for every v2 acceptance area and its evidence.
3. Read `docs/1.2.7/ARCHITECTURE.md` for storage, identity, routing and security boundaries.
4. Read `docs/1.2.7/USER_GUIDE.md` to test the features, and `CODEX_HANDOFF.md` for integration.

The five subjects are **IT / Cloud / Job / KPI / Norsk**. The five independent content selectors are **Notebook / PDF / Cheatsheet / Article / QCM**. Workspaces 1-5 are now at the bottom right. A new empty workspace opens Dashboard; opening Dashboard or a manager never replaces the underlying reading tabs.

The Notebook is curated: PDFs, cheatsheets, Articles and QCM remain in their own libraries until explicitly referenced in Notebook. Existing source IDs, bytes, placements and metadata are preserved. A legacy specialized resource without a shared folder appears under its subject's **Unfiled** bucket; a resource with no subject remains **Unclassified**.

Do not use `dist-offline` as a hosted replacement for the production bundle. Its browser-PDF fallback and in-memory test harness are deliberately distinct from React-PDF, durable IndexedDB and normal-origin tests.
