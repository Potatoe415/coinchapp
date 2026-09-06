# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc). Online games have an idle-turn timer with permanent bot takeover. Local solo play is offline/reload-proof (PWA + localStorage). Online finished screens offer a same-room rematch. Reaction picker now sends Giphy GIFs next to emojis (online + local). Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Show the hub avatar next to the local player's name in online Coinche and Bouilla.
Last_Action: `GameRoom` reads `?avatar=` (sessionStorage, same as `?name=`) and shows a compact `SelfNameChip` above the hand. Local and P2P tables are unchanged.
Next_Actions:
- From the Bergamots hub with a profile photo, launch Coinche then Bouilla, Play Online, confirm the small avatar sits next to your name; local/ad-hoc must stay without it.
- From the Bergamots hub, set a profile name, launch Coinche then Bouilla, tap Play Online, confirm the nickname is pre-filled after Vercel deploys.
- Add `GIPHY_API_KEY` on Vercel (Production + Preview) so GIFs work in prod.
- Manually confirm the GIF tab: trending loads, search returns results, sending a GIF shows it on your seat then fades; emojis still work.
- Manually play an online Bouilla round with 2+ human tabs: confirm the score table waits for both to click "Partie suivante" before advancing, and that it auto-advances within ~6s if one tab never clicks.
- Ask user whether to record the avatar chip in `docs/PRODUCT.md` / `docs/TECH.md` (not edited autonomously).
- Wire `useMatchStats` into the scoring/finished screen (pending from before).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?

Recent_Changes:
- 2026-09-06 Online GameRoom shows hub `?avatar=` thumb + own name above the hand (`SelfNameChip`). Local/ad-hoc unchanged. See DECISIONS.
- 2026-09-06 Play Online nickname pre-filled from Bergamots hub `?name=` (`hubName.ts`; splash was dropping the param).
- 2026-09-06 `Lobby.tsx`/`AdHocLobby.tsx` pseudo field pre-filled from `?name=` sent by the Bergamots hub. See DECISIONS.
- 2026-09-04 Fixed GIF picker crash: Next treated `export type { GifHit }` in the Server Action as a runtime export (`GifHit is not defined`).
- 2026-09-04 Giphy GIF tab in the reaction picker (online + local). Server-only `GIPHY_API_KEY`, 5s overlay, `pg-13`. Ad-hoc still has no reaction transport. See DECISIONS.
