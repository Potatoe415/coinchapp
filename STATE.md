# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Moved "BIM !" flash animation to the top of the screen to avoid covering cards.
Next_Actions:
- Verify the home screen footer shows `V0.8.3` next to `Reset` on mobile and desktop.
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 Home screen app version label updated to `V0.8.3`.
- 2026-06-10 Fixed `pendingInLastTrick` guard in `GameTable` to compare card id (not just seat), so online optimistic played card appears/animates immediately on tricks after the first.
- 2026-06-10 Online `useBotRunner` no longer applies manual bot delays (`BOT_THINKING_MS` / collect delay); bot moves now execute immediately on turn.
- 2026-06-10 Online play now uses stronger optimistic UI: played card leaves hand immediately and remains on table until server confirmation, reducing perceived click delay and animation cuts.
- 2026-06-10 Added 48h TTL for online games: app now ignores rooms older than 48h; Supabase cron migration deletes expired rows hourly.
- 2026-06-10 Home screen app version label updated to `V0.8.2`.
