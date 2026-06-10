import { nextSeat, teamOf } from "./cards";
import { computeBelote } from "./scoring";
import type { Bid, Contract, GameState, TrumpMode } from "./types";

/** Trump modes a player may announce: the four suits, tout atout, sans atout. */
export const TRUMP_MODES: TrumpMode[] = ["H", "D", "C", "S", "TA", "SA"];

export const CAPOT_VALUE = 250;
export const GENERALE_VALUE = 500;
export const BID_VALUES = [80, 90, 100, 110, 120, 130, 140, 150, 160, CAPOT_VALUE, GENERALE_VALUE];

interface Derived {
  highest?: Bid;
  coinched: boolean;
  surcoinched: boolean;
}

function derive(bids: Bid[]): Derived {
  let highest: Bid | undefined;
  let coinched = false;
  let surcoinched = false;
  for (const bid of bids) {
    if (bid.type === "bid") {
      highest = bid;
      coinched = false;
      surcoinched = false;
    } else if (bid.type === "coinche") {
      coinched = true;
    } else if (bid.type === "surcoinche") {
      surcoinched = true;
    }
  }
  return { highest, coinched, surcoinched };
}

function trailingPasses(bids: Bid[]): number {
  let count = 0;
  for (let i = bids.length - 1; i >= 0 && bids[i].type === "pass"; i--) count++;
  return count;
}

export function validateBid(state: GameState, bid: Bid): void {
  if (state.phase !== "bidding") throw new Error("not_bidding");
  if (state.turn !== bid.seat) throw new Error("not_your_turn");
  const { highest, coinched, surcoinched } = derive(state.bids);

  if (bid.type === "pass") return;

  if (bid.type === "bid") {
    if (coinched || surcoinched) throw new Error("locked_by_coinche");
    if (bid.value === undefined || bid.suit === undefined) throw new Error("bid_incomplete");
    if (!BID_VALUES.includes(bid.value)) throw new Error("bad_bid_value");
    if ((bid.suit === "TA" || bid.suit === "SA") && !state.scoringRules.allowToutAtoutSansAtout) {
      throw new Error("special_bids_disabled");
    }
    const floor = highest?.value ?? 70;
    if (bid.value <= floor) throw new Error("bid_too_low");
    return;
  }

  if (bid.type === "coinche") {
    if (!highest) throw new Error("nothing_to_coinche");
    if (coinched) throw new Error("already_coinched");
    if (teamOf(bid.seat) === teamOf(highest.seat)) throw new Error("cannot_coinche_own");
    return;
  }

  // surcoinche
  if (!coinched || surcoinched) throw new Error("cannot_surcoinche");
  if (!highest || teamOf(bid.seat) !== teamOf(highest.seat)) {
    throw new Error("cannot_surcoinche");
  }
}

function buildContract(highest: Bid, coinched: boolean, surcoinched: boolean): Contract {
  return {
    seat: highest.seat,
    team: teamOf(highest.seat),
    value: highest.value!,
    suit: highest.suit!,
    coinche: surcoinched ? 4 : coinched ? 2 : 1,
  };
}

function completeBidding(state: GameState, bids: Bid[], d: Derived): GameState {
  const contract = buildContract(d.highest!, d.coinched, d.surcoinched);
  const leader = nextSeat(state.dealer);
  return {
    ...state,
    phase: "playing",
    bids,
    trump: contract.suit,
    contract,
    belote: computeBelote(state.hands, contract.suit),
    currentTrick: { leader, cards: [] },
    turn: leader,
  };
}

/** Validate and apply a bid, advancing the turn or resolving the auction. */
export function applyBid(state: GameState, bid: Bid): GameState {
  validateBid(state, bid);
  const bids = [...state.bids, bid];
  const d = derive(bids);

  if (bid.type === "surcoinche") return completeBidding(state, bids, d);
  if (bid.type === "coinche") {
    return { ...state, bids, turn: d.highest!.seat };
  }
  if (bid.type === "bid") {
    return { ...state, bids, turn: nextSeat(bid.seat) };
  }

  // pass
  if (d.coinched && !d.surcoinched) return completeBidding(state, bids, d);
  if (d.highest) {
    if (trailingPasses(bids) >= 3) return completeBidding(state, bids, d);
    return { ...state, bids, turn: nextSeat(bid.seat) };
  }
  if (bids.length >= 4) return { ...state, bids, pendingRedeal: true };
  return { ...state, bids, turn: nextSeat(bid.seat) };
}

export interface BidOptions {
  canPass: boolean;
  minValue: number | null;
  /** Trump modes that may be announced (empty when bidding is locked). */
  suits: TrumpMode[];
  canCoinche: boolean;
  canSurcoinche: boolean;
}

/** Summary of legal bidding actions for the seat whose turn it is. */
export function bidOptions(state: GameState): BidOptions {
  if (state.phase !== "bidding") {
    return { canPass: false, minValue: null, suits: [], canCoinche: false, canSurcoinche: false };
  }
  const seat = state.turn;
  const { highest, coinched, surcoinched } = derive(state.bids);
  const locked = coinched || surcoinched;
  const floor = highest?.value ?? 70;
  const minValue = locked || floor >= GENERALE_VALUE ? null : nextBidValue(floor);
  const modes = state.scoringRules.allowToutAtoutSansAtout
    ? [...TRUMP_MODES]
    : TRUMP_MODES.filter((m) => m !== "TA" && m !== "SA");
  return {
    canPass: true,
    minValue,
    suits: minValue === null ? [] : modes,
    canCoinche: !!highest && !coinched && teamOf(seat) !== teamOf(highest.seat),
    canSurcoinche: coinched && !surcoinched && !!highest && teamOf(seat) === teamOf(highest.seat),
  };
}

function nextBidValue(floor: number): number {
  return BID_VALUES.find((v) => v > floor) ?? GENERALE_VALUE;
}
