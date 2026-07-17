"use server";

import {
  chooseBid,
  chooseCard as chooseCoincheCard,
  startNextDeal,
  submitBid,
  submitPlay as submitCoinchePlay,
  type BidType,
  type Card as CoincheCard,
  type GameState as CoincheGameState,
  type Seat,
  type TrumpMode,
} from "@/lib/coinche";
import {
  chooseCard as chooseBouillaCard,
  redact as redactBouilla,
  startNextRound,
  submitPlay as submitBouillaPlay,
  type Card as BouillaCard,
  type GameState as BouillaGameState,
} from "@/lib/bouilla";
import { getServiceClient, getUserId } from "@/lib/supabase/server";
import type { AnyGameState, GameRow, GameStatus, GameType } from "@/lib/supabase/types";
import { botSeats, isSeatLive, loadGame, persistGame, seatOf, touchGame, touchPresence, type LoadedGame } from "./repo";
import { buildView, type GameView } from "./view";

/** Above this silence, whoever is responsible for the current turn (a human,
 * or the host for a bot seat) is presumed gone for good, and the simple
 * heuristic bot plays their turn instead so the table never freezes forever. */
const TAKEOVER_STALE_MS = 45_000;
const MAX_TAKEOVER_STEPS = 16;

/** A played card, loosely typed at the transport boundary: the active game's own
 *  engine (`applyPlay`/`isLegalPlay`) is what actually validates rank/suit/legality. */
export type WireCard = { suit: string; rank: string };

/** A move the host client submits on behalf of a bot seat. Bidding never applies to
 *  Bouilla (no auction); a bot seat there only ever plays a card. */
export type BotMove =
  | { kind: "bid"; type: BidType; value?: number; suit?: TrumpMode }
  | { kind: "play"; card: WireCard };

function statusFor(state: AnyGameState): GameStatus {
  return state.phase === "finished" ? "finished" : "playing";
}

function isActivePhase(gameType: GameType, state: AnyGameState): boolean {
  return gameType === "bouilla" ? state.phase === "playing" : state.phase === "bidding" || state.phase === "playing";
}

/** Dispatch a card play to the active game's own engine. */
function applyCardPlay(gameType: GameType, state: AnyGameState, seat: Seat, card: WireCard): AnyGameState {
  if (gameType === "bouilla") {
    return submitBouillaPlay(state as BouillaGameState, seat, card as unknown as BouillaCard);
  }
  return submitCoinchePlay(state as CoincheGameState, seat, card as unknown as CoincheCard);
}

/** Dispatch "start the next hand" (Coinche: next deal, Bouilla: next round). */
function applyStartNext(gameType: GameType, state: AnyGameState): AnyGameState {
  if (state.phase !== "scoring") throw new Error("deal_not_finished");
  return gameType === "bouilla"
    ? startNextRound(state as BouillaGameState)
    : startNextDeal(state as CoincheGameState);
}

/** Heuristic bot move for the seat whose turn it is (server-side takeover / bot host). */
function chooseHeuristicMove(gameType: GameType, state: AnyGameState, seat: Seat): { card?: WireCard; bid?: ReturnType<typeof chooseBid> } {
  if (gameType === "bouilla") {
    return { card: chooseBouillaCard(redactBouilla(state as BouillaGameState, seat)) };
  }
  const coincheState = state as CoincheGameState;
  return coincheState.phase === "bidding"
    ? { bid: chooseBid(coincheState) }
    : { card: chooseCoincheCard(coincheState) };
}

async function loadForAction(gameId: string): Promise<{
  loaded: LoadedGame;
  seat: Seat;
  state: AnyGameState;
  gameType: GameType;
}> {
  // Neither call depends on the other's result: run them concurrently instead
  // of paying for both round trips back-to-back on every submitted move.
  const [uid, loaded] = await Promise.all([getUserId(), loadGame(gameId)]);
  if (!uid) throw new Error("not_authenticated");
  const seat = seatOf(uid, loaded.players);
  if (seat === null) throw new Error("not_a_member");
  if (!loaded.game.state) throw new Error("game_not_started");
  return { loaded, seat: seat as Seat, state: loaded.game.state, gameType: loaded.game.game_type };
}

async function commit(loaded: LoadedGame, state: AnyGameState): Promise<void> {
  await persistGame(loaded.game as GameRow, state, statusFor(state));
}

export async function placeBid(
  gameId: string,
  bid: { type: BidType; value?: number; suit?: TrumpMode },
): Promise<void> {
  const { loaded, seat, state, gameType } = await loadForAction(gameId);
  if (gameType === "bouilla") throw new Error("bidding_not_supported");
  const next = submitBid(state as CoincheGameState, { seat, type: bid.type, value: bid.value, suit: bid.suit });
  await commit(loaded, next);
}

export async function playCard(gameId: string, card: WireCard): Promise<void> {
  const { loaded, seat, state, gameType } = await loadForAction(gameId);
  const next = applyCardPlay(gameType, state, seat, card);
  await commit(loaded, next);
}

export async function nextDeal(gameId: string): Promise<void> {
  const { loaded, state, gameType } = await loadForAction(gameId);
  await commit(loaded, applyStartNext(gameType, state));
}

/** Host-only: submit the move for the bot seat whose turn it currently is. */
export async function submitBotMove(gameId: string, seat: Seat, move: BotMove): Promise<void> {
  const [uid, loaded] = await Promise.all([getUserId(), loadGame(gameId)]);
  if (!uid) throw new Error("not_authenticated");
  if (loaded.game.host_user_id !== uid) throw new Error("not_host");
  const state = loaded.game.state;
  if (!state) throw new Error("game_not_started");
  if (state.turn !== seat) throw new Error("not_bot_turn");
  if (!botSeats(loaded.players)[seat]) throw new Error("seat_not_bot");

  const gameType = loaded.game.game_type;
  const next =
    move.kind === "play"
      ? applyCardPlay(gameType, state, seat, move.card)
      : submitBid(state as CoincheGameState, { seat, type: move.type, value: move.value, suit: move.suit });
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

/**
 * Safety net: auto-play any turn whose responsible party has gone silent for
 * `TAKEOVER_STALE_MS`, using the simple heuristic bot (not the strong client
 * ISMCTS brain, which needs a browser). Runs opportunistically on every
 * `getView` call so an absent host or player can never freeze the table
 * forever; concurrent callers are safe since `persistGame` requires the
 * version to still match (see repo.ts `updateVersioned`).
 */
async function advanceStaleTurns(loaded: LoadedGame): Promise<void> {
  const state = loaded.game.state;
  if (!state) return;
  const gameType = loaded.game.game_type;
  const now = Date.now();
  let current = state;
  for (let steps = 0; steps < MAX_TAKEOVER_STEPS; steps++) {
    if (!isActivePhase(gameType, current) || isSeatLive(loaded, current.turn, now, TAKEOVER_STALE_MS)) break;
    const seat = current.turn as Seat;
    const move = chooseHeuristicMove(gameType, current, seat);
    current = move.card
      ? applyCardPlay(gameType, current, seat, move.card)
      : submitBid(current as CoincheGameState, move.bid!);
  }
  if (current === state) return;
  try {
    const status = statusFor(current);
    const version = await persistGame(loaded.game as GameRow, current, status);
    loaded.game.state = current;
    loaded.game.status = status;
    loaded.game.version = version;
  } catch {
    // Another caller already advanced it (version_conflict); the state we
    // just read is stale but buildView still returns a consistent view.
  }
}

export async function getView(gameId: string): Promise<GameView> {
  // Same reasoning as loadForAction: this runs on every card played and every
  // realtime tick, so the two independent round trips are worth overlapping.
  const [uid, loaded] = await Promise.all([getUserId(), loadGame(gameId)]);
  const mySeat = seatOf(uid, loaded.players);
  if (mySeat !== null) touchPresence(loaded, mySeat);
  await advanceStaleTurns(loaded);
  return buildView(loaded, uid);
}
