# Historical private bytes and conservative reachability

Archive generation derives required asset keys from every selected revision's
`assetRefs` and local PDF document assetKey/SHA/byte count. It reads original bytes,
checks hashes/media/safety, and rejects missing or corrupt dependencies. It does not
re-download a different PDF or infer a replacement from a current document.

The pure removal preview marks owners in current captured resources, retained live
revisions, imported and built pack inventories/documents, overlays and personal state.
It conservatively scans legacy keys and known SHA identities. An asset is removable
only when its exact byte-verified copy is in this archive and no live owner, retained
revision, imported owner, personal owner, same-SHA owner or prior archive ownership
requires retention. Unknown or unrelated orphan assets are retained, not garbage
collected. Assets referenced by both live and archived revisions remain local.

The optional corpus has a historical-only synthetic image, a shared image, and two
original synthetic PDFs with different hashes. The first archive pure preview identifies
the historic image and old PDF as exclusive; the current PDF and shared image remain.
Exact byte counts and hashes are in the evidence, not estimated from filenames.

**No local asset deletion occurs in this candidate.** These are conservative planning
and verifier tests, not proof of safe IndexedDB garbage collection. A later compactor
must update descriptor, revisions, reviews and asset removals atomically and must
re-check all ownership after concurrent writes. Restore-as-new from an attached
revision places any required verified historical assets into the same existing reviewed
write transaction as the new revision. The old immutable revision remains unchanged.

Remote images and HTTPS PDF dependencies are reported as external, not downloaded
or counted as protected local bytes. An offline complete recovery bundle guarantees
only the local files it actually includes and verifies. A public URL is not a backup.
