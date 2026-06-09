-- Coinche schema. The authoritative game state (hidden hands) lives in
-- public.games.state and is never exposed to clients: games and game_players
-- have RLS enabled with no policies, so only the service_role (used by Server
-- Actions) can read or write them. Clients only subscribe to game_events, a
-- lightweight "something changed" tick table, then refetch a redacted view.

create extension if not exists pgcrypto;

create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  status text not null default 'lobby',
  settings jsonb not null default '{}'::jsonb,
  state jsonb,
  version integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  seat smallint not null check (seat between 0 and 3),
  user_id uuid,
  display_name text not null,
  is_bot boolean not null default false,
  team text not null,
  connected boolean not null default true,
  created_at timestamptz not null default now(),
  unique (game_id, seat)
);

create index game_players_game_id_idx on public.game_players (game_id);
create index game_players_user_id_idx on public.game_players (user_id);

create table public.game_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  version integer not null,
  created_at timestamptz not null default now()
);

create index game_events_game_id_idx on public.game_events (game_id);

alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_events enable row level security;

-- No policies on games / game_players: normal roles get no access, the
-- service_role bypasses RLS for the authoritative Server Actions.

-- game_events only carries a game_id + version tick (no secret data), so any
-- signed-in (incl. anonymous) user may read it to drive realtime refetches.
create policy "read game events" on public.game_events
  for select to authenticated using (true);

alter publication supabase_realtime add table public.game_events;
