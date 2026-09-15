# AtlasNote 1.2.5

Local-first notebook and PDF reading, continuing the released 1.2.4 source. Read [START_HERE.md](START_HERE.md) and [FINAL_TEST_STATUS.md](FINAL_TEST_STATUS.md) before integration. This source has not been merged or deployed; integrated release acceptance is not yet certified in this environment.

Five independent workspaces preserve tabs, reading positions, Compare, Focus, Book, PDF Spread and four-page Grid. Each pane controls its own toolbar. The compact navigation strip opens search/history, sidebar, document Context, Focus and Compare. Bookmarks and Read Later remain independent shared lists.

PDF navigation intentionally uses fewer visible levels than notebook navigation, without modifying stored taxonomy. Physical-page links keep their actions and revision-aware targets. Context provides a document outline/glossary, scoped search, private remarks/reflection, explicit related links and bounded local visit history. Saved workspace checkpoints have a separate Workspace States panel, with all existing save/restore/progress/history/undo behavior.

The new Interview Preparation reference notebook contains five canonical SQL questions, four theory samples, three hybrid samples and three Python dictionary-pattern variants. They are ordinary editable notebook pages with safe code blocks, not executable exercises. The semantic authoring model and generation procedure are documented in [docs/1.2.5/INTERVIEW_CONTENT.md](docs/1.2.5/INTERVIEW_CONTENT.md).

## Build and test

Node >=22.12.0; use the exact committed lockfile. Python is for tests and optional PDF authoring.

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

Preview the integrated production build with `npm run build && npm run preview`. `dist-offline` is only a compatibility fallback and must not be deployed. The actual PDF component test harness is opt-in at `.build/engine-dom`, not part of the hosted app.

The release runner records every gate and exits nonzero for any failure or blocked result. Missing registry dependencies or browser-policy blocks are not passing tests. See the current status document and external evidence, not historical reports, for exactly what was verified.

## Privacy and provenance

Starting main is `b5e63f71185bcf525e985dfad1260d38ed3c4918`, with exact baseline tree `72a8ea2ca18944a3c897d86f39579c7a347e3c37`. No GitHub writes, merge or Netlify deployment were made. Source integration instructions are in [CODEX_HANDOFF.md](CODEX_HANDOFF.md).

Personal remarks, explicit links and up to 50 document timestamps stay in the existing local workspace/backup. There is no analytics service, cloud sync or automatic PDF fetch for Context. Source added/modified dates are shown as unknown when not available. This delivery contains no private 137-page reference library or credentials. The inherited precompiled Mermaid bundle still has its documented transitive SBOM/license-closure limitation.
