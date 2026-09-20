# AtlasNote V2.3 - provider-neutral Vercel migration candidate

**Source migration provided; production release requires fresh green qualification.**
Start with [START_HERE.md](START_HERE.md). Vercel managed protection is the active access
boundary; Netlify is optional legacy. The existing atomic compactor, archive/recovery,
Compare, PDF/history, backups and Agent Interface are retained, not replaced.

Use `npm ci && npm run build` for the integrated `dist`. See
[the preview procedure](docs/v23/VERCEL_QUALIFICATION.md) and
[manual upload instructions](00_READ_ME_V23_ZIP.md). Do not deploy compatibility output
or assume `vercel.json` enables access protection. A host change creates a new origin;
verify a complete recovery bundle before moving browser-local data.

## Historical V2.2 product notes (not V2.3 certification)

# AtlasNote V2.2.0 - local-first knowledge reader

AtlasNote keeps the existing Notebook, PDF, structured-SVG Cheatsheet, Article and QCM readers inside five independent workspaces. V2.2 adds immutable logical-resource versions, historical A/B Compare, restore-as-new, reviewed provider-neutral ChangeSets and full-history backups.

The QA head `215b60ff792a59e736b2b059a4e3fc60f1092d54` on `newversion2.2vfmanual` records **50/50 release gates, 813 unit tests and 15/15 expanded normal-origin browser scenarios passing**. See [V22_QA_REPORT.md](V22_QA_REPORT.md) for repairs, retained failures and coverage limits. The user-approved canonical single-ID Article/QCM invariant remains; independent wrapper/document IDs are outside V2.2. Nothing was merged or deployed.

```sh
npm ci
npm run build
npm run preview
```

Use Node >=22.12 and the existing lockfile. For release verification install `requirements-test.txt`, `requirements-pdf-authoring.txt` and Playwright Chromium, then run `npm run test:release`. The offline bootstrap/build is a separately labeled compatibility fallback, never production PDF proof.

## Version History and Agent Review

Open a resource, then use **Version history** on the right rail. Open any immutable snapshot here, in another tab/pane, or in workspace 1-5. **Compare with current** uses the existing A/B reader with Changes, Side by side, A only and B only. **Restore as new version** appends; it never deletes intervening history.

**Agent Review** exports capabilities/context and imports typed ChangeSet JSON. Preview does not save. Stage saves only the proposal. Human acceptance rechecks all selected bases and commits atomically through the same engine used by manual edits. No API key, provider request or hidden synchronization is included.

Settings' complete workspace backup includes current content, history, review audit and historical local attachments. Source ZIPs and GitHub clones do not contain a reader's private workspace database.

Current documentation: `docs/ARCHITECTURE_INDEX.md`. Earlier release reports are preserved under `docs/history/`.
