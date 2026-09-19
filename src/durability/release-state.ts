/** Deliberate fail-closed release boundary, not a runtime feature flag.
 * The current sandbox cannot execute the real IndexedDB fault matrix. No
 * destructive transaction implementation is included in the shipped module.
 * Completing external QA requires a reviewed source change, not a URL/env toggle.
 */
export const COMPACTION_BLOCKED = true;
export const COMPACTION_BLOCK_REASON = 'Compaction is disabled in this candidate: real-browser concurrency, quota and transaction-abort verification has not passed. Archives and attachments are read-only; no history or assets will be deleted.';
