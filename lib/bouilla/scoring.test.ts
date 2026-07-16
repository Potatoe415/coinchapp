import { describe, expect, it } from "vitest";
import { computeRoundResult, finalizeRound } from "./scoring";
import { card, scoringState } from "./test-utils";
import type { Trick } from "./types";

function trickWonBy(winner: 0 | 1 | 2 | 3, cards: ReturnType<typeof card>[]): Trick {
  return { leader: 0, cards: cards.map((c, seat) => ({ seat: seat as 0 | 1 | 2 | 3, card: c })), winner };
}

describe("computeRoundResult", () => {
  it("charges the tricks round at 5 points per trick taken", () => {
    const tricks = [
      trickWonBy(0, [card("2", "H"), card("3", "H"), card("4", "H"), card("5", "H")]),
      trickWonBy(2, [card("2", "D"), card("3", "D"), card("4", "D"), card("5", "D")]),
    ];
    const state = scoringState(0, tricks);
    const result = computeRoundResult(state);
    expect(result.round).toBe("tricks");
    expect(result.penalties).toEqual([5, 0, 5, 0]);
  });

  it("charges the last trick round only for the final trick's winner", () => {
    const tricks = [
      trickWonBy(1, [card("2", "H"), card("3", "H"), card("4", "H"), card("5", "H")]),
      trickWonBy(3, [card("2", "D"), card("3", "D"), card("4", "D"), card("5", "D")]),
    ];
    const state = scoringState(4, tricks); // roundIndex 4 = "lastTrick"
    const result = computeRoundResult(state);
    expect(result.round).toBe("lastTrick");
    expect(result.penalties).toEqual([0, 0, 0, 100]);
  });
});

describe("finalizeRound", () => {
  it("accumulates into totalScores and stays in scoring before the last round", () => {
    const tricks = [trickWonBy(0, [card("2", "H"), card("3", "H"), card("4", "H"), card("5", "H")])];
    const state = { ...scoringState(0, tricks), totalScores: [10, 0, 0, 0] as [number, number, number, number] };
    const next = finalizeRound(state);
    expect(next.totalScores).toEqual([15, 0, 0, 0]);
    expect(next.phase).toBe("scoring");
    expect(next.winners).toBeUndefined();
  });

  it("finishes the match and declares the lowest total the winner after round 6", () => {
    // roundIndex 5 = "everything": this lone trick is also the round's last trick,
    // so its penalty is 5 (trick) + 100 (last trick) = 105, charged to its winner.
    const tricks = [trickWonBy(1, [card("2", "H"), card("3", "H"), card("4", "H"), card("5", "H")])];
    const state = { ...scoringState(5, tricks), totalScores: [20, 40, 60, 80] as [number, number, number, number] };
    const next = finalizeRound(state);
    expect(next.phase).toBe("finished");
    expect(next.totalScores).toEqual([20, 145, 60, 80]);
    expect(next.winners).toEqual([0]);
  });

  it("shares the win on a tie", () => {
    const tricks: Trick[] = [];
    const state = { ...scoringState(5, tricks), totalScores: [50, 50, 60, 70] as [number, number, number, number] };
    const next = finalizeRound(state);
    expect(next.phase).toBe("finished");
    expect(next.winners).toEqual([0, 1]);
  });
});
