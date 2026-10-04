# AtlasNote V3.2 Web study implementation

Prepared from `fix/atlasnote-v31-stabilization`.

Product identity: `3.2.0-rc.1`.
Database identity: `knowledge-atlas` version 3, unchanged.

## Design goal

Keep Atlas Web convenient and local-first while making Norsk Daily useful for actual
reading practice. V3.2 deliberately reuses the existing accepted Article/QCM resources,
ratings and Concept Index instead of creating a second language database.

## Norsk Daily changes

### Read model

`src/norsk-daily/daily.ts` now derives, without mutation:

- generated English translation;
- simpler generated Norwegian paraphrase;
- optional generated French translation;
- section/topic metadata;
- per-story vocabulary;
- full-day vocabulary;
- local full-text search over accepted study fields.

Search never reaches the network.

### Newspaper

The daily queue now has an editorial two-column layout with a lead card, while retaining
the existing semantic queue/item selectors and progress controls.

Topic buttons are generated from accepted `section` metadata. Items without a section
remain visible under **All topics** and are never dropped.

### Focus

Focus mode renders one article study item with Norwegian on the left and generated
English on the right in the **same scroll surface**. Narrow viewports stack the columns
rather than creating synchronized independent scroll panes.

English can still be hidden for recall. Generated simpler Norwegian and optional French
remain visibly labelled. Vocabulary is shown as compact per-story study chips.

### Search

Search covers:

- source headline;
- section/topic;
- generated English translation;
- generated Norwegian paraphrase;
- generated French translation when present;
- grammar labels;
- vocabulary lemma/form/part of speech/meaning/example.

All query terms must match the same story/word. `/` focuses the search input when the
user is not typing into another control. Escape clears and releases the search field.

### Paste-to-review workflow

Agent Review now accepts Norsk Daily JSON either from a file or from a bounded paste box.
Paste is validated by the same `atlas.norsk-daily@2` parser and converted into the same
ChangeSet proposal. It never skips Preview, Stage or explicit Accept/Reject, and it makes
no provider/network request. This supports the intended external-chat → Atlas workflow
without requiring the user to create a temporary JSON file. A separate **Copy Norsk Daily prompt** action copies the installed prompt+schema package to the clipboard; Atlas still performs no provider call. The original file export remains available as a fallback/audit artifact.

## Source/rights boundary

This pass does not mirror publisher article bodies.

The existing Norsk Daily contract still distinguishes source wording from generated
study text. Synthetic fixtures stay visibly synthetic. Import remains a reviewed
ChangeSet and cannot silently replace unrelated resources.

## Preserved architecture

No changes to:

- IndexedDB database version or five-store layout;
- A/B pane model;
- workspace count;
- immutable resource history;
- backup/recovery envelope;
- provider-neutral ChangeSet review;
- PDF Atlas ownership/provenance;
- V3.1 PDF navigation/cache changes;
- Cloudflare/Netlify data-origin separation.

### Browser storage protection

Settings now reports whether the current origin has persistent browser storage and exposes a user-initiated request when supported. Atlas never calls `navigator.storage.persist()` automatically. A grant only reduces browser eviction risk for this origin; it is explicitly presented as neither synchronization nor a backup. Verified recovery bundles remain the durable recovery mechanism.

## Commits before this document

- `7272d941` — local full-text Norsk study projection.
- `d74ae7e1` — newspaper and bilingual Focus modes.
- `0ef5a278` — compact responsive newspaper/focus layout.
- `e643b4f5` — pure Norsk search/projection tests.
- `902dd5bf` — integrated browser test extension.
- `3edaf1a6` — topic navigation and keyboard search.

These commits are implementation history, not independent PASS evidence.
