# AtlasNote handoff to ChatGPT/Codex (2026-09-26, 19:38 Oslo time)

Written by the Claude Code session "AtlasNote · Julian". Julian decided to stop here and continue with ChatGPT. **Nothing is urgent.** Production is up and protected, and nothing is half-done.

## 1. Where things stand

| Item | State |
|---|---|
| `main` | `1af2872` (after PRs #30, #31, #32). CI green: `integrated-regressions`, `v23-prerequisite / portable-core`. |
| **Production (primary)** | Cloudflare Worker `atlasnote`, https://atlasnote.datapass.workers.dev, behind **Cloudflare Access** (Julian's e-mail login). It serves `bcd1e0f` (version `6f1e75f7-e41f-4a00-ae3b-d244448dcc27`). |
| Netlify `atlasnotej` | **Automatic builds paused** (`stop_builds: true`) at Julian's request. The site still serves its last deploy (`bcd1e0f`) behind the access-code page. |
| Local | `npm ci`, then `npm run dev`, then http://127.0.0.1:4173 |
| App version string | Still `2.3.0`, even for V3: this is intentional until an owner release decision. Check `/build-identity.json` → `sourceCommit` to see what is served. |

## 2. What V3 is (short)

V3 was merged on 2026-09-25 (PR #27). It extends the V2.3 core without changing durability contracts: the database is still `knowledge-atlas` v3 with the same five stores, and no migration is needed.
- **Reading:** the PDF reader should not jump back to an old position. There is a compact `Page n / N` control when the chrome is hidden, printed page labels are shown, Continuous mode renders only a window of pages, and the sidebar follows the current page.
- **Workspaces:** each of the five workspaces can have an Experience (a filter of subjects, types and PDFs). Hidden content stays stored and backed up.
- **Norsk Daily:** reviewed feed import (preview → stage → accept), a study queue and vocabulary cards → Concept Index proposal (agent operation `concept.create`, now 26 operations).
- **Content:** the `atlas.v3-seed` pack has 64 pages, 41 glossary terms and 6 quizzes. **Owner review still pending.**
- **Performance and safety:** measured at 1,500 resources. Tabs merge instead of overwriting, and the app refuses to write over an unreadable workspace.

Full details: `docs/v3/V3_RELEASE_CANDIDATE.md` (owner summary and checklist) and `docs/v3/V3_IMPLEMENTATION_STATUS.md` (engineering record).

## 3. What was done in this session

1. **Why V3 was not on Cloudflare:** only Netlify was wired to `main`, and the formal Cloudflare gate REL-02 was BLOCKED (the Access service token was rejected on 2026-09-25). The Cloudflare Worker still served V2.3 (`7f3f5303`, 2026-09-24).
2. **V3 deployed to Cloudflare production** at Julian's explicit request, without REL-02 (REL-02 stays BLOCKED):
   - `npm ci && npm run build`, `npm run check:v23:build` → PASS.
   - `npx wrangler deploy --config <override> --tag <commit>`. The override is `wrangler.jsonc` with `"name": "atlasnote"` and `"preview_urls": false`, and `assets.directory` is the absolute path to `dist`. The repository `wrangler.jsonc` still names the deleted QA Worker `atlasnote-v23-qa`: **never deploy with it as-is**.
   - First deploy: `c61f018` → version `3a819c6b`. Second deploy: `bcd1e0f` → version `6f1e75f7` (current).
   - After each deploy, anonymous requests to `/`, `/content.json` and a deep link all return 302 to Access.
3. **PDF bug diagnosed from Julian's real-mouse traces** (archived here in `traces/`; run `node summarize-traces.mjs`):
   - Julian reads in **Single** mode with the **reader chrome hidden**.
   - Forward paging (pages 4 → 11) never went backward.
   - The visible jump was on the **previous-page turn** (scrolling up past the top of p3 → p2). The restore landed at the top of p2 (`restore frame d=37`) and then jumped ~1000 px when the canvas painted (`restore render d=1002`, ~700 ms later). Wheel input was swallowed in between.
   - Cause: `.reader-chrome-hidden .physical-page{min-height:0!important}` in `src/online/pdf.css` collapsed unrendered pages to ~30 px.
   - Fix (PR #31): keep `--pdf-page-height` as the min-height when the chrome is hidden. New check in `tests/v3_runtime.py` (7/7 PASS in Chromium).
4. **Docs updated** (PRs #30 and #32): START_HERE, V3_RELEASE_CANDIDATE and V3_IMPLEMENTATION_STATUS now describe the Cloudflare deploy, the rollback and the Netlify pause.
5. **Netlify paused** via the API (`build_settings.stop_builds=true`, site id `dee9eb09-5dbb-4a3a-ba33-97e26b872c51`).

## 4. Open issue: the PDF still does not feel right

After the fix was deployed, Julian said it "doesn't really work" but gave no new trace. This is not urgent. Next steps:
1. Ask Julian for a fresh trace **on the Cloudflare site after Ctrl+F5**: click `⋯` (Document info) → *Download navigation trace*. Confirm `/build-identity.json` shows `bcd1e0f` or later first.
2. Things to look at in the trace:
   - `restore … render` rows with a large `|delta|` (a late jump).
   - `navigate wheel-previous` / `wheel-next` that Julian did not intend.
   - Long stretches of `latched: true` at `bottom: true` with `turn 0`. This is the intentional latch: a continuous wheel stream at the page bottom does not turn the page until the user pauses. Julian may perceive it as "stuck". Consider releasing the latch after a short idle time (for example ~250 ms) or after a direction change. Code: `createWheelPager` / `consumeWheelRestore` and the wheel handler in `src/online/PdfEngine.tsx` (~line 138).
   - Forward turns show `restore frame d≈-90` then `render d≈-2..-13`. These are small, but worth checking with the chrome visible versus hidden.
3. Ask him what exactly feels wrong (a jump, stuck at the bottom, or the wrong page) and in which mode (Single / Spread / Continuous).

## 5. Things only Julian can do (from `~/.claude/effort-board/todo.md`)
- Full profile backup on the Cloudflare origin (Settings → full backup). Each origin has its own browser data.
- Content review of `content/packs/atlas.v3-seed` (see `docs/v3/CONTENT_PREREVIEW.md`).
- Optional: fix the Cloudflare Access Service Auth token/policy so that REL-02 (`npm run test:v23:access:preview`) can pass.
- Optional: branch protection on `main` requiring CI before merge.

## 6. Rules to keep (from AGENTS.md)
- Extend, do not rewrite. Do not change the five subjects, types or workspaces, and do not touch the durability core (atomic compaction and its 13 rollback cases).
- Production deploys only on Julian's explicit request. GitHub PRs and merges on green CI are fine.
- Do not relax tests or policies, and keep failed/blocked evidence.
- Cross-app contracts (Mongoku projection, Power Ops hand-off) are in `C:\Users\julia\.claude\effort-board\galaxy.json`. Check them before changing any format.

## 7. Useful commands
```bash
npx wrangler deployments status --name atlasnote          # what Cloudflare serves
npx wrangler rollback 3a819c6b-0228-4f7d-b656-daf92931f4bf --name atlasnote   # back to first V3 deploy
npx wrangler rollback 7f3f5303-e4a7-4226-9259-91859626bfea --name atlasnote   # back to V2.3
python tests/v3_runtime.py                                  # PDF/runtime browser checks (needs npm run build)
```
Re-enable Netlify: Netlify → atlasnotej → Project configuration → Build & deploy → Continuous deployment → Activate builds.
