# Native filesystem-capacity rollback proof

The preserved proof uses a **disposable 256 MiB tmpfs filesystem** as a fresh Chromium
profile. It fills only that mount until actual ENOSPC, allows the unmodified optimistic
preflight, observes a real trusted IndexedDB transaction abort with FILE_ERROR_NO_SPACE,
releases capacity, and compares every key/value/byte in all five stores before, after
and after reload. Passive debugger logpoints are not injected storage failures. The
existing compactor's 13 independent fault cases and four capacity boundaries remain.

Requirements: disposable Linux runner, mount/umount capability (or explicitly opted-in
noninteractive sudo), installed Chromium/Playwright, exact clean integrated `dist` and
the pinned dependencies. Windows may still invoke the retained WSL path. A restricted
container without CAP_SYS_ADMIN cannot perform this native proof merely because its
process runs as root.

```sh
npm ci
npm run build
python -m pip install -r requirements-test.txt
python -m playwright install --with-deps chromium
npm run test:v23:native-capacity
```

Set `ATLAS_V23_QUOTA_SUDO=1` only on an authorized disposable Linux runner where mount
needs sudo. Set `ATLAS_V23_NATIVE_QUOTA=1` for the full V23 runtime/release runner to
invoke the native proof. `ATLAS_EVIDENCE` selects an output directory. `CHROMIUM_PATH`
may select a genuine installed Chromium executable; it is never a browser-policy bypass.

The script verifies it mounted its own bounded tmpfs **before writing filler bytes**,
never fills an ordinary host directory, closes its browser/server, unmounts and removes
its temporary directory in finally. Cleanup failures remain failures. Inspect `probe.json`
for mount, source identity, native events, five-store equality and cleanup. Missing mount,
browser or integrated-build capability is BLOCKED, not PASS. Never substitute a monkey-
patched quota API, injected QuotaExceededError or previous candidate's report.

Portable core execution is available separately as `npm run test:v23:core:portable`.
It deliberately does not claim this native proof. The full release and inherited-workflow
prerequisite still require native evidence freshly produced for that exact source.
