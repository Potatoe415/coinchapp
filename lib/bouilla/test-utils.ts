import { createInitialState } from "./deal";
import type { Card, GameState, PlayedCard, Rank, Seat, Suit, Trick } from "./types";

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

/** Build a playing-phase state with explicit hands, an optional open trick and round. */
export function playingState(opts: {
  hands: Card[][];
  turn: Seat;
  trick?: PlayedCard[];
  roundIndex?: number;
  tricks?: Trick[];
}): GameState {
  const base = createInitialState();
  const leader = (opts.trick?.[0]?.seat ?? opts.turn) as Seat;
  return {
    ...base,
    phase: "playing",
    roundIndex: opts.roundIndex ?? 0,
    turn: opts.turn,
    hands: opts.hands,
    currentTrick: { leader, cards: opts.trick ?? [] },
    tricks: opts.tricks ?? [],
  };
}

/** Build a scoring-phase state from a fixed list of completed tricks. */
export function scoringState(roundIndex: number, tricks: Trick[]): GameState {
  const base = createInitialState();
  return { ...base, phase: "scoring", roundIndex, tricks, hands: [[], [], [], []] };
}
