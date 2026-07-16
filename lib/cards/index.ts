/** Generic card/deck primitives shared by every game's rules engine (lib/coinche, lib/bouilla).
 *  Game-specific concerns (rank sets, point values, trick-taking rules) stay in each game's
 *  own `cards.ts` — this module only knows about suits, shuffling and seat rotation. */

export type Suit = "H" | "D" | "C" | "S";
export const SUITS: Suit[] = ["H", "D", "C", "S"];

/** Seats are 0..3 in clockwise play order, shared by every 4-player game. */
export type Seat = 0 | 1 | 2 | 3;

export type Rng = () => number;

export interface CardOf<TRank extends string> {
  suit: Suit;
  rank: TRank;
}

/** Build a full deck for the given rank set (suit-major order, matching historical Coinche order). */
export function buildDeck<TRank extends string>(
  ranks: readonly TRank[],
  suits: readonly Suit[] = SUITS,
): CardOf<TRank>[] {
  const deck: CardOf<TRank>[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function cardId<TRank extends string>(card: CardOf<TRank>): string {
  return `${card.rank}${card.suit}`;
}

export function sameCard<TRank extends string>(a: CardOf<TRank>, b: CardOf<TRank>): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/** Fisher-Yates shuffle with an injectable RNG (deterministic in tests). */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}
