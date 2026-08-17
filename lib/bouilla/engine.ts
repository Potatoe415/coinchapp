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
  return beginNextRound({ ...state, roundIndex: state.roundIndex + 1, readySeats: undefined }, rng);
}

/** Record that `seat` pressed "Partie suivante" while the score table is up
 *  (a no-op outside the "scoring" phase, or if already recorded). Whether
 *  every human seat is now ready is decided by the caller (this pure engine
 *  has no notion of who is a bot). */
export function markReadyForNextRound(state: GameState, seat: Seat): GameState {
  if (state.phase !== "scoring") return state;
  const readySeats = state.readySeats ?? [];
  if (readySeats.includes(seat)) return state;
  return { ...state, readySeats: [...readySeats, seat] };
}
