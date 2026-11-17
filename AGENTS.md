# AtlasNote (V3.2 line)

The older AtlasNote web study app (React + Vite, browser IndexedDB, manual checked backup and restore). Current work happens in `atlasnote-v33` (AtlasNote V4); read this repo for history unless a task names it. `START_HERE.md` and `README.md` describe this line.

## Build and test
- `npm test` (builds the offline bundle first), `npm run typecheck`, `npm run validate`; `npm run check:release` for a release.
- CI: .gitlab-ci.yml runs portable source checks on the imac runner through the private juliandatapass-group/atlasnote mirror. GitHub stays canonical; quote the GitLab pipeline link in PRs. Existing GitHub Actions and manual release qualification remain in .github/workflows/.

## What to protect
- His study data in the browser: every authored write goes through `WorkspaceStore` and the history engine, restore appends a new version, and a migration never resets an existing profile.
- No automatic restore, reset or history erase, and no deploy or publication unless he asks.
- PDF Atlas stays metadata only: no public PDF binaries.

How work flows: the fleet guideline every session loads (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`). CI recipe and runners: datapass-fleet-facade `AGENTS.md`.
