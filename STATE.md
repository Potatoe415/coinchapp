# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens/clubs end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Local (solo) play is now offline/reload-proof: a PWA manifest + service worker + localStorage match persistence let a plane/no-signal user reload or relaunch mid-game without losing anything. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Confirm the offline PWA work end-to-end on a real phone (Android + iPhone), and get user confirmation on whether/how to record it in `docs/TECH.md`.
Last_Action: Root-caused and fixed the intermittent 3-15s per-bot-move delay in online Bouilla (see previous Recent_Changes entry for the mechanism: redundant same-turn refetches were cancelling and restarting the bot's in-flight decide; now gated by turn number instead of view-object identity). On top of that, extended the debug overlay per user request: added `submitBotMoveTimed`/`getViewTimed` server actions that self-report the Vercel function's own execution time (`Date.now()` before/after, excluding network transit), wired through `useBotRunner` only when `debug` is on (so normal play makes zero extra calls); `BotDebugOverlay.tsx` now shows that server time as a small sub-line under the "coup joué"/"sync" cells, plus a CSV export button (top of the panel) that downloads the full rolling log for offline analysis/sharing. Tests (122)/build/lint green; deployed.
Next_Actions:
- Ask the user to retest online Bouilla (solo host + 3 bots) with debug mode on: confirm the handoff column now stays low (no more 12-13s spikes), and check the new server-time sub-values / CSV export work as expected.
- Manually confirm on a live/ad-hoc Bouilla game (tricks or everything round) that a bot holding a bare high card (Ace/King) alongside other cards no longer leads that bare high card when a safer alternative exists (bot.ts fix from last session).
- Manually confirm the bot-thinking-time slider end to end in each mode (online, local, ad-hoc) for both games.
- Manually confirm the emoji-reaction-over-recap fix on a real 4-seat game (Coinche deal-end and Bouilla round-end): send a reaction just before the recap appears and check it's still visible, from more than one player's screen if possible.
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
- 2026-07-28 Bot debug overlay now also shows each phase's Vercel-reported server execution time (vs. client-measured round trip) and has a CSV export button for the rolling log.
- 2026-07-28 Fixed the root cause of the intermittent 3-15s per-bot-move delay: `useBotRunner`'s effect re-ran (and cancelled an in-flight bot decide) on every redundant refetch of the same turn (the bot's own move echoing back via `game_events`/postgres_changes, or the 15s safety poll), each cancellation wasting a full `thinkMs` retry cycle. Now gated by turn number instead of by view-object identity, so redundant refetches are ignored (`useBotRunner.ts`).
- 2026-07-28 New in-game "debug mode" for Bouilla online (lobby checkbox + top-right toggle button + live timing overlay), used to diagnose the delay above. `useBotRunner.ts` exposes per-move handoff/decide/submit/refetch timings; `BotDebugOverlay.tsx` renders them live, host-only.
- 2026-07-22 Bouilla bot no longer leads a bare unbeatable card (e.g. a lone Ace) just because it has no tracked point value - it now weighs "will this lead guarantee winning the trick" too (`lib/bouilla/bot.ts`).
- 2026-07-22 New "bot thinking time" setting (800ms-4s, default 800), shared by both games and every mode (online/local/ad-hoc) - `GameSettings.botThinkMs`. See DECISIONS.
- 2026-07-22 Web Worker bot brain (`useBotWorker.ts`) no longer permanently disables itself after one slow/timed-out reply - only a genuine worker error does. Fixes bot stalls compounding across a whole game session; root-caused from a user report of bots occasionally stalling 5-10s.
