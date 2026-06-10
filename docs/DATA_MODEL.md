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
| status | text | Yes | lobby / playing / finished |
| settings | jsonb | Yes | `{ targetPoints, botDifficulty }` |
| state | jsonb | No | Full `GameState` (hidden hands). Server-only. |
| version | integer | Yes | Incremented on each change (realtime tick) |
| host_user_id | uuid | No | User id of the client that runs the bots. Set to creator on create; reassigned by `becomeHost`. |
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
| connected | boolean | Yes | |
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
