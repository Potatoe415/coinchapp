import { beginNextRound, type Rng } from "./deal";
import { finalizeRound } from "./scoring";
import { applyPlay } from "./trick";
import type { Card, GameState, Seat } from "./types";

/** Apply a card play, then finalize the round once its 13th trick is done. */
export function submitPlay(state: GameState, seat: Seat, card: Card): GameState {
  const next = applyPlay(state, seat, card);
  if (next.phase === "scoring") return finalizeRound(next);
  return next;
}

/** Start the next round after a scored one: advance to the next fixed rule, deal fresh
 *  hands, keep the cumulative totals. */
export function startNextRound(state: GameState, rng: Rng = Math.random): GameState {
  return beginNextRound({ ...state, roundIndex: state.roundIndex + 1 }, rng);
}
