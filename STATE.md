# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Consolidated all SQL into a single re-runnable `supabase/migrations/0001_init.sql` (full reset: unschedule cron + drop tables cascade, then schema incl. `game_type` + 48h TTL cron). Deleted `0002`/`0003`; updated RUNBOOK + DATA_MODEL.
Next_Actions:
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI.
- Optional: infer trump voids from a defausse on a non-trump lead in `botSim.ts` (conditional on partner-not-master).
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-12 Merged all SQL into one re-runnable `0001_init.sql` (full DB reset at top: unschedule cron + drop cascade); deleted `0002`/`0003`.
- 2026-06-12 Added `games.game_type` discriminator (Option A) to host multiple games in one Supabase project; `GameType` type, `createGame` sets it. Non-breaking.
- 2026-06-11 Partner surcoinche: after coinche, bidder's partner now gets a turn to surcoinche before bidding closes (`applyBid` + `partnerOf` in `bidding.ts`).
- 2026-06-11 Added `lib/client/useMatchStats.ts`: 5 funny awards hook with localStorage persistence across rounds; zero game logic changes.
- 2026-06-11 BIM! triggers rewritten: fires on 2nd-card trump cut OR 4th-card trump cut (when 2&3 didn't cut); no team check, no other cases (`computeBimKey` in `GameTable.tsx`).
