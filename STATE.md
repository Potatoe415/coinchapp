# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab. Builds and tests pass. Not yet deployed.
Current_Goal: Validate "la Bouilla" manually in each of the 3 modes, then revisit the offline ad-hoc real-device pairing test still pending from the Coinche slice.
Last_Action: Bouilla animation/UX pass: extracted `components/TrickStage.tsx` (played-card entrance + completed-trick collect/fly-off animations, opponent card-back fans - previously only in `GameTableScene.tsx`) so `BouillaTable.tsx` reuses the exact same visuals instead of a stripped-down copy; fixed the player's own hand fan overflowing off narrow phone screens (13-card Bouilla hand vs 8-card Coinche hand) with a responsive card-spacing cap. Then merged the two home-screen entry points: removed `app/bouilla/page.tsx`; `app/page.tsx` now has a Coinche/la Bouilla tab selector (`game` state) above the same 3 mode buttons (local/online/ad-hoc), which append `?game=bouilla` when that tab is active; added `gameTabCoinche`/`gameTabBouilla` i18n keys. tsc/lint/vitest(78)/build all clean.
Next_Actions:
- Manually play through Bouilla local (bots), online (2+ browsers), and ad-hoc (host + client) to sanity-check the UI end-to-end, incl. the new trick-collect animation and phone-width hand fan (never opened in a real browser this session).
- Consider adding Bouilla's 6-round names to `docs/PRODUCT.md`/`docs/DATA_MODEL.md` if the user wants it documented (not yet asked).
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC was run) - pending from before this feature.
- Confirm with user whether to update `docs/PRODUCT.md` (now a 2-game platform; framing still Coinche-only).
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI (pending from before this feature).

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Bouilla ad-hoc/online: no per-game settings UI shown (rules are fixed by design) - confirm this is desired, not just a placeholder gap.

Recent_Changes:
- 2026-07-16 Home screen merged: dropped `/bouilla` route, `app/page.tsx` now picks the game via a Coinche/la Bouilla tab and reuses the same 3 mode buttons.
- 2026-07-16 Bouilla UI: shared trick-stage animations (`components/TrickStage.tsx`) extracted from `GameTableScene.tsx`, reused by `BouillaTable.tsx`; hand fan spacing made responsive to fix off-screen cards on narrow phones.
- 2026-07-16 Added second game "la Bouilla" (Barbu variant): new `lib/bouilla` engine, `lib/cards` shared deck primitives, `game_type`-dispatching server actions, generic client bot-loop driver, new `BouillaTable` UI, and `/bouilla` entry point reusing `/local` `/online` `/adhoc` via `?game=bouilla`. See DECISIONS.
- 2026-06-16 Bidding phase: speech bubbles (comic-book style) on each opponent showing their last bid via `BidBubble` in `GameTableScene.tsx`.
- 2026-06-16 Ad-hoc: QR copy-paste fallback + end-of-deal readiness gate (next deal waits for all humans) via optional `GameView.nextDealGate`; online/local unchanged.
- 2026-06-16 Added 5 bot play heuristics in `lib/coinche/play-tactics.ts` (pre-filters); ISMCTS brain unchanged, shared by online + local bots. See DECISIONS 2026-06-16.
- 2026-06-16 Added offline ad-hoc WebRTC P2P mode (host + clients, QR signaling); additive only, online/local modes untouched. See DECISIONS 2026-06-16.
