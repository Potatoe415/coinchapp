# TECH

Status: Living document. Never edit autonomously - confirm with user first.

---

Stack_Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
Stack_Backend: Next.js Server Actions (authoritative game logic)
Database: Supabase Postgres
Runtime: Node.js (Vercel serverless)
Package_Manager: npm
Hosting: Vercel
Authentication: Supabase anonymous sign-in (cookie session via @supabase/ssr)
Authorization: RLS denies direct client access to games/game_players; only the service_role (Server Actions) reads/writes authoritative state.
Security: Hidden hands never leave the server; clients receive a redacted per-seat view. Server validates every move with the rules engine.
Testing: Vitest (pure rules engine in lib/coinche)
Deployment: Git push -> Vercel build (see docs/RUNBOOK.md)

Conventions:
- Language: English (code), French (user-facing copy)
- Naming: camelCase (TS), kebab-case (data-id attributes), snake_case (SQL)
- Formatting: default Next.js ESLint config
- Error_Handling: Server Actions throw Error with stable codes (e.g. "illegal_card"); UI shows the code/message.
- Logging: none custom yet

Architecture_Principles:
- Rules engine is pure and framework-agnostic (lib/coinche), unit-tested.
- Server is the single authority; the browser is a renderer + input.
- Realtime is a lightweight tick (game_events) that triggers a redacted refetch; no secret data flows over realtime.
- Bots run server-side: after a human move, bot seats auto-play until the next human.
- Files <= 300 lines, functions <= 30 lines, one responsibility per file.

Key_Modules:
- lib/coinche: cards, deal, bidding, trick, scoring, engine, bot, redact, types.
- lib/server: repo (data access), bots (advance loop), view (redaction), actions-lobby, actions-game.
- lib/supabase: client (browser), server (user + service clients).
- lib/client: auth (anon), useGameView (realtime hook).

Open_Questions:
- Optimistic concurrency on version is naive (read-then-write); revisit if races appear.
