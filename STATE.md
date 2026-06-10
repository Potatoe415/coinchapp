# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: A joining human now takes over a bot seat when the lobby is full (free seat preferred); lobby join button enabled while <4 humans.
Next_Actions:
- Verify the home screen footer shows `V0.8.3` next to `Reset` on mobile and desktop.
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 `joinGame` now replaces a bot when the lobby is full (lowest bot seat, `pickJoinSeat` helper); `Lobby` join button enabled while fewer than 4 humans.
- 2026-06-10 Lobby seat swap: fixed `swapSeats` collision on `unique(game_id,seat)` by swapping occupant fields in place when both seats are full (no schema change); added optimistic UI in `Lobby` reconciled on `gv.version`. Non-host sees no start/fill controls.
- 2026-06-10 Online realtime now sends a fast broadcast `tick` on the `game-${id}` channel after each play/bid/deal/bot move; `useGameView` refetches on it (postgres_changes kept as fallback), cutting remote update latency from ~2s to near-instant.
- 2026-06-10 Home screen app version label updated to `V0.8.3`.
- 2026-06-10 Fixed `pendingInLastTrick` guard in `GameTable` to compare card id (not just seat), so online optimistic played card appears/animates immediately on tricks after the first.
