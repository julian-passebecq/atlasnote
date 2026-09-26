# Codex Light / Cloudflare follow-up for AtlasNote V3.1

Prepared 2026-09-26. Source work is on `fix/atlasnote-v31-stabilization`.
Start from its current head and read VERIFICATION_20260926.md. Do not restart
from an earlier QA branch or assume the product version equals IndexedDB version.

## Read-only first

1. Read the active production Worker `atlasnote` deployment/version metadata.
   After an owner browser login, read build-identity.json and compare sourceCommit,
   sourceHash, appVersion, buildKind and sourceDirty with the intended artifact.
2. Check anonymous denial on root, content.json, build identity and a deep link.
   Check authorized responses and their actual headers separately. A 302 login
   response is not proof that the app assets or their headers are correct.
3. Keep production Access distinct from the former QA preview Access app. The
   previous audit observed no QA Worker and a surviving QA app without Service
   Auth. Treat that as dated evidence until rechecked.
4. Inventory token consumers by names/scopes only. Do not display or retrieve
   values. CF_ACCESS_CLIENT_ID/SECRET are QA automation credentials, not PDF
   scrolling parameters. Do not revoke CLOUDFLARE_API_TOKEN without checking
   whether deployment or other automation uses that same token.

## No automatic changes

This handoff does not authorize production deployment, policy edits, token
revocation, new public preview exposure, or Netlify activation. Keep the owner
Allow policy. Keep REL-02 BLOCKED unless freshly qualified; never skip it and
then claim the gate passed.

The repository Wrangler configuration still points at `atlasnote-v23-qa`.
Do not run plain wrangler deploy. Before any separately authorized deployment,
show the exact Worker name, clean source commit, integrated dist identity,
preview_urls setting, existing Access coverage and rollback version. Test a
harmless protected preview before placing application content on a new target.

No PDF or private backup is part of the server deployment. Browser data remains
local to its origin. Changing a host does not migrate that data.

## Owner PDF validation after an explicitly approved candidate deployment

Use the affected PySpark/Pandas PDF, first Single with hidden controls, then
Spread and Continuous. Exercise slow detents, fast wheel bursts, reversal,
previous-page turns, direct page input, rotation and two visible panes. Record
which browser tabs share a workspace. Export navigation trace v2 immediately
when a problem occurs; keep the build identity. It reports requested and actual
scroll displacement, not PDF text or credential values.

Return a dated report separating source tests, account metadata, anonymous HTTP,
authorized browser observations and physical-device observations. Do not claim
that a source push changed the currently served Worker.
