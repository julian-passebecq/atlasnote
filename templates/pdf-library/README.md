# atlasnote-pdf-library - private authoring template, 1.1

This folder is a runnable private source library, not the AtlasNote app and not a browser-fetched private repository. The two small PDFs are visibly labelled, author-created synthetic ingestion examples. No private user corpus is included.

From this directory:

```sh
python tools/validate_library.py .
python tools/build_atlas_library.py --root .
```

Import `out/atlas-pdf-library.zip` into AtlasNote locally. The builder/validator use Python's standard library. They validate PDF signatures and metadata hashes; deeper PDF inspection/optimization is the optional preparation step below. Output ZIPs are deterministic for identical prepared assets and metadata.

```sh
python tools/prepare_pdf.py incoming/source.pdf assets/new-reference.pdf --profile lossless --report assets/new-reference.processing.json --qa-dir out/review/new-reference
# Optional lossy profiles need explicit selection and visual QA:
python tools/prepare_pdf.py incoming/source.pdf assets/new-reference-study.pdf --profile study --qa-dir out/review/new-reference-study
```

Preparation needs PyMuPDF 1.26.7 and Pillow 12.3.0 (tested versions). Install ahead of an offline session; these dependencies are not included and retain their own licenses. It does not upload, OCR or rasterize whole pages. Structural cleanup runs first. Study targets 220 -> 160 DPI / quality 82; explicit compact targets 180 -> 130 / quality 75. Text/page-count/dimension changes reject the result; if no smaller valid candidate exists the original is retained. Review before/after/diff PNGs. Reports never approve their own visual quality. Target <=12 MiB; >12 warns; >20 MiB cannot become a pack asset. `--hash-index` optionally reads a SHA-256 -> canonical ID map. Exit 4 means duplicate, 3 means oversize, 1 means unsafe/invalid, 2 means missing dependency/usage.

Edit `library/library.json` and `library/documents/*.json`. Keep stable document IDs on updates and increase the library version when changing bytes or metadata. Each PDF has one canonical primary placement; language, summary, source/author/publisher/rights and multiple domain/technology facets do not duplicate it. Folder IDs derive from the folder path; Page/Document IDs derive from the stable document ID. Optional `library/collections.json` is taxonomy guidance, not duplicate placement.

Use one canonical `main`. Temporary `ingest/<batch>` branches are for review, not categories. Keep this repository private. LinkedIn availability never implies permission; uncertain rights stay reference-only/unreviewed. `incoming/` and `out/` are gitignored. The public AtlasNote app has no credentials and imports only the user-selected generated ZIP.

A complete workspace backup is different: it also contains remarks, bookmarks, flags, local edits and reader state. This template builds only a content library. AtlasNote's update/conflict rules remain authoritative.
