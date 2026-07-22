# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens/clubs end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Local (solo) play is now offline/reload-proof: a PWA manifest + service worker + localStorage match persistence let a plane/no-signal user reload or relaunch mid-game without losing anything. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Confirm the offline PWA work end-to-end on a real phone (Android + iPhone), and get user confirmation on whether/how to record it in `docs/TECH.md`.
Last_Action: Fixed a Bouilla bot heuristic bug (user report: bot led the bare Ace of Spades on a "no tricks" round despite holding lower spades, then captured an opponent's forced King of Spades). Root cause in `lib/bouilla/bot.ts`: `cardDanger()` only scores a card by its own tracked point value (king of spades / queen / club / late control-card) - an Ace carries none of those, so it looked like the "safest" lead, even though being the top rank of its suit makes it an unbeatable, guaranteed-win lead that invites void opponents to safely dump their worst cards straight into it. Added `unseenCards()` + `unbeatableLeadRisk()`: `chooseLead` now also penalizes any card that no unseen card of its suit could beat, as heavily as the king-of-spades weight, so a genuinely low/safe card is preferred whenever one exists. New regression test added (122 total, all green); build/lint clean (pre-existing unrelated warnings untouched).
Next_Actions:
- Manually confirm on a live/ad-hoc game (tricks or everything round) that a bot holding a bare high card (Ace/King) alongside other cards no longer leads that bare high card when a safer alternative exists.
- Manually confirm the new bot-thinking-time slider end to end in each mode (online, local, ad-hoc) for both games: dragging it changes both the bot's visible pause and (for Coinche) play strength: sanity-check that a bot doesn't stall the whole table for 4s+ every single turn at the max setting.
- Ask the reporting user to reproduce the earlier bot-stall report and check the host's browser devtools console for the `[bot] seat N decide=...ms submit=...ms refetch=...ms` log (`lib/client/useBotRunner.ts`), to confirm whether `decide` (worker/watchdog) is still the bottleneck after the `useBotWorker.ts` permanent-death fix or something else is.
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
- 2026-07-22 Bouilla bot no longer leads a bare unbeatable card (e.g. a lone Ace) just because it has no tracked point value - it now weighs "will this lead guarantee winning the trick" too (`lib/bouilla/bot.ts`).
- 2026-07-22 New "bot thinking time" setting (800ms-4s, default 800), shared by both games and every mode (online/local/ad-hoc) - `GameSettings.botThinkMs`. See DECISIONS.
- 2026-07-22 Web Worker bot brain (`useBotWorker.ts`) no longer permanently disables itself after one slow/timed-out reply - only a genuine worker error does. Fixes bot stalls compounding across a whole game session; root-caused from a user report of bots occasionally stalling 5-10s.
- 2026-07-22 Opponents' emoji reactions (and, symmetrically, your own reaction as seen by others) are now visible above the end-of-round/end-of-deal score recap overlay in both games, instead of being hidden behind it (pure z-index fix, no decision logged).
- 2026-07-22 Bouilla "clubs" round now also ends early once all 13 clubs have fallen, same pattern as kingSpades/queens. See DECISIONS.
