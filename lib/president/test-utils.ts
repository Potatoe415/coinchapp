import { createInitialState } from "./deal";
import type { Card, Combo, GameState, Rank, Seat, Suit, Titles } from "./types";

/** Deterministic RNG (mulberry32) for reproducible shuffles in tests. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

export function combo(rank: Rank, cards: Card[]): Combo {
  return { rank, cards };
}

/** Build a "playing"-phase state with explicit hands, an optional open pile. */
export function playingState(opts: {
  hands: Card[][];
  turn: Seat;
  pile?: { combo: Combo; leader: Seat };
  revolution?: boolean;
  passStreak?: number;
  finishedOrder?: Seat[];
  roundIndex?: number;
  roundsToPlay?: number;
  titles?: Titles | null;
}): GameState {
  const base = createInitialState(opts.roundsToPlay ?? 4);
  return {
    ...base,
    phase: "playing",
    roundIndex: opts.roundIndex ?? 0,
    turn: opts.turn,
    hands: opts.hands,
    pile: opts.pile ?? { combo: null, leader: null },
    revolution: opts.revolution ?? false,
    passStreak: opts.passStreak ?? 0,
    finishedOrder: opts.finishedOrder ?? [],
    titles: opts.titles ?? null,
  };
}

/** Build an "exchange"-phase state with explicit hands and titles. */
export function exchangeState(opts: {
  hands: Card[][];
  titles: Titles;
  awaiting: Seat[];
  owed: Record<Seat, number>;
  roundIndex?: number;
  roundsToPlay?: number;
}): GameState {
  const base = createInitialState(opts.roundsToPlay ?? 4);
  return {
    ...base,
    phase: "exchange",
    roundIndex: opts.roundIndex ?? 1,
    turn: opts.awaiting[0],
    hands: opts.hands,
    titles: opts.titles,
    pendingExchange: { awaiting: opts.awaiting, owed: opts.owed },
  };
}

/** Build a "scoring"-phase state from a fixed finish order. */
export function scoringState(finishedOrder: Seat[], opts?: { roundIndex?: number; roundsToPlay?: number }): GameState {
  const base = createInitialState(opts?.roundsToPlay ?? 4);
  return { ...base, phase: "scoring", roundIndex: opts?.roundIndex ?? 0, finishedOrder, hands: [[], [], [], []] };
}
