# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Surcoinche for the bidder's partner — after a coinche, if the declarant passes, the turn now goes to their partner who can also surcoinche (or pass to close with ×2). `applyBid` in `bidding.ts` updated; 3 new tests added; 8/8 pass.
Next_Actions:
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI.
- Optional: infer trump voids from a defausse on a non-trump lead in `botSim.ts` (conditional on partner-not-master).
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-11 Partner surcoinche: after coinche, bidder's partner now gets a turn to surcoinche before bidding closes (`applyBid` + `partnerOf` in `bidding.ts`).
- 2026-06-11 Added `lib/client/useMatchStats.ts`: 5 funny awards hook with localStorage persistence across rounds; zero game logic changes.
- 2026-06-11 BIM! triggers rewritten: fires on 2nd-card trump cut OR 4th-card trump cut (when 2&3 didn't cut); no team check, no other cases (`computeBimKey` in `GameTable.tsx`).
- 2026-06-11 Bot stops pulling trumps when none remain outside its hand (`leadWinnersWhenTrumpsExhausted`, client `choosePlayAction`); added `lib/coinche/bot.test.ts`.
- 2026-06-11 Bot determinization tracks known suit voids (chicanes) in `botSim.ts` (`dealConstrained` + retries/fallback); added vitest `@` alias and `botSim.test.ts`.
