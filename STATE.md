# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover. Bouilla's bot AI just got a research-driven pass. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`); a production-breaking bug just got found and fixed via the Vercel MCP - see Current_Goal.
Current_Goal: Home screen Bouilla color-override shipped; confirm visuals look right in browser.
Last_Action: Home screen game-picker: renamed "la Bouilla" → "Bouilla" in both i18n locales; when Bouilla tab is selected, overrides `--accent-yellow` → `--accent-red` and `--accent-cyan` → `--accent-green` via inline CSS vars on `<main>`, recoloring all action buttons without touching global CSS.
- [prev] Root-caused and fixed the actual "can't start a game" crash (the `getUserId()`/`getClaims()` hotfix and a migration re-run were both red herrings - neither was the real cause). Authenticated the Vercel MCP and used `get_runtime_errors` to read the real (non-redacted) production error: `ReferenceError: BotMove is not defined` at module evaluation of the `/game/[id]` route, 51 occurrences. Cause: `lib/server/actions-game.ts` (a `"use server"` file) had `export type { BotMove, WireCard };` re-exporting types imported from `./game-dispatch` rather than declared locally - Next.js/Turbopack's "use server" export transform does not handle that pattern and emits a runtime reference to a type that doesn't exist, crashing the whole module (not just the action) on every request. Fixed by deleting the re-export; `lib/client/useBotRunner.ts` now imports `BotMove` directly from `@/lib/server/game-dispatch`. Committed and pushed (`302df7f`); Vercel auto-deployed, new deployment is READY and aliased to production. Also still-standing from earlier: the `getUserId()` `getClaims()`-throws-hardening hotfix (harmless, kept) and a `// TEMP` bot-move timing diagnostic in `useBotRunner.ts` for an unrelated, still-open ~5s Bouilla bot-delay report (no data collected yet).
Next_Actions:
- User to re-test "start a game" on production now that the fix is deployed; if anything is still broken, re-query `get_runtime_errors` via the Vercel MCP rather than trusting the redacted client digest (which carries no diagnostic value on its own).
- Once unblocked: collect a `[bot] seat X decide=... submit=... refetch=... total=...` console line for the still-open ~5s Bouilla bot delay report, to localize which phase is slow.
- Remove the `// TEMP` diagnostic log in `useBotRunner.ts` once that investigation concludes.
- Audit is unlikely to find more instances, but worth remembering: any `"use server"` file must never re-export a type imported from elsewhere (see DECISIONS) - only `actions-game.ts`/`actions-lobby.ts` exist today and both are now clean.
- Manually play a few local Bouilla games against bots to confirm the recent bot AI fix "feels" right beyond what the unit tests cover.
- Manually play an online game (2+ browsers) and let one seat go idle: confirm the "are you still there?" banner/timeout/bot-conversion flow end-to-end.
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
- 2026-07-17 Doubled displayed emoji sizes in EmojiButton and PlayerBadge; added 🖕 to emoji picker choices.
- 2026-07-17 Fixed the real "can't start a game" production crash: a broken `export type` re-export in `actions-game.ts` (a `"use server"` file) crashed `ReferenceError: BotMove is not defined` on every `/game/[id]` request. Found via the Vercel MCP's `get_runtime_errors`, deployed. See DECISIONS.
- 2026-07-17 Hotfix: `getUserId()` no longer crashes the render if `getClaims()` throws (falls back to `getUser()`) - harmless but was not the actual root cause of the crash above. See DECISIONS.
- 2026-07-17 Fixed a Bouilla bot bug (vacuous-truth "Capot" check causing absurd early big-card plays), recalibrated king-of-spades danger weight, added a `lastTrick` endgame heuristic. See DECISIONS.
- 2026-07-17 Added an online-only "are you still there?" idle-turn timer + permanent bot takeover for both games, with a new configurable `stillThereTimeoutSec` setting. See DECISIONS.
- 2026-07-17 Bouilla gained Coinche's "pre-select while waiting for your turn" behavior, via the same shared `useOptimisticPlay` hook plus a new shared `HandCardSlot` component. See DECISIONS.
- 2026-07-17 Bouilla's card play is now instant online (optimistic UI), via a new shared `useOptimisticPlay` hook also adopted by Coinche's `GameTable`. See DECISIONS.
