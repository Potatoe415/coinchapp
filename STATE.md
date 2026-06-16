# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Ship the offline ad-hoc (WebRTC P2P) mode and validate pairing on real devices.
Last_Action: Refined bot card play with 5 deterministic heuristics in a new module `lib/coinche/play-tactics.ts` (pull trumps when master; SA protect unguarded 10; SA cash aces early; lead trump for the taker; never overtake a partner who is the certain trick winner — any partner, secure-win guard via `partnerWinSecure`; shed min points on lost tricks), composed by `refinePlayCandidates` and wired into the ISMCTS brain (`lib/client/bot.ts`) as legal-set pre-filters with safe fallback. ISMCTS untouched; shared by online host + local solo bots. tsc clean, 47/47 tests pass. See DECISIONS 2026-06-16 (x2).
Next_Actions:
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC was run).
- Confirm with user whether to update `docs/PRODUCT.md` (offline/P2P now exists; "online only" framing outdated).
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI.

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-16 Added 5 bot play heuristics in `lib/coinche/play-tactics.ts` (pre-filters); ISMCTS brain unchanged, shared by online + local bots. See DECISIONS 2026-06-16.
- 2026-06-16 Added offline ad-hoc WebRTC P2P mode (host + clients, QR signaling); additive only, online/local modes untouched. See DECISIONS 2026-06-16.
- 2026-06-13 Fixed online create showing 4 empty seats: `createGame` relies on `game_type` default + checks the seat insert error; SQL re-adds `notify pgrst, 'reload schema'`.
- 2026-06-12 Merged all SQL into one re-runnable `0001_init.sql` (full DB reset at top: unschedule cron + drop cascade); deleted `0002`/`0003`.
- 2026-06-12 Added `games.game_type` discriminator (Option A, default 'coinche') to host multiple games in one Supabase project; `GameType` type added. Non-breaking.
