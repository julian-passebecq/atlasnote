/** Qualification-branch boundary.
 * This branch temporarily exposes the reviewed compaction implementation so the
 * real normal-origin IndexedDB fault matrix can exercise the exact production path.
 * It is not main/production and must be set back to true if mandatory proof remains
 * blocked. No URL, environment variable, console hook or test-only runtime bypass exists.
 */
export const COMPACTION_BLOCKED = false;
export const COMPACTION_BLOCK_REASON = COMPACTION_BLOCKED
 ? 'Compaction is disabled in this candidate: real-browser concurrency, quota and transaction-abort verification has not passed. Archives and attachments are read-only; no history or assets will be deleted.'
 : 'Compaction qualification is active on this non-production candidate. Exact saved-file re-selection and explicit confirmation are required before any deletion.';
