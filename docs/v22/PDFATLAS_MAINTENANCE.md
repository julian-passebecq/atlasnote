# Reviewed PDF Atlas source update workflow

1. Obtain the canonical `library.json` at the exact reviewed repository commit using a read-only source lookup. Inspect stable logical IDs and rights; a new document is not automatically a revision of another document.
2. Save its exact UTF-8 bytes to `config/vendor/pdfatlas.library.source.json`. Update `pdfatlas.source-provenance.json` with the exact 40-character commit, returned Git blob ID and independently computed SHA-256. Git blob verification includes the Git `blob <length>\0` prefix.
3. Keep AtlasNote-only summary/inspection enrichment in `config/pdfatlas.library.json`. Preserve the canonical source's byte-critical fields. Do not invent or upgrade redistribution rights.
4. Review and update the single production pin in `config/pdfatlas.json`. Run `npm run pdfatlas:sync`, then `npm run check:pdfatlas` and the full release suite. Generated pack files are output, not separately maintained URLs.
5. An explicit staging-only mutable sync uses `node tools/sync-pdfatlas.mjs --allow-mutable-staging`; production build/check gates still reject a mutable URL.

Runtime never fetches the manifest to mutate reader data and the content-agent interface has no repository publication capability. Old history snapshots retain their old immutable source URLs and byte hashes. Full backups do not bundle external public PDF bytes. The retained `reference-only` warning remains relevant to the separate repository's publication; this app pass does not establish redistribution rights.
