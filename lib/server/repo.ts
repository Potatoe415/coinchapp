import { getServiceClient } from "@/lib/supabase/server";
import type { GameRow, GameStatus, PlayerRow } from "@/lib/supabase/types";
import type { GameState } from "@/lib/coinche";

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

/** Persist a new authoritative state and emit a realtime tick. */
export async function persistGame(
  game: GameRow,
  state: GameState,
  status: GameStatus,
): Promise<number> {
  const supabase = getServiceClient();
  const version = game.version + 1;
  const { error } = await supabase
    .from("games")
    .update({ state, status, version })
    .eq("id", game.id);
  if (error) throw new Error("persist_failed");
  await supabase.from("game_events").insert({ game_id: game.id, version });
  return version;
}

/** Bump the version and emit a tick without changing the game state (lobby). */
export async function touchGame(game: GameRow): Promise<number> {
  const supabase = getServiceClient();
  const version = game.version + 1;
  await supabase.from("games").update({ version }).eq("id", game.id);
  await supabase.from("game_events").insert({ game_id: game.id, version });
  return version;
}
