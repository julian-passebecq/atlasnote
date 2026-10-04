# V3.1 verification record - 2026-09-26

## Exact candidate

- Application commit: `5631933357b23de984d9b24c94cac0f04faca34f`.
- Tree: `819217bad48f710fe2126ab1dd988a576d7504cb`.
- Integrated build source hash: `6c7022c4d5603136f616070ccb3e82e7c9796279f3472e0149e1b613507e9fa6`.
- Product `3.1.0-rc.1`, database 3, integrated build, clean source.
- GitHub Actions run: https://github.com/julian-passebecq/atlasnote/actions/runs/36273692202
- The run's initial HEAD was the temporary installer commit `f8a8922`; it created
  and tested the exact application commit above before building. The source
  artifact's SOURCE_COMMIT.txt and the browser build identity confirm this.

## Executed results

| Check | Result |
| --- | --- |
| npm ci | PASS, exact committed dependencies |
| typecheck and typecheck:online | PASS |
| npm test | 1142 PASS, 0 FAIL |
| Integrated npm run build | PASS |
| v31_storage_runtime | 5 PASS, 0 FAIL; real IndexedDB on compatibility entry |
| v31_pdf_runtime | 6 PASS, 0 FAIL; real integrated PDF.js |
| v3_runtime | 7 PASS, 0 FAIL |
| v3_pdf_window | 5 PASS, 0 FAIL |
| v3_norsk_daily | 7 PASS, 0 FAIL; synthetic feed only |
| v3_tabs | 4 PASS, 0 FAIL |
| v3_gates | 4 PASS, 0 FAIL |
| v3_pdf_labels | 2 PASS, 0 FAIL |
| pdf_navigation_runtime | PASS, 18 sampled transitions plus independent panes |
| pdf_lifecycle_runtime | PASS |

The 64-page mixed-format fixture traversed physical pages 20 through 28
monotonically while keeping 13 mounted page wrappers. The hidden-chrome return
to the tall preceding page at 75%, 100% and 150% had zero measured painted-frame
drift and zero final bottom gap. These are bounded observations from this fixture,
not a universal proof for every PDF or input device.

The Norwegian flag is an SVG with an accessible button name; the measured button
was 30 by 34 CSS pixels. The artwork is 22 by 16 pixels. The screen and reviewed
Norsk Daily workflow were not renamed or removed.

Recovery tests used isolated profiles. They covered an unreadable future schema,
verified restore with no reload, a competing write during replacement, an epoch
change during staged boot, a same-slot checkpoint conflict, and invalid backup
bytes. Existing owner data was not accessed or reset.

## Retained failure and limitations

All test/build steps in the initial run succeeded, but its final automatic Git
push failed with HTTP 403. Therefore the workflow run as a whole is NOT labelled
PASS. The exact tested commit was subsequently put on the development branch
through the authorized GitHub connector, without changing repository permissions.
The permanent provider-free workflow rechecks actual branch source after that.

Local Chromium refused localhost with ERR_BLOCKED_BY_ADMINISTRATOR. That browser
policy was not changed. The normal-origin browser results above come from the
isolated GitHub runner, not from the blocked local browser.

A later docs-only commit changes the source fingerprint. Consult that commit's
CI for current-source status; do not relabel this earlier exact-build evidence.
The full hosted Cloudflare qualification, native quota gate, the full inherited
release wrapper and physical Windows mouse/trackpad testing are not certified by
this record. The independent portable workflow retains its separate report.

No deployment, Access policy change, token revocation, Netlify reactivation,
private-library publication or user-data migration was performed.

## Reproduce

```bash
npm ci
npm run typecheck
npm run typecheck:online
npm test
npm run build
python tests/v3_runtime.py
python tests/v3_pdf_window.py
python tests/v3_norsk_daily.py
python tests/v3_tabs.py
python tests/v3_gates.py
python tests/v3_pdf_labels.py
npm run test:v31:storage
npm run test:v31:pdf
npm run test:pdf:navigation
npm run test:pdf:lifecycle
```

Install requirements-test.txt and Playwright Chromium before the browser checks.
Use a clean Git checkout; keep failed logs. No Cloudflare secret is needed for
these checks. Do not run an unprotected live preview as a substitute.
