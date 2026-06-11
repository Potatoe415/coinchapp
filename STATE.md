# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Bot determinization now tracks known suit voids (chicanes): `botSim.ts` infers led-suit voids from public play and deals the unseen pool under those constraints (`dealConstrained`, retries + safe fallback). Added vitest `@` alias and `lib/client/botSim.test.ts`; 40/40 tests + tsc + lint pass.
Next_Actions:
- Optional phase 2: infer trump voids (defausse instead of obliged cut) in `botSim.ts`.
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-11 Bot determinization tracks known suit voids (chicanes) in `botSim.ts` (`dealConstrained` + retries/fallback); added vitest `@` alias and `botSim.test.ts`.
- 2026-06-11 Added "DERNIER PLI (X pts)" below contract pill in game header during playing phase; same pts shown in GameInfoPanel; `trickPoints()` helper in `GameHud.tsx`.
- 2026-06-11 Added bilingual Rules popup button next to Reset on home screen; `RulesModal` component with 6 beginner sections (FR/EN), switches with locale from `useI18n`.
- 2026-06-11 Bots never cut (ruff) when their partner is master and a non-trump discard exists (`avoidCuttingPartner`), in both server and client play paths.
- 2026-06-11 Partner-support bid only fires if the bot has not already bid in the current auction (passes don't block it).
