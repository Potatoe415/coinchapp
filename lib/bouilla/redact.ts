import { legalCards } from "./trick";
import { ROUND_ORDER } from "./types";
import type { Card, GameState, Phase, RoundResult, Round, Seat, SeatScores, Trick } from "./types";

/** What a single seat is allowed to see. Never includes other players' hands. */
export interface PlayerView {
  mySeat: Seat;
  phase: Phase;
  round: Round;
  roundIndex: number;
  dealer: Seat;
  turn: Seat;
  myHand: Card[];
  /** Legal cards for me right now (empty unless it is my turn to play). */
  legalCards: Card[];
  handCounts: number[];
  currentTrick: Trick;
  /** Completed tricks this round (public information all players have seen). */
  tricks: Trick[];
  lastTrick: Trick | null;
  totalScores: SeatScores;
  roundHistory: RoundResult[];
  lastRoundResult: RoundResult | null;
  winners: Seat[] | null;
}

export function redact(state: GameState, seat: Seat): PlayerView {
  const myTurn = state.turn === seat;
  return {
    mySeat: seat,
    phase: state.phase,
    round: ROUND_ORDER[state.roundIndex],
    roundIndex: state.roundIndex,
    dealer: state.dealer,
    turn: state.turn,
    myHand: state.hands[seat] ?? [],
    legalCards: myTurn && state.phase === "playing" ? legalCards(state, seat) : [],
    handCounts: state.hands.map((h) => h.length),
    currentTrick: state.currentTrick,
    tricks: state.tricks,
    lastTrick: state.tricks.length > 0 ? state.tricks[state.tricks.length - 1] : null,
    totalScores: state.totalScores,
    roundHistory: state.roundHistory,
    lastRoundResult: state.lastRoundResult ?? null,
    winners: state.winners ?? null,
  };
}
