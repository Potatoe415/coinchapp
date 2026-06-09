export type Suit = "H" | "D" | "C" | "S";
export type Rank = "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
}

/** Seats are 0..3 in clockwise play order. Teams: A = {0,2}, B = {1,3}. */
export type Seat = 0 | 1 | 2 | 3;
export type Team = "A" | "B";

export type Phase = "lobby" | "bidding" | "playing" | "scoring" | "finished";

export type BidType = "pass" | "bid" | "coinche" | "surcoinche";

export interface Bid {
  seat: Seat;
  type: BidType;
  /** Contract value for a "bid": 80,90,...,160 or 250 (capot). */
  value?: number;
  /** Trump suit for a "bid". */
  suit?: Suit;
}

export interface Contract {
  seat: Seat;
  team: Team;
  value: number;
  suit: Suit;
  /** Multiplier: 1 = normal, 2 = coinche, 4 = surcoinche. */
  coinche: 1 | 2 | 4;
}

export interface PlayedCard {
  seat: Seat;
  card: Card;
}

export interface Trick {
  leader: Seat;
  cards: PlayedCard[];
  winner?: Seat;
}

export interface BeloteState {
  /** Team holding K+Q of trump, or null if none / no trump yet. */
  team: Team | null;
  announced: ("belote" | "rebelote")[];
}

export interface DealResult {
  contract: Contract;
  /** Raw card points won by each team (includes the 10 "dix de der"). */
  cardPoints: { A: number; B: number };
  belote: Team | null;
  capot: boolean;
  contractMade: boolean;
  /** Points added to the match score this deal. */
  gained: { A: number; B: number };
}

export interface GameState {
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  trump: Suit | null;
  contract: Contract | null;
  bids: Bid[];
  /** hands[seat] = remaining cards. HIDDEN: server-only, redacted per seat. */
  hands: Card[][];
  currentTrick: Trick;
  tricks: Trick[];
  belote: BeloteState;
  scores: { A: number; B: number };
  targetPoints: number;
  lastDeal?: DealResult;
  winner?: Team;
  /** Set when every seat passed: the caller must redeal. */
  pendingRedeal?: boolean;
}
