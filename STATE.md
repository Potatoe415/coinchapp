# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc). Online games have an idle-turn timer with permanent bot takeover. Local solo play is offline/reload-proof (PWA + localStorage). Online finished screens offer a same-room rematch. Reaction picker now sends Giphy GIFs next to emojis (online + local). Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Giphy GIF picker was crashing locally (`GifHit is not defined` in the Server Action). Fix applied; waiting for a local retest.
Last_Action: `Lobby.tsx` and `AdHocLobby.tsx` now pre-fill the pseudo field from `?name=` (Bergamots hub's profile name, forwarded on launch like `?lang=`). See DECISIONS 2026-09-06.
Next_Actions:
- Manually confirm: launching Coinche/Bouilla from the Bergamots hub with a profile name set pre-fills the pseudo field in both Lobby (online) and AdHocLobby (ad-hoc); opening this app directly still shows an empty field.
- Add `GIPHY_API_KEY` on Vercel (Production + Preview) so GIFs work in prod.
- Manually confirm the GIF tab: trending loads, search returns results, sending a GIF shows it on your seat then fades; emojis still work.
- Manually play an online Bouilla round with 2+ human tabs: confirm the score table waits for both to click "Partie suivante" before advancing, and that it auto-advances within ~6s if one tab never clicks.
- Manually confirm on a phone that both coinchapp hub tiles (Coinche + Bouilla) now have a genuinely clickable, clearly visible back button and settings/language button.
- Manually confirm the Coinche/Bouilla hub tiles on `bergamots.vercel.app` launch this app in whichever language is selected on the hub.
- Play a Bouilla round (local is enough) and confirm bots no longer dump aces/kings into tricks 1-3, and that they shed a suit to be able to discard later.
- Manually confirm the new bottom reactions bar on a real 4-seat game (Coinche deal-end and Bouilla round-end): opponents' name+emoji no longer overlap the score card/table, and a reaction fired just before the recap appears is still visible in the bottom row.
- Manually confirm the bot-thinking-time slider end to end in each mode (online, local, ad-hoc) for both games.
- On a phone, add the app to the home screen and verify: reload mid-local-game keeps the match; force-quitting and reopening resumes it too; starting a genuinely new local game never resumes a stale one; the new "Installer" button appears (Android/Chrome) and Reset truly forces the latest version.
- Ask user whether to record the new offline/installable capability in `docs/TECH.md` (not edited autonomously per file-ownership rules).
- Wire `useMatchStats` into the scoring/finished screen (pending from before).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?

Recent_Changes:
- 2026-09-06 `Lobby.tsx`/`AdHocLobby.tsx` pseudo field pre-filled from `?name=` sent by the Bergamots hub. See DECISIONS.
- 2026-09-04 Fixed GIF picker crash: Next treated `export type { GifHit }` in the Server Action as a runtime export (`GifHit is not defined`).
- 2026-09-04 Giphy GIF tab in the reaction picker (online + local). Server-only `GIPHY_API_KEY`, 5s overlay, `pg-13`. Ad-hoc still has no reaction transport. See DECISIONS.
- 2026-08-17 Bouilla end-of-round score table now waits for every real player (or 6s max) before advancing, online and ad-hoc; finished-screen rematch and local solo left unforced. See DECISIONS.
- 2026-08-17 Fixed low-contrast `HomeTopBar` back/settings icons (were `bg-white/10`, nearly invisible on light photo backgrounds) - now a solid `bg-black/45 text-white` pill, legible everywhere.
- 2026-08-17 Removed redundant "la Bouilla" h1 title from `app/bouilla/page.tsx` splash screen (text already visible in background image).
