# AtlasNote V2 - exact references and knowledge navigation

Unreleased implementation built directly on the bundled completed AtlasNote 1.2.7 source. **Not production-cleared:** see [FINAL_TEST_STATUS.md](FINAL_TEST_STATUS.md). No GitHub push, merge or deployment is part of this delivery.

AtlasNote remains a local-first Notebook/PDF/native SVG Cheatsheet/Article/QCM reader with Dashboard, Quick Capture, five subjects, five reader workspaces, bookmarks, Read Later and full backups. V2 adds a separate stable Concept Index, exact references and derived backlinks. The Notebook folder tree remains freely editable and manual resource pins remain independent.

## Start

Use Node >=22.12 with the committed lockfile:

```sh
npm ci
npm run build
npm run preview
```

The integrated build is the real application with React-PDF. Run `npm run test:release` for the full release command matrix. Development and runtime requirements are described in the existing package scripts and `requirements-test.txt` / `requirements-pdf-authoring.txt`.

When package access is unavailable, `npm run bootstrap:offline && npm run build:offline` restores the documented compatibility toolchain using existing checked-in vendor bundles and TypeScript 5.8.3. That build does **not** certify or replace React-PDF/Vite, native persistence, or production release checks.

## V2 features

Open **Context > References** while reading an exact page/section/question. Link concepts, add explicit references, inspect outgoing/incoming/shared-concept results, and open a target here, in a new tab, in the other pane or Workspace 1-5. **Show references in tree** optionally inserts virtual expandable references without changing Notebook structure. **Reference Explorer** is a closable system tab with a Concept Index and Unlinked / Needs review queue.

Local reviewed JSON/Markdown handoffs let an external AI propose exact assignments/links; preview, stage, accept and reject are explicit user operations. Nothing calls an AI service or uploads personal library data automatically.

PDFs newly opened without saved presentation request Spread; saved preferences are preserved. Persistent pane-header shortcuts sit beside the per-pane detailed-toolbar toggle. Native PDF/runtime clearance remains a release requirement, not a claim of this compatibility-tested delivery.

## Documents

- [START_HERE.md](START_HERE.md): baseline and continuation route.
- [V2_REFERENCE_MODEL.md](V2_REFERENCE_MODEL.md): schema, targets, link derivation, review transactions and storage boundary.
- [docs/v2/USER_GUIDE.md](docs/v2/USER_GUIDE.md): using the reference system and reader controls.
- [docs/v2/TEST_CHANGES.md](docs/v2/TEST_CHANGES.md): inherited PDF prerequisite and meaningful test changes.
- [REQUIREMENTS_COVERAGE.md](REQUIREMENTS_COVERAGE.md): complete handoff acceptance mapping.
- [WORKSPACE_READY_FOR_GITHUB.md](WORKSPACE_READY_FOR_GITHUB.md): manual integration instructions.

Private sources and personal state belong in the existing local import/backup workflow, never in GitHub. The supplied public content remains unchanged; V2 does not silently invent a Spark ontology or assign concepts to your documents.
