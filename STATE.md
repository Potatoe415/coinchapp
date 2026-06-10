# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Added a fast realtime broadcast tick so remote players see plays/bids almost instantly instead of waiting on slow postgres_changes.
Next_Actions:
- Verify the home screen footer shows `V0.8.3` next to `Reset` on mobile and desktop.
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 Online realtime now sends a fast broadcast `tick` on the `game-${id}` channel after each play/bid/deal/bot move; `useGameView` refetches on it (postgres_changes kept as fallback), cutting remote update latency from ~2s to near-instant.
- 2026-06-10 Lobby: replaced click-to-select swap with HTML5 drag-and-drop; seat 0 locked, seats 1-3 draggable/droppable (host only).
- 2026-06-10 Home screen app version label updated to `V0.8.3`.
- 2026-06-10 Fixed `pendingInLastTrick` guard in `GameTable` to compare card id (not just seat), so online optimistic played card appears/animates immediately on tricks after the first.
- 2026-06-10 Online `useBotRunner` no longer applies manual bot delays (`BOT_THINKING_MS` / collect delay); bot moves now execute immediately on turn.
