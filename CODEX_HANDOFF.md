**Superseded entrypoint:** Use `CODEX_LIGHT_PROMPT.txt` and `CODEX_LIGHT_QA_HANDOFF.md` for the current completion source. The content below is historical.

# Codex audit and integration handoff - stabilized V2

Continue this source; do not restart implementation. Read START_HERE.md and FINAL_TEST_STATUS.md first. The only allowed integration branch in this pass is `v2manualupload`. Do not merge PR #13 or deploy production.

The remaining job is verification on a normal developer/browser environment, not another broad feature pass. Use the existing lockfile, install Python test requirements, install Playwright Chromium, and run `npm run test:release`. Preserve logs/screenshots for every failed or blocked gate.

Pay particular attention to actual-origin theme reload, durable demo/source edits, capture cancellation, normal-entry PDF rendering, all five workspaces, save/restore, and a full backup restored into a fresh profile. Do not replace these tests with in-memory mounts.

The inherited PDF grid failure was a test that toggled a newly opened Spread into Single. The corrected test selects Spread explicitly, checks its precondition, and retains exact all-workspace equality after swap/restore. Keep these assertions; do not reintroduce the blind toggle or delete the gate.

A lightweight test/audit agent should report concrete failing stages, expected versus actual state, browser errors, and minimal reproduction steps. Avoid speculative architecture changes. Never upload personal library content, use GitHub as private app storage, or publish a diagnostic build as production.

The external delivery manifest provides exact source ZIP/commit identity. The packaged local history was reconstructed; integrate the source in the existing upstream clone rather than force-pushing it.
