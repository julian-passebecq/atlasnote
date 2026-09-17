# Native cheatsheets - implemented architecture

## Data flow

`content/cheatsheets/*.json -> strict validation -> pure fixed-frame SVG renderer -> CheatsheetReader inside the existing pane`

A generated ordinary Atlas content pack wraps each canonical document in one `Page` with `kind: "cheatsheet"`, `cheatsheet: { ... }` and an empty legacy `blocks` array. This is a native type, not a PDF registry entry or a notebook image. The canonical document has semantic blocks, a separate fixed-frame map, style tokens and structured diagrams. No rendered SVG is persisted.

`tools/generate-cheatsheets.mjs` regenerates the four wrapper pages/project and publication review. Its `--check` path validates source and generated content, renders all eight pages, rejects any diagnostic overflow, checks exact generated payloads, and verifies the semantic pack hash. No dependency was added or upgraded.

## Validation and grammar

The TypeScript model is `src/cheatsheets/model.ts`. The JSON Schema is `src/content/schemas/cheatsheet-v1.schema.json`; its definitions are also embedded in the existing page/bundle schemas. `validation.mjs` is the authoritative companion for constraints that need semantic checks: unique IDs, matching frame maps, nested containment, known registry keys, node/edge targets and positive diagram cell geometry. Both page-pack import and personal overlay/backup validation call it.

Versions 1.0 and 1.1 are accepted; 1.1 permits the additive audience/goal metadata. This is a compatible implementation of the supplied direction, not a byte-for-byte reproduction of the absent original schema. Ten block kinds are supported: text, list, box, table, code, divider, diagram, drawing, icon and image. There are only two diagram families, graph and sequence. The fixtures need six block kinds and both families; generic-kind/preset coverage is in unit tests.

Limits include 4 MiB per canonical JSON source, 64 physical pages, 2,000 blocks, a 1,000,000-character serialized block-content budget, depth 30, and a bounded structural traversal. The validator rejects nonfinite/negative geometry, unknown fields, duplicate/dangling IDs, invalid table arity/fractions, unsupported versions, prototype keys, cycles/shared object graphs, unknown assets, raw markup fields and remote URLs. Oversized text and invalid geometry fail before rendering or state mutation.

## Rendering and safety

The page is always 1200 x 1600. All block frames, including box children, use absolute page coordinates; graph node frames are relative to their graph block. Tree layouts must arrive as baked node frames. The runtime performs no force layout, subject-specific grammar conversion, network fetch, code evaluation or canvas-to-image rendering.

`renderer.mjs` emits allowlisted markup with escaped text. Text, code, table cells and diagram labels use live `<text>/<tspan>` with `xml:space="preserve"`. Fixed numeric advance tables drive logical wrapping; there are no shipped font files. U+200B is a legal hidden break hint and is omitted from display/copy/search. Explicit newlines and leading spaces are retained; tab characters display as four spaces. Soft wraps do not add canonical newline characters. Min-font shrink, clip and error modes are bounded. Render diagnostics are visible in the reader and block source-dialog saves.

Rectangular, elliptical and diamond edge endpoints use the actual node bounds. Horizontal and vertical sequences have arrows; pointer compartments are exclusive to the linked_list preset. Every SVG instance has length-delimited pane/view/document/page namespacing, with separate internal title/clip/marker/block namespaces. Two panes can render the same source without duplicate IDs or marker collisions.

No script, foreignObject, event attributes, user path strings, external stylesheet or document-supplied URL is accepted. `assets.mjs` is the application-owned registry. It currently contains generic Atlas vector icons and one registered local Atlas image; these are not official vendor logos. Adding product artwork requires a reviewed source change. The image kind is deliberately discouraged and used by none of the bundled sheets. Drawing accepts bounded typed lines/rectangles/ellipses, not arbitrary SVG.

The paper theme is local to cheatsheets: muted lined paper, deep blue titles/terms, dark body text, black italic examples, pale neutral code boxes, muted green table/secondary accents, and pink only warning boxes. Highlight marks change text emphasis, not fluorescent background fills. No default slogan footer is emitted. The page remains paper-colored in dark application themes.

## Reader and state integration

`CheatsheetReader` lives within existing tabs/panes/workspaces. It has no parallel global reader state. Uniform CSS scaling implements fit/zoom; viewport width never changes the internal SVG. Single/two/four modes group physical pages; four means a real 2x2, not two spreads mislabeled as four. Documents with only two remaining pages render two real pages, not duplicated placeholders. A four-page private fixture verifies the full grid.

Additive location fields are `sheetPage`, `sheetMode`, `sheetZoom` and `sheetFit`. Anchors include the stable physical page ID (`sheetId`), displayed number (`sheetPage`) and optional block ID. On reordered source pages, a valid block/page identity resolves to its new number. Removed pages/concepts remain explicit unavailable targets; saved records are not silently redirected or deleted. Physical page navigation clears stale concept anchors. Scroll callbacks are identity-guarded/cancelled on reader changes.

The new `cheatsheet-page` reading target reuses the existing routing planner, capacity guards and bookmark/Read Later validation. Destination validation happens before a workspace/tab is changed. Per-pane toolbar visibility remains the released preference, not a new setting. Full session/saved-state/undo snapshots retain the additive fields.

Context derives a page/section outline and local search from canonical text, without rendering every paragraph as a new tree layer. Remarks are keyed to stable page identity and optional block. Related uses existing links/backlinks; interview source JSON is unchanged. The global search index reads canonical native content. A scoped copy handler reconstructs the exact selected SVG range text to preserve newlines without expanding a partial selection into an entire block. This has synthetic copy-event coverage, not an OS clipboard certification.

## Storage and editing

Canonical import creates a new private wrapper/project in the existing overlay store. Re-importing the same document ID creates an independent local wrapper; no existing source is silently overwritten. Editing replaces that wrapper's native source and preserves its stable identity, related metadata and independent personal records. The canonical document ID is immutable during edit; an existing view is not forcibly reopened at page 1 after save. Source validation and rendering run before mutation.

The existing IndexedDB name/version and full backup envelope are unchanged. The extension is additive and needs no data rewrite/migration. Old records are accepted unchanged. Backups/export contain the structured JSON, not derived SVG/screenshots. Existing exact-payload archive decoder tests and in-memory round-trips pass; durable storage/reload/fresh-profile restore still require the separately blocked real-origin gate.

Backwards compatibility is old -> new: an old 1.2.5 application is not expected to understand new 1.2.6 native payloads. Do not open a new native backup in 1.2.5 and then save over it.

## Deliberate boundaries

No general drag/drop designer, handwritten-font package, automatic remote asset import, code runner, scoring, analytics, translation service or PDF-engine rewrite. JSON editing is the bounded authoring surface. Eight reference pages are structurally reconstructed because the handoff did not include the original source; see FIXTURE_PROVENANCE.md. Browser font fallback is tested for the provided Chromium environment, not certified as byte-identical cross-platform publishing.
