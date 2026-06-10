# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Stabilize UX for local/online flows and continue gameplay polish.
Last_Action: Added configurable "Capot" and "Capot chuté" scoring params (default 250) to setup screens (local + online); scoring engine uses them; in-game panel shows the actual configured values.
Next_Actions:
- Reset/re-run 0001_init.sql in Supabase (now includes host_user_id) before testing online.
- Manually verify online solo-vs-bots flow and host handoff across two profiles.
- Resume the Supabase/Vercel deployment sequence.

Open_Questions:
- Manual Belote/Rebelote announcement vs current auto-detection?
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 Capot/Capot chuté params (default 250) added to local+online setup screens; ScoringRules + scoring engine use them; in-game panel shows real values.
- 2026-06-10 Added /join/[code] route (resolves room code -> game, redirects to lobby); Lobby "Copy invite link" copies /join/CODE; /online prefills code from ?code.
- 2026-06-10 Online Lobby has a "Copy invite link" button (data-id="lobby-copy-invite") for one-click sharing/joining.
- 2026-06-10 Added last-trick preview (4 overlapping xs cards, data-id="last-trick-preview") below the parameters button.
- 2026-06-10 Added trick-collect animation: 4 cards gather toward table center then fly to the winning seat (pure CSS keyframes + custom props, no library).