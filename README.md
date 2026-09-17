# AtlasNote V2 - local-first knowledge reader

AtlasNote combines freely editable Notebooks, PDFs, native structured SVG Cheatsheets, Articles/transcripts and QCM question sets. It includes five subjects, five independent reader workspaces, Dashboard, Quick Capture, bookmarks, Read Later, saved workspace states and complete local backups.

A separate stable Concept Index connects exact pages, sections and questions without imposing a rigid hierarchy on the Notebook tree. Context, derived backlinks, the optional virtual Reference Lens and a closable Reference Explorer provide cross-library navigation. AI-reference review is explicit local export/import, not a background service.

## Current delivery: V2 stabilization, version 2.0.0

Implemented on the audited V2 application, preserving its reference model and PDF/SVG engines. This pass adds five compact Dashboard tables, lossless Capture/Article back-navigation, tree-first resource management, validated Visual/JSON editing, clearer pane controls, and an optional deterministic demo.

**Not production-cleared.** Actual integrated builds, type checks, 705 unit tests, 237 DOM UI checks and 34 real PDF component checks pass. Normal-origin browser policy blocks durable reload/fresh-profile verification in the delivery environment. Clean install/security/license review remains incomplete. See `FINAL_TEST_STATUS.md` rather than older historical delivery reports.

## Run

```sh
npm ci
npm run build
npm run preview
```

Use Node >=22.12 and the committed lockfile. `npm run test:release` is the full release matrix; Python test requirements and Playwright Chromium must already be installed. `npm run test:stabilization:ui` runs the new focused in-memory UI suite. `npm run test:stabilization:runtime` exercises the actual production entry and IndexedDB on a normal HTTP origin.

The offline bootstrap/build remains a labelled compatibility fallback, not a replacement for the integrated application or durability tests.

## Explore the app

The top-left ribbon is Sidebar, Search, Back, Forward, Quick Capture, Dashboard, Compare. Focus is at the top of the right rail. Clicking Dashboard again returns to the underlying reader layout.

Open Dashboard's **Demo / test data** disclosure and choose **Load demo data** to populate realistic optional examples. Nothing loads automatically. **Reset/remove demo data** removes unchanged demo-owned records while retaining user-modified or user-referenced items; it is not an erase-all command.

Select PDF, Cheatsheet, Article or QCM and drag a source from the left tree into the management workspace, or use **Choose resource**. **Add to Notebook** creates a reference, never a source copy. **Visual | JSON** exposes validated source editing; PDF JSON contains metadata only, never its binary.

See `START_HERE.md`, `docs/stabilization/USER_GUIDE.md`, `V2_REFERENCE_MODEL.md`, `REQUIREMENTS_COVERAGE.md` and `WORKSPACE_READY_FOR_GITHUB.md`.

Private library sources, captures, attempts, and backups stay in local import/export workflows. Never commit them as application source.
