# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover. Builds and tests pass. Not yet deployed.
Current_Goal: Manually verify the new online idle-turn timer end-to-end (real Supabase-backed game, 2+ browsers), then resume la Bouilla's English UI validation across local/online/ad-hoc modes.
Last_Action: Implemented the online-only "are you still there?" idle-turn timer for both games (user request, scoped via clarifying questions to: both games, online mode only, permanent bot takeover, configurable setting on the create-online-game screen). A human's own turn now has an invisible timeout (`settings.stillThereTimeoutSec`, default 15, both games) before the server auto-plays a random legal card (or the heuristic bid during Coinche bidding) and marks a miss; the seat's very next turn shows a 5s countdown banner immediately, and missing that too permanently converts the seat to a bot. Added `games.turn_started_at` (stamped by `persistGame` whenever `state.turn` changes) and `game_players.missed_turns_in_row`. New `lib/server/idle-timer.ts` (`decideIdleAction` pure/unit-tested, `advanceIdleTurns` DB side effects), called from `getView` ahead of the pre-existing, unrelated 45s browser-gone `advanceStaleTurns` safety net. Extracted `lib/server/game-dispatch.ts` out of `actions-game.ts` (a `"use server"` file can only export async functions, and the new idle-timer module needed the same synchronous dispatch helpers). Client: `lib/client/useStillThereTimer.ts` + non-blocking `components/StillThereModal.tsx` banner wired into `GameRoom.tsx`. Bouilla's online setup screen now shows a settings panel for the first time (previously nothing at all) via new `coincheFields`/`showStillThereTimeout` props on `GameSettingsPanel`; local/ad-hoc Coinche settings screens are unaffected (prop defaults keep them as before). Typecheck, lint (no new issues; one pre-existing unrelated lint error in `useMatchStats.ts` untouched), Vitest (115, up from 108), and production build all pass. Not yet manually tested against a live Supabase instance.
Next_Actions:
- Manually play an online game (2+ browsers) and let one seat go idle: confirm the banner shows at the right time, the random auto-play happens on schedule, the second miss converts the seat to a bot, and the original player becomes a spectator.
- Manually check the "Create online game" screen for both Coinche and Bouilla: confirm the new timeout select appears (styled like the other settings fields) and Bouilla's settings panel now renders (previously hidden entirely).
- Confirm with user whether to record this idle-turn timer as a new Core_Feature in `docs/PRODUCT.md` (not edited autonomously per file-ownership rules).
- Manually play online with a real second device + bots: confirm the peer's move still appears quickly on the host's screen (from prior latency work).
- Manually play a Bouilla online game (2+ browsers): confirm cards play instantly on tap and pre-selection still works (from prior work).
- Switch to English and manually play through Bouilla local (bots), online (2+ browsers), and ad-hoc (host + client), checking setup, lobby/P2P, all six round labels, scoreboard/settings, Capot, next-round waiting, and final results.
- Repeat the key screens in French to catch any i18n regressions.
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC was run) - pending from before this feature.
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI (pending from before this feature).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human (e.g. rejoining via room code), or stay a bot for the rest of that game as implemented?

Recent_Changes:
- 2026-07-17 Added an online-only "are you still there?" idle-turn timer + permanent bot takeover for both games, with a new configurable `stillThereTimeoutSec` setting. See DECISIONS.
- 2026-07-17 Bouilla gained Coinche's "pre-select while waiting for your turn" behavior, via the same shared `useOptimisticPlay` hook plus a new shared `HandCardSlot` component. See DECISIONS.
- 2026-07-17 Bouilla's card play is now instant online (optimistic UI), via a new shared `useOptimisticPlay` hook also adopted by Coinche's `GameTable`. See DECISIONS.
- 2026-07-17 Bouilla UI now follows the selected locale end-to-end, including round/scoring labels, setup modes, table controls, P2P fallback copy, accessibility text, and default player names.
- 2026-07-16 Bouilla bot AI improved: dynamic queen/club danger, void-aware leads, and Capot sweep-alive/sweep-breaking logic. See DECISIONS.
