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

Accepted aliases: `todo`/`to-do` → task, `bookmark` → link, `readlater`/`read_later` → read-later.
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

User-triggered, copied or downloaded by the user; nothing is sent anywhere. Keys are sorted, so the
same state and timestamp give the same bytes. `sourceRevision` is a deterministic fingerprint of the
projection (it changes with the data, not with the clock).

Includes: `generatedAt`, `today`, `freshness:"snapshot"`, `authority:"atlasnote"`,
`visibility:"private"`, counts (tasks by bucket, done, important, quick notes, links, imported,
reading queue unread/read, bookmarks, workspaces) and up to 50 open tasks with stable ID, bucket,
due date, optional subject, optional Power Ops origin and an `openTarget`
(`{"kind":"dashboard-item","itemId":...}`). Task titles are optional (checkbox).

Never includes: document, notebook or article bodies, quick-note text, annotations/remarks, reading
history, credentials or environment values.

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
