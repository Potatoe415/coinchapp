"use server";

import {
  startNextDeal,
  submitBid,
  submitPlay,
  type BidType,
  type Card,
  type GameState,
  type Seat,
  type TrumpMode,
} from "@/lib/coinche";
import { getServiceClient, getUserId } from "@/lib/supabase/server";
import type { GameRow, GameStatus } from "@/lib/supabase/types";
import { botSeats, loadGame, persistGame, seatOf, touchGame, type LoadedGame } from "./repo";
import { buildView, type GameView } from "./view";

/** A move the host client submits on behalf of a bot seat. */
export type BotMove =
  | { kind: "bid"; type: BidType; value?: number; suit?: TrumpMode }
  | { kind: "play"; card: Card };

function statusFor(state: GameState): GameStatus {
  return state.phase === "finished" ? "finished" : "playing";
}

async function loadForAction(gameId: string): Promise<{
  loaded: LoadedGame;
  seat: Seat;
  state: GameState;
}> {
  const uid = await getUserId();
  if (!uid) throw new Error("not_authenticated");
  const loaded = await loadGame(gameId);
  const seat = seatOf(uid, loaded.players);
  if (seat === null) throw new Error("not_a_member");
  if (!loaded.game.state) throw new Error("game_not_started");
  return { loaded, seat: seat as Seat, state: loaded.game.state };
}

async function commit(loaded: LoadedGame, state: GameState): Promise<void> {
  await persistGame(loaded.game as GameRow, state, statusFor(state));
}

export async function placeBid(
  gameId: string,
  bid: { type: BidType; value?: number; suit?: TrumpMode },
): Promise<void> {
  const { loaded, seat, state } = await loadForAction(gameId);
  const next = submitBid(state, { seat, type: bid.type, value: bid.value, suit: bid.suit });
  await commit(loaded, next);
}

export async function playCard(gameId: string, card: Card): Promise<void> {
  const { loaded, seat, state } = await loadForAction(gameId);
  const next = submitPlay(state, seat, card);
  await commit(loaded, next);
}

export async function nextDeal(gameId: string): Promise<void> {
  const { loaded, state } = await loadForAction(gameId);
  if (state.phase !== "scoring") throw new Error("deal_not_finished");
  await commit(loaded, startNextDeal(state));
}

/** Host-only: submit the move for the bot seat whose turn it currently is. */
export async function submitBotMove(gameId: string, seat: Seat, move: BotMove): Promise<void> {
  const uid = await getUserId();
  if (!uid) throw new Error("not_authenticated");
  const loaded = await loadGame(gameId);
  if (loaded.game.host_user_id !== uid) throw new Error("not_host");
  const state = loaded.game.state;
  if (!state) throw new Error("game_not_started");
  if (state.turn !== seat) throw new Error("not_bot_turn");
  if (!botSeats(loaded.players)[seat]) throw new Error("seat_not_bot");

  const next =
    move.kind === "play"
      ? submitPlay(state, seat, move.card)
      : submitBid(state, { seat, type: move.type, value: move.value, suit: move.suit });
  await commit(loaded, next);
}

/** Take over running the bots. The caller must be a seated human. */
export async function becomeHost(gameId: string): Promise<void> {
  const uid = await getUserId();
  if (!uid) throw new Error("not_authenticated");
  const loaded = await loadGame(gameId);
  if (seatOf(uid, loaded.players) === null) throw new Error("not_a_member");
  if (loaded.game.host_user_id === uid) return;
  const supabase = getServiceClient();
  const { error } = await supabase.from("games").update({ host_user_id: uid }).eq("id", gameId);
  if (error) throw new Error("persist_failed");
  await touchGame(loaded.game as GameRow);
}

export async function getView(gameId: string): Promise<GameView> {
  const uid = await getUserId();
  const loaded = await loadGame(gameId);
  return buildView(loaded, uid);
}
