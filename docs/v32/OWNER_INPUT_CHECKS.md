# Owner input required for the execution candidate

Physical hardware and editorial checks below remain pending. The coordinator
tests software navigation with Computer Use and Playwright on the actual
protected QA preview; see the exact candidate evidence in
`docs/evidence/mission/FINAL_STATUS.md`. The owner need only repeat navigation
cases that require their physical devices. Automated wheel events do not certify
physical mouse or trackpad behavior. Use a disposable
browser profile, or export and verify a complete backup before using an existing
profile. Record the exact app commit/build identity and device/browser used.

## Physical PDF navigation (about five minutes per device)

1. Open **PDF reading fixture**. In Single mode, try 75%, **Fit width** and 150%
   zoom. The selector's value `1` is Fit width; it has no literal 100% option.
   Scroll within a page, reach the bottom, make one deliberate forward gesture,
   then reverse. Confirm the reader advances deliberately, does not jump back,
   and returns to the bottom of the previous tall page. Repeat with controls
   visible and hidden.
2. In Spread mode, verify physical pages 1–2, 3–4, then the final page. With
   **Cover alone** enabled, verify 1, 2–3 and 4–5. Try ordinary wheel detents,
   a long trackpad gesture and its momentum tail, then a deliberate reversal.
   Record unexpected duplicate turns, backward jumps or a page stuck at an edge.
3. In Continuous mode, scroll forward and backward across several pages. Repeat
   in Focus mode and at the three zoom values. Confirm navigation remains natural
   when PDF canvases finish painting.
4. Open the same PDF in two panes. Change the physical page and zoom in one pane;
   verify the other pane retains its own position. Refresh and confirm both
   positions reopen. If a failure occurs, use **Document info → Download
   navigation trace**, record the gesture and page numbers, and retain the trace.
   The trace contains navigation measurements and build identity, not PDF text.

Repeat on the owner's actual Windows mouse and trackpad when both are used. A
PASS for one device does not cover another device, browser, or GPU.

## Publication and editorial decisions

`content/publication-review.json` still marks **atlas.v3-seed** as **OWNER REVIEW
REQUIRED before publication**. Current source inventory is 64 Notebook pages,
6 QCM sets, 45 questions and 41 glossary terms. Successful schema, links and
hash checks do not grant publication approval.

The inherited editorial ledger is `docs/v3/CONTENT_PREREVIEW.md`: H-1, M-1, M-2,
M-4 and M-5 are already applied. M-3 (the Norwegian idiom) and the Low findings
remain owner decisions. Confirm the text and examples against the intended
language/SQL/runtime versions before approving this pack. No decision or new
review hash was inferred by this execution pass.

PDF Atlas remains a reference-only metadata catalogue. The separate repository's
public PDF redistribution rights remain unresolved; app-side byte/hash checks
do not upgrade those rights.
