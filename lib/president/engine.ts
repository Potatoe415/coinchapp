import { beginNextRound, type Rng } from "./deal";
import { applyExchangeReturn } from "./exchange";
import { applyPass, applyPlay } from "./play";
import { finalizeRound } from "./scoring";
import type { Card, Combo, GameState, Seat } from "./types";

/** Apply a combo play, then finalize the round once it just ended. */
export function submitPlay(state: GameState, seat: Seat, combo: Combo): GameState {
  const next = applyPlay(state, seat, combo);
  return next.phase === "scoring" ? finalizeRound(next) : next;
}

export function submitPass(state: GameState, seat: Seat): GameState {
  return applyPass(state, seat);
}

export function submitExchangeReturn(state: GameState, seat: Seat, cards: Card[]): GameState {
  return applyExchangeReturn(state, seat, cards);
}

/** Start the next round after a scored one: deal fresh hands (applying the
 *  forced exchange), keep the cumulative totals. */
export function startNextRound(state: GameState, rng: Rng = Math.random): GameState {
  return beginNextRound({ ...state, roundIndex: state.roundIndex + 1, readySeats: undefined }, rng);
}

/** Record that `seat` pressed "Manche suivante" while the score table is up
 *  (a no-op outside the "scoring" phase, or if already recorded). */
export function markReadyForNextRound(state: GameState, seat: Seat): GameState {
  if (state.phase !== "scoring") return state;
  const readySeats = state.readySeats ?? [];
  if (readySeats.includes(seat)) return state;
  return { ...state, readySeats: [...readySeats, seat] };
}
