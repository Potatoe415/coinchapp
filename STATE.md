# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover. Bouilla's bot AI just got a research-driven pass. Builds and tests pass. **User just hit a production "can't start a game" crash - see Current_Goal.**
Current_Goal: User hit "can't start a game anymore" (generic Next.js Server Components render-error digest) after today's `getUser()` -> `getClaims()` switch + the idle-timer feature. Hardened `getUserId()` against `getClaims()` throwing (done); still waiting on the user to confirm whether `supabase/migrations/0001_init.sql` (grew two columns for the idle-timer feature) was re-run against their live Supabase project, and to re-test.
Last_Action: Hotfixed `lib/supabase/server.ts`'s `getUserId()`: `getClaims()` can throw outright (e.g. a failed JWKS fetch) instead of returning `{ error }` like the rest of the auth API - this was crashing the whole render uncaught. Now wrapped in try/catch, falling back to `getUser()`. Typecheck/lint/build all pass. Flagged to the user, unresolved: `games.turn_started_at`/`game_players.missed_turns_in_row` (added earlier today for the idle-turn timer) only exist in the migration file - if the user's live Supabase project hasn't had `0001_init.sql` re-run since, starting a game (first explicit write of `turn_started_at`) would fail with a Postgres "column does not exist" error, independent of the getClaims bug; not fixable from code. Separately, also added a `// TEMP` console.debug timing log in `lib/client/useBotRunner.ts` (decide/submit/refetch ms breakdown) for a still-open, unrelated ~5s intermittent bot-move delay report (Bouilla only; worker/watchdog theory ruled out since Bouilla's bot has no worker) - no data collected yet.
Next_Actions:
- User to confirm whether `supabase/migrations/0001_init.sql` was re-run against their live Supabase project since the idle-timer feature landed. Full-reset script (wipes existing games) per RUNBOOK.
- User to re-test "start a game" after this hotfix; if still broken, get the actual error from Vercel function logs / Supabase logs (not just the redacted client digest).
- Once unblocked: collect a `[bot] seat X decide=... submit=... refetch=... total=...` console line for the still-open ~5s Bouilla bot delay report, to localize which phase is slow.
- Remove the `// TEMP` diagnostic log in `useBotRunner.ts` once that investigation concludes.
- Manually play a few local Bouilla games against bots to confirm the recent bot AI fix "feels" right beyond what the unit tests cover.
- Manually play an online game (2+ browsers) and let one seat go idle: confirm the "are you still there?" banner/timeout/bot-conversion flow end-to-end (not yet manually tested against live Supabase).
- Manually check the "Create online game" screen for both Coinche and Bouilla: confirm the new timeout select appears and Bouilla's settings panel now renders (previously hidden entirely).
- Confirm with user whether to record the idle-turn timer as a new Core_Feature in `docs/PRODUCT.md` (not edited autonomously per file-ownership rules).
- Switch to English and manually play through Bouilla local/online/ad-hoc for UI validation; repeat key screens in French.
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC run) - pending from before.
- Wire `useMatchStats` into the scoring/finished screen (pending from before).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Is a full endgame minimax solver for Bouilla's `lastTrick`/`everything` last few tricks worth building later (flagged during bot research, explicitly deferred)?

Recent_Changes:
- 2026-07-17 Hotfix: `getUserId()` no longer crashes the render if `getClaims()` throws (falls back to `getUser()`). Flagged a possible second, unconfirmed cause (stale Supabase schema vs. new idle-timer columns). See DECISIONS.
- 2026-07-17 Fixed a Bouilla bot bug (vacuous-truth "Capot" check causing absurd early big-card plays), recalibrated king-of-spades danger weight, added a `lastTrick` endgame heuristic. See DECISIONS.
- 2026-07-17 Added an online-only "are you still there?" idle-turn timer + permanent bot takeover for both games, with a new configurable `stillThereTimeoutSec` setting. See DECISIONS.
- 2026-07-17 Bouilla gained Coinche's "pre-select while waiting for your turn" behavior, via the same shared `useOptimisticPlay` hook plus a new shared `HandCardSlot` component. See DECISIONS.
- 2026-07-17 Bouilla's card play is now instant online (optimistic UI), via a new shared `useOptimisticPlay` hook also adopted by Coinche's `GameTable`. See DECISIONS.
