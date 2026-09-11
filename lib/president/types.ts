import type { CardOf, Seat } from "@/lib/cards";

export type { Seat, Suit } from "@/lib/cards";

/** Full 52-card pack, no trump. 2 is the strongest single card (no "burn" card -
 *  see docs/DATA_MODEL.md). */
export type Rank = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";

export type Card = CardOf<Rank>;

export type Phase = "lobby" | "exchange" | "playing" | "scoring" | "finished";

/** A same-rank set of 1-4 cards: the unit of play (single/pair/triple/quad). */
export interface Combo {
  rank: Rank;
  cards: Card[];
}

/** Assigned once a round finishes (round 0 has none yet): drives the next
 *  round's forced card exchange and that round's own scoring. */
export type Title = "president" | "vicePresident" | "viceTrouDuCul" | "trouDuCul";

/** Titles indexed by seat, e.g. `titles[2]` is seat 2's title. */
export type Titles = [Title, Title, Title, Title];

/** The pile currently being built up during a round: the last combo played and
 *  who led it. Cleared (both null) once every other active seat has passed. */
export interface Pile {
  combo: Combo | null;
  leader: Seat | null;
}

/** Cumulative finishing-rank total per seat (1=President..4=Trou du Cul each
 *  round) - lower is better, same convention as Bouilla's penalty totals. */
export type SeatScores = [number, number, number, number];

export interface RoundResult {
  roundIndex: number;
  /** Finish order for the round that just ended, 1st (President) to last
   *  (Trou du Cul). */
  finishedOrder: Seat[];
  titles: Titles;
}

/** The forced part of the exchange (which cards moved, no choice involved) plus
 *  what each side still owes back, in the order seats must act. */
export interface PendingExchange {
  /** Seats that must still choose which cards to return - President first,
   *  then Vice-President (see docs/DATA_MODEL.md). Sequential, not concurrent,
   *  so the single `turn` field every shared subsystem assumes still works. */
  awaiting: Seat[];
  /** How many cards each awaiting seat must return. */
  owed: Record<Seat, number>;
}

export interface GameState {
  phase: Phase;
  roundIndex: number;
  turn: Seat;
  /** hands[seat] = remaining cards. HIDDEN: server-only, redacted per seat. */
  hands: Card[][];
  pile: Pile;
  /** Set only on the exact play that just burned the pile (a "2", see
   *  `applyPlay`) - not re-cleared afterwards, so clients must diff it against
   *  the previous view (by seat + card identity) to detect a *new* burn rather
   *  than re-triggering on every render. Purely a display cue, never read by
   *  any rules logic. */
  lastBurn: { seat: Seat; combo: Combo } | null;
  /** Consecutive passes since the pile's current combo was played. */
  passStreak: number;
  /** Toggled by every quad played; reset to false at the start of each round. */
  revolution: boolean;
  /** Seats that have emptied their hand this round, in finishing order. */
  finishedOrder: Seat[];
  /** Titles from the round that just ended (null for round 0, before any round
   *  has been scored). Drives the current/next round's forced exchange. */
  titles: Titles | null;
  /** Present only during the "exchange" phase. */
  pendingExchange: PendingExchange | null;
  totalScores: SeatScores;
  roundHistory: RoundResult[];
  lastRoundResult: RoundResult | null;
  /** How many rounds this match plays in total (settings-driven, fixed for the
   *  whole match). */
  roundsToPlay: number;
  winners?: Seat[];
  /** Online/ad-hoc only: seats that have pressed "Manche suivante" while
   *  `phase` is "scoring". Cleared once the next round starts. */
  readySeats?: Seat[];
}

/** Online/ad-hoc only: max time the end-of-round score table can hold before
 *  the next round starts automatically, even if not every real player has
 *  pressed "Manche suivante" yet. Same value as Bouilla's own constant
 *  (`lib/bouilla/types.ts`) - kept independent since each engine's timing is
 *  its own concern, even where the numbers happen to agree. */
export const ROUND_AUTO_ADVANCE_MS = 6000;
