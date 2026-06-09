# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Provision Supabase + deploy to Vercel and verify a full game in prod.
Last_Action: Implemented engine, server actions, realtime, UI; filled project docs.
Next_Actions:
- Create Supabase project, run `supabase/migrations/0001_init.sql`, enable anonymous sign-ins.
- Set env vars locally (.env.local) and on Vercel; push to GitHub; deploy.
- Verify: create -> fill bots -> bidding -> 8 tricks -> score -> next deal -> finish.

Open_Questions:
- Manual Belote/Rebelote announcement vs current auto-detection?
- Accounts/stats needed later?

Recent_Changes:
- 2026-06-09 Scaffolded Next.js 16 + TS + Tailwind 4 + Vitest + Supabase, git init.
- 2026-06-09 Pure Coinche rules engine in lib/coinche + 36 Vitest tests (green).
- 2026-06-09 Supabase schema + RLS + realtime tick; authoritative Server Actions.
- 2026-06-09 Mobile-first UI (home, lobby, table, bidding, overlays); realtime hook.
- 2026-06-09 Filled PRODUCT/TECH/DATA_MODEL/RUNBOOK/DECISIONS/BACKLOG; added README.
