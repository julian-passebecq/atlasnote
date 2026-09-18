# AtlasNote V2.2 - verified QA candidate

The QA head `215b60ff792a59e736b2b059a4e3fc60f1092d54` on `newversion2.2vfmanual` records **50/50 release gates, 813 unit tests and 15/15 expanded normal-origin browser scenarios passing**. See [V22_QA_REPORT.md](V22_QA_REPORT.md) for repairs, retained failures and coverage limits. The user-approved canonical single-ID Article/QCM invariant remains; independent wrapper/document IDs are outside V2.2. Nothing was merged or deployed.

QA repaired typed tree-menu handling, exact PDF Atlas manifest bytes, destination focus and PDF loading lifecycle; retained canonical Article/QCM identity and added completion coverage. Finalization removes the duplicate other-pane action and permanently adds both runtime suites to CI and the release runner.

[Earlier changelog and pre-QA status](docs/history/v22-before-finalization-20260919/CHANGELOG.md).
