# Cloudflare handoff for V3.2 — 2026-10-11

This document separates repository facts from live-account facts.

## What the repository proves

The repo contains:

- explicit local/QA/production Wrangler configurations for Static Assets + SPA fallback;
- `public/_headers` with the reviewed private/no-store and security policy;
- `tools/check-access-build.mjs`;
- provider-neutral Cloudflare contract tests and credential scanning;
- protected-preview qualification tooling.

These checks can validate source/configuration without Cloudflare credentials.

## What requires authenticated Cloudflare access

Before a production deployment, read-only verification should establish:

1. the current `atlasnote` production Worker deployment/version;
2. its exact build identity if available from the served app;
3. production routes/hostname;
4. Cloudflare Access application and policy coverage;
5. anonymous denial on root and static/deep-link resources;
6. authorized app/header observations;
7. the rollback version.

Do not paste Cloudflare API tokens or Access secrets into chat or source files.

## Historical reference only

Repository documentation records a production deploy of source `bcd1e0f`, Worker
version `6f1e75f7`, with rollback to the preceding deployment. That observation is not
fresh enough to authorize a V3.2 deploy.

## Explicit targets and guarded commands

| Target | Configuration | Worker |
| --- | --- | --- |
| Local | `wrangler.jsonc` | `atlasnote-local`, no workers.dev or preview exposure; custom build refuses release |
| QA | `wrangler.qa.jsonc` | `atlasnote-v23-qa`, protected immutable previews |
| Production | `wrangler.production.jsonc` | `atlasnote`, previews disabled; separately authorized release only |

Therefore:

- do not run plain `wrangler deploy`;
- use `npm run dev` for local work;
- do not create a public preview;
- first inspect the authenticated account and intended target;
- use a protected preview/version qualification before any separately authorized
  production promotion.

The fixed release wrapper rejects arbitrary CLI flags and Worker overrides. QA
uses `versions upload` without activating the candidate on the stable QA URL.
Production uses `deploy` only after its separate preflight. Run from the exact
checkout root; custom builds use the invoking working directory.

```powershell
npm run cloudflare:preflight:qa
npm run cloudflare:dry-run:qa
# After target/Access approval and verification only:
npm run cloudflare:preview:qa
# Production preparation; no production release is currently authorized:
npm run cloudflare:preflight:production
npm run cloudflare:dry-run:production
# Future explicit owner authorization required:
npm run cloudflare:deploy:production
```

Set `CLOUDFLARE_ACCOUNT_ID` and `ATLAS_CF_RELEASE_PROOF` (an operator-reviewed JSON
file in ignored `.wrangler/`). The guard is a **local attestation check, not live
Access proof** and not human authorization. No default authorization file exists.
Do not bypass it with raw target overrides or rewritten evidence.

The proof requires `schemaVersion: 1`, `target`, `workerName`, `accountId`, exact
`sourceCommit`, `sourceHash`, `distributionHash` and `checkedAt` within one hour.
Both checkout and integrated build must be clean and match. Compute
`distributionHash()` from `tools/cloudflare-release-guard.mjs` after building;
every shipped asset participates, so changed assets invalidate approval.

`access` requires inspected `applicationId`, exact HTTPS `workerOrigin`, and true
observations `anonymousRootRejected`, `anonymousStaticRejected`,
`anonymousDeepLinkRejected`, `policyReviewed`. QA also requires observed
`versionPreviewCovered` and `ownerPolicyReviewed`. Owner browser login may remain
pending before protected QA preview upload; it is a separate qualification check
and must not be reported as passed until observed. Production requires actual
`ownerAccess: true`. Never write observation fields before performing their checks.

Production additionally requires fresh complete same-source
`docs/evidence/v23/release/results.json`, exact `rollbackVersionId`, and
`ownerApproval` with `sourceCommit`, `distributionHash` and a reference to the
actual explicit production authorization. Each shipped pack still marked
`OWNER REVIEW REQUIRED` requires a separate `publicationApprovals` entry with
`packId`, exact semantic `sha256`, and owner authorization `reference`.
Production permission alone does not approve the seed. Excluding a pack instead
changes the distribution and requires requalification.

Provider automation variables are `ATLAS_V23_PREVIEW_URL`, `ATLAS_CF_VERSION_ID`,
`ATLAS_CF_WORKER_NAME`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
`CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`. Never retain secret values in
source/evidence. Browser email login and machine Service Auth are separate.
Native quota proof requires isolated Linux disk exhaustion, not a browser mock.

## Read-only observations and current blockers

The coordinator's authenticated 2026-10-11 inspection observed production
`atlasnote.datapass.workers.dev`, version
`161c6acc-8418-4af4-a82c-27057b20f7f5`, deployment
`4703ec87-418a-4cfa-bb97-92a617558ff8`, source metadata `9034025`.
Historical previous version: `dcb5be64-f8d3-4369-a15d-6f16826e9cfa`. For a future
release, freshly inspect the then-current production version as the immediate
pre-deployment rollback candidate; no rollback is authorized by this record.
These identify the existing deployment; they do not qualify this modified source.
Production deployment and security changes remain unauthorized.

Initial QA inspection found the Worker absent and a stale Access app pointing
to a deleted Worker, an incorrect email-domain selector and no Service Auth.
The owner subsequently authorized the isolated QA repair proposal. See
[QA_ACCESS_PROPOSAL.md](QA_ACCESS_PROPOSAL.md) and the coordinator's fresh
evidence for the performed QA-only repair and exact canonical preview proof.
Production destinations/policies and stable QA placeholder remain unchanged. Never upload app assets before managed protection, anonymous
denial and owner policy review pass. Verify actual owner login after QA upload.

## Qualification and rollback

CI reports explicit PASS/FAIL/BLOCKED. Portable success with full V23 skipped is
BLOCKED for release. The inherited job requires the reusable PASS output and a
downloaded fresh same-source complete report before its unchanged command list.
All 13 compactor rollback cases remain unchanged. See
[CI_STATUS_20261011.md](CI_STATUS_20261011.md).

Freeze and build once, upload the protected preview, verify owner and service
authorization, run complete same-source V23, then inherited suites. Retain exact
commit/hash/version evidence. Local unit tests and dry-run denials do
not substitute for protected QA or full qualification. Canonical b79e36b has
separate complete remote proof; see [CI status](CI_STATUS_20261011.md). A new
commit (including a merge result) cannot inherit that source identity.

Rollback is a production change requiring explicit authorization. Reconfirm
account and the freshly recorded immediate pre-deployment version, then use
Wrangler rollback with that exact UUID and explicit
`--config wrangler.production.jsonc`. Do not infer that target from a historical
previous-version entry. This does not
restore or erase IndexedDB. Before using a candidate in an existing browser
origin, export and independently verify a manual recovery bundle; never
auto-restore it.

Cloudflare reference checked for this source change:
[Wrangler custom builds/configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).
