# PDF next pass — preserve and finish the existing implementation

The current repository already contains two PDF paths.

## A. Offline/browser fallback

`src/pdf/PdfReader.tsx`

This path is deliberately honest. It:
- preserves imported PDF bytes;
- requires consent before an external URL is requested;
- offers browser preview/open/download;
- explicitly says advanced Atlas PDF controls are unavailable in the fallback.

Keep it as a recovery path.

## B. Integrated React-PDF engine

`src/online/PdfEngine.tsx`

Do **not** rewrite this from scratch unless tests prove it structurally unusable.

It already implements:
- worker-version compatibility check;
- single physical page;
- continuous physical pages;
- physical two-page spread;
- optional cover-alone spread;
- physical page navigation;
- zoom;
- 90-degree viewer rotation combined with intrinsic PDF rotation;
- outline;
- selectable-text search;
- bounded search for very large PDFs;
- image-only/no-selectable-text message without inventing OCR;
- password request/retry/cancel;
- memory-only password handling;
- lazy rendering in continuous mode;
- physical-page anchors suitable for revision-aware remarks.

## Supporting files

- `src/pdf/physical-pages.mjs`
- `src/online/entry.tsx`
- `src/online/react-runtime.ts`
- `src/online/pdf.css`
- `tools/enable-online.mjs`
- `tools/build-vite.mjs`
- `vite.config.mjs`

## Enable/build sequence

The existing repository currently uses an optional network-enabled build path.

1. Run the base app gates first:
   - `npm ci`
   - `npm run validate`
   - `npm run typecheck`
   - `npm test`
   - `npm run check:release`

2. On a machine allowed to reach npm:
   - `npm run enable:online`
   - inspect the resulting exact `package.json` / `package-lock.json`
   - `npm run build:vite`

3. Confirm that the copied `pdf-assets/engine.json` PDF.js version exactly matches the `pdfjs.version` used by React-PDF.

4. Serve the actual production build on an HTTP origin. Do not certify PDF.js through the opaque DOM harness.

## Runtime PDF acceptance

Test at minimum:

- normal 5+ page PDF;
- mixed portrait/landscape;
- intrinsically rotated page;
- odd number of pages;
- selectable text;
- image-only page;
- document outline;
- internal link;
- external link;
- password-protected PDF;
- wrong password then correct retry;
- corrupt/non-PDF bytes;
- missing asset;
- missing worker;
- note + PDF Compare;
- PDF + PDF Compare;
- local PDF byte persistence after reload;
- complete backup -> fresh context -> exact PDF byte restore.

Required UI:
- Single
- Continuous
- Physical-page spread
- Page number
- Previous/Next
- Zoom
- Rotate
- Outline
- Find text
- Cover alone for spread
- Original PDF link/download

Do not add OCR, PDF editing, annotation suites, or cloud-drive auth in this pass.
