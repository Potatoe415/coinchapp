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
