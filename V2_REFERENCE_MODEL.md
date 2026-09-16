# AtlasNote V2 reference model

Status: implemented, unreleased. See FINAL_TEST_STATUS.md for the verification boundary. The bundled 1.2.7 source remains the baseline; no application restart or new storage service was introduced.

## Three independent structures

1. **Notebook structure** is the user's editable folder/page hierarchy. Manual pinned references remain `overlays.references` and can be renamed, moved, or removed without deleting their resources.
2. **Concept Index** is a separate semantic index in optional `Personal.knowledge`. Stable concept IDs, not Notebook folder names or display paths, identify notions. IT / Cloud / Job / KPI / Norsk are the initial semantic domains. They are derived lazily until the first semantic edit. A concept has one optional primary parent for display, aliases, and zero or more related concepts; the primary-parent graph must be acyclic.
3. **Exact ResourceTargets** locate a document, physical PDF page, stable Notebook/Article section, cheatsheet page/block, QCM question, Dashboard item, folder, or URL. The existing `src/core/reading-types.ts` union and navigation destination system are authoritative. There is no parallel target type.

A Notebook logical page can contain many headings and blocks. It need not acquire physical subpages to support references. A PDF's physical page number is a different kind of location. A broad Notebook page query includes its linked sections; an exact section or physical-page query does not include unrelated neighboring sections/pages.

## Canonical persisted shape

`Personal.knowledge` is optional. When present, it has schemaVersion 1 and these fields:

| Field | Meaning |
| --- | --- |
| revision | Monotonic accepted-semantic-change revision. |
| concepts | Stable ID, subject, label, aliases, primaryParentId?, relatedConceptIds, deprecated?, replacedById?, createdAt, updatedAt. |
| assignments | ID, conceptId, existing ResourceTarget, targetRevision, optional note, createdAt. Many-to-many. |
| edges | ID, source and target ResourceTargets, sourceRevision, targetRevision, link/context/related kind, optional label/note, createdAt. Stored once, directed. |
| reviews | Exact target, reviewed content revision, reviewedAt. |
| proposals | Imported assignment/reference suggestions plus batch ID, base semantic revision, proposed/accepted/rejected/stale status and timestamps. |
| audit | Bounded semantic mutation records: ID, revision, action, timestamp, affected IDs. |

`Personal.referenceLens` is a separate optional boolean. `View.referenceExplorer` is an optional system-tab descriptor with target?, conceptId?, and returnViewId?. Explorer owns no fake Page and has an empty reading history. Each pane can have one Explorer and remains subject to the existing five-tab limit.

Concept rename and reparent preserve IDs and assignment identities. A referenced concept cannot be removed silently. Deprecation may preserve the original node without replacement or name a validated replacement; traversal follows replacements without rewriting historical assignments. Primary-parent and replacement cycles, invalid IDs, missing parents, and malformed states are rejected. Moving Notebook folders never reparents the Concept Index.

## Exact target identity and resolution

| Resource | Identity and precision |
| --- | --- |
| Notebook / interview reference | Logical page ID plus stable heading/block ID. The reader's page-title anchor means the whole logical page. |
| PDF | Document ID, file revision when known, physical page number. Category links normalize to their physical page for semantic matching. |
| Cheatsheet | Existing document ID, stable sheet ID when available, optional stable block ID. Physical index is a presentation coordinate, not the only identity. |
| QCM | Set ID plus optional exact question ID. |
| Article / transcript | Native article/page identity plus optional stable heading/block ID. A link-only article has no fabricated internal sections. |
| Dashboard | Existing item ID. Opt-in context targets create derived incoming links. |
| Folder | Existing collection/project ID, explicitly broad. No automatic concept ownership of descendants. |
| External reference | Validated safe URL. No page scraping or iframe navigation. |

`targets.ts` normalizes identities, resolves availability and computes exact/broad scope. A missing section/block/question falls back to its known parent resource with a visible warning. A missing cheatsheet block falls back to the known sheet; a deleted sheet falls back to its document. Missing/archived documents remain unavailable with their references retained. A known PDF revision mismatch is not silently redirected to a possibly unrelated new page. Stable source IDs survive display-name and Notebook-order changes.

Parent fallback is an explicit behavior of the new semantic reference views and their action menus. Existing bookmarks and Read Later keep their strict missing-physical-sheet/question behavior: an unavailable saved target is retained and reported, not silently replaced.

The resolver uses a deterministic 64-bit content fingerprint for stale-link detection. It is **not a cryptographic authenticity guarantee**. Existing PDF SHA-256 identities remain available independently. Coarse source changes may deliberately request more review rather than overlook a changed link. PDF review excerpts use authored page metadata, when available, explicitly labeled as such; this pass does not extract or OCR PDF text.

## One computed backlink index

`createReferenceIndex` derives incoming/outgoing maps and concept membership from accepted semantic edges/assignments and the existing explicit resource links:

- Notebook and Article resource-link blocks, page-level resourceLinks and Related links;
- QCM question references;
- opt-in Article and Dashboard capture context;
- new accepted ReferenceEdges.

There is no persisted mirror of incoming backlinks. Results are deduplicated by exact target identity while retaining multiple provenance reasons and directions. Related-by-concept is distinguishable from an explicit outgoing link. Scope inherited from a broader document or section is labeled as broad, not passed off as an exact page match. Document-wide Notebook views aggregate section assignments without creating structural child pages.

The index is built from current catalogue/personal state. Lens rows are calculated on expansion. Results are bounded (up to 200 per query, initially 12/30 visible depending on surface); Show more progressively reveals the loaded results. There is no graph-canvas, embeddings, recommendation service, or background analysis process.

## UI ownership

- **Context > References** is the primary reading-context reference surface. Existing Outline/Glossary, Search, Remarks, Related and History remain available.
- **Show references in tree** is OFF by default. ON inserts virtual References expansions under eligible Notebook nodes and pinned targets. Those rows never enter the user's Notebook structure or duplicate source bytes.
- **Reference Explorer** is a closable system tab, not a sixth content type. It supports Concept Index browsing, incoming/outgoing/shared-concept filters, type/text filters, an Unlinked / Needs review queue, and return to the originating reader.
- Reference rows use the existing Here / New tab / Other pane / Workspace 1-5 destinations. Other-pane routing opens a new tab there. Double-click, Ctrl/Command-click, and middle-click open a new tab; a normal click opens here.
- Manual pinned shortcuts and semantic references remain distinct. Removing a pin is not unlinking a concept; removing a link is not deleting its source.

## Reviewed local AI workflow

1. Select 1-50 exact targets. Download JSON and/or Markdown containing bounded excerpts, exact targets, source fingerprints, existing concepts and the semantic revision.
2. Send the file to an AI outside the app only by explicit user action. Source excerpts are labeled untrusted content, not instructions.
3. Import a suggestion JSON batch. The complete batch is checked against schema, limits, current concept IDs, availability, exact anchors, source fingerprints and semantic revision before any mutation.
4. Preview is pure. Stage is an explicit review-metadata write; it does not add accepted links. Select rows and explicitly Accept or Reject.
5. Accept selected is atomic. If any selected row is stale/invalid, no selected semantic link is applied. Unselected still-valid proposals can advance to the revision generated by that transaction; changed proposals become stale. Reject preserves accepted semantic content.
6. Review history and a bounded change log remain inspectable/exportable. Completed proposal history can be cleared without deleting accepted assignments/edges. A new review export is required after unrelated semantic or content changes.

Accepted suggestion kinds are assignment and reference. AI cannot create, rename, delete, or reorganize concepts. Concepts are created/edited manually first. No AI endpoint, key, automatic network request, cloud synchronization, scraper, or GitHub-backed personal store exists.

## Persistence and compatibility

The existing raw IndexedDB database `knowledge-atlas`, version 2, is unchanged. Optional semantic state uses the existing Personal state persistence and full-backup validation path. Old backups without knowledge/referenceLens/Explorer fields remain valid and do not materialize an index on restore merely by reading it. Full backups include concepts, assignments, edges, proposal decisions, audit records and current Explorer descriptors. Missing source references are retained rather than discarded during restore.

Workspace saved states remain reader/session snapshots. Restoring an old workspace checkpoint must not rewind newer concepts, links, Dashboard items, QCM attempts or semantic review decisions. Lens preference is shared personal state, not part of older workspace snapshots.

Schema/payload round trips and checkpoint-boundary behavior have local tests. Actual durable IndexedDB reload and fresh-profile restoration require the native runtime suite and are NOT inferred from component-harness tests; consult FINAL_TEST_STATUS.md.

## Enforced limits

2,000 concepts; 20,000 assignments; 20,000 explicit edges; 10,000 reviewed targets; 1,000 retained proposals; 200 mutation audit entries; 12 MiB semantic state; 50 exact targets per review export; 1,200 characters per excerpt; 100 suggestions per batch; 512 KiB imported suggestion JSON. Existing resource/backup limits still apply. IDs and object keys are validated; arbitrary fields, unsafe URLs and prototype-related payloads are rejected.

## Implementation map

`src/references/model.ts` - types; `validation.mjs` - pure validation; `targets.ts` - canonical identities/resolution; `knowledge.ts` - mutations, backlink index, queries and queue; `review.ts` - local reviewed workflow; `explorer.ts` - system-tab creation; `ReferenceUI.tsx` and `KnowledgeEditor.tsx` - surfaces. Integration is in existing App, Tree, DocumentContext, ResourcePicker, reading navigation and personal validation. No separate database/service owns these data.
