import { isClub, isKingOfSpades, isQueen } from "./cards";
import type { Round, Trick } from "./types";

/** Fixed point values agreed with the user for each rule (see docs/DECISIONS.md). */
export const TRICK_PENALTY = 5;
export const CLUB_PENALTY = 10;
export const QUEEN_PENALTY = 20;
export const KING_OF_SPADES_PENALTY = 50;
export const LAST_TRICK_PENALTY = 100;

function clubCount(trick: Trick): number {
  return trick.cards.filter((p) => isClub(p.card)).length;
}

function queenCount(trick: Trick): number {
  return trick.cards.filter((p) => isQueen(p.card)).length;
}

function hasKingOfSpades(trick: Trick): boolean {
  return trick.cards.some((p) => isKingOfSpades(p.card));
}

/** Penalty points charged to whoever wins `trick`, for the given round.
 *  "everything" sums every other rule's penalty on the same trick. */
export function trickPenalty(round: Round, trick: Trick, isLastTrick: boolean): number {
  switch (round) {
    case "tricks":
      return TRICK_PENALTY;
    case "clubs":
      return CLUB_PENALTY * clubCount(trick);
    case "queens":
      return QUEEN_PENALTY * queenCount(trick);
    case "kingSpades":
      return hasKingOfSpades(trick) ? KING_OF_SPADES_PENALTY : 0;
    case "lastTrick":
      return isLastTrick ? LAST_TRICK_PENALTY : 0;
    case "everything":
      return (
        TRICK_PENALTY +
        CLUB_PENALTY * clubCount(trick) +
        QUEEN_PENALTY * queenCount(trick) +
        (hasKingOfSpades(trick) ? KING_OF_SPADES_PENALTY : 0) +
        (isLastTrick ? LAST_TRICK_PENALTY : 0)
      );
  }
}
