# Current V2.2 QA changes

See [V22_QA_REPORT.md](V22_QA_REPORT.md) for the executed repair inventory and
`SOURCE_MANIFEST.json` for exact delivered hashes. The coding-only inventory
below describes the received candidate; it is preserved as historical context.
The QA pass also adds the completion browser and PDF lifecycle regression suites.

---

# V2.2 completion pass - changed files

Baseline recorded by the supplied complete handoff: `60db2cb7504503ac416ddad940441e24f82266b1`.

**Coding only. No application tests, typechecks, browser QA or builds were run.**

Exact before/after SHA-256 values are in `V22_COMPLETION_CHANGED_FILES.json`.
`SOURCE_MANIFEST.json` identifies every delivered payload file except itself.

## Runtime / configuration / authored tests

- `.gitattributes` - modified
- `package.json` - modified
- `src/agent/AgentReviewUI.tsx` - modified
- `src/agent/payload-schema.ts` - added
- `src/agent/registry.ts` - modified
- `src/agent/service.ts` - modified
- `src/agent/validation.ts` - modified
- `src/app/App.tsx` - modified
- `src/components/ReaderRail.tsx` - modified
- `src/components/ReadingActions.tsx` - modified
- `src/components/Tree.tsx` - modified
- `src/components/menu-navigation.ts` - added
- `src/core/reading-navigation.ts` - modified
- `src/core/reading-types.ts` - modified
- `src/history/HistoryMenuItems.tsx` - added
- `src/history/HistoryUI.tsx` - modified
- `src/history/StructureHistoryView.tsx` - added
- `src/history/adapters.ts` - modified
- `src/history/ui-context.ts` - added
- `src/references/targets.ts` - modified
- `src/styles/history.css` - modified
- `tests/browser_support.py` - modified
- `tests/completion-v22.test.mjs` - added
- `tests/v22_runtime.py` - modified
- `tests/workspace_122_runtime.py` - modified

## Reports, preserved requirements and current instructions

- `AGENTS.md` - modified
- `CHANGED_FILES.md` - modified
- `CHANGELOG.md` - modified
- `CODEX_HANDOFF.md` - modified
- `CODEX_LIGHT_PROMPT.txt` - added
- `CODEX_LIGHT_QA_HANDOFF.md` - added
- `FINAL_TEST_STATUS.md` - modified
- `README.md` - modified
- `REQUIREMENTS_COVERAGE.md` - modified
- `START_HERE.md` - modified
- `V22_AI_CHANGESET_SPEC.md` - modified
- `V22_ARCHITECTURE.md` - modified
- `V22_COMPLETION_REPORT.md` - added
- `V22_DELIVERY_REPORT.md` - modified
- `V22_EXECUTION_STATUS.json` - added
- `V22_TEST_EVIDENCE.md` - modified
- `WORKSPACE_READY_FOR_GITHUB.md` - modified
- `docs/ARCHITECTURE_INDEX.md` - modified
- `docs/history/v22-before-completion/FINAL_TEST_STATUS.md` - added
- `docs/history/v22-before-completion/README.md` - added
- `docs/history/v22-before-completion/START_HERE.md` - added
- `docs/history/v22-before-completion/V22_CHANGED_FILES.json` - added
- `docs/history/v22-before-completion/V22_CHANGED_FILES.md` - added
- `docs/history/v22-before-completion/V22_DELIVERY_REPORT.md` - added
- `docs/history/v22-before-completion/V22_TEST_EVIDENCE.md` - added
- `docs/history/v22-input-complete-handoff/00_START_HERE.md` - added
- `docs/history/v22-input-complete-handoff/01_CURRENT_STATUS.md` - added
- `docs/history/v22-input-complete-handoff/02_WORK_TO_FINISH.md` - added
- `docs/history/v22-input-complete-handoff/03_REPRODUCE_AND_DELIVER.md` - added
- `docs/history/v22-input-complete-handoff/04_NEXT_TASK_PROMPT.txt` - added
- `docs/history/v22-input-complete-handoff/AUDIT_REPORT.md` - added
- `docs/history/v22-input-complete-handoff/README.md` - added
- `docs/history/v22-input-complete-handoff/V22_COMPLETION_CHECKLIST.md` - added
- `docs/history/v22-input-complete-handoff/supplemental_checks_portable.py` - added
- `docs/history/v22-original-final-memory/00_READ_ME_FIRST.md` - added
- `docs/history/v22-original-final-memory/01_FINAL_V22_CONTRACT.md` - added
- `docs/history/v22-original-final-memory/02_IMPLEMENTED_STATUS_AND_GAPS.md` - added
- `docs/history/v22-original-final-memory/03_REQUIRED_FINAL_QA.md` - added
- `docs/history/v22-original-final-memory/04_NEXT_AI_PROMPT.txt` - added
- `docs/history/v22-original-final-memory/05_REPOSITORY_AND_ARTIFACT_IDENTITY.md` - added
- `docs/history/v22-original-final-memory/MANIFEST.txt` - added
- `docs/history/v22-original-final-memory/README_ARCHIVE.md` - added
- `docs/history/v22-original-final-memory/SHA256SUMS.txt` - added
- `docs/history/v22-original-final-memory/reference/END_STATE_ARCHIVE_AND_RECOVERY.md` - added
- `docs/history/v22-original-final-memory/reference/IMPLEMENTED_ARCHITECTURE.md` - added
- `docs/history/v22-original-final-memory/reference/IMPLEMENTED_CHANGESET_SPEC.md` - added
- `docs/history/v22-original-final-memory/reference/IMPLEMENTED_MIGRATION_AND_BACKUP.md` - added
- `docs/history/v22-original-final-memory/reference/IMPLEMENTED_MUTATION_BOUNDARY_AUDIT.md` - added
- `docs/history/v22-original-final-memory/reference/PDFATLAS_CONTRACT.md` - added
- `docs/history/v22-original-final-memory/reference/PRODUCTION_BASELINE.md` - added
- `docs/history/v22-original-final-memory/reference/PRO_MASTER_PROMPT.md` - added
- `docs/history/v22-original-final-memory/reference/RELEASE_GATES.md` - added
- `docs/history/v22-original-final-memory/reference/SUBSYSTEM_MATRIX.md` - added
- `docs/history/v22-original-final-memory/reference/UNIVERSAL_AGENT_INTERFACE.md` - added
- `docs/history/v22-original-final-memory/reference/VERSIONING_AGENT_ARCHITECTURE.md` - added
- `docs/v22/BROWSER_AGENT_SEMANTICS.md` - added

## Generated delivery inventories

- `SOURCE_MANIFEST.json`
- `V22_CHANGED_FILES.json`
- `V22_CHANGED_FILES.md`
- `V22_COMPLETION_CHANGED_FILES.json`

These four generated files are excluded from their own delta enumeration to avoid recursive hashes.
No removed gate or new dependency is intended; existing historical reports are retained with clear status labels.
