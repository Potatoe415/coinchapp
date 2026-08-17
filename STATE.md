# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens/clubs end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Local (solo) play is now offline/reload-proof: a PWA manifest + service worker + localStorage match persistence let a plane/no-signal user reload or relaunch mid-game without losing anything. Online finished screens (Coinche + Bouilla) now offer a "Nouvelle partie" rematch that restarts a fresh match in the same room without a lobby detour. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Previously pending Bouilla bot play / offline PWA verifications (see below); the online rematch button is now shipped and verified.
Last_Action: Added an online-only "Nouvelle partie" rematch on the finished screen (Coinche `DealOverlay.tsx` + Bouilla `BouillaRoundOverlay.tsx`): new server action `rematchGame(gameId)` in `lib/server/actions-lobby.ts` (auth'd seated-member check, requires `status === "finished"`, reuses `startInitialState` to build a fresh deal/round for the same `game_type`/`settings`, `persistGame`s it straight to `"playing"` - same `room_code`/`game_players` row, no lobby detour - and bulk-resets every seat's `missed_turns_in_row` so idle-timer misses never carry over into the new match). Wired an optional `onRematch` action through `GameRoom.tsx` -> `GameActions`/`BouillaActions` (`GameTable.tsx`/`BouillaTable.tsx`) -> `GameTableScene.tsx` -> the two overlays; only online play supplies it (local/ad-hoc leave it undefined, so the button is simply absent there). Repurposed the existing `finished-home-button` link to say `t("backHome")` ("Retour à l'accueil") instead of the now-inaccurate `t("newGame")` ("Nouvelle partie"), and gave the new rematch button `data-id="finished-rematch-button"` with that `t("newGame")` label instead - no new i18n keys needed, both already existed. Verified with `npm run build`, `npm run lint` (no new warnings), `npm test` (130/130), and live in the browser: created a real online Bouilla room (code `RS6`), used a throwaway script (`lib/bouilla`'s pure engine, deleted after use) to fast-forward its DB row straight to a `"finished"` state rather than manually playing 6 full rounds, confirmed the finished screen shows both buttons, clicked "Nouvelle partie", and confirmed it landed directly back in round 1/6 playing, same room code `RS6`, all scores at 0.
Next_Actions:
- Manually confirm on a phone that both coinchapp hub tiles (Coinche + Bouilla) now have a genuinely clickable back button and a working settings/language button.
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
- 2026-08-17 Added an online-only "Nouvelle partie" rematch button on the Coinche/Bouilla finished screen: new `rematchGame(gameId)` server action restarts a fresh match in the same room (same `room_code`), skipping the lobby; the old "Nouvelle partie" home link is now correctly labeled "Retour à l'accueil".
- 2026-08-17 Replaced Bouilla splash background with `bouilla-full.jpg` in both `app/bouilla/page.tsx` and the bouilla-tab branch of `app/page.tsx`; Coinche keeps `splashscreen.jpg`.
- 2026-08-17 Added/fixed top-left "back to hub" buttons + top-right settings/language panel on `app/page.tsx` and `app/bouilla/page.tsx` (new shared `components/HomeTopBar.tsx`), also fixing a z-index bug that made the back button unclickable.
- 2026-08-17 `I18nProvider` now honors a `?lang=` URL param (fr/en) over its own stored locale, so the `bergamots` hub can force the starting language on launch.
- 2026-08-03 Bouilla bots stop chasing/breaking a Capot on one trick's evidence (half-done threshold) and now play to run a suit dry, on leads and on discards - fixes "the bots play their aces when they shouldn't take the trick".
- 2026-07-28 Opponents' name+emoji reaction no longer floats over the deal/round recap card: hidden at their usual table spot while the recap is up, shown instead in a new bottom `OpponentReactionsBar` that can't overlap it (pure UI fix, follow-up to the 2026-07-22 emoji-visibility fix).
