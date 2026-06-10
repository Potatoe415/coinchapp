-- Auto-delete online games older than 48 hours.
-- Deleting from games cascades to game_players and game_events.

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-expired-games') then
    perform cron.unschedule('cleanup-expired-games');
  end if;
end
$$;

select cron.schedule(
  'cleanup-expired-games',
  '0 * * * *',
  $$delete from public.games where created_at < now() - interval '48 hours'$$
);
