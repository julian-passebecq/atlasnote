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
original synthetic PDFs with different hashes. The first archive removal preview identifies
the historic image and old PDF as exclusive; the current PDF and shared image remain.
Exact byte counts and hashes are in the evidence, not estimated from filenames.

Local removal is permitted only through the preserved, proven atomic compactor.
The real-browser positive case and 13 abort/stale/concurrency/request/quota cases
verify the descriptor/revision/review/asset transition across all five stores. Faults
preserve every original key/value and raw byte, including current projections and
pending proposals. Closed-world capacity tests exercise the same writer after genuine
saved-file selection, never a replacement test implementation.

Restore-as-new from an attached revision places required verified historical assets
in the existing reviewed write transaction with a newly numbered revision. Original
immutable records remain unchanged. Archived private-PDF comparison and complete
recovery verify a visible physical page plus the original download SHA-256/byte count;
rendering a current replacement or a hidden thumbnail is not sufficient evidence.

Remote images and HTTPS PDF dependencies are reported as external, not downloaded
or counted as protected local bytes. An offline complete recovery bundle guarantees
only the local files it actually includes and verifies. A public URL is not a backup.
