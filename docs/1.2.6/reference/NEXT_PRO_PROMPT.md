# AtlasNote 1.2.6 - Native Cheatsheets Pro Implementation Prompt

Work on repository `julian-passebecq/atlasnote`.

Start from current released `main` at commit:
`d1ecfd70c2f9d72c374a1c1c897d10a05d718dc5`

Create and work only on:
`feature/atlasnote-1.2.6-native-cheatsheets`

Do not start from any previous feature branch.
Do not merge to main.
Do not deploy Netlify.
Do not restart or redesign AtlasNote.

AtlasNote 1.2.5 already contains the current reader polish, flatter PDF navigation, per-pane behavior, bookmarks/read-later/state systems and the lightweight interview prototype. Preserve all of it.

==================================================
A. PRIMARY GOAL
==================================================

Add a native `cheatsheet` content type whose source of truth is structured JSON and whose page renderer produces safe native SVG with live text.

The architecture is:

structured cheatsheet JSON
  -> validation
  -> deterministic page renderer
  -> SVG page
  -> existing AtlasNote reader/tab/pane/workspace system

Do NOT implement cheatsheets as PNGs.
Do NOT store giant arbitrary AI-generated SVG strings as the canonical document.
PNG/JPG may exist later only as reference/import material or an explicit discouraged image block.

==================================================
B. CONTENT MODEL
==================================================

Use a fixed logical page size of 1200 x 1600.

The canonical document must be JSON-compatible and page-based.
Keep semantic content, fixed coordinates and style tokens separate.

Support the established compact block model:
- text
- list
- box
- table
- code
- divider
- diagram
- drawing
- icon
- image only as a discouraged fallback

Do not create dozens of specialized React block types.

For diagrams, prefer a small set of data-driven families:
- sequence
- graph

Use presets for array / stack / queue / linked-list / steps / tree / DAG / flow where needed rather than new fundamental diagram types.

Text must remain SVG text, not converted to paths.
Support inline runs/marks sufficient for bold, italic, underline, inline code and restrained highlighting.

Support stable block/anchor ids so AtlasNote can later deep-link to concepts.

Safe runtime SVG only:
- no script
- no foreignObject
- no executable content
- no arbitrary remote asset URLs

Product/cloud icons should use an AtlasNote asset-registry key.

==================================================
C. RENDERING / LAYOUT RULES
==================================================

A cheatsheet is a fixed page, not a responsive article.
Scale the 1200x1600 SVG uniformly inside the reader.
Do not reflow the page based on browser width.

Render enough of the established grammar to faithfully display the supplied test pack.

Authoring-time layout may calculate/bake frames; runtime should render fixed frames predictably.

Renderer requirements learned from the reference implementation:
- preserve significant SVG text whitespace
- calculate arrow endpoints using actual node bounds
- support horizontal and vertical sequences with arrows
- keep linked-list pointer compartments as a preset concern
- honor shrink/overflow behavior for code/text blocks where defined
- allow U+200B as a legal hidden break point in long expressions
- never introduce nondeterministic force-directed runtime layout

Do not over-engineer exact publishing-system reproducibility in this pass. The application needs stable, correct rendering; byte-identical cross-platform SVG is not a release gate yet.

==================================================
D. VISUAL THEME - IMPORTANT
==================================================

The supplied renders are functionally good but too compact and too colorful.

Refine the default AtlasNote cheatsheet theme:

- Use the available vertical page space instead of packing most material at the top.
- Keep page density visually homogeneous within one document.
- Do not add a motivational/slogan footer by default.
- Deep blue: main title and primary educational emphasis.
- Section headings: deep blue or near-black.
- Body text: dark neutral / dark blue-gray.
- Key/glossary terms: deep blue text; remove fluorescent marker-style fills.
- Example titles: black italic by default.
- Secondary/table accent: restrained green is preferred.
- Red/magenta/pink: reserve for actual warnings, traps, errors, or exceptional emphasis.
- Code blocks: restrained pale neutral blue/gray.
- Keep the lined-paper/study-sheet identity but make it calmer and more professional.

Do not turn this into a general design-system rewrite. Scope the theme to cheatsheets.

==================================================
E. ATLASNOTE INTEGRATION
==================================================

Cheatsheets must behave like a first-class AtlasNote reader item.

Minimum integration:
- appear in the left navigation/content tree
- open in a tab
- open in pane A/B
- work in Compare
- work across the five workspaces
- bookmark
- read later
- restore/persist as part of the normal workspace/tab state
- survive backup/restore where applicable
- expose a document outline in Context from page/anchor metadata
- support Remarks and Related using existing mechanisms where practical

Reader modes:
- Single page
- two-page/spread style view where appropriate
- four-page 2x2 quick view

Reuse the existing reader layout infrastructure where practical; do not duplicate a separate full reader shell.

Cheatsheet page navigation must use physical page numbers in the same clear way the PDF reader does.

==================================================
F. BUNDLED TEST CONTENT
==================================================

Implement/import the supplied four two-page test documents as native structured cheatsheets, not screenshots:

1. SQL for Analytics
2. PySpark Execution Model
3. Azure Data Factory
4. pandas Essentials

The supplied `TEST_PACK.md` describes the content/block/diagram inventory. Use it as the product acceptance reference.

The pack was deliberately selected to test different grammar pressure points:
- SQL: logic chains, code, tables, traps
- pandas: code + table-heavy transformations
- PySpark: DAG / execution / shuffle diagrams
- ADF: pipelines, object model, parameters, monitoring

Do not replace their content with generic knowledge. Preserve the test-pack structure and terminology.

If the actual JSON authored by the cheatsheet-design agent is available in the handoff, use it. If it is not available, create compatible structured fixtures from the supplied TEST_PACK and previews without inventing new grammar features.

Optional only after the four required documents are stable: add one small sample for Python, Databricks or Airflow to further test sequence/graph/cloud architecture rendering. This is not a release blocker.

==================================================
G. INTERVIEW INTEGRATION - LIGHT ONLY
==================================================

Do not redesign the 1.2.5 interview prototype.

Only add a lightweight relationship so an interview item/category can reference a related cheatsheet and a cheatsheet can reference related interview content using the existing Related concept.

The value proposition is that a user can open an interview question set in one pane and a cheatsheet in the other.

No scoring engine.
No code execution.
No LeetCode UI.

==================================================
H. BACKWARD COMPATIBILITY
==================================================

Do not break:
- notebooks
- PDFs
- PDF single/spread/four-page/Compare behavior
- per-pane reader controls
- flattened PDF tree
- interview prototype
- five-workspace isolation
- Bookmarks
- Read Later
- workspace/all-workspace saved states
- exact backup/restore expectations
- existing persisted local data

If a migration is needed, make it explicit, idempotent and covered by tests.

==================================================
I. TESTS
==================================================

Add focused tests for:
- schema/document validation
- all required block kinds used by the fixtures
- live/selectable SVG text rather than text paths/images
- forbidden SVG element rejection/sanitization
- 1200x1600 logical page contract
- no page overflow for bundled fixtures
- sequence diagrams
- graph/tree/DAG diagrams
- code/table rendering
- anchors/outlines
- single-page view
- two-page view
- four-page view
- Compare with a cheatsheet and PDF/notebook in separate panes
- opening a cheatsheet in another tab/pane/workspace
- bookmarks/read later
- persistence/reload
- backup/restore
- related interview link if implemented

Run the complete existing release suite as well as the new cheatsheet suite.
Do not weaken old tests merely to make CI green.

==================================================
J. DELIVERABLE
==================================================

At completion provide:

Branch:
Starting SHA:
Final SHA:

Architecture implemented:

Grammar/schema implementation:

Renderer implementation:

AtlasNote integration:

Bundled cheatsheets:
- SQL:
- PySpark:
- ADF:
- pandas:

Visual-theme changes:

Files changed:

Tests added/changed:

Full test results:

Known limitations:

Remaining blockers:

Do not merge.
Do not deploy.
