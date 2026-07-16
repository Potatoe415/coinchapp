import { isClub, isKingOfSpades, isQueen } from "./cards";
import type { Round, Seat, Trick } from "./types";

/** Fixed point values agreed with the user for each rule (see docs/DECISIONS.md). */
export const TRICK_PENALTY = 5;
export const CLUB_PENALTY = 10;
export const QUEEN_PENALTY = 20;
export const KING_OF_SPADES_PENALTY = 50;
export const LAST_TRICK_PENALTY = 100;

const TRICKS_PER_ROUND = 13;
const CLUBS_PER_DECK = 13;
const QUEENS_PER_DECK = 4;

/** Per-seat penalty when that seat sweeps a round ("Capot"): the sweeper pays
 *  nothing and this amount is charged to every *other* seat instead (see
 *  docs/DECISIONS.md). Rounds with a single penalty event (king of spades, last
 *  trick) have no sweep bonus - they are already all-or-nothing. */
export const CAPOT_PENALTY: Partial<Record<Round, number>> = {
  tricks: TRICKS_PER_ROUND * TRICK_PENALTY,
  clubs: CLUBS_PER_DECK * CLUB_PENALTY,
  queens: QUEENS_PER_DECK * QUEEN_PENALTY,
  everything:
    TRICKS_PER_ROUND * TRICK_PENALTY +
    CLUBS_PER_DECK * CLUB_PENALTY +
    QUEENS_PER_DECK * QUEEN_PENALTY +
    KING_OF_SPADES_PENALTY +
    LAST_TRICK_PENALTY,
};

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

/** Seat that collected every single copy of `counter`'s card across a full,
 *  completed round, or null if nobody did (or the round isn't over yet). */
function soleCollector(tricks: Trick[], counter: (t: Trick) => number, total: number): Seat | null {
  const bySeat = new Map<Seat, number>();
  for (const trick of tricks) {
    const count = counter(trick);
    if (count === 0) continue;
    bySeat.set(trick.winner!, (bySeat.get(trick.winner!) ?? 0) + count);
  }
  for (const [seat, count] of bySeat) {
    if (count === total) return seat;
  }
  return null;
}

/** Seat that swept `round` (the "Capot" bonus), or null if nobody did. Only
 *  "tricks"/"everything" (win every trick) and "clubs"/"queens" (collect every
 *  copy of the card) have a sweep - a single-event round can't be swept. */
export function sweepWinner(round: Round, tricks: Trick[]): Seat | null {
  switch (round) {
    case "tricks":
    case "everything": {
      if (tricks.length !== TRICKS_PER_ROUND) return null;
      const winners = new Set(tricks.map((t) => t.winner));
      return winners.size === 1 ? tricks[0].winner! : null;
    }
    case "clubs":
      return soleCollector(tricks, clubCount, CLUBS_PER_DECK);
    case "queens":
      return soleCollector(tricks, queenCount, QUEENS_PER_DECK);
    default:
      return null;
  }
}
