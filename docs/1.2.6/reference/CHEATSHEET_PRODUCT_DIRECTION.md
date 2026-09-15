# Cheatsheet product direction and visual feedback

## Product direction

AtlasNote should treat cheatsheets as a native page-based content type, not as PNGs. The persisted source should be structured JSON and the runtime output should be native SVG with live searchable/selectable text.

Preferred architecture:

Cheatsheet JSON -> deterministic SVG renderer -> AtlasNote reader

Do not persist arbitrary AI-generated SVG as the source of truth.

## Frozen high-level grammar direction

- Fixed logical page: 1200 x 1600
- JSON-compatible canonical format
- Separate semantic content, fixed page coordinates and style tokens
- Block kinds: text, list, box, table, code, divider, diagram, drawing, icon; image is a discouraged escape hatch
- Main diagram families: sequence and graph, with presets instead of many special block types
- Text stays text, never paths
- Anchors/concept ids are addressable
- Safe SVG only: no scripts, foreignObject or executable/remote content
- Official cloud/product icons should use an application asset registry key, not arbitrary remote URLs
- Internal page layout is fixed and scales uniformly; it should not responsive-reflow like an article

Grammar 1.1 research showed SQL, PySpark, Azure Data Factory and pandas can be represented without new block kinds or drawing fallbacks.

## Visual refinement required

The current reference renders prove the model, but they are still too compact and too visually loud. Refine the default AtlasNote cheatsheet theme:

1. Use more of the available vertical space. The current pages pack content near the top while leaving avoidable empty space near the bottom. Spread sections more evenly while preserving logical grouping.
2. Keep density homogeneous across pages in the same document.
3. Remove closing motivational/slogan lines by default. They are optional content, not a standard footer.
4. Reduce magenta/red substantially. Reserve warning red/pink for genuine traps, warnings or critical emphasis.
5. Main title: deep blue.
6. Section titles: deep blue or near-black.
7. Body: dark neutral / dark blue-gray.
8. Glossary/key terms: deep blue text. Avoid fluorescent marker-style backgrounds. A very subtle tint is allowed but should not dominate.
9. Example titles: black italic by default, not red.
10. Tables / secondary accent: muted green is preferred where a second color is needed.
11. Code boxes: neutral pale blue/gray background with restrained border.
12. Keep the lined-paper/study-sheet feel, but cleaner and more professional.
13. Preserve strong readability in one-page, two-page and four-page reader modes.

## Renderer lessons already discovered

The reference work exposed renderer implementation issues, not grammar gaps:

- Preserve SVG whitespace in text/tspans (`xml:space=preserve` or equivalent).
- Arrow/edge endpoints must account for the real node extent, not a fixed circle radius.
- Figure-column flow should be solved at authoring time and baked into fixed frames.
- `steps` sequence is plain arrow-linked boxes; linked-list pointer compartments are a linked-list preset behavior.
- Vertical sequences need explicit arrows.
- U+200B may be used as a legal hidden break point inside long expressions without changing copied text.

Do not expand the grammar unless a real reference page cannot be represented with the existing model.
