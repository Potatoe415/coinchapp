import { canPass, legalCombos } from "./play";
import type { Card, Combo, GameState, PendingExchange, Phase, Pile, RoundResult, Seat, SeatScores, Titles } from "./types";

/** What a single seat is allowed to see. Never includes other players' hands.
 *  `pendingExchange` carries no secret information (owed counts/awaiting seats
 *  are public), so it is passed through unfiltered. */
export interface PlayerView {
  mySeat: Seat;
  phase: Phase;
  roundIndex: number;
  turn: Seat;
  myHand: Card[];
  handCounts: number[];
  /** Legal combos for me right now (empty unless it is my turn to play). */
  legalCombos: Combo[];
  canPass: boolean;
  pile: Pile;
  /** Not secret (a burn is always a face-up combo): passed through so the
   *  client can show a "the pile got burned" animation - see `GameState.lastBurn`. */
  lastBurn: GameState["lastBurn"];
  revolution: boolean;
  finishedOrder: Seat[];
  titles: Titles | null;
  pendingExchange: PendingExchange | null;
  totalScores: SeatScores;
  roundHistory: RoundResult[];
  lastRoundResult: RoundResult | null;
  roundsToPlay: number;
  winners: Seat[] | null;
}

export function redact(state: GameState, seat: Seat): PlayerView {
  return {
    mySeat: seat,
    phase: state.phase,
    roundIndex: state.roundIndex,
    turn: state.turn,
    myHand: state.hands[seat] ?? [],
    handCounts: state.hands.map((h) => h.length),
    legalCombos: legalCombos(state, seat),
    canPass: canPass(state, seat),
    pile: state.pile,
    lastBurn: state.lastBurn,
    revolution: state.revolution,
    finishedOrder: state.finishedOrder,
    titles: state.titles,
    pendingExchange: state.pendingExchange,
    totalScores: state.totalScores,
    roundHistory: state.roundHistory,
    lastRoundResult: state.lastRoundResult,
    roundsToPlay: state.roundsToPlay,
    winners: state.winners ?? null,
  };
}
