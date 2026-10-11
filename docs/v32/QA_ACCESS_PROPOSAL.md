# QA Access repair proposal — 2026-10-11

Status: **Owner approved QA-only repair on 2026-10-11; repair performed and
canonical protected preview independently qualified**. Exact candidate evidence
is in [CI status](CI_STATUS_20261011.md); later identities require fresh proof.

Read-only Cloudflare inspection authenticated the account
`1051e2f49d2be893b07245b1e3dced51`. The production Worker `atlasnote`
is active at `atlasnote.datapass.workers.dev`, version
`161c6acc-8418-4af4-a82c-27057b20f7f5`. Its owner policy and deployment are
outside this change.

Initial discovery found the former `atlasnote-v23-qa` Worker absent. Access application
`17fb44cb-3994-4311-8cc1-62e3d6d0fd3d` still targets deleted Worker
`5243815738d742bcaee5401d6fed39d4`. Its reusable allow policy contains
`email_domain.domain = julianpassebecq@gmail.com`, rather than an email selector.
No Service Auth policy is attached. This explains why the historical setup
cannot establish current QA qualification; it does not prove the exact cause
of every historical authentication failure.

## Proposed authorized operations

1. Bootstrap only `atlasnote-v23-qa` with a harmless deny-response placeholder,
   no AtlasNote assets and no custom route/domain. Record its new Worker tag.
2. Create a dedicated QA Access application with a `worker` destination using
   that new tag, protecting both its stable URL and version previews. Leave the
   stale application and reusable policy intact rather than altering a policy
   potentially shared elsewhere.
3. Attach an allow policy with the exact email selector
   `julianpassebecq@gmail.com`, a 24-hour browser session, and no bypass rules.
4. Create a dedicated expiring QA service token and attach only its ID to a
   Service Auth policy on this new QA application. Store its secret in secure
   local/CI environment management; never retain it in source, chat, evidence,
   browser storage state, screenshots or logs.
5. Require anonymous rejection on root, static and deep-link paths before
   uploading the clean candidate as a preview-only version. Verify service
   authentication and ask the owner to verify browser login. Do not activate
   the AtlasNote candidate on the stable QA URL during preview qualification.
6. Run same-source V23 qualification; full inherited qualification stays locked
   until all 13 V23 gates pass. Missing native quota or machine credentials
   remain BLOCKED.

No production deployment, production Access change, resource deletion, DNS
change or content-publication approval is included. Retain QA evidence and
resources for review; subsequent deletion/revocation requires its own scope.

## Performed QA repair

Created only `atlasnote-v23-qa`, new Worker tag
`c4c1f982f6e44a518db199a04917666e`, placeholder version
`5cd3a945-9aba-46cf-8d92-0dac1197a991` (no app assets). Created dedicated
Access application `14babb55-3077-489d-9c6b-52e6b0aac0ba` using a Worker-wide
destination, exact owner-email allow policy and a dedicated 24-hour Service Auth
token. The stale application/reusable policy and production were untouched.

Root, representative static and deep-link probes on both the stable QA origin
and placeholder version preview returned 302 to Access anonymously; Service
Auth returned the intended 503 placeholder. Credentials are encrypted locally
with Windows DPAPI in an ignored owner-only path. No token values are in this
document or evidence. The owner confirmed earlier candidate login; Computer Use
subsequently opened canonical 4f87a067 through the existing owner Chrome SSO
session. That observation is not a new credential challenge, physical-input
validation or production owner-access proof. Dedicated Service Auth expires
2026-10-12 at 15:38:24 UTC; expiry must never be hidden or bypassed.

Cloudflare documents Worker-wide `worker` destinations and preview-only
`preview_worker` destinations in [Workers Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
Service Auth is separate from interactive browser login; see
[service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/).
