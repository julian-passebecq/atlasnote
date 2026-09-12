# Tools

- `prepare_pdf.py`: optional PyMuPDF-based lossless/study/compact preprocessing.
- `build_atlas_library.py`: Python-stdlib builder for a private AtlasNote library ZIP.

Example:

```bash
python tools/build_atlas_library.py --root . --out out/atlas-pdf-library.zip
```

The builder refuses byte-identical duplicates and PDFs above AtlasNote's 20 MiB asset limit.
