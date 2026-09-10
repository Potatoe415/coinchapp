# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Third game "Président" (Trou du cul) shipped end-to-end (local/online/ad-hoc), alongside Coinche and "la Bouilla". Online games have an idle-turn timer with permanent bot takeover. Local solo play is offline/reload-proof (PWA + localStorage). Online finished screens offer a same-room rematch. Reaction picker sends Giphy GIFs next to emojis (online + local). Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Président pile-display bug fixed (history trail + rank-legal highlighting + suit sort); idle, awaiting manual QA or next request.
Last_Action: `components/PresidentTable.tsx` `PileArea` now keeps the last 2 combos of the current pile cycle in state (`usePileHistory`) and renders them fading/offset behind the current combo, so a play right after 2 others is no longer visually "blank". `HandArea` only rings/enables cards whose rank is in `view.legalCombos` (was: all cards during your turn). Hand now sorts by suit then rank (`SUIT_ORDER` matching Coinche/Bouilla), not rank-only. Pure client-side display fix - no engine/protocol/server changes. Typecheck/lint/tests (178) all clean.
Next_Actions:
- Manually verify the pile-history fix: play 3+ combos in a row locally and confirm the previous 1-2 plays stay visible (faded, offset) behind the current one.
- Manually verify the new flow end to end: `/` shows 3 tiles, each navigates to its own splash, install/reset buttons still work on `/`.
- Manually check `/president`'s new background art (`public/president-full.jpg`) renders well on an actual phone (crop/positioning at very tall/short viewport ratios).
- Manually play a full local Président match (4 rounds default) end to end: verify revolution banner, exchange panel (round 2+), round overlay title reveal, and scoreboard.
- Manually play an online Président room with 2+ human tabs: verify combo/pass actions, exchange-return gate, idle-timer fallback (random legal combo during play, heuristic during exchange), and the "Manche suivante" readiness gate/6s auto-advance.
- Manually test ad-hoc P2P Président (host + 1 joining client): verify combo/pass/exchangeReturn messages round-trip and a dropped client demotes to bot correctly.
- No dedicated splash background art exists for Président yet (`app/president/page.tsx` reuses `splashscreen.jpg`) - ask user if a dedicated image is wanted.
- Wire `useMatchStats` into the scoring/finished screen (pending from before, unrelated to Président).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?
- Ad-hoc P2P host hooks are now 3 parallel ~200-line files (Coinche/Bouilla/Président) - generalize now, or keep deferring per the accepted N=2 and N=3 trade-offs?

Recent_Changes:
- 2026-09-10 Président `PileArea` shows a fading history trail (last 2 combos) instead of only the latest one; `HandArea` highlights/enables only rank-legal cards; hand sorts by suit then rank (was rank-only). Client-only fix, no state-shape change.
- 2026-09-10 `/president` splash now uses dedicated art (`public/president-full.jpg`, user-provided watercolor illustration, re-encoded 3.8MB -> 727KB JPEG) instead of the generic `splashscreen.jpg` fallback.
- 2026-09-10 Home ("/") is now a 3-tile game picker; new `app/coinche/page.tsx` splash (Coinche's mode-picker screen was previously inline in home). See DECISIONS.
- 2026-09-10 Third game "Président" (Trou du cul) shipped end-to-end: engine, server dispatch, client adapters (+ generic `useLocalCardGame` extraction), ad-hoc P2P host, full UI, routing. See DECISIONS/DATA_MODEL.
- 2026-09-06 Online GameRoom shows hub `?avatar=` thumb + own name above the hand (`SelfNameChip`). Local/ad-hoc unchanged. See DECISIONS.
