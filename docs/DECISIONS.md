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
