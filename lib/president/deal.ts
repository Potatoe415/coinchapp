import { shuffle, type Rng } from "@/lib/cards";
import { buildDeck, isThreeOfClubs } from "./cards";
import { computeForcedTransfers } from "./exchange";
import type { Card, GameState, Seat } from "./types";

export type { Rng } from "@/lib/cards";
export { shuffle };

/** Deal the full 52-card pack evenly: 13 cards per seat. */
export function dealHands(deck: Card[]): Card[][] {
  const hands: Card[][] = [[], [], [], []];
  deck.forEach((card, index) => hands[index % 4].push(card));
  return hands;
}

function findThreeOfClubs(hands: Card[][]): Seat {
  return hands.findIndex((hand) => hand.some(isThreeOfClubs)) as Seat;
}

export function createInitialState(roundsToPlay: number): GameState {
  return {
    phase: "lobby",
    roundIndex: 0,
    turn: 0,
    hands: [[], [], [], []],
    pile: { combo: null, leader: null },
    lastBurn: null,
    passStreak: 0,
    revolution: false,
    finishedOrder: [],
    titles: null,
    pendingExchange: null,
    totalScores: [0, 0, 0, 0],
    roundHistory: [],
    lastRoundResult: null,
    roundsToPlay,
  };
}

/** Deal a fresh round. Round 0 (no titles yet): straight into "playing", led by
 *  whoever holds the 3 of clubs. Round >= 1: deal, then apply the forced half
 *  of the exchange (previous round's Trou du Cul/Vice-Trou du Cul give their
 *  best cards up) and open the "exchange" phase so the President/Vice-
 *  President can each choose what to give back, before play resumes. */
export function beginNextRound(state: GameState, rng: Rng = Math.random): GameState {
  const hands = dealHands(shuffle(buildDeck(), rng));
  const cleared = {
    pile: { combo: null, leader: null },
    lastBurn: null,
    passStreak: 0,
    revolution: false,
    finishedOrder: [],
    // Otherwise the previous round's score table (`lastRoundResult`) stays truthy,
    // so `roundOverlayVisible` (PresidentTable.tsx) never goes false again: the
    // round-end overlay keeps covering the table forever, hiding the "exchange"
    // panel round 2+ needs - the game looks frozen right after "Manche suivante".
    lastRoundResult: null,
  };

  if (!state.titles) {
    return { ...state, ...cleared, phase: "playing", hands, turn: findThreeOfClubs(hands) };
  }

  const { hands: exchanged, transfers } = computeForcedTransfers(state.titles, hands);
  const [{ to: president }, { to: vicePresident }] = transfers;
  return {
    ...state,
    ...cleared,
    phase: "exchange",
    hands: exchanged,
    turn: president,
    pendingExchange: {
      awaiting: [president, vicePresident],
      owed: { [president]: 2, [vicePresident]: 1 } as Record<Seat, number>,
    },
  };
}
