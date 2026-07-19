# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Local (solo) play is now offline/reload-proof: a PWA manifest + service worker + localStorage match persistence let a plane/no-signal user reload or relaunch mid-game without losing anything. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Confirm the offline PWA work end-to-end on a real phone (Android + iPhone), and get user confirmation on whether/how to record it in `docs/TECH.md`.
Last_Action: Added `app/manifest.ts` + icons (`app/icon.png`, `app/apple-icon.png`, `public/icons/*`, generated via `GenerateImage` + resized with PowerShell/System.Drawing), a hand-written `public/sw.js` (network-first for navigations, cache-first for `/_next/static/*`, registered by `components/ServiceWorkerRegistration.tsx` in `app/layout.tsx`), and `lib/client/localGamePersistence.ts` (localStorage save/load/clear, keyed by phase) wired into `useLocalGame.ts` and `useLocalBouillaGame.ts` (resume on mount, clear on finish or on any deliberate "new game" action in `app/local/page.tsx` and both games' `onReset`). Scope is local/solo mode only - online/ad-hoc still require network by design. Considered and rejected a native Android APK (Capacitor/WebView) per user preference to stay in-browser. See `docs/DECISIONS.md` 2026-07-19. Build, typecheck, lint (no new errors vs baseline), and full test suite (120 tests) all green.
Next_Actions:
- On a phone, add the app to the home screen and verify: reload mid-local-game keeps the match; force-quitting and reopening resumes it too; starting a genuinely new local game never resumes a stale one.
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
- 2026-07-19 Local/solo play is now offline-capable and reload/relaunch-proof: PWA manifest + service worker (network-first navigations, cache-first static assets) + localStorage match persistence. See DECISIONS.
- 2026-07-18 Idle-turn timeout setup field is now a slider (10/15/20/30/60s), shared options list between client and server. See DECISIONS.
- 2026-07-18 Idle-turn timer: fixed `turn_started_at` not resetting when the same seat leads the next trick (near-instant popup bug). See DECISIONS.
- 2026-07-18 Bouilla home screen: buttons now correctly red/yellow/green via hex overrides in `app/page.tsx`.
- 2026-07-18 Added language switcher (FR/EN buttons) to `GameInfoPanel` in `GameHud.tsx` — visible during any game.
