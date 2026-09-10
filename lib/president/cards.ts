import { buildDeck as buildDeckGeneric, cardId as cardIdGeneric, sameCard as sameCardGeneric } from "@/lib/cards";
import type { Card, Rank } from "./types";

export { nextSeat, shuffle } from "@/lib/cards";

/** Weakest to strongest; 2 is the strongest single card. Revolution (a quad
 *  played) temporarily reverses this - always compare via `rankValue`/
 *  `outranks`, never index into this array directly. */
export const RANK_ORDER: Rank[] = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];

export function buildDeck(): Card[] {
  return buildDeckGeneric(RANK_ORDER);
}

export function cardId(card: Card): string {
  return cardIdGeneric(card);
}

export function sameCard(a: Card, b: Card): boolean {
  return sameCardGeneric(a, b);
}

/** Strength of `rank` right now, accounting for a possible revolution. */
export function rankValue(rank: Rank, revolution: boolean): number {
  const index = RANK_ORDER.indexOf(rank);
  return revolution ? RANK_ORDER.length - 1 - index : index;
}

/** True if `a` outranks `b`, under the current revolution state. */
export function outranks(a: Rank, b: Rank, revolution: boolean): boolean {
  return rankValue(a, revolution) > rankValue(b, revolution);
}

export function isThreeOfClubs(card: Card): boolean {
  return card.rank === "3" && card.suit === "C";
}
