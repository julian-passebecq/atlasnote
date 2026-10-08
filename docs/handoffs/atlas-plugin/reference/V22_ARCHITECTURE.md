## Completion coding-pass addendum (2026-09-18)

The shared storage/history architecture below is retained. New UI composition is
in `history/ui-context.ts`, `history/HistoryMenuItems.tsx`,
`history/StructureHistoryView.tsx` and `components/menu-navigation.ts`. The agent
registry now publishes concrete payload envelopes via `agent/payload-schema.ts`
and returns detached metadata. The existing service has internal mounted-UI
navigation hooks, ordered/reusable A/B Compare and exact historical-target checks.
These hooks are not external APIs. Read `docs/v22/BROWSER_AGENT_SEMANTICS.md`.
Verification is recorded in [V22_QA_REPORT.md](V22_QA_REPORT.md), including the accepted single-ID Article/QCM scope and explicit coverage limits.

# V2.2 history and universal agent architecture

## Baseline and scope

This is an additive extension of the supplied V2.1.0 application, not a replacement UI or storage rewrite. The five-subject taxonomy remains orthogonal to five content types. Five workspaces, existing A/B panes, Workspace States, Article/QCM editing, exact semantic references, native SVG cheatsheets and existing PDF readers remain in place. No new dependency, AI provider SDK, server, cloud database, background fetch or deployment is introduced.

The candidate uses package 2.2.0. QA head is `215b60ff792a59e736b2b059a4e3fc60f1092d54`; the received archive provenance remains in `docs/v22/BASELINE_IDENTITY.json`. See `V22_QA_REPORT.md` for the distinct QA snapshot and source identities.

## Logical-resource revision engine

`src/history/model.ts` defines immutable committed revisions, mutable heads, initialization metadata and review records. All reside in one IndexedDB history store; existing current-source stores remain the application projection.

Six adapters in `src/history/adapters.ts` own canonical validation, capture, hashing, projection, semantic diff, target creation and summaries: Notebook page, Notebook project/tree, Article, Cheatsheet, QCM and PDF logical document. Manual reference placements are captured as the synthetic structural resource `notebook-tree:atlas.manual-references`; this is not a sixth content type, a rendered page or a competing reference database.

Each revision has its stable resource identity, unique revision ID, monotonically increasing number, parent revision, timestamp, source, content SHA-256 and canonical snapshot. Restore-as-new records its source revision and appends even when restoring identical content. Ordinary identical saves are no-ops. Source imports/updates go through the same engine; no separate AI history exists.

Pages capture stable blocks and typed source. Trees capture project structure, preferences, category, archived structural IDs and manual placements. PDFs capture metadata, effective companion outline and content-addressed identity; never a binary copy per version. Asset bindings pin embedded local content to its historical key/hash rather than a later pack path.

`WorkspaceStore` remains the mutation boundary. Validation/hashing happens before opening a short readwrite transaction. The transaction checks the persisted history epoch and, for reviewed personal/layout work, expected personal state, then commits current overlays/personal state, new immutable revisions, heads and review audit together. Another tab advancing history causes a rejected write rather than silent overwrite. Manual optimistic failure retains a visible recovery warning. Reviewed failures never expose a partially accepted candidate.

A validation/staleness rejection is not a disk-write failure: the queue keeps it separate so a stale review outcome can still be recorded. Personal changes arriving while an accepted candidate is prepared are queued against the committed state rather than overwriting it with an old clone.

## Current versus history

Existing `ResourceTarget` variants gain optional `historyRevisionId`. PDF `revision` continues to identify expected PDF bytes and is not reused for logical history. The public adapter's ordinary target is floating; its historical target carries an exact history ID and, for PDF, the byte SHA.

Historical readers use a pane-local catalogue and companion projection. They never replace the current library. Missing or mismatched history fails with an explicit unavailable state, not substitution of current content. Historical controls disable authoring; QCM attempts/reflections remain personal state, not versions. Historical bookmark/Read Later/Question/Cheatsheet actions preserve the selected pin. Physical PDF page bounds and the pre-existing byte revision checks remain authoritative.

Tree snapshots are shown as read-only canonical structure in historical collection panes; they are not a second editable tree application. Resource history and Agent Review are compact dialogs opened from the existing rail/context menu.

## Semantic Compare

`src/history/diff.ts` produces typed add/remove/modify/rename/move/reorder entries. Stable IDs match blocks, sheets, questions, options, diagram entities and nodes. Tree movement and ordering are explicit; text uses a bounded linear common-prefix/suffix token diff. It is not an optimal full edit-distance algorithm and can show a larger replacement span when several distant words change.

Changes, Side by side, A only and B only reuse the existing A/B state and readers. Side by side does not route through a second PDF engine. Semantic changes describe canonical structured source, not generated SVG strings or pixels. Advanced before/after values remain inspectable. OCR and selectable-PDF-text comparison are not introduced.

## Universal interface

`src/agent/public.ts` is the stable internal build entry at `app/agent/public.js` for both distributions. Vite emits this entry together with the application so the configured service/store are shared. It exposes the provider-neutral facade, not IndexedDB handles or a generic setter. Its implementation is in `src/agent/service.ts`; typed operation unions, central capability definitions and validation are separate files.

The facade has bounded read/context, exact navigation/system-surface, and preview/stage/accept/reject layers. The same public facade powers Agent Review and the synthetic orchestrator tests. A future desktop/MCP/browser bridge must implement authorization and an explicit human review boundary; this internal module is not an authenticated network API or a sandbox against arbitrary trusted same-origin JavaScript.

Preview computes a detached candidate and semantic changes. Stage stores only review metadata. Accept recomputes selected operations against live exact bases and applies the detached candidate atomically. Reject/stale preserve audit without authored changes. Personal/layout/semantic proposals remain their own state classes and do not manufacture content revisions. Concept assignment proposals enter the existing semantic review queue; they do not silently bypass its second review decision.

## PDF Atlas

The public library remains in its separate repository. `config/pdfatlas.json` keeps production pinned to `fa5e83f7825cdc837078f87c5e130cb012332195`. A read-only GitHub fetch verified the exact source manifest blob; its bytes and provenance are vendored separately from AtlasNote enrichment.

`check-pdfatlas-provenance.mjs` validates commit, source Git blob/hash, stable IDs, paths, PDF hashes, byte/page counts, rights and generated metadata. It runs before both builds and release checks. A mutable `main` URL is allowed only with the explicit staging sync flag, and still fails the production gate. No external PDF binaries are added to source or build.

Every PDF snapshot keeps logical document ID, source repository/commit/path, byte SHA/count/page count, metadata revision and rights separately from the AtlasNote revision ID. Existing fetch restrictions are retained. AI cannot fetch files, change production pins, infer rights, upgrade visibility or substitute another document. Revision proposals are limited to already reviewed sources for the same logical document; new files still require the existing manual intake or an independently reviewed source update.

## Verification status

The QA head `215b60ff792a59e736b2b059a4e3fc60f1092d54` on `newversion2.2vfmanual` records **50/50 release gates, 813 unit tests and 15/15 expanded normal-origin browser scenarios passing**. See [V22_QA_REPORT.md](V22_QA_REPORT.md) for repairs, retained failures and coverage limits. The user-approved canonical single-ID Article/QCM invariant remains; independent wrapper/document IDs are outside V2.2. Nothing was merged or deployed.
