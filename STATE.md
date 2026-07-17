# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Manually validate Bouilla online play feels instant and pre-selection works (both fixes just shipped), then resume la Bouilla's English UI validation across local/online/ad-hoc modes.
    10|Last_Action: Fixed two Coinche-only UX gaps in Bouilla by extending the same shared hook: (1) "card takes 1-2s to play online" - instant optimistic hand/trick update before the server round trip resolves; (2) missing "pre-select a card while waiting for your turn" (auto-plays if still legal when your turn arrives, un-stages if not). Both now live in `lib/client/useOptimisticPlay.ts` (`optimisticHand`/`trickCards`/`play`, plus `preSelectedId`/`tapCard`), with the shared per-card "lifted + ring" visual pulled into `components/HandCardSlot.tsx`. `GameTable.tsx` and `BouillaTable.tsx` both consume these instead of each owning local copies - see DECISIONS. Type-check, lint, Vitest (108), and production build all pass.
Next_Actions:
- Manually play a Bouilla online game (2+ browsers): confirm cards play instantly on tap, and that tapping a card while waiting for your turn pre-selects it (lift + yellow ring) and auto-plays it when your turn comes, matching Coinche's feel.
- Switch to English and manually play through Bouilla local (bots), online (2+ browsers), and ad-hoc (host + client), checking setup, lobby/P2P, all six round labels, scoreboard/settings, Capot, next-round waiting, and final results.
- Repeat the key screens in French to catch any i18n regressions.
- Noticed an automated "Sync from SFDC-AP-0M1DHRD" process periodically auto-commits and has resurrected a just-deleted `app/bouilla/page.tsx` twice mid-session now - re-deleted both times; worth a passing mention if home-screen changes seem to "revert" on their own.
- Consider adding Bouilla's 6-round names + Capot + early-end rules to `docs/PRODUCT.md`/`docs/DATA_MODEL.md` if the user wants it documented (not yet asked).
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC was run) - pending from before this feature.
    20|- Confirm with user whether to update `docs/PRODUCT.md` (now a 2-game platform; framing still Coinche-only).
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI (pending from before this feature).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Bouilla ad-hoc/online: no per-game settings UI shown (rules are fixed by design) - confirm this is desired, not just a placeholder gap.

Recent_Changes:
- 2026-07-17 Bouilla gained Coinche's "pre-select while waiting for your turn" behavior, via the same shared `useOptimisticPlay` hook plus a new shared `HandCardSlot` component. See DECISIONS.
- 2026-07-17 Bouilla's card play is now instant online (optimistic UI), via a new shared `useOptimisticPlay` hook also adopted by Coinche's `GameTable`. See DECISIONS.
- 2026-07-17 Bouilla UI now follows the selected locale end-to-end, including round/scoring labels, setup modes, table controls, P2P fallback copy, accessibility text, and default player names.
    30|- 2026-07-16 Bouilla bot AI improved: dynamic queen/club danger, void-aware leads, and Capot sweep-alive/sweep-breaking logic. See DECISIONS.
- 2026-07-16 Bouilla now auto-plays the last card in hand after 700ms, same as Coinche (now lives in `useOptimisticPlay`, shared by both tables).
- 2026-07-16 Bouilla "kingSpades"/"queens" rounds end early once decided (king captured / all 4 queens fallen), not after 13 tricks. See DECISIONS.
