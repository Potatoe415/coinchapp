# DATA MODEL

Status: Living document. Update whenever persisted data structure changes.

---

## Source of Truth

Technical_Source: `supabase/migrations/0001_init.sql`
Type-level shapes: `lib/supabase/types.ts` (rows) and `lib/coinche/types.ts` (GameState).

Rule:
- The SQL migration is the executable source of truth.
- This document is the human/agent-readable map and must not contradict it.

---

## Storage Overview

Database_Type: Supabase Postgres
Persistence_Model: One `games` row holds the full authoritative `state` (jsonb).
`game_players` holds seat assignments. `game_events` is an append-only realtime tick.

---

## Entities

### Entity: games

Purpose: A single game/table with its authoritative state.
Storage: table `public.games`

Fields:
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | Yes | Primary key |
| room_code | text | Yes | Unique join code |
| game_type | text | Yes | `"coinche" \| "bouilla"` (default `'coinche'`); lets one project host several games, and picks which rules engine (`lib/coinche` or `lib/bouilla`) `actions-lobby.ts`/`actions-game.ts`/`view.ts` dispatch to. Indexed. |
| status | text | Yes | lobby / playing / finished |
| settings | jsonb | Yes | `GameSettings`, all fields optional so one shape fits both games. Coinche: targetPoints, countContractOnlyIfMade, failedContractDefensePoints, zeroPointsForNonContractingTeamWhenContractMade, capotMadePoints, capotFailedDefensePoints, allowToutAtoutSansAtout, requireMorePointsToWin, botPunch ("low"\|"med"\|"high", default "med"; bot bidding aggressiveness, not part of GameState). Both games: stillThereTimeoutSec (default 15; see idle-turn timer below) — Bouilla's 6 rounds/point values are otherwise fixed, so this is its only per-game setting. |
| state | jsonb | No | Full `GameState` for the row's `game_type` (`AnyGameState` = Coinche `GameState` \| Bouilla `GameState`, hidden hands). Server-only. |
| version | integer | Yes | Incremented on each change (realtime tick) |
| host_user_id | uuid | No | User id of the client that runs the bots. Set to creator on create; reassigned by `becomeHost`. |
| turn_started_at | timestamptz | Yes | When `state.turn` last changed; stamped by `persistGame` (`lib/server/repo.ts`) whenever the new state's turn differs from the previous one. Anchors the idle-turn timer below. |
| created_at | timestamptz | Yes | |

Access_Rules:
- RLS enabled, no policies -> only service_role (Server Actions) can read/write.

Sensitive_Data:
- `state.hands` contains every player's cards. Human hands are never exposed; the redacted view sent to the host additionally includes the bot seats' hands (`botViews`) so the host can run them.

### Entity: game_players

Purpose: Who sits at each seat (human or bot).
Storage: table `public.game_players`

Fields:
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | Yes | Primary key |
| game_id | uuid | Yes | FK -> games(id), cascade delete |
| seat | smallint | Yes | 0..3, unique per game |
| user_id | uuid | No | null for bots |
| display_name | text | Yes | |
| is_bot | boolean | Yes | |
| team | text | Yes | A = seats {0,2}, B = seats {1,3} |
| last_seen_at | timestamptz | Yes | Presence heartbeat, refreshed by `getView` for the caller's own seat. Drives the `connected` flag in the redacted view (computed on read, not stored) and the stale-turn auto-play fallback (`lib/server/actions-game.ts` `advanceStaleTurns`). A bot seat's liveness is judged by the host's own row instead (`isSeatLive` in `lib/server/repo.ts`), since bots have no client of their own. |
| missed_turns_in_row | integer | Yes | Consecutive turns this seat has failed to act on in time (idle-turn timer, see below). Reset to 0 by any successful self-play (`playCard`/`placeBid`), and whenever a human takes over a seat (`joinGame`'s replace path). |
| created_at | timestamptz | Yes | |

Access_Rules:
- RLS enabled, no policies -> service_role only.

### Entity: game_events

Purpose: Lightweight realtime "something changed" tick.
Storage: table `public.game_events`

Fields:
| Field | Type | Required | Notes |
|---|---|---|---|
| id | bigint identity | Yes | Primary key |
| game_id | uuid | Yes | FK -> games(id), cascade delete |
| version | integer | Yes | Matches games.version |
| created_at | timestamptz | Yes | |

Access_Rules:
- SELECT allowed to any authenticated (incl. anonymous) user. No secret data.
- In `supabase_realtime` publication so clients can subscribe to inserts.

---

## Idle-turn timer ("are you still there?")

Online-only (not ad-hoc/local): each human turn is measured against `games.turn_started_at`.
- 1st consecutive miss: after `settings.stillThereTimeoutSec` (default 15) total silence, the server auto-plays a random legal card (or, during Coinche bidding, the same heuristic bid the 45s browser-gone safety net uses) and sets `missed_turns_in_row = 1`.
- 2nd consecutive miss: the same seat gets only a 5s window before the seat permanently becomes a bot (`is_bot = true`, `user_id = null`) - the stuck turn is played once with the heuristic bot, and every turn after that is driven by the host's bot runner like any other bot seat.
- Any successful self-play resets `missed_turns_in_row` to 0.
- A tap anywhere on screen while the banner is showing also counts as presence: `markStillHere` resets `missed_turns_in_row` to 0 and restarts `turn_started_at`, dismissing the banner without requiring an actual play.

Implemented in `lib/server/idle-timer.ts` (`decideIdleAction` is pure/unit-tested; `advanceIdleTurns` does the DB side effects; `markSeatPresent` backs the tap-to-dismiss action), called from `getView` right before the coarser 45s `advanceStaleTurns` safety net. Client side: `lib/client/useStillThereTimer.ts` shows a non-blocking countdown banner, proactively refetches at the deadline, and attaches a one-shot `pointerdown` listener on `document` while the banner shows to call `markStillHere`; the `useGameView` 15s poll still enforces it even if that tab is fully closed.

---

## Relationships

- games 1 - N game_players (by game_id)
- games 1 - N game_events (by game_id)

---

## Access Model

Roles: anonymous user (authenticated, is_anonymous), service_role (server authority).
Rules:
- Clients never read games/game_players directly; all reads go through the
  `getView` Server Action which returns a redacted per-seat view.
- Clients subscribe to `game_events` and refetch the redacted view on each tick.

---

## Migration Notes

## 2026-06-09 - Initial schema

Change: Added games (incl. `host_user_id`), game_players, game_events with RLS and realtime publication.
Reason: Authoritative server-side Coinche state with leak-proof realtime sync; `host_user_id` records which member runs the client-side bots.
Impact: Authoritative state stored as jsonb in games.state; clients get redacted views only (host also gets bot seats' hands via `botViews`).

## 2026-06-10 - Online game TTL (48h)

Change: Added a `pg_cron` job (`cleanup-expired-games`) that deletes `games` rows older than 48 hours.
Reason: Automatically remove stale online rooms from Supabase without manual cleanup.
Impact: Expired games disappear from persistence; cascading FK deletion removes linked `game_players` and `game_events`.

## 2026-06-12 - game_type discriminator

Change: Added `games.game_type text not null default 'coinche'` (indexed). Mirrored as `GameType` in `lib/supabase/types.ts`; `createGame` sets it explicitly.
Reason: Let a single Supabase project host several games and separate them logically (filter/route by `game_type`), instead of duplicating tables or schemas per game.
Impact: Additive, non-breaking — existing rows default to `coinche`. The shared `games`/`game_players`/`game_events` plumbing (RLS, realtime, TTL cron) is reused across games. Per-game specifics stay in the `settings`/`state` jsonb and in the per-game rules engine.

## 2026-06-12 - Consolidated into a single re-runnable script

Change: Merged the schema, the `game_type` column and the 48h TTL cron into one `supabase/migrations/0001_init.sql` with a full reset (unschedule cron + `drop table ... cascade`) at the top. Deleted `0002_games_ttl_48h.sql` and `0003_games_game_type.sql`.
Reason: User wants one script to wipe the (sandbox) DB and rebuild from zero.
Impact: `0001_init.sql` is now the single executable source of truth; run it alone to recreate everything. Destructive by design — do not run against production data.

## 2026-07-16 - `connected` boolean replaced by `last_seen_at` heartbeat

Change: Removed `game_players.connected` (a boolean that was always `true`, never updated) and added `game_players.last_seen_at timestamptz not null default now()`, refreshed by `getView` for the caller's own seat on every call.
Reason: Detect an absent host or player so the table stops freezing forever; the old column was dead weight (nothing ever wrote to it besides the default).
Impact: `LobbyPlayer.connected` in `GameView` is now computed on read (`isSeatLive` in `lib/server/repo.ts`) instead of stored. `getView` also opportunistically auto-plays a turn whose responsible party has gone silent too long (`advanceStaleTurns` in `lib/server/actions-game.ts`), using the simple heuristic bot.

## 2026-07-16 - `game_type` actually used: second game "la Bouilla"

Change: No SQL change (the `game_type` column and its `'coinche'` default already existed since 2026-06-12). `createGame` now accepts and persists `game_type: "bouilla"`; `GameSettings` fields all became optional (Bouilla rows store `settings = {}`); `GameRow.state`/`GameView.view`/`botViews` are now discriminated unions (`AnyGameState`/`AnyPlayerView`) over both games' `GameState`/`PlayerView` shapes.
Reason: First real consumer of the `game_type` discriminator that was added ahead of need.
Impact: Existing Coinche rows/behavior unchanged (still default `'coinche'`, same settings shape). Every read of `game.state`/`game.settings` that is specific to one engine narrows via `game.game_type` first (see `lib/server/view.ts` `redactForSeat`, `lib/server/actions-game.ts`, `lib/server/actions-lobby.ts` `startInitialState`/`sanitizeSettings`).

## 2026-07-17 - Idle-turn timer ("are you still there?") + `stillThereTimeoutSec`

Change: Added `games.turn_started_at timestamptz not null default now()` (stamped by `persistGame` whenever `state.turn` changes) and `game_players.missed_turns_in_row integer not null default 0`. `GameSettings` gained `stillThereTimeoutSec` (default 15), now sanitized for both game types - Bouilla's `settings` is no longer unconditionally `{}`.
Reason: Online-only feature: a human whose turn has been silent too long gets a countdown-and-auto-play nudge, then a permanent bot takeover on a second consecutive miss, so idle players never freeze the table for the rest of the group.
Impact: New `lib/server/idle-timer.ts` module (`decideIdleAction` pure/unit-tested, `advanceIdleTurns` DB side effects), called from `getView` ahead of the existing 45s `advanceStaleTurns` safety net (unrelated and unchanged - that one is for a genuinely gone browser, this one for a present-but-unresponsive one). `lib/server/game-dispatch.ts` was extracted from `lib/server/actions-game.ts` so both the "use server" actions file and the new idle-timer module (a plain module, since "use server" files may only export async functions) share the same game-dispatch helpers. Client: new `lib/client/useStillThereTimer.ts` + `components/StillThereModal.tsx`, wired into `components/GameRoom.tsx`. Settings UI: `components/GameSettingsPanel.tsx` now also renders for Bouilla's online setup (previously hidden entirely), gated by new `coincheFields`/`showStillThereTimeout` props.
