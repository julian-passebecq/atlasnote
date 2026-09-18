# Executed V2.2 QA handoff

The QA head `215b60ff792a59e736b2b059a4e3fc60f1092d54` on `newversion2.2vfmanual` records **50/50 release gates, 813 unit tests and 15/15 expanded normal-origin browser scenarios passing**. See [V22_QA_REPORT.md](V22_QA_REPORT.md) for repairs, retained failures and coverage limits. The user-approved canonical single-ID Article/QCM invariant remains; independent wrapper/document IDs are outside V2.2. Nothing was merged or deployed.

The release runner now retains the original 50 gates and adds completion runtime and PDF lifecycle runtime (52 total). This finalization runs only the seven targeted checks; it does not rerun the historical matrix.

The superseded report is preserved in [docs/history](docs/history/v22-before-finalization-20260919/CODEX_LIGHT_QA_HANDOFF.md). The finalization manifest is [FINAL_QA_MANIFEST.json](docs/evidence/v22/FINAL_QA_MANIFEST.json).
