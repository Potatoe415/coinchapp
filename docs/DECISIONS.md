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
