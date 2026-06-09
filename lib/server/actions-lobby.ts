"use server";

import { advanceBots, beginNextDeal, createInitialState, type Difficulty } from "@/lib/coinche";
import { getServiceClient, getUserId } from "@/lib/supabase/server";
import type { GameRow, GameSettings } from "@/lib/supabase/types";
import {
  botSeats,
  findGameByCode,
  loadGame,
  persistGame,
  randomRoomCode,
  seatOf,
  teamForSeat,
  touchGame,
} from "./repo";

const TARGET_OPTIONS = [500, 1000, 1500, 2000];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const ROOM_CODE_REGEX = /^[A-Z0-9]{3}$/;

function sanitizeSettings(input: Partial<GameSettings>): GameSettings {
  const targetPoints = TARGET_OPTIONS.includes(input.targetPoints ?? 0)
    ? (input.targetPoints as number)
    : 1000;
  const botDifficulty = DIFFICULTIES.includes(input.botDifficulty as Difficulty)
    ? (input.botDifficulty as Difficulty)
    : "medium";
  return { targetPoints, botDifficulty };
}

function cleanName(name: string, fallback: string): string {
  const trimmed = (name ?? "").trim().slice(0, 20);
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeRoomCode(code: string): string {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!ROOM_CODE_REGEX.test(normalized)) throw new Error("invalid_room_code");
  return normalized;
}

async function requireUser(): Promise<string> {
  const uid = await getUserId();
  if (!uid) throw new Error("not_authenticated");
  return uid;
}

export async function createGame(input: {
  displayName: string;
  settings: Partial<GameSettings>;
}): Promise<{ gameId: string; roomCode: string }> {
  const uid = await requireUser();
  const supabase = getServiceClient();
  const settings = sanitizeSettings(input.settings);

  let roomCode = randomRoomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await findGameByCode(roomCode);
    if (!existing) break;
    roomCode = randomRoomCode();
  }

  const { data, error } = await supabase
    .from("games")
    .insert({ room_code: roomCode, status: "lobby", settings, version: 0 })
    .select("id")
    .single();
  if (error || !data) throw new Error("create_failed");
  const gameId = (data as { id: string }).id;

  await supabase.from("game_players").insert({
    game_id: gameId,
    seat: 0,
    user_id: uid,
    display_name: cleanName(input.displayName, "Joueur"),
    is_bot: false,
    team: teamForSeat(0),
  });

  return { gameId, roomCode };
}

export async function joinGame(input: {
  roomCode: string;
  displayName: string;
}): Promise<{ gameId: string; seat: number }> {
  const uid = await requireUser();
  const roomCode = normalizeRoomCode(input.roomCode);
  const loaded = await findGameByCode(roomCode);
  if (!loaded) throw new Error("game_not_found");
  if (loaded.game.status !== "lobby") throw new Error("already_started");

  const existingSeat = seatOf(uid, loaded.players);
  if (existingSeat !== null) return { gameId: loaded.game.id, seat: existingSeat };

  const taken = new Set(loaded.players.map((p) => p.seat));
  const freeSeat = [0, 1, 2, 3].find((s) => !taken.has(s));
  if (freeSeat === undefined) throw new Error("game_full");

  const supabase = getServiceClient();
  await supabase.from("game_players").insert({
    game_id: loaded.game.id,
    seat: freeSeat,
    user_id: uid,
    display_name: cleanName(input.displayName, `Joueur ${freeSeat + 1}`),
    is_bot: false,
    team: teamForSeat(freeSeat),
  });
  await touchGame(loaded.game);
  return { gameId: loaded.game.id, seat: freeSeat };
}

export async function fillWithBots(gameId: string): Promise<void> {
  await requireUser();
  const loaded = await loadGame(gameId);
  if (loaded.game.status !== "lobby") throw new Error("already_started");

  const taken = new Set(loaded.players.map((p) => p.seat));
  const supabase = getServiceClient();
  const botNames = ["Adam", "Jane", "Lea", "Max"];
  const rows = [0, 1, 2, 3]
    .filter((s) => !taken.has(s))
    .map((seat) => ({
      game_id: gameId,
      seat,
      user_id: null,
      display_name: botNames[seat],
      is_bot: true,
      team: teamForSeat(seat),
    }));
  if (rows.length > 0) await supabase.from("game_players").insert(rows);
  await touchGame(loaded.game);
}

export async function startGame(gameId: string): Promise<void> {
  await requireUser();
  const loaded = await loadGame(gameId);
  if (loaded.game.status !== "lobby") throw new Error("already_started");
  if (loaded.players.length < 4) throw new Error("need_four_players");

  const settings = loaded.game.settings;
  let state = beginNextDeal(createInitialState(settings.targetPoints));
  state = advanceBots(state, botSeats(loaded.players), settings.botDifficulty);
  await persistGame(loaded.game as GameRow, state, state.phase === "finished" ? "finished" : "playing");
}
