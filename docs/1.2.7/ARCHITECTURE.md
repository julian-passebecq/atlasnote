# 1.2.7 architecture and data contracts

## Three independent axes

`Session.libraryMode` is additive: `notes | pdfs | cheatsheets | articles | qcm`. Subject is a display projection (`it/cloud/job/kpi/norsk`) over the unchanged persisted categories (`informatics/cloud/job/personal/norsk`). Workspace numbers are still 1-5. The application does not infer a new subject merely because a resource has changed content type.

`src/content-hub/taxonomy.ts` derives a shared folder catalogue from native Notebook projects and folders. Existing stable project/node IDs are authoritative. Per-resource `overlays.taxonomy` assignments are additive and do not rewrite source metadata. Explicit `null` means unclassified; it does not fall through to a source's old taxonomy. Invalid or removed folder IDs are retained in the data and displayed as Unfiled rather than reassigned to an unrelated folder. Unclassified native Notebook projects remain readable; assign their subject before using them as a specialized-library filing destination.

`projectLibrary` creates a view model. Native sibling order and empty locally authored folders are retained. Specialized resources are excluded from Notebook unless `overlays.references` explicitly points to them. A reference has its own ID, title, taxonomy and createdAt, plus the existing typed target. Rename, move and remove affect the reference, never the source document or bytes. Collections derive reference facets from the original resource. Removing a local Article/QCM source retains dependent references and attempt history as explicitly unavailable targets; archive is the reversible alternative.

## Navigation and surfaces

The compact ribbon contains collapse, search, back, forward, Focus/fullscreen and Compare. Content type, subject and tree filter follow underneath. Each pane retains its own modes and controls visibility: optional A/B only in Compare, then + and tabs on the left, show/hide at the far right, and contextual reader controls below.

The bottom right dock owns Dashboard, Quick Capture, workspaces, safe unused-slot selection, save and Workspace States. A compact chooser replaces the tall workspace row on short screens. The unused-slot action never invents workspace 6 or silently resets a used slot.

`Session.surface` is an optional `dashboard | library` route over the existing pane sessions. Dashboard/manager open-close captures reading anchors first and leaves underlying pane histories intact. Existing sessions without this field keep their reader state. New empty sessions start Dashboard. Dashboard scope and content-mode expansion records are additive session fields. Checkpoint validators accept those fields without absorbing shared learning or content data into the checkpoint.

QCM is a native educational reader, not a notebook-mode renderer. Its exact question is `Location.anchor.questionId`; its scroll offset is saved through the existing reader-change flush and guarded debounce. A pending old question's scroll callback cannot overwrite the next question's location. The generic Book/Spread controls are not presented as fake QCM layouts.

## One target family

`ResourceTarget` aliases the existing extended `ReadingTarget` family. Article, QCM question and Dashboard item variants join existing URL, page, collection, PDF category/page and cheatsheet page/anchor targets. No surface invents a private URI convention.

Shared navigation handles current pane, independent tab, other pane and a numbered workspace. PDF references retain document ID, physical page and revision; cheatsheet links retain document ID, physical page, stable sheet/block IDs; QCM uses set/question IDs. The `resource-link` block adds a safe native Notebook reference without changing legacy `link` blocks. The same picker and action menu are used in Notebook editing, Related and QCM explanations. External links use validated HTTP(S) URLs and open separately with `noopener noreferrer`.

## Article and QCM storage

Articles use ordinary overlay Pages with `kind: article`, metadata, and safe existing native blocks. Link-only content is metadata plus an external reference, not an iframe. Pasted Markdown/text is local; remote HTML, scraping and automatic retrieval are not implemented. Article import accepts either `text` or structured `blocks`, never both. Structured edits preserve IDs, wrapper metadata and related links.

QCM sources are overlay Pages with `kind: qcm`, a canonical `schemaVersion: 1` document and no unrelated notebook blocks. There are 2-6 options per question; one correct option means radio selection, multiple means checkboxes. Scoring uses exact set equality. Reveal creates an explicitly revealed attempt and never counts as correct. General and every supplied option explanation are shown after checking/revealing.

`personal.qcmResponses` stores draft selections and reflections; `personal.qcmAttempts` stores attempts, result, timestamp, attempt number and reflection. Progress is derived from the latest attempt per current question. JSON/Markdown AI exports contain a selected 1-100-question range, explanations, taxonomy, current result and relevant attempt history. Export is user-initiated and makes no AI-service request.

## Dashboard and capture

`personal.dashboardItems` stores captures. Link/Task/Note uses up to five rows; blank rows are ignored. Dates are validated calendar dates represented as UTC dates. Exact `contextTarget` is attached only after the user selects the checkbox. Classification suggestion is an explicit action; it is not silently inherited. Article and Transcript use the long-form Article editor instead of adding a cramped row.

Dashboard derives five rows (Inbox, To-do, Quick notes, Bookmarks, Read later) for five subjects. It shows three entries per small card, expandable with Show more. Unclassified entries remain separately discoverable. Subject and stable-folder scopes reuse the same taxonomy, including nested folders and folder bookmarks. Bookmark and Read Later stores are queried, not duplicated into captures. Completion, reopening, editing and archiving update original shared items. An explicitly opened archived item can be restored.

## Persistence and restoration

The database remains `knowledge-atlas`, version **2**, with the existing imports/overlays/personal/assets stores. No clear/reset or destructive migration is introduced. Old optional fields may remain absent. Existing timestamps and shared records are not fabricated during loading. Full state validators, pack schemas, reading targets and saved-session validators are extended additively.

Reading-state save/restore copies session/layout state, not current overlays or shared captures/responses/attempts. Full backup encoding, checksums, download and decoding use the unchanged archive envelope. Tests compare entire payloads, not selected happy-path fields. A full backup restore intentionally replaces the selected workspace payload after its existing confirmation. Browser-origin storage remains origin-specific; moving to a new origin requires an explicit backup/restore, not presumed synchronization.

## Security and boundedness

New JSON parsing is limited to 4 MiB and rejects prototype-bearing/unsafe objects, unknown fields and malformed targets before applying a mutation. QCM sets are limited to 500 questions, captures to 2,000, attempts to 10,000, draft responses to 2,000 and Notebook references to 2,000. Hitting a bound produces an error; nothing is silently trimmed. Export/archive before replacing or extending a full collection.

Article blocks use a conservative allowlist of native Markdown, section, callout, list, table, code, bilingual, typed link, separator and page break. No raw SVG/HTML, arbitrary scripts, executable code, remote images or fonts are added. Native cheatsheet presets use only existing block/diagram types; the original renderer, eight canonical fixture pages and PDF engine are unchanged. Existing security headers and external-PDF consent/hash rules are unchanged.

## Verification boundary

See FINAL_TEST_STATUS.md. Successful component tests mount the actual compiled compatibility application on about:blank with the existing in-memory adapter. They prove rendering, pointer/keyboard actions, state updates and downloaded payloads, not durable IndexedDB, the production PDF canvas/worker or normal-origin restoration. Those have separate retained release gates; no test harness or browser policy bypass clears them.
