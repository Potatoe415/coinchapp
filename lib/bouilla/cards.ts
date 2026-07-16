import { buildDeck as buildDeckGeneric, cardId as cardIdGeneric, sameCard as sameCardGeneric, SUITS } from "@/lib/cards";
import type { Card, Rank } from "./types";

export { nextSeat, SUITS } from "@/lib/cards";

/** Ace-high order, weakest to strongest. Index = strength (no trump in this game). */
export const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export function buildDeck(): Card[] {
  return buildDeckGeneric(RANKS, SUITS);
}

export function cardId(card: Card): string {
  return cardIdGeneric(card);
}

export function sameCard(a: Card, b: Card): boolean {
  return sameCardGeneric(a, b);
}

/** Strength within a suit; only comparable to another card of the same suit (no trump). */
export function cardStrength(card: Card): number {
  return RANKS.indexOf(card.rank);
}

export function isQueen(card: Card): boolean {
  return card.rank === "Q";
}

export function isClub(card: Card): boolean {
  return card.suit === "C";
}

export function isKingOfSpades(card: Card): boolean {
  return card.suit === "S" && card.rank === "K";
}
