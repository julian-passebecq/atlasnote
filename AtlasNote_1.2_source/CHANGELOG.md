# AtlasNote 1.2.0 - 2026-09-12

- Fix startup hash replay into a restored empty active Compare pane; keep hydration separate from later navigation. Preserve strict exact session assertions.
- Replace routine top branding and wide toolbars with a compact search-first ribbon and shared right reader rail. Move Home, Bookmarks, Edit, Print and learning-flag visibility into More / Settings.
- Convert Context / Outline / Remarks into a non-modal overlay without a reader-width tax. Add Escape/focus return and mutually exclusive popovers.
- Add blue Pane A and lavender Pane B identities to tabs/tree, same-page dual markers and non-color active cues.
- Support exactly Fluent Blue, Neutral/Sage, Academic Paper, Soft Lavender and Dark Slate. Preserve old theme IDs and validate new modes/themes in backups.
- Add PDF Library mode as a recursive projection of the existing tree/collection/pane shell. Preserve note reading modes and independent Compare state; show honest disabled PDF mode controls in the fallback build.
- Generate a metadata-only PDF Atlas pack from an inspected manifest; preserve source attribution, actual page/byte counts, hashes and path-independent IDs. Centralize commit pinning in config/pdfatlas.json.
- Add narrowly trusted public-reference opening with credential-free, no-referrer, redirect-rejecting, bounded and SHA-verified fetches. Arbitrary external URLs retain consent.
- Permit an explicit private offline copy of a metadata-only external reference while retaining local/bundled SHA deduplication.
- Preserve the existing optional React-PDF implementation; extend its chrome theme tokens without recoloring original document artwork. No third renderer.
- Add 49 core regressions (176 total), 11 compact UI cases, twice-repeated strict startup diagnostics and updated existing UI selectors. All unavailable live-origin/registry/integrated-engine gates remain explicitly BLOCKED.

## Delivery limits

This is an implementation candidate, not a production certificate. The shipped build is the native/browser fallback. Full normal-origin reload/restore, optional engine installation/runtime and final PDF-host upload/commit pinning require coordinator verification. See the current release report rather than historical 1.1 evidence.

---

# AtlasNote 1.1.0 - Reader UX and private PDF library

- True full-viewport Focus with floating exit, Escape and source-anchor preservation.
- Empty active Compare picker, independent state, exact surviving pane and remembered divider ratio.
- Existing measured Book paginator preserved; finer semantic anchor restoration across layout changes.
- Microsoft Fluent, Light Minimal and Medium / Paper semantic themes.
- Derived mixed folder collections, metadata/facets, modifier clicks and portal-based accessible menus.
- Exact-byte private PDF intake, arbitrary nested placement, metadata editing and SHA-256 reuse.
- Standard private PDF-library export; deterministic public-context remapping prevents fresh-import ownership collisions.
- Hardened private repository validator/builder and offline lossless/study/compact processor with actual render QA.
- Preserved advanced PDF engine source; strict matching worker/resource build checks and one-React portal adapter.
- New unit, DOM, authoring and release-gate evidence. Unavailable normal-origin/optional-engine gates remain BLOCKED.

## Earlier history

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
