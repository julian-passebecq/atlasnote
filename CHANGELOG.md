# AtlasNote V3 - release candidate (unreleased)

Branch `feat/atlasnote-v3-experiences-performance`. This is a source-ready candidate: it has not been merged into `main` or deployed. See [docs/v3/V3_RELEASE_CANDIDATE.md](docs/v3/V3_RELEASE_CANDIDATE.md) for the summary, a manual check and the owner's release checklist, and [docs/v3/V3_IMPLEMENTATION_STATUS.md](docs/v3/V3_IMPLEMENTATION_STATUS.md) for the commits, measurements and the acceptance-case register.

- **PDF reading**
  - Restoration is guarded by generation, so a late render can never pull the reader back to an old position.
  - A compact page control stays available when the toolbar is hidden, and page input is strictly validated.
  - Printed page labels are shown beside physical page numbers.
  - Long PDFs render in a Continuous window of nearby pages.
  - The study tree highlights the current page and uses the verified page count.
  - A privacy-safe navigation trace can be downloaded from Document info.
- **Workspace Experiences:** a per-slot profile of subjects, types and PDFs, edited in one right-side panel. Hidden content is still stored, backed up and linkable.
- **Norsk Daily**
  - Reviewed feed import and a daily New/Learning/Known queue.
  - Vocabulary review, with an "Add to Concept Index" proposal through the new reviewed `concept.create` operation (Agent contract 25 → 26).
- **Content:** the `atlas.v3-seed` pack. All 64 pages are linked, with 41 glossary terms and 6 native quizzes. **Owner review is required before publication.**
- **Performance**
  - Staged boot, and history reconciliation that only processes changed resources.
  - Coalesced reading checkpoints and a compute-once search index.
  - Quadratic catalogue lookups removed.
  - A shared, verified cache for public PDFs, and no retained copy of PDF bytes.
  - Browser budgets met at 1,500 resources.
- **Safety**
  - Cross-tab 3-way merge with live sync and a reload notice.
  - Fail-closed writes when the saved workspace is unreadable.
  - Backup completeness is independent of Experiences.
  - The V2.3 durability core, the 13 compaction rollback cases and the backups are unchanged. The portable release core passes.
- **Database:** `knowledge-atlas` stays at version 3 with the same five stores. No migration is needed.

# AtlasNote V2.2 - verified QA candidate

The QA head `215b60ff792a59e736b2b059a4e3fc60f1092d54` on `newversion2.2vfmanual` records **50/50 release gates, 813 unit tests and 15/15 expanded normal-origin browser scenarios passing**. See [V22_QA_REPORT.md](V22_QA_REPORT.md) for repairs, retained failures and coverage limits. The user-approved canonical single-ID Article/QCM invariant remains; independent wrapper/document IDs are outside V2.2. Nothing was merged or deployed.

QA repaired typed tree-menu handling, exact PDF Atlas manifest bytes, destination focus and PDF loading lifecycle; retained canonical Article/QCM identity and added completion coverage. Finalization removes the duplicate other-pane action and permanently adds both runtime suites to CI and the release runner.

[Earlier changelog and pre-QA status](docs/history/v22-before-finalization-20260919/CHANGELOG.md).
