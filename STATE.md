# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Third game "Président" (Trou du cul) shipped end-to-end (local/online/ad-hoc), alongside Coinche and "la Bouilla". Online games have an idle-turn timer with permanent bot takeover. Local solo play is offline/reload-proof (PWA + localStorage). Online finished screens offer a same-room rematch. Reaction picker sends Giphy GIFs next to emojis (online + local). Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Added Président's "double" house rule (replay the pile's rank to skip the next seat; completing all 4 burns it); idle, awaiting next request.
Last_Action: `lib/president/combos.ts`/`play.ts`: `isLegalCombo` now also accepts replaying the pile's exact rank/count (not just beating it); `applyPlay` skips the next active seat on such a play (new `GameState.lastSkip`, optional `Pile.stackCount`), or burns the pile like a "2" once all 4 cards of that rank are down. `PresidentTable.tsx` got a new `SkipFlash` "Tour sauté : {player} !" banner (reuses `.belote-flash` CSS); rules modal text updated; 6 new/updated tests, full suite green.
Next_Actions:
- Manually verify in Président: playing the same rank as the pile (single/pair/triple) is accepted, skips the next seat with the "Tour sauté" flash, and completing 4 of that rank burns the pile with the existing fly animation.
- Manually verify in Président: a 2/3/4-card combo lands centered on the felt, and the 1-2 previous plays sit tilted left/right behind it rather than in a straight diagonal line.
- If the sort button is missing after a local reload, unregister the old service worker once (or hard-refresh) so the new `sw.js` can take over.
- Manually verify on a phone: single-card turns play on tap, forced passes auto-trigger after ~2s, 2s burn the pile with the fly animation, hand-sort toggles suit vs rank.
- Investigate the `PresidentTable.tsx` `IconLink` hydration warning seen in dev mode (server/client mismatch, not yet triaged).
- Manually check the new square tile grid on an actual phone width (3-up may feel tight/cramped below ~360px screens).
- Manually play a full Président match online/ad-hoc too: verify revolution banner, round overlay title reveal, scoreboard, and the new double/skip rule with bots.
- Wire `useMatchStats` into the scoring/finished screen (pending from before, unrelated to Président).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?
- Ad-hoc P2P host hooks are now 3 parallel ~200-line files (Coinche/Bouilla/Président) - generalize now, or keep deferring per the accepted N=2 and N=3 trade-offs?

Recent_Changes:
- 2026-09-11 Président: new "double" house rule (always on) - replaying the pile's exact rank/count instead of beating it is now legal, skips the next active seat (new "Tour sauté" flash), and burns the pile like a "2" once all 4 cards of that rank are down.
- 2026-09-11 Président: current pile play is now centered regardless of card count, and the 1-2 older plays behind it use a fixed left/right offset + tilt (`HISTORY_OFFSETS`) instead of a plain diagonal stack, for a scattered-heap look.
- 2026-09-11 Président: rounds-to-play options narrowed to 1/2/3/4/5 (was 3/4/5/6/8), per user request.
- 2026-09-11 Président: fixed a blocking bug reported by the user - from round 2 on, the end-of-round score table stayed on screen forever after pressing "Manche suivante", hiding the exchange panel underneath (game looked frozen). Root cause: `beginNextRound` never cleared `lastRoundResult`, unlike Bouilla's equivalent. Regression test added.
- 2026-09-11 Président: played combos now slide into the pile from the playing seat's direction, reusing Bouilla/Coinche's shared `TrickStage.tsx` entrance animation instead of appearing statically.
