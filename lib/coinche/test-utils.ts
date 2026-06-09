import { buildDeck } from "./cards";
import { createInitialState } from "./deal";
import type { Card, GameState, PlayedCard, Seat, Suit, Trick } from "./types";

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

export function card(rank: Card["rank"], suit: Suit): Card {
  return { rank, suit };
}

/** Build a playing-phase state with explicit hands and an optional open trick. */
export function playingState(opts: {
  hands: Card[][];
  trump: Suit | null;
  turn: Seat;
  trick?: PlayedCard[];
}): GameState {
  const base = createInitialState(1000);
  const leader = (opts.trick?.[0]?.seat ?? opts.turn) as Seat;
  return {
    ...base,
    phase: "playing",
    trump: opts.trump,
    turn: opts.turn,
    hands: opts.hands,
    currentTrick: { leader, cards: opts.trick ?? [] },
  };
}

/** Split the 32-card deck into 8 tricks of 4 and assign a winner per trick. */
export function dealWithWinners(winners: Seat[], trump: Suit): GameState {
  const deck = buildDeck();
  const tricks: Trick[] = [];
  for (let i = 0; i < 8; i++) {
    const cards: PlayedCard[] = deck
      .slice(i * 4, i * 4 + 4)
      .map((c, idx) => ({ seat: idx as Seat, card: c }));
    tricks.push({ leader: 0, cards, winner: winners[i] });
  }
  const base = createInitialState(1000);
  return { ...base, phase: "scoring", trump, tricks, hands: [[], [], [], []] };
}
