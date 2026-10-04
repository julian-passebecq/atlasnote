# Interface and reading themes

The Theme panel and Workspace settings offer six complete presets plus independent interface and sheet selectors. Midnight is the default for new sessions: black chrome, black reading paper, soft blue headings and contrasting text/code/table colors. Existing saved interface choices are respected; missing legacy sheet preferences retain original artwork in light themes and use Slate paper in Slate.

Sheet preferences apply to structured SVG cheatsheets and notebook reading pages. Original PDF pixels and canonical structured source/export/print colors are retained. Preferences use the existing personal session record, including workspace checkpoints and backups; there is no database version/store change or authored history operation.

Validation: strict TypeScript checks, 1155 unit tests, and `npm run test:appearance:runtime` on the integrated build with normal-origin Chromium and real IndexedDB. The appearance suite checks the new default, independent controls, complete presets, unchanged source/text/physical frames, reload persistence and absence of uncaught page errors. Dark palette reading roles have contrast ratios of at least 4.5:1. Browser extensions that recolor websites may alter the displayed palette independently.
