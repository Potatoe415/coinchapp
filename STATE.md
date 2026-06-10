# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Stabilize gameplay UX and scoring options (including advanced contracts).
Last_Action: Extracted shared GameSettingsPanel component (components/GameSettingsPanel.tsx). Both local and online setup pages now use the same component with all 8 scoring fields. Added countContractOnlyIfMade, failedContractDefensePoints, zeroPointsForNonContractingTeamWhenContractMade to GameSettings + sanitizeSettings + startGame.
Next_Actions:
- Manually verify settings panel looks and behaves identically on local and online setup screens.
- Manually play a TA and an SA deal vs bots to sanity-check ordering, cutting rules and scores.
- Resume the Supabase/Vercel deployment sequence.

Open_Questions:
- Manual Belote/Rebelote announcement vs current auto-detection?
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 Extracted GameSettingsPanel: single shared component for all 8 scoring fields; added 3 missing fields to GameSettings (online) + sanitizeSettings + startGame. No duplication between local/online setup screens.
- 2026-06-10 Removed bot difficulty: single strategy (former hard); deleted Difficulty type/params, easy random branch, GameSettings.botDifficulty, setup selectors, difficultyLabel, "bots" i18n key. tsc clean, 38 tests green. See DECISIONS.
- 2026-06-10 Added ScoringRules.requireMorePointsToWin (default true): finalizeDeal keeps playing on an exact tie at target instead of awarding via contract; toggle "+ de points pour gagner" on local+online setup, online GameSettings + sanitize. tsc clean, 38 tests green.
- 2026-06-10 DealOverlay: added cardPoints (raw trick pts) display per team in end-of-deal popup; new i18n key cardPoints (fr/en).
- 2026-06-10 Added TA/SA enable switch (default OFF) in local+online settings; ScoringRules.allowToutAtoutSansAtout filters bidOptions/BiddingPanel/bots and is enforced in validateBid. tsc clean, 38 tests green.
- 2026-06-10 Added Tout Atout / Sans Atout contracts: TrumpMode type, mode-aware cards/trick/scoring (TA normalized /162, TA belote per suit, SA no trump/no belote), 6 bid buttons, bot TA/SA bidding. Refreshed 5 stale scoring tests to current rules; suite green (38) + tsc clean.
