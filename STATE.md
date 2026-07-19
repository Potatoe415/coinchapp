# STATE

Rule: Replace content on every update. Never append history here. Max 60 lines.
History lives in `docs/DECISIONS.md` (decisions) and `docs/BACKLOG.md` (tasks).

---

Status: Second game ("la Bouilla") shipped end-to-end (local/online/ad-hoc), home screen unified with a game-picker tab, "Capot" sweep bonus + early kingSpades/queens end implemented. Online games (both Coinche and Bouilla) now have an idle-turn timer with permanent bot takeover, and its "are you still there?" banner can now be dismissed by tapping anywhere on screen (not just by playing a card). Local (solo) play is now offline/reload-proof: a PWA manifest + service worker + localStorage match persistence let a plane/no-signal user reload or relaunch mid-game without losing anything. Deployed on Vercel (project `coinchapp`, team `remiinsf-3156s-projects`).
Current_Goal: Confirm the offline PWA work end-to-end on a real phone (Android + iPhone), and get user confirmation on whether/how to record it in `docs/TECH.md`.
Last_Action: Replaced the browser's automatic "add to home screen" popup with a plain button: `lib/client/useInstallPrompt.ts` captures and suppresses the native `beforeinstallprompt` event, and `app/page.tsx` renders an `install-app-button` below the three game-mode buttons (only shown when the browser actually offers install - Chrome/Edge/Android; no equivalent API exists on iOS Safari). Also hardened the existing `reset-browser-data-button` (`resetBrowserData` in `app/page.tsx`) to `unregister()` all service worker registrations, not just clear Cache Storage - guarantees Reset always forces the freshest deploy on next load instead of a stale SW potentially lingering. Typecheck/lint (no new errors vs baseline)/tests (120)/build all green. Note: `package.json` version ticked to 0.9.5 on disk with no corresponding commit from this session - flagged to user, not investigated further (out of scope).
Next_Actions:
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
- 2026-07-19 Install button replaces the browser's automatic PWA install popup; Reset button now also unregisters service workers to guarantee it forces the latest version. See DECISIONS.
- 2026-07-19 Local/solo play is now offline-capable and reload/relaunch-proof: PWA manifest + service worker (network-first navigations, cache-first static assets) + localStorage match persistence. See DECISIONS.
- 2026-07-18 Idle-turn timeout setup field is now a slider (10/15/20/30/60s), shared options list between client and server. See DECISIONS.
- 2026-07-18 Idle-turn timer: fixed `turn_started_at` not resetting when the same seat leads the next trick (near-instant popup bug). See DECISIONS.
- 2026-07-18 Bouilla home screen: buttons now correctly red/yellow/green via hex overrides in `app/page.tsx`.
- 2026-07-18 Added language switcher (FR/EN buttons) to `GameInfoPanel` in `GameHud.tsx` — visible during any game.
