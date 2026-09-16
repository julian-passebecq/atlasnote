# Workspace ready for manual V2 integration

The complete editable source directory is `/mnt/data/atlasnote-v2` in the delivery workspace. The full source ZIP contains one root folder; copy its **contents** into your existing repository working directory. Preserve `.git` and any untracked private files/backups. Do not upload the ZIP file as if it were application source, and do not nest the root folder one level below the repository root.

## Exact identities

- Input archive: AtlasNote_1.2.7_Content_Dashboard_QCM_Source.zip.
- Input SHA-256: `4b5659990b128b307aac23016d9836d1c7208891a6674a5def1813af2daeeb71`.
- Starting source tree: `4217bc24a2719f5849fdbd894bd464b329dd6ae7` (483 files).
- Upstream matching source commit: `0c4455f8ca25eb16c882287a4dc61ddfc32f5b89`.
- Upstream corrected 1.2.6 parent: `f9345c11d98f13d33032666d5148a55a27805742`.
- Local tracking baseline: `206c0e88d478171edefe9600907dd7866146d6f0`. This synthetic local snapshot is not an upstream branch head.
- Requested V2 branch: `feature/atlasnote-v2-reference-knowledge-system`, created locally only.
- Final commit, full source tree and artifact SHA-256: see the external delivery manifest. They are not embedded recursively into their own commit.

## Safe route in an existing clone

Save current local changes first. Fetch, verify the intended 1.2.7 source, then create a new test branch. Do not reset or overwrite an existing branch containing other work.

```sh
git fetch origin
git switch -c feature/atlasnote-v2-reference-knowledge-system 0c4455f8ca25eb16c882287a4dc61ddfc32f5b89
# Copy the contents of the delivered source root into this repository root.
git status --short
git diff --check
# Review CHANGED_FILES.md and the actual diff before staging/committing.
```

If this branch already exists, inspect it rather than force-resetting it. All delivered changes are tracked source/docs/tests; generated dependencies/builds and private state are excluded. Review the resulting source diff before committing and pushing your test branch yourself.

The next release action is an integrated test run, not an immediate main merge or production deployment. FINAL_TEST_STATUS.md records unresolved production/PDF/persistence verification. Nothing in this delivery changed GitHub, Netlify, a production origin or user personal state.
