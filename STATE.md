# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Bouilla's bot AI just got a research-driven pass. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Idle-turn timer setup field is now a discrete slider (10/15/20/30/60s) instead of free text; fixed the near-instant-popup bug too.
Last_Action: `stillThereTimeoutSec` field in `GameSettingsPanel.tsx` replaced with a `botPunch`-style slider snapping to the new shared `STILL_THERE_TIMEOUT_OPTIONS` const (`lib/supabase/types.ts`: 10/15/20/30/60); `lib/server/actions-lobby.ts`'s sanitizer now imports that same list instead of its own separate (and now-stale) copy. Also fixed `persistGame` (`lib/server/repo.ts`) to always stamp `turn_started_at`, not only on seat change - winning a trick as its last player (leading the next one, same seat) was wrongly inheriting the already-elapsed clock. See `docs/DECISIONS.md` 2026-07-18 entries. Full test suite green (120 tests), typecheck clean.
Next_Actions:
- Manually play an online game and confirm: the setup slider only offers 10/15/20/30/60s; winning a trick as its last player and leading the next one gives the full configured timeout again (no near-instant popup).
- Manually play a Bouilla game to end and confirm winner + full round table appear correctly on the finished screen.
- Manually check the "Create online game" screen for both Coinche and Bouilla: confirm the timeout select appears and Bouilla's settings panel now renders.
- Confirm with user whether to record the idle-turn timer as a new Core_Feature in `docs/PRODUCT.md` (not edited autonomously per file-ownership rules).
- Wire `useMatchStats` into the scoring/finished screen (pending from before).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?

Recent_Changes:
- 2026-07-18 Idle-turn timeout setup field is now a slider (10/15/20/30/60s), shared options list between client and server. See DECISIONS.
- 2026-07-18 Idle-turn timer: fixed `turn_started_at` not resetting when the same seat leads the next trick (near-instant popup bug). See DECISIONS.
- 2026-07-18 Bouilla home screen: buttons now correctly red/yellow/green via hex overrides in `app/page.tsx`.
- 2026-07-18 Added language switcher (FR/EN buttons) to `GameInfoPanel` in `GameHud.tsx` — visible during any game.
- 2026-07-18 Bouilla round+finished overlays: replaced 2x2 grid with full BouillaScoreTable in both states.
