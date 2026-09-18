# Local reference-review format

First create concepts manually in Context > References > Link concept / Add reference > Concept Index. Select exact resources in Review & AI handoff and export a current JSON package. That export is the source of IDs, target objects and revision values for an AI response. Do not guess revisions or physical page numbers.

Use the accompanying AI_REFERENCE_REVIEW_PROMPT.md outside the application. The app itself makes no AI calls.

An assignment response has the following shape. The values below are placeholders, not a ready-to-import valid batch:

```json
{
  "schemaVersion": 1,
  "kind": "atlas-reference-suggestions",
  "semanticRevision": 7,
  "suggestions": [
    {
      "id": "suggestion.batch1.assignment1",
      "type": "assignment",
      "conceptId": "copy-an-existing-concept-id-from-export",
      "target": {"kind": "page", "pageId": "copy-real-page-id", "anchor": {"blockId": "copy-real-section-id"}},
      "targetRevision": "copy-the-16-hex-sourceRevision-from-this-resource",
      "reason": "Explain what in the supplied excerpt supports this relationship.",
      "confidence": 0.85
    }
  ]
}
```

For an explicit directed reference use `type: "reference"`, omit conceptId, add `source` and `sourceRevision` copied from the source resource and `kind: "link"` (or `related` / `context`). The target's `targetRevision` is its `sourceRevision` from the export; do not use the source's fingerprint for both ends. IDs must be unique across previously staged suggestions. Confidence is optional and must be 0-1; it does not cause automatic acceptance.

Up to 100 suggestions and 512 KiB are accepted. Existing concepts/targets and the semantic revision must match; one invalid or stale row rejects the entire preview. No imported suggestion can create a new concept. An empty batch is not an actionable import: an AI with no supported links should report that to the user instead.

After importing: Preview suggestions > Stage validated suggestions > select rows > Accept selected or Reject selected. Nothing is accepted merely by selecting a JSON file. Export again after edits that make the prior semantic/content revision stale. Full workspace backups retain the review state; completed review history export is a separate convenience download.
