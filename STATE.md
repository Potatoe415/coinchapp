# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Add a client-side bot brain (heuristic bidding + ISMCTS play) runnable in the browser.
Last_Action: Implemented `lib/client/bot.ts` + `lib/client/botSim.ts` and exposed completed `tricks` in `PlayerView`; tsc/lint/tests pass.
Next_Actions:
- Wire `chooseClientAction` into the bot-turn handler so the UI submits the computed move via the existing Server Action.
- Confirm whether TECH.md "Bots run server-side" should be updated to allow the client brain.
- Resume the Supabase/Vercel deployment sequence.

Open_Questions:
- Manual Belote/Rebelote announcement vs current auto-detection?
- Accounts/stats needed later?
- Client-side bot conflicts with TECH.md "Bots run server-side" - keep both paths or migrate fully to client?

Recent_Changes:
- 2026-06-09 Added client-side bot brain (heuristic bid + time-boxed ISMCTS); `PlayerView` now exposes completed tricks.
- 2026-06-09 Self-played cards now animate before move resolution; completed tricks stay visible for 1.2s.
- 2026-06-09 Played-card animation now uses stronger CSS keyframes from each player's direction.
- 2026-06-09 Fixed `/local` hydration mismatch by passing a deterministic seed into local game initialization.
- 2026-06-09 Side opponent card backs are now horizontal; bidding slider lint issue fixed.
