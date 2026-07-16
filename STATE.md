# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades end implemented. Builds and tests pass. Not yet deployed.
Current_Goal: Validate "la Bouilla" manually in each of the 3 modes, then revisit the offline ad-hoc real-device pairing test still pending from the Coinche slice.
Last_Action: Bouilla "kingSpades" round now ends the instant the king of spades is captured, instead of always playing out all 13 tricks (see DECISIONS 2026-07-16); `applyPlay` (`lib/bouilla/trick.ts`) checks for it on every completed trick, scoped to that one round only (scoring unaffected - already only cared about the trick with the king). `BouillaTable.tsx`'s hand fan is now hidden outside `phase==="playing"` since this can leave cards in hand at round-end. 3 new tests. Just before that: added the "Capot" sweep bonus (sweeping all tricks/clubs/queens flips the penalty onto the other 3 seats), extracted shared `components/TrickStage.tsx` animations, fixed the hand fan to use the real measured screen width (`ResizeObserver`, was a hardcoded 340px), sorted the hand by suit+rank, merged `/bouilla` into `app/page.tsx` as a tab, and lengthened the round-overlay reveal delay to 2000ms so it no longer cuts into the 1500ms trick-collect animation. tsc/lint/vitest(89)/build all clean.
Next_Actions:
- Manually play through Bouilla local (bots), online (2+ browsers), and ad-hoc (host + client) to sanity-check the UI end-to-end, incl. animations, hand sort/width, a real Capot, and an early kingSpades end (never opened in a real browser this session).
- Noticed an automated "Sync from SFDC-AP-0M1DHRD" process periodically auto-commits and once resurrected a just-deleted `app/bouilla/page.tsx` mid-session - re-deleted twice now; worth a passing mention if home-screen changes seem to "revert" on their own.
- Consider adding Bouilla's 6-round names + Capot + early-kingSpades rules to `docs/PRODUCT.md`/`docs/DATA_MODEL.md` if the user wants it documented (not yet asked).
- Test ad-hoc pairing on two real phones on the same hotspot/Wi-Fi (Chrome mDNS `.local` candidate risk; no PoC was run) - pending from before this feature.
- Confirm with user whether to update `docs/PRODUCT.md` (now a 2-game platform; framing still Coinche-only).
- Wire `useMatchStats` into the scoring/finished screen to display the awards UI (pending from before this feature).

Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Bouilla ad-hoc/online: no per-game settings UI shown (rules are fixed by design) - confirm this is desired, not just a placeholder gap.

Recent_Changes:
- 2026-07-16 Bouilla "kingSpades" round ends the instant the king is captured, not after 13 tricks. See DECISIONS.
- 2026-07-16 Bouilla "Capot": sweeping a round (all tricks/clubs/queens) now flips the penalty onto the other 3 seats instead of the sweeper. See DECISIONS.
- 2026-07-16 Bouilla hand now sorts by suit then rank (was suit-only) and its fan width is measured live (`ResizeObserver`) instead of a hardcoded cap.
- 2026-07-16 Home screen merged: dropped `/bouilla` route, `app/page.tsx` now picks the game via a Coinche/la Bouilla tab and reuses the same 3 mode buttons.
- 2026-07-16 Added second game "la Bouilla" (Barbu variant): new `lib/bouilla` engine, `lib/cards` shared deck primitives, `game_type`-dispatching server actions, generic client bot-loop driver, new `BouillaTable` UI, and `/bouilla` entry point reusing `/local` `/online` `/adhoc` via `?game=bouilla`. See DECISIONS.
- 2026-06-16 Added 5 bot play heuristics in `lib/coinche/play-tactics.ts` (pre-filters); ISMCTS brain unchanged, shared by online + local bots. See DECISIONS 2026-06-16.
- 2026-06-16 Added offline ad-hoc WebRTC P2P mode (host + clients, QR signaling); additive only, online/local modes untouched. See DECISIONS 2026-06-16.
