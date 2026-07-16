import { CAPOT_PENALTY, sweepWinner, trickPenalty } from "./rounds";
import { ROUND_ORDER } from "./types";
import type { GameState, RoundResult, Seat, SeatScores } from "./types";

/** "Capot": one seat swept the round, so it pays nothing and every other seat
 *  pays the round's max penalty instead of the usual per-card tally. */
function capotResult(round: RoundResult["round"], roundIndex: number, sweepSeat: Seat): RoundResult {
  const amount = CAPOT_PENALTY[round] ?? 0;
  const penalties = [0, 1, 2, 3].map((seat) => (seat === sweepSeat ? 0 : amount)) as SeatScores;
  return { round, roundIndex, penalties, sweepSeat };
}

/** Sum, per seat, the penalty points won across every completed trick of the round -
 *  unless one seat swept it, in which case the "Capot" bonus applies instead. */
export function computeRoundResult(state: GameState): RoundResult {
  const round = ROUND_ORDER[state.roundIndex];
  const sweepSeat = sweepWinner(round, state.tricks);
  if (sweepSeat !== null) return capotResult(round, state.roundIndex, sweepSeat);
  const penalties: SeatScores = [0, 0, 0, 0];
  state.tricks.forEach((trick, index) => {
    const isLastTrick = index === state.tricks.length - 1;
    penalties[trick.winner!] += trickPenalty(round, trick, isLastTrick);
  });
  return { round, roundIndex: state.roundIndex, penalties };
}

/** Lowest cumulative total wins (ties share the win), like golf. */
function decideWinners(totals: SeatScores): (0 | 1 | 2 | 3)[] {
  const min = Math.min(...totals);
  return totals.flatMap((score, seat) => (score === min ? [seat as 0 | 1 | 2 | 3] : []));
}

/** Apply the round result to the cumulative score, then either open the next round
 *  (round < 6, phase stays "scoring" until `startNextRound` is called) or finish the match. */
export function finalizeRound(state: GameState): GameState {
  const result = computeRoundResult(state);
  const totalScores = state.totalScores.map((s, seat) => s + result.penalties[seat]) as SeatScores;
  const isLastRound = state.roundIndex === ROUND_ORDER.length - 1;
  return {
    ...state,
    totalScores,
    roundHistory: [...state.roundHistory, result],
    lastRoundResult: result,
    phase: isLastRound ? "finished" : "scoring",
    winners: isLastRound ? decideWinners(totalScores) : undefined,
  };
}
