import { after } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import type { AnyGameState, GameRow, GameStatus, PlayerRow } from "@/lib/supabase/types";

export interface LoadedGame {
  game: GameRow;
  players: PlayerRow[];
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GAME_TTL_MS = 48 * 60 * 60 * 1000;

function activeGameCutoffIso(): string {
  return new Date(Date.now() - GAME_TTL_MS).toISOString();
}

export function randomRoomCode(length = 3): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function teamForSeat(seat: number): "A" | "B" {
  return seat % 2 === 0 ? "A" : "B";
}

/** Neither query depends on the other's result, so they run concurrently: on every
 *  card play and every realtime-triggered refetch, this halves one of several
 *  sequential Supabase round trips that otherwise compound into a visible delay. */
export async function loadGame(gameId: string): Promise<LoadedGame> {
  const supabase = getServiceClient();
  const cutoffIso = activeGameCutoffIso();
  const [{ data: game, error }, { data: players }] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).gte("created_at", cutoffIso).single(),
    supabase.from("game_players").select("*").eq("game_id", gameId).order("seat"),
  ]);
  if (error || !game) throw new Error("game_not_found");
  return { game: game as GameRow, players: (players ?? []) as PlayerRow[] };
}

export async function findGameIdByCode(code: string): Promise<string | null> {
  const supabase = getServiceClient();
  const cutoffIso = activeGameCutoffIso();
  const { data } = await supabase
    .from("games")
    .select("id")
    .eq("room_code", code.toUpperCase())
    .gte("created_at", cutoffIso)
    .maybeSingle();
  return data ? (data as { id: string }).id : null;
}

export async function findGameByCode(code: string): Promise<LoadedGame | null> {
  const supabase = getServiceClient();
  const cutoffIso = activeGameCutoffIso();
  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("room_code", code.toUpperCase())
    .gte("created_at", cutoffIso)
    .maybeSingle();
  if (!game) return null;
  return loadGame((game as GameRow).id);
}

export function seatOf(uid: string | null, players: PlayerRow[]): number | null {
  if (!uid) return null;
  const found = players.find((p) => p.user_id === uid);
  return found ? found.seat : null;
}

export function botSeats(players: PlayerRow[]): boolean[] {
  const flags = [false, false, false, false];
  for (const player of players) flags[player.seat] = player.is_bot;
  return flags;
}

/** Above this silence, a seat is shown as disconnected in the UI. */
export const PRESENCE_STALE_MS = 30_000;

/**
 * Whether `seat`'s responsible party has called `getView` within `thresholdMs`.
 * For a human seat that is the seat's own user; for a bot seat it is the
 * current host, since bots have no client/heartbeat of their own - the
 * host's browser is what actually plays them. Returns false if no
 * responsible party can be resolved at all (e.g. no host assigned).
 */
export function isSeatLive(
  loaded: LoadedGame,
  seat: number,
  now: number,
  thresholdMs: number,
): boolean {
  const player = loaded.players.find((p) => p.seat === seat);
  if (!player) return false;
  const responsibleUid = player.is_bot ? loaded.game.host_user_id : player.user_id;
  if (!responsibleUid) return false;
  const responsible = loaded.players.find((p) => p.user_id === responsibleUid);
  if (!responsible) return false;
  return now - new Date(responsible.last_seen_at).getTime() < thresholdMs;
}

/**
 * Presence heartbeat: refresh a seat's last-seen timestamp (not authoritative
 * game state, so no version bump / realtime tick). Updates the in-memory row
 * immediately, so an `isSeatLive` check right after in the same request sees
 * it - but the actual write never blocks the response: nothing the caller
 * needs to know depends on it, so it runs via `after()` once the response is
 * already on its way, shaving one more sequential round trip off every
 * `getView` (called on every card played and every realtime refetch).
 */
export function touchPresence(loaded: LoadedGame, seat: number): void {
  const now = new Date().toISOString();
  const player = loaded.players.find((p) => p.seat === seat);
  if (!player) return;
  player.last_seen_at = now;
  const gameId = loaded.game.id;
  after(() =>
    getServiceClient().from("game_players").update({ last_seen_at: now }).eq("game_id", gameId).eq("seat", seat),
  );
}

/**
 * Optimistic-concurrency guarded update: only succeeds if `game.version` still
 * matches the row in the DB, so a stale in-memory `game` (e.g. a bot decision
 * computed before another actor already advanced the state) can never
 * overwrite newer progress. Returns the new version, or throws
 * "version_conflict" if the row moved under us.
 *
 * The `game_events` row is only a backup realtime signal (`useGameView`'s
 * primary path is the caller's own explicit `notify()` broadcast, sent right
 * after this resolves - see `docs/TECH.md`): it never needs to block the
 * response, so it is inserted via `after()` instead of a third sequential
 * round trip on every card played.
 */
async function updateVersioned(
  game: GameRow,
  patch: Record<string, unknown>,
): Promise<number> {
  const supabase = getServiceClient();
  const version = game.version + 1;
  const { data, error } = await supabase
    .from("games")
    .update({ ...patch, version })
    .eq("id", game.id)
    .eq("version", game.version)
    .select("id");
  if (error) throw new Error("persist_failed");
  if (!data || data.length === 0) throw new Error("version_conflict");
  after(() => getServiceClient().from("game_events").insert({ game_id: game.id, version }));
  return version;
}

/**
 * Persist a new authoritative state and emit a realtime tick. Always stamps
 * `turn_started_at` to now - the anchor the idle-turn timer
 * (lib/server/idle-timer.ts) measures elapsed silence against. Every call here
 * follows an actual move, so `state.turn` is always a fresh decision point for
 * whoever it names next - even when that happens to be the same seat as
 * before (e.g. winning a trick as its last player means leading the next one
 * too): that is still a brand-new turn and must not inherit whatever time the
 * previous one already used, or the popup can appear almost immediately.
 * Mutates `game.turn_started_at` in place so a caller that keeps looping over
 * the same in-memory `game` (e.g. `advanceStaleTurns`/`advanceIdleTurns`) sees
 * the fresh value without an extra read.
 */
export async function persistGame(
  game: GameRow,
  state: AnyGameState,
  status: GameStatus,
): Promise<number> {
  const turnStartedAt = new Date().toISOString();
  const patch: Record<string, unknown> = { state, status, turn_started_at: turnStartedAt };
  game.turn_started_at = turnStartedAt;
  return updateVersioned(game, patch);
}

/** Bump the version and emit a tick without changing the game state (lobby). */
export async function touchGame(game: GameRow): Promise<number> {
  return updateVersioned(game, {});
}

/**
 * Restart the current turn's silence clock without changing any game state -
 * used when a player proves presence (e.g. taps the screen while the idle-turn
 * "are you still there?" banner is showing) without actually playing yet. See
 * `lib/server/idle-timer.ts` `markSeatPresent`.
 */
export async function touchTurnStartedAt(game: GameRow): Promise<number> {
  const turnStartedAt = new Date().toISOString();
  const version = await updateVersioned(game, { turn_started_at: turnStartedAt });
  game.turn_started_at = turnStartedAt;
  return version;
}
