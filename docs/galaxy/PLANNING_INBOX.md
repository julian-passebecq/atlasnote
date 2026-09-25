# AtlasNote — planning/inbox pass (Datapass Galaxy, 2026-09-25)

AtlasNote is the galaxy's reading, knowledge, personal-notes and light-planning app. This pass adds
four small things on top of the **existing** Dashboard captures and Read later list. It adds no
second task model, no scheduler, no Mongo backend and no live synchronisation.

| Feature | Where | Owner of the fact |
|---|---|---|
| Planning views (Next up, Open tasks, Agenda, Notes, Reading queue) | Dashboard, above the five tables | AtlasNote (projection of captures) |
| Reviewed Power Ops intake `powerops.atlasnote-handoff/1` | Dashboard > **Import from Power Ops** | Power Ops owns the source item; AtlasNote owns the imported copy |
| Service setup reference note (Cloudflare, MongoDB Atlas, Azure, Fabric, GitHub, Vercel, Netlify, Databricks, other) | Dashboard > **Service reference note** | AtlasNote (knowledge, never secrets) |
| Planning overview export `atlasnote.planning-overview/1` | Dashboard > **Export planning overview** | AtlasNote; consumers (Mongoku, Power Ops) get a timestamped snapshot |

Code: `src/content-hub/planning.ts` (pure logic), `src/content-hub/secrets.ts` (secret guard),
`src/content-hub/PlanningViews.tsx` (UI). Tests: `tests/planning-inbox.test.mjs` (unit, part of
`npm test`) and `tests/planning_inbox_dom.py` (`npm run test:planning:ui`, Chromium component run on
the compatibility build; it does not certify IndexedDB, reload restore or a production origin).

## 1. Planning views

- Tasks are the existing `dashboardItems` of kind `task`. A due date is the existing `dueAt`
  (noon UTC of a calendar day). Buckets use the viewer's local day: **Overdue**, **Today**,
  **Due soon** (next 7 days), **Later**, **Unscheduled**.
- Only dated tasks appear on the **Agenda**. Tasks without a date stay unscheduled; nothing is
  auto-scheduled.
- The subject/folder scope of the Dashboard applies. Project/category stays optional.
- Multi-line notes show their first line as the title and a short preview below it.
- Each planning task row has a quick **Reschedule** menu (Today, Tomorrow, In a week, No date).
- The capture editor sets, changes or clears a task's due date and marks any capture Important
  (same `dueAt` / `important` fields). Clearing the date returns the task to Unscheduled. Imported
  items show their Power Ops origin; edits made here are kept on the next import unless replaced.

## 2. Power Ops intake — `powerops.atlasnote-handoff/1`

Envelope (JSON, at most 1 MiB and 200 items):

```json
{
  "schema": "powerops.atlasnote-handoff/1",
  "sourceApp": "powerops",
  "generatedAt": "2026-09-25T08:00:00Z",
  "exportId": "optional-stable-export-id",
  "items": [
    {
      "sourceObjectId": "stable-id-in-power-ops",
      "sourceRevision": "optional-revision",
      "kind": "note | task | link | read-later",
      "title": "optional, max 200 chars",
      "text": "optional body, max 19,000 chars",
      "url": "https://... (required for link and read-later)",
      "dueDate": "YYYY-MM-DD (tasks only)",
      "status": "open | done (tasks only)",
      "important": true,
      "category": "optional AtlasNote subject: it | cloud | job | kpi | norsk",
      "projectRef": "optional stable project id",
      "capturedAt": "optional ISO time"
    }
  ]
}
```

Accepted aliases: `todo`/`to-do` → task, `bookmark` → link, `readlater`/`readLater`/`read_later` →
read-later, `inbox`/`quicknote`/`transcript` → note.

**Power Ops as shipped** (JUtility `AtlasNoteHandoff.Create`, PowerToy_UI-v2) writes
`"format": "powerops.atlasnote-handoff", "version": 1` instead of `schema`, plus the declarations
`containsCredentialValues: false`, `containsMediaBinaries: false` and `importContract`. Both spellings
are accepted (`format` may also carry the `/1` suffix). A secret-named declaration set to `false` is
not a value; `containsCredentialValues: true` refuses the whole file. Its item fields map as follows
(`null` means absent):

| Power Ops field | AtlasNote |
|---|---|
| `dueUtc` (local midnight of the picked day, in UTC) | due date = the viewer's local calendar day of that instant (tasks only) |
| `isCompleted: true` | task done |
| `isArchived: true` | **Skipped** — never imported, and an existing AtlasNote copy is left untouched |
| `priority` `high`/`urgent`/`critical`/`important`/`p0`/`p1` | Important |
| `subject` | same as `category` (AtlasNote subject when it matches) |
| `createdUtc` | same as `capturedAt` |
| `projectName`, `labels`, `updatedUtc` | accepted, not stored |

Sample: `docs/galaxy/examples/powerops-jutility-handoff.sample.json`.
Known envelope fields (`projectRef`, `visibility`, `authority`, `freshness`, `observedAt`) and item
fields (`observedAt`, `openUri`, `tags`, `visibility`, `authority`, `freshness`, `sourceApp`) are
accepted and not stored. Unknown fields are ignored **with a visible warning**.

Mapping: note/task/link become normal Dashboard captures; read-later becomes a Read later entry with
a URL target. Each imported item keeps a non-secret `origin`
`{app:"powerops", objectId, revision?, projectRef?, importedAt, fingerprint}` (an additive optional
field; the database version and IndexedDB stores are unchanged).

Review and deduplication (nothing is written before **Import N item(s)**):

| Result | When |
|---|---|
| New | No AtlasNote item carries this `sourceObjectId` |
| Unchanged | Same content as the AtlasNote copy — no write |
| Update | Source changed and the AtlasNote copy was not edited since the last import |
| Edited here | Source changed **and** the copy was edited in AtlasNote — kept unless you tick **Replace** |
| Skipped | Archived in AtlasNote, or same `sourceRevision` with local edits |
| Refused | Invalid, duplicate ID in the file, kind changed, or secret-looking content |

Apply re-plans against the current state and refuses if anything changed since the preview.

**Secrets:** an item is refused when any field name (at any depth) looks like a credential
(`password`, `secret`, `token`, `apiKey`, `clientSecret`, `privateKey`, `credentials`, `cookie`,
`otp`, `recovery…`, `connectionString`, `env`…) and carries a value, when its title/text/URL
contains a known token shape, a credential assignment or a `user:password@` URL, or when the URL
has a secret-looking query parameter. A secret-named field at envelope level refuses the whole file.
Descriptor names such as `credentialRef` or `tokenId` are not values: they are ignored with a
warning and never stored. The Power Ops source item is never modified from AtlasNote.

After an import, **Copy receipt** gives Power Ops an `atlasnote.import-receipt/1` document:

```json
{"schema":"atlasnote.import-receipt/1","handoffSchema":"powerops.atlasnote-handoff/1","exportId":"...","appliedAt":"...",
 "items":[{"sourceObjectId":"...","status":"created|updated|unchanged|kept-local|skipped|refused","atlasnoteId":"...","reason":"..."}]}
```

Power Ops may use it to confirm which captures AtlasNote accepted before archiving its own copy.

## 3. Service setup reference note

Templates explain what each identifier is, where to find it and where it is used (for example
Cloudflare Account ID vs Zone ID vs Access Application ID vs AUD tag vs Service Token Client ID;
MongoDB Atlas Project ID = `groupId`). Secrets appear only as "vault label" lines. The same guard
now protects every Quick Capture save and capture edit: a value assigned to a password/secret/token
name, known token shapes, private-key blocks and credential URLs are refused with the offending line
numbers (never the value). AtlasNote remains a knowledge app, not a password manager.

## 4. Planning overview — `atlasnote.planning-overview/1`

User-triggered, copied or downloaded by the user; nothing is sent anywhere. It is a **galaxy
projection envelope** that Mongoku consumes under its contract
(Mongoku-datapass `docs/GALAXY_PROJECTION_CONTRACT_2026-09-25.md`). Mongoku refuses the whole
payload on any secret-like key or value, a wrong shape or more than 64 KiB, and drops unknown fields,
so the export carries exactly the contract fields. The operator stores a reviewed export in
DATAPASSCONTROL `entities.atlasnote.mongoku_projection.envelope`; AtlasNote only exports.

```json
{
  "format": "atlasnote.planning-overview/1",
  "projectRef": "atlasnote",
  "sourceApp": "atlasnote",
  "sourceObjectId": "atlasnote.planning-overview",
  "sourceRevision": "<16-hex fingerprint of the projection>",
  "generatedAt": "2026-09-25T09:00:00Z",
  "openUri": "https://<app origin and path, only when served over http(s)>",
  "authority": "atlasnote",
  "visibility": "private",
  "freshness": "snapshot",
  "lifecycle": "current",
  "counts": {"open_tasks": 4, "overdue_tasks": 1, "due_today_tasks": 1, "due_soon_tasks": 1, "later_tasks": 0,
             "unscheduled_tasks": 1, "important_open_tasks": 1, "done_tasks": 0, "notes": 1, "links": 0,
             "reading_queue": 1, "reading_done": 0, "bookmarks": 0, "workspaces": 1, "imported_items": 6,
             "listed_tasks": 4, "withheld_titles": 0},
  "items": [{"id": "powerops-…", "title": "Send recap", "kind": "task", "status": "overdue", "dueAt": "2026-09-23"}]
}
```

- `items`: at most 25 open tasks in planning order. `status` is `overdue`, `due-today`, `due-soon`,
  `open` (later) or `unscheduled`. `dueAt` is the calendar date and is present only for dated tasks.
- Titles are the first line of the task, at most 160 characters. With **Include open task titles**
  unchecked, every title is the neutral `Open task [due YYYY-MM-DD]`.
- A title that looks secret-like (Mongoku's own patterns, AtlasNote's secret guard, or wording such as
  `api key: …`, `password = …`, `token: …`) is **withheld**: it becomes `Open task … (title withheld)`,
  counted in `withheld_titles`, and the dialog asks you to reword it. Anything else that would fail
  the contract (for example an unexpected ID) stops the export with the offending path, never the value.
- `openUri` is the app location without query, fragment or user info, and only for `http`/`https`.
- Deterministic: keys are sorted, so the same state, day and timestamp give the same bytes.
  `sourceRevision` changes with the data, not with the clock, the title option or the location.

Never includes: document, notebook or article bodies, quick-note text, annotations/remarks, reading
history, credentials or environment values.

Tests: `tests/planning-inbox.test.mjs` validates every export against
`tests/mongoku-projection-contract.mjs`, a copy of Mongoku's `parseProjection` rules (size, secret-like
names and values, `.env`-looking text, envelope schema) taken at Mongoku commit `7c9363b`. Update the
copy when the Mongoku contract changes.

Mongoku before `7c9363b` (julian-passebecq/Mongoku-datapass#14) did not catch spaced names such as
`api key: rotate`; AtlasNote withholds such titles either way.

## Non-goals kept

No password storage, no `.env` values, no Mongo migration, no two-way or real-time sync, no external
writes, no change to the IndexedDB/recovery/history model, no calendar subsystem.

## Verification (2026-09-25)

Evidence kept outside the repository (scratchpad); historical evidence folders were not overwritten.

- Commit `530564b`: full release runner `npm run test:release` — **52/52 PASS** (clean install,
  typecheck, 1060 unit tests, compatibility/integrated builds, DOM, runtime, PDF, V2.2 and completion
  runtimes). `npm run test:v23` 214/214, `check:v23:secrets` PASS, `test:planning:ui` 5/5.
- Trial merge with the unmerged `feat/atlasnote-v3-experiences-performance` branch (temporary
  worktree, not pushed): no conflicts, typecheck clean, 1127/1127 unit tests, planning 5/5,
  content-hub 30/30 and stabilization browser checks PASS.
- Not covered: live Power Ops output (the envelope above is AtlasNote's contract), live Mongoku
  consumption, Cloudflare Access protected preview, production. Nothing was merged or deployed.
