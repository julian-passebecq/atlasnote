# V2.2 current verification status

**This coding pass ran zero application tests, QA sessions, typechecks, builds,
release gates or dependency installations. The user explicitly deferred them to
Codex Light. Status: NOT RUN, not PASS and not an environment-blocked attempt.**

Only source reading/editing, documentation, file inventory/hashing and ZIP
packaging operations were performed. Archive readability and file hashes are
packaging checks, not evidence that the application compiles or works.

## Evidence chronology - do not conflate these source states

| Source state | What the supplied records say | Relevance to current source |
| --- | --- | --- |
| Early V2.2 delivery | 797 unit tests; dependency/browser blockers and a failed full release attempt | Historical only; archived root reports preserve it |
| Complete handoff base `60db2cb7504503ac416ddad940441e24f82266b1` | 50 CI command gates passed and integrated browser/build evidence; normal Windows checkout had line-ending failures; exact-byte Windows was 49/50; isolated UTF-8 rerun passed | Later evidence supplied by the user, not re-executed here |
| This completion coding pass | Source modifications and 15 new unit regression specifications; no execution | All checks pending Codex Light |

The handoff's supplemental PDF A/B check used metadata revisions over the same
bytes. It was not a proof of distinct historical PDF asset rendering. Its
portable script is retained only as historical context.

## Required next evidence

Run the targeted completion cases, then the full original 50-command suite and
the browser acceptance matrix in `CODEX_LIGHT_QA_HANDOFF.md`. The unit wildcard
includes the new completion file. Preserve actual failures, all raw gate logs,
source/build hashes, normal-origin storage traces and screenshots. Regenerate
capability/ChangeSet examples from the final tested source, not older outputs.

The next report must say which exact source hash/commit it tested and distinguish
unit fixtures, DOM checks, integrated React-PDF execution and real IndexedDB
migration/restoration. Passing old tests alone does not close the requested new
menu, comparison, review-safety and distinct-byte PDF cases.
