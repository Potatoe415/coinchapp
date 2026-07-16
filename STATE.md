# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc). Builds and tests pass. Not yet deployed.
Current_Goal: Validate "la Bouilla" manually in each of the 3 modes, then revisit the offline ad-hoc real-device pairing test still pending from the Coinche slice.
Last_Action: Implemented the full "Ajout du jeu La Bouilla" plan. New pure engine `lib/bouilla/` (types/cards/deal/trick/rounds/scoring/engine/bot/redact, 31 Vitest tests) reuses `lib/cards/` (extracted generic buildDeck/shuffle/cardId/nextSeat, also adopted by `lib/coinche`). `games.game_type` is now read/written end-to-end: `GameType`/`GameSettings`/`GameRow.state` are `coinche|bouilla` unions (`lib/supabase/types.ts`), `actions-lobby.ts`/`actions-game.ts`/`view.ts` dispatch by `game_type` (bidding is a no-op for Bouilla). New client pieces: `lib/client/cardGameDriver.ts` (generic `runBotLoop`/`BotLoopEngine`, replacing the bot-advance loop duplicated between local/ad-hoc host) + `coincheEngineAdapter.ts`/`bouillaEngineAdapter.ts`; `useLocalBouillaGame.ts`, `useP2PBouillaHost.ts` (ad-hoc host) mirror the Coinche hooks; `useP2PClient.ts`/`useBotRunner.ts` generalized to branch on `gameType`. New UI: `BouillaTable.tsx`/`BouillaScoreboard.tsx`/`BouillaRoundOverlay.tsx`/`bouillaLabels.ts`; `PlayingCard`/`CardBack` generalized to `lib/cards`' `CardOf<string>` so both games' cards render through the same component. Entry point: "Jouer à la Bouilla" button on `app/page.tsx` → `app/bouilla/page.tsx` (same 3-button layout as home) → existing `/local`, `/online`, `/adhoc` routes with `?game=bouilla` (no duplicated route tree). `GameRoom.tsx`/`AdHocLobby.tsx`/`P2PClientGame.tsx` branch on `gameType`/`?game=` to render `GameTable` vs `BouillaTable`. tsc/lint/vitest(78)/build all clean.
Next_Actions:
- Manually play through Bouilla local (bots), online (2+ browsers), and ad-hoc (host + client) to sanity-check the UI end-to-end (never opened in a real browser this session).
- Consider adding Bouilla's 6-round names to `docs/PRODUCT.md`/`docs/DATA_MODEL.md` if the user wants it documented (not yet asked).
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC was run) - pending from before this feature.
- Confirm with user whether to update `docs/PRODUCT.md` (now a 2-game platform; framing still Coinche-only).
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI (pending from before this feature).

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Bouilla ad-hoc/online: no per-game settings UI shown (rules are fixed by design) - confirm this is desired, not just a placeholder gap.

Recent_Changes:
- 2026-07-16 Added second game "la Bouilla" (Barbu variant): new `lib/bouilla` engine, `lib/cards` shared deck primitives, `game_type`-dispatching server actions, generic client bot-loop driver, new `BouillaTable` UI, and `/bouilla` entry point reusing `/local` `/online` `/adhoc` via `?game=bouilla`. See DECISIONS.
- 2026-06-16 Bidding phase: speech bubbles (comic-book style) on each opponent showing their last bid via `BidBubble` in `GameTableScene.tsx`.
- 2026-06-16 Ad-hoc: QR copy-paste fallback + end-of-deal readiness gate (next deal waits for all humans) via optional `GameView.nextDealGate`; online/local unchanged.
- 2026-06-16 Added 5 bot play heuristics in `lib/coinche/play-tactics.ts` (pre-filters); ISMCTS brain unchanged, shared by online + local bots. See DECISIONS 2026-06-16.
- 2026-06-16 Added offline ad-hoc WebRTC P2P mode (host + clients, QR signaling); additive only, online/local modes untouched. See DECISIONS 2026-06-16.
