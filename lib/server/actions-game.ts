"use server";

import {
  advanceBots,
  startNextDeal,
  submitBid,
  submitPlay,
  type BidType,
  type Card,
  type GameState,
  type Seat,
  type Suit,
} from "@/lib/coinche";
import { getUserId } from "@/lib/supabase/server";
import type { GameRow, GameStatus } from "@/lib/supabase/types";
import { botSeats, loadGame, persistGame, seatOf, type LoadedGame } from "./repo";
import { buildView, type GameView } from "./view";

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
  const settings = loaded.game.settings;
  const next = advanceBots(state, botSeats(loaded.players), settings.botDifficulty);
  await persistGame(loaded.game as GameRow, next, statusFor(next));
}

export async function placeBid(
  gameId: string,
  bid: { type: BidType; value?: number; suit?: Suit },
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

export async function getView(gameId: string): Promise<GameView> {
  const uid = await getUserId();
  const loaded = await loadGame(gameId);
  return buildView(loaded, uid);
}
