# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Improve online flow responsiveness by removing artificial pacing delays.
Last_Action: Removed manual bot waiting delays in online host runner so bot actions are submitted immediately when their turn starts.
Next_Actions:
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.
- If needed, keep delay only in local mode for readability while preserving instant online mode.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 Online `useBotRunner` no longer applies manual bot delays (`BOT_THINKING_MS` / collect delay); bot moves now execute immediately on turn.
- 2026-06-10 Online play now uses stronger optimistic UI: played card leaves hand immediately and remains on table until server confirmation, reducing perceived click delay and animation cuts.
- 2026-06-10 Added 48h TTL for online games: app now ignores rooms older than 48h; Supabase cron migration deletes expired rows hourly.
- 2026-06-10 Home screen app version label updated to `V0.8.2`.
- 2026-06-10 Hand cards now stay interactive button elements during my turn even when busy; avoids `button`/`div` DOM switching that could trigger visual jumps on click.
