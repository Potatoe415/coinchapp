# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX polish before deployment.
Last_Action: Added app version label `V0.8.1` next to the `Reset` button on the home screen.
Next_Actions:
- Validate the home screen footer alignment on desktop and mobile after adding the version label.
- Continue online click-to-center responsiveness checks after removing post-action refetches.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-10 Home screen footer now shows app version `V0.8.1` next to the `Reset` button.
- 2026-06-10 Online actions no longer force immediate refetch after `placeBid` / `playCard` / `nextDeal`; realtime `game_events` now drives refresh to reduce perceived latency and duplicate round-trips.
- 2026-06-10 Bidding panel live bid now matches top HUD style: white badge with black/red contract text and bidder name beside it; former "Annonceur N°..." label removed; +10/+20 quick buttons kept.
- 2026-06-10 Bidding panel now shows current announcer seat (`Annonceur N°...`) and includes +10 / +20 quick value buttons beside bid amount, without changing existing suit/slider/confirm flow.
- 2026-06-10 Language switcher now hides during active gameplay (`/local/play`, `/game/*`) to prevent language toggles once a game has started.
