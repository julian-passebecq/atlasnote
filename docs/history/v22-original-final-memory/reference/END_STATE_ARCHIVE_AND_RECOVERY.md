# End-state archive and recovery plan

V2.2 implementation must preserve the distinction between application-source history and user/content history.

## Before Pro implementation

Keep three independent recovery artifacts:

1. exact production source ZIP from Git commit `b50c27a987fa65eee1c51d36225908621e322da7` using `git archive`;
2. full Git repository bundle using `git bundle create ... --all`;
3. one verified AtlasNote V2.1 full-backup ZIP from a test/synthetic profile for migration testing (never publish real private user data).

The Pro model needs item 1 plus this handoff. Item 2 is disaster recovery and does not need to be uploaded unless repository-history archaeology is explicitly required.

## V2.2 delivery archive

The Pro implementation must return:

- complete source ZIP;
- deployable production build ZIP;
- migration report;
- history/agent architecture report;
- changed-file inventory;
- test/evidence report;
- browser evidence package;
- sample V2.1 -> V2.2 backup migration fixture/evidence using synthetic data only;
- machine-readable capability manifest example;
- machine-readable AgentChangeSet examples covering all supported operation families.

## Repository documentation cleanup

AtlasNote currently contains substantial historical documentation whose root wording can be stale relative to production. V2.2 should not delete audit history, but it should make the current entry points unambiguous.

At completion:

- update root `START_HERE.md` to current V2.2 truth;
- update root `AGENTS.md` so future coding agents read the versioning/agent contracts first;
- retain old 1.x/V2.1 docs under historical/release evidence rather than letting stale "unreleased" statements look authoritative;
- add one architecture index linking current versioning, agent interface, storage/migration, backup and PDF Atlas contracts;
- document exact release/source SHA for the final V2.2 candidate.

## Recovery guarantees

A complete V2.2 backup must be sufficient to reconstruct:

- current library content;
- all immutable resource revisions;
- current heads;
- local/private historical assets required by those revisions;
- personal state owned by the full-backup model;
- concepts/references/review audit state;
- workspace sessions and saved states according to their existing boundaries.

A GitHub clone alone must never be described as a full user-data backup.
