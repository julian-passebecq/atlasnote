# Offline PDF preparation

`tools/prepare-pdf.py` runs at authoring time, never in the browser. It does not upload, OCR, grant redistribution permission, or rasterize whole pages. Install optional dependencies in `requirements-pdf-authoring.txt` ahead of an offline session. These packages are not bundled; review their separate licenses before reuse/distribution.

```sh
python tools/prepare-pdf.py incoming/source.pdf prepared/reference.pdf --profile lossless --report prepared/reference.processing.json --qa-dir review/reference-lossless
python tools/prepare-pdf.py incoming/source.pdf prepared/reference-study.pdf --profile study --qa-dir review/reference-study
python tools/prepare-pdf.py incoming/source.pdf prepared/reference-compact.pdf --profile compact --qa-dir review/reference-compact
```

Choose a new output path; the utility refuses to overwrite the input or an existing output. Default **lossless** performs structural cleanup, deduplication/deflation and object streams. Optional **study** rewrites suitable embedded images at approximately 220 -> 160 DPI / JPEG 82; **compact** uses 180 -> 130 DPI / JPEG 75 and requires explicit selection. Both lossy profiles require a QA directory. The structural result is evaluated first, and the smallest valid candidate is used only when smaller than the original. Otherwise the original exact bytes are retained.

Every retained candidate must preserve page count, page dimensions and each page's normalized selectable-text fingerprint. An image-only document remains image-only; no fake searchable text is created. These checks are necessary but not a visual-quality guarantee. Inspect before/after/diff renders, including small labels, diagrams, tables and vector details. The tool renders every page up to 12 pages; for larger documents it renders a deterministic seven-page sample and states that reduced coverage. Review unsampled pages for important material. Reports never mark `humanApproved` automatically.

The report records source/result bytes and SHA-256, selectable-text presence/fingerprints, structural and optional lossy candidates, ratio, engine/tool versions, timestamp, warnings, page count and QA metrics. Reports do not contain extracted teaching prose. Rights are explicitly unchanged. The processor refuses invalid signatures, repaired/malformed or encrypted inputs, embedded files, and recognized active/external actions. This conservative inspection is not an antivirus guarantee. Password unlocking and OCR are outside scope.

Use `--hash-index library/hashes.json` with a JSON object mapping SHA-256 to the existing canonical document ID. The index is read-only. A duplicate detected before or after optimization creates no new PDF. Library validation independently deduplicates exact prepared-byte hashes before pack creation.

The operational target is **12 MiB**; larger usable files emit warnings. The hard pack-asset maximum remains **20 MiB** and cannot be increased by a CLI flag. A result still over that cap produces a blocked-size report and no prepared output. Keep it outside the app as an appropriate local/private reference or use another authorized storage workflow; do not bypass the importer limit.

Exit codes: 0 prepared; 1 invalid/unsafe; 2 unavailable dependency or usage error; 3 over the hard size cap; 4 duplicate. A raw downloaded PDF is not a publishable asset merely because preparation succeeded. Review provenance and rights separately.
