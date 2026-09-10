# 1.0.1 - release hardening

- Compare is a reversible toggle. The active pane survives with all its views and state; empty panes can still be closed.
- Focus is immediately before Compare; exact sidebar states restore on exit.
- Unified tree context menus, keyboard activation/navigation, fresh-tab, other-pane and bookmark actions; existing manage dialogs are reused.
- Search explicitly exposes opening a fresh tab; Ctrl/Cmd/middle-click remain supported.
- Book reflow preserves the source anchor rather than replacing it with the first block of a new sheet.
- Added a long-note Book entry point on Home without changing the project layout.
- Backups refuse missing or corrupt local/imported attachment dependencies and corrupt orphan attachments; restored PDF revisions are hash/size checked.
- Retained integrated PDF implementation: cover-aware physical-spread stepping, worker error/retry state, local standard-font resource path, original download link and diagnostic version marker.
- Added synthetic update/backup tests, expanded DOM checks, real-origin and integrated-PDF gates, an exhaustive acceptance matrix, reproducible evidence and deployment headers.
- No storage reset, private corpus publication, quiz/code-execution/graph feature or remote write.
