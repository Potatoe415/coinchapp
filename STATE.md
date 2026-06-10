# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Keep online game URLs human-friendly by using 3-character room codes while preserving UUID-based game loading internally.
Last_Action: Updated online navigation to push `/game/{ROOM_CODE}` when available and made `/game/[id]` resolve 3-character codes to game UUIDs on the server.
Next_Actions:
- Validate create and join flows now show `/game/{CODE}` in the URL and still open the correct game room.
- Confirm invalid short codes redirect to `/online?code=...` and allow fast re-join.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 Online create/join now navigates using short room codes (`/game/{CODE}`), and game route resolves codes to internal UUIDs server-side.
- 2026-06-10 Hand cards no longer auto-lift when playable; only explicit pre-selection lifts, so online play does not move the whole hand up/down during card submission.
- 2026-06-10 Online GameTable now keeps `pendingPlayed` visible until the same card appears in server view (`currentTrick`/`lastTrick`), reducing saccades on consecutive plays.
- 2026-06-10 Removed `+10` and `+20` quick buttons from bidding panel; value is adjusted via slider only.
- 2026-06-10 Bidding panel label changed from "Annonce" to "ton annonce".
