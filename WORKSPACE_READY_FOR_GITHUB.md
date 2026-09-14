# AtlasNote 1.2.3 source handoff

The complete modified source is this repository tree and the delivered source ZIP. Start at `START_HERE.md`, then read `CODEX_HANDOFF.md` and `FINAL_TEST_STATUS.md`.

Based on upstream `main` commit `476f327ae77eb9103f2e5d079b87b6a541ddc782`, verified tree `2d07e499cab9236f5a098e2d08513f98f3e1b4f3`. It contains the simplified UI/PDF tree pass plus lightweight single/all-workspace saved states, undo and mini history. No remote branch, merge or deployment was performed in this completion pass.

The complete patch is `handoff/changes.patch` in the packaged delivery. Use a clean branch/worktree and check before applying. Do not restart from an older release branch, reset main, delete .git, or reapply unrelated local changes. Generated build/test assets and node_modules are not source and are not packaged.

The source builds the integrated distribution, but normal-origin/IndexedDB release acceptance is not certified in this browser-policy-restricted runtime. Codex/local CI must run those gates before promotion. See the current results; historical documents archived under docs/history are not current instructions.
