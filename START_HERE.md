# Start here - AtlasNote V2

This is the implemented V2 source tree, not a task-only archive. It supersedes the old 1.2.7 root-level continuation instructions for this delivery, but preserves the completed 1.2.7 application/content.

## Exact starting source

Bundled `AtlasNote_1.2.7_Content_Dashboard_QCM_Source.zip` SHA-256:
`4b5659990b128b307aac23016d9836d1c7208891a6674a5def1813af2daeeb71`

Its 483-file Git tree is `4217bc24a2719f5849fdbd894bd464b329dd6ae7`, matching the manually uploaded 1.2.7 source at remote `0c4455f8ca25eb16c882287a4dc61ddfc32f5b89`. Its predecessor is corrected 1.2.6 `f9345c11d98f13d33032666d5148a55a27805742`. A local snapshot commit was used only to track the bundled baseline; it is not an upstream release commit.

Working branch: `feature/atlasnote-v2-reference-knowledge-system` (local only).

Read V2_REFERENCE_MODEL.md, REQUIREMENTS_COVERAGE.md, FINAL_TEST_STATUS.md, then docs/v2/USER_GUIDE.md. The separate delivery manifest records the final local commit/source ZIP hashes; the ZIP does not contain `.git`.

## Do not restart or publish automatically

Preserve the independent Notebook structure, manual pins, content types/subjects, current raw IndexedDB database, full-backup envelope, workspace snapshot boundary and all meaningful tests. Do not infer native release approval from compatibility tests. Do not merge to main or deploy until the integrated gates actually pass and release is authorized.

The remaining work is release verification in a normal dependency/browser environment, plus any defects those tests demonstrate. It is not another application rewrite.
