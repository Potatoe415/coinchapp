"use server";

import { beginNextDeal, BOT_PUNCH_LEVELS, createInitialState } from "@/lib/coinche";
import { getServiceClient, getUserId } from "@/lib/supabase/server";
import type { GameRow, GameSettings } from "@/lib/supabase/types";
import {
  findGameByCode,
  loadGame,
  persistGame,
  randomRoomCode,
  seatOf,
  teamForSeat,
  touchGame,
} from "./repo";
import type { LoadedGame } from "./repo";

const TARGET_OPTIONS = [500, 1000, 1500, 2000];
const ROOM_CODE_REGEX = /^[A-Z0-9]{3}$/;

function sanitizePoints(val: number | undefined, fallback: number): number {
  return Number.isFinite(val) && (val as number) >= 0 ? Math.floor(val as number) : fallback;
}

function sanitizeSettings(input: Partial<GameSettings>): GameSettings {
  const targetPoints = TARGET_OPTIONS.includes(input.targetPoints ?? 0)
    ? (input.targetPoints as number)
    : 1000;
  return {
    targetPoints,
    countContractOnlyIfMade: input.countContractOnlyIfMade === true,
    failedContractDefensePoints: sanitizePoints(input.failedContractDefensePoints, 160),
    zeroPointsForNonContractingTeamWhenContractMade: input.zeroPointsForNonContractingTeamWhenContractMade === true,
    capotMadePoints: sanitizePoints(input.capotMadePoints, 250),
    capotFailedDefensePoints: sanitizePoints(input.capotFailedDefensePoints, 250),
    allowToutAtoutSansAtout: input.allowToutAtoutSansAtout === true,
    requireMorePointsToWin: input.requireMorePointsToWin !== false,
    botPunch: BOT_PUNCH_LEVELS.includes(input.botPunch ?? "med") ? (input.botPunch ?? "med") : "med",
  };
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

  // game_type is left to the column default ('coinche') so creating a game never
  // depends on the migration that adds the column having run on this DB.
  const { data, error } = await supabase
    .from("games")
    .insert({ room_code: roomCode, status: "lobby", settings, version: 0, host_user_id: uid })
    .select("id")
    .single();
  if (error || !data) throw new Error("create_failed");
  const gameId = (data as { id: string }).id;

  const { error: seatError } = await supabase.from("game_players").insert({
    game_id: gameId,
    seat: 0,
    user_id: uid,
    display_name: cleanName(input.displayName, "Joueur"),
    is_bot: false,
    team: teamForSeat(0),
  });
  // Without this check a failed seat insert leaves a game with no players: the
  // creator lands in a lobby with 4 empty seats and cannot start.
  if (seatError) {
    await supabase.from("games").delete().eq("id", gameId);
    throw new Error("create_failed");
  }

  return { gameId, roomCode };
}

/** Pick a seat for a joining human: a free seat first, otherwise a bot to replace. */
function pickJoinSeat(loaded: LoadedGame): { seat: number; mode: "insert" | "replace" } | null {
  const taken = new Set(loaded.players.map((p) => p.seat));
  const freeSeat = [0, 1, 2, 3].find((s) => !taken.has(s));
  if (freeSeat !== undefined) return { seat: freeSeat, mode: "insert" };
  const botSeat = loaded.players
    .filter((p) => p.is_bot)
    .map((p) => p.seat)
    .sort((a, b) => a - b)[0];
  return botSeat === undefined ? null : { seat: botSeat, mode: "replace" };
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

  const target = pickJoinSeat(loaded);
  if (!target) throw new Error("game_full");

  const supabase = getServiceClient();
  const name = cleanName(input.displayName, `Joueur ${target.seat + 1}`);
  if (target.mode === "insert") {
    await supabase.from("game_players").insert({
      game_id: loaded.game.id,
      seat: target.seat,
      user_id: uid,
      display_name: name,
      is_bot: false,
      team: teamForSeat(target.seat),
    });
  } else {
    await supabase
      .from("game_players")
      .update({ user_id: uid, display_name: name, is_bot: false })
      .eq("game_id", loaded.game.id)
      .eq("seat", target.seat);
  }
  await touchGame(loaded.game);
  return { gameId: loaded.game.id, seat: target.seat };
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

export async function swapSeats(gameId: string, seatA: number, seatB: number): Promise<void> {
  const uid = await requireUser();
  const loaded = await loadGame(gameId);
  if (loaded.game.status !== "lobby") throw new Error("already_started");
  if (loaded.game.host_user_id !== uid) throw new Error("not_host");
  if (seatA === seatB) return;

  const supabase = getServiceClient();
  const playerA = loaded.players.find((p) => p.seat === seatA);
  const playerB = loaded.players.find((p) => p.seat === seatB);

  if (playerA && playerB) {
    // Both seats occupied: swap occupants in place. Seat numbers stay fixed, so
    // the unique (game_id, seat) constraint is never violated. Team stays tied
    // to the seat, so it does not change.
    await supabase
      .from("game_players")
      .update({ user_id: playerB.user_id, display_name: playerB.display_name, is_bot: playerB.is_bot })
      .eq("game_id", gameId)
      .eq("seat", seatA);
    await supabase
      .from("game_players")
      .update({ user_id: playerA.user_id, display_name: playerA.display_name, is_bot: playerA.is_bot })
      .eq("game_id", gameId)
      .eq("seat", seatB);
  } else if (playerA) {
    await supabase
      .from("game_players")
      .update({ seat: seatB, team: teamForSeat(seatB) })
      .eq("game_id", gameId)
      .eq("seat", seatA);
  } else if (playerB) {
    await supabase
      .from("game_players")
      .update({ seat: seatA, team: teamForSeat(seatA) })
      .eq("game_id", gameId)
      .eq("seat", seatB);
  }
  await touchGame(loaded.game);
}

export async function startGame(gameId: string): Promise<void> {
  await requireUser();
  const loaded = await loadGame(gameId);
  if (loaded.game.status !== "lobby") throw new Error("already_started");
  if (loaded.players.length < 4) throw new Error("need_four_players");

  const settings = loaded.game.settings;
  const state = beginNextDeal(createInitialState(settings.targetPoints, {
    countContractOnlyIfMade: settings.countContractOnlyIfMade,
    failedContractDefensePoints: settings.failedContractDefensePoints,
    zeroPointsForNonContractingTeamWhenContractMade: settings.zeroPointsForNonContractingTeamWhenContractMade,
    capotMadePoints: settings.capotMadePoints,
    capotFailedDefensePoints: settings.capotFailedDefensePoints,
    allowToutAtoutSansAtout: settings.allowToutAtoutSansAtout,
    requireMorePointsToWin: settings.requireMorePointsToWin,
  }));
  await persistGame(loaded.game as GameRow, state, state.phase === "finished" ? "finished" : "playing");
}
