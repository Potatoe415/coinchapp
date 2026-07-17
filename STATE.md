# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Bouilla's bot AI just got a research-driven pass. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Idle-turn timer's tap-to-dismiss follow-up shipped; needs manual verification (see Next_Actions).
Last_Action: Added `markStillHere` server action (`lib/server/actions-game.ts`, backed by `markSeatPresent` in `lib/server/idle-timer.ts`) that resets `missed_turns_in_row` and restarts `turn_started_at` on demand. `lib/client/useStillThereTimer.ts` now attaches a one-shot `pointerdown` listener on `document` while the "are you still there?" banner shows, calling `markStillHere` then refetching, without blocking the tap from also reaching an underlying card. Typecheck/lint (pre-existing unrelated issues only)/120-test suite/production build all clean. See DECISIONS.
Next_Actions:
    10|- Manually play an online game (2+ browsers): let a seat go idle, confirm the banner shows on schedule, then tap anywhere off any card and confirm the banner disappears and the seat is NOT auto-played-for/bot-converted afterward.
- Manually play an online game (2+ browsers) and let one seat go idle without ever tapping: confirm the banner shows at the right time, the random auto-play happens on schedule, the second miss converts the seat to a bot, and the original player becomes a spectator.
- Manually check the "Create online game" screen for both Coinche and Bouilla: confirm the timeout select appears and Bouilla's settings panel now renders (previously hidden entirely).
- Confirm with user whether to record the idle-turn timer as a new Core_Feature in `docs/PRODUCT.md` (not edited autonomously per file-ownership rules).
- Manually play a few local Bouilla games against bots to confirm the recent bot AI fix "feels" right beyond what the unit tests cover.
- Switch to English and manually play through Bouilla local/online/ad-hoc for UI validation; repeat key screens in French.
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC run) - pending from before.
- Wire `useMatchStats` into the scoring/finished screen (pending from before).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
    20|- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion (each tap fully resets the streak) - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's `lastTrick`/`everything` last few tricks worth building later (flagged during bot research, explicitly deferred)?

Recent_Changes:
- 2026-07-17 Idle-turn timer: a tap anywhere on screen now dismisses the "are you still there?" banner (new `markStillHere` action + client tap listener), not only playing a card. See DECISIONS.
- 2026-07-17 Doubled displayed emoji sizes in EmojiButton and PlayerBadge; added 🖕 to emoji picker choices.
- 2026-07-17 Fixed the real "can't start a game" production crash: a broken `export type` re-export in `actions-game.ts` (a `"use server"` file) crashed `ReferenceError: BotMove is not defined` on every `/game/[id]` request. Found via the Vercel MCP's `get_runtime_errors`, deployed. See DECISIONS.
- 2026-07-17 Fixed a Bouilla bot bug (vacuous-truth "Capot" check causing absurd early big-card plays), recalibrated king-of-spades danger weight, added a `lastTrick` endgame heuristic. See DECISIONS.
- 2026-07-17 Added an online-only "are you still there?" idle-turn timer + permanent bot takeover for both games, with a new configurable `stillThereTimeoutSec` setting. See DECISIONS.
