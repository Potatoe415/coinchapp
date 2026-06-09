import type { Card, Rank, Seat, Suit, Team } from "./types";

export const SUITS: Suit[] = ["H", "D", "C", "S"];
export const RANKS: Rank[] = ["7", "8", "9", "10", "J", "Q", "K", "A"];

/** Trump strength order, weakest -> strongest. Index = strength. */
const TRUMP_ORDER: Rank[] = ["7", "8", "Q", "K", "10", "A", "9", "J"];
/** Non-trump strength order, weakest -> strongest. Index = strength. */
const PLAIN_ORDER: Rank[] = ["7", "8", "9", "J", "Q", "K", "10", "A"];

const TRUMP_POINTS: Record<Rank, number> = {
  J: 20,
  "9": 14,
  A: 11,
  "10": 10,
  K: 4,
  Q: 3,
  "8": 0,
  "7": 0,
};

const PLAIN_POINTS: Record<Rank, number> = {
  A: 11,
  "10": 10,
  K: 4,
  Q: 3,
  J: 2,
  "9": 0,
  "8": 0,
  "7": 0,
};

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function cardId(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function isTrump(card: Card, trump: Suit | null): boolean {
  return trump !== null && card.suit === trump;
}

export function cardPoints(card: Card, trump: Suit | null): number {
  return isTrump(card, trump) ? TRUMP_POINTS[card.rank] : PLAIN_POINTS[card.rank];
}

/** Comparable strength of a card within a trick, given the led suit and trump. */
export function cardStrength(card: Card, led: Suit, trump: Suit | null): number {
  if (isTrump(card, trump)) return 200 + TRUMP_ORDER.indexOf(card.rank);
  if (card.suit === led) return 100 + PLAIN_ORDER.indexOf(card.rank);
  return 0;
}

/** Trump-only strength (used for over/under-trump obligations). */
export function trumpStrength(card: Card): number {
  return TRUMP_ORDER.indexOf(card.rank);
}

export function teamOf(seat: Seat): Team {
  return seat % 2 === 0 ? "A" : "B";
}

export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}
