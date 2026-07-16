import type { CardOf, Seat } from "@/lib/cards";

export type { Seat, Suit } from "@/lib/cards";

/** Full 52-card pack: no trump, ace high. */
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export type Card = CardOf<Rank>;

export interface PlayedCard {
  seat: Seat;
  card: Card;
}

export interface Trick {
  leader: Seat;
  cards: PlayedCard[];
  winner?: Seat;
}

/** The 6 fixed rounds, always played in this order (see docs/DECISIONS.md). */
export type Round = "tricks" | "clubs" | "queens" | "kingSpades" | "lastTrick" | "everything";

export const ROUND_ORDER: Round[] = ["tricks", "clubs", "queens", "kingSpades", "lastTrick", "everything"];

export type Phase = "lobby" | "playing" | "scoring" | "finished";

/** Penalty points per seat for the round that just ended. */
export type SeatScores = [number, number, number, number];

export interface RoundResult {
  round: Round;
  roundIndex: number;
  penalties: SeatScores;
  /** Set when one seat swept the round (all 13 tricks, all 13 clubs, or all 4
   *  queens): that seat pays nothing and every other seat pays the round's max
   *  penalty instead of the usual per-card tally. */
  sweepSeat?: Seat;
}

export interface GameState {
  phase: Phase;
  /** Index into ROUND_ORDER of the round currently being played. */
  roundIndex: number;
  dealer: Seat;
  turn: Seat;
  /** hands[seat] = remaining cards. HIDDEN: server-only, redacted per seat. */
  hands: Card[][];
  currentTrick: Trick;
  /** Completed tricks for the round in progress. */
  tricks: Trick[];
  /** Cumulative penalty points per seat across all finished rounds. */
  totalScores: SeatScores;
  /** Every finished round's result, in play order (for the scoreboard). */
  roundHistory: RoundResult[];
  lastRoundResult?: RoundResult;
  /** Set once round 6 ("everything") is scored: the seat(s) with the lowest total. */
  winners?: Seat[];
}
