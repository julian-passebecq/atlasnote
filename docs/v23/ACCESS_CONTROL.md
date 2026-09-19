# Single-owner Netlify Edge access gate

Status: **BLOCKED for release** until the complete provider matrix is qualified.
The final-finish branch uses a disposable Deploy Preview on PR #21. At commit
`36dd84a43f9451ba0890b8c67bbbbd42ec184687`, Netlify confirmed deploy
`6aaf19477323b500081c7336`, context `deploy-preview`, no production publication and
three Edge Functions. That historical observation is not evidence for a later SHA.
Current provider probes bind the candidate SHA to the Netlify status, bot comment and
immutable deploy identity before making HTTP assertions. Missing target/identity or
transport failure is BLOCKED, never proof of fail-closed authentication.

No access key, verifier or other Netlify environment variable was created, replaced,
read or deleted during this final-finish pass. No production deployment was requested.
Anonymous denial/method/origin checks do not certify configured secure cookies,
rotation, expiry, authenticated cache isolation, logout or rate enforcement. Those
remain required even when the three functions are recognized. See the exact-current
report and cleanup record in the delivery; never infer successful cleanup from a
closed pull request alone.

## Scope and threat model
The gate protects the remotely served application shell/assets/deep links, not encryption
of local IndexedDB, browser disk, backups or a public source repository. A person with
control of the unlocked OS/profile can read local data or copy sessions. Lock cannot
revoke pages already loaded in another tab or previously copied content. Use an OS
password, full-disk encryption and protected external backups. No claim of multi-user
accounts, cloud authorization, client file-key discovery, refresh-token revocation,
remote wipe or data synchronization is made.

## Server-only format
Owner helper generates 32 cryptographically random bytes, base64url encoded with an
`atlas1_` prefix (256-bit random key). Runtime stores only its lowercase SHA-256
verifier in `ATLASNOTE_ACCESS_KEY_SHA256`; never `VITE_*`. The verifier is itself
sensitive: this implementation also uses it as the server-only HMAC signing material
with the `atlasnote/session/v1\0` message domain. No additional signing-secret setup
is required. Disclosure of the verifier permits forging sessions; rotate it on leakage.

Session is base64url JSON {v:1,iat,exp,aud,nonce}, dot, base64url HMAC-SHA256.
Canonical encoding, signature, exact fields, time bounds and exact HTTPS origin are
checked. Default expiry is 30 days; optional ATLASNOTE_SESSION_DAYS accepts integers
1..90. A valid cookie cannot extend itself. Cookie is `__Host-atlasnote_session`,
Max-Age, Path=/, HttpOnly, Secure, SameSite=Strict, without Domain. No key in browser
localStorage, URL, client JavaScript, source map or signed payload.

## Routing/fail closed
Three Edge files, discovered from `netlify/edge-functions`, outside publish directory:
`atlas-auth` protects `/*`; only exact unlock and lock paths are excluded.
`/__atlasnote_unlock` is a terminal same-origin HTTPS POST endpoint with one bounded
URL-encoded key field. `GET`, wrong origin/path/media type, duplicate/oversize fields
and bad keys fail generically. Success sets the cookie and redirects to `/`.
`/__atlasnote_lock` is terminal same-origin POST and expires only that cookie.

Missing/malformed runtime config, unavailable crypto, invalid/expired/ambiguous cookie
or handler errors never continue to static content. Wrappers use `onError:'fail'`, never
bypass or a static custom error rewrite. Both build commands check function declarations
and client-secret exclusion before compiling. Removing a function invalidates the build.
Provider discovery must be verified on the same candidate as the tests. A manually
uploaded static dist without Edge Functions would be ungated and is NOT a supported
deployment.

No Edge cache opt-in. Authenticated and rejected responses enforce browser/CDN no-store
and Vary:Cookie; pre-existing application security/PDF headers remain intact. An unlock
attempt has one platform code-based rate rule: 5 requests/60 seconds, aggregated by
IP and domain. This consumes one rule and does not throttle authenticated asset loads.
Provider limits are defense-in-depth, not a globally atomic brute-force counter or a
substitute for key entropy. Distributed IPs and delayed enforcement remain possible.
No in-memory per-isolate limiter is misrepresented as globally effective.

## Manual owner setup, only after QA
1. Use a trusted local Git checkout. Run `npm run access-key:generate -- --save` in a
   private interactive terminal. CI/pipes/redirection are rejected. `~/.atlasnote/`
   must be a real private directory; a new key file is exclusive mode 0600 on POSIX,
   directory 0700. Windows permissions depend on the owner's protected home/ACL.
   The fixed location is outside this repository; local key patterns are gitignored.
   Existing files/symlinks are never overwritten. Without --save the private key is
   printed only to the interactive terminal; protect terminal scrollback.
2. Keep the key privately. Copy only the displayed verifier to Netlify environment
   configuration as ATLASNOTE_ACCESS_KEY_SHA256. Use Functions scope where available,
   not build/client variables, source files, netlify.toml or CI artifacts. Avoid logging
   request bodies/environment objects. Preview configuration must be separate from
   production and use disposable non-production key material.
3. Build from this Git candidate with `npm ci`, `npm run typecheck:online`, `npm run build`.
   Run `netlify build` in a disposable local linked/preview QA setup where the CLI is
   installed. Inspect actual three-function manifests, exclusions and rate rule. Verify
   all paths/caching/cookies on HTTPS, both missing and valid runtime configuration.
   Netlify Free code-based rate rules are supported, but actual plan accounting and
   provider warnings must be checked. No Pro shared-password feature is used.
4. Only after all gates pass and the owner approves, deploy using the full source build
   (never static drag-and-drop alone). Paste the private key once into the form. The
   HttpOnly cookie remembers that browser; browser code never reads arbitrary files.

## Rotation/recovery
Generate a NEW key after privately moving the old file (helper refuses overwrite),
replace the runtime verifier and redeploy the affected contexts. This invalidates old
signed cookies. Changing only a local text file has no effect on the server. Lost key:
use your Netlify owner access to rotate; no data is cleared and no browser bypass exists.
Lost Netlify owner access is an account-recovery issue, not recoverable from an app key.
Revoking one browser without rotating others is outside this stateless single-owner scope.
When temporarily unavailable/misconfigured, leave the deployment fail closed; do not
remove middleware. The existing workspace remains local and unmodified.

## Primary source references (checked 2026-09-19)
- https://docs.netlify.com/build/edge-functions/optional-configuration/ : source outside
  publish directory, no caching for auth middleware, onError fail versus bypass.
- https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/ : inline
  code rules, aggregateBy IP/domain, Free availability, delayed enforcement caveats.
- https://docs.netlify.com/build/edge-functions/environment-variables/ : Netlify.env.get,
  Functions scope and deployment-time configuration snapshot.
These references support configuration design, not proof of successful deployment here.
