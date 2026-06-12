# RUNBOOK

Status: Active.

---

## Setup

Prerequisites: Node 20+ and npm. A Supabase project. A Vercel account (for deploy).

1. Install dependencies:
   ```
   npm install
   ```
2. Create a Supabase project, then in the SQL editor run the single setup script:
   - `supabase/migrations/0001_init.sql` (full reset + schema + 48h TTL cron;
     re-runnable to start from scratch)
3. In Supabase dashboard: Authentication -> Providers -> enable **Anonymous sign-ins**.
4. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only authority key)

## Development

```
npm run dev
```
App runs on http://localhost:3000. Open two browser profiles to test multiplayer,
or use "Remplir avec des bots" to play solo against the AI.

## Test

```
npm test          # run the rules engine test suite once (Vitest)
npm run test:watch
```

## Build

```
npm run build
npm start         # serve the production build locally
```

## Deploy (Vercel)

1. Push the repo to GitHub.
2. In Vercel: New Project -> import the repo. Framework preset: Next.js.
3. Set Environment Variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy. Vercel auto-builds on every push to the main branch.

## Troubleshooting

- "not_authenticated" on create/join: Anonymous sign-ins not enabled in Supabase.
- Realtime not updating: ensure `game_events` is in the `supabase_realtime`
  publication (the migration adds it) and the anon session is established.
- "persist_failed": check `SUPABASE_SERVICE_ROLE_KEY` is set on the server.
