# Verified status and identity

## Source and remote history

- User checkout at audit: `b5af6c897b2272afd2cf1626a233805fbc5991af` (`v2.2manual`).
- Audited remote candidate, included here: `60db2cb7504503ac416ddad940441e24f82266b1`.
- Seven later commits change CI and six test files, not application implementation. They add V2.2 gates, account for the history rail button, open the current IndexedDB version in a PDF observation, and expect the V2.2 title.
- Main observed at audit: V2.1.0 `b50c27a987fa65eee1c51d36225908621e322da7`.
- PDF Atlas pin: `fa5e83f7825cdc837078f87c5e130cb012332195` (separate repository and identity).
- Commit author metadata does not prove whether a human or web AI initiated a commit.

## Results — do not collapse separate runs

| Evidence | Measured result |
|---|---|
| Original source-free handoff | 4 pass, 36 fail, 10 blocked; old environment limitations. |
| GitHub run 35384025755 on 60db2cb | All 50 npm command steps passed; production artifact produced. |
| Laptop ordinary Windows checkout | 9 pass, 34 fail, 7 blocked; byte conversion prevents builds. |
| Laptop exact committed-byte checkout | 49 pass, 1 fail; 797/797 unit tests passed; integrated build and legacy browser/PDF suites passed. |
| Same unchanged V2.2 runtime test with Python UTF-8 | All eight phases passed. |
| Independent supplemental browser checks | Competing-tab rejection, real current/historical PDF canvases, and independent page positions after reload passed. |

The 49/50 run stays a failed full run. The successful UTF-8 rerun does not retroactively relabel it. Final code changes still require a new complete run.

## Confirmed defects, not hypothetical features

1. Tree history actions are absent. App.tsx passes onHistory/onComparePrevious/onOpenPrevious, but Tree.tsx does not render or invoke them in its context menu. The final-memory package caught this, and source inspection confirmed it.
2. With Git core.autocrlf=true, the unprotected vendored manifest becomes CRLF and fails its correct byte-hash check. Generated exact-text content checks are also susceptible. .gitattributes currently protects PDFs and src/vendor only.
3. tests/v22_runtime.py decodes Node JSON with text=True and no explicit encoding. Windows Python uses CP1252, corrupting three U+200B characters while preserving old hashes. This produces History content hash mismatch, then agent-interface-not-initialized. Explicit UTF-8 mode passes without assertion changes. Fix the subprocess encoding, never the validation rule.

## Important gaps in passing tests

The original V2.2 PDF comparison screenshot uses a password-protected fixture and shows Opening PDF in both panes. The test never asserts rendered canvases. Supplemental checks establish rendering and independent pages for a metadata-only PDF revision, but not replacement-byte history. The original migration fixture has empty imports/assets. Two-tab and real transaction failure coverage needs maintained tests. Keyboard presses without focus assertions do not prove the full keyboard matrix.

Live AI providers/MCP bridges, OCR/pixel diffs, historical global search and destructive pruning are explicitly deferred beyond V2.2. Do not expand scope to them merely to finish this release.
