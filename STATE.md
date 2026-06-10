# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Updated home screen app version label from `V0.8.1` to `V0.8.2`.
Next_Actions:
- Verify the home screen footer shows `V0.8.2` next to `Reset` on mobile and desktop.
- Validate online hand stability after removing `button`/`div` switching during busy state.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 Home screen app version label updated to `V0.8.2`.
- 2026-06-10 Hand cards now stay interactive button elements during my turn even when busy; avoids `button`/`div` DOM switching that could trigger visual jumps on click.
- 2026-06-10 Waiting spinner now follows active turn for all players (not only bots), including online bidding.
- 2026-06-10 Online create/join now navigates using short room codes (`/game/{CODE}`), and game route resolves codes to internal UUIDs server-side.
- 2026-06-10 Hand cards no longer auto-lift when playable; only explicit pre-selection lifts, so online play does not move the whole hand up/down during card submission.
- 2026-06-10 Online GameTable now keeps `pendingPlayed` visible until the same card appears in server view (`currentTrick`/`lastTrick`), reducing saccades on consecutive plays.
