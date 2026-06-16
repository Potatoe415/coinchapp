# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Ship the offline ad-hoc (WebRTC P2P) mode and validate pairing on real devices.
Last_Action: Ad-hoc UX: (1) added a copy-paste code fallback under every QR (`CodeReveal` in `QrExchange.tsx`) since the camera scanner needs HTTPS and fails on plain-http LAN; (2) added an end-of-deal readiness gate so the next deal starts only once every human seat pressed "Donne suivante" (host: ready Set + `markReady`/`tryAdvance` in `useP2PHost`, dropped seats don't block; surfaced via optional `GameView.nextDealGate` threaded through `GameTable`/`GameTableScene`/`DealOverlay`, undefined for online/local so they are unchanged). Build + tsc + lint clean; `/adhoc` route generated.
Next_Actions:
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC was run).
- Confirm with user whether to update `docs/PRODUCT.md` (offline/P2P now exists; "online only" framing outdated).
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI.

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-16 Ad-hoc: QR copy-paste fallback + end-of-deal readiness gate (next deal waits for all humans) via optional `GameView.nextDealGate`; online/local unchanged.
- 2026-06-16 Added 5 bot play heuristics in `lib/coinche/play-tactics.ts` (pre-filters); ISMCTS brain unchanged, shared by online + local bots. See DECISIONS 2026-06-16.
- 2026-06-16 Added offline ad-hoc WebRTC P2P mode (host + clients, QR signaling); additive only, online/local modes untouched. See DECISIONS 2026-06-16.
- 2026-06-13 Fixed online create showing 4 empty seats: `createGame` relies on `game_type` default + checks the seat insert error; SQL re-adds `notify pgrst, 'reload schema'`.
- 2026-06-12 Merged all SQL into one re-runnable `0001_init.sql` (full DB reset at top: unschedule cron + drop cascade); deleted `0002`/`0003`.
