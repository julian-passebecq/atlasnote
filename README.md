# AtlasNote V2.2.0 - local-first knowledge reader

AtlasNote keeps the existing Notebook, PDF, structured-SVG Cheatsheet, Article and QCM readers inside five independent workspaces. V2.2 adds immutable logical-resource versions, historical A/B Compare, restore-as-new, reviewed provider-neutral ChangeSets and full-history backups.

**This delivery is a candidate, not a production-cleared release.** Compatibility tests pass; integrated dependency/build and real-browser checks remain blocked. See `START_HERE.md` and `V22_TEST_EVIDENCE.md` for exact evidence and limitations.

```sh
npm ci
npm run build
npm run preview
```

Use Node >=22.12 and the existing lockfile. For release verification install `requirements-test.txt` and Playwright Chromium, then run `npm run test:release`. The offline bootstrap/build is a separately labeled compatibility fallback, never production PDF proof.

## Version History and Agent Review

Open a resource, then use **Version history** on the right rail. Open any immutable snapshot here, in another tab/pane, or in workspace 1-5. **Compare with current** uses the existing A/B reader with Changes, Side by side, A only and B only. **Restore as new version** appends; it never deletes intervening history.

**Agent Review** exports capabilities/context and imports typed ChangeSet JSON. Preview does not save. Stage saves only the proposal. Human acceptance rechecks all selected bases and commits atomically through the same engine used by manual edits. No API key, provider request or hidden synchronization is included.

Settings' complete workspace backup includes current content, history, review audit and historical local attachments. Source ZIPs and GitHub clones do not contain a reader's private workspace database.

Current documentation: `docs/ARCHITECTURE_INDEX.md`. Earlier release reports are preserved under `docs/history/` and their original paths.
