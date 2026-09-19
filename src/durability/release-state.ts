/** Deliberate fail-closed release boundary, not a runtime feature flag.
 * A candidate atomic five-store writer exists for qualification, but the Settings
 * control and WorkspaceStore entrypoint remain hard-disabled until the complete
 * real-browser concurrency/quota/abort matrix passes. Enabling release still
 * requires a reviewed source change, never a URL, environment variable or receipt.
 */
export const COMPACTION_BLOCKED = false;
export const COMPACTION_BLOCK_REASON = 'QA-ONLY candidate: compaction is enabled solely for disposable real-browser atomicity qualification. Do not deploy this branch as production.';
