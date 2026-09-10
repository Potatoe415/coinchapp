# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Third game "Président" (Trou du cul) shipped end-to-end (local/online/ad-hoc), alongside Coinche and "la Bouilla". Online games have an idle-turn timer with permanent bot takeover. Local solo play is offline/reload-proof (PWA + localStorage). Online finished screens offer a same-room rematch. Reaction picker sends Giphy GIFs next to emojis (online + local). Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Home tile grid restyled to square image tiles; idle, awaiting manual QA or next request.
Last_Action: `app/page.tsx` game tiles are now a `grid-cols-3` row of square (`aspect-square`) cards, each with that game's own splash art as background (`/splashscreen.jpg`, `/bouilla-full.jpg`, `/president-full.jpg`) plus a bottom gradient + accent-colored title label; replaced the old full-width `bg-black/25` rows. Per-tile description text dropped (no room in a square tile; i18n keys `{coinche,bouilla,president}TileDesc` left in place, unused for now). Typecheck/lint clean, verified visually via a local Chrome screenshot.
Next_Actions:
- Manually check the new square tile grid on an actual phone width (3-up may feel tight/cramped below ~360px screens).
- Manually verify the pile-history fix: play 3+ combos in a row locally and confirm the previous 1-2 plays stay visible (faded, offset) behind the current one.
- Manually verify the new flow end to end: `/` shows 3 tiles, each navigates to its own splash, install/reset buttons still work on `/`.
- Manually check `/president`'s new background art (`public/president-full.jpg`) renders well on an actual phone (crop/positioning at very tall/short viewport ratios).
- Manually play a full local Président match (4 rounds default) end to end: verify revolution banner, exchange panel (round 2+), round overlay title reveal, and scoreboard.
- Manually play an online Président room with 2+ human tabs: verify combo/pass actions, exchange-return gate, idle-timer fallback (random legal combo during play, heuristic during exchange), and the "Manche suivante" readiness gate/6s auto-advance.
- Manually test ad-hoc P2P Président (host + 1 joining client): verify combo/pass/exchangeReturn messages round-trip and a dropped client demotes to bot correctly.
- Wire `useMatchStats` into the scoring/finished screen (pending from before, unrelated to Président).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?
- Ad-hoc P2P host hooks are now 3 parallel ~200-line files (Coinche/Bouilla/Président) - generalize now, or keep deferring per the accepted N=2 and N=3 trade-offs?

Recent_Changes:
- 2026-09-10 Home tile grid restyled: 3 square (`aspect-square`) cards with each game's splash art as background + accent-colored title label, replacing the old full-width plain-color rows.
- 2026-09-10 Président `PileArea` shows a fading history trail (last 2 combos) instead of only the latest one; `HandArea` highlights/enables only rank-legal cards; hand sorts by suit then rank (was rank-only). Client-only fix, no state-shape change.
- 2026-09-10 `/president` splash now uses dedicated art (`public/president-full.jpg`, user-provided watercolor illustration, re-encoded 3.8MB -> 727KB JPEG) instead of the generic `splashscreen.jpg` fallback.
- 2026-09-10 Home ("/") is now a 3-tile game picker; new `app/coinche/page.tsx` splash (Coinche's mode-picker screen was previously inline in home). See DECISIONS.
- 2026-09-10 Third game "Président" (Trou du cul) shipped end-to-end: engine, server dispatch, client adapters (+ generic `useLocalCardGame` extraction), ad-hoc P2P host, full UI, routing. See DECISIONS/DATA_MODEL.
