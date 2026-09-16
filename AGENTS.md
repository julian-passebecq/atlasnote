# AtlasNote implementation rules - 1.2.7

Read START_HERE.md, FINAL_TEST_STATUS.md and REQUIREMENTS_COVERAGE.md first. The v2 content-dashboard-qcm handoff supersedes the old library-reader-capture plan.

The exact baseline is f9345c11d98f13d33032666d5148a55a27805742, not main. The requested integration branch is feature/atlasnote-1.2.7-content-dashboard-qcm. This delivery is local source for manual upload: no remote push, merge or deployment has been performed.

Preserve the existing PDF engine, native SVG grammar, stable content IDs, five workspace slots, saved-state boundary, database name/version and backup format. Do not solve migration by resetting personal data. New personal learning/capture data is shared; reading checkpoints cannot erase it. Specialized libraries share Notebook folder identities and create explicit references, not copied content.

Use the exact lockfile. Do not substitute the offline compatibility renderer for the integrated build or normal-origin tests. Do not bypass browser/network policy, weaken CSP, fake IndexedDB, or reinterpret a BLOCKED gate as passing. The component harness is useful but intentionally not durable-storage certification.

Run the complete test:release suite on a supported environment. Keep every failure log. Diagnose any failures with the narrowest change; preserve the intent of older tests when adapting navigation selectors to v2. Read docs/1.2.7/TEST_CHANGES.md before editing regression assertions. No extra capture, learning, exam, cloud-sync or application redesign scope.
