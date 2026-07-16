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

export async function loadGame(gameId: string): Promise<LoadedGame> {
  const supabase = getServiceClient();
  const cutoffIso = activeGameCutoffIso();
  const { data: game, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .gte("created_at", cutoffIso)
    .single();
  if (error || !game) throw new Error("game_not_found");
  const { data: players } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)
    .order("seat");
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
 * game state, so no version bump / realtime tick). Also updates the
 * in-memory row so an `isSeatLive` check right after in the same request sees
 * it immediately.
 */
export async function touchPresence(loaded: LoadedGame, seat: number): Promise<void> {
  const supabase = getServiceClient();
  const now = new Date().toISOString();
  await supabase
    .from("game_players")
    .update({ last_seen_at: now })
    .eq("game_id", loaded.game.id)
    .eq("seat", seat);
  const player = loaded.players.find((p) => p.seat === seat);
  if (player) player.last_seen_at = now;
}

/**
 * Optimistic-concurrency guarded update: only succeeds if `game.version` still
 * matches the row in the DB, so a stale in-memory `game` (e.g. a bot decision
 * computed before another actor already advanced the state) can never
 * overwrite newer progress. Returns the new version, or throws
 * "version_conflict" if the row moved under us.
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
  await supabase.from("game_events").insert({ game_id: game.id, version });
  return version;
}

/** Persist a new authoritative state and emit a realtime tick. */
export async function persistGame(
  game: GameRow,
  state: AnyGameState,
  status: GameStatus,
): Promise<number> {
  return updateVersioned(game, { state, status });
}

/** Bump the version and emit a tick without changing the game state (lobby). */
export async function touchGame(game: GameRow): Promise<number> {
  return updateVersioned(game, {});
}
