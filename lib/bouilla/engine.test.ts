import { describe, expect, it } from "vitest";
import { createInitialState, beginNextRound } from "./deal";
import { submitPlay, startNextRound } from "./engine";
import { seededRng } from "./test-utils";
import { legalCards } from "./trick";
import type { GameState, Seat } from "./types";

function playOutRound(state: GameState): GameState {
  let current = state;
  let guard = 0;
  while (current.phase === "playing" && guard++ < 300) {
    const seat = current.turn as Seat;
    const card = legalCards(current, seat)[0];
    current = submitPlay(current, seat, card);
  }
  return current;
}

describe("engine", () => {
  it("deals 13 cards to each seat and opens the playing phase", () => {
    const state = beginNextRound(createInitialState(), seededRng(1));
    expect(state.phase).toBe("playing");
    expect(state.hands.map((h) => h.length)).toEqual([13, 13, 13, 13]);
  });

  it("finalizes the round into scoring after 13 tricks, keeping totals across rounds", () => {
    const state = beginNextRound(createInitialState(), seededRng(1));
    const scored = playOutRound(state);
    expect(scored.phase).toBe("scoring");
    expect(scored.tricks).toHaveLength(13);
    expect(scored.lastRoundResult?.round).toBe("tricks");
    const totalPenalty = scored.totalScores.reduce((a, b) => a + b, 0);
    expect(totalPenalty).toBe(13 * 5); // "tricks" round: 5 pts per trick, 13 tricks total.
  });

  it("advances through all 6 rounds to a finished match", () => {
    let state = beginNextRound(createInitialState(), seededRng(7));
    for (let round = 0; round < 6; round++) {
      state = playOutRound(state);
      expect(state.phase).toBe(round < 5 ? "scoring" : "finished");
      if (round < 5) state = startNextRound(state, seededRng(7 + round));
    }
    expect(state.roundIndex).toBe(5);
    expect(state.lastRoundResult?.round).toBe("everything");
  });
});
