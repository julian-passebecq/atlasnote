# Norsk Daily JSON correction proposals

File and paste imports share `prepareNorskDailyJSON`. The helper is local and
bounded by the existing byte limit. It never evaluates text or writes storage.

Recognized corrections are Markdown JSON fences, a known copied ChatGPT footer,
unambiguous interior quotation marks, object-closing brackets and trailing commas.
A supplied point observation can be represented as a labelled 1 ms half-open
interval. The observation time is retained; the note explicitly says that the
interval is a technical normalization, not measured collection duration.

Every candidate passes the existing semantic validator before the UI offers it.
The UI lists corrections and exposes the corrected JSON. **Use corrections and
preview** creates only the normal ChangeSet proposal. Stage and explicit acceptance
remain separate. Invalid or edited paste input clears the old preview and selection.
Loading an existing review also clears a pending correction proposal.

Missing fields, timestamps, identifiers, languages, rights and source URLs are not
invented. Ambiguous malformed JSON stays blocked. This is a limited repair helper,
not a permissive JSON parser or a general backup repair/restore facility.

The validator recognizes the exact disclaimer “no claim of publication rights or
complete coverage” without treating it as a positive coverage claim. Positive claims
elsewhere in the same text remain blocked unless completeness evidence is present.

## Verification

- 9 repair unit scenarios, including preservation, malformed/unsafe rejection,
  byte limits, future timestamps and conflicting revisions.
- Full unit suite: 1164 passed.
- Integrated local normal-origin browser: four scenarios passed with real IndexedDB;
  repair confirmation, stale-preview invalidation, file import, explicit acceptance,
  reload and conflicting reimport rejection. Synthetic data and disposable profile.
- Both owner-supplied NRK JSON files exercised privately outside Git: five items each
  validated after bounded repairs. This is not evidence of article publication rights.
- Vite build and online TypeScript check passed. No production deployment of this
  feature is included in this change.

Commands: `node --test tests/norsk-daily-repair.test.mjs`,
`node --test tests/*.test.mjs`, `npm run typecheck:online`, `npm run build`,
`python tests/norsk_import_repair_runtime.py`.
