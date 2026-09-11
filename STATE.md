# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Third game "Président" (Trou du cul) shipped end-to-end (local/online/ad-hoc), alongside Coinche and "la Bouilla". Online games have an idle-turn timer with permanent bot takeover. Local solo play is offline/reload-proof (PWA + localStorage). Online finished screens offer a same-room rematch. Reaction picker sends Giphy GIFs next to emojis (online + local). Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Président table UX (2-burns, hand sort, instant single, auto-pass) committed and pushed; idle, awaiting next request.
Last_Action: Committed and pushed all pending Président work on `main`: 2 burns the pile (`lastBurn` + collect animation), suit/rank hand-sort button, instant single-card play, auto-pass when nothing is legal, Turbopack/dev SW cache skip, LanguageSwitcher hidden on `/coinche` and `/president`.
Next_Actions:
- If the sort button is missing after a local reload, unregister the old service worker once (or hard-refresh) so the new `sw.js` can take over.
- Manually verify on a phone: single-card turns play on tap, forced passes auto-trigger after ~2s, 2s burn the pile with the fly animation, hand-sort toggles suit vs rank.
- Investigate the `PresidentTable.tsx` `IconLink` hydration warning seen in dev mode (server/client mismatch, not yet triaged).
- Manually check the new square tile grid on an actual phone width (3-up may feel tight/cramped below ~360px screens).
- Manually verify the pile-history fix: play 3+ combos in a row locally and confirm the previous 1-2 plays stay visible (faded, offset) behind the current one.
- Manually play a full local Président match (4 rounds default) end to end: verify revolution banner, exchange panel (round 2+), round overlay title reveal, and scoreboard.
- Wire `useMatchStats` into the scoring/finished screen (pending from before, unrelated to Président).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?
- Ad-hoc P2P host hooks are now 3 parallel ~200-line files (Coinche/Bouilla/Président) - generalize now, or keep deferring per the accepted N=2 and N=3 trade-offs?

Recent_Changes:
- 2026-09-11 Président: 2 burns the pile, hand-sort toggle, instant single-card play, auto-pass, and SW skip of mutable Turbopack chunks - committed and pushed.
- 2026-09-11 Président: small sort button to the right of the player's cards toggles rank order vs the existing suit order. `public/sw.js` no longer cache-firsts Turbopack/dev `._.` chunks.
- 2026-09-11 Président: single-card turns now play on tap (no "Jouer" needed), and forced passes (no legal combo) auto-pass after 2s via a new "Passer automatiquement" setting, default on.
- 2026-09-11 Président: a "2" (single/double/triple) now instantly burns the pile - clears it, the same seat leads again - with a card-collect-and-fly animation toward that seat.
- 2026-09-10 Home tile grid restyled: 3 square (`aspect-square`) cards with each game's splash art as background + accent-colored title label, replacing the old full-width plain-color rows.
