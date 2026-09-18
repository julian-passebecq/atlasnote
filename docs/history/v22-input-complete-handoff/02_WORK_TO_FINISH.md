# Ordered completion work and acceptance criteria

## 1. Start from the right source

- Work from included source/ or fetch the repository and use 60db2cb as the audited starting point. Inspect current remote/user changes before integrating anything newer.
- Use an isolated local branch/worktree such as codex/v22-completion. Do not overwrite the user's b5af6c8 checkout or blindly apply the included patch twice.
- Read source/AGENTS.md, START_HERE.md, V22_ARCHITECTURE.md, V22_MIGRATION_AND_BACKUP.md, V22_AI_CHANGESET_SPEC.md and docs/v22/PDFATLAS_CONTRACT.md before architectural edits.

## 2. Fix Windows portability

- Add deliberate Git attributes preserving reviewed manifest bytes and deterministic generated text. The vendored manifest's expected SHA-256 is dc1f76c02e4e3fa4e3ed1d8fb0679e46147680c882d9991f57d0b076d45a4a0d. Do not change that digest to accept CRLF bytes.
- Explicitly use UTF-8 for Node JSON subprocess output in tests/v22_runtime.py. Inspect shared test helpers for the same issue where non-ASCII data crosses that boundary.
- Prove a fresh ordinary Windows checkout under core.autocrlf=true works under supported Node without requiring an undocumented global Git or Python workaround.

## 3. Implement missing tree history actions

Source anchors: src/components/Tree.tsx, src/app/App.tsx (showHistory/previousVersion), src/history/adapters.ts, and the existing shared reading-actions path.

- Render Version history..., Compare with previous version, and Open previous version in other pane for appropriate versionable resources.
- Resolve canonical resource identity, including Notebook project/tree history; do not invent folder/page identities or use synthetic library grouping IDs as authored resources.
- Previous-version actions must be disabled or explicitly unavailable with fewer than two revisions. Hide inappropriate controls for non-versionable items.
- Tree.tsx showMenu delegates reference and non-Notebook library items to onReadingActions. Inspect that path too; do not fix only one menu while leaving relevant resource actions unreachable.
- Verify mouse right-click, ContextMenu, Shift+F10, arrow navigation, Enter activation, Escape and focus return. Disabled menu items must not break keyboard navigation.
- Verify previous opens a pinned historical target in the other pane, leaves current source unchanged, and Compare uses the same logical resource and defaults to Changes.

## 4. Stable browser semantics

- Add a small consistent set of resource key/type and critical action markers where they improve reliability. Keep meaningful accessible names, pane A/B, workspace 1-5, revision, operation and review identity.
- Prioritize tree targets, history Open/Compare/Restore/Copy, Agent Review Preview/Stage/Accept/Reject and comparison/destination controls.
- Do not mirror private database content into hidden DOM or replace public-service reads with brittle DOM scraping.

## 5. Durable acceptance coverage

- Incorporate the useful supplemental competing-tab and actual PDF rendering checks into maintained tests. Preserve old assertions.
- Test non-empty legacy imports/assets and local PDF bytes across v2-to-v3 migration; interruption/resume, reload and close/reopen must preserve current source and history coherence.
- Test actual IndexedDB atomic rejection/abort behavior and stale concurrent writes. Unit MemoryBackend failure injection alone is insufficient.
- Exercise Notebook page/tree, Article, Cheatsheet, QCM and PDF manual changes, reviewed changes, historical read-only controls, no-op saves, restore-as-new and selected/stale batch behavior.
- Verify current/old and old/old targets, exact identity, destination choices, pinned links, independent panes and personal-state separation. QCM attempts/reflections and workspace checkpoints must not be rewritten as content history.
- Assert both PDF canvases render; independent physical pages survive reload. Cover actual differing PDF byte revisions and old-asset retention, not only a changed title over the same bytes.
- Exercise backup schemas 2, 3 and 4 through fresh-context restoration, including historical local assets, review audit, semantic links and current-source/head consistency. Keep corruption rejection checks.
- Demonstrate the public agent facade for content edits across adapters, a tree move, exact reference proposal, reviewed bookmark/capture, navigation and stale rejection; no hidden database write shortcuts.
- Complete the required 1440x900, 1100x800, 800x900 and 390x844 surface/keyboard matrix. Retain screenshots and console/network/storage evidence.

## 6. Final release evidence and packaging

- Run npm ci and the full unchanged old+new release suite with committed Python/browser prerequisites after final changes. Add meaningful tests for the new behavior; never remove checks to get green.
- Keep prior failed/blocked logs, distinguish compatibility output from integrated production, and record exact source/build identity.
- Update stale V2.2 delivery/evidence documents to describe the final implementation and measured results.
- Produce final source ZIP, integrated build ZIP, release report and browser/test evidence with checksums.
- Do not claim READY FOR COORDINATOR INTEGRATION until all required gates and acceptance work pass. Clearly list any remaining failure or unverified requirement.

No GitHub writes, main merge, deployment, private-library publication, real-profile reset, or automatic backup restoration is authorized by this handoff. Those require an explicit user request under the project agreement.
