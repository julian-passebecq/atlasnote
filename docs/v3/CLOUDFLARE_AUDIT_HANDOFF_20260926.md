# Cloudflare configuration audit handoff

**Prepared:** 2026-09-26 17:45 UTC  
**Prepared by:** GPT-6 Luna Light  
**For:** GPT-6 Pro follow-up analysis  
**Scope:** AtlasNote repository configuration and read-only Cloudflare account metadata. No Cloudflare settings, Workers, policies, secrets, DNS, deployments, or GitHub state were changed.

## Executive finding

The strongest explanation for the recorded authorized-preview failure is the Cloudflare Access policy attached to the QA preview application. The repo requires both an owner allow policy and a Service Auth policy for the automation token. The live QA Access application currently lists only an email-domain **Allow** policy; it has no Service Auth policy. The repo's recorded 2026-09-25 qualification also says requests with the configured service token received HTTP 302 to the Access login, and explicitly leaves the cause as either token value or policy attachment. Current account metadata supports the policy-attachment branch of that diagnosis. A bad/rotated token could still be an additional problem; its value was not inspected.

The expected disposable QA Worker `atlasnote-v23-qa` was deleted on 2026-09-25 according to the repo, and is absent from the current account's Worker-script list. The corresponding QA Access application still exists and targets a `preview_worker` ID. This is consistent with stale QA Access configuration left after Worker cleanup. The active `atlasnote` Worker is a separate resource and has a separate Access application.

## Evidence and confidence

### Live Cloudflare metadata read during this audit

Read-only Cloudflare API calls at approximately 2026-09-26 17:38 UTC returned:

- Worker scripts in the connected account: `atlasnote`, `ducklabms-code`, and `wind`. **No** script named `atlasnote-v23-qa` was listed.
- Access app `atlasnote-v23-qa - Cloudflare Workers` exists, type `self_hosted`, with destination type `preview_worker`. It has a single policy: decision `allow`, include condition `email_domain`, session `168h`. No Service Auth policy appears in the app's policy list.
- Separate Access app `AtlasNote` exists and targets the `atlasnote` Worker. It has one human email allow policy and `24h` session duration. This is distinct from the QA preview app.
- The `atlasnote` Worker has an active 100% deployment. The account metadata's latest version annotation is `AtlasNote V3 main bcd1e0f (PDF previous-page jump fix)` and the prior deployment annotation is `AtlasNote V3 exact main c61f0186`. Both are active production Worker metadata. This audit did not request the deployed site or change deployment state.
- The QA app remains in the Access app list despite the QA Worker being absent by name from the Worker-script list. Treat the app's worker ID as a Cloudflare-internal identifier; this audit did not infer its script name from that ID.

The connected account API calls returned account metadata, policy structure, and deployment/version metadata only. No service-token client ID/secret, API token, Access cookie/JWT, or user content was retrieved or recorded.

### Repository evidence

- `wrangler.jsonc`: Worker name `atlasnote-v23-qa`; compatibility date `2026-09-20`; `workers_dev` and `preview_urls` enabled; Static Assets directory `./dist`; SPA fallback `single-page-application`. This is a QA preview configuration. It does not configure Cloudflare Access.
- `public/_headers`: `nosniff`, `no-referrer`, `SAMEORIGIN`, restricted camera/microphone/geolocation, and private/no-store cache headers including `Cloudflare-CDN-Cache-Control: no-store`.
- `tools/provider-access-contract.mjs`: deliberately whitelists only `$schema`, `name`, `compatibility_date`, `workers_dev`, `preview_urls`, and `assets`; requires preview URLs, `./dist`, SPA fallback, and a global static header rule. It has no Access policy configuration because Access is external to Wrangler config.
- `tools/check-access-build.mjs`: validates Wrangler/static header shape and scans client source for server credentials. Its returned `PASS` explicitly does not prove Access is enabled or correctly configured.
- `docs/v23/PROVIDER_NEUTRAL_ACCESS.md`: specifies exact-origin-only service-token headers (`CF-Access-Client-Id`, `CF-Access-Client-Secret`), a read-only Cloudflare API token for Worker metadata checks, cache isolation, anonymous denial, and an undeployed immutable version-preview requirement.
- `docs/v23/CLOUDFLARE_QUALIFICATION.md`: describes the disposable QA Worker setup and says to create both a human Allow policy and a dedicated Service Auth policy before upload. It prohibits deploying the AtlasNote candidate during qualification.
- `docs/v3/V3_IMPLEMENTATION_STATUS.md` “Preview qualification log”: records that the QA Worker was created, had an initial short period where preview URLs returned unauthenticated HTTP 200, then was mitigated and protected; the AtlasNote version was uploaded but never deployed; the service token then received 302 redirects; owner stopped REL-02 and deleted the QA Worker.
- `.github/workflows/v23-qualification.yml`: ordinary PR/push flow runs portable-core only. Full qualification is dispatch-only and requires preview URL and version UUID. It runs the live release contract and uses secrets only for that check; it does not upload or deploy.
- `.github/workflows/ci.yml`: has a separate dispatch-only integrated release job, also requiring preview URL/version ID. The V2.3 release test gets API/service-token secrets. This workflow contains no Wrangler deploy/upload step.
- `.gitignore`: ignores `.wrangler/`, `.dev.vars*`, `.env*`, and other local/private state. Those ignored directories/files were not read as credentials.

## Likely failure chain

1. The QA preview's anonymous denial can work while token authorization fails: human Allow can authenticate a browser user but does not authorize a service token.
2. The repo's historical run reports exactly that shape: anonymous requests were denied; requests carrying the service-token headers got redirected to Access login. Consequently exact-build, authorized root/deep links, headers, and cache-isolation checks failed; browser/storage follow-on tests were blocked.
3. Current QA app policy metadata shows no Service Auth policy, so the current app policy is insufficient for the intended automation flow. That is the clearest actionable mismatch between repository runbook and live account config.
4. The QA Worker was deleted but its Access app remains. Before retrying, the owner should reconcile the QA app's target with a currently existing disposable QA Worker, and confirm the Service Auth policy is attached to that exact app/preview target.
5. Then check the service token is active and that the Client ID/Secret pair in local/CI secrets belongs to that Service Auth policy. The secret itself was not accessed, so token correctness remains unverified.
6. Issue a fresh harmless placeholder preview, verify anonymous denial and service-token success before uploading AtlasNote, then use a fresh immutable version preview for qualification. Preserve the repo's no-production-deployment boundary and require the candidate version to remain absent from active deployments.

## Credential names, purpose, and removal impact

Claude was probably asking for these because the repository's live V2.3 preview gate is designed to qualify a protected Cloudflare preview. The prompts and qualification code require secrets as environment/CI inputs. They are not needed for normal AtlasNote use, local app startup, or portable-core tests. The Cloudflare Codex plugin's OAuth connection is a separate mechanism; the repo's raw `CLOUDFLARE_API_TOKEN` is not required just to browse Cloudflare account configuration through that plugin.

| Name | What code uses it for | If removed/absent |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Bearer auth to Cloudflare API GET endpoints for the exact Worker version and current deployments. This verifies preview identity/freshness and that the candidate is not active. | Live access-preview gate cannot verify target metadata and will be BLOCKED/FAIL. Does not affect app runtime or public-site serving. The repo specifies a read-capable token. |
| `CLOUDFLARE_ACCOUNT_ID` | Selects the Cloudflare account for the metadata API paths; not a secret. | Same metadata check cannot run. |
| `CF_ACCESS_CLIENT_ID` | Public identifier half of the dedicated Access service token, sent as `CF-Access-Client-Id` only to the exact approved preview origin. | Service-token authorization probe/browser check cannot run. |
| `CF_ACCESS_CLIENT_SECRET` | Secret half of that Access service token, sent as `CF-Access-Client-Secret` only to the exact approved preview origin. | Same as above. Never put it in chat/source/logs. |
| `ATLAS_V23_PREVIEW_URL`, `ATLAS_CF_WORKER_NAME`, `ATLAS_CF_VERSION_ID` | Identify the exact immutable preview and Worker version under test. These are target metadata, not secrets. | Live preview qualification cannot run against an unambiguous target. |

The live account metadata lists one Access service-token object named `claudetestatlas`, created 2026-09-25 and expiring 2126-09-01. The metadata response did not provide an active/disabled status, and this audit did not retrieve its Client ID or secret. The QA Access app policy list still has only its human Allow policy, so the token object alone does not authorize it. The account-level API-token listing endpoint returned `Unauthorized` to the connected API context; therefore this audit could not verify whether `CLOUDFLARE_API_TOKEN` exists in GitHub/local storage, its name, expiry, or permission scope. No secret value was read.

Removing these credentials from local/CI storage is safe for the product, but it intentionally disables the live preview qualification until the owner chooses to set up a replacement. Portable V23 core checks do not need them: `tools/run-v23-release.mjs --portable` omits the live preview gate and the runner strips these secrets from all other individual gates. The live non-portable `npm run test:v23:release` requires them, and `tests/v23_access_preview.mjs` exits before probes if any required credential or target metadata is missing. The inherited workflow strips these credentials from its child commands, and cannot start until a fresh same-source full V23 run is green.

If the owner no longer plans to run the Cloudflare preview gate, they can remove the related GitHub/local secret entries and revoke the dedicated Access service token; consequence: the REL-02 gate remains unavailable/blocked and must be provisioned again before qualification. Revoking the Access token does not change the human browser policy or AtlasNote's current production Worker. If qualification may resume soon, first repair the QA app with a Service Auth policy that includes the intended token, then rerun harmless anonymous and service-token smoke requests; avoid keeping a century-long token if a shorter rotation window suits the test cadence. The repo's runbook already says to revoke/delete the dedicated token after qualification.

For `CLOUDFLARE_API_TOKEN`, first inspect the secret name and scope in GitHub/local secret management (without displaying the value). If no one will run the preview gate, delete/revoke it too. If the preview gate is still wanted, retain or recreate a narrowly scoped, read-only Worker metadata token. Removing or revoking that API token does not authorize or deauthorize the Access preview; it only prevents the test from reading Worker metadata.

## Other relevant configuration observations

- Cloudflare only hosts the static app here. The five IndexedDB stores, authored history, and user data remain browser-local; this repository does not configure D1, KV, R2, Durable Objects, Workers AI, or a custom Cloudflare auth/session backend for AtlasNote.
- Security/cache headers in `_headers` are configuration intent. Actual hosted headers and cache isolation are only proven by the live preview gate, which did not pass authorized requests in the recorded run.
- `wrangler.jsonc` enables preview URLs. That is intentional for disposable QA qualification but is not itself protection. Access is separate. The repo history documents an initial exposure window when previews were enabled before Access was configured; treat it as historical incident evidence, not proof of current access behavior.
- Current active Cloudflare production Worker metadata is newer than this local checkout's `HEAD` (`c61f018f3752ad5c3886b38d8a8c8a554daa4efc`). Cloudflare metadata records a newer `bcd1e0f` deployment. Therefore this checkout's `wrangler.jsonc` and source do not, by themselves, identify the exact currently deployed artifact. No remote source was downloaded in this audit.
- The checkout reports `main` behind `origin/main` by three commits. No fetch was performed; local refs may be stale. Reconcile the intended source revision before reproducing a bug.
- Netlify is currently the repo's documented public online site, while Cloudflare is the active V2.3 managed-access qualification adapter. Do not conflate the Cloudflare QA preview failure with Netlify behavior.

## Suggested next checks for GPT-6 Pro / owner

1. In Cloudflare Zero Trust, inspect the surviving QA Access app and its policy list. Add/repair Service Auth only after confirming the intended disposable preview-worker target; keep the human owner policy separate.
2. Confirm the service token is active, its credentials are the pair supplied to the exact-origin qualification process, and GitHub/local secret names map to the same pair. Never paste values into chat/logs.
3. Confirm the target app covers the version-preview hostname pattern actually used by the fresh versioned `*.workers.dev` preview, and that its Access protection mode is for Previews only as intended.
4. Re-run a harmless placeholder smoke check first: anonymous request denied; service-token request accepted. If token request is still redirected, inspect app target/preview protection scope, then token-policy attachment and token rotation/expiry. Do not weaken the anonymous-denial requirement.
5. Only after that, upload the exact clean candidate as a version preview and run `npm run test:v23:access:preview`, then full `npm run test:v23:release`; run `npm run test:inherited:after-v23` only after same-source complete V23 success.

## Limits

This was a source and account-metadata audit, not a new qualification run. No requests were sent to the production app URL; no browser auth test, service-token test, live response-header/cache test, Worker source download, policy edit, secret inspection, deployment, or cleanup was performed. The repo's September 25 test result is historical and must not be presented as fresh proof for the current Cloudflare configuration.
