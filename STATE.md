# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Ship the offline ad-hoc (WebRTC P2P) mode and validate pairing on real devices.
Last_Action: Added a presence heartbeat + auto-play fallback so an absent host OR non-host player can no longer freeze the table forever. `game_players.connected` (dead, always true) replaced by `last_seen_at`, refreshed by `getView` for the caller's own seat (no new action/timer - piggybacks every existing refetch trigger). `isSeatLive` in `repo.ts` judges a bot seat's liveness via the current host's row (bots have no client of their own). `GameView.players[].connected` is now computed from it and shown as a dimmed dot on opponent badges (`PlayerBadge`, `GameTableScene.tsx`). `getView` also runs `advanceStaleTurns`: after 45s of silence from whoever is responsible for the current turn, the server auto-plays it with the simple heuristic bot, looped up to 16 steps. tsc/lint/vitest(47)/build all clean.
Next_Actions:
- Watch real games for whether the 30s/45s thresholds (`PRESENCE_STALE_MS`/`TAKEOVER_STALE_MS`) feel right; tune if the badge flickers on normal poll gaps or the takeover fires too eagerly/slowly.
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC was run).
- Confirm with user whether to update `docs/PRODUCT.md` (offline/P2P now exists; "online only" framing outdated).
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI.

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-16 Bidding phase: speech bubbles (comic-book style) on each opponent showing their last bid via `BidBubble` in `GameTableScene.tsx`.
- 2026-06-16 Ad-hoc: QR copy-paste fallback + end-of-deal readiness gate (next deal waits for all humans) via optional `GameView.nextDealGate`; online/local unchanged.
- 2026-06-16 Added 5 bot play heuristics in `lib/coinche/play-tactics.ts` (pre-filters); ISMCTS brain unchanged, shared by online + local bots. See DECISIONS 2026-06-16.
- 2026-06-16 Added offline ad-hoc WebRTC P2P mode (host + clients, QR signaling); additive only, online/local modes untouched. See DECISIONS 2026-06-16.
- 2026-06-13 Fixed online create showing 4 empty seats: `createGame` relies on `game_type` default + checks the seat insert error; SQL re-adds `notify pgrst, 'reload schema'`.
- 2026-06-12 Merged all SQL into one re-runnable `0001_init.sql` (full DB reset at top: unschedule cron + drop cascade); deleted `0002`/`0003`.
