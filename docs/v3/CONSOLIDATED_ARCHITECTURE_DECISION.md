# AtlasNote V3: consolidated architecture decision

Prepared 2026-09-24. This is a design/audit handoff, not a V3 implementation or release certification.

## Authority and exact base

Application code audited: `215d3c962736bbac44c3f2e3602fa1f80cee77c8` on `julian-passebecq/atlasnote`.
Preparation head verified: `e31528855ed7c9380b43fc7e2d77e95f0b853f82`, branch `v3/atlasnote-v3-audit-content-seed-20260924`. GitHub comparison showed four documentation-only commits above the audited main, no application changes.
This consolidation branch starts at that exact preparation head. Create an implementation branch from this consolidation commit; do not restart from a historical V2, Vercel, Mongo V3, or durability candidate.

Read this document, then the supplied `AtlasNote_V3_Consolidated_Handoff_2026-09-24.zip`, beginning with `00_START_HERE/CLAUDE_MASTER_PROMPT.md`. The ZIP contains the fuller decisions, acceptance gates, original 64-page seed, recovered historical reports and isolated diagnostics. It is not a complete repository or a production build. Keep the original seed unchanged until reviewed integration.

The user's current V3 instructions and the consolidated handoff supersede obsolete *scope/baseline* language in root migration documents. They do not supersede safety, privacy, immutable history or explicit-human-review requirements. No production merge, force push, deployment, Access bypass or private-library publication is authorized by this handoff.

## Decisions

1. Extend AtlasNote. Keep local-first IndexedDB; do not introduce MongoDB, D1, a synchronization server, a database per workspace, or a second application shell for V3.
2. Preserve five independent numbered workspaces, five subject families and five canonical library types. An Experience is a versioned per-workspace selection profile, not a subject alias or duplicated library. Preserve independent A/B and the existing tab limits.
3. Keep Notebook organization, canonical resource identities and the semantic Concept Index separate. `ResourceTarget`, `ReadingDestination`, physical PDF page, logical history revision, PDF SHA and source Git commit must not be conflated.
4. Build a metadata-first read model and asynchronous resource repository. Load pack descriptors, selected metadata shards, then active page bodies/assets. Search unloaded content through lazily acquired worker indexes. Do not eagerly acquire a full global index on boot.
5. Separate the lightweight read model from the complete durable command model. **Unloaded, hidden, outside-Experience and missing are distinct states. Never pass an Experience-filtered or partially hydrated workspace into the existing history snapshot engine, compactor or full-backup exporter.** An operation must acquire the complete validated dependencies it requires, with epoch checking, or fail closed. Initially preserve the existing authored-write/compaction path behind a complete-state adapter; optimize further only with unchanged rollback proofs.
6. Preserve `knowledge-atlas` and its current five durable stores. Prefer keyed/indexed reads and a separately rebuildable cache before changing the durable schema. A cache database is not an additional quota or backup boundary. Any unavoidable durable schema migration requires its own reviewed, resumable migration and restore compatibility tests; the product name V3 does not itself imply another DB version.
7. Experience filters must act upstream of body loading, search shard selection and rendering. Merely hiding sidebar rows will not fix performance. Disabled resources remain stored and linkable. Existing open tabs must not be destroyed; show an outside-scope indicator with Open once/Add to Experience.
8. Add a Workspace setup gear beside the left workspace footer and a right-rail Workspace shortcut. Both open **one** existing-style right-side floating configuration panel. Label its scope, use draft/Apply/Cancel, and keep the document Context panel semantically separate. Do not add another permanent filter ribbon.
9. Keep small reviewed learning JSON and schemas in this repository. Preserve the existing pinned PDFAtlas contract for document metadata/allowed heavy assets. A separately published daily feed can be split later for independent release cadence; creating another GitHub repo is not a performance fix. No rights upgrades or public publication of private PDFs.
10. Keep Cloudflare Workers Static Assets plus managed Access as the current hosting boundary. The migration did not move IndexedDB to Cloudflare. Do not weaken `public/_headers` or cache private responses publicly to improve speed. Distinguish protected preview verification from protection of the production hostname.

## Findings from actual code inspection

- `src/app/assets.ts`: `assetResolver()` registers `subscribeArchives()` without retaining its disposer and returns no cleanup. `src/app/App.tsx` recreates the containing StudyWorkspace on workspace switches. Isolated execution of the exact asset source (TypeScript-transpiled with mocked imports) retained 24 listeners and 24 mock object URLs across 24 resolver lifetimes. This is a reproducible lifecycle defect, not a measured browser heap result. Give resource services an explicit owner/dispose or shared reference-counted lifetime; do not revoke URLs still used by pane B.
- `src/main.tsx`: first React render waits for full `content.json`, `loadWorkspace()` and `initializeHistory()`.
- `src/storage/database.ts`: `loadWorkspace()` calls `getAll()` on imports, assets and history. Existing `history.kind`/`resourceKey` indexes are not used by this boot path. Full asset bytes and revision snapshots should not be normal navigation prerequisites.
- `PdfEngine.captureScroll -> onLocation -> App.updateView -> setSession -> store.personal`: scroll updates can reach whole-personal cloning, whole-record durable writes, and broad subscribers every animation frame. Keep viewport updates immediate; checkpoint coalescible location state with bounded latency and explicit navigation/backup flush. Never debounce away authored edits, accepted reviews, attempts or captures.
- `writePersonal()` has no cross-tab compare-and-swap although authored `commitProjection()` checks the history epoch. Test and prevent stale tabs overwriting unrelated personal changes; a per-tab Promise queue is not cross-tab serialization.
- `SearchContext.SearchDialog` searches synchronously on query changes; slicing the result list afterward bounds DOM, not search computation.
- `Tree.ProjectTree` rebuilds its projection and repeatedly searches arrays while rendering. Catalogue composition elsewhere is already memoized: preserve that and add targeted indexes/selectors rather than claiming no memoization exists.
- PDF Continuous already has near-viewport canvas loading, but constructs all page wrappers/observers. PdfStudyTree already shows 80 rows per group with cumulative Show next pages; it is not fully virtualized. Preserve these existing protections while making total work bounded.
- `PdfEngine` already exposes editable physical-page input in its full toolbar. Make a compact shared control available in collapsed chrome and Focus; do not build a competing page-state implementation.
- `PdfStudyTree` receives no active physical location and gives no current physical-row highlight. Its fallback uses `doc.pageCount`; the reader uses PDF.js `numPages`. Introduce a runtime verified document descriptor shared by both, without silently rewriting authored metadata.
- A Companion with page titles but no categories currently enters the generic fallback; titles should still be used. Repeated physical-page links under different categories are valid; highlights cannot assume one DOM row per page.
- `PdfEngine` fetches complete PDF bytes and retains a retry copy before transferring another buffer to PDF.js. Optimize ownership/caching first; do not bypass byte SHA/consent or promise range streaming while fetching `arrayBuffer()` first.
- Root handoff documents and history initialization still contain historical candidate/source references. Separate current app commit, deployment version, verification status, content release and history provenance. Old green counts are not current V3 proof.

## PDF root-cause discipline

The supplied prior report describes a real user-observed non-monotonic Spread scroll; this pass did not independently replay its original video or run an authenticated live browser. Wheel defaults are threshold 90, idle 220 ms, cooldown 500 ms, accumulation window 1200 ms. Exact-module diagnostics show an uninterrupted small reverse tail stays latched, while a reverse after 700 ms can turn backward. The latter can also be an intentional gesture. It does NOT prove momentum is the cause of the live jump.

Instrument event deltas/timestamps, boundaries, gesture state, navigation generation, PDF identity and restoration reasons. Investigate both gesture classification and late `restorePosition(true)` callbacks/layout changes. Preserve slow-wheel accumulation and native Continuous behavior. Use real mouse/trackpad traces as well as synthetic tests. Number changes and scroll restoration must have one generation-guarded owner; stale document/page renders must never win.

## Content and Norsk Daily

The existing ZIP has 64 unique draft Notebook pages; its 71 manifest entries passed byte/hash verification. Their `related`, `terms` and `sources` arrays are all empty. Question blocks are not native QCM documents; there are no native Article/QCM/Cheatsheet resources in that seed. Do not market this as 64 complete, linked courses.

Integrate a linked vertical slice first: Notebook explanation, native quiz, glossary links, structured-SVG cheatsheet, and a real revision-pinned PDF location when available. Preserve the structured cheatsheet JSON renderer, Reference Explorer, optional Lens, Companion, reviewed Agent Interface and Saved states rather than replacing them with parallel features.

Norsk Daily: permitted/user-supplied headline metadata -> explicit ChatGPT transformation -> bounded versioned JSON -> reviewed feed/import -> existing Article/Notebook/QCM and glossary projections inside a Norsk Experience. No hidden paid API dependency, automatic trust of generated content, whole-article mirroring or fabricated NRK headlines. Support language nb/nn, English and optional French study output, stable source identity, item revisions, source timestamp versus collection timestamp, Europe/Oslo day boundaries, deduplication and preserved personal progress. A rolling feed snapshot cannot be called all NRK headlines for a day without evidence of complete collection. Publisher reuse terms remain to be verified before automated collection/publication.

## Execution order and proof

A. Record baseline on exact code, recovery backup, checks and limitations.
B. Fix PDF navigation/lifecycle defects and add regression instrumentation in reviewable commits.
C. Freeze resource repository and Experience contracts; implement migrated profiles and the single setup panel using the existing loader adapter initially.
D. Introduce split compiler output, lazy read-model/asset/history access, worker search, bounded UI and hot-path persistence; preserve canonical write boundaries.
E. Integrate and enrich the 64 drafts through the real reviewed pack compiler; add representative native types and linked learning paths. Implement Norsk feed adapter against synthetic fixtures before live data.
F. Run same-source V2.3 durability/13 rollback cases, archive and restore-as-new, backup/full-library completeness, five-slot/A-B migration, 1,500/10,000-resource scale tests, retained-listener/URL checks, cross-tab races, offline/auth-expiry and real PDF hardware/visual QA. Qualify a protected disposable preview only with proper credentials and authorization. Missing capabilities remain BLOCKED, never PASS.

The full ZIP defines budgets as proposed acceptance targets, not measured claims. No V3 runtime code, complete native release suite, production deployment or live Cloudflare policy verification was performed during this consolidation.
