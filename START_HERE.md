# AtlasNote V2.2 completion coding pass - START HERE

**Status: CODE UPDATED / QA DEFERRED TO CODEX LIGHT / NOT RELEASE-CERTIFIED.**

This complete project continues the source from
`AtlasNote_V2.2_COMPLETE_HANDOFF_2026-09-18.zip`, whose recorded V2.2 base is
`60db2cb7504503ac416ddad940441e24f82266b1`. It is not a restart from V2.1 or from the
older incomplete V2.2 source ZIP. The package version remains `2.2.0`; this is a
new uncommitted candidate, not a claimed V2.2.1 release.

The user explicitly requested coding rather than test/build/browser execution.
No dependency install, typecheck, unit test, browser QA, build, release gate,
GitHub write, merge or deployment was performed for these changes. Prior green
results belong to the input source, never to this candidate.

## Read in this order

1. `V22_COMPLETION_REPORT.md`: code changes, scope and boundaries.
2. `CODEX_LIGHT_QA_HANDOFF.md`: exact commands and outstanding acceptance cases.
3. `V22_TEST_EVIDENCE.md`: current non-execution status versus historical results.
4. `docs/v22/BROWSER_AGENT_SEMANTICS.md`: stable controls and public service rules.
5. `V22_ARCHITECTURE.md`, `V22_MIGRATION_AND_BACKUP.md`,
   `V22_AI_CHANGESET_SPEC.md`, and the original contracts in `docs/v22/`.
6. `V22_COMPLETION_CHANGED_FILES.json`: before/after file hashes;
   `SOURCE_MANIFEST.json`: delivered-source identity.

For a low-token next agent, paste `CODEX_LIGHT_PROMPT.txt` and give it this source
ZIP. Do not ask it to recreate V2.2. The full original 50-command release runner is
retained, with additional regression specifications included by `npm test`.

## Safety and delivery boundary

Do not merge main, deploy, reset a real browser database, publish private PDFs or
apply a backup automatically. First prove migration/restore with disposable
profiles and keep the user's existing full backup. V2.1 production identity in the
input handoff is `b50c27a987fa65eee1c51d36225908621e322da7`; no live repository or
production state was queried in this coding pass.

No compiled distribution is included in this new source delivery: rebuilding
would violate the requested coding-only scope. Do not reuse an older `dist/`
archive as the build of these source changes. Codex Light must build the integrated
React/React-PDF application, not substitute `dist-offline`.

Earlier entrypoints and the new input handoff context are retained under
`docs/history/v22-before-completion/` and
`docs/history/v22-input-complete-handoff/`. They do not override this status.

## Retained original instructions

`docs/history/v22-original-final-memory/` preserves the earlier scope and agent/PDF
contracts. `docs/history/v22-input-complete-handoff/` preserves the later input
status. These are historical context, not current execution evidence.
