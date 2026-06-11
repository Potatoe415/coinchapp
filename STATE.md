# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Rewrote BIM! triggers in `computeBimKey`: fires when 2nd card trumps a leading Ace (trigger A, immediate) OR when 4th card trumps it after cards 2&3 didn't (trigger B). No other case fires.
Next_Actions:
- Optional: infer trump voids from a defausse on a non-trump lead in `botSim.ts` (conditional on partner-not-master).
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-11 BIM! triggers rewritten: fires on 2nd-card trump cut OR 4th-card trump cut (when 2&3 didn't cut); no team check, no other cases (`computeBimKey` in `GameTable.tsx`).
- 2026-06-11 Bot stops pulling trumps when none remain outside its hand (`leadWinnersWhenTrumpsExhausted`, client `choosePlayAction`); added `lib/coinche/bot.test.ts`.
- 2026-06-11 Bot determinization tracks known suit voids (chicanes) in `botSim.ts` (`dealConstrained` + retries/fallback); added vitest `@` alias and `botSim.test.ts`.
- 2026-06-11 Added "DERNIER PLI (X pts)" below contract pill in game header during playing phase; same pts shown in GameInfoPanel; `trickPoints()` helper in `GameHud.tsx`.
- 2026-06-11 Added bilingual Rules popup button next to Reset on home screen; `RulesModal` component with 6 beginner sections (FR/EN), switches with locale from `useI18n`.
- 2026-06-11 Bots never cut (ruff) when their partner is master and a non-trump discard exists (`avoidCuttingPartner`), in both server and client play paths.
