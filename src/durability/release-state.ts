/** Deliberate fail-closed release boundary, not a runtime feature flag.
 * A candidate atomic five-store writer exists for qualification, but the Settings
 * control and WorkspaceStore entrypoint remain hard-disabled until the complete
 * real-browser concurrency/quota/abort matrix passes. Enabling release still
 * requires a reviewed source change, never a URL, environment variable or receipt.
 */
export const COMPACTION_BLOCKED = true;
export const COMPACTION_BLOCK_REASON = 'Compaction is disabled in this candidate: real-browser concurrency, quota and transaction-abort verification has not passed. Archives and attachments are read-only; no history or assets will be deleted.';
