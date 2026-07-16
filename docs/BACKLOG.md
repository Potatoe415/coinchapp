# BACKLOG

Status: Living document. Always reflects current state.

---

## Now
- [ ] Provision Supabase project, run `supabase/migrations/0001_init.sql`, enable anonymous sign-ins.
- [ ] Push to GitHub and deploy on Vercel with the 3 env vars; verify a full game in prod.

## Next
- [ ] Manual Belote/Rebelote announcement during play (currently auto-detected).
- [ ] Smarter bot bidding/play (currently a greedy heuristic).
- [ ] Ad-hoc P2P: real-device pairing test (Chrome mDNS `.local` risk), client reconnection, emoji over the data channel.

## Later
- [ ] Optional accounts + stats/leaderboard.
- [ ] Rule variants and table chat.

## Blocked
- [ ] Prod verification blocked on user's Supabase + Vercel + GitHub setup.

## Done
- [x] Restyle the mobile game table to match the provided visual reference.
- [x] Bootstrap context architecture.
- [x] Scaffold Next.js + TS + Tailwind + Vitest + Supabase deps, git init.
- [x] Pure rules engine (cards, deal, bidding, trick, scoring, bots, redact) + 36 tests.
- [x] Supabase schema + RLS + realtime tick + browser/server/service clients.
- [x] Authoritative Server Actions (create/join/fill/start/bid/play/nextDeal/getView).
- [x] Realtime hook + lobby + mobile-first game table + bidding panel + deal/finish overlays.
- [x] Settings dashboard on home (target points, bot difficulty).
- [x] Runbook, README, product/tech/data-model docs.
- [x] Offline ad-hoc mode: WebRTC P2P host/client over local network with QR-code signaling (additive, online/local modes untouched).
- [x] Optimistic concurrency / version conflict handling on Server Actions (`updateVersioned` in `repo.ts`).
- [x] Reconnection/disconnect handling and "connected" status in the table UI (presence heartbeat + stale-turn auto-play fallback).
