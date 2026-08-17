# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens/clubs end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Local (solo) play is now offline/reload-proof: a PWA manifest + service worker + localStorage match persistence let a plane/no-signal user reload or relaunch mid-game without losing anything. Online finished screens (Coinche + Bouilla) now offer a "Nouvelle partie" rematch that restarts a fresh match in the same room without a lobby detour. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Previously pending Bouilla bot play / offline PWA verifications (see below); the online rematch button, the hub-tile back/settings buttons, and the round-end readiness gate are now shipped and pending manual verification.
Last_Action: Bouilla's end-of-round score table ("Partie suivante") now waits for every real player to press it, capped at 6s (`ROUND_AUTO_ADVANCE_MS`, `lib/bouilla/types.ts`) - online previously had no gate at all (any single click advanced everyone instantly); ad-hoc already waited for every human but had no timeout. New `readySeats` field on Bouilla's `GameState` (no SQL migration - lives in the existing `state` jsonb) + `lib/server/bouilla-round-gate.ts` + `readyForNextRound` Server Action for online; a `setTimeout` effect in `useP2PBouillaHost.ts` for ad-hoc. The finished-match "Nouvelle partie" rematch is explicitly excluded (stays unforced) and local solo is unchanged, both per explicit user confirmation. See `docs/DECISIONS.md` 2026-08-17 for full rationale. `npm run build`/`npm test`/`npm run lint` all clean (2 new engine tests, 134 total).
Next_Actions:
- Manually play an online Bouilla round with 2+ human tabs: confirm the score table waits for both to click "Partie suivante" before advancing, and that it auto-advances within ~6s if one tab never clicks.
- Manually confirm on a phone that both coinchapp hub tiles (Coinche + Bouilla) now have a genuinely clickable, clearly visible back button and settings/language button.
- Manually confirm the Coinche/Bouilla hub tiles on `bergamots.vercel.app` launch this app in whichever language is selected on the hub.
- Play a Bouilla round (local is enough) and confirm bots no longer dump aces/kings into tricks 1-3, and that they shed a suit to be able to discard later.
- Manually confirm the new bottom reactions bar on a real 4-seat game (Coinche deal-end and Bouilla round-end): opponents' name+emoji no longer overlap the score card/table, and a reaction fired just before the recap appears is still visible in the bottom row.
- Manually confirm the bot-thinking-time slider end to end in each mode (online, local, ad-hoc) for both games.
- On a phone, add the app to the home screen and verify: reload mid-local-game keeps the match; force-quitting and reopening resumes it too; starting a genuinely new local game never resumes a stale one; the new "Installer" button appears (Android/Chrome) and Reset truly forces the latest version.
- Ask user whether to record the new offline/installable capability in `docs/TECH.md` (not edited autonomously per file-ownership rules).
- Manually play an online game and confirm the idle-turn slider/timer fixes from the previous session still hold.
- Manually play a Bouilla game to end and confirm winner + full round table appear correctly on the finished screen.
- Wire `useMatchStats` into the scoring/finished screen (pending from before).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?

Recent_Changes:
- 2026-08-17 Bouilla end-of-round score table now waits for every real player (or 6s max) before advancing, online and ad-hoc; finished-screen rematch and local solo left unforced. See DECISIONS.
- 2026-08-17 Fixed low-contrast `HomeTopBar` back/settings icons (were `bg-white/10`, nearly invisible on light photo backgrounds) - now a solid `bg-black/45 text-white` pill, legible everywhere.
- 2026-08-17 Removed redundant "la Bouilla" h1 title from `app/bouilla/page.tsx` splash screen (text already visible in background image).
- 2026-08-17 Added an online-only "Nouvelle partie" rematch button on the Coinche/Bouilla finished screen: new `rematchGame(gameId)` server action restarts a fresh match in the same room (same `room_code`), skipping the lobby; the old "Nouvelle partie" home link is now correctly labeled "Retour à l'accueil".
- 2026-08-17 Replaced Bouilla splash background with `bouilla-full.jpg` in both `app/bouilla/page.tsx` and the bouilla-tab branch of `app/page.tsx`; Coinche keeps `splashscreen.jpg`.
