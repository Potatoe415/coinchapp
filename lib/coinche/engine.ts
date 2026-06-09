import { applyBid } from "./bidding";
import { beginNextDeal } from "./deal";
import { finalizeDeal } from "./scoring";
import { applyPlay } from "./trick";
import type { Bid, Card, GameState, Seat } from "./types";
import type { Rng } from "./deal";

/** Apply a bid, then redeal automatically if every seat passed. */
export function submitBid(state: GameState, bid: Bid, rng: Rng = Math.random): GameState {
  const next = applyBid(state, bid);
  if (next.pendingRedeal) {
    return beginNextDeal({ ...next, pendingRedeal: false }, rng);
  }
  return next;
}

/** Apply a card play, then finalize the deal when the 8th trick is done. */
export function submitPlay(state: GameState, seat: Seat, card: Card): GameState {
  const next = applyPlay(state, seat, card);
  if (next.phase === "scoring") return finalizeDeal(next);
  return next;
}

/** Start the next deal after a scored deal (keeps the cumulative score). */
export function startNextDeal(state: GameState, rng: Rng = Math.random): GameState {
  return beginNextDeal(state, rng);
}
