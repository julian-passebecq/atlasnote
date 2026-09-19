/** Qualification-only release boundary.
 * This branch temporarily exposes the candidate atomic five-store writer so the
 * mandatory real-browser fault matrix can exercise the exact production path.
 * This is NOT a production release switch and must remain isolated from main.
 * If any mandatory proof fails or remains blocked, the shipping candidate must
 * restore COMPACTION_BLOCKED=true.
 */
export const COMPACTION_BLOCKED = false;
export const COMPACTION_BLOCK_REASON = 'Compaction qualification is active on this non-production candidate. Exact saved-file re-selection and explicit confirmation are required before any deletion.';
