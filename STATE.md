# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Stabilize gameplay UX and scoring options (including advanced contracts).
Last_Action: Added "BIM!" flash animation when a non-trump ace is cut by trump. BimFlash component in GameTableScene detects via bimTrickKey (computed in GameTable from lastTrick). CSS keyframe in globals.css. tsc clean.
Next_Actions:
- Manually play a local solo deal and confirm the UI no longer freezes during bot turns and bots play the ISMCTS card.
- Manually play an online game vs bots to confirm the worker path submits moves correctly.
- Resume the Supabase/Vercel deployment sequence.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 "BIM!" flash animation added: triggers when a non-trump ace is cut by trump. BimFlash in GameTableScene, computeBimKey in GameTable, bim-flash CSS keyframe in globals.css. tsc clean.
- 2026-06-10 Bot punch setting (low/med/high) added as a slider in GameSettingsPanel; maps to PUNCH_CONTRIBUTION 20/26/32 (default med); threaded via local URL + online settings.botPunch. tsc clean, 38 tests, build OK. See DECISIONS + DATA_MODEL.
- 2026-06-10 Re-calibrated bot bidding: PARTNER_CONTRIBUTION 12 -> 26 (contract rate ~60% -> ~99%, avg value ~85 -> ~92). tsc clean, 38 tests. See DECISIONS.
- 2026-06-10 Added reshuffle button ("Nouvelle donne") in game-info-panel; shown only before first card is played; onReshuffle action added to GameActions + useLocalGame (beginNextDeal, keeps scores).
- 2026-06-10 Fixed bidding hang: useBotWorker runs bidding on the main thread; only ISMCTS play goes to the worker, with a 4s watchdog + onerror fallback (decide() always resolves, logs "[bot] worker ..." once if it abandons the worker). tsc clean.
- 2026-06-10 Bot ISMCTS moved to a Web Worker (botWorker.ts + useBotWorker); useBotRunner awaits decide(); useLocalGame now uses the strong ISMCTS bot (was weak engine bot). UI no longer blocks during bot turns. tsc clean, 38 tests, next build OK. See DECISIONS.
- 2026-06-10 Fixed deterministic deal: seedFromParams in local/play/page.tsx now falls back to Math.random() (server-side, runs fresh per request) instead of a hash of targetPoints. Explicit ?seed= param preserved for reproducibility.
- 2026-06-10 Extracted GameSettingsPanel: single shared component for all 8 scoring fields; added 3 missing fields to GameSettings (online) + sanitizeSettings + startGame. No duplication between local/online setup screens.
- 2026-06-10 Removed bot difficulty: single strategy (former hard); deleted Difficulty type/params, easy random branch, GameSettings.botDifficulty, setup selectors, difficultyLabel, "bots" i18n key. tsc clean, 38 tests green. See DECISIONS.
- 2026-06-10 Added ScoringRules.requireMorePointsToWin (default true): finalizeDeal keeps playing on an exact tie at target instead of awarding via contract; toggle "+ de points pour gagner" on local+online setup, online GameSettings + sanitize. tsc clean, 38 tests green.
