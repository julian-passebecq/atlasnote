# AtlasNote V2.2 - executed Windows QA candidate

Read [V22_QA_REPORT.md](V22_QA_REPORT.md) for the actual repairs, 50/50 release
gates, 813 unit tests, 15 expanded browser scenarios, artifacts and scope limits.
The integrated build is newly generated. No remote push, merge or deployment
occurred; no existing user browser profile was reset.

One handoff requirement conflicts with the current schema: separate Article/QCM
document and wrapper IDs. The established equality rule remains enforced. The
user explicitly retained that invariant during QA. Independent document IDs are
outside V2.2; the handoff wording is a documented, accepted bounded exception.

Original coding-only reports and received source manifest are preserved under
`docs/history/v22-before-qa-20260918/`. `SOURCE_MANIFEST.json` describes this
delivery; the original recorded baseline is not used as its source identity.

Use Node >=22.12 to build: `npm ci`, `npm run build`, `npm run preview`.
The existing five-subject/type/workspace architecture, canonical targets, shared
history engine, reviewed writes and metadata-only PDF Atlas contract remain.
