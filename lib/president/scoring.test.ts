import { describe, expect, it } from "vitest";
import { computeRoundResult, finalizeRound } from "./scoring";
import { scoringState } from "./test-utils";

describe("computeRoundResult", () => {
  it("assigns titles in finish order: President, Vice-President, Vice-Trou du Cul, Trou du Cul", () => {
    const state = scoringState([2, 0, 3, 1]);
    const result = computeRoundResult(state);
    expect(result.titles).toEqual(["vicePresident", "trouDuCul", "president", "viceTrouDuCul"]);
  });
});

describe("finalizeRound", () => {
  it("adds each seat's finishing rank (1..4) to its cumulative total", () => {
    const state = scoringState([2, 0, 3, 1], { roundsToPlay: 4 });
    const next = finalizeRound(state);
    // seat0 finished 2nd (2 pts), seat1 4th (4), seat2 1st (1), seat3 3rd (3).
    expect(next.totalScores).toEqual([2, 4, 1, 3]);
    expect(next.phase).toBe("scoring");
    expect(next.winners).toBeUndefined();
  });

  it("finishes the match and picks the lowest cumulative total as winner", () => {
    const state = scoringState([2, 0, 3, 1], { roundIndex: 3, roundsToPlay: 4 });
    const next = finalizeRound({ ...state, totalScores: [6, 10, 3, 5] });
    expect(next.phase).toBe("finished");
    // seat2 (3+1=4) is the new lowest total.
    expect(next.winners).toEqual([2]);
  });
});
