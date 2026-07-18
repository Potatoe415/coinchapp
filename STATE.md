# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Bouilla's bot AI just got a research-driven pass. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Language switcher added to the in-game info panel.
Last_Action: Added language row (FR/EN buttons) to `GameInfoPanel` in `GameHud.tsx`; destructured `locale` and `setLocale` from `useI18n`. `LanguageSwitcher` already hid itself during games. TypeScript clean.
Next_Actions:
- Manually play a Bouilla game to end and confirm winner + full round table appear correctly on the finished screen.
- Manually play an online game (2+ browsers): let a seat go idle, confirm the banner shows on schedule, then tap anywhere off any card and confirm the banner disappears and the seat is NOT auto-played-for/bot-converted afterward.
- Manually check the "Create online game" screen for both Coinche and Bouilla: confirm the timeout select appears and Bouilla's settings panel now renders.
- Confirm with user whether to record the idle-turn timer as a new Core_Feature in `docs/PRODUCT.md` (not edited autonomously per file-ownership rules).
- Wire `useMatchStats` into the scoring/finished screen (pending from before).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?

Recent_Changes:
- 2026-07-18 Added language switcher (FR/EN buttons) to `GameInfoPanel` in `GameHud.tsx` — visible during any game.
- 2026-07-18 Bouilla round+finished overlays: replaced 2x2 grid with full BouillaScoreTable in both states.
- 2026-07-18 Added "Randomize seats" checkbox (default: checked) to online lobby; shuffles seat occupants server-side on game start.
- 2026-07-17 Idle-turn timer: a tap anywhere on screen now dismisses the "are you still there?" banner (new `markStillHere` action + client tap listener), not only playing a card. See DECISIONS.
- 2026-07-17 Fixed the real "can't start a game" production crash: a broken `export type` re-export in `actions-game.ts`. See DECISIONS.
