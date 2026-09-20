# AtlasNote V2.1.0 production baseline

Authoritative main merge commit:

`b50c27a987fa65eee1c51d36225908621e322da7`

Package version on main:

`2.1.0`

Production URL:

`https://atlasnotej.netlify.app`

V2.1 release evidence before V2.2 work:

- PR #15 merged to main.
- Production Netlify deployment reached READY from the merge commit.
- Main production-release GitHub Actions run completed successfully through every retained gate.
- Final local repair pass reported 715/715 unit tests and 46/46 local release gates.
- Production real-browser QA passed core startup, Dashboard, Notebook, all PDF layouts, Article QA-01, QCM QA-03, Quick Capture, References, Compare, persistence and backup generation.
- Initial 390x844 production acceptance was blocked only by the Netlify-injected Powered by Netlify badge covering Workspace States.
- The badge was disabled at the Netlify project level; targeted production retest then passed twice at 390x844 and at 800x900, 1100x800 and 1440x900, with no badge iframe and no captured console/network errors.

Known non-blocking V2.1 notes:

- Reader Guide has stale wording describing an older offline/non-React-PDF build; safe to clean up in V2.2 if trivial.
- A MutationObserver exception seen in ChatGPT/Electron preload was traced to host preload code, not AtlasNote.
- Historical Mermaid transitive SBOM/license provenance closure remains an inherited review limitation; current vulnerability audit was green.

Do not add application CSS to work around the removed Netlify badge.

## Current persistence architecture

Before V2.2:

- raw IndexedDB database: `knowledge-atlas` version 2;
- stores: `imports`, `overlays`, `personal`, `assets`;
- full backup uses the existing atlas-transfer ZIP envelope and workspace backup schemas 2/3;
- Workspace States are bounded session/layout snapshots and deliberately do not freeze/restore current library content;
- ResourceTarget is the canonical exact target family;
- Concept Index and semantic references live in optional personal semantic state and compute backlinks rather than persisting a backlink mirror.

V2.2 intentionally introduces the first new raw IndexedDB store/version since stabilization.
