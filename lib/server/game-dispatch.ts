import {
  chooseBid,
  chooseCard as chooseCoincheCard,
  startNextDeal,
  submitBid,
  submitPlay as submitCoinchePlay,
  type Bid,
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
import type { AnyGameState, GameStatus, GameType } from "@/lib/supabase/types";

/** A played card, loosely typed at the transport boundary: the active game's own
 *  engine (`applyPlay`/`isLegalPlay`) is what actually validates rank/suit/legality. */
export type WireCard = { suit: string; rank: string };

/** A move the host client submits on behalf of a bot seat. Bidding never applies to
 *  Bouilla (no auction); a bot seat there only ever plays a card. */
export type BotMove =
  | { kind: "bid"; type: BidType; value?: number; suit?: TrumpMode }
  | { kind: "play"; card: WireCard };

/** A move chosen by the heuristic bot for the seat whose turn it is. */
export type HeuristicMove = { card?: WireCard; bid?: Bid };

export function statusFor(state: AnyGameState): GameStatus {
  return state.phase === "finished" ? "finished" : "playing";
}

export function isActivePhase(gameType: GameType, state: AnyGameState): boolean {
  return gameType === "bouilla" ? state.phase === "playing" : state.phase === "bidding" || state.phase === "playing";
}

/** Dispatch a card play to the active game's own engine. */
export function applyCardPlay(gameType: GameType, state: AnyGameState, seat: Seat, card: WireCard): AnyGameState {
  if (gameType === "bouilla") {
    return submitBouillaPlay(state as BouillaGameState, seat, card as unknown as BouillaCard);
  }
  return submitCoinchePlay(state as CoincheGameState, seat, card as unknown as CoincheCard);
}

/** Dispatch "start the next hand" (Coinche: next deal, Bouilla: next round). */
export function applyStartNext(gameType: GameType, state: AnyGameState): AnyGameState {
  if (state.phase !== "scoring") throw new Error("deal_not_finished");
  return gameType === "bouilla"
    ? startNextRound(state as BouillaGameState)
    : startNextDeal(state as CoincheGameState);
}

/** Heuristic bot move for the seat whose turn it is (server-side takeover / bot host). */
export function chooseHeuristicMove(gameType: GameType, state: AnyGameState, seat: Seat): HeuristicMove {
  if (gameType === "bouilla") {
    return { card: chooseBouillaCard(redactBouilla(state as BouillaGameState, seat)) };
  }
  const coincheState = state as CoincheGameState;
  return coincheState.phase === "bidding"
    ? { bid: chooseBid(coincheState) }
    : { card: chooseCoincheCard(coincheState) };
}

/** Apply a card-or-bid move (as returned by `chooseHeuristicMove`, or a manually
 *  built one) to the active game's own engine. */
export function applyMove(gameType: GameType, state: AnyGameState, seat: Seat, move: HeuristicMove): AnyGameState {
  return move.card ? applyCardPlay(gameType, state, seat, move.card) : submitBid(state as CoincheGameState, move.bid!);
}
