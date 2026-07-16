import { shuffle, type Rng } from "@/lib/cards";
import { buildDeck, nextSeat } from "./cards";
import type { Card, GameState } from "./types";

export type { Rng } from "@/lib/cards";
export { shuffle };

/** Deal the full 52-card pack evenly: 13 cards per seat. */
export function dealHands(deck: Card[]): Card[][] {
  const hands: Card[][] = [[], [], [], []];
  deck.forEach((card, index) => hands[index % 4].push(card));
  return hands;
}

export function createInitialState(): GameState {
  return {
    phase: "lobby",
    roundIndex: 0,
    dealer: 3,
    turn: 0,
    hands: [[], [], [], []],
    currentTrick: { leader: 0, cards: [] },
    tricks: [],
    totalScores: [0, 0, 0, 0],
    roundHistory: [],
    lastRoundResult: undefined,
    winners: undefined,
  };
}

/** Rotate the dealer, deal a fresh 13-card hand and open the next round's play phase.
 *  The seat right after the dealer leads the first trick (same convention as Coinche). */
export function beginNextRound(state: GameState, rng: Rng = Math.random): GameState {
  const dealer = nextSeat(state.dealer);
  const opener = nextSeat(dealer);
  const hands = dealHands(shuffle(buildDeck(), rng));
  return {
    ...state,
    phase: "playing",
    dealer,
    turn: opener,
    hands,
    currentTrick: { leader: opener, cards: [] },
    tricks: [],
    lastRoundResult: undefined,
  };
}
