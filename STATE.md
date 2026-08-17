# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens/clubs end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Local (solo) play is now offline/reload-proof: a PWA manifest + service worker + localStorage match persistence let a plane/no-signal user reload or relaunch mid-game without losing anything. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Confirm the new Bouilla bot play in a real game (no more early aces, visible void-building), then the offline PWA work end-to-end on a real phone.
Last_Action: From the sibling `bergamots` hub project: `lib/client/i18n.tsx`'s `I18nProvider` now reads a `?lang=fr|en` URL param before falling back to its own `coinchapp-locale` localStorage, so a hub tile can force-launch this app in a given language (the hub always appends `?lang=<code>` to its external tile links). `es`/unknown values are ignored, falling back to existing storage/default as before. Verified with `npm run build` and `npm run lint` (no new warnings; only the pre-existing `useMatchStats.ts` issue remains).
Next_Actions:
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
- 2026-08-17 `I18nProvider` now honors a `?lang=` URL param (fr/en) over its own stored locale, so the `bergamots` hub can force the starting language on launch (see Last_Action).
- 2026-08-03 Bouilla bots stop chasing/breaking a Capot on one trick's evidence (half-done threshold) and now play to run a suit dry, on leads and on discards - fixes "the bots play their aces when they shouldn't take the trick".
- 2026-07-28 Opponents' name+emoji reaction no longer floats over the deal/round recap card: hidden at their usual table spot while the recap is up, shown instead in a new bottom `OpponentReactionsBar` that can't overlap it (pure UI fix, follow-up to the 2026-07-22 emoji-visibility fix).
- 2026-07-28 Bot debug overlay now also shows each phase's Vercel-reported server execution time (vs. client-measured round trip) and has a CSV export button for the rolling log.
- 2026-07-28 Fixed the root cause of the intermittent 3-15s per-bot-move delay: `useBotRunner`'s effect re-ran (and cancelled an in-flight bot decide) on every redundant refetch of the same turn (the bot's own move echoing back via `game_events`/postgres_changes, or the 15s safety poll), each cancellation wasting a full `thinkMs` retry cycle. Now gated by turn number instead of by view-object identity, so redundant refetches are ignored (`useBotRunner.ts`).
