import { describe, expect, it } from "vitest";
import { computeDealResult, detectBelote, finalizeDeal } from "./scoring";
import { card, dealWithWinners } from "./test-utils";
import type { Contract, GameState, Seat } from "./types";

function withContract(state: GameState, contract: Contract): GameState {
  return { ...state, contract, trump: contract.suit };
}

const alternating: Seat[] = [0, 1, 0, 1, 0, 1, 0, 1];

describe("computeDealResult", () => {
  it("conserves 162 card points and detects a capot", () => {
    const state = withContract(dealWithWinners([0, 0, 0, 0, 0, 0, 0, 0], "C"), {
      seat: 0,
      team: "A",
      value: 80,
      suit: "C",
      coinche: 1,
    });
    const result = computeDealResult(state);
    expect(result.cardPoints.A + result.cardPoints.B).toBe(162);
    expect(result.capot).toBe(true);
    expect(result.gained).toEqual({ A: 330, B: 0 });
  });

  it("scores a normal made contract as value plus realized points", () => {
    const state = withContract(dealWithWinners(alternating, "C"), {
      seat: 1,
      team: "B",
      value: 80,
      suit: "C",
      coinche: 1,
    });
    const result = computeDealResult(state);
    expect(result.contractMade).toBe(true);
    expect(result.gained).toEqual({ A: 54, B: 188 });
  });

  it("gives 160 + contract to the defense on a failed contract", () => {
    const state = withContract(dealWithWinners(alternating, "C"), {
      seat: 0,
      team: "A",
      value: 120,
      suit: "C",
      coinche: 1,
    });
    const result = computeDealResult(state);
    expect(result.contractMade).toBe(false);
    expect(result.gained).toEqual({ A: 0, B: 280 });
  });

  it("applies the coinche multiplier on a made contract", () => {
    const state = withContract(dealWithWinners(alternating, "C"), {
      seat: 1,
      team: "B",
      value: 100,
      suit: "C",
      coinche: 2,
    });
    const result = computeDealResult(state);
    expect(result.gained).toEqual({ A: 0, B: 520 });
  });

  it("gives the defense the coinche base when a coinched contract falls", () => {
    const state = withContract(dealWithWinners(alternating, "C"), {
      seat: 0,
      team: "A",
      value: 100,
      suit: "C",
      coinche: 2,
    });
    const result = computeDealResult(state);
    expect(result.contractMade).toBe(false);
    expect(result.gained).toEqual({ A: 0, B: 520 });
  });

  it("scores a made announced capot as 500", () => {
    const state = withContract(dealWithWinners([0, 0, 0, 0, 0, 0, 0, 0], "C"), {
      seat: 0,
      team: "A",
      value: 250,
      suit: "C",
      coinche: 1,
    });
    const result = computeDealResult(state);
    expect(result.gained).toEqual({ A: 500, B: 0 });
  });

  it("gives 410 to the defense when an announced capot fails", () => {
    const state = withContract(dealWithWinners(alternating, "C"), {
      seat: 0,
      team: "A",
      value: 250,
      suit: "C",
      coinche: 1,
    });
    const result = computeDealResult(state);
    expect(result.contractMade).toBe(false);
    expect(result.gained).toEqual({ A: 0, B: 410 });
  });

  it("scores a made announced generale as 1000", () => {
    const state = withContract(dealWithWinners([0, 0, 0, 0, 0, 0, 0, 0], "C"), {
      seat: 0,
      team: "A",
      value: 500,
      suit: "C",
      coinche: 1,
    });
    const result = computeDealResult(state);
    expect(result.contractMade).toBe(true);
    expect(result.gained).toEqual({ A: 1000, B: 0 });
  });

  it("gives 660 to the defense when an announced generale fails", () => {
    const state = withContract(dealWithWinners(alternating, "C"), {
      seat: 0,
      team: "A",
      value: 500,
      suit: "C",
      coinche: 1,
    });
    const result = computeDealResult(state);
    expect(result.contractMade).toBe(false);
    expect(result.gained).toEqual({ A: 0, B: 660 });
  });
});

describe("detectBelote", () => {
  it("finds the team holding King and Queen of trump", () => {
    const hands = [
      [card("K", "S"), card("Q", "S")],
      [card("A", "H")],
      [],
      [],
    ];
    expect(detectBelote(hands, "S")).toBe("A");
    expect(detectBelote(hands, "H")).toBeNull();
  });
});

describe("finalizeDeal", () => {
  it("declares a winner once the target is reached", () => {
    const base = dealWithWinners(alternating, "C");
    const state = withContract({ ...base, targetPoints: 100 }, {
      seat: 1,
      team: "B",
      value: 80,
      suit: "C",
      coinche: 1,
    });
    const next = finalizeDeal(state);
    expect(next.phase).toBe("finished");
    expect(next.winner).toBe("B");
    expect(next.scores.B).toBe(188);
  });
});
