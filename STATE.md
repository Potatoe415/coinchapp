# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Fixed online create regression (lobby showed 4 empty seats). `createGame` no longer sends `game_type` explicitly (relies on column default, so create works even if the migration hasn't run) and now checks the seat insert error (deletes the orphan game + throws instead of swallowing). Added `notify pgrst, 'reload schema'` to `0001_init.sql` so re-running the DDL refreshes the API cache.
Next_Actions:
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI.
- Optional: infer trump voids from a defausse on a non-trump lead in `botSim.ts` (conditional on partner-not-master).
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-13 Fixed online create showing 4 empty seats: `createGame` relies on `game_type` default + checks the seat insert error; SQL re-adds `notify pgrst, 'reload schema'`.
- 2026-06-12 Merged all SQL into one re-runnable `0001_init.sql` (full DB reset at top: unschedule cron + drop cascade); deleted `0002`/`0003`.
- 2026-06-12 Added `games.game_type` discriminator (Option A, default 'coinche') to host multiple games in one Supabase project; `GameType` type added. Non-breaking.
- 2026-06-11 Partner surcoinche: after coinche, bidder's partner now gets a turn to surcoinche before bidding closes (`applyBid` + `partnerOf` in `bidding.ts`).
- 2026-06-11 Added `lib/client/useMatchStats.ts`: 5 funny awards hook with localStorage persistence across rounds; zero game logic changes.
