# AtlasNote V3: release candidate

**Status: source-ready release candidate. It is not an approved production release.**
Branch `feat/atlasnote-v3-experiences-performance`. Nothing has been merged into `main` or deployed.

The detailed engineering record is in [V3_IMPLEMENTATION_STATUS.md](V3_IMPLEMENTATION_STATUS.md): the commits, the owner/persistence table, measurements and the acceptance-case register. This page is the owner-facing summary and release checklist.

## What V3 adds

**Reading**
- The PDF reader never jumps back to an old position after you have moved on.
- A compact `Page [n] / N` control stays available when the toolbar is hidden.
- Blank or out-of-range page input no longer jumps to page 1.
- Printed page labels (i, ii…) are shown beside the physical page number.
- Long PDFs in Continuous mode render only nearby pages (13 page wrappers instead of 400).
- The sidebar highlights the page you are reading, even page 190 of a long PDF.

**Workspaces**
- Each of the five workspaces can have its own Experience (subjects, content types, PDFs), chosen in one panel. The panel opens from the gear in the sidebar footer or from the right rail.
- Hidden content stays stored, backed up and linkable.
- Tabs from outside the Experience stay open, with an "Outside" badge.

**Norsk Daily**
- A reviewed daily feed import (preview → stage → your accept).
- A daily study queue with New / Learning / Known progress.
- English reveal, grammar links and the day's quiz.
- Vocabulary cards with an "Add to Concept Index" proposal.

**Content**
- All 64 seed pages are linked.
- 41 glossary terms and 6 native quizzes (45 questions).
- The Spark cache example is corrected.
- **Owner review required** before publication.

**Speed at scale** (measured with 1,500 resources in Chromium with the Event Timing API, which records interaction → next paint; p95 over 30 samples, across 3 runs)
- Search keystroke 120–128 ms.
- Folder toggle 48–96 ms.
- Workspace switch 64–80 ms.
- Applying an Experience 51–67 ms.
- First tree render ≈ 0.2 s.
- The first render no longer waits for stored PDF bytes or the full version history.
- A 48 MB PDF no longer keeps a second 48 MB copy in the page.

**Safety**
- Scroll positions are saved at most twice a second, and flushed on every explicit action.
- Two tabs merge their changes instead of overwriting each other, and see each other's changes live.
- If the saved workspace cannot be read, the app refuses to write over it.
- A full backup includes everything hidden by an Experience.
- The V2.3 durability core (history, compaction and its 13 rollback cases, backups) is unchanged. Its portable release core passes 12/12.

**Agent contract.** The owner-approved operation `concept.create` brings the Agent contract from 25 to 26 operations. It is documented in `V22_AI_CHANGESET_SPEC.md`.

## Ten-minute manual check (your browser, disposable data first)

1. `npm ci`, `npm run build`, then `npm run preview`, and open the local URL in a **new browser profile**.
2. Open *PDF reading fixture* and hide the reader controls. The compact `Page` control appears at the bottom right. Type `abc` and press Enter: you get a message and the page doesn't move. Type `3` and press Enter.
3. Switch to Spread and scroll forward with your own mouse or trackpad. If it ever jumps backward, open Document info → **Download navigation trace** and send the file.
4. Click the gear in the sidebar footer, choose **Norsk Daily**, then **Apply**. Only Norsk content shows in the tree. The PDF tab stays open with an "Outside" badge.
5. Open **Norsk Daily** → *Open review to import a feed*. Import `examples/norsk-daily/synthetic-2026-09-24.json`, then Preview → Stage → Accept. Mark a story Known and reload: it is still Known.
6. Open the app in a second tab, add a bookmark there, and check that it appears in the first tab without reloading.
7. Settings → export a full backup. Confirm that it restores in another fresh profile.

## Owner release checklist (in order)

1. **Review the content** of `content/packs/atlas.v3-seed`: Norwegian text, quiz answers and reference links. Start with [CONTENT_PREREVIEW.md](CONTENT_PREREVIEW.md). An independent AI pre-review found 18 points. The 5 high-confidence fixes are already applied; M-3 (a Norwegian idiom, which needs a native check) and the Low items are left to you. Correct anything else through the normal pack workflow, then update the `publication-review.json` note.
2. **PDF device check** (PDF-01): run step 3 above on the affected mouse or trackpad and share the trace if anything jumps.
3. **Decide on Norsk Daily sources**: synthetic or your own permitted material only, unless the publisher's reuse terms are confirmed (NORSK-02).
4. **Protected preview** (REL-02): with your Cloudflare access, deploy this branch to a disposable preview protected by Access. Then run `npm run test:v23:access:preview` and the full `npm run test:v23:release`, followed by `npm run test:inherited:after-v23`, on the same clean commit.
5. **Back up your real profile** (Settings → full backup) before first using V3 on it. V3 needs no database migration: the database stays at version 3 with the same five stores.
6. Only after steps 1–5: decide to merge into `main` and deploy. That decision, and any production change, is yours.

## Known limits and decisions

- **PERF-01, not done (owner decision).** `content.json` still carries all reviewed bodies (548 KB). Revisit if content grows past a few MB.
- **Search runs on the main thread.** A Web Worker is not warranted at the measured cost.
- **Notebook folders render in batches of 80 rows.** This is batching, not full virtualization.
- **Asset bytes still load into memory**, after the first render.
- **MEM-02 has no end-to-end browser proof.** The public-PDF cache is proven by a unit test, because the reviewed public PDF bytes are not in this repository.
- **Native storage-quota gate:** BLOCKED on Windows, but it passes on Linux in GitHub CI. There, the full V2.3 release gives 12 PASS, 0 FAIL and 1 BLOCKED: the access preview, which needs your Cloudflare credentials (checklist step 4).
