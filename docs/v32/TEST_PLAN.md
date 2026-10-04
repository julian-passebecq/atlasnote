# AtlasNote V3.2 test plan

The V3.2 source pass is intentionally separated from qualification.

## Manual workflow

`.github/workflows/v32-web-study.yml` has only a `workflow_dispatch` trigger.
Normal pushes and pull requests do not start it.

The workflow must run against the exact candidate commit and retain the integrated build
and browser evidence.

## Required checks

1. `npm ci` from the committed lock.
2. `npm run typecheck`.
3. `npm run typecheck:online`.
4. `npm test` — all inherited Node tests plus the new Norsk tests.
5. `npm run check:access` — repository/provider boundary only.
6. `npm run check:v23:secrets`.
7. integrated `npm run build`.
8. `npm run check:v23:build` against the exact clean commit.
9. retained V3 browser suites.
10. V3.1 IndexedDB/PDF runtime suites.
11. PDF navigation and lifecycle suites.
12. updated `tests/v3_norsk_daily.py`, including:
    - reviewed synthetic import;
    - newspaper mode;
    - topic filter;
    - `/` search focus;
    - search by English and Norwegian/vocabulary;
    - NO/EN Focus layout;
    - learning progress;
    - vocabulary;
    - QCM;
    - reload persistence.

## Owner checks after green CI

On the owner's browser, using a disposable or backed-up profile:

- existing notes/PDFs/workspaces still open;
- duplicate A/B PDF readers remain independent;
- physical wheel/trackpad behavior remains acceptable;
- Norsk Daily newspaper is compact at normal desktop width;
- Focus mode is readable at the chosen font size;
- no unexpected IndexedDB migration occurs.

## Cloudflare is separate

Green source/browser CI is **not** proof of the currently served production Worker or
Cloudflare Access policy. Live account qualification is a later, explicit step.

Do not deploy as part of this workflow.
