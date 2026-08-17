# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens/clubs end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Local (solo) play is now offline/reload-proof: a PWA manifest + service worker + localStorage match persistence let a plane/no-signal user reload or relaunch mid-game without losing anything. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Confirm the new Bouilla bot play in a real game (no more early aces, visible void-building), then the offline PWA work end-to-end on a real phone.
Last_Action: Replaced background image for Bouilla only: copied `bouilla-full.jpg` to `public/`, updated `app/bouilla/page.tsx` and `app/page.tsx` (bouilla tab branch) to use it; Coinche keeps `splashscreen.jpg`. it was rendered correctly (`absolute left-4 top-4 z-10`) but every click was silently swallowed, because the sibling `splash-actions`/`home-footer-actions` divs are also `relative z-10` in the same stacking context as `<main>` and come later in the DOM, so their (invisible, padding-only) box painted on top and intercepted the click — confirmed live on `coinchapp.vercel.app` via `document.elementFromPoint`/a real `browser_click` "intercepted" error. Fix: extracted both buttons into a new shared `components/HomeTopBar.tsx` (used by `app/page.tsx` and `app/bouilla/page.tsx`) at `z-20`, above those siblings. Also added the requested settings button (gear icon, top-right) opening a small panel with FR/EN language buttons, replacing the global `LanguageSwitcher` on these two pages specifically (`components/LanguageSwitcher.tsx` now hides itself on `/` and `/bouilla` via a pathname check, to avoid a duplicate control) — it still shows on `/local`, `/online`, `/adhoc` as before. Verified locally (`npm run dev`, browser automation): back link now completes navigation to `bergamots.vercel.app` on both pages, settings panel opens/toggles the language. Also `npm run build` and `npm run lint` (no new warnings/errors; only the pre-existing `DealOverlay.tsx`/`trick.test.ts`/`useMatchStats.ts` issues remain).
Next_Actions:
- Manually confirm on a phone that both coinchapp hub tiles (Coinche + Bouilla) now have a genuinely clickable back button and a working settings/language button.
- Manually confirm the Coinche/Bouilla hub tiles on `bergamots.vercel.app` launch this app in whichever language is selected on the hub.
- Play a Bouilla round (local is enough) and confirm bots no longer dump aces/kings into tricks 1-3, and that they shed a suit to be able to discard later.
- Manually confirm the new bottom reactions bar on a real 4-seat game (Coinche deal-end and Bouilla round-end): opponents' name+emoji no longer overlap the score card/table, and a reaction fired just before the recap appears is still visible in the bottom row.
- Manually confirm the bot-thinking-time slider end to end in each mode (online, local, ad-hoc) for both games.
- On a phone, add the app to the home screen and verify: reload mid-local-game keeps the match; force-quitting and reopening resumes it too; starting a genuinely new local game never resumes a stale one; the new "Installer" button appears (Android/Chrome) and Reset truly forces the latest version.
- Ask user whether to record the new offline/installable capability in `docs/TECH.md` (not edited autonomously per file-ownership rules).
- Manually play an online game and confirm the idle-turn slider/timer fixes from the previous session still hold.
- Manually play a Bouilla game to end and confirm winner + full round table appear correctly on the finished screen.
- Wire `useMatchStats` into the scoring/finished screen (pending from before).
Open_Questions:
- Trusted-runner: host can see opponent-bot hands in mixed games - acceptable long-term?
- Should a permanently-bot-converted seat ever be reclaimable by its original human, or stay a bot for the rest of that game as implemented?
- Accepted trade-off: a player who taps the screen every few seconds without ever playing can indefinitely dodge both the auto-play and the bot conversion - acceptable, per DECISIONS?
- Is a full endgame minimax solver for Bouilla's lastTrick/everything last few tricks worth building later?

Recent_Changes:
- 2026-08-17 Replaced Bouilla splash background with `bouilla-full.jpg` in both `app/bouilla/page.tsx` and the bouilla-tab branch of `app/page.tsx`; Coinche keeps `splashscreen.jpg`.
- 2026-08-17 Added/fixed top-left "back to hub" buttons + top-right settings/language panel on `app/page.tsx` and `app/bouilla/page.tsx` (new shared `components/HomeTopBar.tsx`), also fixing a z-index bug that made the back button unclickable.
- 2026-08-17 `I18nProvider` now honors a `?lang=` URL param (fr/en) over its own stored locale, so the `bergamots` hub can force the starting language on launch.
- 2026-08-03 Bouilla bots stop chasing/breaking a Capot on one trick's evidence (half-done threshold) and now play to run a suit dry, on leads and on discards - fixes "the bots play their aces when they shouldn't take the trick".
- 2026-07-28 Opponents' name+emoji reaction no longer floats over the deal/round recap card: hidden at their usual table spot while the recap is up, shown instead in a new bottom `OpponentReactionsBar` that can't overlap it (pure UI fix, follow-up to the 2026-07-22 emoji-visibility fix).
- 2026-07-28 Bot debug overlay now also shows each phase's Vercel-reported server execution time (vs. client-measured round trip) and has a CSV export button for the rolling log.
