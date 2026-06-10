import type { Card, Rank, Seat, Suit, Team, TrumpMode } from "./types";

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

/** Sans-atout points (no trump): A high. Deck total = 152 (+10 de der = 162). */
const SANS_ATOUT_POINTS: Record<Rank, number> = {
  A: 19,
  "10": 10,
  K: 4,
  Q: 3,
  J: 2,
  "9": 0,
  "8": 0,
  "7": 0,
};

/** Tout-atout points (every suit trump). Raw deck total = 204 (+10 de der = 214). */
const TOUT_ATOUT_POINTS: Record<Rank, number> = {
  J: 14,
  "9": 9,
  A: 11,
  "10": 10,
  K: 4,
  Q: 3,
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

export function isTrump(card: Card, trump: TrumpMode | null): boolean {
  if (trump === "TA") return true;
  if (trump === "SA" || trump === null) return false;
  return card.suit === trump;
}

export function cardPoints(card: Card, trump: TrumpMode | null): number {
  if (trump === "TA") return TOUT_ATOUT_POINTS[card.rank];
  if (trump === "SA") return SANS_ATOUT_POINTS[card.rank];
  return isTrump(card, trump) ? TRUMP_POINTS[card.rank] : PLAIN_POINTS[card.rank];
}

/** Comparable strength of a card within a trick, given the led suit and trump.
 *  In TA every suit is its own trump line (J high); in SA there is no cutting. */
export function cardStrength(card: Card, led: Suit, trump: TrumpMode | null): number {
  if (trump === "TA") return card.suit === led ? 200 + TRUMP_ORDER.indexOf(card.rank) : 0;
  if (trump === "SA") return card.suit === led ? 100 + PLAIN_ORDER.indexOf(card.rank) : 0;
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
