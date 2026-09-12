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

