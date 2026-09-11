# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Third game "Président" (Trou du cul) shipped end-to-end (local/online/ad-hoc), alongside Coinche and "la Bouilla". Online games have an idle-turn timer with permanent bot takeover. Local solo play is offline/reload-proof (PWA + localStorage). Online finished screens offer a same-room rematch. Reaction picker sends Giphy GIFs next to emojis (online + local). Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Centered Président's current pile play and scattered its older history cards behind it; idle, awaiting next request.
Last_Action: `PresidentTable.tsx`'s `PileArea`: the current combo's own flex row is now centered on the pile's anchor point (`-translate-x-1/2`) so 2/3/4-card plays land dead-center instead of drifting right; older plays behind it get a fixed left/right offset + tilt from a new `HISTORY_OFFSETS` cycle instead of a neat diagonal stack, for a scattered "discard heap" look.
Next_Actions:
- Manually verify in Président: a 2/3/4-card combo lands centered on the felt, and the 1-2 previous plays sit tilted left/right behind it rather than in a straight diagonal line.
- Manually verify in Président: playing a combo slides in from the playing seat's side (top/left/right/bottom) instead of just appearing; the existing "2" burn animation is unaffected.
- If the sort button is missing after a local reload, unregister the old service worker once (or hard-refresh) so the new `sw.js` can take over.
- Manually verify on a phone: single-card turns play on tap, forced passes auto-trigger after ~2s, 2s burn the pile with the fly animation, hand-sort toggles suit vs rank.
- Investigate the `PresidentTable.tsx` `IconLink` hydration warning seen in dev mode (server/client mismatch, not yet triaged).
- Manually check the new square tile grid on an actual phone width (3-up may feel tight/cramped below ~360px screens).
- Manually verify the pile-history fix: play 3+ combos in a row locally and confirm the previous 1-2 plays stay visible (faded, offset) behind the current one.
- Manually play a full Président match online/ad-hoc too (only local was retested after the round-2 fix above): verify revolution banner, round overlay title reveal, and scoreboard.
- Wire `useMatchStats` into the scoring/finished screen (pending from before, unrelated to Président).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?
- Ad-hoc P2P host hooks are now 3 parallel ~200-line files (Coinche/Bouilla/Président) - generalize now, or keep deferring per the accepted N=2 and N=3 trade-offs?

Recent_Changes:
- 2026-09-11 Président: current pile play is now centered regardless of card count, and the 1-2 older plays behind it use a fixed left/right offset + tilt (`HISTORY_OFFSETS`) instead of a plain diagonal stack, for a scattered-heap look.
- 2026-09-11 Président: rounds-to-play options narrowed to 1/2/3/4/5 (was 3/4/5/6/8), per user request.
- 2026-09-11 Président: fixed a blocking bug reported by the user - from round 2 on, the end-of-round score table stayed on screen forever after pressing "Manche suivante", hiding the exchange panel underneath (game looked frozen). Root cause: `beginNextRound` never cleared `lastRoundResult`, unlike Bouilla's equivalent. Regression test added.
- 2026-09-11 Président: played combos now slide into the pile from the playing seat's direction, reusing Bouilla/Coinche's shared `TrickStage.tsx` entrance animation instead of appearing statically.
- 2026-09-11 Home: new "Actualiser" button (`force-update-button`) drops CacheStorage + unregisters the SW then reloads, without wiping localStorage/sessionStorage/IndexedDB - a non-destructive alternative to the existing `Reset` button, for when a phone shows a stale UI but a full data wipe isn't wanted.
