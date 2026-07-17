# DECISIONS

Status: Append-only. Never edit past entries.

---

## Decision threshold

Log a decision if any of the following is true:
- Locks in a technology, library, or vendor.
- Changes the data model, persistence structure, ownership rules, or access model.
- Changes ownership or structure of a file or module.
- Cannot be reversed in under 30 minutes.
- Contradicts a previous entry in this file.

If unsure: add an Open_Question to `STATE.md`, not a decision entry.

---

## Template

## YYYY-MM-DD - Title

Decision: One sentence.
Context: Why this came up.
Rationale: Why this option over others.
Consequences: What this locks in or rules out.
Alternatives_Rejected: What was considered and why it lost.

---

## 2026-06-09 - Bootstrap

Decision: Created project context architecture with agent-agnostic protocol.
Context: New empty project. Need durable memory across sessions and agents.
Rationale: Single canonical file (`AGENTS.md`) with thin routers per tool prevents drift and duplication.
Consequences: All agents must read `AGENTS.md` before acting. `docs/PRODUCT.md` and `docs/TECH.md` are frozen until user authorises changes.
Alternatives_Rejected: Per-agent full protocol files - causes drift. Single flat README - no conditional loading, bloats context.

---

## 2026-06-09 - Stack: Next.js + Supabase + Vercel

Decision: Build the app with Next.js 16 (App Router, TypeScript, Tailwind 4), Supabase (Postgres + Realtime + anonymous auth), deployed on Vercel.
Context: User wants a mobile web Coinche game, 4 players online, preference for Supabase, deploy via Git + Vercel.
Rationale: Next.js Server Actions give a serverless authority on Vercel; Supabase covers DB, realtime and anonymous auth with minimal glue.
Consequences: Locks in these vendors. Game logic must run in Server Actions (no separate backend service).
Alternatives_Rejected: Dedicated Node/WebSocket server (more infra); client-authoritative logic (cheating, hidden-hand leaks).

---

## 2026-06-09 - Server-authoritative state with redacted views

Decision: Store the full GameState (including hands) in `games.state`, accessible only to the service_role; clients receive a per-seat redacted view via the `getView` Server Action. Realtime uses a `game_events` tick table, not row broadcast of the state.
Context: Card games have hidden information; broadcasting rows or trusting the client would leak hands or enable cheating.
Rationale: A single authority validates every move; realtime carries no secrets (only a version tick), so RLS stays simple and leak-proof.
Consequences: Every mutation is a Server Action that loads, validates, advances bots, persists, and emits a tick. Clients are pure renderers.
Alternatives_Rejected: Postgres Changes on games (would ship hands to clients per RLS row payload); server WebSocket broadcast (heavier in serverless).

---

## 2026-06-09 - Pure rules engine in lib/coinche

Decision: Implement all Coinche rules as a framework-agnostic, pure TypeScript module under `lib/coinche`, unit-tested with Vitest.
Context: Rules are complex (orders, bidding, cutting, scoring, capot, belote) and must be reliable.
Rationale: Purity makes the rules testable in isolation and reusable by both server and bots.
Consequences: The engine has no Supabase/Next imports; the server adapts it. Bots also live here and are driven server-side.
Alternatives_Rejected: Embedding rules inside Server Actions (untestable, mixed responsibilities).

---

## 2026-06-09 - Game table UI component split

Decision: Split the game table presentation into `GameHud`, `GameTableScene`, and small table helpers while keeping `GameTable` as the state/action orchestrator.
Context: Matching the provided mobile game screenshot required a richer HUD, table scene, player positions, and card styling.
Rationale: Separate presentational components keep each file focused and avoid turning the interactive table into a monolith.
Consequences: Future visual adjustments for the top HUD and table scene should happen in their dedicated components; gameplay logic remains unchanged.
Alternatives_Rejected: Keep all layout in `GameTable` (too broad); change game state shape for visual-only data (unnecessary).

---

## 2026-06-09 - Client-side bot brain (heuristic bidding + ISMCTS play)

Decision: Add a browser-side bot brain in `lib/client/bot.ts` (+ `lib/client/botSim.ts`) that decides moves from the redacted `PlayerView` and is submitted through the normal Server Action path; bidding uses fast heuristics, play uses time-boxed determinized ISMCTS (800 ms / 2000 iterations).
Context: User wants bot AI to run 100% client-side to keep the serverless backend free of heavy computation, while the server stays authoritative (it still validates every move).
Rationale: ISMCTS on the client offloads CPU from Vercel functions; running from the redacted view (no opponent hands) keeps the determinization honest and the server the single authority.
Consequences: `PlayerView` now exposes completed `tricks` (public info) so the client can determinize correctly. Two bot paths now exist: the server-side `lib/coinche/bot.ts` (used by `advanceBots`) and the new client brain. TECH.md still states "Bots run server-side" - needs user confirmation to reconcile.
Alternatives_Rejected: Server-side ISMCTS (heavy CPU in serverless, slower turns); replacing the server bot outright (out of scope, would break the offline `useLocalGame` flow).

---

## 2026-06-10 - Bots run client-side in the host browser

Decision: Bots now run entirely client-side. For online games one client (the "host", initially the creator, stored in `games.host_user_id`) drives every bot seat: it decides from the bot seat's redacted view (`chooseClientAction`) and submits via the new host-only `submitBotMove` Server Action. The server no longer auto-plays bots (`advanceBots` removed from `commit`/`startGame`) but still validates every submitted move. Any seated human can take over with `becomeHost` from an in-game parameters panel.
Context: User wants bots to always run on a player's phone (the one that created the online game) and a way to hand off control if that player leaves. Supersedes the 2026-06-09 note that TECH still said "bots run server-side".
Rationale: Keeps heavy bot CPU off Vercel functions and gives a simple, explicit handoff via a button instead of presence/heartbeat infra (none exists yet).
Consequences: Trusted-runner model - the host's `getView` payload now includes `botViews` (bot seats' hands), so a malicious host could see opponent-bot cards in mixed human+bot games (accepted risk). New column `games.host_user_id` (folded into `0001_init.sql`; DB is still in dev/reset mode). `lib/coinche/bot.ts advanceBots` is now used only by the offline `useLocalGame`.
Alternatives_Rejected: Automatic presence-based election (needs heartbeat/presence tracking that does not exist); keeping server-side bots (heavy serverless CPU, contradicts the product directive); withholding bot hands from the host (the browser bot brain needs the seat's hand to play).

---

## 2026-06-10 - Single bot level (no difficulty choice)

Decision: Removed the bot difficulty feature entirely. There is now one bot strategy (the former "hard"/"medium" smart play: cheapest winning card, else weakest discard). Dropped the `Difficulty` type, `chooseCard`/`advanceBots` difficulty params, the `easy` random branch, `GameSettings.botDifficulty`, the setup-screen selectors and `difficultyLabel`.
Context: User wants a single bot level equivalent to the current hardest, with no way to choose the level.
Rationale: `medium` and `hard` were already identical in code; only `easy` differed (random). One level keeps the engine/UI simpler and matches the product directive.
Consequences: `GameSettings` no longer carries `botDifficulty` (existing game rows keep a harmless stale key in their `settings` jsonb). The home link and local URL no longer pass a difficulty param.
Alternatives_Rejected: Hardcoding difficulty to "hard" while keeping the type/UI (leaves dead `easy` branch and a constant setting).

---

## 2026-06-10 - Calibrated, shared bot bidding (`decideBid`)

Decision: Bidding for both bot brains now goes through a single `decideBid(hand, allowed, minValue)` in `lib/coinche/bot.ts` (exported via the package index). It estimates the best mode, lifts the hand score by a fixed `PARTNER_CONTRIBUTION = 12` (partner + 10 de der), rounds to a contract step, and opens when the result reaches `max(80, minValue)`, capped at 160 (never auto-bids capot/générale). The client bot (`lib/client/bot.ts`) deleted its duplicate `trumpPotential`/`toutAtoutPotential`/`sansAtoutPotential`/`hasBelote`/`highestBid` helpers and calls `decideBid`. `evaluateSuit` now also adds a 20-point belote bonus.
Context: Bots almost never announced. The opening threshold compared a single-hand strength heuristic against the full contract value (80+), which an 8-card hand rarely reaches alone, so every seat passed.
Rationale: A contract only needs the team (two hands) to reach the announced value, so the bidder's own hand should be judged against ~hand + partner share, not the whole contract. A 4000-deal simulation tuned `PARTNER_CONTRIBUTION`: 12 yields a contract on the first auction ~100% of the time, avg contract ~84, distribution skewed to 80-90 with a tail to 110-120. Higher values (e.g. 22) over-bid (avg ~89) and risk failed contracts; 0 caused frequent redeals.
Consequences: Bidding logic lives in one place (engine layer); the client reuses it, removing duplication. Bot bid values are now meaningful (stronger hands bid higher). Local (`useLocalGame` -> `advanceBots`) and online (host-driven `chooseClientAction`) bots bid identically.
Alternatives_Rejected: Per-brain threshold tweaks (keeps two near-identical heuristics, violates DRY); lowering only the raw threshold without a partner model (loses hand-strength differentiation in the bid value).

## 2026-06-10 - Bot ISMCTS runs in a Web Worker; local solo uses it too

Decision: The client bot brain (`chooseClientAction`) now runs in a dedicated Web Worker via `lib/client/botWorker.ts`, driven by a new `useBotWorker()` hook (`lib/client/useBotWorker.ts`) that exposes `decide(view): Promise<BotAction>`, matches replies by request id, and falls back to a main-thread call when Workers are unavailable (SSR/tests/old browsers). Both runners use it: `useBotRunner` (online host) awaits `decide` instead of calling `chooseClientAction` inline; `useLocalGame` (offline solo) switched from the weak engine bot (`chooseBid`/`chooseCard`) to the same strong bot via the worker, applying the result with a small `applyBotAction` helper. The bid heuristic (`decideBid`) and the ISMCTS algorithm/budget (800ms / 2000 iterations) are unchanged.
Context: The time-boxed ISMCTS search (up to 800ms) ran on the main thread, freezing the UI during bot turns. Separately, the local solo game still used the cheapest-winner engine bot, so the calibrated ISMCTS bot was never exercised offline.
Rationale: A Worker keeps the heavy rollout loop off the render thread; `performance.now()` and `Math.random` are both available there, and `PlayerView`/`BotAction` are plain serialisable objects, so no engine change was needed. Reusing `chooseClientAction` in both the worker and the fallback avoids a second strategy. In `useLocalGame` the search overlaps the minimum thinking delay via `Promise.all`, so perceived latency is unchanged.
Consequences: Local bot play is now non-deterministic (ISMCTS uses `Math.random`); the `?seed=` param still fixes the deal but not bot decisions. Worker bundling relies on the Next/Turbopack `new Worker(new URL("./botWorker.ts", import.meta.url), { type: "module" })` pattern (verified by `next build`).
Alternatives_Rejected: Keeping ISMCTS on the main thread with smaller budgets (degrades strength, still janky); a shared singleton worker module instead of a per-hook instance (more lifecycle edge cases for little gain at this scale).

## 2026-06-10 - Re-calibrated bot bidding (PARTNER_CONTRIBUTION 12 -> 26)

Decision: Raised `PARTNER_CONTRIBUTION` in `lib/coinche/bot.ts` from 12 to 26. Supersedes the earlier "12" calibration.
Context: Bots almost never opened in real play (user saw ~1 in 5 deals) and bid low when they did. A 4000-deal simulation (manual auction + weak play-out) confirmed 12 only reaches a contract 60.5% of the time, avg value 84.6.
Rationale: Sweep results - 12: 60.5%/84.6/94.2% make; 20: 90.8%/88.1/90.2%; 26: 99.1%/92.5/86.0%; 32: 100%/98.2/81.6%; 40: 100%/106.3/72.4% (contractRate/avgValue/makeRate). 26 is the knee of the curve: a contract on ~99% of deals and a higher average (92.5) while keeping an ~86% make rate under weak play - and the real game now plays attack with the stronger ISMCTS, so true make rate is higher.
Consequences: Bots open on nearly every deal and bid more meaningfully. Slightly more failed contracts than at 12, accepted as the explicit product direction ("bid more, higher"). The make-rate figure is a conservative proxy (both teams played the weak cheapest-winner bot in the sim).
Alternatives_Rejected: 20 (still ~9% redeals, barely higher bids); 32+ (over-bids, make rate drops below ~82% even before accounting for human defenders).

## 2026-06-10 - Bot punch setting (low/med/high)

Decision: Added a pre-game "bot level" (punch) setting with three levels exposed as a slider in GameSettingsPanel. It maps to the bid heuristic''s partner-contribution: low=20, med=26 (default), high=32 (PUNCH_CONTRIBUTION in lib/coinche/bot.ts). decideBid takes an optional partnerContribution; the client bot reads BotOptions.punch; useBotWorker(punch) applies it on the main-thread bidding path (bidding never uses the worker). Local threads it via URL param -> LocalGame -> useLocalGame; online stores it in games.settings.botPunch and the host reads it from GameView.settings in useBotRunner. botPunch is bot config, not a scoring rule, so it is NOT passed to createInitialState/GameState.
Context: User wanted to choose bot aggressiveness before starting; the single PARTNER_CONTRIBUTION constant only allowed one fixed level.
Rationale: Punch only affects bidding, which runs on the main thread, so no worker/protocol change was needed. Storing it in settings (not GameState) keeps the pure engine unchanged and reuses the existing settings plumbing (sanitizeSettings validates against BOT_PUNCH_LEVELS, defaults "med"). Values come from the earlier 4000-deal sweep (contractRate/avgValue): 20->91%/88, 26->99%/92.5, 32->100%/98.
Consequences: games.settings jsonb gains an optional botPunch key (no migration; absent = "med"). The setting is read by whichever client runs the bots (host online, the single client locally).
Alternatives_Rejected: A numeric slider over raw contribution (leaks an internal constant, harder to label); adding botPunch to GameState (pollutes the pure engine and every state-build path for a pure UI/bot knob).

---

## 2026-06-11 - Bot determinization tracks known suit voids (chicanes)

Decision: `buildDeterminizer` (`lib/client/botSim.ts`) now infers each opponent's known suit voids from public play (any seat that did not follow the led suit cannot hold it, valid in single-trump/TA/SA) and deals the unseen pool under those constraints. The plain shuffle-and-slice was replaced by `dealConstrained`: a most-constrained-card-first randomized assignment (`tryDeal`) with up to 64 retries, falling back to an unconstrained `fallbackDeal` so a world is always produced. Inference runs once per decision; only the per-world deal changed. Added a vitest path alias (`@` -> repo root in `vitest.config.ts`) so client-side tests resolve `@/lib/*`, plus `lib/client/botSim.test.ts` asserting no generated world violates a known void and hand sizes are preserved.
Context: ISMCTS rollouts previously sampled impossible worlds (giving an opponent a suit they had shown void in), diluting the statistics and producing clearly wrong plays, especially mid/late deal where voids accumulate.
Rationale: Highest effort/strength ratio for a PIMC/ISMCTS bot; all needed data already lives in `PlayerView` (`tricks` + `currentTrick`), so the change is client-only - no engine, redact, or server change. Constructive constrained dealing (vs pure rejection) avoids stalls; the real state is always feasible, so the fallback is a safety net rather than the norm. Led-suit voids are unambiguous in every mode; trump-void inference (defausse instead of obliged cut) was deferred as conditional and lower-yield.
Consequences: Slightly more work per determinization (constrained deal + retries) for materially more realistic worlds and stronger card play. ISMCTS budget (800ms / 2000 iterations) and `simulateRootMove`/`locateBelote` are unchanged. New vitest resolve alias is shared infra for any future client test.
Alternatives_Rejected: Pure rejection sampling (can loop/stall when constraints are tight late in the deal); full max-flow/bipartite matching (guaranteed-uniform but heavy for 3 seats and 4 suits); also inferring trump voids now (conditional logic, smaller marginal gain) - left for a phase 2.

---

## 2026-06-11 - Bot stops pulling trumps once none remain outside its hand

Decision: Added `leadWinnersWhenTrumpsExhausted` (`lib/coinche/bot.ts`), used by the client ISMCTS bot in `choosePlayAction` (`lib/client/bot.ts`). In a single-suit trump contract, when the bot is on lead and the other three players hold no trump left (`8 - myTrumps - playedTrumps === 0`), it drops trump cards from the lead candidates and cashes a non-trump master instead - but only if a sure non-trump winner exists; otherwise it leaves the legal set untouched (a trump lead is then the safe trick). Composes after `avoidCuttingPartner` (which is a no-op when leading). Added `lib/coinche/bot.test.ts` (5 cases).
Context: User saw the bot keep "pulling trumps" when it already held every remaining trump. ISMCTS with random rollouts reasons poorly about this exact endgame and wasted trump leads instead of cashing winners.
Rationale: This is a certain inference (the count is exact, no guessing) and a safe filter: it only diverts from a trump lead when a guaranteed non-trump winner is available, so it never sacrifices a winnable trick. Kept as a legal-set pre-filter (same pattern as `avoidCuttingPartner`) so the ISMCTS layer and budget are unchanged. Restricted to single-suit trump; "pulling trumps" has no meaning in SA (no trump) or TA (every suit is its own line).
Consequences: The active in-game bot (online host + local solo, both via the worker) no longer over-leads trumps in trump-exhausted positions. The engine bot `chooseCard` (tests only) is unchanged. The helper relies only on public info (played cards) plus the bot's own hand, so no engine/redact/server change.
Alternatives_Rejected: Trying to fix it purely inside ISMCTS rollouts (needs smarter playouts - large change, noisy); a blunt "never lead trump when none out" filter (can force a losing low non-trump lead); gating on opponents-only trumps (partner's trumps are hidden, so only the all-others count is certain - which equals the "only trump holder" condition the user described).

---

## 2026-06-12 - Multi-game via game_type discriminator (Option A)

Decision: Host several games in one Supabase project by adding a `game_type text not null default 'coinche'` column (indexed) to the shared `games` table, rather than separate Postgres schemas or per-game table sets. Added in `0003_games_game_type.sql` and folded into `0001_init.sql`; typed as `GameType` in `lib/supabase/types.ts`; `createGame` writes it explicitly.
Context: User wants to be able to add a new game later in the same Supabase project, with the games' data separated. DB is still sandbox (test rooms only, wipeable).
Rationale: The `games`/`game_players`/`game_events` tables are already game-agnostic (all coinche specifics live in the `settings`/`state` jsonb and in `lib/coinche`). A single discriminator column reuses the existing RLS, realtime publication and TTL cron for every game, keeps `room_code` globally unique, and is purely additive (KISS/YAGNI per AGENTS.md). A future game adds its own rules engine (e.g. `lib/belote`) while the data-access layer (`repo.ts`) stays shared.
Consequences: `games` gains `game_type`; existing/new rows default to `coinche`, so nothing breaks. App code can filter/route by `game_type`. `GameType` is a string union to extend per new game.
Alternatives_Rejected: Separate Postgres schemas per game (would duplicate RLS/realtime/cron per schema and add Supabase client schema plumbing — overkill now); per-game prefixed tables (data-access duplication, violates DRY).

---

## 2026-06-16 - Offline ad-hoc mode via WebRTC P2P + QR signaling

Decision: Added a third, fully offline play mode ("Jouer sans internet") where one phone (the host) runs the authoritative rules engine in-browser for N humans + bots and streams each peer its redacted `GameView` over a WebRTC data channel. Signaling is manual and serverless: the host's SDP offer and each client's SDP answer are exchanged out of band as QR codes (with a paste fallback). New libraries `qrcode` (generate) and `@zxing/browser` (camera scan). The mode is purely additive: it reuses the existing `GameView`/`GameActions` contract and `lib/coinche` (`redact`, `submitBid`, `submitPlay`) and creates only new files (`lib/client/p2p/*`, `lib/client/useP2PHost.ts`, `lib/client/useP2PClient.ts`, `components/p2p/*`, `components/AdHocLobby.tsx`, `app/adhoc/*`); the online (Supabase) and local-vs-bots modes are untouched.
Context: User wants to play without internet, sharing a connection or on a local network ("Wi-Fi or Bluetooth"). Browsers cannot do Bluetooth peer links or Wi-Fi Direct, so the only viable offline transport between phones is WebRTC over a shared LAN/hotspot, and without a server the peers must exchange signaling data manually.
Rationale: The app already had a third "producer" pattern (online `GameRoom`, offline solo `useLocalGame`) feeding the same `GameTable`; the host hook mirrors `useLocalGame` but for multiple humans + bots and broadcasts per-seat redacted views, so the renderer and rules engine are unchanged. WebRTC is native to the browser; QR-based SDP exchange is the standard serverless pairing technique. The host stays authoritative (validates every move via the engine), preserving the hidden-hand guarantee.
Consequences: Locks in `qrcode` + `@zxing/browser`. Pairing is manual (~2 QR scans per joining client) and requires all phones on the same network (host hotspot or shared Wi-Fi); there is no auto-discovery. Known risk accepted by the user: Chrome hides local IPs behind mDNS `.local` candidates, which can prevent the connection on some OS/browser combinations (no Phase 0 PoC was run). A dropped client's seat is demoted to a bot by the host. `docs/PRODUCT.md` "navigateur uniquement" constraint still holds, but its "online only" framing should be revisited with the user.
Alternatives_Rejected: Native wrapper (Capacitor/Tauri) for real Bluetooth/Wi-Fi Direct (leaves the browser-only constraint, large stack change); pass-and-play on a single device (simpler but not what the user wanted — they want multiple devices); a local signaling server (needs something listening on the LAN, impossible from a browser, would also need internet to bootstrap).

---

## 2026-06-16 - Bot play heuristics module (`lib/coinche/play-tactics.ts`)

Decision: Added five deterministic play heuristics as legal-set pre-filters in a new module `lib/coinche/play-tactics.ts`, composed by `refinePlayCandidates(view, played, isLeading)` which the client bot brain (`lib/client/bot.ts` `choosePlayAction`) now calls in place of the inline `avoidCuttingPartner` + `leadWinnersWhenTrumpsExhausted` pipeline. Rules: (1) lead trump to pull when trumps remain and I hold the master trump; (2) sans atout: never expose a 10 while its ace is unknown, unless the partner is the sure winner; (3) sans atout: cash an ace when leading in the first three tricks; (4) lead trump for / never overtake a declarer partner; (5) shed minimum points when the trick is lost for sure.
Context: User wanted to refine bot card play without touching the ISMCTS "brain". The search optimises a binary made/not-made reward, so it handles fine-grained point management (rules 2 and 5) and standard conventions (rules 1, 3, 4) poorly.
Rationale: Same pattern as the existing `avoidCuttingPartner` / `leadWinnersWhenTrumpsExhausted` filters: each rule narrows the root candidate set and always falls back to its input, so it can never empty the set or change the ISMCTS layer/budget. Filters use only public info (played cards) plus the bot's own hand. Placed in a new module because `lib/coinche/bot.ts` was at the 300-line limit. Applies to both online host and local solo bots via the shared `chooseClientAction`.
Consequences: New module owns bot play tactics; `lib/client/bot.ts` no longer imports the two engine filters directly (it imports `refinePlayCandidates`). The engine bot `chooseCard` (tests/server fallback) is unchanged. No engine/redact/server/data-model change. Per-rule scope choices confirmed with user: rule 4 = both lead-trump-for-taker and no-overtake; rule 2 exempts a sure-winning partner; rule 3 = first three tricks; filters are hard with safe fallback.
Alternatives_Rejected: Encoding the rules inside ISMCTS rollouts (large, noisy change to the brain the user asked to keep); extending `lib/coinche/bot.ts` (would breach the 300-line file limit); soft scoring biases instead of hard filters (user chose hard filters).

---

## 2026-06-16 - Rule 4b (don't overtake partner) generalised to any partner + secure-win guard

Decision: `dontOvertakePartner` no longer requires the partner to be the declarer. It now applies whenever the partner is the **certain** winner of the trick — either I am the last to play, or no card still unseen by me can beat the partner's winning card (`partnerWinSecure`). When the partner is only the provisional winner (e.g. led a weak card with opponents still to play), the filter does nothing and the ISMCTS search decides.
Context: Reviewing the just-added rule 4b, the declarer-only scope was both too narrow ("don't overtake your partner" is universal in coinche) and unsafe (ducking when the partner merely leads a weak card can hand the trick to opponents who play after me). User picked the "any partner + secure-win" option.
Rationale: Not overtaking a partner who already holds the trick for sure never loses a trick and saves a high card; gating on certainty avoids the weak-lead trap. Reuses public info only (my hand + played cards) via a full-deck scan for unbeatable-card detection; still a hard filter with safe fallback, ISMCTS untouched.
Consequences: Supersedes the rule 4b scope noted in the previous entry (declarer-only). `dontOvertakePartner` signature changed to take `hand` + `played` instead of `contract`. tsc clean, 47/47 tests pass.
Alternatives_Rejected: Declarer-only scope (too narrow, keeps the weak-lead risk); duck whenever partner is provisional winner (the weak-lead trap); last-to-play-only guard (simpler but misses correct 2nd/3rd-seat ducks when the partner is already master).

---

## 2026-07-16 - Realtime resilience + optimistic-concurrency guard (fixes online games stuck on a seat)

Decision: `useGameView.ts` now resubscribes its Supabase Realtime channel whenever `.subscribe()` reports `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED`, force-resyncs (refetch + resubscribe) on `visibilitychange` (tab regains focus) and the `online` event, and polls `getView` every 15s as a last-resort backstop. `repo.ts` gained `updateVersioned` (used by `persistGame`/`touchGame`): the `games` row update now includes `.eq("version", game.version)` and checks the row actually changed, throwing `version_conflict` instead of silently overwriting newer state with a stale write. `useBotRunner.ts`'s catch block now calls `refetch()` on a failed `submitBotMove` instead of relying on "the next tick" (which may never arrive).
Context: User reported online games repeatedly getting stuck on a player (bot or human), fixable only by becoming host / handing host to someone else. Root cause: Supabase Realtime `postgres_changes` events are fire-once (never replayed), the channel can die silently (mobile tab backgrounded/locked, network switch, long session), and only the host's browser drives every bot (`docs/TECH.md`); if the host's channel dies, no one advances the game. `onBecomeHost` (`components/GameRoom.tsx`) happened to "fix" this only as a side effect - it calls an explicit `refetch()` outside the broken channel and hands bot-driving duty to a live client. Separately, `persistGame`/`touchGame` had no version guard on the SQL update (already flagged in `docs/TECH.md` Open_Questions), so a stale write (e.g. a bot decision computed just before another actor advanced the state) could silently clobber newer progress.
Rationale: Fixing the channel's own resilience (reconnect + wake + poll) addresses the root cause directly, so a dead channel self-heals within ~15s without anyone needing to touch "become host". The version guard closes a real (if rare) data-race window flagged as an open question, and makes failures loud (`version_conflict`) instead of silently wrong. Refetching on a failed bot submit prevents that catch block from permanently wedging a seat.
Consequences: `games` row updates now require the caller's `game.version` to still match (read-then-write races now fail fast with `version_conflict` instead of corrupting state); no schema change. `getView` is polled every 15s per connected client as a safety net - acceptable cost (single cheap row read) for a 4-seat game. The manual "Become host" button stays as a manual override for a genuinely absent/inactive host; it is no longer the only way to recover from a dropped channel.
Alternatives_Rejected: Server-side presence/heartbeat to auto-elect a live host (bigger change, no presence infra exists yet - left as a Next_Action if the report recurs); relying only on Realtime's own reconnect (already proven insufficient - the reported bug); removing the poll and trusting reconnect+wake listeners alone (less robust against browsers that fully suspend timers/sockets without firing `visibilitychange`).

---

## 2026-07-16 - Presence heartbeat + stale-turn auto-play fallback (any absent seat, not just a dead host)

Decision: Replaced the dead `game_players.connected` boolean (always `true`, never updated) with `last_seen_at`, refreshed by `getView` for the caller's own seat on every call - no separate heartbeat action or client timer needed, since every existing refetch (realtime tick, poll, visibility wake, the manual "Force resync" button) already calls `getView`. Added `isSeatLive(loaded, seat, now, thresholdMs)` in `lib/server/repo.ts`: for a human seat it checks that seat's own `last_seen_at`; for a bot seat it checks the *current host's* `last_seen_at` instead, since a bot has no client/heartbeat of its own - the host's browser is what actually plays it. `GameView.players[].connected` is now computed from this (30s threshold) instead of the stored column, and shown as a dimmed dot on the opponent badge (`PlayerBadge` `connected` prop, `GameTableScene.tsx`). Separately, `getView` also runs `advanceStaleTurns`: if the seat whose turn it is has gone unseen for 45s, the server auto-plays that turn with the simple heuristic bot (`chooseBid`/`chooseCard`, not the strong client ISMCTS brain) and loops (bounded to 16 steps) in case that unblocks straight into another stale seat. Safe under concurrent callers because `persistGame` already requires the version to still match (previous entry's `updateVersioned`); a `version_conflict` from a losing caller is swallowed.
Context: User asked what happens when the host, or a non-host player, leaves and comes back - answer surfaced that there was no detection at all: a departed player's seat (bot-driven or human) could freeze the table indefinitely with nothing to do but wait or manually "become host". This unifies and supersedes the earlier deferred "force bot move" idea (2026-07-16, `keep_current` choice) with a more general mechanism that also covers a genuinely-absent non-host human, which "become host" cannot fix at all.
Rationale: A per-seat presence timestamp is the one primitive that answers both "is this seat's owner around" (badge) and "who is responsible for the current turn" (fallback) uniformly, for both bot and human seats, without needing real Realtime Presence (unnecessary precision for a card game among friends) or a cron/long-running watcher (impossible in this serverless setup anyway - checking opportunistically on every `getView` is the natural fit). Piggybacking the heartbeat on `getView` instead of a dedicated action/timer keeps the change additive to existing plumbing. Reusing the existing weak heuristic bot (already exported, already used by tests and `useLocalGame`) avoids running the CPU-heavy ISMCTS server-side.
Consequences: `game_players.connected` column dropped (schema change, sandbox DB); `swapSeats` no longer copies it. `LobbyPlayer.connected` is now dynamic, not stored. A long-absent human's seat gets auto-played by the weak bot indefinitely (no reclaim-on-return special-casing needed: as soon as their client calls `getView` again, their own `last_seen_at` refreshes and the next turn is theirs normally). Two constants tune sensitivity: `PRESENCE_STALE_MS` (30s, badge) and `TAKEOVER_STALE_MS` (45s, auto-play) in `repo.ts`/`actions-game.ts` respectively.
Alternatives_Rejected: Real Supabase Realtime Presence channel (more precise disconnect detection, but ephemeral/client-driven and awkward to act on from stateless Server Actions); a dedicated `heartbeat` Server Action + client timer (extra moving part; folding into `getView` reuses every existing trigger for free); permanently flipping a seat's `is_bot` flag on take-over (harder to reverse cleanly on return than just re-checking staleness every turn); a cron job to advance stale games (no such infra exists, and lazy-on-read is simpler and sufficient at this scale).

---

## 2026-07-16 - Added second game "la Bouilla" via `game_type` dispatch, not a parallel stack

Decision: Added a Barbu-style game ("la Bouilla": 4 players, no teams/trump, 6 fixed rounds each played once, lowest cumulative penalty wins - exact rules/point values in `docs/PRODUCT.md`/plan doc) as a second, fully independent rules engine `lib/bouilla/` (types/cards/deal/trick/rounds/scoring/engine/bot/redact, mirroring `lib/coinche/`'s module layout), wired through the existing `games.game_type` discriminator that was added but never read (2026-06-12 entry). Three things were extracted once instead of duplicated per the "zero duplication" requirement: (1) `lib/cards/` - generic `buildDeck`/`shuffle`/`cardId`/`sameCard`/`nextSeat`, now imported by both `lib/coinche/cards.ts` and `lib/bouilla/cards.ts`; (2) `lib/client/cardGameDriver.ts` - a generic `runBotLoop`/`BotLoopEngine` adapter replacing the bot-advance loop that was already duplicated between `useLocalGame.ts` and `useP2PHost.ts` for Coinche alone, now shared by 4 combinations (coinche×local, coinche×ad-hoc, bouilla×local, bouilla×ad-hoc) via `coincheEngineAdapter.ts`/`bouillaEngineAdapter.ts`; (3) no new route tree - `app/local`, `app/online`, `app/adhoc` and `Lobby.tsx`/`GameRoom.tsx`/`AdHocLobby.tsx` are reused as-is, taking a `?game=bouilla` query param (local/ad-hoc) or branching on the DB-stored `gameType` (online, via `GameRoom.tsx`/`P2PClientGame.tsx`), instead of a parallel `/bouilla/local` etc. tree.
Context: User asked to add this game leveraging existing multi-game infrastructure, explicitly requiring zero code duplication and a "Jouer à la Bouilla" entry point mirroring the Coinche one.
Rationale: The rules layer (bidding/trump/teams/Belote for Coinche vs no-trump/no-teams/fixed-rounds for Bouilla) is genuinely incompressible between the two games, so a second pure engine is the right boundary - same shape as `lib/coinche`, so the pattern is now proven reusable for a third game later. Everything below the rules layer (repo/view/presence/realtime/WebRTC transport, UI primitives like `PlayingCard`/`PlayerBadge`/`EmojiButton`) was already game-agnostic by construction (2026-06-12 decision) and needed no changes beyond widening a few types (`GameRow.state`/`GameSettings` to discriminated unions, `PlayingCard`'s `card` prop to `lib/cards`' generic `CardOf<string>`) and adding `game_type` branches at the handful of places that dispatch to a specific engine (`actions-lobby.ts`, `actions-game.ts`, `view.ts`'s `redactForSeat`, `useBotRunner.ts`, `GameRoom.tsx`, `AdHocLobby.tsx`).
Consequences: `GameType` is `"coinche" | "bouilla"`; `GameSettings` fields are now all optional (Bouilla persists `{}` - its 6 rounds/point values are fixed, no per-game config.); `GameRow.state`/`GameView.view`/`botViews` are discriminated unions (`AnyGameState`/`AnyPlayerView`) narrowed back to a single game's type at each component boundary (`CoincheGameView` in `GameTable.tsx`, `BouillaGameView` in `BouillaTable.tsx`) via a cast at the call site, not at the shared type. `placeBid` throws for a Bouilla game (no bidding phase exists). Adding a third game later means: one more `lib/<game>/` engine, one more `<game>EngineAdapter.ts`, one more `<Game>Table.tsx`, and one more `game_type` branch at the same handful of dispatch points - no new infra.
Alternatives_Rejected: Wrapping state as `{ coinche: ... } | { bouilla: ... }` instead of a flat discriminated union (more verbose at every read site for no extra safety, since `game_type` already discriminates); a fully generic `GameTable`/`BiddingPanel` parameterized over both games (would smuggle Coinche-only concepts - trump, Belote/BIM detection, contract - into a shared component, violating KISS); separate `/bouilla/local`, `/bouilla/online`, `/bouilla/adhoc` route trees (explicitly rejected by the user as duplication).

---

## 2026-07-16 - Bouilla "Capot" sweep bonus: rounds 1-3 and 6 reverse the penalty onto the other 3 seats

Decision: In `lib/bouilla/rounds.ts`, `sweepWinner(round, tricks)` detects when one seat swept a round - won all 13 tricks ("tricks"/"everything"), or captured every copy of the round's counted card ("clubs": all 13, "queens": all 4) - and `computeRoundResult` (`scoring.ts`) then charges that seat 0 points and each of the *other 3 seats* the round's max penalty instead of the normal per-trick tally (`CAPOT_PENALTY`: 65 for tricks, 130 for clubs, 80 for queens, 425 for everything = the sum of all 5 sub-rules' maxima). `kingSpades`/`lastTrick` have no sweep bonus - each has exactly one penalty event, already all-or-nothing. `RoundResult` gained an optional `sweepSeat` field (flows through `roundHistory`/`lastRoundResult` unchanged); the round overlay and scoreboard show a "Capot" callout naming the sweeper when set.
Context: User specified this as a core scoring rule: sweeping a round should flip who pays, not just be the same per-card tally landing entirely on one player by chance.
Rationale: This is the standard Barbu "Capot" bonus - rewarding a full sweep by reversing the penalty is what makes going for broke (rather than defensively splitting tricks) a real strategic option in "no tricks"/"no clubs"/"no queens" rounds. Detecting it purely from `state.tricks` (winner per trick + card contents) needed no new state, no engine/redact changes beyond the new optional field.
Consequences: A round's total penalty pool is no longer fixed at the per-card maximum (65/130/80) when swept - it triples, since 3 seats each pay the full amount instead of it being split. `engine.test.ts`'s round-1 total-penalty assertion was relaxed to accept either the normal (65) or swept (195) total, since the deterministic "first legal card" test bot can legitimately sweep a round by chance.
Alternatives_Rejected: Sweeper keeps their own per-trick penalty *and* everyone else also pays (double-counts the bonus, not what was described); requiring `tricks.length === 13` for the clubs/queens sweep too (redundant - collecting all copies of a card is already only possible once, regardless of how many tricks that took).

---

## 2026-07-16 - Bouilla "kingSpades" round ends the instant the king of spades is captured

Decision: `applyPlay` (`lib/bouilla/trick.ts`) now ends the round as soon as a completed trick contains the king of spades *and* the current round is `"kingSpades"` - not just after 13 tricks like every other round. Scoring is unaffected (`trickPenalty`/`computeRoundResult` already only care about the trick containing the king), so this only shortens play, and only for that one round. `BouillaTable.tsx`'s hand fan is now hidden once `phase !== "playing"`, since this round can now end with cards still in a player's hand, which would otherwise render on top of the round-end overlay (same z-index, later in the DOM).
Context: User specified this rule directly: once the king falls, the round is decided and nothing else can change its outcome, so play should stop immediately instead of dealing out the remaining cards for no reason.
Rationale: The round's outcome (which single seat pays 50 pts) is fully determined by whoever wins the trick with the king; every trick played after that is pure busywork. Ending on that exact trick, rather than skipping ahead artificially, keeps `state.tricks` a normal (if shorter) trick list that `computeRoundResult` already handles correctly with no scoring-side changes.
Consequences: `state.tricks.length` for a finished "kingSpades" round is `<= 13` (usually less) instead of always 13 - any code assuming every round has exactly 13 tricks would break, though none currently does (`sweepWinner`'s tricks/everything branch explicitly requires `=== 13`, correctly excluding kingSpades, which has no sweep bonus anyway). Hands can have leftover cards at "scoring"/"finished" for this round only; `beginNextRound` already redeals from a fresh shuffled deck regardless, so nothing carries over.
Alternatives_Rejected: Auto-playing out the remaining tricks silently server-side (hides real information - who was left holding safe cards - for no benefit, and adds complexity for a purely cosmetic wait); leaving all 13 tricks required and only fast-forwarding the UI (still forces real play decisions after the outcome is already fixed, which is the actual complaint).

---

## 2026-07-16 - Bouilla "queens" round also ends early, once all 4 queens have fallen

Decision: Generalized the previous entry's single-purpose "kingSpades ends early" check into `roundDecidedEarly(round, tricks)` in `lib/bouilla/rounds.ts`, and added a `"queens"` case: the round ends the instant all 4 queens have been played across any tricks (regardless of who wins them - unlike the "Capot" `sweepWinner`, which requires one seat to hold all 4), not just when the king of spades falls. `applyPlay` (`lib/bouilla/trick.ts`) now calls this single function instead of an inline `kingSpades`-only check.
Context: User asked for the same early-stop behavior on the "queens" round: once all 4 queens are down, the rest of the deal can't change who paid for them.
Rationale: Same reasoning as kingSpades - once every counted card for the round has appeared, the outcome is fixed and further tricks are just busywork. Queens differ from the king in that they can fall across several different tricks (not necessarily to the same seat), so the check sums queen appearances across all of `state.tricks` so far, not just the just-completed one.
Consequences: `state.tricks.length` for a finished "queens" round can now also be `< 13`. `sweepWinner`'s existing "queens" (`soleCollector`) still works unchanged on the shorter list, since it already summed across whatever tricks were given. `roundDecidedEarly` is the one place that owns "is this round already decided" - a third such round (if ever requested) is one more `case` there, not a new inline check.
Alternatives_Rejected: Keeping the kingSpades check inline and duplicating similar logic for queens (the two cases are different enough - single trick vs. summed across tricks - that a shared `switch` is clearer than two near-duplicate inline conditions at the call site).

---

## 2026-07-16 - Bouilla bot: dynamic danger scaling, void-aware leads, and Capot (sweep) awareness

Decision: Extended the Bouilla heuristic bot (`lib/bouilla/bot.ts`, still no search/ISMCTS) with three additions, chosen by the user from a menu of options (lightweight heuristics vs. an endgame minimax solver vs. a full ISMCTS-style port of Coinche's bot):
1. `cardDanger` now scales a queen/club's weight up as fewer copies of it remain unseen this round (`dangerScale`, 1x when none have fallen, up to `total`x when only one copy is left) - holding the last one is riskier than holding one of several, since there are fewer chances left to safely dump it into someone else's trick.
2. `chooseLead` now infers opponents' void suits from completed tricks (`inferVoids`, same technique as Coinche's ISMCTS determinizer) and, among equally-safe lead candidates, prefers the suit more opponents are void in - void opponents are forced to discard freely, which tends to load a trick we're unlikely to win with cards someone else will pay for.
3. New `sweepAliveFor`/`trickMattersForSweep` in `lib/bouilla/rounds.ts` detect, mid-round, whether a seat's "Capot" sweep is still alive (nobody else has won a relevant trick yet). `chooseCard` now switches into a "try to win" mode (`chooseLeadToWin`/`chooseFollowToWin`, win as cheaply as possible) instead of its usual duck-the-danger play whenever its own sweep is still alive, or an opponent's is and this trick could still break it.
Context: User asked how the bot AI works, then asked how to improve the Bouilla bot specifically; offered a menu of options (see chat), user picked "heuristics-plus" (moderate effort, no new search architecture).
Rationale: These are the highest-value fixes that don't require a new search engine: the original bot treated every queen/club as equally dangerous regardless of round progress, never used any information about opponents' hands (unlike Coinche's bot), and had no notion that sometimes *winning* is the correct play (finishing a sweep, or preventing one) - a plain "always duck" bot was actively working against its own interest once a Capot was already underway.
Consequences: `rounds.ts` gained two more small round-dispatch functions alongside `sweepWinner`/`roundDecidedEarly`, keeping all "what does this round's outcome depend on" logic in one file. The bot remains synchronous/heuristic (no worker, no time budget) - still much cheaper to run than Coinche's ISMCTS, per the original design tradeoff (see 2026-07-16 entry that shipped Bouilla). 13 new unit tests across `bot.test.ts`/`rounds.test.ts`.
Alternatives_Rejected: An exact endgame minimax solver for the last few tricks (more code for a narrower payoff, mostly benefits "lastTrick"); a full ISMCTS port with determinization + Monte Carlo rollouts optimizing expected penalty (strongest and most general, but a much bigger lift - new determinizer, rollout engine, likely a Web Worker - not what the user asked for this round).

---

## 2026-07-17 - Shared `useOptimisticPlay` hook for instant card-play feedback across games

Decision: Extracted the optimistic-play UI logic that `GameTable.tsx` (Coinche) already had - remove the tapped card from hand and show it in the trick immediately, before the server round trip resolves, then reconcile once the server view catches up - into a new shared hook, `lib/client/useOptimisticPlay.ts`. `BouillaTable.tsx`, which previously called `actions.onPlay` directly and waited for the full refetch before the hand/trick updated, now uses the same hook. Both tables also now get the last-card auto-play timer from this one place instead of each re-implementing it.
Context: User reported Bouilla online play takes 1-2s to visibly react to a tap, "the same problem" as Coinche once had, and asked why the fix wasn't reused given repeated requests for shared/modular code across games. `GameRoom.tsx`'s `onPlay` (`await playCard; notify(); await refetch();`) is byte-for-byte identical for both games - the entire perceived delay was Bouilla's table waiting for that round trip to repaint, while Coinche's table paints instantly and reconciles later.
Rationale: The two tables' `PlayerView`s already share the relevant shape (`phase`, `turn`, `myHand`, `legalCards`, `currentTrick`, `lastTrick`), matching the existing precedent of per-game adapters plugging into one shared driver (`cardGameDriver.ts` + `coincheEngineAdapter.ts`/`bouillaEngineAdapter.ts` for the bot loop; `useBotRunner.ts` for the online bot turn). A generic hook parameterized by the game's own `cardId` and submit function follows that same pattern for the play-a-card path, so a third game reuses this for free instead of re-deriving optimistic UI from scratch.
Consequences: `GameTable.tsx` and `BouillaTable.tsx` no longer own their own `busy`/`pendingPlayed`/trick-merge state; both read `{ busy, legalSet, myTurnToPlay, optimisticHand, trickCards, play }` from the hook. Coinche's bidding pre-selection (game-specific) stays in `GameTable.tsx`, now calling the hook's stable `play` instead of maintaining its own ref. Any future trick-taking game gets instant-feedback play and last-card auto-play by calling this hook, not by copying `GameTable.tsx`.
Alternatives_Rejected: Fixing `BouillaTable.tsx` in place by copy-pasting Coinche's inline logic (would have "solved" this instance but repeated the exact duplication the user is objecting to, and left a third game with nothing to reuse either).

---

## 2026-07-17 - Bouilla gets Coinche's "pre-select a card while waiting" too, via the same shared hook

Decision: User confirmed Bouilla was missing Coinche's pre-selection feature (tap a card while it's not your turn to stage it; it auto-plays the instant your turn arrives if still legal, and un-stages if it stops being legal). Moved this logic into `useOptimisticPlay.ts` itself (`preSelectedId`/`tapCard`, plus internal `useAutoPlayPreSelected`) instead of leaving it local to `GameTable.tsx`, and extracted the shared "lifted + yellow ring" per-card wrapper into a new `components/HandCardSlot.tsx` used by both tables' hand fans.
Context: Direct follow-up to the optimistic-play fix in the previous entry - same root cause (a Coinche-only feature never ported to Bouilla) and same fix shape (pull the shared behavior out of `GameTable.tsx` into the one hook both tables already use, rather than duplicate it into `BouillaTable.tsx`).
Rationale: Pre-selection is entangled with `myTurnToPlay`/`legalSet`/`play` (already inside the hook), so extending the hook - rather than a second standalone hook - keeps one place owning "what happens when you tap a card." The per-card visual (lift + ring + routing click to either play-now or pre-select) was identical, so it also became a shared presentational component rather than copy-pasted markup, matching `PlayingCard`'s existing role as the one shared "leaf" card renderer.
Consequences: `GameTable.tsx` lost its local `preSelected` state, its two bespoke effects, and its own `HandCard` function (now `HandCardSlot`). `BouillaTable.tsx`'s hand fan gained pre-selection with no new local state. Any future game's hand fan can reuse `HandCardSlot` directly as long as it drives it from `useOptimisticPlay`'s `preSelectedId`/`tapCard`.
Alternatives_Rejected: A separate `usePreSelection` hook composed alongside `useOptimisticPlay` (would need to duplicate `myTurnToPlay`/`legalSet` or thread them back out awkwardly, for no real gain over extending the one hook that already owns those values).

---

## 2026-07-17 - Cut sequential Supabase round trips out of the online hot path (play a card / refetch)

Decision: User reported a ~2s delay before a peer's move (they are not the host) shows up on the host's screen in a real online game with bots. Root cause: `playCard` and `getView` (called on every card played and every realtime-triggered refetch) each made 3-5 *sequential* Supabase round trips - `getUserId()` then `loadGame()` (itself two sequential selects) then, for `getView`, a `touchPresence` write, plus a `game_events` insert on every write. Fixed by (1) running `getUserId()`/`loadGame()` concurrently in `loadForAction`, `getView`, and `submitBotMove` (`lib/server/actions-game.ts`) since neither depends on the other; (2) parallelizing `loadGame`'s own two selects (`games` + `game_players`) internally (`lib/server/repo.ts`); (3) moving the `touchPresence` write and the backup `game_events` insert (in `updateVersioned`) off the synchronous critical path via Next's `after()`, since neither's result is needed before replying.
Context: This is a different bug class from the two prior fixes in this file (which were both about the *local* player's own UI feeling instant). This one is inherent to *any* peer's move needing a real round trip through the server before another client can see it - there is no optimistic trick for a play you didn't make. But the specific ~2s was inflated well past what the network alone costs, by stacking avoidable sequential round trips on both the write (peer's `playCard`) and the read (host's `getView`) sides.
Rationale: All three changes are pure latency wins with no behavior change: the parallelized calls are genuinely independent (confirmed by reading each function), and the deferred writes (`touchPresence`, `game_events`) are non-authoritative side effects that nothing in the response path depends on - `useGameView`'s primary propagation is the caller's own explicit `notify()` broadcast (`GameRoom.tsx`), not the `game_events` row, which only exists as a backup for a missed broadcast/channel drop.
Consequences: `touchPresence` is no longer `async` (the in-memory update is synchronous; the DB write is fire-and-forget via `after()`). `lib/server/actions-lobby.ts`'s rarer, non-hot-path actions (`becomeHost`, `joinGame`, `fillWithBots`, `swapSeats`, `startGame`) were intentionally left with their existing sequential `getUserId()` → `loadGame()` pattern - same easy win available there later if it turns out to matter, but they are not on the per-card-play path this report was about.
Alternatives_Rejected: Switching `getUserId()` from `supabase.auth.getUser()` (network-validated) to a locally-decoded session/claims check - the single largest remaining lever (this call happens on every action and every `getView`) - was not applied without asking: it trades away real-time revocation checking for latency, which is an auth-security tradeoff the user should confirm rather than have silently changed.

---

## 2026-07-17 - `getUserId()` switched from `getUser()` to `getClaims()`

Decision: User confirmed the tradeoff flagged in the previous entry. `lib/supabase/server.ts`'s `getUserId()` now calls `supabase.auth.getClaims()` instead of `supabase.auth.getUser()`.
Context: Follow-up to the previous entry's round-trip cleanup - this was the one remaining network round trip on every server action and every `getView` call that was deliberately left alone pending confirmation.
Rationale: `getClaims()` still verifies the JWT (unlike `getSession()`, which Supabase explicitly warns is unsafe for authorization decisions since it does not verify the signature) - but it does so locally, without a round trip to the Auth server, whenever the Supabase project uses asymmetric JWT signing keys; it transparently falls back to the same server call `getUser()` always makes if the project is still on a symmetric secret (so this is a pure win, never a regression, whichever key type the project currently uses). Acceptable given anonymous sign-in is the only auth mode here (no email/password account to protect) and the risk being traded away is real-time session revocation (an admin banning a session mid-token-lifetime would only take effect at the token's natural expiry instead of immediately).
Consequences: `getUserId()`'s signature/behavior for callers is unchanged (`Promise<string | null>`); only the id source changed. If the Supabase project's Auth settings are ever changed to enable asymmetric signing keys (not verified as part of this change - no MCP/CLI access to the project dashboard from here), this call becomes fully local with no network cost at all.
Alternatives_Rejected: `getSession()` (rejected - does not verify the JWT signature, explicitly called out as unsafe by Supabase's own docs for this exact use case).

---

## 2026-07-17 - Idle-turn timer ("are you still there?") + permanent bot takeover, online-only, both games

Decision: Added a configurable per-turn idle timer for online games (Coinche and la Bouilla): after `settings.stillThereTimeoutSec` (default 15) of silence on a human's own turn, the server auto-plays a random legal card (or the existing heuristic bid, during Coinche bidding) and marks the seat as having missed a turn. The very next time that seat must act, the countdown shows immediately with a shorter 5s-only window; missing that one too permanently converts the seat to a bot (`is_bot = true`, `user_id = null`) for the rest of the game. Any successful self-play resets the streak. New `games.turn_started_at` and `game_players.missed_turns_in_row` columns anchor this; `GameSettings.stillThereTimeoutSec` is the new (only) Bouilla setting.
Context: User request, scoped down via clarifying questions: applies to both games (not just Bouilla, as first asked), online mode only (not ad-hoc P2P or local-vs-bots, since those never run this server-side check), and the bot takeover is permanent (no reclaim-your-seat mechanic).
Rationale: This is deliberately layered *in front of* the existing 45s `advanceStaleTurns` presence-based safety net (`lib/server/actions-game.ts`) rather than replacing it - that mechanism answers "is this seat's browser gone at all," while this one answers "is this seat's own human just not acting on their turn," on a much shorter fuse. Turn-start timing was tracked on the `games` row (not inside the pure `GameState`) to keep `lib/coinche`/`lib/bouilla` pure and framework-agnostic per `docs/TECH.md`'s architecture principles; `persistGame` (`lib/server/repo.ts`) is the single choke point every move already goes through, so stamping `turn_started_at` there whenever `state.turn` changes needed no new call sites. The decision logic itself (`decideIdleAction` in the new `lib/server/idle-timer.ts`) is pure and unit-tested, mirroring the "pure engine, unit-tested" convention applied to the one bit of this feature that actually is pure. The popup is a non-blocking floating banner, not a full-screen modal, because the player must still be able to tap and play a card underneath it to cancel the countdown.
Consequences: `lib/server/game-dispatch.ts` is a new plain (non-`"use server"`) module, extracted from `lib/server/actions-game.ts`, holding the game-dispatch helpers (`applyCardPlay`, `applyMove`, `chooseHeuristicMove`, `isActivePhase`, `statusFor`) both `actions-game.ts` and `idle-timer.ts` need - a `"use server"` file may only export async functions, so these synchronous helpers could not stay there once a second module needed them. Bouilla's online setup screen now shows a settings panel for the first time (previously nothing, by design, since its rules are fixed) - `components/GameSettingsPanel.tsx` gained `coincheFields`/`showStillThereTimeout` props so it can render just the one shared field for Bouilla while local/ad-hoc Coinche screens (which don't pass `showStillThereTimeout`) are unaffected. A converted-to-bot player becomes a spectator on reconnect, reusing the existing "game in progress, you are not part of it" screen - no new UI was needed for that state.
Alternatives_Rejected: Tracking `turnStartedAt` inside each engine's own `GameState` (rejected - would have made an online-presence concern leak into the pure rules engines shared with local/ad-hoc play, which never use it). A literally random bid as the bidding-phase equivalent of "random card" (rejected - an unlucky random bid could hand out a large unwanted contract; idle bidding timeouts reuse the existing heuristic bid instead, for both the first and second offense).

---

## 2026-07-17 - Bouilla bot: fixed a "Capot" vacuous-truth bug + recalibrated danger weights + added a `lastTrick` heuristic

Decision: Following a strategy research pass (Barbu/Hearts literature) requested by the user to diagnose why the Bouilla bot sometimes played absurdly large cards early and lost badly, three fixes went into `lib/bouilla/rounds.ts`/`bot.ts`: (1) `sweepAliveFor` (`rounds.ts`) now requires at least one relevant completed trick before claiming a seat's sweep is "alive" - `tricks.every(...)` on an empty array is vacuously `true` in JS, which meant every seat's sweep looked "alive" before a single trick had been played this round, so `chooseCard` would switch into "try to win" mode (`chooseLeadToWin`/`chooseFollowToWin`, i.e. play/win with the strongest card in hand) on the very first trick of the "tricks"/"clubs"/"queens"/"everything" rounds - exactly the reported symptom. (2) `cardDanger` (`bot.ts`)'s king-of-spades weight went from a flat `3` to `5`, matching the real point ratio (50/20/10 = 5/2/1 for king/queen/club) instead of an arbitrary 3/2/1. (3) A new `lastTrickDanger` adds danger to held control cards (Q/K/A) once the round is down to its last 4 tricks (`LATE_ROUND_WINDOW`), which previously had zero bot-side awareness at all for the `lastTrick` round (its 100-point penalty, the single biggest in the game, had no dedicated heuristic).
Context: User asked for a research-first pass (no code) diagnosing bad bot play, specifically citing large-card openings; this entry is the follow-up "implement it" the user then requested, covering exactly the findings from that research (see chat transcript) rather than the broader unscoped ideas (contract-calling strategy, full endgame minimax solver) that don't apply here since Bouilla has no bidding and a fixed round order.
Rationale: The vacuous-truth bug was the clear root cause and highest-value fix (one-line semantic correction: "alive" should mean "seat has actually been winning the tracked cards so far," not "no evidence yet against it"). The weight recalibration is a small, low-risk tuning change directly justified by the fixed point values already in `rounds.ts`. The `lastTrick` heuristic is deliberately gated to only the last 4 tricks (zero elsewhere) so it doesn't crowd out the existing void-suit lead preference (`chooseLead`'s `voidDiff` tie-break) during normal play - it only kicks in for the specific "hold your control cards for the endgame" scenario the game's last round is actually about.
Consequences: `TRICKS_PER_ROUND` is now exported from `rounds.ts` (was a private const) so `bot.ts` can compute tricks-remaining without duplicating the constant. 5 new unit tests (2 in `rounds.test.ts` for the vacuous-truth fix, 3 in `bot.test.ts` covering the bug fix and the new `lastTrick` heuristic); full suite at 120 tests (was 115), typecheck/lint/build all clean.
Alternatives_Rejected: An exact endgame minimax solver for `lastTrick`'s last few tricks (flagged during research as the strongest option, but explicitly deferred - bigger lift, not what was scoped for this pass); a continuous per-rank danger curve for `lastTrickDanger` instead of the discrete Q/K/A + 4-trick-window gate (rejected after tracing through `chooseLead`'s sort - a continuous score makes danger ties nearly impossible, which would silently defeat the existing void-suit-lead tie-break for the entire round instead of only the endgame).

---

## 2026-07-17 - Hotfix: `getUserId()` hardened against `getClaims()` throwing outright

Decision: User reported a hard regression ("can't start a game anymore", generic Next.js Server Components render-error digest) right after the previous entry's `getUser()` -> `getClaims()` switch. `getUserId()` (`lib/supabase/server.ts`) now wraps `getClaims()` in a try/catch and falls back to `getUser()` on any thrown error, instead of letting it propagate.
Context: Unlike the rest of the Supabase Auth API (which returns `{ data, error }`), `auth-js`'s `getClaims()` can throw directly - e.g. when it has to fetch the project's JWKS to verify an asymmetric-signing-key JWT and that fetch fails - and that path is not wrapped in an `AuthError`, so it re-throws past the `{ data, error }` contract. `getUserId()` had no try/catch, so any such throw during a Server Action or Server Component crashed the whole render with no visible detail (production digest message).
Rationale: This is the same latency win as before whenever `getClaims()` succeeds, but now degrades to the previously-safe `getUser()` behavior on any failure instead of taking the app down. Smallest possible fix: no behavior change on the happy path, and the fallback is the exact code this replaced two entries ago.
Consequences: None beyond restoring correctness; `getUserId()`'s public signature and normal-path latency are unchanged.
Alternatives_Rejected: Reverting `getClaims()` entirely back to `getUser()` (rejected - loses the latency win on every action/`getView` call for a failure mode that only needs a fallback, not a full revert). Also flagged for the user to separately check: the same day's idle-timer feature added `games.turn_started_at`/`game_players.missed_turns_in_row` columns via the project's single reset-style migration (`supabase/migrations/0001_init.sql`) - if that script was not re-run against the live Supabase project, starting a game (the first write that explicitly sets `turn_started_at`) would fail the same way for an unrelated reason; not fixable from code, needs user confirmation.

---

## 2026-07-17 - Real root cause of "can't start a game": broken type re-export in a `"use server"` file, fixed via Vercel MCP runtime-error triage

Decision: The `getUserId()` hotfix and the migration re-run (both done/confirmed) did not fix the user's "can't start a game anymore" report. Used the Vercel MCP (`get_runtime_errors`) to pull the actual production error, which was hidden behind Next.js's generic redacted digest message. Found `ReferenceError: BotMove is not defined` at module evaluation of the `/game/[id]` route's server-actions chunk, 51 occurrences across 2 users, present since at least the deployment before the getUserId hotfix. Root cause: `lib/server/actions-game.ts` (a `"use server"` file) had `export type { BotMove, WireCard };` re-exporting types that were themselves imported from `./game-dispatch` (not declared locally). Fix: deleted that re-export line; `lib/client/useBotRunner.ts` (the only consumer of `BotMove` from `actions-game.ts`) now imports the type directly from `@/lib/server/game-dispatch` instead.
Context: `game-dispatch.ts` was extracted from `actions-game.ts` earlier the same day for the idle-timer feature (a `"use server"` file may only export async functions, so the synchronous dispatch helpers had to move to a plain module) - `BotMove`/`WireCard` moved with it, and the re-export was left behind to avoid touching the one external consumer at the time. That re-export is exactly the pattern that broke: Next.js's Turbopack "use server" transform rewrites a server-actions file's exports into a client-safe reference module, and it does not correctly recognize `export type { X }` when `X` is itself imported from elsewhere (as opposed to declared in the same file) - it emitted a runtime reference to `BotMove`, which does not exist as a value, crashing the entire module at evaluation time (not just the action call) for every request to that route.
Rationale: Type-only re-exports of externally-declared types have no place in a `"use server"` file at all, even though TypeScript alone would happily erase them - the framework's own build-time transform is the actual constraint here, and it is undocumented/surprising enough that it is worth a permanent rule: `"use server"` files should only export async functions, full stop; types they need to expose should be imported by callers from the module that actually declares them.
Consequences: No behavior change, pure bugfix. Confirms this file class (any `"use server"` module) must be audited for `export type` re-export patterns; `actions-lobby.ts` was checked and has none. The user should re-test "start a game" after this deploys; if still broken, get the fresh error via `get_runtime_errors` again rather than the redacted client digest, which carries no diagnostic value on its own.
Alternatives_Rejected: None - this was a bug with only one correct fix once located; the effort was almost entirely in *finding* it (client digest is opaque by design; had to authenticate the Vercel MCP and query runtime error clusters directly).

---

## 2026-07-17 - Idle-turn timer: any tap on screen dismisses the "are you still there?" banner, not just playing a card

Decision: While the banner shows, a tap anywhere on screen now dismisses it, not only an actual card play. A new server action `markStillHere` (`lib/server/actions-game.ts`, backed by `markSeatPresent` in `lib/server/idle-timer.ts`) resets `missed_turns_in_row` to 0 and restarts `turn_started_at` - the same full reset an actual play already gets - as a no-op if it is somehow not that seat's turn. `lib/client/useStillThereTimer.ts` attaches a one-shot `pointerdown` listener on `document` while the banner is showing, calling `markStillHere` then refetching; it does not `preventDefault`/`stopPropagation`, so a tap that also lands on a card still plays it normally in addition.
Context: User follow-up request after the idle-timer feature shipped: a tap anywhere on screen, not specifically on a card, should cancel the popup.
Rationale: Resetting only `turn_started_at` (leaving `missed_turns_in_row` untouched) was considered and rejected: for a seat already on its second (immediate-banner) miss, `showAt` for that state is `turnStartedAt` itself, so restarting the clock without clearing the streak would make the banner reappear on the very next tick instead of actually being dismissed. Clearing the streak on any tap is the only implementation that satisfies "a tap cancels the popup" in both the first-miss and escalated-miss states.
Consequences: A player who keeps tapping the screen every few seconds without ever actually playing a card can indefinitely avoid both the auto-play and the permanent bot conversion, since each tap is a full reset - accepted trade-off, matching the same behavior class as "are you still watching?" prompts elsewhere (continued interaction, even without progressing, counts as presence). The existing 45s browser-gone safety net (`advanceStaleTurns`) is unaffected and still catches a genuinely closed/frozen tab.
Alternatives_Rejected: Client-only dismissal (just hiding the banner locally without telling the server) - rejected because the server-side auto-play/bot-conversion clock would keep running unseen, so the player would think they were safe and then get auto-played-for or bot-converted anyway; a real presence signal has to reach the server for the dismissal to mean anything.
