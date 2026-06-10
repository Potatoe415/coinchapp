import { buildDeck, nextSeat } from "./cards";
import type { Card, GameState, ScoringRules } from "./types";

export type Rng = () => number;
export const DEFAULT_SCORING_RULES: ScoringRules = {
  countContractOnlyIfMade: false,
  failedContractDefensePoints: 160,
  zeroPointsForNonContractingTeamWhenContractMade: false,
  capotMadePoints: 250,
  capotFailedDefensePoints: 250,
  allowToutAtoutSansAtout: false,
  requireMorePointsToWin: true,
};

/** Fisher-Yates shuffle with an injectable RNG (deterministic in tests). */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Deal 8 cards per seat in the classic 3-2-3 pattern. */
export function dealHands(deck: Card[]): Card[][] {
  const hands: Card[][] = [[], [], [], []];
  const packets = [3, 2, 3];
  let index = 0;
  for (const size of packets) {
    for (let seat = 0; seat < 4; seat++) {
      for (let n = 0; n < size; n++) {
        hands[seat].push(deck[index++]);
      }
    }
  }
  return hands;
}

export function createInitialState(targetPoints: number, scoringRules: Partial<ScoringRules> = {}): GameState {
  return {
    phase: "lobby",
    dealer: 3,
    turn: 0,
    trump: null,
    contract: null,
    bids: [],
    hands: [[], [], [], []],
    currentTrick: { leader: 0, cards: [] },
    tricks: [],
    belote: { team: null, points: { A: 0, B: 0 }, announced: [] },
    scores: { A: 0, B: 0 },
    targetPoints,
    scoringRules: { ...DEFAULT_SCORING_RULES, ...scoringRules },
    lastDeal: undefined,
    winner: undefined,
  };
}

/** Rotate the dealer, deal a fresh hand and open the bidding phase. */
export function beginNextDeal(state: GameState, rng: Rng = Math.random): GameState {
  const dealer = nextSeat(state.dealer);
  const opener = nextSeat(dealer);
  const hands = dealHands(shuffle(buildDeck(), rng));
  return {
    ...state,
    phase: "bidding",
    dealer,
    turn: opener,
    trump: null,
    contract: null,
    bids: [],
    hands,
    currentTrick: { leader: opener, cards: [] },
    tricks: [],
    belote: { team: null, points: { A: 0, B: 0 }, announced: [] },
    lastDeal: undefined,
  };
}
