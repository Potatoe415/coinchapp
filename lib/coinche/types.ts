export type Suit = "H" | "D" | "C" | "S";
export type Rank = "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

/** Trump mode chosen by the contract: a single suit, all-trump ("TA") or no-trump ("SA"). */
export type TrumpMode = Suit | "TA" | "SA";

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
  /** Contract value for a "bid": 80,90,...,160, 250 (capot) or 500 (generale). */
  value?: number;
  /** Trump mode for a "bid": a suit, "TA" (tout atout) or "SA" (sans atout). */
  suit?: TrumpMode;
}

export interface Contract {
  seat: Seat;
  team: Team;
  value: number;
  /** Trump mode: a suit, "TA" (tout atout) or "SA" (sans atout). */
  suit: TrumpMode;
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
  /** Team holding K+Q of the single trump suit, or null (none / SA / TA). */
  team: Team | null;
  /** Belote points per team. Handles multiple belotes in tout atout. */
  points: { A: number; B: number };
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

export interface ScoringRules {
  /** If contract is made, attackers only score contract value (no overtrick points). */
  countContractOnlyIfMade: boolean;
  /** If contract fails, defenders score this many points (default 160). */
  failedContractDefensePoints: number;
  /** If contract is made, defenders score 0 card points (belote still applies). */
  zeroPointsForNonContractingTeamWhenContractMade: boolean;
  /** Points attacker scores when an announced capot is made (default 250). */
  capotMadePoints: number;
  /** Points defense scores when an announced capot fails (default 250). */
  capotFailedDefensePoints: number;
  /** Whether tout atout / sans atout may be announced (default false). */
  allowToutAtoutSansAtout: boolean;
  /** To win, a team must have strictly more points than the opponent. On an exact
   *  tie at/above the target the game continues instead of being decided (default true). */
  requireMorePointsToWin: boolean;
}

export interface GameState {
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  /** Active trump mode, or null during bidding. */
  trump: TrumpMode | null;
  contract: Contract | null;
  bids: Bid[];
  /** hands[seat] = remaining cards. HIDDEN: server-only, redacted per seat. */
  hands: Card[][];
  currentTrick: Trick;
  tricks: Trick[];
  belote: BeloteState;
  scores: { A: number; B: number };
  targetPoints: number;
  scoringRules: ScoringRules;
  lastDeal?: DealResult;
  winner?: Team;
  /** Set when every seat passed: the caller must redeal. */
  pendingRedeal?: boolean;
}
