# Coordinator release gates - AtlasNote 1.2

Use this implemented source, not the original 1.1 ZIP or an old handoff. Preserve a backup of any real workspace. Do not announce a completed production release until the blocked rows have evidence.

1. Install the delivered lockfile with normal `npm ci`. Run typecheck, all Node tests, public-content/release checks and the DOM suites. Review `docs/release-1.2/ACCEPTANCE_MATRIX.json` and the original logs.
2. On an unrestricted normal HTTP origin, run `npm run test:runtime`. Keep exact equality of the complete saved personal session and other records. Confirm it completes import v1, personal state, local PDF intake, reload, import v2, idempotent import, real backup download, fresh context, restore, restored equality, second reload and zero uncaught errors. The twice-green App-mount diagnostic does not close this gate.
3. Install the existing optional renderer with `npm run enable:online`; review the resulting exact optional lockfile. Run `typecheck:online`, `build:vite`, then `test:pdf` and `test:runtime` against that exact build. Preserve the required React-PDF 10.5.0/PDF.js 5.4.296 pairing. All 17 integrated-engine rows are still blocked, not certified by the fallback screenshots.
4. Review the two PDF documents' publication rights. The organized ZIP preserves the supplied bytes and attribution without granting a licence. Publish the organized library only after that review. Replace `/main/` in `config/pdfatlas.json` with the final full 40-character commit, run `pdfatlas:sync`, and rebuild. Do not hand-edit the generated pack URLs individually. Confirm both HTTPS files serve PDF bytes with the exact hashes, counts and sizes in the manifest and can be opened in an actual browser with the hosting policy/CORS behavior.
5. Test the exact final distribution at 1366x768, 1440x900, 1920x1080 and 390x844. Verify real storage/theme/mode reload, Context overlay, Compare identities, private local copies of remote references, backups and private-content exclusion. Re-run safety headers on the real preview host. Only then decide preview/production promotion.

The source and build returned by this pass are separate: the build ZIP is the honest fallback distribution. Do not call it an integrated PDF build. There is no remote test/deploy result in this package.

## Startup fix and remaining interpretation

The last saved hash can belong to an inactive pane, tab or history entry while the active Compare pane is empty. Startup no longer replays an already-owned route into that active pane. A genuinely new page/collection deep link still opens; later `hashchange` events remain normal navigation. During initial hydration, an already-owned page route preserves the durable session even when the URL also contains an old block anchor. This prioritizes exact restoration; clicking a new in-app/deep link after startup still navigates normally.

## Metadata-only publication boundary

Reference-only external document metadata requires `metadataOnlyReferences: true` on its explicit reviewed pack entry, public visibility, HTTPS source, no asset key and an empty asset list. The semantic hash check still applies. Reference-only binary PDFs remain denied from the app build. Public reference opening additionally requires the narrow exact configured repository path, approved pack identity, no credentials/query/hash/redirect and a matching reviewed SHA-256.
