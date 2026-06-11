# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Cleared all ESLint errors (React hooks `set-state-in-effect`/`refs`) across UI/hooks; tsc, lint, tests (38) and `next build` all pass.
Next_Actions:
- Verify the home screen footer shows `V0.8.3` next to `Reset` on mobile and desktop.
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-11 Fixed all ESLint errors: `useLocalGame` now uses useState + ref mirror; optimistic-state resets moved to render-time pattern (`Lobby`, `DealOverlay`, `GameTable`); ref writes moved to effects; browser-read effects annotated; dead `busy` prop chain removed.
- 2026-06-11 Bots now support a partner's standing suit bid: +10 with trump Jack/9 over an 80/90, +10 per ace once partner bid 90+ (`decideBidWithSupport`); cumulative, capped at 160.
- 2026-06-11 BIM! now fires immediately when an OPPONENT trump cuts a non-trump ace in the live trick; no longer fires at end of trick or for teammate cuts (`computeBimKey` in `GameTable.tsx`).
- 2026-06-10 `joinGame` now replaces a bot when the lobby is full (lowest bot seat, `pickJoinSeat` helper); `Lobby` join button enabled while fewer than 4 humans.
- 2026-06-10 Lobby seat swap: fixed `swapSeats` collision on `unique(game_id,seat)` by swapping occupant fields in place when both seats are full (no schema change); added optimistic UI in `Lobby` reconciled on `gv.version`. Non-host sees no start/fill controls.
- 2026-06-10 Online realtime now sends a fast broadcast `tick` on the `game-${id}` channel after each play/bid/deal/bot move; `useGameView` refetches on it (postgres_changes kept as fallback), cutting remote update latency from ~2s to near-instant.
- 2026-06-10 Home screen app version label updated to `V0.8.3`.
