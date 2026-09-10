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
  startNextRound as startNextBouillaRound,
  submitPlay as submitBouillaPlay,
  type Card as BouillaCard,
  type GameState as BouillaGameState,
} from "@/lib/bouilla";
import {
  chooseAction as choosePresidentAction,
  redact as redactPresident,
  startNextRound as startNextPresidentRound,
  submitExchangeReturn as submitPresidentExchangeReturn,
  submitPass as submitPresidentPass,
  submitPlay as submitPresidentPlay,
  type Card as PresidentCard,
  type Combo,
  type GameState as PresidentGameState,
} from "@/lib/president";
import type { AnyGameState, GameStatus, GameType } from "@/lib/supabase/types";

/** A played card, loosely typed at the transport boundary: the active game's own
 *  engine (`applyPlay`/`isLegalPlay`) is what actually validates rank/suit/legality. */
export type WireCard = { suit: string; rank: string };

/** A Président combo (1-4 same-rank cards) at the transport boundary. */
export type WireCombo = { rank: string; cards: WireCard[] };

/** A move the host client submits on behalf of a bot seat. Bidding only applies to
 *  Coinche; Bouilla only ever plays a card; Président plays a combo, passes, or
 *  (during its "exchange" phase) returns cards. */
export type BotMove =
  | { kind: "bid"; type: BidType; value?: number; suit?: TrumpMode }
  | { kind: "play"; card: WireCard }
  | { kind: "combo"; combo: WireCombo }
  | { kind: "pass" }
  | { kind: "exchangeReturn"; cards: WireCard[] };

/** A move chosen by the heuristic bot for the seat whose turn it is. */
export type HeuristicMove =
  | { kind: "bid"; bid: Bid }
  | { kind: "play"; card: WireCard }
  | { kind: "combo"; combo: WireCombo }
  | { kind: "pass" }
  | { kind: "exchangeReturn"; cards: WireCard[] };

export function statusFor(state: AnyGameState): GameStatus {
  return state.phase === "finished" ? "finished" : "playing";
}

/** Whether the seat whose turn it is right now is expected to actually act
 *  (as opposed to a phase with no live turn, e.g. Coinche's lobby/scoring). */
export function isActivePhase(gameType: GameType, state: AnyGameState): boolean {
  if (gameType === "bouilla") return state.phase === "playing";
  if (gameType === "president") return state.phase === "playing" || state.phase === "exchange";
  return state.phase === "bidding" || state.phase === "playing";
}

/** Dispatch a single card play to the active game's own engine (Coinche/Bouilla
 *  only - Président's own multi-card moves go through `applyComboPlay`/`applyPass`
 *  below instead). */
export function applyCardPlay(gameType: GameType, state: AnyGameState, seat: Seat, card: WireCard): AnyGameState {
  if (gameType === "bouilla") {
    return submitBouillaPlay(state as BouillaGameState, seat, card as unknown as BouillaCard);
  }
  return submitCoinchePlay(state as CoincheGameState, seat, card as unknown as CoincheCard);
}

/** Président only: play a combo (single/pair/triple/quad). */
export function applyComboPlay(state: AnyGameState, seat: Seat, combo: WireCombo): AnyGameState {
  return submitPresidentPlay(state as PresidentGameState, seat, combo as unknown as Combo);
}

/** Président only: pass instead of playing onto the pile. */
export function applyPass(state: AnyGameState, seat: Seat): AnyGameState {
  return submitPresidentPass(state as PresidentGameState, seat);
}

/** Président only: return the required number of cards during the "exchange" phase. */
export function applyExchangeReturn(state: AnyGameState, seat: Seat, cards: WireCard[]): AnyGameState {
  return submitPresidentExchangeReturn(state as PresidentGameState, seat, cards as unknown as PresidentCard[]);
}

/** Dispatch "start the next hand" (Coinche: next deal, Bouilla/Président: next round). */
export function applyStartNext(gameType: GameType, state: AnyGameState): AnyGameState {
  if (state.phase !== "scoring") throw new Error("deal_not_finished");
  if (gameType === "bouilla") return startNextBouillaRound(state as BouillaGameState);
  if (gameType === "president") return startNextPresidentRound(state as PresidentGameState);
  return startNextDeal(state as CoincheGameState);
}

/** Heuristic bot move for the seat whose turn it is (server-side takeover / bot host). */
export function chooseHeuristicMove(gameType: GameType, state: AnyGameState, seat: Seat): HeuristicMove {
  if (gameType === "bouilla") {
    return { kind: "play", card: chooseBouillaCard(redactBouilla(state as BouillaGameState, seat)) };
  }
  if (gameType === "president") {
    const action = choosePresidentAction(redactPresident(state as PresidentGameState, seat));
    if (action.action === "PASS") return { kind: "pass" };
    if (action.action === "COMBO") return { kind: "combo", combo: action.combo as unknown as WireCombo };
    return { kind: "exchangeReturn", cards: action.cards as unknown as WireCard[] };
  }
  const coincheState = state as CoincheGameState;
  return coincheState.phase === "bidding"
    ? { kind: "bid", bid: chooseBid(coincheState) }
    : { kind: "play", card: chooseCoincheCard(coincheState) };
}

/** Apply a move (as returned by `chooseHeuristicMove`, or a manually built one)
 *  to the active game's own engine. */
export function applyMove(gameType: GameType, state: AnyGameState, seat: Seat, move: HeuristicMove): AnyGameState {
  switch (move.kind) {
    case "bid":
      return submitBid(state as CoincheGameState, move.bid);
    case "play":
      return applyCardPlay(gameType, state, seat, move.card);
    case "combo":
      return applyComboPlay(state, seat, move.combo);
    case "pass":
      return applyPass(state, seat);
    case "exchangeReturn":
      return applyExchangeReturn(state, seat, move.cards);
  }
}
