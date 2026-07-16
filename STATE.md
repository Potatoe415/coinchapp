# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Validate "la Bouilla" manually in each of the 3 modes, then revisit the offline ad-hoc real-device pairing test still pending from the Coinche slice.
Last_Action: Improved the Bouilla heuristic bot (`lib/bouilla/bot.ts`, user picked "heuristics-plus" from a menu of options - see DECISIONS 2026-07-16): (1) queen/club danger now scales up as fewer copies remain unseen this round, (2) leads now prefer a suit more opponents are inferred void in (same void-tracking idea as Coinche's ISMCTS), (3) new `sweepAliveFor`/`trickMattersForSweep` in `rounds.ts` let the bot switch to "try to win" mode to keep pushing its own Capot sweep alive, or break an opponent's. 13 new tests. Just before that: `BouillaTable.tsx` auto-plays the last card in hand after 700ms (same as Coinche). tsc/lint/vitest(106)/build all clean.
Next_Actions:
- Manually play through Bouilla local (bots), online (2+ browsers), and ad-hoc (host + client) to sanity-check the UI end-to-end, incl. animations, hand sort/width, a real Capot, and early kingSpades/queens ends (never opened in a real browser this session).
- Noticed an automated "Sync from SFDC-AP-0M1DHRD" process periodically auto-commits and has resurrected a just-deleted `app/bouilla/page.tsx` twice mid-session now - re-deleted both times; worth a passing mention if home-screen changes seem to "revert" on their own.
- Consider adding Bouilla's 6-round names + Capot + early-end rules to `docs/PRODUCT.md`/`docs/DATA_MODEL.md` if the user wants it documented (not yet asked).
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC was run) - pending from before this feature.
- Confirm with user whether to update `docs/PRODUCT.md` (now a 2-game platform; framing still Coinche-only).
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI (pending from before this feature).

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Bouilla ad-hoc/online: no per-game settings UI shown (rules are fixed by design) - confirm this is desired, not just a placeholder gap.

Recent_Changes:
- 2026-07-16 Bouilla bot AI improved: dynamic queen/club danger, void-aware leads, and Capot sweep-alive/sweep-breaking logic. See DECISIONS.
- 2026-07-16 Bouilla now auto-plays the last card in hand after 700ms, same as Coinche (`BouillaTable.tsx`, no engine change needed).
- 2026-07-16 Bouilla "kingSpades"/"queens" rounds end early once decided (king captured / all 4 queens fallen), not after 13 tricks. See DECISIONS.
- 2026-07-16 Bouilla "Capot": sweeping a round (all tricks/clubs/queens) now flips the penalty onto the other 3 seats instead of the sweeper. See DECISIONS.
- 2026-07-16 Bouilla hand now sorts by suit then rank (was suit-only) and its fan width is measured live (`ResizeObserver`) instead of a hardcoded cap.
