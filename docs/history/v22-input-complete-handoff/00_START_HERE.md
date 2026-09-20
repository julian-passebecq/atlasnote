# AtlasNote V2.2 complete continuation handoff

This package contains the actual audited source, audited production build, specifications, findings, raw evidence, and the remaining work. It is sufficient to continue without the old conversation or another source export.

**Status: completion work has NOT been applied. This is not a finished release.** The user cancelled implementation and requested this ZIP instead. The supplied next-task prompt is a draft for a future task, not authority to execute it automatically. No code changes, commits, pushes, merges or deployments were made during this handoff preparation.

## Read in this order

1. `01_CURRENT_STATUS.md` — what is verified now, including later CI and Windows diagnosis.
2. `02_WORK_TO_FINISH.md` — ordered fixes and acceptance criteria.
3. `03_REPRODUCE_AND_DELIVER.md` — setup, reproduction, evidence and delivery.
4. `requirements/final-memory/01_FINAL_V22_CONTRACT.md` and its reference contracts.
5. `reports/AUDIT_REPORT.md` and `reports/V22_COMPLETION_CHECKLIST.md`.
6. `source/AGENTS.md` and the entry-point architecture/migration/ChangeSet/PDF Atlas documents it identifies.

`04_NEXT_TASK_PROMPT.txt` is a suggested prompt the user can paste into the next coding session.

## Package map

- `source/`: complete tracked source at audited commit **60db2cb7504503ac416ddad940441e24f82266b1**, exported directly from Git. Exact committed bytes, no working-tree CRLF conversion. No Git metadata or installed dependencies.
- `build/AUDITED_CANDIDATE_60db2cb_NOT_FINAL/`: successful GitHub CI production artifact for that same commit, for inspection/reproduction. It does not include pending fixes and must not be passed off as the final release.
- `requirements/`: extracted final-memory and original audit handoffs. Their old environment-blocker and no-Git claims are historical; current measured status below supersedes them. Their product requirements remain references, subordinate to the user's request and project working agreement.
- `evidence/`: complete retained laptop attempts, Linux CI artifact evidence, UTF-8 recheck, diagnostic captures and supplemental scripts/results. Failed runs were preserved.
- `reports/`: independent audit and completion assessment.
- `git/`: exact source identity, commit descriptions and the seven later commits' combined patch. The patch is already included in source; do not apply it there again.
- `tools/`: portable launcher version of the supplemental browser checks; original exact scripts remain in evidence.
- `original-uploads/`: both user-supplied ZIPs unchanged.
- `MANIFEST.json`, `SHA256SUMS.txt`: inventory and checksums.

Only repository/demo content and synthetic test profiles/backups are included. This is not a backup of the user's real browser IndexedDB or private library. A real-profile upgrade should be preceded by a locally retained full workspace backup.
