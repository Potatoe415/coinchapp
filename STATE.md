# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens/clubs end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Local (solo) play is now offline/reload-proof: a PWA manifest + service worker + localStorage match persistence let a plane/no-signal user reload or relaunch mid-game without losing anything. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Confirm the offline PWA work end-to-end on a real phone (Android + iPhone), and get user confirmation on whether/how to record it in `docs/TECH.md`.
Last_Action: User keeps reporting an intermittent 3-10s (sometimes 15s) delay per bot move in online Bouilla, even solo (host + 3 bots, no other players/network variable). A live capture (browser automation against prod) right after a fresh deploy showed only ~1.6-2.0s/move (decide~800ms + submit/refetch~0.5-1.2s) - consistent with a cold-start theory, but the user says it still happens after warmup, so that is not the full story. Since I can't reproduce it live in every session, built an in-game debug tool instead: `useBotRunner.ts` now returns a rolling `BotTimingEntry[]` log (handoff/decide/submit/refetch/total per bot move, `debug` param gates the console.log + state updates) and a new `BotDebugOverlay.tsx` (host-only, Bouilla-only, top-right "🐛 Debug" toggle button revealing a semi-transparent live timing table) is wired through `GameRoom.tsx`. Enabled via a new "Mode debug" checkbox in the online lobby (`Lobby.tsx`, host + Bouilla only), state held in `GameRoom` (not persisted - resets on reload, deliberately not added to `GameSettings`/DB since only the host's own browser ever has this data). Tests (122)/build/lint green.
Next_Actions:
- Ask the user to check the new debug checkbox in a Bouilla online lobby, play a few bot turns, and report which specific column (handoff/decide/submit/refetch) spikes when a move takes 10s+ - that pinpoints the real bottleneck (render/effect scheduling vs. network vs. bot compute) instead of guessing further.
- Once the slow phase is identified, fix the actual root cause (this debug tool is diagnostic-only, not the fix).
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
- 2026-07-28 New in-game "debug mode" for Bouilla online (lobby checkbox + top-right toggle button + live timing overlay) to diagnose an unresolved intermittent 3-15s per-bot-move delay report. `useBotRunner.ts` now exposes per-move handoff/decide/submit/refetch timings; `BotDebugOverlay.tsx` renders them live, host-only.
- 2026-07-22 Bouilla bot no longer leads a bare unbeatable card (e.g. a lone Ace) just because it has no tracked point value - it now weighs "will this lead guarantee winning the trick" too (`lib/bouilla/bot.ts`).
- 2026-07-22 New "bot thinking time" setting (800ms-4s, default 800), shared by both games and every mode (online/local/ad-hoc) - `GameSettings.botThinkMs`. See DECISIONS.
- 2026-07-22 Web Worker bot brain (`useBotWorker.ts`) no longer permanently disables itself after one slow/timed-out reply - only a genuine worker error does. Fixes bot stalls compounding across a whole game session; root-caused from a user report of bots occasionally stalling 5-10s.
- 2026-07-22 Opponents' emoji reactions (and, symmetrically, your own reaction as seen by others) are now visible above the end-of-round/end-of-deal score recap overlay in both games, instead of being hidden behind it (pure z-index fix, no decision logged).
