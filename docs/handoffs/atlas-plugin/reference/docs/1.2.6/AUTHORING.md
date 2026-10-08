# Authoring and importing a native cheatsheet

Use `docs/1.2.6/minimal.cheatsheet.json` as a valid starting file. In AtlasNote, open More / Settings and select **Import cheatsheet JSON**. Choose/paste canonical JSON, validate it, then import a local copy. With that document active, **Edit cheatsheet source** opens its local source editor. Export downloads the canonical document. Neither import nor edit executes code or accepts an SVG string.

## Contract

A document requires `schemaVersion`, stable `id`, `title`, `pageSize: {width:1200,height:1600}` and a nonempty `pages` array. Each page has stable `id`, `title`, `blocks`, `frames` and `outline`. IDs must use the validator's safe identifier syntax and be unique in the whole document. Keep page/block IDs when revising: bookmarks and remarks depend on them. Page order and display titles may change without replacing those identities. Use 1.1 for optional `meta.audience` and `meta.goal`; these are not displayed on the page.

Every block, including a nested box child, has one entry in its page's `frames`. Frames are absolute logical page coordinates, not CSS pixels or percentages. Box-child frames must lie inside the box. Graph `nodeFrames` are the only relative frames: they are relative to their diagram. Diagram cell sizes and arrow gaps must remain positive. A tree preset still requires baked node frames; the runtime is not a layout service.

Text can be a string or an array of `{text, marks}` runs. Marks are `bold`, `italic`, `underline`, `code`, `key`, `highlight`. Default key/highlight is restrained blue text, not a marker rectangle. Text roles are body, title, section, example, caption, key and warning. Example titles render black italic. Use warning boxes for actual traps only.

Code requires a language and a plain code string; the language is a label, never a runtime. Preserve spaces/newlines in that string. U+200B may provide a hidden wrap point in an expression; it is removed from the resulting searchable/copied text. Tabs display as four spaces. Wrapping is deterministic in logical units. Optional style fields include fontSize, minFontSize, lineHeight, align, and overflow (`shrink`, `clip`, `error`). Do not solve every overflow by making text tiny: distribute material down the page or enlarge frames. The editor rejects pages whose rendering still reports overflow.

Tables require columns and equal-arity rows. Optional widths are positive fractions that sum to 1. Figure-column height is independent of the neighboring paragraph: bake its own frame rather than stacking tall figures against identical section starts.

Graph diagrams use manual/tree layouts, typed nodes, explicit node frames and directed edges. Sequence presets are steps, array, stack, queue and linked_list; choose horizontal or vertical, and arrow or none. Only linked_list has a pointer compartment. The generic presets do not themselves teach or enforce stack/queue operations.

The drawing kind is bounded typed geometry and should be exceptional. Icons/images require a known registry key; raw URLs, data URLs, arbitrary SVG, remote fonts and script are rejected. Current keys are generic `atlas.database`, `atlas.pipeline`, `atlas.table`, `atlas.cloud`; the local-image key is `atlas.brand`. No official product-logo library is claimed. New assets need a reviewed change to `src/cheatsheets/assets.mjs`.

## Bundled-content changes

Edit only the canonical four files under `content/cheatsheets`, then regenerate:

```sh
node tools/generate-cheatsheets.mjs
npm run test:cheatsheets
npm test
npm run test:cheatsheets:ui
```

Review the generated wrapper pack and `content/publication-review.json` semantic hash, then run the full release suite. Do not hand-edit the generated pages while leaving the canonical source stale. Source-document titles/pages are not derived from PNGs at runtime. The published reference terminology is intentionally source-derived; correctness revisions need a separate explicit content review rather than silent renderer changes.

## Rendering outside React

The pure renderer can be used in a local Node command. Supply a distinct safe scope for every simultaneous SVG instance.

```js
import fs from 'node:fs/promises';
import {parseCheatsheetSource} from './src/cheatsheets/content.mjs';
import {renderCheatsheetPage} from './src/cheatsheets/renderer.mjs';
const doc = parseCheatsheetSource(await fs.readFile('docs/1.2.6/minimal.cheatsheet.json', 'utf8'));
const {svg, diagnostics} = renderCheatsheetPage(doc, 1, {scope:'author-preview'});
if (diagnostics.length) throw new Error(JSON.stringify(diagnostics));
await fs.writeFile('preview.svg', svg);
```

Rendering a page does not modify the canonical JSON. Renderer output is a derived view, not the authoring format. Do not replace `cheatsheet` in a stored page with this SVG.
