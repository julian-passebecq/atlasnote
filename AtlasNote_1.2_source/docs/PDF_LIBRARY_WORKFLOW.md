# Separate private PDF-library workflow

## Author a reusable source library

Use `templates/pdf-library/` as a **separate private** repository/source folder. It contains two explicitly synthetic, author-created example PDFs, not the user's 137-page reference corpus. The examples are visibly labelled as ingestion fixtures and have different bytes from the public reader fixtures, so they exercise cross-pack SHA-256 deduplication honestly.

Use one canonical `main` branch. Temporary `ingest/<batch>` branches are review workflow, never topic categories. Classify through one canonical project/folder placement plus primary language and namespaced facets. The public app never fetches authenticated private GitHub assets, stores credentials, or treats branches as taxonomy.

```sh
python templates/pdf-library/tools/validate_library.py templates/pdf-library
python templates/pdf-library/tools/build_atlas_library.py --root templates/pdf-library
```

The second command writes `templates/pdf-library/out/atlas-pdf-library.zip`. Import that ZIP in Workspace settings, inspect the preview, and confirm locally. Both the source folder and the generated ZIP should remain private. No separate app deployment is involved.

To add a document, prepare its PDF with the offline utility, copy the selected result into `assets/`, and add a sidecar under `library/documents/`, following the two examples. Reference it from `library/library.json`. Required fields include a stable document ID, file path, prepared bytes/hash, title, language (or unknown), one project/folder path, rights and visibility. Summary, source URL, author, publisher, attribution, known page count, type/domain/technology/level/source facets are supported. Never fabricate unknown metadata. The optional `collections.json` is authoring guidance, not another canonical tree or a promised saved-view UI.

Keep `id` unchanged when renaming/moving/updating a document. Increment the pack semantic version after a real change; equal-version changed bytes remain a conflict. Generated Page/Document IDs derive from stable document IDs. Folder IDs derive from their canonical path. Tree relocation does not duplicate document identity. The builder validates safe relative paths, no symlink traversal, bounded metadata, PDF signature, exact bytes/hash, private visibility, legal enum values, placement, provenance, and duplicate SHA-256 before writing. ZIP member order/timestamps are deterministic for identical prepared input.

The builder's output is tested with AtlasNote's actual `readWorkspace()` and existing import planning. Missing/tampered/oversized attachments are rejected, not silently discarded. Raw `incoming/` and generated `out/` remain gitignored. Keep human-reviewed processing reports with the authored document; they do not upgrade rights.

## Export an existing local PDF library

Workspace settings -> **Download private PDF library ZIP** exports private PDF documents and their exact bytes, wrapper metadata and required hierarchy as a standard Atlas content pack. Public source-pack PDFs, teaching-note prose, personal remarks/flags/bookmarks, passwords and other application state are excluded. Missing/corrupt bytes or duplicate binary identities stop export.

The pack ID/version fields name a new standalone content pack. Use it in a fresh workspace or an intended target library. PDF Document/Page/leaf IDs are preserved. Built-in public notebook/folder context cannot be re-owned by a private pack, so **only that exported context** is deterministically remapped; `atlas-placement-map.json` records original/exported context IDs. Nothing in the live workspace is renamed. This prevents collisions with built-in notebooks on a fresh import while retaining the private documents' identities.

Re-importing a standalone export into its source workspace may correctly produce ownership/local-edit conflicts. Do not treat it as an overwrite/update mechanism for different source packs. To update an existing source-owned library, edit that original authoring library with its original pack ID and a higher version. To transfer the entire current workspace back and forth, use **Download workspace backup / Restore workspace backup**, not content export. No importer conflict checks are bypassed by this workflow.

## Rights and safety

Public availability on LinkedIn or a vendor site is not redistribution permission. Intake defaults to **private + reference-only** (or explicitly unreviewed). The public distribution's reviewed allowlist remains unchanged. The processor never upgrades rights; the private template does not become public automatically. Keep credentials, downloaded source material, personal backups and the reference corpus out of the application repository, public build and test-evidence publication.
