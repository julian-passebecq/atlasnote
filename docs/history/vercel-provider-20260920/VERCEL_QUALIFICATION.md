# Qualify a protected disposable Vercel preview

No production target or alias is authorized by this migration. No app/database or
GitHub repository needs to be recreated. The supplied source is React + Vite, not Next.js.

## Provision safely

Using an authorized Vercel account, create/select a disposable AtlasNote QA project
without modifying unrelated projects. Configure managed Vercel Authentication / Deployment
Protection for the intended preview scope **before** uploading any candidate. Confirm
protection from an anonymous session. Do not disable protection to make tests pass.
Keep its project/team IDs as non-secret CI variables. This project must not be used as
production, and the immutable preview hostname, not a production/custom-domain alias,
is the qualification target. Plan/scope capabilities must be checked in the actual
account, not assumed from this repository. No custom auth fallback is implemented here.

Build the clean exact candidate with the supplied `vercel.json`, `npm ci`,
`npm run build` and output `dist`. Prefer a prebuilt preview from the real checkout:
authenticate the reviewed Vercel CLI, link **only** the disposable QA project, run
`vercel pull --environment=preview`, `vercel build`, and `vercel deploy --prebuilt`.
The local Vercel build invokes the existing build command with Git metadata available;
the prebuilt deployment uploads that exact output rather than rebuilding different bytes.
Never pass `--prod`, promote, alias production or modify a production project. Do not
run deployment commands before confirming the linked project, managed protection and
preview target. The qualification runner itself performs read-only HTTP requests.

`build-identity.json` includes the exact Git SHA and deterministic source fingerprint;
it has no volatile build timestamp. The complete identity must match the local integrated
build. A source ZIP by itself has no Git ancestry. A remote build without the actual Git
checkout must not invent environment SHA overrides or relabel compatibility output.
Use the local prebuilt path instead. Stale metadata, a production target, missing Git
provenance or a different source/build identity blocks qualification.

## Inputs (environment only)

- `ATLAS_V23_PREVIEW_URL`: fresh immutable HTTPS `*.vercel.app` origin, without a path,
  query, fragment, embedded user/password or custom production alias.
- `ATLAS_VERCEL_TEAM_ID` and `ATLAS_VERCEL_PROJECT_ID`: team/project scope, recommended.
- `VERCEL_TOKEN`: authorized API credential used only to inspect live deployment metadata.
- `VERCEL_AUTOMATION_BYPASS_SECRET`: supported preview-protection automation credential.
  Enter credentials using secure environment/CI secret management, never in chat or files.
- `ATLAS_V23_NATIVE_QUOTA=1`: mandatory native Linux proof during the full release.
  `ATLAS_V23_QUOTA_SUDO=1` allows noninteractive sudo for mounting only on a disposable
  Linux runner. See `NATIVE_CAPACITY.md`.

Run, from the same clean checkout and integrated build:

```sh
npm run test:v23:provider:unit
npm run test:v23:release
npm run test:inherited:after-v23
```

The last command refuses to start unless every required gate passed freshly for the
same clean commit/source hash. A failed or absent prerequisite is not inherited success.
`npm run test:v23:core:portable` excludes the hosted provider and native-capacity proof;
its explicit portable result is never a full release. All core runtime suites still
require an exact integrated build. The separately named access diagnostic uses the
compatibility build and is not an acceptance substitute.

## Evidence and cleanup

The live provider runner records 13 required rows: fresh READY non-production metadata,
exact build, anonymous root/static/deep denial, authorized root/deep access, headers,
post-authorization cache isolation, exact five-store auth-transition equality,
secret scope, invalid-authorization denial and browser sanity. HTTP bodies, cookies,
login redirects with state, auth headers, HAR and browser storage-state files are not
retained. Screenshots show only the authorized synthetic AtlasNote app, never login UI.

After all qualification and permitted inherited tests finish, delete the **disposable
preview only** using an authorized Vercel operator. Record its ID, deletion response,
subsequent 404/absence and any temporary project/bypass-setting cleanup. Do not delete
unrelated resources or production. An inability to create or clean up a preview must
be reported, never replaced with fabricated metadata/screenshots/deletion receipts.

## CI

`v23-qualification.yml` has a portable core job and a mandatory full V23 job with the
native proof. `.github/workflows/ci.yml` requires that workflow to succeed before the
unchanged inherited command order begins. Dispatch with a fresh exact preview URL.
Automatic push/PR runs with no preview credential/URL cannot certify a release and
remain non-green. No workflow creates deployments or writes GitHub. Re-publishing this
source under a new owner commit requires a new build/preview and fresh qualification.

Official references consulted for this migration (2026-09-20):
- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/deployment-protection
- https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
- https://vercel.com/docs/cli/deploy
