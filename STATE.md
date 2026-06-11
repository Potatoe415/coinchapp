# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Vertical slice implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Continue gameplay UX hardening and keep visible app version up to date.
Last_Action: Added bilingual Rules popup button (FR/EN) next to Reset on home screen: `RulesModal` component, `rulesButton` i18n key, wired into `app/page.tsx`; tsc and lint pass.
Next_Actions:
- Validate online game tempo after removing bot delays (bidding and playing), especially turn chaining between bots.
- Continue gameplay UX hardening and regression checks.

Open_Questions:
- Accounts/stats needed later?
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?

Recent_Changes:
- 2026-06-11 Added bilingual Rules popup button next to Reset on home screen; `RulesModal` component with 6 beginner sections (FR/EN), switches with locale from `useI18n`.
- 2026-06-11 Bots never cut (ruff) when their partner is master and a non-trump discard exists (`avoidCuttingPartner`), in both server and client play paths.
- 2026-06-11 Partner-support bid only fires if the bot has not already bid in the current auction (passes don't block it).
- 2026-06-11 Fixed all ESLint errors: `useLocalGame` now uses useState + ref mirror; optimistic-state resets moved to render-time pattern (`Lobby`, `DealOverlay`, `GameTable`); ref writes moved to effects; browser-read effects annotated; dead `busy` prop chain removed.
- 2026-06-11 Bots now support a partner's standing suit bid: +10 with trump Jack/9 over an 80/90, +10 per ace once partner bid 90+ (`decideBidWithSupport`); cumulative, capped at 160.
