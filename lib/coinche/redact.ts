import { bidOptions, type BidOptions } from "./bidding";
import { legalCards } from "./trick";
import type {
  Bid,
  Card,
  Contract,
  DealResult,
  GameState,
  Phase,
  Seat,
  Suit,
  Team,
  Trick,
} from "./types";

/** What a single seat is allowed to see. Never includes other players' hands. */
export interface PlayerView {
  mySeat: Seat;
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  trump: Suit | null;
  contract: Contract | null;
  bids: Bid[];
  myHand: Card[];
  /** Legal cards for me right now (empty unless it is my turn to play). */
  legalCards: Card[];
  /** Legal bidding actions for me right now (null unless it is my turn to bid). */
  bidOptions: BidOptions | null;
  handCounts: number[];
  currentTrick: Trick;
  lastTrick: Trick | null;
  tricksWon: { A: number; B: number };
  scores: { A: number; B: number };
  targetPoints: number;
  lastDeal: DealResult | null;
  winner: Team | null;
}

function tricksWon(state: GameState): { A: number; B: number } {
  const won = { A: 0, B: 0 };
  for (const trick of state.tricks) {
    if (trick.winner === undefined) continue;
    won[trick.winner % 2 === 0 ? "A" : "B"]++;
  }
  return won;
}

export function redact(state: GameState, seat: Seat): PlayerView {
  const myTurn = state.turn === seat;
  return {
    mySeat: seat,
    phase: state.phase,
    dealer: state.dealer,
    turn: state.turn,
    trump: state.trump,
    contract: state.contract,
    bids: state.bids,
    myHand: state.hands[seat] ?? [],
    legalCards: myTurn && state.phase === "playing" ? legalCards(state, seat) : [],
    bidOptions: myTurn && state.phase === "bidding" ? bidOptions(state) : null,
    handCounts: state.hands.map((h) => h.length),
    currentTrick: state.currentTrick,
    lastTrick: state.tricks.length > 0 ? state.tricks[state.tricks.length - 1] : null,
    tricksWon: tricksWon(state),
    scores: state.scores,
    targetPoints: state.targetPoints,
    lastDeal: state.lastDeal ?? null,
    winner: state.winner ?? null,
  };
}
